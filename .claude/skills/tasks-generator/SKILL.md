---
name: tasks-generator
description: TDD 워크플로우, Git Worktree, Phase 번호, 태스크 독립성 규칙이 적용된 TASKS.md를 생성합니다. /socrates 완료 후 자동 호출되거나 독립적으로 실행 가능합니다.
---

# Tasks Generator: AI 개발 파트너용 태스크 목록 생성

## 역할

`docs/planning/`의 기획 문서들(PRD, TRD, Database Design 등)을 읽고,
오케스트레이터와 서브 에이전트가 사용할 **TASKS.md**를 생성합니다.

---

## 워크플로우

### 1단계: 기획 문서 읽기

다음 파일들을 순서대로 읽습니다:

```
docs/planning/
├── 01-prd.md           # 제품 요구사항 → 기능 목록 추출
├── 02-trd.md           # 기술 요구사항 → 기술 스택 확인
├── 03-user-flow.md     # 사용자 흐름 → 마일스톤 구조화
├── 04-database-design.md # DB 설계 → DB 태스크 추출
└── 05-design-system.md # 디자인 시스템 → UI 태스크 참고
```

### 2단계: 규칙 파일 읽기

**필수!** TASKS 생성 전에 반드시 읽습니다:

```bash
# Read 도구로 읽기
~/.claude/skills/tasks-generator/references/tasks-rules.md
```

### 3단계: TASKS.md 생성

규칙을 적용하여 `docs/planning/06-tasks.md` 생성

### 4단계: 프로젝트 셋업 제안

TASKS 생성 완료 후, 사용자에게 프로젝트 셋업 여부를 질문합니다.

---

## 핵심 규칙 요약

상세 규칙은 `references/tasks-rules.md`에 있습니다.

### Phase 번호 규칙

| Phase | Git Worktree | 설명 |
|-------|-------------|------|
| Phase 0 | 불필요 | main 브랜치에서 직접 작업 |
| Phase 1+ | **필수** | 별도 worktree에서 작업 |

### TDD 워크플로우

```
Phase 1+ 태스크는 반드시:
1. RED: 테스트 먼저 작성 (실패 확인)
2. GREEN: 최소 구현 (테스트 통과)
3. REFACTOR: 리팩토링 (테스트 유지)
```

### 태스크 독립성

```
각 태스크는 독립적으로 실행 가능해야 함:
- 의존성이 있으면 Mock 설정 포함
- 병렬 실행 가능 여부 명시
```

---

## 출력 형식

### 파일 위치

```
docs/planning/06-tasks.md
```

### 문서 구조

```markdown
# TASKS: {프로젝트명} - AI 개발 파트너용 태스크 목록

## MVP 캡슐
1. 목표: ...
2. 페르소나: ...
...
10. 다음 단계: ...

---

## 마일스톤 개요

| 마일스톤 | 설명 | 주요 기능 |
|----------|------|----------|
| M0 | 프로젝트 셋업 | Phase 0 |
| M1 | FEAT-0 공통 흐름 | Phase 1 |
| M2 | FEAT-1 핵심기능 | Phase 2 |
...

---

## M0: 프로젝트 셋업

### [] Phase 0, T0.1: {태스크명}
**담당**: {specialist}
**산출물**: ...

---

## M1: FEAT-0 공통 흐름

### [] Phase 1, T1.1: {태스크명} RED→GREEN
**담당**: {specialist}

**Git Worktree 설정**:
git worktree add ../project-phase1-{feature} -b phase/1-{feature}

**TDD 사이클**:
1. RED: 테스트 작성
2. GREEN: 구현
3. REFACTOR: 정리

**산출물**: ...
**인수 조건**: ...

---

## 의존성 그래프
(Mermaid flowchart)

## 병렬 실행 가능 태스크
(테이블)
```

---

## 완료 후 동작

TASKS.md 생성 완료 후, AskUserQuestion으로 다음을 질문합니다:

```
TASKS.md 생성이 완료되었습니다!

이제 프로젝트 환경을 셋업할까요?

1. 예 - 에이전트 팀 + 프로젝트 구조 생성
2. 아니오 - 기획 문서만 필요해요
```

"예" 선택 시 → Skill 도구로 `/project-bootstrap` 호출

---

## 독립 실행

기획 문서가 이미 있는 경우 독립적으로 실행 가능:

```
사용자: "/tasks-generator"
또는
사용자: "TASKS.md 만들어줘"
```

이 경우 docs/planning/에서 기존 문서를 읽고 TASKS.md만 생성합니다.
