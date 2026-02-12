import { Id } from "../../convex/_generated/dataModel"
import { HsCodeWithTariff } from "./tariff"

// ===== 제품 정보 =====

// 제품 크기 (cm 단위)
export interface ProductDimensions {
  width: number   // 가로 (cm)
  height: number  // 높이 (cm)
  depth: number   // 폭 (cm)
}

// 개별 제품 (다중 제품 입력용)
export interface Product {
  id: string                        // 고유 ID (uuid)
  name?: string                     // 제품명 (선택)
  unitPrice: number                 // 개당 원가 (외화)
  currency: "USD" | "CNY"           // 통화
  quantity: number                  // 수량
  dimensions: ProductDimensions     // 제품 크기 (cm)

  // 중량 정보 (R.TON 계산용)
  weight: number                    // 개당 중량
  weightUnit: "kg" | "g"            // 중량 단위 (기본값: "kg")

  // 관세 정보 (제품마다 다름)
  hsCode: HsCodeWithTariff | null   // 선택된 HS Code 정보
  basicTariffRate: number           // 기본 관세율 (%)
  ftaTariffRate: number             // FTA 관세율 (%)
  useFta: boolean                   // FTA 적용 여부
}

// 공장 슬롯 타입 (다중 제품 연결 지원)
export interface FactorySlot {
  factoryId: Id<"factories"> | null   // 선택된 공장 ID
  selectedItemIds: string[]           // 선택된 비용 항목 ID 목록
  costValues: { [itemId: string]: number }  // 각 항목별 금액 (조절 가능)
  quantityValues: { [itemId: string]: number }  // 각 항목별 수량 (수량연동용)
  linkedProductIds: string[]          // 연결된 제품 ID 목록 (균등 분배용)
  chargeTypeValues?: { [itemId: string]: "once" | "per_quantity" }  // 과금 방식 오버라이드
}

// 공장 비용 항목 (chargeType 포함)
export interface FactoryCostItemWithChargeType {
  _id: Id<"factoryCostItems">
  factoryId: Id<"factories">
  name: string
  amount: number
  chargeType: "once" | "per_quantity"  // 1회성 vs 수량연동
  sortOrder: number
  createdAt: number
  updatedAt: number
}

// ===== 운송 업체 =====

// 국제 운송 업체
export interface ShippingCompany {
  _id: Id<"shippingCompanies">
  name: string
  description?: string
  isActive: boolean
  createdAt: number
  updatedAt: number
}

// 운임 타입 (할인운임제, 일반운임제, 평균요금제 등)
// 📌 운임 타입은 배송지(창고) 단위로 관리됩니다.
//    같은 업체라도 창고마다 다른 요금표를 가질 수 있습니다.
export interface ShippingRateType {
  _id: Id<"shippingRateTypes">
  companyId?: Id<"shippingCompanies">     // 레거시 호환 (마이그레이션 후 제거 예정)
  warehouseId?: Id<"companyWarehouses">   // 배송지(창고) ID — 운임의 실제 기준
  name: string
  description?: string
  currency?: "USD" | "CNY" | "KRW"  // 운임 타입별 통화 (기본값: USD)
  unitType?: "cbm" | "kg"           // 요금 단위 (기본값: "cbm")
  isDefault: boolean
  sortOrder: number
  createdAt: number
  updatedAt: number
}

// CBM별 국제 운송료
export interface InternationalShippingRate {
  _id: Id<"internationalShippingRates">
  rateTypeId: Id<"shippingRateTypes">
  cbm: number
  rate?: number       // 요금 (신규 데이터용, 통화는 rateType에서 가져옴)
  rateUSD?: number    // USD 요금 (기존 데이터 호환용)
  rateKRW?: number    // KRW 요금 (기존 데이터 호환용)
  createdAt: number
  updatedAt: number
}

// ===== 운송 업체 창고 =====

// 운송 업체 중국 내 창고
export interface CompanyWarehouse {
  _id: Id<"companyWarehouses">
  companyId: Id<"shippingCompanies">
  name: string               // 창고명
  provinceCode: string       // 성 코드
  cityCode: string           // 시 코드
  detailAddress?: string     // 상세 주소
  isActive: boolean
  sortOrder: number
  createdAt: number
  updatedAt: number
}

// ===== 비용 항목 =====

// 업체별 공통 비용 항목 (통관 건당 발생)
export interface CompanyCostItem {
  _id: Id<"companyCostItems">
  companyId: Id<"shippingCompanies">
  name: string
  description?: string
  defaultAmount: number
  isDivisible: boolean      // 주문 건수 분할 가능 여부
  isRequired: boolean
  sortOrder: number
  createdAt: number
  updatedAt: number
}

// 중국 공장 (부대 비용 기본값 포함)
export interface Factory {
  _id: Id<"factories">
  name: string
  description?: string
  currency: "USD" | "CNY"
  provinceCode?: string   // 성 코드 (예: "440000" = 광둥성)
  cityCode?: string       // 시 코드 (예: "440100" = 광저우시)
  inlandShipping: number  // 중국 내륙 운송료 기본값
  inspectionFee: number   // 검품비 기본값
  isActive: boolean
  sortOrder: number
  createdAt: number
  updatedAt: number
}

// ===== 계산 입력/출력 =====

// 계산기 입력값
export interface CalculatorInput {
  // 제품 정보
  productName?: string           // 제품명 (선택)
  hsCode?: string               // HS Code (선택, 추후 연동)
  unitPrice: number             // 개당 원가 (외화)
  currency: "USD" | "CNY"       // 통화
  quantity: number              // 수량
  dimensions: ProductDimensions // 제품 크기 (cm)

  // 운송 정보
  shippingCompanyId: Id<"shippingCompanies">
  rateTypeId: Id<"shippingRateTypes">

  // 부대 비용 (직접 입력 금액, 원화 환산됨)
  additionalCosts: {
    id: string
    name: string
    amount: number
  }[]

  // 업체별 공통 비용 (선택된 항목)
  selectedCompanyCosts: Id<"companyCostItems">[]

  // 주문 건수 (공통 비용 분할용)
  orderCount: number

  // 관세율 (%)
  tariffRate: number

  // 환율
  exchangeRate: number  // 1 외화 = ? 원
}

// 계산 결과
export interface CalculationResult {
  // CBM 정보
  unitCbm: number               // 단일 제품 CBM
  totalCbm: number              // 총 CBM
  roundedCbm: number            // 0.5 단위 올림 CBM

  // 제품 비용
  totalPriceForeign: number     // 총 외화 금액
  totalPriceKRW: number         // 총 원화 금액 (제품가격)

  // 부대 비용 상세
  additionalCostsDetail: {
    id: string
    name: string
    amount: number            // 원화 환산 금액
    amountForeign: number     // 원래 외화 금액
    currency: "USD" | "CNY"   // 공장 통화
  }[]
  totalAdditionalCosts: number  // 부대 비용 합계

  // 관세 과세가격 (제품가격 + 부대비용)
  taxableBase: number           // 관세 과세 기준

  // 관세
  tariffRate: number            // 적용 관세율 (%)
  tariffAmount: number          // 관세 (실제 적용된 금액)
  basicTariffRate: number       // 기본 관세율 (%)
  basicTariffAmount: number     // 기본 관세 금액
  ftaTariffRate: number         // FTA 관세율 (%)
  ftaTariffAmount: number       // FTA 관세 금액

  // 내륙 운송료 (중국 공장 → 항구)
  inlandShippingUSD: number
  inlandShippingKRW: number

  // 국제 운송료
  internationalShippingUSD: number
  internationalShippingKRW: number

  // 국내 운송료
  domesticShippingKRW: number

  // 3PL 비용 + 배송비 (0.1CBM당 15,000원)
  threePLCostKRW: number

  // 송금 수수료 기준 금액 (제품가격 + 부대비용 + 내륙운송료)
  remittanceFeeBase: number
  // 송금 수수료
  remittanceFee: number

  // 업체별 공통 비용 상세 (주문 건수 분할 적용)
  companyCostsDetail: {
    itemId: Id<"companyCostItems">
    name: string
    originalAmount: number    // 원래 금액
    dividedAmount: number     // 분할 후 금액
    orderCount: number        // 적용된 주문 건수
  }[]
  totalCompanyCosts: number     // 업체별 공통 비용 합계

  // 최종 결과
  totalCost: number             // 총 수입원가
  unitCost: number              // 개당 수입원가

  // 비용 구성 요약
  breakdown: {
    productCost: number         // 제품가격
    additionalCosts: number     // 부대비용
    inlandShipping: number      // 내륙운송료 (중국 공장→항구)
    tariff: number              // 관세
    internationalShipping: number // 국제운송료
    domesticShipping: number    // 국내운송료
    threePLCost: number         // 3PL 비용 + 배송비
    remittanceFee: number       // 송금수수료
    companyCosts: number        // 업체별 공통비용
  }
}

// 비교 결과 (기본세율 vs FTA)
export interface ComparisonResult {
  basic: CalculationResult      // 기본세율 적용
  fta: CalculationResult        // FTA 세율 적용
  savings: number               // 절감액
  savingsPercent: number        // 절감율 (%)
}

// ===== 다중 제품 계산 =====

// 제품별 계산 결과
export interface ProductCalculationResult {
  productId: string               // 제품 ID
  productName?: string            // 제품명

  // R.TON (CBM) 정보
  unitCbm: number                 // 단일 제품 CBM (원래 부피)
  totalCbm: number                // 해당 제품 총 R.TON (= MAX(W/T, M/T))
  cbmRatio: number                // 전체 대비 R.TON 비율 (0~1)

  // 중량 정보 (R.TON 계산용)
  unitWeight: number              // 개당 중량 (kg로 환산)
  totalWeight: number             // 총 중량 (kg)
  weightTon: number               // W/T (중량톤 = 총중량/1000)
  measurementTon: number          // M/T (용적톤 = 원래 CBM)
  rTon: number                    // R.TON = MAX(W/T, M/T)

  // 제품 비용
  productPriceKRW: number         // 제품가격 (원화)

  // 관세
  tariffRate: number              // 적용된 관세율 (%)
  tariffAmount: number            // 관세 금액

  // 공장 비용 (균등 분배 후)
  factoryCostsTotal: number       // 공장비용 합계
  factoryCostsDetail?: {          // 공장비용 상세 항목
    factoryName: string           // 공장명
    itemName: string              // 항목명 (Sticker, Label, Tag 등)
    chargeType: "once" | "per_quantity"  // 부과 방식
    amountKRW: number             // 분배된 금액 (원화)
    amountForeign: number         // 분배된 금액 (외화)
    currency: "USD" | "CNY"       // 통화
  }[]

  // 공통 비용 분배 (CBM 비율)
  sharedCosts: {
    inlandShipping: number        // 내륙운송료 (분배)
    internationalShipping: number // 국제운송료 (분배)
    domesticShipping: number      // 국내운송료 (분배)
    threePL: number               // 3PL 비용 (분배)
  }

  // 최종 결과
  totalCost: number               // 해당 제품 총 비용
  unitCost: number                // 개당 수입원가
}

// 다중 제품 계산 입력값
export interface MultiProductCalculatorInput {
  products: Product[]             // 제품 배열

  // 운송 정보
  shippingCompanyId: Id<"shippingCompanies">
  rateTypeId: Id<"shippingRateTypes">

  // 공장 비용 (슬롯 단위, 연결된 제품 포함)
  factorySlots: FactorySlot[]

  // 업체별 공통 비용 (선택된 항목)
  selectedCompanyCostIds: Id<"companyCostItems">[]

  // 주문 건수 (기본값: 제품 개수)
  orderCount: number

  // 환율
  exchangeRate: {
    usd: number                   // 1 USD = ? KRW
    cny: number                   // 1 CNY = ? KRW
  }
}

// 다중 제품 계산 결과
export interface MultiProductCalculationResult {
  // 제품별 결과
  products: ProductCalculationResult[]

  // 전체 R.TON (CBM) 합계
  totalCbm: number                // 전체 R.TON (= MAX(W/T, M/T) 합계)
  roundedCbm: number              // 운송 업체 타입별 올림 적용된 R.TON
  totalWeight: number             // 전체 중량 (kg)
  totalCost: number               // 전체 수입원가

  // 공통 비용 내역 (분배 전 총액)
  sharedCostsTotal: {
    inlandShipping: number        // 내륙운송료
    internationalShipping: number // 국제운송료
    domesticShipping: number      // 국내운송료
    threePL: number               // 3PL 비용
    companyCosts: number          // 업체 공통 비용
    remittanceFee: number         // 송금 수수료
  }

  // 업체 공통 비용 상세
  companyCostsDetail: {
    itemId: Id<"companyCostItems">
    name: string
    originalAmount: number
    dividedAmount: number
    orderCount: number
  }[]

  // 비용 구성 요약 (전체)
  breakdown: {
    productCost: number           // 제품가격 합계
    factoryCosts: number          // 공장비용 합계
    inlandShipping: number        // 내륙운송료
    tariff: number                // 관세 합계
    internationalShipping: number // 국제운송료
    domesticShipping: number      // 국내운송료
    threePLCost: number           // 3PL 비용
    remittanceFee: number         // 송금수수료
    companyCosts: number          // 업체별 공통비용
  }

  // 컨테이너 비교 정보 (FCL 모드일 때만 존재)
  // 📌 LCL/FCL 토글 시 이 데이터로 비교 패널 표시
  containerComparison?: {
    isContainerMode: boolean           // 컨테이너 모드 활성화 여부
    selectedOption: ContainerOptionSummary  // 현재 적용된 (추천) 옵션
    allOptions: ContainerOptionSummary[]    // 모든 후보 옵션
    lclTotalShipping: number           // LCL 총 운송비
    fclTotalShipping: number           // FCL 총 운송비 (추천 옵션)
    savings: number                    // 절감액 (양수=절감)
    savingsPercent: number             // 절감율 (%)
    deliveryMethod: "direct" | "via3PL" // 국내 배송 방식
  }
}

// 컨테이너 옵션 요약 (UI 표시용, ContainerOption에서 필요한 정보만 추출)
export interface ContainerOptionSummary {
  type: "20DC" | "40DC" | "40HC"
  label: string
  count: number
  isRecommended: boolean
  // 적재 정보
  usableCbm: number
  loadedCbm: number
  loadRatio: number
  // 오버플로우
  hasOverflow: boolean
  overflowCbm: number
  // 경고
  weightWarning: boolean
  // 비용 내역
  containerShippingCost: number
  containerInlandCost: number
  containerDomesticCost: number
  containerThreePLCost: number
  overflowShippingCost: number
  overflowInlandCost: number
  overflowDomesticCost: number
  overflowThreePLCost: number
  totalShippingCost: number
}
