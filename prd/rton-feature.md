# R.TON(Revenue Ton) 계산 기능 PRD

## 문서 정보
- **작성일**: 2026-01-22
- **버전**: 1.1
- **상태**: 구현 완료
- **관련 PRD**: multi-product-feature.md

---

## 1. 개요

### 1.1 프로젝트 목적
제품 목록에 중량 입력 필드를 추가하고, R.TON(Revenue Ton)을 자동 계산하여 운임 산정의 정확성을 높임

### 1.2 해결하려는 문제
- **기존**: CBM(용적)만으로 운임 계산 → 무거운 화물의 경우 실제 운임과 차이 발생
- **문제**: 운송사는 CBM과 중량 중 큰 값(R.TON)으로 운임을 책정함
- **개선**: 중량 입력 + R.TON 자동 계산으로 실제 운임 예측 정확도 향상

### 1.3 R.TON 개념

> **R.TON (Revenue Ton)** = MAX(중량톤, 용적톤)
>
> 운송사가 운임을 계산할 때 사용하는 기준 단위. 화물의 **무게**와 **부피** 중 더 큰 값을 선택하여 요금을 부과함.

| 용어 | 설명 | 계산 방식 |
|------|------|----------|
| **W/T (Weight Ton)** | 중량톤 | 총 중량(kg) ÷ 1,000 |
| **M/T (Measurement Ton)** | 용적톤 | 총 CBM (1 CBM = 1 M/T) |
| **R.TON** | Revenue Ton | MAX(W/T, M/T) |

#### 예시
```
예시 1: 부피 큰 가벼운 물건 (스티로폼)
- 크기: 50×50×50cm, 중량: 0.5kg, 수량: 100개
- 총 CBM: 12.5 → M/T: 12.5
- 총 중량: 50kg → W/T: 0.05
- R.TON = MAX(0.05, 12.5) = 12.5 (부피 기준)

예시 2: 무거운 작은 물건 (철제품)
- 크기: 10×10×10cm, 중량: 5kg, 수량: 500개
- 총 CBM: 0.5 → M/T: 0.5
- 총 중량: 2,500kg → W/T: 2.5
- R.TON = MAX(2.5, 0.5) = 2.5 (중량 기준)
```

---

## 2. 요구사항 상세

### 2.1 중량 입력 필드 추가

#### 현재 동작
```
[제품 카드]
통화: [USD ▼]  단가: [$____]  수량: [____]
```

#### 변경 후 동작
```
[제품 카드]
통화: [USD ▼]  단가: [$____]  수량: [____]  중량: [____] kg
```

#### 기능 요구사항
- [ ] 통화, 단가, 수량 우측에 "중량" 입력 필드 추가
- [ ] 단위: kg (킬로그램)
- [ ] 소수점 2자리까지 입력 가능
- [ ] 최대값: 10,000kg (10톤)
- [ ] 기본값: 0 (미입력 상태)

---

### 2.2 R.TON 자동 계산

#### 계산 로직
```typescript
// 1. 중량톤 계산 (W/T)
const weightTon = (개당중량 × 수량) / 1000

// 2. 용적톤 계산 (M/T = CBM)
const measurementTon = totalCbm

// 3. R.TON 계산
const rTon = Math.max(weightTon, measurementTon)
```

#### 기능 요구사항
- [ ] 중량 또는 수량 변경 시 R.TON 실시간 재계산
- [ ] 중량 미입력(0) 시 R.TON 정보 미표시

---

### 2.3 R.TON 정보 표시

#### 표시 위치
제품 카드의 CBM 표시 영역에 R.TON 정보 추가

#### 현재 동작
```
[CBM]
단위: 0.00
합계: 0.00
```

#### 변경 후 동작 (중량 입력 시)
```
[CBM / R.TON]
단위 CBM: 0.001
합계 CBM: 0.10
──────────────
W/T:  0.50
M/T:  0.10
R.TON: 0.50 ← 강조 표시
```

#### 기능 요구사항
- [ ] 중량 미입력 시: 기존 CBM만 표시
- [ ] 중량 입력 시: W/T, M/T, R.TON 추가 표시
- [ ] R.TON 값은 포인트 색상으로 강조
- [ ] 소수점 2자리로 표시

---

### 2.4 전체 합계 표시

#### 제품 목록 헤더에 전체 R.TON 표시

```
[제품 목록] (2개)        CBM: 1.25  R.TON: 2.50  →  적용: 1.5
```

#### 기능 요구사항
- [ ] 전체 제품의 R.TON 합계 표시
- [ ] 중량 입력된 제품이 없으면 R.TON 미표시

---

## 3. 데이터 구조 변경

### 3.1 타입 정의

```typescript
// src/types/shipping.ts

// Product 인터페이스 수정
interface Product {
  id: string
  name?: string
  unitPrice: number
  currency: "USD" | "CNY"
  quantity: number
  dimensions: ProductDimensions
  weight: number  // [추가] 개당 중량 (kg)

  // 관세 정보
  hsCode: HsCodeWithTariff | null
  basicTariffRate: number
  ftaTariffRate: number
  useFta: boolean
}

// ProductCalculationResult 인터페이스 수정
interface ProductCalculationResult {
  productId: string
  productName?: string

  // CBM 정보
  unitCbm: number
  totalCbm: number
  cbmRatio: number

  // [추가] R.TON 정보
  unitWeight: number       // 개당 중량 (kg)
  totalWeight: number      // 총 중량 (kg)
  weightTon: number        // W/T (총중량/1000)
  measurementTon: number   // M/T (= totalCbm)
  rTon: number             // R.TON = MAX(W/T, M/T)

  // ... 기존 필드들
}

// MultiProductCalculationResult 인터페이스 수정
interface MultiProductCalculationResult {
  products: ProductCalculationResult[]

  totalCbm: number
  roundedCbm: number

  // [추가] R.TON 전체 합계
  totalWeight: number      // 전체 총 중량 (kg)
  totalRTon: number        // 전체 R.TON

  // ... 기존 필드들
}
```

---

## 4. 파일 변경 목록

### 4.1 신규 생성

| 파일 | 설명 |
|------|------|
| `src/lib/calculations/rton.ts` | R.TON 계산 함수 모듈 |

### 4.2 수정

| 파일 | 변경 내용 |
|------|----------|
| `src/types/shipping.ts` | Product, 계산 결과 타입에 weight/R.TON 필드 추가 |
| `src/lib/calculations/index.ts` | R.TON 함수 export 추가 |
| `src/lib/calculations/multiProduct.ts` | R.TON 계산 로직 통합 |
| `src/components/calculator/input/ProductCard.tsx` | 중량 입력 UI, R.TON 표시 추가 |
| `src/components/calculator/input/ProductList.tsx` | 헤더에 전체 R.TON 표시 |

---

## 5. UI 와이어프레임

### 5.1 제품 카드 - 입력 영역

```
┌─────────────────────────────────────────────────────────────┐
│ 제품 1                                            [삭제] [▲]│
├─────────────────────────────────────────────────────────────┤
│ [HS Code 검색...]                                           │
│                                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ 통화     │ │ 단가     │ │ 수량     │ │ 중량     │ ← 신규 │
│ │ [USD ▼] │ │ [$10.00] │ │ [100   ] │ │ [0.50  ] │        │
│ │          │ │          │ │          │ │ kg       │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                             │
│ ┌────────────────────┐ ┌────────────────────┐              │
│ │ 크기 (cm)          │ │ CBM / R.TON        │              │
│ │ [30]×[20]×[15]     │ │ 단위 CBM: 0.009    │              │
│ │                    │ │ 합계 CBM: 0.90     │              │
│ │                    │ │ ──────────────     │              │
│ │                    │ │ W/T:  0.05         │              │
│ │                    │ │ M/T:  0.90         │              │
│ │                    │ │ R.TON: 0.90        │ ← 강조       │
│ └────────────────────┘ └────────────────────┘              │
│                                                             │
│ [FTA 적용 ○]    기본 [8  ]%    FTA [0  ]%                   │
│                                                             │
│ 적용 관세율: 0%              개당 15,230원    [입력 완료]   │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 제품 목록 헤더

```
┌─────────────────────────────────────────────────────────────┐
│ 📦 제품 목록 (2개)                                          │
│                                                             │
│ CBM: 1.25  |  R.TON: 2.50  →  적용: 1.5        [+ 제품 추가]│
└─────────────────────────────────────────────────────────────┘
```

---

## 6. 구현 순서

### Phase 1: 데이터 구조
1. `src/types/shipping.ts` - Product에 weight 필드 추가
2. `src/types/shipping.ts` - 계산 결과 타입에 R.TON 필드 추가

### Phase 2: 계산 로직
3. `src/lib/calculations/rton.ts` - R.TON 계산 함수 생성
4. `src/lib/calculations/index.ts` - export 추가
5. `src/lib/calculations/multiProduct.ts` - 계산 로직에 R.TON 통합

### Phase 3: UI
6. `src/components/calculator/input/ProductCard.tsx` - 중량 입력 필드 추가
7. `src/components/calculator/input/ProductCard.tsx` - R.TON 표시 추가
8. `src/components/calculator/input/ProductCard.tsx` - createEmptyProduct에 weight 기본값 추가

### Phase 4: 검증
9. 빌드 테스트 (`npm run build`)
10. 기능 테스트

---

## 7. 검증 계획

### 7.1 기능 테스트

| 테스트 항목 | 예상 결과 |
|------------|----------|
| 중량 입력 필드 표시 | 수량 우측에 "중량 (kg)" 필드 표시 |
| 중량 입력 | 소수점 2자리까지 입력 가능 |
| 최대값 제한 | 10,000 초과 시 10,000으로 제한 |
| R.TON 계산 | W/T, M/T 중 큰 값 표시 |
| 중량 미입력 | R.TON 관련 정보 미표시 |

### 7.2 계산 검증

#### 테스트 케이스 1: 부피 기준 (M/T > W/T)
```
입력:
- 크기: 50×50×50cm
- 중량: 0.5kg
- 수량: 100개

예상 결과:
- 총 CBM: 12.5
- W/T: 0.05 (50kg / 1000)
- M/T: 12.5
- R.TON: 12.5 ← M/T 기준
```

#### 테스트 케이스 2: 중량 기준 (W/T > M/T)
```
입력:
- 크기: 10×10×10cm
- 중량: 5kg
- 수량: 500개

예상 결과:
- 총 CBM: 0.5
- W/T: 2.5 (2500kg / 1000)
- M/T: 0.5
- R.TON: 2.5 ← W/T 기준
```

#### 테스트 케이스 3: 중량 미입력
```
입력:
- 크기: 30×20×15cm
- 중량: 0 (미입력)
- 수량: 100개

예상 결과:
- CBM만 표시
- R.TON 관련 정보 미표시
```

---

## 8. 향후 확장 계획

### 8.1 R.TON 기반 운송료 계산
현재는 CBM 기준으로 운송료를 계산하지만, 향후 R.TON 기준 운송료 계산 옵션 추가 가능

```typescript
// 비용 설정에 운송료 계산 기준 추가
costSettings?: {
  shippingRateBasis?: "cbm" | "rton"  // 운송료 계산 기준
}
```

### 8.2 R.TON 기반 비용 분배
현재는 CBM 비율로 공통 비용을 분배하지만, R.TON 비율 기반 분배 옵션 추가 가능

```typescript
costSettings?: {
  distributionBasis?: "cbm" | "rton"  // 비용 분배 기준
}
```

### 8.3 단위 선택
kg 외에 lbs(파운드) 단위 지원

```typescript
interface Product {
  weight: number
  weightUnit?: "kg" | "lbs"  // 기본값: kg
}
```

---

## 9. 용어 정리

| 용어 | 영문 | 설명 |
|------|------|------|
| **중량톤** | Weight Ton (W/T) | 화물의 실제 무게를 톤으로 환산 (1,000kg = 1톤) |
| **용적톤** | Measurement Ton (M/T) | 화물의 부피를 톤으로 환산 (1 CBM = 1톤) |
| **레비뉴톤** | Revenue Ton (R.TON) | 운임 산정 기준 단위 (W/T와 M/T 중 큰 값) |
| **CBM** | Cubic Meter | 입방미터, 화물의 부피 단위 |
