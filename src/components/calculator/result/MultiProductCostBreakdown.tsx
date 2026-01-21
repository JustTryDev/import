"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { formatNumberWithCommas } from "@/lib/format"
import {
  ChevronDown,
  ChevronUp,
  Package,
  Receipt,
  Divide,
  ArrowRight,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  orderCount?: number  // 주문 건수 (공통 비용 분배 표시용)
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
  orderCount = 1,
}: MultiProductCostBreakdownProps) {
  // 제품별 상세 펼침/접힘 상태
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  // 제품별 마진율 상태 (기본값: 150%)
  const [marginRates, setMarginRates] = useState<Map<string, number>>(new Map())

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

  // 송금 수수료 기준 금액 (제품가격 + 공장비용 + 내륙운송료)
  const remittanceFeeBaseForDetail = result.breakdown.productCost + result.breakdown.factoryCosts + result.sharedCostsTotal.inlandShipping
  // 100만원 이상이면 T/T 송금, 미만이면 카드 결제
  const isWireTransferForDetail = remittanceFeeBaseForDetail >= 1_000_000
  const paymentMethodForDetail = isWireTransferForDetail ? "T/T 송금" : "카드 결제"

  // 비용 설정 설명 텍스트 생성 (R.TON 기준)
  const getInlandDescription = () => {
    if (costSettings?.inland) {
      return `R.TON (CBM)당 $${costSettings.inland.ratePerCbm}`
    }
    return "R.TON (CBM)당 $35"
  }

  const getDomesticDescription = () => {
    if (costSettings?.domestic) {
      const { baseFee, baseCbm, extraUnit, extraRate } = costSettings.domestic
      return `기본 ${formatNumberWithCommas(baseFee)}원(${baseCbm} R.TON (CBM)), ${extraUnit} R.TON (CBM)당 ${formatNumberWithCommas(extraRate)}원 추가`
    }
    return "기본 35,000원(2 R.TON (CBM)), 0.5 R.TON (CBM)당 8,750원 추가"
  }

  const getThreePLDescription = () => {
    if (costSettings?.threePL) {
      const { ratePerUnit, unit } = costSettings.threePL
      return `${unit}R.TON (CBM)당 ${formatNumberWithCommas(ratePerUnit)}원`
    }
    return "1R.TON (CBM)당 50,000원"
  }

  return (
    <div className="space-y-3">
      {/* 제품별 비용 내역 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              제품 별 비용 내역
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {result.products.map((productResult, productIndex) => {
            const product = products.find((p) => p.id === productResult.productId)
            const isExpanded = expandedProducts.has(productResult.productId)

            // 제품 가격 외화 표시
            const productForeignPrice = product
              ? `${product.currency === "USD" ? "$" : "¥"}${(product.unitPrice * product.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : ""

            // 공장비용 외화 (USD 기준으로 역산)
            const factoryCostUSD = toForeignCurrency(productResult.factoryCostsTotal, "USD")

            return (
              <div key={productResult.productId} className="bg-white">
                {/* 제품 헤더 */}
                <div className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  {/* 좌측: 제품 정보 (클릭하여 접기/펼치기) */}
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => toggleProduct(productResult.productId)}
                  >
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
                        R.TON (CBM) {productResult.totalCbm.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  {/* 우측: 가격 정보 + 펼침/접힘 버튼 */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {/* 개당 원가 + 마진율 드롭다운 + 판매가 */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-primary">
                          개당 {formatNumberWithCommas(productResult.unitCost)}원
                        </span>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <Select
                          value={String(marginRates.get(productResult.productId) ?? 200)}
                          onValueChange={(value) => {
                            setMarginRates(prev => {
                              const next = new Map(prev)
                              next.set(productResult.productId, Number(value))
                              return next
                            })
                          }}
                        >
                          <SelectTrigger className="h-6 w-[80px] text-xs">
                            <SelectValue placeholder="100%">
                              {(marginRates.get(productResult.productId) ?? 200) - 100}%
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {[150, 160, 170, 180, 190, 200].map(rate => (
                              <SelectItem key={rate} value={String(rate)}>{rate - 100}%</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-gray-400">=</span>
                        <span className="text-sm font-bold text-green-600">
                          {formatNumberWithCommas(Math.round(productResult.unitCost * (marginRates.get(productResult.productId) ?? 200) / 100))}원
                        </span>
                        <span className="text-xs text-gray-400">(VAT 미포함)</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        총 {formatNumberWithCommas(productResult.totalCost)}원
                      </div>
                    </div>
                    {/* 펼침/접힘 버튼 */}
                    <button
                      type="button"
                      onClick={() => toggleProduct(productResult.productId)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 제품 상세 (펼친 상태) - 애니메이션 적용 */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{
                        height: "auto",
                        opacity: 1,
                        transition: {
                          height: { duration: 0.25, ease: "easeOut" },
                          opacity: { duration: 0.2, delay: 0.05 },
                        },
                      }}
                      exit={{
                        height: 0,
                        opacity: 0,
                        transition: {
                          height: { duration: 0.2, ease: "easeOut" },
                          opacity: { duration: 0.1 },
                        },
                      }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="px-4 pb-3 bg-gray-50/50">
                    {/* ===== 섹션 1: 제품가격 + 공장비용 + 내륙운송료 + 관세 + 부가세 ===== */}
                    <div className="space-y-1 py-2">
                      {/* 1. 제품가격 */}
                      <CostRowWithForeign
                        label="제품 가격"
                        value={productResult.productPriceKRW}
                        foreignValue={productForeignPrice}
                        subLabel={`${product?.currency === "USD" ? "$" : "¥"}${product?.unitPrice?.toLocaleString()} × ${product?.quantity?.toLocaleString()}`}
                      />

                      {/* 2. 공장비용: 총액 + 상세 품목 */}
                      {productResult.factoryCostsTotal > 0 && (
                        <>
                          <CostRowWithForeign
                            label="추가 비용"
                            value={productResult.factoryCostsTotal}
                            foreignValue={formatForeign(factoryCostUSD, "USD")}
                          />
                          {/* 공장별 상세 품목 (계산 결과에서 직접 가져옴) */}
                          {productResult.factoryCostsDetail?.map((detail, idx) => {
                            const currencySymbol = detail.currency === "USD" ? "$" : "¥"
                            return (
                              <div
                                key={`factory-detail-${idx}`}
                                className="flex items-center justify-between py-0.5 ml-3"
                              >
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  {detail.factoryName} - {detail.itemName}
                                  <span className={`px-1 py-0.5 rounded text-[10px] ${
                                    detail.chargeType === "per_quantity"
                                      ? "bg-green-100 text-green-600"
                                      : "bg-gray-100 text-gray-400"
                                  }`}>
                                    {detail.chargeType === "per_quantity" ? "수량별" : "1회성"}
                                  </span>
                                </span>
                                <span className="text-xs text-gray-600">
                                  {formatNumberWithCommas(Math.round(detail.amountKRW * 10) / 10)}원
                                  <span className="text-gray-400 ml-1">
                                    ({currencySymbol}{detail.amountForeign.toFixed(2)})
                                  </span>
                                </span>
                              </div>
                            )
                          })}
                        </>
                      )}

                      {/* 3. 내륙운송료 */}
                      <CostRowWithForeign
                        label="중국 내륙 운송료"
                        value={productResult.sharedCosts.inlandShipping}
                        foreignValue={formatForeign(toForeignCurrency(productResult.sharedCosts.inlandShipping, "USD"), "USD")}
                        subLabel={`R.TON (CBM) 비율 ${(productResult.cbmRatio * 100).toFixed(1)}%`}
                      />

                      {/* 4. 송금 & 결제 수수료 (제품 수로 균등 분배) */}
                      {(() => {
                        const totalRemittance = result.sharedCostsTotal.remittanceFee
                        const distributedRemittance = Math.round(totalRemittance / products.length)
                        return (
                          <CostRow
                            label="송금 & 결제 수수료"
                            value={distributedRemittance}
                            badge={paymentMethodForDetail}
                            badgeVariant={isWireTransferForDetail ? "dark" : "light"}
                            subLabel={<><Divide className="h-3 w-3" /> {products.length}</>}
                          />
                        )
                      })()}
                    </div>

                    {/* ===== 가로선: 내륙운송료 아래 ===== */}
                    <div className="border-t border-gray-200 my-1" />

                    <div className="space-y-1 py-2">
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
                        label="국외 부가세"
                        value={productResult.vatAmount}
                        subLabel="10%"
                      />
                    </div>

                    {/* ===== 가로선 1 ===== */}
                    <div className="border-t border-gray-200 my-1" />

                    {/* ===== 섹션 2: 국제운송료 + D/O + C/O ===== */}
                    <div className="space-y-1 py-2">
                      {/* 5. 국제운송료 */}
                      <CostRowWithForeign
                        label="국제 운송료"
                        value={productResult.sharedCosts.internationalShipping}
                        foreignValue={formatForeign(toForeignCurrency(productResult.sharedCosts.internationalShipping, "USD"), "USD")}
                        subLabel={`R.TON (CBM) 비율 ${(productResult.cbmRatio * 100).toFixed(1)}%`}
                      />

                      {/* 8-10. 공통 비용 (통관 수수료 제외) - orderCount로 나눈 값을 그대로 표시 */}
                      {result.companyCostsDetail?.filter(item => !item.name.includes('통관')).map((item) => (
                        <CostRow
                          key={item.itemId}
                          label={item.name}
                          value={item.dividedAmount}
                          subLabel={<><Divide className="h-3 w-3" /> {orderCount}</>}
                        />
                      ))}
                    </div>

                    {/* ===== 가로선 2 ===== */}
                    <div className="border-t border-gray-200 my-1" />

                    {/* ===== 섹션 3: 통관 수수료 + 국내운송료 + 3PL ===== */}
                    <div className="space-y-1 py-2">
                      {/* 통관 수수료 (공통 비용에서 분리) */}
                      {result.companyCostsDetail?.filter(item => item.name.includes('통관')).map((item) => (
                        <CostRow
                          key={item.itemId}
                          label={item.name}
                          value={item.dividedAmount}
                          subLabel={<><Divide className="h-3 w-3" /> {orderCount}</>}
                        />
                      ))}

                      {/* 11. 국내운송료 */}
                      <CostRow
                        label="국내 운송료"
                        value={productResult.sharedCosts.domesticShipping}
                        subLabel={`R.TON (CBM) 비율 ${(productResult.cbmRatio * 100).toFixed(1)}%`}
                      />

                      {/* 12. 3PL비용 + 배송비 */}
                      <CostRow
                        label="3PL 비용 + 배송비"
                        value={productResult.sharedCosts.threePL}
                        subLabel={`R.TON (CBM) 비율 ${(productResult.cbmRatio * 100).toFixed(1)}%`}
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
                        />
                      )}
                    </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>

      {/* 총 비용 내역 (프로그레스 스택) */}
      <TotalCostBreakdown
        result={result}
        usdRate={usdRate}
        costSettings={costSettings}
        orderCount={orderCount}
      />
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
  badge,
  badgeVariant = "light",
}: {
  label: string
  value: number
  subLabel?: React.ReactNode  // 문자열 또는 아이콘 포함 가능
  icon?: React.ReactNode
  highlight?: boolean
  badge?: string
  badgeVariant?: "dark" | "light"
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-400">{icon}</span>}
        <div className="flex items-center gap-1">
          <span className={`text-sm ${highlight ? "font-medium text-gray-900" : "text-gray-600"}`}>
            {label}
          </span>
          {badge && (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              badgeVariant === "dark"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700"
            }`}>
              {badge}
            </span>
          )}
          {subLabel && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">({subLabel})</span>
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

/**
 * 총 비용 내역 컴포넌트 (프로그레스 스택 UI)
 *
 * 📌 비유: 비용 비율 시각화 영수증
 * - 각 섹션별 비용과 비율을 프로그레스 바로 표시
 * - 5개 섹션: 제품 원가, 세금, 국제 물류, 국내 통관 및 물류, 부가세
 */
function TotalCostBreakdown({
  result,
  usdRate,
  costSettings,
  orderCount = 1,
}: {
  result: MultiProductCalculationResult
  usdRate: number | null
  costSettings?: {
    inland?: InlandShippingConfig
    domestic?: DomesticShippingConfig
    threePL?: ThreePLCostConfig
  }
  orderCount?: number
}) {
  // 원화 → USD 역산
  const toUSD = (krw: number) => {
    if (!usdRate || usdRate === 0) return null
    return krw / usdRate
  }

  // USD 포맷팅
  const formatUSD = (amount: number | null) => {
    if (amount === null) return ""
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // ===== 섹션별 비용 계산 =====

  // 1. 제품 원가 섹션 (송금 수수료 포함)
  const productCostTotal = result.breakdown.productCost
  const additionalCostTotal = result.breakdown.factoryCosts
  const inlandShippingTotal = result.sharedCostsTotal.inlandShipping
  const remittanceFee = result.sharedCostsTotal.remittanceFee
  const productSectionTotal = productCostTotal + additionalCostTotal + inlandShippingTotal + remittanceFee

  // 2. 세금 섹션 (관세 + 국외 부가세)
  const tariffTotal = result.breakdown.tariff
  // 국외 부가세 = 각 제품의 vatAmount 합계 (관세 관련 부가세)
  const foreignVatTotal = result.products.reduce((sum, p) => sum + p.vatAmount, 0)
  const taxSectionTotal = tariffTotal + foreignVatTotal

  // 3. 국제 물류 섹션 (송금 수수료 제외)
  const internationalShipping = result.sharedCostsTotal.internationalShipping
  // 통관 수수료를 제외한 업체 공통 비용 (D/O, C/O 등)
  const companyCostsWithoutCustoms = result.companyCostsDetail?.filter(
    item => !item.name.includes('통관')
  ) || []
  const companyCostsWithoutCustomsTotal = companyCostsWithoutCustoms.reduce(
    (sum, item) => sum + item.dividedAmount, 0
  )
  const internationalSectionTotal = internationalShipping + companyCostsWithoutCustomsTotal

  // 4. 국내 통관 및 물류 섹션
  // 통관 수수료
  const customsClearanceItem = result.companyCostsDetail?.find(item => item.name.includes('통관'))
  const customsClearanceFee = customsClearanceItem?.dividedAmount || 0
  const domesticShipping = result.sharedCostsTotal.domesticShipping
  const threePL = result.sharedCostsTotal.threePL
  const domesticSectionTotal = customsClearanceFee + domesticShipping + threePL

  // 5. 부가세 섹션 (국내 부가세)
  // 국내 부가세 = 각 제품의 domesticVat 합계
  const domesticVatTotal = result.products.reduce((sum, p) => sum + p.sharedCosts.domesticVat, 0)
  const vatSectionTotal = domesticVatTotal

  // 총 비용
  const totalCost = result.totalCost

  // 송금 수수료 기준 금액 (제품가격 + 공장비용 + 내륙운송료)
  const remittanceFeeBase = productCostTotal + additionalCostTotal + inlandShippingTotal
  // 100만원 이상이면 T/T 송금, 미만이면 카드 결제
  const isWireTransfer = remittanceFeeBase >= 1_000_000
  const paymentMethod = isWireTransfer ? "T/T 송금" : "카드 결제"

  // 비율 계산 함수
  const getPercentage = (sectionTotal: number) => {
    if (totalCost === 0) return 0
    return (sectionTotal / totalCost) * 100
  }

  // 비용 설정 설명 텍스트
  const inlandRatePerCbm = costSettings?.inland?.ratePerCbm ?? 35
  const domesticBaseCbm = costSettings?.domestic?.baseCbm ?? 2
  const domesticExtraUnit = costSettings?.domestic?.extraUnit ?? 0.5
  const domesticExtraRate = costSettings?.domestic?.extraRate ?? 8750
  const threePLUnit = costSettings?.threePL?.unit ?? 1
  const threePLRate = costSettings?.threePL?.ratePerUnit ?? 50000

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">총 비용 내역</span>
        </div>
        <span className="text-lg font-bold text-primary">
          {formatNumberWithCommas(totalCost)}원
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* ===== 섹션 1: 제품 원가 ===== */}
        <CostSection
          title="제품 원가"
          sectionTotal={productSectionTotal}
          percentage={getPercentage(productSectionTotal)}
        >
          <SectionCostRow label="총 제품 가격" value={productCostTotal} />
          <SectionCostRow label="총 추가 비용" value={additionalCostTotal} />
          <SectionCostRow
            label={`중국 내륙 운송료 ($${inlandRatePerCbm} / R.TON (CBM))`}
            value={inlandShippingTotal}
            foreignValue={formatUSD(toUSD(inlandShippingTotal))}
          />
          <SectionCostRow
            label="송금 & 결제 수수료"
            value={remittanceFee}
            badge={paymentMethod}
            badgeVariant={isWireTransfer ? "dark" : "light"}
          />
        </CostSection>

        {/* ===== 섹션 2: 제품 세금 ===== */}
        <CostSection
          title="제품 세금"
          sectionTotal={taxSectionTotal}
          percentage={getPercentage(taxSectionTotal)}
        >
          <SectionCostRow label="관세" value={tariffTotal} />
          <SectionCostRow label="국외 부가세 (10%)" value={foreignVatTotal} />
        </CostSection>

        {/* ===== 섹션 3: 국제 물류 ===== */}
        <CostSection
          title="국제 물류"
          sectionTotal={internationalSectionTotal}
          percentage={getPercentage(internationalSectionTotal)}
        >
          <SectionCostRow
            label={`국제 운송료 (${result.totalCbm.toFixed(2)} R.TON (CBM) → ${result.roundedCbm.toFixed(1)} R.TON (CBM) 적용)`}
            value={internationalShipping}
            foreignValue={formatUSD(toUSD(internationalShipping))}
          />
          {companyCostsWithoutCustoms.map((item) => (
            <SectionCostRow key={item.itemId} label={item.name} value={item.dividedAmount} />
          ))}
        </CostSection>

        {/* ===== 섹션 4: 국내 통관 및 물류 ===== */}
        <CostSection
          title="국내 통관 및 물류"
          sectionTotal={domesticSectionTotal}
          percentage={getPercentage(domesticSectionTotal)}
        >
          <SectionCostRow label="통관 수수료" value={customsClearanceFee} />
          <SectionCostRow
            label={`국내 운송료 (기본 ${domesticBaseCbm} R.TON (CBM), +${domesticExtraUnit} R.TON (CBM) ₩${formatNumberWithCommas(domesticExtraRate)})`}
            value={domesticShipping}
          />
          <SectionCostRow
            label={`3PL + 배송비 (기본 ${threePLUnit} R.TON (CBM), +${threePLUnit} R.TON (CBM) ₩${formatNumberWithCommas(threePLRate)})`}
            value={threePL}
          />
        </CostSection>

        {/* ===== 섹션 5: 부가세 ===== */}
        <CostSection
          title="부가세"
          sectionTotal={vatSectionTotal}
          percentage={getPercentage(vatSectionTotal)}
        >
          <SectionCostRow label="국내 부가세 (10%)" value={vatSectionTotal} />
        </CostSection>
      </div>
    </div>
  )
}

/**
 * 비용 섹션 컴포넌트 (프로그레스 바 포함)
 */
function CostSection({
  title,
  sectionTotal,
  percentage,
  children,
}: {
  title: string
  sectionTotal: number
  percentage: number
  children: React.ReactNode
}) {
  // 애니메이션을 위한 상태 (0에서 시작)
  const [animatedPercentage, setAnimatedPercentage] = useState(0)

  // 마운트 시 애니메이션 트리거
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage)
    }, 100)
    return () => clearTimeout(timer)
  }, [percentage])

  return (
    <div className="space-y-2">
      {/* 섹션 제목 (버튼 스타일) + 비율 */}
      <div className="flex items-center justify-between">
        <span className="px-2.5 py-1 bg-gray-900 text-white text-xs font-medium rounded">
          {title}
        </span>
        <span className="text-base font-bold text-blue-500">
          {percentage.toFixed(1)}%
        </span>
      </div>

      {/* 프로그레스 바 (애니메이션 적용) */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-[1400ms] ease-out"
          style={{ width: `${Math.min(animatedPercentage, 100)}%` }}
        />
      </div>

      {/* 항목 리스트 */}
      <div className="pl-2 space-y-1">
        {children}
      </div>

      {/* 소계 */}
      <div className="flex items-center justify-end pt-1 border-t border-gray-100">
        <span className="text-xs text-gray-500 mr-2">소계</span>
        <span className="text-sm font-medium text-gray-700">
          {formatNumberWithCommas(sectionTotal)}원
        </span>
      </div>
    </div>
  )
}

/**
 * 섹션 내 비용 행 컴포넌트
 */
function SectionCostRow({
  label,
  value,
  foreignValue,
  badge,
  badgeVariant = "light",
}: {
  label: string
  value: number
  foreignValue?: string
  badge?: string
  badgeVariant?: "dark" | "light"
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{label}</span>
        {badge && (
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
            badgeVariant === "dark"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-700"
          }`}>
            {badge}
          </span>
        )}
      </div>
      <span className="text-sm text-gray-700">
        {formatNumberWithCommas(value)}원
        {foreignValue && (
          <span className="text-xs text-gray-400 ml-1">({foreignValue})</span>
        )}
      </span>
    </div>
  )
}
