import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

// 업체별 공통 비용 항목 조회
export const listByCompany = query({
  args: { companyId: v.id("shippingCompanies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("companyCostItems")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect()
  },
})

// 단일 비용 항목 조회
export const get = query({
  args: { id: v.id("companyCostItems") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// 비용 항목 생성
export const create = mutation({
  args: {
    companyId: v.id("shippingCompanies"),
    name: v.string(),
    description: v.optional(v.string()),
    defaultAmount: v.number(),
    isDivisible: v.boolean(),
    isRequired: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert("companyCostItems", {
      ...args,
      createdAt: now,
      updatedAt: now,
    })
  },
})

// 비용 항목 일괄 생성
export const createBulk = mutation({
  args: {
    companyId: v.id("shippingCompanies"),
    items: v.array(
      v.object({
        name: v.string(),
        description: v.optional(v.string()),
        defaultAmount: v.number(),
        isDivisible: v.boolean(),
        isRequired: v.boolean(),
        sortOrder: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const ids = []

    for (const item of args.items) {
      const id = await ctx.db.insert("companyCostItems", {
        companyId: args.companyId,
        ...item,
        createdAt: now,
        updatedAt: now,
      })
      ids.push(id)
    }

    return ids
  },
})

// 비용 항목 수정
export const update = mutation({
  args: {
    id: v.id("companyCostItems"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    defaultAmount: v.optional(v.number()),
    isDivisible: v.optional(v.boolean()),
    isRequired: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
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

// 비용 항목 삭제
export const remove = mutation({
  args: { id: v.id("companyCostItems") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id)
  },
})

// 업체의 모든 비용 항목 삭제
export const removeAllByCompany = mutation({
  args: { companyId: v.id("shippingCompanies") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("companyCostItems")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect()

    for (const item of items) {
      await ctx.db.delete(item._id)
    }

    return items.length
  },
})
