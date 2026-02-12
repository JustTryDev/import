# Gemini CLI 세팅 가이드

Google Gemini CLI를 설치하고 인증하는 방법입니다.

## 요구사항

- Node.js 18 이상
- npm
- Google 계정

## 1. CLI 설치

```bash
npm install -g @google/gemini-cli
```

> **최신 버전 확인**: 설치 전 `npm view @google/gemini-cli version`으로 최신 버전을 확인하세요.
> 이미 설치된 경우 `npm update -g @google/gemini-cli`로 업데이트하세요.

## 2. 버전 확인

```bash
gemini --version
```

## 3. 인증

### 방법 A: 브라우저 OAuth 로그인 (권장)

```bash
gemini
```

- 처음 실행하면 브라우저가 열리고 Google 계정 로그인 화면이 표시됨
- 계정 선택 후 권한 허용
- 터미널로 돌아와 대화형 모드 진입 확인 후 `Ctrl+C`로 종료

> **주의**: 첫 실행은 반드시 대화형(인터랙티브) 모드로 해야 OAuth 인증이 완료됩니다.
> 헤드리스 모드(`--prompt`)로는 인증할 수 없습니다.

### 방법 B: Google AI Studio API 키

Google AI Studio에서 발급한 API 키로 인증 (브라우저 로그인 불필요):

1. https://aistudio.google.com/app/apikey 에서 API 키 발급

2. 환경변수 설정:

   **Windows (PowerShell):**
   ```powershell
   setx GEMINI_API_KEY "여기에_API_키"
   ```

   **Linux/macOS:**
   ```bash
   export GEMINI_API_KEY="여기에_API_키"
   ```

3. 또는 `~/.gemini/.env` 파일에 저장:
   ```
   GEMINI_API_KEY=여기에_API_키
   ```

> **헤드리스 환경에 권장**: CI/CD, 서버, 다른 PC에 빠르게 세팅할 때 API 키 방식이 편리합니다.

## 4. 동작 확인

```bash
gemini --prompt "1+1은?"
```

정상적으로 응답이 나오면 세팅 완료입니다.

## 과금 정보

| 인증 방법 | 과금 기준 |
|-----------|-----------|
| OAuth 로그인 | Google AI 무료 할당량 (AI Pro/Ultra 구독 시 확대) |
| API 키 | Google AI Studio 무료 할당량 또는 유료 크레딧 |

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `gemini: not found` | CLI 미설치 | `npm install -g @google/gemini-cli` |
| `No input provided` | 플래그 오류 | `--prompt` 사용 (`-p` 아님) |
| `403 Forbidden` | 인증 미완료 | `gemini` 대화형 모드로 재인증 또는 API 키 설정 |
| `Verify your account` | 브라우저 인증 필요 | 브라우저에서 계정 인증 완료 |
| 응답 없음/타임아웃 | 네트워크 문제 | VPN 확인, 재시도 |
