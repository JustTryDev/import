/**
 * Excel → JSON 변환 스크립트
 *
 * 📌 이 스크립트의 역할
 * 공공데이터포털에서 다운로드한 Excel 파일을
 * 우리 프로젝트에서 사용할 수 있는 JSON 형식으로 변환합니다.
 *
 * 사용 방법:
 * 1. data-raw/ 폴더에 Excel 파일을 넣어주세요
 * 2. 터미널에서 실행: npx tsx scripts/convertTariffData.ts
 * 3. public/data/tariff-data.json 파일이 생성됩니다
 */

import * as XLSX from "xlsx"
import * as fs from "fs"
import * as path from "path"

// 프로젝트 경로 설정
const PROJECT_ROOT = process.cwd()
const DATA_RAW_DIR = path.join(PROJECT_ROOT, "data-raw")
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "data")
const OUTPUT_FILE = path.join(OUTPUT_DIR, "tariff-data.json")

/**
 * 관세율 데이터 타입
 */
interface TariffItem {
  code: string
  nameKo: string
  nameEn: string
  basicRate: number
  wtoRate: number | null
  chinaFtaRate: number | null
  unit: string | null
}

/**
 * 관세율 구분 코드 해석
 * A: 기본세율, C: WTO 양허세율, F: FTA 세율
 */
function parseRateType(rateType: string): "basic" | "wto" | "fta" | "other" {
  switch (rateType?.trim()?.toUpperCase()) {
    case "A":
      return "basic"
    case "C":
      return "wto"
    case "F":
      return "fta"
    default:
      return "other"
  }
}

/**
 * 세율 문자열을 숫자로 변환
 * "8", "8%", "8.5%" → 8, 8, 8.5
 */
function parseRate(rateStr: string | number | undefined): number {
  if (rateStr === undefined || rateStr === null || rateStr === "") {
    return 0
  }
  if (typeof rateStr === "number") {
    return rateStr
  }
  // % 기호 제거하고 숫자로 변환
  const cleaned = String(rateStr).replace(/%/g, "").trim()
  const rate = parseFloat(cleaned)
  return isNaN(rate) ? 0 : rate
}

/**
 * HS Code 형식 정규화 (10자리로 맞춤)
 */
function normalizeHsCode(code: string | number): string {
  const codeStr = String(code).replace(/\D/g, "") // 숫자만 추출
  return codeStr.padEnd(10, "0").slice(0, 10)
}

/**
 * 메인 변환 함수
 */
async function convertExcelToJson() {
  console.log("🚀 Excel → JSON 변환 시작...")
  console.log(`📁 입력 폴더: ${DATA_RAW_DIR}`)
  console.log(`📁 출력 파일: ${OUTPUT_FILE}`)

  // 출력 폴더 생성
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    console.log("✅ 출력 폴더 생성 완료")
  }

  // data-raw 폴더에서 Excel 파일 찾기
  if (!fs.existsSync(DATA_RAW_DIR)) {
    console.error("❌ data-raw 폴더가 없습니다. 폴더를 생성하고 Excel 파일을 넣어주세요.")
    process.exit(1)
  }

  const files = fs.readdirSync(DATA_RAW_DIR)
  const excelFiles = files.filter(
    (f) => f.endsWith(".xlsx") || f.endsWith(".xls")
  )

  if (excelFiles.length === 0) {
    console.error("❌ data-raw 폴더에 Excel 파일이 없습니다.")
    console.log("📌 공공데이터포털에서 다음 파일을 다운로드해주세요:")
    console.log("   - HS부호: https://www.data.go.kr/data/15049722/fileData.do")
    console.log("   - 관세율표: https://www.data.go.kr/data/15051179/fileData.do")
    process.exit(1)
  }

  console.log(`📄 발견된 Excel 파일: ${excelFiles.join(", ")}`)

  // 데이터 저장용 Map (HS Code를 키로 사용)
  const itemsMap = new Map<string, TariffItem>()

  // 각 Excel 파일 처리
  for (const fileName of excelFiles) {
    const filePath = path.join(DATA_RAW_DIR, fileName)
    console.log(`\n📖 파일 처리 중: ${fileName}`)

    try {
      const workbook = XLSX.readFile(filePath)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      console.log(`   - 시트: ${sheetName}`)
      console.log(`   - 행 수: ${jsonData.length}`)

      // 파일 종류 판단 (첫 번째 행의 컬럼명 확인)
      if (jsonData.length > 0) {
        const firstRow = jsonData[0] as Record<string, unknown>
        const columns = Object.keys(firstRow)
        console.log(`   - 컬럼: ${columns.slice(0, 5).join(", ")}...`)

        // HS부호 파일인 경우 (품목명 포함)
        if (
          columns.some(
            (c) => c.includes("부호") || c.includes("품목") || c.includes("HSK")
          )
        ) {
          processHsCodeFile(jsonData as Record<string, unknown>[], itemsMap)
        }

        // 관세율표 파일인 경우 (세율 포함)
        if (
          columns.some(
            (c) => c.includes("세율") || c.includes("관세") || c.includes("율")
          )
        ) {
          processTariffRateFile(jsonData as Record<string, unknown>[], itemsMap)
        }
      }
    } catch (error) {
      console.error(`   ❌ 파일 처리 오류: ${error}`)
    }
  }

  // 결과 생성
  const items = Array.from(itemsMap.values())
  console.log(`\n✅ 총 ${items.length}개 품목 처리 완료`)

  // JSON 파일 저장
  const output = {
    metadata: {
      version: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
      source: "공공데이터포털 (data.go.kr)",
      description: "HS Code 품목 및 관세율 데이터",
      lastUpdated: new Date().toISOString().slice(0, 10),
      totalItems: items.length,
    },
    items: items.sort((a, b) => a.code.localeCompare(b.code)),
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8")
  console.log(`\n🎉 변환 완료! 파일 저장됨: ${OUTPUT_FILE}`)
}

/**
 * HS부호 파일 처리 (품목명 데이터)
 */
function processHsCodeFile(
  data: Record<string, unknown>[],
  itemsMap: Map<string, TariffItem>
) {
  console.log("   📋 HS부호 데이터 처리 중...")
  let processed = 0

  for (const row of data) {
    // 가능한 컬럼명들 (공공데이터 파일마다 다를 수 있음)
    const code =
      row["HSK부호"] ||
      row["HS부호"] ||
      row["세번"] ||
      row["품목번호"] ||
      row["code"]
    const nameKo =
      row["한글품목명"] || row["품목명"] || row["품목명(국문)"] || row["nameKo"]
    const nameEn =
      row["영문품목명"] ||
      row["품목명(영문)"] ||
      row["English"] ||
      row["nameEn"]

    if (code) {
      const normalizedCode = normalizeHsCode(String(code))
      const existing = itemsMap.get(normalizedCode) || {
        code: normalizedCode,
        nameKo: "",
        nameEn: "",
        basicRate: 0,
        wtoRate: null,
        chinaFtaRate: null,
        unit: null,
      }

      existing.nameKo = String(nameKo || existing.nameKo || "")
      existing.nameEn = String(nameEn || existing.nameEn || "")

      itemsMap.set(normalizedCode, existing)
      processed++
    }
  }

  console.log(`   ✅ ${processed}개 품목명 처리됨`)
}

/**
 * 관세율표 파일 처리 (세율 데이터)
 */
function processTariffRateFile(
  data: Record<string, unknown>[],
  itemsMap: Map<string, TariffItem>
) {
  console.log("   📋 관세율 데이터 처리 중...")
  let processed = 0

  for (const row of data) {
    // 가능한 컬럼명들
    const code =
      row["품목번호"] ||
      row["HSK부호"] ||
      row["HS부호"] ||
      row["세번"] ||
      row["code"]
    const rateType =
      row["관세율구분"] || row["세율구분"] || row["구분"] || row["rateType"]
    const rate =
      row["관세율"] || row["세율"] || row["율"] || row["rate"]
    const unit = row["단위"] || row["수량단위"] || row["unit"]

    // 적용국가 (FTA 구분용)
    const country =
      row["적용국가"] ||
      row["적용국가구분"] ||
      row["국가"] ||
      row["country"]

    if (code) {
      const normalizedCode = normalizeHsCode(String(code))
      const existing = itemsMap.get(normalizedCode) || {
        code: normalizedCode,
        nameKo: "",
        nameEn: "",
        basicRate: 0,
        wtoRate: null,
        chinaFtaRate: null,
        unit: null,
      }

      const rateValue = parseRate(rate as string | number | undefined)
      const rateTypeStr = parseRateType(String(rateType || ""))
      const countryStr = String(country || "").toUpperCase()

      // 세율 종류에 따라 저장
      switch (rateTypeStr) {
        case "basic":
          existing.basicRate = rateValue
          break
        case "wto":
          existing.wtoRate = rateValue
          break
        case "fta":
          // 중국 FTA인 경우
          if (countryStr.includes("CN") || countryStr.includes("중국")) {
            existing.chinaFtaRate = rateValue
          }
          break
      }

      // 단위 정보
      if (unit && !existing.unit) {
        existing.unit = String(unit)
      }

      itemsMap.set(normalizedCode, existing)
      processed++
    }
  }

  console.log(`   ✅ ${processed}개 세율 데이터 처리됨`)
}

// 스크립트 실행
convertExcelToJson().catch(console.error)
