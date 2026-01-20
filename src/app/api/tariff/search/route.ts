/**
 * HS Code 검색 API Route
 *
 * 📌 이 API의 역할
 * HS Code 또는 품목명으로 관세 정보를 검색합니다.
 *
 * 비유: 도서관에서 책을 검색하는 것처럼,
 * 제품 이름이나 코드로 관세 정보를 찾아줍니다.
 *
 * 호출 방법: GET /api/tariff/search?q=장갑
 * 또는: GET /api/tariff/search?q=6116
 */

import { NextRequest, NextResponse } from "next/server"
import type { TariffSearchResponse, HsCodeWithTariff } from "@/types/tariff"
import fs from "fs"
import path from "path"

// 관세 데이터 로드 함수
function loadTariffData() {
  const filePath = path.join(process.cwd(), "public", "data", "tariff-data.json")
  const fileContent = fs.readFileSync(filePath, "utf-8")
  return JSON.parse(fileContent)
}

// 검색 결과 최대 개수
const MAX_RESULTS = 20

/**
 * 검색어가 HS Code인지 판단
 * HS Code는 숫자로만 구성됨
 */
function isHsCodeQuery(query: string): boolean {
  return /^\d+$/.test(query.trim())
}

// 데이터 타입 정의
interface TariffDataItem {
  code: string
  nameKo: string
  nameEn: string
  basicRate: number
  wtoRate: number | null
  chinaFtaRate: number | null
  unit: string | null
}

/**
 * HS Code로 검색
 * 입력된 코드로 시작하는 모든 품목 반환
 */
function searchByCode(code: string, items: TariffDataItem[]): HsCodeWithTariff[] {
  const normalizedCode = code.trim()
  return items
    .filter((item) => item.code.startsWith(normalizedCode))
    .slice(0, MAX_RESULTS)
    .map((item) => ({
      code: item.code,
      nameKo: item.nameKo,
      nameEn: item.nameEn,
      basicRate: item.basicRate,
      wtoRate: item.wtoRate,
      chinaFtaRate: item.chinaFtaRate,
    }))
}

/**
 * 품목명으로 검색 (한글/영문 모두)
 * 검색어를 포함하는 모든 품목 반환
 */
function searchByName(query: string, items: TariffDataItem[]): HsCodeWithTariff[] {
  const normalizedQuery = query.trim().toLowerCase()
  return items
    .filter(
      (item) =>
        item.nameKo.toLowerCase().includes(normalizedQuery) ||
        item.nameEn.toLowerCase().includes(normalizedQuery)
    )
    .slice(0, MAX_RESULTS)
    .map((item) => ({
      code: item.code,
      nameKo: item.nameKo,
      nameEn: item.nameEn,
      basicRate: item.basicRate,
      wtoRate: item.wtoRate,
      chinaFtaRate: item.chinaFtaRate,
    }))
}

/**
 * GET 요청 처리
 *
 * 쿼리 파라미터:
 * - q: 검색어 (필수) - HS Code 또는 품목명
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<TariffSearchResponse>> {
  try {
    // 1. 검색어 추출
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")

    // 검색어가 없으면 에러
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_QUERY",
            message: "검색어를 입력해주세요.",
          },
          totalCount: 0,
        },
        { status: 400 }
      )
    }

    // 검색어가 너무 짧으면 에러 (최소 2글자)
    if (query.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "QUERY_TOO_SHORT",
            message: "검색어는 2글자 이상 입력해주세요.",
          },
          totalCount: 0,
        },
        { status: 400 }
      )
    }

    // 2. 데이터 로드
    const tariffData = loadTariffData()
    const items: TariffDataItem[] = tariffData.items

    // 3. 검색 실행
    let results: HsCodeWithTariff[]

    if (isHsCodeQuery(query)) {
      // HS Code로 검색 (숫자만 입력한 경우)
      results = searchByCode(query, items)
    } else {
      // 품목명으로 검색 (문자 포함)
      results = searchByName(query, items)
    }

    // 3. 결과 반환
    return NextResponse.json({
      success: true,
      data: results,
      totalCount: results.length,
    })
  } catch (error) {
    // 예상치 못한 에러 처리
    console.error("관세 검색 중 에러 발생:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNKNOWN_ERROR",
          message: "검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        },
        totalCount: 0,
      },
      { status: 500 }
    )
  }
}
