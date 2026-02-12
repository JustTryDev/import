---
name: multi-ai
description: Codex, Gemini, GLM + Claude 독립 분석을 순차 3라운드로 수행합니다. "AI 비교", "여러 AI에게 물어봐", "multi-ai" 등의 키워드에 반응합니다.
allowed-tools: Bash, Read, Write, Glob, Grep, Task, WebSearch, WebFetch
---

# Multi-AI 순차 3라운드 분석 스킬

Claude가 GLM → Gemini → Codex 순서로 **3라운드에 걸쳐 각 AI와 함께 분석**합니다.
매 라운드마다 Claude가 독립 분석 + 교차 검증을 수행하므로, Claude는 총 **3번** 적극 참여합니다.
라운드가 진행될수록 이전 인사이트가 누적되어 분석이 점점 깊어집니다.

**⚠️ 컨텍스트 절약 핵심**: Claude 독립 분석은 **Task(general-purpose) 서브에이전트**로 실행합니다.
서브에이전트가 파일 읽기, 웹 검색 등 무거운 작업을 별도 컨텍스트에서 처리하고, **요약 결과만** 메인으로 돌아옵니다.

## 사용 방법

- `/multi-ai [질문 또는 명령]` - 3라운드 순차 분석
- `/multi-ai [파일경로에 대한 질문]` - 특정 파일에 대해 3라운드 분석
- `/multi-ai review` - 3라운드 코드 리뷰

## 모델 설정 (반드시 아래 모델명을 정확히 사용)

| 라운드 | AI | CLI 명령어 | 모델 (`-m` 플래그) |
|--------|-----|----------|-------------------|
| Round 1 | GLM | `zai` | `glm-4.7` |
| Round 2 | Gemini | `gemini` | (기본 모델, `-m` 불필요) |
| Round 3 | Codex | `codex exec` | `gpt-5.3-codex` |

> **경고**: Codex는 ChatGPT 계정 인증 시 일부 모델만 지원합니다. 반드시 `gpt-5.3-codex`를 사용하세요. `o4-mini` 등 다른 모델명을 사용하면 "model is not supported" 에러가 발생합니다.

## 흐름 요약

```
Round 1: GLM 백그라운드 + Claude 서브에이전트 분석 → 교차 검증 → 중간 결과
                ↓ (Round 1 인사이트를 다음 서브에이전트에 전달)
Round 2: Gemini 백그라운드 + Claude 서브에이전트 분석 → 교차 검증 → 중간 결과 보강
                ↓ (Round 1+2 인사이트를 다음 서브에이전트에 전달)
Round 3: Codex 백그라운드 + Claude 서브에이전트 분석 → 교차 검증 → 최종 결과 완성
```

## 절대 위반 금지 규칙 (CRITICAL)

**아래 규칙을 어기면 분석 품질이 심각하게 손상됩니다. 어떤 상황에서도 위반하지 마세요.**

1. **순차 실행 필수**: Round 1 → Round 2 → Round 3 순서대로만 진행
   - Round 1이 완전히 끝나기 전에 Round 2를 절대 시작하지 마세요
   - Round 2가 완전히 끝나기 전에 Round 3을 절대 시작하지 마세요

2. **"완전히 끝남"의 정의**: 해당 라운드의 다음이 **모두** 완료된 상태
   - ✅ 외부 AI CLI 결과 수집 완료 (Read로 파일 읽기까지)
   - ✅ Claude 서브에이전트 분석 결과 수집 완료
   - ✅ 교차 검증 완료
   - ✅ 사용자에게 중간 보고 출력 완료

3. **대기 필수**: 외부 AI가 오래 걸려도 **반드시** 기다리세요
   - ❌ "시간이 오래 걸리고 있어서 다음으로 넘어가겠습니다" **금지**
   - ❌ "병렬로 시작하겠습니다" **금지**
   - ❌ "지금까지 결과로 보고서를 작성하겠습니다" **금지**
   - ❌ 라운드를 건너뛰거나 합치는 행위 **금지**
   - ✅ TaskOutput(block: true)으로 결과가 올 때까지 대기하세요

4. **최종 보고서 작성 시점**: Round 3까지 **모두** 완료된 후에만 STEP 5 실행
   - ❌ 일부 라운드만 완료된 상태에서 최종 보고서 작성 **금지**
   - 단, 외부 AI가 에러로 실패(EXIT_CODE ≠ 0)한 경우만 해당 라운드를 Claude 분석만으로 완료 처리 후 다음 진행

## 실행 단계

### STEP 1: 프롬프트 준비

사용자의 프롬프트를 임시 파일에 저장합니다.
**프로젝트 컨텍스트를 자동으로 프롬프트 앞에 추가**하여, 모든 AI가 현재 프로젝트의 기술 스택을 인지하도록 합니다.

**⚠️ 반드시 Bash 도구의 heredoc으로 저장하세요** (Write 도구가 아님 - Windows에서 경로 불일치 방지):

```bash
cat > /tmp/multi_prompt.txt << 'PROMPT_EOF'
[프로젝트 컨텍스트]
- 언어: TypeScript
- 프레임워크: Next.js (App Router)
- 스타일링: Tailwind CSS
- UI: shadcn/ui
- 백엔드/DB: Supabase
- 패키지매니저: npm
- 코드 주석: 한국어
반드시 위 기술 스택에 맞는 코드로 답변해주세요.

[질문]
{사용자 프롬프트 내용}
PROMPT_EOF
```

파일 참조가 있는 경우:
1. Read 도구로 해당 파일 내용을 읽는다
2. 프로젝트 컨텍스트와 파일 내용을 포함하여 heredoc으로 저장한다

리뷰 모드인 경우 (프롬프트에 "리뷰"/"review" 포함 시):
```bash
cat > /tmp/multi_prompt.txt << 'PROMPT_EOF'
[프로젝트 컨텍스트]
- 언어: TypeScript
- 프레임워크: Next.js (App Router)
- 스타일링: Tailwind CSS
- UI: shadcn/ui
- 백엔드/DB: Supabase
- 패키지매니저: npm
- 코드 주석: 한국어

아래 코드 변경사항을 리뷰해줘:
PROMPT_EOF
git diff >> /tmp/multi_prompt.txt
```

---

### STEP 2: 🔵 Round 1 - Claude + GLM

#### 2-1. GLM 백그라운드 실행 + Claude 서브에이전트 분석 (동시)

**하나의 메시지에서 2개 도구를 동시에 호출합니다:**

**도구 #1: Bash** - GLM CLI 실행
```bash
zai -p "$(cat /tmp/multi_prompt.txt)" -m glm-4.7 --no-color > /tmp/multi_glm_result.txt 2>/tmp/multi_glm_error.txt
echo "GLM_EXIT=$?"
```
- timeout: 1200000, **run_in_background: true**
- `--no-color`로 Ink UI의 TTY 의존성 비활성화

**도구 #2: Task** - Claude 독립 분석 #1 (서브에이전트)
```
Task(
  subagent_type: "general-purpose",
  prompt: "다음 질문에 대해 독립적으로 분석해주세요.
    코드 분석이 필요하면 Glob, Grep, Read로 직접 소스 코드를 읽으세요.
    일반 질문이면 자체 지식 + WebSearch를 활용하세요.
    리뷰 모드면 git diff를 직접 읽어서 분석하세요.

    [질문]: {사용자 프롬프트 내용}

    분석 결과를 핵심 위주로 정리해서 반환해주세요."
)
```

**⚠️ 서브에이전트에게 외부 AI 결과 파일 경로를 절대 전달하지 마세요** (편향 방지)

#### 2-2. 결과 수집

두 작업이 모두 완료되면:

**GLM 결과**: `C:\Users\shs\AppData\Local\Temp\multi_glm_result.txt`를 Read로 읽기

**⚠️ GLM 출력은 JSON Lines 형식입니다.**
`assistant` role의 `content` 필드에서 실제 답변을 추출하세요.
출력이 너무 크면 아래 Node.js 스크립트로 추출:

```bash
node -e "
const fs=require('fs'),p=require('path');
const f=fs.readFileSync(p.join(process.env.TEMP||'/tmp','multi_glm_result.txt'),'utf-8');
let r=null;
for(const l of f.split('\n')){
  if(!l.trim())continue;
  try{const o=JSON.parse(l);
  if(o.role==='assistant'&&o.content&&o.content.length>100&&!o.tool_calls)r=o.content;
  }catch(e){}
}
if(r)console.log(r);else console.log('No response');
"
```

**Claude 분석 #1 결과**: Task 도구가 반환한 서브에이전트 결과 (이미 메인 컨텍스트에 요약으로 존재)

#### 2-3. Round 1 교차 검증 및 중간 보고

Claude 분석 #1과 GLM 분석을 대조합니다:
1. **공통점**: 두 AI가 동의하는 부분 → 높은 신뢰도
2. **차이점**: 의견이 다른 부분 → 실제 코드/문서로 판별
3. **Round 1 인사이트 정리**: 다음 라운드 서브에이전트에 전달할 핵심 발견사항

**사용자에게 Round 1 중간 결과를 출력합니다:**

```markdown
## 🔵 Round 1 완료: Claude + GLM

> **질문**: {사용자 프롬프트 요약}

### Round 1 분석 결과

{Claude와 GLM의 분석을 교차 검증한 결과}

### 공통 합의
{두 AI가 동의하는 포인트}

### 의견 분기 (있는 경우)
| 항목 | Claude | GLM | 판정 |
|------|--------|-----|------|
| ... | ... | ... | 근거 |

---
*Round 2 (Claude + Gemini) 시작합니다...*
```

**⛔ GATE CHECK**: Round 1의 모든 단계(2-1, 2-2, 2-3)가 완료되었는지 확인하세요.
GLM 결과 수집 ✅, Claude 서브에이전트 결과 수집 ✅, 교차 검증 출력 ✅ — 세 가지 모두 완료된 경우에만 아래로 진행하세요.

---

### STEP 3: 🟢 Round 2 - Claude + Gemini

#### 3-1. Gemini 백그라운드 실행 + Claude 서브에이전트 분석 (동시)

**하나의 메시지에서 2개 도구를 동시에 호출합니다:**

**도구 #1: Bash** - Gemini CLI 실행
```bash
gemini --prompt "$(cat /tmp/multi_prompt.txt)" -o text > /tmp/multi_gemini_result.txt 2>/tmp/multi_gemini_error.txt
echo "GEMINI_EXIT=$?"
```
- timeout: 1200000, **run_in_background: true**
- `-o text`는 깨끗한 텍스트 출력
- **⚠️ 프롬프트가 8KB 초과**: 프롬프트를 요약하거나 핵심 질문만 전달

**도구 #2: Task** - Claude 독립 분석 #2 (서브에이전트, Round 1 인사이트 반영)
```
Task(
  subagent_type: "general-purpose",
  prompt: "다음 질문에 대해 독립적으로 분석해주세요.
    코드 분석이 필요하면 Glob, Grep, Read로 직접 소스 코드를 읽으세요.
    일반 질문이면 자체 지식 + WebSearch를 활용하세요.

    [질문]: {사용자 프롬프트 내용}

    [이전 라운드 인사이트 - 참고하되, 여기서 놓친 부분을 더 깊이 파보세요]:
    {Round 1 교차 검증에서 나온 핵심 인사이트 요약}
    {Round 1에서 의견이 갈렸던 부분}
    {Round 1에서 아직 해결되지 않은 질문들}

    Round 1에서 놓쳤을 수 있는 부분, 새로운 관점, 더 깊은 조사에 집중하세요.
    분석 결과를 핵심 위주로 정리해서 반환해주세요."
)
```

#### 3-2. 결과 수집

**Gemini 결과**: `C:\Users\shs\AppData\Local\Temp\multi_gemini_result.txt`를 Read로 읽기

**Claude 분석 #2 결과**: Task 도구가 반환한 서브에이전트 결과

#### 3-3. Round 2 교차 검증 및 중간 보고

Claude 분석 #2와 Gemini 분석을 대조하고, Round 1 결과와도 비교합니다:
1. **신규 발견**: Gemini가 Round 1에서 나오지 않았던 새로운 포인트를 짚었는지
2. **보강/반박**: Round 1 결론을 Gemini가 뒷받침하는지 또는 반박하는지
3. **Round 2 인사이트 정리**: Round 1 + Round 2 누적 인사이트 업데이트

**사용자에게 Round 2 중간 결과를 출력합니다:**

```markdown
## 🟢 Round 2 완료: Claude + Gemini

### Round 2 분석 결과

{Claude와 Gemini의 분석을 교차 검증한 결과}

### Round 1 대비 새로운 발견
{Round 1에서 나오지 않았던 새로운 인사이트}

### 누적 합의 (Round 1+2)
{지금까지 확인된 높은 신뢰도의 결론들}

### 의견 분기 (있는 경우)
| 항목 | Claude #2 | Gemini | Round 1 결론 | 판정 |
|------|-----------|--------|-------------|------|
| ... | ... | ... | ... | 근거 |

---
*Round 3 (Claude + Codex) 시작합니다...*
```

**⛔ GATE CHECK**: Round 2의 모든 단계(3-1, 3-2, 3-3)가 완료되었는지 확인하세요.
Gemini 결과 수집 ✅, Claude 서브에이전트 결과 수집 ✅, 교차 검증 출력 ✅ — 세 가지 모두 완료된 경우에만 아래로 진행하세요.

---

### STEP 4: 🟠 Round 3 - Claude + Codex

#### 4-1. Codex 백그라운드 실행 + Claude 서브에이전트 분석 (동시)

**하나의 메시지에서 2개 도구를 동시에 호출합니다:**

**도구 #1: Bash** - Codex CLI 실행

일반 모드:
```bash
codex exec -m gpt-5.3-codex "$(cat /tmp/multi_prompt.txt)" -o /tmp/multi_codex_result.txt 2>/tmp/multi_codex_error.txt
echo "CODEX_EXIT=$?"
```

리뷰 모드:
```bash
codex exec -m gpt-5.3-codex review --uncommitted -o /tmp/multi_codex_result.txt 2>/tmp/multi_codex_error.txt
echo "CODEX_EXIT=$?"
```
- timeout: 1200000, **run_in_background: true**

**도구 #2: Task** - Claude 독립 분석 #3 (서브에이전트, Round 1+2 인사이트 반영)
```
Task(
  subagent_type: "general-purpose",
  prompt: "다음 질문에 대해 최종 독립 분석을 수행해주세요.
    코드 분석이 필요하면 Glob, Grep, Read로 직접 소스 코드를 읽으세요.
    일반 질문이면 자체 지식 + WebSearch를 활용하세요.

    [질문]: {사용자 프롬프트 내용}

    [이전 2라운드 누적 인사이트 - 최종 검증에 집중하세요]:
    {Round 1+2 누적 합의 사항}
    {아직 해결되지 않은 의견 분기}
    {추가 조사가 필요한 부분}

    이것이 마지막 분석입니다. 다음에 집중하세요:
    - 기존 합의가 정말 맞는지 최종 검증
    - 놓친 엣지 케이스나 예외 상황
    - 실제 구현 시 주의사항
    분석 결과를 핵심 위주로 정리해서 반환해주세요."
)
```

#### 4-2. 결과 수집

**Codex 결과**: `C:\Users\shs\AppData\Local\Temp\multi_codex_result.txt`를 Read로 읽기

**Claude 분석 #3 결과**: Task 도구가 반환한 서브에이전트 결과

#### 4-3. Round 3 교차 검증

Claude 분석 #3과 Codex 분석을 대조하고, Round 1+2 누적 결과와 종합합니다:
1. **최종 검증**: Codex가 기존 결론을 뒷받침하는지 확인
2. **코드 품질**: Codex는 코딩 전문 모델이므로, 코드 관련 답변은 특히 주의 깊게 비교
3. **최종 인사이트**: 3라운드 전체를 통합한 결정적 결론 도출

---

### STEP 5: 최종 종합 보고서

3라운드 모든 결과를 합쳐 최종 보고서를 작성합니다.

```markdown
## 🏆 Multi-AI 최종 종합 분석 (3라운드)

> **질문**: {사용자 프롬프트 요약}

---

### 최종 답변

{3라운드에 걸쳐 점진적으로 심화된 최종 결론}
{이것이 보고서의 핵심 결과물 - 3라운드의 교차 검증을 거친 가장 정확하고 완전한 답변}
{필요시 코드 포함}

---

### 3라운드 분석 과정

<details>
<summary>🔵 Round 1: Claude + GLM</summary>

**Claude 독립 분석 #1**: {핵심 요약}
**GLM 응답**: {핵심 요약}
**교차 검증 결과**: {합의/분기 사항}

</details>

<details>
<summary>🟢 Round 2: Claude + Gemini</summary>

**Claude 독립 분석 #2**: {핵심 요약}
**Gemini 응답**: {핵심 요약}
**교차 검증 결과**: {합의/분기 사항}
**Round 1 대비 새로운 발견**: {추가 인사이트}

</details>

<details>
<summary>🟠 Round 3: Claude + Codex</summary>

**Claude 독립 분석 #3**: {핵심 요약}
**Codex 응답**: {핵심 요약}
**교차 검증 결과**: {합의/분기 사항}
**Round 1+2 대비 새로운 발견**: {추가 인사이트}

</details>

### 전체 AI 합의 사항
- {3라운드를 통해 Claude(3회) + GLM + Gemini + Codex가 모두 동의한 핵심 포인트}

### 라운드별 진화 과정
| 라운드 | 핵심 발견 | 분석 심화 포인트 |
|--------|----------|----------------|
| Round 1 (GLM) | {첫 분석에서 발견} | {초기 인사이트} |
| Round 2 (Gemini) | {추가 발견} | {Round 1 보강/반박} |
| Round 3 (Codex) | {최종 발견} | {최종 검증/완성} |

### 각 AI의 고유 기여
- **Claude (3회 분석)**: {라운드마다 누적된 Claude의 핵심 기여}
- **GLM**: {GLM만 짚은 포인트}
- **Gemini**: {Gemini만 짚은 포인트}
- **Codex**: {Codex만 짚은 포인트}

---
*Claude 3회 독립 분석 + Z.AI GLM + Google Gemini + OpenAI Codex 순차 3라운드 협업*
```

## 부분 실패 처리

| 상황 | 대응 |
|------|------|
| Round 1 (GLM) 실패 | Claude 서브에이전트 분석 #1만으로 Round 1 완료 → Round 2 진행 |
| Round 2 (Gemini) 실패 | Claude 서브에이전트 분석 #2만으로 Round 2 완료 → Round 3 진행 |
| Round 3 (Codex) 실패 | Claude 서브에이전트 분석 #3만으로 Round 3 완료 → 최종 보고서 작성 |
| 모두 실패 | Claude 3회 서브에이전트 분석만으로 최종 답변 제공 |

**핵심**: 외부 AI가 모두 실패해도 Claude가 3번 독립 분석했으므로, 충분히 깊이 있는 답변을 제공할 수 있습니다.

## 에러 처리

| 에러 상황 | 감지 키워드 | 대응 |
|-----------|------------|------|
| CLI 미설치 | "not found", "not recognized" | 해당 CLI 설치 명령어 안내, 해당 라운드는 Claude 서브에이전트 분석만으로 진행 |
| 인증 실패 | "unauthorized", "auth" | 해당 CLI 로그인/키설정 안내, 해당 라운드는 Claude 서브에이전트 분석만으로 진행 |
| Rate limit | "429", "rate limit" | 잠시 후 재시도 안내 |
| 타임아웃 | Bash 도구 타임아웃 | 프롬프트를 더 구체적으로 좁혀서 재시도 제안 |
| 모델 미지원 | "model is not supported" | 위 '모델 설정' 테이블의 정확한 모델명(`gpt-5.3-codex`)으로 재시도 |

## 주의사항

- 프롬프트에 따옴표, 백틱, `$` 등 특수문자가 있을 수 있으므로 반드시 heredoc → `$(cat ...)` 패턴 사용
- Codex: 로그인 인증, Gemini: OAuth 인증, GLM: API 키 인증 (모두 설정 완료 상태)
- GLM 출력은 JSON Lines 형식 → assistant content 추출 필요
- **서브에이전트에게 외부 AI 결과 파일 경로를 절대 전달하지 마세요** (편향 방지)
- 순차 실행이므로 총 소요시간은 기존보다 길지만, 분석 품질은 훨씬 높음
- 각 라운드 완료 시 중간 결과를 사용자에게 바로 출력하여 진행상황을 알림
- **컨텍스트 절약**: 서브에이전트가 파일 읽기/검색을 처리하므로 메인 컨텍스트가 가벼움
