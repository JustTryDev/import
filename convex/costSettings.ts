/**
 * 비용 설정 CRUD
 *
 * 📌 비유: 택시 요금표처럼 비용 계산 기준을 관리
 * - 내륙 운송료: CBM당 USD 단가
 * - 국내 운송료: 기본료 + 추가 요금
 * - 3PL + 배송비: CBM 단위당 요금
 */
import { v } from "convex/values"
import { query, mutation } from "./_generated/server"

// 비용 설정 타입
export type CostSettingType = "inland" | "domestic" | "3pl"

// 내륙 운송료 설정 타입
export interface InlandConfig {
  ratePerCbm: number  // CBM당 USD 단가
}

// 국내 운송료 설정 타입
export interface DomesticConfig {
  baseFee: number     // 기본료 (원)
  baseCbm: number     // 기본 CBM (이하는 기본료만)
  extraUnit: number   // 추가 단위 (CBM)
  extraRate: number   // 추가 요금 (원/단위)
}

// 3PL + 배송비 설정 타입
export interface ThreePLConfig {
  ratePerUnit: number // 단위당 요금 (원)
  unit: number        // 단위 (CBM)
}

// 모든 비용 설정 조회
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("costSettings").collect()
  },
})

// 타입별 비용 설정 조회
export const getByType = query({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("costSettings")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .first()
  },
})

// 비용 설정 생성
export const create = mutation({
  args: {
    type: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    config: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // 같은 타입이 이미 있으면 에러
    const existing = await ctx.db
      .query("costSettings")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .first()

    if (existing) {
      throw new Error(`${args.type} 타입의 설정이 이미 존재합니다.`)
    }

    return await ctx.db.insert("costSettings", {
      type: args.type,
      name: args.name,
      description: args.description,
      config: args.config,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

// 비용 설정 수정
export const update = mutation({
  args: {
    id: v.id("costSettings"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    config: v.optional(v.any()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args

    // undefined 값 제거
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )

    return await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    })
  },
})

// 비용 설정 삭제
export const remove = mutation({
  args: { id: v.id("costSettings") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id)
  },
})

// 기본 비용 설정 시드 (초기 데이터 생성)
export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()

    // 이미 데이터가 있으면 스킵
    const existing = await ctx.db.query("costSettings").first()
    if (existing) {
      return { success: false, message: "이미 비용 설정이 존재합니다." }
    }

    // 1. 내륙 운송료 (중국 공장 → 항구)
    await ctx.db.insert("costSettings", {
      type: "inland",
      name: "내륙 운송료",
      description: "중국 공장에서 항구까지의 운송 비용 (CBM당 USD)",
      config: {
        ratePerCbm: 70,  // CBM당 $70
      } as InlandConfig,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })

    // 2. 국내 운송료 (항구 → 창고)
    await ctx.db.insert("costSettings", {
      type: "domestic",
      name: "국내 운송료",
      description: "항구에서 창고까지의 운송 비용",
      config: {
        baseFee: 50000,    // 기본료 50,000원
        baseCbm: 0.5,      // 0.5CBM까지 기본료
        extraUnit: 0.1,    // 0.1CBM 단위
        extraRate: 10000,  // 0.1CBM당 10,000원 추가
      } as DomesticConfig,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })

    // 3. 3PL + 배송비
    await ctx.db.insert("costSettings", {
      type: "3pl",
      name: "3PL + 배송비",
      description: "물류대행 및 최종 배송 비용",
      config: {
        ratePerUnit: 15000,  // 단위당 15,000원
        unit: 0.1,           // 0.1CBM 단위
      } as ThreePLConfig,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })

    return { success: true, message: "기본 비용 설정이 생성되었습니다." }
  },
})
