"use client"

import { useState } from "react"
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronRight, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFactories, useFactoryCostItems } from "@/hooks"
import { Id } from "../../../../convex/_generated/dataModel"
import { ChinaAddressSelector } from "../common/ChinaAddressSelector"
import { formatFullAddress } from "@/data/chinaRegions"

// 비용 항목 관리 서브 컴포넌트
function FactoryCostItemsManager({
  factoryId,
  currency
}: {
  factoryId: Id<"factories">
  currency: string
}) {
  const {
    costItems,
    isLoading,
    createCostItem,
    updateCostItem,
    removeCostItem,
  } = useFactoryCostItems(factoryId)

  // 새 비용 항목 상태
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newAmount, setNewAmount] = useState("")

  // 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editAmount, setEditAmount] = useState("")

  // 비용 항목 추가
  const handleAdd = async () => {
    if (!newName.trim()) return

    await createCostItem({
      factoryId,
      name: newName.trim(),
      amount: Number(newAmount) || 0,
      sortOrder: (costItems?.length ?? 0) + 1,
    })

    setNewName("")
    setNewAmount("")
    setIsAdding(false)
  }

  // 수정 시작
  const startEdit = (item: NonNullable<typeof costItems>[number]) => {
    setEditingId(item._id)
    setEditName(item.name)
    setEditAmount(item.amount.toString())
  }

  // 수정 저장
  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return

    await updateCostItem({
      id: editingId as Id<"factoryCostItems">,
      name: editName.trim(),
      amount: Number(editAmount) || 0,
    })
    setEditingId(null)
  }

  // 삭제
  const handleDelete = async (id: string) => {
    if (!confirm("이 비용 항목을 삭제하시겠습니까?")) return
    await removeCostItem({ id: id as Id<"factoryCostItems"> })
  }

  if (isLoading) {
    return <div className="text-xs text-gray-400 py-2">로딩 중...</div>
  }

  return (
    <div className="mt-3 pl-4 border-l-2 border-gray-100 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">비용 항목</span>
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

      {/* 새 비용 항목 추가 폼 */}
      {isAdding && (
        <div className="flex items-center gap-2 py-1">
          <Input
            placeholder="항목명"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-7 text-sm flex-1"
          />
          <Input
            type="number"
            placeholder="금액"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            className="h-7 text-sm w-24 text-right"
          />
          <span className="text-xs text-gray-400 w-8">{currency}</span>
          <Button size="sm" variant="ghost" onClick={handleAdd} className="h-7 px-2">
            <Check className="h-3 w-3 text-green-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsAdding(false)
              setNewName("")
              setNewAmount("")
            }}
            className="h-7 px-2"
          >
            <X className="h-3 w-3 text-gray-400" />
          </Button>
        </div>
      )}

      {/* 비용 항목 목록 */}
      {costItems && costItems.length > 0 ? (
        <div className="space-y-1">
          {costItems.map((item) => (
            <div
              key={item._id}
              className="flex items-center justify-between py-1 px-2 bg-gray-50 rounded"
            >
              {editingId === item._id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-6 text-sm flex-1"
                  />
                  <Input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="h-6 text-sm w-20 text-right"
                  />
                  <span className="text-xs text-gray-400 w-8">{currency}</span>
                  <Button size="sm" variant="ghost" onClick={handleUpdate} className="h-6 px-1">
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
              ) : (
                <>
                  <div className="flex-1">
                    <span className="text-sm text-gray-700">{item.name}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {item.amount} {currency}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(item)}
                      className="h-6 px-1"
                    >
                      <Edit2 className="h-3 w-3 text-gray-400" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(item._id)}
                      className="h-6 px-1"
                    >
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 py-1">등록된 비용 항목이 없습니다</p>
      )}
    </div>
  )
}

// 중국 공장 관리 컴포넌트
export function FactoryManager() {
  const {
    factories,
    isLoading,
    createFactory,
    updateFactory,
    removeFactory,
  } = useFactories()

  // 새 공장 상태
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newCurrency, setNewCurrency] = useState<"CNY" | "USD">("CNY")
  const [newProvinceCode, setNewProvinceCode] = useState<string | null>(null)
  const [newCityCode, setNewCityCode] = useState<string | null>(null)

  // 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editCurrency, setEditCurrency] = useState<"CNY" | "USD">("CNY")
  const [editProvinceCode, setEditProvinceCode] = useState<string | null>(null)
  const [editCityCode, setEditCityCode] = useState<string | null>(null)

  // 펼침 상태 (비용 항목 보기)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 공장 추가
  const handleAdd = async () => {
    if (!newName.trim()) return

    await createFactory({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      currency: newCurrency,
      provinceCode: newProvinceCode ?? undefined,
      cityCode: newCityCode ?? undefined,
      sortOrder: (factories?.length ?? 0) + 1,
    })

    resetAddForm()
  }

  // 추가 폼 초기화
  const resetAddForm = () => {
    setNewName("")
    setNewDescription("")
    setNewCurrency("CNY")
    setNewProvinceCode(null)
    setNewCityCode(null)
    setIsAdding(false)
  }

  // 수정 시작
  const startEdit = (factory: NonNullable<typeof factories>[number]) => {
    setEditingId(factory._id)
    setEditName(factory.name)
    setEditDescription(factory.description ?? "")
    setEditCurrency(factory.currency as "CNY" | "USD")
    setEditProvinceCode((factory as Record<string, unknown>).provinceCode as string | null ?? null)
    setEditCityCode((factory as Record<string, unknown>).cityCode as string | null ?? null)
  }

  // 수정 저장
  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return

    await updateFactory({
      id: editingId as Id<"factories">,
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      currency: editCurrency,
      provinceCode: editProvinceCode ?? undefined,
      cityCode: editCityCode ?? undefined,
    })
    setEditingId(null)
  }

  // 삭제
  const handleDelete = async (id: string) => {
    if (!confirm("이 공장을 삭제하시겠습니까?")) return
    await removeFactory({ id: id as Id<"factories"> })
  }

  // 펼침/접힘 토글
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
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

  // 공장의 주소 표시 텍스트
  const getFactoryAddressText = (factory: NonNullable<typeof factories>[number]) => {
    const provinceCode = (factory as Record<string, unknown>).provinceCode as string | undefined
    const cityCode = (factory as Record<string, unknown>).cityCode as string | undefined
    if (provinceCode && cityCode) {
      return formatFullAddress(provinceCode, cityCode)
    }
    return null
  }

  if (isLoading) {
    return <div className="text-center text-gray-400 py-8">로딩 중...</div>
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700">중국 공장 목록</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            disabled={isAdding}
          >
            <Plus className="h-4 w-4 mr-1" />
            공장 추가
          </Button>
        </div>

        {/* 새 공장 추가 폼 */}
        {isAdding && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="공장명"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                placeholder="설명 (선택)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
              <div>
                <Select
                  value={newCurrency}
                  onValueChange={(v) => setNewCurrency(v as "CNY" | "USD")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CNY">CNY (위안)</SelectItem>
                    <SelectItem value="USD">USD (달러)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* 주소 선택 */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">공장 소재지 (선택)</label>
              <ChinaAddressSelector
                provinceCode={newProvinceCode}
                cityCode={newCityCode}
                onProvinceChange={handleNewProvinceChange}
                onCityChange={setNewCityCode}
                size="sm"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>
                추가
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={resetAddForm}
              >
                취소
              </Button>
            </div>
          </div>
        )}

        {/* 공장 목록 */}
        {factories && factories.length > 0 ? (
          <div className="space-y-2">
            {factories.map((factory) => {
              const addressText = getFactoryAddressText(factory)
              return (
                <div
                  key={factory._id}
                  className="border border-gray-100 rounded-lg overflow-hidden"
                >
                  {/* 공장 헤더 */}
                  <div className="flex items-center justify-between p-3">
                    {editingId === factory._id ? (
                      <div className="flex-1 space-y-2 mr-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="공장명"
                            className="flex-1"
                          />
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="설명"
                            className="flex-1"
                          />
                          <Select
                            value={editCurrency}
                            onValueChange={(v) => setEditCurrency(v as "CNY" | "USD")}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CNY">CNY</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {/* 수정 시 주소 선택 */}
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">공장 소재지</label>
                          <ChinaAddressSelector
                            provinceCode={editProvinceCode}
                            cityCode={editCityCode}
                            onProvinceChange={handleEditProvinceChange}
                            onCityChange={setEditCityCode}
                            size="sm"
                          />
                        </div>
                      </div>
                    ) : (
                      <div
                        className="flex-1 flex items-center gap-2 cursor-pointer"
                        onClick={() => toggleExpand(factory._id)}
                      >
                        {expandedId === factory._id ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {factory.name}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">
                              {factory.currency}
                            </span>
                          </div>
                          {/* 주소 또는 설명 표시 */}
                          {addressText ? (
                            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {addressText}
                            </div>
                          ) : factory.description ? (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {factory.description}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      {editingId === factory._id ? (
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
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(factory)}
                          >
                            <Edit2 className="h-4 w-4 text-gray-400" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(factory._id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 비용 항목 (펼침 상태일 때만) */}
                  {expandedId === factory._id && (
                    <div className="px-3 pb-3">
                      <FactoryCostItemsManager
                        factoryId={factory._id as Id<"factories">}
                        currency={factory.currency}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">
            등록된 공장이 없습니다
          </p>
        )}
      </div>

      <div className="text-xs text-gray-400 p-2">
        * 공장을 클릭하면 비용 항목을 관리할 수 있습니다
      </div>
    </div>
  )
}
