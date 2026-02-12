---
name: glm
description: Z.AI GLM CLI를 헤드리스로 호출하여 코드 생성, 분석, 질의응답을 수행합니다. "glm에게 물어봐", "glm으로 분석해줘" 등의 키워드에 반응합니다.
allowed-tools: Bash, Read, Write, Glob, Grep, WebSearch, WebFetch
---

# GLM CLI 호출 스킬 (Claude 협업 모드)

GLM CLI에 질문을 전달하는 동시에, Claude도 동일한 질문에 대해 독립적으로 분석합니다.
두 AI의 분석을 교차 검증하여 더 정확하고 풍부한 답변을 제공합니다.

## 사용 방법

- `/glm [질문 또는 명령]` - 일반 질의
- `/glm [파일경로에 대한 질문]` - 특정 파일 분석

## 모델 설정

- **기본 모델**: `glm-4.7` (Z.AI 최신 코딩 모델)
- 모든 실행에 `-m glm-4.7` 플래그를 포함합니다.

## 실행 단계

### STEP 1: 프롬프트 준비

사용자의 프롬프트를 임시 파일에 저장합니다 (특수문자 안전 처리).
**프로젝트 컨텍스트를 자동으로 프롬프트 앞에 추가**하여, GLM이 현재 프로젝트의 기술 스택을 인지하도록 합니다.

**반드시 Bash 도구의 heredoc으로 저장하세요** (Write 도구가 아님 - Windows에서 경로 불일치 방지):

```bash
cat > /tmp/glm_prompt.txt << 'PROMPT_EOF'
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

### STEP 2: CLI 백그라운드 실행

```bash
zai -p "$(cat /tmp/glm_prompt.txt)" -m glm-4.7 --no-color > /tmp/glm_result.txt 2>/tmp/glm_error.txt
echo "EXIT_CODE=$?"
```

- `--no-color`는 Ink UI의 ANSI/TTY 의존성을 비활성화하여 비대화형 환경에서 안정적으로 실행합니다
- Bash 도구의 `timeout`을 **1200000** (20분)으로 설정하세요.
- **`run_in_background: true`로 실행** → GLM이 돌아가는 동안 STEP 3을 즉시 시작

### STEP 3: Claude 독립 분석 (핵심)

GLM이 백그라운드에서 실행되는 동안, Claude는 동일한 질문에 대해 **독립적으로 자체 분석을 수행**합니다.

**편향 방지 원칙**: 이 단계에서 `/tmp/glm_result.txt` 파일을 **절대 읽지 마세요**.

질문 유형별 분석 방법:
- **코드 분석/리뷰**: Glob, Grep, Read로 소스 코드를 직접 읽고 독립적으로 진단
- **버그/에러 질문**: 관련 코드를 찾아 읽고, 원인과 해결책을 독립적으로 도출
- **구현 방법 질문**: 프로젝트 기존 패턴을 파악하고, 최적의 구현 방안을 독립적으로 설계
- **일반 지식 질문**: 자체 지식과 추론으로 독립 답변, 필요시 WebSearch 활용

### STEP 4: GLM 결과 수집

**Windows에서 `/tmp/`는 `C:\Users\shs\AppData\Local\Temp\`에 매핑됩니다.**
Read 도구로 읽을 때는 Windows 경로를 사용하세요: `C:\Users\shs\AppData\Local\Temp\glm_result.txt`

- 파일이 비어있거나 EXIT_CODE가 0이 아니면 → 에러 파일도 읽어서 에러 처리
- 정상이면 → STEP 5로 진행

**GLM CLI는 JSON Lines 형식으로 출력합니다.**
출력 예시:
```json
{"role":"user","content":"질문 내용"}
{"role":"assistant","content":"답변 내용"}
```
`assistant` role의 `content` 필드에서 실제 답변을 추출하세요.

### STEP 5: 교차 검증 및 종합 보고서

Claude 분석과 GLM 분석을 대조하여 최종 답변을 작성합니다.

**종합 과정:**
1. **공통점 파악**: 두 AI가 동의하는 부분 → 높은 신뢰도로 제시
2. **차이점 분석**: 의견이 다른 부분 → 실제 코드/문서/공식 레퍼런스로 판별
3. **최강 포인트 추출**: 각 AI에서 가장 정확하고 유용한 통찰 선별
4. **최종 통합 답변**: 두 분석의 장점만 결합

**출력 형식:**

```markdown
## 종합 분석 결과

> **질문**: {사용자 프롬프트 요약}

{두 AI의 분석을 종합한 최종 답변}

### 공통 합의

{Claude와 GLM이 동의하는 핵심 포인트}

### 의견 분기 (있는 경우)

| 항목 | Claude 분석 | GLM 분석 | 판정 |
|------|------------|---------|------|
| ... | ... | ... | 근거 기반 판정 |

<details>
<summary>GLM 원본 응답</summary>

{GLM 응답 전문}

</details>

<details>
<summary>Claude 독립 분석</summary>

{Claude 독립 분석 전문}

</details>

---
*Claude + Z.AI GLM 협업 분석*
```

**GLM 실패 시**: Claude 독립 분석만 제공하되, GLM 에러 원인을 안내합니다.

## 에러 처리

| 에러 상황 | 감지 키워드 | 대응 |
|-----------|------------|------|
| CLI 미설치 | "not found", "not recognized" | `npm install -g @guizmo-ai/zai-cli` 안내 |
| API 키 없음 | "unauthorized", "API key", "auth" | `zai config --set-key` 실행 안내 |
| Rate limit | "429", "rate limit" | 잠시 후 재시도 안내 |
| 타임아웃 | Bash 도구 타임아웃 | 프롬프트를 더 구체적으로 좁혀서 재시도 제안 |
| 기타 에러 | 위에 해당 안 됨 | 에러 메시지 그대로 전달 + 해결 제안 |

## 주의사항

- 프롬프트에 따옴표, 백틱, `$` 등 특수문자가 있을 수 있으므로 반드시 heredoc → `$(cat ...)` 패턴 사용
- GLM CLI는 `zai config --set-key`로 API 키 인증 (이미 설정된 상태)
- 출력이 JSON Lines 형식이므로 assistant role의 content 추출 필요
- **STEP 3에서 Claude가 반드시 독립 분석 후 STEP 4로** (편향 방지)
