# 컴포넌트 가이드

스타터킷에 포함된 UI 컴포넌트들입니다.

## shadcn/ui 기본 컴포넌트

이미 설치된 shadcn/ui 컴포넌트:

| 컴포넌트 | 용도 |
|---------|-----|
| `Button` | 버튼 |
| `Input` | 텍스트 입력 |
| `Textarea` | 여러 줄 입력 |
| `Label` | 라벨 |
| `Card` | 카드 컨테이너 |
| `Dialog` | 모달 대화상자 |
| `AlertDialog` | 확인/취소 대화상자 |
| `Select` | 드롭다운 선택 |
| `Tabs` | 탭 메뉴 |
| `Slider` | 슬라이더 |
| `Switch` | 토글 스위치 |
| `Calendar` | 달력 |
| `Popover` | 팝오버 |
| `Badge` | 배지 |
| `Skeleton` | 로딩 스켈레톤 |

### 사용법

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>제목</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>클릭하세요</Button>
      </CardContent>
    </Card>
  )
}
```

### 추가 컴포넌트 설치

```bash
npx shadcn@latest add [컴포넌트명]
```

예시:
```bash
npx shadcn@latest add dropdown-menu
npx shadcn@latest add toast
npx shadcn@latest add table
```

---

## Pagination

페이지네이션 UI를 제공합니다.

### 사용법

```tsx
import { Pagination } from '@/components/ui/Pagination'

function ProductList() {
  const [currentPage, setCurrentPage] = useState(1)
  const totalItems = 234  // 전체 아이템 수
  const itemsPerPage = 10

  return (
    <div>
      {/* 상품 목록 */}

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}
```

### Props

| Prop | 타입 | 설명 |
|------|-----|------|
| `currentPage` | `number` | 현재 페이지 (1부터 시작) |
| `totalItems` | `number` | 전체 아이템 수 |
| `itemsPerPage` | `number` | 페이지당 아이템 수 |
| `onPageChange` | `(page: number) => void` | 페이지 변경 핸들러 |
| `className` | `string` | 추가 CSS 클래스 |

### 표시 형태

- 왼쪽: "1-10 / 234건" (현재 범위 / 전체)
- 오른쪽: 페이지 버튼들

---

## StatusBadge

상태를 색깔 있는 배지로 표시합니다.

### 일상생활 비유

택배 추적할 때 "배송준비중", "배송중", "배송완료" 같은 태그를 생각하세요.
각 상태마다 다른 색깔로 한눈에 구분됩니다!

### 사용법

#### 방법 1: 도메인별 상태 사용

```tsx
import { StatusBadge } from '@/components/ui/StatusBadge'

// 주문 상태
<StatusBadge status="pending" type="order" />     // 대기중 (노랑)
<StatusBadge status="processing" type="order" />  // 처리중 (파랑)
<StatusBadge status="delivered" type="order" />   // 배송완료 (초록)

// 할일 상태
<StatusBadge status="todo" type="task" />         // 할 일 (노랑)
<StatusBadge status="in_progress" type="task" />  // 진행중 (파랑)
<StatusBadge status="done" type="task" />         // 완료 (초록)
```

#### 방법 2: 직접 라벨과 색상 지정

```tsx
<StatusBadge label="VIP" variant="purple" />
<StatusBadge label="신규" variant="blue" size="lg" />
<StatusBadge label="긴급" variant="red" />
```

### Props

| Prop | 타입 | 설명 |
|------|-----|------|
| `status` | `string` | 상태값 (type과 함께 사용) |
| `type` | `"order" \| "task"` | 도메인 타입 |
| `label` | `string` | 직접 라벨 지정 |
| `variant` | `BadgeVariant` | 색상 변형 |
| `size` | `"sm" \| "md" \| "lg"` | 크기 |
| `className` | `string` | 추가 CSS 클래스 |

### 색상 변형 (variant)

| 값 | 색상 | 용도 예시 |
|---|------|---------|
| `gray` | 회색 | 기본, 알 수 없음 |
| `yellow` | 노랑 | 대기중, 주의 |
| `blue` | 파랑 | 진행중 |
| `green` | 초록 | 완료, 성공 |
| `red` | 빨강 | 취소, 오류 |
| `purple` | 보라 | 특별 (VIP) |
| `orange` | 주황 | 주의, 경고 |

### 커스텀 상태 추가

`StatusBadge.tsx`의 상태 설정 맵을 수정하세요:

```tsx
// 새로운 상태 타입 추가
type PaymentStatus = "pending" | "paid" | "refunded" | "failed"

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: "결제대기", variant: "yellow" },
  paid: { label: "결제완료", variant: "green" },
  refunded: { label: "환불됨", variant: "blue" },
  failed: { label: "결제실패", variant: "red" },
}
```

---

## RichTextEditor

TipTap 기반의 고급 텍스트 에디터입니다.
자세한 사용법은 [에디터 가이드](./EDITOR.md)를 참고하세요.

---

## 컴포넌트 추가하기

### shadcn/ui에서 추가

```bash
npx shadcn@latest add [컴포넌트명]
```

### 직접 만들기

```tsx
// src/components/ui/MyComponent.tsx

interface MyComponentProps {
  title: string
  children: React.ReactNode
}

export function MyComponent({ title, children }: MyComponentProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-bold">{title}</h3>
      {children}
    </div>
  )
}
```
