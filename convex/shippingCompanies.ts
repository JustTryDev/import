import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

// 모든 활성 업체 조회
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("shippingCompanies")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect()
  },
})

// 모든 업체 조회 (관리자용, 비활성 포함)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("shippingCompanies").collect()
  },
})

// 단일 업체 조회
export const get = query({
  args: { id: v.id("shippingCompanies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// 업체 생성
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert("shippingCompanies", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

// 업체 수정
export const update = mutation({
  args: {
    id: v.id("shippingCompanies"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    // undefined 값 제거
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    )
    return await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    })
  },
})

// 업체 삭제 (소프트 삭제)
export const remove = mutation({
  args: { id: v.id("shippingCompanies") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
    })
  },
})

// 업체 영구 삭제 (관리자용)
export const hardDelete = mutation({
  args: { id: v.id("shippingCompanies") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id)
  },
})
