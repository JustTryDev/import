"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Truck } from "lucide-react"
import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/ui/number-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  calculateRTon,
  calculateWeightTon,
  roundCbmToHalf,
  findShippingRate,
  calculateInlandShipping,
  calculateDomesticShipping,
  calculate3PLCost,
} from "@/lib/calculations"
import {
  useShippingCompanies,
  useShippingRateTypes,
  useShippingRates,
  useCostSettings,
  useExchangeRate,
} from "@/hooks"
import { Id } from "../../../convex/_generated/dataModel"
import { formatNumberWithCommas } from "@/lib/format"

interface PackagingCalculatorModalProps {
  isOpen: boolean
  onClose: () => void
}

type InputMode = "per_box" | "total"

// 확장된 중량 단위 (ton 포함)
type ExtendedWeightUnit = "kg" | "g" | "ton"

// 중량을 kg로 변환 (ton 포함)
function convertToKgExtended(weight: number, unit: ExtendedWeightUnit): number {
  switch (unit) {
    case "g":
      return weight / 1000
    case "ton":
      return weight * 1000
    case "kg":
    default:
      return weight
  }
}

/**
 * 패키징 계산기 모달
 *
 * 두 가지 입력 모드를 지원:
 * 1. 포장 별 입력: 박스 크기, 무게, 수량으로 R.TON 계산
 * 2. 총 부피 & 중량 입력: CBM과 중량 직접 입력으로 R.TON 계산
 */
export function PackagingCalculatorModal({
  isOpen,
  onClose,
}: PackagingCalculatorModalProps) {
  // 입력 모드
  const [inputMode, setInputMode] = useState<InputMode>("per_box")

  // 포장 별 입력 상태
  const [boxWidth, setBoxWidth] = useState(0)
  const [boxHeight, setBoxHeight] = useState(0)
  const [boxDepth, setBoxDepth] = useState(0)
  const [boxWeight, setBoxWeight] = useState(0)
  const [boxWeightUnit, setBoxWeightUnit] = useState<ExtendedWeightUnit>("kg")
  const [boxQuantity, setBoxQuantity] = useState(0)

  // 총 부피 & 중량 입력 상태
  const [totalCbm, setTotalCbm] = useState(0)
  const [totalWeight, setTotalWeight] = useState(0)
  const [totalWeightUnit, setTotalWeightUnit] = useState<ExtendedWeightUnit>("kg")

  // ===== 운송 업체 관련 상태 =====
  const { companies } = useShippingCompanies()
  const [selectedCompanyId, setSelectedCompanyId] = useState<Id<"shippingCompanies"> | null>(null)

  // 운임 타입
  const { rateTypes, defaultRateType } = useShippingRateTypes(selectedCompanyId)
  const [selectedRateTypeId, setSelectedRateTypeId] = useState<Id<"shippingRateTypes"> | null>(null)

  // 운송료 테이블
  const { rates: shippingRates, isLoading: shippingRatesLoading } = useShippingRates(selectedRateTypeId)

  // 선택된 운임 타입 정보 (통화)
  const selectedRateType = rateTypes?.find(rt => rt._id === selectedRateTypeId)
  const rateTypeCurrency = selectedRateType?.currency ?? "USD"

  // 비용 설정 (내륙운송료, 국내운송료, 3PL)
  const { inlandConfig, domesticConfig, threePLConfig } = useCostSettings()

  // 환율
  const { rates: exchangeRates } = useExchangeRate()
  const usdRate = exchangeRates?.USD?.baseRate ?? 1400
  const cnyRate = exchangeRates?.CNY?.baseRate ?? 190

  // 첫 번째 업체 자동 선택
  useEffect(() => {
    if (companies && companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0]._id)
    }
  }, [companies, selectedCompanyId])

  // 기본 운임 타입 자동 선택
  useEffect(() => {
    if (defaultRateType && !selectedRateTypeId) {
      setSelectedRateTypeId(defaultRateType._id)
    } else if (rateTypes && rateTypes.length > 0 && !selectedRateTypeId) {
      setSelectedRateTypeId(rateTypes[0]._id)
    }
  }, [rateTypes, defaultRateType, selectedRateTypeId])

  // 업체 변경 시 운임 타입 초기화
  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId as Id<"shippingCompanies">)
    setSelectedRateTypeId(null)
  }

  // 계산 결과
  const [result, setResult] = useState<{
    cbm: number
    weightKg: number
    weightTon: number
    measurementTon: number
    rTon: number
    roundedRTon: number
    isWeightBased: boolean
    // 예상 배송비
    inlandShipping: number           // 중국 내륙 운송료 (KRW)
    inlandShippingUSD: number        // 중국 내륙 운송료 (USD)
    internationalShipping: number    // 국제 운송료 (KRW)
    internationalShippingForeign: number  // 국제 운송료 (외화)
    internationalShippingCurrency: string // 국제 운송료 통화
    domesticShipping: number
    threePLCost: number
    totalShippingCost: number
  } | null>(null)

  // 계산 로직
  useEffect(() => {
    let cbm = 0
    let weightKg = 0

    if (inputMode === "per_box") {
      // 포장 별 입력 계산
      if (boxWidth > 0 && boxHeight > 0 && boxDepth > 0 && boxQuantity > 0) {
        const unitCbm = (boxWidth * boxHeight * boxDepth) / 1_000_000
        cbm = unitCbm * boxQuantity
        const unitWeightKg = boxWeight > 0 ? convertToKgExtended(boxWeight, boxWeightUnit) : 0
        weightKg = unitWeightKg * boxQuantity
      } else {
        setResult(null)
        return
      }
    } else {
      // 총 부피 & 중량 입력 계산
      if (totalCbm > 0 || totalWeight > 0) {
        cbm = totalCbm
        weightKg = convertToKgExtended(totalWeight, totalWeightUnit)
      } else {
        setResult(null)
        return
      }
    }

    // W/T, M/T, R.TON 계산
    const weightTon = calculateWeightTon(weightKg)
    const measurementTon = cbm
    const rTon = calculateRTon(weightTon, measurementTon)

    // ===== 예상 배송비 계산 =====

    // 1. 중국 내륙 운송료 (USD → KRW)
    const inlandShippingUSDValue = calculateInlandShipping(rTon, inlandConfig ?? undefined)
    const inlandShipping = Math.round(inlandShippingUSDValue * usdRate)

    // 2. 국제 운송료 (운임 테이블 기반)
    let internationalShipping = 0
    let internationalShippingForeign = 0
    let roundedRTon = roundCbmToHalf(rTon) // 기본값: 0.5 올림

    if (shippingRates && shippingRates.length > 0) {
      // 기존 데이터(rateUSD)와 새 데이터(rate) 호환성 처리
      const validRates = shippingRates
        .filter(r => r.cbm !== undefined)
        .map(r => {
          const rateValue = (r as { rate?: number; rateUSD?: number }).rate
            ?? (r as { rate?: number; rateUSD?: number }).rateUSD
            ?? 0
          return { cbm: r.cbm, rate: rateValue }
        })
        .filter(r => r.rate > 0)

      if (validRates.length > 0) {
        const shippingResult = findShippingRate(validRates, rTon)
        if (shippingResult && !isNaN(shippingResult.rate)) {
          // 운임 테이블에서 매칭된 CBM이 적용값
          roundedRTon = shippingResult.cbm
          internationalShippingForeign = shippingResult.rate

          // 통화별 환율 적용
          if (rateTypeCurrency === "KRW") {
            internationalShipping = shippingResult.rate
          } else if (rateTypeCurrency === "CNY") {
            internationalShipping = Math.round(shippingResult.rate * cnyRate)
          } else {
            internationalShipping = Math.round(shippingResult.rate * usdRate)
          }
        }
      }
    }

    // 3. 국내 운송료
    const domesticShipping = calculateDomesticShipping(rTon, domesticConfig ?? undefined)

    // 4. 3PL 비용 + 배송비
    const threePLCost = calculate3PLCost(rTon, threePLConfig ?? undefined)

    // 총 예상 배송비 (NaN 방지)
    const safeInland = isNaN(inlandShipping) ? 0 : inlandShipping
    const safeInternational = isNaN(internationalShipping) ? 0 : internationalShipping
    const safeDomestic = isNaN(domesticShipping) ? 0 : domesticShipping
    const safeThreePL = isNaN(threePLCost) ? 0 : threePLCost
    const totalShippingCost = safeInland + safeInternational + safeDomestic + safeThreePL

    setResult({
      cbm,
      weightKg,
      weightTon,
      measurementTon,
      rTon,
      roundedRTon,
      isWeightBased: weightTon > measurementTon,
      inlandShipping: safeInland,
      inlandShippingUSD: inlandShippingUSDValue,
      internationalShipping: safeInternational,
      internationalShippingForeign,
      internationalShippingCurrency: rateTypeCurrency,
      domesticShipping: safeDomestic,
      threePLCost: safeThreePL,
      totalShippingCost,
    })
  }, [
    inputMode,
    boxWidth,
    boxHeight,
    boxDepth,
    boxWeight,
    boxWeightUnit,
    boxQuantity,
    totalCbm,
    totalWeight,
    totalWeightUnit,
    shippingRates,
    rateTypeCurrency,
    usdRate,
    cnyRate,
    inlandConfig,
    domesticConfig,
    threePLConfig,
  ])

  // 모달 닫힐 때 상태 초기화
  const handleClose = () => {
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 배경 오버레이 (애니메이션) */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* 모달 컨텐츠 (애니메이션) */}
          <motion.div
            className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">패키징 계산</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-4 space-y-4">
          {/* 입력 모드 선택 (애니메이션 적용) */}
          <div className="flex gap-2">
            <motion.button
              type="button"
              onClick={() => setInputMode("per_box")}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
                inputMode === "per_box"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              whileTap={{ scale: 0.98 }}
            >
              포장 별 입력
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setInputMode("total")}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
                inputMode === "total"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              whileTap={{ scale: 0.98 }}
            >
              총 부피 & 중량 입력
            </motion.button>
          </div>

          {/* 포장 별 입력 (애니메이션 적용) */}
          <AnimatePresence mode="wait">
            {inputMode === "per_box" && (
              <motion.div
                key="per_box"
                className="space-y-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
              {/* 박스 크기 */}
              <div>
                <Label className="text-xs text-gray-500">박스 크기 (cm)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <NumberInput
                    value={boxWidth}
                    onChange={(v) => setBoxWidth(parseFloat(v) || 0)}
                    min={0}
                    max={500}
                    step={1}
                    decimal={1}
                    placeholder="가로"
                    align="center"
                  />
                  <span className="text-gray-400">×</span>
                  <NumberInput
                    value={boxHeight}
                    onChange={(v) => setBoxHeight(parseFloat(v) || 0)}
                    min={0}
                    max={500}
                    step={1}
                    decimal={1}
                    placeholder="세로"
                    align="center"
                  />
                  <span className="text-gray-400">×</span>
                  <NumberInput
                    value={boxDepth}
                    onChange={(v) => setBoxDepth(parseFloat(v) || 0)}
                    min={0}
                    max={500}
                    step={1}
                    decimal={1}
                    placeholder="높이"
                    align="center"
                  />
                </div>
              </div>

              {/* 박스 수량 + 무게 (1행 3열: 수량, 무게, 단위) */}
              <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 80px' }}>
                <div>
                  <Label className="text-xs text-gray-500">박스 수량</Label>
                  <NumberInput
                    value={boxQuantity}
                    onChange={(v) => setBoxQuantity(parseInt(v) || 0)}
                    min={0}
                    max={10000}
                    step={1}
                    decimal={0}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-500">박스 무게</Label>
                  <NumberInput
                    value={boxWeight}
                    onChange={(v) => setBoxWeight(parseFloat(v) || 0)}
                    min={0}
                    max={boxWeightUnit === "g" ? 100000 : boxWeightUnit === "ton" ? 100 : 1000}
                    step={boxWeightUnit === "g" ? 1 : boxWeightUnit === "ton" ? 0.1 : 1}
                    decimal={boxWeightUnit === "g" ? 0 : 2}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-500">단위</Label>
                  <Select
                    value={boxWeightUnit}
                    onValueChange={(v) => setBoxWeightUnit(v as ExtendedWeightUnit)}
                  >
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="ton">ton</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              </motion.div>
            )}

            {/* 총 부피 & 중량 입력 (애니메이션 적용) */}
            {inputMode === "total" && (
              <motion.div
                key="total"
                className="grid gap-2"
                style={{ gridTemplateColumns: '1fr 1fr 80px' }}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
              <div>
                <Label className="text-xs text-gray-500">총 부피 (CBM)</Label>
                <NumberInput
                  value={totalCbm}
                  onChange={(v) => setTotalCbm(parseFloat(v) || 0)}
                  min={0}
                  max={1000}
                  step={0.01}
                  decimal={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs text-gray-500">총 중량</Label>
                <NumberInput
                  value={totalWeight}
                  onChange={(v) => setTotalWeight(parseFloat(v) || 0)}
                  min={0}
                  max={totalWeightUnit === "g" ? 10000000 : totalWeightUnit === "ton" ? 1000 : 10000}
                  step={totalWeightUnit === "g" ? 1 : totalWeightUnit === "ton" ? 0.1 : 1}
                  decimal={totalWeightUnit === "g" ? 0 : 2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs text-gray-500">단위</Label>
                <Select
                  value={totalWeightUnit}
                  onValueChange={(v) => setTotalWeightUnit(v as ExtendedWeightUnit)}
                >
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="ton">ton</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 운송 업체 / 운임 타입 선택 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">운송 업체</Label>
              <Select
                value={selectedCompanyId ?? undefined}
                onValueChange={handleCompanyChange}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="업체 선택" />
                </SelectTrigger>
                <SelectContent>
                  {companies?.map((company) => (
                    <SelectItem key={company._id} value={company._id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">운임 타입</Label>
              <Select
                value={selectedRateTypeId ?? undefined}
                onValueChange={(v) => setSelectedRateTypeId(v as Id<"shippingRateTypes">)}
                disabled={!selectedCompanyId || !rateTypes?.length}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="운임 타입 선택" />
                </SelectTrigger>
                <SelectContent>
                  {rateTypes?.map((type) => (
                    <SelectItem key={type._id} value={type._id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 계산 결과 */}
          {result && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {/* R.TON 결과 (강조) */}
              <div className="text-center">
                <span className="text-sm text-gray-500">R.TON (CBM)</span>
                <div className="text-3xl font-bold text-primary mt-1">
                  {result.rTon.toFixed(2)}
                </div>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">
                    {result.isWeightBased ? "중량 기준" : "부피 기준"}
                  </span>
                  <span className="text-xs text-gray-300">|</span>
                  <span className="text-xs text-gray-500">
                    적용: <span className="font-medium">{result.roundedRTon.toFixed(1)}</span>
                  </span>
                </div>
              </div>

              {/* 상세 정보 */}
              <div className="border-t border-gray-200 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">총 부피 (CBM)</span>
                  <span className="font-mono text-gray-700">{result.cbm.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">총 중량</span>
                  <span className="font-mono text-gray-700">{result.weightKg.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">W/T (중량)</span>
                  <span className={`font-mono ${result.isWeightBased ? "text-primary font-medium" : "text-gray-700"}`}>
                    {result.weightTon.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">M/T (부피)</span>
                  <span className={`font-mono ${!result.isWeightBased ? "text-primary font-medium" : "text-gray-700"}`}>
                    {result.measurementTon.toFixed(4)}
                  </span>
                </div>
              </div>

              {/* 예상 배송비 */}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">예상 배송비</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">중국 내륙 운송료</span>
                    <span className="font-mono text-gray-700">
                      {formatNumberWithCommas(result.inlandShipping)}원
                      <span className="text-xs text-gray-400 ml-1">(${result.inlandShippingUSD.toFixed(2)})</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      국제 운송료
                      {shippingRatesLoading && <span className="text-xs text-gray-400 ml-1">(로딩중...)</span>}
                      {!shippingRatesLoading && (!shippingRates || shippingRates.length === 0) && (
                        <span className="text-xs text-orange-500 ml-1">(운임 데이터 없음)</span>
                      )}
                    </span>
                    <span className="font-mono text-gray-700">
                      {formatNumberWithCommas(result.internationalShipping)}원
                      {result.internationalShippingCurrency !== "KRW" && result.internationalShippingForeign > 0 && (
                        <span className="text-xs text-gray-400 ml-1">
                          ({result.internationalShippingCurrency === "USD" ? "$" : "¥"}
                          {result.internationalShippingForeign.toFixed(2)})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">국내 운송료</span>
                    <span className="font-mono text-gray-700">{formatNumberWithCommas(result.domesticShipping)}원</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">3PL 비용 + 배송비</span>
                    <span className="font-mono text-gray-700">{formatNumberWithCommas(result.threePLCost)}원</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium pt-2 border-t border-gray-200">
                    <span className="text-gray-700">총 예상 배송비</span>
                    <span className="font-mono text-primary">{formatNumberWithCommas(result.totalShippingCost)}원</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 결과 없을 때 안내 */}
          {!result && (
            <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-400 text-sm">
              {inputMode === "per_box"
                ? "박스 크기와 수량을 입력하세요"
                : "총 부피 또는 총 중량을 입력하세요"}
            </div>
          )}
        </div>

          {/* 푸터 */}
          <div className="px-4 py-3 border-t border-gray-200">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleClose}
            >
              닫기
            </Button>
          </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
