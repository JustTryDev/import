# Codex CLI 세팅 가이드

OpenAI Codex CLI를 설치하고 인증하는 방법입니다.

## 요구사항

- Node.js 18 이상
- npm
- OpenAI 계정 (ChatGPT Plus 또는 API 크레딧)

## 1. CLI 설치

```bash
npm install -g @openai/codex
```

> **최신 버전 확인**: 설치 전 `npm view @openai/codex version`으로 최신 버전을 확인하세요.
> 이미 설치된 경우 `npm update -g @openai/codex`로 업데이트하세요.

## 2. 버전 확인

```bash
codex --version
```

- **최소 버전**: v0.98.0 이상 (gpt-5.3-codex 모델 지원)

## 3. 인증

### 방법 A: 브라우저 로그인 (권장)

```bash
codex login
```

- 브라우저가 열리고 OpenAI 계정으로 로그인
- ChatGPT Plus/Pro/Team 구독 사용량으로 차감
- 가장 간단하고 권장되는 방법

### 방법 B: API 키 로그인

OpenAI Platform에서 발급한 API 키로 인증:

```bash
codex login --api-key sk-여기에_API_키
```

또는 환경변수에서 파이프:
```bash
printenv OPENAI_API_KEY | codex login --with-api-key
```

- https://platform.openai.com/api-keys 에서 키 발급
- API 종량제 요금으로 차감

### 방법 C: 환경변수 (CI/CD 전용)

`codex exec` 비대화형 모드에서만 작동:

```bash
export CODEX_API_KEY="sk-여기에_API_키"
codex exec -m gpt-5.3-codex "질문"
```

> **참고**: `OPENAI_API_KEY`가 아닌 `CODEX_API_KEY`를 사용해야 합니다.

## 4. 동작 확인

```bash
codex exec -m gpt-5.3-codex "1+1은?"
```

정상적으로 응답이 나오면 세팅 완료입니다.

## 과금 정보

| 인증 방법 | 과금 기준 |
|-----------|-----------|
| 브라우저 로그인 | ChatGPT 구독 사용량 |
| API 키 | OpenAI Platform API 종량제 |

- 모델: `gpt-5.3-codex`

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `codex: not found` | CLI 미설치 | `npm install -g @openai/codex` |
| `model not found` | CLI 버전이 낮음 | `npm update -g @openai/codex` |
| `unauthorized` | 인증 안 됨 | `codex login` 재실행 |
| 인증 방식 충돌 | 로그인/API 키 전환 시 | `~/.codex/auth.json` 삭제 후 재인증 |
| 응답 없음/타임아웃 | 네트워크 문제 | VPN 확인, 재시도 |
