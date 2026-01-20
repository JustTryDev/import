import type { Metadata } from "next"
import { Toaster } from "sonner"
import "./globals.css"

/**
 * 📌 메타데이터 설정
 * 프로젝트에 맞게 title과 description을 수정하세요
 */
export const metadata: Metadata = {
  title: "My Project",
  description: "프로젝트 설명을 여기에 작성하세요",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
        {/* 토스트 알림 (sonner) */}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  )
}
