/**
 * 메인 홈 페이지
 *
 * 통합 수입원가 계산기를 표시합니다.
 * 환율 확인 → 품목 검색 → 금액 입력 → 결과 비교까지
 * 하나의 페이지에서 완료할 수 있습니다.
 */

import { ImportCalculator } from "@/components/calculator"
import { RtonCalculatorBanner } from "@/components/calculator/RtonCalculatorBanner"

export default function Home() {
  return (
    <>
      <ImportCalculator />
      <RtonCalculatorBanner />
    </>
  )
}
