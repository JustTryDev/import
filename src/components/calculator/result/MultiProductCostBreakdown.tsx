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
  AlertTriangle,
  Star,
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
  ContainerOptionSummary,
} from "@/types/shipping"
import type { FactorySlot } from "../input/AdditionalCostInput"
import type {
  InlandShippingConfig,
  DomesticShippingConfig,
  ThreePLCostConfig,
} from "@/lib/calculations"
import type {
  ContainerConfig,
  ContainerType,
  DeliveryMethod,
} from "@/lib/calculations/container"

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

  // 컨테이너(FCL) 모드 props
  containerMode?: boolean
  onContainerModeChange?: (mode: boolean) => void
  deliveryMethod?: DeliveryMethod
  onDeliveryMethodChange?: (method: DeliveryMethod) => void
  containerConfig?: ContainerConfig
  onContainerConfigChange?: (overrides: Partial<
    Record<ContainerType, Partial<ContainerConfig[ContainerType]>>
  >) => void
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
  containerMode = false,
  onContainerModeChange,
  deliveryMethod = "via3PL",
  onDeliveryMethodChange,
  containerConfig,
  onContainerConfigChange,
}: MultiProductCostBreakdownProps) {
  // 제품별 상세 펼침/접힘 상태
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  // 제품별 마진율 상태 (기본값: 50% = 내부값 150)
  const [marginRates, setMarginRates] = useState<Map<string, number>>(new Map())

  // 컨테이너 다른 옵션 비교 펼침/접힘
  const [showAllContainerOptions, setShowAllContainerOptions] = useState(false)

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

  // 컨테이너 비교 데이터
  const containerComparison = result.containerComparison

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
                          value={String(marginRates.get(productResult.productId) ?? 150)}
                          onValueChange={(value) => {
                            setMarginRates(prev => {
                              const next = new Map(prev)
                              next.set(productResult.productId, Number(value))
                              return next
                            })
                          }}
                        >
                          <SelectTrigger className="h-6 w-[80px] text-xs">
                            <SelectValue placeholder="50%">
                              {(marginRates.get(productResult.productId) ?? 150) - 100}%
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent position="popper" sideOffset={4} className="max-h-[400px] overflow-y-auto">
                            {[110, 120, 130, 140, 150, 160, 170, 180, 190, 200].map(rate => (
                              <SelectItem key={rate} value={String(rate)}>{rate - 100}%</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-gray-400">=</span>
                        <span className="text-sm font-bold text-green-600">
                          {formatNumberWithCommas(Math.round(productResult.unitCost * (marginRates.get(productResult.productId) ?? 150) / 100))}원
                        </span>
                      </div>
                      {/* 시장 평균가 vs 판매가 프로그레스 바 비교 */}
                      {product && (() => {
                        // 마진 적용 판매가
                        const sellingPrice = Math.round(
                          productResult.unitCost * (marginRates.get(productResult.productId) ?? 150) / 100
                        )
                        // 시장 평균가: 제품 단가(외화) × 2 × 환율
                        const rate = product.currency === "USD" ? (usdRate ?? 0) : (cnyRate ?? 0)
                        const marketAvgPrice = Math.round(product.unitPrice * 2 * rate)
                        // 바의 100% 기준 = 둘 중 큰 값의 120% (여유 공간)
                        const maxPrice = Math.max(sellingPrice, marketAvgPrice) * 1.2
                        // 판매가가 평균가 이상이면 초록(유리), 미만이면 빨강(불리)
                        const isAboveAvg = sellingPrice >= marketAvgPrice
                        const sellingBarWidth = maxPrice > 0 ? (sellingPrice / maxPrice) * 100 : 0
                        const avgMarkerPos = maxPrice > 0 ? (marketAvgPrice / maxPrice) * 100 : 0

                        return (
                          <div className="mt-1 w-full min-w-[180px]">
                            {/* 프로그레스 바 */}
                            <div className="relative h-4 bg-gray-100 rounded-full overflow-visible">
                              {/* 판매가 채움 바 */}
                              <div
                                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                                  isAboveAvg ? "bg-green-400" : "bg-red-400"
                                }`}
                                style={{ width: `${Math.min(sellingBarWidth, 100)}%` }}
                              />
                              {/* 평균가 마커 (세로 점선) */}
                              <div
                                className="absolute top-0 h-full flex flex-col items-center"
                                style={{ left: `${Math.min(avgMarkerPos, 100)}%` }}
                              >
                                <div className="w-0.5 h-full bg-amber-500 border-l border-dashed border-amber-500" />
                              </div>
                            </div>
                            {/* 라벨 */}
                            <div className="flex justify-between mt-0.5">
                              <span className={`text-[10px] font-semibold ${isAboveAvg ? "text-green-600" : "text-red-600"}`}>
                                판매 {formatNumberWithCommas(sellingPrice)}원
                              </span>
                              <span className="text-[10px] font-semibold text-amber-600">
                                평균 {formatNumberWithCommas(marketAvgPrice)}원
                              </span>
                            </div>
                          </div>
                        )
                      })()}
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

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>

      {/* LCL/FCL 운송 모드 탭 (총 비용 내역 바로 위) */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
          <button
            onClick={() => onContainerModeChange?.(false)}
            className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
              !containerMode
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            LCL
          </button>
          <button
            onClick={() => onContainerModeChange?.(true)}
            className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
              containerMode
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            FCL
          </button>
        </div>
      </div>

      {/* 총 비용 내역 (프로그레스 스택) */}
      <TotalCostBreakdown
        result={result}
        products={products}
        marginRates={marginRates}
        usdRate={usdRate}
        cnyRate={cnyRate}
        costSettings={costSettings}
        orderCount={orderCount}
        containerMode={containerMode}
        containerComparison={containerComparison ?? undefined}
        deliveryMethod={deliveryMethod}
        onDeliveryMethodChange={onDeliveryMethodChange}
        showAllContainerOptions={showAllContainerOptions}
        onToggleContainerOptions={() => setShowAllContainerOptions(!showAllContainerOptions)}
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
  products,
  marginRates,
  usdRate,
  cnyRate,
  costSettings,
  orderCount = 1,
  containerMode = false,
  containerComparison,
  deliveryMethod = "via3PL",
  onDeliveryMethodChange,
  showAllContainerOptions = false,
  onToggleContainerOptions,
}: {
  result: MultiProductCalculationResult
  products: Product[]
  marginRates: Map<string, number>
  usdRate: number | null
  cnyRate: number | null
  costSettings?: {
    inland?: InlandShippingConfig
    domestic?: DomesticShippingConfig
    threePL?: ThreePLCostConfig
  }
  orderCount?: number
  containerMode?: boolean
  containerComparison?: {
    isContainerMode: boolean
    selectedOption: ContainerOptionSummary
    allOptions: ContainerOptionSummary[]
    lclTotalShipping: number
    fclTotalShipping: number
    savings: number
    savingsPercent: number
    deliveryMethod: "direct" | "via3PL"
  }
  deliveryMethod?: DeliveryMethod
  onDeliveryMethodChange?: (method: DeliveryMethod) => void
  showAllContainerOptions?: boolean
  onToggleContainerOptions?: () => void
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

  // 2. 세금 섹션 (관세)
  const tariffTotal = result.breakdown.tariff
  const taxSectionTotal = tariffTotal

  // 3. 국제 물류 섹션 (송금 수수료 제외)
  const internationalShipping = result.sharedCostsTotal.internationalShipping
  // 통관 수수료를 제외한 업체 공통 비용 (D/O, C/O 등)
  const companyCostsWithoutCustoms = result.companyCostsDetail?.filter(
    item => !item.name.includes('통관')
  ) || []
  const companyCostsWithoutCustomsTotal = companyCostsWithoutCustoms.reduce(
    (sum, item) => sum + item.dividedAmount, 0
  )

  // 📌 오버플로우 여부: FCL에서 컨테이너에 다 안 들어가면 나머지를 LCL로 보냄
  //    이 경우 통관이 2번 발생 → D/O, C/O, 통관 수수료가 한 번씩 추가
  const hasOverflow = !!(containerMode && containerComparison?.selectedOption.hasOverflow)

  // FCL 모드: 국제 물류 = 국제운송 + 내륙운송 + D/O, C/O (국내운송/3PL은 하단 섹션)
  // 오버플로우 시: D/O, C/O가 2회 발생 (컨테이너 1회 + LCL 1회)
  // LCL 모드: 기존 국제 운송료 + D/O, C/O
  const fclInternationalOnly = containerComparison
    ? (containerComparison.selectedOption.containerShippingCost + containerComparison.selectedOption.containerInlandCost)
    : 0
  const companyCostsMultiplier = hasOverflow ? 2 : 1
  const internationalSectionTotal = containerMode && containerComparison
    ? fclInternationalOnly + companyCostsWithoutCustomsTotal * companyCostsMultiplier
    : internationalShipping + companyCostsWithoutCustomsTotal

  // 4. 국내 통관 및 물류 섹션
  // 통관 수수료 (오버플로우 시 2회 발생)
  const customsClearanceItem = result.companyCostsDetail?.find(item => item.name.includes('통관'))
  const customsClearanceFee = customsClearanceItem?.dividedAmount || 0
  const customsClearanceMultiplier = hasOverflow ? 2 : 1
  const domesticShipping = result.sharedCostsTotal.domesticShipping
  const threePL = result.sharedCostsTotal.threePL
  const domesticSectionTotal = customsClearanceFee * customsClearanceMultiplier + domesticShipping + threePL

  // 총 비용 (오버플로우 시 추가 통관 비용 반영)
  // 📌 비유: 택배를 2번 보내면 택배비뿐 아니라 접수비(통관)도 2번 내야 하는 것
  const overflowExtraCosts = hasOverflow
    ? companyCostsWithoutCustomsTotal + customsClearanceFee
    : 0
  const totalCost = result.totalCost + overflowExtraCosts

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
      {/* 헤더: 타이틀 */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <Receipt className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">총 비용 내역</span>
      </div>
      {/* 3열 요약: 총 매출 / 총 비용 / 예상 수익 */}
      {(() => {
        const totalRevenue = result.products.reduce((sum, pr) => {
          const product = products.find(p => p.id === pr.productId)
          if (!product) return sum
          const marginRate = marginRates.get(pr.productId) ?? 150
          const sellingPrice = Math.round(pr.unitCost * marginRate / 100)
          return sum + sellingPrice * product.quantity
        }, 0)
        const totalProfit = totalRevenue - totalCost
        const isProfit = totalProfit >= 0

        return (
          <div className="flex items-center border-b border-gray-100">
            {/* 총 매출 */}
            <div className="flex-1 px-4 py-3 text-center">
              <div className="text-[10px] text-gray-400 mb-0.5">총 매출</div>
              <div className="text-sm font-bold text-primary">
                {formatNumberWithCommas(totalRevenue)}원
              </div>
            </div>
            <span className="text-gray-300 font-bold text-lg">-</span>
            {/* 총 비용 */}
            <div className="flex-1 px-4 py-3 text-center">
              <div className="text-[10px] text-gray-400 mb-0.5">총 비용</div>
              <div className="text-sm font-bold text-primary">
                {formatNumberWithCommas(totalCost)}원
              </div>
            </div>
            {/* 예상 수익 */}
            <div className={`flex-1 px-4 py-3 text-center rounded-br-none ${isProfit ? "bg-green-50" : "bg-red-50"}`}>
              <div className="text-[10px] text-gray-400 mb-0.5">예상 수익</div>
              <div className={`text-sm font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>
                {isProfit ? "+" : ""}{formatNumberWithCommas(totalProfit)}원
              </div>
            </div>
          </div>
        )
      })()}

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
        </CostSection>

        {/* ===== 섹션 3: 국제 물류 ===== */}
        <CostSection
          title="국제 물류"
          sectionTotal={internationalSectionTotal}
          percentage={getPercentage(internationalSectionTotal)}
        >
          {containerMode && containerComparison ? (
            <>
              {/* FCL 모드: 컨테이너 추천 + 비용 상세 */}
              <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-100 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs font-semibold text-blue-700">
                    추천: {containerComparison.selectedOption.label}
                  </span>
                  {containerComparison.selectedOption.hasOverflow && (
                    <span className="text-[10px] text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded">
                      + LCL {containerComparison.selectedOption.overflowCbm.toFixed(1)} CBM
                    </span>
                  )}
                  {containerComparison.selectedOption.weightWarning && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      중량 초과
                    </span>
                  )}
                </div>

                {/* 비용 내역 */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>국제 운송 (컨테이너)</span>
                    <span className="font-medium">{formatNumberWithCommas(containerComparison.selectedOption.containerShippingCost)}원</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>내륙 운송 (컨테이너)</span>
                    <span className="font-medium">{formatNumberWithCommas(containerComparison.selectedOption.containerInlandCost)}원</span>
                  </div>
                  {/* 국내 운송, 3PL 비용은 "국내 통관 및 물류" 섹션에서 표시 */}

                  {/* 오버플로우 LCL 비용 (컨테이너에 안 들어간 나머지) */}
                  {containerComparison.selectedOption.hasOverflow && (
                    <>
                      <div className="border-t border-blue-200 my-1" />
                      <div className="text-blue-600 font-medium text-[10px]">
                        + LCL 오버플로우 ({containerComparison.selectedOption.overflowCbm.toFixed(1)} CBM)
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>국제 운송 (LCL)</span>
                        <span>{formatNumberWithCommas(containerComparison.selectedOption.overflowShippingCost)}원</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>내륙 운송 (LCL)</span>
                        <span>{formatNumberWithCommas(containerComparison.selectedOption.overflowInlandCost)}원</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>국내 운송료 (LCL)</span>
                        <span>{formatNumberWithCommas(containerComparison.selectedOption.overflowDomesticCost)}원</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>3PL + 배송비 (LCL)</span>
                        <span>{formatNumberWithCommas(containerComparison.selectedOption.overflowThreePLCost)}원</span>
                      </div>
                    </>
                  )}
                </div>

                {/* 적재율 */}
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>적재율</span>
                    <span>{Math.round(containerComparison.selectedOption.loadRatio * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, containerComparison.selectedOption.loadRatio * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 다른 옵션 비교 (접힘/펼침) */}
              {containerComparison.allOptions.length > 1 && (
                <div className="mb-2">
                  <button
                    onClick={onToggleContainerOptions}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showAllContainerOptions ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    다른 옵션 비교 ({containerComparison.allOptions.length}개)
                  </button>

                  <AnimatePresence>
                    {showAllContainerOptions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-1.5 space-y-1">
                          {containerComparison.allOptions.map((option) => (
                            <div
                              key={`${option.type}-${option.count}`}
                              className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-md ${
                                option.isRecommended
                                  ? "bg-blue-50 border border-blue-100"
                                  : "bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                {option.isRecommended && (
                                  <Star className="h-3 w-3 text-blue-500 fill-blue-500" />
                                )}
                                <span className={option.isRecommended ? "font-medium text-blue-700" : "text-gray-600"}>
                                  {option.label}
                                </span>
                                {option.hasOverflow && (
                                  <span className="text-[10px] text-gray-400">
                                    +LCL {option.overflowCbm.toFixed(1)}
                                  </span>
                                )}
                                {option.weightWarning && (
                                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {formatNumberWithCommas(option.totalShippingCost)}원
                                </span>
                                <span className={`text-[10px] ${
                                  containerComparison.lclTotalShipping - option.totalShippingCost > 0
                                    ? "text-green-600"
                                    : "text-red-500"
                                }`}>
                                  {containerComparison.lclTotalShipping - option.totalShippingCost > 0 ? "-" : "+"}
                                  {formatNumberWithCommas(Math.abs(containerComparison.lclTotalShipping - option.totalShippingCost))}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </>
          ) : (
            // LCL 모드: 기존 국제 운송료 표시
            <SectionCostRow
              label={`국제 운송료 (${result.totalCbm.toFixed(2)} R.TON (CBM) → ${result.roundedCbm.toFixed(1)} R.TON (CBM) 적용)`}
              value={internationalShipping}
              foreignValue={formatUSD(toUSD(internationalShipping))}
            />
          )}
          {companyCostsWithoutCustoms.map((item) => (
            <SectionCostRow
              key={item.itemId}
              label={hasOverflow ? `${item.name} (×2)` : item.name}
              value={hasOverflow ? item.dividedAmount * 2 : item.dividedAmount}
            />
          ))}
        </CostSection>

        {/* ===== 섹션 4: 국내 통관 및 물류 ===== */}
        <CostSection
          title="국내 통관 및 물류"
          sectionTotal={domesticSectionTotal}
          percentage={getPercentage(domesticSectionTotal)}
        >
          <SectionCostRow
            label={hasOverflow ? "통관 수수료 (×2)" : "통관 수수료"}
            value={hasOverflow ? customsClearanceFee * 2 : customsClearanceFee}
          />

          {/* FCL 모드: 배송 방식 토글 */}
          {containerMode && (
            <div className="flex items-center gap-2 py-1">
              <div className="inline-flex items-center bg-gray-100 rounded-full p-0.5">
                <button
                  onClick={() => onDeliveryMethodChange?.("direct")}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                    deliveryMethod === "direct"
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  직배송
                </button>
                <button
                  onClick={() => onDeliveryMethodChange?.("via3PL")}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                    deliveryMethod === "via3PL"
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  3PL 경유
                </button>
              </div>
            </div>
          )}

          <SectionCostRow
            label={containerMode
              ? "국내 운송료 (컨테이너)"
              : `국내 운송료 (기본 ${domesticBaseCbm} R.TON (CBM), +${domesticExtraUnit} R.TON (CBM) ₩${formatNumberWithCommas(domesticExtraRate)})`
            }
            value={domesticShipping}
          />
          {/* FCL 직배송이면 3PL 비용 숨김, 그 외에는 항상 표시 */}
          {!(containerMode && deliveryMethod === "direct") && (
            <SectionCostRow
              label={`3PL + 배송비 (기본 ${threePLUnit} R.TON (CBM), +${threePLUnit} R.TON (CBM) ₩${formatNumberWithCommas(threePLRate)})`}
              value={threePL}
            />
          )}
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
