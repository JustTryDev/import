import { Id } from "../../convex/_generated/dataModel"

// ===== 제품 정보 =====

// 제품 크기 (cm 단위)
export interface ProductDimensions {
  width: number   // 가로 (cm)
  height: number  // 높이 (cm)
  depth: number   // 폭 (cm)
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
export interface ShippingRateType {
  _id: Id<"shippingRateTypes">
  companyId: Id<"shippingCompanies">
  name: string
  description?: string
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
  rateUSD: number
  rateKRW: number
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
  isVatApplicable?: boolean  // 부가세 적용 여부 (통관수수료: true, D/O·C/O: false) - 기본값 false
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

  // 관세/부가세
  tariffRate: number            // 적용 관세율 (%)
  tariffAmount: number          // 관세 (실제 적용된 금액)
  basicTariffRate: number       // 기본 관세율 (%)
  basicTariffAmount: number     // 기본 관세 금액
  ftaTariffRate: number         // FTA 관세율 (%)
  ftaTariffAmount: number       // FTA 관세 금액
  vatBase: number               // 부가세 과세 기준 (과세가격 + 관세)
  vatAmount: number             // 부가세 (10%) - 관세 관련 부가세만

  // 부가세 상세 내역 (항목별 분리)
  vatDetail: {
    tariffVat: number           // 관세 부가세 (10%)
    domesticShippingVat: number // 국내운송료 부가세 (10%)
    threePLVat: number          // 3PL 비용 부가세 (10%)
    companyCostsVat: number     // 업체 비용 중 부가세 적용 항목 부가세 합계
    totalVat: number            // 총 부가세 (관세 + 국내운송료 + 3PL + 업체비용)
  }

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
    isVatApplicable: boolean  // 부가세 적용 여부
    vatAmount: number         // 해당 항목의 부가세 금액
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
    vat: number                 // 부가세
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
