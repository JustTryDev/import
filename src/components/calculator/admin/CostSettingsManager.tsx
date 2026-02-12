"use client"

/**
 * 비용 설정 관리 컴포넌트
 *
 * 📌 설정 모달 내에서 비용 계산 기준을 관리합니다.
 * - 내륙 운송료 (CBM당 USD)
 * - 국내 운송료 (기본료 + 추가 요금)
 * - 3PL + 배송비 (CBM 단위당 요금)
 */
import { useState } from "react"
import { Truck, Package, MapPin, Save, RotateCcw, Container, Ship } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useCostSettings } from "@/hooks"
import type {
  InlandConfig,
  DomesticConfig,
  ThreePLConfig,
  ContainerInlandConfig,
  PortShippingRateMap,
} from "@/hooks/useCostSettings"
import { CHINESE_PORTS } from "@/data/chinesePorts"
import type { ContainerType } from "@/lib/calculations/container"

export function CostSettingsManager() {
  const {
    settings,
    isLoading,
    inlandSetting,
    domesticSetting,
    threePLSetting,
    containerInlandSetting,
    portShippingSetting,
    inlandConfig,
    domesticConfig,
    threePLConfig,
    containerInlandConfig,
    portShippingConfig,
    updateSetting,
    seedDefaults,
  } = useCostSettings()

  // Convex create mutation (컨테이너 설정 최초 생성용)
  const createSetting = useMutation(api.costSettings.create)

  // 편집 상태 (로컬)
  const [editInland, setEditInland] = useState<InlandConfig | null>(null)
  const [editDomestic, setEditDomestic] = useState<DomesticConfig | null>(null)
  const [editThreePL, setEditThreePL] = useState<ThreePLConfig | null>(null)
  const [editContainerInland, setEditContainerInland] = useState<ContainerInlandConfig | null>(null)
  const [editPortShipping, setEditPortShipping] = useState<PortShippingRateMap | null>(null)

  // 저장 중 상태
  const [isSaving, setIsSaving] = useState(false)

  // 내륙 운송료 저장
  const handleSaveInland = async () => {
    if (!inlandSetting || !editInland) return
    setIsSaving(true)
    try {
      await updateSetting({
        id: inlandSetting._id,
        config: editInland,
      })
      setEditInland(null)
    } finally {
      setIsSaving(false)
    }
  }

  // 국내 운송료 저장
  const handleSaveDomestic = async () => {
    if (!domesticSetting || !editDomestic) return
    setIsSaving(true)
    try {
      await updateSetting({
        id: domesticSetting._id,
        config: editDomestic,
      })
      setEditDomestic(null)
    } finally {
      setIsSaving(false)
    }
  }

  // 3PL 비용 저장
  const handleSaveThreePL = async () => {
    if (!threePLSetting || !editThreePL) return
    setIsSaving(true)
    try {
      await updateSetting({
        id: threePLSetting._id,
        config: editThreePL,
      })
      setEditThreePL(null)
    } finally {
      setIsSaving(false)
    }
  }

  // 컨테이너 내륙 운송 저장
  const handleSaveContainerInland = async () => {
    if (!editContainerInland) return
    setIsSaving(true)
    try {
      if (containerInlandSetting) {
        // 기존 설정 업데이트
        await updateSetting({
          id: containerInlandSetting._id,
          config: editContainerInland,
        })
      } else {
        // 최초 생성
        await createSetting({
          type: "containerInland",
          name: "컨테이너 내륙 운송료",
          description: "컨테이너 규격별 최소 비용 및 KM당 비용",
          config: editContainerInland,
        })
      }
      setEditContainerInland(null)
    } finally {
      setIsSaving(false)
    }
  }

  // 항구별 국제 운송비 저장
  // 📌 비유: 전국 우체국 택배비 요금표를 한꺼번에 저장하는 것
  const handleSavePortShipping = async () => {
    if (!editPortShipping) return
    setIsSaving(true)
    try {
      if (portShippingSetting) {
        // 기존 설정 업데이트
        await updateSetting({
          id: portShippingSetting._id,
          config: editPortShipping,
        })
      } else {
        // 최초 생성 (DB에 아직 없을 때)
        await createSetting({
          type: "portShipping",
          name: "항구별 국제 운송비",
          description: "FCL 모드 출발 항구별 컨테이너 운임 (원, 도착항: 인천)",
          config: editPortShipping,
        })
      }
      setEditPortShipping(null)
    } finally {
      setIsSaving(false)
    }
  }

  // 항구별 운임 개별 값 변경 핸들러
  const handlePortShippingChange = (
    portId: string,
    containerType: ContainerType,
    value: number
  ) => {
    const current = editPortShipping ?? { ...portShippingConfig }
    setEditPortShipping({
      ...current,
      [portId]: {
        ...(current[portId] ?? portShippingConfig[portId] ?? {}),
        [containerType]: value,
      },
    })
  }

  // 기본값 생성
  const handleSeedDefaults = async () => {
    setIsSaving(true)
    try {
      await seedDefaults({})
    } finally {
      setIsSaving(false)
    }
  }

  // 숫자 입력 핸들러 (쉼표 제거 후 숫자 반환)
  const handleNumberInput = (value: string): number => {
    const cleaned = value.replace(/[^0-9.]/g, "")
    return cleaned === "" ? 0 : Number(cleaned)
  }

  // 숫자 표시 포맷 (천 단위 쉼표)
  const formatNumber = (value: number): string => {
    if (value === 0) return ""
    return value.toLocaleString("ko-KR")
  }

  // 소수점 포함 숫자 표시 (CBM 단위 등)
  const formatDecimal = (value: number): string => {
    if (value === 0) return ""
    return value.toString()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  // 설정이 없으면 기본 데이터 생성 안내
  if (!settings || settings.length === 0) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 mb-3">
            비용 설정이 없습니다. 기본 데이터를 생성해주세요.
          </p>
          <Button
            onClick={handleSeedDefaults}
            disabled={isSaving}
            size="sm"
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            <RotateCcw className={`h-4 w-4 mr-2 ${isSaving ? "animate-spin" : ""}`} />
            기본 데이터 생성
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 안내 문구 */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          비용 계산에 사용되는 요금 기준을 설정합니다. 변경 시 즉시 계산에 반영됩니다.
        </p>
      </div>

      {/* 1. 내륙 운송료 */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-5 w-5 text-orange-500" />
          <h4 className="font-medium text-gray-800">내륙 운송료</h4>
          <span className="text-xs text-gray-400">중국 공장 → 항구</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-500">CBM당 단가 (USD)</Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-400">$</span>
              <Input
                type="text"
                inputMode="decimal"
                value={editInland?.ratePerCbm ?? inlandConfig.ratePerCbm}
                onChange={(e) =>
                  setEditInland({
                    ...inlandConfig,
                    ...editInland,
                    ratePerCbm: handleNumberInput(e.target.value),
                  })
                }
                className="h-9"
              />
              <span className="text-xs text-gray-400">/CBM</span>
            </div>
          </div>
          <div className="flex items-end">
            {editInland && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveInland}
                  disabled={isSaving}
                  className="h-9"
                >
                  <Save className="h-4 w-4 mr-1" />
                  저장
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditInland(null)}
                  className="h-9"
                >
                  취소
                </Button>
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          예: 1CBM 물건의 내륙 운송료 = ${inlandConfig.ratePerCbm}
        </p>
      </div>

      {/* 2. 국내 운송료 */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Truck className="h-5 w-5 text-blue-500" />
          <h4 className="font-medium text-gray-800">국내 운송료</h4>
          <span className="text-xs text-gray-400">항구 → 창고</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 기본료 */}
          <div>
            <Label className="text-xs text-gray-500">기본료 (원)</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={formatNumber(editDomestic?.baseFee ?? domesticConfig.baseFee)}
              onChange={(e) =>
                setEditDomestic({
                  ...domesticConfig,
                  ...editDomestic,
                  baseFee: handleNumberInput(e.target.value),
                })
              }
              className="h-9 mt-1"
            />
          </div>
          {/* 기본 CBM */}
          <div>
            <Label className="text-xs text-gray-500">기본 CBM (이하 기본료만)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={editDomestic?.baseCbm ?? domesticConfig.baseCbm}
              onChange={(e) =>
                setEditDomestic({
                  ...domesticConfig,
                  ...editDomestic,
                  baseCbm: handleNumberInput(e.target.value),
                })
              }
              className="h-9 mt-1"
            />
          </div>
          {/* 추가 단위 */}
          <div>
            <Label className="text-xs text-gray-500">추가 단위 (CBM)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={editDomestic?.extraUnit ?? domesticConfig.extraUnit}
              onChange={(e) =>
                setEditDomestic({
                  ...domesticConfig,
                  ...editDomestic,
                  extraUnit: handleNumberInput(e.target.value),
                })
              }
              className="h-9 mt-1"
            />
          </div>
          {/* 추가 요금 */}
          <div>
            <Label className="text-xs text-gray-500">추가 요금 (원/단위)</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={formatNumber(editDomestic?.extraRate ?? domesticConfig.extraRate)}
              onChange={(e) =>
                setEditDomestic({
                  ...domesticConfig,
                  ...editDomestic,
                  extraRate: handleNumberInput(e.target.value),
                })
              }
              className="h-9 mt-1"
            />
          </div>
        </div>

        {editDomestic && (
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleSaveDomestic}
              disabled={isSaving}
              className="h-9"
            >
              <Save className="h-4 w-4 mr-1" />
              저장
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditDomestic(null)}
              className="h-9"
            >
              취소
            </Button>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-2">
          예: 1CBM 물건 = {domesticConfig.baseFee.toLocaleString()}원 (기본료) +{" "}
          {(Math.ceil((1 - domesticConfig.baseCbm) / domesticConfig.extraUnit) *
            domesticConfig.extraRate).toLocaleString()}
          원 (추가) ={" "}
          {(
            domesticConfig.baseFee +
            Math.ceil((1 - domesticConfig.baseCbm) / domesticConfig.extraUnit) *
              domesticConfig.extraRate
          ).toLocaleString()}
          원
        </p>
      </div>

      {/* 3. 3PL + 배송비 */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-5 w-5 text-green-500" />
          <h4 className="font-medium text-gray-800">3PL + 배송비</h4>
          <span className="text-xs text-gray-400">물류대행 및 최종 배송</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 단위당 요금 */}
          <div>
            <Label className="text-xs text-gray-500">단위당 요금 (원)</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={formatNumber(editThreePL?.ratePerUnit ?? threePLConfig.ratePerUnit)}
              onChange={(e) =>
                setEditThreePL({
                  ...threePLConfig,
                  ...editThreePL,
                  ratePerUnit: handleNumberInput(e.target.value),
                })
              }
              className="h-9 mt-1"
            />
          </div>
          {/* 단위 */}
          <div>
            <Label className="text-xs text-gray-500">단위 (CBM)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={editThreePL?.unit ?? threePLConfig.unit}
              onChange={(e) =>
                setEditThreePL({
                  ...threePLConfig,
                  ...editThreePL,
                  unit: handleNumberInput(e.target.value),
                })
              }
              className="h-9 mt-1"
            />
          </div>
        </div>

        {editThreePL && (
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleSaveThreePL}
              disabled={isSaving}
              className="h-9"
            >
              <Save className="h-4 w-4 mr-1" />
              저장
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditThreePL(null)}
              className="h-9"
            >
              취소
            </Button>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-2">
          예: 1CBM 물건 = {threePLConfig.unit}CBM 단위로 올림 →{" "}
          {Math.ceil(1 / threePLConfig.unit)}단위 ×{" "}
          {threePLConfig.ratePerUnit.toLocaleString()}원 ={" "}
          {(
            Math.ceil(1 / threePLConfig.unit) * threePLConfig.ratePerUnit
          ).toLocaleString()}
          원
        </p>
      </div>

      {/* 4. 컨테이너 내륙 운송료 */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Container className="h-5 w-5 text-purple-500" />
          <h4 className="font-medium text-gray-800">컨테이너 내륙 운송료</h4>
          <span className="text-xs text-gray-400">FCL 모드 전용</span>
        </div>

        <p className="text-xs text-gray-500 mb-3">
          컨테이너 규격별 최소 비용과 KM당 비용을 설정합니다. 실제 비용 = max(최소 비용, 거리 × KM당 비용)
        </p>

        {/* 20ft */}
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-600 mb-1.5">20ft (20&apos;DC)</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">최소 비용 (원)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumber(editContainerInland?.["20DC"]?.minCost ?? containerInlandConfig["20DC"].minCost)}
                onChange={(e) => {
                  const current = editContainerInland ?? { ...containerInlandConfig }
                  setEditContainerInland({
                    ...current,
                    "20DC": { ...current["20DC"], minCost: handleNumberInput(e.target.value) },
                  })
                }}
                className="h-8 mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">KM당 비용 (원)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumber(editContainerInland?.["20DC"]?.perKmRate ?? containerInlandConfig["20DC"].perKmRate)}
                onChange={(e) => {
                  const current = editContainerInland ?? { ...containerInlandConfig }
                  setEditContainerInland({
                    ...current,
                    "20DC": { ...current["20DC"], perKmRate: handleNumberInput(e.target.value) },
                  })
                }}
                className="h-8 mt-1 text-sm"
              />
            </div>
          </div>
        </div>

        {/* 40ft */}
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-600 mb-1.5">40ft (40&apos;DC)</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">최소 비용 (원)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumber(editContainerInland?.["40DC"]?.minCost ?? containerInlandConfig["40DC"].minCost)}
                onChange={(e) => {
                  const current = editContainerInland ?? { ...containerInlandConfig }
                  setEditContainerInland({
                    ...current,
                    "40DC": { ...current["40DC"], minCost: handleNumberInput(e.target.value) },
                  })
                }}
                className="h-8 mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">KM당 비용 (원)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumber(editContainerInland?.["40DC"]?.perKmRate ?? containerInlandConfig["40DC"].perKmRate)}
                onChange={(e) => {
                  const current = editContainerInland ?? { ...containerInlandConfig }
                  setEditContainerInland({
                    ...current,
                    "40DC": { ...current["40DC"], perKmRate: handleNumberInput(e.target.value) },
                  })
                }}
                className="h-8 mt-1 text-sm"
              />
            </div>
          </div>
        </div>

        {/* 40ft HC */}
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-600 mb-1.5">40ft HC (40&apos;HC)</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">최소 비용 (원)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumber(editContainerInland?.["40HC"]?.minCost ?? containerInlandConfig["40HC"].minCost)}
                onChange={(e) => {
                  const current = editContainerInland ?? { ...containerInlandConfig }
                  setEditContainerInland({
                    ...current,
                    "40HC": { ...current["40HC"], minCost: handleNumberInput(e.target.value) },
                  })
                }}
                className="h-8 mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">KM당 비용 (원)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatNumber(editContainerInland?.["40HC"]?.perKmRate ?? containerInlandConfig["40HC"].perKmRate)}
                onChange={(e) => {
                  const current = editContainerInland ?? { ...containerInlandConfig }
                  setEditContainerInland({
                    ...current,
                    "40HC": { ...current["40HC"], perKmRate: handleNumberInput(e.target.value) },
                  })
                }}
                className="h-8 mt-1 text-sm"
              />
            </div>
          </div>
        </div>

        {editContainerInland && (
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleSaveContainerInland}
              disabled={isSaving}
              className="h-9"
            >
              <Save className="h-4 w-4 mr-1" />
              저장
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditContainerInland(null)}
              className="h-9"
            >
              취소
            </Button>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-2">
          예: 20ft 300km 운송 = max({containerInlandConfig["20DC"].minCost.toLocaleString()}원, 300 × {containerInlandConfig["20DC"].perKmRate.toLocaleString()}원) = {Math.max(containerInlandConfig["20DC"].minCost, 300 * containerInlandConfig["20DC"].perKmRate).toLocaleString()}원
        </p>
      </div>

      {/* 5. 항구별 국제 운송비 */}
      {/* 📌 비유: 전국 우체국마다 택배비가 다르듯이,
          중국 항구마다 한국(인천항)까지의 컨테이너 운송비가 다릅니다.
          여기서 항구별로 20ft/40ft/40HC 운송비를 각각 설정합니다. */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Ship className="h-5 w-5 text-cyan-500" />
          <h4 className="font-medium text-gray-800">항구별 국제 운송비</h4>
          <span className="text-xs text-gray-400">FCL 모드 전용 · 도착항: 인천</span>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          출발 항구에 따라 컨테이너 국제 운송비가 달라집니다. 지역별로 그룹핑되어 있으며, 값을 수정하면 즉시 계산에 반영됩니다.
        </p>

        {/* 지역별 그룹핑 */}
        {(["동북", "화북", "화동", "화남"] as const).map((region) => {
          const regionPorts = CHINESE_PORTS.filter((p) => p.region === region)
          if (regionPorts.length === 0) return null

          return (
            <div key={region} className="mb-4">
              {/* 지역 헤더 */}
              <div className="text-xs font-semibold text-gray-700 bg-gray-50 px-2 py-1 rounded mb-2">
                {region} 지역
              </div>

              {/* 항구별 입력 필드 */}
              {regionPorts.map((port) => (
                <div key={port.id} className="mb-3 pl-2">
                  <div className="text-xs font-medium text-gray-600 mb-1">
                    {port.nameKo} ({port.nameCn})
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["20DC", "40DC", "40HC"] as ContainerType[]).map((type) => (
                      <div key={type}>
                        <Label className="text-[10px] text-gray-400">{type}</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={formatNumber(
                            editPortShipping?.[port.id]?.[type]
                            ?? portShippingConfig[port.id]?.[type]
                            ?? 0
                          )}
                          onChange={(e) =>
                            handlePortShippingChange(
                              port.id,
                              type,
                              handleNumberInput(e.target.value)
                            )
                          }
                          className="h-7 mt-0.5 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        })}

        {/* 저장/취소 버튼 */}
        {editPortShipping && (
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleSavePortShipping}
              disabled={isSaving}
              className="h-9"
            >
              <Save className="h-4 w-4 mr-1" />
              저장
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditPortShipping(null)}
              className="h-9"
            >
              취소
            </Button>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-2">
          가까운 항구일수록 운송비가 저렴합니다. 동북(0.85배) → 화북(0.9배) → 화동(기준) → 화남(1.15배)
        </p>
      </div>
    </div>
  )
}
