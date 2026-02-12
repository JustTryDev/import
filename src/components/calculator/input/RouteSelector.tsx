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
import { MapPin, ArrowRight } from "lucide-react"
import {
  formatFullAddress,
  getCityCoordinates,
  calculateDistance,
} from "@/data/chinaRegions"
import RouteMap from "./RouteMap"

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

interface RouteSelectorProps {
  // 출발지 (공장)
  factories?: Factory[]
  selectedFactoryId: string | null
  onFactoryChange: (id: string | null) => void

  // 도착지 (창고)
  warehouses?: Warehouse[]
  selectedWarehouseId: string | null
  onWarehouseChange: (id: string | null) => void

  // 운송 업체명 (도착지 라벨용)
  companyName?: string

  isLoading?: boolean
}

// 운송 경로 선택 컴포넌트 (출발지/도착지 + Google Maps)
export function RouteSelector({
  factories,
  selectedFactoryId,
  onFactoryChange,
  warehouses,
  selectedWarehouseId,
  onWarehouseChange,
  companyName,
  isLoading,
}: RouteSelectorProps) {
  // 실제 도로 거리 (Directions API 결과, km)
  const [roadDistanceKm, setRoadDistanceKm] = useState<number | null>(null)

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

  // 직선 거리 (Haversine, fallback용)
  const straightDistanceKm = useMemo(() => {
    if (!departureCoord || !destinationCoord) return null
    return calculateDistance(departureCoord, destinationCoord)
  }, [departureCoord, destinationCoord])

  // 표시할 거리: 실제 도로 거리 우선, 없으면 직선 거리 fallback
  const displayDistance = roadDistanceKm ?? straightDistanceKm
  // 실제 도로 거리가 있으면 "~" 없이, 직선 거리면 "~" 붙여서 표시
  const distancePrefix = roadDistanceKm !== null ? "" : "~"

  // 지도 표시 여부 (출발지 또는 도착지 중 하나라도 선택 시)
  const showMap = departureCoord || destinationCoord

  // 도로 거리 콜백 (RouteMap에서 호출)
  const handleDistanceChange = useCallback((km: number | null) => {
    setRoadDistanceKm(km)
  }, [])

  // 출발지/도착지 변경 시 도로 거리 초기화
  const handleFactoryChange = useCallback((id: string | null) => {
    setRoadDistanceKm(null)
    onFactoryChange(id)
  }, [onFactoryChange])

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
      <h3 className="text-sm font-medium text-gray-700">운송 경로</h3>

      {/* 출발지/도착지 2열 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 출발지 (공장) */}
        <div className="min-w-0">
          <Label className="text-xs text-gray-500">출발지</Label>
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

        {/* 도착지 (창고) */}
        <div className="min-w-0">
          <Label className="text-xs text-gray-500">
            도착지
            {companyName && (
              <span className="text-gray-400 ml-1">({companyName})</span>
            )}
          </Label>
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
      </div>

      {/* Google Maps 지도 (출발지 또는 도착지가 선택된 경우) */}
      {showMap && (
        <RouteMap
          departure={departureCoord}
          destination={destinationCoord}
          onDistanceChange={handleDistanceChange}
        />
      )}

      {/* 경로 요약 + 거리 (출발지 + 도착지 모두 선택 시) */}
      {departureAddress && destinationAddress && (
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
      )}
    </div>
  )
}
