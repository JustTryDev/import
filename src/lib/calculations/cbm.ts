import { ProductDimensions } from "@/types/shipping"

/**
 * CBM 계산 (Cubic Meter)
 * 공식: (가로cm x 높이cm x 폭cm) / 1,000,000
 */

// 단일 제품의 CBM 계산
export function calculateUnitCbm(dimensions: ProductDimensions): number {
  const { width, height, depth } = dimensions
  // cm³를 m³로 변환 (1m³ = 1,000,000cm³)
  return (width * height * depth) / 1_000_000
}

// 총 CBM 계산 (단일 CBM x 수량)
export function calculateTotalCbm(
  dimensions: ProductDimensions,
  quantity: number
): number {
  const unitCbm = calculateUnitCbm(dimensions)
  return unitCbm * quantity
}

// CBM을 0.5 단위로 올림 (운송료 계산용)
export function roundCbmToHalf(cbm: number): number {
  return Math.ceil(cbm * 2) / 2
}

// CBM 포맷팅 (소수점 2자리)
export function formatCbm(cbm: number): string {
  return cbm.toFixed(2)
}

// CBM 유효성 검사
export function isValidDimensions(dimensions: ProductDimensions): boolean {
  const { width, height, depth } = dimensions
  return width > 0 && height > 0 && depth > 0
}
