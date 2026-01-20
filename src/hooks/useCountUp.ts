"use client"

import { useState, useEffect, useRef } from "react"

/**
 * 숫자 카운터 애니메이션 훅
 *
 * 📌 이 훅의 역할:
 * 요소가 화면에 보이면 숫자가 0에서 목표값까지 증가하는 애니메이션을 실행합니다.
 *
 * 📌 일상생활 비유:
 * 주행거리계가 0에서 1000까지 숫자가 올라가는 것처럼,
 * 통계 숫자가 서서히 증가하면서 사용자의 시선을 끕니다.
 *
 * 📌 사용 예시:
 * function Stats() {
 *   const { count, ref } = useCountUp(1000, 2000) // 2초 동안 0→1000
 *
 *   return (
 *     <div ref={ref}>
 *       <span>{count}</span>명의 사용자
 *     </div>
 *   )
 * }
 *
 * @param end - 목표 숫자 (최종값)
 * @param duration - 애니메이션 지속 시간 (밀리초, 기본값: 2000ms)
 * @param start - 시작 숫자 (기본값: 0)
 * @returns { count: 현재 카운트 값, ref: 요소에 연결할 ref }
 */
export function useCountUp(end: number, duration: number = 2000, start: number = 0) {
  const [count, setCount] = useState(start)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Intersection Observer로 요소가 화면에 보이는지 감지
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
        }
      },
      { threshold: 0.3 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [isVisible])

  // 카운트업 애니메이션
  useEffect(() => {
    if (!isVisible) return

    let startTime: number | null = null

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)

      // easeOutExpo 이징 함수 - 처음에 빠르고 끝에 느려짐
      const easeProgress = 1 - Math.pow(2, -10 * progress)
      setCount(Math.floor(easeProgress * (end - start) + start))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [isVisible, end, start, duration])

  return { count, ref }
}
