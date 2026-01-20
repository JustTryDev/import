/**
 * localStorage 통합 관리 유틸리티
 *
 * 📌 왜 이렇게 만들었나요?
 * - localStorage는 브라우저에 데이터를 저장하는 기능입니다 (냉장고처럼!)
 * - 여러 파일에서 각자 다르게 사용하면 관리가 어려워집니다
 * - 한 곳에서 관리하면: 키 이름 충돌 방지, 만료 기능, 타입 안전성 확보
 *
 * 📌 일상 비유:
 * - Before: 가족 각자가 냉장고 아무 곳에나 음식을 넣음 → 찾기 어려움
 * - After: 음식별 지정 칸이 있고, 유통기한 라벨도 붙임 → 관리 쉬움
 *
 * 📌 사용 방법:
 * 1. STORAGE_KEYS에 새 키 추가
 * 2. 필요하면 도메인별 헬퍼 함수 추가 (예: popupStorage)
 */

// ========================================
// 📌 저장소 키 정의 (모든 키를 한 곳에서 관리)
// ========================================

// 프로젝트 접두사 (다른 프로젝트와 키 충돌 방지)
const PROJECT_PREFIX = "app"

export const STORAGE_KEYS = {
  // 인증 관련
  AUTH_TOKEN: `${PROJECT_PREFIX}_auth_token`,
  AUTH_PROVIDER: `${PROJECT_PREFIX}_auth_provider`,

  // 사용자 설정
  USER_PREFERENCES: `${PROJECT_PREFIX}_user_preferences`,
  THEME_MODE: `${PROJECT_PREFIX}_theme_mode`,

  // 팝업/모달 관련
  POPUP_HIDDEN: `${PROJECT_PREFIX}_popup_hidden`,

  // 에디터 관련
  EDITOR_COLOR_HISTORY: `${PROJECT_PREFIX}_editor_colors`,

  // 폼 임시 저장
  FORM_DRAFT: `${PROJECT_PREFIX}_form_draft`,
} as const

// 저장소 키 타입 (타입 안전성을 위해)
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

// ========================================
// 📌 기본 저장/불러오기 함수
// ========================================

/**
 * localStorage에 값 저장
 * @param key - 저장 키
 * @param value - 저장할 값 (자동으로 JSON 변환)
 */
export function setStorageItem<T>(key: string, value: T): void {
  try {
    // JSON.stringify: 객체/배열을 문자열로 변환 (냉장고에 넣기 위해 포장하는 것)
    const serialized = JSON.stringify(value)
    localStorage.setItem(key, serialized)
  } catch (error) {
    // 저장 실패 시 (용량 초과 등)
    console.error(`[Storage] 저장 실패: ${key}`, error)
  }
}

/**
 * localStorage에서 값 불러오기
 * @param key - 불러올 키
 * @param defaultValue - 값이 없을 때 반환할 기본값
 * @returns 저장된 값 또는 기본값
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    if (item === null) return defaultValue

    // JSON.parse: 문자열을 객체/배열로 변환 (포장 풀기)
    return JSON.parse(item) as T
  } catch (error) {
    // 파싱 실패 시 기본값 반환
    console.error(`[Storage] 불러오기 실패: ${key}`, error)
    return defaultValue
  }
}

/**
 * localStorage에서 값 삭제
 * @param key - 삭제할 키
 */
export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`[Storage] 삭제 실패: ${key}`, error)
  }
}

// ========================================
// 📌 만료 기능이 있는 저장 함수
// ========================================

interface StorageItemWithExpiry<T> {
  value: T
  expiry: number // 만료 시간 (Unix timestamp)
}

/**
 * 만료 시간과 함께 값 저장
 * @param key - 저장 키
 * @param value - 저장할 값
 * @param ttlMs - 유효 기간 (밀리초)
 *
 * 📌 일상 비유: 우유에 유통기한 라벨을 붙이는 것
 *
 * @example
 * // 24시간 동안 유효한 토큰 저장
 * setStorageItemWithExpiry("token", "abc123", 24 * 60 * 60 * 1000)
 */
export function setStorageItemWithExpiry<T>(key: string, value: T, ttlMs: number): void {
  const item: StorageItemWithExpiry<T> = {
    value,
    expiry: Date.now() + ttlMs,
  }
  setStorageItem(key, item)
}

/**
 * 만료 시간을 확인하며 값 불러오기
 * @param key - 불러올 키
 * @param defaultValue - 값이 없거나 만료됐을 때 반환할 기본값
 * @returns 유효한 값 또는 기본값
 *
 * 📌 일상 비유: 냉장고에서 우유 꺼낼 때 유통기한 확인하는 것
 */
export function getStorageItemWithExpiry<T>(key: string, defaultValue: T): T {
  const item = getStorageItem<StorageItemWithExpiry<T> | null>(key, null)

  if (!item) return defaultValue

  // 만료 확인
  if (Date.now() > item.expiry) {
    // 만료된 항목 자동 삭제 (상한 우유 버리기)
    removeStorageItem(key)
    return defaultValue
  }

  return item.value
}

// ========================================
// 📌 도메인별 헬퍼 함수 (자주 사용하는 기능 모음)
// ========================================

/**
 * 팝업 숨김 상태 관리
 *
 * 📌 사용 예시:
 * - "오늘 하루 보지 않기" 버튼 클릭 시 24시간 동안 숨김
 */
export const popupStorage = {
  // 숨긴 팝업 목록 가져오기
  getHiddenPopups: (): Record<string, number> => {
    return getStorageItem<Record<string, number>>(STORAGE_KEYS.POPUP_HIDDEN, {})
  },

  // 팝업 숨기기 (기본 24시간)
  hidePopup: (popupId: string, hours: number = 24) => {
    const hidden = popupStorage.getHiddenPopups()
    hidden[popupId] = Date.now() + hours * 60 * 60 * 1000
    setStorageItem(STORAGE_KEYS.POPUP_HIDDEN, hidden)
  },

  // 팝업이 숨겨져 있는지 확인
  isHidden: (popupId: string): boolean => {
    const hidden = popupStorage.getHiddenPopups()
    const hideUntil = hidden[popupId]
    if (!hideUntil) return false
    return Date.now() < hideUntil
  },

  // 만료된 팝업 정리
  cleanExpired: () => {
    const hidden = popupStorage.getHiddenPopups()
    const now = Date.now()
    const cleaned = Object.fromEntries(Object.entries(hidden).filter(([, expiry]) => expiry > now))
    if (Object.keys(cleaned).length !== Object.keys(hidden).length) {
      setStorageItem(STORAGE_KEYS.POPUP_HIDDEN, cleaned)
    }
  },
}

/**
 * 에디터 색상 히스토리 관리
 *
 * 📌 사용 예시:
 * - 에디터에서 사용한 색상을 기록해서 "최근 사용 색상"으로 표시
 */
export const editorColorStorage = {
  // 색상 히스토리 가져오기
  getColors: (editorId: string): string[] => {
    const key = `${STORAGE_KEYS.EDITOR_COLOR_HISTORY}_${editorId}`
    return getStorageItem<string[]>(key, [])
  },

  // 색상 추가 (최대 개수 제한)
  addColor: (editorId: string, color: string, maxColors: number = 10) => {
    const key = `${STORAGE_KEYS.EDITOR_COLOR_HISTORY}_${editorId}`
    const colors = editorColorStorage.getColors(editorId)

    // 이미 있으면 맨 앞으로 이동
    const filtered = colors.filter((c) => c !== color)
    const updated = [color, ...filtered].slice(0, maxColors)

    setStorageItem(key, updated)
    return updated
  },

  // 색상 히스토리 초기화
  clearColors: (editorId: string) => {
    const key = `${STORAGE_KEYS.EDITOR_COLOR_HISTORY}_${editorId}`
    removeStorageItem(key)
  },
}

/**
 * 테마 모드 관리
 *
 * 📌 사용 예시:
 * - 다크 모드/라이트 모드 설정 저장
 */
export const themeStorage = {
  // 테마 모드 가져오기
  getTheme: (): "light" | "dark" | "system" => {
    return getStorageItem<"light" | "dark" | "system">(STORAGE_KEYS.THEME_MODE, "system")
  },

  // 테마 모드 저장
  setTheme: (theme: "light" | "dark" | "system") => {
    setStorageItem(STORAGE_KEYS.THEME_MODE, theme)
  },
}

/**
 * 폼 임시 저장 관리
 *
 * 📌 사용 예시:
 * - 긴 폼 작성 중 실수로 페이지를 벗어나도 데이터 복구
 */
export const formDraftStorage = {
  // 폼 데이터 임시 저장 (1시간 유효)
  saveDraft: <T>(formId: string, data: T) => {
    const key = `${STORAGE_KEYS.FORM_DRAFT}_${formId}`
    setStorageItemWithExpiry(key, data, 60 * 60 * 1000) // 1시간
  },

  // 폼 데이터 불러오기
  getDraft: <T>(formId: string, defaultValue: T): T => {
    const key = `${STORAGE_KEYS.FORM_DRAFT}_${formId}`
    return getStorageItemWithExpiry(key, defaultValue)
  },

  // 폼 데이터 삭제 (제출 완료 후)
  clearDraft: (formId: string) => {
    const key = `${STORAGE_KEYS.FORM_DRAFT}_${formId}`
    removeStorageItem(key)
  },
}
