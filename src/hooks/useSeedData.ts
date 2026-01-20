"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { toast } from "sonner"

// 시드 데이터 관련 훅
export function useSeedData() {
  const [isSeeding, setIsSeeding] = useState(false)
  const seedInitialData = useMutation(api.seed.seedInitialData)
  const resetAllData = useMutation(api.seed.resetAllData)

  // 모든 시드 데이터 생성
  const seedAll = useCallback(async () => {
    setIsSeeding(true)
    try {
      await seedInitialData()
      toast.success("기본 데이터가 생성되었습니다")
    } catch (error) {
      console.error("Seed error:", error)
      toast.error("데이터 생성 중 오류가 발생했습니다")
    } finally {
      setIsSeeding(false)
    }
  }, [seedInitialData])

  // 모든 데이터 초기화
  const resetAll = useCallback(async () => {
    setIsSeeding(true)
    try {
      await resetAllData()
      toast.success("모든 데이터가 초기화되었습니다")
    } catch (error) {
      console.error("Reset error:", error)
      toast.error("초기화 중 오류가 발생했습니다")
    } finally {
      setIsSeeding(false)
    }
  }, [resetAllData])

  return {
    seedInitialData,
    resetAllData,
    seedAll,
    resetAll,
    isSeeding,
  }
}

// 자동 시드 훅 - 데이터가 없으면 자동으로 기본 데이터 생성
export function useAutoSeed() {
  const [isAutoSeeding, setIsAutoSeeding] = useState(false)
  const [isSeeded, setIsSeeded] = useState(false)
  const hasTriggeredRef = useRef(false)

  const needsSeedingResult = useQuery(api.seed.needsSeeding)
  const seedInitialData = useMutation(api.seed.seedInitialData)

  useEffect(() => {
    // 이미 시드 시도했거나, 쿼리 로딩 중이면 스킵
    if (hasTriggeredRef.current || needsSeedingResult === undefined) {
      return
    }

    // 시드가 필요하면 자동 실행
    if (needsSeedingResult.needsSeeding) {
      hasTriggeredRef.current = true
      setIsAutoSeeding(true)

      seedInitialData()
        .then((result) => {
          if (result.seeded) {
            console.log("✅ 기본 데이터 자동 생성 완료:", result)
            toast.success("기본 데이터가 자동으로 생성되었습니다")
          }
          setIsSeeded(true)
        })
        .catch((error) => {
          console.error("❌ 자동 시드 실패:", error)
          toast.error("기본 데이터 생성에 실패했습니다")
        })
        .finally(() => {
          setIsAutoSeeding(false)
        })
    } else {
      // 이미 데이터가 있음
      setIsSeeded(true)
    }
  }, [needsSeedingResult, seedInitialData])

  return {
    isAutoSeeding,
    isSeeded,
    needsSeeding: needsSeedingResult?.needsSeeding ?? false,
  }
}
