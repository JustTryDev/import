"use client"

import { Box } from "lucide-react"
import { formatCbm } from "@/lib/calculations/cbm"

interface CBMDisplayProps {
  unitCbm: number | null
  totalCbm: number | null
  roundedCbm: number | null
}

// CBM 계산 결과 표시 컴포넌트
export function CBMDisplay({ unitCbm, totalCbm, roundedCbm }: CBMDisplayProps) {
  if (unitCbm === null || totalCbm === null) {
    return (
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Box className="h-5 w-5" />
          <span className="text-sm font-medium">CBM 계산 결과</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          제품 크기와 수량을 입력하세요
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 text-white">
      <div className="flex items-center gap-2">
        <Box className="h-5 w-5" />
        <span className="text-sm font-medium">CBM 계산 결과</span>
      </div>

      <div className="mt-3 space-y-2">
        {/* 단위 CBM (제품 1개) */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-white/70">단위 CBM</span>
          <span className="text-sm font-medium">
            {formatCbm(unitCbm)} CBM
          </span>
        </div>

        {/* 총 CBM */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-white/70">총 CBM</span>
          <span className="text-sm font-medium">
            {formatCbm(totalCbm)} CBM
          </span>
        </div>

        {/* 적용 CBM (0.5 단위 올림) */}
        {roundedCbm !== null && roundedCbm !== totalCbm && (
          <div className="flex justify-between items-center pt-2 border-t border-white/20">
            <span className="text-xs text-white/70">적용 CBM (0.5↑)</span>
            <span className="text-sm font-bold">
              {roundedCbm.toFixed(1)} CBM
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
