"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Id } from "../../../convex/_generated/dataModel"
import { ProductDimensions, CalculationResult } from "@/types/shipping"
import type { HsCodeWithTariff } from "@/types/tariff"
import {
  useExchangeRate,
  useShippingCompanies,
  useShippingRateTypes,
  useShippingRates,
  useCompanyCosts,
  useFactories,
  useAllFactoryCostItems,
  useAutoSeed,
} from "@/hooks"
import {
  calculateImportCost,
  calculateUnitCbm,
  calculateTotalCbm,
  roundCbmToHalf,
  ShippingRateTable,
} from "@/lib/calculations"

// 입력 컴포넌트
import {
  ProductInfoInput,
  DimensionsInput,
  ShippingCompanySelector,
  AdditionalCostInput,
  CompanyCostSelector,
  TariffRateInput,
} from "./input"
import { FactorySlot, createEmptySlots } from "./input/AdditionalCostInput"

// 결과 컴포넌트
import {
  CBMDisplay,
  CostBreakdown,
  TotalCostCard,
  ExchangeRateDisplay,
} from "./result"

// 설정 모달
import { SettingsModal } from "./admin/SettingsModal"

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

  // ===== 제품 정보 상태 =====
  const [unitPrice, setUnitPrice] = useState<string>("")
  const [quantity, setQuantity] = useState<string>("")
  const [currency, setCurrency] = useState<"USD" | "CNY">("USD")
  const [dimensions, setDimensions] = useState<ProductDimensions>({
    width: 10,
    height: 10,
    depth: 10,
  })
  const [selectedProduct, setSelectedProduct] = useState<HsCodeWithTariff | null>(null)

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

  // 부대 비용 슬롯 (기본 2개)
  const [factorySlots, setFactorySlots] = useState<FactorySlot[]>(() => createEmptySlots(2))

  // ===== 업체별 공통 비용 =====
  const { items: companyCostItems, isLoading: companyCostsLoading } = useCompanyCosts(selectedCompanyId)
  const [selectedCompanyCostIds, setSelectedCompanyCostIds] = useState<Id<"companyCostItems">[]>([])
  const [orderCount, setOrderCount] = useState<number>(1)

  // ===== 관세율 =====
  const [basicTariffRate, setBasicTariffRate] = useState<number>(0)
  const [ftaTariffRate, setFtaTariffRate] = useState<number>(0)
  const [useFta, setUseFta] = useState<boolean>(true)  // 디폴트: FTA 적용

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

  // 업체 변경 시 공통 비용 초기화
  useEffect(() => {
    setSelectedCompanyCostIds([])
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

  // 기본 제품 자동 선택 (봉제 인형)
  useEffect(() => {
    // 이미 선택된 제품이 있으면 스킵
    if (selectedProduct) return

    // 봉제 인형 데이터 가져오기
    const fetchDefaultProduct = async () => {
      try {
        const response = await fetch("/api/tariff/search?q=봉제")
        const data = await response.json()

        if (data.success && data.data && data.data.length > 0) {
          // 봉제 인형 찾기
          const stuffedToy = data.data.find((item: HsCodeWithTariff) =>
            item.code === "9503003411" || item.nameKo.includes("봉제 인형")
          )

          if (stuffedToy) {
            setSelectedProduct(stuffedToy)
            setBasicTariffRate(stuffedToy.basicRate)
            setFtaTariffRate(stuffedToy.chinaFtaRate ?? 0)
          }
        }
      } catch (error) {
        console.error("기본 제품 로딩 실패:", error)
      }
    }

    fetchDefaultProduct()
  }, []) // 컴포넌트 마운트 시 한 번만 실행

  // ===== CBM 계산 =====
  const cbmResult = useMemo(() => {
    const qty = Number(quantity) || 0
    const unitCbm = calculateUnitCbm(dimensions)
    const totalCbm = calculateTotalCbm(dimensions, qty)
    const roundedCbm = roundCbmToHalf(totalCbm)

    return {
      unitCbm: unitCbm > 0 ? unitCbm : null,
      totalCbm: totalCbm > 0 ? totalCbm : null,
      roundedCbm: roundedCbm > 0 ? roundedCbm : null,
    }
  }, [dimensions, quantity])

  // ===== 계산 결과 =====
  const calculationResult = useMemo<CalculationResult | null>(() => {
    const price = Number(unitPrice) || 0
    const qty = Number(quantity) || 0
    const exchangeRate = currency === "USD" ? (usdRate ?? 0) : (cnyRate ?? 0)

    // 필수값 검증
    if (price <= 0 || qty <= 0 || exchangeRate <= 0) {
      return null
    }

    // 운송료 테이블 변환
    const rateTable: ShippingRateTable[] = shippingRates
      ? shippingRates.map((r) => ({
          cbm: r.cbm,
          rateUSD: r.rateUSD,
          rateKRW: r.rateKRW,
        }))
      : []

    // 부대 비용 변환 (공장별 통화 → 원화, 통화 정보 포함)
    const additionalCostList: { id: string; name: string; amount: number; amountForeign: number; currency: "USD" | "CNY" }[] = []

    factorySlots.forEach((slot, slotIndex) => {
      if (!slot.factoryId) return

      const factory = factories?.find((f) => f._id === slot.factoryId)
      if (!factory) return

      const factoryExchangeRate = factory.currency === "USD" ? (usdRate ?? 0) : (cnyRate ?? 0)
      const factoryCurrency = factory.currency as "USD" | "CNY"
      const costItems = factoryCostItemsMap.get(slot.factoryId)

      slot.selectedItemIds.forEach((itemId) => {
        const item = costItems?.find((i) => i._id === itemId)
        if (!item) return

        const amountForeign = slot.costValues[itemId] ?? 0
        if (amountForeign <= 0) return

        additionalCostList.push({
          id: `slot${slotIndex}-${slot.factoryId}-${itemId}`,
          name: `${factory.name} - ${item.name}`,
          amount: amountForeign * factoryExchangeRate,
          amountForeign,
          currency: factoryCurrency,
        })
      })
    })

    // 업체별 공통 비용 변환 (부가세 적용 여부 포함)
    const companyCosts = selectedCompanyCostIds
      .map((id) => {
        const item = companyCostItems?.find((i) => i._id === id)
        if (!item) return null
        return {
          id: item._id,
          name: item.name,
          amount: item.defaultAmount,
          isDivisible: item.isDivisible,
          isVatApplicable: item.isVatApplicable ?? false,  // 부가세 적용 여부
        }
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)

    // 실제 적용할 관세율 결정
    const appliedTariffRate = useFta ? ftaTariffRate : basicTariffRate

    // 계산 실행
    return calculateImportCost({
      unitPrice: price,
      quantity: qty,
      dimensions,
      exchangeRate,
      usdRate: usdRate ?? 0,  // 내륙 운송료 환산용
      tariffRate: appliedTariffRate,
      basicTariffRate,
      ftaTariffRate,
      additionalCosts: additionalCostList,
      shippingRates: rateTable,
      companyCosts,
      orderCount,
    })
  }, [
    unitPrice,
    quantity,
    currency,
    usdRate,
    cnyRate,
    dimensions,
    basicTariffRate,
    ftaTariffRate,
    useFta,
    factorySlots,
    factories,
    factoryCostItemsMap,
    selectedCompanyCostIds,
    companyCostItems,
    shippingRates,
    orderCount,
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

  // 제품 선택 시 관세율 자동 적용
  const handleTariffRateSelect = useCallback((basicRate: number, ftaRate: number | null) => {
    setBasicTariffRate(basicRate)
    if (ftaRate !== null) {
      setFtaTariffRate(ftaRate)
    } else {
      setFtaTariffRate(0)
    }
  }, [])

  return (
    <div className="h-screen bg-gray-50">
      {/* 메인 컨텐츠 - 좌우 2단 레이아웃 (50:50) */}
      <main className="h-full px-4 py-3 overflow-hidden">
        <div className="h-full grid grid-cols-2 gap-6">
          {/* 좌측: 입력 영역 */}
          <div className="space-y-3 overflow-y-auto pr-2">
            {/* 1. 오늘의 환율 (통화 선택) */}
            <ExchangeRateDisplay
              usdRate={usdRate}
              cnyRate={cnyRate}
              selectedCurrency={currency}
              updatedAt={updatedAt}
              history={rateHistory}
              onRefresh={refetchRates}
              isLoading={rateLoading}
              onCurrencyChange={setCurrency}
            />

            {/* 2. 제품 정보 (제품명 + 원가/수량 + 크기 + CBM 통합) */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <ProductInfoInput
                unitPrice={unitPrice}
                setUnitPrice={setUnitPrice}
                quantity={quantity}
                setQuantity={setQuantity}
                currency={currency}
                selectedProduct={selectedProduct}
                setSelectedProduct={setSelectedProduct}
                onTariffRateSelect={handleTariffRateSelect}
              />
              {/* [제품 단일 크기] [CBM] 2열 배치 */}
              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                <DimensionsInput
                  dimensions={dimensions}
                  setDimensions={setDimensions}
                />
                <CBMDisplay
                  unitCbm={cbmResult.unitCbm}
                  totalCbm={cbmResult.totalCbm}
                  roundedCbm={cbmResult.roundedCbm}
                />
              </div>
            </div>

            {/* 3. 중국 공장 추가 비용 */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <AdditionalCostInput
                slots={factorySlots}
                setSlots={setFactorySlots}
                factories={factories}
                factoryCostItemsMap={factoryCostItemsMap}
                onSettingsClick={handleFactorySettingsClick}
                isLoading={factoriesLoading || factoryCostItemsLoading}
                usdRate={usdRate}
                cnyRate={cnyRate}
              />
            </div>

            {/* 5. [국제 운송 회사] [업체별 공통 비용] - 2열 그리드 */}
            <div className="grid grid-cols-2 gap-3">
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
                  setOrderCount={setOrderCount}
                  isLoading={companyCostsLoading}
                />
              </div>
            </div>

            {/* 6. 관세율 (기본/FTA) */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <TariffRateInput
                basicTariffRate={basicTariffRate}
                setBasicTariffRate={setBasicTariffRate}
                ftaTariffRate={ftaTariffRate}
                setFtaTariffRate={setFtaTariffRate}
                useFta={useFta}
                setUseFta={setUseFta}
              />
            </div>
          </div>

          {/* 우측: 결과 영역 */}
          <div className="space-y-3 overflow-y-auto">
            {/* 총 수입원가 */}
            <TotalCostCard
              totalCost={calculationResult?.totalCost ?? null}
              unitCost={calculationResult?.unitCost ?? null}
              quantity={Number(quantity) || 0}
            />

            {/* 비용 상세 내역 */}
            <CostBreakdown
              result={calculationResult}
              currency={currency}
              exchangeRate={currency === "USD" ? usdRate : cnyRate}
              usdRate={usdRate}
              useFta={useFta}
              roundedCbm={cbmResult.roundedCbm}
            />
          </div>
        </div>
      </main>

      {/* 설정 모달 */}
      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        defaultTab={settingsTab}
      />
    </div>
  )
}
