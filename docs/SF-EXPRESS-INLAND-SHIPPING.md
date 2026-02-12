# SF Express 내륙 운송료 자동 계산 시스템

## 1. 개요

### 현재 상태
현재 내륙 운송료(중국 공장 → 운송업체 창고)는 **CBM × $70/CBM** 고정 단가로 단순 계산 중.

```
calculateInlandShipping(cbm) = cbm × 70 (USD)
```

### 변경 목표
SF Express(순펑택배) 실제 요금표 기반의 자동 계산 로직으로 **완전 대체**.

```
기존: 내륙운송료 = CBM × $70 → × 환율 → 원화
변경: 내륙운송료 = SF Express(중량, 부피, 출발지, 도착지, 서비스) → × 환율 → 원화
```

### 데이터 출처
- **요금표**: SF Express 배달원이 직접 제공한 장쑤성(江苏省) 발송 기준 실제 요금표
- **계산 규칙**: Multi-AI 3라운드 조사 (GLM + Codex + Claude 3회 교차 검증)
- **공식 참고**: [SF Express 운임시효 조회](https://www.sf-express.com/chn/sc/price-query)

---

## 2. SF Express 요금 체계 핵심 정리

### 2-1. 서비스 유형 (2종으로 간소화)

#### 제품 개편 이력

2021년 4월, SF Express는 대대적인 제품 개편을 실시:

| 변경 전 | 변경 후 | 설명 |
|---------|---------|------|
| 순풍차신 (次晨) + 표쾌 일부 노선 | **순풍특쾌 (特快)** | 통합, 주요 도시 익일 배송, 항공/고속철 |
| 순풍표쾌 (标快, 육로) | **순풍표쾌 (标快)** | 유지, 가성비 제품으로 재포지셔닝 |
| 순풍즉일 (即日) | **순풍즉일 (即日)** | 유지, 당일 배송 |
| 순풍표륙 (标陆) | 폐지 | 표쾌로 흡수 |

#### 우리 시스템 분류

SF Express 실제 서비스는 즉일/특쾌/표쾌/특혜 등 다양하지만, 우리 시스템에서는 **실제 사용 빈도**와 **체적 계수 차이**를 기준으로 2종으로 분류:

| 시스템 명칭 | SF Express 원래 명칭 | 체적 계수 | 배송 속도 | 설명 |
|------------|---------------------|----------|----------|------|
| **급송** (Express) | 특쾌 (特快) | **6000** (일부 노선 12000) | 1~2일 | 빠른 배송, 비용 높음 |
| **표준** (Standard) | 표쾌 (标快) | **12000** (<30kg) / **6000** (>=30kg) | 2~4일 | 일반 배송, 비용 저렴 |

> **간소화 이유**: 즉일은 동성 전용으로 성외 배송에 사용하지 않음. 차신은 2021년 특쾌로 통합 완료. 특혜(경제)는 요금표 미제공.

### 2-2. 핵심 계산 규칙

#### 체적중량 (Volumetric Weight)
```
체적중량(kg) = 가로(cm) × 세로(cm) × 높이(cm) ÷ 체적계수
```

| 서비스 | 조건 | 체적 계수 | 비고 |
|--------|------|----------|------|
| 급송 (특쾌) | 경제구역 외 (대부분) | 6000 | 항공 화물 표준 |
| 급송 (특쾌) | 경제구역 내 / 흑길요·내몽 일부 | 12000 | 우대 적용 |
| 표준 (표쾌) | 실중량 <30kg | 12000 | 부피 큰 화물에 유리 |
| 표준 (표쾌) | 실중량 >=30kg | 6000 | 대량 화물은 항공 기준 |

> **4대 경제구역** (같은 구역 내는 "성내" 취급):
> - 징진지(京津冀): 북경, 천진, 하북
> - 장저후완(江浙沪皖): **장쑤**, 저장, 상해, 안후이
> - 촨위(川渝): 사천, 중경
> - 헤이지랴오(黑吉辽): 흑룡강, 길림, 요녕
>
> 출처: [快递鸟](https://news.kdniao.com/logistics-qa/224160.html), [百运网](https://www.by56.com/news/40387.html), [Extrabux](https://www.extrabux.com/chs/guide/6575087)

**체적계수에 따른 실제 영향 예시 (50×40×30cm 박스):**
- 체적계수 12000: 체적중량 = 60,000/12,000 = **5.0kg**
- 체적계수 6000: 체적중량 = 60,000/6,000 = **10.0kg**
- → 같은 박스도 계수에 따라 **2배 차이** 발생

#### 계비중량 (Chargeable Weight)
```
계비중량 = MAX(실제중량, 체적중량)
```
둘 중 큰 값으로 요금 계산.

#### 중량 반올림 규칙 (단순화)

> **참고**: SF Express는 공식적으로 10~100kg 구간에서 "2378제(2退3进7退8进)"라는 고유 반올림 규칙을 사용합니다.
> 그러나 Multi-AI 분석 결과, 이 규칙의 가격 영향은 **최대 0.5kg (약 2.5~9위안)** 으로
> 전체 운임의 1~3%에 불과합니다. 구현 복잡도 대비 효과가 미미하므로 **일반 반올림으로 단순화**합니다.

| 무게 구간 | 반올림 단위 | 규칙 | 예시 |
|-----------|-----------|------|------|
| **<10kg** | 0.1kg | 사사오입 (일반 반올림) | 3.14 → 3.1, 3.15 → 3.2 |
| **10~100kg** | 0.5kg | 사사오입 (일반 반올림) | 10.2 → 10.0, 10.3 → 10.5 |
| **>=100kg** | 1kg | 사사오입 (일반 반올림) | 100.4 → 100, 100.5 → 101 |

### 2-3. 운임 계산 공식

#### 공식 A: 수중+속중 방식 (<30kg 또는 kg당 단가 없는 경우)
```
운임(위안) = 수중단가 + (계비중량 - 1) × 속중단가
결과 사사오입 정수
```

**예시**: 장쑤 → 호북, 표준, 5kg
```
= 18 + (5-1) × 5
= 18 + 20 = 38위안
```

#### 공식 B: kg당 단가 방식 (>=30kg이고 kg당 단가 있는 경우)
```
운임(위안) = 계비중량 × kg당단가
결과 사사오입 정수
```

**예시**: 장쑤 → 산동, 표준, 35kg
```
= 35 × 5 = 175위안
```

> **참고**: 30kg 이상에서 "수중+속중 → kg당 단가"로 전환되는 것은 **공식 문서에서 미확인**이며,
> 배달원 제공 요금표(내부 가격표)에서만 확인됩니다.
> 구현 시 kg당 단가가 있으면 사용하고, 없으면 수중+속중 공식을 적용합니다.

### 2-4. 30kg 기준 가격 공식 변화

표준 서비스에서 30kg를 기준으로 **계산 공식과 체적계수가 모두 바뀜**:

| 항목 | <30kg | >=30kg |
|------|-------|--------|
| **체적 계수** | 12000 | 6000 (체적중량 2배) |
| **계산 방식** | 수중 + (무게-1) × 속중 | 무게 × kg당단가 (있는 경우) |

**영향 분석**:
- 체적 계수 변경이 더 큰 영향 — 같은 박스도 체적중량이 2배로 뜀
- 계산 방식 변경은 수중 기본료가 없어지므로 같은 무게면 살짝 저렴

**구체적 예시 (장쑤 → 호북):**

| 상황 | 운임 | 비고 |
|------|------|------|
| 실제 5kg, 작은 박스 | 18+(5-1)×5 = **38원** | <30kg 수중+속중 공식 |
| 실제 29kg, 작은 박스 | 18+(29-1)×5 = **158원** | <30kg 수중+속중 공식 |
| 실제 30kg, 작은 박스 | 30×5 = **150원** | >=30kg kg당단가 공식 (더 저렴) |
| 실제 35kg, 50×40×30cm | MAX(35, 60000÷6000=10)=35 → 35×5 = **175원** | >=30kg kg당단가 공식 |

---

## 3. 장쑤성 요금표 데이터 (실제 요금표 기준)

### 3-1. 동성/성내 요금

> 참고: 동성/성내는 이미지 기준 즉일/차신/차일 서비스로 표기되어 있으나,
> 우리 시스템에서는 동성/인접 성은 사용 빈도가 낮아 우선순위 낮음.

| 목적지 | 즉일 수중/속중 | 차신 수중/속중 | 차일 수중/속중 |
|--------|-------------|-------------|-------------|
| 동성 (같은 시) | 12/2 | 12/2 | - |
| 무석,진강,소주,남통,양주,상주 | 20/2 | 12/2 | - |
| 염성,회안,연운항,태주 | - | 12/2 | - |
| 서주,숙천 | - | 12/2 | 12/2 |

### 3-2. 성외 요금 (급송=특쾌, 표준=표쾌)

#### 경제구역 내 (장저후완 + 인접)

| 목적지 | 차신 수중/속중 | 차일 수중/속중 | 표준(표쾌) 수중/속중 | 표준 >=30kg 단가 |
|--------|-------------|-------------|--------------------|-----------------|
| 상해 | 12/2 | - | 12/2 | - |
| 항주,호주,가흥 | 12/2 | - | 12/2 | - |
| 취주,영파,소흥,태주(浙),여수,금화 | 12/2 | 12/2 | 12/2 | - |
| 온주,단산 | - | 12/2 | 12/2 | - |
| 부양,합비,방부,무호,마안산,선성,육안 | 14/2 | - | 14/2 | - |
| 황산 | 14/2 | 14/2 | 14/2 | - |
| 기타 안후이 (화원,안경,숙주,혜주 등) | - | 14/2 | 14/2 | - |

> 경제구역 내(장저후완)는 체적계수 12000 적용

#### 경제구역 외

| 목적지 | 급송(특쾌) 수중/속중 | 표준(표쾌) 수중/속중 | 표준 >=30kg 단가 |
|--------|-------------------|--------------------|-----------------|
| 호북,하남,강서 | 22/8 | 18/5 | 5 |
| 산동 | 22/10 | 18/5 | 5 |
| 복건 | 22/10 | 18/6 | 6 |
| 북경,천진,하북,호남 | 23/10 | 18/5 | 5 |
| 섬서,산서 | 23/10 | 18/5 | 5 |
| 사천,귀주,중경,요녕,광서,감숙,영하 | 23/13 | 18/6 | 6 |
| **광주,심천,동관** | 23/13 | **18/9** | **9** |
| **기타 광동** | 23/13 | **18/6** | **6** |
| 운남 | 23/14 | 18/6 | 6 |
| 해남 | 23/14 | 18/6 | 6 |
| 길림 | 23/14 | 18/6 | 6 |
| 흑룡강 | 23/18 | 18/9 | 9 |
| 신장 | 26/21 | 20/10 | 10 |
| 청해(옥수) | 23/14 | 21/12 | - |
| 내몽고(대부분) | 23/13 | 18/6 | 6 |
| 내몽고(호론패이,흥안맹) | 23/18 | 18/9 | 9 |
| 서장(라싸,일카쩌,나곡,산남,림지) | 26/21 | 25/19 | - |
| 서장(창두) | - | 26/21 | - |

> **광주,심천,동관 차신**: 25/13 (별도 프리미엄)
>
> **"-" 표시**: 해당 서비스 이용 불가 (DB에서 `isAvailable: false`)
> **">=30kg 단가 없음"**: kg당 단가 미제공 → <30kg 공식(수중+속중)으로 계산

### 3-3. 이미지 vs 기존 문서 비교 (Multi-AI 검증 결과)

| # | 항목 | 기존 문서 | 이미지 확인 | 조치 |
|---|------|----------|-----------|------|
| 1 | 서주,숙천 차일 서비스 | 미기재 | 12/2 | ✅ 추가 완료 |
| 2 | 광주,심천,동관 차신 | 미기재 | 25/13 | ✅ 추가 완료 |
| 3 | 광동 세분화 | 전체 18/9/9 | 광심동 18/9/9, 기타 18/6/6 | ✅ 분리 완료 |
| 4 | 길림 급송 | 23/18 (이미지1) vs 23/14 (이미지2) | 이미지 간 불일치 | ✅ 이미지2(23/14) 채택 |
| 5 | 황산 별도 구분 | 미기재 | 14/2 (차신/차일) | ✅ 추가 완료 |
| 6 | 2378 규칙 | 구현 포함 | 공식 존재 확인 | ✅ 영향 미미 → 단순화 |

### 3-4. 1차 조사 자료 vs 실제 요금표 비교

| 항목 | 1차 조사 자료 (Multi-AI) | 실제 요금표 (이미지) | 원인 |
|------|------------------------|-------------------|------|
| 표쾌 성외 수중 | 22위안 | **18위안** (대부분) | 조사에서 특쾌/표쾌 혼동 |
| 표쾌 성외 속중 | 13~14위안/kg | **5~6위안/kg** | 동일 원인 |
| 특쾌 성외 속중 | 14~15위안/kg | **8~13위안/kg** | 과대 추정 |
| 표쾌 >=30kg | 데이터 없음 | **별도 kg당 단가** | 실제 요금표에서 발견 |
| 체적 계수 | 특쾌=6000, 표쾌=12000 | 확인 | 일치 |

> **교훈**: 인터넷 공시가(산객가)와 배달원 제공 요금표(월결/내부가)는 **상당한 차이**가 있음.
> 특히 표쾌 속중이 공시가(13~14위안) 대비 실제(5~6위안)로 절반 이하.

---

## 4. 출발지별 요금 처리

### 문제
SF Express는 **고정된 전국 요금표가 없음**. 출발지 성(省)마다 요금이 다름.
현재는 장쑤성 데이터만 보유.

### 핵심 발견 (Multi-AI 3라운드 합의)

1. **성외 수중(首重) 22위안은 전국적으로 거의 동일** (광동 성내 12위안 제외)
2. **성외 속중(续重)도 도착지 구역 기준으로 동일 패턴** 적용
3. **차이는 주로 성내/경제구역내 배송에서 발생**
4. **장쑤성 요금표로 성외 배송은 오차 ~10% 이내** 커버 가능
5. 월결(月结) 협의 고객은 산객 대비 20~40% 할인 → 별도 체계

### 해결 방안 (5가지)

#### 방안 1: 快递100 API ⭐ (가장 현실적, 권장)

```
비용: 39.9위안(약 7,600원) / 1만건
정확도: 중상 (예측값이지만 공시가 기반)
난이도: 낮음
SF 계정: 불필요
```

- 출발지 + 도착지 + 중량만 입력하면 SF 특쾌/표쾌 가격 반환
- Convex Action으로 구현 가능
- 월결 계정 없이 즉시 사용
- **MCP Server도 존재**: `kuaidi100-mcp` (2025년 출시, AI 에이전트 직접 호출 가능)

#### 방안 2: 장쑤성 요금표 그대로 적용 (무료, 폴백)

```
비용: 무료
정확도: 성외 ~90%, 성내 ~75%
난이도: 낮음
```

- **성외 수중(22위안)과 속중 패턴이 전국적으로 유사**하므로 장쑤 요금표를 다른 출발지에도 적용
- 성내 배송만 오차가 클 수 있음 (최대 25%)
- API 장애 시 폴백으로 활용

#### 방안 3: SF 공식 웹 크롤링 (요금표 갱신용)

```
비용: 무료
정확도: 높음 (공시가)
난이도: 높음 (Playwright 필요)
URL: https://www.sf-express.com/chn/sc/price-query
```

- JavaScript 렌더링 기반이라 단순 HTTP로 안 됨
- Playwright로 주기적 수집하여 정적 요금표 갱신에 활용
- 분기 1회 업데이트 권장

#### 방안 4: SF Open Platform API (가장 정확, 진입장벽 높음)

```
비용: 무료 (월결 계약 내)
정확도: 매우 높음 (협의가격 반영)
난이도: 높음 (기업 인증 3~5영업일)
URL: https://open.sf-express.com
```

- `EXP_RECE_QUERY_DELIVERTM` API로 실시간 운임+시효 예측
- 월결(月结) 계정 필수 → `searchPrice: "1"` 파라미터로 가격 활성화
- 반환 가격은 해당 월결 계정의 협의가격 기반
- API 엔드포인트: `sfapi.sf-express.com/std/service` (운영)

#### 방안 5: AI API 보조 활용 (주소 분류용)

```
비용: API 호출 비용
정확도: 가격 자체는 부정확 (환각 위험)
적합 용도: 주소 → 경제구역/도착지 카테고리 분류만
```

- GPT/Gemini에게 "이 주소가 어느 경제구역인지" 분류만 맡김
- 실제 가격 계산은 정적 요금표 로직이 담당
- **가격을 AI에게 직접 물어보는 것은 부적합** (3라운드 모든 AI 합의)

### 권장 아키텍처

```
┌─────────────────────────────────────────┐
│         사용자 입력                       │
│  출발지(공장), 도착지(창고), 중량, 부피    │
└──────────────────┬──────────────────────┘
                   │
      ┌────────────▼────────────┐
      │    경제구역/루트 판별     │
      │  (chinaRegions.ts 기반)  │
      └────────────┬────────────┘
                   │
    ┌──────────────┼──────────────┐
    ▼              ▼              ▼
┌────────┐  ┌──────────┐  ┌──────────┐
│ 快递100 │  │ 정적 계산 │  │ SF API   │
│ API    │  │ (폴백)   │  │ (옵션)   │
│ (주력) │  │ 장쑤 기반 │  │ 월결 필요 │
└───┬────┘  └─────┬────┘  └──────────┘
    │             │
    └──────┬──────┘
           ▼
    ┌──────────────┐
    │ 결과 표시     │
    │ "예상 운임"   │
    │ + 계산 상세   │
    └──────────────┘
```

### 출발지 프로파일 시스템 (DB 설계)

관리자가 출발지별 요금 데이터를 추가할 수 있는 확장 구조:

```
sfExpressOriginProfiles (출발지 프로파일)
  ├── 장쑤성 프로파일 ← 현재 데이터 있음 (기본값)
  │   ├── 목적지 그룹 1: 호북,하남,강서
  │   ├── 목적지 그룹 2: 산동
  │   └── ...
  ├── 광둥성 프로파일 ← 추후 데이터 확보 시 추가
  └── 저장성 프로파일 ← 추후 데이터 확보 시 추가
```

- 공장(Factory)의 `provinceCode`로 자동 매칭
- 해당 출발지 프로파일이 없으면 → **장쑤성 요금표로 폴백** (방안 2)

---

## 5. 부가비용

SF Express 운임에는 기본 운임 외 **부가비용**이 추가될 수 있음:

| 부가비용 | 설명 | 금액/비율 | 적용 주기 |
|----------|------|-----------|----------|
| **연료할증료** (燃油附加费) | 유가 연동, 운임에 비례 | 운임 × 5~15% (변동) | 매월 1일 갱신 |
| **자원조절비** (资源调节费) | 성수기/명절 한정 | 0.1~1.2위안/kg | 춘절/국경절 등 |
| **초장초중 부가요금** | 단건 >50kg 또는 규격 초과 | 별도 부과 | 상시 |
| **편벽지역 서비스비** | 원격 도서산간 | 별도 부과 | 상시 |

> **구현 참고**: 연료할증료는 영향이 크므로 별도 비율 파라미터로 관리 권장.
> 자원조절비는 춘절(1~2월)/국경절(10월) 기간 감지 시 가산.
> 2025년 춘절 자원조절비: 1월 28일~2월 4일 추가 부과.

---

## 6. API 연동 옵션

### 6-1. 快递100 API (권장)

| 항목 | 내용 |
|------|------|
| **엔드포인트** | `POST https://cloud.kuaidi100.com/api` |
| **인증** | `secret_key` + `secret_code` + `MD5(key+secret)` 서명 |
| **주요 파라미터** | `companyName: "shunfeng"`, `sendAddr`, `receiveAddr`, `weight` |
| **응답** | 서비스별 예측 가격 (특쾌/표쾌 등) |
| **가격** | 20건 무료 체험 / 1만건 39.9위안 / 50만건 4,000위안 |
| **주의** | 반환 가격은 **예측값(预估)**, "예상 운임" 라벨 표기 권장 |

```typescript
// Convex Action 예시
async function estimateSFExpressRate(
  sendAddr: string,    // "江苏省苏州市工业园区"
  receiveAddr: string, // "广东省深圳市南山区"
  weightKg: number
) {
  const sign = md5(secretKey + secretCode).toUpperCase()
  const response = await fetch('https://cloud.kuaidi100.com/api', {
    method: 'POST',
    body: new URLSearchParams({
      secret_key: secretKey,
      secret_code: secretCode,
      secret_sign: sign,
      companyName: 'shunfeng',
      sendAddr,
      receiveAddr,
      weight: weightKg.toString()
    })
  })
  // 응답: { data: { options: [{ price, serviceName, deliveryTime }] } }
}
```

### 6-2. SF Express Open Platform API

| 항목 | 내용 |
|------|------|
| **플랫폼** | https://open.sf-express.com |
| **API** | `EXP_RECE_QUERY_DELIVERTM` (운임+시효 예측) |
| **인증** | `partnerID` + `msgDigest` (OAuth 2.0) |
| **필수 조건** | 월결(月结) 계약 + 기업 실명 인증 |
| **엔드포인트** | `sfapi.sf-express.com/std/service` (운영) |
| **비용** | 무료 (월결 계약 내) |

### 6-3. SF 공식 웹 운임 계산기

| 항목 | 내용 |
|------|------|
| **URL** | https://www.sf-express.com/chn/sc/price-query |
| **입력** | 출발지, 도착지, 중량, 부피, 발송시간 |
| **출력** | 예상 운임, 배송 시효, 연료할증료 포함 |
| **제약** | JavaScript 렌더링 기반 → Playwright 필요 |
| **활용** | 분기 1회 정적 요금표 갱신용 |

---

## 7. 구현 계획

### Phase 1: 기반 레이어 (타입 + 순수 계산 함수)

#### 1-1. 타입 정의 — `src/types/sfExpress.ts` (신규)

```typescript
// 서비스 코드 (2종)
type SFServiceCode = "express" | "standard"  // 급송 / 표준

// 계산 입력
interface SFExpressCalculationInput {
  actualWeightKg: number           // 실제 중량 (kg)
  lengthCm: number                 // 가로 (cm)
  widthCm: number                  // 세로 (cm)
  heightCm: number                 // 높이 (cm)
  serviceCode: SFServiceCode       // 서비스 종류
}

// 요금 데이터 (DB에서 조회)
interface SFExpressRate {
  firstWeightPrice: number         // 수중 단가 (위안)
  additionalWeightPrice: number    // 속중 단가 (위안/kg)
  bulkPricePerKg?: number          // >=30kg kg당 단가 (위안, 표준만)
  isAvailable: boolean             // 서비스 이용 가능 여부
}

// 계산 결과
interface SFExpressCalculationResult {
  actualWeightKg: number           // 실제 중량
  volumetricWeightKg: number       // 체적 중량
  chargeableWeightKg: number       // 계비 중량 (MAX)
  roundedWeightKg: number          // 반올림 적용 후
  totalFreightCNY: number          // 운임 (위안)
  totalFreightKRW: number          // 운임 (원화)
  calculationMethod: "firstWeight" | "bulkRate"  // 적용된 공식
  formulaDescription: string       // UI 표시용 계산 과정 설명
}
```

#### 1-2. 순수 계산 함수 — `src/lib/calculations/sfExpress.ts` (신규)

| 함수 | 설명 |
|------|------|
| `calculateVolumetricWeight(l, w, h, divisor)` | 체적중량 계산 |
| `roundWeight(weight)` | 구간별 일반 반올림 적용 |
| `getVolumetricDivisor(serviceCode, weightKg, routeType)` | 서비스별 체적 계수 반환 |
| `calculateSFExpressFreight(input, rate, cnyRate)` | 운임 총 계산 |
| `findDestinationGroup(groups, destProvinceCode, destCityCode)` | 목적지 그룹 매칭 |

**체적 계수 결정 로직:**
```
급송 (express)  → 경제구역 내: 12000, 경제구역 외: 6000
표준 (standard) → <30kg: 12000, >=30kg: 6000
```

**운임 계산 분기:**
```
if (계비중량 < 30 || !bulkPricePerKg) {
  운임 = 수중 + (계비중량 - 1) × 속중
} else {
  // 표준 >=30kg: 체적계수를 6000으로 재계산
  체적중량_재계산 = L×W×H / 6000
  계비중량_재계산 = MAX(실제중량, 체적중량_재계산)
  운임 = 계비중량_재계산 × kg당단가
}
```

### Phase 2: DB 레이어 (Convex 스키마 + API)

#### 2-1. 스키마 — `convex/schema.ts` (수정, 3개 테이블 추가)

```
sfExpressOriginProfiles — 출발지 프로파일 (장쑤성, 광둥성 등)
  - name: string (예: "장쑤성")
  - provinceCode: string (예: "320000")
  - description?: string

sfExpressDestinationGroups — 목적지 그룹 (같은 요금 성/시 묶음)
  - originProfileId: Id<"sfExpressOriginProfiles">
  - name: string (예: "호북,하남,강서")
  - provinceCodes: string[] (예: ["420000","410000","360000"])
  - cityCodes?: string[] (특정 시 지정, 내몽고 등)

sfExpressRates — 요금 데이터
  - destinationGroupId: Id<"sfExpressDestinationGroups">
  - serviceCode: "express" | "standard"
  - firstWeightPrice: number (수중, 위안)
  - additionalWeightPrice: number (속중, 위안/kg)
  - bulkPricePerKg?: number (>=30kg kg당 단가)
  - isAvailable: boolean
```

> **서비스 유형 테이블은 생략** — 급송/표준 2종 고정이므로 코드 레벨 상수로 충분.

#### 2-2. Convex API 함수 (3개 신규 파일)

| 파일 | 기능 |
|------|------|
| `convex/sfExpressOriginProfiles.ts` | CRUD + `getByProvince` 쿼리 |
| `convex/sfExpressDestinationGroups.ts` | CRUD + `listByOrigin` 쿼리 |
| `convex/sfExpressRates.ts` | CRUD + `findRate(originProvince, destProvince, service)` + 장쑤성 시드 |

#### 2-3. 시드 데이터 — `src/data/sfExpressJiangsuSeed.ts` (신규)

섹션 3의 요금표를 TypeScript 상수로 변환. Convex mutation으로 DB에 주입.

### Phase 3: 기존 시스템 수정 (내륙운송료 교체)

#### 3-1. 삭제할 것

| 파일 | 삭제 항목 |
|------|----------|
| `src/lib/calculations/shipping.ts` | `InlandShippingConfig`, `DEFAULT_INLAND_CONFIG`, `calculateInlandShipping()` |
| `src/lib/calculations/index.ts` | `costSettings.inland` 파라미터 |
| `convex/costSettings.ts` | "inland" 타입 시드 데이터 |

#### 3-2. 수정할 것 — `src/types/shipping.ts`

```diff
 CalculationResult:
- inlandShippingUSD: number
+ inlandShippingCNY: number       // SF Express 내륙 운임 (위안)
  inlandShippingKRW: number       // 원화 환산 (유지)
+ sfExpressDetail?: {             // SF Express 계산 상세 (UI 표시용)
+   serviceCode: SFServiceCode
+   serviceNameKo: string         // "급송" | "표준"
+   chargeableWeightKg: number
+   calculationMethod: "firstWeight" | "bulkRate"
+   formulaDescription: string    // "수중 18원 + 속중 4kg × 5원/kg"
+ }
```

#### 3-3. 수정할 것 — `src/lib/calculations/index.ts`

`calculateImportCost` 파라미터 변경:

```diff
- costSettings.inland?: InlandShippingConfig
+ sfExpressInput?: {              // SF Express 입력 (선택적)
+   actualWeightKg: number
+   lengthCm: number
+   widthCm: number
+   heightCm: number
+   serviceCode: SFServiceCode
+ }
+ sfExpressRate?: SFExpressRate    // DB에서 매칭된 요금
+ cnyRate?: number                // CNY→KRW 환율
```

#### 3-4. 수정할 것 — `src/lib/calculations/multiProduct.ts`

다중 제품일 때:
1. 모든 제품의 **총 중량** + **총 포장 부피**로 하나의 SF Express 운임 계산
2. 결과를 기존 `distributeSharedCostsByCbmRatio` 함수로 제품별 분배

#### 3-5. 수정할 것 — 결과 표시 UI

| 파일 | 변경 |
|------|------|
| `CostBreakdown.tsx` | 내륙운송료 → SF Express 상세 (서비스명, 계비중량, 공식) 표시 |
| `MultiProductCostBreakdown.tsx` | 동일 변경 |

### Phase 4: 커스텀 훅 — `src/hooks/useSFExpressRates.ts` (신규)

```typescript
function useSFExpressCalculation(
  originProvinceCode: string | undefined,    // 공장 위치
  destinationProvinceCode: string | undefined, // 창고 위치
  destinationCityCode: string | undefined,
  serviceCode: SFServiceCode | undefined
)
// 반환: { rate, isLoading, error }
// 자동으로: 출발지 프로파일 매칭 → 목적지 그룹 매칭 → 요금 조회
// 프로파일 없으면 → 장쑤성 폴백
```

### Phase 5: UI 컴포넌트

#### 5-1. SF Express 선택기 — `src/components/calculator/input/SFExpressInlandSelector.tsx` (신규)

공장(출발지)과 창고(도착지)가 이미 선택되어 있으므로 자동 매칭.

```
[SF Express 내륙 운송]
서비스: [표준 ▼] [급송]
총 중량: 12.5 kg (자동 계산)
포장 크기: [40] × [30] × [25] cm

계산 결과: ¥38 (약 7,410원)
└ 계비중량 5.0kg | 수중 18원 + 속중 4kg × 5원/kg
```

#### 5-2. 관리자 요금표 관리 — `src/components/calculator/admin/SFExpressRateManager.tsx` (신규)

기존 `SettingsModal.tsx`에 새 탭으로 추가.

구성:
1. 출발지 프로파일 선택/추가
2. 목적지 그룹별 요금 테이블
3. 장쑤성 기본 데이터 시드 버튼

### Phase 6: 快递100 API 연동 (선택적)

#### 6-1. Convex Action — `convex/kuaidi100.ts` (신규)

```typescript
// "use node" 환경에서 외부 API 호출
// 환경변수: KUAIDI100_KEY, KUAIDI100_SECRET_CODE
// 기능: 출발지/도착지/중량으로 SF 운임 예측 조회
```

#### 6-2. 환경변수 — `.env`

```
KUAIDI100_KEY=xxx
KUAIDI100_SECRET_CODE=xxx
```

---

## 8. 파일 변경 목록

### 신규 파일 (8개)

| 파일 | 목적 |
|------|------|
| `src/types/sfExpress.ts` | SF Express 타입 정의 |
| `src/lib/calculations/sfExpress.ts` | 순수 계산 함수 (체적중량, 반올림, 운임) |
| `src/data/sfExpressJiangsuSeed.ts` | 장쑤성 시드 데이터 상수 |
| `convex/sfExpressOriginProfiles.ts` | 출발지 프로파일 CRUD |
| `convex/sfExpressDestinationGroups.ts` | 목적지 그룹 CRUD |
| `convex/sfExpressRates.ts` | 요금 CRUD + 시드 |
| `src/hooks/useSFExpressRates.ts` | Convex 훅 |
| `convex/kuaidi100.ts` | 快递100 API 연동 (선택적) |

### 신규 UI 파일 (2개)

| 파일 | 목적 |
|------|------|
| `src/components/calculator/input/SFExpressInlandSelector.tsx` | 사용자 선택 UI |
| `src/components/calculator/admin/SFExpressRateManager.tsx` | 관리자 요금표 UI |

### 수정 파일 (8개)

| 파일 | 변경 |
|------|------|
| `convex/schema.ts` | 3개 테이블 추가 |
| `src/types/shipping.ts` | `inlandShippingUSD` → `inlandShippingCNY`, `sfExpressDetail` 추가 |
| `src/lib/calculations/shipping.ts` | `calculateInlandShipping` 관련 삭제 |
| `src/lib/calculations/index.ts` | SF Express 계산으로 교체 |
| `src/lib/calculations/multiProduct.ts` | SF Express 계산으로 교체 |
| `src/components/calculator/result/CostBreakdown.tsx` | SF Express 상세 표시 |
| `src/components/calculator/result/MultiProductCostBreakdown.tsx` | SF Express 상세 표시 |
| `src/components/calculator/admin/SettingsModal.tsx` | "내륙 운송료" 탭 → "SF Express 요금표" 탭 |

### 활용할 기존 리소스

| 파일 | 활용 |
|------|------|
| `src/data/chinaRegions.ts` | 성/시 코드 매핑 (`getProvinceByCode`, `getCityByCode`) |
| `src/lib/calculations/costs.ts` | `distributeSharedCostsByCbmRatio` (CBM 비율 분배) |
| `src/lib/calculations/rton.ts` | R.TON 계산 (총 중량 산출) |

---

## 9. 검증 방법

### 단위 테스트

| 테스트 | 입력 | 기대 결과 |
|--------|------|----------|
| 중량 반올림 (<10kg) | 3.14kg | 3.1kg |
| 중량 반올림 (10~100kg) | 10.3kg | 10.5kg |
| 중량 반올림 (>=100kg) | 100.4kg | 100kg |
| 표준 운임 | 장쑤→호북, 5kg | 18 + 4×5 = 38위안 |
| 표준 >=30kg | 장쑤→산동, 35kg | 35×5 = 175위안 |
| 체적중량 우선 | 급송, 1kg, 50×40×30cm | 체적=10kg → 계비10kg |
| 체적계수 변경 | 표준, 같은 박스 | <30kg: 체적5kg / >=30kg: 체적10kg |
| 광동 세분화 | 장쑤→심천, 표준 | 18/9/9 (광심동) |
| 광동 세분화 | 장쑤→기타광동, 표준 | 18/6/6 (기타) |

### 통합 테스트

1. 공장(장쑤) → 창고(호북) → 표준 선택 → 요금 자동 표시
2. 다중 제품: 2개 제품 → SF Express 운임이 CBM 비율로 정확 분배
3. 출발지 프로파일 없는 공장 → 장쑤성 요금표로 폴백 계산
4. 서비스 불가 목적지 (서장-급송) → "이용 불가" 표시
5. 快递100 API 연동 시: API 예측값과 정적 계산값 비교 표시

---

## 10. 참고 출처

| 출처 | URL | 용도 |
|------|-----|------|
| SF Express 운임시효 조회 | https://www.sf-express.com/chn/sc/price-query | 공식 가격 확인 |
| SF Express 특쾌 상품 | https://www.sf-express.com/chn/sc/express/delivery/speedy | 서비스 설명 |
| SF Express 표쾌 상품 | https://www.sf-express.com/chn/sc/express/delivery/standard | 서비스 설명 |
| SF Express 개방 플랫폼 | https://open.sf-express.com | API 연동 |
| 快递100 운임 API | https://cloud.kuaidi100.com/platform/productdetail/32164362436.shtml | API 연동 |
| 快递100 MCP Server | https://github.com/kuaidi100-api/kuaidi100-MCP | AI 에이전트 연동 |
| 百运网 요금 해석 | https://www.by56.com/news/40387.html | 요금 체계 참고 |
| Extrabux 요금 가이드 | https://www.extrabux.com/chs/guide/6575087 | 요금 체계 참고 |
| 快递鸟 체적중량 설명 | https://news.kdniao.com/logistics-qa/224160.html | 계산 규칙 참고 |
