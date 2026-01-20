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
    isActive: v.boolean(),                  // 활성화 여부
    sortOrder: v.number(),                  // 정렬 순서
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_factory", ["factoryId"]),
})
