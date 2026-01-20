"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"

// 운송 업체 관련 훅
export function useShippingCompanies() {
  // 활성 업체 목록 조회
  const companies = useQuery(api.shippingCompanies.list)

  // 모든 업체 목록 조회 (관리자용)
  const allCompanies = useQuery(api.shippingCompanies.listAll)

  // 뮤테이션
  const createCompany = useMutation(api.shippingCompanies.create)
  const updateCompany = useMutation(api.shippingCompanies.update)
  const removeCompany = useMutation(api.shippingCompanies.remove)

  return {
    companies,
    allCompanies,
    isLoading: companies === undefined,
    createCompany,
    updateCompany,
    removeCompany,
  }
}

// 단일 업체 조회 훅
export function useShippingCompany(companyId: Id<"shippingCompanies"> | null) {
  const company = useQuery(
    api.shippingCompanies.get,
    companyId ? { id: companyId } : "skip"
  )

  return {
    company,
    isLoading: company === undefined,
  }
}
