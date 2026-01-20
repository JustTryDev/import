"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Id } from "../../../../convex/_generated/dataModel"
import { ShippingCompany, ShippingRateType } from "@/types/shipping"

interface ShippingCompanySelectorProps {
  companies: ShippingCompany[] | undefined
  selectedCompanyId: Id<"shippingCompanies"> | null
  setSelectedCompanyId: (id: Id<"shippingCompanies"> | null) => void
  rateTypes: ShippingRateType[] | undefined
  selectedRateTypeId: Id<"shippingRateTypes"> | null
  setSelectedRateTypeId: (id: Id<"shippingRateTypes"> | null) => void
  onSettingsClick?: () => void
  isLoading?: boolean
}

// 국제 운송 회사 및 운임 타입 선택 컴포넌트
export function ShippingCompanySelector({
  companies,
  selectedCompanyId,
  setSelectedCompanyId,
  rateTypes,
  selectedRateTypeId,
  setSelectedRateTypeId,
  onSettingsClick,
  isLoading,
}: ShippingCompanySelectorProps) {
  // 업체 선택 시 기본 운임 타입 자동 선택
  const handleCompanyChange = (companyId: string) => {
    const id = companyId as Id<"shippingCompanies">
    setSelectedCompanyId(id)
    // 운임 타입 초기화 (나중에 기본값 자동 선택)
    setSelectedRateTypeId(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">운송 업체</h3>
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

      {/* 업체 선택 */}
      <div className="min-w-0">
        <Label htmlFor="company" className="text-xs text-gray-500">
          업체
        </Label>
        <Select
          value={selectedCompanyId ?? undefined}
          onValueChange={handleCompanyChange}
          disabled={isLoading || !companies?.length}
        >
          <SelectTrigger id="company" className="mt-1 w-full">
            <SelectValue placeholder="업체 선택" className="truncate" />
          </SelectTrigger>
          <SelectContent>
            {companies?.map((company) => (
              <SelectItem key={company._id} value={company._id} className="truncate">
                <span className="truncate">{company.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 운임 타입 선택 */}
      {selectedCompanyId && rateTypes && rateTypes.length > 0 && (
        <div className="min-w-0">
          <Label htmlFor="rateType" className="text-xs text-gray-500">
            운임 타입
          </Label>
          <Select
            value={selectedRateTypeId ?? undefined}
            onValueChange={(v) => setSelectedRateTypeId(v as Id<"shippingRateTypes">)}
          >
            <SelectTrigger id="rateType" className="mt-1 w-full">
              <SelectValue placeholder="운임 타입 선택" className="truncate" />
            </SelectTrigger>
            <SelectContent>
              {rateTypes.map((type) => (
                <SelectItem key={type._id} value={type._id} className="truncate">
                  <span className="truncate">
                    {type.name}
                    {type.description && (
                      <span className="text-xs text-gray-400 ml-1">
                        ({type.description})
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
