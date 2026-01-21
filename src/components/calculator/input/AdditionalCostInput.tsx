"use client"

import { useEffect, useMemo, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Settings, Plus, X, Trash2, Save, Bookmark, Link2 } from "lucide-react"
import { Id } from "../../../../convex/_generated/dataModel"
import type { FactoryPreset } from "@/hooks/useFactoryPresets"
import type { Product } from "@/types/shipping"

// 공장 비용 항목 타입
export interface FactoryCostItem {
  _id: Id<"factoryCostItems">
  factoryId: Id<"factories">
  name: string
  amount: number
}

// 공장 슬롯 타입
export interface FactorySlot {
  factoryId: Id<"factories"> | null
  selectedItemIds: string[] // 체크된 비용 항목 IDs
  costValues: { [itemId: string]: number } // 금액 값
  // 다중 제품 지원용
  quantityValues?: { [itemId: string]: number } // 수량 값 (수량연동 항목용)
  linkedProductIds?: string[] // 연결된 제품 ID 목록 (비용 분배용)
}

// 공장 타입
interface Factory {
  _id: Id<"factories">
  name: string
  currency: string
}

interface AdditionalCostInputProps {
  slots: FactorySlot[]
  setSlots: (slots: FactorySlot[]) => void
  factories?: Factory[]
  factoryCostItemsMap: Map<string, FactoryCostItem[]> // factoryId -> costItems
  onSettingsClick?: () => void
  isLoading?: boolean
  // 환율 정보 (계산용)
  usdRate: number | null
  cnyRate: number | null
  // 프리셋 관련
  presets?: FactoryPreset[]
  selectedPresetId?: Id<"factoryPresets"> | null  // 현재 선택된 프리셋
  onLoadPreset?: (preset: FactoryPreset) => void
  onSavePreset?: () => void
  // 다중 제품 연결용
  products?: Product[]  // 제품 목록 (연결된 제품 체크박스용)
}

// 단일 공장 슬롯 컴포넌트
function FactorySlotInput({
  slotIndex,
  slot,
  factories,
  factoryCostItems,
  factoryCurrency,
  selectedFactoryIds,
  onFactoryChange,
  onItemToggle,
  onAmountChange,
  onItemDelete,
  onRemove,
  canRemove,
  // 다중 제품 연결용
  products,
  onLinkedProductsChange,
}: {
  slotIndex: number
  slot: FactorySlot
  factories?: Factory[]
  factoryCostItems?: FactoryCostItem[]
  factoryCurrency: string
  selectedFactoryIds: string[]
  onFactoryChange: (factoryId: string | null) => void
  onItemToggle: (itemId: string, checked: boolean) => void
  onAmountChange: (itemId: string, value: string) => void
  onItemDelete: (itemId: string) => void
  onRemove: () => void
  canRemove: boolean
  // 다중 제품 연결용
  products?: Product[]
  onLinkedProductsChange?: (productIds: string[]) => void
}) {
  // 금액 표시
  const getDisplayValue = (itemId: string): string => {
    const amount = slot.costValues[itemId]
    if (amount === undefined || amount === 0) return ""
    return amount.toString()
  }

  // 연결된 제품 토글
  const handleProductLinkToggle = (productId: string, checked: boolean) => {
    if (!onLinkedProductsChange) return

    const currentLinked = slot.linkedProductIds ?? []
    let newLinked: string[]

    if (checked) {
      newLinked = [...currentLinked, productId]
    } else {
      newLinked = currentLinked.filter((id) => id !== productId)
    }

    onLinkedProductsChange(newLinked)
  }

  // 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    if (!onLinkedProductsChange || !products) return

    if (checked) {
      onLinkedProductsChange(products.map((p) => p.id))
    } else {
      onLinkedProductsChange([])
    }
  }

  // 현재 연결 상태 (기본값: 모두 연결)
  const linkedIds = slot.linkedProductIds ?? products?.map((p) => p.id) ?? []
  const isAllSelected = products ? linkedIds.length === products.length : false
  const hasProducts = products && products.length > 0
  const hasMultipleProducts = products && products.length > 1

  return (
    <div className="p-3 border border-gray-100 rounded-lg space-y-2">
      {/* 공장 선택 헤더 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <Select
            value={slot.factoryId ?? "none"}
            onValueChange={(v) => onFactoryChange(v === "none" ? null : v)}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue placeholder={`공장 ${slotIndex + 1} 선택`} className="truncate" />
            </SelectTrigger>
            <SelectContent className="max-w-[200px]">
              <SelectItem value="none">선택 안함</SelectItem>
              {factories?.map((factory) => {
                // 다른 슬롯에서 이미 선택된 공장은 비활성화
                const isDisabled = selectedFactoryIds.includes(factory._id) && slot.factoryId !== factory._id
                return (
                  <SelectItem
                    key={factory._id}
                    value={factory._id}
                    disabled={isDisabled}
                    className="truncate"
                  >
                    <span className="truncate">{factory.name} ({factory.currency}){isDisabled ? " ✓" : ""}</span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 연결된 제품 (공장 선택 + 제품 2개 이상일 때만 표시) */}
      {slot.factoryId && hasMultipleProducts && (
        <div className="bg-blue-50/50 rounded px-2 py-1.5 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <Link2 className="h-3 w-3" />
              <span>연결 제품</span>
            </div>
            <button
              type="button"
              onClick={() => handleSelectAll(!isAllSelected)}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              {isAllSelected ? "전체 해제" : "전체 선택"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {products?.map((product, idx) => {
              const isLinked = linkedIds.includes(product.id)
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleProductLinkToggle(product.id, !isLinked)}
                  className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                    isLinked
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-500 border border-gray-200 hover:border-blue-300"
                  }`}
                >
                  제품{idx + 1}
                </button>
              )
            })}
          </div>
          {linkedIds.length === 0 && (
            <p className="text-xs text-orange-500">최소 1개 제품을 연결해주세요</p>
          )}
        </div>
      )}

      {/* 비용 항목 (공장 선택 시) */}
      {slot.factoryId && factoryCostItems && factoryCostItems.length > 0 && (
        <div className="space-y-1.5 pl-1">
          {factoryCostItems.map((item) => {
            const isChecked = slot.selectedItemIds.includes(item._id)
            return (
              <div key={item._id} className="flex items-center gap-1">
                <Checkbox
                  id={`${slotIndex}-${item._id}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => onItemToggle(item._id, !!checked)}
                  className="h-4 w-4"
                />
                <Label
                  htmlFor={`${slotIndex}-${item._id}`}
                  className="text-xs text-gray-600 w-20 truncate cursor-pointer"
                  title={item.name}
                >
                  {item.name}
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={getDisplayValue(item._id)}
                  onChange={(e) => onAmountChange(item._id, e.target.value)}
                  disabled={!isChecked}
                  className={`flex-1 h-7 text-sm text-right ${!isChecked ? "bg-gray-50 text-gray-400" : ""}`}
                />
                <span className="text-xs text-gray-400 w-8">{factoryCurrency}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onItemDelete(item._id)}
                  className="h-6 w-6 p-0 text-gray-300 hover:text-red-500"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* 비용 항목 없음 */}
      {slot.factoryId && (!factoryCostItems || factoryCostItems.length === 0) && (
        <p className="text-xs text-gray-400 pl-1">등록된 비용 항목이 없습니다</p>
      )}
    </div>
  )
}

// 부대 비용 입력 메인 컴포넌트
export function AdditionalCostInput({
  slots,
  setSlots,
  factories,
  factoryCostItemsMap,
  onSettingsClick,
  isLoading,
  usdRate,
  cnyRate,
  presets,
  selectedPresetId,
  onLoadPreset,
  onSavePreset,
  products,
}: AdditionalCostInputProps) {
  // 확장 상태 (기본 3개, 확장 시 6개)
  const visibleSlotCount = slots.length

  // 공장 선택 변경
  const handleFactoryChange = useCallback((slotIndex: number, factoryId: string | null) => {
    const newSlots = [...slots]
    const factory = factories?.find((f) => f._id === factoryId)
    const costItems = factoryId ? factoryCostItemsMap.get(factoryId) : undefined

    // 새 슬롯 데이터
    const newSlot: FactorySlot = {
      factoryId: factoryId as Id<"factories"> | null,
      selectedItemIds: [],
      costValues: {},
    }

    // 비용 항목 기본값 적용 (모두 선택)
    if (costItems) {
      costItems.forEach((item) => {
        newSlot.selectedItemIds.push(item._id)
        newSlot.costValues[item._id] = item.amount
      })
    }

    newSlots[slotIndex] = newSlot
    setSlots(newSlots)
  }, [slots, setSlots, factories, factoryCostItemsMap])

  // 비용 항목 체크 토글
  const handleItemToggle = useCallback((slotIndex: number, itemId: string, checked: boolean) => {
    const newSlots = [...slots]
    const slot = { ...newSlots[slotIndex] }

    if (checked) {
      slot.selectedItemIds = [...slot.selectedItemIds, itemId]
    } else {
      slot.selectedItemIds = slot.selectedItemIds.filter((id) => id !== itemId)
    }

    newSlots[slotIndex] = slot
    setSlots(newSlots)
  }, [slots, setSlots])

  // 금액 변경
  const handleAmountChange = useCallback((slotIndex: number, itemId: string, value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "")
    const parts = cleaned.split(".")
    let result = parts[0]
    if (parts.length > 1) {
      result = parts[0] + "." + parts[1].slice(0, 2)
    }

    const amount = result === "" ? 0 : Number(result)

    const newSlots = [...slots]
    const slot = { ...newSlots[slotIndex] }
    slot.costValues = { ...slot.costValues, [itemId]: amount }
    newSlots[slotIndex] = slot
    setSlots(newSlots)
  }, [slots, setSlots])

  // 비용 항목 삭제 (슬롯에서 제거)
  const handleItemDelete = useCallback((slotIndex: number, itemId: string) => {
    const newSlots = [...slots]
    const slot = { ...newSlots[slotIndex] }
    slot.selectedItemIds = slot.selectedItemIds.filter((id) => id !== itemId)
    const { [itemId]: _, ...restCostValues } = slot.costValues
    slot.costValues = restCostValues
    newSlots[slotIndex] = slot
    setSlots(newSlots)
  }, [slots, setSlots])

  // 슬롯 제거
  const handleRemoveSlot = useCallback((slotIndex: number) => {
    if (slots.length <= 2) return
    const newSlots = slots.filter((_, i) => i !== slotIndex)
    setSlots(newSlots)
  }, [slots, setSlots])

  // 연결된 제품 변경
  // 📌 비유: 피자를 나눠 먹을 사람들 선택하기
  const handleLinkedProductsChange = useCallback((slotIndex: number, productIds: string[]) => {
    const newSlots = [...slots]
    const slot = { ...newSlots[slotIndex] }
    slot.linkedProductIds = productIds
    newSlots[slotIndex] = slot
    setSlots(newSlots)
  }, [slots, setSlots])

  // 슬롯 추가 (2개씩)
  const handleExpandSlots = useCallback(() => {
    const emptySlot: FactorySlot = {
      factoryId: null,
      selectedItemIds: [],
      costValues: {},
    }
    const newSlots = [...slots, emptySlot, emptySlot]
    setSlots(newSlots)
  }, [slots, setSlots])

  // 선택된 공장 ID 목록 (중복 선택 방지용)
  const selectedFactoryIds = useMemo(() => {
    return slots
      .filter((slot) => slot.factoryId !== null)
      .map((slot) => slot.factoryId as string)
  }, [slots])

  // 총 부대 비용 계산 (원화)
  const totalCostKRW = useMemo(() => {
    let total = 0
    slots.forEach((slot) => {
      if (!slot.factoryId) return
      const factory = factories?.find((f) => f._id === slot.factoryId)
      if (!factory) return

      const exchangeRate = factory.currency === "USD" ? (usdRate ?? 0) : (cnyRate ?? 0)

      slot.selectedItemIds.forEach((itemId) => {
        const amount = slot.costValues[itemId] ?? 0
        total += amount * exchangeRate
      })
    })
    return total
  }, [slots, factories, usdRate, cnyRate])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">중국 공장 추가 비용</h3>
        <div className="flex items-center gap-1">
          {/* 프리셋 저장 버튼 */}
          {onSavePreset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSavePreset}
              className="h-7 px-2 text-gray-500 hover:text-gray-700"
              title="현재 설정 저장"
            >
              <Save className="h-4 w-4" />
            </Button>
          )}
          {/* 설정 버튼 */}
          {onSettingsClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSettingsClick}
              className="h-7 px-2 text-gray-500 hover:text-gray-700"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 프리셋 버튼 목록 */}
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => {
            const isSelected = selectedPresetId === preset._id
            return (
              <Button
                key={preset._id}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => onLoadPreset?.(preset)}
                className={`h-7 px-2.5 text-xs ${
                  isSelected
                    ? "bg-primary text-white"
                    : "bg-white hover:bg-primary/5 hover:border-primary/30"
                }`}
              >
                <Bookmark className={`h-3 w-3 mr-1 ${isSelected ? "text-white" : "text-primary/60"}`} />
                {preset.name}
              </Button>
            )
          })}
        </div>
      )}

      {/* 공장 슬롯들 (2열 그리드) */}
      <div className="grid grid-cols-2 gap-2">
        {slots.map((slot, index) => {
          const factory = factories?.find((f) => f._id === slot.factoryId)
          const factoryCostItems = slot.factoryId
            ? factoryCostItemsMap.get(slot.factoryId)
            : undefined

          return (
            <FactorySlotInput
              key={index}
              slotIndex={index}
              slot={slot}
              factories={factories}
              factoryCostItems={factoryCostItems}
              factoryCurrency={factory?.currency ?? "CNY"}
              selectedFactoryIds={selectedFactoryIds}
              onFactoryChange={(id) => handleFactoryChange(index, id)}
              onItemToggle={(itemId, checked) => handleItemToggle(index, itemId, checked)}
              onAmountChange={(itemId, value) => handleAmountChange(index, itemId, value)}
              onItemDelete={(itemId) => handleItemDelete(index, itemId)}
              onRemove={() => handleRemoveSlot(index)}
              canRemove={slots.length > 2}
              products={products}
              onLinkedProductsChange={(productIds) => handleLinkedProductsChange(index, productIds)}
            />
          )
        })}
      </div>

      {/* 슬롯 추가 버튼 */}
      {slots.length < 6 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleExpandSlots}
          className="w-full h-8 text-xs text-gray-500"
        >
          <Plus className="h-3 w-3 mr-1" />
          추가
        </Button>
      )}
    </div>
  )
}

// 기본 슬롯 생성 헬퍼
export function createEmptySlots(count: number = 2): FactorySlot[] {
  return Array(count).fill(null).map(() => ({
    factoryId: null,
    selectedItemIds: [],
    costValues: {},
  }))
}
