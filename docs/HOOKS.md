# 커스텀 훅 가이드

스타터킷에 포함된 재사용 가능한 커스텀 훅들입니다.

## useDebounce

입력값의 변경을 지연시켜 불필요한 API 호출을 줄입니다.

### 일상생활 비유

검색창에 "사과"를 입력할 때, 'ㅅ', '사', '삭', '사과' 매번 검색하면 비효율적이죠?
마지막 입력 후 잠시 기다렸다가 검색하면 훨씬 효율적입니다.

### 사용법

```tsx
import { useDebounce } from '@/hooks'

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)  // 300ms 지연

  useEffect(() => {
    if (debouncedSearch) {
      // API 호출
      fetchSearchResults(debouncedSearch)
    }
  }, [debouncedSearch])

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="검색어 입력..."
    />
  )
}
```

### 파라미터

| 파라미터 | 타입 | 설명 |
|---------|-----|------|
| `value` | `T` | 디바운스할 값 |
| `delay` | `number` | 지연 시간 (ms) |

---

## useDebouncedCallback

함수 실행을 지연시킵니다. useDebounce의 함수 버전입니다.

### 사용법

```tsx
import { useDebouncedCallback } from '@/hooks'

function AutoSaveComponent() {
  const [content, setContent] = useState('')

  // 저장 함수를 500ms 지연
  const debouncedSave = useDebouncedCallback((text: string) => {
    saveToServer(text)
  }, 500)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    debouncedSave(newContent)  // 자동 저장
  }

  return (
    <textarea value={content} onChange={handleChange} />
  )
}
```

---

## usePagination

목록의 페이지네이션 로직을 처리합니다.

### 일상생활 비유

책의 목차처럼 전체 내용을 페이지별로 나누어 보여주는 기능입니다.
100개의 상품을 한 번에 보여주면 스크롤이 너무 길어지니까, 10개씩 나눠서 보여주는 거죠.

### 사용법

```tsx
import { usePagination } from '@/hooks'

function ProductList() {
  const [products, setProducts] = useState<Product[]>([])

  const {
    currentPage,      // 현재 페이지 (1부터 시작)
    totalPages,       // 전체 페이지 수
    paginatedItems,   // 현재 페이지의 아이템들
    goToPage,         // 특정 페이지로 이동
    nextPage,         // 다음 페이지
    prevPage,         // 이전 페이지
    hasNextPage,      // 다음 페이지 있는지
    hasPrevPage,      // 이전 페이지 있는지
  } = usePagination({
    items: products,
    itemsPerPage: 10,
  })

  return (
    <div>
      {/* 상품 목록 */}
      {paginatedItems.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}

      {/* 페이지 버튼 */}
      <div>
        <button onClick={prevPage} disabled={!hasPrevPage}>이전</button>
        <span>{currentPage} / {totalPages}</span>
        <button onClick={nextPage} disabled={!hasNextPage}>다음</button>
      </div>
    </div>
  )
}
```

### 파라미터

| 파라미터 | 타입 | 설명 |
|---------|-----|------|
| `items` | `T[]` | 전체 아이템 배열 |
| `itemsPerPage` | `number` | 페이지당 아이템 수 |
| `initialPage` | `number` | 시작 페이지 (기본값: 1) |

---

## useCountUp

숫자가 0에서 목표값까지 올라가는 애니메이션을 만듭니다.

### 일상생활 비유

복권 당첨금 발표할 때 숫자가 빠르게 올라가다가 최종 금액에서 멈추는 것처럼요!
대시보드의 통계 숫자를 더 역동적으로 보여줄 수 있습니다.

### 사용법

```tsx
import { useCountUp } from '@/hooks'

function StatsCard() {
  const ref = useRef<HTMLDivElement>(null)

  const count = useCountUp({
    end: 12345,        // 목표 숫자
    duration: 2000,    // 2초 동안 애니메이션
    ref: ref,          // 화면에 보일 때 시작
  })

  return (
    <div ref={ref}>
      <h2>총 방문자 수</h2>
      <p className="text-4xl font-bold">{count.toLocaleString()}</p>
    </div>
  )
}
```

### 파라미터

| 파라미터 | 타입 | 설명 |
|---------|-----|------|
| `end` | `number` | 목표 숫자 |
| `duration` | `number` | 애니메이션 시간 (ms) |
| `ref` | `RefObject` | 요소 참조 (화면에 보일 때 시작) |
| `start` | `number` | 시작 숫자 (기본값: 0) |
| `separator` | `string` | 천 단위 구분자 |

---

## useScrollAnimation

스크롤 시 요소가 화면에 들어오면 애니메이션을 실행합니다.

### 일상생활 비유

스크롤하면서 웹페이지를 내릴 때, 새로운 섹션이 "짠!" 하고 나타나는 효과입니다.
애플 홈페이지처럼 스크롤할 때 요소들이 부드럽게 등장하는 효과를 만들 수 있어요.

### 사용법

```tsx
import { useScrollAnimation } from '@/hooks'

function FeatureSection() {
  const { ref, isVisible } = useScrollAnimation({
    threshold: 0.1,      // 10% 보이면 시작
    triggerOnce: true,   // 한 번만 실행
  })

  return (
    <section
      ref={ref}
      className={`
        transition-all duration-700
        ${isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-10'
        }
      `}
    >
      <h2>멋진 기능 소개</h2>
      <p>이 섹션은 스크롤하면 나타납니다!</p>
    </section>
  )
}
```

### 파라미터

| 파라미터 | 타입 | 설명 |
|---------|-----|------|
| `threshold` | `number` | 보여야 하는 비율 (0~1) |
| `triggerOnce` | `boolean` | 한 번만 실행할지 여부 |
| `rootMargin` | `string` | 여백 설정 (예: "-100px") |

### 반환값

| 값 | 타입 | 설명 |
|---|-----|------|
| `ref` | `RefObject` | 요소에 연결할 ref |
| `isVisible` | `boolean` | 화면에 보이는지 여부 |

---

## 훅 가져오기

모든 훅은 `@/hooks`에서 한 번에 가져올 수 있습니다:

```tsx
import {
  useDebounce,
  useDebouncedCallback,
  usePagination,
  useCountUp,
  useScrollAnimation
} from '@/hooks'
```
