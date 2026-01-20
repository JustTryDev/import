/**
 * 관세율 조회 API Route
 *
 * 📌 이 API의 역할
 * 특정 HS Code의 상세 관세율 정보를 조회합니다.
 *
 * 비유: 도서관에서 특정 책의 상세 정보를 확인하는 것처럼,
 * 특정 품목의 모든 관세율(기본, WTO, FTA)을 알려줍니다.
 *
 * 호출 방법: GET /api/tariff/rate?code=6116100000
 */

import { NextRequest, NextResponse } from "next/server"
import type { TariffRateResponse, TariffRate } from "@/types/tariff"
import fs from "fs"
import path from "path"

// 관세 데이터 로드 함수
function loadTariffData() {
  const filePath = path.join(process.cwd(), "public", "data", "tariff-data.json")
  const fileContent = fs.readFileSync(filePath, "utf-8")
  return JSON.parse(fileContent)
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
 * HS Code 정규화 (10자리로 맞춤)
 *
 * 📌 왜 정규화가 필요한가요?
 * 사용자가 "6116" 또는 "611610" 등 다양한 형태로 입력할 수 있어요.
 * 10자리로 맞춰서 정확하게 매칭합니다.
 */
function normalizeHsCode(code: string): string {
  // 숫자만 추출
  const digitsOnly = code.replace(/\D/g, "")
  // 10자리로 맞춤 (부족하면 0으로 채움)
  return digitsOnly.padEnd(10, "0").slice(0, 10)
}

/**
 * GET 요청 처리
 *
 * 쿼리 파라미터:
 * - code: HS Code (필수)
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<TariffRateResponse>> {
  try {
    // 1. HS Code 추출
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")

    // HS Code가 없으면 에러
    if (!code || code.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_CODE",
            message: "HS Code를 입력해주세요.",
          },
        },
        { status: 400 }
      )
    }

    // 2. 데이터 로드
    const tariffData = loadTariffData()
    const items: TariffDataItem[] = tariffData.items

    // 3. HS Code로 데이터 검색
    const normalizedCode = normalizeHsCode(code)

    // 정확히 일치하는 항목 찾기
    const item = items.find(
      (item) => item.code === normalizedCode
    )

    // 정확한 일치가 없으면, 입력된 코드로 시작하는 첫 번째 항목 찾기
    const matchingItem =
      item ||
      items.find((item) =>
        item.code.startsWith(code.replace(/\D/g, ""))
      )

    // 3. 결과가 없으면 에러
    if (!matchingItem) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `HS Code "${code}"에 해당하는 품목을 찾을 수 없습니다.`,
          },
        },
        { status: 404 }
      )
    }

    // 4. 관세율 정보 구성
    const tariffRate: TariffRate = {
      hsCode: matchingItem.code,
      basicRate: matchingItem.basicRate,
      wtoRate: matchingItem.wtoRate,
      chinaFtaRate: matchingItem.chinaFtaRate,
      unit: matchingItem.unit,
    }

    // 5. 성공 응답 반환
    return NextResponse.json({
      success: true,
      data: tariffRate,
    })
  } catch (error) {
    // 예상치 못한 에러 처리
    console.error("관세율 조회 중 에러 발생:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNKNOWN_ERROR",
          message: "조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        },
      },
      { status: 500 }
    )
  }
}
