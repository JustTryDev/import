"use client"

import { formatNumberWithCommas } from "@/lib/format"
import { Calculator, Package } from "lucide-react"

interface TotalCostCardProps {
  totalCost: number | null
  unitCost: number | null
  quantity: number
  productCount?: number  // 다중 제품 지원: 제품 개수
}

/**
 * 총 수입원가 표시 카드 컴포넌트
 *
 * 📌 비유: 마트 계산대의 영수증 상단
 * - 총 결제 금액이 크게 표시됨
 * - 단일 제품: 개당 단가 표시
 * - 다중 제품: 제품 개수와 총 수량 표시 (개당 단가는 각 제품 카드에서)
 */
export function TotalCostCard({
  totalCost,
  unitCost,
  quantity,
  productCount = 1,
}: TotalCostCardProps) {
  // 결과가 없을 때 표시
  if (totalCost === null) {
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

  // 다중 제품 여부
  const isMultiProduct = productCount > 1

  return (
    <div className="bg-gray-900 rounded-xl p-6 text-white">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Calculator className="h-5 w-5" />
        <span className="text-sm font-medium opacity-90">총 수입 원가</span>
      </div>

      {/* 총액 */}
      <div className="text-center mb-4">
        <span className="text-3xl font-bold">
          {formatNumberWithCommas(totalCost)}
        </span>
        <span className="text-lg ml-1">원</span>
      </div>

      {/* 다중 제품 정보 또는 개당 원가 */}
      <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
        {isMultiProduct ? (
          // 다중 제품: 제품 개수와 총 수량 표시
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4 opacity-75" />
              <span className="text-sm opacity-90">제품</span>
              <span className="font-bold">{productCount}종</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div>
              <span className="text-sm opacity-90">총 수량</span>
              <span className="font-bold ml-1">
                {formatNumberWithCommas(quantity)}개
              </span>
            </div>
          </div>
        ) : unitCost !== null ? (
          // 단일 제품: 개당 원가 표시
          <>
            <span className="text-sm opacity-90">최종 단가 : </span>
            <span className="font-bold">
              {formatNumberWithCommas(unitCost)}원
            </span>
            <span className="text-sm opacity-75 ml-1">
              ({formatNumberWithCommas(quantity)}개)
            </span>
          </>
        ) : (
          // 개당 원가 계산 불가
          <span className="text-sm opacity-75">
            총 {formatNumberWithCommas(quantity)}개
          </span>
        )}
      </div>
    </div>
  )
}
