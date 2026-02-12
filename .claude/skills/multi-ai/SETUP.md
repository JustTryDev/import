# Multi-AI 세팅 가이드

Codex + Gemini + GLM 3개 CLI를 모두 설치하고 인증하는 방법입니다.

## 요구사항

- Node.js 18 이상
- npm
- OpenAI 계정
- Google 계정 또는 Google AI Studio API 키
- Z.AI 계정 및 API 키

## 1. 3개 CLI 한 번에 설치

```bash
npm install -g @openai/codex @google/gemini-cli @guizmo-ai/zai-cli
```

> **최신 버전 확인**: 설치 전 각 패키지의 최신 버전을 확인하세요.
> ```bash
> npm view @openai/codex version
> npm view @google/gemini-cli version
> npm view @guizmo-ai/zai-cli version
> ```
> 이미 설치된 경우 한 번에 업데이트:
> ```bash
> npm update -g @openai/codex @google/gemini-cli @guizmo-ai/zai-cli
> ```

## 2. 버전 확인

```bash
codex --version && gemini --version && zai --version
```

| CLI | 최소 버전 |
|-----|----------|
| Codex | v0.98.0 이상 (gpt-5.3-codex 모델 지원) |
| Gemini | 최신 버전 |
| zai | v0.3.5 이상 (glm-4.7 모델 지원) |

## 3. 인증 (3개 각각)

### Codex

**방법 A - 브라우저 로그인 (권장):**
```bash
codex login
```

**방법 B - API 키:**
```bash
codex login --api-key sk-여기에_API_키
```

### Gemini

**방법 A - 브라우저 OAuth (권장):**
```bash
gemini
```
브라우저에서 Google 계정 인증 후 `Ctrl+C`로 종료.

> **주의**: 반드시 대화형 모드(`gemini`)로 첫 실행해야 OAuth가 완료됩니다.

**방법 B - API 키:**
```powershell
# Windows PowerShell
setx GEMINI_API_KEY "여기에_Google_AI_Studio_키"
```
https://aistudio.google.com/app/apikey 에서 발급.

### GLM

```bash
zai config --set-key 여기에_Z_AI_API_키
```
https://z.ai 에서 API 키 발급.

## 4. 전체 동작 확인

3개를 순서대로 테스트:

```bash
codex exec -m gpt-5.3-codex "1+1은?" && echo "--- Codex OK ---"
gemini --prompt "1+1은?" && echo "--- Gemini OK ---"
zai -p "1+1은?" -m glm-4.7 && echo "--- GLM OK ---"
```

3개 모두 응답이 나오면 세팅 완료입니다.

## 사용 모델

| CLI | 모델 | 출시 |
|-----|------|------|
| Codex | `gpt-5.3-codex` | 2026.02.05 |
| Gemini | Gemini (기본 모델) | - |
| GLM | `glm-4.7` | Zhipu AI 최신 코딩 모델 |

## 과금 정보

| 서비스 | 인증 방법 | 과금 기준 |
|--------|-----------|-----------|
| Codex | 로그인 / API 키 | ChatGPT 구독 또는 API 종량제 |
| Gemini | OAuth / API 키 | 무료 할당량 또는 유료 크레딧 |
| GLM | API 키 | Z.AI API 크레딧 |

`/multi-ai` 1회 실행 시 **3개 서비스에서 각각 1회씩** 사용량이 차감됩니다.

## 트러블슈팅

각 CLI별 상세 트러블슈팅은 개별 스킬의 SETUP.md를 참고하세요:

- [Codex SETUP.md](../codex/SETUP.md)
- [Gemini SETUP.md](../gemini/SETUP.md)
- [GLM SETUP.md](../glm/SETUP.md)

### 공통 문제

| 증상 | 원인 | 해결 |
|------|------|------|
| 1~2개만 실패 | 해당 CLI 인증 문제 | 실패한 CLI만 재인증 |
| 전부 실패 | 네트워크 문제 | 인터넷 연결 확인 |
| 타임아웃 (10분 초과) | 프롬프트가 너무 복잡 | 질문을 짧고 구체적으로 |
| 버전 오류 | CLI가 오래됨 | `npm update -g` 실행 |
