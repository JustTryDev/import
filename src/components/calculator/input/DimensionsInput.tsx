"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronUp, ChevronDown } from "lucide-react"
import { ProductDimensions } from "@/types/shipping"

interface DimensionsInputProps {
  dimensions: ProductDimensions
  setDimensions: (dimensions: ProductDimensions) => void
}

// 제품 크기 입력 컴포넌트 (가로 x 높이 x 폭)
export function DimensionsInput({
  dimensions,
  setDimensions,
}: DimensionsInputProps) {
  // 숫자 입력 처리
  const handleChange = (
    field: keyof ProductDimensions,
    value: string
  ) => {
    const numericValue = value.replace(/[^0-9.]/g, "")
    const num = numericValue === "" ? 0 : Number(numericValue)
    setDimensions({ ...dimensions, [field]: num })
  }

  // 증가/감소 처리
  const handleIncrement = (field: keyof ProductDimensions) => {
    const currentValue = dimensions[field] || 0
    setDimensions({ ...dimensions, [field]: currentValue + 1 })
  }

  const handleDecrement = (field: keyof ProductDimensions) => {
    const currentValue = dimensions[field] || 0
    if (currentValue > 0) {
      setDimensions({ ...dimensions, [field]: currentValue - 1 })
    }
  }

  // 입력 필드 + 카운터 버튼 컴포넌트
  const DimensionField = ({
    id,
    label,
    field,
  }: {
    id: string
    label: string
    field: keyof ProductDimensions
  }) => (
    <div className="flex-1">
      <Label htmlFor={id} className="text-xs text-gray-500">
        {label}
      </Label>
      <div className="relative mt-1">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={dimensions[field] || ""}
          onChange={(e) => handleChange(field, e.target.value)}
          className="text-center pr-7"
        />
        {/* 입력칸 안쪽 오른쪽 카운터 버튼 */}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => handleIncrement(field)}
            className="h-4 w-5 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDecrement(field)}
            className="h-4 w-5 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">
        제품 단일 크기 <span className="text-xs text-gray-400">(cm)</span>
      </h3>

      <div className="flex items-center gap-2">
        {/* 가로 */}
        <DimensionField id="width" label="가로" field="width" />

        <span className="text-gray-400 mt-5">×</span>

        {/* 높이 */}
        <DimensionField id="height" label="높이" field="height" />

        <span className="text-gray-400 mt-5">×</span>

        {/* 폭 */}
        <DimensionField id="depth" label="폭" field="depth" />
      </div>
    </div>
  )
}
