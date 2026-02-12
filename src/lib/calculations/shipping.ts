/**
 * 운송료 계산 로직
 *
 * 📌 설정값을 옵셔널 파라미터로 받아 DB 값 또는 기본값 사용
 */

// 국제 운송료 계산 결과
export interface InternationalShippingResult {
  cbm: number
  rate: number  // 요금 (통화는 rateType에서 가져옴)
}

// 국내 운송료 설정 타입
export interface DomesticShippingConfig {
  baseFee: number     // 기본료 (원)
  baseCbm: number     // 기본 CBM
  extraUnit: number   // 추가 단위 (CBM)
  extraRate: number   // 추가 요금 (원/단위)
}

// 3PL 비용 설정 타입
export interface ThreePLCostConfig {
  ratePerUnit: number // 단위당 요금 (원)
  unit: number        // 단위 (CBM)
}

// 기본값 (DB에 데이터가 없을 때 사용)
const DEFAULT_DOMESTIC_CONFIG: DomesticShippingConfig = {
  baseFee: 50_000,
  baseCbm: 0.5,
  extraUnit: 0.1,
  extraRate: 10_000,
}

const DEFAULT_3PL_CONFIG: ThreePLCostConfig = {
  ratePerUnit: 15_000,
  unit: 0.1,
}

// 국내 운송료 계산
// 기본료: 50,000원 (0.5CBM까지)
// 추가료: 0.1CBM당 10,000원
export function calculateDomesticShipping(
  cbm: number,
  config?: DomesticShippingConfig
): number {
  const { baseFee, baseCbm, extraUnit, extraRate } = config ?? DEFAULT_DOMESTIC_CONFIG

  if (cbm <= 0) return 0
  if (cbm <= baseCbm) return baseFee

  // 기준 CBM 초과분 계산 (단위로 올림)
  const extraCbm = cbm - baseCbm
  const extraUnits = Math.ceil(extraCbm / extraUnit)
  const extraFee = extraUnits * extraRate

  return baseFee + extraFee
}

// 3PL 비용 + 배송비 계산
// 0.1CBM당 15,000원
export function calculate3PLCost(
  cbm: number,
  config?: ThreePLCostConfig
): number {
  const { ratePerUnit, unit } = config ?? DEFAULT_3PL_CONFIG

  if (cbm <= 0) return 0

  // 단위로 올림하여 계산
  const units = Math.ceil(cbm / unit)
  return units * ratePerUnit
}

// 송금 수수료 계산
// 100만원 이상: 27,000원 고정
// 100만원 미만: 3%
export function calculateRemittanceFee(amountKRW: number): number {
  const THRESHOLD = 1_000_000    // 기준 금액 (원)
  const FIXED_FEE = 27_000       // 고정 수수료 (원)
  const PERCENTAGE = 0.03        // 비율 (3%)

  if (amountKRW <= 0) return 0
  if (amountKRW >= THRESHOLD) return FIXED_FEE
  return Math.round(amountKRW * PERCENTAGE)
}

// 내륙 운송료 설정 타입
export interface InlandShippingConfig {
  ratePerCbm: number  // CBM당 USD 단가
}

// 기본값
const DEFAULT_INLAND_CONFIG: InlandShippingConfig = {
  ratePerCbm: 70,
}

// 내륙 운송료 계산 (중국 공장 → 항구)
// CBM당 $70 기준
export function calculateInlandShipping(
  cbm: number,
  config?: InlandShippingConfig
): number {
  const { ratePerCbm } = config ?? DEFAULT_INLAND_CONFIG
  if (cbm <= 0) return 0
  return Math.round(cbm * ratePerCbm * 100) / 100  // 소수점 2자리
}

// 국제 운송료 조회용 인터페이스 (CBM 테이블에서 조회)
export interface ShippingRateTable {
  cbm: number
  rate: number  // 요금 (통화는 rateType에서 가져옴)
}

// 국제 운송료 계산 (테이블 기반)
// 📌 비유: 택시 요금표에서 거리에 해당하는 요금을 찾는 것
//    CBM(부피)이면 부피 기준, KG(중량)이면 무게 기준으로 조회
export function findShippingRate(
  rates: ShippingRateTable[],
  targetValue: number,
  unitType: "cbm" | "kg" = "cbm"
): InternationalShippingResult | null {
  if (rates.length === 0) return null

  // 단위 타입에 따라 올림 방식 결정
  // CBM: 0.5 단위 올림 (예: 0.7 → 1.0)
  // KG: 1kg 단위 올림 (예: 45.3 → 46)
  const roundedValue = unitType === "cbm"
    ? Math.ceil(targetValue * 2) / 2
    : Math.ceil(targetValue)

  // 정렬된 요금표
  const sortedRates = [...rates].sort((a, b) => a.cbm - b.cbm)

  // 정확히 일치하는 값 찾기
  const exactMatch = sortedRates.find((r) => r.cbm === roundedValue)
  if (exactMatch) {
    return {
      cbm: roundedValue,
      rate: exactMatch.rate,
    }
  }

  // 범위 내에서 가장 가까운 상위 값 찾기
  const upperMatch = sortedRates.find((r) => r.cbm >= roundedValue)
  if (upperMatch) {
    return {
      cbm: upperMatch.cbm,
      rate: upperMatch.rate,
    }
  }

  // 범위를 초과하는 경우 마지막 단가로 비례 계산
  const lastRate = sortedRates[sortedRates.length - 1]
  const unitRate = lastRate.rate / lastRate.cbm

  return {
    cbm: roundedValue,
    rate: Math.round(unitRate * roundedValue * 100) / 100,
  }
}
