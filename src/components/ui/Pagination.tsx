"use client"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { cn } from "@/lib/utils"

// 페이지네이션 컴포넌트 Props
interface PaginationProps {
  currentPage: number           // 현재 페이지 (1부터 시작)
  totalItems: number            // 전체 항목 수
  itemsPerPage: number          // 페이지당 항목 수
  onPageChange: (page: number) => void  // 페이지 변경 핸들러
  className?: string            // 추가 스타일
}

// 📌 페이지네이션 공통 컴포넌트
// 토스 스타일의 심플한 페이지 번호 방식
export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  className,
}: PaginationProps) {
  // 전체 페이지 수 계산
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  // 데이터가 없거나 1페이지 이하면 표시 안함
  if (totalItems === 0 || totalPages <= 1) {
    return null
  }

  // 표시할 페이지 번호 범위 계산 (최대 5개)
  // 예: [1, 2, 3, 4, 5] 또는 [3, 4, 5, 6, 7]
  const getPageNumbers = (): number[] => {
    const maxVisible = 5  // 최대 표시 페이지 수
    const pages: number[] = []

    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    const endPage = Math.min(totalPages, startPage + maxVisible - 1)

    // 끝에서 시작으로 조정 (예: 마지막 페이지 근처일 때)
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  // 현재 표시 범위 계산 (예: "1-30 / 234")
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div className={cn(
      "flex flex-wrap items-center justify-between gap-4 py-4 px-2",
      className
    )}>
      {/* 📌 왼쪽: 현재 표시 범위 */}
      <div className="text-sm text-gray-500">
        <span className="font-medium text-gray-900">{startItem}-{endItem}</span>
        {" / "}
        <span>{totalItems.toLocaleString()}건</span>
      </div>

      {/* 📌 오른쪽: 페이지 네비게이션 */}
      <div className="flex items-center gap-1">
        {/* 맨 처음으로 */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={cn(
            "p-2 rounded-lg transition-colors",
            currentPage === 1
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-600 hover:bg-gray-100"
          )}
          aria-label="첫 페이지"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* 이전 페이지 */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            "p-2 rounded-lg transition-colors",
            currentPage === 1
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-600 hover:bg-gray-100"
          )}
          aria-label="이전 페이지"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* 페이지 번호들 */}
        <div className="flex items-center gap-1">
          {/* 첫 페이지가 1이 아니면 "..." 표시 */}
          {pageNumbers[0] > 1 && (
            <>
              <button
                onClick={() => onPageChange(1)}
                className="min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                1
              </button>
              {pageNumbers[0] > 2 && (
                <span className="px-1 text-gray-400">...</span>
              )}
            </>
          )}

          {/* 페이지 번호 버튼들 */}
          {pageNumbers.map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                "min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors",
                page === currentPage
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {page}
            </button>
          ))}

          {/* 마지막 페이지가 totalPages가 아니면 "..." 표시 */}
          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                <span className="px-1 text-gray-400">...</span>
              )}
              <button
                onClick={() => onPageChange(totalPages)}
                className="min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        {/* 다음 페이지 */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            "p-2 rounded-lg transition-colors",
            currentPage === totalPages
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-600 hover:bg-gray-100"
          )}
          aria-label="다음 페이지"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* 맨 마지막으로 */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={cn(
            "p-2 rounded-lg transition-colors",
            currentPage === totalPages
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-600 hover:bg-gray-100"
          )}
          aria-label="마지막 페이지"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
