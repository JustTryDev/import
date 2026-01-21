/**
 * 다중 제품 수입원가 계산 모듈
 *
 * 📌 비유: 여러 사람이 함께 택시를 타고 가는 것처럼
 * - 각자 탄 거리(CBM)에 비례해서 요금을 나눔
 * - 공장 비용은 함께 주문한 사람들끼리 균등 분배
 *
 * 계산 순서:
 * 1. 제품별 CBM 계산
 * 2. 제품별 관세/부가세 계산 (관세율이 다름)
 * 3. 공장 비용 계산 (연결된 제품에 균등 분배)
 * 4. 공통 비용 계산 (총 CBM 기준)
 * 5. 공통 비용 CBM 비율 분배
 * 6. 제품별 총 비용 및 개당 단가 계산
 */

import { Id } from "../../../convex/_generated/dataModel"
import {
  Product,
  ProductCalculationResult,
  MultiProductCalculatorInput,
  MultiProductCalculationResult,
  FactorySlot,
} from "@/types/shipping"
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
  sumCompanyCostsVat,
  calculateTariff,
  calculateVat,
  calculateDomesticShippingVat,
  calculate3PLVat,
  calculateFactoryCostsByProduct,
  distributeSharedCostsByCbmRatio,
  CostItemInput,
  FactorySlotInput,
} from "./costs"

// 다중 제품 계산 입력 파라미터
export interface CalculateMultiProductParams {
  // 제품 배열
  products: Product[]

  // 환율
  exchangeRates: {
    usd: number  // 1 USD = ? KRW
    cny: number  // 1 CNY = ? KRW
  }

  // 공장 비용 슬롯 (연결된 제품 정보 포함)
  factorySlots: FactorySlotInput[]

  // 국제 운송료 테이블
  shippingRates: ShippingRateTable[]

  // 업체별 공통 비용
  companyCosts: CostItemInput[]
  orderCount: number  // 주문 건수 (기본값: 제품 개수)

  // 비용 설정
  costSettings?: {
    inland?: InlandShippingConfig
    domestic?: DomesticShippingConfig
    threePL?: ThreePLCostConfig
  }
}

/**
 * 다중 제품 수입원가 계산 메인 함수
 *
 * @param params 계산 입력 파라미터
 * @returns 다중 제품 계산 결과 (제품별 + 전체)
 */
export function calculateMultiProductImportCost(
  params: CalculateMultiProductParams
): MultiProductCalculationResult | null {
  const {
    products,
    exchangeRates,
    factorySlots,
    shippingRates,
    companyCosts,
    orderCount,
    costSettings,
  } = params

  // 유효성 검사
  if (products.length === 0) {
    return null
  }

  // 유효한 제품만 필터링
  const validProducts = products.filter(p =>
    isValidDimensions(p.dimensions) && p.quantity > 0 && p.unitPrice > 0
  )

  if (validProducts.length === 0) {
    return null
  }

  // ===== 1. 제품별 CBM 계산 =====
  const productsWithCbm = validProducts.map(product => {
    const unitCbm = calculateUnitCbm(product.dimensions)
    const totalCbm = calculateTotalCbm(product.dimensions, product.quantity)
    return {
      ...product,
      unitCbm,
      totalCbm,
    }
  })

  // 전체 CBM 계산
  const totalCbm = productsWithCbm.reduce((sum, p) => sum + p.totalCbm, 0)
  const roundedCbm = roundCbmToHalf(totalCbm)

  // ===== 2. 제품별 관세/부가세 계산 =====
  const productsWithTariff = productsWithCbm.map(product => {
    // 환율 선택
    const exchangeRate = product.currency === "USD"
      ? exchangeRates.usd
      : exchangeRates.cny

    // 제품가격 원화 환산
    const productPriceKRW = Math.round(product.unitPrice * product.quantity * exchangeRate)

    // 적용할 관세율 선택 (FTA 적용 여부에 따라)
    const tariffRate = product.useFta ? product.ftaTariffRate : product.basicTariffRate

    // 관세 계산 (공장 비용은 아직 모르므로 제품가격만으로 계산)
    // 실제로는 공장 비용 분배 후 다시 계산해야 함
    const { taxableBase, tariffAmount } = calculateTariff(productPriceKRW, 0, tariffRate)
    // 부가세는 내륙운송료가 확정된 후 재계산 (여기서는 0으로 임시 계산)
    const { vatAmount } = calculateVat(taxableBase, 0)

    return {
      ...product,
      productPriceKRW,
      tariffRate,
      tariffAmount,
      vatAmount,
    }
  })

  // ===== 3. 공장 비용 계산 (연결된 제품에 균등 분배) =====
  const factoryCostResults = calculateFactoryCostsByProduct(
    factorySlots,
    productsWithTariff.map(p => ({ id: p.id, quantity: p.quantity })),
    exchangeRates
  )

  // 제품별 공장비용 맵 생성 (총액 + 상세)
  const factoryCostMap = new Map(
    factoryCostResults.map(r => [r.productId, {
      totalCostKRW: r.totalCostKRW,
      details: r.details,
    }])
  )

  // ===== 4. 공통 비용 계산 (총 CBM 기준) =====
  // 내륙 운송료
  const inlandShippingUSD = calculateInlandShipping(totalCbm, costSettings?.inland)
  const inlandShippingKRW = Math.round(inlandShippingUSD * exchangeRates.usd)

  // 국제 운송료
  const shippingResult = findShippingRate(shippingRates, totalCbm)
  const internationalShippingKRW = shippingResult?.rateKRW ?? 0

  // 국내 운송료
  const domesticShippingKRW = calculateDomesticShipping(totalCbm, costSettings?.domestic)

  // 3PL 비용
  const threePLCostKRW = calculate3PLCost(totalCbm, costSettings?.threePL)

  // 송금 수수료 (기준: 전체 제품가격 + 공장비용 + 내륙운송료)
  const totalProductPriceKRW = productsWithTariff.reduce((sum, p) => sum + p.productPriceKRW, 0)
  const totalFactoryCostsKRW = factoryCostResults.reduce((sum, r) => sum + r.totalCostKRW, 0)
  const remittanceFeeBase = totalProductPriceKRW + totalFactoryCostsKRW + inlandShippingKRW
  const remittanceFee = calculateRemittanceFee(remittanceFeeBase)

  // 업체별 공통 비용 (주문 건수로 분할)
  const validOrderCount = Math.max(1, orderCount)
  const companyCostsDetail = calculateCompanyCosts(companyCosts, validOrderCount)
  const totalCompanyCostsKRW = sumCompanyCosts(companyCostsDetail)
  const companyCostsVat = sumCompanyCostsVat(companyCostsDetail)

  // 국내운송료 부가세
  const domesticShippingVat = calculateDomesticShippingVat(domesticShippingKRW)

  // 3PL 부가세
  const threePLVat = calculate3PLVat(threePLCostKRW)

  // ===== 5. 공통 비용 CBM 비율 분배 =====
  const sharedCostsDistribution = distributeSharedCostsByCbmRatio(
    productsWithCbm.map(p => ({ productId: p.id, cbm: p.totalCbm })),
    {
      inlandShipping: inlandShippingKRW,
      internationalShipping: internationalShippingKRW,
      domesticShipping: domesticShippingKRW,
      threePL: threePLCostKRW,
    }
  )

  // ===== 6. 제품별 총 비용 및 개당 단가 계산 =====

  // 먼저 송금 수수료 분배 비율을 미리 계산 (부가세 계산에 필요)
  const productRemittanceFeeShares = new Map(
    productsWithTariff.map(product => {
      const productPriceRatio = product.productPriceKRW / totalProductPriceKRW
      const remittanceFeeShare = Math.round(remittanceFee * productPriceRatio)
      return [product.id, remittanceFeeShare]
    })
  )

  const productResults: ProductCalculationResult[] = productsWithTariff.map(product => {
    const factoryCostData = factoryCostMap.get(product.id) ?? { totalCostKRW: 0, details: [] }
    const factoryCost = factoryCostData.totalCostKRW
    const sharedCosts = sharedCostsDistribution.get(product.id)!
    const remittanceFeeShare = productRemittanceFeeShares.get(product.id) ?? 0

    // 관세 재계산 (공장비용 포함)
    const { taxableBase, tariffAmount } = calculateTariff(
      product.productPriceKRW,
      factoryCost,  // 공장비용을 부대비용으로 포함
      product.tariffRate
    )
    // 부가세 계산: (제품가격 + 공장비용 + 내륙운송료 + 송금수수료) × 10% (관세 제외!)
    const { vatAmount } = calculateVat(taxableBase, sharedCosts.inlandShipping + remittanceFeeShare)

    // CBM 비율에 따른 국내 관련 부가세 분배
    const domesticVat = Math.round(
      (domesticShippingVat + threePLVat + companyCostsVat) * sharedCosts.cbmRatio
    )

    // 업체 공통 비용 분배 (주문 건수로 이미 분할된 금액을 제품 수로 재분배)
    const companyCostShare = Math.round(totalCompanyCostsKRW / validProducts.length)

    // 제품별 총 비용
    const totalCost = Math.round(
      product.productPriceKRW +
      factoryCost +
      tariffAmount +
      vatAmount +
      sharedCosts.inlandShipping +
      sharedCosts.internationalShipping +
      sharedCosts.domesticShipping +
      sharedCosts.threePL +
      domesticVat +
      companyCostShare +
      remittanceFeeShare
    )

    // 개당 수입원가
    const unitCost = Math.round(totalCost / product.quantity)

    // 공장 비용 상세 변환 (ProductCalculationResult 형식에 맞게)
    const factoryCostsDetail = factoryCostData.details.map(d => ({
      factoryName: d.factoryName,
      itemName: d.itemName,
      chargeType: d.chargeType,
      amountKRW: d.distributedAmount,
      amountForeign: d.distributedAmountForeign,
      currency: d.currency,
    }))

    return {
      productId: product.id,
      productName: product.name,
      unitCbm: product.unitCbm,
      totalCbm: product.totalCbm,
      cbmRatio: sharedCosts.cbmRatio,
      productPriceKRW: product.productPriceKRW,
      tariffRate: product.tariffRate,
      tariffAmount,
      vatAmount,
      factoryCostsTotal: factoryCost,
      factoryCostsDetail,  // 공장 비용 상세 추가
      sharedCosts: {
        inlandShipping: sharedCosts.inlandShipping,
        internationalShipping: sharedCosts.internationalShipping,
        domesticShipping: sharedCosts.domesticShipping,
        threePL: sharedCosts.threePL,
        domesticVat,
      },
      totalCost,
      unitCost,
    }
  })

  // ===== 7. 전체 합계 계산 =====
  const totalCost = productResults.reduce((sum, p) => sum + p.totalCost, 0)
  const totalTariff = productResults.reduce((sum, p) => sum + p.tariffAmount, 0)
  const totalVat = productResults.reduce((sum, p) => sum + p.vatAmount, 0) +
    domesticShippingVat + threePLVat + companyCostsVat

  return {
    products: productResults,
    totalCbm,
    roundedCbm,
    totalCost,
    sharedCostsTotal: {
      inlandShipping: inlandShippingKRW,
      internationalShipping: internationalShippingKRW,
      domesticShipping: domesticShippingKRW,
      threePL: threePLCostKRW,
      companyCosts: totalCompanyCostsKRW,
      remittanceFee,
    },
    companyCostsDetail,
    totalVat,
    breakdown: {
      productCost: totalProductPriceKRW,
      factoryCosts: totalFactoryCostsKRW,
      inlandShipping: inlandShippingKRW,
      tariff: totalTariff,
      vat: totalVat,
      internationalShipping: internationalShippingKRW,
      domesticShipping: domesticShippingKRW,
      threePLCost: threePLCostKRW,
      remittanceFee,
      companyCosts: totalCompanyCostsKRW,
    },
  }
}

