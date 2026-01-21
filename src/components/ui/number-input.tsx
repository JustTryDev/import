"use client"

import { useState, useCallback } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface NumberInputProps {
  value: number | string
  onChange: (value: string) => void
  min?: number
  max?: number
  step?: number           // 증감 단위 (기본: 1)
  decimal?: number        // 소수점 자릿수 (기본: 0 = 정수)
  placeholder?: string
  className?: string
  inputClassName?: string
  prefix?: string         // 앞에 붙는 기호 ($, ¥ 등)
  suffix?: string         // 뒤에 붙는 기호 (%, cm 등)
  align?: "left" | "center" | "right"
  size?: "sm" | "md"      // 크기 (기본: md)
  showButtons?: boolean   // +/- 버튼 표시 여부 (기본: true)
}

/**
 * 숫자 입력 컴포넌트 (카운팅 기능 포함)
 *
 * 📌 비유: 쇼핑몰 장바구니의 수량 조절 버튼
 * - 직접 숫자 입력 가능
 * - 위/아래 버튼으로 증감 가능
 * - 최소/최대값 제한 가능
 */
export function NumberInput({
  value,
  onChange,
  min = 0,
  max = 1000000,
  step = 1,
  decimal = 0,
  placeholder = "0",
  className,
  inputClassName,
  prefix,
  suffix,
  align = "right",
  size = "md",
  showButtons = true,
}: NumberInputProps) {
  // 포커스 상태 (버튼 표시용)
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // 숫자 파싱 (빈 문자열이면 0)
  const numValue = typeof value === "string"
    ? parseFloat(value.replace(/,/g, "")) || 0
    : value

  // 증가
  const handleIncrement = useCallback(() => {
    const newValue = Math.min(numValue + step, max)
    onChange(decimal > 0 ? newValue.toFixed(decimal) : String(newValue))
  }, [numValue, step, max, decimal, onChange])

  // 감소
  const handleDecrement = useCallback(() => {
    const newValue = Math.max(numValue - step, min)
    onChange(decimal > 0 ? newValue.toFixed(decimal) : String(newValue))
  }, [numValue, step, min, decimal, onChange])

  // 표시값 포맷팅
  const displayValue = numValue > 0
    ? numValue.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimal,
      })
    : ""

  // 크기별 스타일
  const sizeStyles = {
    sm: "h-7 text-xs",
    md: "h-9 text-sm",
  }

  const buttonSizeStyles = {
    sm: "h-3 w-4",
    md: "h-4 w-5",
  }

  // 정렬 스타일
  const alignStyles = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 접두사 (통화 기호 등) */}
      {prefix && (
        <span className={cn(
          "absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none",
          size === "sm" ? "text-xs" : "text-sm"
        )}>
          {prefix}
        </span>
      )}

      {/* 입력 필드 */}
      <input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          "w-full border border-gray-200 rounded-md outline-none transition-all",
          "focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
          sizeStyles[size],
          alignStyles[align],
          prefix ? "pl-6" : "pl-2",
          suffix ? "pr-8" : showButtons ? "pr-6" : "pr-2",
          inputClassName
        )}
      />

      {/* 접미사 (단위 등) */}
      {suffix && (
        <span className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none",
          size === "sm" ? "text-xs" : "text-sm",
          showButtons && "right-7"
        )}>
          {suffix}
        </span>
      )}

      {/* 증감 버튼 (호버 또는 포커스 시 표시) */}
      {showButtons && (isFocused || isHovered) && (
        <div className="absolute right-0.5 top-1/2 -translate-y-1/2 flex flex-col">
          <button
            type="button"
            onClick={handleIncrement}
            className={cn(
              "flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-sm transition-colors",
              buttonSizeStyles[size]
            )}
            tabIndex={-1}
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            className={cn(
              "flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-sm transition-colors",
              buttonSizeStyles[size]
            )}
            tabIndex={-1}
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
