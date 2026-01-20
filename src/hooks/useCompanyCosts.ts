"use client"

import { useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"

// 업체별 공통 비용 관련 훅
export function useCompanyCosts(companyId: Id<"shippingCompanies"> | null) {
  const costItems = useQuery(
    api.companyCosts.listByCompany,
    companyId ? { companyId } : "skip"
  )

  const createCostItem = useMutation(api.companyCosts.create)
  const createBulkCostItems = useMutation(api.companyCosts.createBulk)
  const updateCostItem = useMutation(api.companyCosts.update)
  const removeCostItem = useMutation(api.companyCosts.remove)
  const removeAllCostItems = useMutation(api.companyCosts.removeAllByCompany)

  // 정렬된 항목 (useMemo로 안정화)
  const sortedCostItems = useMemo(() => {
    if (!costItems) return undefined
    return [...costItems].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [costItems])

  // 필수 항목만 필터 (useMemo로 안정화)
  const requiredItems = useMemo(() => {
    return sortedCostItems?.filter((item) => item.isRequired)
  }, [sortedCostItems])

  return {
    // 컴포넌트 호환 이름
    items: sortedCostItems,
    requiredItems,
    isLoading: costItems === undefined,
    createItem: createCostItem,
    createBulk: createBulkCostItems,
    updateItem: updateCostItem,
    removeItem: removeCostItem,
    removeAll: removeAllCostItems,
  }
}
