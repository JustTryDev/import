/**
 * 디바운스 훅 (Debounce Hook)
 *
 * 📌 디바운스란?
 * "빠르게 연속으로 발생하는 이벤트 중 마지막 것만 실행하기"
 *
 * 📌 일상생활 비유:
 * 엘리베이터를 생각해보세요. 문이 닫히려 할 때 누군가 버튼을 누르면
 * 문 닫힘 타이머가 리셋됩니다. 아무도 버튼을 안 누르고 3초가 지나야
 * 비로소 문이 닫히죠. 이게 디바운스입니다!
 *
 * 📌 사용 예시:
 * - 검색창: 글자 입력할 때마다 검색하면 서버에 부담 → 타이핑 멈추면 검색
 * - 창 크기 변경: 드래그하는 동안 계속 실행하지 않고, 멈추면 한 번만 실행
 *
 * @example
 * function SearchInput() {
 *   const [searchText, setSearchText] = useState("")
 *   const debouncedSearch = useDebounce(searchText, 300) // 300ms 대기
 *
 *   // debouncedSearch가 변경될 때만 API 호출
 *   useEffect(() => {
 *     if (debouncedSearch) {
 *       fetchSearchResults(debouncedSearch)
 *     }
 *   }, [debouncedSearch])
 *
 *   return <input value={searchText} onChange={(e) => setSearchText(e.target.value)} />
 * }
 */

"use client"

import { useState, useEffect } from "react"

/**
 * 값의 변경을 지연시키는 훅
 *
 * @param value - 디바운스할 값 (어떤 타입이든 가능)
 * @param delay - 대기 시간 (밀리초, 기본값: 300ms)
 * @returns 지연된 값
 *
 * @example
 * const debouncedValue = useDebounce(inputValue, 500) // 500ms 대기
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  // 📌 지연된 값을 저장하는 상태
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // 📌 타이머 설정: delay 시간 후에 값 업데이트
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // 📌 정리(cleanup) 함수: 값이 바뀌면 이전 타이머 취소
    // 이렇게 해야 "마지막 값"만 적용됩니다.
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay]) // value나 delay가 바뀔 때마다 실행

  return debouncedValue
}

/**
 * 콜백 함수를 디바운스하는 훅
 *
 * 📌 언제 사용하나요?
 * useDebounce는 "값"을 지연시키고,
 * useDebouncedCallback은 "함수 실행"을 지연시킵니다.
 *
 * @example
 * function SearchInput() {
 *   const handleSearch = useDebouncedCallback((query: string) => {
 *     console.log("검색:", query)
 *     // API 호출
 *   }, 300)
 *
 *   return <input onChange={(e) => handleSearch(e.target.value)} />
 * }
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  // 📌 컴포넌트가 언마운트되면 타이머 정리
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [timeoutId])

  // 📌 디바운스된 함수 반환
  return (...args: Parameters<T>) => {
    // 이전 타이머가 있으면 취소
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    // 새 타이머 설정
    const newTimeoutId = setTimeout(() => {
      callback(...args)
    }, delay)

    setTimeoutId(newTimeoutId)
  }
}

// 📌 기본 export
export default useDebounce
