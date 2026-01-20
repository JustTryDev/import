---
name: agent-creator
description: 새로운 agent를 정석적인 형식으로 작성할 때 참고하는 가이드
allowed-tools: Read, Write, Glob
---
# Agent 작성 가이드

## 파일 위치
.claude/agents/{agent-name}.md

## YAML Frontmatter 속성
| 속성 | 필수 | 설명 |
|------|------|------|
| name | 필수 | 소문자, 하이픈만 |
| description | 필수 | 언제 사용할지 설명 |
| tools | 선택 | Read, Write, Bash 등 |
| model | 선택 | sonnet, opus, haiku, inherit |
| permissionMode | 선택 | default, acceptEdits, bypassPermissions |
| skills | 선택 | 로드할 스킬 (쉼표 구분) |

## 예시
```yaml
---
name: my-agent
description: 이 에이전트가 언제 호출되어야 하는지 설명
tools: Read, Grep, Glob, Write
model: sonnet
---
```
