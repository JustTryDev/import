"use client"

/**
 * 비용 설정 관리 훅
 *
 * 📌 비유: 택시 요금표를 조회하고 수정하는 기능
 * - 내륙 운송료, 국내 운송료, 3PL 비용의 계산 기준을 관리
 */
import { useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"

// 내륙 운송료 설정 타입
export interface InlandConfig {
  ratePerCbm: number  // CBM당 USD 단가
}

// 국내 운송료 설정 타입
export interface DomesticConfig {
  baseFee: number     // 기본료 (원)
  baseCbm: number     // 기본 CBM (이하는 기본료만)
  extraUnit: number   // 추가 단위 (CBM)
  extraRate: number   // 추가 요금 (원/단위)
}

// 3PL + 배송비 설정 타입
export interface ThreePLConfig {
  ratePerUnit: number // 단위당 요금 (원)
  unit: number        // 단위 (CBM)
}

// 비용 설정 타입
export interface CostSetting {
  _id: Id<"costSettings">
  type: "inland" | "domestic" | "3pl"
  name: string
  description?: string
  config: InlandConfig | DomesticConfig | ThreePLConfig
  isActive: boolean
  createdAt: number
  updatedAt: number
}

// 기본값 (DB에 데이터가 없을 때 사용)
const DEFAULT_INLAND: InlandConfig = { ratePerCbm: 70 }
const DEFAULT_DOMESTIC: DomesticConfig = {
  baseFee: 50000,
  baseCbm: 0.5,
  extraUnit: 0.1,
  extraRate: 10000,
}
const DEFAULT_3PL: ThreePLConfig = {
  ratePerUnit: 15000,
  unit: 0.1,
}

export function useCostSettings() {
  // DB에서 비용 설정 조회
  const settings = useQuery(api.costSettings.list)

  // 뮤테이션 함수들
  const updateSetting = useMutation(api.costSettings.update)
  const seedDefaults = useMutation(api.costSettings.seedDefaults)

  // 타입별 설정 추출 (없으면 기본값 사용)
  const inlandSetting = useMemo(() => {
    const setting = settings?.find((s) => s.type === "inland")
    return setting as CostSetting | undefined
  }, [settings])

  const domesticSetting = useMemo(() => {
    const setting = settings?.find((s) => s.type === "domestic")
    return setting as CostSetting | undefined
  }, [settings])

  const threePLSetting = useMemo(() => {
    const setting = settings?.find((s) => s.type === "3pl")
    return setting as CostSetting | undefined
  }, [settings])

  // 계산용 설정값 (기본값 폴백)
  const inlandConfig = useMemo((): InlandConfig => {
    if (inlandSetting?.config) {
      return inlandSetting.config as InlandConfig
    }
    return DEFAULT_INLAND
  }, [inlandSetting])

  const domesticConfig = useMemo((): DomesticConfig => {
    if (domesticSetting?.config) {
      return domesticSetting.config as DomesticConfig
    }
    return DEFAULT_DOMESTIC
  }, [domesticSetting])

  const threePLConfig = useMemo((): ThreePLConfig => {
    if (threePLSetting?.config) {
      return threePLSetting.config as ThreePLConfig
    }
    return DEFAULT_3PL
  }, [threePLSetting])

  return {
    // 전체 설정 목록
    settings: settings as CostSetting[] | undefined,
    isLoading: settings === undefined,

    // 타입별 설정 (DB 문서)
    inlandSetting,
    domesticSetting,
    threePLSetting,

    // 계산용 설정값 (기본값 포함)
    inlandConfig,
    domesticConfig,
    threePLConfig,

    // 뮤테이션
    updateSetting,
    seedDefaults,
  }
}
