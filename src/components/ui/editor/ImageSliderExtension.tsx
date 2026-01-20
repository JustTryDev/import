"use client"

/**
 * 📌 이미지 슬라이더 확장
 *
 * TipTap 에디터에서 여러 이미지를 슬라이드 형태로 보여주는 커스텀 노드입니다.
 * Swiper 라이브러리를 사용하여 좌우 스와이프가 가능한 캐러셀을 렌더링합니다.
 */

import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react"
import { useState } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import { Navigation, Pagination, A11y } from "swiper/modules"
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react"

// Swiper 스타일 import
import "swiper/css"
import "swiper/css/navigation"
import "swiper/css/pagination"

// ========================================
// 슬라이더 노드 컴포넌트
// ========================================

/**
 * 📌 ImageSliderComponent
 *
 * 일상생활 비유:
 * 인스타그램에서 여러 사진을 올리면 좌우로 넘길 수 있는 것처럼,
 * 여러 이미지를 슬라이드 형태로 보여줍니다.
 */
function ImageSliderComponent({ node, deleteNode, selected }: NodeViewProps) {
  const images = node.attrs.images as string[]
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!images || images.length === 0) {
    return (
      <NodeViewWrapper className="my-4">
        <div className="bg-gray-100 p-8 rounded-lg text-center text-gray-500">
          이미지가 없습니다
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="my-4">
      <div
        className={`relative rounded-lg overflow-hidden ${
          selected ? "ring-2 ring-primary ring-offset-2" : ""
        }`}
      >
        {/* Swiper 슬라이더 */}
        <Swiper
          modules={[Navigation, Pagination, A11y]}
          spaceBetween={0}
          slidesPerView={1}
          navigation={{
            prevEl: ".swiper-button-prev-custom",
            nextEl: ".swiper-button-next-custom",
          }}
          pagination={{ clickable: true }}
          onSlideChange={(swiper) => setCurrentIndex(swiper.activeIndex)}
          className="image-slider"
        >
          {images.map((src, index) => (
            <SwiperSlide key={index}>
              {/* 정사각형 비율로 이미지 꽉 채움 */}
              <div className="aspect-square bg-gray-100">
                <img
                  src={src}
                  alt={`슬라이드 ${index + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* 커스텀 네비게이션 버튼 */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              className="swiper-button-prev-custom absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="swiper-button-next-custom absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* 이미지 인덱스 표시 */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded-full z-10">
          {currentIndex + 1} / {images.length}
        </div>

        {/* 삭제 버튼 - 선택 시에만 표시 */}
        {selected && (
          <button
            type="button"
            onClick={() => deleteNode()}
            className="absolute top-2 right-2 z-20 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-lg"
            title="슬라이더 삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </NodeViewWrapper>
  )
}

// ========================================
// TipTap 확장 정의
// ========================================

/**
 * 📌 ImageSlider 확장
 *
 * TipTap에서 사용할 수 있는 커스텀 노드입니다.
 * images 배열에 이미지 URL들을 저장합니다.
 */
export const ImageSlider = Node.create({
  name: "imageSlider",
  group: "block",
  atom: true, // 내부 편집 불가
  draggable: true, // 드래그 가능

  addAttributes() {
    return {
      // 이미지 URL 배열
      images: {
        default: [],
        parseHTML: (element) => {
          const data = element.getAttribute("data-images")
          return data ? JSON.parse(data) : []
        },
        renderHTML: (attributes) => {
          return {
            "data-images": JSON.stringify(attributes.images),
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="image-slider"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "image-slider" })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageSliderComponent)
  },
})

export default ImageSlider
