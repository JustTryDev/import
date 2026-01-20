/**
 * 상태 배지 컴포넌트 (Status Badge)
 *
 * 📌 이 컴포넌트의 목적:
 * "대기중", "진행중", "완료" 같은 상태를 색깔 있는 배지로 표시합니다.
 * 여러 페이지에서 동일한 스타일로 상태를 표시할 수 있어요.
 *
 * 📌 일상생활 비유:
 * 택배 추적할 때 보이는 "배송준비중", "배송중", "배송완료" 같은 태그를 생각하세요.
 * 각 상태마다 다른 색깔로 한눈에 구분되죠? 그게 이 컴포넌트입니다!
 *
 * 📌 사용 예시:
 * <StatusBadge status="pending" type="order" />
 * <StatusBadge label="VIP" variant="purple" />
 * <StatusBadge label="신규" variant="blue" size="lg" />
 */

"use client"

import { cn } from "@/lib/utils"

// ==================== 타입 정의 ====================

// 📌 배지 색상 변형
type BadgeVariant =
  | "gray" // 기본/알 수 없음
  | "yellow" // 대기중
  | "blue" // 진행중
  | "green" // 완료
  | "red" // 취소/오류
  | "purple" // 특별 (VIP 등)
  | "orange" // 주의

// 📌 예시 도메인별 상태 타입 (프로젝트에 맞게 수정하세요)
type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled"
type TaskStatus = "todo" | "in_progress" | "done"

// 📌 Props 인터페이스
interface StatusBadgeProps {
  /** 도메인별 상태값 (type과 함께 사용) */
  status?: string
  /** 도메인 타입 (status와 함께 사용) */
  type?: "order" | "task"
  /** 직접 라벨 지정 (status 대신 사용) */
  label?: string
  /** 직접 색상 지정 (status 대신 사용) */
  variant?: BadgeVariant
  /** 크기 */
  size?: "sm" | "md" | "lg"
  /** 추가 클래스 */
  className?: string
}

// ==================== 상태 설정 맵 ====================
// 📌 프로젝트에 맞게 이 부분을 수정하세요!

// 📌 주문 상태 설정 (예시)
const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: "대기중", variant: "yellow" },
  processing: { label: "처리중", variant: "blue" },
  shipped: { label: "배송중", variant: "blue" },
  delivered: { label: "배송완료", variant: "green" },
  cancelled: { label: "취소됨", variant: "red" },
}

// 📌 할일 상태 설정 (예시)
const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; variant: BadgeVariant }> = {
  todo: { label: "할 일", variant: "yellow" },
  in_progress: { label: "진행중", variant: "blue" },
  done: { label: "완료", variant: "green" },
}

// ==================== 스타일 설정 ====================

// 📌 색상별 스타일
const VARIANT_STYLES: Record<BadgeVariant, string> = {
  gray: "bg-gray-100 text-gray-700",
  yellow: "bg-yellow-100 text-yellow-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
}

// 📌 크기별 스타일
const SIZE_STYLES: Record<"sm" | "md" | "lg", string> = {
  sm: "px-1.5 py-0.5 text-xs",
  md: "px-2 py-0.5 text-xs",
  lg: "px-3 py-1 text-sm",
}

// ==================== 컴포넌트 ====================

export function StatusBadge({
  status,
  type,
  label: customLabel,
  variant: customVariant,
  size = "md",
  className,
}: StatusBadgeProps) {
  // 📌 라벨과 색상 결정
  let label = customLabel || status || "알 수 없음"
  let variant: BadgeVariant = customVariant || "gray"

  // 📌 도메인별 상태 매핑
  if (status && type && !customLabel && !customVariant) {
    switch (type) {
      case "order": {
        const config = ORDER_STATUS_CONFIG[status as OrderStatus]
        if (config) {
          label = config.label
          variant = config.variant
        }
        break
      }
      case "task": {
        const config = TASK_STATUS_CONFIG[status as TaskStatus]
        if (config) {
          label = config.label
          variant = config.variant
        }
        break
      }
    }
  }

  return (
    <span
      className={cn(
        // 기본 스타일
        "inline-flex items-center justify-center rounded-full font-medium",
        // 색상 스타일
        VARIANT_STYLES[variant],
        // 크기 스타일
        SIZE_STYLES[size],
        // 추가 클래스
        className
      )}
    >
      {label}
    </span>
  )
}

// 📌 기본 export
export default StatusBadge
