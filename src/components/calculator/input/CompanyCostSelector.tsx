"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { formatNumberWithCommas } from "@/lib/format"
import { Id } from "../../../../convex/_generated/dataModel"
import { CompanyCostItem } from "@/types/shipping"

interface CompanyCostSelectorProps {
  items: CompanyCostItem[] | undefined
  selectedIds: Id<"companyCostItems">[]
  setSelectedIds: (ids: Id<"companyCostItems">[]) => void
  orderCount: number
  setOrderCount: (count: number) => void
  isLoading?: boolean
}

// 업체별 공통 비용 선택 컴포넌트
export function CompanyCostSelector({
  items,
  selectedIds,
  setSelectedIds,
  orderCount,
  setOrderCount,
  isLoading,
}: CompanyCostSelectorProps) {
  // 체크박스 토글 처리
  const handleToggle = (itemId: Id<"companyCostItems">, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, itemId])
    } else {
      setSelectedIds(selectedIds.filter((id) => id !== itemId))
    }
  }

  // 주문 건수 변경
  const handleOrderCountChange = (value: string) => {
    const num = parseInt(value.replace(/[^0-9]/g, ""), 10)
    setOrderCount(isNaN(num) || num < 1 ? 1 : num)
  }

  if (isLoading || !items) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">공통 비용</h3>
        <div className="text-sm text-gray-400">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">공통 비용</h3>

      {items.length === 0 ? (
        <div className="text-sm text-gray-400 py-2">
          비용 항목이 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const isSelected = selectedIds.includes(item._id)
            // 분할 적용 시 금액 계산
            const displayAmount = item.isDivisible && orderCount > 1
              ? Math.round(item.defaultAmount / orderCount)
              : item.defaultAmount

            return (
              <div
                key={item._id}
                className="flex items-center justify-between gap-2 py-1 min-w-0"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Checkbox
                    id={item._id}
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleToggle(item._id, checked as boolean)
                    }
                    className="shrink-0"
                  />
                  <Label
                    htmlFor={item._id}
                    className="text-sm text-gray-600 cursor-pointer truncate min-w-0"
                    title={item.name}
                  >
                    {item.name}
                    {item.isDivisible && (
                      <span className="text-xs text-gray-400 ml-1">
                        (÷{orderCount})
                      </span>
                    )}
                  </Label>
                </div>
                <span className={`text-sm shrink-0 ${isSelected ? "text-gray-900" : "text-gray-400"}`}>
                  {formatNumberWithCommas(displayAmount)}원
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* 주문 건수 입력 */}
      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <Label htmlFor="orderCount" className="text-xs text-gray-500 truncate min-w-0">
            주문 수
          </Label>
          <Input
            id="orderCount"
            type="text"
            inputMode="numeric"
            value={orderCount}
            onChange={(e) => handleOrderCountChange(e.target.value)}
            className="w-16 text-center h-8 shrink-0"
          />
        </div>
      </div>
    </div>
  )
}
