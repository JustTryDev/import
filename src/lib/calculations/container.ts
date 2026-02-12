/**
 * 컨테이너(FCL) 운송 계산 모듈
 *
 * 📌 비유: 이사할 때 "용달차(LCL)" vs "컨테이너 트럭(FCL)" 비교
 *    짐이 적으면 용달차가 싸지만, 짐이 많으면 트럭 하나 빌리는 게 더 쌈
 *    이 모듈은 두 가지를 비교해서 최적의 방법을 추천해줌
 *
 * 주요 기능:
 * 1. 모든 컨테이너 옵션 후보 생성 (20ft, 40ft, 40HC, 20ft×2)
 * 2. 각 후보의 총 운송비 계산 (국제 + 내륙 + 국내)
 * 3. 오버플로우 처리 (컨테이너에 못 넣는 물량은 LCL로 분할)
 * 4. 최적 옵션 자동 추천
 */

import {
  findShippingRate,
  calculateInlandShipping,
  calculateDomesticShipping,
  calculate3PLCost,
  ShippingRateTable,
  InlandShippingConfig,
  DomesticShippingConfig,
  ThreePLCostConfig,
} from "./shipping"

// ===== 타입 정의 =====

// 컨테이너 규격 타입
export type ContainerType = "20DC" | "40DC" | "40HC"

// 국내 배송 방식
export type DeliveryMethod = "direct" | "via3PL"

// 개별 컨테이너 규격 설정
export interface ContainerTypeConfig {
  label: string          // 표시 이름 (예: "20ft 컨테이너")
  totalCbm: number       // 내부 전체 부피 (CBM)
  usableCbm: number      // 실용 부피 (80% 기준)
  maxWeight: number      // 최대 적재중량 (kg)
  shippingCost: number   // 국제 운송비 (원) — 사용자 수정 가능
  // 중국 내륙 운송비 — "비용 설정" 탭에서 커스텀 가능
  // 📌 비유: 택시 기본요금 + 거리 추가 요금 구조
  inlandMinCost: number  // 최소 내륙 운송비 (원) — 기본요금 개념
  inlandPerKmRate: number // KM당 내륙 운송비 (원) — 추가요금 개념
  // 한국 국내 운송료 (인천항 → 배송지)
  // 📌 직배송이든 3PL이든 컨테이너 트럭 비용은 동일
  //    3PL 경유 시 기존 CBM 기반 "3PL+배송비"가 추가로 발생
  domesticCost: number   // 인천항 → 배송지 컨테이너 트럭 비용 (원)
}

// 전체 컨테이너 설정 (3가지 규격)
export interface ContainerConfig {
  "20DC": ContainerTypeConfig
  "40DC": ContainerTypeConfig
  "40HC": ContainerTypeConfig
}

// 컨테이너 옵션 후보 (계산 결과)
export interface ContainerOption {
  // 기본 정보
  type: ContainerType           // 컨테이너 규격
  label: string                 // 표시 이름
  count: number                 // 컨테이너 수량 (1 또는 2)
  isRecommended: boolean        // 최적 추천 여부

  // 적재 정보
  usableCbm: number             // 실용 부피
  loadedCbm: number             // 실제 적재 CBM (min(totalCbm, usableCbm))
  loadRatio: number             // 적재율 (0~1)

  // 오버플로우 정보
  hasOverflow: boolean          // 오버플로우 존재 여부
  overflowCbm: number           // 오버플로우 CBM

  // 경고
  weightWarning: boolean        // 무게 초과 경고
  weightExceeded: number        // 초과 중량 (kg), 0이면 정상

  // 비용 내역 — 컨테이너 부분
  containerShippingCost: number   // 국제 운송비 (컨테이너)
  containerInlandCost: number     // 내륙 운송비 (컨테이너)
  containerDomesticCost: number   // 국내 운송비 (인천항 → 배송지 트럭)
  containerThreePLCost: number    // 3PL+배송비 (3PL 경유 시, 직배송이면 0)

  // 비용 내역 — 오버플로우 LCL 부분
  overflowShippingCost: number    // 국제 운송비 (오버플로우 LCL)
  overflowInlandCost: number      // 내륙 운송비 (오버플로우 LCL)
  overflowDomesticCost: number    // 국내 운송비 (오버플로우 LCL)
  overflowThreePLCost: number     // 3PL 비용 (오버플로우 LCL)

  // 합계
  totalShippingCost: number       // 총 운송비 (컨테이너 + 오버플로우)
}

// calculateContainerOptions() 의 입력 파라미터
export interface ContainerCalculationParams {
  totalCbm: number              // 전체 제품 R.TON 합계
  totalWeight: number           // 전체 제품 총 중량 (kg)
  containerConfig: ContainerConfig // 컨테이너별 설정

  // 중국 내륙 거리 (RouteMap에서 계산된 값)
  // 📌 공장 → 창고 거리 (km). 없으면 최소 비용 적용
  distanceKm?: number

  // 사용자가 직접 입력한 내륙 운송비 오버라이드 (원)
  // 📌 실제 견적을 받았을 때 이 값으로 직접 지정 가능
  inlandCostOverrides?: Partial<Record<ContainerType, number>>

  // LCL 비용 계산에 필요한 정보 (오버플로우용)
  lclShippingRates: ShippingRateTable[]  // 국제 운송 요금표
  lclRateTypeCurrency: "USD" | "CNY" | "KRW"
  lclRateTypeUnitType: "cbm" | "kg"
  exchangeRates: { usd: number; cny: number }

  // 비용 설정 (오버플로우 LCL용)
  costSettings?: {
    inland?: InlandShippingConfig
    domestic?: DomesticShippingConfig
    threePL?: ThreePLCostConfig
  }

  // 국내 배송 방식
  deliveryMethod: DeliveryMethod
}

// calculateContainerOptions() 의 반환값
export interface ContainerCalculationResult {
  // 모든 후보 옵션 (비용 순 정렬)
  allOptions: ContainerOption[]

  // 추천 옵션 (가장 저렴)
  recommendedOption: ContainerOption

  // LCL 총 운송비 (비교 기준)
  lclTotalShipping: number

  // 절감액 (양수 = 절감, 음수 = FCL이 더 비쌈)
  savings: number
  savingsPercent: number
}

// ===== 기본값 상수 =====

export const DEFAULT_CONTAINER_CONFIG: ContainerConfig = {
  "20DC": {
    label: "20ft 컨테이너",
    totalCbm: 33,
    usableCbm: 27,
    maxWeight: 21_700,
    shippingCost: 1_250_000,     // 국제 운송비 (원)
    inlandMinCost: 152_000,      // 최소 내륙 운송비 (원) — RMB 800 × 190
    inlandPerKmRate: 1_520,      // KM당 내륙 운송비 (원) — RMB 8 × 190
    domesticCost: 200_000,       // 인천항 → 배송지 트럭 (원)
  },
  "40DC": {
    label: "40ft 컨테이너",
    totalCbm: 67,
    usableCbm: 54,
    maxWeight: 26_500,
    shippingCost: 2_000_000,
    inlandMinCost: 190_000,      // RMB 1,000 × 190
    inlandPerKmRate: 1_900,      // RMB 10 × 190
    domesticCost: 300_000,
  },
  "40HC": {
    label: "40ft HC 컨테이너",
    totalCbm: 76,
    usableCbm: 61,
    maxWeight: 26_500,
    shippingCost: 2_500_000,
    inlandMinCost: 190_000,      // RMB 1,000 × 190
    inlandPerKmRate: 2_090,      // RMB 11 × 190
    domesticCost: 300_000,
  },
}

/**
 * 컨테이너 내륙 운송비 계산
 *
 * 📌 비유: 택시 요금 = max(기본요금, 거리 × 미터당 요금)
 *    가까운 거리라도 기본요금(최소 비용)은 나오고,
 *    먼 거리면 거리 × KM당 비용으로 계산
 *
 * @param config 컨테이너 타입별 설정
 * @param distanceKm 거리 (km), undefined면 최소 비용 적용
 * @param override 사용자 직접 입력 오버라이드 값
 * @returns 내륙 운송비 (원)
 */
export function calculateContainerInlandCost(
  config: ContainerTypeConfig,
  distanceKm?: number,
  override?: number
): number {
  // 사용자가 직접 금액을 입력한 경우 → 그 값 사용
  if (override !== undefined && override > 0) {
    return override
  }

  // 거리 정보가 없는 경우 → 최소 비용 적용
  if (!distanceKm || distanceKm <= 0) {
    return config.inlandMinCost
  }

  // 거리 기반 계산: max(최소 비용, 거리 × KM당 비용)
  const distanceCost = Math.round(distanceKm * config.inlandPerKmRate)
  return Math.max(config.inlandMinCost, distanceCost)
}

// ===== 계산 함수 =====

/**
 * 오버플로우 LCL 비용 계산
 *
 * 📌 비유: 이삿짐이 트럭에 다 안 들어가서 나머지를 택배로 보내는 것
 *    택배 비용은 기존 택배 요금표(LCL 요금표)로 계산
 */
function calculateOverflowLCLCosts(
  overflowCbm: number,
  params: ContainerCalculationParams
): {
  shippingCost: number
  inlandCost: number
  domesticCost: number
  threePLCost: number
} {
  if (overflowCbm <= 0) {
    return { shippingCost: 0, inlandCost: 0, domesticCost: 0, threePLCost: 0 }
  }

  // 국제 운송비 (오버플로우 CBM으로 기존 LCL 요금표 조회)
  const lookupValue = params.lclRateTypeUnitType === "kg"
    ? overflowCbm * 200  // CBM → 대략적 kg 변환 (임시, 실제로는 무게 비율)
    : overflowCbm
  const shippingResult = findShippingRate(
    params.lclShippingRates,
    lookupValue,
    params.lclRateTypeUnitType
  )
  const shippingRate = shippingResult?.rate ?? 0

  // 통화별 환율 적용
  let shippingCost: number
  if (params.lclRateTypeCurrency === "KRW") {
    shippingCost = shippingRate
  } else if (params.lclRateTypeCurrency === "CNY") {
    shippingCost = Math.round(shippingRate * params.exchangeRates.cny)
  } else {
    shippingCost = Math.round(shippingRate * params.exchangeRates.usd)
  }

  // 내륙 운송비 (오버플로우 CBM 기준)
  const inlandUSD = calculateInlandShipping(overflowCbm, params.costSettings?.inland)
  const inlandCost = Math.round(inlandUSD * params.exchangeRates.usd)

  // 국내 운송비 (오버플로우 CBM 기준, 누진식)
  const domesticCost = calculateDomesticShipping(overflowCbm, params.costSettings?.domestic)

  // 3PL 비용 (오버플로우 CBM 기준)
  const threePLCost = calculate3PLCost(overflowCbm, params.costSettings?.threePL)

  return { shippingCost, inlandCost, domesticCost, threePLCost }
}

/**
 * 단일 컨테이너 옵션의 비용 계산
 *
 * @param containerType 컨테이너 규격
 * @param count 컨테이너 수량 (1 또는 2)
 * @param params 계산 파라미터
 */
function calculateSingleOption(
  containerType: ContainerType,
  count: number,
  params: ContainerCalculationParams
): ContainerOption | null {
  const config = params.containerConfig[containerType]
  const totalUsableCbm = config.usableCbm * count
  const totalMaxWeight = config.maxWeight * count

  // 부피도 초과하고 무게도 초과 → 스킵
  if (params.totalCbm > totalUsableCbm && params.totalWeight > totalMaxWeight) {
    return null
  }

  // 무게 초과 체크
  const weightExceeded = Math.max(0, params.totalWeight - totalMaxWeight)
  const weightWarning = weightExceeded > 0

  // 오버플로우 계산
  const hasOverflow = params.totalCbm > totalUsableCbm
  const overflowCbm = hasOverflow ? params.totalCbm - totalUsableCbm : 0
  const loadedCbm = hasOverflow ? totalUsableCbm : params.totalCbm
  const loadRatio = totalUsableCbm > 0 ? loadedCbm / totalUsableCbm : 0

  // 컨테이너 비용 (수량만큼 곱하기)
  const containerShippingCost = config.shippingCost * count
  // 내륙 운송비: 사용자 오버라이드 → 거리 기반 계산 → 최소 비용
  const singleInlandCost = calculateContainerInlandCost(
    config,
    params.distanceKm,
    params.inlandCostOverrides?.[containerType]
  )
  const containerInlandCost = singleInlandCost * count

  // 국내 운송료 (인천항 → 배송지 트럭 비용, 직배송이든 3PL이든 동일)
  const containerDomesticCost = config.domesticCost * count

  // 3PL+배송비: 3PL 경유 시에만 발생 (직배송이면 0)
  // 📌 직배송: 컨테이너 트럭이 고객에게 바로 감 → 3PL 불필요
  //    3PL 경유: 컨테이너 하차 후 개별 포장 → 택배 배송 → 3PL 비용 발생
  const containerThreePLCost = params.deliveryMethod === "via3PL"
    ? calculate3PLCost(loadedCbm, params.costSettings?.threePL)
    : 0

  // 오버플로우 LCL 비용
  const overflow = calculateOverflowLCLCosts(overflowCbm, params)

  // 총 운송비
  const totalShippingCost =
    containerShippingCost + containerInlandCost + containerDomesticCost + containerThreePLCost +
    overflow.shippingCost + overflow.inlandCost + overflow.domesticCost + overflow.threePLCost

  // 라벨 생성
  const label = count > 1
    ? `${config.label} x ${count}`
    : config.label

  return {
    type: containerType,
    label,
    count,
    isRecommended: false, // 나중에 설정

    usableCbm: totalUsableCbm,
    loadedCbm,
    loadRatio,

    hasOverflow,
    overflowCbm,

    weightWarning,
    weightExceeded,

    containerShippingCost,
    containerInlandCost,
    containerDomesticCost,
    containerThreePLCost,

    overflowShippingCost: overflow.shippingCost,
    overflowInlandCost: overflow.inlandCost,
    overflowDomesticCost: overflow.domesticCost,
    overflowThreePLCost: overflow.threePLCost,

    totalShippingCost,
  }
}

/**
 * 현재 LCL 총 운송비 계산
 *
 * 📌 기존 LCL 방식으로 보냈을 때의 총 비용
 *    국제운송 + 내륙운송 + 국내운송 + 3PL 비용
 */
function calculateLCLTotalShipping(params: ContainerCalculationParams): number {
  // 국제 운송비
  const lookupValue = params.lclRateTypeUnitType === "kg"
    ? params.totalWeight
    : params.totalCbm
  const shippingResult = findShippingRate(
    params.lclShippingRates,
    lookupValue,
    params.lclRateTypeUnitType
  )
  const shippingRate = shippingResult?.rate ?? 0

  let internationalShipping: number
  if (params.lclRateTypeCurrency === "KRW") {
    internationalShipping = shippingRate
  } else if (params.lclRateTypeCurrency === "CNY") {
    internationalShipping = Math.round(shippingRate * params.exchangeRates.cny)
  } else {
    internationalShipping = Math.round(shippingRate * params.exchangeRates.usd)
  }

  // 내륙 운송비
  const inlandUSD = calculateInlandShipping(params.totalCbm, params.costSettings?.inland)
  const inlandShipping = Math.round(inlandUSD * params.exchangeRates.usd)

  // 국내 운송비
  const domesticShipping = calculateDomesticShipping(
    params.totalCbm,
    params.costSettings?.domestic
  )

  // 3PL 비용
  const threePLCost = calculate3PLCost(params.totalCbm, params.costSettings?.threePL)

  return internationalShipping + inlandShipping + domesticShipping + threePLCost
}

/**
 * 모든 컨테이너 옵션을 계산하고 최적 옵션을 추천
 *
 * 📌 비유: 이사할 때 여러 트럭 크기를 비교하는 것
 *    1톤 트럭, 2.5톤 트럭, 5톤 트럭, 1톤 트럭 2대...
 *    각각의 가격을 비교해서 가장 저렴한 걸 추천
 *
 * @param params 계산 파라미터
 * @returns 모든 후보 + 추천 옵션 + LCL 비교
 */
export function calculateContainerOptions(
  params: ContainerCalculationParams
): ContainerCalculationResult {
  const options: ContainerOption[] = []

  // 1. 각 컨테이너 타입별 단일 옵션 계산
  const containerTypes: ContainerType[] = ["20DC", "40DC", "40HC"]
  for (const type of containerTypes) {
    const option = calculateSingleOption(type, 1, params)
    if (option) {
      options.push(option)
    }
  }

  // 2. 20DC x 2 옵션 (CBM이 27 초과일 때만)
  if (params.totalCbm > params.containerConfig["20DC"].usableCbm) {
    const doubleOption = calculateSingleOption("20DC", 2, params)
    if (doubleOption) {
      options.push(doubleOption)
    }
  }

  // 3. LCL 총 운송비 계산 (비교 기준)
  const lclTotalShipping = calculateLCLTotalShipping(params)

  // 4. 비용 순으로 정렬
  options.sort((a, b) => a.totalShippingCost - b.totalShippingCost)

  // 5. 가장 저렴한 옵션을 추천으로 설정
  if (options.length > 0) {
    options[0].isRecommended = true
  }

  // 6. 절감액 계산
  const recommendedOption = options[0] ?? createFallbackOption()
  const savings = lclTotalShipping - recommendedOption.totalShippingCost
  const savingsPercent = lclTotalShipping > 0
    ? Math.round((savings / lclTotalShipping) * 100)
    : 0

  return {
    allOptions: options,
    recommendedOption,
    lclTotalShipping,
    savings,
    savingsPercent,
  }
}

/**
 * 후보가 없을 때 사용하는 빈 옵션 (방어 코드)
 */
function createFallbackOption(): ContainerOption {
  return {
    type: "20DC",
    label: "20ft 컨테이너",
    count: 1,
    isRecommended: false,
    usableCbm: 27,
    loadedCbm: 0,
    loadRatio: 0,
    hasOverflow: false,
    overflowCbm: 0,
    weightWarning: false,
    weightExceeded: 0,
    containerShippingCost: 0,
    containerInlandCost: 0,
    containerDomesticCost: 0,
    containerThreePLCost: 0,
    overflowShippingCost: 0,
    overflowInlandCost: 0,
    overflowDomesticCost: 0,
    overflowThreePLCost: 0,
    totalShippingCost: 0,
  }
}
