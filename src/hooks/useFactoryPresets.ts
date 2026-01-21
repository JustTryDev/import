"use client"

/**
 * 공장 비용 프리셋 (즐겨찾기) 관리 훅
 *
 * 📌 비유: 카페 앱에서 "자주 주문하는 메뉴" 기능
 * - 공장 + 비용 항목 조합을 저장
 * - 나중에 한 번에 불러오기
 */
import { useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"

// 프리셋 슬롯 타입 (DB 저장용)
export interface PresetSlot {
  factoryId: string                       // 공장 ID (문자열)
  selectedItemIds: string[]               // 선택된 비용 항목 IDs
  costValues: { [itemId: string]: number } // 항목별 금액
  chargeTypeValues?: { [itemId: string]: "once" | "per_quantity" } // 과금 방식 오버라이드
}

// 프리셋 타입 (DB에서 조회된 데이터)
export interface FactoryPreset {
  _id: Id<"factoryPresets">
  name: string
  slots: PresetSlot[]
  isDefault?: boolean              // 기본 프리셋 여부
  sortOrder: number
  createdAt: number
  updatedAt: number
}

export function useFactoryPresets() {
  // DB에서 프리셋 목록 조회
  const presets = useQuery(api.factoryPresets.list)

  // 뮤테이션 함수들
  const createPreset = useMutation(api.factoryPresets.create)
  const updatePreset = useMutation(api.factoryPresets.update)
  const removePreset = useMutation(api.factoryPresets.remove)
  const setDefaultPreset = useMutation(api.factoryPresets.setDefault)
  const clearDefaultPreset = useMutation(api.factoryPresets.clearDefault)

  // 정렬된 프리셋 목록 (sortOrder 기준)
  const sortedPresets = useMemo(() => {
    if (!presets) return undefined
    return [...presets].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [presets])

  // 기본 프리셋 찾기
  const defaultPreset = useMemo(() => {
    if (!presets) return undefined
    return presets.find((p) => p.isDefault === true) as FactoryPreset | undefined
  }, [presets])

  return {
    presets: sortedPresets as FactoryPreset[] | undefined,
    defaultPreset,                    // 기본 프리셋 (있으면 반환)
    isLoading: presets === undefined,
    createPreset,
    updatePreset,
    removePreset,
    setDefaultPreset,                 // 기본 프리셋 설정
    clearDefaultPreset,               // 기본 프리셋 해제
  }
}
