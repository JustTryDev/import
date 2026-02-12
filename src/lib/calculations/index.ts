/**
 * 수입원가 계산 모듈
 *
 * 계산 순서:
 * 1. CBM 계산 (제품 크기 x 수량)
 * 2. 제품가격 원화 환산
 * 3. 부대비용 합계
 * 4. 관세 계산 (과세가격 = 제품가격 + 부대비용)
 * 5. 부가세 계산 (과세가격 = 관세과세기준 + 관세)
 * 6. 국제 운송료 (CBM 기준)
 * 7. 국내 운송료 (CBM 기준)
 * 8. 송금 수수료
 * 9. 업체별 공통 비용 (주문 건수 분할)
 * 10. 총 수입원가 합산
 */

import { Id } from "../../../convex/_generated/dataModel"
import {
  calculateUnitCbm,
  calculateTotalCbm,
  roundCbmToHalf,
  isValidDimensions,
} from "./cbm"
import {
  calculateDomesticShipping,
  calculateRemittanceFee,
  calculateInlandShipping,
  findShippingRate,
  calculate3PLCost,
  ShippingRateTable,
  DomesticShippingConfig,
  ThreePLCostConfig,
  InlandShippingConfig,
} from "./shipping"
import {
  calculateCompanyCosts,
  sumCompanyCosts,
  sumAdditionalCosts,
  calculateTariff,
  CostItemInput,
  AdditionalCostInput,
} from "./costs"
import { ProductDimensions, CalculationResult } from "@/types/shipping"

// 부대 비용 항목 입력 (통화 정보 포함)
export interface AdditionalCostWithCurrency {
  id: string
  name: string
  amount: number              // 원화 환산 금액
  amountForeign: number       // 원래 외화 금액
  currency: "USD" | "CNY"     // 공장 통화
}

// 계산 입력 파라미터
export interface CalculateImportCostParams {
  // 제품 정보
  unitPrice: number              // 개당 원가 (외화)
  quantity: number               // 수량
  dimensions: ProductDimensions  // 제품 크기 (cm)
  exchangeRate: number           // 환율 (1 외화 = ? 원)
  usdRate: number                // USD 환율 (내륙운송료 환산용)
  cnyRate?: number               // CNY 환율 (국제운송료 환산용)

  // 관세 (두 가지 모두 전달)
  tariffRate: number             // 실제 적용할 관세율 (%)
  basicTariffRate: number        // 기본 관세율 (%)
  ftaTariffRate: number          // FTA 관세율 (%)

  // 부대 비용 (통화 정보 포함)
  additionalCosts: AdditionalCostWithCurrency[]

  // 국제 운송료 테이블
  shippingRates: ShippingRateTable[]
  rateTypeCurrency?: "USD" | "CNY" | "KRW"  // 운임 타입 통화 (기본값: USD)

  // 업체별 공통 비용
  companyCosts: CostItemInput[]
  orderCount: number             // 주문 건수 (분할용)

  // 비용 설정 (DB에서 가져온 값, 없으면 기본값 사용)
  costSettings?: {
    inland?: InlandShippingConfig      // 내륙 운송료 설정
    domestic?: DomesticShippingConfig  // 국내 운송료 설정
    threePL?: ThreePLCostConfig        // 3PL 비용 설정
  }
}

// 수입원가 계산 메인 함수
export function calculateImportCost(
  params: CalculateImportCostParams
): CalculationResult | null {
  const {
    unitPrice,
    quantity,
    dimensions,
    exchangeRate,
    usdRate,
    cnyRate = 0,
    tariffRate,
    basicTariffRate,
    ftaTariffRate,
    additionalCosts,
    shippingRates,
    rateTypeCurrency = "USD",
    companyCosts,
    orderCount,
    costSettings,
  } = params

  // 유효성 검사
  if (!isValidDimensions(dimensions) || quantity <= 0 || unitPrice <= 0) {
    return null
  }

  // 1. CBM 계산
  const unitCbm = calculateUnitCbm(dimensions)
  const totalCbm = calculateTotalCbm(dimensions, quantity)
  const roundedCbm = roundCbmToHalf(totalCbm)

  // 2. 제품가격 원화 환산
  const totalPriceForeign = unitPrice * quantity
  const totalPriceKRW = Math.round(totalPriceForeign * exchangeRate)

  // 3. 부대비용 합계 (통화 정보 포함)
  const additionalCostsDetail = additionalCosts.map((item) => ({
    id: item.id,
    name: item.name,
    amount: item.amount,
    amountForeign: item.amountForeign,
    currency: item.currency,
  }))
  const totalAdditionalCosts = additionalCosts.reduce((sum, item) => sum + item.amount, 0)

  // 3.5 내륙 운송료 계산 (중국 공장 → 항구)
  const inlandShippingUSD = calculateInlandShipping(totalCbm, costSettings?.inland)
  const inlandShippingKRW = Math.round(inlandShippingUSD * usdRate)

  // 4. 관세 계산 (과세가격 = 제품가격 + 부대비용)
  // 실제 적용할 관세
  const { taxableBase, tariffAmount } = calculateTariff(
    totalPriceKRW,
    totalAdditionalCosts,
    tariffRate
  )
  // 기본 관세 금액 (표시용)
  const { tariffAmount: basicTariffAmount } = calculateTariff(
    totalPriceKRW,
    totalAdditionalCosts,
    basicTariffRate
  )
  // FTA 관세 금액 (표시용)
  const { tariffAmount: ftaTariffAmount } = calculateTariff(
    totalPriceKRW,
    totalAdditionalCosts,
    ftaTariffRate
  )

  // 5. 국제 운송료 (통화별 환율 적용)
  const shippingResult = findShippingRate(shippingRates, totalCbm)
  const internationalShippingRate = shippingResult?.rate ?? 0

  // 통화별 환율 적용하여 원화 계산
  let internationalShippingKRW: number
  let internationalShippingForeign: number = internationalShippingRate  // 외화 금액
  if (rateTypeCurrency === "KRW") {
    internationalShippingKRW = internationalShippingRate
  } else if (rateTypeCurrency === "CNY") {
    internationalShippingKRW = Math.round(internationalShippingRate * cnyRate)
  } else {
    // 기본값 USD
    internationalShippingKRW = Math.round(internationalShippingRate * usdRate)
  }
  // USD 환산값 (비용 내역 표시용)
  const internationalShippingUSD = rateTypeCurrency === "USD"
    ? internationalShippingRate
    : (rateTypeCurrency === "KRW" ? internationalShippingRate / usdRate : internationalShippingRate * cnyRate / usdRate)

  // 7. 국내 운송료
  const domesticShippingKRW = calculateDomesticShipping(totalCbm, costSettings?.domestic)

  // 7.5 3PL 비용 + 배송비
  const threePLCostKRW = calculate3PLCost(totalCbm, costSettings?.threePL)

  // 8. 송금 수수료 (기준: 제품가격 + 부대비용 + 내륙운송료)
  const remittanceFeeBase = totalPriceKRW + totalAdditionalCosts + inlandShippingKRW
  const remittanceFee = calculateRemittanceFee(remittanceFeeBase)

  // 9. 업체별 공통 비용 (주문 건수 분할)
  const companyCostsDetail = calculateCompanyCosts(companyCosts, orderCount)
  const totalCompanyCosts = sumCompanyCosts(companyCostsDetail)

  // 10. 총 수입원가 계산 (반올림)
  // = 제품가격 + 부대비용 + 내륙운송료 + 관세
  // + 국제운송료 + 국내운송료 + 3PL비용
  // + 송금수수료 + 업체공통비용
  const totalCost = Math.round(
    totalPriceKRW +
    totalAdditionalCosts +
    inlandShippingKRW +
    tariffAmount +
    internationalShippingKRW +
    domesticShippingKRW +
    threePLCostKRW +
    remittanceFee +
    totalCompanyCosts
  )

  // 개당 수입원가 (반올림)
  const unitCost = Math.round(totalCost / quantity)

  return {
    // CBM 정보
    unitCbm,
    totalCbm,
    roundedCbm,

    // 제품 비용
    totalPriceForeign,
    totalPriceKRW,

    // 부대 비용
    additionalCostsDetail,
    totalAdditionalCosts,

    // 관세 과세가격
    taxableBase,

    // 관세
    tariffRate,
    tariffAmount,
    basicTariffRate,
    basicTariffAmount,
    ftaTariffRate,
    ftaTariffAmount,

    // 내륙 운송료 (중국 공장 → 항구)
    inlandShippingUSD,
    inlandShippingKRW,

    // 운송료
    internationalShippingUSD,
    internationalShippingKRW,
    domesticShippingKRW,

    // 3PL 비용 + 배송비
    threePLCostKRW,

    // 송금 수수료
    remittanceFeeBase,
    remittanceFee,

    // 업체별 공통 비용
    companyCostsDetail,
    totalCompanyCosts,

    // 최종 결과
    totalCost,
    unitCost,

    // 비용 구성 요약
    breakdown: {
      productCost: totalPriceKRW,
      additionalCosts: totalAdditionalCosts,
      inlandShipping: inlandShippingKRW,
      tariff: tariffAmount,
      internationalShipping: internationalShippingKRW,
      domesticShipping: domesticShippingKRW,
      threePLCost: threePLCostKRW,
      remittanceFee,
      companyCosts: totalCompanyCosts,
    },
  }
}

// 기본세율 vs FTA 비교 계산
export function calculateComparison(
  params: CalculateImportCostParams,
  basicTariffRate: number,
  ftaTariffRate: number
) {
  const basicResult = calculateImportCost({
    ...params,
    tariffRate: basicTariffRate,
  })

  const ftaResult = calculateImportCost({
    ...params,
    tariffRate: ftaTariffRate,
  })

  if (!basicResult || !ftaResult) {
    return null
  }

  const savings = basicResult.totalCost - ftaResult.totalCost
  const savingsPercent =
    basicResult.totalCost > 0
      ? Math.round((savings / basicResult.totalCost) * 10000) / 100
      : 0

  return {
    basic: basicResult,
    fta: ftaResult,
    savings,
    savingsPercent,
  }
}

// Re-export
export {
  calculateUnitCbm,
  calculateTotalCbm,
  roundCbmToHalf,
  isValidDimensions,
  calculateDomesticShipping,
  calculateRemittanceFee,
  calculateInlandShipping,
  findShippingRate,
  calculate3PLCost,
  calculateCompanyCosts,
  sumCompanyCosts,
  sumAdditionalCosts,
  calculateTariff,
}

// 다중 제품 계산 함수
export { calculateMultiProductImportCost } from "./multiProduct"
export type { CalculateMultiProductParams } from "./multiProduct"

// R.TON 계산 함수
export {
  convertToKg,
  calculateWeightTon,
  calculateRTon,
  calculateProductRTon,
} from "./rton"
export type { WeightUnit, ProductRTonInfo } from "./rton"

export type {
  ShippingRateTable,
  DomesticShippingConfig,
  ThreePLCostConfig,
  InlandShippingConfig,
} from "./shipping"

export type {
  CostItemInput,
  AdditionalCostInput,
  FactorySlotInput,
  FactorySlotCostItem,
  ProductFactoryCostResult,
} from "./costs"
