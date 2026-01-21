"use client"

/**
 * 프리셋 관리 컴포넌트
 *
 * 📌 설정 모달 내에서 프리셋(즐겨찾기)을 관리합니다.
 * - 프리셋 목록 표시
 * - 프리셋 이름 수정
 * - 프리셋 삭제
 */
import { useState } from "react"
import { Trash2, Edit2, Check, X, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFactoryPresets } from "@/hooks"
import { useFactories, useAllFactoryCostItems } from "@/hooks"
import { Id } from "../../../../convex/_generated/dataModel"

export function PresetManager() {
  const { presets, isLoading, updatePreset, removePreset } = useFactoryPresets()
  const { factories } = useFactories()
  const { costItemsMap } = useAllFactoryCostItems()

  // 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  // 수정 시작
  const startEdit = (presetId: string, currentName: string) => {
    setEditingId(presetId)
    setEditName(currentName)
  }

  // 수정 취소
  const cancelEdit = () => {
    setEditingId(null)
    setEditName("")
  }

  // 수정 저장
  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return

    await updatePreset({
      id: editingId as Id<"factoryPresets">,
      name: editName.trim(),
    })
    setEditingId(null)
    setEditName("")
  }

  // 삭제
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 프리셋을 삭제하시겠습니까?`)) return
    await removePreset({ id: id as Id<"factoryPresets"> })
  }

  // 프리셋 내용 요약 생성
  const getPresetSummary = (preset: NonNullable<typeof presets>[number]) => {
    return preset.slots
      .map((slot) => {
        const factory = factories?.find((f) => f._id === slot.factoryId)
        if (!factory) return null

        const costItems = costItemsMap.get(slot.factoryId)
        const itemNames = slot.selectedItemIds
          .map((itemId) => costItems?.find((item) => item._id === itemId)?.name)
          .filter(Boolean)

        if (itemNames.length === 0) return null

        return `${factory.name}: ${itemNames.join(", ")}`
      })
      .filter(Boolean)
      .join(" / ")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 안내 문구 */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          저장된 프리셋을 관리합니다. 프리셋은 계산기에서 저장 버튼을 눌러 추가할 수 있습니다.
        </p>
      </div>

      {/* 프리셋 목록 */}
      {presets && presets.length > 0 ? (
        <div className="space-y-2">
          {presets.map((preset) => (
            <div
              key={preset._id}
              className="p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              {editingId === preset._id ? (
                // 수정 모드
                <div className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-primary flex-shrink-0" />
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 h-8"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdate()
                      if (e.key === "Escape") cancelEdit()
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUpdate}
                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                // 보기 모드
                <div className="flex items-start gap-2">
                  <Bookmark className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800">{preset.name}</div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {getPresetSummary(preset) || "내용 없음"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(preset._id, preset.name)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(preset._id, preset.name)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // 빈 상태
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Bookmark className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm">저장된 프리셋이 없습니다</p>
          <p className="text-xs mt-1">계산기에서 공장 비용을 선택 후 저장해보세요</p>
        </div>
      )}
    </div>
  )
}
