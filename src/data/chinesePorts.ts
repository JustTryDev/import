/**
 * 중국 주요 컨테이너 항구 데이터
 *
 * 📌 비유: 전국 택배 발송 가능한 항구 목록
 * - 공장에서 가장 가까운 항구를 자동으로 찾아주는 기능 포함
 * - FCL(컨테이너) 운송 시 출발 항구를 선택하는 데 사용
 */

import { calculateDistance } from "./chinaRegions"

// 중국 항구 타입
export interface ChinesePort {
  id: string       // 고유 ID (예: "port-shanghai")
  nameKo: string   // 한국어명 (예: "상하이항")
  nameCn: string   // 중국어명 (예: "上海港")
  lat: number      // 위도
  lng: number      // 경도
  region: string   // 지역 구분 (화북, 화동, 화남 등)
}

// 거리 정보가 포함된 항구 타입 (검색 결과용)
export interface PortWithDistance extends ChinesePort {
  distanceKm: number  // 직선 거리 (km)
}

/**
 * 한국행 컨테이너 정기선이 운항하는 중국 항구 목록 (15개)
 *
 * 📌 비유: "한국으로 택배 보낼 수 있는 우체국"만 모은 목록
 * - 난징, 난퉁 등 내륙 하천항은 한국 직항 컨테이너선이 없어 제외
 * - 한국 주요 도착항: 부산, 인천, 광양, 평택
 * - 좌표는 각 항구의 컨테이너 터미널 대략적 위치
 */
export const CHINESE_PORTS: ChinesePort[] = [
  // ===== 동북 =====
  // 다롄: 한국행 정기선 다수 운항 (부산/인천 직항)
  { id: "port-dalian", nameKo: "다롄항", nameCn: "大连港", lat: 38.93, lng: 121.65, region: "동북" },

  // ===== 화북 =====
  // 톈진: 베이징/허베이 수출 거점, 한국행 정기선 운항
  { id: "port-tianjin", nameKo: "톈진항", nameCn: "天津港", lat: 38.99, lng: 117.74, region: "화북" },
  // 칭다오: 한국행 최다 빈도 항로 (부산 직항 2~3일)
  { id: "port-qingdao", nameKo: "칭다오항", nameCn: "青岛港", lat: 36.08, lng: 120.32, region: "화북" },
  // 옌타이: 한국행 정기선 운항 (인천/평택 직항)
  { id: "port-yantai", nameKo: "옌타이항", nameCn: "烟台港", lat: 37.55, lng: 121.40, region: "화북" },

  // ===== 화동 =====
  // 롄윈강: 한국행 정기선 운항 (부산 직항)
  { id: "port-lianyungang", nameKo: "롄윈강항", nameCn: "连云港", lat: 34.75, lng: 119.46, region: "화동" },
  // 타이창: 장쑤성 수출 거점, 상하이 인접 피더항
  { id: "port-taicang", nameKo: "타이창항", nameCn: "太仓港", lat: 31.65, lng: 121.11, region: "화동" },
  // 상하이: 세계 1위 컨테이너항, 한국행 매일 운항
  { id: "port-shanghai", nameKo: "상하이항", nameCn: "上海港", lat: 30.63, lng: 122.07, region: "화동" },
  // 닝보: 세계 3위 컨테이너항, 한국행 정기선 다수 (인천 직항 3~5일)
  { id: "port-ningbo", nameKo: "닝보-저우산항", nameCn: "宁波舟山港", lat: 29.87, lng: 121.88, region: "화동" },

  // ===== 화남 =====
  // 푸저우: 한국행 정기선 운항 (부산 경유)
  { id: "port-fuzhou", nameKo: "푸저우항", nameCn: "福州港", lat: 26.00, lng: 119.47, region: "화남" },
  // 샤먼: 한국행 정기선 운항 (부산 직항)
  { id: "port-xiamen", nameKo: "샤먼항", nameCn: "厦门港", lat: 24.45, lng: 118.08, region: "화남" },
  // 선전 옌톈: 화남 최대 수출항, 한국행 정기선 다수 (부산 직항 4~6일)
  { id: "port-shenzhen-yantian", nameKo: "선전 옌톈항", nameCn: "深圳盐田港", lat: 22.57, lng: 114.27, region: "화남" },
  // 선전 셔커우: 한국행 정기선 운항
  { id: "port-shenzhen-shekou", nameKo: "선전 셔커우항", nameCn: "深圳蛇口港", lat: 22.48, lng: 113.90, region: "화남" },
  // 광저우 난사: 한국행 정기선 운항 (부산/인천)
  { id: "port-guangzhou-nansha", nameKo: "광저우 난사항", nameCn: "广州南沙港", lat: 22.63, lng: 113.59, region: "화남" },
]

/**
 * 공장 좌표 기준 가장 가까운 항구 찾기
 *
 * 📌 비유: "내 집에서 가장 가까운 우체국" 찾기
 * - Haversine 공식으로 직선 거리 계산 (도로 거리와 다를 수 있음)
 * - 실제 도로 거리는 Google Directions API로 별도 계산
 *
 * @param coord 공장 좌표 { lat, lng }
 * @returns 가장 가까운 항구
 */
export function findNearestPort(
  coord: { lat: number; lng: number }
): ChinesePort {
  let nearest = CHINESE_PORTS[0]
  let minDistance = Infinity

  for (const port of CHINESE_PORTS) {
    const distance = calculateDistance(coord, port)
    if (distance < minDistance) {
      minDistance = distance
      nearest = port
    }
  }

  return nearest
}

/**
 * 공장 좌표 기준 가까운 항구 N개 찾기 (거리순 정렬)
 *
 * 📌 비유: "내 집 근처 우체국 5곳" 찾기 (가까운 순서대로)
 *
 * @param coord 공장 좌표 { lat, lng }
 * @param count 반환할 항구 수 (기본값: 5)
 * @returns 거리순으로 정렬된 항구 목록 (거리 정보 포함)
 */
export function findNearestPorts(
  coord: { lat: number; lng: number },
  count: number = 5
): PortWithDistance[] {
  // 모든 항구에 대해 거리 계산
  const portsWithDistance: PortWithDistance[] = CHINESE_PORTS.map((port) => ({
    ...port,
    distanceKm: Math.round(calculateDistance(coord, port)),
  }))

  // 거리순 정렬 후 상위 N개 반환
  return portsWithDistance
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, count)
}

/**
 * 특정 항구를 ID로 찾기
 *
 * @param portId 항구 ID (예: "port-shanghai")
 * @returns 항구 정보 또는 undefined
 */
export function getPortById(portId: string): ChinesePort | undefined {
  return CHINESE_PORTS.find((port) => port.id === portId)
}
