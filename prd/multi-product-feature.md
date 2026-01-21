# 다중 제품 입력 기능 PRD

## 문서 정보
- **작성일**: 2026-01-21
- **버전**: 1.1
- **상태**: 검토 중
- **관련 PRD**: import-cost-extension.md
- **변경 이력**:
  - v1.1: 공장 비용 공유 시나리오 추가 (연결된 제품 + 균등 분배)

---

## 1. 개요

### 1.1 프로젝트 목적
기존 단일 제품 기준 수입원가 계산기를 다중 제품 지원으로 확장하여, 한 번의 수입 건에 여러 제품을 포함할 수 있도록 개선

### 1.2 해결하려는 문제
- **기존**: 1개 제품만 계산 가능 → 여러 제품 수입 시 각각 별도 계산 필요
- **문제**: 실제 수입은 한 컨테이너에 여러 제품을 섞어서 진행
- **개선**: 다중 제품 입력 + 제품별 개별 단가 + 공통 비용 자동 분배

### 1.3 핵심 변경사항
1. **다중 제품 입력**: 추가 버튼으로 제품을 하나씩 추가
2. **제품별 관세율**: 각 제품마다 다른 HS Code/관세율 적용
3. **제품별 공장 비용**: 각 제품에 여러 공장 연결 가능 (1:N)
4. **공장 비용 부과 방식**: 1회성 vs 수량 연동 구분
5. **공통 비용 CBM 분배**: 운송료 등을 CBM 비율로 각 제품에 분배
6. **개별 단가 표시**: 각 제품 카드 내에 개당 수입원가 표시

---

## 2. 요구사항 상세

### 2.1 다중 제품 입력

#### 현재 동작
```
[제품 정보]
원가: [____] USD/CNY
수량: [____] 개
크기: [__] × [__] × [__] cm
관세율: [전체 공통]
```

#### 변경 후 동작
```
[제품 1] ─────────────────────────────────
  품목: [HS Code 검색...]  ← 개별 검색
  원가: [____] × 수량: [____]
  크기: [__] × [__] × [__] cm
  관세율: 기본 8% / FTA 0%  ← 제품별 적용
  공장 비용: [설정...]  ← 제품별 연결
  ─────────────────────────────────────
  개당 수입원가: 15,230원  ← 개별 단가 표시
  [삭제]

[제품 2] ─────────────────────────────────
  품목: [HS Code 검색...]
  ...
  개당 수입원가: 28,450원
  [삭제]

[+ 제품 추가]
```

#### 기능 요구사항
- [ ] 제품 추가 버튼 클릭 시 새 제품 카드 생성
- [ ] 각 제품 카드에 삭제 버튼
- [ ] 제품별 HS Code 검색 및 관세율 적용
- [ ] 제품별 개당 수입원가 실시간 계산
- [ ] 최소 1개 제품 필수 (마지막 제품은 삭제 불가)

---

### 2.2 제품별 관세율

#### 문제점
```
제품 A (봉제인형): 관세율 0% (HS Code: 9503003411)
제품 B (가죽가방): 관세율 8% (HS Code: 4202210000)
제품 C (의류):     관세율 13% (HS Code: 6110200000)
```

현재 시스템은 전체에 하나의 관세율만 적용되어, 다른 종류의 제품을 함께 계산할 수 없음

#### 해결 방안
- 각 제품마다 별도의 HS Code 검색/선택
- 관세 계산이 제품별로 분리
- FTA 적용 여부도 제품별로 설정 가능

---

### 2.3 공장 비용 관리 (주문 레벨)

> **핵심 변경**: 공장 비용은 제품 레벨이 아닌 **주문 레벨**에서 관리하되, 각 공장마다 **연결된 제품**을 선택

#### 현재 동작
```
[중국 공장 추가 비용]  ← 전체 공통
├─ 공장1 슬롯: 라벨 1,000원, 박스 500원
├─ 공장2 슬롯: 특수포장 2,000원
└─ (모든 제품에 동일하게 적용)
```

#### 변경 후 동작
```
[중국 공장 추가 비용]
┌─ A공장 (인형+가방 제작) ────────────────
│  연결된 제품: [✓] 제품1 [✓] 제품2  ← 체크박스로 선택
│  ├─ 라벨 1,000원 (1회성)
│  └─ 포장 500원 (1회성)
│  비용 합계: 1,500원 → 제품당 750원씩 분배 (균등)
│
├─ B공장 (태그 공장) ─────────────────────
│  연결된 제품: [✓] 제품1 [  ] 제품2  ← 제품1만 선택
│  └─ 태그 100원 × 100개 = 10,000원 (수량연동)
│  비용 합계: 10,000원 → 제품1에만 적용
│
└─ C공장 (가방 전용) ─────────────────────
   연결된 제품: [  ] 제품1 [✓] 제품2  ← 제품2만 선택
   └─ 특수포장 2,000원 (1회성)
   비용 합계: 2,000원 → 제품2에만 적용
```

#### 비용 부과 방식

| 부과 방식 | 설명 | 예시 |
|----------|------|------|
| **1회성 (once)** | 제품 수량과 무관하게 1번만 부과 | 금형비, 샘플비, 검사비 |
| **수량연동 (per_quantity)** | 제품 수량만큼 부과 | 라벨, 태그, 개별 포장 |

#### 공장 비용 분배 방식

| 상황 | 분배 방식 |
|------|----------|
| 공장이 **1개 제품**에만 연결 | 해당 제품에 전액 적용 |
| 공장이 **여러 제품**에 연결 | **균등 분배** (제품 수로 나누기) |

#### 시나리오 예시

**시나리오**: A공장에서 봉제인형, 가방 2품목을 함께 제작, 비용은 1번만 청구

```
A공장 비용: 10,000원
├─ 연결된 제품: [✓] 봉제인형 [✓] 가방
├─ 분배: 균등 분배 (2개 제품)
└─ 결과:
   - 봉제인형: 5,000원
   - 가방: 5,000원
```

**시나리오**: 라벨 공장은 봉제인형에만 적용

```
라벨 공장 비용: 100원 × 100개 = 10,000원 (수량연동)
├─ 연결된 제품: [✓] 봉제인형 [  ] 가방
└─ 결과:
   - 봉제인형: 10,000원
   - 가방: 0원
```

#### 기능 요구사항
- [ ] 공장 슬롯 UI 유지 (현재 방식)
- [ ] 각 공장마다 "연결된 제품" 체크박스 추가
- [ ] 공장 비용은 연결된 제품들에 **균등 분배**
- [ ] 공장 비용 항목에 부과 방식 (1회성/수량연동) 설정
- [ ] 수량연동 비용은 연결된 제품의 수량 합계 기준
- [ ] 각 항목의 단가와 수량 모두 수동 조절 가능

---

### 2.4 공통 비용 CBM 비율 분배

#### 개념 설명
국제운송료, 국내운송료 등 **총 CBM 기준**으로 계산되는 비용은 각 제품의 **실제 CBM 비율**로 분배

#### 계산 예시
```
제품 A: 10개 × 0.001 CBM = 0.01 CBM
제품 B: 20개 × 0.002 CBM = 0.04 CBM
───────────────────────────────────
실제 총 CBM: 0.05 CBM
계산용 CBM: 0.5 CBM (올림 처리)

국제운송료: 100,000원 (0.5 CBM 기준)
```

**분배 결과**:
```
제품 A 비율: 0.01 / 0.05 = 20%
제품 B 비율: 0.04 / 0.05 = 80%

제품 A 운송료: 100,000 × 20% = 20,000원
제품 B 운송료: 100,000 × 80% = 80,000원
```

#### 분배 대상 비용
| 비용 항목 | 분배 방식 |
|----------|----------|
| 국제운송료 | CBM 비율 |
| 국내운송료 | CBM 비율 |
| 3PL 비용 | CBM 비율 |
| 내륙운송료 | CBM 비율 |
| 업체 공통 비용 | 주문 건수로 균등 분할 (기존 방식 유지) |
| 송금 수수료 | 금액 비율 또는 균등 분할 |

---

### 2.5 주문 건수 자동화

#### 현재 동작
```
주문 건수: [수동 입력]
```

#### 변경 후 동작
```
주문 건수: [3] ← 기본값 = 제품 개수 (자동)
          └─ 수동 조절 가능
```

#### 기능 요구사항
- [ ] 제품 추가 시 주문 건수 기본값 자동 증가
- [ ] 제품 삭제 시 주문 건수 기본값 자동 감소
- [ ] 사용자가 필요 시 수동으로 조절 가능

---

### 2.6 개별 단가 표시

#### 표시 위치
각 제품 카드 하단에 해당 제품의 개당 수입원가 표시

#### 계산 방식
```typescript
제품별 개당 단가 = (
  제품가격(원화)
  + 관세
  + 부가세
  + 공장비용
  + (공통비용 × CBM비율)
) / 제품수량
```

#### UI 예시
```
[제품 1: 봉제인형] ─────────────────────
  품목: 봉제인형 (HS: 9503003411)
  단가: $10 × 수량: 100개 = $1,000
  관세율: 0% (FTA 적용)
  공장비용: 25,000원
  ─────────────────────────────────────
  📦 개당 수입원가: 15,230원
```

---

## 3. 데이터 구조 변경

### 3.1 새로운 타입 정의

```typescript
// src/types/shipping.ts

// 제품 타입 (신규)
interface Product {
  id: string                      // 고유 ID (uuid)
  name?: string                   // 제품명 (선택)
  unitPrice: number               // 개당 원가 (외화)
  currency: "USD" | "CNY"         // 통화
  quantity: number                // 수량
  dimensions: ProductDimensions   // 제품 크기

  // 관세 정보 (제품마다 다름)
  hsCode: HsCodeWithTariff | null
  basicTariffRate: number
  ftaTariffRate: number
  useFta: boolean
}

// 공장 슬롯 타입 (기존 확장)
interface FactorySlot {
  factoryId: Id<"factories"> | null
  selectedItemIds: string[]
  costValues: { [itemId: string]: number }
  // 신규 필드
  linkedProductIds: string[]      // 연결된 제품 ID 목록
}

// 공장 비용 항목 타입 (기존 확장)
interface FactoryCostItemWithChargeType {
  itemId: string
  name: string
  unitAmount: number              // 단가 (조절 가능)
  quantity: number                // 수량 (조절 가능)
  chargeType: "once" | "per_quantity"  // 부과 방식
}

// 제품별 계산 결과 (신규)
interface ProductCalculationResult {
  productId: string

  // CBM 정보
  unitCbm: number
  totalCbm: number
  cbmRatio: number                // 전체 대비 CBM 비율

  // 비용 내역
  productPriceKRW: number         // 제품가격 (원화)
  tariffAmount: number            // 관세
  vatAmount: number               // 부가세
  factoryCostsTotal: number       // 공장비용 합계
  sharedCostsTotal: number        // 분배받은 공통비용

  // 최종 결과
  totalCost: number               // 해당 제품 총 비용
  unitCost: number                // 개당 수입원가
}
```

### 3.2 데이터베이스 스키마 변경

```typescript
// convex/schema.ts

// factoryCostItems 테이블에 chargeType 필드 추가
factoryCostItems: defineTable({
  factoryId: v.id("factories"),
  name: v.string(),
  amount: v.number(),
  chargeType: v.optional(v.union(
    v.literal("once"),
    v.literal("per_quantity")
  )),  // 신규 필드 (기본값: "once")
  sortOrder: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

### 3.3 기존 데이터 마이그레이션
- 기존 `factoryCostItems` 데이터의 `chargeType` 기본값: `"once"` (1회성)
- 관리자 화면에서 항목별로 부과 방식 변경 가능

---

## 4. 계산 로직 변경

### 4.1 기존 calculateImportCost 함수 확장

```typescript
// src/lib/calculations/index.ts

// 기존: 단일 제품
function calculateImportCost(params: CalculatorInput): CalculationResult

// 변경: 다중 제품 지원
function calculateImportCost(params: MultiProductCalculatorInput): MultiProductCalculationResult

interface MultiProductCalculatorInput {
  products: Product[]             // 제품 배열
  shippingCompanyId: Id<"shippingCompanies">
  rateTypeId: Id<"shippingRateTypes">
  selectedCompanyCostIds: Id<"companyCostItems">[]
  orderCount: number              // 주문 건수 (기본값: 제품 수)
  exchangeRate: { usd: number; cny: number }
  shippingRates: ShippingRateTable[]
  companyCosts: CostItemInput[]
  costSettings: CostSettings
}

interface MultiProductCalculationResult {
  // 제품별 결과
  products: ProductCalculationResult[]

  // 전체 합계
  totalCbm: number
  roundedCbm: number
  totalCost: number

  // 공통 비용 내역 (분배 전)
  sharedCosts: {
    internationalShipping: number
    domesticShipping: number
    threePL: number
    inlandShipping: number
    companyCosts: number
    remittanceFee: number
  }

  // 기존 breakdown 호환
  breakdown: CalculationBreakdown
}
```

### 4.2 CBM 비율 분배 로직

```typescript
function distributeSharedCosts(
  products: Product[],
  sharedCosts: SharedCosts
): ProductSharedCosts[] {
  // 1. 각 제품의 실제 CBM 계산
  const productCbms = products.map(p => ({
    productId: p.id,
    cbm: calculateTotalCbm(p.dimensions, p.quantity)
  }))

  // 2. 총 CBM 계산
  const totalActualCbm = productCbms.reduce((sum, p) => sum + p.cbm, 0)

  // 3. CBM 비율로 분배
  return productCbms.map(({ productId, cbm }) => {
    const ratio = totalActualCbm > 0 ? cbm / totalActualCbm : 1 / products.length

    return {
      productId,
      cbmRatio: ratio,
      internationalShipping: Math.round(sharedCosts.internationalShipping * ratio),
      domesticShipping: Math.round(sharedCosts.domesticShipping * ratio),
      threePL: Math.round(sharedCosts.threePL * ratio),
      inlandShipping: Math.round(sharedCosts.inlandShipping * ratio),
      // 업체 공통 비용은 주문 건수로 균등 분할 (기존 방식)
    }
  })
}
```

### 4.3 공장 비용 계산 (연결된 제품 + 균등 분배)

```typescript
// 공장 슬롯별로 비용 계산 후, 연결된 제품에 균등 분배
function calculateFactoryCostsByProduct(
  factorySlots: FactorySlot[],
  products: Product[],
  factoryCostItems: FactoryCostItem[],
  exchangeRate: ExchangeRate
): Map<string, number> {  // productId → 공장비용

  const productCosts = new Map<string, number>()

  // 모든 제품의 공장비용을 0으로 초기화
  products.forEach(p => productCosts.set(p.id, 0))

  for (const slot of factorySlots) {
    if (!slot.factoryId) continue

    // 1. 해당 공장 슬롯의 총 비용 계산
    let slotTotalCost = 0

    for (const itemId of slot.selectedItemIds) {
      const item = factoryCostItems.find(i => i._id === itemId)
      if (!item) continue

      const costValue = slot.costValues[itemId] ?? item.amount

      if (item.chargeType === "per_quantity") {
        // 수량연동: 연결된 제품들의 수량 합계 기준
        const linkedProducts = products.filter(p =>
          slot.linkedProductIds.includes(p.id)
        )
        const totalQuantity = linkedProducts.reduce((sum, p) => sum + p.quantity, 0)
        slotTotalCost += costValue * totalQuantity
      } else {
        // 1회성: 1번만 부과
        slotTotalCost += costValue
      }
    }

    // 2. 연결된 제품에 균등 분배
    const linkedProductIds = slot.linkedProductIds.filter(id =>
      products.some(p => p.id === id)
    )

    if (linkedProductIds.length > 0) {
      const perProductCost = Math.round(slotTotalCost / linkedProductIds.length)

      linkedProductIds.forEach(productId => {
        const current = productCosts.get(productId) || 0
        productCosts.set(productId, current + perProductCost)
      })
    }
  }

  return productCosts
}
```

#### 계산 예시

```
[입력]
제품1: 봉제인형 100개
제품2: 가방 50개

A공장 (연결: 제품1, 제품2)
├─ 라벨 1,000원 (1회성)
└─ 포장 500원 (1회성)
= 1,500원 → 균등 분배 → 제품당 750원

B공장 (연결: 제품1만)
└─ 태그 100원 (수량연동) × 100개 = 10,000원
= 10,000원 → 제품1에만

[결과]
제품1 공장비용: 750 + 10,000 = 10,750원
제품2 공장비용: 750원
```
```

---

## 5. UI 컴포넌트 변경

### 5.1 새로운 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| `ProductList.tsx` | 제품 목록 관리 (추가/삭제) |
| `ProductCard.tsx` | 단일 제품 입력 카드 |
| `ProductFactoryCostEditor.tsx` | 제품별 공장 비용 설정 |

### 5.2 수정할 컴포넌트

| 컴포넌트 | 변경 내용 |
|----------|----------|
| `ImportCalculator.tsx` | 상태 관리: 단일 → 배열 |
| `AdditionalCostInput.tsx` | 제품별 공장 연결 UI |
| `TotalCostCard.tsx` | 제품별 단가 요약 추가 |
| `CostBreakdown.tsx` | 제품별 내역 표시 옵션 |

### 5.3 UI 와이어프레임

```
+------------------------------------------------------------------+
|  [HEADER] 중국 수입원가 계산기                                     |
+-------------------------------+----------------------------------+
|       좌측: 입력 영역          |        우측: 결과 영역            |
+-------------------------------+----------------------------------+
| [환율 정보]                    | [CBM 계산 결과]                  |
| USD: 1,350원 | CNY: 190원     | 총 CBM: 1.5 m³                  |
|                               |                                  |
+-------------------------------+----------------------------------+
| [제품 1: 봉제인형] ──────────  | [제품별 단가]                    |
| 품목: [봉제인형 검색완료]       | ┌────────────────────────────┐  |
| 단가: $10 × 수량: 100개        | │ 봉제인형: 15,230원/개        │  |
| 크기: 30×20×15 cm              | │ 가죽가방: 28,450원/개        │  |
| 관세: 0% (FTA) [변경]          | └────────────────────────────┘  |
| 공장비용: [설정] 총 25,000원    |                                  |
| ───────────────────────────── | [비용 상세 내역]                  |
| 📦 개당 단가: 15,230원         | 제품가격        2,900,000원      |
| [삭제]                         | 관세               116,000원     |
|                               | 부가세             301,600원     |
| [제품 2: 가죽가방] ──────────  | 공장비용            55,000원     |
| 품목: [가죽가방 검색완료]       | 국제운송료         150,000원     |
| 단가: $20 × 수량: 50개         | 국내운송료          90,000원     |
| 크기: 40×30×20 cm              | ...                              |
| 관세: 8% (기본) [변경]         +----------------------------------+
| 공장비용: [설정] 총 30,000원    | [총 수입원가]                    |
| ───────────────────────────── |                                  |
| 📦 개당 단가: 28,450원         | ╔══════════════════════════╗     |
| [삭제]                         | ║  4,945,000원             ║     |
|                               | ║  (봉제인형 1,523,000원)   ║     |
| [+ 제품 추가]                  | ║  (가죽가방 3,422,000원)   ║     |
|                               | ╚══════════════════════════╝     |
+-------------------------------+----------------------------------+
| [국제 운송 회사]               | [주문 건수]                      |
| [업체 선택]                    | [2] (기본값: 제품 수)            |
+-------------------------------+----------------------------------+
```

---

## 6. 파일 구조 변경

### 6.1 신규 생성

```
src/components/calculator/input/
├── ProductList.tsx              # 제품 목록 (추가/삭제)
├── ProductCard.tsx              # 단일 제품 카드
└── ProductFactoryCostEditor.tsx # 제품별 공장 비용 설정

src/lib/calculations/
└── multiProduct.ts              # 다중 제품 계산 로직
```

### 6.2 수정

```
src/types/shipping.ts            # Product, ProductFactoryCost 타입 추가
convex/schema.ts                 # factoryCostItems에 chargeType 추가
convex/factoryCostItems.ts       # CRUD 수정

src/components/calculator/
├── ImportCalculator.tsx         # 상태 관리 배열로 변경
├── input/AdditionalCostInput.tsx  # 제품별 공장 연결 UI
└── result/TotalCostCard.tsx     # 제품별 단가 요약

src/lib/calculations/index.ts    # 다중 제품 계산 지원
src/lib/calculations/costs.ts    # 공장 비용 계산 수정
```

---

## 7. 구현 순서

### Phase 1: 데이터 구조 변경
1. `src/types/shipping.ts`에 Product, ProductFactoryCost 타입 추가
2. `convex/schema.ts`에 chargeType 필드 추가
3. `convex/factoryCostItems.ts` CRUD 수정
4. 기존 데이터 마이그레이션 (기본값: "once")

### Phase 2: 계산 로직 수정
1. `src/lib/calculations/multiProduct.ts` 신규 생성
2. CBM 비율 분배 로직 구현
3. 공장 비용 계산에 chargeType 반영
4. `calculateImportCost` 함수 확장

### Phase 3: UI 컴포넌트 - 기본
1. `ProductCard.tsx` 생성 (단일 제품 입력)
2. `ProductList.tsx` 생성 (추가/삭제 버튼)
3. `ImportCalculator.tsx` 상태 관리 수정
4. 제품 카드 내 개별 단가 표시

### Phase 4: UI 컴포넌트 - 공장 비용
1. `ProductFactoryCostEditor.tsx` 생성
2. 제품별 공장 연결 UI
3. 비용 항목별 단가/수량 조절 UI
4. 부과 방식(1회성/수량연동) 설정 UI

### Phase 5: 결과 표시 개선
1. `TotalCostCard.tsx` 제품별 단가 요약 추가
2. `CostBreakdown.tsx` 제품별 내역 표시 옵션

---

## 8. 검증 계획

### 8.1 기능 테스트

- [ ] 제품 추가/삭제 동작
- [ ] 제품별 HS Code 검색 및 관세율 적용
- [ ] 제품별 공장 비용 연결
- [ ] 1회성 vs 수량연동 비용 계산
- [ ] CBM 비율 분배 계산
- [ ] 주문 건수 자동 증가/감소
- [ ] 개별 단가 실시간 계산

### 8.2 계산 검증

#### 테스트 케이스 1: 다른 관세율
```
제품 A: 봉제인형 100개, $10, 관세 0%
제품 B: 가죽가방 50개, $20, 관세 8%

예상: 각 제품의 관세가 개별적으로 계산됨
```

#### 테스트 케이스 2: CBM 분배
```
제품 A: 0.01 CBM (20%)
제품 B: 0.04 CBM (80%)
국제운송료: 100,000원

예상: A에 20,000원, B에 80,000원 분배
```

#### 테스트 케이스 3: 수량연동 비용
```
제품 A: 100개
공장 비용: 라벨 100원 (수량연동)

예상: 100원 × 100개 = 10,000원
```

#### 테스트 케이스 4: 공장 비용 공유 (균등 분배)
```
제품 A: 봉제인형 100개
제품 B: 가방 50개

A공장 비용: 10,000원 (1회성)
├─ 연결된 제품: [✓] 제품 A [✓] 제품 B
└─ 분배: 균등

예상:
- 제품 A 공장비용: 5,000원
- 제품 B 공장비용: 5,000원
```

#### 테스트 케이스 5: 수량연동 + 여러 제품 연결
```
제품 A: 100개
제품 B: 50개

라벨 공장: 라벨 100원 (수량연동)
├─ 연결된 제품: [✓] 제품 A [✓] 제품 B
└─ 수량 합계: 100 + 50 = 150개
└─ 총 비용: 100원 × 150개 = 15,000원
└─ 분배: 균등 → 제품당 7,500원

예상:
- 제품 A 공장비용: 7,500원
- 제품 B 공장비용: 7,500원
```

### 8.3 UI 테스트

- [ ] 제품 카드 추가/삭제 애니메이션
- [ ] 개별 단가 실시간 업데이트
- [ ] 반응형 레이아웃 (모바일에서 카드 스택)
- [ ] 공장 비용 설정 모달 동작

---

## 9. 제약 사항 및 향후 계획

### 9.1 현재 제약
- 최대 제품 수: 10개 (성능 고려)
- 제품당 최대 공장 연결: 6개 (현재 슬롯 시스템 유지)

### 9.2 향후 확장
- **R.TON 기준 운송료 계산**: CBM vs 중량 중 큰 값으로 계산 (운송사별 선택)
- 제품 템플릿 저장/불러오기
- 자주 사용하는 제품 조합 프리셋
- 제품별 메모 기능
- 엑셀 일괄 업로드

---

## 10. 용어 정리

| 용어 | 설명 |
|------|------|
| **1회성 비용 (once)** | 제품 수량과 무관하게 1번만 부과되는 비용 (예: 금형비, 샘플비) |
| **수량연동 비용 (per_quantity)** | 제품 수량만큼 부과되는 비용 (예: 라벨, 태그, 개별포장) |
| **연결된 제품 (linkedProducts)** | 특정 공장 비용을 공유하는 제품 목록 |
| **균등 분배** | 공장 비용을 연결된 제품 수로 나누는 방식 (예: 2개 제품 → 50%씩) |
| **CBM 비율 분배** | 공통 비용을 각 제품의 CBM 점유 비율로 나누는 방식 |
| **주문 건수** | 업체 공통 비용을 나누는 기준 (기본값: 제품 개수) |
