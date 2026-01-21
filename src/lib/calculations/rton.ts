/**
 * R.TON (Revenue Ton) 계산 모듈
 *
 * R.TON은 운송사가 운임을 계산할 때 사용하는 기준 단위입니다.
 * 화물의 부피(CBM)와 중량 중 더 큰 값을 선택하여 운임을 산정합니다.
 *
 * - W/T (Weight Ton): 중량톤 = 총 중량(kg) ÷ 1,000
 * - M/T (Measurement Ton): 용적톤 = 총 CBM
 * - R.TON = MAX(W/T, M/T)
 */

// 중량 단위 타입
export type WeightUnit = "kg" | "g"

// R.TON 계산 결과 타입
export interface ProductRTonInfo {
  unitWeight: number       // 개당 중량 (kg로 환산)
  totalWeight: number      // 총 중량 (kg)
  weightTon: number        // W/T (중량톤)
  measurementTon: number   // M/T (용적톤 = 원래 CBM)
  rTon: number             // R.TON = MAX(W/T, M/T)
  isWeightBased: boolean   // W/T 기준 여부 (true: 중량 기준, false: 부피 기준)
}

/**
 * 중량을 kg로 변환
 * @param weight 중량 값
 * @param unit 단위 ("kg" | "g")
 * @returns kg로 환산된 중량
 */
export function convertToKg(weight: number, unit: WeightUnit): number {
  return unit === "g" ? weight / 1000 : weight
}

/**
 * 중량톤 계산 (W/T: Weight Ton)
 * 1,000kg = 1 W/T
 * @param weightKg 총 중량 (kg)
 * @returns 중량톤 (W/T)
 */
export function calculateWeightTon(weightKg: number): number {
  return weightKg / 1000
}

/**
 * R.TON 계산 (Revenue Ton)
 * 중량톤과 용적톤 중 큰 값을 반환
 *
 * 중량 미입력(0) 시 → W/T=0, R.TON=CBM (기존 동작 유지)
 *
 * @param weightTon 중량톤 (W/T)
 * @param measurementTon 용적톤 (M/T = CBM)
 * @returns R.TON = MAX(W/T, M/T)
 */
export function calculateRTon(weightTon: number, measurementTon: number): number {
  return Math.max(weightTon, measurementTon)
}

/**
 * 제품별 R.TON 정보 계산
 *
 * @param unitWeight 개당 중량 (입력 단위 그대로)
 * @param weightUnit 중량 단위 ("kg" | "g")
 * @param quantity 수량
 * @param totalCbm 총 CBM (M/T)
 * @returns R.TON 계산 결과
 *
 * @example
 * // 무거운 작은 물건 (W/T 기준)
 * calculateProductRTon(5, "kg", 500, 0.5)
 * // → { rTon: 2.5, isWeightBased: true, ... }
 *
 * // 부피 큰 가벼운 물건 (M/T 기준)
 * calculateProductRTon(0.5, "kg", 100, 12.5)
 * // → { rTon: 12.5, isWeightBased: false, ... }
 *
 * // 중량 미입력 (기존 CBM과 동일)
 * calculateProductRTon(0, "kg", 100, 0.9)
 * // → { rTon: 0.9, isWeightBased: false, ... }
 */
export function calculateProductRTon(
  unitWeight: number,
  weightUnit: WeightUnit,
  quantity: number,
  totalCbm: number
): ProductRTonInfo {
  // 1. 개당 중량을 kg로 환산
  const unitWeightKg = convertToKg(unitWeight, weightUnit)

  // 2. 총 중량 계산 (kg)
  const totalWeight = unitWeightKg * quantity

  // 3. 중량톤 계산 (W/T)
  const weightTon = calculateWeightTon(totalWeight)

  // 4. 용적톤은 CBM과 동일 (M/T)
  const measurementTon = totalCbm

  // 5. R.TON = MAX(W/T, M/T)
  const rTon = calculateRTon(weightTon, measurementTon)

  // 6. 중량 기준 여부 판단
  const isWeightBased = weightTon > measurementTon

  return {
    unitWeight: unitWeightKg,
    totalWeight,
    weightTon,
    measurementTon,
    rTon,
    isWeightBased,
  }
}
