"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import { Id } from "../../../convex/_generated/dataModel"
import {
  Product,
  MultiProductCalculationResult,
} from "@/types/shipping"
import {
  useExchangeRate,
  useShippingCompanies,
  useShippingRateTypes,
  useShippingRates,
  useCompanyCosts,
  useFactories,
  useAllFactoryCostItems,
  useAutoSeed,
  useFactoryPresets,
  useCostSettings,
  useCompanyWarehouses,
} from "@/hooks"
import {
  calculateMultiProductImportCost,
  ShippingRateTable,
  FactorySlotInput,
} from "@/lib/calculations"
import {
  ContainerConfig,
  ContainerType,
  DeliveryMethod,
  DEFAULT_CONTAINER_CONFIG,
} from "@/lib/calculations/container"
import {
  findNearestPorts,
  getPortById,
  CHINESE_PORTS,
} from "@/data/chinesePorts"
import type { PortWithDistance } from "@/data/chinesePorts"
import { getCityCoordinates, calculateDistance } from "@/data/chinaRegions"

// 입력 컴포넌트
import {
  AdditionalCostInput,
  CompanyCostSelector,
  ProductList,
  createEmptyProduct,
  RouteSelector,
} from "./input"
import { FactorySlot, createEmptySlots } from "./input/AdditionalCostInput"

// 결과 컴포넌트
import {
  ExchangeRateDisplay,
  MultiProductCostBreakdown,
} from "./result"

// 설정 모달
import { SettingsModal } from "./admin/SettingsModal"

// 프리셋 다이얼로그
import { PresetSaveDialog } from "./input/PresetSaveDialog"
import type { FactoryPreset, PresetSlot } from "@/hooks/useFactoryPresets"

// 계산기 메인 컴포넌트
export function ImportCalculator() {
  // ===== 자동 시드 (프로덕션 배포 시 기본 데이터 자동 생성) =====
  const { isAutoSeeding } = useAutoSeed()

  // ===== 환율 =====
  const { rates, history: rateHistory, isLoading: rateLoading, refetch: refetchRates } = useExchangeRate()

  // 환율 값 추출
  const usdRate = rates?.USD?.baseRate ?? null
  const cnyRate = rates?.CNY?.baseRate ?? null
  const updatedAt = rates?.USD?.updatedAt ?? null

  // ===== 다중 제품 상태 =====
  // 📌 비유: 쇼핑몰 장바구니처럼 여러 제품을 담는 배열
  const [products, setProducts] = useState<Product[]>(() => [
    createEmptyProduct("product-1")  // 기본 1개 제품으로 시작
  ])

  // ===== 운송 회사 =====
  const { companies, isLoading: companiesLoading } = useShippingCompanies()
  const [selectedCompanyId, setSelectedCompanyId] = useState<Id<"shippingCompanies"> | null>(null)

  // ===== 운송 경로 (출발지/도착지) =====
  // 📌 비유: 택배 보낼 때 "어디서 → 어디로" 정하는 것
  //    출발지 = 중국 공장, 도착지 = 업체의 창고(배송지)
  const { warehouses, isLoading: warehousesLoading } = useCompanyWarehouses(selectedCompanyId)
  const [selectedRouteFactoryId, setSelectedRouteFactoryId] = useState<string | null>(null)
  const [selectedRouteWarehouseId, setSelectedRouteWarehouseId] = useState<string | null>(null)

  // ===== 운임 타입 (창고 기반) =====
  // 📌 핵심: 운임은 업체가 아니라 "어떤 창고로 보내느냐"에 따라 달라짐
  //    같은 고포트라도 위해 창고와 광저우 창고는 요금이 다름
  const { rateTypes, defaultRateType, isLoading: rateTypesLoading } = useShippingRateTypes(
    selectedRouteWarehouseId as Id<"companyWarehouses"> | null
  )
  const [selectedRateTypeId, setSelectedRateTypeId] = useState<Id<"shippingRateTypes"> | null>(null)

  // 운송료 테이블
  const { rates: shippingRates, isLoading: shippingRatesLoading } = useShippingRates(selectedRateTypeId)

  // ===== 중국 공장 =====
  const { factories, isLoading: factoriesLoading } = useFactories()
  const { costItemsMap: factoryCostItemsMap, isLoading: factoryCostItemsLoading } = useAllFactoryCostItems()

  // ===== 비용 설정 (내륙운송료, 국내운송료, 3PL, 컨테이너 내륙) =====
  const { inlandConfig, domesticConfig, threePLConfig, containerInlandConfig } = useCostSettings()

  // 부대 비용 슬롯 (기본 2개)
  const [factorySlots, setFactorySlots] = useState<FactorySlot[]>(() => createEmptySlots(2))

  // ===== 프리셋 (즐겨찾기) =====
  const { presets, defaultPreset, createPreset } = useFactoryPresets()
  const [presetDialogOpen, setPresetDialogOpen] = useState(false)
  const [selectedPresetId, setSelectedPresetId] = useState<Id<"factoryPresets"> | null>(null)
  const [hasLoadedDefaultPreset, setHasLoadedDefaultPreset] = useState(false) // 기본 프리셋 로드 여부

  // ===== 업체별 공통 비용 =====
  const { items: companyCostItems, isLoading: companyCostsLoading } = useCompanyCosts(selectedCompanyId)
  const [selectedCompanyCostIds, setSelectedCompanyCostIds] = useState<Id<"companyCostItems">[]>([])
  // 주문 건수: 기본값 = 2, 제품 추가 시 +1씩 증가 (수동 조절 가능)
  const [orderCount, setOrderCount] = useState<number>(2)

  // 공장 좌표 기반 가까운 항구 목록 (FCL 모드에서 사용)
  // 📌 비유: 공장 주소를 입력하면 "가장 가까운 우체국 5곳"이 자동으로 뜨는 것
  const nearestPorts = useMemo<PortWithDistance[]>(() => {
    const factory = factories?.find((f) => f._id === selectedRouteFactoryId)
    if (!factory?.cityCode) return []
    const coord = getCityCoordinates(factory.cityCode)
    if (!coord) return []
    return findNearestPorts(coord, 5)
  }, [factories, selectedRouteFactoryId])

  // 제품 개수가 변경되면 주문 건수 자동 업데이트 (사용자가 수동 조절하지 않은 경우)
  const [isOrderCountManual, setIsOrderCountManual] = useState(false)

  // ===== 컨테이너(FCL) 모드 =====
  // 📌 비유: "택배(LCL)" vs "이삿짐 트럭(FCL)" 전환 스위치
  const [containerMode, setContainerMode] = useState(false)
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("via3PL")
  // 사용자가 결과 패널에서 직접 수정한 컨테이너 비용 오버라이드
  const [containerConfigOverrides, setContainerConfigOverrides] = useState<Partial<
    Record<ContainerType, Partial<ContainerConfig[ContainerType]>>
  >>({})

  // ===== FCL 항구 선택 =====
  // 📌 비유: 이삿짐 트럭(FCL)을 보낼 때 "가장 가까운 항구" 자동 선택
  const [selectedPortId, setSelectedPortId] = useState<string | null>(null)
  const [portDistanceKm, setPortDistanceKm] = useState<number | null>(null)        // 직선 거리 (Haversine)
  const [portRoadDistanceKm, setPortRoadDistanceKm] = useState<number | null>(null) // 도로 거리 (Google Directions)

  // 실제 계산에 사용되는 컨테이너 설정 (DB 설정 + UI 오버라이드 병합)
  // 📌 우선순위: UI 직접 수정 > DB 저장 설정 > 기본값
  const mergedContainerConfig = useMemo<ContainerConfig>(() => {
    const base = DEFAULT_CONTAINER_CONFIG
    const result = { ...base }
    for (const type of ["20DC", "40DC", "40HC"] as ContainerType[]) {
      // DB에서 가져온 컨테이너 내륙 설정 반영
      const dbInland = containerInlandConfig[type]
      if (dbInland) {
        result[type] = {
          ...base[type],
          inlandMinCost: dbInland.minCost,
          inlandPerKmRate: dbInland.perKmRate,
        }
      }
      // UI 오버라이드 반영 (가장 높은 우선순위)
      const overrides = containerConfigOverrides[type]
      if (overrides) {
        result[type] = { ...result[type], ...overrides }
      }
    }
    return result
  }, [containerConfigOverrides, containerInlandConfig])

  // ===== 설정 모달 =====
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<"shipping" | "factories" | "presets" | "costSettings">("shipping")

  // ===== 자동 선택 로직 =====
  // 📌 기본값: 고포트 → 위해 LCL → 평균 / 출발지: Dixin Toys

  // 업체 자동 선택 (고포트 우선, 없으면 첫 번째)
  useEffect(() => {
    if (companies && companies.length > 0 && !selectedCompanyId) {
      const goport = companies.find((c) => c.name === "고포트")
      setSelectedCompanyId(goport ? goport._id : companies[0]._id)
    }
  }, [companies, selectedCompanyId])

  // 출발지(공장) 자동 선택 (Dixin Toys 우선, 없으면 첫 번째)
  useEffect(() => {
    if (factories && factories.length > 0 && !selectedRouteFactoryId) {
      const dixinToys = factories.find((f) => f.name === "Dixin Toys")
      setSelectedRouteFactoryId(dixinToys ? dixinToys._id : factories[0]._id)
    }
  }, [factories, selectedRouteFactoryId])

  // 도착지(창고) 자동 선택 (위해 LCL 우선, 없으면 첫 번째)
  useEffect(() => {
    if (warehouses && warehouses.length > 0 && !selectedRouteWarehouseId) {
      const weihai = warehouses.find((w) => w.name.includes("위해"))
      setSelectedRouteWarehouseId(weihai ? weihai._id : warehouses[0]._id)
    }
  }, [warehouses, selectedRouteWarehouseId])

  // 운임 타입 자동 선택 (평균 우선 → isDefault → 첫 번째)
  useEffect(() => {
    if (rateTypes && rateTypes.length > 0 && !selectedRateTypeId) {
      const average = rateTypes.find((rt) => rt.name === "평균")
      if (average) {
        setSelectedRateTypeId(average._id)
      } else if (defaultRateType) {
        setSelectedRateTypeId(defaultRateType._id)
      } else {
        setSelectedRateTypeId(rateTypes[0]._id)
      }
    }
  }, [rateTypes, defaultRateType, selectedRateTypeId])

  // 업체 변경 시 공통 비용 및 도착지 초기화
  useEffect(() => {
    setSelectedCompanyCostIds([])
    setSelectedRouteWarehouseId(null)
  }, [selectedCompanyId])

  // 창고(배송지) 변경 시 운임 타입 초기화
  // 📌 비유: 물류센터를 바꾸면 이전 센터의 요금제가 아닌 새 센터의 요금제를 봐야 함
  useEffect(() => {
    setSelectedRateTypeId(null)
  }, [selectedRouteWarehouseId])

  // 필수 공통 비용 자동 선택
  useEffect(() => {
    if (companyCostItems) {
      const requiredIds = companyCostItems
        .filter((item) => item.isRequired)
        .map((item) => item._id)

      if (requiredIds.length > 0) {
        setSelectedCompanyCostIds((prev) => {
          const hasAllRequired = requiredIds.every((id) => prev.includes(id))
          if (hasAllRequired) return prev

          const newIds = [...new Set([...prev, ...requiredIds])]
          return newIds
        })
      }
    }
  }, [companyCostItems])

  // 기본 프리셋 자동 적용 (페이지 로드 시 1회만)
  useEffect(() => {
    // 이미 로드했거나, 기본 프리셋이 없으면 스킵
    if (hasLoadedDefaultPreset || !defaultPreset) return

    // 기본 프리셋을 슬롯에 적용
    const newSlots: FactorySlot[] = defaultPreset.slots.map((slot) => ({
      factoryId: slot.factoryId as Id<"factories"> | null,
      selectedItemIds: slot.selectedItemIds,
      costValues: slot.costValues as { [itemId: string]: number },
    }))

    // 최소 2개 슬롯 보장
    while (newSlots.length < 2) {
      newSlots.push({
        factoryId: null,
        selectedItemIds: [],
        costValues: {},
      })
    }

    setFactorySlots(newSlots)
    setSelectedPresetId(defaultPreset._id)
    setHasLoadedDefaultPreset(true)  // 로드 완료 표시
  }, [defaultPreset, hasLoadedDefaultPreset])

  // FCL 모드: 공장 변경 시 가장 가까운 항구 자동 선택
  // 📌 비유: 이삿짐 센터에서 "가장 가까운 항구"를 자동 추천해주는 것
  useEffect(() => {
    if (!containerMode) return // LCL 모드면 스킵

    if (nearestPorts.length > 0) {
      // 가장 가까운 항구 자동 선택
      setSelectedPortId(nearestPorts[0].id)
      setPortDistanceKm(nearestPorts[0].distanceKm)
      setPortRoadDistanceKm(null) // 도로 거리는 RouteMap에서 계산
    } else {
      setSelectedPortId(null)
      setPortDistanceKm(null)
      setPortRoadDistanceKm(null)
    }
  }, [containerMode, nearestPorts])

  // 항구 수동 변경 시 직선 거리 업데이트
  const handlePortChange = useCallback((portId: string) => {
    setSelectedPortId(portId)
    setPortRoadDistanceKm(null) // 도로 거리 리셋 (RouteMap에서 재계산)

    const factory = factories?.find((f) => f._id === selectedRouteFactoryId)
    if (factory?.cityCode) {
      const coord = getCityCoordinates(factory.cityCode)
      const port = getPortById(portId)
      if (coord && port) {
        setPortDistanceKm(Math.round(calculateDistance(coord, port)))
      }
    }
  }, [factories, selectedRouteFactoryId])

  // 제품 개수 변경 시 주문 건수 자동 업데이트
  // 📌 비유: 장바구니에 상품을 담으면 자동으로 배송비 계산 단위가 업데이트되는 것
  useEffect(() => {
    if (!isOrderCountManual) {
      // 제품 개수 + 1 (기본값 2를 기반으로)
      setOrderCount(products.length + 1)
    }
  }, [products.length, isOrderCountManual])

  // 주문 건수 수동 변경 핸들러
  const handleOrderCountChange = useCallback((count: number) => {
    setOrderCount(count)
    setIsOrderCountManual(true)  // 수동 변경 플래그
  }, [])

  // ===== 다중 제품 계산 결과 =====
  const calculationResult = useMemo<MultiProductCalculationResult | null>(() => {
    // 환율 검증
    if (!usdRate || !cnyRate) {
      return null
    }

    // 유효한 제품이 있는지 확인 (단가와 수량이 모두 입력된 제품)
    const hasValidProduct = products.some(
      (p) => p.unitPrice > 0 && p.quantity > 0
    )
    if (!hasValidProduct) {
      return null
    }

    // 운송료 테이블 변환 (기존 데이터 호환성 처리)
    const rateTable: ShippingRateTable[] = shippingRates
      ? shippingRates.map((r) => ({
          cbm: r.cbm,
          // 기존 데이터(rateUSD)와 새 데이터(rate) 호환성 처리
          rate: (r as { rate?: number; rateUSD?: number }).rate
            ?? (r as { rate?: number; rateUSD?: number }).rateUSD
            ?? 0,
        }))
      : []

    // 선택된 운임 타입의 통화 및 단위 가져오기
    const selectedRateType = rateTypes?.find((rt) => rt._id === selectedRateTypeId)
    const rateTypeCurrency = (selectedRateType?.currency ?? "USD") as "USD" | "CNY" | "KRW"
    const rateTypeUnitType = (selectedRateType?.unitType ?? "cbm") as "cbm" | "kg"

    // 공장 슬롯 변환 (다중 제품용)
    // 📌 현재는 linkedProductIds가 없으므로 모든 제품에 연결
    // Phase 4에서 UI로 연결 제품을 선택할 수 있도록 추가
    const factorySlotInputs: FactorySlotInput[] = factorySlots
      .filter((slot) => slot.factoryId !== null)
      .map((slot) => {
        const factory = factories?.find((f) => f._id === slot.factoryId)
        const costItems = factoryCostItemsMap.get(slot.factoryId!)

        return {
          factoryId: slot.factoryId as string,
          factoryName: factory?.name ?? "",
          currency: (factory?.currency ?? "CNY") as "USD" | "CNY",
          // 현재 슬롯의 linkedProductIds가 있으면 사용, 없으면 모든 제품에 연결
          linkedProductIds: slot.linkedProductIds?.length
            ? slot.linkedProductIds
            : products.map((p) => p.id),
          items: slot.selectedItemIds
            .map((itemId) => {
              const item = costItems?.find((i) => i._id === itemId)
              if (!item) return null
              return {
                itemId,
                name: item.name,
                unitAmount: slot.costValues[itemId] ?? 0,
                quantity: slot.quantityValues?.[itemId] ?? 1,
                // 과금 방식: 프론트 오버라이드 → DB 기본값 → "once"
                chargeType: (slot.chargeTypeValues?.[itemId] ?? item.chargeType ?? "once") as "once" | "per_quantity",
              }
            })
            .filter((item): item is NonNullable<typeof item> => item !== null),
        }
      })

    // 업체별 공통 비용 변환
    const companyCosts = selectedCompanyCostIds
      .map((id) => {
        const item = companyCostItems?.find((i) => i._id === id)
        if (!item) return null
        return {
          id: item._id,
          name: item.name,
          amount: item.defaultAmount,
          isDivisible: item.isDivisible,
        }
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)

    // 다중 제품 계산 실행
    return calculateMultiProductImportCost({
      products,
      exchangeRates: {
        usd: usdRate,
        cny: cnyRate,
      },
      factorySlots: factorySlotInputs,
      shippingRates: rateTable,
      rateTypeCurrency,
      rateTypeUnitType,
      companyCosts,
      orderCount,
      costSettings: {
        inland: inlandConfig,
        domestic: domesticConfig,
        threePL: threePLConfig,
      },
      // 컨테이너(FCL) 모드 파라미터
      containerMode,
      containerConfig: mergedContainerConfig,
      deliveryMethod,
      // FCL 모드: 공장→항구 거리 (도로 거리 우선, 없으면 직선 거리)
      distanceKm: containerMode
        ? (portRoadDistanceKm ?? portDistanceKm ?? undefined)
        : undefined,
    })
  }, [
    products,
    usdRate,
    cnyRate,
    factorySlots,
    factories,
    factoryCostItemsMap,
    selectedCompanyCostIds,
    companyCostItems,
    shippingRates,
    rateTypes,
    selectedRateTypeId,
    orderCount,
    inlandConfig,
    domesticConfig,
    threePLConfig,
    // 컨테이너 관련 의존성
    containerMode,
    mergedContainerConfig,
    deliveryMethod,
    portDistanceKm,
    portRoadDistanceKm,
  ])

  // 설정 모달 열기
  const handleSettingsClick = useCallback(() => {
    setSettingsTab("shipping")
    setSettingsOpen(true)
  }, [])

  // 공장 설정 모달 열기
  const handleFactorySettingsClick = useCallback(() => {
    setSettingsTab("factories")
    setSettingsOpen(true)
  }, [])

  // ===== 프리셋 핸들러 =====
  // 프리셋 불러오기
  const handleLoadPreset = useCallback((preset: FactoryPreset) => {
    // 프리셋 슬롯을 현재 슬롯 형식으로 변환
    const newSlots: FactorySlot[] = preset.slots.map((slot) => ({
      factoryId: slot.factoryId as Id<"factories"> | null,
      selectedItemIds: slot.selectedItemIds,
      costValues: slot.costValues as { [itemId: string]: number },
      chargeTypeValues: slot.chargeTypeValues as { [itemId: string]: "once" | "per_quantity" } | undefined,
    }))

    // 최소 2개 슬롯 보장
    while (newSlots.length < 2) {
      newSlots.push({
        factoryId: null,
        selectedItemIds: [],
        costValues: {},
        chargeTypeValues: {},
      })
    }

    setFactorySlots(newSlots)
    setSelectedPresetId(preset._id)  // 선택된 프리셋 ID 저장
  }, [])

  // 프리셋 저장 (신규 생성)
  const handleSavePreset = useCallback(async (name: string) => {
    // 현재 슬롯을 프리셋 형식으로 변환
    const slotsToSave: PresetSlot[] = factorySlots
      .filter((slot) => slot.factoryId !== null)  // 공장 선택된 슬롯만
      .map((slot) => ({
        factoryId: slot.factoryId as string,
        selectedItemIds: slot.selectedItemIds,
        costValues: slot.costValues,
        chargeTypeValues: slot.chargeTypeValues,
      }))

    const newPresetId = await createPreset({ name, slots: slotsToSave })
    setSelectedPresetId(newPresetId)  // 새로 저장된 프리셋 선택
  }, [factorySlots, createPreset])

  // 총 수량 계산 (결과 표시용)
  const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0)

  // 애니메이션 설정 (토스 스타일의 부드러운 효과)
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1] as const,
      },
    },
  }

  return (
    <div className="h-screen bg-gray-50">
      {/* 메인 컨텐츠 - 2열 그리드 */}
      <main className="h-full px-4 py-3 overflow-hidden">
        <div className="grid grid-cols-2 gap-4 h-full">
          {/* 좌측: 입력 영역 */}
          <motion.div
            className="h-full space-y-3 overflow-y-auto pr-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* 1. 오늘의 환율 (표시 전용, 통화 선택은 제품 카드에서) */}
            <motion.div variants={itemVariants}>
              <ExchangeRateDisplay
                usdRate={usdRate}
                cnyRate={cnyRate}
                updatedAt={updatedAt}
                history={rateHistory}
                onRefresh={refetchRates}
                isLoading={rateLoading}
              />
            </motion.div>

            {/* 2. 운송 경로 (업체 → 도착지 → 운임 타입 → 출발지 통합) */}
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-lg border border-gray-200 p-3"
            >
              <RouteSelector
                companies={companies}
                selectedCompanyId={selectedCompanyId}
                onCompanyChange={setSelectedCompanyId}
                factories={factories}
                selectedFactoryId={selectedRouteFactoryId}
                onFactoryChange={setSelectedRouteFactoryId}
                warehouses={warehouses}
                selectedWarehouseId={selectedRouteWarehouseId}
                onWarehouseChange={setSelectedRouteWarehouseId}
                rateTypes={rateTypes}
                selectedRateTypeId={selectedRateTypeId}
                onRateTypeChange={setSelectedRateTypeId}
                onSettingsClick={handleSettingsClick}
                isLoading={factoriesLoading || warehousesLoading || companiesLoading || rateTypesLoading}
                // FCL 항구 선택 props
                containerMode={containerMode}
                selectedPortId={selectedPortId}
                onPortChange={handlePortChange}
                nearestPorts={nearestPorts}
                portDistanceKm={portDistanceKm}
                portRoadDistanceKm={portRoadDistanceKm}
                onPortRoadDistanceChange={setPortRoadDistanceKm}
                // 오버플로우 시 LCL 경로 설정 노출
                hasOverflow={calculationResult?.containerComparison?.selectedOption.hasOverflow ?? false}
              />
            </motion.div>

            {/* 3. 제품 목록 (다중 제품 입력) */}
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-lg border border-gray-200 p-3"
            >
              <ProductList
                products={products}
                setProducts={setProducts}
                productResults={calculationResult?.products}
              />
            </motion.div>

            {/* 4. 중국 공장 추가 비용 */}
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-lg border border-gray-200 p-3"
            >
              <AdditionalCostInput
                slots={factorySlots}
                setSlots={setFactorySlots}
                factories={factories}
                factoryCostItemsMap={factoryCostItemsMap}
                onSettingsClick={handleFactorySettingsClick}
                isLoading={factoriesLoading || factoryCostItemsLoading}
                usdRate={usdRate}
                cnyRate={cnyRate}
                presets={presets}
                selectedPresetId={selectedPresetId}
                onLoadPreset={handleLoadPreset}
                onSavePreset={() => setPresetDialogOpen(true)}
                products={products}
              />
            </motion.div>

            {/* 5. 업체별 공통 비용 */}
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-lg border border-gray-200 p-3"
            >
              <CompanyCostSelector
                items={companyCostItems}
                selectedIds={selectedCompanyCostIds}
                setSelectedIds={setSelectedCompanyCostIds}
                orderCount={orderCount}
                setOrderCount={handleOrderCountChange}
                isLoading={companyCostsLoading}
              />
            </motion.div>
          </motion.div>

          {/* 우측: 결과 영역 */}
          <motion.div
            className="h-full space-y-3 overflow-y-auto pl-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          >
            {/* 비용 상세 내역 (다중 제품용) */}
            <MultiProductCostBreakdown
              result={calculationResult}
              products={products}
              usdRate={usdRate}
              cnyRate={cnyRate}
              factorySlots={factorySlots}
              costSettings={{
                inland: inlandConfig,
                domestic: domesticConfig,
                threePL: threePLConfig,
              }}
              orderCount={orderCount}
              // 컨테이너(FCL) 모드 props
              containerMode={containerMode}
              onContainerModeChange={setContainerMode}
              deliveryMethod={deliveryMethod}
              onDeliveryMethodChange={setDeliveryMethod}
              containerConfig={mergedContainerConfig}
              onContainerConfigChange={setContainerConfigOverrides}
            />
          </motion.div>
        </div>
      </main>

      {/* 설정 모달 */}
      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        defaultTab={settingsTab}
      />

      {/* 프리셋 저장 다이얼로그 */}
      <PresetSaveDialog
        open={presetDialogOpen}
        onOpenChange={setPresetDialogOpen}
        slots={factorySlots}
        factories={factories}
        factoryCostItemsMap={factoryCostItemsMap}
        onSave={handleSavePreset}
      />
    </div>
  )
}
