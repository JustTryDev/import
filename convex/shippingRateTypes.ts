import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

// 배송지(창고)별 운임 타입 조회 (신규 — 주요 쿼리)
// 📌 비유: 특정 물류센터에서 제공하는 요금제 목록을 불러오는 것
export const listByWarehouse = query({
  args: { warehouseId: v.id("companyWarehouses") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shippingRateTypes")
      .withIndex("by_warehouse", (q) => q.eq("warehouseId", args.warehouseId))
      .collect()
  },
})

// 업체별 운임 타입 조회 (레거시 호환용 — 마이그레이션 후 제거 예정)
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

// 운임 타입 생성 (배송지 기반)
// 📌 비유: 특정 물류센터에 새로운 요금제를 등록하는 것
export const create = mutation({
  args: {
    warehouseId: v.id("companyWarehouses"),  // 배송지(창고) ID
    name: v.string(),
    description: v.optional(v.string()),
    currency: v.optional(v.union(v.literal("USD"), v.literal("CNY"), v.literal("KRW"))),
    unitType: v.optional(v.union(v.literal("cbm"), v.literal("kg"))),  // 요금 단위 (기본값: "cbm")
    isDefault: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // 창고에서 companyId 조회 (레거시 호환성 유지)
    const warehouse = await ctx.db.get(args.warehouseId)
    if (!warehouse) throw new Error("창고를 찾을 수 없습니다.")

    // 기본값으로 설정하는 경우, 같은 창고의 다른 타입 기본값 해제
    if (args.isDefault) {
      const existingTypes = await ctx.db
        .query("shippingRateTypes")
        .withIndex("by_warehouse", (q) => q.eq("warehouseId", args.warehouseId))
        .collect()

      for (const type of existingTypes) {
        if (type.isDefault) {
          await ctx.db.patch(type._id, { isDefault: false, updatedAt: now })
        }
      }
    }

    return await ctx.db.insert("shippingRateTypes", {
      companyId: warehouse.companyId,  // 레거시 호환: companyId도 함께 저장
      warehouseId: args.warehouseId,
      name: args.name,
      description: args.description,
      currency: args.currency,
      unitType: args.unitType ?? "cbm",  // 기본값: CBM
      isDefault: args.isDefault,
      sortOrder: args.sortOrder,
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
    currency: v.optional(v.union(v.literal("USD"), v.literal("CNY"), v.literal("KRW"))),
    unitType: v.optional(v.union(v.literal("cbm"), v.literal("kg"))),
    isDefault: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    const now = Date.now()

    // 기본값으로 설정하는 경우, 같은 창고의 다른 타입 기본값 해제
    if (updates.isDefault === true) {
      const current = await ctx.db.get(id)
      if (current?.warehouseId) {
        // 신규: 같은 창고 내에서 기본값 해제
        const existingTypes = await ctx.db
          .query("shippingRateTypes")
          .withIndex("by_warehouse", (q) => q.eq("warehouseId", current.warehouseId))
          .collect()

        for (const type of existingTypes) {
          if (type._id !== id && type.isDefault) {
            await ctx.db.patch(type._id, { isDefault: false, updatedAt: now })
          }
        }
      } else if (current?.companyId) {
        // 레거시 호환: companyId 기준
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

// 운임 타입 삭제 (연관된 요금표도 함께 삭제)
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
