/**
 * 한국 시간(KST, UTC+9) 유틸리티 함수
 *
 * 📌 왜 필요한가요?
 * 브라우저와 서버 모두에서 일관된 한국 시간을 사용하기 위한 헬퍼 함수들입니다.
 * 사용자의 브라우저 시간대와 상관없이 항상 한국 시간을 보여줄 수 있어요.
 *
 * 📌 일상생활 비유:
 * 해외에 있는 친구와 "한국 시간 기준으로 만나자"라고 약속하는 것처럼,
 * 어디서 접속하든 한국 시간을 기준으로 표시합니다.
 */

// ==================== 기본 KST 변환 ====================

/**
 * 현재 시간을 KST Date 객체로 반환
 * 브라우저 로컬 시간과 무관하게 항상 한국 시간을 반환합니다.
 *
 * @example
 * const now = getNowKST()
 * console.log(now.getUTCHours()) // 한국 시간의 시(hour)
 */
export function getNowKST(): Date {
  const now = new Date()
  // UTC 시간에 9시간(한국 시간대)을 더함
  return new Date(now.getTime() + 9 * 60 * 60 * 1000)
}

/**
 * 오늘 날짜를 KST 기준 "YYYY-MM-DD" 문자열로 반환
 * 날짜 선택 폼의 최소 날짜 설정, 캘린더 오늘 표시 등에 사용됩니다.
 *
 * @example
 * const today = getTodayKST()
 * console.log(today) // "2025-01-20"
 */
export function getTodayKST(): string {
  const kst = getNowKST()
  const year = kst.getUTCFullYear()
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0")
  const day = String(kst.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Date 객체 또는 타임스탬프를 KST 기준 "YYYY-MM-DD" 문자열로 변환
 *
 * @param date - Date 객체 또는 밀리초 타임스탬프
 * @example
 * const dateStr = toKSTDateString(Date.now())
 * console.log(dateStr) // "2025-01-20"
 */
export function toKSTDateString(date: Date | number): string {
  const d = typeof date === "number" ? new Date(date) : date
  // KST로 변환
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  const year = kst.getUTCFullYear()
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0")
  const day = String(kst.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// ==================== 포맷팅 함수 ====================

/**
 * 타임스탬프를 한국어 날짜 포맷으로 변환
 *
 * @param timestamp - 밀리초 타임스탬프
 * @returns "2025년 1월 20일" 형식의 문자열
 * @example
 * const formatted = formatKoreanDate(Date.now())
 * console.log(formatted) // "2025년 1월 20일"
 */
export function formatKoreanDate(timestamp: number): string {
  const kst = new Date(timestamp + 9 * 60 * 60 * 1000)
  const year = kst.getUTCFullYear()
  const month = kst.getUTCMonth() + 1
  const day = kst.getUTCDate()
  return `${year}년 ${month}월 ${day}일`
}

/**
 * 타임스탬프를 간단한 날짜+시간 포맷으로 변환
 *
 * @param timestamp - 밀리초 타임스탬프
 * @returns "1/20 14:30" 형식의 문자열
 * @example
 * const formatted = formatKoreanDateTime(Date.now())
 * console.log(formatted) // "1/20 14:30"
 */
export function formatKoreanDateTime(timestamp: number): string {
  const kst = new Date(timestamp + 9 * 60 * 60 * 1000)
  const month = kst.getUTCMonth() + 1
  const day = kst.getUTCDate()
  const hours = String(kst.getUTCHours()).padStart(2, "0")
  const minutes = String(kst.getUTCMinutes()).padStart(2, "0")
  return `${month}/${day} ${hours}:${minutes}`
}

/**
 * 오늘 날짜를 "YYYY.MM.DD" 형식으로 반환
 *
 * @example
 * const today = getTodayKSTDot()
 * console.log(today) // "2025.01.20"
 */
export function getTodayKSTDot(): string {
  const kst = getNowKST()
  const year = kst.getUTCFullYear()
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0")
  const day = String(kst.getUTCDate()).padStart(2, "0")
  return `${year}.${month}.${day}`
}

/**
 * 오늘 날짜를 "YYYYMMDD" 형식으로 반환 (파일명용)
 *
 * @example
 * const today = getTodayKSTCompact()
 * console.log(today) // "20250120"
 */
export function getTodayKSTCompact(): string {
  return getTodayKST().replace(/-/g, "")
}

/**
 * KST 기준으로 날짜를 한국어 로케일로 포맷팅
 * toLocaleDateString의 KST 버전입니다.
 *
 * @param options - Intl.DateTimeFormatOptions
 * @returns 포맷팅된 문자열
 * @example
 * const formatted = formatTodayKSTLocale({ month: "long", day: "numeric", weekday: "short" })
 * console.log(formatted) // "1월 20일 (월)"
 */
export function formatTodayKSTLocale(options: Intl.DateTimeFormatOptions): string {
  const kst = getNowKST()
  // Intl.DateTimeFormat에 UTC timezone을 사용하여 KST 값을 그대로 표시
  return new Intl.DateTimeFormat("ko-KR", { ...options, timeZone: "UTC" }).format(kst)
}

// ==================== 날짜 계산 헬퍼 ====================

/**
 * KST 기준으로 향후 N일간의 날짜 목록을 생성
 * 예약 날짜 선택에 사용됩니다.
 *
 * @param days - 생성할 날짜 수 (오늘 제외)
 * @returns { dateStr: "YYYY-MM-DD", label: "1/21 (화)" } 형태의 배열
 * @example
 * const nextDays = getNextDaysKST(7)
 * // [{ dateStr: "2025-01-21", label: "1/21 (화)" }, ...]
 */
export function getNextDaysKST(days: number): { dateStr: string; label: string }[] {
  const result: { dateStr: string; label: string }[] = []
  const today = getNowKST()
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"]

  for (let i = 1; i <= days; i++) {
    // 오늘 기준으로 i일 후 날짜 계산
    const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000)

    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, "0")
    const day = String(date.getUTCDate()).padStart(2, "0")
    const dateStr = `${year}-${month}-${day}`

    const label = `${date.getUTCMonth() + 1}/${date.getUTCDate()} (${dayNames[date.getUTCDay()]})`

    result.push({ dateStr, label })
  }

  return result
}

/**
 * KST 기준 현재 연도와 월을 반환
 *
 * @returns { year: number, month: number } (month는 1-12)
 * @example
 * const { year, month } = getCurrentYearMonthKST()
 * console.log(year, month) // 2025, 1
 */
export function getCurrentYearMonthKST(): { year: number; month: number } {
  const kst = getNowKST()
  return {
    year: kst.getUTCFullYear(),
    month: kst.getUTCMonth() + 1, // 1-12
  }
}
