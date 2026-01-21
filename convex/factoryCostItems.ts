import { v } from "convex/values"
import { query, mutation } from "./_generated/server"

// 특정 공장의 비용 항목 조회
export const listByFactory = query({
  args: { factoryId: v.id("factories") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("factoryCostItems")
      .withIndex("by_factory", (q) => q.eq("factoryId", args.factoryId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect()
  },
})

// 모든 활성 비용 항목 조회 (공장 ID와 함께)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("factoryCostItems")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect()
  },
})

// 비용 항목 생성
export const create = mutation({
  args: {
    factoryId: v.id("factories"),
    name: v.string(),
    amount: v.number(),
    // 📌 부과 방식: "once" = 1회성 (금형비), "per_quantity" = 수량연동 (라벨)
    chargeType: v.optional(v.union(
      v.literal("once"),
      v.literal("per_quantity")
    )),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert("factoryCostItems", {
      ...args,
      chargeType: args.chargeType ?? "once",  // 기본값: 1회성
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

// 비용 항목 수정
export const update = mutation({
  args: {
    id: v.id("factoryCostItems"),
    name: v.optional(v.string()),
    amount: v.optional(v.number()),
    // 📌 부과 방식: "once" = 1회성 (금형비), "per_quantity" = 수량연동 (라벨)
    chargeType: v.optional(v.union(
      v.literal("once"),
      v.literal("per_quantity")
    )),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    )
    return await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    })
  },
})

// 비용 항목 삭제 (비활성화)
export const remove = mutation({
  args: { id: v.id("factoryCostItems") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
    })
  },
})

// 비용 항목 완전 삭제
export const hardDelete = mutation({
  args: { id: v.id("factoryCostItems") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id)
  },
})
