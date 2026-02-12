---
name: setup-ai-tools
description: Codex, Gemini, GLM 3개 AI CLI를 한 번에 설치하고 인증합니다. 헤드리스 모드 스킬(/codex, /gemini, /glm, /multi-ai) 사용을 위한 원클릭 세팅.
allowed-tools: Bash, Read, Write, AskUserQuestion
---

# AI Tools 원클릭 세팅 스킬

Codex(OpenAI), Gemini(Google), GLM(Z.AI) 3개 AI CLI를 한 번에 설치하고 인증합니다.
세팅 완료 후 `/codex`, `/gemini`, `/glm`, `/multi-ai` 스킬을 바로 사용할 수 있습니다.

## 사용 방법

- `/setup-ai-tools` - 전체 세팅 (3개 CLI 설치 + 인증)
- `/setup-ai-tools status` - 현재 설치/인증 상태 확인
- `/setup-ai-tools reset` - 환경변수 제거 안내

## 세팅 완료 후 사용 가능한 스킬

| 스킬 | 설명 |
|------|------|
| `/codex [질문]` | GPT-5.3-Codex에게 질문 |
| `/gemini [질문]` | Gemini에게 질문 |
| `/glm [질문]` | GLM-4.7에게 질문 |
| `/multi-ai [질문]` | 3개 AI 동시 비교 분석 |

## 실행 단계

### status 모드 (인자에 "status"/"상태" 포함 시)

3개 CLI의 설치 및 인증 상태를 확인합니다:

```bash
echo "=== AI Tools 상태 확인 ==="

# Codex
echo -n "[Codex] "
codex --version 2>/dev/null && echo "설치됨" || echo "미설치"

# Gemini
echo -n "[Gemini] "
gemini --version 2>/dev/null && echo "설치됨" || echo "미설치"

# GLM
echo -n "[GLM] "
zai --version 2>/dev/null && echo "설치됨" || echo "미설치"

# 환경변수 확인
echo "---"
echo -n "OPENAI_API_KEY: "
[ -n "$OPENAI_API_KEY" ] && echo "설정됨" || echo "미설정"
echo -n "GEMINI_API_KEY: "
[ -n "$GEMINI_API_KEY" ] && echo "설정됨" || echo "미설정"
```

결과를 표로 보고합니다.

---

### reset 모드 (인자에 "reset"/"제거"/"삭제" 포함 시)

환경변수 제거 방법을 안내합니다:

```markdown
## 환경변수 제거 방법

**PowerShell에서 실행:**
```powershell
[System.Environment]::SetEnvironmentVariable('OPENAI_API_KEY', $null, 'User')
[System.Environment]::SetEnvironmentVariable('GEMINI_API_KEY', $null, 'User')
```

CLI 자체를 삭제하려면:
```bash
npm uninstall -g @openai/codex @google/gemini-cli @guizmo-ai/zai-cli
```
```

---

### 일반 모드 (전체 세팅)

#### STEP 1: API 키 수집

AskUserQuestion 도구로 3개 API 키를 요청합니다.
각 키의 발급처도 안내합니다:

**질문 1**: OpenAI API 키
> OpenAI API 키를 입력해주세요. (https://platform.openai.com/api-keys 에서 발급)
> 로그인 인증만 사용하려면 "skip"을 입력하세요.

**질문 2**: Gemini API 키
> Google AI Studio API 키를 입력해주세요. (https://aistudio.google.com/app/apikey 에서 발급)
> OAuth 로그인만 사용하려면 "skip"을 입력하세요.

**질문 3**: Z.AI API 키
> Z.AI API 키를 입력해주세요. (https://z.ai/manage-apikey/apikey-list 에서 발급)

**⚠️ 3개를 한 번에 묻지 말고, AskUserQuestion 도구로 한 번에 3개 질문을 보내세요.**
각 질문의 옵션에 "skip (로그인 인증 사용)" 선택지를 포함하세요.
단, GLM은 API 키 필수이므로 skip 옵션 없이.

#### STEP 2: CLI 설치

3개 CLI를 한 번에 설치합니다. 이미 설치된 것은 자동 스킵:

```bash
echo "=== CLI 설치 시작 ==="

# Codex
if codex --version 2>/dev/null; then
  echo "[Codex] 이미 설치됨 - $(codex --version 2>&1)"
else
  echo "[Codex] 설치 중..."
  npm install -g @openai/codex
fi

# Gemini
if gemini --version 2>/dev/null; then
  echo "[Gemini] 이미 설치됨"
else
  echo "[Gemini] 설치 중..."
  npm install -g @google/gemini-cli
fi

# GLM
if zai --version 2>/dev/null; then
  echo "[GLM] 이미 설치됨 - $(zai --version 2>&1)"
else
  echo "[GLM] 설치 중..."
  npm install -g @guizmo-ai/zai-cli
fi

echo "=== CLI 설치 완료 ==="
```

- Bash 도구의 `timeout`을 **300000** (5분)으로 설정하세요.

#### STEP 3: 인증 설정

STEP 1에서 받은 키로 각 CLI를 인증합니다.

##### Codex 인증

사용자가 API 키를 입력한 경우:
```bash
# Windows 환경변수로 등록 (codex exec에서 CODEX_API_KEY로 사용)
setx OPENAI_API_KEY "{사용자_OpenAI_키}"
echo "[Codex] API 키 환경변수 등록 완료"
```

사용자가 "skip"한 경우:
```bash
echo "[Codex] 로그인 인증을 사용합니다."
echo "지금 codex login을 실행합니다. 브라우저에서 로그인해주세요."
codex login
```

##### Gemini 인증

사용자가 API 키를 입력한 경우:
```bash
setx GEMINI_API_KEY "{사용자_Gemini_키}"
echo "[Gemini] API 키 환경변수 등록 완료"
```

사용자가 "skip"한 경우:
```bash
echo "[Gemini] OAuth 로그인을 사용합니다."
echo "gemini를 대화형으로 실행합니다. 브라우저에서 인증 후 Ctrl+C로 종료해주세요."
```
사용자에게 `gemini` 명령을 직접 실행하도록 안내합니다 (대화형이라 Bash에서 자동 실행 불가).

##### GLM 인증

```bash
zai config --set-key {사용자_GLM_키}
echo "[GLM] API 키 설정 완료"
```

#### STEP 4: 버전 확인 및 검증

```bash
echo "=== 버전 확인 ==="
echo -n "[Codex] " && codex --version 2>&1
echo -n "[Gemini] " && gemini --version 2>&1
echo -n "[GLM] " && zai --version 2>&1
echo "=== 검증 완료 ==="
```

#### STEP 5: 빠른 동작 테스트 (선택)

사용자에게 테스트 실행 여부를 묻습니다:

> 3개 AI에 간단한 테스트를 실행할까요? (각 서비스 사용량 소량 차감)

사용자가 동의하면:

```bash
echo "=== 동작 테스트 ==="

# Codex 테스트
echo -n "[Codex] "
codex exec -m gpt-5.3-codex "1+1=" -o /tmp/test_codex.txt 2>/dev/null && echo "OK" || echo "FAIL"

# Gemini 테스트
echo -n "[Gemini] "
gemini --prompt "1+1=" > /tmp/test_gemini.txt 2>/dev/null && echo "OK" || echo "FAIL"

# GLM 테스트
echo -n "[GLM] "
zai -p "1+1=" -m glm-4.7 > /tmp/test_glm.txt 2>/dev/null && echo "OK" || echo "FAIL"

echo "=== 테스트 완료 ==="
```

- Bash 도구의 `timeout`을 **300000** (5분)으로 설정하세요.

#### STEP 6: 완료 보고

아래 형식으로 사용자에게 보고합니다:

```markdown
## AI Tools 세팅 완료

| CLI | 버전 | 인증 방식 | 모델 | 상태 |
|-----|------|----------|------|------|
| Codex | v{버전} | API 키 / 로그인 | gpt-5.3-codex | {OK/FAIL} |
| Gemini | v{버전} | API 키 / OAuth | Gemini | {OK/FAIL} |
| GLM (zai) | v{버전} | API 키 | glm-4.7 | {OK/FAIL} |

### 사용 가능한 스킬

| 스킬 | 설명 | 예시 |
|------|------|------|
| `/codex` | GPT에게 질문 | `/codex 피보나치 함수 만들어줘` |
| `/gemini` | Gemini에게 질문 | `/gemini 이 코드 리뷰해줘` |
| `/glm` | GLM에게 질문 | `/glm 버그 원인 분석해줘` |
| `/multi-ai` | 3개 AI 비교 분석 | `/multi-ai 최적의 DB 구조 추천해줘` |

### 과금 정보

| 서비스 | 과금 기준 |
|--------|-----------|
| Codex | OpenAI API 크레딧 또는 ChatGPT 구독 |
| Gemini | Google AI 무료 할당량 또는 유료 크레딧 |
| GLM | Z.AI API 크레딧 |

`/multi-ai` 1회 실행 시 3개 서비스에서 각각 1회씩 차감됩니다.
```

## 에러 처리

| 에러 상황 | 대응 |
|-----------|------|
| Node.js/npm 미설치 | Node.js 설치 안내 (https://nodejs.org) |
| npm install 실패 | 네트워크 확인, 수동 설치 명령어 안내 |
| Codex 버전 낮음 | `npm update -g @openai/codex` 안내 (v0.98.0 이상 필요) |
| Codex 로그인 실패 | `codex login` 재실행 안내 |
| Gemini OAuth 실패 | `gemini` 대화형 모드로 브라우저 인증 안내 |
| GLM API 키 오류 | https://z.ai 에서 키 재발급 안내 |
| setx 실패 | PowerShell로 환경변수 등록 대안 안내 |

## 부분 세팅

3개 중 일부만 세팅하고 싶은 경우:
- 사용자가 특정 키만 제공하면 해당 CLI만 설정
- 나머지는 건너뛰고 완료 보고에서 "미설정" 표시
- 나중에 `/setup-ai-tools`를 다시 실행하면 미설정 항목만 추가 가능

## 주의사항

- API 키는 Windows 환경변수(`setx`)로 저장됨
- 환경변수는 새 터미널 세션부터 적용
- Gemini OAuth는 대화형 모드 필요 → 자동화 불가, 사용자 직접 실행 안내
- Codex 최소 버전: v0.98.0 (gpt-5.3-codex 지원)
- GLM은 API 키 필수 (로그인 인증 미지원)
