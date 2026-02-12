"use client"

import { useMemo } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select"
import {
  CHINA_REGIONS,
  formatRegionName,
  getProvinceByCode,
} from "@/data/chinaRegions"

interface ChinaAddressSelectorProps {
  provinceCode: string | null   // 선택된 성 코드
  cityCode: string | null       // 선택된 시 코드
  onProvinceChange: (code: string) => void
  onCityChange: (code: string) => void
  disabled?: boolean
  size?: "sm" | "default"
}

// 재사용 가능한 중국 성/시 캐스케이딩 셀렉터
export function ChinaAddressSelector({
  provinceCode,
  cityCode,
  onProvinceChange,
  onCityChange,
  disabled = false,
  size = "default",
}: ChinaAddressSelectorProps) {
  // 선택된 성의 도시 목록
  const cities = useMemo(() => {
    if (!provinceCode) return []
    const province = getProvinceByCode(provinceCode)
    return province?.cities ?? []
  }, [provinceCode])

  // 성 변경 시 처리
  const handleProvinceChange = (code: string) => {
    onProvinceChange(code)
    // 직할시/특별행정구는 도시가 1개뿐이므로 자동 선택
    const province = getProvinceByCode(code)
    if (province && province.cities.length === 1) {
      onCityChange(province.cities[0].code)
    }
  }

  // 성 목록을 유형별로 그룹화
  const groupedProvinces = useMemo(() => ({
    municipality: CHINA_REGIONS.filter((p) => p.type === "municipality"),
    province: CHINA_REGIONS.filter((p) => p.type === "province"),
    autonomous: CHINA_REGIONS.filter((p) => p.type === "autonomous"),
    sar: CHINA_REGIONS.filter((p) => p.type === "sar"),
  }), [])

  // 도시가 1개뿐인 경우 (직할시, 특별행정구 등) 시 선택 비활성화
  const isCityDisabled = disabled || !provinceCode || cities.length <= 1

  return (
    <div className="flex gap-2">
      {/* 성/시 선택 */}
      <Select
        value={provinceCode ?? undefined}
        onValueChange={handleProvinceChange}
        disabled={disabled}
      >
        <SelectTrigger size={size} className="flex-1">
          <SelectValue placeholder="성/시 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>직할시</SelectLabel>
            {groupedProvinces.municipality.map((p) => (
              <SelectItem key={p.code} value={p.code}>
                {formatRegionName(p.nameKo, p.nameCn)}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>성</SelectLabel>
            {groupedProvinces.province.map((p) => (
              <SelectItem key={p.code} value={p.code}>
                {formatRegionName(p.nameKo, p.nameCn)}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>자치구</SelectLabel>
            {groupedProvinces.autonomous.map((p) => (
              <SelectItem key={p.code} value={p.code}>
                {formatRegionName(p.nameKo, p.nameCn)}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>특별행정구</SelectLabel>
            {groupedProvinces.sar.map((p) => (
              <SelectItem key={p.code} value={p.code}>
                {formatRegionName(p.nameKo, p.nameCn)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* 도시 선택 */}
      <Select
        value={cityCode ?? undefined}
        onValueChange={onCityChange}
        disabled={isCityDisabled}
      >
        <SelectTrigger size={size} className="flex-1">
          <SelectValue placeholder="도시 선택" />
        </SelectTrigger>
        <SelectContent>
          {cities.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {formatRegionName(c.nameKo, c.nameCn)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
