"use client"

import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Package } from "lucide-react"
import type { Product } from "@/types/shipping"
import type { ProductCalculationResult } from "@/types/shipping"
import { ProductCard, createEmptyProduct } from "./ProductCard"
import { roundCbmToHalf, calculateTotalCbm } from "@/lib/calculations"

interface ProductListProps {
  products: Product[]
  setProducts: (products: Product[]) => void
  // 제품별 계산 결과 (외부에서 전달)
  productResults?: ProductCalculationResult[]
}

/**
 * 제품 목록 컴포넌트
 *
 * 📌 비유: 쇼핑몰 장바구니
 * - 여러 상품을 담을 수 있음
 * - 상품 추가/삭제 가능
 * - 각 상품의 가격과 수량을 개별 관리
 * - 총 합계는 별도로 계산
 */
export function ProductList({
  products,
  setProducts,
  productResults,
}: ProductListProps) {
  // 제품 추가
  const handleAddProduct = useCallback(() => {
    const newId = `product-${Date.now()}`
    setProducts([...products, createEmptyProduct(newId)])
  }, [products, setProducts])

  // 제품 삭제
  const handleDeleteProduct = useCallback((id: string) => {
    // 최소 1개는 유지
    if (products.length <= 1) return
    setProducts(products.filter((p) => p.id !== id))
  }, [products, setProducts])

  // 제품 수정
  const handleUpdateProduct = useCallback((updated: Product) => {
    setProducts(products.map((p) => (p.id === updated.id ? updated : p)))
  }, [products, setProducts])

  // 전체 CBM 계산
  const totalCbm = products.reduce((sum, p) => {
    return sum + calculateTotalCbm(p.dimensions, p.quantity)
  }, 0)
  const roundedTotalCbm = roundCbmToHalf(totalCbm)

  // 제품별 개당 수입원가 맵 생성
  const unitCostMap = new Map<string, number>()
  productResults?.forEach((result) => {
    unitCostMap.set(result.productId, result.unitCost)
  })

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">제품 목록</h3>
          <span className="text-xs text-gray-400">({products.length}개)</span>
        </div>
        <div className="flex items-center gap-3">
          {/* 전체 CBM 표시: 실제 CBM + 적용 CBM */}
          {totalCbm > 0 && (
            <div className="flex items-center gap-2 text-xs">
              {/* 실제 CBM (소수점 2자리) */}
              <span className="text-gray-500">
                실제: <span className="font-mono">{totalCbm.toFixed(2)}</span>
              </span>
              <span className="text-gray-300">→</span>
              {/* 적용 CBM (0.5 단위 반올림) */}
              <span className="text-gray-500">
                적용: <span className="font-medium text-primary">{roundedTotalCbm.toFixed(1)}</span>
              </span>
            </div>
          )}
          {/* 제품 추가 버튼 */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleAddProduct}
          >
            <Plus className="h-3 w-3 mr-1" />
            제품 추가
          </Button>
        </div>
      </div>

      {/* 제품 카드 목록 */}
      <div className="space-y-2">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            onUpdate={handleUpdateProduct}
            onDelete={() => handleDeleteProduct(product.id)}
            canDelete={products.length > 1}
            unitCost={unitCostMap.get(product.id) ?? null}
          />
        ))}
      </div>

      {/* 제품이 없을 때 (이론상 불가능하지만 방어 코드) */}
      {products.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">제품을 추가해주세요</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={handleAddProduct}
          >
            <Plus className="h-3 w-3 mr-1" />
            첫 번째 제품 추가
          </Button>
        </div>
      )}
    </div>
  )
}
