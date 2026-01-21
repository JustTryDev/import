"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Check, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { DailyRate } from "@/types/exchange"

interface ExchangeRateDisplayProps {
  usdRate: number | null
  cnyRate: number | null
  selectedCurrency?: "USD" | "CNY"  // 선택적 (호환성 유지)
  updatedAt: string | null
  history: DailyRate[]
  onRefresh?: () => void
  isLoading?: boolean
  onCurrencyChange?: (currency: "USD" | "CNY") => void  // 선택적 (호환성 유지)
}

// 환율 표시 컴포넌트
export function ExchangeRateDisplay({
  usdRate,
  cnyRate,
  selectedCurrency,
  updatedAt,
  history,
  onRefresh,
  isLoading,
  onCurrencyChange,
}: ExchangeRateDisplayProps) {
  // 테이블 펼침/접힘 상태 (기본: 펼침 → 2초 후 자동 접힘)
  const [isExpanded, setIsExpanded] = useState(true)
  const [hasAutoCollapsed, setHasAutoCollapsed] = useState(false)

  // 페이지 로드 후 2초 뒤 자동 접힘 (1회만)
  useEffect(() => {
    if (!hasAutoCollapsed && history.length > 0) {
      const timer = setTimeout(() => {
        setIsExpanded(false)
        setHasAutoCollapsed(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [history.length, hasAutoCollapsed])

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-600 flex-wrap">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">오늘의 환율</span>
          {updatedAt && (
            <span className="text-xs text-gray-400">
              ({updatedAt} 기준)
            </span>
          )}
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-7 px-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-3">
        * 네이버 실시간 환율 API(실패 시 한국수출입은행 환율 API 폴백)
      </p>

      {isLoading || !usdRate || !cnyRate ? (
        <div className="text-sm text-gray-400">환율 정보 로딩 중...</div>
      ) : (
        <>
          {/* 전날 환율과 비교하여 등락폭 계산 */}
          {(() => {
            // history[0]: 오늘, history[1]: 어제
            const yesterdayRate = history.length > 1 ? history[1] : null

            // USD 등락폭 계산
            const usdChange = yesterdayRate
              ? ((usdRate - yesterdayRate.usdRate) / yesterdayRate.usdRate) * 100
              : 0

            // CNY 등락폭 계산
            const cnyChange = yesterdayRate
              ? ((cnyRate - yesterdayRate.cnyRate) / yesterdayRate.cnyRate) * 100
              : 0

            // 등락폭 표시 컴포넌트
            const ChangeIndicator = ({ change }: { change: number }) => {
              if (Math.abs(change) < 0.01) {
                // 변동 없음
                return (
                  <span className="flex items-center gap-0.5 text-xs text-gray-400">
                    <Minus className="h-3 w-3" />
                    0.00%
                  </span>
                )
              } else if (change > 0) {
                // 상승 (원화 약세 = 빨간색)
                return (
                  <span className="flex items-center gap-0.5 text-xs text-red-500">
                    <TrendingUp className="h-3 w-3" />
                    +{change.toFixed(2)}%
                  </span>
                )
              } else {
                // 하락 (원화 강세 = 파란색)
                return (
                  <span className="flex items-center gap-0.5 text-xs text-blue-500">
                    <TrendingDown className="h-3 w-3" />
                    {change.toFixed(2)}%
                  </span>
                )
              }
            }

            return (
              <>
                {/* 오늘의 환율 카드 */}
                <div className="grid grid-cols-2 gap-3">
                  {/* USD 환율 */}
                  {onCurrencyChange ? (
                    // 선택 모드 (기존 호환성)
                    <button
                      type="button"
                      onClick={() => onCurrencyChange("USD")}
                      className={`relative rounded-lg p-3 text-left transition-all ${
                        selectedCurrency === "USD"
                          ? "bg-primary/10 border-2 border-primary"
                          : "bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">USD (달러)</span>
                        {yesterdayRate && <ChangeIndicator change={usdChange} />}
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {usdRate.toFixed(1)}
                        <span className="text-sm font-normal text-gray-500">원</span>
                      </div>
                      {selectedCurrency === "USD" && (
                        <div className="absolute top-2 right-2 bg-primary rounded-full p-0.5">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  ) : (
                    // 표시 모드 (다중 제품용)
                    <div className="rounded-lg p-3 bg-white border border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">USD (달러)</span>
                        {yesterdayRate && <ChangeIndicator change={usdChange} />}
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {usdRate.toFixed(1)}
                        <span className="text-sm font-normal text-gray-500">원</span>
                      </div>
                    </div>
                  )}

                  {/* CNY 환율 */}
                  {onCurrencyChange ? (
                    // 선택 모드 (기존 호환성)
                    <button
                      type="button"
                      onClick={() => onCurrencyChange("CNY")}
                      className={`relative rounded-lg p-3 text-left transition-all ${
                        selectedCurrency === "CNY"
                          ? "bg-primary/10 border-2 border-primary"
                          : "bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">CNY (위안)</span>
                        {yesterdayRate && <ChangeIndicator change={cnyChange} />}
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {cnyRate.toFixed(1)}
                        <span className="text-sm font-normal text-gray-500">원</span>
                      </div>
                      {selectedCurrency === "CNY" && (
                        <div className="absolute top-2 right-2 bg-primary rounded-full p-0.5">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  ) : (
                    // 표시 모드 (다중 제품용)
                    <div className="rounded-lg p-3 bg-white border border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">CNY (위안)</span>
                        {yesterdayRate && <ChangeIndicator change={cnyChange} />}
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {cnyRate.toFixed(1)}
                        <span className="text-sm font-normal text-gray-500">원</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )
          })()}

          {/* 최근 5일 환율 (접기/펼치기) */}
          {history.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <span className="text-sm font-medium text-gray-700">
                  최근 5일 환율
                </span>
                <div className="flex items-center gap-1 text-primary">
                  <span className="text-xs font-medium">
                    {isExpanded ? "접기" : "펼치기"}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>

              {/* 테이블 (펼친 상태에서만 표시, 애니메이션 적용) */}
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
                    <div className="mt-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-600 font-medium">날짜</th>
                            <th className="px-3 py-2 text-right text-gray-600 font-medium">USD</th>
                            <th className="px-3 py-2 text-right text-gray-600 font-medium">CNY</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((item, index) => (
                            <tr
                              key={item.date}
                              className={index === 0 ? "bg-blue-50" : ""}
                            >
                              <td className="px-3 py-2 text-gray-700">
                                {item.date}
                                {index === 0 && (
                                  <span className="ml-1 text-blue-500 text-[10px]">(최신)</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-900">
                                {item.usdRate.toFixed(1)}원
                              </td>
                              <td className="px-3 py-2 text-right text-gray-900">
                                {item.cnyRate.toFixed(1)}원
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  )
}
