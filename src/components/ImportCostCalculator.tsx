/**
 * 통합 수입원가 계산기 컴포넌트
 *
 * 📌 이 컴포넌트의 역할:
 * - HS Code 검색 및 선택
 * - CNY(위안) 금액 입력
 * - 환율 변환 + 관세 + 부가세 자동 계산
 * - FTA vs 기본세율 비교
 *
 * 📌 수입원가 계산 공식:
 * 1. 제품가격(원화) = 제품가격(위안) × 환율
 * 2. 관세 = 제품가격(원화) × 관세율
 * 3. 과세가격 = 제품가격(원화) + 관세
 * 4. 부가세 = 과세가격 × 10%
 * 5. 총 수입원가 = 과세가격 + 부가세
 */

"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { Search, X, RefreshCw, Info, Check } from "lucide-react"
import { useExchangeRate, useTariffSearch } from "@/hooks"
import type { HsCodeWithTariff, ImportCostResult } from "@/types/tariff"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

// 부가세율 (한국 기준 10%)
const VAT_RATE = 10

/**
 * 숫자를 천 단위 콤마가 포함된 문자열로 변환
 */
function formatNumber(num: number): string {
  return num.toLocaleString("ko-KR")
}

/**
 * 문자열에서 숫자만 추출
 */
function parseNumber(str: string): number {
  const cleaned = str.replace(/[^\d.]/g, "")
  return parseFloat(cleaned) || 0
}

export function ImportCostCalculator() {
  // ==================== 상태 관리 ====================

  // 검색어
  const [searchQuery, setSearchQuery] = useState("")

  // 선택된 품목
  const [selectedItem, setSelectedItem] = useState<HsCodeWithTariff | null>(null)

  // 입력된 금액 (위안)
  const [displayAmount, setDisplayAmount] = useState("")

  // FTA 적용 여부
  const [useFta, setUseFta] = useState(true)

  // 검색 결과 드롭다운 열림 상태
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // 검색 입력 필드 참조
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 환율 데이터
  const { rates, isLoading: isRateLoading, refetch } = useExchangeRate()

  // 관세 검색
  const {
    results: searchResults,
    isLoading: isSearchLoading,
    search,
    clear: clearSearch,
  } = useTariffSearch()

  // ==================== 계산 로직 ====================

  // 실제 숫자 금액 (CNY)
  const numericAmount = useMemo(() => parseNumber(displayAmount), [displayAmount])

  // 수입원가 계산 결과
  const costResult = useMemo<ImportCostResult | null>(() => {
    // 필수 데이터 확인
    if (!selectedItem || !rates || numericAmount === 0) {
      return null
    }

    // 환율 (CNY → KRW)
    const exchangeRate = rates.CNY.baseRate

    // 제품가격 (원화)
    const productPriceKrw = Math.round(numericAmount * exchangeRate)

    // 적용할 관세율 결정
    // FTA 사용 && FTA 세율 존재하면 FTA 세율 사용
    const tariffRate =
      useFta && selectedItem.chinaFtaRate !== null
        ? selectedItem.chinaFtaRate
        : selectedItem.basicRate

    const tariffType = useFta && selectedItem.chinaFtaRate !== null ? "fta" : "basic"

    // 관세 계산
    const tariffAmount = Math.round(productPriceKrw * (tariffRate / 100))

    // 과세가격 (제품가격 + 관세)
    const taxablePrice = productPriceKrw + tariffAmount

    // 부가세 계산
    const vatAmount = Math.round(taxablePrice * (VAT_RATE / 100))

    // 총 수입원가
    const totalCost = taxablePrice + vatAmount

    return {
      productPriceCny: numericAmount,
      hsCode: selectedItem.code,
      productName: selectedItem.nameKo,
      exchangeRate,
      productPriceKrw,
      tariffType,
      tariffRate,
      tariffAmount,
      taxablePrice,
      vatRate: VAT_RATE,
      vatAmount,
      totalCost,
    }
  }, [selectedItem, rates, numericAmount, useFta])

  // FTA 미적용 시 비교 계산
  const comparisonResult = useMemo(() => {
    if (!costResult || !selectedItem || costResult.tariffType === "basic") {
      return null
    }

    // 기본세율로 계산
    const tariffAmount = Math.round(costResult.productPriceKrw * (selectedItem.basicRate / 100))
    const taxablePrice = costResult.productPriceKrw + tariffAmount
    const vatAmount = Math.round(taxablePrice * (VAT_RATE / 100))
    const totalCost = taxablePrice + vatAmount

    // 절감액
    const savings = totalCost - costResult.totalCost

    return { totalCost, savings }
  }, [costResult, selectedItem])

  // ==================== 이벤트 핸들러 ====================

  /**
   * 검색어 변경 처리
   */
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearchQuery(value)
      search(value)
      setIsSearchOpen(true)
    },
    [search]
  )

  /**
   * 품목 선택 처리
   */
  const handleSelectItem = useCallback((item: HsCodeWithTariff) => {
    setSelectedItem(item)
    setSearchQuery("")
    setIsSearchOpen(false)
    clearSearch()
  }, [clearSearch])

  /**
   * 품목 선택 해제
   */
  const handleClearSelection = useCallback(() => {
    setSelectedItem(null)
    setSearchQuery("")
    // 검색창에 포커스
    searchInputRef.current?.focus()
  }, [])

  /**
   * 금액 입력 처리 (천 단위 콤마 자동 적용)
   */
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const cleaned = value.replace(/[^\d.]/g, "")

    if (!cleaned) {
      setDisplayAmount("")
      return
    }

    const parts = cleaned.split(".")
    let formatted = parts[0]

    const integerPart = parseInt(parts[0], 10)
    if (!isNaN(integerPart)) {
      formatted = formatNumber(integerPart)
    }

    if (parts.length > 1) {
      formatted += "." + parts[1].slice(0, 2)
    }

    setDisplayAmount(formatted)
  }, [])

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-search-container]")) {
        setIsSearchOpen(false)
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
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
              <h2 className="text-lg font-semibold text-gray-900">
                🇨🇳 중국 수입원가 계산
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {rates?.CNY.updatedAt ? `환율 ${rates.CNY.updatedAt} 기준` : "로딩 중..."}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={refetch}
              disabled={isRateLoading}
              className="h-10 w-10 rounded-full hover:bg-gray-100"
              aria-label="환율 새로고침"
            >
              <RefreshCw
                className={`h-5 w-5 text-gray-500 ${isRateLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* 1. HS Code 검색 영역 */}
        <div className="px-6 pb-4">
          <label className="block text-sm font-medium text-gray-500 mb-2">
            1. 품목 검색
          </label>

          {/* 검색 또는 선택된 품목 표시 */}
          {selectedItem ? (
            // 선택된 품목 표시
            <div className="bg-primary/5 border-2 border-primary rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {selectedItem.code}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {selectedItem.nameKo}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>기본 {selectedItem.basicRate}%</span>
                    {selectedItem.chinaFtaRate !== null && (
                      <span className="text-primary font-medium">
                        한중FTA {selectedItem.chinaFtaRate}%
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleClearSelection}
                  className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                  aria-label="품목 선택 해제"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
          ) : (
            // 검색 입력
            <div className="relative" data-search-container>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="품목명 또는 HS Code 입력"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => searchQuery.length >= 2 && setIsSearchOpen(true)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              {/* 검색 결과 드롭다운 */}
              {isSearchOpen && (searchResults.length > 0 || isSearchLoading) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 max-h-72 overflow-y-auto z-20">
                  {isSearchLoading ? (
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-12 rounded-xl" />
                      <Skeleton className="h-12 rounded-xl" />
                      <Skeleton className="h-12 rounded-xl" />
                    </div>
                  ) : (
                    searchResults.map((item) => (
                      <button
                        key={item.code}
                        onClick={() => handleSelectItem(item)}
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {item.code}
                          </span>
                          {item.chinaFtaRate !== null && item.chinaFtaRate < item.basicRate && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              FTA 할인
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-1">
                          {item.nameKo}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          기본 {item.basicRate}%
                          {item.chinaFtaRate !== null && ` → FTA ${item.chinaFtaRate}%`}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* 검색 결과 없음 */}
              {isSearchOpen && searchQuery.length >= 2 && !isSearchLoading && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-center z-20">
                  <p className="text-gray-500 text-sm">검색 결과가 없습니다</p>
                  <p className="text-gray-400 text-xs mt-1">
                    다른 키워드로 검색해보세요
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 구분선 */}
        <div className="h-2 bg-gray-50" />

        {/* 2. 금액 입력 영역 */}
        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-gray-500 mb-2">
            2. 제품 가격 (위안)
          </label>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-xl">
              <span className="text-lg">🇨🇳</span>
              <span className="font-semibold text-gray-900">¥</span>
            </div>

            <div className="flex-1">
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

          {/* 환율 정보 */}
          {rates && (
            <p className="text-xs text-gray-400 text-right mt-2">
              1 CNY = {formatNumber(rates.CNY.baseRate)} 원
            </p>
          )}
        </div>

        {/* FTA 적용 토글 */}
        {selectedItem && selectedItem.chinaFtaRate !== null && (
          <div className="px-6 pb-4">
            <button
              onClick={() => setUseFta(!useFta)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                useFta ? "bg-green-50 border-2 border-green-200" : "bg-gray-50 border-2 border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    useFta ? "bg-green-500 border-green-500" : "border-gray-300"
                  }`}
                >
                  {useFta && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900">한중 FTA 적용</div>
                  <div className="text-xs text-gray-500">
                    관세율 {selectedItem.basicRate}% → {selectedItem.chinaFtaRate}%
                  </div>
                </div>
              </div>
              {useFta && comparisonResult && (
                <div className="text-right">
                  <div className="text-sm font-bold text-green-600">
                    -{formatNumber(comparisonResult.savings)}원
                  </div>
                  <div className="text-xs text-green-500">절감</div>
                </div>
              )}
            </button>
          </div>
        )}

        {/* 구분선 */}
        <div className="h-2 bg-gray-50" />

        {/* 3. 계산 결과 */}
        <div className="px-6 py-6">
          <label className="block text-sm font-medium text-gray-500 mb-3">
            3. 계산 결과
          </label>

          {costResult ? (
            <div className="space-y-3">
              {/* 상세 내역 */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">제품가격</span>
                  <span className="text-gray-700">
                    ¥{formatNumber(costResult.productPriceCny)} →{" "}
                    <span className="font-medium">₩{formatNumber(costResult.productPriceKrw)}</span>
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    관세 ({costResult.tariffRate}%
                    {costResult.tariffType === "fta" && (
                      <span className="text-green-600 ml-1">FTA</span>
                    )}
                    )
                  </span>
                  <span className="text-gray-700 font-medium">
                    ₩{formatNumber(costResult.tariffAmount)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">과세가격</span>
                  <span className="text-gray-700">₩{formatNumber(costResult.taxablePrice)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">부가세 (10%)</span>
                  <span className="text-gray-700 font-medium">
                    ₩{formatNumber(costResult.vatAmount)}
                  </span>
                </div>
              </div>

              {/* 총 수입원가 */}
              <div className="bg-primary/5 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-500">총 수입원가</span>
                  <span className="text-sm text-gray-500">🇰🇷 KRW</span>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-bold text-primary">
                    {formatNumber(costResult.totalCost)}
                  </span>
                  <span className="text-xl text-gray-500 ml-1">원</span>
                </div>

                {/* 비교 정보 */}
                {comparisonResult && (
                  <div className="mt-3 pt-3 border-t border-primary/10">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">FTA 미적용 시</span>
                      <span className="text-gray-400 line-through">
                        ₩{formatNumber(comparisonResult.totalCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-green-600 font-bold">
                        {formatNumber(comparisonResult.savings)}원 절감!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // 입력 안내
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <div className="text-gray-300 text-5xl mb-3">🧮</div>
              <p className="text-gray-500 text-sm">
                {!selectedItem
                  ? "품목을 먼저 검색해주세요"
                  : "금액을 입력하면 계산됩니다"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 하단 정보 */}
      <div className="flex items-center justify-center gap-1.5 mt-4">
        <Info className="h-3.5 w-3.5 text-gray-400" />
        <p className="text-xs text-gray-400">
          관세율은 참고용이며, 정확한 세율은 관세청에서 확인하세요
        </p>
      </div>
    </div>
  )
}
