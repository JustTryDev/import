/**
 * 페이지네이션 훅 (Pagination Hook)
 *
 * 📌 페이지네이션이란?
 * 100개의 데이터를 한 번에 보여주면 스크롤이 너무 길어지고,
 * 로딩도 오래 걸립니다. 그래서 10개씩 나눠서 "1페이지, 2페이지..."처럼
 * 보여주는 것을 페이지네이션이라고 합니다.
 *
 * 📌 일상생활 비유:
 * 책의 목차를 생각해보세요. 500페이지짜리 책을 한 장에 다 넣을 수 없으니,
 * 페이지를 나눠서 "이전 페이지 / 다음 페이지"로 넘기는 것처럼요!
 *
 * 📌 이 훅의 역할:
 * - 현재 페이지 번호 관리
 * - 페이지당 항목 수 관리
 * - 전체 페이지 수 계산
 * - 이전/다음 페이지로 이동
 * - 현재 페이지에 표시할 데이터 추출
 *
 * @example
 * function UserList() {
 *   const users = useQuery(api.users.getAll) // 전체 100명
 *
 *   const {
 *     currentPage,
 *     totalPages,
 *     paginatedItems,
 *     goToPage,
 *     goToNextPage,
 *     goToPrevPage,
 *   } = usePagination(users ?? [], { itemsPerPage: 10 })
 *
 *   return (
 *     <>
 *       {paginatedItems.map(user => <UserCard key={user.id} user={user} />)}
 *       <button onClick={goToPrevPage}>이전</button>
 *       <span>{currentPage} / {totalPages}</span>
 *       <button onClick={goToNextPage}>다음</button>
 *     </>
 *   )
 * }
 */

"use client"

import { useState, useMemo, useCallback } from "react"

// 📌 훅 옵션 인터페이스
interface UsePaginationOptions {
  /** 페이지당 항목 수 (기본값: 10) */
  itemsPerPage?: number
  /** 초기 페이지 번호 (기본값: 1) */
  initialPage?: number
}

// 📌 훅 반환값 인터페이스
interface UsePaginationReturn<T> {
  /** 현재 페이지 번호 (1부터 시작) */
  currentPage: number
  /** 전체 페이지 수 */
  totalPages: number
  /** 전체 항목 수 */
  totalItems: number
  /** 페이지당 항목 수 */
  itemsPerPage: number
  /** 현재 페이지의 항목들 */
  paginatedItems: T[]
  /** 첫 페이지인지 여부 */
  isFirstPage: boolean
  /** 마지막 페이지인지 여부 */
  isLastPage: boolean
  /** 특정 페이지로 이동 */
  goToPage: (page: number) => void
  /** 다음 페이지로 이동 */
  goToNextPage: () => void
  /** 이전 페이지로 이동 */
  goToPrevPage: () => void
  /** 첫 페이지로 이동 */
  goToFirstPage: () => void
  /** 마지막 페이지로 이동 */
  goToLastPage: () => void
  /** 페이지당 항목 수 변경 */
  setItemsPerPage: (count: number) => void
  /** 현재 페이지의 시작 인덱스 (0부터) */
  startIndex: number
  /** 현재 페이지의 끝 인덱스 */
  endIndex: number
}

/**
 * 페이지네이션 상태를 관리하는 훅
 *
 * @param items - 전체 데이터 배열
 * @param options - 페이지네이션 옵션
 * @returns 페이지네이션 상태와 제어 함수들
 */
export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const { initialPage = 1, itemsPerPage: defaultItemsPerPage = 10 } = options

  // 📌 상태 관리
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [itemsPerPage, setItemsPerPageState] = useState(defaultItemsPerPage)

  // 📌 전체 페이지 수 계산
  // Math.ceil: 올림 (예: 23개 항목 / 10개씩 = 2.3 → 3페이지)
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(items.length / itemsPerPage))
  }, [items.length, itemsPerPage])

  // 📌 현재 페이지가 범위를 벗어나면 조정
  const validCurrentPage = useMemo(() => {
    if (currentPage > totalPages) return totalPages
    if (currentPage < 1) return 1
    return currentPage
  }, [currentPage, totalPages])

  // 📌 현재 페이지의 시작/끝 인덱스 계산
  const startIndex = useMemo(() => {
    return (validCurrentPage - 1) * itemsPerPage
  }, [validCurrentPage, itemsPerPage])

  const endIndex = useMemo(() => {
    return Math.min(startIndex + itemsPerPage, items.length)
  }, [startIndex, itemsPerPage, items.length])

  // 📌 현재 페이지에 표시할 항목들 추출
  // slice(시작, 끝): 배열에서 일부만 잘라냄
  const paginatedItems = useMemo(() => {
    return items.slice(startIndex, endIndex)
  }, [items, startIndex, endIndex])

  // 📌 페이지 이동 함수들
  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages))
      setCurrentPage(validPage)
    },
    [totalPages]
  )

  const goToNextPage = useCallback(() => {
    if (validCurrentPage < totalPages) {
      setCurrentPage(validCurrentPage + 1)
    }
  }, [validCurrentPage, totalPages])

  const goToPrevPage = useCallback(() => {
    if (validCurrentPage > 1) {
      setCurrentPage(validCurrentPage - 1)
    }
  }, [validCurrentPage])

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1)
  }, [])

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages)
  }, [totalPages])

  // 📌 페이지당 항목 수 변경
  const setItemsPerPage = useCallback((count: number) => {
    setItemsPerPageState(Math.max(1, count))
    setCurrentPage(1) // 페이지당 항목 수 바꾸면 1페이지로 이동
  }, [])

  return {
    currentPage: validCurrentPage,
    totalPages,
    totalItems: items.length,
    itemsPerPage,
    paginatedItems,
    isFirstPage: validCurrentPage === 1,
    isLastPage: validCurrentPage === totalPages,
    goToPage,
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
    goToLastPage,
    setItemsPerPage,
    startIndex,
    endIndex,
  }
}

// 📌 기본 export
export default usePagination
