---
name: skill-creator
description: 새로운 skill을 정석적인 형식으로 작성할 때 참고하는 가이드
allowed-tools: Read, Write, Glob
---
# Skill 작성 가이드

## 파일 위치
.claude/skills/{skill-name}/SKILL.md

## YAML Frontmatter 속성
| 속성 | 필수 | 설명 |
|------|------|------|
| name | 필수 | 소문자, 숫자, 하이픈만 (64자 이하) |
| description | 필수 | 스킬 용도 (1024자 이하) |
| allowed-tools | 선택 | Read, Write, Bash 등 |
| model | 선택 | sonnet, opus, haiku |
| context | 선택 | fork (격리 실행) |
| user-invocable | 선택 | true/false |

## 예시
```yaml
---
name: my-skill
description: 이 스킬의 용도 설명
allowed-tools: Read, Grep, Glob
---
```
