/**
 * 환율 조회 커스텀 훅
 *
 * 📌 커스텀 훅이란?
 * React에서 자주 사용하는 로직을 재사용 가능한 함수로 만든 것입니다.
 *
 * 📌 사용 방법:
 * ```tsx
 * function MyComponent() {
 *   const { rates, history, isLoading, error, refetch } = useExchangeRate()
 *
 *   if (isLoading) return <div>로딩 중...</div>
 *   if (error) return <div>에러: {error}</div>
 *
 *   return (
 *     <div>
 *       <p>USD 환율: {rates?.USD.baseRate}원</p>
 *       <p>최근 5일 히스토리: {history.length}개</p>
 *     </div>
 *   )
 * }
 * ```
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import type {
  ExchangeRates,
  ExchangeRateResponse,
  UseExchangeRateReturn,
  DailyRate,
} from "@/types/exchange"

export function useExchangeRate(): UseExchangeRateReturn {
  // 환율 데이터
  const [rates, setRates] = useState<ExchangeRates | null>(null)

  // 최근 5일 히스토리
  const [history, setHistory] = useState<DailyRate[]>([])

  // 로딩 상태
  const [isLoading, setIsLoading] = useState(true)

  // 에러 메시지
  const [error, setError] = useState<string | null>(null)

  /**
   * 환율 데이터를 가져오는 함수
   */
  const fetchRates = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/exchange-rate")
      const data: ExchangeRateResponse = await response.json()

      if (data.success && data.data) {
        // 환율 데이터 저장
        setRates({
          USD: data.data.USD,
          CNY: data.data.CNY,
        })

        // 히스토리 저장
        setHistory(data.data.history || [])
      } else {
        setError(data.error?.message || "환율 정보를 불러올 수 없습니다.")
      }
    } catch (err) {
      console.error("환율 조회 실패:", err)
      setError("네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 컴포넌트 마운트 시 자동 실행
  useEffect(() => {
    fetchRates()
  }, [fetchRates])

  return {
    rates,
    history,
    isLoading,
    error,
    refetch: fetchRates,
  }
}
