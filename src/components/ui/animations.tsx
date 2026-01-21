"use client"

/**
 * 공통 애니메이션 컴포넌트
 *
 * 토스 스타일의 부드럽고 미묘한 애니메이션 효과를 제공합니다.
 * - FadeIn: 페이드인 효과
 * - SlideUp: 아래에서 위로 슬라이드
 * - AnimatedCard: 카드 컨테이너용 애니메이션
 * - StaggerContainer: 자식 요소들을 순차적으로 애니메이션
 */

import { motion, AnimatePresence, HTMLMotionProps, Variants } from "framer-motion"
import { ReactNode, forwardRef } from "react"

// ===== 기본 애니메이션 설정 (토스 스타일) =====
// 부드러운 이징 커브
const EASE_SMOOTH = [0.25, 0.1, 0.25, 1]
const EASE_OUT = [0, 0, 0.2, 1]

// 기본 지속 시간 (초)
const DURATION = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
}

// ===== FadeIn 컴포넌트 =====
interface FadeInProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode
  delay?: number
  duration?: number
}

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  ({ children, delay = 0, duration = DURATION.normal, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration,
          delay,
          ease: EASE_SMOOTH,
        }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
FadeIn.displayName = "FadeIn"

// ===== SlideUp 컴포넌트 =====
interface SlideUpProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode
  delay?: number
  duration?: number
  distance?: number // 이동 거리 (px)
}

export const SlideUp = forwardRef<HTMLDivElement, SlideUpProps>(
  ({ children, delay = 0, duration = DURATION.normal, distance = 16, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: distance }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: distance }}
        transition={{
          duration,
          delay,
          ease: EASE_OUT,
        }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
SlideUp.displayName = "SlideUp"

// ===== SlideDown 컴포넌트 (접기/펼치기용) =====
interface SlideDownProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode
  isOpen: boolean
}

export const SlideDown = forwardRef<HTMLDivElement, SlideDownProps>(
  ({ children, isOpen, ...props }, ref) => {
    return (
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            ref={ref}
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: {
                height: { duration: DURATION.normal, ease: EASE_OUT },
                opacity: { duration: DURATION.fast, delay: 0.05 },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: DURATION.normal, ease: EASE_OUT },
                opacity: { duration: DURATION.fast },
              },
            }}
            style={{ overflow: "hidden" }}
            {...props}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    )
  }
)
SlideDown.displayName = "SlideDown"

// ===== AnimatedCard 컴포넌트 =====
interface AnimatedCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode
  delay?: number
  hover?: boolean // 호버 효과 활성화
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, delay = 0, hover = true, className = "", ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{
          duration: DURATION.normal,
          delay,
          ease: EASE_OUT,
        }}
        whileHover={hover ? { y: -2, transition: { duration: DURATION.fast } } : undefined}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
AnimatedCard.displayName = "AnimatedCard"

// ===== StaggerContainer 컴포넌트 =====
interface StaggerContainerProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode
  staggerDelay?: number // 각 자식 요소 사이의 딜레이
}

// 자식 요소 애니메이션 variants
const staggerChildVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASE_OUT,
    },
  },
}

export const StaggerContainer = forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ children, staggerDelay = 0.08, className = "", ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: staggerDelay,
            },
          },
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
StaggerContainer.displayName = "StaggerContainer"

// StaggerItem: StaggerContainer의 자식으로 사용
interface StaggerItemProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode
}

export const StaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={staggerChildVariants}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
StaggerItem.displayName = "StaggerItem"

// ===== ScaleIn 컴포넌트 (모달, 팝업용) =====
interface ScaleInProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode
}

export const ScaleIn = forwardRef<HTMLDivElement, ScaleInProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{
          duration: DURATION.normal,
          ease: EASE_OUT,
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
ScaleIn.displayName = "ScaleIn"

// ===== AnimatedNumber 컴포넌트 (숫자 카운팅 애니메이션) =====
interface AnimatedNumberProps {
  value: number
  format?: (n: number) => string
  className?: string
  duration?: number
}

export function AnimatedNumber({
  value,
  format = (n) => n.toLocaleString(),
  className = "",
  duration = 0.5,
}: AnimatedNumberProps) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
      transition={{ duration: DURATION.fast, ease: EASE_OUT }}
    >
      {format(value)}
    </motion.span>
  )
}

// ===== 버튼 애니메이션 variants =====
export const buttonVariants = {
  tap: { scale: 0.98 },
  hover: { scale: 1.02 },
}

// ===== 애니메이션 유틸리티 =====
export const animationConfig = {
  duration: DURATION,
  ease: {
    smooth: EASE_SMOOTH,
    out: EASE_OUT,
  },
}
