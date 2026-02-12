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

// 창고 생성
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
    return await ctx.db.insert("companyWarehouses", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
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
