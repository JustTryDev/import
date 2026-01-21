"use client"

import { useState } from "react"
import { formatNumberWithCommas } from "@/lib/format"
import {
  ChevronDown,
  ChevronUp,
  Package,
  Truck,
  Building2,
  Receipt,
  CreditCard,
  Warehouse,
} from "lucide-react"
import type {
  Product,
  MultiProductCalculationResult,
} from "@/types/shipping"
import type { FactorySlot } from "../input/AdditionalCostInput"
import type {
  InlandShippingConfig,
  DomesticShippingConfig,
  ThreePLCostConfig,
} from "@/lib/calculations"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"

interface MultiProductCostBreakdownProps {
  result: MultiProductCalculationResult | null
  products: Product[]
  usdRate: number | null
  cnyRate: number | null
  factorySlots?: FactorySlot[]  // 공장 비용 상세를 위해 추가
  costSettings?: {
    inland?: InlandShippingConfig
    domestic?: DomesticShippingConfig
    threePL?: ThreePLCostConfig
  }
}

/**
 * 다중 제품 비용 내역 컴포넌트
 *
 * 📌 비유: 영수증 상세 내역
 * - 제품별 비용이 각각 표시됨
 * - 공통 비용(운송료 등)은 전체 합계로 표시
 * - 각 제품의 개당 수입원가 확인 가능
 */
export function MultiProductCostBreakdown({
  result,
  products,
  usdRate,
  cnyRate,
  factorySlots,
  costSettings,
}: MultiProductCostBreakdownProps) {
  // 제품별 상세 펼침/접힘 상태
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  // 공장 정보 조회 (공장 비용 상세 표시용)
  const factories = useQuery(api.factories.list)

  // 공장 비용 항목 조회 (모든 항목)
  const factoryCostItems = useQuery(api.factoryCostItems.listAll)

  // 원화 → 외화 역산 함수
  const toForeignCurrency = (krw: number, currency: "USD" | "CNY") => {
    const rate = currency === "USD" ? usdRate : cnyRate
    if (!rate || rate === 0) return null
    return krw / rate
  }

  // 외화 포맷팅
  const formatForeign = (amount: number | null, currency: "USD" | "CNY") => {
    if (amount === null) return ""
    const symbol = currency === "USD" ? "$" : "¥"
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // 결과가 없을 때
  if (!result) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-center text-gray-400 text-sm py-4">
          제품 정보를 입력하면 비용 내역이 표시됩니다
        </p>
      </div>
    )
  }

  // 제품 접기/펼치기 토글
  const toggleProduct = (productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  // 비용 설정 설명 텍스트 생성
  const getInlandDescription = () => {
    if (costSettings?.inland) {
      return `CBM당 $${costSettings.inland.ratePerCbm}`
    }
    return "CBM당 $35"
  }

  const getDomesticDescription = () => {
    if (costSettings?.domestic) {
      const { baseFee, baseCbm, extraUnit, extraRate } = costSettings.domestic
      return `기본 ${formatNumberWithCommas(baseFee)}원(${baseCbm}CBM), ${extraUnit}CBM당 ${formatNumberWithCommas(extraRate)}원 추가`
    }
    return "기본 35,000원(2CBM), 0.5CBM당 8,750원 추가"
  }

  const getThreePLDescription = () => {
    if (costSettings?.threePL) {
      const { ratePerUnit, unit } = costSettings.threePL
      return `${unit}CBM당 ${formatNumberWithCommas(ratePerUnit)}원`
    }
    return "1CBM당 50,000원"
  }

  return (
    <div className="space-y-3">
      {/* 제품별 비용 내역 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              제품별 비용 내역
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {result.products.map((productResult, productIndex) => {
            const product = products.find((p) => p.id === productResult.productId)
            const isExpanded = expandedProducts.has(productResult.productId)

            // 이 제품에 연결된 공장 슬롯 찾기
            const linkedFactorySlots = factorySlots?.filter(
              (slot) => slot.linkedProductIds?.includes(productResult.productId)
            ) ?? []

            // 제품 가격 외화 표시
            const productForeignPrice = product
              ? `${product.currency === "USD" ? "$" : "¥"}${(product.unitPrice * product.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : ""

            // 공장비용 외화 (USD 기준으로 역산)
            const factoryCostUSD = toForeignCurrency(productResult.factoryCostsTotal, "USD")

            return (
              <div key={productResult.productId} className="bg-white">
                {/* 제품 헤더 (클릭하여 접기/펼치기) */}
                <button
                  type="button"
                  onClick={() => toggleProduct(productResult.productId)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      {/* 제품 순서 + 품목명 */}
                      <div className="text-sm font-medium text-gray-700 text-left">
                        <span className="text-primary">제품 {productIndex + 1}</span>
                        {(productResult.productName || product?.hsCode?.nameKo) && (
                          <span className="text-gray-500 ml-2">
                            {productResult.productName || product?.hsCode?.nameKo}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 text-left">
                        {product?.currency === "USD" ? "$" : "¥"}{product?.unitPrice?.toLocaleString()} × {product?.quantity?.toLocaleString()}개
                        <span className="mx-1">·</span>
                        CBM {productResult.totalCbm.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-primary">
                        개당 {formatNumberWithCommas(productResult.unitCost)}원
                      </div>
                      <div className="text-xs text-gray-500">
                        총 {formatNumberWithCommas(productResult.totalCost)}원
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* 제품 상세 (펼친 상태) */}
                {isExpanded && (
                  <div className="px-4 pb-3 bg-gray-50/50">
                    {/* ===== 섹션 1: 제품가격 + 공장비용 + 내륙운송료 + 관세 + 부가세 ===== */}
                    <div className="space-y-1 py-2">
                      {/* 1. 제품가격 */}
                      <CostRowWithForeign
                        label="제품가격"
                        value={productResult.productPriceKRW}
                        foreignValue={productForeignPrice}
                        subLabel={`${product?.currency === "USD" ? "$" : "¥"}${product?.unitPrice?.toLocaleString()} × ${product?.quantity?.toLocaleString()}`}
                      />

                      {/* 2. 공장비용: 총액 + 상세 품목 */}
                      {productResult.factoryCostsTotal > 0 && (
                        <>
                          <CostRowWithForeign
                            label="공장비용"
                            value={productResult.factoryCostsTotal}
                            foreignValue={formatForeign(factoryCostUSD, "USD")}
                            subLabel="부대비용 분배"
                          />
                          {/* 공장별 상세 품목 */}
                          {linkedFactorySlots.map((slot) => {
                            const factory = factories?.find((f) => f._id === slot.factoryId)
                            const factoryName = factory?.name ?? "공장"

                            return slot.selectedItemIds.map((itemId) => {
                              const item = factoryCostItems?.find((i) => i._id === itemId)
                              const itemName = item?.name ?? "항목"
                              const costValue = slot.costValues[itemId] ?? 0
                              const costKRW = Math.round(costValue * (usdRate ?? 1))
                              const linkedCount = slot.linkedProductIds?.length ?? 1
                              const distributedKRW = Math.round(costKRW / linkedCount)
                              const distributedUSD = costValue / linkedCount

                              return (
                                <div
                                  key={`${slot.factoryId}-${itemId}`}
                                  className="flex items-center justify-between py-0.5 ml-3"
                                >
                                  <span className="text-xs text-gray-500">
                                    {factoryName} - {itemName}
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    {formatNumberWithCommas(distributedKRW)}원
                                    <span className="text-gray-400 ml-1">
                                      (${distributedUSD.toFixed(2)})
                                    </span>
                                  </span>
                                </div>
                              )
                            })
                          })}
                        </>
                      )}

                      {/* 3. 내륙운송료 */}
                      <CostRowWithForeign
                        label="내륙운송료"
                        value={productResult.sharedCosts.inlandShipping}
                        foreignValue={formatForeign(toForeignCurrency(productResult.sharedCosts.inlandShipping, "USD"), "USD")}
                        subLabel={`CBM 비율 ${(productResult.cbmRatio * 100).toFixed(1)}%`}
                      />

                      {/* 4. 관세 (FTA 절감액 표시) */}
                      {(() => {
                        const useFta = product?.useFta ?? false
                        const basicRate = product?.basicTariffRate ?? 0
                        const ftaRate = product?.ftaTariffRate ?? 0
                        const taxableBase = productResult.productPriceKRW + productResult.factoryCostsTotal
                        const basicTariffAmount = Math.round(taxableBase * (basicRate / 100))
                        const ftaTariffAmount = productResult.tariffAmount
                        const savings = basicTariffAmount - ftaTariffAmount

                        if (useFta && savings > 0) {
                          return (
                            <div className="flex items-center justify-between py-1">
                              <span className="text-sm text-gray-600">
                                한-중 FTA 관세 ({ftaRate}%)
                              </span>
                              <span className="text-sm text-gray-600">
                                <span className="text-gray-400 line-through mr-1">
                                  {formatNumberWithCommas(basicTariffAmount)}원
                                </span>
                                →
                                <span className="font-medium text-gray-700 mx-1">
                                  {formatNumberWithCommas(ftaTariffAmount)}원
                                </span>
                                <span className="text-blue-500">
                                  (-{formatNumberWithCommas(savings)}원)
                                </span>
                              </span>
                            </div>
                          )
                        }
                        return (
                          <CostRow
                            label={`관세 (${productResult.tariffRate}%)`}
                            value={productResult.tariffAmount}
                            subLabel={useFta ? "FTA 적용" : "기본 관세"}
                          />
                        )
                      })()}

                      {/* 5. 관세 부가세 */}
                      <CostRow
                        label="관세 부가세"
                        value={productResult.vatAmount}
                        subLabel="10%"
                      />
                    </div>

                    {/* ===== 가로선 1 ===== */}
                    <div className="border-t border-gray-200 my-1" />

                    {/* ===== 섹션 2: 송금수수료 + 국제운송료 + D/O + C/O ===== */}
                    <div className="space-y-1 py-2">
                      {/* 6. 송금 & 결제 수수료 (CBM 비율로 분배) */}
                      {(() => {
                        const totalRemittance = result.sharedCostsTotal.remittanceFee
                        const distributedRemittance = Math.round(totalRemittance * productResult.cbmRatio)
                        return (
                          <CostRow
                            label="송금 & 결제 수수료"
                            value={distributedRemittance}
                            subLabel={`주문 ${products.length}건 분배`}
                          />
                        )
                      })()}

                      {/* 7. 국제운송료 */}
                      <CostRowWithForeign
                        label="국제운송료"
                        value={productResult.sharedCosts.internationalShipping}
                        foreignValue={formatForeign(toForeignCurrency(productResult.sharedCosts.internationalShipping, "USD"), "USD")}
                        subLabel="CBM 비율 분배"
                      />

                      {/* 8-9. D/O, C/O 비용 (companyCostsDetail에서 찾기) */}
                      {result.companyCostsDetail?.filter(item =>
                        item.name.includes("D/O") || item.name.includes("C/O")
                      ).map((item) => {
                        const distributedAmount = Math.round(item.dividedAmount * productResult.cbmRatio)
                        return (
                          <CostRow
                            key={item.itemId}
                            label={item.name}
                            value={distributedAmount}
                            subLabel="CBM 비율 분배"
                          />
                        )
                      })}
                    </div>

                    {/* ===== 가로선 2 ===== */}
                    <div className="border-t border-gray-200 my-1" />

                    {/* ===== 섹션 3: 통관수수료 + 국내운송료 + 3PL ===== */}
                    <div className="space-y-1 py-2">
                      {/* 10. 통관 수수료 (companyCostsDetail에서 찾기) */}
                      {result.companyCostsDetail?.filter(item =>
                        item.name.includes("통관")
                      ).map((item) => {
                        const distributedAmount = Math.round(item.dividedAmount * productResult.cbmRatio)
                        return (
                          <CostRow
                            key={item.itemId}
                            label={item.name}
                            value={distributedAmount}
                            subLabel="CBM 비율 분배"
                          />
                        )
                      })}

                      {/* 11. 국내운송료 */}
                      <CostRow
                        label="국내운송료"
                        value={productResult.sharedCosts.domesticShipping}
                        subLabel="CBM 비율 분배"
                      />

                      {/* 12. 3PL비용 + 배송비 */}
                      <CostRow
                        label="3PL비용 + 배송비"
                        value={productResult.sharedCosts.threePL}
                        subLabel="CBM 비율 분배"
                      />
                    </div>

                    {/* ===== 가로선 3 ===== */}
                    <div className="border-t border-gray-200 my-1" />

                    {/* ===== 섹션 4: 국내 부가세 ===== */}
                    <div className="space-y-1 py-2">
                      {/* 13. 국내 부가세 */}
                      {productResult.sharedCosts.domesticVat > 0 && (
                        <CostRow
                          label="국내 부가세"
                          value={productResult.sharedCosts.domesticVat}
                          subLabel="운송+3PL+업체 VAT"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 공통 비용 합계 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              공통 비용 합계
            </span>
          </div>
        </div>

        <div className="p-4 space-y-2">
          <CostRow
            label="내륙운송료"
            value={result.sharedCostsTotal.inlandShipping}
            subLabel={getInlandDescription()}
            icon={<Truck className="h-3 w-3" />}
          />
          <CostRow
            label="국제운송료"
            value={result.sharedCostsTotal.internationalShipping}
            subLabel={`총 CBM ${result.roundedCbm.toFixed(1)}`}
            icon={<Truck className="h-3 w-3" />}
          />
          <CostRow
            label="국내운송료"
            value={result.sharedCostsTotal.domesticShipping}
            subLabel={getDomesticDescription()}
            icon={<Truck className="h-3 w-3" />}
          />
          <CostRow
            label="3PL비용"
            value={result.sharedCostsTotal.threePL}
            subLabel={getThreePLDescription()}
            icon={<Warehouse className="h-3 w-3" />}
          />
          <CostRow
            label="송금수수료"
            value={result.sharedCostsTotal.remittanceFee}
            subLabel="제품+부대비용 기준"
            icon={<CreditCard className="h-3 w-3" />}
          />
          <CostRow
            label="업체공통비용"
            value={result.sharedCostsTotal.companyCosts}
            subLabel={`${result.companyCostsDetail?.length ?? 0}개 항목`}
            icon={<Building2 className="h-3 w-3" />}
          />
        </div>
      </div>

      {/* 비용 구성 요약 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              비용 구성 요약
            </span>
          </div>
        </div>

        <div className="p-4 space-y-2">
          <CostRow
            label="제품가격"
            value={result.breakdown.productCost}
            highlight
          />
          <CostRow
            label="공장비용"
            value={result.breakdown.factoryCosts}
          />
          <CostRow
            label="관세"
            value={result.breakdown.tariff}
          />
          <CostRow
            label="부가세 합계"
            value={result.totalVat}
            subLabel="관세+국내+업체"
          />
          <CostRow
            label="운송료 합계"
            value={
              result.breakdown.inlandShipping +
              result.breakdown.internationalShipping +
              result.breakdown.domesticShipping
            }
            subLabel="내륙+국제+국내"
          />
          <CostRow
            label="3PL비용"
            value={result.breakdown.threePLCost}
          />
          <CostRow
            label="송금수수료"
            value={result.breakdown.remittanceFee}
          />
          <CostRow
            label="업체공통비용"
            value={result.breakdown.companyCosts}
          />

          {/* 구분선 */}
          <div className="border-t border-gray-200 my-2" />

          {/* 총 합계 */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-bold text-gray-900">총 수입원가</span>
            <span className="text-lg font-bold text-primary">
              {formatNumberWithCommas(result.totalCost)}원
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// 비용 행 컴포넌트
function CostRow({
  label,
  value,
  subLabel,
  icon,
  highlight = false,
}: {
  label: string
  value: number
  subLabel?: string
  icon?: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-400">{icon}</span>}
        <div>
          <span className={`text-sm ${highlight ? "font-medium text-gray-900" : "text-gray-600"}`}>
            {label}
          </span>
          {subLabel && (
            <span className="text-xs text-gray-400 ml-1">({subLabel})</span>
          )}
        </div>
      </div>
      <span className={`text-sm font-medium ${highlight ? "text-gray-900" : "text-gray-700"}`}>
        {formatNumberWithCommas(value)}원
      </span>
    </div>
  )
}

// 비용 행 컴포넌트 (외화 표시 포함)
function CostRowWithForeign({
  label,
  value,
  foreignValue,
  subLabel,
  icon,
  highlight = false,
}: {
  label: string
  value: number
  foreignValue: string  // 외화 표시 (예: "$100.00", "¥650.00")
  subLabel?: string
  icon?: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-400">{icon}</span>}
        <div>
          <span className={`text-sm ${highlight ? "font-medium text-gray-900" : "text-gray-600"}`}>
            {label}
          </span>
          {subLabel && (
            <span className="text-xs text-gray-400 ml-1">({subLabel})</span>
          )}
        </div>
      </div>
      <span className={`text-sm font-medium ${highlight ? "text-gray-900" : "text-gray-700"}`}>
        {formatNumberWithCommas(value)}원
        {foreignValue && (
          <span className="text-xs text-gray-400 ml-1">({foreignValue})</span>
        )}
      </span>
    </div>
  )
}
