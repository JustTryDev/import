"use client"

import { useState } from "react"
import { Plus, Trash2, Edit2, Check, X, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCompanyWarehouses } from "@/hooks"
import { Id } from "../../../../convex/_generated/dataModel"
import { ChinaAddressSelector } from "../common/ChinaAddressSelector"
import { formatFullAddress } from "@/data/chinaRegions"

// 운송 업체별 창고 관리 서브 컴포넌트
export function WarehouseManager({
  companyId,
}: {
  companyId: Id<"shippingCompanies">
}) {
  const {
    warehouses,
    isLoading,
    createWarehouse,
    updateWarehouse,
    removeWarehouse,
  } = useCompanyWarehouses(companyId)

  // 새 창고 상태
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newProvinceCode, setNewProvinceCode] = useState<string | null>(null)
  const [newCityCode, setNewCityCode] = useState<string | null>(null)
  const [newDetailAddress, setNewDetailAddress] = useState("")

  // 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editProvinceCode, setEditProvinceCode] = useState<string | null>(null)
  const [editCityCode, setEditCityCode] = useState<string | null>(null)
  const [editDetailAddress, setEditDetailAddress] = useState("")

  // 창고 추가
  const handleAdd = async () => {
    if (!newName.trim() || !newProvinceCode || !newCityCode) return

    await createWarehouse({
      companyId,
      name: newName.trim(),
      provinceCode: newProvinceCode,
      cityCode: newCityCode,
      detailAddress: newDetailAddress.trim() || undefined,
      sortOrder: (warehouses?.length ?? 0) + 1,
    })

    resetAddForm()
  }

  // 추가 폼 초기화
  const resetAddForm = () => {
    setNewName("")
    setNewProvinceCode(null)
    setNewCityCode(null)
    setNewDetailAddress("")
    setIsAdding(false)
  }

  // 수정 시작
  const startEdit = (warehouse: NonNullable<typeof warehouses>[number]) => {
    setEditingId(warehouse._id)
    setEditName(warehouse.name)
    setEditProvinceCode(warehouse.provinceCode)
    setEditCityCode(warehouse.cityCode)
    setEditDetailAddress(warehouse.detailAddress ?? "")
  }

  // 수정 저장
  const handleUpdate = async () => {
    if (!editingId || !editName.trim() || !editProvinceCode || !editCityCode) return

    await updateWarehouse({
      id: editingId as Id<"companyWarehouses">,
      name: editName.trim(),
      provinceCode: editProvinceCode,
      cityCode: editCityCode,
      detailAddress: editDetailAddress.trim() || undefined,
    })
    setEditingId(null)
  }

  // 삭제
  const handleDelete = async (id: string) => {
    if (!confirm("이 창고를 삭제하시겠습니까?")) return
    await removeWarehouse({ id: id as Id<"companyWarehouses"> })
  }

  // 성 변경 시 시 초기화
  const handleNewProvinceChange = (code: string) => {
    setNewProvinceCode(code)
    setNewCityCode(null)
  }

  const handleEditProvinceChange = (code: string) => {
    setEditProvinceCode(code)
    setEditCityCode(null)
  }

  if (isLoading) {
    return <div className="text-xs text-gray-400 py-2">로딩 중...</div>
  }

  return (
    <div className="mt-3 pl-4 border-l-2 border-gray-100 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          중국 내 창고
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(true)}
          disabled={isAdding}
          className="h-6 px-2 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          추가
        </Button>
      </div>

      {/* 새 창고 추가 폼 */}
      {isAdding && (
        <div className="space-y-2 p-2 bg-gray-50 rounded-lg">
          <Input
            placeholder="창고명 (예: 쑤저우 창고)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-7 text-sm"
          />
          <ChinaAddressSelector
            provinceCode={newProvinceCode}
            cityCode={newCityCode}
            onProvinceChange={handleNewProvinceChange}
            onCityChange={setNewCityCode}
            size="sm"
          />
          <Input
            placeholder="상세 주소 (선택)"
            value={newDetailAddress}
            onChange={(e) => setNewDetailAddress(e.target.value)}
            className="h-7 text-sm"
          />
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAdd}
              disabled={!newName.trim() || !newProvinceCode || !newCityCode}
              className="h-7 px-2 text-xs"
            >
              <Check className="h-3 w-3 text-green-600 mr-1" />
              추가
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetAddForm}
              className="h-7 px-2 text-xs"
            >
              <X className="h-3 w-3 text-gray-400 mr-1" />
              취소
            </Button>
          </div>
        </div>
      )}

      {/* 창고 목록 */}
      {warehouses && warehouses.length > 0 ? (
        <div className="space-y-1">
          {warehouses.map((warehouse) => (
            <div
              key={warehouse._id}
              className="py-1.5 px-2 bg-gray-50 rounded"
            >
              {editingId === warehouse._id ? (
                // 수정 모드
                <div className="space-y-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="창고명"
                    className="h-6 text-sm"
                  />
                  <ChinaAddressSelector
                    provinceCode={editProvinceCode}
                    cityCode={editCityCode}
                    onProvinceChange={handleEditProvinceChange}
                    onCityChange={setEditCityCode}
                    size="sm"
                  />
                  <Input
                    value={editDetailAddress}
                    onChange={(e) => setEditDetailAddress(e.target.value)}
                    placeholder="상세 주소 (선택)"
                    className="h-6 text-sm"
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleUpdate}
                      disabled={!editName.trim() || !editProvinceCode || !editCityCode}
                      className="h-6 px-1"
                    >
                      <Check className="h-3 w-3 text-green-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      className="h-6 px-1"
                    >
                      <X className="h-3 w-3 text-gray-400" />
                    </Button>
                  </div>
                </div>
              ) : (
                // 읽기 모드
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-700">
                      {warehouse.name}
                    </span>
                    <div className="text-xs text-gray-400 truncate">
                      {formatFullAddress(warehouse.provinceCode, warehouse.cityCode)}
                      {warehouse.detailAddress && ` ${warehouse.detailAddress}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(warehouse)}
                      className="h-6 px-1"
                    >
                      <Edit2 className="h-3 w-3 text-gray-400" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(warehouse._id)}
                      className="h-6 px-1"
                    >
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 py-1">등록된 창고가 없습니다</p>
      )}
    </div>
  )
}
