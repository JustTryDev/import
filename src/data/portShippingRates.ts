/**
 * 항구별 FCL 국제 운송비 기본값
 *
 * 📌 비유: 전국 택배비 기본 요금표
 * - 가까운 곳(다롄)은 싸고, 먼 곳(광저우)은 비쌈
 * - 실제 운임은 DB(설정 화면)에서 관리하며, 이 값은 초기 기본값
 * - DB에 데이터가 없을 때 이 기본값을 사용 (폴백)
 *
 * 기준: 화동(상하이, 닝보) = 1.00배 (기준 가격)
 * - 동북(다롄): 0.85배 — 한국과 가장 가까움
 * - 화북(톈진, 칭다오, 옌타이): 0.90배
 * - 화동(롄윈강, 타이창, 상하이, 닝보): 1.00배 (기준)
 * - 화남(푸저우, 샤먼, 선전, 광저우): 1.15배
 *
 * 도착항: 인천항 고정
 */

import type { ContainerType } from "@/lib/calculations/container"
import { CHINESE_PORTS } from "./chinesePorts"

// 항구별 컨테이너 운임 맵 타입
// 📌 비유: { "port-shanghai": { "20DC": 125만원, "40DC": 200만원, "40HC": 250만원 } }
export type PortShippingRateMap = Record<string, Record<ContainerType, number>>

// 기준 운임 (화동 기준 = 1.00배)
const BASE_RATES: Record<ContainerType, number> = {
  "20DC": 1_250_000,   // 125만원
  "40DC": 2_000_000,   // 200만원
  "40HC": 2_500_000,   // 250만원
}

// 지역별 배율
// 📌 비유: 서울에서 가까운 수원은 싸고, 먼 부산은 비싼 것처럼
//    한국에 가까운 항구일수록 운송비가 저렴
const REGION_MULTIPLIERS: Record<string, number> = {
  "동북": 0.85,  // 다롄 — 한국과 가장 가까움 (직선 ~500km)
  "화북": 0.90,  // 톈진, 칭다오, 옌타이 — 가까움 (~600-800km)
  "화동": 1.00,  // 상하이, 닝보, 롄윈강, 타이창 — 기준 (~850-1000km)
  "화남": 1.15,  // 푸저우, 샤먼, 선전, 광저우 — 멀어서 비쌈 (~1500-2000km)
}

/**
 * 항구별 기본 운임 자동 생성
 *
 * 📌 비유: 전국 택배 요금표를 "지역 × 기준 요금"으로 자동 만드는 것
 * - CHINESE_PORTS에서 각 항구의 region(지역)을 읽어옴
 * - 해당 지역의 배율을 기준 운임에 곱해서 기본 운임 산출
 *
 * 예: 광저우(화남) 20DC = 1,250,000 × 1.15 = 1,437,500원
 */
export const DEFAULT_PORT_SHIPPING_RATES: PortShippingRateMap = Object.fromEntries(
  CHINESE_PORTS.map((port) => {
    const multiplier = REGION_MULTIPLIERS[port.region] ?? 1.00
    return [
      port.id,
      {
        "20DC": Math.round(BASE_RATES["20DC"] * multiplier),
        "40DC": Math.round(BASE_RATES["40DC"] * multiplier),
        "40HC": Math.round(BASE_RATES["40HC"] * multiplier),
      },
    ]
  })
)

/**
 * 특정 항구의 컨테이너 국제 운송비 조회
 *
 * 📌 비유: "칭다오에서 20ft 컨테이너 보내면 얼마야?" → 요금표에서 찾기
 *
 * 우선순위:
 * 1. DB 오버라이드 (overrides) — 설정 화면에서 직접 입력한 값
 * 2. 코드 기본값 (DEFAULT_PORT_SHIPPING_RATES) — 지역별 배율로 자동 생성된 값
 * 3. 원래 고정값 (BASE_RATES) — 항구를 모를 때 최후 폴백
 *
 * @param portId 항구 ID (예: "port-qingdao")
 * @param containerType 컨테이너 타입 (예: "20DC")
 * @param overrides DB에서 로드한 오버라이드 맵 (선택)
 * @returns 국제 운송비 (원)
 */
export function getPortShippingRate(
  portId: string,
  containerType: ContainerType,
  overrides?: PortShippingRateMap
): number {
  // 1순위: DB 오버라이드
  if (overrides?.[portId]?.[containerType] !== undefined) {
    return overrides[portId][containerType]
  }
  // 2순위: 코드 기본값
  if (DEFAULT_PORT_SHIPPING_RATES[portId]?.[containerType] !== undefined) {
    return DEFAULT_PORT_SHIPPING_RATES[portId][containerType]
  }
  // 3순위: 원래 고정값 (항구를 모르는 경우)
  return BASE_RATES[containerType]
}
