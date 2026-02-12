// 중국 행정구역 데이터 (성급 + 지급시, 2단계)
// 코드 체계: GB/T 2260 (6자리 행정구역 코드)
// 표시 포맷: "한국어명(중국어)" (예: "장쑤성(江苏省)")

// ===== 타입 정의 =====

export interface ChinaProvince {
  code: string        // 행정구역 코드 (예: "320000")
  nameKo: string      // 한국어명 (예: "장쑤성")
  nameCn: string      // 중국어명 (예: "江苏省")
  type: "municipality" | "province" | "autonomous" | "sar"
  cities: ChinaCity[]
}

export interface ChinaCity {
  code: string        // 행정구역 코드 (예: "320500")
  nameKo: string      // 한국어명 (예: "쑤저우시")
  nameCn: string      // 중국어명 (예: "苏州市")
}

// ===== 좌표 데이터 =====

import { CHINA_CITY_COORDINATES } from "./chinaCityCoordinates"

// 도시 좌표 조회
export function getCityCoordinates(cityCode: string): { lat: number; lng: number } | null {
  return CHINA_CITY_COORDINATES[cityCode] ?? null
}

// 두 도시 간 직선 거리 계산 (Haversine 공식, km 단위)
export function calculateDistance(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  const R = 6371 // 지구 반지름 (km)
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(coord1.lat * Math.PI / 180) *
    Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ===== 헬퍼 함수 =====

// 표시 포맷: "장쑤성(江苏省)"
export function formatRegionName(nameKo: string, nameCn: string): string {
  return `${nameKo}(${nameCn})`
}

// 성+시 전체 주소 포맷: "장쑤성(江苏省) 쑤저우시(苏州市)"
export function formatFullAddress(
  provinceCode: string,
  cityCode: string
): string {
  const province = getProvinceByCode(provinceCode)
  const city = getCityByCode(provinceCode, cityCode)
  if (!province) return ""
  if (!city) return formatRegionName(province.nameKo, province.nameCn)
  // 직할시는 성 이름만 표시 (성과 시가 동일)
  if (province.type === "municipality") {
    return formatRegionName(province.nameKo, province.nameCn)
  }
  return `${formatRegionName(province.nameKo, province.nameCn)} ${formatRegionName(city.nameKo, city.nameCn)}`
}

// 코드로 성 찾기
export function getProvinceByCode(code: string): ChinaProvince | undefined {
  return CHINA_REGIONS.find((p) => p.code === code)
}

// 코드로 시 찾기
export function getCityByCode(
  provinceCode: string,
  cityCode: string
): ChinaCity | undefined {
  const province = getProvinceByCode(provinceCode)
  return province?.cities.find((c) => c.code === cityCode)
}

// ===== 행정구역 데이터 =====

export const CHINA_REGIONS: ChinaProvince[] = [
  // ==========================================
  // 직할시 (4개)
  // ==========================================
  {
    code: "110000",
    nameKo: "베이징시",
    nameCn: "北京市",
    type: "municipality",
    cities: [
      { code: "110100", nameKo: "베이징시", nameCn: "北京市" },
    ],
  },
  {
    code: "120000",
    nameKo: "톈진시",
    nameCn: "天津市",
    type: "municipality",
    cities: [
      { code: "120100", nameKo: "톈진시", nameCn: "天津市" },
    ],
  },
  {
    code: "310000",
    nameKo: "상하이시",
    nameCn: "上海市",
    type: "municipality",
    cities: [
      { code: "310100", nameKo: "상하이시", nameCn: "上海市" },
    ],
  },
  {
    code: "500000",
    nameKo: "충칭시",
    nameCn: "重庆市",
    type: "municipality",
    cities: [
      { code: "500100", nameKo: "충칭시", nameCn: "重庆市" },
    ],
  },

  // ==========================================
  // 성 (23개)
  // ==========================================
  {
    code: "130000",
    nameKo: "허베이성",
    nameCn: "河北省",
    type: "province",
    cities: [
      { code: "130100", nameKo: "스자좡시", nameCn: "石家庄市" },
      { code: "130200", nameKo: "탕산시", nameCn: "唐山市" },
      { code: "130300", nameKo: "친황다오시", nameCn: "秦皇岛市" },
      { code: "130400", nameKo: "한단시", nameCn: "邯郸市" },
      { code: "130500", nameKo: "싱타이시", nameCn: "邢台市" },
      { code: "130600", nameKo: "바오딩시", nameCn: "保定市" },
      { code: "130700", nameKo: "장자커우시", nameCn: "张家口市" },
      { code: "130800", nameKo: "청더시", nameCn: "承德市" },
      { code: "130900", nameKo: "창저우시", nameCn: "沧州市" },
      { code: "131000", nameKo: "랑팡시", nameCn: "廊坊市" },
      { code: "131100", nameKo: "헝수이시", nameCn: "衡水市" },
    ],
  },
  {
    code: "140000",
    nameKo: "산시성",
    nameCn: "山西省",
    type: "province",
    cities: [
      { code: "140100", nameKo: "타이위안시", nameCn: "太原市" },
      { code: "140200", nameKo: "다퉁시", nameCn: "大同市" },
      { code: "140300", nameKo: "양취안시", nameCn: "阳泉市" },
      { code: "140400", nameKo: "창즈시", nameCn: "长治市" },
      { code: "140500", nameKo: "진청시", nameCn: "晋城市" },
      { code: "140600", nameKo: "숴저우시", nameCn: "朔州市" },
      { code: "140700", nameKo: "진중시", nameCn: "晋中市" },
      { code: "140800", nameKo: "윈청시", nameCn: "运城市" },
      { code: "140900", nameKo: "신저우시", nameCn: "忻州市" },
      { code: "141000", nameKo: "린펀시", nameCn: "临汾市" },
      { code: "141100", nameKo: "뤼량시", nameCn: "吕梁市" },
    ],
  },
  {
    code: "210000",
    nameKo: "랴오닝성",
    nameCn: "辽宁省",
    type: "province",
    cities: [
      { code: "210100", nameKo: "선양시", nameCn: "沈阳市" },
      { code: "210200", nameKo: "다롄시", nameCn: "大连市" },
      { code: "210300", nameKo: "안산시", nameCn: "鞍山市" },
      { code: "210400", nameKo: "푸순시", nameCn: "抚顺市" },
      { code: "210500", nameKo: "번시시", nameCn: "本溪市" },
      { code: "210600", nameKo: "단둥시", nameCn: "丹东市" },
      { code: "210700", nameKo: "진저우시", nameCn: "锦州市" },
      { code: "210800", nameKo: "잉커우시", nameCn: "营口市" },
      { code: "210900", nameKo: "푸신시", nameCn: "阜新市" },
      { code: "211000", nameKo: "랴오양시", nameCn: "辽阳市" },
      { code: "211100", nameKo: "판진시", nameCn: "盘锦市" },
      { code: "211200", nameKo: "톄링시", nameCn: "铁岭市" },
      { code: "211300", nameKo: "차오양시", nameCn: "朝阳市" },
      { code: "211400", nameKo: "후루다오시", nameCn: "葫芦岛市" },
    ],
  },
  {
    code: "220000",
    nameKo: "지린성",
    nameCn: "吉林省",
    type: "province",
    cities: [
      { code: "220100", nameKo: "창춘시", nameCn: "长春市" },
      { code: "220200", nameKo: "지린시", nameCn: "吉林市" },
      { code: "220300", nameKo: "쓰핑시", nameCn: "四平市" },
      { code: "220400", nameKo: "랴오위안시", nameCn: "辽源市" },
      { code: "220500", nameKo: "통화시", nameCn: "通化市" },
      { code: "220600", nameKo: "바이산시", nameCn: "白山市" },
      { code: "220700", nameKo: "쑹위안시", nameCn: "松原市" },
      { code: "220800", nameKo: "바이청시", nameCn: "白城市" },
      { code: "222400", nameKo: "옌볜조선족자치주", nameCn: "延边朝鲜族自治州" },
    ],
  },
  {
    code: "230000",
    nameKo: "헤이룽장성",
    nameCn: "黑龙江省",
    type: "province",
    cities: [
      { code: "230100", nameKo: "하얼빈시", nameCn: "哈尔滨市" },
      { code: "230200", nameKo: "치치하얼시", nameCn: "齐齐哈尔市" },
      { code: "230300", nameKo: "지시시", nameCn: "鸡西市" },
      { code: "230400", nameKo: "허강시", nameCn: "鹤岗市" },
      { code: "230500", nameKo: "솽야산시", nameCn: "双鸭山市" },
      { code: "230600", nameKo: "다칭시", nameCn: "大庆市" },
      { code: "230700", nameKo: "이춘시", nameCn: "伊春市" },
      { code: "230800", nameKo: "자무쓰시", nameCn: "佳木斯市" },
      { code: "230900", nameKo: "치타이허시", nameCn: "七台河市" },
      { code: "231000", nameKo: "무단장시", nameCn: "牡丹江市" },
      { code: "231100", nameKo: "헤이허시", nameCn: "黑河市" },
      { code: "231200", nameKo: "쑤이화시", nameCn: "绥化市" },
      { code: "232700", nameKo: "다싱안링지구", nameCn: "大兴安岭地区" },
    ],
  },
  {
    code: "320000",
    nameKo: "장쑤성",
    nameCn: "江苏省",
    type: "province",
    cities: [
      { code: "320100", nameKo: "난징시", nameCn: "南京市" },
      { code: "320200", nameKo: "우시시", nameCn: "无锡市" },
      { code: "320300", nameKo: "쉬저우시", nameCn: "徐州市" },
      { code: "320400", nameKo: "창저우시", nameCn: "常州市" },
      { code: "320500", nameKo: "쑤저우시", nameCn: "苏州市" },
      { code: "320600", nameKo: "난퉁시", nameCn: "南通市" },
      { code: "320700", nameKo: "롄윈강시", nameCn: "连云港市" },
      { code: "320800", nameKo: "화이안시", nameCn: "淮安市" },
      { code: "320900", nameKo: "옌청시", nameCn: "盐城市" },
      { code: "321000", nameKo: "양저우시", nameCn: "扬州市" },
      { code: "321100", nameKo: "전장시", nameCn: "镇江市" },
      { code: "321200", nameKo: "타이저우시", nameCn: "泰州市" },
      { code: "321300", nameKo: "쑤쳰시", nameCn: "宿迁市" },
    ],
  },
  {
    code: "330000",
    nameKo: "저장성",
    nameCn: "浙江省",
    type: "province",
    cities: [
      { code: "330100", nameKo: "항저우시", nameCn: "杭州市" },
      { code: "330200", nameKo: "닝보시", nameCn: "宁波市" },
      { code: "330300", nameKo: "원저우시", nameCn: "温州市" },
      { code: "330400", nameKo: "자싱시", nameCn: "嘉兴市" },
      { code: "330500", nameKo: "후저우시", nameCn: "湖州市" },
      { code: "330600", nameKo: "사오싱시", nameCn: "绍兴市" },
      { code: "330700", nameKo: "진화시", nameCn: "金华市" },
      { code: "330800", nameKo: "취저우시", nameCn: "衢州市" },
      { code: "330900", nameKo: "저우산시", nameCn: "舟山市" },
      { code: "331000", nameKo: "타이저우시", nameCn: "台州市" },
      { code: "331100", nameKo: "리수이시", nameCn: "丽水市" },
    ],
  },
  {
    code: "340000",
    nameKo: "안후이성",
    nameCn: "安徽省",
    type: "province",
    cities: [
      { code: "340100", nameKo: "허페이시", nameCn: "合肥市" },
      { code: "340200", nameKo: "우후시", nameCn: "芜湖市" },
      { code: "340300", nameKo: "벙부시", nameCn: "蚌埠市" },
      { code: "340400", nameKo: "화이난시", nameCn: "淮南市" },
      { code: "340500", nameKo: "마안산시", nameCn: "马鞍山市" },
      { code: "340600", nameKo: "화이베이시", nameCn: "淮北市" },
      { code: "340700", nameKo: "퉁링시", nameCn: "铜陵市" },
      { code: "340800", nameKo: "안칭시", nameCn: "安庆市" },
      { code: "341000", nameKo: "황산시", nameCn: "黄山市" },
      { code: "341100", nameKo: "추저우시", nameCn: "滁州市" },
      { code: "341200", nameKo: "푸양시", nameCn: "阜阳市" },
      { code: "341300", nameKo: "쑤저우시", nameCn: "宿州市" },
      { code: "341500", nameKo: "루안시", nameCn: "六安市" },
      { code: "341600", nameKo: "보저우시", nameCn: "亳州市" },
      { code: "341700", nameKo: "츠저우시", nameCn: "池州市" },
      { code: "341800", nameKo: "쉬안청시", nameCn: "宣城市" },
    ],
  },
  {
    code: "350000",
    nameKo: "푸젠성",
    nameCn: "福建省",
    type: "province",
    cities: [
      { code: "350100", nameKo: "푸저우시", nameCn: "福州市" },
      { code: "350200", nameKo: "샤먼시", nameCn: "厦门市" },
      { code: "350300", nameKo: "푸톈시", nameCn: "莆田市" },
      { code: "350400", nameKo: "산밍시", nameCn: "三明市" },
      { code: "350500", nameKo: "취안저우시", nameCn: "泉州市" },
      { code: "350600", nameKo: "장저우시", nameCn: "漳州市" },
      { code: "350700", nameKo: "난핑시", nameCn: "南平市" },
      { code: "350800", nameKo: "룽옌시", nameCn: "龙岩市" },
      { code: "350900", nameKo: "닝더시", nameCn: "宁德市" },
    ],
  },
  {
    code: "360000",
    nameKo: "장시성",
    nameCn: "江西省",
    type: "province",
    cities: [
      { code: "360100", nameKo: "난창시", nameCn: "南昌市" },
      { code: "360200", nameKo: "징더전시", nameCn: "景德镇市" },
      { code: "360300", nameKo: "핑샹시", nameCn: "萍乡市" },
      { code: "360400", nameKo: "주장시", nameCn: "九江市" },
      { code: "360500", nameKo: "신위시", nameCn: "新余市" },
      { code: "360600", nameKo: "잉탄시", nameCn: "鹰潭市" },
      { code: "360700", nameKo: "간저우시", nameCn: "赣州市" },
      { code: "360800", nameKo: "지안시", nameCn: "吉安市" },
      { code: "360900", nameKo: "이춘시", nameCn: "宜春市" },
      { code: "361000", nameKo: "푸저우시", nameCn: "抚州市" },
      { code: "361100", nameKo: "상라오시", nameCn: "上饶市" },
    ],
  },
  {
    code: "370000",
    nameKo: "산둥성",
    nameCn: "山东省",
    type: "province",
    cities: [
      { code: "370100", nameKo: "지난시", nameCn: "济南市" },
      { code: "370200", nameKo: "칭다오시", nameCn: "青岛市" },
      { code: "370300", nameKo: "쯔보시", nameCn: "淄博市" },
      { code: "370400", nameKo: "자오좡시", nameCn: "枣庄市" },
      { code: "370500", nameKo: "둥잉시", nameCn: "东营市" },
      { code: "370600", nameKo: "옌타이시", nameCn: "烟台市" },
      { code: "370700", nameKo: "웨이팡시", nameCn: "潍坊市" },
      { code: "370800", nameKo: "지닝시", nameCn: "济宁市" },
      { code: "370900", nameKo: "타이안시", nameCn: "泰安市" },
      { code: "371000", nameKo: "웨이하이시", nameCn: "威海市" },
      { code: "371100", nameKo: "르자오시", nameCn: "日照市" },
      { code: "371300", nameKo: "린이시", nameCn: "临沂市" },
      { code: "371400", nameKo: "더저우시", nameCn: "德州市" },
      { code: "371500", nameKo: "랴오청시", nameCn: "聊城市" },
      { code: "371600", nameKo: "빈저우시", nameCn: "滨州市" },
      { code: "371700", nameKo: "허쩌시", nameCn: "菏泽市" },
    ],
  },
  {
    code: "410000",
    nameKo: "허난성",
    nameCn: "河南省",
    type: "province",
    cities: [
      { code: "410100", nameKo: "정저우시", nameCn: "郑州市" },
      { code: "410200", nameKo: "카이펑시", nameCn: "开封市" },
      { code: "410300", nameKo: "뤄양시", nameCn: "洛阳市" },
      { code: "410400", nameKo: "핑딩산시", nameCn: "平顶山市" },
      { code: "410500", nameKo: "안양시", nameCn: "安阳市" },
      { code: "410600", nameKo: "허비시", nameCn: "鹤壁市" },
      { code: "410700", nameKo: "신샹시", nameCn: "新乡市" },
      { code: "410800", nameKo: "자오쭤시", nameCn: "焦作市" },
      { code: "410900", nameKo: "푸양시", nameCn: "濮阳市" },
      { code: "411000", nameKo: "쉬창시", nameCn: "许昌市" },
      { code: "411100", nameKo: "뤄허시", nameCn: "漯河市" },
      { code: "411200", nameKo: "싼먼샤시", nameCn: "三门峡市" },
      { code: "411300", nameKo: "난양시", nameCn: "南阳市" },
      { code: "411400", nameKo: "상추시", nameCn: "商丘市" },
      { code: "411500", nameKo: "신양시", nameCn: "信阳市" },
      { code: "411600", nameKo: "저우커우시", nameCn: "周口市" },
      { code: "411700", nameKo: "주마뎬시", nameCn: "驻马店市" },
      { code: "419001", nameKo: "지위안시", nameCn: "济源市" },
    ],
  },
  {
    code: "420000",
    nameKo: "후베이성",
    nameCn: "湖北省",
    type: "province",
    cities: [
      { code: "420100", nameKo: "우한시", nameCn: "武汉市" },
      { code: "420200", nameKo: "황스시", nameCn: "黄石市" },
      { code: "420300", nameKo: "스옌시", nameCn: "十堰市" },
      { code: "420500", nameKo: "이창시", nameCn: "宜昌市" },
      { code: "420600", nameKo: "샹양시", nameCn: "襄阳市" },
      { code: "420700", nameKo: "어저우시", nameCn: "鄂州市" },
      { code: "420800", nameKo: "징먼시", nameCn: "荆门市" },
      { code: "420900", nameKo: "샤오간시", nameCn: "孝感市" },
      { code: "421000", nameKo: "징저우시", nameCn: "荆州市" },
      { code: "421100", nameKo: "황강시", nameCn: "黄冈市" },
      { code: "421200", nameKo: "셴닝시", nameCn: "咸宁市" },
      { code: "421300", nameKo: "쑤이저우시", nameCn: "随州市" },
      { code: "422800", nameKo: "언스투자족먀오족자치주", nameCn: "恩施土家族苗族自治州" },
    ],
  },
  {
    code: "430000",
    nameKo: "후난성",
    nameCn: "湖南省",
    type: "province",
    cities: [
      { code: "430100", nameKo: "창사시", nameCn: "长沙市" },
      { code: "430200", nameKo: "주저우시", nameCn: "株洲市" },
      { code: "430300", nameKo: "샹탄시", nameCn: "湘潭市" },
      { code: "430400", nameKo: "헝양시", nameCn: "衡阳市" },
      { code: "430500", nameKo: "사오양시", nameCn: "邵阳市" },
      { code: "430600", nameKo: "웨양시", nameCn: "岳阳市" },
      { code: "430700", nameKo: "창더시", nameCn: "常德市" },
      { code: "430800", nameKo: "장자제시", nameCn: "张家界市" },
      { code: "430900", nameKo: "이양시", nameCn: "益阳市" },
      { code: "431000", nameKo: "천저우시", nameCn: "郴州市" },
      { code: "431100", nameKo: "융저우시", nameCn: "永州市" },
      { code: "431200", nameKo: "화이화시", nameCn: "怀化市" },
      { code: "431300", nameKo: "러우디시", nameCn: "娄底市" },
      { code: "433100", nameKo: "샹시투자족먀오족자치주", nameCn: "湘西土家族苗族自治州" },
    ],
  },
  {
    code: "440000",
    nameKo: "광둥성",
    nameCn: "广东省",
    type: "province",
    cities: [
      { code: "440100", nameKo: "광저우시", nameCn: "广州市" },
      { code: "440200", nameKo: "사오관시", nameCn: "韶关市" },
      { code: "440300", nameKo: "선전시", nameCn: "深圳市" },
      { code: "440400", nameKo: "주하이시", nameCn: "珠海市" },
      { code: "440500", nameKo: "산터우시", nameCn: "汕头市" },
      { code: "440600", nameKo: "포산시", nameCn: "佛山市" },
      { code: "440700", nameKo: "장먼시", nameCn: "江门市" },
      { code: "440800", nameKo: "잔장시", nameCn: "湛江市" },
      { code: "440900", nameKo: "마오밍시", nameCn: "茂名市" },
      { code: "441200", nameKo: "자오칭시", nameCn: "肇庆市" },
      { code: "441300", nameKo: "후이저우시", nameCn: "惠州市" },
      { code: "441400", nameKo: "메이저우시", nameCn: "梅州市" },
      { code: "441500", nameKo: "산웨이시", nameCn: "汕尾市" },
      { code: "441600", nameKo: "허위안시", nameCn: "河源市" },
      { code: "441700", nameKo: "양장시", nameCn: "阳江市" },
      { code: "441800", nameKo: "칭위안시", nameCn: "清远市" },
      { code: "441900", nameKo: "둥관시", nameCn: "东莞市" },
      { code: "442000", nameKo: "중산시", nameCn: "中山市" },
      { code: "445100", nameKo: "차오저우시", nameCn: "潮州市" },
      { code: "445200", nameKo: "제양시", nameCn: "揭阳市" },
      { code: "445300", nameKo: "윈푸시", nameCn: "云浮市" },
    ],
  },
  {
    code: "460000",
    nameKo: "하이난성",
    nameCn: "海南省",
    type: "province",
    cities: [
      { code: "460100", nameKo: "하이커우시", nameCn: "海口市" },
      { code: "460200", nameKo: "싼야시", nameCn: "三亚市" },
      { code: "460300", nameKo: "싼사시", nameCn: "三沙市" },
      { code: "460400", nameKo: "단저우시", nameCn: "儋州市" },
    ],
  },
  {
    code: "510000",
    nameKo: "쓰촨성",
    nameCn: "四川省",
    type: "province",
    cities: [
      { code: "510100", nameKo: "청두시", nameCn: "成都市" },
      { code: "510300", nameKo: "쯔궁시", nameCn: "自贡市" },
      { code: "510400", nameKo: "판즈화시", nameCn: "攀枝花市" },
      { code: "510500", nameKo: "루저우시", nameCn: "泸州市" },
      { code: "510600", nameKo: "더양시", nameCn: "德阳市" },
      { code: "510700", nameKo: "몐양시", nameCn: "绵阳市" },
      { code: "510800", nameKo: "광위안시", nameCn: "广元市" },
      { code: "510900", nameKo: "쑤이닝시", nameCn: "遂宁市" },
      { code: "511000", nameKo: "네이장시", nameCn: "内江市" },
      { code: "511100", nameKo: "러산시", nameCn: "乐山市" },
      { code: "511300", nameKo: "난충시", nameCn: "南充市" },
      { code: "511400", nameKo: "메이산시", nameCn: "眉山市" },
      { code: "511500", nameKo: "이빈시", nameCn: "宜宾市" },
      { code: "511600", nameKo: "광안시", nameCn: "广安市" },
      { code: "511700", nameKo: "다저우시", nameCn: "达州市" },
      { code: "511800", nameKo: "야안시", nameCn: "雅安市" },
      { code: "511900", nameKo: "바중시", nameCn: "巴中市" },
      { code: "512000", nameKo: "쯔양시", nameCn: "资阳市" },
      { code: "513200", nameKo: "아바장족창족자치주", nameCn: "阿坝藏族羌族自治州" },
      { code: "513300", nameKo: "간쯔장족자치주", nameCn: "甘孜藏族自治州" },
      { code: "513400", nameKo: "량산이족자치주", nameCn: "凉山彝族自治州" },
    ],
  },
  {
    code: "520000",
    nameKo: "구이저우성",
    nameCn: "贵州省",
    type: "province",
    cities: [
      { code: "520100", nameKo: "구이양시", nameCn: "贵阳市" },
      { code: "520200", nameKo: "류판수이시", nameCn: "六盘水市" },
      { code: "520300", nameKo: "쭌이시", nameCn: "遵义市" },
      { code: "520400", nameKo: "안순시", nameCn: "安顺市" },
      { code: "520500", nameKo: "비제시", nameCn: "毕节市" },
      { code: "520600", nameKo: "퉁런시", nameCn: "铜仁市" },
      { code: "522300", nameKo: "첸시난부이족먀오족자치주", nameCn: "黔西南布依族苗族自治州" },
      { code: "522600", nameKo: "첸둥난먀오족둥족자치주", nameCn: "黔东南苗族侗族自治州" },
      { code: "522700", nameKo: "첸난부이족먀오족자치주", nameCn: "黔南布依族苗族自治州" },
    ],
  },
  {
    code: "530000",
    nameKo: "윈난성",
    nameCn: "云南省",
    type: "province",
    cities: [
      { code: "530100", nameKo: "쿤밍시", nameCn: "昆明市" },
      { code: "530300", nameKo: "취징시", nameCn: "曲靖市" },
      { code: "530400", nameKo: "위시시", nameCn: "玉溪市" },
      { code: "530500", nameKo: "바오산시", nameCn: "保山市" },
      { code: "530600", nameKo: "자오퉁시", nameCn: "昭通市" },
      { code: "530700", nameKo: "리장시", nameCn: "丽江市" },
      { code: "530800", nameKo: "푸얼시", nameCn: "普洱市" },
      { code: "530900", nameKo: "린창시", nameCn: "临沧市" },
      { code: "532300", nameKo: "추슝이족자치주", nameCn: "楚雄彝族自治州" },
      { code: "532500", nameKo: "훙허하니족이족자치주", nameCn: "红河哈尼族彝族自治州" },
      { code: "532600", nameKo: "원산좡족먀오족자치주", nameCn: "文山壮族苗族自治州" },
      { code: "532800", nameKo: "시솽반나다이족자치주", nameCn: "西双版纳傣族自治州" },
      { code: "532900", nameKo: "다리바이족자치주", nameCn: "大理白族自治州" },
      { code: "533100", nameKo: "더훙다이족징포족자치주", nameCn: "德宏傣族景颇族自治州" },
      { code: "533300", nameKo: "누장리수족자치주", nameCn: "怒江傈僳族自治州" },
      { code: "533400", nameKo: "디칭장족자치주", nameCn: "迪庆藏族自治州" },
    ],
  },
  {
    code: "610000",
    nameKo: "산시성",
    nameCn: "陕西省",
    type: "province",
    cities: [
      { code: "610100", nameKo: "시안시", nameCn: "西安市" },
      { code: "610200", nameKo: "퉁촨시", nameCn: "铜川市" },
      { code: "610300", nameKo: "바오지시", nameCn: "宝鸡市" },
      { code: "610400", nameKo: "셴양시", nameCn: "咸阳市" },
      { code: "610500", nameKo: "웨이난시", nameCn: "渭南市" },
      { code: "610600", nameKo: "옌안시", nameCn: "延安市" },
      { code: "610700", nameKo: "한중시", nameCn: "汉中市" },
      { code: "610800", nameKo: "위린시", nameCn: "榆林市" },
      { code: "610900", nameKo: "안캉시", nameCn: "安康市" },
      { code: "611000", nameKo: "상뤄시", nameCn: "商洛市" },
    ],
  },
  {
    code: "620000",
    nameKo: "간쑤성",
    nameCn: "甘肃省",
    type: "province",
    cities: [
      { code: "620100", nameKo: "란저우시", nameCn: "兰州市" },
      { code: "620200", nameKo: "자위관시", nameCn: "嘉峪关市" },
      { code: "620300", nameKo: "진창시", nameCn: "金昌市" },
      { code: "620400", nameKo: "바이인시", nameCn: "白银市" },
      { code: "620500", nameKo: "톈수이시", nameCn: "天水市" },
      { code: "620600", nameKo: "우웨이시", nameCn: "武威市" },
      { code: "620700", nameKo: "장예시", nameCn: "张掖市" },
      { code: "620800", nameKo: "핑량시", nameCn: "平凉市" },
      { code: "620900", nameKo: "주취안시", nameCn: "酒泉市" },
      { code: "621000", nameKo: "칭양시", nameCn: "庆阳市" },
      { code: "621100", nameKo: "딩시시", nameCn: "定西市" },
      { code: "621200", nameKo: "룽난시", nameCn: "陇南市" },
      { code: "622900", nameKo: "린샤후이족자치주", nameCn: "临夏回族自治州" },
      { code: "623000", nameKo: "간난장족자치주", nameCn: "甘南藏族自治州" },
    ],
  },
  {
    code: "630000",
    nameKo: "칭하이성",
    nameCn: "青海省",
    type: "province",
    cities: [
      { code: "630100", nameKo: "시닝시", nameCn: "西宁市" },
      { code: "630200", nameKo: "하이둥시", nameCn: "海东市" },
      { code: "632200", nameKo: "하이베이장족자치주", nameCn: "海北藏族自治州" },
      { code: "632300", nameKo: "황난장족자치주", nameCn: "黄南藏族自治州" },
      { code: "632500", nameKo: "하이난장족자치주", nameCn: "海南藏族自治州" },
      { code: "632600", nameKo: "궈뤄장족자치주", nameCn: "果洛藏族自治州" },
      { code: "632700", nameKo: "위수장족자치주", nameCn: "玉树藏族自治州" },
      { code: "632800", nameKo: "하이시몽골족장족자치주", nameCn: "海西蒙古族藏族自治州" },
    ],
  },
  {
    code: "710000",
    nameKo: "타이완성",
    nameCn: "台湾省",
    type: "province",
    cities: [
      { code: "710100", nameKo: "타이베이시", nameCn: "台北市" },
      { code: "710200", nameKo: "가오슝시", nameCn: "高雄市" },
      { code: "710300", nameKo: "타이중시", nameCn: "台中市" },
      { code: "710400", nameKo: "타이난시", nameCn: "台南市" },
    ],
  },

  // ==========================================
  // 자치구 (5개)
  // ==========================================
  {
    code: "150000",
    nameKo: "내몽골자치구",
    nameCn: "内蒙古自治区",
    type: "autonomous",
    cities: [
      { code: "150100", nameKo: "후허하오터시", nameCn: "呼和浩特市" },
      { code: "150200", nameKo: "바오터우시", nameCn: "包头市" },
      { code: "150300", nameKo: "우하이시", nameCn: "乌海市" },
      { code: "150400", nameKo: "츠펑시", nameCn: "赤峰市" },
      { code: "150500", nameKo: "퉁랴오시", nameCn: "通辽市" },
      { code: "150600", nameKo: "어얼둬쓰시", nameCn: "鄂尔多斯市" },
      { code: "150700", nameKo: "후룬베이얼시", nameCn: "呼伦贝尔市" },
      { code: "150800", nameKo: "바옌나오얼시", nameCn: "巴彦淖尔市" },
      { code: "150900", nameKo: "우란차부시", nameCn: "乌兰察布市" },
      { code: "152200", nameKo: "싱안맹", nameCn: "兴安盟" },
      { code: "152500", nameKo: "시린궈러맹", nameCn: "锡林郭勒盟" },
      { code: "152900", nameKo: "아라산맹", nameCn: "阿拉善盟" },
    ],
  },
  {
    code: "450000",
    nameKo: "광시좡족자치구",
    nameCn: "广西壮族自治区",
    type: "autonomous",
    cities: [
      { code: "450100", nameKo: "난닝시", nameCn: "南宁市" },
      { code: "450200", nameKo: "류저우시", nameCn: "柳州市" },
      { code: "450300", nameKo: "구이린시", nameCn: "桂林市" },
      { code: "450400", nameKo: "우저우시", nameCn: "梧州市" },
      { code: "450500", nameKo: "베이하이시", nameCn: "北海市" },
      { code: "450600", nameKo: "팡청강시", nameCn: "防城港市" },
      { code: "450700", nameKo: "친저우시", nameCn: "钦州市" },
      { code: "450800", nameKo: "구이강시", nameCn: "贵港市" },
      { code: "450900", nameKo: "위린시", nameCn: "玉林市" },
      { code: "451000", nameKo: "바이써시", nameCn: "百色市" },
      { code: "451100", nameKo: "허저우시", nameCn: "贺州市" },
      { code: "451200", nameKo: "허츠시", nameCn: "河池市" },
      { code: "451300", nameKo: "라이빈시", nameCn: "来宾市" },
      { code: "451400", nameKo: "충쭤시", nameCn: "崇左市" },
    ],
  },
  {
    code: "540000",
    nameKo: "시짱자치구",
    nameCn: "西藏自治区",
    type: "autonomous",
    cities: [
      { code: "540100", nameKo: "라싸시", nameCn: "拉萨市" },
      { code: "540200", nameKo: "르카쩌시", nameCn: "日喀则市" },
      { code: "540300", nameKo: "창두시", nameCn: "昌都市" },
      { code: "540400", nameKo: "린즈시", nameCn: "林芝市" },
      { code: "540500", nameKo: "산난시", nameCn: "山南市" },
      { code: "540600", nameKo: "나취시", nameCn: "那曲市" },
      { code: "542500", nameKo: "아리지구", nameCn: "阿里地区" },
    ],
  },
  {
    code: "640000",
    nameKo: "닝샤후이족자치구",
    nameCn: "宁夏回族自治区",
    type: "autonomous",
    cities: [
      { code: "640100", nameKo: "인촨시", nameCn: "银川市" },
      { code: "640200", nameKo: "스쭈이산시", nameCn: "石嘴山市" },
      { code: "640300", nameKo: "우중시", nameCn: "吴忠市" },
      { code: "640400", nameKo: "구위안시", nameCn: "固原市" },
      { code: "640500", nameKo: "중웨이시", nameCn: "中卫市" },
    ],
  },
  {
    code: "650000",
    nameKo: "신장웨이우얼자치구",
    nameCn: "新疆维吾尔自治区",
    type: "autonomous",
    cities: [
      { code: "650100", nameKo: "우루무치시", nameCn: "乌鲁木齐市" },
      { code: "650200", nameKo: "커라마이시", nameCn: "克拉玛依市" },
      { code: "650400", nameKo: "투루판시", nameCn: "吐鲁番市" },
      { code: "650500", nameKo: "하미시", nameCn: "哈密市" },
      { code: "652300", nameKo: "창지후이족자치주", nameCn: "昌吉回族自治州" },
      { code: "652700", nameKo: "보얼탈라몽골자치주", nameCn: "博尔塔拉蒙古自治州" },
      { code: "652800", nameKo: "바인궈렁몽골자치주", nameCn: "巴音郭楞蒙古自治州" },
      { code: "652900", nameKo: "아커쑤지구", nameCn: "阿克苏地区" },
      { code: "653000", nameKo: "커쯔러쑤키르기스자치주", nameCn: "克孜勒苏柯尔克孜自治州" },
      { code: "653100", nameKo: "카스지구", nameCn: "喀什地区" },
      { code: "653200", nameKo: "허톈지구", nameCn: "和田地区" },
      { code: "654000", nameKo: "이리카자흐자치주", nameCn: "伊犁哈萨克自治州" },
      { code: "654200", nameKo: "타청지구", nameCn: "塔城地区" },
      { code: "654300", nameKo: "아러타이지구", nameCn: "阿勒泰地区" },
    ],
  },

  // ==========================================
  // 특별행정구 (2개)
  // ==========================================
  {
    code: "810000",
    nameKo: "홍콩특별행정구",
    nameCn: "香港特别行政区",
    type: "sar",
    cities: [
      { code: "810100", nameKo: "홍콩", nameCn: "香港" },
    ],
  },
  {
    code: "820000",
    nameKo: "마카오특별행정구",
    nameCn: "澳门特别行政区",
    type: "sar",
    cities: [
      { code: "820100", nameKo: "마카오", nameCn: "澳门" },
    ],
  },
]
