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
