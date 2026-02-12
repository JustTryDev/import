---
name: setup-keybindings
description: Cursor/VS Code + Claude Code 키바인딩을 한 번에 세팅합니다. 복사/붙여넣기/줄바꿈 키 충돌을 자동 해결합니다.
allowed-tools: Bash, Read, Write, Edit
---

# Cursor/VS Code + Claude Code 키바인딩 세팅 스킬

IDE 터미널에서 Claude Code 사용 시 Ctrl+C, Ctrl+V, Shift+Enter가 깨지는 문제를 한 번에 해결합니다.

## 사용 방법

- `/setup-keybindings` — 전체 세팅 (키바인딩 자동 적용)
- `/setup-keybindings status` — 현재 키바인딩 상태 확인
- `/setup-keybindings reset` — 기본값으로 원복

## 배경 지식 (왜 키가 안 먹는가)

```
키 입력 → IDE(Cursor/VS Code)가 먼저 가로챔 → 남은 것만 Claude Code로 전달
```

| 문제 키 | 원인 | 해결 |
|---------|------|------|
| Shift+Enter | IDE가 `\n`을 보내면 Claude Code가 Enter(전송)로 오인 | CSI u 이스케이프 시퀀스(`\u001b[13;2u`) 전송 |
| Ctrl+V | Claude Code가 `chat:imagePaste`로 가로챔 | Claude Code에서 `null`로 비활성화 → IDE가 처리 |
| Ctrl+C | 텍스트 선택/미선택 구분 안 됨 | 선택 시 복사, 미선택 시 인터럽트(`\u0003`) 분리 |

## 세팅 대상

| 파일 | 역할 |
|------|------|
| `~/.claude/keybindings.json` | Claude Code 내부 키바인딩 |
| IDE `keybindings.json` | Cursor/VS Code 터미널 키바인딩 |

## 실행 단계

### status 모드 (인자에 "status"/"상태" 포함 시)

1. `~/.claude/keybindings.json` 파일을 Read로 읽어서 내용 출력
2. OS를 감지하고 IDE keybindings.json 경로를 찾아서 Read로 읽어 내용 출력
3. 아래 형식으로 상태 표 출력:

```
## 현재 키바인딩 상태

### Claude Code (~/.claude/keybindings.json)
| 키 | 설정값 | 상태 |
|---|---|---|
| shift+enter | chat:newline | ✅ 정상 / ❌ 미설정 |
| ctrl+v | null | ✅ 정상 / ❌ 미설정 |

### IDE (Cursor/VS Code)
| 키 | 설정값 | 상태 |
|---|---|---|
| shift+enter | \u001b[13;2u | ✅ 정상 / ❌ 미설정 |
| ctrl+c (선택) | copySelection | ✅ 정상 / ❌ 미설정 |
| ctrl+c (미선택) | \u0003 | ✅ 정상 / ❌ 미설정 |
| ctrl+v | paste | ✅ 정상 / ❌ 미설정 |
```

---

### reset 모드 (인자에 "reset"/"초기화"/"원복" 포함 시)

1. `~/.claude/keybindings.json`을 기본값으로 원복:

```json
{
  "$schema": "https://www.schemastore.org/claude-code-keybindings.json",
  "$docs": "https://code.claude.com/docs/en/keybindings",
  "bindings": []
}
```

2. IDE keybindings.json에서 이 스킬이 추가한 항목만 제거 (기존 사용자 항목 보존)
   - `workbench.action.terminal.copySelection` (ctrl+c, terminalTextSelected)
   - `workbench.action.terminal.sendSequence` (ctrl+c, !terminalTextSelected)
   - `workbench.action.terminal.paste` (ctrl+v)
   - `workbench.action.terminal.sendSequence` (shift+enter)

3. 완료 보고

---

### 일반 모드 (전체 세팅)

#### STEP 1: OS 및 IDE 감지

Bash로 OS를 감지하고, IDE keybindings.json 경로를 결정합니다.

**IDE keybindings.json 경로:**

| OS | Cursor | VS Code |
|----|--------|---------|
| Windows | `%APPDATA%/Cursor/User/keybindings.json` | `%APPDATA%/Code/User/keybindings.json` |
| macOS | `~/Library/Application Support/Cursor/User/keybindings.json` | `~/Library/Application Support/Code/User/keybindings.json` |
| Linux | `~/.config/Cursor/User/keybindings.json` | `~/.config/Code/User/keybindings.json` |

- 두 IDE 경로 모두 확인하여 존재하는 것을 모두 세팅
- 둘 다 없으면 사용자에게 IDE 종류 질문

#### STEP 2: Claude Code 키바인딩 세팅

`~/.claude/keybindings.json` 파일을 Write로 작성:

```json
{
  "$schema": "https://www.schemastore.org/claude-code-keybindings.json",
  "$docs": "https://code.claude.com/docs/en/keybindings",
  "bindings": [
    {
      "context": "Chat",
      "bindings": {
        "shift+enter": "chat:newline",
        "ctrl+v": null
      }
    }
  ]
}
```

**설정 설명:**
- `shift+enter: chat:newline` — Shift+Enter로 줄바꿈
- `ctrl+v: null` — Claude Code의 이미지 붙여넣기 비활성화 (IDE가 텍스트 붙여넣기 처리)

#### STEP 3: IDE 키바인딩 세팅

IDE keybindings.json 파일을 Read로 읽습니다.

- 파일이 없으면: 새로 생성
- 파일이 있으면: 기존 내용을 파싱하여 아래 4개 항목을 추가/교체

**추가할 키바인딩 항목 4개:**

```json
{
    "key": "ctrl+c",
    "command": "workbench.action.terminal.copySelection",
    "when": "terminalFocus && terminalHasBeenCreated && terminalTextSelected"
},
{
    "key": "ctrl+c",
    "command": "workbench.action.terminal.sendSequence",
    "args": {
        "text": "\u0003"
    },
    "when": "terminalFocus && terminalHasBeenCreated && !terminalTextSelected"
},
{
    "key": "ctrl+v",
    "command": "workbench.action.terminal.paste",
    "when": "terminalFocus && terminalHasBeenCreated"
},
{
    "key": "shift+enter",
    "command": "workbench.action.terminal.sendSequence",
    "args": {
        "text": "\u001b[13;2u"
    },
    "when": "terminalFocus"
}
```

**기존 항목 처리 규칙:**
- 동일한 `key` + `when` 조합이 있으면 → 교체
- 없으면 → 배열 끝에 추가
- 다른 키(ctrl+i 등) 사용자 설정은 절대 건드리지 않음

#### STEP 4: 결과 보고

아래 형식으로 완료 보고:

```
## 키바인딩 세팅 완료!

### 수정된 파일
| 파일 | 경로 |
|------|------|
| Claude Code | ~/.claude/keybindings.json |
| {IDE 이름} | {실제 경로} |

### 적용된 키바인딩
| 키 | 동작 |
|---|---|
| Shift+Enter | 줄바꿈 (전송 안 됨) |
| Ctrl+C | 텍스트 선택 시 복사, 미선택 시 인터럽트 |
| Ctrl+V | 클립보드 텍스트 붙여넣기 |

⚠️ **IDE(Cursor/VS Code)를 재시작**해야 키바인딩이 적용됩니다.

### 테스트 방법
1. IDE 재시작 후 Claude Code 실행
2. Shift+Enter → 줄바꿈 확인
3. Ctrl+V → 텍스트 붙여넣기 확인
4. Ctrl+C → 텍스트 드래그 후 복사 확인
```

## 에러 처리

| 상황 | 대응 |
|------|------|
| keybindings.json 파일 없음 | 새로 생성 |
| JSON 파싱 실패 | 백업 후 새로 생성, 사용자에게 백업 경로 안내 |
| IDE 경로 감지 실패 | 사용자에게 IDE 종류 질문 |
| 권한 오류 | 관리자 권한 실행 안내 |

## 주의사항

- `Ctrl+C`는 Claude Code에서 **하드코딩된 인터럽트 키**이므로 Claude Code 측에서는 변경 불가
- IDE 측에서 텍스트 선택 시에만 복사로 동작하도록 `when` 조건으로 분리
- macOS에서는 `Cmd+C`/`Cmd+V`가 기본이므로 이 스킬은 주로 Windows/Linux에서 필요
