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

// 입력 컴포넌트
import {
  ShippingCompanySelector,
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

  // 운임 타입
  const { rateTypes, defaultRateType, isLoading: rateTypesLoading } = useShippingRateTypes(selectedCompanyId)
  const [selectedRateTypeId, setSelectedRateTypeId] = useState<Id<"shippingRateTypes"> | null>(null)

  // 운송료 테이블
  const { rates: shippingRates, isLoading: shippingRatesLoading } = useShippingRates(selectedRateTypeId)

  // ===== 중국 공장 =====
  const { factories, isLoading: factoriesLoading } = useFactories()
  const { costItemsMap: factoryCostItemsMap, isLoading: factoryCostItemsLoading } = useAllFactoryCostItems()

  // ===== 운송 경로 (출발지/도착지) =====
  const { warehouses, isLoading: warehousesLoading } = useCompanyWarehouses(selectedCompanyId)
  const [selectedRouteFactoryId, setSelectedRouteFactoryId] = useState<string | null>(null)
  const [selectedRouteWarehouseId, setSelectedRouteWarehouseId] = useState<string | null>(null)

  // ===== 비용 설정 (내륙운송료, 국내운송료, 3PL) =====
  const { inlandConfig, domesticConfig, threePLConfig } = useCostSettings()

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

  // 제품 개수가 변경되면 주문 건수 자동 업데이트 (사용자가 수동 조절하지 않은 경우)
  const [isOrderCountManual, setIsOrderCountManual] = useState(false)

  // ===== 설정 모달 =====
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<"companies" | "rates" | "companyCosts" | "factories">("companies")

  // ===== 자동 선택 로직 =====
  // 첫 번째 업체 자동 선택
  useEffect(() => {
    if (companies && companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0]._id)
    }
  }, [companies, selectedCompanyId])

  // 기본 운임 타입 자동 선택
  useEffect(() => {
    if (defaultRateType && !selectedRateTypeId) {
      setSelectedRateTypeId(defaultRateType._id)
    } else if (rateTypes && rateTypes.length > 0 && !selectedRateTypeId) {
      setSelectedRateTypeId(rateTypes[0]._id)
    }
  }, [rateTypes, defaultRateType, selectedRateTypeId])

  // 업체 변경 시 공통 비용 및 도착지 초기화
  useEffect(() => {
    setSelectedCompanyCostIds([])
    setSelectedRouteWarehouseId(null)
  }, [selectedCompanyId])

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

    // 선택된 운임 타입의 통화 가져오기
    const selectedRateType = rateTypes?.find((rt) => rt._id === selectedRateTypeId)
    const rateTypeCurrency = (selectedRateType?.currency ?? "USD") as "USD" | "CNY" | "KRW"

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
      companyCosts,
      orderCount,
      costSettings: {
        inland: inlandConfig,
        domestic: domesticConfig,
        threePL: threePLConfig,
      },
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
  ])

  // 설정 모달 열기
  const handleSettingsClick = useCallback(() => {
    setSettingsTab("companies")
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

            {/* 2. 운송 경로 (출발지/도착지) */}
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-lg border border-gray-200 p-3"
            >
              <RouteSelector
                factories={factories}
                selectedFactoryId={selectedRouteFactoryId}
                onFactoryChange={setSelectedRouteFactoryId}
                warehouses={warehouses}
                selectedWarehouseId={selectedRouteWarehouseId}
                onWarehouseChange={setSelectedRouteWarehouseId}
                companyName={companies?.find((c) => c._id === selectedCompanyId)?.name}
                isLoading={factoriesLoading || warehousesLoading}
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

            {/* 5. [국제 운송 회사] [업체별 공통 비용] - 2열 그리드 */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <ShippingCompanySelector
                  companies={companies}
                  selectedCompanyId={selectedCompanyId}
                  setSelectedCompanyId={setSelectedCompanyId}
                  rateTypes={rateTypes}
                  selectedRateTypeId={selectedRateTypeId}
                  setSelectedRateTypeId={setSelectedRateTypeId}
                  onSettingsClick={handleSettingsClick}
                  isLoading={companiesLoading || rateTypesLoading}
                />
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <CompanyCostSelector
                  items={companyCostItems}
                  selectedIds={selectedCompanyCostIds}
                  setSelectedIds={setSelectedCompanyCostIds}
                  orderCount={orderCount}
                  setOrderCount={handleOrderCountChange}
                  isLoading={companyCostsLoading}
                />
              </div>
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
