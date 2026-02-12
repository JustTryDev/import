# SF Express 내륙 운송료 자동 계산 시스템

## 1. 개요

### 현재 상태
현재 내륙 운송료(중국 공장 → 운송업체 창고)는 **CBM × $70/CBM** 고정 단가로 단순 계산 중.

```
calculateInlandShipping(cbm) = cbm × 70 (USD)
```

### 변경 목표
SF Express(순펑택배) 실제 요금표 기반의 자동 계산 로직으로 **완전 대체**.

```
기존: 내륙운송료 = CBM × $70 → × 환율 → 원화
변경: 내륙운송료 = SF Express(중량, 부피, 출발지, 도착지, 서비스) → × 환율 → 원화
```

### 데이터 출처
- **요금표**: SF Express 배달원이 직접 제공한 장쑤성(江苏省) 발송 기준 실제 요금표
- **계산 규칙**: Multi-AI 3라운드 조사 (GLM + Gemini + Codex + Claude 교차 검증)

---

## 2. SF Express 요금 체계 핵심 정리

### 2-1. 서비스 유형 (2종으로 간소화)

SF Express 실제 서비스는 즉일/차신/특쾌/표쾌/특혜 등 다양하지만, 우리 시스템에서는 **실제 사용 빈도**와 **체적 계수 차이**를 기준으로 2종으로 분류:

| 시스템 명칭 | SF Express 원래 명칭 | 체적 계수 | 배송 속도 | 설명 |
|------------|---------------------|----------|----------|------|
| **급송** (Express) | 특쾌 (特快) | **6000** | 1~2일 | 빠른 배송, 비용 높음 |
| **표준** (Standard) | 표쾌 (标快) | **12000** (<30kg) / **6000** (>=30kg) | 2~4일 | 일반 배송, 비용 저렴 |

> **간소화 이유**: 즉일/차신은 동성(같은 시) 전용으로 성외(타 성) 배송에 거의 사용하지 않음. 특혜(경제)는 요금표 미제공.

### 2-2. 핵심 계산 규칙

#### 체적중량 (Volumetric Weight)
```
체적중량(kg) = 가로(cm) × 세로(cm) × 높이(cm) ÷ 체적계수
```

| 서비스 | 조건 | 체적 계수 | 비고 |
|--------|------|----------|------|
| 급송 | 모든 구간 | 6000 | 항공 화물 표준 |
| 표준 | 동성/성내/경제구역 내 | 12000 | 같은 경제권은 유리 |
| 표준 | 성외/경제구역 간 | 6000 | 다른 경제권은 항공 기준 적용 |

> **4대 경제구역** (같은 구역 내는 "성내" 취급):
> - 징진지: 북경, 천진, 하북
> - 장저후완: **장쑤**, 저장, 상해, 안후이
> - 촨위: 사천, 중경
> - 헤이지랴오: 흑룡강, 길림, 요녕
>
> 출처: [快递鸟](https://news.kdniao.com/logistics-qa/224160.html), [百运网](https://www.by56.com/news/40387.html), [Extrabux](https://www.extrabux.com/chs/guide/6575087)

#### 계비중량 (Chargeable Weight)
```
계비중량 = MAX(실제중량, 체적중량)
```
둘 중 큰 값으로 요금 계산.

#### 2378 반올림 규칙

SF Express 고유의 중량 반올림 규칙:

| 무게 구간 | 반올림 단위 | 규칙 | 예시 |
|-----------|-----------|------|------|
| **<10kg** | 0.1kg | 사사오입 (일반 반올림) | 3.14 → 3.1, 3.15 → 3.2 |
| **10~100kg** | 0.5kg | 2378제 | 아래 상세 |
| **>=100kg** | 1kg | 사사오입 (일반 반올림) | 100.4 → 100, 100.5 → 101 |

**2378제 상세 (10~100kg 구간):**
- 소수점 이하 <=0.2 → 내림 (10.2 → 10.0)
- 소수점 이하 0.3~0.7 → 0.5로 (10.3 → 10.5, 10.7 → 10.5)
- 소수점 이하 >=0.8 → 올림 (10.8 → 11.0)

### 2-3. 운임 계산 공식

#### 공식 A: 수중+속중 방식 (<30kg 또는 kg당 단가 없는 경우)
```
운임(위안) = 수중단가 + (계비중량 - 1) × 속중단가
결과 사사오입 정수
```

**예시**: 장쑤 → 호북, 표준, 5kg
```
= 18 + (5-1) × 5
= 18 + 20 = 38위안
```

#### 공식 B: kg당 단가 방식 (>=30kg이고 kg당 단가 있는 경우)
```
운임(위안) = 계비중량 × kg당단가
결과 사사오입 정수
```

**예시**: 장쑤 → 산동, 표준, 35kg
```
= 35 × 5 = 175위안
```

### 2-4. 30kg 기준 가격 공식 변화

**경제구역 외** 배송 시, 표준 서비스에서 30kg를 기준으로 **계산 공식이 바뀜**:

| 항목 | <30kg | >=30kg |
|------|-------|--------|
| **계산 방식** | 수중 + (무게-1) × 속중 | 무게 × kg당단가 |

> 참고: 체적 계수는 30kg가 아니라 **경제구역** 기준으로 결정됨 (섹션 2-2 참조).
> 경제구역 외는 항상 6000, 경제구역 내는 항상 12000.

**영향 분석** (경제구역 외, 체적계수 6000 기준):
- **계산 방식 변경**: 수중(첫 1kg 기본료)이 없어지므로, 같은 무게면 kg당 단가는 **살짝 저렴**

**구체적 예시 (장쑤 → 호북, 경제구역 외):**

| 상황 | 운임 | 비고 |
|------|------|------|
| 실제 5kg, 작은 박스 | 18+(5-1)×5 = **38원** | <30kg 수중+속중 공식 |
| 실제 29kg, 작은 박스 | 18+(29-1)×5 = **158원** | <30kg 수중+속중 공식 |
| 실제 30kg, 작은 박스 | 30×5 = **150원** | >=30kg kg당단가 공식 (더 저렴) |
| 실제 35kg, 50×40×30cm | MAX(35, 60000÷6000=10)=35 → 35×5 = **175원** | >=30kg kg당단가 공식 |

---

## 3. 장쑤성 요금표 데이터 (실제 요금표 기준)

### 3-1. 동성/성내 요금 (급송=특쾌 기준)

> 참고: 동성/성내는 이미지 기준 즉일/차신 서비스로 표기되어 있으나,
> 우리 시스템에서는 동성/인접 성은 사용 빈도가 낮아 우선순위 낮음.
> 필요시 추후 추가.

| 목적지 | 즉일 수중/속중 | 차신 수중/속중 |
|--------|-------------|-------------|
| 동성 (같은 시) | 12/2 | 12/2 |
| 무석,진강,소주,남통,양주,상주 | 20/2 | 12/2 |
| 염성,회안,연운항,태주 | - | 12/2 |
| 서주,숙천 | - | 12/2 |

### 3-2. 성외 요금 (급송=특쾌, 표준=표쾌)

| 목적지 | 급송(특쾌) 수중/속중 | 표준(표쾌) 수중/속중 | 표준 >=30kg 단가 |
|--------|-------------------|--------------------|-----------------|
| 장쑤,상해,저장 | - | 12/2 | - |
| 안후이 | - | 14/2 | - |
| 호북,하남,강서 | 22/8 | 18/5 | 5 |
| 산동 | 22/10 | 18/5 | 5 |
| 복건 | 22/10 | 18/6 | 6 |
| 북경,천진,하북,호남 | 23/10 | 18/5 | 5 |
| 섬서,산서 | 23/10 | 18/5 | 5 |
| 사천,귀주,중경,요녕,광서,감숙,영하 | 23/13 | 18/6 | 6 |
| 광동 | 23/13 | 18/9 | 9 |
| 운남 | 23/14 | 18/6 | 6 |
| 해남 | 23/14 | 18/6 | 6 |
| 길림 | 23/14 | 18/6 | 6 |
| 흑룡강 | 23/18 | 18/9 | 9 |
| 신장 | 26/21 | 20/10 | 10 |
| 청해(옥수) | 23/14 | 21/12 | - |
| 내몽고(대부분) | 23/13 | 18/6 | 6 |
| 내몽고(호론패이,흥안맹) | 23/18 | 18/9 | 9 |
| 서장(라싸 등) | 26/21 | 25/19 | - |
| 서장(창두) | - | 26/21 | - |

> **"-" 표시**: 해당 서비스 이용 불가 (DB에서 `isAvailable: false`)
> **">=30kg 단가 없음"**: kg당 단가 미제공 → <30kg 공식(수중+속중)으로 계산

### 3-3. 조사 자료 vs 실제 요금표 비교

| 항목 | 조사 자료 (Multi-AI) | 실제 요금표 | 원인 |
|------|---------------------|-----------|------|
| 표쾌 성외 수중 | 22위안 | **18위안** (대부분) | 조사에서 특쾌/표쾌 혼동 |
| 표쾌 성외 속중 | 13~14위안/kg | **5~6위안/kg** | 동일 원인 |
| 특쾌 성외 속중 | 14~15위안/kg | **8~13위안/kg** | 과대 추정 |
| 표쾌 >=30kg | 데이터 없음 | **별도 kg당 단가** | 실제 요금표에서 발견 |
| 2378 규칙 | 검증 완료 | 확인 | 일치 |
| 체적 계수 | 특쾌=6000, 표쾌=12000 | 확인 | 일치 |

---

## 4. 출발지별 요금 처리

### 문제
SF Express는 **고정된 전국 요금표가 없음**. 출발지 성(省)마다 요금이 다름.
현재는 장쑤성 데이터만 보유.

### 해결 방안

**출발지 프로파일 시스템** 도입:

```
sfExpressOriginProfiles (출발지 프로파일)
  ├── 장쑤성 프로파일 ← 현재 데이터 있음
  │   ├── 목적지 그룹 1: 호북,하남,강서
  │   ├── 목적지 그룹 2: 산동
  │   └── ...
  ├── 광둥성 프로파일 ← 추후 데이터 확보 시 추가
  └── 저장성 프로파일 ← 추후 데이터 확보 시 추가
```

- 관리자가 출발지별 요금 데이터를 언제든 추가 가능
- 공장(Factory)의 `provinceCode`로 자동 매칭
- 해당 출발지 프로파일이 없으면 → "요금 데이터 없음" 표시

---

## 5. 구현 계획

### Phase 1: 기반 레이어 (타입 + 순수 계산 함수)

#### 1-1. 타입 정의 — `src/types/sfExpress.ts` (신규)

```typescript
// 서비스 코드 (2종)
type SFServiceCode = "express" | "standard"  // 급송 / 표준

// 계산 입력
interface SFExpressCalculationInput {
  actualWeightKg: number           // 실제 중량 (kg)
  lengthCm: number                 // 가로 (cm)
  widthCm: number                  // 세로 (cm)
  heightCm: number                 // 높이 (cm)
  serviceCode: SFServiceCode       // 서비스 종류
}

// 요금 데이터 (DB에서 조회)
interface SFExpressRate {
  firstWeightPrice: number         // 수중 단가 (위안)
  additionalWeightPrice: number    // 속중 단가 (위안/kg)
  bulkPricePerKg?: number          // >=30kg kg당 단가 (위안, 표준만)
  isAvailable: boolean             // 서비스 이용 가능 여부
}

// 계산 결과
interface SFExpressCalculationResult {
  actualWeightKg: number           // 실제 중량
  volumetricWeightKg: number       // 체적 중량
  chargeableWeightKg: number       // 계비 중량 (MAX)
  roundedWeightKg: number          // 2378 반올림 적용 후
  totalFreightCNY: number          // 운임 (위안)
  totalFreightKRW: number          // 운임 (원화)
  calculationMethod: "firstWeight" | "bulkRate"  // 적용된 공식
  formulaDescription: string       // UI 표시용 계산 과정 설명
}
```

#### 1-2. 순수 계산 함수 — `src/lib/calculations/sfExpress.ts` (신규)

| 함수 | 설명 |
|------|------|
| `calculateVolumetricWeight(l, w, h, divisor)` | 체적중량 계산 |
| `applySFWeightRounding(weight)` | 2378 반올림 규칙 적용 |
| `getVolumetricDivisor(serviceCode, weightKg)` | 서비스별 체적 계수 반환 |
| `calculateSFExpressFreight(input, rate, cnyRate)` | 운임 총 계산 |
| `findDestinationGroup(groups, destProvinceCode, destCityCode)` | 목적지 그룹 매칭 |

**체적 계수 결정 로직:**
```
급송 (express)  → 항상 6000
표준 (standard) → <30kg: 12000, >=30kg: 6000
```

**운임 계산 분기:**
```
if (계비중량 < 30 || !bulkPricePerKg) {
  운임 = 수중 + (계비중량 - 1) × 속중
} else {
  // 표준 >=30kg: 체적계수를 6000으로 재계산
  체적중량_재계산 = L×W×H / 6000
  계비중량_재계산 = MAX(실제중량, 체적중량_재계산)
  운임 = 계비중량_재계산 × kg당단가
}
```

### Phase 2: DB 레이어 (Convex 스키마 + API)

#### 2-1. 스키마 — `convex/schema.ts` (수정, 3개 테이블 추가)

```
sfExpressOriginProfiles — 출발지 프로파일 (장쑤성, 광둥성 등)
  - name: string (예: "장쑤성")
  - provinceCode: string (예: "320000")
  - description?: string

sfExpressDestinationGroups — 목적지 그룹 (같은 요금 성/시 묶음)
  - originProfileId: Id<"sfExpressOriginProfiles">
  - name: string (예: "호북,하남,강서")
  - provinceCodes: string[] (예: ["420000","410000","360000"])
  - cityCodes?: string[] (특정 시 지정, 내몽고 등)

sfExpressRates — 요금 데이터
  - destinationGroupId: Id<"sfExpressDestinationGroups">
  - serviceCode: "express" | "standard"
  - firstWeightPrice: number (수중, 위안)
  - additionalWeightPrice: number (속중, 위안/kg)
  - bulkPricePerKg?: number (>=30kg kg당 단가)
  - isAvailable: boolean
```

> **서비스 유형 테이블은 생략** — 급송/표준 2종 고정이므로 코드 레벨 상수로 충분.

#### 2-2. Convex API 함수 (3개 신규 파일)

| 파일 | 기능 |
|------|------|
| `convex/sfExpressOriginProfiles.ts` | CRUD + `getByProvince` 쿼리 |
| `convex/sfExpressDestinationGroups.ts` | CRUD + `listByOrigin` 쿼리 |
| `convex/sfExpressRates.ts` | CRUD + `findRate(originProvince, destProvince, service)` + 장쑤성 시드 |

#### 2-3. 시드 데이터 — `src/data/sfExpressJiangsuSeed.ts` (신규)

섹션 3의 요금표를 TypeScript 상수로 변환. Convex mutation으로 DB에 주입.

### Phase 3: 기존 시스템 수정 (내륙운송료 교체)

#### 3-1. 삭제할 것

| 파일 | 삭제 항목 |
|------|----------|
| `src/lib/calculations/shipping.ts` | `InlandShippingConfig`, `DEFAULT_INLAND_CONFIG`, `calculateInlandShipping()` |
| `src/lib/calculations/index.ts` | `costSettings.inland` 파라미터 |
| `convex/costSettings.ts` | "inland" 타입 시드 데이터 |

#### 3-2. 수정할 것 — `src/types/shipping.ts`

```diff
CalculationResult:
- inlandShippingUSD: number
+ inlandShippingCNY: number       // SF Express 내륙 운임 (위안)
  inlandShippingKRW: number       // 원화 환산 (유지)
+ sfExpressDetail?: {             // SF Express 계산 상세 (UI 표시용)
+   serviceCode: SFServiceCode
+   serviceNameKo: string         // "급송" | "표준"
+   chargeableWeightKg: number
+   calculationMethod: "firstWeight" | "bulkRate"
+   formulaDescription: string    // "수중 18원 + 속중 4kg × 5원/kg"
+ }
```

#### 3-3. 수정할 것 — `src/lib/calculations/index.ts`

`calculateImportCost` 파라미터 변경:

```diff
- costSettings.inland?: InlandShippingConfig
+ sfExpressInput?: {              // SF Express 입력 (선택적)
+   actualWeightKg: number
+   lengthCm: number
+   widthCm: number
+   heightCm: number
+   serviceCode: SFServiceCode
+ }
+ sfExpressRate?: SFExpressRate    // DB에서 매칭된 요금
+ cnyRate?: number                // CNY→KRW 환율
```

계산 흐름:
```
기존: CBM × $70 × USD환율 → 원화
변경: SF Express 계산(중량, 부피, 요금표) × CNY환율 → 원화
```

#### 3-4. 수정할 것 — `src/lib/calculations/multiProduct.ts`

다중 제품일 때:
1. 모든 제품의 **총 중량** + **총 포장 부피**로 하나의 SF Express 운임 계산
2. 결과를 기존 `distributeSharedCostsByCbmRatio` 함수로 제품별 분배

#### 3-5. 수정할 것 — 결과 표시 UI

| 파일 | 변경 |
|------|------|
| `CostBreakdown.tsx` | 내륙운송료 → SF Express 상세 (서비스명, 계비중량, 공식) 표시 |
| `MultiProductCostBreakdown.tsx` | 동일 변경 |

### Phase 4: 커스텀 훅 — `src/hooks/useSFExpressRates.ts` (신규)

```typescript
function useSFExpressCalculation(
  originProvinceCode: string | undefined,    // 공장 위치
  destinationProvinceCode: string | undefined, // 창고 위치
  destinationCityCode: string | undefined,
  serviceCode: SFServiceCode | undefined
)
// 반환: { rate, isLoading, error }
// 자동으로: 출발지 프로파일 매칭 → 목적지 그룹 매칭 → 요금 조회
```

### Phase 5: UI 컴포넌트

#### 5-1. SF Express 선택기 — `src/components/calculator/input/SFExpressInlandSelector.tsx` (신규)

공장(출발지)과 창고(도착지)가 이미 선택되어 있으므로 자동 매칭.

```
[SF Express 내륙 운송]
서비스: [표준 ▼] [급송]
총 중량: 12.5 kg (자동 계산)
포장 크기: [40] × [30] × [25] cm

계산 결과: ¥38 (약 7,410원)
└ 계비중량 5.0kg | 수중 18원 + 속중 4kg × 5원/kg
```

#### 5-2. 관리자 요금표 관리 — `src/components/calculator/admin/SFExpressRateManager.tsx` (신규)

기존 `SettingsModal.tsx`에 새 탭으로 추가.

구성:
1. 출발지 프로파일 선택/추가
2. 목적지 그룹별 요금 테이블
3. 장쑤성 기본 데이터 시드 버튼

---

## 6. 파일 변경 목록

### 신규 파일 (7개)

| 파일 | 목적 |
|------|------|
| `src/types/sfExpress.ts` | SF Express 타입 정의 |
| `src/lib/calculations/sfExpress.ts` | 순수 계산 함수 (체적중량, 2378, 운임) |
| `src/data/sfExpressJiangsuSeed.ts` | 장쑤성 시드 데이터 상수 |
| `convex/sfExpressOriginProfiles.ts` | 출발지 프로파일 CRUD |
| `convex/sfExpressDestinationGroups.ts` | 목적지 그룹 CRUD |
| `convex/sfExpressRates.ts` | 요금 CRUD + 시드 |
| `src/hooks/useSFExpressRates.ts` | Convex 훅 |

### 신규 UI 파일 (2개)

| 파일 | 목적 |
|------|------|
| `src/components/calculator/input/SFExpressInlandSelector.tsx` | 사용자 선택 UI |
| `src/components/calculator/admin/SFExpressRateManager.tsx` | 관리자 요금표 UI |

### 수정 파일 (8개)

| 파일 | 변경 |
|------|------|
| `convex/schema.ts` | 3개 테이블 추가 |
| `src/types/shipping.ts` | `inlandShippingUSD` → `inlandShippingCNY`, `sfExpressDetail` 추가 |
| `src/lib/calculations/shipping.ts` | `calculateInlandShipping` 관련 삭제 |
| `src/lib/calculations/index.ts` | SF Express 계산으로 교체 |
| `src/lib/calculations/multiProduct.ts` | SF Express 계산으로 교체 |
| `src/components/calculator/result/CostBreakdown.tsx` | SF Express 상세 표시 |
| `src/components/calculator/result/MultiProductCostBreakdown.tsx` | SF Express 상세 표시 |
| `src/components/calculator/admin/SettingsModal.tsx` | "내륙 운송료" 탭 → "SF Express 요금표" 탭 |

### 활용할 기존 리소스

| 파일 | 활용 |
|------|------|
| `src/data/chinaRegions.ts` | 성/시 코드 매핑 (`getProvinceByCode`, `getCityByCode`) |
| `src/lib/calculations/costs.ts` | `distributeSharedCostsByCbmRatio` (CBM 비율 분배) |
| `src/lib/calculations/rton.ts` | R.TON 계산 (총 중량 산출) |

---

## 7. 검증 방법

### 단위 테스트

| 테스트 | 입력 | 기대 결과 |
|--------|------|----------|
| 2378 반올림 | 10.2kg | 10.0kg |
| 2378 반올림 | 10.3kg | 10.5kg |
| 2378 반올림 | 10.7kg | 10.5kg |
| 2378 반올림 | 10.8kg | 11.0kg |
| 표준 운임 | 장쑤→호북, 5kg | 18 + 4×5 = 38위안 |
| 표준 >=30kg | 장쑤→산동, 35kg | 35×5 = 175위안 |
| 체적중량 우선 | 급송, 1kg, 50×40×30cm | 체적=10kg → 계비10kg |
| 체적계수 변경 | 표준, 같은 박스 | <30kg: 체적5kg / >=30kg: 체적10kg |

### 통합 테스트

1. 공장(장쑤) → 창고(호북) → 표준 선택 → 요금 자동 표시
2. 다중 제품: 2개 제품 → SF Express 운임이 CBM 비율로 정확 분배
3. 출발지 프로파일 없는 공장 → "요금 데이터 없음" 표시
4. 서비스 불가 목적지 (서장-급송) → "이용 불가" 표시
