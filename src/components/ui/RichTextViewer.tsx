"use client"

/**
 * 📌 리치 텍스트 뷰어 컴포넌트
 *
 * RichTextEditor로 작성된 HTML 콘텐츠를 보여주는 뷰어입니다.
 * 슬라이드와 갤러리 커스텀 노드를 인식하여 적절한 컴포넌트로 렌더링합니다.
 *
 * 🔒 보안: DOMPurify로 XSS 공격 방지
 */

import { useMemo, useState } from "react"
import DOMPurify from "isomorphic-dompurify"
import { Swiper, SwiperSlide } from "swiper/react"
import { Navigation, Pagination, A11y } from "swiper/modules"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

// Swiper 스타일
import "swiper/css"
import "swiper/css/navigation"
import "swiper/css/pagination"

// ========================================
// 슬라이더 뷰어 컴포넌트
// ========================================

function ImageSliderViewer({ images }: { images: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!images || images.length === 0) return null

  return (
    <div className="my-6 relative viewer-image-slider">
      <Swiper
        modules={[Navigation, Pagination, A11y]}
        spaceBetween={0}
        slidesPerView={1}
        navigation={{
          prevEl: ".viewer-swiper-prev",
          nextEl: ".viewer-swiper-next",
        }}
        pagination={{ clickable: true }}
        onSlideChange={(swiper) => setCurrentIndex(swiper.activeIndex)}
        className="rounded-xl overflow-hidden"
      >
        {images.map((src, index) => (
          <SwiperSlide key={index}>
            {/* 정사각형 비율로 이미지 꽉 채움 */}
            <div className="aspect-square bg-gray-100">
              <img
                src={src}
                alt={`슬라이드 ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* 네비게이션 버튼 */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="viewer-swiper-prev absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <button
            type="button"
            className="viewer-swiper-next absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        </>
      )}

      {/* 인덱스 표시 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full z-10">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  )
}

// ========================================
// 갤러리 뷰어 컴포넌트
// ========================================

function ImageGalleryViewer({ images, columns = 3 }: { images: string[]; columns?: number }) {
  const [lightboxIndex, setLightboxIndex] = useState(-1)

  if (!images || images.length === 0) return null

  // 열 수에 따른 그리드 클래스 매핑
  const gridClass = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[columns] || "grid-cols-3"

  return (
    <>
      {/* 정사각형 CSS 그리드 갤러리 */}
      <div className="my-6 viewer-image-gallery">
        <div className={`grid ${gridClass} gap-2`}>
          {images.map((src, index) => (
            <div
              key={index}
              className="aspect-square bg-gray-100 overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setLightboxIndex(index)}
            >
              <img
                src={src}
                alt={`갤러리 ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
        <div className="text-center text-sm text-gray-500 mt-2">
          {images.length}장의 이미지
        </div>
      </div>

      {/* 라이트박스 */}
      {lightboxIndex >= 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIndex(-1)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-3 text-white hover:bg-white/20 rounded-full transition-colors"
            onClick={() => setLightboxIndex(-1)}
          >
            <X className="w-6 h-6" />
          </button>

          {/* 이전 버튼 */}
          {lightboxIndex > 0 && (
            <button
              type="button"
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/20 rounded-full transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex(lightboxIndex - 1)
              }}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          <img
            src={images[lightboxIndex]}
            alt={`이미지 ${lightboxIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* 다음 버튼 */}
          {lightboxIndex < images.length - 1 && (
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/20 rounded-full transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex(lightboxIndex + 1)
              }}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  )
}

// ========================================
// HTML 파싱 및 렌더링
// ========================================

interface RichTextViewerProps {
  content: string
  className?: string
}

// 🔒 DOMPurify 설정: 슬라이더/갤러리용 data 속성은 허용
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li",
    "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "code",
    "img", "div", "span", "table", "thead", "tbody", "tr", "th", "td",
    "mark", "sub", "sup"
  ],
  ALLOWED_ATTR: [
    "href", "src", "alt", "title", "class", "style", "target", "rel",
    "data-type", "data-images", "data-columns", "data-slider-index", "data-gallery-index",
    "width", "height", "colspan", "rowspan"
  ],
  ALLOW_DATA_ATTR: true,
  // javascript: 프로토콜 차단
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
}

export function RichTextViewer({ content, className = "" }: RichTextViewerProps) {
  // HTML 파싱하여 슬라이드/갤러리 노드 추출
  const parsedContent = useMemo(() => {
    if (!content) return { html: "", sliders: [], galleries: [] }

    // 🔒 XSS 방지: DOMPurify로 HTML 정제
    const sanitizedContent = DOMPurify.sanitize(content, DOMPURIFY_CONFIG)

    // DOM Parser 사용
    const parser = new DOMParser()
    const doc = parser.parseFromString(sanitizedContent, "text/html")

    const sliders: string[][] = []
    // 갤러리는 이미지 + 열 수 정보를 함께 저장
    const galleries: { images: string[]; columns: number }[] = []

    // 슬라이더 노드 찾기
    const sliderNodes = doc.querySelectorAll('[data-type="image-slider"]')
    sliderNodes.forEach((node, index) => {
      const imagesAttr = node.getAttribute("data-images")
      if (imagesAttr) {
        try {
          const images = JSON.parse(imagesAttr)
          sliders.push(images)
          // 플레이스홀더로 교체
          node.outerHTML = `<div data-slider-index="${index}"></div>`
        } catch {
          // JSON 파싱 실패 시 무시
        }
      }
    })

    // 갤러리 노드 찾기
    const galleryNodes = doc.querySelectorAll('[data-type="image-gallery"]')
    galleryNodes.forEach((node, index) => {
      const imagesAttr = node.getAttribute("data-images")
      const columnsAttr = node.getAttribute("data-columns")
      if (imagesAttr) {
        try {
          const images = JSON.parse(imagesAttr)
          const columns = columnsAttr ? parseInt(columnsAttr, 10) : 3
          galleries.push({ images, columns })
          // 플레이스홀더로 교체
          node.outerHTML = `<div data-gallery-index="${index}"></div>`
        } catch {
          // JSON 파싱 실패 시 무시
        }
      }
    })

    return {
      html: doc.body.innerHTML,
      sliders,
      galleries,
    }
  }, [content])

  // 슬라이더/갤러리가 없으면 단순 HTML 렌더링
  // 🔒 XSS 방지: parsedContent.html은 이미 DOMPurify로 정제됨
  if (parsedContent.sliders.length === 0 && parsedContent.galleries.length === 0) {
    return (
      <div
        className={`prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-primary prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 ${className}`}
        dangerouslySetInnerHTML={{ __html: parsedContent.html }}
      />
    )
  }

  // HTML을 React 컴포넌트로 변환하여 슬라이더/갤러리 삽입
  const renderContent = () => {
    const parts = parsedContent.html.split(/<div data-(slider|gallery)-index="(\d+)"><\/div>/g)
    const elements: React.ReactNode[] = []

    let i = 0
    while (i < parts.length) {
      const part = parts[i]

      if (part === "slider") {
        // 다음 파트가 인덱스
        const index = parseInt(parts[i + 1], 10)
        elements.push(
          <ImageSliderViewer key={`slider-${index}`} images={parsedContent.sliders[index]} />
        )
        i += 2
      } else if (part === "gallery") {
        // 다음 파트가 인덱스
        const index = parseInt(parts[i + 1], 10)
        const gallery = parsedContent.galleries[index]
        elements.push(
          <ImageGalleryViewer
            key={`gallery-${index}`}
            images={gallery.images}
            columns={gallery.columns}
          />
        )
        i += 2
      } else if (part) {
        // 일반 HTML
        elements.push(
          <div
            key={`html-${i}`}
            className={`prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-primary prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 ${className}`}
            dangerouslySetInnerHTML={{ __html: part }}
          />
        )
        i += 1
      } else {
        i += 1
      }
    }

    return elements
  }

  return <div className="rich-text-viewer">{renderContent()}</div>
}

export default RichTextViewer
