import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

// 업체별 운임 타입 조회
export const listByCompany = query({
  args: { companyId: v.id("shippingCompanies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shippingRateTypes")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect()
  },
})

// 단일 운임 타입 조회
export const get = query({
  args: { id: v.id("shippingRateTypes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// 운임 타입 생성
export const create = mutation({
  args: {
    companyId: v.id("shippingCompanies"),
    name: v.string(),
    description: v.optional(v.string()),
    currency: v.optional(v.string()),  // "USD" | "CNY" | "KRW" (기본값: USD)
    isDefault: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // 기본값으로 설정하는 경우, 다른 타입의 기본값 해제
    if (args.isDefault) {
      const existingTypes = await ctx.db
        .query("shippingRateTypes")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect()

      for (const type of existingTypes) {
        if (type.isDefault) {
          await ctx.db.patch(type._id, { isDefault: false, updatedAt: now })
        }
      }
    }

    return await ctx.db.insert("shippingRateTypes", {
      ...args,
      createdAt: now,
      updatedAt: now,
    })
  },
})

// 운임 타입 수정
export const update = mutation({
  args: {
    id: v.id("shippingRateTypes"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    currency: v.optional(v.string()),  // "USD" | "CNY" | "KRW"
    isDefault: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    const now = Date.now()

    // 기본값으로 설정하는 경우, 다른 타입의 기본값 해제
    if (updates.isDefault === true) {
      const current = await ctx.db.get(id)
      if (current) {
        const existingTypes = await ctx.db
          .query("shippingRateTypes")
          .withIndex("by_company", (q) => q.eq("companyId", current.companyId))
          .collect()

        for (const type of existingTypes) {
          if (type._id !== id && type.isDefault) {
            await ctx.db.patch(type._id, { isDefault: false, updatedAt: now })
          }
        }
      }
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    )

    return await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: now,
    })
  },
})

// 운임 타입 삭제
export const remove = mutation({
  args: { id: v.id("shippingRateTypes") },
  handler: async (ctx, args) => {
    // 연관된 운송료 데이터도 함께 삭제
    const rates = await ctx.db
      .query("internationalShippingRates")
      .withIndex("by_rate_type", (q) => q.eq("rateTypeId", args.id))
      .collect()

    for (const rate of rates) {
      await ctx.db.delete(rate._id)
    }

    return await ctx.db.delete(args.id)
  },
})
