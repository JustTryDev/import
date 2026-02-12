/**
 * 관세율 관련 타입 정의
 *
 * 📌 HS Code란?
 * 세계관세기구(WCO)가 만든 상품 분류 코드입니다.
 *
 * 비유: 도서관의 분류번호처럼, 모든 상품에 고유 번호가 붙어있어요.
 * 예: 6116100000 = 편물제 장갑
 *
 * 코드 구조:
 * - 앞 2자리: 류(Chapter) - 대분류
 * - 앞 4자리: 호(Heading) - 중분류
 * - 앞 6자리: 소호(Subheading) - 세계 공통
 * - 10자리: 세번(HSK) - 한국 고유
 */

// ==========================================
// 기본 타입
// ==========================================

/**
 * HS Code 품목 정보
 *
 * 📌 품목명이란?
 * HS Code가 가리키는 상품의 이름입니다.
 * 예: "편물제(메리야스편이나 뜨개질편)의 장갑, 미튼 및 미트"
 */
export interface HsCodeItem {
  code: string           // HS 코드 (10자리, 예: "6116100000")
  nameKo: string         // 한글 품목명
  nameEn: string         // 영문 품목명
}

/**
 * 관세율 구분 코드
 *
 * 📌 관세율 종류
 * - A: 기본세율 (법정 기본 관세)
 * - C: WTO 양허세율 (WTO 협정에 의한 세율)
 * - F: FTA 협정세율 (특정 국가와의 협정 세율)
 */
export type TariffRateType = "A" | "C" | "F"

/**
 * 관세율 정보
 *
 * 📌 관세란?
 * 외국에서 물건을 수입할 때 내는 세금입니다.
 *
 * 비유: 해외직구할 때 관세 내는 것과 같아요!
 * 제품가격 100만원, 관세율 8%면 → 관세 8만원
 */
export interface TariffRate {
  hsCode: string           // HS 코드
  basicRate: number        // 기본세율 (%)
  wtoRate: number | null   // WTO 양허세율 (%, 없으면 null)
  chinaFtaRate: number | null  // 한중 FTA 세율 (%, 없으면 null)
  unit: string | null      // 단위 (개, kg 등)
}

/**
 * HS Code + 관세율 통합 정보
 *
 * 검색 결과에서 품목명과 세율을 함께 보여줄 때 사용
 */
export interface HsCodeWithTariff extends HsCodeItem {
  basicRate: number
  wtoRate: number | null
  chinaFtaRate: number | null
}

// ==========================================
// 수입원가 계산 관련 타입
// ==========================================

/**
 * 수입원가 계산 입력값
 */
export interface ImportCostInput {
  productPriceCny: number    // 제품가격 (CNY 위안)
  hsCode: string             // 선택한 HS Code
  useFta: boolean            // FTA 적용 여부
}

/**
 * 수입원가 계산 결과
 *
 * 📌 수입원가 계산 공식
 * 1. 제품가격(원화) = 제품가격(위안) × 환율
 * 2. 관세 = 제품가격(원화) × 관세율
 * 3. 과세가격 = 제품가격(원화) + 관세
 * 4. 부가세 = 과세가격 × 10%
 * 5. 총 수입원가 = 과세가격 + 부가세
 */
export interface ImportCostResult {
  // 입력 정보
  productPriceCny: number    // 입력한 제품가격 (CNY)
  hsCode: string             // 선택한 HS Code
  productName: string        // 품목명

  // 환율 정보
  exchangeRate: number       // 적용 환율 (1 CNY = ? KRW)
  productPriceKrw: number    // 제품가격 (KRW)

  // 관세 정보
  tariffType: "basic" | "fta"  // 적용된 세율 종류
  tariffRate: number         // 적용 관세율 (%)
  tariffAmount: number       // 관세 (KRW)

  // 과세 및 최종 금액
  taxablePrice: number       // 과세가격 (제품가격 + 관세)
  totalCost: number          // 총 수입원가 (KRW)
}

// ==========================================
// API 응답 타입
// ==========================================

/**
 * HS Code 검색 API 응답
 */
export interface TariffSearchResponse {
  success: boolean
  data?: HsCodeWithTariff[]  // 검색 결과 목록
  error?: {
    code: string
    message: string
  }
  totalCount: number         // 전체 결과 수
}

/**
 * 관세율 조회 API 응답
 */
export interface TariffRateResponse {
  success: boolean
  data?: TariffRate          // 관세율 정보
  error?: {
    code: string
    message: string
  }
}

// ==========================================
// 컴포넌트 Props 타입
// ==========================================

/**
 * HS Code 검색 컴포넌트 Props
 */
export interface HsCodeSearchProps {
  onSelect: (item: HsCodeWithTariff) => void  // 품목 선택 시 콜백
  className?: string
}

/**
 * 수입원가 계산기 컴포넌트 Props
 */
export interface ImportCostCalculatorProps {
  className?: string
}

// ==========================================
// 커스텀 훅 반환 타입
// ==========================================

/**
 * useTariffSearch 훅 반환 타입
 */
export interface UseTariffSearchReturn {
  results: HsCodeWithTariff[]        // 검색 결과
  isLoading: boolean                 // 로딩 중 여부
  error: string | null               // 에러 메시지
  search: (query: string) => void    // 검색 함수
  fetchPopular: () => Promise<void>  // 인기 품목 가져오기
  clear: () => void                  // 결과 초기화
}

/**
 * useTariffRate 훅 반환 타입
 */
export interface UseTariffRateReturn {
  rate: TariffRate | null            // 관세율 정보
  isLoading: boolean
  error: string | null
  fetchRate: (hsCode: string) => void
}
