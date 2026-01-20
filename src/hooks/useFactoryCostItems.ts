"use client"

import { useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"

// 공장별 비용 항목 관련 훅 (단일 공장)
export function useFactoryCostItems(factoryId: Id<"factories"> | null) {
  // 특정 공장의 비용 항목 조회
  const costItems = useQuery(
    api.factoryCostItems.listByFactory,
    factoryId ? { factoryId } : "skip"
  )

  const createCostItem = useMutation(api.factoryCostItems.create)
  const updateCostItem = useMutation(api.factoryCostItems.update)
  const removeCostItem = useMutation(api.factoryCostItems.remove)

  // 정렬된 항목 (useMemo로 안정화)
  const sortedCostItems = useMemo(() => {
    if (!costItems) return undefined
    return [...costItems].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [costItems])

  return {
    costItems: sortedCostItems,
    isLoading: factoryId ? costItems === undefined : false,
    createCostItem,
    updateCostItem,
    removeCostItem,
  }
}

// 모든 공장의 비용 항목을 Map으로 반환하는 훅
export function useAllFactoryCostItems() {
  const allCostItems = useQuery(api.factoryCostItems.listAll)

  // 공장별로 그룹화된 Map 생성
  const costItemsMap = useMemo(() => {
    const map = new Map<string, typeof allCostItems>()
    if (!allCostItems) return map

    allCostItems.forEach((item) => {
      const factoryId = item.factoryId
      const existing = map.get(factoryId) ?? []
      map.set(factoryId, [...existing, item].sort((a, b) => a.sortOrder - b.sortOrder))
    })

    return map
  }, [allCostItems])

  return {
    costItemsMap,
    isLoading: allCostItems === undefined,
  }
}
