"use client"

import { formatNumberWithCommas } from "@/lib/format"
import { Calculator } from "lucide-react"

interface TotalCostCardProps {
  totalCost: number | null
  unitCost: number | null
  quantity: number
}

// 총 수입원가 표시 카드 컴포넌트
export function TotalCostCard({ totalCost, unitCost, quantity }: TotalCostCardProps) {
  if (totalCost === null || unitCost === null) {
    return (
      <div className="bg-gray-100 rounded-xl p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-gray-400 mb-2">
          <Calculator className="h-5 w-5" />
          <span className="text-sm font-medium">수입 원가</span>
        </div>
        <p className="text-gray-400 text-sm">
          정보를 입력하면 계산됩니다
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 text-white">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Calculator className="h-5 w-5" />
        <span className="text-sm font-medium opacity-90">수입 원가</span>
      </div>

      {/* 총액 */}
      <div className="text-center mb-4">
        <span className="text-3xl font-bold">
          {formatNumberWithCommas(totalCost)}
        </span>
        <span className="text-lg ml-1">원</span>
      </div>

      {/* 개당 원가 */}
      <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
        <span className="text-sm opacity-90">최종 단가 : </span>
        <span className="font-bold">
          {formatNumberWithCommas(unitCost)}원
        </span>
        <span className="text-sm opacity-75 ml-1">
          ({formatNumberWithCommas(quantity)}개)
        </span>
      </div>
    </div>
  )
}
