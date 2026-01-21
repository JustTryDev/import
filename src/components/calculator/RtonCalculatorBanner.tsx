"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Package } from "lucide-react"
import { PackagingCalculatorModal } from "./PackagingCalculatorModal"

/**
 * 패키징 계산기 플로팅 배너
 *
 * 중앙 하단에 고정되어 표시되며, 클릭 시 패키징 계산기 모달을 엽니다.
 * 토스 스타일의 부드러운 애니메이션 적용
 */
export function RtonCalculatorBanner() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      {/* 플로팅 배너 (애니메이션 적용) */}
      <motion.button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-5 left-4 z-50 flex items-center gap-2.5 px-5 py-2.5 bg-gray-900 text-white text-base font-medium rounded-full shadow-lg hover:bg-gray-800 transition-colors"
        // 초기 로드: 아래에서 슬라이드 업
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          delay: 0.6,  // 페이지 로드 후 잠시 후 나타남
          ease: [0.25, 0.1, 0.25, 1],
        }}
        // 호버: 살짝 위로 올라가는 효과
        whileHover={{ y: -3, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Package className="h-5 w-5" />
        <span>패키징 계산</span>
      </motion.button>

      {/* 패키징 계산기 모달 */}
      <PackagingCalculatorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
