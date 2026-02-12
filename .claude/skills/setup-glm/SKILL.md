---
name: setup-glm
description: Z.AI GLM 듀얼 모드를 세팅합니다. Git Bash + PowerShell 모두 지원. glm 명령 등록, zai CLI 설치, API 키 설정을 자동 수행합니다.
allowed-tools: Bash, Read, Write, AskUserQuestion
---

# GLM 듀얼 모드 세팅 스킬

새 컴퓨터에서 Claude Code + GLM-4.7 듀얼 모드 환경을 한 번에 세팅합니다.

## 사용 방법

- `/setup-glm` - 전체 세팅 (API 키 입력 필요)
- `/setup-glm reset` - GLM 설정 제거 (원복)

## 세팅 완료 후 사용법

```
glm     → GLM-4.7 모드로 Claude Code 실행 (Z.AI 과금)
claude  → 기본 Claude 모드로 실행 (Anthropic 과금)
```

VS Code/Cursor에서 터미널 분할하면 좌우 동시 사용 가능:
- 터미널 1: `glm` → GLM-4.7 모드
- 터미널 2: `claude` → Claude Opus 모드

## 실행 단계

### reset 모드 (인자에 "reset"/"제거"/"삭제" 포함 시)

Git Bash와 PowerShell 양쪽에서 GLM 설정을 제거합니다.

```bash
# Git Bash (.bashrc)
sed -i '/# ===== Claude Code GLM/,/^}/d' ~/.bashrc 2>/dev/null
echo "[Git Bash] GLM 설정 제거 완료"
```

PowerShell 프로필도 확인하여 glm 함수를 제거합니다:

```bash
PS_PROFILE=$(powershell -NoProfile -Command 'echo $PROFILE' 2>/dev/null)
if [ -f "$PS_PROFILE" ]; then
  powershell -NoProfile -Command '
    $content = Get-Content $PROFILE -Raw
    $pattern = "(?s)# ===== Claude Code GLM.*?^}"
    $newContent = $content -replace $pattern, ""
    Set-Content $PROFILE $newContent.Trim()
  '
  echo "[PowerShell] GLM 설정 제거 완료"
fi
```

사용자에게 완료를 알립니다.

---

### 일반 모드 (전체 세팅)

#### STEP 1: API 키 확인

AskUserQuestion 도구로 Z.AI API 키를 요청합니다:

> Z.AI API 키를 입력해주세요. (https://z.ai/manage-apikey/apikey-list 에서 발급)

#### STEP 2: zai CLI 설치 확인

```bash
zai --version 2>/dev/null || npm install -g @guizmo-ai/zai-cli
```

- 이미 설치되어 있으면 스킵
- 미설치 시 자동 설치

#### STEP 3: zai CLI API 키 설정

```bash
zai config --set-key {사용자가 입력한 API 키}
```

#### STEP 4: Git Bash에 glm 함수 등록

먼저 기존 GLM 함수가 있는지 확인합니다:

```bash
grep -q "Claude Code GLM" ~/.bashrc 2>/dev/null
echo "EXISTS=$?"
```

- `EXISTS=0` (이미 있음) → 기존 블록 삭제 후 재등록
- `EXISTS=1` (없음) → 새로 등록

```bash
# 기존 블록 제거 (있으면)
sed -i '/# ===== Claude Code GLM/,/^}/d' ~/.bashrc 2>/dev/null

# 새로 등록
cat >> ~/.bashrc << 'BASHRC_EOF'

# ===== Claude Code GLM 모드 전환 =====
# glm → Z.AI GLM-4.7 백엔드로 Claude Code 실행
# claude → 기본 Claude (Opus/Sonnet) 그대로 사용
glm() {
  export ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"
  export ANTHROPIC_AUTH_TOKEN="{사용자_API_키}"
  export API_TIMEOUT_MS="3000000"
  export ANTHROPIC_DEFAULT_OPUS_MODEL="glm-4.7"
  export ANTHROPIC_DEFAULT_SONNET_MODEL="glm-4.6v"
  export ANTHROPIC_DEFAULT_HAIKU_MODEL="glm-4.5air"
  echo "[GLM 모드] glm-4.7 | /model: opus→glm-4.7, sonnet→glm-4.6v, haiku→glm-4.5air"
  claude "$@"
}
BASHRC_EOF
```

**⚠️ `{사용자_API_키}` 부분을 STEP 1에서 받은 실제 키로 치환하세요.**

#### STEP 5: PowerShell에 glm 함수 등록

PowerShell 프로필 경로를 확인하고 함수를 등록합니다:

```bash
# PowerShell 프로필 경로 확인
PS_PROFILE=$(powershell -NoProfile -Command 'echo $PROFILE')
PS_DIR=$(dirname "$PS_PROFILE")

# 프로필 디렉토리 생성 (없으면)
mkdir -p "$PS_DIR"
```

Write 도구로 PowerShell 프로필 파일에 glm 함수를 추가합니다.
기존 프로필이 있으면 Read 도구로 먼저 읽고, 기존 내용 뒤에 추가합니다.

추가할 PowerShell 함수:

```powershell
# ===== Claude Code GLM 모드 전환 =====
# glm → Z.AI GLM-4.7 백엔드로 Claude Code 실행
# claude → 기본 Claude (Opus/Sonnet) 그대로 사용
function glm {
    $env:ANTHROPIC_BASE_URL = "https://api.z.ai/api/anthropic"
    $env:ANTHROPIC_AUTH_TOKEN = "{사용자_API_키}"
    $env:API_TIMEOUT_MS = "3000000"
    $env:ANTHROPIC_DEFAULT_OPUS_MODEL = "glm-4.7"
    $env:ANTHROPIC_DEFAULT_SONNET_MODEL = "glm-4.6v"
    $env:ANTHROPIC_DEFAULT_HAIKU_MODEL = "glm-4.5air"
    Write-Host "[GLM 모드] glm-4.7 | /model: opus->glm-4.7, sonnet->glm-4.6v, haiku->glm-4.5air"
    claude @args
}
```

**⚠️ `{사용자_API_키}` 부분을 STEP 1에서 받은 실제 키로 치환하세요.**

#### STEP 6: PowerShell 실행 정책 확인

```bash
PS_POLICY=$(powershell -NoProfile -Command 'Get-ExecutionPolicy -Scope CurrentUser')
if [ "$PS_POLICY" = "Undefined" ] || [ "$PS_POLICY" = "Restricted" ]; then
  powershell -NoProfile -Command 'Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force'
  echo "PowerShell 실행 정책 → RemoteSigned 설정 완료"
fi
```

#### STEP 7: 검증

```bash
# Git Bash 검증
source ~/.bashrc
type glm
echo "--- Git Bash OK ---"

# PowerShell 검증
powershell -Command 'Get-Command glm -ErrorAction SilentlyContinue | Format-Table CommandType,Name'
echo "--- PowerShell OK ---"
```

두 셸 모두에서 `glm`이 함수로 인식되면 성공.

#### STEP 8: 완료 보고

아래 형식으로 사용자에게 보고합니다:

```markdown
## GLM 듀얼 모드 세팅 완료

| 항목 | 상태 |
|------|------|
| zai CLI | 설치됨 (v{버전}) |
| API 키 | 등록됨 |
| Git Bash `glm` 명령 | .bashrc 등록됨 |
| PowerShell `glm` 명령 | 프로필 등록됨 |
| PowerShell 실행 정책 | RemoteSigned |

### 사용법

| 명령 | 모드 | 과금 |
|------|------|------|
| `glm` | GLM-4.7 | Z.AI |
| `claude` | Claude Opus/Sonnet | Anthropic |

**터미널을 새로 열면** 바로 사용 가능합니다.
Git Bash, PowerShell 모두 `glm` 명령을 지원합니다.
VS Code/Cursor에서 터미널 분할 시 동시 사용 가능.

### 원복

`/setup-glm reset` 실행 또는 수동으로 .bashrc + PowerShell 프로필에서 GLM 블록 삭제.
```

## 에러 처리

| 에러 상황 | 대응 |
|-----------|------|
| npm 미설치 | Node.js 설치 안내 (https://nodejs.org) |
| zai 설치 실패 | 수동 설치 명령어 안내 |
| .bashrc 접근 불가 | 수동으로 함수 복사 안내 |
| PowerShell 프로필 접근 불가 | 수동으로 함수 복사 안내 |
| API 키 형식 오류 | 올바른 형식 안내 (32자.16자) |

## 주의사항

- Windows에서 Git Bash와 PowerShell 모두 지원
- API 키는 .bashrc 및 PowerShell 프로필에 평문 저장됨 → 공유 PC에서는 주의
- 터미널 재시작 후 적용됨 (새 터미널 열기 필요)
