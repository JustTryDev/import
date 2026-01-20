"use client"

import { ConvexProvider, ConvexReactClient } from "convex/react"
import { ReactNode } from "react"

// Convex 클라이언트 인스턴스 생성
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

interface ConvexClientProviderProps {
  children: ReactNode
}

// Convex Provider 컴포넌트
export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}
