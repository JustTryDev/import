import { Id } from "../../../convex/_generated/dataModel"

/**
 * 비용 계산 로직
 */

// 공통 비용 항목 입력
export interface CostItemInput {
  id: Id<"companyCostItems">
  name: string
  amount: number
  isDivisible: boolean
  isVatApplicable: boolean  // 부가세 적용 여부
}

// 공통 비용 계산 결과
export interface CostItemResult {
  itemId: Id<"companyCostItems">
  name: string
  originalAmount: number
  dividedAmount: number
  orderCount: number
  isVatApplicable: boolean  // 부가세 적용 여부
  vatAmount: number         // 해당 항목의 부가세 금액 (10%)
}

// 업체별 공통 비용 계산 (주문 건수 분할 및 부가세 적용)
export function calculateCompanyCosts(
  items: CostItemInput[],
  orderCount: number
): CostItemResult[] {
  const validOrderCount = Math.max(1, orderCount)

  return items.map((item) => {
    // 분할 가능한 항목만 주문 건수로 나눔
    const dividedAmount = item.isDivisible
      ? Math.round(item.amount / validOrderCount)
      : item.amount

    // 부가세 계산 (적용 대상인 경우만 10%)
    const vatAmount = item.isVatApplicable
      ? Math.round(dividedAmount * 0.1)
      : 0

    return {
      itemId: item.id,
      name: item.name,
      originalAmount: item.amount,
      dividedAmount,
      orderCount: validOrderCount,
      isVatApplicable: item.isVatApplicable,
      vatAmount,
    }
  })
}

// 공통 비용 합계 계산 (부가세 제외)
export function sumCompanyCosts(results: CostItemResult[]): number {
  return results.reduce((sum, item) => sum + item.dividedAmount, 0)
}

// 공통 비용 부가세 합계 계산
export function sumCompanyCostsVat(results: CostItemResult[]): number {
  return results.reduce((sum, item) => sum + item.vatAmount, 0)
}

// 국내운송료 부가세 계산 (10%)
export function calculateDomesticShippingVat(domesticShipping: number): number {
  return Math.round(domesticShipping * 0.1)
}

// 3PL 비용 부가세 계산 (10%)
export function calculate3PLVat(threePLCost: number): number {
  return Math.round(threePLCost * 0.1)
}

// 부대 비용 항목 입력
export interface AdditionalCostInput {
  id: Id<"factoryCostItems">
  name: string
  amount: number
}

// 부대 비용 합계 계산
export function sumAdditionalCosts(items: AdditionalCostInput[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0)
}

// 관세 계산
// 과세가격 = 제품가격 + 부대비용
// 관세 = 과세가격 x 관세율
export function calculateTariff(
  productPriceKRW: number,
  additionalCosts: number,
  tariffRate: number
): {
  taxableBase: number
  tariffAmount: number
} {
  // 관세 과세 기준 = 제품가격 + 부대비용
  const taxableBase = productPriceKRW + additionalCosts
  // 관세 = 과세 기준 x 관세율
  const tariffAmount = Math.round(taxableBase * (tariffRate / 100))

  return { taxableBase, tariffAmount }
}

// 부가세 계산
// 부가세 과세가격 = 관세 과세기준 + 관세
// 부가세 = 부가세 과세가격 x 10%
export function calculateVat(
  taxableBase: number,
  tariffAmount: number
): {
  vatBase: number
  vatAmount: number
} {
  // 부가세 과세 기준 = 관세 과세기준 + 관세
  const vatBase = taxableBase + tariffAmount
  // 부가세 = 과세 기준 x 10%
  const vatAmount = Math.round(vatBase * 0.1)

  return { vatBase, vatAmount }
}

// ===== 다중 제품 공장 비용 계산 =====

// 공장 슬롯 비용 항목 입력
export interface FactorySlotCostItem {
  itemId: string
  name: string
  unitAmount: number                    // 단가
  quantity: number                      // 수량 (수량연동용)
  chargeType: "once" | "per_quantity"   // 부과 방식
}

// 공장 슬롯 입력
export interface FactorySlotInput {
  factoryId: string
  factoryName: string
  currency: "USD" | "CNY"
  items: FactorySlotCostItem[]
  linkedProductIds: string[]            // 연결된 제품 ID 목록
}

// 제품별 공장 비용 분배 결과
export interface ProductFactoryCostResult {
  productId: string
  totalCostKRW: number                  // 해당 제품에 분배된 공장비용 (원화)
  details: {
    factoryName: string
    itemName: string
    chargeType: "once" | "per_quantity"
    totalAmount: number                 // 항목별 총 금액 (원화)
    distributedAmount: number           // 분배 후 금액 (원화)
  }[]
}

/**
 * 공장 비용을 제품별로 분배하여 계산
 *
 * 📌 비유: 피자를 여러 명이 나눠 먹는 것처럼
 * - 공장 비용을 연결된 제품들이 균등하게 분배
 * - 수량연동 비용은 연결된 제품들의 수량 합계로 계산 후 균등 분배
 *
 * @param factorySlots 공장 슬롯 배열 (각 슬롯에 연결된 제품 정보 포함)
 * @param products 제품 배열 (수량 정보 필요)
 * @param exchangeRates 환율 { usd: number, cny: number }
 * @returns 제품별 공장 비용 분배 결과
 */
export function calculateFactoryCostsByProduct(
  factorySlots: FactorySlotInput[],
  products: { id: string; quantity: number }[],
  exchangeRates: { usd: number; cny: number }
): ProductFactoryCostResult[] {
  // 제품별 비용 누적 맵
  const productCostsMap = new Map<string, {
    totalCostKRW: number
    details: ProductFactoryCostResult["details"]
  }>()

  // 모든 제품 초기화
  products.forEach(p => {
    productCostsMap.set(p.id, { totalCostKRW: 0, details: [] })
  })

  // 각 공장 슬롯별로 비용 계산 및 분배
  for (const slot of factorySlots) {
    if (!slot.factoryId || slot.items.length === 0) continue

    // 연결된 제품 필터링 (실제 존재하는 제품만)
    const linkedProducts = products.filter(p =>
      slot.linkedProductIds.includes(p.id)
    )

    // 연결된 제품이 없으면 스킵
    if (linkedProducts.length === 0) continue

    // 환율 선택
    const exchangeRate = slot.currency === "USD"
      ? exchangeRates.usd
      : exchangeRates.cny

    // 각 비용 항목별 계산
    for (const item of slot.items) {
      let totalAmountForeign = 0

      if (item.chargeType === "per_quantity") {
        // 수량연동: 연결된 제품들의 수량 합계로 계산
        const totalQuantity = linkedProducts.reduce((sum, p) => sum + p.quantity, 0)
        totalAmountForeign = item.unitAmount * totalQuantity
      } else {
        // 1회성: 단가 그대로
        totalAmountForeign = item.unitAmount * item.quantity
      }

      // 원화 환산
      const totalAmountKRW = Math.round(totalAmountForeign * exchangeRate)

      // 균등 분배
      const perProductAmount = Math.round(totalAmountKRW / linkedProducts.length)

      // 각 연결된 제품에 비용 분배
      linkedProducts.forEach(product => {
        const productCost = productCostsMap.get(product.id)
        if (productCost) {
          productCost.totalCostKRW += perProductAmount
          productCost.details.push({
            factoryName: slot.factoryName,
            itemName: item.name,
            chargeType: item.chargeType,
            totalAmount: totalAmountKRW,
            distributedAmount: perProductAmount,
          })
        }
      })
    }
  }

  // Map을 배열로 변환
  return products.map(p => ({
    productId: p.id,
    ...productCostsMap.get(p.id)!
  }))
}

/**
 * 공통 비용을 CBM 비율로 제품별 분배
 *
 * 📌 비유: 택시비를 이동 거리 비율로 나누는 것처럼
 * - 각 제품이 차지하는 CBM 비율로 운송료 등을 분배
 *
 * @param products 제품별 CBM 정보
 * @param sharedCosts 공통 비용 (운송료 등)
 * @returns 제품별 분배된 공통 비용
 */
export function distributeSharedCostsByCbmRatio(
  products: { productId: string; cbm: number }[],
  sharedCosts: {
    inlandShipping: number
    internationalShipping: number
    domesticShipping: number
    threePL: number
  }
): Map<string, {
  inlandShipping: number
  internationalShipping: number
  domesticShipping: number
  threePL: number
  cbmRatio: number
}> {
  const result = new Map<string, {
    inlandShipping: number
    internationalShipping: number
    domesticShipping: number
    threePL: number
    cbmRatio: number
  }>()

  // 총 CBM 계산
  const totalCbm = products.reduce((sum, p) => sum + p.cbm, 0)

  // 각 제품별 CBM 비율로 분배
  products.forEach(({ productId, cbm }) => {
    // CBM 비율 계산 (총 CBM이 0이면 균등 분배)
    const ratio = totalCbm > 0 ? cbm / totalCbm : 1 / products.length

    result.set(productId, {
      inlandShipping: Math.round(sharedCosts.inlandShipping * ratio),
      internationalShipping: Math.round(sharedCosts.internationalShipping * ratio),
      domesticShipping: Math.round(sharedCosts.domesticShipping * ratio),
      threePL: Math.round(sharedCosts.threePL * ratio),
      cbmRatio: ratio,
    })
  })

  return result
}
