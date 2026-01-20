"use client"

import { useRef, useState, useEffect } from "react"

/**
 * 스크롤 애니메이션 훅
 *
 * 📌 이 훅의 역할:
 * 요소가 화면에 보이면 isVisible을 true로 변경합니다.
 * 이 값을 사용해서 CSS 애니메이션이나 Framer Motion을 트리거할 수 있습니다.
 *
 * 📌 일상생활 비유:
 * 무대 위 조명이 켜지면 배우가 연기를 시작하는 것처럼,
 * 요소가 "화면에 보이는 순간"에 애니메이션을 시작합니다.
 *
 * 📌 사용 예시:
 * function AnimatedCard() {
 *   const { ref, isVisible } = useScrollAnimation()
 *
 *   return (
 *     <div
 *       ref={ref}
 *       className={`transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
 *     >
 *       스크롤하면 나타남!
 *     </div>
 *   )
 * }
 *
 * @param threshold - 요소가 얼마나 보여야 트리거할지 (0~1, 기본값: 0.1 = 10%)
 * @returns { ref: 요소에 연결할 ref, isVisible: 화면에 보이는지 여부 }
 */
export function useScrollAnimation(threshold: number = 0.1) {
  const ref = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // 요소가 화면에 보이면 isVisible을 true로 (한 번만)
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -50px 0px", // 하단 50px 여유
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  return { ref, isVisible }
}
