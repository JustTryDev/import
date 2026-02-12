"use client"

import { formatNumberWithCommas, formatForeignCurrency } from "@/lib/format"
import { CalculationResult } from "@/types/shipping"
import type {
  InlandConfig,
  DomesticConfig,
  ThreePLConfig,
} from "@/hooks/useCostSettings"

interface CostBreakdownProps {
  result: CalculationResult | null
  currency: "USD" | "CNY"
  exchangeRate?: number | null  // 선택한 통화의 환율
  usdRate?: number | null       // USD 환율 (달러→원화 환산용)
  // 관세 관련
  useFta: boolean               // FTA 적용 여부
  // CBM 관련
  roundedCbm?: number | null    // 적용 CBM (0.5 단위 올림)
  // 비용 설정 (설명 표시용)
  costSettings?: {
    inland?: InlandConfig
    domestic?: DomesticConfig
    threePL?: ThreePLConfig
  }
}

// 비용 항목 행 컴포넌트
function CostRow({
  label,
  amount,
  subLabel,
  isHighlight,
}: {
  label: string
  amount: number
  subLabel?: string
  isHighlight?: boolean
}) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <div>
        <span className={`text-sm ${isHighlight ? "font-medium text-gray-900" : "text-gray-600"}`}>
          {label}
        </span>
        {subLabel && (
          <span className="text-xs text-gray-400 ml-1">{subLabel}</span>
        )}
      </div>
      <span className={`text-sm ${isHighlight ? "font-bold text-gray-900" : "text-gray-700"}`}>
        {formatNumberWithCommas(amount)}원
      </span>
    </div>
  )
}

// 외화+원화 표시 행 컴포넌트 (제품가격, 부대비용용 - 통화 동적 표시)
function CostRowWithForeign({
  label,
  amountKRW,
  amountForeign,
  currency,
  subLabel,
}: {
  label: string
  amountKRW: number
  amountForeign: number
  currency: "USD" | "CNY"
  subLabel?: string
}) {
  const currencySymbol = currency === "USD" ? "$" : "¥"
  return (
    <div className="flex justify-between items-center py-1.5">
      <div>
        <span className="text-sm text-gray-600">{label}</span>
        {subLabel && (
          <span className="text-xs text-gray-400 ml-1">{subLabel}</span>
        )}
      </div>
      <div className="text-right">
        <span className="text-sm text-gray-700">
          {formatNumberWithCommas(amountKRW)}원
        </span>
        <span className="text-xs text-gray-400 ml-1">
          ({currencySymbol}{formatForeignCurrency(amountForeign)})
        </span>
      </div>
    </div>
  )
}

// 달러+원화 표시 행 컴포넌트 (국제운송료, 내륙운송료용)
function CostRowWithUSD({
  label,
  amountUSD,
  amountKRW,
  subLabel,
}: {
  label: string
  amountUSD: number
  amountKRW: number
  subLabel?: string
}) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <div>
        <span className="text-sm text-gray-600">{label}</span>
        {subLabel && (
          <span className="text-xs text-gray-400 ml-1">{subLabel}</span>
        )}
      </div>
      <div className="text-right">
        <span className="text-sm text-gray-700">
          {formatNumberWithCommas(amountKRW)}원
        </span>
        <span className="text-xs text-gray-400 ml-1">
          (${formatForeignCurrency(amountUSD)})
        </span>
      </div>
    </div>
  )
}

// 송금수수료 행 컴포넌트 (결제 방식 표시)
function RemittanceFeeRow({
  amount,
  isWireTransfer,
}: {
  amount: number
  isWireTransfer: boolean
}) {
  const paymentMethod = isWireTransfer ? "T/T 송금" : "카드 결제"

  return (
    <div className="flex justify-between items-center py-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">송금 & 결제 수수료</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
          isWireTransfer
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-700"
        }`}>
          {paymentMethod}
        </span>
      </div>
      <span className="text-sm text-gray-700">
        {formatNumberWithCommas(amount)}원
      </span>
    </div>
  )
}

// 구분선 컴포넌트
function Divider() {
  return <div className="border-t border-gray-100 my-2" />
}

// 관세 비교 행 컴포넌트 (FTA 선택 시 기본 관세와 비교)
function TariffComparisonRow({
  useFta,
  basicTariffAmount,
  ftaTariffAmount,
  basicTariffRate,
  ftaTariffRate,
}: {
  useFta: boolean
  basicTariffAmount: number
  ftaTariffAmount: number
  basicTariffRate: number
  ftaTariffRate: number
}) {
  // FTA 선택 시: 기본 관세 → FTA 관세 비교 표시
  if (useFta) {
    const savings = basicTariffAmount - ftaTariffAmount
    return (
      <div className="flex justify-between items-center py-1.5">
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-600">한-중 FTA 관세</span>
          <span className="text-xs text-gray-400">({ftaTariffRate}%)</span>
        </div>
        <div className="text-right flex items-center gap-2">
          {/* 기본 관세 (취소선) */}
          <span className="text-xs text-gray-400 line-through">
            {formatNumberWithCommas(basicTariffAmount)}원
          </span>
          <span className="text-gray-400">→</span>
          {/* FTA 관세 */}
          <span className="text-sm text-primary font-medium">
            {formatNumberWithCommas(ftaTariffAmount)}원
          </span>
          {/* 절감액 표시 */}
          {savings > 0 && (
            <span className="text-xs text-green-600 font-medium">
              (-{formatNumberWithCommas(savings)}원)
            </span>
          )}
        </div>
      </div>
    )
  }

  // 기본 관세 선택 시: 단순 표시
  return (
    <div className="flex justify-between items-center py-1.5">
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-600">기본 관세</span>
        <span className="text-xs text-gray-400">({basicTariffRate}%)</span>
      </div>
      <span className="text-sm text-gray-700">
        {formatNumberWithCommas(basicTariffAmount)}원
      </span>
    </div>
  )
}

// 비용 상세 내역 컴포넌트
export function CostBreakdown({
  result,
  currency,
  exchangeRate,
  usdRate,
  useFta,
  roundedCbm,
  costSettings,
}: CostBreakdownProps) {
  if (!result) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">상세 내역</h3>
        <p className="text-sm text-gray-400">
          입력 정보를 완성하면 비용이 계산됩니다.
        </p>
      </div>
    )
  }

  const { breakdown, additionalCostsDetail, companyCostsDetail, remittanceFeeBase } = result

  // 송금 수수료 기준 (100만원 이상이면 T/T 송금)
  const isWireTransfer = remittanceFeeBase >= 1_000_000

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">상세 내역</h3>

      <div className="space-y-0.5">
        {/* 제품가격 (원래 통화 표시) */}
        {exchangeRate ? (
          <CostRowWithForeign
            label="총 제품 가격"
            amountKRW={breakdown.productCost}
            amountForeign={result.totalPriceForeign}
            currency={currency}
          />
        ) : (
          <CostRow label="총 제품 가격" amount={breakdown.productCost} />
        )}

        {/* 부대비용 (공장 통화별 표시) */}
        {additionalCostsDetail.length > 0 && (
          <>
            {additionalCostsDetail.map((item) => (
              <CostRowWithForeign
                key={item.id}
                label={item.name}
                amountKRW={item.amount}
                amountForeign={item.amountForeign}
                currency={item.currency}
              />
            ))}
          </>
        )}
        {breakdown.additionalCosts > 0 && additionalCostsDetail.length === 0 && (
          <CostRow label="부대비용" amount={breakdown.additionalCosts} />
        )}

        {/* 내륙 운송료 (중국 공장→항구, USD 표시) */}
        {breakdown.inlandShipping > 0 && (
          <CostRowWithUSD
            label="내륙 운송료"
            amountUSD={result.inlandShippingUSD}
            amountKRW={result.inlandShippingKRW}
            subLabel={`(1CBM당 $${costSettings?.inland?.ratePerCbm ?? 70})`}
          />
        )}

        {/* 관세 (FTA 선택 시 기본 관세와 비교 표시) */}
        <TariffComparisonRow
          useFta={useFta}
          basicTariffAmount={result.basicTariffAmount}
          ftaTariffAmount={result.ftaTariffAmount}
          basicTariffRate={result.basicTariffRate}
          ftaTariffRate={result.ftaTariffRate}
        />

        <Divider />

        {/* 송금수수료 (결제 방식 표시) */}
        <RemittanceFeeRow
          amount={breakdown.remittanceFee}
          isWireTransfer={isWireTransfer}
        />

        {/* 국제운송료 */}
        <CostRowWithUSD
          label="국제 운송료"
          amountUSD={result.internationalShippingUSD}
          amountKRW={result.internationalShippingKRW}
          subLabel={roundedCbm ? `(${roundedCbm.toFixed(1)}CBM)` : undefined}
        />

        {/* 업체별 공통비용 */}
        {companyCostsDetail.length > 0 && (
          <>
            {companyCostsDetail.map((item) => (
              <CostRow
                key={item.itemId}
                label={item.name}
                amount={item.dividedAmount}
                subLabel={item.orderCount > 1 ? `(÷${item.orderCount})` : undefined}
              />
            ))}
          </>
        )}

        <Divider />

        {/* 국내운송료 */}
        <CostRow
          label="국내 운송료"
          amount={breakdown.domesticShipping}
          subLabel={`(${costSettings?.domestic?.baseCbm ?? 0.5}CBM ${(costSettings?.domestic?.baseFee ?? 50000).toLocaleString()}원, ${costSettings?.domestic?.extraUnit ?? 0.1}CBM당 ${(costSettings?.domestic?.extraRate ?? 10000).toLocaleString()}원)`}
        />

        {/* 3PL 비용 + 배송비 */}
        <CostRow
          label="3PL 비용 + 배송비"
          amount={breakdown.threePLCost}
          subLabel={`(${costSettings?.threePL?.unit ?? 0.1}CBM당 ${(costSettings?.threePL?.ratePerUnit ?? 15000).toLocaleString()}원)`}
        />
      </div>
    </div>
  )
}
