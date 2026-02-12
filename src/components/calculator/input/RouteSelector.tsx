"use client"

import { useMemo, useState, useCallback } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { MapPin, ArrowRight, Settings, Anchor, AlertTriangle } from "lucide-react"
import {
  formatFullAddress,
  getCityCoordinates,
  calculateDistance,
} from "@/data/chinaRegions"
import { CHINESE_PORTS, getPortById } from "@/data/chinesePorts"
import type { PortWithDistance } from "@/data/chinesePorts"
import RouteMap from "./RouteMap"
import { Id } from "../../../../convex/_generated/dataModel"

// 공장 타입 (주소 포함)
interface Factory {
  _id: string
  name: string
  provinceCode?: string
  cityCode?: string
}

// 창고 타입
interface Warehouse {
  _id: string
  name: string
  provinceCode: string
  cityCode: string
}

// 운송 업체 타입
interface Company {
  _id: Id<"shippingCompanies">
  name: string
}

// 운임 타입
interface RateType {
  _id: Id<"shippingRateTypes">
  name: string
  description?: string
  unitType?: "cbm" | "kg"
  currency?: "USD" | "CNY" | "KRW"
  isDefault: boolean
}

interface RouteSelectorProps {
  // 운송 업체
  companies?: Company[]
  selectedCompanyId: Id<"shippingCompanies"> | null
  onCompanyChange: (id: Id<"shippingCompanies"> | null) => void

  // 출발지 (공장)
  factories?: Factory[]
  selectedFactoryId: string | null
  onFactoryChange: (id: string | null) => void

  // 도착지 (창고)
  warehouses?: Warehouse[]
  selectedWarehouseId: string | null
  onWarehouseChange: (id: string | null) => void

  // 운임 타입
  rateTypes?: RateType[]
  selectedRateTypeId: Id<"shippingRateTypes"> | null
  onRateTypeChange: (id: Id<"shippingRateTypes"> | null) => void

  // 설정 버튼
  onSettingsClick?: () => void

  isLoading?: boolean

  // FCL 항구 선택 (컨테이너 모드)
  containerMode?: boolean
  selectedPortId?: string | null
  onPortChange?: (portId: string) => void
  nearestPorts?: PortWithDistance[]
  portDistanceKm?: number | null
  portRoadDistanceKm?: number | null
  onPortRoadDistanceChange?: (km: number | null) => void
  // 오버플로우 여부 (FCL에서 컨테이너에 안 들어간 잔량이 LCL로 가는 경우)
  hasOverflow?: boolean
}

// 운송 경로 통합 선택 컴포넌트
// 📌 비유: 택배 주문 시 "택배회사 → 물류센터 → 요금제 → 출발지" 한 곳에서 선택
//    이전에는 두 곳에서 나눠서 골랐지만, 이제 한 곳에서 순서대로 고릅니다.
export function RouteSelector({
  companies,
  selectedCompanyId,
  onCompanyChange,
  factories,
  selectedFactoryId,
  onFactoryChange,
  warehouses,
  selectedWarehouseId,
  onWarehouseChange,
  rateTypes,
  selectedRateTypeId,
  onRateTypeChange,
  onSettingsClick,
  isLoading,
  containerMode = false,
  selectedPortId,
  onPortChange,
  nearestPorts = [],
  portDistanceKm,
  portRoadDistanceKm,
  onPortRoadDistanceChange,
  hasOverflow = false,
}: RouteSelectorProps) {
  // 실제 도로 거리 (Directions API 결과, km)
  const [roadDistanceKm, setRoadDistanceKm] = useState<number | null>(null)

  // 운임 타입 표시 여부
  const showRateTypes = selectedWarehouseId && rateTypes && rateTypes.length > 0

  // 선택된 공장 정보
  const selectedFactory = useMemo(() => {
    if (!selectedFactoryId || !factories) return null
    return factories.find((f) => f._id === selectedFactoryId) ?? null
  }, [selectedFactoryId, factories])

  // 선택된 창고 정보
  const selectedWarehouse = useMemo(() => {
    if (!selectedWarehouseId || !warehouses) return null
    return warehouses.find((w) => w._id === selectedWarehouseId) ?? null
  }, [selectedWarehouseId, warehouses])

  // 출발지 주소 텍스트
  const departureAddress = useMemo(() => {
    if (!selectedFactory?.provinceCode || !selectedFactory?.cityCode) return null
    return formatFullAddress(selectedFactory.provinceCode, selectedFactory.cityCode)
  }, [selectedFactory])

  // 도착지 주소 텍스트
  const destinationAddress = useMemo(() => {
    if (!selectedWarehouse) return null
    return formatFullAddress(selectedWarehouse.provinceCode, selectedWarehouse.cityCode)
  }, [selectedWarehouse])

  // 출발지 좌표
  const departureCoord = useMemo(() => {
    if (!selectedFactory?.cityCode) return null
    const coord = getCityCoordinates(selectedFactory.cityCode)
    if (!coord) return null
    return { ...coord, label: `${selectedFactory.name} (${departureAddress ?? ""})` }
  }, [selectedFactory, departureAddress])

  // 도착지 좌표
  const destinationCoord = useMemo(() => {
    if (!selectedWarehouse) return null
    const coord = getCityCoordinates(selectedWarehouse.cityCode)
    if (!coord) return null
    return { ...coord, label: `${selectedWarehouse.name} (${destinationAddress ?? ""})` }
  }, [selectedWarehouse, destinationAddress])

  // 선택된 항구 정보 (FCL 모드)
  const selectedPort = useMemo(() => {
    if (!selectedPortId) return null
    return getPortById(selectedPortId) ?? null
  }, [selectedPortId])

  // FCL 모드: 선택된 항구의 좌표 (지도 표시용)
  const portCoord = useMemo(() => {
    if (!selectedPort) return null
    return { lat: selectedPort.lat, lng: selectedPort.lng, label: `${selectedPort.nameKo} (${selectedPort.nameCn})` }
  }, [selectedPort])

  // FCL 모드: 항구 마커 목록 (지도에 표시용)
  const portMarkers = useMemo(() => {
    if (!containerMode) return []
    // 가까운 항구 5개를 마커로 변환
    return nearestPorts.map((port) => ({
      id: port.id,
      lat: port.lat,
      lng: port.lng,
      label: `${port.nameKo} (${port.nameCn}) ~${port.distanceKm}km`,
      isSelected: port.id === selectedPortId,
    }))
  }, [containerMode, nearestPorts, selectedPortId])

  // 직선 거리 (Haversine, fallback용)
  const straightDistanceKm = useMemo(() => {
    if (!departureCoord || !destinationCoord) return null
    return calculateDistance(departureCoord, destinationCoord)
  }, [departureCoord, destinationCoord])

  // 표시할 거리: 모드에 따라 다른 소스 사용
  // LCL: 공장→창고 거리, FCL: 공장→항구 거리
  const displayDistance: number | null = containerMode
    ? (portRoadDistanceKm ?? portDistanceKm ?? null)
    : (roadDistanceKm ?? straightDistanceKm)
  const distancePrefix = containerMode
    ? (portRoadDistanceKm != null ? "" : "~")
    : (roadDistanceKm !== null ? "" : "~")

  // 지도 표시 여부
  const showMap = containerMode
    ? (departureCoord !== null)  // FCL: 공장만 선택되면 지도 표시 (항구 마커도 함께)
    : (departureCoord || destinationCoord)  // LCL: 기존 로직

  // 도로 거리 콜백 (RouteMap에서 호출)
  const handleDistanceChange = useCallback((km: number | null) => {
    setRoadDistanceKm(km)
  }, [])

  // 출발지 변경 시 도로 거리 초기화
  const handleFactoryChange = useCallback((id: string | null) => {
    setRoadDistanceKm(null)
    onFactoryChange(id)
  }, [onFactoryChange])

  // 도착지(창고) 변경 시 도로 거리 초기화
  // 운임 타입 초기화는 부모(ImportCalculator)의 useEffect에서 자동 처리
  const handleWarehouseChange = useCallback((id: string | null) => {
    setRoadDistanceKm(null)
    onWarehouseChange(id)
  }, [onWarehouseChange])

  // 출발지 드롭다운 옵션 포맷: "공장명 : 주소"
  const formatFactoryOption = (factory: Factory): string => {
    if (factory.provinceCode && factory.cityCode) {
      return `${factory.name} : ${formatFullAddress(factory.provinceCode, factory.cityCode)}`
    }
    return factory.name
  }

  // 도착지 드롭다운 옵션 포맷: "창고명 : 주소"
  const formatWarehouseOption = (warehouse: Warehouse): string => {
    return `${warehouse.name} : ${formatFullAddress(warehouse.provinceCode, warehouse.cityCode)}`
  }

  return (
    <div className="space-y-3">
      {/* 제목 + 설정 버튼 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">운송 경로</h3>
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

      {/* 1행: 출발지 (공장) - 가장 먼저 선택 */}
      <div>
        <Label className="text-xs text-gray-500">출발지 (공장)</Label>
        <Select
          value={selectedFactoryId ?? undefined}
          onValueChange={(v) => handleFactoryChange(v)}
          disabled={isLoading || !factories?.length}
        >
          <SelectTrigger className="mt-1 w-full">
            <SelectValue placeholder="공장 선택" className="truncate" />
          </SelectTrigger>
          <SelectContent>
            {factories?.map((factory) => (
              <SelectItem key={factory._id} value={factory._id} className="truncate">
                <span className="truncate">{formatFactoryOption(factory)}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 2행: 모드에 따라 다른 UI */}
      {containerMode ? (
        // ===== FCL 모드: 출발 항구 선택 =====
        // 📌 비유: 이삿짐 트럭은 택배 회사/물류센터가 필요 없고, 항구만 선택하면 됨
        <>
          <div>
            <Label className="text-xs text-gray-500 flex items-center gap-1">
              <Anchor className="h-3 w-3" />
              도착항 (FCL)
            </Label>
            <Select
              value={selectedPortId ?? undefined}
              onValueChange={(v) => onPortChange?.(v)}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="항구 선택" className="truncate" />
              </SelectTrigger>
              <SelectContent>
                {/* 가까운 항구 (추천) */}
                {nearestPorts.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-medium text-gray-400 uppercase">
                      가까운 항구
                    </div>
                    {nearestPorts.map((port) => (
                      <SelectItem key={port.id} value={port.id} className="truncate">
                        <span className="truncate">
                          {port.nameKo} ({port.nameCn})
                          <span className="text-xs text-gray-400 ml-1">~{port.distanceKm}km</span>
                        </span>
                      </SelectItem>
                    ))}
                    <div className="border-t border-gray-100 my-1" />
                    <div className="px-2 py-1 text-[10px] font-medium text-gray-400 uppercase">
                      전체 항구
                    </div>
                  </>
                )}
                {/* 전체 항구 목록 (가까운 항구에 없는 것만) */}
                {CHINESE_PORTS
                  .filter((port) => !nearestPorts.some((np) => np.id === port.id))
                  .map((port) => (
                    <SelectItem key={port.id} value={port.id} className="truncate">
                      <span className="truncate">
                        {port.nameKo} ({port.nameCn})
                        <span className="text-[10px] text-gray-400 ml-1">{port.region}</span>
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* 📌 LCL 오버플로우 경로 설정
              비유: 이삿짐 트럭(FCL)에 다 안 들어가면 나머지는 택배(LCL)로 보냄
              → LCL로 보내려면 택배 회사, 물류센터, 요금제를 선택해야 함 */}
          {hasOverflow && (
            <div className="mt-3 pt-3 border-t border-dashed border-amber-200">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-amber-600 font-medium">LCL 오버플로우 경로</span>
              </div>
              <div className={`grid ${showRateTypes ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
                {/* 운송 업체 */}
                <div className="min-w-0">
                  <Label className="text-xs text-gray-500">운송 업체</Label>
                  <Select
                    value={selectedCompanyId ?? undefined}
                    onValueChange={(v) => onCompanyChange(v as Id<"shippingCompanies">)}
                    disabled={isLoading || !companies?.length}
                  >
                    <SelectTrigger className="mt-1 w-full">
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

                {/* 도착지 (창고) */}
                <div className="min-w-0">
                  <Label className="text-xs text-gray-500">도착지</Label>
                  <Select
                    value={selectedWarehouseId ?? undefined}
                    onValueChange={(v) => handleWarehouseChange(v)}
                    disabled={isLoading || !warehouses?.length}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue
                        placeholder={warehouses?.length ? "창고 선택" : "창고 없음"}
                        className="truncate"
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((warehouse) => (
                        <SelectItem key={warehouse._id} value={warehouse._id} className="truncate">
                          <span className="truncate">{formatWarehouseOption(warehouse)}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 운임 타입 (창고 선택 후 표시) */}
                {showRateTypes && (
                  <div className="min-w-0">
                    <Label className="text-xs text-gray-500">운임 타입</Label>
                    <Select
                      value={selectedRateTypeId ?? undefined}
                      onValueChange={(v) => onRateTypeChange(v as Id<"shippingRateTypes">)}
                    >
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue placeholder="운임 타입 선택" className="truncate" />
                      </SelectTrigger>
                      <SelectContent>
                        {rateTypes?.map((type) => (
                          <SelectItem key={type._id} value={type._id} className="truncate">
                            <span className="truncate">
                              {type.name}
                              <span className={`text-[10px] ml-1.5 px-1 py-0.5 rounded ${
                                type.unitType === "kg"
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-blue-100 text-blue-600"
                              }`}>
                                {type.unitType === "kg" ? "KG" : "CBM"}
                              </span>
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
            </div>
          )}
        </>
      ) : (
        // ===== LCL 모드: 기존 업체 → 창고 → 운임타입 =====
        <div className={`grid ${showRateTypes ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
          {/* 운송 업체 선택 */}
          <div className="min-w-0">
            <Label className="text-xs text-gray-500">운송 업체</Label>
            <Select
              value={selectedCompanyId ?? undefined}
              onValueChange={(v) => onCompanyChange(v as Id<"shippingCompanies">)}
              disabled={isLoading || !companies?.length}
            >
              <SelectTrigger className="mt-1 w-full">
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

          {/* 도착지 (창고) 선택 */}
          <div className="min-w-0">
            <Label className="text-xs text-gray-500">도착지</Label>
            <Select
              value={selectedWarehouseId ?? undefined}
              onValueChange={(v) => handleWarehouseChange(v)}
              disabled={isLoading || !warehouses?.length}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue
                  placeholder={warehouses?.length ? "창고 선택" : "창고 없음"}
                  className="truncate"
                />
              </SelectTrigger>
              <SelectContent>
                {warehouses?.map((warehouse) => (
                  <SelectItem key={warehouse._id} value={warehouse._id} className="truncate">
                    <span className="truncate">{formatWarehouseOption(warehouse)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 운임 타입 선택 (창고 선택 후 표시) */}
          {showRateTypes && (
            <div className="min-w-0">
              <Label className="text-xs text-gray-500">운임 타입</Label>
              <Select
                value={selectedRateTypeId ?? undefined}
                onValueChange={(v) => onRateTypeChange(v as Id<"shippingRateTypes">)}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="운임 타입 선택" className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  {rateTypes?.map((type) => (
                    <SelectItem key={type._id} value={type._id} className="truncate">
                      <span className="truncate">
                        {type.name}
                        <span className={`text-[10px] ml-1.5 px-1 py-0.5 rounded ${
                          type.unitType === "kg"
                            ? "bg-orange-100 text-orange-600"
                            : "bg-blue-100 text-blue-600"
                        }`}>
                          {type.unitType === "kg" ? "KG" : "CBM"}
                        </span>
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
      )}

      {/* Google Maps 지도 */}
      {showMap && (
        <RouteMap
          departure={departureCoord}
          // FCL 모드: 선택된 항구를 도착지로 사용 / LCL 모드: 기존 창고
          destination={containerMode ? portCoord : destinationCoord}
          onDistanceChange={containerMode ? (onPortRoadDistanceChange ?? (() => {})) : handleDistanceChange}
          // FCL 모드: 항구 마커 목록 전달
          ports={containerMode ? portMarkers : undefined}
          onPortClick={containerMode ? onPortChange : undefined}
        />
      )}

      {/* 경로 요약 + 거리 */}
      {containerMode ? (
        // FCL 모드: 공장 → 항구
        departureAddress && selectedPort && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-sm">
            <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span className="text-gray-600 truncate">{departureAddress}</span>
            <ArrowRight className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span className="text-blue-600 font-medium truncate flex items-center gap-1">
              <Anchor className="h-3 w-3" />
              {selectedPort.nameKo}
            </span>
            {displayDistance !== null && (
              <span className="text-blue-500 shrink-0 ml-auto font-medium">
                {distancePrefix}{Math.round(displayDistance).toLocaleString()}km
              </span>
            )}
          </div>
        )
      ) : (
        // LCL 모드: 공장 → 창고
        departureAddress && destinationAddress && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
            <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="text-gray-600 truncate">{departureAddress}</span>
            <ArrowRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="text-gray-600 truncate">{destinationAddress}</span>
            {displayDistance !== null && (
              <span className="text-gray-500 shrink-0 ml-auto font-medium">
                {distancePrefix}{Math.round(displayDistance).toLocaleString()}km
              </span>
            )}
          </div>
        )
      )}
    </div>
  )
}
