"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, X } from "lucide-react"
import { useTariffSearch } from "@/hooks"
import type { HsCodeWithTariff } from "@/types/tariff"

interface ProductInfoInputProps {
  unitPrice: string
  setUnitPrice: (value: string) => void
  quantity: string
  setQuantity: (value: string) => void
  currency: "USD" | "CNY"  // 환율 카드에서 선택된 통화 (읽기 전용)
  // 제품 검색 관련
  selectedProduct: HsCodeWithTariff | null
  setSelectedProduct: (product: HsCodeWithTariff | null) => void
  onTariffRateSelect?: (basicRate: number, ftaRate: number | null) => void
}

// 제품 정보 입력 컴포넌트 (원가, 수량 + 제품명 검색)
export function ProductInfoInput({
  unitPrice,
  setUnitPrice,
  quantity,
  setQuantity,
  currency,
  selectedProduct,
  setSelectedProduct,
  onTariffRateSelect,
}: ProductInfoInputProps) {
  // 검색 관련 상태
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 관세 검색 훅
  const {
    results: searchResults,
    isLoading: isSearchLoading,
    search,
    clear: clearSearch,
  } = useTariffSearch()

  // 검색어 변경 핸들러
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    search(value)
    setIsSearchOpen(true)
  }

  // 품목 선택 핸들러
  const handleSelectProduct = (item: HsCodeWithTariff) => {
    setSelectedProduct(item)
    setSearchQuery("")
    setIsSearchOpen(false)
    clearSearch()

    // 관세율 자동 적용 콜백
    if (onTariffRateSelect) {
      onTariffRateSelect(item.basicRate, item.chinaFtaRate)
    }
  }

  // 선택 해제 핸들러
  const handleClearSelection = () => {
    setSelectedProduct(null)
    setSearchQuery("")
    searchInputRef.current?.focus()
  }

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-product-search]")) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [])

  // 숫자 입력 처리 (소수점 2자리까지 허용)
  const handlePriceChange = (value: string) => {
    // 숫자와 소수점만 허용
    const cleaned = value.replace(/[^0-9.]/g, "")

    // 소수점이 여러 개인 경우 첫 번째만 유지
    const parts = cleaned.split(".")
    let result = parts[0]
    if (parts.length > 1) {
      // 소수점 이하 2자리까지만 허용
      result = parts[0] + "." + parts[1].slice(0, 2)
    }

    setUnitPrice(result)
  }

  const handleQuantityChange = (value: string) => {
    // 콤마 제거 후 숫자만 추출
    const numericValue = value.replace(/[^0-9]/g, "")
    if (numericValue === "" || !isNaN(Number(numericValue))) {
      setQuantity(numericValue)
    }
  }

  // 수량 표시용 (콤마 포함)
  const formattedQuantity = quantity ? Number(quantity).toLocaleString() : ""

  return (
    <div className="space-y-3">
      {/* 타이틀 */}
      <h3 className="text-sm font-medium text-gray-700">제품 정보</h3>

      {/* 제품명 검색 (상단 중앙) */}
      <div data-product-search>
        {selectedProduct ? (
          // 선택된 품목 표시
          <div className="bg-primary/5 border-2 border-primary rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                    HS CODE : {selectedProduct.code}
                  </span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">
                  {selectedProduct.nameKo}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>기본 {selectedProduct.basicRate}%</span>
                  {selectedProduct.chinaFtaRate !== null && (
                    <span className="text-primary font-medium">
                      한-중 FTA {selectedProduct.chinaFtaRate}%
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearSelection}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>
        ) : (
          // 검색 입력
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="HS Code, 제품명(한글/영문) 검색"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.length >= 2 && setIsSearchOpen(true)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />

            {/* 검색 결과 드롭다운 */}
            {isSearchOpen && (searchResults.length > 0 || isSearchLoading) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 max-h-60 overflow-y-auto z-20">
                {isSearchLoading ? (
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-10 rounded" />
                    <Skeleton className="h-10 rounded" />
                  </div>
                ) : (
                  searchResults.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleSelectProduct(item)}
                      className="w-full p-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          HS CODE : {item.code}
                        </span>
                        {item.chinaFtaRate !== null && item.chinaFtaRate < item.basicRate && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                            한-중 FTA
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-1">{item.nameKo}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        기본 {item.basicRate}%
                        {item.chinaFtaRate !== null && ` / 한-중 FTA ${item.chinaFtaRate}%`}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* 검색 결과 없음 */}
            {isSearchOpen && searchQuery.length >= 2 && !isSearchLoading && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 p-4 text-center z-20">
                <p className="text-gray-500 text-sm">검색 결과가 없습니다</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 개당 원가 + 수량 (2열 그리드) */}
      <div className="grid grid-cols-2 gap-3">
        {/* 개당 원가 */}
        <div>
          <Label htmlFor="unitPrice" className="text-xs text-gray-500">
            단가 ({currency})
          </Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              {currency === "USD" ? "$" : "¥"}
            </span>
            <Input
              id="unitPrice"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={unitPrice}
              onChange={(e) => handlePriceChange(e.target.value)}
              className="pl-8 text-right"
            />
          </div>
        </div>

        {/* 수량 */}
        <div>
          <Label htmlFor="quantity" className="text-xs text-gray-500">
            수량 (개)
          </Label>
          <Input
            id="quantity"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={formattedQuantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className="mt-1 text-right"
          />
        </div>
      </div>
    </div>
  )
}
