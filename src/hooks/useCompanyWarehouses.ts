"use client"

import { useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"

// 운송 업체별 창고 관련 훅
export function useCompanyWarehouses(companyId: Id<"shippingCompanies"> | null) {
  const warehouses = useQuery(
    api.companyWarehouses.listByCompany,
    companyId ? { companyId } : "skip"
  )

  const createWarehouse = useMutation(api.companyWarehouses.create)
  const updateWarehouse = useMutation(api.companyWarehouses.update)
  const removeWarehouse = useMutation(api.companyWarehouses.remove)

  // 정렬된 창고 목록
  const sortedWarehouses = useMemo(() => {
    if (!warehouses) return undefined
    return [...warehouses].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [warehouses])

  return {
    warehouses: sortedWarehouses,
    isLoading: companyId ? warehouses === undefined : false,
    createWarehouse,
    updateWarehouse,
    removeWarehouse,
  }
}
