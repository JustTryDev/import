import type { Metadata } from "next"
import { Toaster } from "sonner"
import { ConvexClientProvider } from "./ConvexClientProvider"
import "./globals.css"

/**
 * 📌 메타데이터 설정
 */
export const metadata: Metadata = {
  title: "수입원가 계산기",
  description: "실시간 환율과 물류비용을 포함한 정확한 수입원가 계산",
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
      <body className="antialiased" suppressHydrationWarning>
        {/* Convex 실시간 데이터베이스 Provider */}
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
        {/* 토스트 알림 (sonner) */}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  )
}
