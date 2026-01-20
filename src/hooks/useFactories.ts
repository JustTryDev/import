"use client"

import { useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"

// 중국 공장 관련 훅
export function useFactories() {
  const factories = useQuery(api.factories.list)

  const createFactory = useMutation(api.factories.create)
  const updateFactory = useMutation(api.factories.update)
  const removeFactory = useMutation(api.factories.remove)

  // 정렬된 항목 (useMemo로 안정화)
  const sortedFactories = useMemo(() => {
    if (!factories) return undefined
    return [...factories].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [factories])

  return {
    factories: sortedFactories,
    isLoading: factories === undefined,
    createFactory,
    updateFactory,
    removeFactory,
  }
}
