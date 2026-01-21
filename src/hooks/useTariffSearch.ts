/**
 * HS Code 검색 커스텀 훅
 *
 * 📌 이 훅의 역할
 * HS Code나 품목명으로 관세 정보를 검색하는 기능을 제공합니다.
 *
 * 비유: 네이버 검색창처럼, 검색어를 입력하면
 * 관련된 품목 목록을 자동으로 보여주는 기능입니다.
 *
 * 📌 사용 방법:
 * ```tsx
 * function MyComponent() {
 *   const { results, isLoading, search, clear } = useTariffSearch()
 *
 *   return (
 *     <input
 *       onChange={(e) => search(e.target.value)}
 *       placeholder="품목명 또는 HS Code 입력"
 *     />
 *   )
 * }
 * ```
 */

"use client"

import { useState, useCallback, useRef } from "react"
import type {
  HsCodeWithTariff,
  TariffSearchResponse,
  UseTariffSearchReturn,
} from "@/types/tariff"

// 디바운스 시간 (밀리초)
// 📌 사용자가 타이핑을 멈춘 후 이 시간이 지나야 검색 실행
const DEBOUNCE_DELAY = 300

export function useTariffSearch(): UseTariffSearchReturn {
  // ==================== 상태 정의 ====================

  // 검색 결과 목록
  const [results, setResults] = useState<HsCodeWithTariff[]>([])

  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false)

  // 에러 메시지
  const [error, setError] = useState<string | null>(null)

  // 디바운스 타이머 참조
  // 📌 useRef란? 값을 저장하되, 변경해도 리렌더링하지 않는 저장소입니다.
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // ==================== 검색 함수 ====================

  /**
   * 실제 API 호출 함수 (내부용)
   */
  const fetchResults = useCallback(async (query: string) => {
    // 검색어가 2글자 미만이면 결과 초기화
    if (query.length < 2) {
      setResults([])
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // API 호출
      const response = await fetch(
        `/api/tariff/search?q=${encodeURIComponent(query)}`
      )
      const data: TariffSearchResponse = await response.json()

      if (data.success && data.data) {
        setResults(data.data)
      } else {
        setError(data.error?.message || "검색 중 오류가 발생했습니다.")
        setResults([])
      }
    } catch (err) {
      console.error("관세 검색 실패:", err)
      setError("네트워크 오류가 발생했습니다.")
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * 검색 함수 (디바운스 적용)
   *
   * 📌 디바운스란?
   * 사용자가 연속으로 타이핑할 때 매번 검색하면 서버에 부담이 됩니다.
   * 타이핑을 멈춘 후 잠시 기다렸다가 한 번만 검색합니다.
   *
   * 비유: 엘리베이터 문이 바로 닫히지 않고,
   * 사람이 다 타면 잠시 후에 닫히는 것과 같아요!
   */
  const search = useCallback(
    (query: string) => {
      // 이전 타이머가 있으면 취소
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      // 새 타이머 설정
      timerRef.current = setTimeout(() => {
        fetchResults(query)
      }, DEBOUNCE_DELAY)
    },
    [fetchResults]
  )

  /**
   * 인기 품목 가져오기
   *
   * 📌 언제 사용하나요?
   * 검색창을 클릭했을 때 (아직 아무것도 입력 안 한 상태),
   * 사용자에게 미리 품목 목록을 보여줄 때 사용합니다.
   *
   * 비유: 유튜브 검색창을 클릭하면 "추천 검색어"가 뜨는 것처럼,
   * 검색 전에 미리 인기 품목을 보여줍니다.
   */
  const fetchPopular = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // popular=true 파라미터로 인기 품목 요청
      const response = await fetch("/api/tariff/search?popular=true")
      const data: TariffSearchResponse = await response.json()

      if (data.success && data.data) {
        setResults(data.data)
      } else {
        setError(data.error?.message || "품목을 불러오는 중 오류가 발생했습니다.")
        setResults([])
      }
    } catch (err) {
      console.error("인기 품목 로드 실패:", err)
      setError("네트워크 오류가 발생했습니다.")
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * 검색 결과 초기화
   */
  const clear = useCallback(() => {
    // 타이머 취소
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    // 상태 초기화
    setResults([])
    setError(null)
    setIsLoading(false)
  }, [])

  // ==================== 반환값 ====================

  return {
    results, // 검색 결과 목록
    isLoading, // 로딩 중 여부
    error, // 에러 메시지
    search, // 검색 함수
    fetchPopular, // 인기 품목 가져오기 함수
    clear, // 결과 초기화 함수
  }
}
