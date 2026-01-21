"use client"

import { useState, useRef, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { NumberInput } from "@/components/ui/number-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Search, X, Trash2, ChevronDown, ChevronUp, Check } from "lucide-react"
import { useTariffSearch } from "@/hooks"
import type { HsCodeWithTariff } from "@/types/tariff"
import type { Product, ProductDimensions } from "@/types/shipping"
import {
  calculateUnitCbm,
  calculateTotalCbm,
} from "@/lib/calculations"

interface ProductCardProps {
  product: Product
  index: number
  onUpdate: (product: Product) => void
  onDelete: () => void
  canDelete: boolean  // 최소 1개 제품 필수이므로 삭제 가능 여부
  unitCost: number | null  // 계산된 개당 수입원가 (외부에서 전달)
}

/**
 * 제품 카드 컴포넌트
 *
 * 📌 비유: 쇼핑몰에서 장바구니에 담은 각 상품 카드
 * - 각 제품마다 별도의 정보(가격, 수량, 관세율 등)를 관리
 * - 삭제 버튼으로 장바구니에서 제거 가능
 */
export function ProductCard({
  product,
  index,
  onUpdate,
  onDelete,
  canDelete,
  unitCost,
}: ProductCardProps) {
  // ===== 검색 관련 상태 =====
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 카드 접기/펼치기 상태
  const [isExpanded, setIsExpanded] = useState(true)

  // 관세 검색 훅
  const {
    results: searchResults,
    isLoading: isSearchLoading,
    search,
    fetchPopular,
    clear: clearSearch,
  } = useTariffSearch()

  // ===== CBM 계산 =====
  const unitCbm = calculateUnitCbm(product.dimensions)
  const totalCbm = calculateTotalCbm(product.dimensions, product.quantity)

  // ===== 핸들러 =====
  // 통화 변경
  const handleCurrencyChange = (currency: "USD" | "CNY") => {
    onUpdate({ ...product, currency })
  }

  // 단가 변경 (소수점 2자리까지, 최대 100만)
  const handlePriceChange = (value: string) => {
    const cleaned = value.replace(/,/g, "").replace(/[^0-9.]/g, "")
    const parts = cleaned.split(".")
    let result = parts[0]
    if (parts.length > 1) {
      result = parts[0] + "." + parts[1].slice(0, 2)
    }
    const numValue = parseFloat(result)
    if (!isNaN(numValue) && numValue > 1000000) {
      result = "1000000"
    }
    onUpdate({ ...product, unitPrice: parseFloat(result) || 0 })
  }

  // 수량 변경 (정수, 최대 100만)
  const handleQuantityChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "")
    const num = parseInt(numericValue) || 0
    onUpdate({ ...product, quantity: Math.min(num, 1000000) })
  }

  // 크기 변경
  const handleDimensionChange = (key: keyof ProductDimensions, value: string) => {
    const num = parseFloat(value) || 0
    onUpdate({
      ...product,
      dimensions: { ...product.dimensions, [key]: Math.min(num, 500) },
    })
  }

  // HS Code 검색
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    search(value)
    setIsSearchOpen(true)
  }

  // 품목 선택
  const handleSelectProduct = (item: HsCodeWithTariff) => {
    onUpdate({
      ...product,
      hsCode: item,
      basicTariffRate: item.basicRate,
      ftaTariffRate: item.chinaFtaRate ?? 0,
    })
    setSearchQuery("")
    setIsSearchOpen(false)
    clearSearch()
  }

  // 선택 해제
  const handleClearHsCode = () => {
    onUpdate({
      ...product,
      hsCode: null,
      basicTariffRate: 0,
      ftaTariffRate: 0,
    })
    setSearchQuery("")
    searchInputRef.current?.focus()
  }

  // FTA 적용 토글
  const handleFtaToggle = (checked: boolean) => {
    onUpdate({ ...product, useFta: checked })
  }

  // 관세율 직접 입력
  const handleBasicRateChange = (value: string) => {
    const num = parseFloat(value) || 0
    onUpdate({ ...product, basicTariffRate: Math.min(num, 100) })
  }

  const handleFtaRateChange = (value: string) => {
    const num = parseFloat(value) || 0
    onUpdate({ ...product, ftaTariffRate: Math.min(num, 100) })
  }

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // data-product-search="product.id" 형태로 설정된 속성을 찾음
      if (!target.closest(`[data-product-search="${product.id}"]`)) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [product.id])

  // 표시용 포맷팅
  const formattedPrice = product.unitPrice > 0
    ? product.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : ""
  const formattedQuantity = product.quantity > 0
    ? product.quantity.toLocaleString()
    : ""

  // 적용 관세율
  const appliedRate = product.useFta ? product.ftaTariffRate : product.basicTariffRate

  // 제품명 (HS Code 선택 시 품목명, 없으면 기본 텍스트)
  const productName = product.hsCode?.nameKo || "품목 미선택"

  // 크기 문자열
  const dimensionStr = `${product.dimensions.width}×${product.dimensions.height}×${product.dimensions.depth}cm`

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 헤더 (항상 표시) */}
      <div
        className={`px-3 py-2 bg-gray-50 border-b border-gray-100 cursor-pointer ${
          !isExpanded ? "hover:bg-gray-100" : ""
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* 첫째 줄: 제품 번호 + 삭제/접기 버튼 */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            제품 {index + 1}
          </span>
          <div className="flex items-center gap-1">
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* 접힌 상태: 요약 정보 표시 */}
        {!isExpanded && (
          <div className="mt-1.5 space-y-1">
            {/* 제품명 */}
            <p className="text-xs text-gray-600 line-clamp-1">{productName}</p>
            {/* 상세 정보: 가격, 크기, CBM, 관세율 */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              {/* 개당 가격 (원화 + 원래 통화) */}
              {product.unitPrice > 0 && (
                <span>
                  {product.currency === "USD" ? "$" : "¥"}
                  {product.unitPrice.toLocaleString()}
                  {unitCost !== null && (
                    <span className="text-primary font-medium ml-1">
                      ({unitCost.toLocaleString()}원)
                    </span>
                  )}
                </span>
              )}
              {/* 크기 */}
              <span>{dimensionStr}</span>
              {/* 실제 합계 CBM */}
              <span className="font-mono">{totalCbm.toFixed(2)} CBM</span>
              {/* 적용 관세율 */}
              <span>
                {product.useFta ? "FTA " : "기본 "}
                {appliedRate}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 본문 (접기/펼치기) */}
      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* HS Code 검색 */}
          <div data-product-search={product.id}>
            {product.hsCode ? (
              // 선택된 품목 표시
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* HS CODE + FTA 배지 */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        HS CODE : <span className="font-mono text-gray-700">{product.hsCode.code}</span>
                      </span>
                      {product.hsCode.chinaFtaRate !== null && product.hsCode.chinaFtaRate < product.hsCode.basicRate && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          한-중 FTA
                        </span>
                      )}
                    </div>
                    {/* 품목명 */}
                    <p className="text-sm text-gray-800 line-clamp-1">
                      {product.hsCode.nameKo}
                    </p>
                    {/* 관세율 정보 */}
                    <p className="text-xs text-gray-400">
                      기본 {product.hsCode.basicRate}% / 한-중 FTA {product.hsCode.chinaFtaRate ?? 0}%
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearHsCode}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                </div>
              </div>
            ) : (
              // 검색 입력
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="HS Code, 제품명 검색"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => {
                    setIsSearchOpen(true)
                    if (searchResults.length === 0 && searchQuery.length < 2) {
                      fetchPopular()
                    }
                  }}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />

                {/* 검색 결과 드롭다운 */}
                {isSearchOpen && (searchResults.length > 0 || isSearchLoading) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto z-20">
                    {isSearchLoading ? (
                      <div className="p-2 space-y-2">
                        <Skeleton className="h-8 rounded" />
                        <Skeleton className="h-8 rounded" />
                      </div>
                    ) : (
                      searchResults.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => handleSelectProduct(item)}
                          className="w-full p-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          {/* HS CODE + FTA 배지 */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              HS CODE : <span className="font-mono text-gray-700">{item.code}</span>
                            </span>
                            {item.chinaFtaRate !== null && item.chinaFtaRate < item.basicRate && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                한-중 FTA
                              </span>
                            )}
                          </div>
                          {/* 품목명 */}
                          <p className="text-sm text-gray-800 line-clamp-1 mt-1">{item.nameKo}</p>
                          {/* 관세율 정보 */}
                          <p className="text-xs text-gray-400 mt-0.5">
                            기본 {item.basicRate}% / 한-중 FTA {item.chinaFtaRate ?? 0}%
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 통화 + 단가 + 수량 (3열) */}
          <div className="grid grid-cols-3 gap-2">
            {/* 통화 선택 */}
            <div>
              <Label className="text-xs text-gray-500">통화</Label>
              <Select value={product.currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="CNY">CNY (¥)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 단가 */}
            <div>
              <Label className="text-xs text-gray-500">
                단가 ({product.currency})
              </Label>
              <NumberInput
                value={product.unitPrice}
                onChange={handlePriceChange}
                min={0}
                max={1000000}
                step={0.1}
                decimal={2}
                prefix={product.currency === "USD" ? "$" : "¥"}
                className="mt-1"
              />
            </div>

            {/* 수량 */}
            <div>
              <Label className="text-xs text-gray-500">수량</Label>
              <NumberInput
                value={product.quantity}
                onChange={handleQuantityChange}
                min={0}
                max={1000000}
                step={1}
                decimal={0}
                className="mt-1"
              />
            </div>
          </div>

          {/* 크기 + CBM (2열) */}
          <div className="grid grid-cols-2 gap-3">
            {/* 크기 입력 */}
            <div>
              <Label className="text-xs text-gray-500">크기 (cm)</Label>
              <div className="flex items-center gap-1 mt-1">
                <NumberInput
                  value={product.dimensions.width}
                  onChange={(v) => handleDimensionChange("width", v)}
                  min={0}
                  max={500}
                  step={1}
                  decimal={0}
                  placeholder="가로"
                  align="center"
                  size="sm"
                />
                <span className="text-gray-400 text-xs">×</span>
                <NumberInput
                  value={product.dimensions.height}
                  onChange={(v) => handleDimensionChange("height", v)}
                  min={0}
                  max={500}
                  step={1}
                  decimal={0}
                  placeholder="세로"
                  align="center"
                  size="sm"
                />
                <span className="text-gray-400 text-xs">×</span>
                <NumberInput
                  value={product.dimensions.depth}
                  onChange={(v) => handleDimensionChange("depth", v)}
                  min={0}
                  max={500}
                  step={1}
                  decimal={0}
                  placeholder="높이"
                  align="center"
                  size="sm"
                />
              </div>
            </div>

            {/* CBM 표시 (소수점 2자리) */}
            <div>
              <Label className="text-xs text-gray-500">CBM</Label>
              <div className="mt-1 px-2 py-1.5 bg-gray-50 rounded text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">단위:</span>
                  <span className="font-mono">{unitCbm.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">합계:</span>
                  <span className="font-mono font-medium text-primary">
                    {totalCbm.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 관세율 */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            {/* FTA 적용 토글 (왼쪽으로 이동) */}
            <div className="flex items-center gap-2">
              <Switch
                checked={product.useFta}
                onCheckedChange={handleFtaToggle}
              />
              <span className="text-xs text-gray-500">FTA 적용</span>
            </div>

            <div className="flex items-center gap-3">
              {/* 기본 관세율 */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">기본</span>
                <NumberInput
                  value={product.basicTariffRate}
                  onChange={handleBasicRateChange}
                  min={0}
                  max={100}
                  step={0.5}
                  decimal={1}
                  align="center"
                  size="sm"
                  className="w-14"
                />
                <span className="text-xs text-gray-500">%</span>
              </div>
              {/* FTA 관세율 */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">FTA</span>
                <NumberInput
                  value={product.ftaTariffRate}
                  onChange={handleFtaRateChange}
                  min={0}
                  max={100}
                  step={0.5}
                  decimal={1}
                  align="center"
                  size="sm"
                  className="w-14"
                />
                <span className="text-xs text-gray-500">%</span>
              </div>
            </div>
          </div>

          {/* 적용 관세율 및 개당 수입원가 + 입력 완료 버튼 */}
          <div className="flex items-center justify-between bg-gray-50 rounded px-2 py-1.5">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                적용 관세율: <span className="font-medium text-gray-700">{appliedRate}%</span>
              </span>
              {unitCost !== null && (
                <span className="text-sm font-bold text-primary">
                  개당 {unitCost.toLocaleString()}원
                </span>
              )}
            </div>
            {/* 입력 완료 버튼 */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(false)
              }}
            >
              <Check className="h-3 w-3" />
              입력 완료
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// 봉제 인형 기본 HS코드 (HS 9503.00-4100)
// - 기본 관세율: 8%
// - FTA 적용 시: 0%
const DEFAULT_HS_CODE: HsCodeWithTariff = {
  code: "9503.00-4100",
  nameKo: "봉제 인형",
  nameEn: "Stuffed toys",
  basicRate: 8,
  wtoRate: 8,
  chinaFtaRate: 0,
}

// 빈 제품 생성 함수 (기본값: 봉제 인형)
export function createEmptyProduct(id: string): Product {
  return {
    id,
    name: "",
    unitPrice: 0,
    currency: "CNY",  // 기본값: 중국 위안화 (중국 공장이 대부분)
    quantity: 0,
    dimensions: { width: 10, height: 10, depth: 10 },
    hsCode: DEFAULT_HS_CODE,  // 기본값: 봉제 인형
    basicTariffRate: DEFAULT_HS_CODE.basicRate,
    ftaTariffRate: DEFAULT_HS_CODE.chinaFtaRate ?? 0,
    useFta: true,  // 기본값: FTA 적용
  }
}
