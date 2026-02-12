/**
 * 1회성 데이터 마이그레이션 스크립트
 *
 * 📌 목적: 운임 타입(shippingRateTypes)을 업체 단위 → 배송지(창고) 단위로 전환
 *
 * 📌 비유: 학교 반 배정을 "학년 전체"에서 "반별"로 세분화하는 것
 *    기존에는 "고포트 회사 전체"에 요금표가 걸려있었지만,
 *    이제는 "고포트 > 위해 LCL 창고"에 요금표가 걸리게 됩니다.
 *
 * 실행 방법:
 *   Convex 대시보드 → Functions → migrations:migrateAll → Run
 */

import { mutation } from "./_generated/server"

// ===== 포괄적 마이그레이션: 전체 데이터 정리 =====
// 실행 단계:
// 1단계: "위해 LCL" 창고를 "고포트" 업체 소속으로 이동 (또는 생성)
// 2단계: 유지할 운임 타입 3개에 warehouseId + currency + unitType 추가
// 3단계: "테스트" 운임 타입 + 연결된 요금 데이터 삭제
// 4단계: "테스트" 업체 + 연결된 창고 삭제
export const migrateAll = mutation({
  args: {},
  handler: async (ctx) => {
    const log: string[] = []
    const now = Date.now()

    // ==========================================
    // 1단계: 업체 찾기
    // ==========================================
    const allCompanies = await ctx.db.query("shippingCompanies").collect()
    const gofort = allCompanies.find((c) => c.name === "고포트")
    const testCompany = allCompanies.find((c) => c.name === "테스트")

    if (!gofort) {
      return { success: false, log: ["고포트 업체를 찾을 수 없습니다."] }
    }
    log.push(`✅ 고포트 업체 확인: ${gofort._id}`)

    // ==========================================
    // 2단계: "위해 LCL" 창고 확보 (고포트 소속)
    // ==========================================

    // 먼저 고포트 소속 창고 중 위해 관련 창고 확인
    const gofortWarehouses = await ctx.db
      .query("companyWarehouses")
      .withIndex("by_company", (q) => q.eq("companyId", gofort._id))
      .collect()

    let targetWarehouse = gofortWarehouses.find(
      (w) => w.name.includes("위해") || w.cityCode === "371000"
    )

    // 고포트에 없다면, 다른 업체(테스트 등)에 있는 위해 LCL 창고를 이동
    if (!targetWarehouse) {
      const allWarehouses = await ctx.db.query("companyWarehouses").collect()
      const orphanWarehouse = allWarehouses.find(
        (w) => (w.name.includes("위해") || w.cityCode === "371000") && w.companyId !== gofort._id
      )

      if (orphanWarehouse) {
        // 다른 업체에 있는 창고를 고포트로 이동
        await ctx.db.patch(orphanWarehouse._id, {
          companyId: gofort._id,
          updatedAt: now,
        })
        targetWarehouse = { ...orphanWarehouse, companyId: gofort._id }
        log.push(`✅ "위해 LCL" 창고를 고포트로 이동: ${orphanWarehouse._id}`)
      } else {
        // 어디에도 없으면 새로 생성
        const newId = await ctx.db.insert("companyWarehouses", {
          companyId: gofort._id,
          name: "위해 LCL",
          provinceCode: "370000",  // 산둥성
          cityCode: "371000",      // 위해시
          isActive: true,
          sortOrder: 1,
          createdAt: now,
          updatedAt: now,
        })
        const created = await ctx.db.get(newId)
        if (!created) {
          return { success: false, log: [...log, "창고 생성 실패"] }
        }
        targetWarehouse = created
        log.push(`✅ "위해 LCL" 창고 새로 생성: ${newId}`)
      }
    } else {
      log.push(`✅ 고포트에 이미 위해 창고 존재: ${targetWarehouse._id}`)
    }

    // ==========================================
    // 3단계: 운임 타입 정리
    // ==========================================

    // 고포트의 모든 운임 타입 조회
    const allRateTypes = await ctx.db
      .query("shippingRateTypes")
      .withIndex("by_company", (q) => q.eq("companyId", gofort._id))
      .collect()

    // 유지할 운임 타입 목록 (이름으로 매칭)
    const keepNames = ["할인운임제", "일반운임제", "평균요금제"]

    for (const rateType of allRateTypes) {
      if (keepNames.includes(rateType.name)) {
        // 유지할 운임 타입: warehouseId + currency + unitType 추가
        await ctx.db.patch(rateType._id, {
          warehouseId: targetWarehouse._id,
          currency: "USD",       // 기존 데이터는 모두 USD 기반
          unitType: "cbm",       // 기존 데이터는 모두 CBM 단위
          updatedAt: now,
        })
        log.push(`✅ "${rateType.name}" → 위해 LCL 창고 매핑 완료 (USD/CBM)`)
      } else {
        // 삭제할 운임 타입: 연결된 요금 데이터도 함께 삭제
        const linkedRates = await ctx.db
          .query("internationalShippingRates")
          .withIndex("by_rate_type", (q) => q.eq("rateTypeId", rateType._id))
          .collect()

        for (const rate of linkedRates) {
          await ctx.db.delete(rate._id)
        }
        log.push(`🗑️ "${rateType.name}" 연결 요금 ${linkedRates.length}건 삭제`)

        await ctx.db.delete(rateType._id)
        log.push(`🗑️ "${rateType.name}" 운임 타입 삭제`)
      }
    }

    // ==========================================
    // 4단계: "테스트" 업체 정리
    // ==========================================
    if (testCompany) {
      // 테스트 업체의 남은 창고 삭제
      const testWarehouses = await ctx.db
        .query("companyWarehouses")
        .withIndex("by_company", (q) => q.eq("companyId", testCompany._id))
        .collect()

      for (const wh of testWarehouses) {
        await ctx.db.delete(wh._id)
        log.push(`🗑️ 테스트 업체 창고 "${wh.name}" 삭제`)
      }

      // 테스트 업체의 남은 운임 타입 삭제
      const testRateTypes = await ctx.db
        .query("shippingRateTypes")
        .withIndex("by_company", (q) => q.eq("companyId", testCompany._id))
        .collect()

      for (const rt of testRateTypes) {
        // 연결된 요금 먼저 삭제
        const linkedRates = await ctx.db
          .query("internationalShippingRates")
          .withIndex("by_rate_type", (q) => q.eq("rateTypeId", rt._id))
          .collect()
        for (const rate of linkedRates) {
          await ctx.db.delete(rate._id)
        }
        await ctx.db.delete(rt._id)
        log.push(`🗑️ 테스트 업체 운임 타입 "${rt.name}" + 요금 ${linkedRates.length}건 삭제`)
      }

      // 테스트 업체 삭제
      await ctx.db.delete(testCompany._id)
      log.push(`🗑️ "테스트" 업체 삭제: ${testCompany._id}`)
    }

    // ==========================================
    // 결과 요약
    // ==========================================
    log.push("============================")
    log.push("마이그레이션 완료!")
    log.push(`고포트 > 위해 LCL 창고: ${targetWarehouse._id}`)
    log.push(`유지된 운임 타입: ${keepNames.join(", ")}`)

    return { success: true, log }
  },
})
