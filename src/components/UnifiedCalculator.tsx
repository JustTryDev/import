/**
 * 통합 수입원가 계산기
 *
 * 이 컴포넌트는 하나의 페이지에서 환율 확인부터 최종 원가 계산까지 완료할 수 있게 합니다.
 *
 * 구조:
 * 1. 환율 섹션 - USD/CNY 환율 카드
 * 2. 품목 검색 - HS Code 검색 및 선택
 * 3. 제품 정보 입력 - 개당 원가, 수량
 * 4. 계산 결과 비교 - 기본세율 vs FTA 세율
 */

"use client"

import { useState, useMemo, useEffect } from "react"
import { RefreshCw, Search, X, Check, Info } from "lucide-react"
import { useExchangeRate } from "@/hooks/useExchangeRate"
import { useTariffSearch } from "@/hooks/useTariffSearch"
import type { HsCodeWithTariff } from "@/types/tariff"

// ==========================================
// 타입 정의
// ==========================================

/**
 * 통화 타입
 * USD: 미국 달러, CNY: 중국 위안
 */
type CurrencyType = "USD" | "CNY"

/**
 * 선택된 품목 정보
 * HS Code 검색 후 선택된 품목의 정보를 저장합니다.
 */
interface SelectedItem {
  code: string      // HS 코드
  nameKo: string    // 한글 품목명
  basicRate: number // 기본세율 (%)
  ftaRate: number | null // 한중 FTA 세율 (%, 없으면 null)
}

/**
 * 계산 결과 타입
 * 기본세율과 FTA 세율 각각의 계산 결과를 저장합니다.
 */
interface CalculationResult {
  // 공통
  totalPriceCNY: number     // 총 제품가격 (CNY)
  totalPriceKRW: number     // 총 제품가격 (KRW)

  // 기본세율 적용
  basic: {
    tariffRate: number      // 세율 (%)
    tariffAmount: number    // 관세액
    taxablePrice: number    // 과세가격
    totalCost: number       // 총 수입원가
  }

  // FTA 적용
  fta: {
    tariffRate: number
    tariffAmount: number
    taxablePrice: number
    totalCost: number
  }

  // 비교
  savings: number           // 절감액
}

// ==========================================
// 유틸리티 함수
// ==========================================

/**
 * 숫자를 한국 원화 형식으로 포맷팅
 * 예: 1234567 -> "1,234,567"
 */
function formatKRW(value: number): string {
  return Math.round(value).toLocaleString("ko-KR")
}

/**
 * 숫자를 CNY 형식으로 포맷팅
 * 예: 1234.5 -> "1,234.5"
 */
function formatCNY(value: number): string {
  return value.toLocaleString("ko-KR")
}

// ==========================================
// 메인 컴포넌트
// ==========================================

export default function UnifiedCalculator() {
  // ===== 환율 데이터 =====
  const { rates, isLoading: isRatesLoading, refetch } = useExchangeRate()

  // ===== 품목 검색 =====
  const {
    results: searchResults,
    isLoading: isSearchLoading,
    search,
    clear: clearSearch,
  } = useTariffSearch()

  // ===== 상태 관리 =====
  // 선택된 통화 (USD 또는 CNY)
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>("CNY")
  // 오늘 날짜 (hydration 문제 방지를 위해 클라이언트에서만 설정)
  const [todayDate, setTodayDate] = useState<string>("")
  // 검색어
  const [searchQuery, setSearchQuery] = useState("")
  // 선택된 품목
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  // 개당 원가 (선택된 통화 기준)
  const [unitPrice, setUnitPrice] = useState<string>("")
  // 수량
  const [quantity, setQuantity] = useState<string>("")

  // ===== 환율 가져오기 =====
  // rates 객체에서 USD, CNY 환율을 추출합니다
  const usdRate = rates?.USD?.baseRate ?? null
  const cnyRate = rates?.CNY?.baseRate ?? null

  // 선택된 통화의 환율
  const selectedRate = selectedCurrency === "USD" ? usdRate : cnyRate

  // 통화 기호
  const currencySymbol = selectedCurrency === "USD" ? "$" : "¥"
  const currencyName = selectedCurrency === "USD" ? "USD" : "CNY"

  // ===== 클라이언트에서 날짜 설정 (hydration 문제 방지) =====
  useEffect(() => {
    setTodayDate(
      new Date().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    )
  }, [])

  // ===== 계산 로직 =====
  /**
   * useMemo를 사용해서 계산 결과를 캐싱합니다.
   *
   * 비유: 계산기에 결과를 메모해두는 것처럼,
   * 입력값이 바뀔 때만 다시 계산합니다.
   */
  const calculationResult = useMemo<CalculationResult | null>(() => {
    // 필요한 값이 모두 있는지 확인
    if (!selectedItem || !selectedRate || !unitPrice || !quantity) {
      return null
    }

    const unitPriceNum = parseFloat(unitPrice)
    const quantityNum = parseInt(quantity, 10)

    // 유효한 숫자인지 확인
    if (isNaN(unitPriceNum) || isNaN(quantityNum) || unitPriceNum <= 0 || quantityNum <= 0) {
      return null
    }

    // 1단계: 총 제품가격 계산 (선택된 통화 기준)
    const totalPriceCNY = unitPriceNum * quantityNum  // 외화 기준 총액
    const totalPriceKRW = totalPriceCNY * selectedRate // 원화 환산

    // 2단계: 기본세율 적용
    const basicTariffRate = selectedItem.basicRate
    const basicTariffAmount = totalPriceKRW * (basicTariffRate / 100)
    const basicTaxablePrice = totalPriceKRW + basicTariffAmount
    const basicTotalCost = basicTaxablePrice

    // 3단계: FTA 세율 적용 (FTA 세율이 없으면 기본세율 사용)
    const ftaTariffRate = selectedItem.ftaRate ?? selectedItem.basicRate
    const ftaTariffAmount = totalPriceKRW * (ftaTariffRate / 100)
    const ftaTaxablePrice = totalPriceKRW + ftaTariffAmount
    const ftaTotalCost = ftaTaxablePrice

    // 4단계: 절감액 계산
    const savings = basicTotalCost - ftaTotalCost

    return {
      totalPriceCNY,
      totalPriceKRW,
      basic: {
        tariffRate: basicTariffRate,
        tariffAmount: basicTariffAmount,
        taxablePrice: basicTaxablePrice,
        totalCost: basicTotalCost,
      },
      fta: {
        tariffRate: ftaTariffRate,
        tariffAmount: ftaTariffAmount,
        taxablePrice: ftaTaxablePrice,
        totalCost: ftaTotalCost,
      },
      savings,
    }
  }, [selectedItem, selectedRate, unitPrice, quantity])

  // ===== 이벤트 핸들러 =====

  /**
   * 검색어 변경 처리
   */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    search(value) // 디바운스 적용된 검색 실행
  }

  /**
   * 품목 선택 처리
   */
  const handleSelectItem = (item: HsCodeWithTariff) => {
    setSelectedItem({
      code: item.code,
      nameKo: item.nameKo,
      basicRate: item.basicRate,
      ftaRate: item.chinaFtaRate,
    })
    setSearchQuery("") // 검색어 초기화
    clearSearch() // 검색 결과 초기화
  }

  /**
   * 선택된 품목 삭제
   */
  const handleClearSelection = () => {
    setSelectedItem(null)
    setUnitPrice("")
    setQuantity("")
  }

  /**
   * 숫자 입력 처리 (천 단위 콤마 제거 후 저장)
   */
  const handleNumberInput = (
    value: string,
    setter: (value: string) => void
  ) => {
    // 숫자와 소수점만 허용
    const cleaned = value.replace(/[^0-9.]/g, "")
    setter(cleaned)
  }

  // ==========================================
  // 렌더링
  // ==========================================

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* ===== 헤더 ===== */}
      <header className="text-center py-6">
        <h1 className="text-2xl font-bold text-gray-900">
          중국 수입원가 계산기
        </h1>
        <p className="mt-2 text-gray-600">
          실시간 환율로 수입 비용을 한번에 계산
        </p>
      </header>

      {/* ===== 섹션 1: 오늘의 환율 ===== */}
      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">오늘의 환율</h2>
            <p className="text-xs text-gray-400 mt-1">
              한국수출입은행 API 기준
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isRatesLoading}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="환율 새로고침"
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-600 ${isRatesLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* 통화 선택 안내 */}
        <p className="text-sm text-gray-500 mb-3">
          원가 입력에 사용할 통화를 선택하세요
        </p>

        <div className="grid grid-cols-2 gap-4">
          {/* USD 카드 - 클릭으로 선택 */}
          <button
            onClick={() => setSelectedCurrency("USD")}
            className={`rounded-lg p-4 text-center transition-all ${
              selectedCurrency === "USD"
                ? "bg-blue-50 border-2 border-blue-500 ring-2 ring-blue-200"
                : "bg-gray-50 border-2 border-transparent hover:border-gray-300"
            }`}
          >
            <p className={`text-sm mb-1 ${
              selectedCurrency === "USD" ? "text-blue-600" : "text-gray-500"
            }`}>
              USD 미국 달러
            </p>
            <p className={`text-xl font-bold ${
              selectedCurrency === "USD" ? "text-blue-700" : "text-gray-900"
            }`}>
              {isRatesLoading ? (
                "..."
              ) : usdRate ? (
                `${formatKRW(usdRate)}원`
              ) : (
                "-"
              )}
            </p>
            {selectedCurrency === "USD" && (
              <div className="mt-2 flex items-center justify-center gap-1">
                <Check className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-blue-500">선택됨</span>
              </div>
            )}
          </button>

          {/* CNY 카드 - 클릭으로 선택 */}
          <button
            onClick={() => setSelectedCurrency("CNY")}
            className={`rounded-lg p-4 text-center transition-all ${
              selectedCurrency === "CNY"
                ? "bg-blue-50 border-2 border-blue-500 ring-2 ring-blue-200"
                : "bg-gray-50 border-2 border-transparent hover:border-gray-300"
            }`}
          >
            <p className={`text-sm mb-1 ${
              selectedCurrency === "CNY" ? "text-blue-600" : "text-gray-500"
            }`}>
              CNY 중국 위안
            </p>
            <p className={`text-xl font-bold ${
              selectedCurrency === "CNY" ? "text-blue-700" : "text-gray-900"
            }`}>
              {isRatesLoading ? (
                "..."
              ) : cnyRate ? (
                `${formatKRW(cnyRate)}원`
              ) : (
                "-"
              )}
            </p>
            {selectedCurrency === "CNY" && (
              <div className="mt-2 flex items-center justify-center gap-1">
                <Check className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-blue-500">선택됨</span>
              </div>
            )}
          </button>
        </div>

        {/* 기준 날짜 표시 */}
        {todayDate && (
          <p className="text-xs text-gray-400 text-center mt-4">
            {todayDate} 기준
          </p>
        )}
      </section>

      {/* ===== 섹션 2: 품목 검색 ===== */}
      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">품목 검색</h2>

        {/* 검색창 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="제품명 또는 HS Code 입력..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 검색 결과 드롭다운 */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((item) => (
              <button
                key={item.code}
                onClick={() => handleSelectItem(item)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <p className="font-medium text-gray-900">
                  {item.code} {item.nameKo}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  기본세율: {item.basicRate}% | 한중 FTA:{" "}
                  {item.chinaFtaRate !== null ? `${item.chinaFtaRate}%` : "-"}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* 검색 중 표시 */}
        {isSearchLoading && (
          <p className="mt-2 text-sm text-gray-500">검색 중...</p>
        )}

        {/* 선택된 품목 카드 */}
        {selectedItem && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">
                  {selectedItem.code} {selectedItem.nameKo}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  기본세율: {selectedItem.basicRate}% | 한중 FTA:{" "}
                  {selectedItem.ftaRate !== null
                    ? `${selectedItem.ftaRate}%`
                    : "-"}
                </p>
              </div>
              <button
                onClick={handleClearSelection}
                className="p-1 hover:bg-blue-100 rounded"
                aria-label="선택 취소"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        )}

        {/* 안내 메시지 */}
        {!selectedItem && searchResults.length === 0 && !searchQuery && (
          <div className="mt-4 flex items-start gap-2 text-sm text-gray-500">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>제품명(예: 장갑, 가방) 또는 HS Code(예: 6116)를 검색하세요.</p>
          </div>
        )}
      </section>

      {/* ===== 섹션 3: 제품 정보 입력 ===== */}
      {selectedItem && (
        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            제품 정보 입력
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {/* 개당 원가 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                단가 ({currencyName})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {currencySymbol}
                </span>
                <input
                  type="text"
                  value={unitPrice}
                  onChange={(e) =>
                    handleNumberInput(e.target.value, setUnitPrice)
                  }
                  placeholder="100"
                  className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 수량 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                수량
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={quantity}
                  onChange={(e) =>
                    handleNumberInput(e.target.value, setQuantity)
                  }
                  placeholder="1,000"
                  className="w-full pl-4 pr-8 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  개
                </span>
              </div>
            </div>
          </div>

          {/* 총 제품가격 표시 */}
          {calculationResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-center text-gray-700">
                <span className="font-medium">총 제품가격: </span>
                <span className="text-blue-600">
                  {currencySymbol}{formatCNY(calculationResult.totalPriceCNY)}
                </span>
                <span className="mx-2">→</span>
                <span className="font-bold text-gray-900">
                  ₩{formatKRW(calculationResult.totalPriceKRW)}
                </span>
              </p>
              <p className="text-center text-sm text-gray-500 mt-1">
                (1 {currencyName} = {selectedRate ? formatKRW(selectedRate) : "-"}원)
              </p>
            </div>
          )}
        </section>
      )}

      {/* ===== 섹션 4: 계산 결과 비교 ===== */}
      {calculationResult && (
        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            계산 결과 비교
          </h2>

          {/* 비교 테이블 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 기본세율 적용 */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-3 text-center">
                <p className="font-medium text-gray-700">기본세율 적용</p>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">제품가격</span>
                  <span>₩{formatKRW(calculationResult.totalPriceKRW)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    관세({calculationResult.basic.tariffRate}%)
                  </span>
                  <span>₩{formatKRW(calculationResult.basic.tariffAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">과세가격</span>
                  <span>₩{formatKRW(calculationResult.basic.taxablePrice)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>총액</span>
                  <span>₩{formatKRW(calculationResult.basic.totalCost)}</span>
                </div>
              </div>
            </div>

            {/* FTA 적용 */}
            <div className="border-2 border-blue-500 rounded-lg overflow-hidden">
              <div className="bg-blue-500 px-4 py-3 text-center flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-white" />
                <p className="font-medium text-white">한중 FTA 적용</p>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">제품가격</span>
                  <span>₩{formatKRW(calculationResult.totalPriceKRW)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    관세({calculationResult.fta.tariffRate}%)
                  </span>
                  <span>₩{formatKRW(calculationResult.fta.tariffAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">과세가격</span>
                  <span>₩{formatKRW(calculationResult.fta.taxablePrice)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold text-blue-600">
                  <span>총액</span>
                  <span>₩{formatKRW(calculationResult.fta.totalCost)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 절감액 강조 */}
          {calculationResult.savings > 0 && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <p className="text-green-800 font-medium">
                  한중 FTA 적용 시{" "}
                  <span className="text-green-600 font-bold">
                    {formatKRW(calculationResult.savings)}원
                  </span>{" "}
                  절감!
                </p>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
