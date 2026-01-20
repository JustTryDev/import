import type { Metadata } from "next"
import { Toaster } from "sonner"
import "./globals.css"

/**
 * 📌 메타데이터 설정
 */
export const metadata: Metadata = {
  title: "수입원가 계산기",
  description: "실시간 환율로 외화 금액을 원화로 환산합니다",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard 폰트 로드 */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="antialiased">
        {children}
        {/* 토스트 알림 (sonner) */}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  )
}
