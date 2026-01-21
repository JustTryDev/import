/**
 * 공장 비용 프리셋 (즐겨찾기) CRUD
 *
 * 📌 비유: 카페 앱에서 "자주 주문하는 메뉴" 저장 기능
 * - 공장 + 비용 항목 조합을 저장해두고
 * - 나중에 한 번에 불러오기
 */
import { v } from "convex/values"
import { query, mutation } from "./_generated/server"

// 프리셋 슬롯 데이터 타입 (공장 + 선택된 비용 항목)
const slotSchema = v.object({
  factoryId: v.string(),                // 공장 ID (문자열로 저장)
  selectedItemIds: v.array(v.string()), // 선택된 비용 항목 IDs
  costValues: v.any(),                  // { [itemId]: number } 형태
})

// 모든 프리셋 조회
export const list = query({
  args: {},
  handler: async (ctx) => {
    // sortOrder로 정렬해서 반환
    const presets = await ctx.db.query("factoryPresets").collect()
    return presets.sort((a, b) => a.sortOrder - b.sortOrder)
  },
})

// 프리셋 생성
export const create = mutation({
  args: {
    name: v.string(),
    slots: v.array(slotSchema),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // 현재 프리셋 개수 확인 (최대 10개 제한)
    const existingPresets = await ctx.db.query("factoryPresets").collect()
    if (existingPresets.length >= 10) {
      throw new Error("프리셋은 최대 10개까지만 저장할 수 있습니다.")
    }

    // 새 프리셋의 sortOrder는 마지막 순서 + 1
    const maxSortOrder = existingPresets.reduce(
      (max, p) => Math.max(max, p.sortOrder),
      0
    )

    return await ctx.db.insert("factoryPresets", {
      name: args.name,
      slots: args.slots,
      sortOrder: maxSortOrder + 1,
      createdAt: now,
      updatedAt: now,
    })
  },
})

// 프리셋 수정
export const update = mutation({
  args: {
    id: v.id("factoryPresets"),
    name: v.optional(v.string()),
    slots: v.optional(v.array(slotSchema)),
    sortOrder: v.optional(v.number()),
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

// 프리셋 삭제 (실제 삭제)
export const remove = mutation({
  args: { id: v.id("factoryPresets") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id)
  },
})
