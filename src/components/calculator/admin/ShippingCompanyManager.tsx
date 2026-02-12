"use client"

import { useState } from "react"
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useShippingCompanies } from "@/hooks"
import { Id } from "../../../../convex/_generated/dataModel"
import { WarehouseManager } from "./WarehouseManager"

// 운송 업체 관리 컴포넌트
export function ShippingCompanyManager() {
  const { companies, isLoading, createCompany, updateCompany, removeCompany } = useShippingCompanies()
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")

  // 펼침 상태 (창고 목록 보기)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 업체 추가
  const handleAdd = async () => {
    if (!newName.trim()) return
    await createCompany({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
    })
    setNewName("")
    setNewDescription("")
    setIsAdding(false)
  }

  // 수정 시작
  const startEdit = (company: NonNullable<typeof companies>[number]) => {
    setEditingId(company._id)
    setEditName(company.name)
    setEditDescription(company.description || "")
  }

  // 수정 저장
  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return
    await updateCompany({
      id: editingId as Id<"shippingCompanies">,
      name: editName.trim(),
      description: editDescription.trim() || undefined,
    })
    setEditingId(null)
  }

  // 삭제
  const handleDelete = async (id: string) => {
    if (!confirm("이 업체를 삭제하시겠습니까? 관련된 모든 데이터가 함께 삭제됩니다.")) return
    await removeCompany({ id: id as Id<"shippingCompanies"> })
  }

  // 펼침/접힘 토글
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (isLoading) {
    return <div className="text-center text-gray-400 py-8">로딩 중...</div>
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">운송 업체 관리</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          disabled={isAdding}
        >
          <Plus className="h-4 w-4 mr-1" />
          업체 추가
        </Button>
      </div>

      {/* 업체 추가 폼 */}
      {isAdding && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
          <Input
            placeholder="업체명"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            placeholder="설명 (선택)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
              <Check className="h-4 w-4 mr-1" />
              추가
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsAdding(false)
                setNewName("")
                setNewDescription("")
              }}
            >
              <X className="h-4 w-4 mr-1" />
              취소
            </Button>
          </div>
        </div>
      )}

      {/* 업체 목록 */}
      <div className="space-y-2">
        {companies?.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            등록된 업체가 없습니다
          </p>
        )}

        {companies?.map((company) => (
          <div
            key={company._id}
            className="border border-gray-100 rounded-lg overflow-hidden"
          >
            {/* 업체 헤더 */}
            <div className="flex items-center justify-between p-3">
              {editingId === company._id ? (
                <div className="flex-1 space-y-2 mr-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="업체명"
                  />
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="설명 (선택)"
                  />
                </div>
              ) : (
                <div
                  className="flex-1 flex items-center gap-2 cursor-pointer"
                  onClick={() => toggleExpand(company._id)}
                >
                  {expandedId === company._id ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{company.name}</div>
                    {company.description && (
                      <div className="text-sm text-gray-500">{company.description}</div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1">
                {editingId === company._id ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleUpdate}
                      disabled={!editName.trim()}
                    >
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
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(company)}
                    >
                      <Edit2 className="h-4 w-4 text-gray-400" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(company._id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* 창고 목록 (펼침 상태일 때만) */}
            {expandedId === company._id && (
              <div className="px-3 pb-3">
                <WarehouseManager
                  companyId={company._id as Id<"shippingCompanies">}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-400 p-2 mt-2">
        * 업체를 클릭하면 중국 내 창고를 관리할 수 있습니다
      </div>
    </div>
  )
}
