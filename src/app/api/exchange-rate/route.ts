/**
 * 환율 조회 API Route
 *
 * 📌 API Route란?
 * Next.js에서 백엔드 API를 만드는 방법입니다.
 * 이 파일은 서버에서만 실행되므로 API 키를 안전하게 보호할 수 있어요.
 *
 * 비유: 아파트 경비실처럼 외부 API(택배)를 대신 받아서 전달해주는 역할입니다.
 *
 * 호출 방법: GET /api/exchange-rate
 */

import { NextResponse } from "next/server"
import type {
  ExchangeRateResponse,
  ExchangeRates,
  KoreaEximApiResponse,
  CurrencyCode,
} from "@/types/exchange"

// 한국수출입은행 API 엔드포인트
const KOREAEXIM_API_URL =
  "https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON"

// 우리가 사용할 통화 목록
// 📌 참고: 한국수출입은행 API에서 중국 위안화는 "CNH" (역외 위안화)로 표시됩니다
const TARGET_CURRENCIES: CurrencyCode[] = ["USD", "CNY"]

// API 통화코드 → 우리 통화코드 매핑
// CNH(역외 위안화)를 CNY로 변환
const CURRENCY_CODE_MAP: Record<string, CurrencyCode> = {
  USD: "USD",
  CNH: "CNY", // 한국수출입은행은 CNH로 표시하지만, 우리는 CNY로 사용
}

/**
 * 환율 문자열을 숫자로 변환
 *
 * 📌 왜 이 함수가 필요한가요?
 * 한국수출입은행 API는 환율을 "1,473.50" 같은 문자열로 보내줍니다.
 * 계산을 하려면 숫자 1473.50으로 바꿔야 해요.
 *
 * @example
 * parseRate("1,473.50") → 1473.50
 * parseRate("201.23") → 201.23
 */
function parseRate(rateString: string): number {
  // 쉼표를 제거하고 숫자로 변환
  return parseFloat(rateString.replace(/,/g, ""))
}

/**
 * 오늘 날짜를 YYYYMMDD 형식으로 반환
 *
 * @example
 * getTodayDate() → "20260120"
 */
function getTodayDate(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}${month}${day}`
}

/**
 * GET 요청 처리
 *
 * 📌 이 함수는 언제 실행되나요?
 * 브라우저에서 /api/exchange-rate 주소로 접속하면 실행됩니다.
 * 또는 fetch('/api/exchange-rate')로 호출할 수 있어요.
 */
export async function GET(): Promise<NextResponse<ExchangeRateResponse>> {
  try {
    // 1. 환경변수에서 API 키 가져오기
    const authkey = process.env.KOREAEXIM_API_KEY

    // API 키가 없으면 에러 반환
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

    // 2. 한국수출입은행 API 호출
    // searchdate를 생략하면 가장 최근 영업일 데이터를 가져옵니다
    const apiUrl = `${KOREAEXIM_API_URL}?authkey=${authkey}&data=AP01`

    const response = await fetch(apiUrl, {
      // 캐시 설정: 1시간 동안 캐시 (환율은 자주 바뀌지 않아요)
      next: { revalidate: 3600 },
    })

    // API 응답이 실패하면 에러 반환
    if (!response.ok) {
      console.error(`한국수출입은행 API 응답 오류: ${response.status}`)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "API_ERROR",
            message: "환율 정보를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.",
          },
          timestamp: Date.now(),
        },
        { status: 502 }
      )
    }

    // 3. 응답 데이터 파싱
    const data: KoreaEximApiResponse[] = await response.json()

    // 데이터가 없거나 빈 배열이면 에러 반환
    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_DATA",
            message: "환율 데이터가 없습니다. 영업일에 다시 확인해주세요.",
          },
          timestamp: Date.now(),
        },
        { status: 404 }
      )
    }

    // 4. USD, CNH(CNY) 환율만 필터링하고 우리 형식으로 변환
    const rates: Partial<ExchangeRates> = {}
    const today = getTodayDate()

    for (const item of data) {
      // USD 또는 CNH(위안화)인 경우만 처리
      const mappedCode = CURRENCY_CODE_MAP[item.cur_unit]
      if (mappedCode) {
        rates[mappedCode] = {
          currencyCode: mappedCode,
          currencyName: mappedCode === "CNY" ? "중국 위안" : item.cur_nm,
          baseRate: parseRate(item.deal_bas_r),
          updatedAt: `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`,
        }
      }
    }

    // USD와 CNY 데이터가 모두 있는지 확인
    if (!rates.USD || !rates.CNY) {
      console.error("USD 또는 CNY 환율 데이터가 없습니다.", rates)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PARTIAL_DATA",
            message: "일부 환율 데이터를 찾을 수 없습니다.",
          },
          timestamp: Date.now(),
        },
        { status: 500 }
      )
    }

    // 5. 성공 응답 반환
    return NextResponse.json({
      success: true,
      data: rates as ExchangeRates,
      timestamp: Date.now(),
    })
  } catch (error) {
    // 예상치 못한 에러 처리
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
