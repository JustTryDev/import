# GLM CLI (zai) 세팅 가이드

Z.AI GLM CLI를 설치하고 인증하는 방법입니다.

## 요구사항

- Node.js 18 이상
- npm
- Z.AI 계정 및 API 키

## 1. CLI 설치

```bash
npm install -g @guizmo-ai/zai-cli
```

> **최신 버전 확인**: 설치 전 `npm view @guizmo-ai/zai-cli version`으로 최신 버전을 확인하세요.
> 이미 설치된 경우 `npm update -g @guizmo-ai/zai-cli`로 업데이트하세요.

## 2. 버전 확인

```bash
zai --version
```

- **최소 버전**: v0.3.5 이상

## 3. 인증 (API 키 방식)

```bash
zai config --set-key 여기에_API_키_입력
```

- Z.AI 대시보드에서 API 키 발급: https://z.ai
- `--set-key` 뒤에는 키 값만 입력 (환경변수명 제외)

## 4. 모델 정보

**GLM-4.7** - Zhipu AI의 최신 코딩 전용 모델

| 항목 | 내용 |
|------|------|
| 모델명 | `glm-4.7` |
| 특화 분야 | 다국어 에이전트 코딩, 터미널 기반 작업 |
| SWE-bench | 73.8% |
| SWE-bench Multilingual | 66.7% |
| 사고 기능 | Interleaved Thinking, Preserved Thinking |

- 공식 블로그: https://z.ai/blog/glm-4.7

> **새 모델 출시 시**: `zai -p "테스트" -m {새모델명}`으로 교체 가능합니다.
> 스킬 파일(`SKILL.md`)의 `-m glm-4.7` 부분을 새 모델명으로 변경하세요.

## 5. 동작 확인

```bash
zai -p "1+1은?" -m glm-4.7
```

정상적으로 응답이 나오면 세팅 완료입니다.

> **참고**: GLM CLI는 JSON Lines 형식으로 출력됩니다. 이는 정상 동작이며, 스킬에서 자동으로 파싱합니다.

## 과금 정보

- Z.AI 계정의 API 크레딧이 차감됩니다.
- 모델: `glm-4.7`

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `zai: not found` | CLI 미설치 | `npm install -g @guizmo-ai/zai-cli` |
| `unauthorized` / `API key` | API 키 미설정 | `zai config --set-key {키}` |
| JSON 출력만 나옴 | 정상 동작 | `assistant` role의 `content`가 실제 답변 |
| 응답 없음/타임아웃 | 네트워크 문제 | VPN 확인, 재시도 |
