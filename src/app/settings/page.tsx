"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Building2, Truck, DollarSign, Factory } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import Link from "next/link"
import { useSeedData } from "@/hooks"

// 관리 컴포넌트들
import { ShippingCompanyManager } from "@/components/calculator/admin/ShippingCompanyManager"
import { ShippingRateManager } from "@/components/calculator/admin/ShippingRateManager"
import { CompanyCostManager } from "@/components/calculator/admin/CompanyCostManager"
import { FactoryManager } from "@/components/calculator/admin/FactoryManager"

// 관리자 설정 페이지
export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("companies")
  const { seedAll, isSeeding } = useSeedData()

  // URL 쿼리로 탭 설정
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && ["companies", "rates", "companyCosts", "factories"].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                돌아가기
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">설정</h1>
              <p className="text-sm text-gray-500">
                운송 업체, 운임 요금, 비용 항목을 관리합니다
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-5xl mx-auto p-4">
        {/* 초기 데이터 시드 버튼 */}
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">
                처음 사용 시 기본 데이터를 생성해주세요
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Gofort 업체 및 운임 테이블이 자동으로 추가됩니다
              </p>
            </div>
            <Button
              onClick={seedAll}
              disabled={isSeeding}
              variant="outline"
              className="border-yellow-400 text-yellow-700 hover:bg-yellow-100"
            >
              {isSeeding ? "생성 중..." : "기본 데이터 생성"}
            </Button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full mb-6">
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">운송 업체</span>
            </TabsTrigger>
            <TabsTrigger value="rates" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">운임 요금</span>
            </TabsTrigger>
            <TabsTrigger value="companyCosts" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">공통 비용</span>
            </TabsTrigger>
            <TabsTrigger value="factories" className="flex items-center gap-2">
              <Factory className="h-4 w-4" />
              <span className="hidden sm:inline">중국 공장</span>
            </TabsTrigger>
          </TabsList>

          {/* 운송 업체 관리 */}
          <TabsContent value="companies">
            <ShippingCompanyManager />
          </TabsContent>

          {/* 운임 요금 관리 */}
          <TabsContent value="rates">
            <ShippingRateManager />
          </TabsContent>

          {/* 업체별 공통 비용 관리 */}
          <TabsContent value="companyCosts">
            <CompanyCostManager />
          </TabsContent>

          {/* 중국 공장 관리 */}
          <TabsContent value="factories">
            <FactoryManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
