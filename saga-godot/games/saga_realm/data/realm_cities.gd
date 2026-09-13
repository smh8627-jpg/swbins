extends RefCounted

## VERTICAL_SLICE_REALM.md 4절 "제외"의 "여러 성 동시 운영"을 좁혀서 들인
## 첫걸음(2026-09-12, "여러 성으로 넓히는 것부터 해줘"). **전쟁(war.js) 없이
## 여러 성을 굴리는 방법** — data-force.js 시나리오 194의 조조군(`cao`)이
## 원래부터 성 셋(`cities: ['chenliu', 'puyang', 'xuchang']`)을 갖고
## 시작한다는 사실을 그대로 썼다. 정복도 외교도 안 만들고 "이미 갖고
## 있던 것"만 플레이 가능하게 넓힌 것 — 전쟁·외교는 여전히 4절 "제외".
##
## 필드는 data-city.js 그대로: agri_start/comm_start/wall_start/pop_start.
## land별 agriCap/commCap/wall배율/ships 시작값도 `rtk.js` capOf()·setup()
## 그대로(허창=plain 하나만 있던 걸 river(복양) 하나 더 들여 조선(ships)
## 명령이 처음으로 실제 쓸모가 생겼다 — plain 성은 capOf('ships')=0이라
## 여전히 항상 실패한다).

## **2026-09-12 추가 — x·y.** `data-city.js`의 지도 좌표(0~100, 지도 비율)를
## 그대로 실측해 옮겼다 — `realm_worldmap.gd`가 성 셋의 실제 방향·비율을
## 그대로 쓰기 위해서다(축척만 새로 고른다, `map_center()` 참고).
const CITIES := [
	{"id": "chenliu", "name": "진류", "hanja": "陳留", "land": "plain", "x": 63, "y": 39,
	 "agri_start": 340, "comm_start": 320, "wall_start": 4800, "pop_start": 240000,
	 "desc": "연주의 중심. 의병을 일으키기 좋은 자리."},
	{"id": "puyang", "name": "복양", "hanja": "濮陽", "land": "river", "x": 68, "y": 33,
	 "agri_start": 300, "comm_start": 280, "wall_start": 4600, "pop_start": 210000,
	 "desc": "황하를 낀 연주의 목. 물길이 곧 길이다."},
	{"id": "xuchang", "name": "허창", "hanja": "許昌", "land": "plain", "x": 58, "y": 47,
	 "agri_start": 400, "comm_start": 360, "wall_start": 5400, "pop_start": 260000,
	 "desc": "중원 한복판. 둔전을 벌이기에 이만한 땅이 없다."},
]

## rtk.js data-city.js LAND_TYPES — 이 슬라이스가 실제로 쓰는 두 land(plain·
## river)만 옮겼다(둘 다 agriCap 1.0이라 즉시 갈리는 건 commCap과 ships뿐).
const LAND_AGRI_CAP := {"plain": 1.0, "river": 1.0, "hill": 0.85, "mount": 0.7}
const LAND_COMM_CAP := {"plain": 1.0, "river": 1.15, "hill": 0.9, "mount": 0.8}

const DEFAULT_CITY := "xuchang"  # 기존 단일 슬라이스가 쓰던 성 — 하위 호환

## rtk.js data-city.js ADJ 중 이 세 성에 걸치는 간선만 옮겼다(2026-09-12,
## war.js moveOfficer()의 "맞닿아 있지 않습니다" 체크에 쓴다) — 복양↔진류,
## 진류↔허창만 있고 복양↔허창은 없다(원작 지도 그대로, 사이에 진류가 있다).
const ADJ := [
	["puyang", "chenliu"], ["chenliu", "xuchang"],
]


## **2026-09-12 확장 — 정복 성 편입.** `ADJ`(우리 성끼리)만으로는 소패가
## 어디와도 안 맞닿는다 — `ENEMY_CITIES[].from_city`가 이미 "허창과
## 맞닿아 있다"는 사실을 들고 있어(공격·전임 둘 다 이 사실이 필요하다)
## 새 표를 안 만들고 그걸 그대로 간선으로도 썼다.
static func is_adjacent(a: String, b: String) -> bool:
	for pair: Array in ADJ:
		if (pair[0] == a and pair[1] == b) or (pair[0] == b and pair[1] == a):
			return true
	for e: Dictionary in ENEMY_CITIES:
		var eid := String(e.id)
		var from_city := String(e.get("from_city", ""))
		if (a == eid and b == from_city) or (b == eid and a == from_city):
			return true
	return false


static func by_id(id: String) -> Dictionary:
	for c: Dictionary in CITIES:
		if c.id == id:
			return c
	return {}


static func ids() -> Array:
	var out: Array = []
	for c: Dictionary in CITIES:
		out.append(String(c.id))
	return out


## realm_worldmap.gd가 x·y를 화면 중앙 기준으로 옮길 때 쓰는 중심점 — 성
## 목록이 셋뿐이라 상수로 안 박고 평균을 낸다(성이 늘어도 그대로 맞는다).
static func map_center() -> Vector2:
	var sx := 0.0
	var sy := 0.0
	for c: Dictionary in CITIES:
		sx += float(c.x)
		sy += float(c.y)
	return Vector2(sx / CITIES.size(), sy / CITIES.size())


## **2026-09-12 추가 — 적 목표(realm_war.gd 첫 전투 슬라이스).** data-
## city.js 그대로: 소패(小沛, xiaopei) — 허창(xuchang)과 맞닿은 plain
## 성, 시나리오 194엔 유비(`sg_liubei`)령이다. `wall_start`도 data-
## city.js 그대로(3600). **재해석 — troops_start.** 원작 rtk.js
## setup()은 모든 성이 troops=0에서 시작해 AI가 여러 달에 걸쳐 징병으로
## 채우는데, 이 슬라이스엔 적 AI가 없어(3·4절 "제외") 0 그대로 두면
## 늘 병력 없는 성을 시시하게 이기기만 하는 자리가 된다 — 그래서 갓
## 지은 우리 성 셋이 몇 달 굴러 도달할 법한 중간 규모 병력(800)을
## 정적으로 채워 뒀다(복양이 처음부터 배 60척을 갖고 시작하는 것과
## 같은 이유의 재해석 — "안 그러면 판이 그 자리에서 언다"). train·
## tech는 `RealmOrders.TRAIN_START`/`TECH_START`와 같은 rtk.js 기본값
## (새로 안 지어냈다). `from_city` — 이 슬라이스는 조조 쪽 성 중 소패와
## 맞닿은 게 허창뿐이라(ADJ에는 안 넣었다 — 저건 "우리 성끼리"만 다루는
## `is_adjacent()`용) 출진 성을 고정했다.
## `force`·`lord` — 2026-09-12 외교 슬라이스가 우호(relation)를 세력
## 단위로 묶는 데 쓴다(diplo.js relKey()가 세력 id로 묶는 것과 같은
## 결). **`lord`는 `saga_core/data/characters.gd`의 캐릭터 id** — 화면에
## 뭔가를 보일 땐 이 id로 `Characters.find()`를 거쳐 이미 가명이 된
## `name`(sg_liubei → "인형")을 쓴다. `force`("bei")는 화면에 안 보이는
## 내부 키일 뿐이라 실명이어도 무방(이름 정책은 **표시되는 글자**에만
## 적용된다, 루트 CLAUDE.md 이름 정책 문단).
## **2026-09-12 추가 — 정복 성 편입.** `x`·`y`·`agri_start`·`comm_start`·
## `pop_start`를 data-city.js 원문(agri 220·comm 200·pop 120000·x 70·
## y 43)에서 마저 가져왔다 — 함락하면 `realm_save_state.gd _annex_city()`
## 가 이 값들로 `cities[xiaopei]`를 채워 CITIES 성 셋과 동격으로 만든다
## (지도 좌표가 있어야 realm_worldmap.gd가 마커를 세울 수 있다).
## **2026-09-12 추가 — 이간·매수용 수비 무장(`officers`).** data-force.js
## force('bei').officers = [sg_guanyu, sg_zhangfei, rf_mizhu, rf_jianyong]
## 넷 다 원문 그대로. 처음엔 saga_core characters.gd에 있던 둘만(sg_*)
## 넣었다가(rf_* 둘은 당시 REALM 전용 데이터라 saga_core에 없었다), 같은 날
## rf_mizhu·rf_jianyong을 saga_core에 가명(창윤·언유)으로 들여온 뒤
## 마저 채웠다(characters.gd 머리말 2026-09-12 항목 참고). **군주(`lord`)는
## 이 목록에 안 넣는다** — diplo.js plot() "매수 후보에서 군주는 뺀다"를
## 자료 단계에서부터 지킨다(필터링 코드로 매번 걸러내지 않아도 된다).
## **2026-09-13 추가 — 둘째 목표(하비/下邳, xiapi).** data-city.js 그대로:
## agri 320·comm 300·wall 5200·pop 220000·land river(강 성이라 함락
## 전엔 조선 명령이 안 통한다, `RealmOrders` "조선" 재해석 그대로).
## `from_city`를 "xiaopei"로 잡았다 — 소패를 먼저 함락해야(playable_ids()
## 에 편입돼야) `is_adjacent("xiapi","xiaopei")`가 참이 되고 `attack()`의
## `cities.has(from_city)` 검사를 통과한다(둘 다 코드 변경 없이 이
## 데이터 하나로 자연히 작동 — `is_adjacent()`가 ENEMY_CITIES의
## `from_city`를 간선으로도 재사용하는 걸 그대로 이용). **소패를 먼저
## 정복해야 열리는 "둘째 단계"**로 의도한 배치다(원작 지리도 소패보다
## 안쪽 — 서주의 치소).
## **troops_start — 소패와 같은 재해석, 값만 스케일.** 원작 rtk.js
## troops=3000+round(pop/90) 공식을 쓰면 5444가 나오는데, 소패(800)도
## 이 공식을 안 쓰고 "우리 성이 몇 달 굴러 도달할 중간 규모"로 정적으로
## 잡았었다 — 하비는 그보다 한 단계 센 둘째 목표로 두려고 소패 대비
## 인구비(220000/120000≈1.83)만큼 올린 1500으로 잡았다(공식값 5444는
## 이 슬라이스 규모에 비해 너무 크다). train·tech는 소패와 같은 이유로
## `RealmOrders.TRAIN_START`/`TECH_START` 그대로.
## **officers — 여포군(data-force.js force('bu').officers) 그대로.**
## `sg_lubu`(여포, 기존 105인에 이미 있음)는 이간·매수 후보에서 빼는
## 관례(군주 제외) 그대로 목록엔 안 넣는다 — `lord`로만 둔다.
## `rf_chengong`(진궁→가명 현모)·`rf_gaoshun`(고순→가명 진위)은
## `characters.gd`에 이번에 새로 들였다(머리말 2026-09-13 항목 참고).
const ENEMY_CITIES := [
	{"id": "xiaopei", "name": "소패", "hanja": "小沛", "land": "plain", "from_city": "xuchang",
	 "x": 70, "y": 43, "agri_start": 220, "comm_start": 200, "pop_start": 120000,
	 "wall_start": 3600, "troops_start": 800, "train_start": 40, "tech_start": 100,
	 "force": "bei", "lord": "sg_liubei",
	 "officers": ["sg_guanyu", "sg_zhangfei", "rf_mizhu", "rf_jianyong"],
	 "desc": "서주의 작은 성. 허창과 맞닿아 있다."},
	{"id": "xiapi", "name": "하비", "hanja": "下邳", "land": "river", "from_city": "xiaopei",
	 "x": 79, "y": 40, "agri_start": 320, "comm_start": 300, "pop_start": 220000,
	 "wall_start": 5200, "troops_start": 1500, "train_start": 40, "tech_start": 100,
	 "force": "bu", "lord": "sg_lubu",
	 "officers": ["rf_chengong", "rf_gaoshun"],
	 "desc": "서주의 치소. 사수(泗水)가 성을 두른다."},

	## **2026-09-14 추가 — "전체 107개 성" 중 나머지 25개(사용자 지시
	## "다해 순서대로"/"묻지말고 최대한해") — data-city.js 삼국지 30성 중
	## 우리 성 셋 + 소패·하비를 뺀 전부.** `from_city`는 새 데이터가 아니라
	## data-city.js의 실제 인접 그래프(LINKS)를 우리 다섯 성 뿌리에서
	## 너비우선(BFS)으로 훑어 계산했다 — 소패→하비가 이미 그 그래프의
	## 한 가지였던 것과 같은 방식. **한 세력이 성을 여럿 가지면 `officers`는
	## 그 세력이 BFS로 가장 먼저 닿는 성 하나에만 싣는다**(나머지는 빈
	## 배열) — 같은 무장이 두 성에 겹쳐 실려 이간·매수 대상에 두 번
	## 나오는 걸 막는다(`lord`는 화면 표시용이라 모든 성에 그대로 싣는다).
	## `force`는 data-force.js FORCES_194 그대로, `lord`/`officers`(전부
	## rf_ 접두 신규 무장, sg_* 는 이미 105인에 있어 겹치지 않게 뺐다)는
	## `characters.gd` 2026-09-14 항목에서 가명을 새로 지어 넣었다.
	## troops_start는 소패·하비와 같은 재해석(인구비 스케일, 800*pop/
	## 120000 반올림) — 원작 rtk.js 공식(3000+pop/90)은 이 슬라이스
	## 규모엔 너무 크다. train/tech_start는 기존 두 성과 같은 기본값.
	{"id": "luoyang", "name": "낙양", "hanja": "洛陽", "land": "plain", "from_city": "chenliu",
	 "x": 47, "y": 41, "agri_start": 380, "comm_start": 420, "pop_start": 300000,
	 "wall_start": 6800, "troops_start": 2000, "train_start": 40, "tech_start": 100,
	 "force": "jue", "lord": "rf_lijue",
	 "officers": ["rf_guosi", "rf_zhangji", "rf_jiaxu"],
	 "desc": "한(漢)의 옛 서울. 불타고도 이름값이 남았다."},
	{"id": "ye", "name": "업", "hanja": "鄴", "land": "plain", "from_city": "puyang",
	 "x": 61, "y": 28, "agri_start": 420, "comm_start": 380, "pop_start": 320000,
	 "wall_start": 6500, "troops_start": 2133, "train_start": 40, "tech_start": 100,
	 "force": "shao", "lord": "rf_yuanshao",
	 "officers": ["rf_yanliang", "rf_wenchou", "rf_jushou", "rf_tianfeng", "rf_shenpei", "rf_zhanghe", "rf_gaolan"],
	 "desc": "하북 제일의 큰 성. 여기를 쥔 자가 북방을 쥔다."},
	{"id": "beihai", "name": "북해", "hanja": "北海", "land": "plain", "from_city": "puyang",
	 "x": 83, "y": 30, "agri_start": 300, "comm_start": 240, "pop_start": 200000,
	 "wall_start": 4400, "troops_start": 1333, "train_start": 40, "tech_start": 100,
	 "force": "rong", "lord": "rf_kongrong",
	 "officers": ["rf_wuanguo"],
	 "desc": "청주의 학문 고을. 황건의 여파가 남았다."},
	{"id": "runan", "name": "여남", "hanja": "汝南", "land": "plain", "from_city": "xuchang",
	 "x": 66, "y": 54, "agri_start": 340, "comm_start": 260, "pop_start": 230000,
	 "wall_start": 4200, "troops_start": 1533, "train_start": 40, "tech_start": 100,
	 "force": "shu", "lord": "rf_yuanshu",
	 "officers": ["rf_jiling", "rf_yanghong"],
	 "desc": "원씨 사대의 고향. 인재가 흔하다."},
	{"id": "wan", "name": "완", "hanja": "宛", "land": "plain", "from_city": "xuchang",
	 "x": 52, "y": 52, "agri_start": 300, "comm_start": 320, "pop_start": 220000,
	 "wall_start": 4800, "troops_start": 1467, "train_start": 40, "tech_start": 100,
	 "force": "biao", "lord": "rf_liubiao",
	 "officers": ["rf_caimao", "rf_kuailiang", "rf_huangzu", "rf_wenpin"],
	 "desc": "남양의 큰 저자. 중원과 형주 사이의 문."},
	{"id": "shouchun", "name": "수춘", "hanja": "壽春", "land": "river", "from_city": "xiaopei",
	 "x": 74, "y": 51, "agri_start": 330, "comm_start": 340, "pop_start": 230000,
	 "wall_start": 5000, "troops_start": 1533, "train_start": 40, "tech_start": 100,
	 "force": "shu", "lord": "rf_yuanshu",
	 "officers": [],
	 "desc": "회남의 큰 성. 옥새를 품기 좋아하는 자리."},
	{"id": "jinyang", "name": "진양", "hanja": "晉陽", "land": "mount", "from_city": "luoyang",
	 "x": 48, "y": 20, "agri_start": 210, "comm_start": 200, "pop_start": 150000,
	 "wall_start": 5200, "troops_start": 1000, "train_start": 40, "tech_start": 100,
	 "force": "shao", "lord": "rf_yuanshao",
	 "officers": [],
	 "desc": "병주 산지의 요새. 흉노와 접한다."},
	{"id": "changan", "name": "장안", "hanja": "長安", "land": "plain", "from_city": "luoyang",
	 "x": 35, "y": 37, "agri_start": 360, "comm_start": 400, "pop_start": 280000,
	 "wall_start": 6600, "troops_start": 1867, "train_start": 40, "tech_start": 100,
	 "force": "jue", "lord": "rf_lijue",
	 "officers": [],
	 "desc": "관중의 서울. 사방이 관(關)으로 막혀 있다."},
	{"id": "nanpi", "name": "남피", "hanja": "南皮", "land": "plain", "from_city": "ye",
	 "x": 70, "y": 23, "agri_start": 320, "comm_start": 260, "pop_start": 220000,
	 "wall_start": 5000, "troops_start": 1467, "train_start": 40, "tech_start": 100,
	 "force": "shao", "lord": "rf_yuanshao",
	 "officers": [],
	 "desc": "기주 북쪽의 곡창. 원씨의 뒷마당."},
	{"id": "jiangxia", "name": "강하", "hanja": "江夏", "land": "river", "from_city": "runan",
	 "x": 60, "y": 65, "agri_start": 280, "comm_start": 300, "pop_start": 190000,
	 "wall_start": 4800, "troops_start": 1267, "train_start": 40, "tech_start": 100,
	 "force": "biao", "lord": "rf_liubiao",
	 "officers": [],
	 "desc": "장강과 한수가 만난다. 수군의 자리."},
	{"id": "xinye", "name": "신야", "hanja": "新野", "land": "plain", "from_city": "wan",
	 "x": 56, "y": 57, "agri_start": 200, "comm_start": 160, "pop_start": 100000,
	 "wall_start": 3400, "troops_start": 667, "train_start": 40, "tech_start": 100,
	 "force": "biao", "lord": "rf_liubiao",
	 "officers": [],
	 "desc": "작은 고을. 큰 뜻을 품기엔 좁다."},
	{"id": "jianye", "name": "건업", "hanja": "建業", "land": "river", "from_city": "shouchun",
	 "x": 77, "y": 62, "agri_start": 320, "comm_start": 380, "pop_start": 250000,
	 "wall_start": 5200, "troops_start": 1667, "train_start": 40, "tech_start": 100,
	 "force": "ce", "lord": "rf_sunce",
	 "officers": ["rf_chengpu", "rf_huanggai", "rf_handang", "rf_zhoutai"],
	 "desc": "종산이 웅크린 자리. 왕기(王氣)가 있다 한다."},
	{"id": "chaisang", "name": "시상", "hanja": "柴桑", "land": "river", "from_city": "shouchun",
	 "x": 66, "y": 69, "agri_start": 260, "comm_start": 280, "pop_start": 180000,
	 "wall_start": 4600, "troops_start": 1200, "train_start": 40, "tech_start": 100,
	 "force": "ce", "lord": "rf_sunce",
	 "officers": [],
	 "desc": "강동의 서쪽 문. 여기서 배를 내면 형주다."},
	{"id": "tianshui", "name": "천수", "hanja": "天水", "land": "hill", "from_city": "changan",
	 "x": 22, "y": 36, "agri_start": 220, "comm_start": 180, "pop_start": 140000,
	 "wall_start": 4400, "troops_start": 933, "train_start": 40, "tech_start": 100,
	 "force": "teng", "lord": "rf_mateng",
	 "officers": ["rf_pangde", "rf_hansui"],
	 "desc": "농서의 요충. 강족 기병을 부린다."},
	{"id": "hanzhong", "name": "한중", "hanja": "漢中", "land": "mount", "from_city": "changan",
	 "x": 29, "y": 48, "agri_start": 280, "comm_start": 220, "pop_start": 170000,
	 "wall_start": 5600, "troops_start": 1133, "train_start": 40, "tech_start": 100,
	 "force": "lu", "lord": "rf_zhanglu",
	 "officers": ["rf_yangren", "rf_yangsong"],
	 "desc": "촉으로 드는 문. 잔도(棧道) 하나가 나라를 가른다."},
	{"id": "jixian", "name": "계", "hanja": "薊", "land": "plain", "from_city": "nanpi",
	 "x": 73, "y": 13, "agri_start": 260, "comm_start": 220, "pop_start": 180000,
	 "wall_start": 4800, "troops_start": 1200, "train_start": 40, "tech_start": 100,
	 "force": "zan", "lord": "rf_gongsunzan",
	 "officers": ["rf_yangang"],
	 "desc": "유주의 치소. 북방 상인과 말이 모인다."},
	{"id": "xiangyang", "name": "양양", "hanja": "襄陽", "land": "river", "from_city": "jiangxia",
	 "x": 50, "y": 62, "agri_start": 360, "comm_start": 340, "pop_start": 260000,
	 "wall_start": 6200, "troops_start": 1733, "train_start": 40, "tech_start": 100,
	 "force": "biao", "lord": "rf_liubiao",
	 "officers": [],
	 "desc": "한수를 낀 형주의 머리. 물과 성벽이 겹친다."},
	{"id": "jiangling", "name": "강릉", "hanja": "江陵", "land": "river", "from_city": "jiangxia",
	 "x": 44, "y": 68, "agri_start": 340, "comm_start": 320, "pop_start": 240000,
	 "wall_start": 5400, "troops_start": 1600, "train_start": 40, "tech_start": 100,
	 "force": "biao", "lord": "rf_liubiao",
	 "officers": [],
	 "desc": "형주의 곳간. 배와 군량이 여기서 난다."},
	{"id": "kuaiji", "name": "회계", "hanja": "會稽", "land": "plain", "from_city": "jianye",
	 "x": 84, "y": 76, "agri_start": 300, "comm_start": 340, "pop_start": 210000,
	 "wall_start": 4400, "troops_start": 1400, "train_start": 40, "tech_start": 100,
	 "force": "ce", "lord": "rf_sunce",
	 "officers": [],
	 "desc": "강동의 끝. 소금과 배로 먹고산다."},
	{"id": "changsha", "name": "장사", "hanja": "長沙", "land": "hill", "from_city": "chaisang",
	 "x": 53, "y": 77, "agri_start": 300, "comm_start": 240, "pop_start": 200000,
	 "wall_start": 4400, "troops_start": 1333, "train_start": 40, "tech_start": 100,
	 "force": "biao", "lord": "rf_liubiao",
	 "officers": [],
	 "desc": "강남 사군(四郡)의 맏이. 활을 잘 쏜다."},
	{"id": "wuwei", "name": "무위", "hanja": "武威", "land": "plain", "from_city": "tianshui",
	 "x": 15, "y": 24, "agri_start": 180, "comm_start": 220, "pop_start": 110000,
	 "wall_start": 3800, "troops_start": 733, "train_start": 40, "tech_start": 100,
	 "force": "teng", "lord": "rf_mateng",
	 "officers": [],
	 "desc": "하서의 길목. 서역 말이 들어온다."},
	{"id": "chengdu", "name": "성도", "hanja": "成都", "land": "plain", "from_city": "hanzhong",
	 "x": 14, "y": 62, "agri_start": 460, "comm_start": 380, "pop_start": 340000,
	 "wall_start": 6000, "troops_start": 2267, "train_start": 40, "tech_start": 100,
	 "force": "zhang", "lord": "rf_liuzhang",
	 "officers": ["rf_zhangren", "rf_yanyan", "rf_fazheng", "rf_wuyi"],
	 "desc": "천부지국(天府之國). 굶는 해가 없다."},
	{"id": "jiangzhou", "name": "강주", "hanja": "江州", "land": "river", "from_city": "hanzhong",
	 "x": 25, "y": 69, "agri_start": 280, "comm_start": 260, "pop_start": 180000,
	 "wall_start": 4600, "troops_start": 1200, "train_start": 40, "tech_start": 100,
	 "force": "zhang", "lord": "rf_liuzhang",
	 "officers": [],
	 "desc": "파(巴)의 물목. 촉의 동쪽 자물쇠."},
	{"id": "beiping", "name": "북평", "hanja": "北平", "land": "hill", "from_city": "jixian",
	 "x": 84, "y": 7, "agri_start": 200, "comm_start": 160, "pop_start": 130000,
	 "wall_start": 4200, "troops_start": 867, "train_start": 40, "tech_start": 100,
	 "force": "zan", "lord": "rf_gongsunzan",
	 "officers": [],
	 "desc": "유주 동북의 관문. 오환과 맞닿아 기병이 억세다."},
	{"id": "yongan", "name": "영안", "hanja": "永安", "land": "mount", "from_city": "jiangling",
	 "x": 35, "y": 63, "agri_start": 200, "comm_start": 180, "pop_start": 120000,
	 "wall_start": 5000, "troops_start": 800, "train_start": 40, "tech_start": 100,
	 "force": "zhang", "lord": "rf_liuzhang",
	 "officers": [],
	 "desc": "삼협의 입구. 물살이 성벽 노릇을 한다."},
]

## rtk.js data-city.js LAND_TYPES의 def·siege — capOf류와 달리 아직 안
## 옮겨 둔 두 값. 성 셋이 plain·river뿐이라도 원작 표를 통째로 옮겼다
## (하나만 골라 옮기면 "왜 이건 빼고 저건 옮겼나"는 판단이 새로 끼는
## 셈이라, LAND_AGRI_CAP·LAND_COMM_CAP처럼 표 전체를 그대로 든다).
const LAND_DEF := {"plain": 1.0, "river": 1.1, "hill": 1.15, "mount": 1.3}
const LAND_SIEGE := {"plain": 1.0, "river": 0.95, "hill": 0.9, "mount": 0.75}


static func enemy_by_id(id: String) -> Dictionary:
	for c: Dictionary in ENEMY_CITIES:
		if c.id == id:
			return c
	return {}


## **2026-09-12 추가 — 정복 성 편입.** CITIES(시작 성 셋)든 ENEMY_CITIES
## (함락해 편입된 성)든 정의를 하나로 찾는다 — `_land()`·`wall_cap()`·
## `food_start()`가 이걸 거치면 정복한 성도 따로 손 안 대고 같은 공식을
## 그대로 탄다("재사용" 원칙, 새 특수 케이스를 안 만든다).
static func any_by_id(id: String) -> Dictionary:
	var c := by_id(id)
	if not c.is_empty():
		return c
	return enemy_by_id(id)


## **2026-09-12 추가 — 정복 성 편입.** "성" 버튼·전임 목적지·월드맵이 다룰
## 수 있는 성 전부 — 시작 성 셋(`ids()`) + 함락해 `RealmSaveState.cities`에
## 들어간 적 성. CITIES에 안 넣은 이유는 정복 여부가 세이브 상태에 달려
## 있어 상수로 못 박을 수 없어서다.
static func playable_ids() -> Array:
	var out := ids()
	for cid: String in RealmSaveState.cities:
		if not (cid in out):
			out.append(cid)
	return out


static func land_def(land: String) -> float:
	return float(LAND_DEF.get(land, 1.0))


static func land_siege(land: String) -> float:
	return float(LAND_SIEGE.get(land, 1.0))


static func _land(id: String) -> String:
	return String(any_by_id(id).get("land", "plain"))


## rtk.js capOf('agri'): round(900 * land.agriCap)
static func agri_cap(id: String) -> int:
	return roundi(900.0 * float(LAND_AGRI_CAP.get(_land(id), 1.0)))


## rtk.js capOf('comm'): round(900 * land.commCap)
static func comm_cap(id: String) -> int:
	return roundi(900.0 * float(LAND_COMM_CAP.get(_land(id), 1.0)))


## rtk.js capOf('wall'): round(d.wall * 2)
static func wall_cap(id: String) -> int:
	return roundi(float(any_by_id(id).get("wall_start", 4000)) * 2.0)


## rtk.js capOf('ships'): 강가 성만 300, 나머지 0
static func ships_cap(id: String) -> int:
	return 300 if _land(id) == "river" else 0


## rtk.js setup(): ships 시작값 — 강가 성은 60에서 시작(안 그러면 첫 해에
## 아무 데도 못 간다는 원작 주석 그대로)
static func ships_start(id: String) -> int:
	return 60 if _land(id) == "river" else 0


## rtk.js setup(): "food = 8000 + agri*8" — 모든 성에 성 하나짜리 슬라이스가
## 이미 쓰던 것과 같은 공식(허창 400→11200).
static func food_start(id: String) -> int:
	return 8000 + int(any_by_id(id).get("agri_start", 0)) * 8
