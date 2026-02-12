"use client"

import { useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"

// 운임 타입 관련 훅 (배송지(창고) 기반)
// 📌 비유: 특정 물류센터의 요금제 목록을 가져오는 것
export function useShippingRateTypes(warehouseId: Id<"companyWarehouses"> | null) {
  const rateTypes = useQuery(
    api.shippingRateTypes.listByWarehouse,
    warehouseId ? { warehouseId } : "skip"
  )

  const createRateType = useMutation(api.shippingRateTypes.create)
  const updateRateType = useMutation(api.shippingRateTypes.update)
  const removeRateType = useMutation(api.shippingRateTypes.remove)

  // 기본 운임 타입 찾기 (useMemo로 안정화)
  const defaultRateType = useMemo(() => {
    return rateTypes?.find((rt) => rt.isDefault)
  }, [rateTypes])

  return {
    rateTypes,
    defaultRateType,
    // 📌 핵심: 쿼리가 skip된 상태(warehouseId가 null)는 "로딩 중"이 아님
    //    "아직 창고를 안 골랐으니 데이터가 없는 게 정상"이라는 뜻
    //    이걸 true로 두면 다른 드롭다운까지 비활성화되는 순환 의존성 발생
    isLoading: warehouseId ? rateTypes === undefined : false,
    createRateType,
    updateRateType,
    removeRateType,
  }
}

// 운송료 테이블 관련 훅
export function useShippingRates(rateTypeId: Id<"shippingRateTypes"> | null) {
  const rates = useQuery(
    api.shippingRates.listByRateType,
    rateTypeId ? { rateTypeId } : "skip"
  )

  const createRate = useMutation(api.shippingRates.create)
  const createBulkRates = useMutation(api.shippingRates.createBulk)
  const updateRate = useMutation(api.shippingRates.update)
  const removeRate = useMutation(api.shippingRates.remove)
  const removeAllRates = useMutation(api.shippingRates.removeAllByRateType)

  // CBM 기준 정렬 (useMemo로 안정화)
  const sortedRates = useMemo(() => {
    if (!rates) return undefined
    return [...rates].sort((a, b) => a.cbm - b.cbm)
  }, [rates])

  return {
    rates: sortedRates,
    isLoading: rates === undefined,
    createRate,
    createBulkRates,
    updateRate,
    removeRate,
    removeAllRates,
  }
}

// 특정 CBM의 운송료 계산 훅
export function useCalculatedRate(
  rateTypeId: Id<"shippingRateTypes"> | null,
  cbm: number
) {
  const calculatedRate = useQuery(
    api.shippingRates.calculateRate,
    rateTypeId && cbm > 0 ? { rateTypeId, cbm } : "skip"
  )

  return {
    rate: calculatedRate,
    isLoading: calculatedRate === undefined,
  }
}
