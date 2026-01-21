/**
 * 환율 조회 API Route
 *
 * 📌 API Route란?
 * Next.js에서 백엔드 API를 만드는 방법입니다.
 * 이 파일은 서버에서만 실행되므로 API 키를 안전하게 보호할 수 있어요.
 *
 * 호출 방법: GET /api/exchange-rate
 * 응답: 오늘의 환율 + 최근 5일 히스토리
 */

import { NextResponse } from "next/server"
import type {
  ExchangeRateResponse,
  ExchangeRates,
  KoreaEximApiResponse,
  CurrencyCode,
  DailyRate,
} from "@/types/exchange"

// 한국수출입은행 API 엔드포인트
const KOREAEXIM_API_URL =
  "https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON"

// 네이버 환율 API 엔드포인트 (하나은행 기준 실시간 환율)
const NAVER_EXCHANGE_API_URL =
  "https://api.stock.naver.com/marketindex/exchange"

// API 통화코드 → 우리 통화코드 매핑
const CURRENCY_CODE_MAP: Record<string, CurrencyCode> = {
  USD: "USD",
  CNH: "CNY", // 한국수출입은행은 CNH로 표시하지만, 우리는 CNY로 사용
}

// 네이버 API 응답 타입
interface NaverExchangePrice {
  closePrice: string        // 현재 환율 (예: "1,450.50")
  localTradedAt: string     // 거래 시간 (예: "2026-01-21T15:30:00")
}

/**
 * 환율 문자열을 숫자로 변환
 * @example parseRate("1,473.50") → 1473.50
 */
function parseRate(rateString: string): number {
  return parseFloat(rateString.replace(/,/g, ""))
}

/**
 * 한국 시간(KST) 기준 현재 Date 객체 반환
 */
function getKoreanDate(): Date {
  const now = new Date()
  // UTC 시간에 9시간(KST) 추가
  const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return koreaTime
}

/**
 * Date 객체를 YYYYMMDD 형식으로 변환 (API 호출용)
 */
function formatDateForApi(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}${month}${day}`
}

/**
 * Date 객체를 YYYY-MM-DD 형식으로 변환 (표시용)
 */
function formatDateForDisplay(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Date 객체를 YYYY-MM-DD HH:mm 형식으로 변환 (현재 시간 표시용)
 */
function formatDateTime(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  const hours = String(date.getUTCHours()).padStart(2, "0")
  const minutes = String(date.getUTCMinutes()).padStart(2, "0")
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * N일 전 한국 시간 Date 객체 반환
 */
function getKoreanPastDate(daysAgo: number): Date {
  const koreaDate = getKoreanDate()
  koreaDate.setUTCDate(koreaDate.getUTCDate() - daysAgo)
  return koreaDate
}

/**
 * 특정 날짜의 환율 데이터 조회
 */
async function fetchRateForDate(
  authkey: string,
  date: Date
): Promise<{ usdRate: number; cnyRate: number; date: string } | null> {
  const searchDate = formatDateForApi(date)
  const apiUrl = `${KOREAEXIM_API_URL}?authkey=${authkey}&searchdate=${searchDate}&data=AP01`

  try {
    const response = await fetch(apiUrl, { cache: "no-store" })

    if (!response.ok) {
      return null
    }

    const data: KoreaEximApiResponse[] = await response.json()

    if (!data || data.length === 0) {
      return null
    }

    let usdRate: number | null = null
    let cnyRate: number | null = null

    for (const item of data) {
      if (item.cur_unit === "USD") {
        usdRate = parseRate(item.deal_bas_r)
      } else if (item.cur_unit === "CNH") {
        cnyRate = parseRate(item.deal_bas_r)
      }
    }

    if (usdRate !== null && cnyRate !== null) {
      return {
        usdRate,
        cnyRate,
        date: formatDateForDisplay(date),
      }
    }

    return null
  } catch {
    return null
  }
}

// 네이버 환율 조회 결과 타입 (환율 + 시간)
interface NaverRateResult {
  rate: number      // 환율
  tradedAt: string  // 거래 시간 (YYYY-MM-DD HH:mm)
}

/**
 * 네이버 API에서 실시간 환율 조회 (하나은행 기준)
 * @param currencyCode - 통화 코드 (FX_USDKRW 또는 FX_CNYKRW)
 * @returns 환율과 거래 시간 또는 실패 시 null
 *
 * 📌 왜 네이버 API를 사용하나요?
 * 한국수출입은행 API는 하루에 한 번만 업데이트되지만,
 * 네이버는 하나은행 기준 실시간 환율을 제공해서 더 정확해요!
 */
async function fetchNaverRealTimeRate(
  currencyCode: "FX_USDKRW" | "FX_CNYKRW"
): Promise<NaverRateResult | null> {
  try {
    // 네이버 주식 API 호출 (page=1, pageSize=1로 최신 1개만)
    const url = `${NAVER_EXCHANGE_API_URL}/${currencyCode}/prices?page=1&pageSize=1`
    const response = await fetch(url, {
      cache: "no-store", // 항상 최신 데이터 가져오기
      headers: {
        // 네이버 API가 브라우저 요청처럼 보이도록 User-Agent 설정
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    if (!response.ok) {
      console.error(`네이버 API 호출 실패: ${currencyCode}`, response.status)
      return null
    }

    const data: NaverExchangePrice[] = await response.json()

    // 데이터가 있으면 환율과 시간 반환
    if (data && data.length > 0 && data[0].closePrice) {
      // 거래 시간을 한국 시간 형식으로 변환 (YYYY-MM-DD HH:mm)
      const tradedAt = formatTradedTime(data[0].localTradedAt)
      return {
        rate: parseRate(data[0].closePrice),
        tradedAt,
      }
    }

    return null
  } catch (error) {
    console.error(`네이버 환율 조회 실패 (${currencyCode}):`, error)
    return null
  }
}

/**
 * 네이버 API의 거래 시간을 포맷팅
 * - 시간 정보가 있으면: "YYYY-MM-DD HH:mm"
 * - 날짜만 있으면: "YYYY-MM-DD"
 * @example "2026-01-21T15:30:00" → "2026-01-21 15:30"
 * @example "2026-01-21" → "2026-01-21"
 */
function formatTradedTime(isoString: string): string {
  try {
    // 시간 정보가 포함되어 있는지 확인 (T가 있으면 시간 포함)
    const hasTime = isoString.includes("T")

    if (hasTime) {
      const date = new Date(isoString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      const hours = String(date.getHours()).padStart(2, "0")
      const minutes = String(date.getMinutes()).padStart(2, "0")
      return `${year}-${month}-${day} ${hours}:${minutes}`
    } else {
      // 날짜만 있으면 그대로 반환
      return isoString
    }
  } catch {
    // 파싱 실패 시 현재 날짜 반환
    const now = getKoreanDate()
    return formatDateForDisplay(now)
  }
}

/**
 * 네이버 API의 거래 시간에서 날짜만 추출
 * @example "2026-01-21T15:30:00" → "2026-01-21"
 */
function extractDateFromTradedTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  } catch {
    return ""
  }
}

// 네이버 히스토리 아이템 타입
interface NaverHistoryItem {
  date: string    // YYYY-MM-DD
  rate: number    // 환율
}

/**
 * 네이버 API에서 최근 N일 환율 히스토리 조회
 * @param currencyCode - 통화 코드 (FX_USDKRW 또는 FX_CNYKRW)
 * @param count - 가져올 일 수 (기본 5일)
 * @returns 날짜별 환율 배열 또는 실패 시 null
 */
async function fetchNaverHistory(
  currencyCode: "FX_USDKRW" | "FX_CNYKRW",
  count: number = 5
): Promise<NaverHistoryItem[] | null> {
  try {
    // 네이버 API에서 최근 데이터 가져오기 (여유있게 더 많이 요청)
    const url = `${NAVER_EXCHANGE_API_URL}/${currencyCode}/prices?page=1&pageSize=${count * 2}`
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    if (!response.ok) {
      console.error(`네이버 히스토리 API 호출 실패: ${currencyCode}`, response.status)
      return null
    }

    const data: NaverExchangePrice[] = await response.json()

    if (!data || data.length === 0) {
      return null
    }

    // 날짜별로 그룹화하여 각 날짜의 마지막 환율만 사용
    const dateMap = new Map<string, number>()
    for (const item of data) {
      const date = extractDateFromTradedTime(item.localTradedAt)
      if (date && item.closePrice) {
        // 같은 날짜면 덮어쓰기 (최신 데이터가 먼저 오므로 첫 번째 것만 유지)
        if (!dateMap.has(date)) {
          dateMap.set(date, parseRate(item.closePrice))
        }
      }
    }

    // Map을 배열로 변환하고 최근 N일만 반환
    const history: NaverHistoryItem[] = []
    for (const [date, rate] of dateMap) {
      history.push({ date, rate })
      if (history.length >= count) break
    }

    return history.length > 0 ? history : null
  } catch (error) {
    console.error(`네이버 히스토리 조회 실패 (${currencyCode}):`, error)
    return null
  }
}

/**
 * GET 요청 처리 - 오늘의 환율 + 최근 5일 히스토리 반환
 *
 * 📌 데이터 소스:
 * - 오늘의 환율: 네이버 실시간 환율 (하나은행 기준)
 * - 최근 5일 히스토리: 네이버 환율 (하나은행 기준)
 * - 네이버 실패 시: 한국수출입은행 데이터로 자동 대체
 */
export async function GET(): Promise<NextResponse<ExchangeRateResponse>> {
  try {
    // 1. 환경변수에서 API 키 가져오기 (폴백용)
    const authkey = process.env.KOREAEXIM_API_KEY

    // 2. 네이버에서 오늘의 실시간 환율 + 최근 5일 히스토리 가져오기 (병렬 처리)
    const [naverUsdResult, naverCnyResult, naverUsdHistory, naverCnyHistory] = await Promise.all([
      fetchNaverRealTimeRate("FX_USDKRW"),
      fetchNaverRealTimeRate("FX_CNYKRW"),
      fetchNaverHistory("FX_USDKRW", 5),
      fetchNaverHistory("FX_CNYKRW", 5),
    ])

    // 3. 네이버 히스토리로 최근 5일 데이터 구성
    let history: DailyRate[] = []

    if (naverUsdHistory && naverCnyHistory) {
      // USD와 CNY 히스토리를 날짜 기준으로 합치기
      const cnyMap = new Map(naverCnyHistory.map(item => [item.date, item.rate]))

      for (const usdItem of naverUsdHistory) {
        const cnyRate = cnyMap.get(usdItem.date)
        if (cnyRate !== undefined) {
          history.push({
            date: usdItem.date,
            usdRate: usdItem.rate,
            cnyRate: cnyRate,
          })
        }
      }
    }

    // 4. 네이버 히스토리 실패 시 한국수출입은행으로 폴백
    let fallbackRates: { usdRate: number; cnyRate: number; date: string } | null = null

    if (history.length === 0 && authkey) {
      console.log("네이버 히스토리 실패, 한국수출입은행 API로 폴백")

      for (let daysAgo = 0; daysAgo <= 14 && history.length < 5; daysAgo++) {
        const targetDate = getKoreanPastDate(daysAgo)
        const rateData = await fetchRateForDate(authkey, targetDate)

        if (rateData) {
          history.push({
            date: rateData.date,
            usdRate: rateData.usdRate,
            cnyRate: rateData.cnyRate,
          })

          // 첫 번째 데이터를 폴백용으로 저장 (네이버 실패 시 사용)
          if (!fallbackRates) {
            fallbackRates = {
              usdRate: rateData.usdRate,
              cnyRate: rateData.cnyRate,
              date: rateData.date,
            }
          }
        }
      }
    }

    // 5. 오늘의 환율 결정 (네이버 우선, 실패 시 한국수출입은행)
    const todayUsdRate = naverUsdResult?.rate ?? fallbackRates?.usdRate
    const todayCnyRate = naverCnyResult?.rate ?? fallbackRates?.cnyRate

    // 6. 업데이트 시간 = 현재 시간 (KST)
    const now = getKoreanDate()
    const currentDateTime = formatDateTime(now)

    // 데이터가 없으면 에러 반환
    if (!todayUsdRate || !todayCnyRate || history.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_DATA",
            message: "환율 데이터가 없습니다. 잠시 후 다시 시도해주세요.",
          },
          timestamp: Date.now(),
        },
        { status: 404 }
      )
    }

    // 7. 응답 데이터 구성
    const latestRates: ExchangeRates = {
      USD: {
        currencyCode: "USD",
        currencyName: "미국 달러",
        baseRate: todayUsdRate,
        updatedAt: currentDateTime,
      },
      CNY: {
        currencyCode: "CNY",
        currencyName: "중국 위안",
        baseRate: todayCnyRate,
        updatedAt: currentDateTime,
      },
    }

    // 8. 성공 응답 반환
    return NextResponse.json({
      success: true,
      data: {
        ...latestRates,
        history,
      },
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("환율 조회 중 에러 발생:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNKNOWN_ERROR",
          message: "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        },
        timestamp: Date.now(),
      },
      { status: 500 }
    )
  }
}
