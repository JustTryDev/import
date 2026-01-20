# Next.js Starter Kit

재사용 가능한 컴포넌트, 훅, 유틸리티가 포함된 Next.js 스타터킷입니다.

## 시작하기

### 1. 템플릿으로 새 프로젝트 생성

GitHub에서 "Use this template" 버튼을 클릭하세요.

### 2. 프로젝트 클론 및 설치

```bash
git clone https://github.com/your-username/your-project-name.git
cd your-project-name
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 을 열어 확인하세요.

## 프로젝트 설정

### 브랜드 색상 변경

`src/app/globals.css` 파일에서 포인트 색상을 변경하세요:

```css
:root {
  --color-primary: #3182F6;  /* 원하는 색상으로 변경 */
  --primary: oklch(0.55 0.2 250);  /* OKLCH 값도 함께 변경 */
}
```

자세한 내용은 [커스터마이징 가이드](./docs/CUSTOMIZATION.md)를 참고하세요.

### 프로젝트 정보 수정

1. `package.json` - name, description 수정
2. `CLAUDE.md` - 프로젝트명, 설명 수정
3. `src/app/layout.tsx` - metadata 수정

## 포함된 기능

### 커스텀 훅

| 훅 | 용도 | 사용법 |
|---|------|-------|
| `useDebounce` | 검색창 입력 최적화 | [문서](./docs/HOOKS.md#usedebounce) |
| `useDebouncedCallback` | 함수 실행 지연 | [문서](./docs/HOOKS.md#usedebouncedcallback) |
| `usePagination` | 목록 페이지네이션 | [문서](./docs/HOOKS.md#usepagination) |
| `useCountUp` | 숫자 카운트업 애니메이션 | [문서](./docs/HOOKS.md#usecountup) |
| `useScrollAnimation` | 스크롤 애니메이션 | [문서](./docs/HOOKS.md#usescrollanimation) |

### 유틸리티 함수

| 파일 | 함수들 |
|-----|-------|
| `format.ts` | formatTimeAgo, formatFileSize, formatPhoneNumber, formatPrice, formatDateDot, formatDateDash |
| `date.ts` | getNowKST, getTodayKST, toKSTDateString, formatKoreanDate |
| `imageCompressor.ts` | compressImage, compressImages |
| `storage.ts` | localStorage 관리 패턴 |
| `utils.ts` | cn() 클래스 병합 |

### UI 컴포넌트

- **shadcn/ui 기본**: Button, Input, Card, Dialog, Select, Tabs 등
- **커스텀 컴포넌트**: Pagination, StatusBadge
- **에디터**: RichTextEditor, RichTextViewer

자세한 내용은 [컴포넌트 문서](./docs/COMPONENTS.md)를 참고하세요.

## 기술 스택

- **Framework**: Next.js 15 + React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI**: shadcn/ui (Radix UI)
- **Icons**: Lucide Icons
- **Animation**: Framer Motion
- **State**: Zustand
- **Forms**: React Hook Form + Zod
- **Editor**: TipTap

## 폴더 구조

```
src/
├── app/
│   ├── globals.css      # 글로벌 스타일 + 테마
│   ├── layout.tsx       # 루트 레이아웃
│   └── page.tsx         # 메인 페이지
├── components/
│   └── ui/
│       ├── button.tsx, input.tsx, ...  # shadcn/ui
│       ├── RichTextEditor.tsx          # 에디터
│       ├── RichTextViewer.tsx          # 에디터 뷰어
│       ├── Pagination.tsx              # 페이지네이션
│       ├── StatusBadge.tsx             # 상태 배지
│       └── editor/
│           ├── ImageSliderExtension.tsx
│           └── ImageGalleryExtension.tsx
├── hooks/
│   ├── index.ts                # 통합 export
│   ├── useDebounce.ts
│   ├── usePagination.ts
│   ├── useCountUp.ts
│   └── useScrollAnimation.ts
└── lib/
    ├── utils.ts
    ├── format.ts
    ├── date.ts
    ├── imageCompressor.ts
    └── storage.ts
```

## 문서

- [커스터마이징 가이드](./docs/CUSTOMIZATION.md) - 색상, 테마 변경
- [훅 사용법](./docs/HOOKS.md) - 커스텀 훅 설명
- [컴포넌트 가이드](./docs/COMPONENTS.md) - UI 컴포넌트 사용법
- [에디터 가이드](./docs/EDITOR.md) - RichTextEditor 사용법

## 스크립트

```bash
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 실행
npm run lint     # ESLint 검사
```

## 라이선스

MIT
