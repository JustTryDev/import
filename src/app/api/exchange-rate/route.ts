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

// API 통화코드 → 우리 통화코드 매핑
const CURRENCY_CODE_MAP: Record<string, CurrencyCode> = {
  USD: "USD",
  CNH: "CNY", // 한국수출입은행은 CNH로 표시하지만, 우리는 CNY로 사용
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

/**
 * GET 요청 처리 - 오늘의 환율 + 최근 5일 히스토리 반환
 */
export async function GET(): Promise<NextResponse<ExchangeRateResponse>> {
  try {
    // 1. 환경변수에서 API 키 가져오기
    const authkey = process.env.KOREAEXIM_API_KEY

    if (!authkey) {
      console.error("KOREAEXIM_API_KEY 환경변수가 설정되지 않았습니다.")
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFIG_ERROR",
            message: "서비스 설정 오류입니다. 관리자에게 문의하세요.",
          },
          timestamp: Date.now(),
        },
        { status: 500 }
      )
    }

    // 2. 최근 5일치 환율 데이터 수집 (최대 14일 검색)
    const history: DailyRate[] = []
    let latestRates: ExchangeRates | null = null

    for (let daysAgo = 0; daysAgo <= 14 && history.length < 5; daysAgo++) {
      const targetDate = getKoreanPastDate(daysAgo)
      const rateData = await fetchRateForDate(authkey, targetDate)

      if (rateData) {
        history.push({
          date: rateData.date,
          usdRate: rateData.usdRate,
          cnyRate: rateData.cnyRate,
        })

        // 가장 최신 데이터를 오늘의 환율로 사용
        if (!latestRates) {
          latestRates = {
            USD: {
              currencyCode: "USD",
              currencyName: "미국 달러",
              baseRate: rateData.usdRate,
              updatedAt: rateData.date,
            },
            CNY: {
              currencyCode: "CNY",
              currencyName: "중국 위안",
              baseRate: rateData.cnyRate,
              updatedAt: rateData.date,
            },
          }
        }
      }
    }

    // 데이터가 없으면 에러 반환
    if (!latestRates || history.length === 0) {
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

    // 3. 성공 응답 반환
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
