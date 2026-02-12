---
name: wecom-smartsheet
description: WeCom Smart Sheet(企业微信 智能表格) 연동 전문가. 필드 타입 변환, 양방향 동기화, API 에러 해결, 커스텀 컬럼 관리 등 Smart Sheet 통합 작업 시 사용.
allowed-tools: Read, Write, Glob, Grep, Bash, WebFetch, WebSearch
model: sonnet
triggers:
  - wecom
  - smartsheet
  - smart sheet
  - 스마트시트
  - 주문 관리
tags:
  - wecom
  - smartsheet
  - integration
  - sync
---

# WeCom Smart Sheet 연동 전문 스킬

WeCom(企业微信) Smart Sheet API와 Supabase를 양방향 동기화하는 주문 관리 시스템의 전문 개발 스킬입니다.

> 상세 가이드: `docs/WECOM-SMARTSHEET-GUIDE.md` 참조

---

## 사용 시점

- WeCom Smart Sheet API 연동 (레코드/필드/시트 CRUD)
- 양방향 동기화 로직 구현 또는 디버깅
- 새 필드 타입 추가/수정
- 커스텀 컬럼 CRUD
- WeCom API 에러 해결
- 주문 관리 스프레드시트 UI 개선
- 동기화 상태(sync_status) 관련 이슈

---

## 프로젝트 파일 구조

### WeCom 라이브러리 (핵심)

```
src/lib/wecom/
  client.ts       # API 클라이언트 (토큰 캐싱 7200s, CRUD, Webhook)
  types.ts        # WeCom API 타입 정의 (40+ 인터페이스)
  formatters.ts   # 필드 유형별 값 변환 규칙 (FIELD_TYPE_RULES)
  constants.ts    # 엔드포인트 (20+), 에러 코드, 상수
  wedrive.ts      # WeDrive 파일 업로드 (공간 생성, 청크 업로드)
  index.ts        # barrel export
```

### 주문 관리 프론트엔드

```
src/app/admin/orders/
  page.tsx                    # 메인 페이지 (멀티시트, 10s 폴링, Realtime)
  lib/types.ts                # WecomOrder, CustomColumn, SheetConfig 타입
  lib/fieldMapping.ts         # DB ↔ Smart Sheet 필드 매핑 + 변환 함수
  components/
    OrderSpreadsheet.tsx      # 스프레드시트 UI (8 고정 + N 커스텀)
    OrderToolbar.tsx          # 행/컬럼 추가, 동기화, 설정
    SheetTabs.tsx             # 멀티시트 탭
    AddColumnDialog.tsx       # 컬럼 추가 (14 필드 타입)
    EditFieldDialog.tsx       # 필드 속성 수정
    ColumnHeaderMenu.tsx      # 컬럼 헤더 메뉴 (이름변경/속성/삭제)
    cells/                    # 9개 셀 컴포넌트
      DatePickerCell, ImageCell, SelectCell, MultiSelectCell,
      UserCell, CheckboxCell, CurrencyCell, URLCell, ReadonlyCell
    field-config/             # 5개 필드 속성 에디터
      SelectOptionsEditor, NumberConfigEditor, CurrencyConfigEditor,
      DateFormatEditor, AutoNumberConfigEditor
```

### API 라우트

```
src/app/api/admin/orders/
  route.ts            # GET: 목록 | POST: 생성 (Supabase + Smart Sheet)
  [id]/route.ts       # PATCH: 셀 수정 + 동기화 | DELETE: 양쪽 삭제
  sync/route.ts       # POST: 전체 양방향 동기화 (페이지네이션, diff, 컬럼 감지)
  columns/route.ts    # GET/POST/PATCH/DELETE: 커스텀 컬럼 CRUD
  sheets/route.ts     # GET/POST/PATCH/DELETE: 시트 설정 CRUD
```

---

## WeCom API 핵심 규칙

### 인증

- **Base URL**: `https://qyapi.weixin.qq.com`
- **모든 요청**에 `?access_token=TOKEN` 쿼리 파라미터 필수
- **토큰 TTL**: 7200초(2시간), 서버 메모리 캐싱 (`client.ts`)
- **자동 갱신**: 에러코드 42001/40014 시 캐시 클리어 → 재발급 → 재시도

### 환경변수

```bash
WECOM_CORP_ID=ww625a2c039b14043f
WECOM_APP_SECRET=your-secret
```

---

## 필드 타입 시스템

### WeCom 15개 필드 타입 → 프론트엔드 14개 셀 타입

| WeCom 필드 타입 | 셀 타입 | 생성 시 필수 속성 |
|-----------------|---------|------------------|
| FIELD_TYPE_TEXT | text | 없음 |
| FIELD_TYPE_NUMBER | number | `property_number` **필수** |
| FIELD_TYPE_SINGLE_SELECT | select | `property_single_select` **필수** |
| FIELD_TYPE_MULTI_SELECT | multiselect | `property_multi_select` **필수** |
| FIELD_TYPE_DATE_TIME | date | `property_date_time` **필수** |
| FIELD_TYPE_ATTACHMENT | image | 없음 |
| FIELD_TYPE_USER | user | 없음 (내부 직원만) |
| FIELD_TYPE_CURRENCY | currency | `property_currency` |
| FIELD_TYPE_URL | url | 없음 |
| FIELD_TYPE_PHONE_NUMBER | phone | 없음 |
| FIELD_TYPE_EMAIL | email | 없음 |
| FIELD_TYPE_CHECKBOX | checkbox | 없음 |
| FIELD_TYPE_AUTO_NUMBER | autonumber | `property_auto_number` |
| FIELD_TYPE_CREATED_BY | readonly | 시스템 자동 (수정 불가) |
| FIELD_TYPE_MODIFIED_BY | readonly | 시스템 자동 (수정 불가) |

### 레코드 값 형식 (가장 중요한 규칙)

> **NUMBER와 DATE_TIME은 배열이 아닙니다! 이것이 가장 흔한 실수입니다.**

| 필드 타입 | Smart Sheet API 값 형식 | 예시 |
|-----------|------------------------|------|
| TEXT | `[{ type: 'text', text: '값' }]` | `[{ type: 'text', text: '홍길동' }]` |
| SINGLE_SELECT | `[{ text: '옵션', style: 1 }]` | `[{ text: '样品(샘플)', style: 1 }]` |
| MULTI_SELECT | `[{ text: '옵션1', style: 1 }, ...]` | 복수 항목 배열 |
| **NUMBER** | `숫자` **(배열 아님!)** | `123456` |
| **DATE_TIME** | `"밀리초 타임스탬프"` **(배열 아님!)** | `"1770303600000"` |
| ATTACHMENT | `[{ type: 'file', file_id: 'ID' }]` | WeDrive fileid 사용 |
| USER | `[{ type: 'user', user_id: 'ID' }]` | WeCom userid 사용 |
| CHECKBOX | `boolean` | `true` 또는 `false` |
| URL | `[{ type: 'url', url: '...', text: '...' }]` | url + display text |

### 역변환 (Smart Sheet → DB)

`extractCellText()` 함수 (`lib/fieldMapping.ts`):
- 문자열 → 직접 반환 (DateTime 타임스탬프)
- 숫자 → String() 변환
- boolean → String() 변환
- 배열 → first.type으로 분기 (text/url/user/file/select)
- MultiSelect → 쉼표 구분 문자열

---

## 양방향 동기화 아키텍처

### Push: 사용자 → Smart Sheet

```
셀 편집 → PATCH /api/admin/orders/[id]
  → Supabase UPDATE (sync_status='admin_synced')
  → convertToSmartSheetValue() 변환
  → Smart Sheet updateRecords API
  → 성공 시 sync_status='synced'
```

### Pull: Smart Sheet → Supabase (자동 폴링)

```
10초 간격 (SYNC_POLL_INTERVAL = 10000)
  → POST /api/admin/orders/sync
  → getRecords (500건 페이지네이션: offset/limit/has_more/next)
  → record_id 기반 diff:
    - DB에 없는 행 → INSERT
    - admin_synced 행 → 스킵 (synced로만 변경)
    - 변경 감지 → UPDATE (8개 고정 필드 + 커스텀 필드)
    - Smart Sheet에 없는 행 → Hard DELETE

5분 간격 컬럼 체크 (COLUMN_CHECK_INTERVAL = 300000)
  → getFields API → 새 필드 → wecom_order_columns INSERT
```

### Realtime: Supabase → 다른 클라이언트

```
Supabase Realtime 구독 (500ms debounced)
  → INSERT/UPDATE/DELETE 이벤트
  → 로컬 상태 자동 갱신
```

### sync_status 상태 머신

```
pending ──→ synced ←── 동기화 성공
              │
    Admin 수정│
              ▼
         admin_synced ─→ 다음 poll에서 synced로 복귀 (필드 덮어쓰기 건너뜀)
              │
    동기화 실패│
              ▼
            error
```

- **`pending`**: 초기 상태
- **`synced`**: Smart Sheet와 동기화 완료
- **`admin_synced`**: Admin에서 수정됨 → 다음 poll에서 1회 스킵 (revert 방지)
- **`error`**: 동기화 중 오류

---

## DB 스키마

### wecom_orders (주문 데이터)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| smart_sheet_doc_id | TEXT | WeCom 문서 ID |
| smart_sheet_sheet_id | TEXT | WeCom 시트 ID |
| smart_sheet_record_id | TEXT UNIQUE | WeCom 레코드 ID (양방향 매핑 키) |
| image_media_ids | TEXT[] | 이미지 file_id 배열 |
| order_type | TEXT | 주문유형 |
| order_number | INTEGER | 주문번호 |
| progress_status | TEXT | 진행상태 |
| completion_date | TIMESTAMPTZ | 완료일자 |
| project_manager_userid | TEXT | 담당자 WeCom userid |
| factory_manager_name | TEXT | 공장담당자 |
| notes | TEXT | 참고사항 |
| custom_fields | JSONB | 동적 커스텀 필드 |
| sync_status | TEXT | pending/synced/error/admin_synced |
| last_synced_at | TIMESTAMPTZ | 마지막 동기화 시각 |
| employee_id | UUID FK | 생성한 직원 |

### wecom_order_columns (커스텀 컬럼)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| doc_id, sheet_id | TEXT | 소속 시트 |
| field_key | TEXT | DB 내부 키 (예: `custom_1707123456789_1`) |
| field_title | TEXT | 한국어 제목 |
| chinese_title | TEXT | 중국어 제목 (**Smart Sheet 매핑용**) |
| field_type | TEXT | WeCom 필드 타입 (15종) |
| cell_type | TEXT | 프론트엔드 셀 타입 (14종) |
| sort_order | INTEGER | 표시 순서 |
| smart_sheet_field_id | TEXT | Smart Sheet 원본 필드 ID |
| field_properties | JSONB | 옵션, 포맷 등 |

### wecom_sheet_configs (시트 설정)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| doc_id, sheet_id | TEXT | WeCom 문서/시트 ID (UNIQUE) |
| doc_name, sheet_name | TEXT | 표시 이름 |
| sort_order | INTEGER | 탭 순서 |
| is_active | BOOLEAN | 활성 상태 |

---

## 필드 매핑 (DB ↔ Smart Sheet)

```typescript
// src/app/admin/orders/lib/fieldMapping.ts
const DB_TO_SMARTSHEET = {
  image_media_ids:         '图片(이미지)',
  order_type:              '订单类型(주문유형)',
  order_number:            '订单号(주문번호)',
  progress_status:         '进行状态(진행상태)',
  completion_date:         '完成日期(완료일자)',
  project_manager_userid:  '项目负责人',
  factory_manager_name:    '工厂负责人',
  notes:                   '注意事项(참고사항)',
}
```

커스텀 필드는 `wecom_order_columns.chinese_title`로 매핑됩니다.

---

## 주요 함정 (Gotchas)

### 1. 필드 값 형식 불일치
- **NUMBER와 DATE_TIME은 배열로 감싸지 않습니다** (가장 흔한 실수)
- NUMBER: `123` (O) vs `[{ type: 'text', text: '123' }]` (X)
- DATE_TIME: `"1735625722000"` (O) vs `[{ type: 'text', text: '...' }]` (X)

### 2. 필드 추가 순서
- WeCom `addFields`는 항상 **맨 앞에** 삽입
- 원하는 순서: A, B, C → 추가 순서: C, B, A (**역순**)
```typescript
const reversedFields = [...fields].reverse()
await addFields(docId, sheetId, reversedFields)
```

### 3. 필드 생성 시 필수 속성 누락
- NUMBER → `property_number` 없으면 에러 2022017
- SINGLE_SELECT → `property_single_select` 없으면 에러 2022020
- DATE_TIME → `property_date_time` 없으면 에러 2022018
- SELECT `options`는 빈 배열 `[]`로 시작, 레코드 추가 시 자동 생성

### 4. IP 화이트리스트 필수
- 신뢰 IP(企业可信IP) 미등록 시 모든 API 실패 (에러 60020)
- Vercel은 고정 IP 없음 → 프록시 서버 또는 Edge Function 필요
- 한국 기업은 ICP 비안(备案) 불가 → WeCom 이의 신청 필요

### 5. WeDrive 이미지 제한
- 일반 미디어 업로드(`/media/upload`)의 `media_id`는 Smart Sheet 첨부 불가 (3일 유효)
- WeDrive fileid 필요 → WeDrive VIP 유료 기능 (¥210/년/사용자)

### 6. admin_synced Revert 방지
- Admin에서 셀 수정 시 `sync_status='admin_synced'` 설정
- 다음 폴링에서 해당 행의 필드 덮어쓰기를 건너뜀
- Smart Sheet 전파 지연(수 초)으로 인한 이전 값 복원 방지

### 7. 시스템 필드 수정 불가
- `创建时间`, `最后编辑时间`, `创建人`, `最后编辑人`은 WeCom이 자동 관리
- 이 필드들에 대해 update_records 호출 시 에러 발생

### 8. API로만 문서 생성
- WeCom 앱에서 수동으로 만든 Smart Sheet는 `docid`를 API로 얻을 수 없음
- 반드시 `create_doc` API (doc_type: 10)로 생성해야 함

---

## 에러 코드 레퍼런스

| 코드 | 메시지 | 원인 | 해결 |
|------|--------|------|------|
| 0 | ok | 성공 | - |
| -1 | 시스템 바쁨 | 서버 과부하 | 재시도 |
| 40001 | invalid secret | Secret 오류 | .env 확인 |
| 40014 | invalid access_token | 토큰 무효 | 재발급 |
| 42001 | token expired | 토큰 만료 | 캐시 클리어 + 재발급 |
| 48002 | API 권한 없음 | 앱 권한 미설정 | 문서 API 권한 활성화 |
| 60020 | IP 미등록 | 신뢰 IP 없음 | 화이트리스트 등록 |
| 60111 | userid not found | 유효하지 않은 userid | WeCom 멤버 확인 |
| 640017 | 문서 API 비활성화 | 권한 미설정 | 관리 콘솔에서 활성화 |
| 640019 | 호출 횟수 초과 | Rate limit | 빈도 조절 |
| 640027 | 파라미터 오류 | 요청 형식 잘못 | 요청 바디 확인 |
| 640001 | invalid file/space | WeDrive ID 오류 | spaceid/fileid 확인 |
| 640015 | preview auth not support | WeDrive VIP 미구매 | VIP 구매 또는 기존 공간 사용 |
| 2022017 | invalid number field | property_number 누락 | 속성 추가 |
| 2022018 | invalid datetime field | property_date_time 누락 | 속성 추가 |
| 2022020 | invalid select field | property_single_select 누락 | 속성 추가 |

> 전체 에러 코드: https://developer.work.weixin.qq.com/document/path/96213

---

## 구현 체크리스트

### 새 필드 타입 추가 시

1. `src/app/admin/orders/lib/types.ts` — `CellType`에 새 타입 추가, `FIELD_TYPE_TO_CELL_TYPE` 매핑 추가, `FIELD_TYPE_OPTIONS` 배열에 추가
2. `src/lib/wecom/formatters.ts` — `FIELD_TYPE_RULES`에 변환 규칙 추가
3. `src/app/admin/orders/lib/fieldMapping.ts` — `extractCellText()`에 역변환 로직 추가
4. `src/app/admin/orders/components/cells/` — 새 셀 컴포넌트 생성
5. `src/app/admin/orders/components/OrderSpreadsheet.tsx` — `renderCell()` switch 문에 case 추가
6. (선택) `src/app/admin/orders/components/field-config/` — 필드 속성 에디터 생성

### 새 고정 필드 추가 시

1. DB 마이그레이션: `wecom_orders` 테이블에 컬럼 추가
2. `src/app/admin/orders/lib/types.ts` — `WecomOrder` 인터페이스에 필드 추가
3. `src/app/admin/orders/lib/fieldMapping.ts` — `DB_TO_SMARTSHEET` 매핑 추가, `ORDER_COLUMNS` 배열에 추가
4. `src/app/api/admin/orders/sync/route.ts` — `ALL_FIXED_FIELDS` 배열에 추가
5. Smart Sheet에 해당 필드가 존재하는지 확인

### 동기화 디버깅 시

1. 브라우저 콘솔에서 `[ORDERS]` 또는 `[SYNC]` 프리픽스 로그 확인
2. `sync_status` 값 확인: `admin_synced`가 계속 남아있지 않은지
3. Smart Sheet getRecords 응답의 `has_more` 확인 (페이지네이션 누락?)
4. `smart_sheet_record_id`가 null인 행이 있는지 (생성 실패?)
5. 커스텀 필드: `chinese_title` 매핑이 정확한지 확인

---

## 공식 문서 참조

- Smart Sheet API 개요: https://developer.work.weixin.qq.com/document/path/97392
- 레코드 추가: https://developer.work.weixin.qq.com/document/path/99907
- 레코드 조회: https://developer.work.weixin.qq.com/document/path/101158
- 레코드 수정: https://developer.work.weixin.qq.com/document/path/99909
- 레코드 삭제: https://developer.work.weixin.qq.com/document/path/99908
- 필드 조회: https://developer.work.weixin.qq.com/document/path/99914
- 필드 수정: https://developer.work.weixin.qq.com/document/path/99906
- Access Token: https://developer.work.weixin.qq.com/document/path/91039
- WeDrive 업로드: https://developer.work.weixin.qq.com/document/path/93657
- 에러 코드: https://developer.work.weixin.qq.com/document/path/96213
