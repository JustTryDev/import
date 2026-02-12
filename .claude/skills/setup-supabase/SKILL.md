---
name: setup-supabase
description: Supabase CLI를 설치하고 로그인 인증까지 한 번에 처리합니다. 프로젝트 연결(link)까지 포함. "supabase 세팅", "supabase cli 설치" 등의 키워드에 반응합니다.
allowed-tools: Bash, Read, Write, AskUserQuestion
---

# Supabase CLI 원클릭 세팅 스킬

Supabase CLI 설치 → 로그인 → 프로젝트 연결(link)까지 한 번에 처리합니다.

## 사용 방법

- `/setup-supabase` - 전체 세팅 (설치 + 로그인 + 프로젝트 연결)
- `/setup-supabase status` - 현재 설치/인증/연결 상태 확인
- `/setup-supabase reset` - 로그아웃 및 설정 제거

## 실행 단계

### status 모드 (인자에 "status"/"상태" 포함 시)

Supabase CLI 상태를 확인합니다:

```bash
echo "=== Supabase CLI 상태 확인 ==="

# 1. CLI 설치 여부
echo -n "[CLI] "
npx supabase --version 2>/dev/null && echo " - 설치됨" || echo "미설치"

# 2. 로그인 상태 (projects list로 확인)
echo -n "[로그인] "
npx supabase projects list > /dev/null 2>&1 && echo "인증됨" || echo "미인증"

# 3. 프로젝트 연결 상태 (.supabase 디렉토리 확인)
echo -n "[프로젝트 연결] "
if [ -f ".supabase/config.toml" ] || [ -d ".supabase" ]; then
  echo "연결됨"
else
  echo "미연결"
fi

echo "=== 확인 완료 ==="
```

결과를 표로 보고합니다.

---

### reset 모드 (인자에 "reset"/"제거"/"로그아웃" 포함 시)

Supabase CLI 인증 정보를 제거합니다:

```bash
echo "=== Supabase CLI 초기화 ==="

# 로그인 토큰 파일 경로 확인 후 삭제 안내
echo "아래 파일을 삭제하면 로그아웃됩니다:"
echo "  Windows: %APPDATA%\\supabase\\access-token"
echo "  또는: ~/.supabase/access-token"
echo ""
echo "프로젝트 연결 해제:"
echo "  현재 폴더의 .supabase 디렉토리를 삭제하세요"
```

사용자에게 확인 후 삭제를 진행합니다.

---

### 일반 모드 (전체 세팅)

#### STEP 1: 사전 조건 확인

Node.js와 npm이 설치되어 있는지 확인합니다:

```bash
echo "=== 사전 조건 확인 ==="
echo -n "[Node.js] " && node --version 2>&1
echo -n "[npm] " && npm --version 2>&1
echo "=== 확인 완료 ==="
```

- Node.js 미설치 시: https://nodejs.org 설치 안내 후 중단
- npm 미설치 시: Node.js 재설치 안내 후 중단

#### STEP 2: Supabase CLI 설치

이미 설치되어 있는지 확인 후 진행합니다:

```bash
echo "=== Supabase CLI 설치 ==="

CURRENT_VERSION=$(npx supabase --version 2>/dev/null)

if [ -n "$CURRENT_VERSION" ]; then
  echo "[Supabase CLI] 이미 설치됨 - v$CURRENT_VERSION"
else
  echo "[Supabase CLI] 설치 중..."
  npm install -g supabase
fi

echo "=== 설치 완료 ==="
```

- Bash 도구의 `timeout`을 **300000** (5분)으로 설정하세요.
- npx가 아닌 전역 설치(`npm install -g supabase`)를 사용합니다. 이렇게 하면 `supabase` 명령어를 직접 사용 가능합니다.

#### STEP 3: 로그인 인증

로그인 상태를 먼저 확인합니다:

```bash
npx supabase projects list > /dev/null 2>&1
echo "LOGIN_STATUS=$?"
```

- `LOGIN_STATUS=0` → 이미 로그인됨, STEP 4로 건너뜀
- `LOGIN_STATUS≠0` → 로그인 필요

로그인이 필요한 경우, 사용자에게 AskUserQuestion으로 인증 방식을 묻습니다:

**질문**: Supabase CLI 인증 방식을 선택해주세요.

| 옵션 | 설명 |
|------|------|
| 브라우저 로그인 (Recommended) | 브라우저가 열리고 Supabase 계정으로 로그인합니다. 가장 쉽고 안전한 방법입니다. |
| Access Token 입력 | Supabase 대시보드에서 발급한 토큰을 직접 입력합니다. 브라우저를 열 수 없는 환경에서 사용합니다. |

##### 옵션 A: 브라우저 로그인

```bash
echo "브라우저가 열립니다. Supabase 계정으로 로그인해주세요."
echo "로그인 완료 후 이 터미널로 돌아오세요."
npx supabase login
```

- Bash 도구의 `timeout`을 **120000** (2분)으로 설정하세요.
- 브라우저에서 로그인하면 자동으로 완료됩니다.

##### 옵션 B: Access Token 입력

AskUserQuestion으로 토큰을 요청합니다:

> Supabase Access Token을 입력해주세요.
> (https://supabase.com/dashboard/account/tokens 에서 발급)

```bash
npx supabase login --token {사용자가_입력한_토큰}
```

**⚠️ `{사용자가_입력한_토큰}` 부분을 실제 토큰으로 치환하세요.**

#### STEP 4: 로그인 검증

```bash
echo "=== 로그인 검증 ==="
npx supabase projects list 2>&1 | head -20
echo "=== 검증 완료 ==="
```

- 프로젝트 목록이 나오면 로그인 성공
- 에러 발생 시 STEP 3 재시도 안내

#### STEP 5: 프로젝트 연결 (선택)

사용자에게 AskUserQuestion으로 프로젝트 연결 여부를 묻습니다:

**질문**: 현재 프로젝트 폴더에 Supabase 프로젝트를 연결할까요?

| 옵션 | 설명 |
|------|------|
| 연결하기 (Recommended) | `supabase link` 명령으로 이 폴더를 Supabase 프로젝트에 연결합니다. 마이그레이션, Edge Function 배포 등을 CLI로 직접 할 수 있게 됩니다. |
| 건너뛰기 | 나중에 `npx supabase link --project-ref {프로젝트ID}` 로 직접 연결할 수 있습니다. |

사용자가 "연결하기"를 선택한 경우:

STEP 4에서 출력된 프로젝트 목록을 보고, 사용자에게 어떤 프로젝트를 연결할지 묻습니다.
이미 프로젝트 ID를 알고 있다면 (예: CLAUDE.md나 MEMORY.md에 기록된 ID) 자동으로 제안합니다.

```bash
npx supabase link --project-ref {프로젝트_ID}
```

- 데이터베이스 비밀번호를 묻는 경우: 사용자에게 안내합니다.
  > Supabase 대시보드 → Settings → Database → Database password에서 확인할 수 있습니다.
  > 비밀번호를 모르면 "Reset database password"로 재설정 가능합니다.

#### STEP 6: 최종 검증

```bash
echo "=== 최종 검증 ==="

# CLI 버전
echo -n "[CLI 버전] " && npx supabase --version 2>&1

# 로그인
echo -n "[로그인] "
npx supabase projects list > /dev/null 2>&1 && echo "OK" || echo "FAIL"

# 프로젝트 연결
echo -n "[프로젝트 연결] "
if [ -d ".supabase" ]; then
  echo "OK"
else
  echo "미연결 (선택사항)"
fi

echo "=== 검증 완료 ==="
```

#### STEP 7: 완료 보고

아래 형식으로 사용자에게 보고합니다:

```markdown
## Supabase CLI 세팅 완료

| 항목 | 상태 |
|------|------|
| CLI 버전 | v{버전} |
| 로그인 | 인증됨 |
| 프로젝트 연결 | {연결됨 / 미연결} |

### 자주 쓰는 CLI 명령어

| 명령어 | 설명 |
|--------|------|
| `npx supabase db push` | 마이그레이션 배포 |
| `npx supabase db pull` | 원격 DB 스키마 가져오기 |
| `npx supabase functions deploy {이름}` | Edge Function 배포 |
| `npx supabase gen types typescript` | TypeScript 타입 생성 |
| `npx supabase migration new {이름}` | 새 마이그레이션 파일 생성 |
| `npx supabase db reset` | 로컬 DB 초기화 |

### CLI vs MCP 사용 가이드

| 작업 | 추천 방식 | 이유 |
|------|----------|------|
| SQL 실행 | MCP | 간편함 |
| 마이그레이션 적용 | 둘 다 OK | MCP도 지원 |
| Edge Function 배포 | CLI | 파일이 크면 CLI가 가벼움 |
| TypeScript 타입 생성 | CLI | MCP는 응답이 커서 컨텍스트 소비 많음 |
| DB 스키마 Pull | CLI만 | MCP 미지원 |
| 로그 확인 | MCP | 간편함 |
```

## 에러 처리

| 에러 상황 | 대응 |
|-----------|------|
| Node.js/npm 미설치 | https://nodejs.org 설치 안내 |
| npm install 실패 | 네트워크 확인 안내, `npm install -g supabase` 재시도 |
| 브라우저 로그인 실패 | Access Token 방식으로 전환 안내 |
| `supabase link` 시 비밀번호 요청 | Supabase 대시보드에서 확인 방법 안내 |
| 프로젝트 목록이 비어있음 | Supabase 대시보드에서 프로젝트 생성 안내 |
| 권한 오류 (EACCES) | `--prefix` 옵션으로 로컬 설치 안내 |

## 주의사항

- 로그인 토큰은 로컬에 저장됨 (공유 PC 주의)
- `supabase link`는 프로젝트당 한 번만 필요
- 이미 MCP로 Supabase를 사용 중이라면 CLI 없이도 대부분의 작업 가능
- CLI는 `db pull`, `db reset` 등 MCP에서 지원하지 않는 명령에 유용
