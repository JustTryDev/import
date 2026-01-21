import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // 국제 운송 업체
  shippingCompanies: defineTable({
    name: v.string(),                    // 업체명 (예: "고포트")
    description: v.optional(v.string()), // 설명
    isActive: v.boolean(),               // 활성화 여부
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // 운임 타입 (할인/일반 등 업체별 운임 구분)
  shippingRateTypes: defineTable({
    companyId: v.id("shippingCompanies"), // 업체 ID
    name: v.string(),                      // 운임 타입명 (예: "할인운임제", "일반운임제")
    description: v.optional(v.string()),   // 설명 (예: "월, 수, 금")
    isDefault: v.boolean(),                // 기본 선택 여부
    sortOrder: v.number(),                 // 정렬 순서
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"]),

  // CBM 구간별 국제 운송료 (운임 타입별)
  internationalShippingRates: defineTable({
    rateTypeId: v.id("shippingRateTypes"), // 운임 타입 ID
    cbm: v.number(),                        // CBM (0.5 단위)
    rateUSD: v.number(),                    // USD 단가
    rateKRW: v.number(),                    // KRW 단가 (참고용)
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_rate_type", ["rateTypeId"])
    .index("by_rate_type_cbm", ["rateTypeId", "cbm"]),

  // 업체별 공통 비용 항목 (통관 건당 발생)
  companyCostItems: defineTable({
    companyId: v.id("shippingCompanies"),  // 업체 ID
    name: v.string(),                       // 비용 항목명 (통관수수료, D/O비용 등)
    description: v.optional(v.string()),    // 설명
    defaultAmount: v.number(),              // 기본 금액 (원)
    isDivisible: v.boolean(),               // 주문 건수 분할 가능 여부
    isRequired: v.boolean(),                // 필수 여부
    isVatApplicable: v.optional(v.boolean()), // 부가세 적용 여부 (통관수수료: true, D/O·C/O: false) - 기본값 false
    sortOrder: v.number(),                  // 정렬 순서
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"]),

  // 중국 공장
  factories: defineTable({
    name: v.string(),                       // 공장명
    description: v.optional(v.string()),    // 설명 (주소, 연락처 등)
    currency: v.string(),                   // 통화 (CNY, USD)
    isActive: v.boolean(),                  // 활성화 여부
    sortOrder: v.number(),                  // 정렬 순서
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // 공장별 비용 항목 (라벨 비용, 스티커 비용 등)
  factoryCostItems: defineTable({
    factoryId: v.id("factories"),           // 공장 ID
    name: v.string(),                       // 비용 항목명 (라벨 비용, 스티커 비용, 내륙 운송료 등)
    amount: v.number(),                     // 금액 (공장 통화 기준)
    // 📌 부과 방식: "once" = 1회성 (금형비, 샘플비), "per_quantity" = 수량연동 (라벨, 태그)
    chargeType: v.optional(v.union(
      v.literal("once"),
      v.literal("per_quantity")
    )),                                     // 기본값: "once" (1회성)
    isActive: v.boolean(),                  // 활성화 여부
    sortOrder: v.number(),                  // 정렬 순서
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_factory", ["factoryId"]),

  // 공장 비용 프리셋 (즐겨찾기)
  // 📌 비유: 카페에서 "자주 주문하는 메뉴" 저장해두는 것처럼
  // 공장 + 비용 조합을 저장해두고 한 번에 불러오기
  factoryPresets: defineTable({
    name: v.string(),                       // 프리셋 이름 (예: "봉제인형 기본")
    slots: v.array(v.object({               // 슬롯 데이터 배열
      factoryId: v.string(),                // 공장 ID (문자열로 저장)
      selectedItemIds: v.array(v.string()), // 선택된 비용 항목 IDs
      costValues: v.any(),                  // { [itemId]: number } 형태 (항목별 금액)
      // 📌 다중 제품 지원용 필드 (선택적)
      quantityValues: v.optional(v.any()),  // { [itemId]: number } 형태 (항목별 수량, 수량연동용)
      linkedProductIds: v.optional(v.array(v.string())),  // 연결된 제품 ID 목록 (균등 분배용)
    })),
    isDefault: v.optional(v.boolean()),     // 기본 프리셋 여부 (페이지 로드 시 자동 적용)
    sortOrder: v.number(),                  // 정렬 순서
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // 비용 설정 (내륙운송료, 국내운송료, 3PL비용 등)
  // 📌 비유: 택시 기본요금/추가요금처럼 비용 계산 기준을 설정
  costSettings: defineTable({
    type: v.string(),                       // 설정 타입 ("inland", "domestic", "3pl")
    name: v.string(),                       // 표시 이름 (예: "내륙 운송료")
    description: v.optional(v.string()),    // 설명
    config: v.any(),                        // 설정값 (타입별로 다른 구조)
    // inland: { ratePerCbm: number (USD) }
    // domestic: { baseFee: number, baseCbm: number, extraUnit: number, extraRate: number }
    // 3pl: { ratePerUnit: number, unit: number }
    isActive: v.boolean(),                  // 활성화 여부
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_type", ["type"]),
})
