"use client"

import { useState } from "react"
import { Plus, Trash2, Edit2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatNumberWithCommas } from "@/lib/format"
import { useCompanyCosts } from "@/hooks"
import { Id } from "../../../../convex/_generated/dataModel"

// 공통 비용 모달 Props
// 📌 비유: 편의점 POS 시스템에서 "추가 비용" 버튼 누르면 뜨는 작은 팝업
//    메인 화면(운임 테이블)을 가리지 않고 빠르게 비용 항목을 관리
interface CompanyCostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: Id<"shippingCompanies"> | null
  companyName?: string
}

// 공통 비용 관리 모달 컴포넌트
export function CompanyCostModal({
  open,
  onOpenChange,
  companyId,
  companyName,
}: CompanyCostModalProps) {
  const {
    items,
    isLoading: itemsLoading,
    createItem,
    updateItem,
    removeItem,
  } = useCompanyCosts(companyId)

  // 새 비용 항목 상태
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newAmount, setNewAmount] = useState("")
  const [newIsDivisible, setNewIsDivisible] = useState(true)
  const [newIsRequired, setNewIsRequired] = useState(false)

  // 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [editIsDivisible, setEditIsDivisible] = useState(true)
  const [editIsRequired, setEditIsRequired] = useState(false)

  // 비용 항목 추가
  const handleAdd = async () => {
    if (!companyId || !newName.trim()) return
    const amount = parseInt(newAmount, 10)
    if (isNaN(amount)) return

    await createItem({
      companyId,
      name: newName.trim(),
      defaultAmount: amount,
      isDivisible: newIsDivisible,
      isRequired: newIsRequired,
      sortOrder: (items?.length ?? 0) + 1,
    })
    setNewName("")
    setNewAmount("")
    setNewIsDivisible(true)
    setNewIsRequired(false)
    setIsAdding(false)
  }

  // 수정 시작
  const startEdit = (item: NonNullable<typeof items>[number]) => {
    setEditingId(item._id)
    setEditName(item.name)
    setEditAmount(item.defaultAmount.toString())
    setEditIsDivisible(item.isDivisible)
    setEditIsRequired(item.isRequired)
  }

  // 수정 저장
  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return
    const amount = parseInt(editAmount, 10)
    if (isNaN(amount)) return

    await updateItem({
      id: editingId as Id<"companyCostItems">,
      name: editName.trim(),
      defaultAmount: amount,
      isDivisible: editIsDivisible,
      isRequired: editIsRequired,
    })
    setEditingId(null)
  }

  // 삭제
  const handleDelete = async (id: string) => {
    if (!confirm("이 비용 항목을 삭제하시겠습니까?")) return
    await removeItem({ id: id as Id<"companyCostItems"> })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            공통 비용 관리
            {companyName && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                ({companyName})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {!companyId ? (
          <p className="text-sm text-gray-400 text-center py-4">
            업체를 먼저 선택해주세요
          </p>
        ) : (
          <div className="space-y-3">
            {/* 헤더: 항목 추가 버튼 */}
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdding(true)}
                disabled={isAdding}
              >
                <Plus className="h-4 w-4 mr-1" />
                항목 추가
              </Button>
            </div>

            {/* 새 항목 추가 폼 */}
            {isAdding && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="비용명"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <Input
                    placeholder="금액 (원)"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    type="number"
                  />
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="modal-newIsDivisible"
                      checked={newIsDivisible}
                      onCheckedChange={(v) => setNewIsDivisible(v as boolean)}
                    />
                    <Label htmlFor="modal-newIsDivisible" className="text-sm text-gray-600">
                      주문 건수 분할
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="modal-newIsRequired"
                      checked={newIsRequired}
                      onCheckedChange={(v) => setNewIsRequired(v as boolean)}
                    />
                    <Label htmlFor="modal-newIsRequired" className="text-sm text-gray-600">
                      필수 항목
                    </Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAdd}>추가</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAdding(false)
                      setNewName("")
                      setNewAmount("")
                    }}
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}

            {/* 비용 항목 목록 */}
            {itemsLoading ? (
              <p className="text-sm text-gray-400 text-center py-4">로딩 중...</p>
            ) : items && items.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between p-3 border border-gray-100 rounded-lg"
                  >
                    {editingId === item._id ? (
                      // 수정 모드
                      <div className="flex-1 space-y-2 mr-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="비용명"
                          />
                          <Input
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            type="number"
                            placeholder="금액"
                          />
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`modal-edit-divisible-${item._id}`}
                              checked={editIsDivisible}
                              onCheckedChange={(v) => setEditIsDivisible(v as boolean)}
                            />
                            <Label
                              htmlFor={`modal-edit-divisible-${item._id}`}
                              className="text-sm text-gray-600"
                            >
                              주문 건수 분할
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`modal-edit-required-${item._id}`}
                              checked={editIsRequired}
                              onCheckedChange={(v) => setEditIsRequired(v as boolean)}
                            />
                            <Label
                              htmlFor={`modal-edit-required-${item._id}`}
                              className="text-sm text-gray-600"
                            >
                              필수 항목
                            </Label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // 읽기 모드
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">{item.name}</span>
                          {item.isDivisible && (
                            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">
                              분할
                            </span>
                          )}
                          {item.isRequired && (
                            <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">
                              필수
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatNumberWithCommas(item.defaultAmount)}원
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      {editingId === item._id ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={handleUpdate}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-4 w-4 text-gray-400" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => startEdit(item)}>
                            <Edit2 className="h-4 w-4 text-gray-400" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(item._id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                등록된 비용 항목이 없습니다
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
