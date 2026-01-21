"use client"

/**
 * 프리셋 저장 다이얼로그
 *
 * 📌 비유: 카페 앱에서 "자주 주문하는 메뉴" 저장할 때 뜨는 화면
 * - 프리셋 이름 입력
 * - 저장될 내용 미리보기
 */
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FactorySlot } from "./AdditionalCostInput"
import { Id } from "../../../../convex/_generated/dataModel"

// 공장 타입 (최소한의 정보)
interface Factory {
  _id: Id<"factories">
  name: string
  currency: string
}

// 비용 항목 타입
interface CostItem {
  _id: Id<"factoryCostItems">
  name: string
}

interface PresetSaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slots: FactorySlot[]
  factories?: Factory[]
  factoryCostItemsMap: Map<string, CostItem[]>
  onSave: (name: string) => Promise<void>
}

export function PresetSaveDialog({
  open,
  onOpenChange,
  slots,
  factories,
  factoryCostItemsMap,
  onSave,
}: PresetSaveDialogProps) {
  const [name, setName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // 저장될 내용 미리보기 생성
  const previewItems = slots
    .filter((slot) => slot.factoryId !== null && slot.selectedItemIds.length > 0)
    .map((slot) => {
      const factory = factories?.find((f) => f._id === slot.factoryId)
      const costItems = factoryCostItemsMap.get(slot.factoryId as string)

      const selectedItemNames = slot.selectedItemIds
        .map((itemId) => costItems?.find((item) => item._id === itemId)?.name)
        .filter(Boolean)

      return {
        factoryName: factory?.name ?? "알 수 없는 공장",
        itemNames: selectedItemNames as string[],
      }
    })

  // 저장 핸들러
  const handleSave = async () => {
    if (!name.trim()) return

    setIsSaving(true)
    try {
      await onSave(name.trim())
      setName("")
      onOpenChange(false)
    } catch (error) {
      console.error("프리셋 저장 실패:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // 다이얼로그 닫힐 때 초기화
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName("")
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>프리셋 저장</DialogTitle>
          <DialogDescription>
            현재 선택한 공장과 비용 항목을 저장합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 프리셋 이름 입력 */}
          <div className="space-y-2">
            <Label htmlFor="preset-name">프리셋 이름</Label>
            <Input
              id="preset-name"
              placeholder="예: 봉제인형 기본"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* 저장될 내용 미리보기 */}
          <div className="space-y-2">
            <Label className="text-gray-500">저장될 내용</Label>
            {previewItems.length > 0 ? (
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                {previewItems.map((item, index) => (
                  <div key={index} className="text-gray-600">
                    <span className="font-medium">{item.factoryName}</span>
                    <span className="text-gray-400">: </span>
                    <span>{item.itemNames.join(", ")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-400">
                선택된 항목이 없습니다.
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || previewItems.length === 0 || isSaving}
          >
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
