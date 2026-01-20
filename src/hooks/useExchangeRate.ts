/**
 * 환율 조회 커스텀 훅
 *
 * 📌 커스텀 훅이란?
 * React에서 자주 사용하는 로직을 재사용 가능한 함수로 만든 것입니다.
 *
 * 비유: 요리할 때 "다진 마늘"을 매번 직접 다지면 힘들죠?
 * 슈퍼에서 파는 "다진 마늘"처럼 미리 만들어둔 것입니다.
 * 필요할 때마다 가져다 쓰면 됩니다!
 *
 * 📌 사용 방법:
 * ```tsx
 * function MyComponent() {
 *   const { rates, isLoading, error, refetch } = useExchangeRate()
 *
 *   if (isLoading) return <div>로딩 중...</div>
 *   if (error) return <div>에러: {error}</div>
 *
 *   return <div>USD 환율: {rates?.USD.baseRate}원</div>
 * }
 * ```
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import type {
  ExchangeRates,
  ExchangeRateResponse,
  UseExchangeRateReturn,
} from "@/types/exchange"

export function useExchangeRate(): UseExchangeRateReturn {
  // ==================== 상태 정의 ====================
  // 📌 useState란? 컴포넌트가 "기억"해야 하는 데이터를 저장하는 공간입니다.

  // 환율 데이터 (처음에는 null, 데이터를 받아오면 채워짐)
  const [rates, setRates] = useState<ExchangeRates | null>(null)

  // 로딩 상태 (true: 로딩 중, false: 완료)
  const [isLoading, setIsLoading] = useState(true)

  // 에러 메시지 (없으면 null)
  const [error, setError] = useState<string | null>(null)

  // ==================== API 호출 함수 ====================

  /**
   * 환율 데이터를 가져오는 함수
   *
   * 📌 useCallback이란?
   * 함수를 "기억"해두는 기능입니다.
   * 컴포넌트가 다시 렌더링될 때마다 함수를 새로 만들지 않고,
   * 이전에 만든 함수를 재사용합니다.
   *
   * 비유: 매번 새 연필을 사는 대신, 기존 연필을 계속 쓰는 것처럼요!
   */
  const fetchRates = useCallback(async () => {
    // 로딩 시작, 이전 에러 초기화
    setIsLoading(true)
    setError(null)

    try {
      // 우리가 만든 API Route 호출
      const response = await fetch("/api/exchange-rate")
      const data: ExchangeRateResponse = await response.json()

      // 응답 확인
      if (data.success && data.data) {
        // 성공! 환율 데이터 저장
        setRates(data.data)
      } else {
        // 실패 - 에러 메시지 저장
        setError(data.error?.message || "환율 정보를 불러올 수 없습니다.")
      }
    } catch (err) {
      // 네트워크 오류 등 예외 처리
      console.error("환율 조회 실패:", err)
      setError("네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.")
    } finally {
      // 성공/실패와 관계없이 로딩 종료
      setIsLoading(false)
    }
  }, [])

  // ==================== 초기 데이터 로딩 ====================

  /**
   * 📌 useEffect란?
   * 컴포넌트가 화면에 나타날 때 실행할 코드를 지정합니다.
   *
   * 비유: 가게 문을 열 때(컴포넌트 마운트) 자동으로 불을 켜는 것처럼,
   * 컴포넌트가 나타날 때 자동으로 환율을 불러옵니다.
   */
  useEffect(() => {
    fetchRates()
  }, [fetchRates])

  // ==================== 반환값 ====================
  // 📌 훅을 사용하는 컴포넌트에서 이 값들을 받아서 사용합니다.

  return {
    rates, // 환율 데이터
    isLoading, // 로딩 중 여부
    error, // 에러 메시지
    refetch: fetchRates, // 새로고침 함수
  }
}
