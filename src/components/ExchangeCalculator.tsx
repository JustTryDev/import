/**
 * 환율 계산기 컴포넌트 (토스 스타일)
 *
 * 📌 이 컴포넌트의 역할:
 * - 현재 환율 표시 (USD, CNY)
 * - 통화 선택 및 금액 입력
 * - 실시간 원화 환산 결과 표시
 *
 * 📌 토스 스타일 특징:
 * - 넓은 여백과 큰 글자
 * - 미니멀한 디자인
 * - 명확한 시각적 위계
 */

"use client"

import { useState, useMemo, useCallback } from "react"
import { RefreshCw, ChevronDown } from "lucide-react"
import { useExchangeRate } from "@/hooks"
import type { CurrencyCode } from "@/types/exchange"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

// 통화 정보
const CURRENCY_INFO: Record<CurrencyCode, { flag: string; name: string; symbol: string }> = {
  USD: { flag: "🇺🇸", name: "미국 달러", symbol: "$" },
  CNY: { flag: "🇨🇳", name: "중국 위안", symbol: "¥" },
}

/**
 * 숫자를 천 단위 콤마가 포함된 문자열로 변환
 * @example formatNumber(1234567) → "1,234,567"
 */
function formatNumber(num: number): string {
  return num.toLocaleString("ko-KR")
}

/**
 * 문자열에서 숫자만 추출
 * @example parseNumber("1,234,567") → 1234567
 */
function parseNumber(str: string): number {
  const cleaned = str.replace(/[^\d.]/g, "")
  return parseFloat(cleaned) || 0
}

export function ExchangeCalculator() {
  // ==================== 상태 관리 ====================

  // 선택된 통화
  const [currency, setCurrency] = useState<CurrencyCode>("USD")

  // 입력된 금액 (표시용 문자열)
  const [displayAmount, setDisplayAmount] = useState<string>("")

  // 통화 선택 드롭다운 열림 상태
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // 환율 데이터
  const { rates, isLoading, error, refetch } = useExchangeRate()

  // ==================== 계산 로직 ====================

  // 실제 숫자 금액
  const numericAmount = useMemo(() => parseNumber(displayAmount), [displayAmount])

  // 환산된 원화 금액
  const convertedAmount = useMemo(() => {
    if (!rates || numericAmount === 0) return 0
    const rate = rates[currency].baseRate
    return Math.round(numericAmount * rate)
  }, [rates, currency, numericAmount])

  // ==================== 이벤트 핸들러 ====================

  /**
   * 금액 입력 처리 (천 단위 콤마 자동 적용)
   */
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    // 숫자와 소수점만 추출
    const cleaned = value.replace(/[^\d.]/g, "")

    // 빈 값이면 초기화
    if (!cleaned) {
      setDisplayAmount("")
      return
    }

    // 소수점 처리 (하나만 허용)
    const parts = cleaned.split(".")
    let formatted = parts[0]

    // 정수 부분에 천 단위 콤마 추가
    const integerPart = parseInt(parts[0], 10)
    if (!isNaN(integerPart)) {
      formatted = formatNumber(integerPart)
    }

    // 소수점 이하가 있으면 추가 (소수점 2자리까지)
    if (parts.length > 1) {
      formatted += "." + parts[1].slice(0, 2)
    }

    setDisplayAmount(formatted)
  }, [])

  /**
   * 통화 선택
   */
  const handleCurrencySelect = useCallback((code: CurrencyCode) => {
    setCurrency(code)
    setIsDropdownOpen(false)
  }, [])

  // ==================== 렌더링 ====================

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      {/* 메인 카드 */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">환율 계산</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {rates?.USD.updatedAt ? `${rates.USD.updatedAt} 기준` : "로딩 중..."}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={refetch}
              disabled={isLoading}
              className="h-10 w-10 rounded-full hover:bg-gray-100"
              aria-label="환율 새로고침"
            >
              <RefreshCw className={`h-5 w-5 text-gray-500 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mx-6 mb-4 p-4 bg-red-50 rounded-2xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 현재 환율 카드 */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 gap-3">
            {isLoading ? (
              <>
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </>
            ) : rates ? (
              (["USD", "CNY"] as CurrencyCode[]).map((code) => (
                <button
                  key={code}
                  onClick={() => setCurrency(code)}
                  className={`p-4 rounded-2xl text-left transition-all ${
                    currency === code
                      ? "bg-primary/10 ring-2 ring-primary"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{CURRENCY_INFO[code].flag}</span>
                    <span className="font-medium text-gray-700">{code}</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatNumber(rates[code].baseRate)}
                    <span className="text-sm font-normal text-gray-500 ml-1">원</span>
                  </div>
                </button>
              ))
            ) : null}
          </div>
        </div>

        {/* 구분선 */}
        <div className="h-2 bg-gray-50" />

        {/* 금액 입력 영역 */}
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-500 mb-3">
            얼마를 환전할까요?
          </label>

          {/* 입력 필드 */}
          <div className="flex items-center gap-3 mb-6">
            {/* 통화 선택 버튼 */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <span className="text-lg">{CURRENCY_INFO[currency].flag}</span>
                <span className="font-semibold text-gray-900">{currency}</span>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* 드롭다운 메뉴 */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10">
                  {(["USD", "CNY"] as CurrencyCode[]).map((code) => (
                    <button
                      key={code}
                      onClick={() => handleCurrencySelect(code)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                        currency === code ? "bg-primary/5" : ""
                      }`}
                    >
                      <span className="text-lg">{CURRENCY_INFO[code].flag}</span>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">{code}</div>
                        <div className="text-xs text-gray-500">{CURRENCY_INFO[code].name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 금액 입력 */}
            <div className="flex-1 relative">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={displayAmount}
                onChange={handleAmountChange}
                className="w-full text-right text-3xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-300"
              />
            </div>
          </div>

          {/* 환산 결과 */}
          <div className="bg-gray-50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">환산 결과</span>
              <span className="text-sm text-gray-500">🇰🇷 KRW</span>
            </div>

            {numericAmount > 0 ? (
              <div className="text-right">
                <span className="text-4xl font-bold text-primary">
                  {formatNumber(convertedAmount)}
                </span>
                <span className="text-xl text-gray-500 ml-1">원</span>
              </div>
            ) : (
              <div className="text-right">
                <span className="text-4xl font-bold text-gray-300">0</span>
                <span className="text-xl text-gray-300 ml-1">원</span>
              </div>
            )}

            {/* 환율 정보 */}
            {rates && numericAmount > 0 && (
              <p className="text-xs text-gray-400 text-right mt-3">
                1 {currency} = {formatNumber(rates[currency].baseRate)} 원
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 하단 정보 */}
      <p className="text-center text-xs text-gray-400 mt-4">
        한국수출입은행 제공 환율 기준
      </p>
    </div>
  )
}
