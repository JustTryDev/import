import { v } from "convex/values"
import { query, mutation } from "./_generated/server"

// 업체별 창고 목록 조회
export const listByCompany = query({
  args: { companyId: v.id("shippingCompanies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("companyWarehouses")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect()
  },
})

// 창고 생성 + 기본 운임 타입 자동 생성
// 📌 비유: 새 물류센터를 열면, 기본 요금표 양식도 함께 만들어지는 것
//    나중에 관리자가 요금표에 실제 금액을 채워넣으면 됩니다.
export const create = mutation({
  args: {
    companyId: v.id("shippingCompanies"),
    name: v.string(),
    provinceCode: v.string(),
    cityCode: v.string(),
    detailAddress: v.optional(v.string()),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // 1. 창고 생성
    const warehouseId = await ctx.db.insert("companyWarehouses", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })

    // 2. 기본 운임 타입 자동 생성 (빈 요금 테이블)
    //    창고를 만들자마자 운임 요금 탭에서 바로 요금표 입력이 가능하도록
    await ctx.db.insert("shippingRateTypes", {
      companyId: args.companyId,
      warehouseId: warehouseId,
      name: `${args.name} 기본 운임`,
      currency: "USD",
      unitType: "cbm",
      isDefault: true,
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    })

    return warehouseId
  },
})

// 창고 수정
export const update = mutation({
  args: {
    id: v.id("companyWarehouses"),
    name: v.optional(v.string()),
    provinceCode: v.optional(v.string()),
    cityCode: v.optional(v.string()),
    detailAddress: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    )
    return await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    })
  },
})

// 창고 삭제 (비활성화)
export const remove = mutation({
  args: { id: v.id("companyWarehouses") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
    })
  },
})

// 창고 완전 삭제
export const hardDelete = mutation({
  args: { id: v.id("companyWarehouses") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id)
  },
})
