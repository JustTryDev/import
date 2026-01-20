/**
 * 커스텀 훅 모음
 *
 * 📌 이 파일의 목적:
 * 프로젝트에서 사용하는 모든 커스텀 훅을 한 곳에서 export합니다.
 * 이렇게 하면 import 경로가 깔끔해집니다.
 *
 * 📌 사용 예시:
 * // Before (각 파일에서 개별 import)
 * import { useDebounce } from "@/hooks/useDebounce"
 * import { usePagination } from "@/hooks/usePagination"
 *
 * // After (한 줄로 import)
 * import { useDebounce, usePagination } from "@/hooks"
 */

// ==================== 데이터 관련 훅 ====================

// 디바운스: 빠른 연속 이벤트 중 마지막만 실행
export { useDebounce, useDebouncedCallback } from "./useDebounce"

// 페이지네이션: 목록을 페이지별로 나눠서 표시
export { usePagination } from "./usePagination"

// ==================== 애니메이션 관련 훅 ====================

// 숫자 카운트업: 요소가 화면에 보이면 0부터 목표값까지 증가
export { useCountUp } from "./useCountUp"

// 스크롤 애니메이션: 요소가 화면에 보이면 애니메이션 시작
export { useScrollAnimation } from "./useScrollAnimation"
