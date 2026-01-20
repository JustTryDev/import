import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * 📌 메인 페이지 (예시)
 *
 * 이 파일은 스타터킷의 예시 페이지입니다.
 * 프로젝트에 맞게 수정하거나 삭제하세요.
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* 히어로 섹션 */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">
            Next.js 스타터킷
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            재사용 가능한 컴포넌트, 훅, 유틸리티가 포함된 스타터킷입니다.
            <br />
            바로 개발을 시작하세요!
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg">시작하기</Button>
            <Button size="lg" variant="outline">
              문서 보기
            </Button>
          </div>
        </div>
      </section>

      {/* 기능 카드 섹션 */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>커스텀 훅</CardTitle>
              <CardDescription>자주 사용하는 로직을 재사용</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• useDebounce - 입력 지연</li>
                <li>• usePagination - 페이지네이션</li>
                <li>• useCountUp - 숫자 애니메이션</li>
                <li>• useScrollAnimation - 스크롤 효과</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>유틸리티 함수</CardTitle>
              <CardDescription>포맷팅 및 헬퍼 함수</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• formatPrice - 금액 포맷</li>
                <li>• formatTimeAgo - 상대 시간</li>
                <li>• compressImage - 이미지 압축</li>
                <li>• KST 날짜 유틸리티</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>UI 컴포넌트</CardTitle>
              <CardDescription>shadcn/ui 기반 컴포넌트</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Button, Input, Card 등</li>
                <li>• RichTextEditor - 리치 에디터</li>
                <li>• Pagination - 페이지네이션</li>
                <li>• StatusBadge - 상태 배지</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>Next.js Starter Kit • Built with shadcn/ui</p>
        </div>
      </footer>
    </main>
  )
}
