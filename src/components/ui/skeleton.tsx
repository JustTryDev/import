/**
 * Skeleton UI 컴포넌트
 *
 * 콘텐츠 로딩 중 "뼈대"를 보여주는 컴포넌트입니다.
 * 유튜브, 페이스북 등에서 콘텐츠 로딩 시 보이는 회색 박스들이에요!
 *
 * 일상 비유:
 * - 스피너: "기다려주세요" (뭐가 나올지 모름)
 * - 스켈레톤: "이런 모양의 콘텐츠가 나올 거예요" (예상 가능)
 *
 * 사용법:
 * <Skeleton className="h-12 w-full" />           // 기본 직사각형
 * <Skeleton className="h-12 w-12 rounded-full" /> // 원형 (아바타)
 * <SkeletonCard />                               // 카드형
 * <SkeletonList count={5} />                     // 목록형
 */

import { cn } from "@/lib/utils"

// ==================== 기본 Skeleton ====================

// Skeleton 컴포넌트의 props는 HTMLDivElement의 모든 속성을 상속받습니다
type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        // 기본 스타일: 회색 배경 + 반짝이는 애니메이션
        "animate-pulse rounded-md bg-gray-200",
        className
      )}
      {...props}
    />
  )
}

// ==================== 변형: 카드 Skeleton ====================

interface SkeletonCardProps {
  /** 이미지 영역 표시 여부 */
  showImage?: boolean
  /** 추가 클래스 */
  className?: string
}

export function SkeletonCard({ showImage = true, className }: SkeletonCardProps) {
  return (
    <div className={cn("p-4 border rounded-xl bg-white space-y-4", className)}>
      {/* 이미지 영역 */}
      {showImage && <Skeleton className="h-48 w-full rounded-lg" />}

      {/* 제목 영역 */}
      <Skeleton className="h-6 w-3/4" />

      {/* 설명 영역 */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>

      {/* 하단 (날짜, 버튼 등) */}
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  )
}

// ==================== 변형: 목록 아이템 Skeleton ====================

interface SkeletonListItemProps {
  /** 아바타(프로필 이미지) 표시 여부 */
  showAvatar?: boolean
  /** 추가 클래스 */
  className?: string
}

export function SkeletonListItem({ showAvatar = false, className }: SkeletonListItemProps) {
  return (
    <div className={cn("flex items-center gap-4 p-4 border-b", className)}>
      {/* 아바타 */}
      {showAvatar && <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />}

      {/* 텍스트 영역 */}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>

      {/* 우측 (시간, 상태 등) */}
      <Skeleton className="h-4 w-16" />
    </div>
  )
}

// ==================== 변형: 목록 Skeleton ====================

interface SkeletonListProps {
  /** 아이템 개수 */
  count?: number
  /** 아바타 표시 여부 */
  showAvatar?: boolean
  /** 추가 클래스 */
  className?: string
}

export function SkeletonList({ count = 5, showAvatar = false, className }: SkeletonListProps) {
  return (
    <div className={cn("divide-y", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonListItem key={index} showAvatar={showAvatar} />
      ))}
    </div>
  )
}

// ==================== 변형: 테이블 행 Skeleton ====================

interface SkeletonTableRowProps {
  /** 컬럼 개수 */
  columns?: number
  /** 추가 클래스 */
  className?: string
}

export function SkeletonTableRow({ columns = 5, className }: SkeletonTableRowProps) {
  return (
    <tr className={className}>
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

// ==================== 변형: 프로필 Skeleton ====================

export function SkeletonProfile({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      {/* 프로필 이미지 */}
      <Skeleton className="h-16 w-16 rounded-full" />

      {/* 정보 */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

// ==================== 변형: 통계 카드 Skeleton ====================

export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={cn("p-6 border rounded-xl bg-white", className)}>
      <Skeleton className="h-4 w-20 mb-2" />
      <Skeleton className="h-8 w-16" />
    </div>
  )
}

// ==================== 변형: 텍스트 블록 Skeleton ====================

interface SkeletonTextProps {
  /** 줄 개수 */
  lines?: number
  /** 추가 클래스 */
  className?: string
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "h-4",
            // 마지막 줄은 더 짧게
            index === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  )
}
