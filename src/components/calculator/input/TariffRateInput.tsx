"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronUp, ChevronDown } from "lucide-react"

interface TariffRateInputProps {
  basicTariffRate: number           // 기본 관세율
  setBasicTariffRate: (rate: number) => void
  ftaTariffRate: number             // 한-중 FTA 관세율
  setFtaTariffRate: (rate: number) => void
  useFta: boolean                   // 적용할 관세 선택 (true=FTA)
  setUseFta: (use: boolean) => void
}

// 관세율 입력 컴포넌트 (기본/FTA 2개 필드)
export function TariffRateInput({
  basicTariffRate,
  setBasicTariffRate,
  ftaTariffRate,
  setFtaTariffRate,
  useFta,
  setUseFta,
}: TariffRateInputProps) {
  // 기본 관세율 변경
  const handleBasicRateChange = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, "")
    const rate = numericValue === "" ? 0 : Number(numericValue)
    setBasicTariffRate(Math.min(100, Math.max(0, rate)))
  }

  // 한-중 FTA 관세율 변경
  const handleFtaRateChange = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, "")
    const rate = numericValue === "" ? 0 : Number(numericValue)
    setFtaTariffRate(Math.min(100, Math.max(0, rate)))
  }

  // 증가/감소 처리 (1% 단위)
  const handleBasicIncrement = () => {
    setBasicTariffRate(Math.min(100, basicTariffRate + 1))
  }
  const handleBasicDecrement = () => {
    setBasicTariffRate(Math.max(0, basicTariffRate - 1))
  }
  const handleFtaIncrement = () => {
    setFtaTariffRate(Math.min(100, ftaTariffRate + 1))
  }
  const handleFtaDecrement = () => {
    setFtaTariffRate(Math.max(0, ftaTariffRate - 1))
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">관세율</h3>

      {/* 2열 그리드: 기본 관세율 / 한-중 FTA 관세율 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 기본 관세율 필드 */}
        <div>
          <Label htmlFor="basicTariffRate" className="text-xs text-gray-500">
            기본 관세율 (%)
          </Label>
          <div className="relative mt-1">
            <Input
              id="basicTariffRate"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={basicTariffRate || ""}
              onChange={(e) => handleBasicRateChange(e.target.value)}
              className={`text-right pr-14 ${!useFta ? "ring-2 ring-primary" : ""}`}
            />
            {/* % 기호 */}
            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400">
              %
            </span>
            {/* 증감 버튼 */}
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
              <button
                type="button"
                onClick={handleBasicIncrement}
                className="h-4 w-5 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleBasicDecrement}
                className="h-4 w-5 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 한-중 FTA 관세율 필드 */}
        <div>
          <Label htmlFor="ftaTariffRate" className="text-xs text-gray-500">
            한-중 FTA 관세율 (%)
          </Label>
          <div className="relative mt-1">
            <Input
              id="ftaTariffRate"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={ftaTariffRate || ""}
              onChange={(e) => handleFtaRateChange(e.target.value)}
              className={`text-right pr-14 ${useFta ? "ring-2 ring-primary" : ""}`}
            />
            {/* % 기호 */}
            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400">
              %
            </span>
            {/* 증감 버튼 */}
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
              <button
                type="button"
                onClick={handleFtaIncrement}
                className="h-4 w-5 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleFtaDecrement}
                className="h-4 w-5 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FTA 적용 체크박스 */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="useFta"
          checked={useFta}
          onCheckedChange={(checked) => setUseFta(!!checked)}
        />
        <Label htmlFor="useFta" className="text-xs text-gray-600 cursor-pointer">
          한-중 FTA 관세율 적용
        </Label>
      </div>

    </div>
  )
}
