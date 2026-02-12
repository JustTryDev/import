"use client"

import { useState, useEffect } from "react"
import { Truck, Factory, Bookmark, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useSeedData } from "@/hooks"

// 관리 컴포넌트들
import { ShippingManager } from "./ShippingManager"
import { FactoryManager } from "./FactoryManager"
import { PresetManager } from "./PresetManager"
import { CostSettingsManager } from "./CostSettingsManager"

// 탭 타입 (3개 탭을 "shipping" 하나로 통합)
type SettingsTab = "shipping" | "factories" | "presets" | "costSettings"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: SettingsTab
}

// 설정 모달 컴포넌트
export function SettingsModal({
  open,
  onOpenChange,
  defaultTab = "shipping",
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab)
  const { seedAll, isSeeding } = useSeedData()

  // defaultTab이 변경되면 activeTab 업데이트
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab)
    }
  }, [open, defaultTab])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1000px] w-[90vw] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>설정</DialogTitle>
        </DialogHeader>

        {/* 초기 데이터 시드 버튼 */}
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">
                처음 사용 시 기본 데이터를 생성해주세요
              </p>
              <p className="text-xs text-yellow-600 mt-0.5">
                고포트 업체 및 운임 테이블이 자동으로 추가됩니다
              </p>
            </div>
            <Button
              onClick={seedAll}
              disabled={isSeeding}
              variant="outline"
              size="sm"
              className="border-yellow-400 text-yellow-700 hover:bg-yellow-100"
            >
              {isSeeding ? "생성 중..." : "기본 데이터 생성"}
            </Button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as SettingsTab)}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="shipping" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">운송 관리</span>
            </TabsTrigger>
            <TabsTrigger value="factories" className="flex items-center gap-2">
              <Factory className="h-4 w-4" />
              <span className="hidden sm:inline">중국 공장</span>
            </TabsTrigger>
            <TabsTrigger value="presets" className="flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">프리셋</span>
            </TabsTrigger>
            <TabsTrigger value="costSettings" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">비용 설정</span>
            </TabsTrigger>
          </TabsList>

          {/* 스크롤 가능한 컨텐츠 영역 */}
          <div className="flex-1 overflow-y-auto mt-4 pr-1">
            {/* 운송 관리 (업체 + 창고 + 운임 요금 + 공통 비용 통합) */}
            <TabsContent value="shipping" className="mt-0">
              <ShippingManager />
            </TabsContent>

            {/* 중국 공장 관리 */}
            <TabsContent value="factories" className="mt-0">
              <FactoryManager />
            </TabsContent>

            {/* 프리셋 관리 */}
            <TabsContent value="presets" className="mt-0">
              <PresetManager />
            </TabsContent>

            {/* 비용 설정 관리 */}
            <TabsContent value="costSettings" className="mt-0">
              <CostSettingsManager />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
