import { v } from "convex/values"
import { query, mutation } from "./_generated/server"

// 모든 공장 조회
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("factories")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect()
  },
})

// 공장 생성
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    currency: v.string(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert("factories", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

// 공장 수정
export const update = mutation({
  args: {
    id: v.id("factories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    currency: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )
    return await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    })
  },
})

// 공장 삭제 (비활성화)
export const remove = mutation({
  args: { id: v.id("factories") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
    })
  },
})

// 공장 완전 삭제
export const hardDelete = mutation({
  args: { id: v.id("factories") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id)
  },
})
