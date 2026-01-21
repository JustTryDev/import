import { mutation, query, internalMutation } from "./_generated/server"

// 고포트 운송료 데이터 (0.5 ~ 70.0 CBM)
const generateGofortRates = () => {
  const rates = []
  for (let cbm = 0.5; cbm <= 70; cbm += 0.5) {
    // 할인운임제: CBM * 67.00 USD (월, 수, 금)
    const discountRate = cbm * 67.0
    // 일반운임제: CBM * 75.00 USD (일, 화, 목)
    const normalRate = cbm * 75.0
    // 평균요금제: (할인 + 일반) / 2
    const averageRate = (discountRate + normalRate) / 2

    rates.push({
      cbm,
      discountRate: Math.round(discountRate * 100) / 100,
      normalRate: Math.round(normalRate * 100) / 100,
      averageRate: Math.round(averageRate * 100) / 100,
    })
  }
  return rates
}

// 초기 데이터 시드
export const seedInitialData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()

    // 1. 기존 데이터 확인
    const existingCompanies = await ctx.db.query("shippingCompanies").collect()
    if (existingCompanies.length > 0) {
      return { message: "데이터가 이미 존재합니다.", seeded: false }
    }

    // 2. 고포트 업체 생성
    const gofortId = await ctx.db.insert("shippingCompanies", {
      name: "고포트",
      description: "중국-한국 해상 운송 업체",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })

    // 3. 운임 타입 생성 (할인, 일반, 평균) - 모두 USD 통화
    const discountTypeId = await ctx.db.insert("shippingRateTypes", {
      companyId: gofortId,
      name: "할인운임제",
      description: "월, 수, 금 출항",
      currency: "USD",
      isDefault: false,
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    })

    const normalTypeId = await ctx.db.insert("shippingRateTypes", {
      companyId: gofortId,
      name: "일반운임제",
      description: "일, 화, 목 출항",
      currency: "USD",
      isDefault: false,
      sortOrder: 2,
      createdAt: now,
      updatedAt: now,
    })

    const averageTypeId = await ctx.db.insert("shippingRateTypes", {
      companyId: gofortId,
      name: "평균요금제",
      description: "할인 + 일반 평균",
      currency: "USD",
      isDefault: true,
      sortOrder: 3,
      createdAt: now,
      updatedAt: now,
    })

    // 4. 운송료 데이터 생성
    const rates = generateGofortRates()

    for (const rate of rates) {
      // 할인운임제
      await ctx.db.insert("internationalShippingRates", {
        rateTypeId: discountTypeId,
        cbm: rate.cbm,
        rate: rate.discountRate,
        createdAt: now,
        updatedAt: now,
      })

      // 일반운임제
      await ctx.db.insert("internationalShippingRates", {
        rateTypeId: normalTypeId,
        cbm: rate.cbm,
        rate: rate.normalRate,
        createdAt: now,
        updatedAt: now,
      })

      // 평균요금제
      await ctx.db.insert("internationalShippingRates", {
        rateTypeId: averageTypeId,
        cbm: rate.cbm,
        rate: rate.averageRate,
        createdAt: now,
        updatedAt: now,
      })
    }

    // 5. 업체별 공통 비용 항목 생성
    // isVatApplicable: 부가세 적용 여부 (통관수수료만 true)
    const costItems = [
      {
        name: "통관수수료",
        description: "세관 통관 처리 비용",
        defaultAmount: 22000,
        isDivisible: true,
        isRequired: true,
        isVatApplicable: true,  // 부가세 적용
        sortOrder: 1,
      },
      {
        name: "D/O 비용",
        description: "화물인도지시서 비용",
        defaultAmount: 35000,
        isDivisible: true,
        isRequired: true,
        isVatApplicable: false,  // 부가세 미적용
        sortOrder: 2,
      },
      {
        name: "C/O 비용",
        description: "원산지증명서 비용",
        defaultAmount: 25000,
        isDivisible: true,
        isRequired: false,
        isVatApplicable: false,  // 부가세 미적용
        sortOrder: 3,
      },
    ]

    for (const item of costItems) {
      await ctx.db.insert("companyCostItems", {
        companyId: gofortId,
        ...item,
        createdAt: now,
        updatedAt: now,
      })
    }

    // 6. 중국 공장 생성
    const factories = [
      {
        name: "광저우 공장",
        description: "광동성 광저우시 - 봉제 인형 전문",
        currency: "CNY",
        sortOrder: 1,
      },
      {
        name: "이우 공장",
        description: "절강성 이우시 - 소형 잡화 전문",
        currency: "CNY",
        sortOrder: 2,
      },
      {
        name: "심천 공장",
        description: "광동성 심천시 - 전자제품 전문",
        currency: "USD",
        sortOrder: 3,
      },
    ]

    const factoryIds: string[] = []
    for (const factory of factories) {
      const factoryId = await ctx.db.insert("factories", {
        ...factory,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      factoryIds.push(factoryId)
    }

    // 7. 공장별 비용 항목 생성
    // 광저우 공장 (CNY 기준)
    const guangzhouCostItems = [
      { name: "라벨 비용", amount: 0.5, sortOrder: 1 },
      { name: "스티커 비용", amount: 0.3, sortOrder: 2 },
      { name: "검품비", amount: 1.0, sortOrder: 3 },
      { name: "포장비", amount: 0.8, sortOrder: 4 },
      { name: "내륙 운송료", amount: 300, sortOrder: 5 },
    ]

    // 이우 공장 (CNY 기준)
    const yiwuCostItems = [
      { name: "라벨 비용", amount: 0.4, sortOrder: 1 },
      { name: "검품비", amount: 0.8, sortOrder: 2 },
      { name: "포장비", amount: 0.5, sortOrder: 3 },
      { name: "내륙 운송료", amount: 250, sortOrder: 4 },
    ]

    // 심천 공장 (USD 기준)
    const shenzhenCostItems = [
      { name: "검품비", amount: 0.15, sortOrder: 1 },
      { name: "포장비", amount: 0.1, sortOrder: 2 },
      { name: "내륙 운송료", amount: 50, sortOrder: 3 },
    ]

    const allFactoryCostItems = [
      { factoryId: factoryIds[0], items: guangzhouCostItems },
      { factoryId: factoryIds[1], items: yiwuCostItems },
      { factoryId: factoryIds[2], items: shenzhenCostItems },
    ]

    let factoryCostItemsCount = 0
    for (const { factoryId, items } of allFactoryCostItems) {
      for (const item of items) {
        await ctx.db.insert("factoryCostItems", {
          factoryId: factoryId as any,
          ...item,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        factoryCostItemsCount++
      }
    }

    // 8. 비용 설정 생성 (내륙운송료, 국내운송료, 3PL)
    const existingCostSettings = await ctx.db.query("costSettings").first()
    let costSettingsCount = 0

    if (!existingCostSettings) {
      // 내륙 운송료 (중국 공장 → 항구)
      await ctx.db.insert("costSettings", {
        type: "inland",
        name: "내륙 운송료",
        description: "중국 공장에서 항구까지의 운송 비용 (CBM당 USD)",
        config: { ratePerCbm: 70 },
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })

      // 국내 운송료 (항구 → 창고)
      await ctx.db.insert("costSettings", {
        type: "domestic",
        name: "국내 운송료",
        description: "항구에서 창고까지의 운송 비용",
        config: {
          baseFee: 50000,
          baseCbm: 0.5,
          extraUnit: 0.1,
          extraRate: 10000,
        },
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })

      // 3PL + 배송비
      await ctx.db.insert("costSettings", {
        type: "3pl",
        name: "3PL + 배송비",
        description: "물류대행 및 최종 배송 비용",
        config: {
          ratePerUnit: 15000,
          unit: 0.1,
        },
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })

      costSettingsCount = 3
    }

    return {
      message: "초기 데이터 시드 완료",
      seeded: true,
      companyId: gofortId,
      rateTypesCount: 3,
      ratesCount: rates.length * 3,
      costItemsCount: costItems.length,
      factoriesCount: factories.length,
      factoryCostItemsCount,
      costSettingsCount,
    }
  },
})

// 데이터 초기화 (개발용)
export const resetAllData = mutation({
  args: {},
  handler: async (ctx) => {
    // 모든 테이블 삭제
    const tables = [
      "internationalShippingRates",
      "shippingRateTypes",
      "companyCostItems",
      "factoryCostItems",
      "factories",
      "shippingCompanies",
      "costSettings",
    ]

    let totalDeleted = 0

    for (const tableName of tables) {
      const items = await ctx.db.query(tableName as "shippingCompanies").collect()
      for (const item of items) {
        await ctx.db.delete(item._id)
        totalDeleted++
      }
    }

    return { message: "모든 데이터 삭제 완료", deleted: totalDeleted }
  },
})

// 시드 데이터 필요 여부 확인
export const needsSeeding = query({
  args: {},
  handler: async (ctx) => {
    const companies = await ctx.db.query("shippingCompanies").first()
    const factories = await ctx.db.query("factories").first()

    // 운송업체와 공장 데이터가 모두 없으면 시드 필요
    return {
      needsSeeding: !companies && !factories,
      hasCompanies: !!companies,
      hasFactories: !!factories,
    }
  },
})
