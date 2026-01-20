"use client"

/**
 * 📌 이미지 갤러리 확장
 *
 * TipTap 에디터에서 여러 이미지를 정사각형 그리드 형태로 보여주는 커스텀 노드입니다.
 * CSS 그리드를 사용하여 3열 정사각형 갤러리를 렌더링합니다.
 */

import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react"
import { useState } from "react"
import { Trash2, X, Grid2X2, Grid3X3, LayoutGrid } from "lucide-react"

// ========================================
// 갤러리 노드 컴포넌트
// ========================================

/**
 * 📌 ImageGalleryComponent
 *
 * 일상생활 비유:
 * 네이버 블로그에서 여러 사진을 한 번에 올리면 격자 형태로 정렬되는 것처럼,
 * 여러 이미지를 깔끔한 그리드로 보여줍니다.
 */
function ImageGalleryComponent({ node, deleteNode, selected, updateAttributes }: NodeViewProps) {
  const images = node.attrs.images as string[]
  const columns = (node.attrs.columns as number) || 3
  const [lightboxIndex, setLightboxIndex] = useState(-1)

  // 열 수에 따른 그리드 클래스 매핑
  const gridClass = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[columns] || "grid-cols-3"

  // 열 수 변경 함수
  const handleColumnsChange = (newColumns: number) => {
    updateAttributes({ columns: newColumns })
  }

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
        {/* 열 수 선택 UI - 선택 시에만 표시 */}
        {selected && (
          <div className="absolute top-2 left-2 z-20 flex gap-1 bg-white/95 p-1 rounded-lg shadow-lg">
            <button
              type="button"
              onClick={() => handleColumnsChange(2)}
              className={`p-1.5 rounded transition-colors ${
                columns === 2
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title="2열"
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleColumnsChange(3)}
              className={`p-1.5 rounded transition-colors ${
                columns === 3
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title="3열"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleColumnsChange(4)}
              className={`p-1.5 rounded transition-colors ${
                columns === 4
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title="4열"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 정사각형 CSS 그리드 갤러리 */}
        <div className="p-2 bg-gray-50 rounded-lg">
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
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 이미지 개수 표시 */}
        <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
          {images.length}장
        </div>

        {/* 삭제 버튼 - 선택 시에만 표시 */}
        {selected && (
          <button
            type="button"
            onClick={() => deleteNode()}
            className="absolute top-2 right-2 z-20 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-lg"
            title="갤러리 삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 라이트박스 (이미지 확대 보기) */}
      {lightboxIndex >= 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIndex(-1)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full"
            onClick={() => setLightboxIndex(-1)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={images[lightboxIndex]}
            alt={`이미지 ${lightboxIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </NodeViewWrapper>
  )
}

// ========================================
// TipTap 확장 정의
// ========================================

/**
 * 📌 ImageGallery 확장
 *
 * TipTap에서 사용할 수 있는 커스텀 노드입니다.
 * images 배열에 이미지 URL들을 저장합니다.
 */
export const ImageGallery = Node.create({
  name: "imageGallery",
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
      // 갤러리 열 수 (2, 3, 4열 선택 가능)
      columns: {
        default: 3,
        parseHTML: (element) => {
          const data = element.getAttribute("data-columns")
          return data ? parseInt(data, 10) : 3
        },
        renderHTML: (attributes) => {
          return {
            "data-columns": String(attributes.columns),
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="image-gallery"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "image-gallery" })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageGalleryComponent)
  },
})

export default ImageGallery
