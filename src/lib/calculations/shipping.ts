/**
 * 운송료 계산 로직
 */

// 국제 운송료 계산 결과
export interface InternationalShippingResult {
  cbm: number
  rateUSD: number
  rateKRW: number
}

// 국내 운송료 계산
// 기본료: 50,000원 (0.5CBM까지)
// 추가료: 0.1CBM당 10,000원
export function calculateDomesticShipping(cbm: number): number {
  const BASE_FEE = 50_000        // 기본료 (원)
  const BASE_CBM = 0.5           // 기본 CBM
  const EXTRA_UNIT = 0.1         // 추가 단위 (CBM)
  const EXTRA_RATE = 10_000      // 추가 요금 (원/0.1CBM)

  if (cbm <= 0) return 0
  if (cbm <= BASE_CBM) return BASE_FEE

  // 0.5CBM 초과분 계산 (0.1 단위로 올림)
  const extraCbm = cbm - BASE_CBM
  const extraUnits = Math.ceil(extraCbm / EXTRA_UNIT)
  const extraFee = extraUnits * EXTRA_RATE

  return BASE_FEE + extraFee
}

// 3PL 비용 + 배송비 계산
// 0.1CBM당 15,000원
export function calculate3PLCost(cbm: number): number {
  const RATE_PER_UNIT = 15_000   // 0.1CBM당 요금 (원)
  const UNIT = 0.1               // 단위 (CBM)

  if (cbm <= 0) return 0

  // 0.1 단위로 올림하여 계산
  const units = Math.ceil(cbm / UNIT)
  return units * RATE_PER_UNIT
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

// 내륙 운송료 계산 (중국 공장 → 항구)
// CBM당 $70 기준
export function calculateInlandShipping(cbm: number): number {
  const RATE_PER_CBM = 70  // USD/CBM
  if (cbm <= 0) return 0
  return Math.round(cbm * RATE_PER_CBM * 100) / 100  // 소수점 2자리
}

// 국제 운송료 조회용 인터페이스 (CBM 테이블에서 조회)
export interface ShippingRateTable {
  cbm: number
  rateUSD: number
  rateKRW: number
}

// 국제 운송료 계산 (테이블 기반)
export function findShippingRate(
  rates: ShippingRateTable[],
  targetCbm: number
): InternationalShippingResult | null {
  if (rates.length === 0) return null

  // CBM을 0.5 단위로 올림
  const roundedCbm = Math.ceil(targetCbm * 2) / 2

  // 정렬된 요금표
  const sortedRates = [...rates].sort((a, b) => a.cbm - b.cbm)

  // 정확히 일치하는 값 찾기
  const exactMatch = sortedRates.find((r) => r.cbm === roundedCbm)
  if (exactMatch) {
    return {
      cbm: roundedCbm,
      rateUSD: exactMatch.rateUSD,
      rateKRW: exactMatch.rateKRW,
    }
  }

  // 범위 내에서 가장 가까운 상위 값 찾기
  const upperMatch = sortedRates.find((r) => r.cbm >= roundedCbm)
  if (upperMatch) {
    return {
      cbm: upperMatch.cbm,
      rateUSD: upperMatch.rateUSD,
      rateKRW: upperMatch.rateKRW,
    }
  }

  // 범위를 초과하는 경우 마지막 단가로 비례 계산
  const lastRate = sortedRates[sortedRates.length - 1]
  const unitRateUSD = lastRate.rateUSD / lastRate.cbm
  const unitRateKRW = lastRate.rateKRW / lastRate.cbm

  return {
    cbm: roundedCbm,
    rateUSD: Math.round(unitRateUSD * roundedCbm * 100) / 100,
    rateKRW: Math.round(unitRateKRW * roundedCbm),
  }
}
