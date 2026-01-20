"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Pencil, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatNumberWithCommas } from "@/lib/format"
import {
  useShippingCompanies,
  useShippingRateTypes,
  useShippingRates,
} from "@/hooks"
import { Id } from "../../../../convex/_generated/dataModel"

// 운임 요금 관리 컴포넌트
export function ShippingRateManager() {
  const { companies, isLoading: companiesLoading } = useShippingCompanies()
  const [selectedCompanyId, setSelectedCompanyId] = useState<Id<"shippingCompanies"> | null>(null)
  const [selectedRateTypeId, setSelectedRateTypeId] = useState<Id<"shippingRateTypes"> | null>(null)

  const {
    rateTypes,
    isLoading: rateTypesLoading,
    createRateType,
    updateRateType,
    removeRateType,
  } = useShippingRateTypes(selectedCompanyId)

  const {
    rates,
    isLoading: ratesLoading,
    createRate,
    removeRate,
    removeAllRates,
  } = useShippingRates(selectedRateTypeId)

  // 새 운임 타입 상태
  const [isAddingType, setIsAddingType] = useState(false)
  const [newTypeName, setNewTypeName] = useState("")

  // 운임 타입 편집 상태
  const [editingTypeId, setEditingTypeId] = useState<Id<"shippingRateTypes"> | null>(null)
  const [editingTypeName, setEditingTypeName] = useState("")

  // 새 운임 상태
  const [isAddingRate, setIsAddingRate] = useState(false)
  const [newCbm, setNewCbm] = useState("")
  const [newRateUSD, setNewRateUSD] = useState("")
  const [newRateKRW, setNewRateKRW] = useState("")

  // 첫 번째 업체 자동 선택
  useEffect(() => {
    if (companies && companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0]._id)
    }
  }, [companies, selectedCompanyId])

  // 첫 번째 운임 타입 자동 선택
  useEffect(() => {
    if (rateTypes && rateTypes.length > 0 && !selectedRateTypeId) {
      setSelectedRateTypeId(rateTypes[0]._id)
    }
  }, [rateTypes, selectedRateTypeId])

  // 업체 변경 시 운임 타입 초기화
  useEffect(() => {
    setSelectedRateTypeId(null)
  }, [selectedCompanyId])

  // 운임 타입 추가
  const handleAddRateType = async () => {
    if (!selectedCompanyId || !newTypeName.trim()) return
    await createRateType({
      companyId: selectedCompanyId,
      name: newTypeName.trim(),
      isDefault: false,
      sortOrder: (rateTypes?.length ?? 0) + 1,
    })
    setNewTypeName("")
    setIsAddingType(false)
  }

  // 운임 타입 삭제
  const handleDeleteRateType = async () => {
    if (!selectedRateTypeId) return
    if (!confirm("이 운임 타입과 관련 요금표를 삭제하시겠습니까?")) return
    await removeAllRates({ rateTypeId: selectedRateTypeId })
    await removeRateType({ id: selectedRateTypeId })
    setSelectedRateTypeId(null)
  }

  // 운임 타입 편집 시작
  const handleStartEditType = (typeId: Id<"shippingRateTypes">, currentName: string) => {
    setEditingTypeId(typeId)
    setEditingTypeName(currentName)
  }

  // 운임 타입 편집 저장
  const handleSaveEditType = async () => {
    if (!editingTypeId || !editingTypeName.trim()) return
    await updateRateType({
      id: editingTypeId,
      name: editingTypeName.trim(),
    })
    setEditingTypeId(null)
    setEditingTypeName("")
  }

  // 운임 타입 편집 취소
  const handleCancelEditType = () => {
    setEditingTypeId(null)
    setEditingTypeName("")
  }

  // 운임 추가
  const handleAddRate = async () => {
    if (!selectedRateTypeId) return
    const cbm = parseFloat(newCbm)
    const rateUSD = parseFloat(newRateUSD)
    const rateKRW = parseInt(newRateKRW, 10)
    if (isNaN(cbm) || isNaN(rateUSD) || isNaN(rateKRW)) return

    await createRate({
      rateTypeId: selectedRateTypeId,
      cbm,
      rateUSD,
      rateKRW,
    })
    setNewCbm("")
    setNewRateUSD("")
    setNewRateKRW("")
    setIsAddingRate(false)
  }

  // 운임 삭제
  const handleDeleteRate = async (rateId: Id<"internationalShippingRates">) => {
    if (!confirm("이 요금을 삭제하시겠습니까?")) return
    await removeRate({ id: rateId })
  }

  if (companiesLoading) {
    return <div className="text-center text-gray-400 py-8">로딩 중...</div>
  }

  return (
    <div className="space-y-4">
      {/* 업체 선택 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <Label className="text-sm text-gray-500">운송 업체 선택</Label>
        <Select
          value={selectedCompanyId ?? undefined}
          onValueChange={(v) => setSelectedCompanyId(v as Id<"shippingCompanies">)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="업체를 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {companies?.map((company) => (
              <SelectItem key={company._id} value={company._id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCompanyId && (
        <>
          {/* 운임 타입 관리 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">운임 타입</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingType(true)}
                disabled={isAddingType}
              >
                <Plus className="h-4 w-4 mr-1" />
                타입 추가
              </Button>
            </div>

            {isAddingType && (
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="운임 타입명 (예: 할인운임제)"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                />
                <Button size="sm" onClick={handleAddRateType}>
                  추가
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingType(false)
                    setNewTypeName("")
                  }}
                >
                  취소
                </Button>
              </div>
            )}

            {rateTypesLoading ? (
              <p className="text-sm text-gray-400">로딩 중...</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {rateTypes?.map((type) => (
                  <div key={type._id} className="flex items-center gap-1">
                    {editingTypeId === type._id ? (
                      // 편집 모드
                      <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1">
                        <Input
                          value={editingTypeName}
                          onChange={(e) => setEditingTypeName(e.target.value)}
                          className="h-6 w-32 text-sm px-2 rounded-full"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEditType()
                            if (e.key === "Escape") handleCancelEditType()
                          }}
                        />
                        <button
                          onClick={handleSaveEditType}
                          className="p-1 text-green-600 hover:bg-green-100 rounded-full"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={handleCancelEditType}
                          className="p-1 text-gray-500 hover:bg-gray-200 rounded-full"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      // 일반 모드
                      <>
                        <button
                          onClick={() => setSelectedRateTypeId(type._id)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                            selectedRateTypeId === type._id
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {type.name}
                          {type.isDefault && " (기본)"}
                        </button>
                        <button
                          onClick={() => handleStartEditType(type._id, type.name)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                          title="이름 변경"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 운임 요금표 */}
          {selectedRateTypeId && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-700">요금표</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingRate(true)}
                    disabled={isAddingRate}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    요금 추가
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteRateType}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    타입 삭제
                  </Button>
                </div>
              </div>

              {/* 새 요금 추가 폼 */}
              {isAddingRate && (
                <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                  <Input
                    placeholder="CBM"
                    value={newCbm}
                    onChange={(e) => setNewCbm(e.target.value)}
                    type="number"
                    step="0.5"
                  />
                  <Input
                    placeholder="USD"
                    value={newRateUSD}
                    onChange={(e) => setNewRateUSD(e.target.value)}
                    type="number"
                  />
                  <Input
                    placeholder="KRW"
                    value={newRateKRW}
                    onChange={(e) => setNewRateKRW(e.target.value)}
                    type="number"
                  />
                  <div className="flex gap-1">
                    <Button size="sm" onClick={handleAddRate}>
                      추가
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsAddingRate(false)
                        setNewCbm("")
                        setNewRateUSD("")
                        setNewRateKRW("")
                      }}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              )}

              {/* 요금 테이블 */}
              {ratesLoading ? (
                <p className="text-sm text-gray-400">로딩 중...</p>
              ) : rates && rates.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 text-gray-500 font-medium">CBM</th>
                        <th className="text-right py-2 px-2 text-gray-500 font-medium">USD</th>
                        <th className="text-right py-2 px-2 text-gray-500 font-medium">KRW</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rates.map((rate) => (
                        <tr key={rate._id} className="border-b border-gray-50">
                          <td className="py-2 px-2 text-gray-900">
                            {rate.cbm.toFixed(1)}
                          </td>
                          <td className="py-2 px-2 text-right text-gray-700">
                            ${rate.rateUSD.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-right text-gray-700">
                            {formatNumberWithCommas(rate.rateKRW)}원
                          </td>
                          <td className="py-2 px-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteRate(rate._id)}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3 text-red-400" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  등록된 요금이 없습니다
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
