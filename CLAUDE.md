# 프로젝트 컨텍스트

## 사용자 정보
- 비개발자, 바이브 코딩으로 학습 중
- 언어: 한국어
- 운영체제: Windows 11
- 국가 : 한국
- 날짜 및 시간 : 한국 날짜 UTC+9 표준시 기준준

## 응답 스타일
- 코드 작성 시 주석으로 간단히 설명 추가
- 에러 발생 시 원인과 해결법을 쉬운 말로 설명
- 전문 용어 사용 시 괄호 안에 쉬운 설명 덧붙이기
- 명령어는 Windows 환경에 맞게 제공

## 기술 스택
- Language: TypeScript
- Framework: Next.js
- Styling: Tailwind CSS
- UI 컴포넌트: shadcn/ui
- 아이콘: Lucide Icons
- 애니메이션: Framer Motion, React Bits
- 상태관리: Zustand
- 폼 관리: React Hook Form + Zod
- 패키지매니저: npm
- 배포: Vercel

## 라이브러리 설치 규칙
- 모든 기술 스택은 Context7 MCP를 활용해서 최신 문서 확인 후 설치
- 설치 전 최신 버전 확인 필수

## 폴더 구조
- src/app/ → 페이지 라우팅
- src/components/ → 재사용 컴포넌트
- src/components/ui/ → shadcn/ui 컴포넌트
- src/lib/ → 유틸리티 함수
- src/hooks/ → 커스텀 훅
- public/ → 정적 파일 (이미지, 폰트)

## 언어 및 커뮤니케이션 규칙
- 코드 주석: 한국어로 작성
- 커밋 메시지: 한국어로 작성
- 문서화: 한국어로 작성 **(IMPORTANT)**
- 변수명/함수명: 영어 (코드 표준 준수)

## 코딩 규칙
- 컴포넌트 파일명: PascalCase (예: HeroSection.tsx)
- 함수/변수명: camelCase (예: handleClick)
- 들여쓰기: 2칸 (스페이스)
- CSS 클래스: Tailwind 유틸리티 우선 사용
- 하드 코딩은 최대한 피하세요
- 코드는 최대한 객체 지향적으로 만들어서, 반복적으로 코드를 작업하지마세요.

## TypeScript 규칙
- any 타입 사용 금지 (명시적 타입 정의 필수)
- 컴포넌트 props는 interface로 정의
- 가능하면 타입 추론 활용

## 코드 관리 원칙

### 컴포넌트 분리 기준
- 한 파일이 200줄 넘어가면 분리 고려
- 2번 이상 반복되는 UI는 컴포넌트로 분리
- 페이지 컴포넌트는 레이아웃만, 세부 UI는 별도 컴포넌트로

### 하드코딩 금지
- 반복되는 텍스트/숫자는 상수로 분리
- 회사 정보, 연락처 등은 config 파일로 관리
- API URL 등 환경별 값은 환경변수 사용

### 네이밍 규칙
- 파일명만 보고 역할을 알 수 있게 작성
- 예: HeroSection.tsx, ContactForm.tsx, useScrollPosition.ts

### 바퀴를 새로 만들지 마라
- 직접 구현하기 전에 검증된 라이브러리 먼저 검색
- 날짜 처리: date-fns, 애니메이션: Framer Motion, 폼 검증: Zod 등 활용
- npm 다운로드 수, 최근 업데이트 날짜 확인 후 사용

### SOLID 원칙 (참고용)
- S (단일 책임): 하나의 파일/함수는 하나의 일만
- O (개방-폐쇄): 기존 코드 수정 없이 기능 확장 가능하게
- L (리스코프 치환): 부모-자식 컴포넌트 호환성 유지
- I (인터페이스 분리): 필요한 기능만 가져다 쓰기
- D (의존성 역전): 외부에서 의존성 주입받기

## 반응형 기준 (Tailwind 기본값)
- sm: 640px (모바일)
- md: 768px (태블릿)
- lg: 1024px (노트북)
- xl: 1280px (데스크톱)

## 웹 최적화
- 모든 페이지에 metadata 설정 (title, description)
- 시맨틱 태그 사용 (header, main, section, footer)
- Next.js Image 컴포넌트 사용 (alt 필수, WebP 권장, sizes 지정)

## 브랜드 디자인 가이드

### 디자인 원칙
- 토스 스타일의 미니멀하고 깔끔한 디자인
- 여백을 충분히 활용한 시원한 레이아웃
- 불필요한 장식 요소 최소화

### 색상 시스템
기본 색상 (모든 프로젝트 공통):
- 배경: white (#FFFFFF)
- 텍스트 메인: gray-900 (#111827)
- 텍스트 서브: gray-600 (#4B5563)
- 텍스트 보조: gray-400 (#9CA3AF)
- 구분선/보더: gray-200 (#E5E7EB)
- 배경 강조: gray-50 (#F9FAFB)

포인트 색상 (초기에는 토스 블루 컬러로 지정):
- CSS 변수로 관리: --color-primary
- 기본값: 토스 블루 (#3182F6)
- 버튼, 링크, 강조 텍스트, 아이콘에만 사용
- 포인트 색상 변경만으로 브랜드 아이덴티티 전환 가능하도록 설계

### 타이포그래피
- 기본 폰트: Pretendard 또는 시스템 폰트
- 제목: font-bold, 충분한 크기 차이로 위계 표현
- 본문: font-normal, leading-relaxed로 가독성 확보

### 아이콘 규칙
- Lucide Icons만 사용 (단색 라인 아이콘)
- 윈도우 이모지 사용 금지
- 컬러 아이콘 사용 금지
- 아이콘 색상: 기본 gray-600, 강조 시 포인트 색상

### 컴포넌트 스타일 규칙
- 버튼: 포인트 색상 배경 + 흰색 텍스트 (Primary) / 흰색 배경 + 포인트 색상 보더 (Secondary)
- 카드: 흰색 배경 + 미세한 그림자 (shadow-sm) + 둥근 모서리 (rounded-xl)
- 입력 필드: gray-200 보더 + focus 시 포인트 색상 보더

## Claude Code 확장 규칙

### 공식 문서 참고 필수
스킬, 에이전트, 커맨드, 프롬프트 등 Claude Code 확장 기능 생성 시:
- Claude 및 Claude Code 공식 문서 형식 반드시 준수
- YAML frontmatter 속성은 공식 스펙에 맞게 작성
- 비표준 속성 사용 금지

### 파일 위치
- 커맨드: .claude/commands/{command-name}.md
- 스킬: .claude/skills/{skill-name}/SKILL.md
- 에이전트: .claude/agents/{agent-name}.md

### 네이밍 규칙
- 소문자, 숫자, 하이픈만 사용
- 역할을 명확히 알 수 있는 이름 사용
- 예: prd-writer, code-reviewer, bug-fixer

### 한국어 작성
- description은 한국어로 작성 가능
- 시스템 프롬프트/가이드 내용은 한국어로 작성
