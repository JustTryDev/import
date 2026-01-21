"use client"

import { useState } from "react"
import { Package } from "lucide-react"
import { PackagingCalculatorModal } from "./PackagingCalculatorModal"

/**
 * 패키징 계산기 플로팅 배너
 *
 * 중앙 하단에 고정되어 표시되며, 클릭 시 패키징 계산기 모달을 엽니다.
 */
export function RtonCalculatorBanner() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      {/* 플로팅 배너 */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-2.5 bg-gray-900 text-white text-base font-medium rounded-full shadow-lg hover:bg-gray-800 transition-colors"
      >
        <Package className="h-5 w-5" />
        <span>패키징 계산</span>
      </button>

      {/* 패키징 계산기 모달 */}
      <PackagingCalculatorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
