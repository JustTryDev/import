"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
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
import { calculateRTon, calculateWeightTon } from "@/lib/calculations"

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

  // 계산 결과
  const [result, setResult] = useState<{
    cbm: number
    weightKg: number
    weightTon: number
    measurementTon: number
    rTon: number
    isWeightBased: boolean
  } | null>(null)

  // 계산 로직
  useEffect(() => {
    if (inputMode === "per_box") {
      // 포장 별 입력 계산
      if (boxWidth > 0 && boxHeight > 0 && boxDepth > 0 && boxQuantity > 0) {
        // CBM 계산: (가로 × 세로 × 높이) / 1,000,000 × 수량
        const unitCbm = (boxWidth * boxHeight * boxDepth) / 1_000_000
        const cbm = unitCbm * boxQuantity

        // 중량 계산 (kg) - 무게 미입력 시 0
        const unitWeightKg = boxWeight > 0 ? convertToKgExtended(boxWeight, boxWeightUnit) : 0
        const weightKg = unitWeightKg * boxQuantity

        // W/T, M/T, R.TON 계산
        // 무게 미입력 시 W/T = 0, R.TON = CBM
        const weightTon = calculateWeightTon(weightKg)
        const measurementTon = cbm
        const rTon = calculateRTon(weightTon, measurementTon)

        setResult({
          cbm,
          weightKg,
          weightTon,
          measurementTon,
          rTon,
          isWeightBased: weightTon > measurementTon,
        })
      } else {
        setResult(null)
      }
    } else {
      // 총 부피 & 중량 입력 계산
      if (totalCbm > 0 || totalWeight > 0) {
        const weightKg = convertToKgExtended(totalWeight, totalWeightUnit)
        const weightTon = calculateWeightTon(weightKg)
        const measurementTon = totalCbm
        const rTon = calculateRTon(weightTon, measurementTon)

        setResult({
          cbm: totalCbm,
          weightKg,
          weightTon,
          measurementTon,
          rTon,
          isWeightBased: weightTon > measurementTon,
        })
      } else {
        setResult(null)
      }
    }
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
  ])

  // 모달 닫힐 때 상태 초기화
  const handleClose = () => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
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
          {/* 입력 모드 선택 */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInputMode("per_box")}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
                inputMode === "per_box"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              포장 별 입력
            </button>
            <button
              type="button"
              onClick={() => setInputMode("total")}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
                inputMode === "total"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              총 부피 & 중량 입력
            </button>
          </div>

          {/* 포장 별 입력 */}
          {inputMode === "per_box" && (
            <div className="space-y-3">
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
            </div>
          )}

          {/* 총 부피 & 중량 입력 (1행 3열: 부피, 중량 동일 너비 + 단위) */}
          {inputMode === "total" && (
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 80px' }}>
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
            </div>
          )}

          {/* 계산 결과 */}
          {result && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {/* R.TON 결과 (강조) */}
              <div className="text-center">
                <span className="text-sm text-gray-500">R.TON (CBM)</span>
                <div className="text-3xl font-bold text-primary mt-1">
                  {result.rTon.toFixed(2)}
                </div>
                <span className="text-xs text-gray-400">
                  {result.isWeightBased ? "중량 기준" : "부피 기준"}
                </span>
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
      </div>
    </div>
  )
}
