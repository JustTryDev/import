/**
 * 포맷팅 유틸리티 함수
 *
 * 📌 이 파일의 목적:
 * 프로젝트 전체에서 자주 사용되는 포맷팅 함수들을 한 곳에 모아두어
 * 코드 중복을 방지하고 일관된 포맷팅을 제공합니다.
 *
 * 📌 포함된 함수:
 * - formatTimeAgo: "3분 전", "어제" 같은 상대 시간
 * - formatFileSize: "2.5 MB" 같은 파일 크기
 * - formatPhoneNumber: "010-1234-5678" 같은 전화번호
 * - formatPrice: "1,234,000원" 같은 금액
 *
 * 📌 사용 예시:
 * import { formatTimeAgo, formatFileSize } from "@/lib/format"
 *
 * const timeText = formatTimeAgo(message.createdAt) // "3분 전"
 * const sizeText = formatFileSize(file.size)        // "2.5 MB"
 */

import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"

// ==================== 시간 포맷팅 ====================

/**
 * 타임스탬프를 상대 시간 문자열로 변환
 *
 * @param timestamp - 밀리초 타임스탬프 또는 Date 객체
 * @returns "방금 전", "3분 전", "2시간 전", "어제", "3일 전" 등
 *
 * @example
 * formatTimeAgo(Date.now() - 1000 * 60 * 3) // "3분 전"
 * formatTimeAgo(new Date("2025-01-18"))     // "2일 전"
 *
 * 📌 일상생활 비유:
 * 카카오톡에서 메시지 옆에 "3분 전"이라고 표시되는 것처럼,
 * 정확한 시간 대신 "얼마나 지났는지"를 보여줍니다.
 */
export function formatTimeAgo(timestamp: number | Date): string {
  const date = typeof timestamp === "number" ? new Date(timestamp) : timestamp

  return formatDistanceToNow(date, {
    addSuffix: true, // "전" 또는 "후" 접미사 추가
    locale: ko, // 한국어로 표시
  })
}

// ==================== 파일 크기 포맷팅 ====================

/**
 * 바이트 수를 사람이 읽기 쉬운 단위로 변환
 *
 * @param bytes - 바이트 수
 * @returns "500 B", "1.2 KB", "3.5 MB", "2.1 GB" 등
 *
 * @example
 * formatFileSize(500)         // "500 B"
 * formatFileSize(1536)        // "1.5 KB"
 * formatFileSize(2621440)     // "2.5 MB"
 *
 * 📌 일상생활 비유:
 * 파일 크기가 "2621440 바이트"라고 하면 어려운데,
 * "2.5 MB"라고 하면 바로 이해되죠? 이 함수가 그 변환을 해줍니다.
 */
export function formatFileSize(bytes: number | undefined): string {
  // 값이 없으면 빈 문자열 반환
  if (!bytes || bytes === 0) return ""

  // 📌 단위 기준
  // B (바이트) → KB (킬로바이트, 1024 B) → MB (메가바이트, 1024 KB) → GB (기가바이트, 1024 MB)
  const KB = 1024
  const MB = KB * 1024
  const GB = MB * 1024

  // 📌 크기에 따라 적절한 단위 선택
  if (bytes < KB) {
    return `${bytes} B`
  }
  if (bytes < MB) {
    return `${(bytes / KB).toFixed(1)} KB`
  }
  if (bytes < GB) {
    return `${(bytes / MB).toFixed(1)} MB`
  }
  return `${(bytes / GB).toFixed(1)} GB`
}

// ==================== 전화번호 포맷팅 ====================

/**
 * 전화번호에 하이픈(-) 추가
 *
 * @param phone - 숫자만 있는 전화번호 (예: "01012345678")
 * @returns 하이픈이 포함된 전화번호 (예: "010-1234-5678")
 *
 * @example
 * formatPhoneNumber("01012345678")  // "010-1234-5678"
 * formatPhoneNumber("0212345678")   // "02-1234-5678"
 * formatPhoneNumber("0311234567")   // "031-123-4567"
 *
 * 📌 일상생활 비유:
 * "01012345678"보다 "010-1234-5678"이 읽기 쉽죠?
 * 이 함수는 전화번호를 보기 좋게 정리해줍니다.
 */
export function formatPhoneNumber(phone: string): string {
  // 숫자만 추출 (하이픈, 공백 등 제거)
  const cleaned = phone.replace(/\D/g, "")

  // 📌 휴대폰 번호 (010, 011, 016, 017, 018, 019)
  if (cleaned.startsWith("01")) {
    // 010-1234-5678 형식
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3")
  }

  // 📌 서울 지역번호 (02)
  if (cleaned.startsWith("02")) {
    if (cleaned.length === 9) {
      // 02-123-4567 형식
      return cleaned.replace(/(\d{2})(\d{3})(\d{4})/, "$1-$2-$3")
    }
    // 02-1234-5678 형식
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "$1-$2-$3")
  }

  // 📌 기타 지역번호 (031, 032, ...)
  if (cleaned.length === 10) {
    // 031-123-4567 형식
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")
  }

  // 031-1234-5678 형식
  return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3")
}

// ==================== 금액 포맷팅 ====================

/**
 * 숫자를 한국 원화 형식으로 변환
 *
 * @param amount - 금액 (숫자)
 * @param options - 옵션
 * @param options.showUnit - "원" 단위 표시 여부 (기본: true)
 * @returns "1,234,000원" 또는 "1,234,000" 형식
 *
 * @example
 * formatPrice(1234000)                    // "1,234,000원"
 * formatPrice(1234000, { showUnit: false }) // "1,234,000"
 *
 * 📌 일상생활 비유:
 * "1234000"보다 "1,234,000원"이 훨씬 읽기 쉽죠?
 * 천 단위마다 콤마를 찍어줍니다.
 */
export function formatPrice(amount: number, options: { showUnit?: boolean } = {}): string {
  const { showUnit = true } = options

  // 📌 천 단위 콤마 추가
  const formatted = amount.toLocaleString("ko-KR")

  return showUnit ? `${formatted}원` : formatted
}

// ==================== 날짜 포맷팅 (추가) ====================

/**
 * Date 객체 또는 타임스탬프를 "YYYY.MM.DD" 형식으로 변환
 *
 * @param date - Date 객체 또는 밀리초 타임스탬프
 * @returns "2025.01.20" 형식의 문자열
 *
 * @example
 * formatDateDot(new Date())     // "2025.01.20"
 * formatDateDot(1705708800000)  // "2025.01.20"
 */
export function formatDateDot(date: Date | number): string {
  const d = typeof date === "number" ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}.${month}.${day}`
}

/**
 * Date 객체 또는 타임스탬프를 "YYYY-MM-DD" 형식으로 변환
 *
 * @param date - Date 객체 또는 밀리초 타임스탬프
 * @returns "2025-01-20" 형식의 문자열
 *
 * @example
 * formatDateDash(new Date())     // "2025-01-20"
 * formatDateDash(1705708800000)  // "2025-01-20"
 */
export function formatDateDash(date: Date | number): string {
  const d = typeof date === "number" ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
