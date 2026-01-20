import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

// 운임 타입별 운송료 조회
export const listByRateType = query({
  args: { rateTypeId: v.id("shippingRateTypes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("internationalShippingRates")
      .withIndex("by_rate_type", (q) => q.eq("rateTypeId", args.rateTypeId))
      .collect()
  },
})

// 특정 CBM의 운송료 조회
export const getByRateTypeAndCbm = query({
  args: {
    rateTypeId: v.id("shippingRateTypes"),
    cbm: v.number(),
  },
  handler: async (ctx, args) => {
    // 정확한 CBM 값으로 조회
    const exactMatch = await ctx.db
      .query("internationalShippingRates")
      .withIndex("by_rate_type_cbm", (q) =>
        q.eq("rateTypeId", args.rateTypeId).eq("cbm", args.cbm)
      )
      .first()

    if (exactMatch) return exactMatch

    // 정확한 값이 없으면 가장 가까운 상위 CBM 값 조회
    const allRates = await ctx.db
      .query("internationalShippingRates")
      .withIndex("by_rate_type", (q) => q.eq("rateTypeId", args.rateTypeId))
      .collect()

    // CBM 이상인 값 중 가장 작은 값 찾기
    const applicableRates = allRates.filter((r) => r.cbm >= args.cbm)
    if (applicableRates.length === 0) {
      // 없으면 가장 큰 CBM 값 반환
      return allRates.sort((a, b) => b.cbm - a.cbm)[0] || null
    }

    return applicableRates.sort((a, b) => a.cbm - b.cbm)[0]
  },
})

// CBM에 해당하는 운송료 계산 (보간 지원)
export const calculateRate = query({
  args: {
    rateTypeId: v.id("shippingRateTypes"),
    cbm: v.number(),
  },
  handler: async (ctx, args) => {
    const allRates = await ctx.db
      .query("internationalShippingRates")
      .withIndex("by_rate_type", (q) => q.eq("rateTypeId", args.rateTypeId))
      .collect()

    if (allRates.length === 0) return null

    // CBM으로 정렬
    const sortedRates = allRates.sort((a, b) => a.cbm - b.cbm)

    // 입력 CBM을 0.5 단위로 올림
    const roundedCbm = Math.ceil(args.cbm * 2) / 2

    // 정확히 일치하는 값 찾기
    const exactMatch = sortedRates.find((r) => r.cbm === roundedCbm)
    if (exactMatch) {
      return {
        cbm: roundedCbm,
        rateUSD: exactMatch.rateUSD,
        rateKRW: exactMatch.rateKRW,
      }
    }

    // 범위를 벗어난 경우
    if (roundedCbm < sortedRates[0].cbm) {
      return {
        cbm: sortedRates[0].cbm,
        rateUSD: sortedRates[0].rateUSD,
        rateKRW: sortedRates[0].rateKRW,
      }
    }

    const lastRate = sortedRates[sortedRates.length - 1]
    if (roundedCbm > lastRate.cbm) {
      // 마지막 구간의 단가로 계산 (비례 계산)
      const unitRate = lastRate.rateUSD / lastRate.cbm
      const unitRateKRW = lastRate.rateKRW / lastRate.cbm
      return {
        cbm: roundedCbm,
        rateUSD: Math.round(unitRate * roundedCbm * 100) / 100,
        rateKRW: Math.round(unitRateKRW * roundedCbm),
      }
    }

    return null
  },
})

// 운송료 생성
export const create = mutation({
  args: {
    rateTypeId: v.id("shippingRateTypes"),
    cbm: v.number(),
    rateUSD: v.number(),
    rateKRW: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert("internationalShippingRates", {
      ...args,
      createdAt: now,
      updatedAt: now,
    })
  },
})

// 운송료 일괄 생성 (업체 설정 시 사용)
export const createBulk = mutation({
  args: {
    rateTypeId: v.id("shippingRateTypes"),
    rates: v.array(
      v.object({
        cbm: v.number(),
        rateUSD: v.number(),
        rateKRW: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const ids = []

    for (const rate of args.rates) {
      const id = await ctx.db.insert("internationalShippingRates", {
        rateTypeId: args.rateTypeId,
        ...rate,
        createdAt: now,
        updatedAt: now,
      })
      ids.push(id)
    }

    return ids
  },
})

// 운송료 수정
export const update = mutation({
  args: {
    id: v.id("internationalShippingRates"),
    cbm: v.optional(v.number()),
    rateUSD: v.optional(v.number()),
    rateKRW: v.optional(v.number()),
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

// 운송료 삭제
export const remove = mutation({
  args: { id: v.id("internationalShippingRates") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id)
  },
})

// 운임 타입의 모든 운송료 삭제
export const removeAllByRateType = mutation({
  args: { rateTypeId: v.id("shippingRateTypes") },
  handler: async (ctx, args) => {
    const rates = await ctx.db
      .query("internationalShippingRates")
      .withIndex("by_rate_type", (q) => q.eq("rateTypeId", args.rateTypeId))
      .collect()

    for (const rate of rates) {
      await ctx.db.delete(rate._id)
    }

    return rates.length
  },
})
