---
name: project-bootstrap
description: 프로젝트용 AI 에이전트 팀 구조(.claude/agents/)를 자동 생성하고, 선택적으로 실제 프로젝트 환경까지 셋업. "에이전트 팀 만들어줘", "에이전트 팀 구성", "에이전트 팀 생성" 등 반드시 "에이전트 팀"이라는 키워드가 포함된 요청에만 반응. 단순 코딩 요청이나 프로젝트 생성 요청에는 반응하지 않음.
---

# Project Bootstrap Skill

사용자가 "에이전트 팀 만들어줘"를 요청하면 이 스킬이 발동된다.

## 필수 실행 규칙

**중요: 이 스킬은 반드시 아래 단계를 순서대로 실행해야 한다. 단계를 건너뛰지 말 것.**

---

## 1단계: 기술 스택 확인 (필수 질문)

사용자가 기술 스택을 명시했는지 확인한다.

### Case A: 기술 스택이 명시된 경우

예: "FastAPI + React로 에이전트 팀 만들어줘"

→ **2단계로 진행** (하위 선택 질문)

### Case B: 기술 스택이 명시되지 않은 경우 (⚠️ 필수 규칙)

예: "에이전트 팀 만들어줘", "에이전트 팀 구성해줘"

**⚠️ 중요: 기술 스택 없이 진행 불가. 반드시 /socrates를 먼저 발동한다.**

→ 다음 메시지를 출력한 후 `/socrates` 스킬을 즉시 발동:

```
기술 스택이 지정되지 않았습니다.
먼저 /socrates로 프로젝트 기획을 진행하겠습니다.
21개 질문을 통해 요구사항을 정리하고, 적합한 기술 스택을 추천해 드립니다.
```

→ `/socrates` 스킬 발동 (Skill 도구 사용)
→ socrates 완료 후 기술 스택이 결정되면 2단계로 진행

**절대 /socrates를 건너뛰고 2단계로 진행하지 않는다.**

---

## 2단계: 하위 기술 스택 선택 (필수 질문)

**반드시 AskUserQuestion 도구를 사용하여 다음 질문들을 한다.**

### 질문 2-1: 데이터베이스 선택

```
어떤 데이터베이스를 사용하시겠습니까?

1. PostgreSQL (권장) - 벡터 DB 지원, 확장성
2. MySQL - 범용 관계형 DB
3. SQLite - 로컬 개발, Rails 8 WAL 모드 지원
4. MongoDB - NoSQL 문서 DB
```

### 질문 2-2: 인증 포함 여부

```
인증 기능(로그인/회원가입/프로필)을 포함할까요?

1. 예 (권장) - JWT 인증 + 로그인/회원가입/프로필 페이지
2. 아니오 - 인증 없이 기본 구조만
```

### 질문 2-3: 추가 기능 선택 (다중 선택)

```
추가로 필요한 기능이 있나요? (복수 선택 가능)

1. 벡터 DB (PGVector) - AI/RAG 애플리케이션용
2. Redis 캐시 - 세션/캐시 저장소
3. 3D 엔진 (Three.js) - 3D 시각화
4. 없음
```

---

## 3단계: 프로젝트 셋업 확인 (필수 질문)

```
프로젝트 환경을 셋업할까요?

1. 예 (권장) - 에이전트 팀 + 백엔드 + 프론트엔드 + Docker
2. 에이전트 팀만 - .claude/agents/ 파일만 생성
```

---

## 4단계: 프로젝트 생성

사용자 선택에 따라 다음을 실행한다.

### 4-1. 에이전트 팀 생성 (항상 실행)

references/ 디렉토리의 템플릿을 기반으로 에이전트 및 커맨드 파일을 생성한다.

**⚠️ 중요: 오케스트레이터는 Task 도구를 사용해야 하므로 반드시 커맨드로 설치한다!**

```
.claude/
  agents/
    backend-specialist.md
    frontend-specialist.md
    database-specialist.md
    test-specialist.md
    3d-engine-specialist.md (3D 선택 시)
  commands/
    orchestrate.md          ← ⚠️ 커맨드로 설치! (orchestrate-command.md 템플릿 사용)
    integration-validator.md
    agent-lifecycle.md
```

| 템플릿 파일 | 설치 위치 | 이유 |
|------------|----------|------|
| `orchestrate-command.md` | `.claude/commands/orchestrate.md` | Task 도구 사용 필요 (커맨드만 가능) |
| `backend-specialist.md` | `.claude/agents/` | 서브 에이전트 (Task로 호출됨) |
| `frontend-specialist.md` | `.claude/agents/` | 서브 에이전트 (Task로 호출됨) |
| `database-specialist.md` | `.claude/agents/` | 서브 에이전트 (Task로 호출됨) |
| `test-specialist.md` | `.claude/agents/` | 서브 에이전트 (Task로 호출됨) |

템플릿의 `{{placeholder}}`를 사용자가 선택한 기술 스택으로 치환한다.

### 4-2. MCP 서버 설정

```bash
python3 ~/.claude/skills/project-bootstrap/scripts/setup_mcp.py -p .
```

### 4-3. Docker Compose 생성

```bash
# 데이터베이스 선택에 따라
python3 ~/.claude/skills/project-bootstrap/scripts/setup_docker.py -t <template> -p .
```

| 선택 | Template |
|------|----------|
| PostgreSQL | `postgres` |
| PostgreSQL + 벡터 | `postgres-pgvector` |
| PostgreSQL + Redis | `postgres-redis` |
| MySQL | `mysql` |
| MongoDB | `mongodb` |

### 4-4. 백엔드 생성

```bash
python3 ~/.claude/skills/project-bootstrap/scripts/setup_backend.py -f <framework> -p ./backend [--with-auth]
```

| 프레임워크 | 명령어 |
|-----------|--------|
| FastAPI | `-f fastapi` |
| Express | `-f express` |
| Rails | `-f rails` (대화형 질문 표시) |
| Django | `-f django` |

### 4-5. 프론트엔드 생성

```bash
python3 ~/.claude/skills/project-bootstrap/scripts/setup_frontend.py -f <framework> -p ./frontend [--with-auth]
```

| 프레임워크 | 명령어 |
|-----------|--------|
| React + Vite | `-f react-vite` |
| Next.js | `-f nextjs` |
| SvelteKit | `-f sveltekit` |
| Remix | `-f remix` |

### 4-6. Git 초기화

```bash
python3 ~/.claude/skills/project-bootstrap/scripts/git_init.py -g fullstack -m "Initial commit"
```

---

## 5단계: 의존성 설치 확인 (필수 질문)

프로젝트 생성 완료 후 **반드시** 다음을 질문한다:

```
✅ 프로젝트 셋업이 완료되었습니다!

의존성 설치와 DB 마이그레이션을 진행할까요?

1. 예 - Docker 시작 + 의존성 설치 + DB 마이그레이션
2. 아니오 - 나중에 수동으로 진행
```

### "예" 선택 시 실행:

```bash
# Docker 시작
docker compose up -d

# 백엔드 의존성 설치
cd backend
pip install -r requirements.txt  # FastAPI/Django
# 또는
npm install  # Express
# 또는
bundle install && rails db:migrate  # Rails

# 프론트엔드 의존성 설치
cd ../frontend
npm install
```

---

## 6단계: 기획 문서 확인 (필수 질문 - Socrates 연결)

의존성 설치 완료 후 **반드시** AskUserQuestion으로 다음을 질문한다:

```
✅ 프로젝트 셋업이 완료되었습니다!

다음 단계를 선택해주세요:

1. 기획부터 시작 (권장) - /socrates로 21개 질문을 통해 PRD, TASKS 등 7개 기획 문서 생성
2. 기존 기획 문서 사용 - 이미 docs/planning/에 기획 문서가 있는 경우
3. 바로 개발 시작 - 기획 문서 없이 자유롭게 개발
```

### "기획부터 시작" 선택 시
- `/socrates` 스킬을 발동
- 21개 질문을 통해 요구사항 수집
- 7개 기획 문서 생성 (docs/planning/)
- 본격적인 개발 시작

### "기존 기획 문서 사용" 선택 시
- docs/planning/ 디렉토리의 기존 문서 확인
- 문서가 없으면 다시 선택 요청

### "바로 개발 시작" 선택 시
- 다음 안내 메시지 출력 후 종료:
  ```
  기획 문서 없이 진행합니다.
  나중에 /socrates를 실행하면 언제든 기획 문서를 생성할 수 있습니다.
  ```

---

## 전체 워크플로우 예시

### 예시 1: 기술 스택 없이 요청 (Case B - 권장 흐름)

```
사용자: "에이전트 팀 만들어줘"

Claude: 기술 스택이 지정되지 않았습니다.
        먼저 /socrates로 프로젝트 기획을 진행하겠습니다.
        21개 질문을 통해 요구사항을 정리하고, 적합한 기술 스택을 추천해 드립니다.

        [/socrates 스킬 발동]

        ... (21개 질문 진행) ...

        [기획 완료 - 기술 스택 결정: FastAPI + React + PostgreSQL]

Claude: 기획이 완료되었습니다! 결정된 기술 스택으로 프로젝트를 셋업하겠습니다.

        [질문 2-2] 인증 기능을 포함할까요?
        1. 예 (권장)
        2. 아니오

        ... (이하 동일) ...
```

### 예시 2: 기술 스택 명시 (Case A)

```
사용자: "FastAPI + React로 에이전트 팀 만들어줘"

Claude: 프로젝트 설정을 위해 몇 가지 질문 드리겠습니다.

        [질문 2-1] 어떤 데이터베이스를 사용하시겠습니까?
        1. PostgreSQL (권장)
        2. MySQL
        3. SQLite
        4. MongoDB

사용자: "1"

Claude: [질문 2-2] 인증 기능을 포함할까요?
        1. 예 (권장)
        2. 아니오

사용자: "1"

Claude: [질문 2-3] 추가 기능이 필요하신가요?
        1. 벡터 DB (PGVector)
        2. Redis 캐시
        3. 3D 엔진
        4. 없음

사용자: "4"

Claude: [질문 3] 프로젝트 환경을 셋업할까요?
        1. 예 (권장)
        2. 에이전트 팀만

사용자: "1"

Claude: 프로젝트를 생성합니다...
        [에이전트 팀 생성 중...]
        [MCP 설정 생성 중...]
        [Docker Compose 생성 중...]
        [백엔드 생성 중...]
        [프론트엔드 생성 중...]
        [Git 초기화 중...]

        ✅ 프로젝트 셋업이 완료되었습니다!

        의존성 설치와 DB 마이그레이션을 진행할까요?
        1. 예
        2. 아니오

사용자: "1"

Claude: [Docker 시작 중...]
        [백엔드 의존성 설치 중...]
        [프론트엔드 의존성 설치 중...]

        ✅ 프로젝트 셋업이 완료되었습니다!

        다음 단계를 선택해주세요:
        1. 기획부터 시작 (권장) - /socrates로 PRD, TASKS 등 7개 기획 문서 생성
        2. 기존 기획 문서 사용 - 이미 docs/planning/에 기획 문서가 있는 경우
        3. 바로 개발 시작 - 기획 문서 없이 자유롭게 개발

사용자: "1"

Claude: [/socrates 스킬 발동]
        좋습니다! 프로젝트 기획을 시작하겠습니다.
        먼저 몇 가지 질문을 드리겠습니다...
```

---

## 지원 기술 스택

### 백엔드 (✓ = 인증 템플릿 포함)

| Framework | Auth | 설명 |
|-----------|------|------|
| FastAPI ✓ | ✅ | Python + SQLAlchemy + JWT + Alembic |
| Express ✓ | ✅ | Node.js + TypeScript + JWT |
| Rails ✓ | ✅ | Ruby on Rails 8 + JWT/Session + SQLite WAL |
| Django | ❌ | Python + DRF |
| Go Fiber | ❌ | Go |
| Spring Boot | ❌ | Java (수동 설정) |

### 프론트엔드 (✓ = 인증 UI 포함)

| Framework | Auth | 설명 |
|-----------|------|------|
| React+Vite ✓ | ✅ | React 19 + Zustand + TailwindCSS |
| Next.js ✓ | ✅ | App Router + Zustand + TailwindCSS |
| SvelteKit ✓ | ✅ | Svelte 5 runes + TailwindCSS |
| Remix ✓ | ✅ | Loader/Action 패턴 + TailwindCSS |
| Vue | ❌ | Vue 3 + Pinia |
| Angular | ❌ | Angular 18+ |

### 데이터베이스

| DB | Docker Template |
|----|-----------------|
| PostgreSQL | `postgres` |
| PostgreSQL + PGVector | `postgres-pgvector` |
| PostgreSQL + Redis | `postgres-redis` |
| MySQL | `mysql` |
| MongoDB | `mongodb` |

---

## 스크립트 경로

```
~/.claude/skills/project-bootstrap/scripts/
├── setup_backend.py    # 백엔드 초기화
├── setup_frontend.py   # 프론트엔드 초기화
├── setup_docker.py     # Docker Compose 생성
├── setup_mcp.py        # MCP 서버 설정
└── git_init.py         # Git 초기화
```

---

## 에이전트/커맨드 템플릿 경로

```
~/.claude/skills/project-bootstrap/references/
├── orchestrate-command.md    ← 커맨드용 (→ .claude/commands/orchestrate.md)
├── backend-specialist.md     ← 에이전트용 (→ .claude/agents/)
├── frontend-specialist.md
├── database-specialist.md
├── test-specialist.md
├── 3d-engine-specialist.md
├── integration-validator.md  ← 커맨드용 (→ .claude/commands/)
└── agent-lifecycle.md        ← 커맨드용 (→ .claude/commands/)
```

**⚠️ orchestrator.md (구 버전)은 사용하지 않음 - orchestrate-command.md 사용!**

---

## 인증 UI 페이지 (--with-auth 시 생성)

| 경로 | 기능 |
|------|------|
| `/login` | 로그인 |
| `/register` | 회원가입 |
| `/profile` | 프로필 (비밀번호 변경, 로그아웃, 계정 삭제) |
