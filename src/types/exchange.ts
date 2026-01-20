/**
 * 환율 관련 타입 정의
 *
 * 📌 타입이란?
 * 데이터의 "형태"를 미리 정해두는 것입니다.
 *
 * 비유: 레고 블록처럼, 특정 모양의 데이터만 특정 위치에 끼워집니다.
 * 잘못된 데이터가 들어오면 에러가 나서 버그를 미리 방지할 수 있어요.
 */

// ==========================================
// 기본 타입
// ==========================================

/**
 * 지원하는 통화 코드
 * - USD: 미국 달러
 * - CNY: 중국 위안
 */
export type CurrencyCode = "USD" | "CNY"

/**
 * 단일 통화의 환율 정보
 */
export interface ExchangeRate {
  currencyCode: CurrencyCode // 통화 코드 (USD, CNY)
  currencyName: string // 통화명 (미국 달러, 중국 위안)
  baseRate: number // 매매기준율 (1 외화 = ? 원)
  updatedAt: string // 업데이트 날짜 (YYYY-MM-DD)
}

/**
 * 모든 환율 정보를 담는 객체
 */
export interface ExchangeRates {
  USD: ExchangeRate
  CNY: ExchangeRate
}

// ==========================================
// API 응답 타입
// ==========================================

/**
 * 우리 API Route의 응답 타입
 *
 * 📌 success 패턴이란?
 * API 응답이 성공/실패를 명확하게 구분하는 방식입니다.
 * success가 true면 data가 있고, false면 error가 있어요.
 */
export interface ExchangeRateResponse {
  success: boolean
  data?: ExchangeRates
  error?: {
    code: string // 에러 코드 (개발자용)
    message: string // 에러 메시지 (사용자용)
  }
  timestamp: number // 응답 시간 (밀리초)
}

/**
 * 한국수출입은행 API 원본 응답 타입
 *
 * 📌 왜 별도 타입이 필요한가요?
 * 외부 API 응답 형식과 우리가 사용할 형식이 다를 수 있어서,
 * 원본 데이터 → 가공된 데이터로 변환하는 과정이 필요합니다.
 */
export interface KoreaEximApiResponse {
  result: number // 결과 코드 (1: 성공, 2: 데이터 없음, 3: 인증 실패, 4: 일일 제한 초과)
  cur_unit: string // 통화 코드 (USD, CNY 등)
  cur_nm: string // 국가/통화명
  ttb: string // 전신환 매입률 (외화를 팔 때)
  tts: string // 전신환 매도율 (외화를 살 때)
  deal_bas_r: string // 매매기준율 (우리가 사용할 환율)
  bkpr: string // 장부가격
  yy_efee_r: string // 연환가료율
  ten_dd_efee_r: string // 10일환가료율
  kftc_bkpr: string // 서울외국환중개 장부가격
  kftc_deal_bas_r: string // 서울외국환중개 매매기준율
}

// ==========================================
// 컴포넌트 Props 타입
// ==========================================

/**
 * 환율 계산기 컴포넌트의 Props
 */
export interface ExchangeCalculatorProps {
  className?: string // 추가 CSS 클래스
}

// ==========================================
// 커스텀 훅 반환 타입
// ==========================================

/**
 * useExchangeRate 훅의 반환 타입
 */
export interface UseExchangeRateReturn {
  rates: ExchangeRates | null // 환율 데이터 (로딩 중이면 null)
  isLoading: boolean // 로딩 중 여부
  error: string | null // 에러 메시지 (없으면 null)
  refetch: () => Promise<void> // 데이터 새로고침 함수
}
