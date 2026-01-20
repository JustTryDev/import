"use client"

/**
 * TipTap 기반 리치 텍스트 에디터 컴포넌트 (고급 버전)
 *
 * 📌 리치 텍스트 에디터란?
 * 마치 워드(Word)나 한글처럼 글자를 굵게, 기울게, 목록으로 만들 수 있는
 * 텍스트 편집기입니다. 일반 텍스트 입력창보다 다양한 서식을 적용할 수 있어요.
 *
 * 지원 기능:
 * - 기본 서식: 굵게, 기울임, 밑줄
 * - 제목: H1, H2
 * - 목록: 글머리 기호, 번호 목록
 * - 글씨 색상: 인라인 팔레트 + 최근 사용 색상
 * - 형광펜: 인라인 팔레트 + 최근 사용 색상
 * - 글씨 크기: 8개 프리셋 + 직접 입력
 * - 링크 삽입
 * - 이미지: 드래그 앤 드롭 업로드 + 리사이즈 핸들
 */

import { useState, useRef, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { editorColorStorage } from "@/lib/storage"
import {
  useEditor,
  EditorContent,
  Editor,
  NodeViewWrapper,
  NodeViewProps,
  ReactNodeViewRenderer,
} from "@tiptap/react"
// 📌 TipTap v3에서는 BubbleMenu를 별도 경로에서 import
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
// 📌 Link는 StarterKit에 포함되어 있으므로 별도 import 제거 (Tiptap v3)
import Image from "@tiptap/extension-image"
import { NodeSelection } from "@tiptap/pm/state"
import { TextStyle } from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import { Highlight } from "@tiptap/extension-highlight"
// 📌 Underline은 StarterKit에 포함되어 있으므로 별도 import 제거 (Tiptap v3)
import TextAlign from "@tiptap/extension-text-align"
// 📌 테이블 확장 - 워드처럼 표를 만들 수 있어요
import { TableKit, TableCell } from "@tiptap/extension-table"
// 📌 폰트 확장 - 다양한 글꼴을 선택할 수 있어요
import FontFamily from "@tiptap/extension-font-family"
// 📌 슬라이드/갤러리 이미지 확장
import { ImageSlider } from "./editor/ImageSliderExtension"
import { ImageGallery } from "./editor/ImageGalleryExtension"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Undo,
  Redo,
  Type,
  ChevronDown,
  Upload,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  X,
  Table,
  Minus,
  Images,
  GalleryHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Paintbrush,
  Rows3,
  Columns3,
} from "lucide-react"
import { compressImage } from "@/lib/imageCompressor"

// ========================================
// 타입 정의
// ========================================

interface RichTextEditorProps {
  content: string // HTML 문자열
  onChange: (content: string) => void // 내용이 바뀔 때 호출되는 함수
  placeholder?: string
}

// 업로드 진행 상태 타입
interface UploadProgress {
  current: number // 현재 업로드 중인 파일 번호
  total: number // 전체 파일 수
  fileName: string // 현재 파일명
}

// ========================================
// 상수 정의
// ========================================

/**
 * 📌 글씨 크기 프리셋
 * 워드처럼 빠르게 선택할 수 있는 크기들입니다.
 */
const PRESET_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32"]

/**
 * 📌 폰트 목록 (무료 한글 폰트)
 * Google Fonts에서 제공하는 무료 폰트들입니다.
 */
const FONT_OPTIONS = [
  { value: "Pretendard", label: "프리텐다드 (기본)" },
  { value: "'Noto Sans KR', sans-serif", label: "Noto Sans KR" },
  { value: "'Nanum Gothic', sans-serif", label: "나눔고딕" },
  { value: "'Nanum Myeongjo', serif", label: "나눔명조" },
  { value: "'Nanum Pen Script', cursive", label: "나눔손글씨" },
  { value: "'Black Han Sans', sans-serif", label: "블랙한산스" },
  { value: "'Jua', sans-serif", label: "주아" },
]

// ========================================
// 리사이즈 가능한 이미지 컴포넌트
// ========================================

/**
 * 📌 ResizableImageComponent
 *
 * 일상생활 비유:
 * 파워포인트에서 이미지를 클릭하면 모서리에 조절점이 나타나고,
 * 그걸 드래그하면 크기를 조절할 수 있잖아요?
 * 이 컴포넌트가 바로 그 기능을 제공합니다!
 *
 * 기술 설명:
 * TipTap의 NodeViewWrapper를 사용해서 이미지 주변에
 * 리사이즈 핸들, 정렬 버튼 등을 추가할 수 있어요.
 */
function ResizableImageComponent({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  // 현재 리사이즈 중인지 여부
  const [isResizing, setIsResizing] = useState(false)
  // 리사이즈 중 표시할 현재 크기
  const [currentSize, setCurrentSize] = useState({ width: 0, height: 0 })
  // 이미지 요소 참조
  const imageRef = useRef<HTMLImageElement>(null)
  // 드래그 시작 위치와 초기 크기 저장
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 })

  /**
   * 리사이즈 시작 핸들러
   *
   * 📌 작동 원리:
   * 1. 마우스 다운 이벤트에서 시작 위치를 기록
   * 2. document에 mousemove, mouseup 이벤트 리스너 추가
   * 3. 마우스 이동에 따라 크기 계산 및 업데이트
   * 4. 마우스 업에서 리스너 제거
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, corner: string) => {
      e.preventDefault()
      e.stopPropagation()

      if (!imageRef.current) return

      const rect = imageRef.current.getBoundingClientRect()
      startPos.current = {
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
      }

      setIsResizing(true)
      setCurrentSize({ width: Math.round(rect.width), height: Math.round(rect.height) })

      const handleMouseMove = (moveEvent: MouseEvent) => {
        // 마우스 이동량 계산
        const deltaX = moveEvent.clientX - startPos.current.x
        const deltaY = moveEvent.clientY - startPos.current.y

        let newWidth = startPos.current.width
        let newHeight = startPos.current.height

        /**
         * 📌 핸들 종류에 따라 다른 동작
         *
         * 일상생활 비유:
         * - 파워포인트에서 모서리를 잡으면 가로+세로가 같이 변하고,
         * - 변 중앙을 잡으면 한 방향만 변하는 것과 같아요!
         */
        if (corner === "middle-right") {
          // 📌 오른쪽 중앙 핸들: 가로만 조절
          newWidth = startPos.current.width + deltaX
        } else if (corner === "middle-bottom") {
          // 📌 아래쪽 중앙 핸들: 세로만 조절
          newHeight = startPos.current.height + deltaY
        } else {
          // 📌 모서리 핸들: 가로+세로 동시 조절
          newWidth = startPos.current.width + deltaX
          newHeight = startPos.current.height + deltaY

          // Shift 키를 누르면 비율 유지 (모서리에서만 동작)
          if (moveEvent.shiftKey) {
            const aspectRatio = startPos.current.width / startPos.current.height
            newHeight = newWidth / aspectRatio
          }
        }

        // 최소/최대 크기 제한 (너무 작거나 크면 안 됨)
        newWidth = Math.max(50, Math.min(newWidth, 800))
        newHeight = Math.max(50, Math.min(newHeight, 800))

        // 현재 크기 표시 업데이트 (툴팁용)
        setCurrentSize({ width: Math.round(newWidth), height: Math.round(newHeight) })

        // 이미지 속성 업데이트 (실제 크기 변경)
        updateAttributes({
          width: `${Math.round(newWidth)}px`,
          height: `${Math.round(newHeight)}px`,
        })
      }

      const handleMouseUp = () => {
        setIsResizing(false)
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [updateAttributes]
  )

  /**
   * 📌 더블클릭: 원본 크기로 복원
   * 마치 사진 앱에서 "원본 크기로" 버튼을 누르는 것과 같아요
   */
  const handleDoubleClick = useCallback(() => {
    updateAttributes({ width: null, height: null })
  }, [updateAttributes])

  /**
   * 이미지 정렬 변경
   */
  const setAlignment = useCallback(
    (align: "left" | "center" | "right") => {
      updateAttributes({ alignment: align })
    },
    [updateAttributes]
  )

  // 📌 정렬에 따른 CSS 클래스 (flexbox 기반)
  // NodeViewWrapper가 display: flex이므로 justify 클래스 사용
  const alignmentMap: Record<string, string> = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  }
  const alignmentClass = alignmentMap[node.attrs.alignment as string] || "justify-start"

  return (
    <NodeViewWrapper className={`relative my-2 ${alignmentClass}`}>
      {/* 이미지 컨테이너 */}
      <div className="relative inline-block">
        <img
          ref={imageRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
          style={{
            width: node.attrs.width || "auto",
            height: node.attrs.height || "auto",
          }}
          onDoubleClick={handleDoubleClick}
          className={`max-w-full cursor-pointer rounded-lg transition-shadow ${
            selected ? "ring-primary ring-2 ring-offset-2" : ""
          }`}
          draggable={false}
        />

        {/* 📌 리사이즈 핸들 - 이미지 선택 시에만 표시 */}
        {selected && (
          <>
            {/* 모서리 핸들 (대각선 조절) */}
            {/* 우상단 핸들 */}
            <div
              className="image-resize-handle top-right"
              onMouseDown={(e) => handleMouseDown(e, "top-right")}
            />
            {/* 좌하단 핸들 */}
            <div
              className="image-resize-handle bottom-left"
              onMouseDown={(e) => handleMouseDown(e, "bottom-left")}
            />
            {/* 우하단 핸들 */}
            <div
              className="image-resize-handle bottom-right"
              onMouseDown={(e) => handleMouseDown(e, "bottom-right")}
            />

            {/* 📌 NEW: 변 중앙 핸들 (개별 방향 조절) */}
            {/* 오른쪽 중앙 핸들 (가로만 조절) */}
            <div
              className="image-resize-handle middle-right"
              onMouseDown={(e) => handleMouseDown(e, "middle-right")}
            />
            {/* 아래쪽 중앙 핸들 (세로만 조절) */}
            <div
              className="image-resize-handle middle-bottom"
              onMouseDown={(e) => handleMouseDown(e, "middle-bottom")}
            />
          </>
        )}

        {/* 📌 크기 표시 툴팁 - 리사이즈 중에만 표시 */}
        {isResizing && (
          <div className="image-size-tooltip">
            {currentSize.width} × {currentSize.height}
          </div>
        )}

        {/* 📌 이미지 편집 툴바 - 선택 시에만 표시 */}
        {selected && !isResizing && (
          <div className="absolute -top-12 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-lg border bg-white px-2 py-1.5 shadow-lg">
            {/* 정렬 버튼 */}
            <button
              type="button"
              onClick={() => setAlignment("left")}
              className={`rounded p-1.5 hover:bg-gray-100 ${
                node.attrs.alignment === "left" ? "bg-gray-200" : ""
              }`}
              title="왼쪽 정렬"
            >
              <AlignLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setAlignment("center")}
              className={`rounded p-1.5 hover:bg-gray-100 ${
                node.attrs.alignment === "center" ? "bg-gray-200" : ""
              }`}
              title="가운데 정렬"
            >
              <AlignCenter className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setAlignment("right")}
              className={`rounded p-1.5 hover:bg-gray-100 ${
                node.attrs.alignment === "right" ? "bg-gray-200" : ""
              }`}
              title="오른쪽 정렬"
            >
              <AlignRight className="h-4 w-4" />
            </button>

            <div className="mx-1 h-5 w-px bg-gray-200" />

            {/* 삭제 버튼 */}
            <button
              type="button"
              onClick={() => deleteNode()}
              className="rounded p-1.5 text-red-500 hover:bg-gray-100"
              title="이미지 삭제"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

// ========================================
// 툴바 버튼 컴포넌트
// ========================================

/**
 * 툴바 버튼 컴포넌트
 * 볼드, 이탤릭 등 각 서식 버튼을 렌더링합니다
 */
function ToolbarButton({
  onClick,
  isActive,
  disabled,
  children,
  title,
}: {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded p-2 transition-colors hover:bg-gray-100 ${isActive ? "text-primary bg-gray-200" : "text-gray-600"} ${disabled ? "cursor-not-allowed opacity-50" : ""} `}
    >
      {children}
    </button>
  )
}

/**
 * 구분선 컴포넌트
 * 툴바 버튼들 사이의 시각적 구분을 위해 사용합니다.
 */
function Divider() {
  return <div className="mx-1 h-6 w-px bg-gray-300" />
}

// ========================================
// 인라인 컬러 피커 컴포넌트
// ========================================

/**
 * 📌 인라인 컬러 피커
 *
 * 변경점: 팝업 대신 툴바에 바로 표시!
 * - Color Picker + HEX 입력 + 현재 색상 미리보기
 * - 최근 사용한 색상 5개 히스토리 (localStorage에 저장)
 */
function InlineColorPicker({
  editor,
  type,
  label,
}: {
  editor: Editor
  type: "text" | "highlight"
  label: string
}) {
  // 에디터 ID (type 기반)
  const editorId = type

  // 최근 사용 색상 목록 (통합 storage 유틸에서 불러오기)
  const [recentColors, setRecentColors] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    return editorColorStorage.getColors(editorId)
  })

  // 현재 적용된 색상
  const currentColor =
    type === "text"
      ? editor.getAttributes("textStyle").color || "#000000"
      : editor.getAttributes("highlight").color || "#FEF08A"

  /**
   * 색상 적용 함수
   * 1. 에디터에 색상 적용
   * 2. 최근 사용 색상 목록 업데이트 (통합 storage 유틸 사용)
   */
  const applyColor = useCallback(
    (color: string) => {
      // 에디터에 색상 적용
      if (type === "text") {
        editor.chain().focus().setColor(color).run()
      } else {
        editor.chain().focus().setHighlight({ color }).run()
      }

      // 최근 사용 색상 업데이트 (최대 5개, 통합 storage 유틸 사용)
      const updated = editorColorStorage.addColor(editorId, color, 5)
      setRecentColors(updated)
    },
    [editor, type, editorId]
  )

  /**
   * 색상 제거 함수
   */
  const removeColor = useCallback(() => {
    if (type === "text") {
      editor.chain().focus().unsetColor().run()
    } else {
      editor.chain().focus().unsetHighlight().run()
    }
  }, [editor, type])

  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2 py-1">
      {/* 라벨 */}
      <span className="min-w-[40px] text-xs text-gray-500">{label}</span>

      {/* HTML5 Color Picker */}
      <input
        type="color"
        value={currentColor}
        onChange={(e) => applyColor(e.target.value)}
        className="h-6 w-6 cursor-pointer rounded border-0 p-0"
        title="색상 선택"
      />

      {/* 현재 색상 미리보기 */}
      <div
        className="h-5 w-5 rounded border border-gray-200"
        style={{ backgroundColor: currentColor }}
      />

      {/* HEX 코드 입력 */}
      <input
        type="text"
        value={currentColor}
        onChange={(e) => {
          // 유효한 HEX 코드일 때만 적용
          if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
            applyColor(e.target.value)
          }
        }}
        className="w-[72px] rounded border px-1.5 py-0.5 text-center font-mono text-xs"
        placeholder="#000000"
      />

      {/* 색상 제거 버튼 */}
      <button
        type="button"
        onClick={removeColor}
        className="px-1 text-xs text-gray-400 hover:text-gray-600"
        title="색상 제거"
      >
        <X className="h-3 w-3" />
      </button>

      {/* 📌 최근 사용 색상 히스토리 */}
      {recentColors.length > 0 && (
        <div className="ml-1 flex gap-0.5 border-l border-gray-200 pl-1">
          {recentColors.map((color, i) => (
            <button
              key={i}
              type="button"
              onClick={() => applyColor(color)}
              className="h-4 w-4 rounded-full border border-gray-200 transition-transform hover:scale-110"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ========================================
// 글씨 크기 선택기
// ========================================

/**
 * 📌 글씨 크기 선택기
 *
 * 일상생활 비유:
 * - 워드에서 글씨 크기 12pt, 14pt 선택하는 것처럼,
 * - 프리셋 크기를 빠르게 선택하거나 직접 숫자를 입력할 수 있어요.
 */
function FontSizeSelector({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState("16")

  // 현재 글씨 크기 표시 (기본 16px)
  const getCurrentFontSize = () => {
    const attrs = editor.getAttributes("textStyle")
    if (attrs.fontSize) {
      return attrs.fontSize.replace("px", "")
    }
    return "16"
  }

  // 글씨 크기 적용 함수
  const applySize = (size: string) => {
    editor
      .chain()
      .focus()
      .setMark("textStyle", { fontSize: `${size}px` })
      .run()
    setInputValue(size)
    setIsOpen(false)
  }

  // 글씨 크기 제거 (기본 크기로)
  const resetSize = () => {
    editor.chain().focus().unsetMark("textStyle").run()
    setInputValue("16")
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="글씨 크기"
        className="flex items-center gap-1 rounded px-2 py-1.5 text-gray-600 transition-colors hover:bg-gray-100"
      >
        <Type className="h-4 w-4" />
        <span className="min-w-[20px] text-xs">{getCurrentFontSize()}</span>
        <ChevronDown className="h-3 w-3" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 z-50 mt-2 w-40 rounded-lg border bg-white p-3 shadow-xl">
            <p className="mb-2 text-xs text-gray-500">글씨 크기</p>

            {/* 프리셋 크기 버튼들 */}
            <div className="mb-3 grid grid-cols-4 gap-1">
              {PRESET_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => applySize(size)}
                  className={`rounded px-2 py-1.5 text-xs transition hover:bg-gray-100 ${getCurrentFontSize() === size ? "bg-gray-200 font-bold" : ""}`}
                >
                  {size}
                </button>
              ))}
            </div>

            {/* 직접 입력 */}
            <div className="flex items-center gap-1 border-t pt-2">
              <input
                type="number"
                min="8"
                max="72"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySize(inputValue)}
                className="w-14 rounded border px-2 py-1 text-xs"
                placeholder="24"
              />
              <span className="text-xs text-gray-500">px</span>
              <button
                type="button"
                onClick={() => applySize(inputValue)}
                className="text-primary hover:bg-primary/10 rounded px-2 py-1 text-xs"
              >
                적용
              </button>
            </div>

            {/* 기본 크기로 리셋 */}
            <button
              type="button"
              onClick={resetSize}
              className="mt-2 w-full rounded py-1 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            >
              기본 크기로
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ========================================
// 폰트 선택기
// ========================================

/**
 * 📌 폰트 선택기
 *
 * 일상생활 비유:
 * - 워드에서 "맑은 고딕", "바탕체" 등 글꼴을 선택하는 것처럼,
 * - 드롭다운에서 원하는 폰트를 선택할 수 있어요.
 */
function FontFamilySelector({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false)

  // 현재 선택된 폰트
  const getCurrentFont = () => {
    const attrs = editor.getAttributes("textStyle")
    return attrs.fontFamily || "Pretendard"
  }

  // 현재 폰트의 라벨 찾기
  const getCurrentFontLabel = () => {
    const currentFont = getCurrentFont()
    const found = FONT_OPTIONS.find((f) => f.value === currentFont)
    return found ? found.label : "폰트"
  }

  // 폰트 적용 함수
  const applyFont = (fontFamily: string) => {
    editor.chain().focus().setFontFamily(fontFamily).run()
    setIsOpen(false)
  }

  // 폰트 초기화
  const resetFont = () => {
    editor.chain().focus().unsetFontFamily().run()
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="폰트 선택"
        className="flex min-w-[80px] items-center gap-1 rounded px-2 py-1.5 text-gray-600 transition-colors hover:bg-gray-100"
      >
        <span className="max-w-[60px] truncate text-xs">{getCurrentFontLabel()}</span>
        <ChevronDown className="h-3 w-3 flex-shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 z-50 mt-2 w-48 rounded-lg border bg-white p-2 shadow-xl">
            <p className="mb-2 px-1 text-xs text-gray-500">폰트 선택</p>

            {/* 폰트 목록 */}
            <div className="max-h-[200px] space-y-0.5 overflow-y-auto">
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font.value}
                  type="button"
                  onClick={() => applyFont(font.value)}
                  className={`w-full rounded px-2 py-1.5 text-left text-sm transition hover:bg-gray-100 ${getCurrentFont() === font.value ? "bg-gray-200 font-bold" : ""}`}
                  style={{ fontFamily: font.value }}
                >
                  {font.label}
                </button>
              ))}
            </div>

            {/* 초기화 버튼 */}
            <button
              type="button"
              onClick={resetFont}
              className="mt-2 w-full rounded border-t py-1 pt-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            >
              기본 폰트로
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ========================================
// 테이블 셀 배경색 확장
// ========================================

/**
 * 📌 셀 배경색 팔레트
 * 테이블 셀에 적용할 수 있는 배경색 목록입니다.
 */
const CELL_BACKGROUND_COLORS = [
  { value: null, label: "투명" },
  { value: "#FFFFFF", label: "흰색" },
  { value: "#F3F4F6", label: "연한 회색" },
  { value: "#FEF3C7", label: "연한 노랑" },
  { value: "#FED7AA", label: "연한 주황" },
  { value: "#FECACA", label: "연한 빨강" },
  { value: "#FBCFE8", label: "연한 분홍" },
  { value: "#E9D5FF", label: "연한 보라" },
  { value: "#BFDBFE", label: "연한 파랑" },
  { value: "#BBF7D0", label: "연한 초록" },
]

/**
 * 📌 커스텀 TableCell 확장
 *
 * 기본 TableCell에 backgroundColor 속성을 추가합니다.
 * 이를 통해 셀별로 배경색을 지정할 수 있어요.
 */
const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      // 부모(기본 TableCell)의 속성 상속
      ...this.parent?.(),
      // 📌 배경색 속성 추가
      backgroundColor: {
        default: null,
        // HTML에서 속성 읽기
        parseHTML: (element) => element.style.backgroundColor || null,
        // HTML로 렌더링
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) return {}
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          }
        },
      },
    }
  },
})

// ========================================
// 테이블 그리드 피커 (삽입용)
// ========================================

/**
 * 📌 TableGridPicker - 그리드로 테이블 크기 선택
 *
 * 일상생활 비유:
 * - 워드에서 표 삽입할 때 마우스로 행×열을 드래그해서 선택하는 것처럼,
 * - 10×10 그리드에서 원하는 크기를 시각적으로 선택할 수 있어요.
 */
function TableGridPicker({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false)
  // 마우스가 호버된 위치 (행, 열)
  const [hovered, setHovered] = useState({ row: 0, col: 0 })

  // 테이블 안에 커서가 있는지 확인
  const isInTable = editor.isActive("table")

  // 테이블 삽입
  const insertTable = (rows: number, cols: number) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
    setIsOpen(false)
    setHovered({ row: 0, col: 0 })
  }

  // 10×10 그리드 생성
  const gridSize = 10

  return (
    <div className="relative">
      {/* 테이블 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="테이블 삽입"
        className={`rounded p-2 transition-colors hover:bg-gray-100 ${
          isInTable ? "text-primary bg-gray-200" : "text-gray-600"
        }`}
      >
        <Table className="h-4 w-4" />
      </button>

      {/* 그리드 피커 드롭다운 */}
      {isOpen && (
        <>
          {/* 배경 클릭 시 닫기 */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute top-full left-0 z-50 mt-2 rounded-lg border bg-white p-3 shadow-xl">
            <p className="mb-2 text-xs text-gray-500">테이블 크기 선택</p>

            {/* 📌 10×10 그리드 */}
            <div
              className="grid gap-0.5"
              style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
              onMouseLeave={() => setHovered({ row: 0, col: 0 })}
            >
              {Array.from({ length: gridSize * gridSize }).map((_, index) => {
                const row = Math.floor(index / gridSize) + 1
                const col = (index % gridSize) + 1
                const isSelected = row <= hovered.row && col <= hovered.col

                return (
                  <button
                    key={index}
                    type="button"
                    className={`h-5 w-5 rounded-sm border transition-colors ${
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-gray-200 bg-gray-100 hover:border-gray-300"
                    }`}
                    onMouseEnter={() => setHovered({ row, col })}
                    onClick={() => insertTable(row, col)}
                  />
                )
              })}
            </div>

            {/* 📌 현재 선택된 크기 표시 */}
            <div className="mt-2 text-center">
              <span className="text-sm font-medium text-gray-700">
                {hovered.row > 0 && hovered.col > 0
                  ? `${hovered.row} × ${hovered.col}`
                  : "마우스를 올려 선택"}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ========================================
// 테이블 플로팅 툴바 (편집용)
// ========================================

/**
 * 📌 TableFloatingToolbar - 테이블 편집용 플로팅 툴바
 *
 * 일상생활 비유:
 * - 이미지 선택하면 위에 뜨는 편집 버튼처럼,
 * - 테이블 안을 클릭하면 바로 위에 편집 도구가 나타나요.
 */
function TableFloatingToolbar({ editor }: { editor: Editor }) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  // 📌 커스텀 색상 선택용 state
  const [customColor, setCustomColor] = useState("#BFDBFE")

  // 📌 핵심 수정: 마운트 상태 추적 (비동기 콜백에서 언마운트 감지용)
  const isMountedRef = useRef(true)

  // 📌 핵심 수정: 언마운트 시 cleanup - 페이지 이동 시 비동기 작업 차단
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // 에디터가 파괴되었거나 뷰가 준비되지 않았으면 렌더링하지 않음
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (editor.isDestroyed || !(editor.view as any)?.docView) return null

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor, view }) => {
        // 📌 마운트 상태 체크 (비동기 콜백에서 중요! - domFromPos 에러 방지)
        if (!isMountedRef.current) return false
        // 에디터 뷰가 준비되지 않았거나 파괴된 상태면 숨김
        if (!view?.dom || editor.isDestroyed) return false
        // docView가 없으면 위치 계산 불가
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(view as any).docView) return false
        // 테이블 활성화 확인
        return editor.isActive("table")
      }}
      // 📌 updateDelay 증가로 race condition 완화
      updateDelay={300}
      options={{
        placement: "top",
        offset: 8,
      }}
      className="flex items-center gap-1 rounded-lg border bg-white px-2 py-1.5 shadow-lg"
    >
      {/* 📌 행 조작 버튼 */}
      <button
        type="button"
        onClick={() => editor.chain().focus().addRowBefore().run()}
        className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
        title="위에 행 추가"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
        title="아래에 행 추가"
      >
        <ArrowDown className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteRow().run()}
        className="rounded p-1.5 text-red-500 hover:bg-gray-100"
        title="행 삭제"
      >
        <Minus className="h-4 w-4" />
      </button>

      {/* 구분선 */}
      <div className="mx-1 h-5 w-px bg-gray-200" />

      {/* 📌 열 조작 버튼 */}
      <button
        type="button"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
        title="왼쪽에 열 추가"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
        title="오른쪽에 열 추가"
      >
        <ArrowRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        className="rounded p-1.5 text-red-500 hover:bg-gray-100"
        title="열 삭제"
      >
        <Minus className="h-4 w-4" />
      </button>

      {/* 구분선 */}
      <div className="mx-1 h-5 w-px bg-gray-200" />

      {/* 📌 헤더 토글 버튼 */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        className={`rounded p-1.5 hover:bg-gray-100 ${
          editor.isActive("tableHeader") ? "bg-blue-100 text-blue-600" : "text-gray-600"
        }`}
        title="헤더 행 토글 (첫 번째 행)"
      >
        <Rows3 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
        className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
        title="헤더 열 토글 (첫 번째 열)"
      >
        <Columns3 className="h-4 w-4" />
      </button>

      {/* 구분선 */}
      <div className="mx-1 h-5 w-px bg-gray-200" />

      {/* 📌 셀 배경색 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
          title="셀 배경색"
        >
          <Paintbrush className="h-4 w-4" />
        </button>

        {/* 색상 피커 드롭다운 */}
        {showColorPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
            <div className="absolute top-full left-1/2 z-50 mt-2 w-44 -translate-x-1/2 rounded-lg border bg-white p-2 shadow-xl">
              <p className="mb-2 text-xs text-gray-500">셀 배경색</p>
              {/* 📌 프리셋 색상 그리드 */}
              <div className="grid grid-cols-5 gap-1">
                {CELL_BACKGROUND_COLORS.map((color, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setCellAttribute("backgroundColor", color.value).run()
                      setShowColorPicker(false)
                    }}
                    className={`h-6 w-6 rounded border-2 transition-transform hover:scale-110 ${
                      color.value === null
                        ? "relative overflow-hidden border-gray-300 bg-white"
                        : "border-gray-200"
                    }`}
                    style={{ backgroundColor: color.value || "transparent" }}
                    title={color.label}
                  >
                    {/* 투명 색상 표시 (대각선) */}
                    {color.value === null && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-0.5 w-full rotate-45 bg-red-500" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* 📌 자유 색상 선택 (컬러 피커) */}
              <div className="mt-2 flex items-center gap-2 border-t border-gray-200 pt-2">
                <span className="text-xs text-gray-500">직접 선택:</span>
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value)
                    editor.chain().focus().setCellAttribute("backgroundColor", e.target.value).run()
                  }}
                  className="h-6 w-6 cursor-pointer rounded border-0 p-0"
                  title="색상 직접 선택"
                />
                <span className="font-mono text-xs text-gray-600">{customColor}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 구분선 */}
      <div className="mx-1 h-5 w-px bg-gray-200" />

      {/* 📌 테이블 삭제 */}
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteTable().run()}
        className="rounded p-1.5 text-red-500 hover:bg-red-50"
        title="테이블 삭제"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </BubbleMenu>
  )
}

// ========================================
// 이미지 미디어 메뉴 (슬라이드/갤러리)
// ========================================

/**
 * 📌 이미지 미디어 메뉴
 *
 * 일상생활 비유:
 * 인스타그램에서 여러 사진을 한 번에 올릴 때 슬라이드/갤러리를 선택하는 것처럼,
 * 여러 이미지를 원하는 형태로 삽입할 수 있어요.
 */
function ImageMediaMenu({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 향후 에디터 상태 기반 UI 표시용
  editor: _editor,
  onSelectImages,
}: {
  editor: Editor
  onSelectImages: (type: "slider" | "gallery") => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="슬라이드/갤러리 삽입"
        className="rounded p-2 text-gray-600 transition-colors hover:bg-gray-100"
      >
        <Images className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 z-50 mt-2 w-48 rounded-lg border bg-white p-2 shadow-xl">
            <p className="mb-2 px-1 text-xs text-gray-500">멀티 이미지</p>

            {/* 슬라이드 삽입 */}
            <button
              type="button"
              onClick={() => {
                onSelectImages("slider")
                setIsOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-gray-100"
            >
              <GalleryHorizontal className="h-4 w-4" />
              <div>
                <p className="font-medium">슬라이드</p>
                <p className="text-xs text-gray-500">좌우로 넘기는 형태</p>
              </div>
            </button>

            {/* 갤러리 삽입 */}
            <button
              type="button"
              onClick={() => {
                onSelectImages("gallery")
                setIsOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-gray-100"
            >
              <Images className="h-4 w-4" />
              <div>
                <p className="font-medium">갤러리</p>
                <p className="text-xs text-gray-500">격자 형태로 배열</p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ========================================
// 메인 툴바 컴포넌트
// ========================================

/**
 * 에디터 툴바
 * 서식 버튼들을 모아놓은 도구 모음입니다
 */
function Toolbar({
  editor,
  onImageUpload,
  isUploading,
  onSelectMediaImages,
}: {
  editor: Editor | null
  onImageUpload: () => void
  isUploading: boolean
  onSelectMediaImages: (type: "slider" | "gallery") => void
}) {
  if (!editor) return null

  // 링크 추가 함수
  const addLink = () => {
    const url = prompt("링크 URL을 입력하세요:")
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div className="space-y-2 rounded-t-lg border-b border-gray-200 bg-gray-50 p-2">
      {/* 첫 번째 줄: 기본 서식 버튼 */}
      <div className="flex flex-wrap items-center gap-1">
        {/* 실행 취소/다시 실행 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="실행 취소 (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="다시 실행 (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* 제목 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          title="제목 1 (Ctrl+Alt+1)"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="제목 2 (Ctrl+Alt+2)"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* 텍스트 서식 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="굵게 (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="기울임 (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="밑줄 (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* 글씨 크기 */}
        <FontSizeSelector editor={editor} />

        {/* 📌 폰트 선택 */}
        <FontFamilySelector editor={editor} />

        <Divider />

        {/* 목록 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="글머리 기호 목록"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="번호 매기기 목록"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* 📌 글자 정렬 - 텍스트를 왼쪽/가운데/오른쪽으로 정렬 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          title="왼쪽 정렬"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          title="가운데 정렬"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
          title="오른쪽 정렬"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* 링크 & 이미지 */}
        <ToolbarButton onClick={addLink} isActive={editor.isActive("link")} title="링크 삽입">
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={onImageUpload}
          disabled={isUploading}
          title="이미지 업로드 (여러 장 선택 가능)"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </ToolbarButton>

        <Divider />

        {/* 📌 테이블 그리드 피커 */}
        <TableGridPicker editor={editor} />

        {/* 📌 슬라이드/갤러리 메뉴 */}
        <ImageMediaMenu editor={editor} onSelectImages={onSelectMediaImages} />
      </div>

      {/* 두 번째 줄: 인라인 컬러 피커 */}
      <div className="flex flex-wrap gap-2">
        <InlineColorPicker editor={editor} type="text" label="글자색" />
        <InlineColorPicker editor={editor} type="highlight" label="형광펜" />
      </div>
    </div>
  )
}

// ========================================
// FontSize 확장 (커스텀)
// ========================================

/**
 * 📌 커스텀 FontSize 확장
 *
 * TipTap의 TextStyle 확장을 확장해서 fontSize 속성을 추가합니다.
 */
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) return {}
          return { style: `font-size: ${attributes.fontSize}` }
        },
      },
    }
  },
})

// ========================================
// ResizableImage 확장 (NodeView 포함)
// ========================================

/**
 * 📌 커스텀 ResizableImage 확장
 *
 * NodeViewRenderer를 사용해서 ResizableImageComponent를 렌더링합니다.
 * 이렇게 하면 이미지 주변에 리사이즈 핸들, 정렬 버튼 등을 추가할 수 있어요.
 */
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // 이미지 너비
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width") || element.style.width || null,
        renderHTML: (attributes) => {
          if (!attributes.width) return {}
          return { width: attributes.width, style: `width: ${attributes.width}` }
        },
      },
      // 이미지 높이
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("height") || element.style.height || null,
        renderHTML: (attributes) => {
          if (!attributes.height) return {}
          return { height: attributes.height, style: `height: ${attributes.height}` }
        },
      },
      // 이미지 정렬
      alignment: {
        default: "left",
        parseHTML: (element) => element.getAttribute("data-alignment") || "left",
        renderHTML: (attributes) => {
          return { "data-alignment": attributes.alignment }
        },
      },
    }
  },

  // NodeView로 커스텀 컴포넌트 렌더링
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent)
  },

  // 📌 키보드 단축키
  addKeyboardShortcuts() {
    return {
      // Ctrl + 0: 원본 크기로 복원
      "Mod-0": () => {
        const { selection } = this.editor.state
        // 📌 왜 이렇게 하나요?
        // TipTap에서 Selection은 여러 종류가 있어요 (텍스트 선택, 노드 선택 등)
        // 이미지를 선택하면 NodeSelection이 되고, 이때만 node 속성이 있어요
        if (selection instanceof NodeSelection && selection.node.type.name === "image") {
          this.editor.commands.updateAttributes("image", {
            width: null,
            height: null,
          })
          return true
        }
        return false
      },
    }
  },
})

// ========================================
// 메인 에디터 컴포넌트
// ========================================

/**
 * 리치 텍스트 에디터 메인 컴포넌트
 *
 * 📌 사용 예시:
 * ```tsx
 * <RichTextEditor
 *   content={htmlContent}
 *   onChange={(html) => setHtmlContent(html)}
 *   placeholder="공지사항 내용을 입력하세요..."
 * />
 * ```
 */
export function RichTextEditor({
  content,
  onChange,
  placeholder = "내용을 입력하세요...",
}: RichTextEditorProps) {
  // 이미지 업로드 상태
  const [isUploading, setIsUploading] = useState(false)
  // 📌 업로드 진행 상태 (현재 파일 번호, 전체 수, 파일명)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  // 📌 드래그 앤 드롭 상태
  const [isDragging, setIsDragging] = useState(false)
  // 드래그 진입 횟수 카운터 (중첩된 요소 때문에 필요)
  const dragCounter = useRef(0)
  // 파일 입력 요소 참조
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 📌 멀티 이미지용 파일 입력 참조
  const mediaFileInputRef = useRef<HTMLInputElement>(null)
  // 📌 멀티 이미지 타입 (slider 또는 gallery)
  const [mediaType, setMediaType] = useState<"slider" | "gallery" | null>(null)
  // 📌 에디터 ref - 다중 이미지 업로드 버그 수정용
  // 왜 필요한가요? useCallback 안에서 editor를 직접 사용하면 "stale closure" 문제가 생길 수 있어요.
  // ref를 사용하면 항상 최신 editor 인스턴스를 참조할 수 있습니다.
  const editorRef = useRef<Editor | null>(null)

  // TipTap 에디터 인스턴스 생성
  const editor = useEditor({
    extensions: [
      // 📌 StarterKit에 Link, Underline이 포함됨 (Tiptap v3)
      // Link 설정은 StarterKit.configure 내에서 지정
      StarterKit.configure({
        link: {
          openOnClick: false,
        },
      }),
      ResizableImage, // 📌 리사이즈 가능한 이미지 확장
      FontSize,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      // 📌 텍스트 정렬 확장 - 워드처럼 텍스트를 정렬할 수 있어요
      TextAlign.configure({
        types: ["heading", "paragraph"], // 제목과 문단에 정렬 적용 가능
      }),
      // 📌 테이블 확장 - 워드처럼 표를 만들 수 있어요
      // 기본 tableCell을 비활성화하고 커스텀 TableCell 사용
      TableKit.configure({
        tableCell: false,
      }),
      // 📌 커스텀 TableCell - 배경색 속성 지원
      CustomTableCell,
      // 📌 폰트 확장 - 다양한 글꼴을 선택할 수 있어요
      FontFamily,
      // 📌 슬라이드/갤러리 이미지 확장
      ImageSlider,
      ImageGallery,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4",
      },
    },
    immediatelyRender: false,
  })

  /**
   * 📌 에디터 ref 동기화
   *
   * 왜 필요한가요?
   * - useCallback 안에서 editor를 직접 사용하면 "stale closure" 문제가 생겨요.
   * - 마치 사진을 찍으면 그 순간이 고정되듯이, useCallback도 만들어질 때의 값을 기억해요.
   * - 그래서 editor가 나중에 바뀌어도 옛날 값을 계속 참조하는 문제가 생겨요.
   * - ref를 사용하면 항상 "현재" editor를 가리키기 때문에 이 문제가 해결됩니다!
   */
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  /**
   * 📌 content prop 동기화
   *
   * 왜 필요한가요?
   * - TipTap의 useEditor는 content를 "초기값"으로만 사용해요.
   * - 마치 useState(초기값)처럼, 나중에 prop이 바뀌어도 자동 반영 안 돼요.
   * - 그래서 prop이 바뀌면 setContent 명령어로 직접 업데이트해야 해요!
   *
   * 일상생활 비유:
   * - TV가 켜진 후에도 리모컨으로 채널을 바꿀 수 있게 해주는 기능이에요.
   * - 처음 TV를 켰을 때 1번 채널이 나오더라도,
   *   나중에 리모컨으로 "5번!"이라고 하면 바꿔주는 것처럼요.
   */
  useEffect(() => {
    // 에디터가 아직 준비 안 됐으면 무시
    if (!editor) return

    // 📌 무한 루프 방지: 현재 내용과 같으면 건너뛰기
    // (setContent → onUpdate → onChange → content prop 변경 → setContent... 방지)
    const currentContent = editor.getHTML()
    if (currentContent === content) return

    // 📌 에디터 내용 업데이트
    editor.commands.setContent(content)
  }, [editor, content])

  /**
   * 📌 이미지 업로드 함수 (다중 파일 지원)
   *
   * 작동 순서:
   * 1. 이미지 파일만 필터링
   * 2. 각 파일마다: 압축 → URL 발급 → 업로드 → URL 수집
   * 3. 마지막에 모든 이미지를 한 번에 삽입
   *
   * 📌 왜 배열로 한 번에 삽입하나요?
   * for 루프에서 insertContent()를 매번 호출하면 ReactNodeViewRenderer와
   * ProseMirror 트랜잭션이 충돌해서 마지막 이미지만 삽입됩니다.
   * 배열로 한 번에 삽입하면 하나의 트랜잭션으로 처리되어 모든 이미지가 삽입됩니다.
   *
   * 일상생활 비유:
   * - ❌ 택배 10개를 한 개씩 10번 보내기 → 배송 충돌 가능
   * - ✅ 택배 10개를 한 박스에 넣어서 1번 보내기 → 확실히 도착
   */
  const uploadImages = useCallback(
    async (files: File[]) => {
      // 📌 editorRef.current를 사용해서 최신 editor 참조
      const currentEditor = editorRef.current
      if (!currentEditor || files.length === 0) return

      // 이미지 파일만 필터링
      const imageFiles = files.filter((file) => file.type.startsWith("image/"))

      if (imageFiles.length === 0) {
        toast.warning("이미지 파일만 업로드할 수 있습니다.")
        return
      }

      setIsUploading(true)

      // 📌 1단계: 모든 이미지 URL을 먼저 수집
      const uploadedImageUrls: string[] = []

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]

        try {
          // 진행률 업데이트 (UI 표시용)
          setUploadProgress({
            current: i + 1,
            total: imageFiles.length,
            fileName: file.name,
          })

          // 1. 이미지 압축
          const compressed = await compressImage(file)

          // 2. Presigned URL 발급
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileExtension: "jpg",
              contentType: "image/jpeg",
              folder: "announcement-images",
            }),
          })

          if (!res.ok) {
            throw new Error("업로드 URL 발급 실패")
          }

          const { uploadUrl, imageUrl } = await res.json()

          // 3. R2 스토리지에 업로드
          const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            body: compressed,
            headers: { "Content-Type": "image/jpeg" },
          })

          if (!uploadRes.ok) {
            throw new Error("이미지 업로드 실패")
          }

          // 📌 URL을 배열에 추가 (아직 삽입 안 함!)
          uploadedImageUrls.push(imageUrl)
        } catch (error) {
          // 📌 개별 파일 에러는 로그만 남기고 다음 파일 계속 처리
          console.error(`이미지 업로드 실패: ${file.name}`, error)
        }
      }

      // 📌 2단계: 모든 이미지를 한 번에 삽입
      // 배열을 사용하면 TipTap이 하나의 트랜잭션으로 처리하여 충돌 없음
      if (uploadedImageUrls.length > 0) {
        currentEditor
          .chain()
          .focus()
          .insertContent(
            uploadedImageUrls.map((url) => ({
              type: "image",
              attrs: { src: url },
            }))
          )
          .run()
      }

      // 업로드 완료 처리
      setIsUploading(false)
      setUploadProgress(null)
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [] // 📌 dependency 없음 - editorRef 사용으로 항상 최신 editor 참조
  )

  /**
   * 파일 입력 변경 핸들러
   */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    await uploadImages(Array.from(files))
  }

  /**
   * 파일 선택 다이얼로그 열기
   */
  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  // ========================================
  // 📌 멀티 이미지 (슬라이드/갤러리) 핸들러
  // ========================================

  /**
   * 📌 멀티 이미지 선택 시작
   * 슬라이드 또는 갤러리 타입을 설정하고 파일 선택 다이얼로그를 엽니다.
   */
  const handleSelectMediaImages = useCallback((type: "slider" | "gallery") => {
    setMediaType(type)
    mediaFileInputRef.current?.click()
  }, [])

  /**
   * 📌 멀티 이미지 업로드 핸들러
   * 선택한 이미지들을 업로드하고 슬라이드 또는 갤러리로 삽입합니다.
   */
  const handleMediaImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0 || !mediaType) return

      const currentEditor = editorRef.current
      if (!currentEditor) return

      // 이미지 파일만 필터링
      const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"))

      if (imageFiles.length < 2) {
        toast.warning("슬라이드/갤러리는 2장 이상의 이미지가 필요합니다.")
        setMediaType(null)
        if (mediaFileInputRef.current) {
          mediaFileInputRef.current.value = ""
        }
        return
      }

      setIsUploading(true)
      const uploadedUrls: string[] = []

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]

        try {
          setUploadProgress({
            current: i + 1,
            total: imageFiles.length,
            fileName: file.name,
          })

          // 이미지 압축
          const compressed = await compressImage(file)

          // Presigned URL 발급
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileExtension: "jpg",
              contentType: "image/jpeg",
              folder: "announcement-images",
            }),
          })

          if (!res.ok) throw new Error("업로드 URL 발급 실패")

          const { uploadUrl, imageUrl } = await res.json()

          // R2 스토리지에 업로드
          const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            body: compressed,
            headers: { "Content-Type": "image/jpeg" },
          })

          if (!uploadRes.ok) throw new Error("이미지 업로드 실패")

          uploadedUrls.push(imageUrl)
        } catch (error) {
          console.error(`이미지 업로드 실패: ${file.name}`, error)
        }
      }

      // 업로드된 이미지가 있으면 노드 삽입
      if (uploadedUrls.length >= 2) {
        // 에디터 뷰가 준비되었는지 확인
        if (currentEditor.isDestroyed || !currentEditor.view) {
          toast.warning("에디터가 준비되지 않았습니다. 다시 시도해주세요.")
          return
        }

        if (mediaType === "slider") {
          currentEditor
            .chain()
            .focus()
            .insertContent({
              type: "imageSlider",
              attrs: { images: uploadedUrls },
            })
            .run()
        } else {
          currentEditor
            .chain()
            .focus()
            .insertContent({
              type: "imageGallery",
              attrs: { images: uploadedUrls },
            })
            .run()
        }
      } else {
        toast.error("이미지 업로드에 실패했습니다. 다시 시도해주세요.")
      }

      // 상태 초기화
      setIsUploading(false)
      setUploadProgress(null)
      setMediaType(null)
      if (mediaFileInputRef.current) {
        mediaFileInputRef.current.value = ""
      }
    },
    [mediaType]
  )

  // ========================================
  // 📌 드래그 앤 드롭 핸들러
  // ========================================

  /**
   * 드래그 진입 시
   * - 파일을 드래그하면 시각적 피드백 표시
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true)
    }
  }, [])

  /**
   * 드래그 이탈 시
   * - 카운터로 중첩된 요소 처리
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }, [])

  /**
   * 드래그 오버 시
   * - 기본 동작 방지 (브라우저가 파일 열지 않도록)
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  /**
   * 📌 드롭 시 이미지 업로드
   */
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      dragCounter.current = 0
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      const imageFiles = files.filter((file) => file.type.startsWith("image/"))

      if (imageFiles.length > 0) {
        await uploadImages(imageFiles)
      }
    },
    [uploadImages]
  )

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-gray-200 bg-white"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 숨겨진 파일 입력 - 일반 이미지용 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* 📌 숨겨진 파일 입력 - 슬라이드/갤러리용 */}
      <input
        ref={mediaFileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleMediaImageUpload}
        className="hidden"
      />

      {/* 📌 드래그 오버레이 - 파일 드래그 시 표시 */}
      {isDragging && (
        <div className="bg-primary/10 border-primary absolute inset-0 z-30 flex items-center justify-center rounded-lg border-2 border-dashed">
          <div className="text-center">
            <Upload className="text-primary mx-auto mb-2 h-10 w-10" />
            <p className="text-primary font-medium">이미지를 여기에 놓으세요</p>
          </div>
        </div>
      )}

      {/* 툴바 */}
      <Toolbar
        editor={editor}
        onImageUpload={triggerFileInput}
        isUploading={isUploading}
        onSelectMediaImages={handleSelectMediaImages}
      />

      {/* 📌 테이블 플로팅 툴바 - 테이블 안을 클릭하면 나타남 */}
      {/* editor.view?.docView 체크: Race Condition 방지 - 뷰가 완전히 준비된 후에만 렌더링 */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {editor && !!(editor.view as any)?.docView && <TableFloatingToolbar editor={editor} />}

      {/* 에디터 본문 */}
      <EditorContent
        editor={editor}
        className="[&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:p-4 [&_.ProseMirror]:focus:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
        data-placeholder={placeholder}
      />

      {/* 📌 업로드 진행률 표시 */}
      {uploadProgress && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <Loader2 className="text-primary h-5 w-5 animate-spin" />

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-gray-700">
                  이미지 업로드 중 ({uploadProgress.current}/{uploadProgress.total})
                </span>
                <span className="text-gray-500">
                  {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                </span>
              </div>

              {/* 진행률 바 */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="bg-primary h-full transition-all duration-300 ease-out"
                  style={{
                    width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                  }}
                />
              </div>

              <p className="mt-1 truncate text-xs text-gray-500">{uploadProgress.fileName}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
