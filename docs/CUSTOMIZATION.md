# 커스터마이징 가이드

프로젝트의 브랜드 색상과 테마를 변경하는 방법을 설명합니다.

## 포인트 색상 변경

### 1. globals.css 수정

`src/app/globals.css` 파일을 열고 `:root` 섹션에서 색상을 변경하세요:

```css
:root {
  /* ==========================================
   * 📌 브랜드 포인트 색상 설정
   * 아래 값만 변경하면 전체 테마가 바뀝니다!
   * ========================================== */

  /* HEX 색상값 - 원하는 브랜드 색상으로 변경 */
  --color-primary: #3182F6;

  /* OKLCH 값 - 위 색상에 맞춰 변경 (oklch.com에서 변환) */
  --primary: oklch(0.55 0.2 250);
}
```

### 2. OKLCH 색상 변환 방법

1. [oklch.com](https://oklch.com/) 접속
2. 원하는 HEX 색상 입력 (예: #FF6B35)
3. 표시되는 OKLCH 값 복사
4. `--primary` 변수에 붙여넣기

### 인기 브랜드 색상 예시

| 브랜드 | HEX | OKLCH |
|-------|-----|-------|
| 토스 블루 | `#3182F6` | `oklch(0.55 0.2 250)` |
| 카카오 노랑 | `#FEE500` | `oklch(0.93 0.2 100)` |
| 네이버 그린 | `#03C75A` | `oklch(0.72 0.2 150)` |
| 당근 오렌지 | `#FF6F0F` | `oklch(0.65 0.25 45)` |
| 라인 그린 | `#00B900` | `oklch(0.65 0.25 140)` |

## 다크 모드 추가 (선택)

다크 모드가 필요하면 `globals.css`에 다음을 추가하세요:

```css
.dark {
  --color-primary: #60A5FA;  /* 다크 모드용 밝은 색상 */
  --primary: oklch(0.7 0.15 250);

  --background: oklch(0.15 0 0);
  --foreground: oklch(0.95 0 0);
  /* ... 다른 색상들 ... */
}
```

## 폰트 변경

### 1. 폰트 설치

```bash
npm install @fontsource/pretendard
```

### 2. layout.tsx에서 import

```tsx
import '@fontsource/pretendard/400.css'
import '@fontsource/pretendard/500.css'
import '@fontsource/pretendard/700.css'
```

### 3. globals.css에서 설정

```css
body {
  font-family: 'Pretendard', system-ui, sans-serif;
}
```

## 컴포넌트 스타일 변경

### Button 스타일 수정

`src/components/ui/button.tsx`에서 variant별 스타일을 수정할 수 있습니다:

```tsx
const buttonVariants = cva(
  "...",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary/90",
        // 여기서 스타일 수정
      }
    }
  }
)
```

### Card 스타일 수정

`src/components/ui/card.tsx`에서 기본 스타일을 수정하세요:

```tsx
const Card = React.forwardRef<...>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border bg-card shadow-sm",  // 여기서 수정
        className
      )}
      {...props}
    />
  )
)
```

## 반응형 브레이크포인트

Tailwind CSS 기본 브레이크포인트:

| 접두사 | 최소 너비 | 일반적인 기기 |
|-------|---------|-------------|
| `sm:` | 640px | 큰 스마트폰 |
| `md:` | 768px | 태블릿 |
| `lg:` | 1024px | 노트북 |
| `xl:` | 1280px | 데스크톱 |
| `2xl:` | 1536px | 큰 데스크톱 |

### 사용 예시

```tsx
<div className="text-sm md:text-base lg:text-lg">
  반응형 텍스트
</div>
```

## 애니메이션 설정

`globals.css`에 포함된 기본 애니메이션:

```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 사용 예시

```tsx
<div className="animate-fade-in">
  페이드 인 효과
</div>

<div className="animate-slide-up">
  슬라이드 업 효과
</div>
```
