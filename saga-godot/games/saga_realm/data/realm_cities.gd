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


## **2026-09-14 추가 — 월드맵 좌표계 실기 확인("월드맵 좌표계 몰아서
## 말고 지금 바로 확인해줘")으로 발견된 문제의 수정 절반.** `realm_
## worldmap.gd`가 갖고 있던 `WORLD_SCALE`을 여기로 옮겨 `realm_worldmap_
## camera.gd`와 공유한다(전엔 카메라가 이 값을 몰라 `LOOK_AT`을 원점에
## 고정해 둘 수밖에 없었다). 값 자체(14.0)는 그대로 — 3성 클러스터가
## 다닥다닥 붙어 보이지 않게 하려고 고른 축척이라 바꾸면 그 사정이 깨진다.
const WORLD_SCALE := 14.0


## `realm_worldmap.gd _world_pos(dict)`와 같은 공식을 성 id 하나로 바로
## 계산한다(city 하나만 있고 아직 dict를 안 들고 있는 카메라 쪽이 쓴다).
## 없는 id면 원점(map_center 자기 자신의 위치, 즉 Vector3.ZERO)을 준다 —
## 카메라가 못 찾을 성을 바라보다 멈추는 것보단 원점을 보는 쪽이 안전하다.
static func world_pos(city_id: String) -> Vector3:
	var c := any_by_id(city_id)
	if c.is_empty():
		return Vector3.ZERO
	var center := map_center()
	return Vector3(
		(float(c.x) - center.x) * WORLD_SCALE, 0.0,
		(float(c.y) - center.y) * WORLD_SCALE)


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

	## **2026-09-14 추가(같은 날 이어서) — "전체 107개 성" 나머지 77개
	## (사용자 지시 "77개 마저 이어해").** 한국·일본·교주·서역·남중·천축·
	## 막북·임읍·균열·폐허·묘역 11개 지역, 각 7성. data-city.js 원문 그대로
	## `force: null`(주인 없음)에 `garrison` 필드(troops_start로 그대로
	## 옮김 — rtk.js seedNeutral()이 `troops=garrison`으로 채우는 것과
	## 같다)를 쓰는 "재야 수비대" 구조라, 이 포트에선 **`force`/`lord`를
	## 빈 문자열로 둔다**(위/오/촉 같은 소속 세력이 없다). `officers`는
	## `js/data-force.js`의 `*_GARRISON` 표 그대로(수비 무장 id 목록,
	## `characters.gd` 2026-09-14 항목에서 원본 이름 그대로 편입했다 —
	## 이미 가상 인물이라 가명을 새로 지을 필요가 없었다).
	##
	## **diplo.js `plotAt()`/`envoy()`는 원작부터 `if (!c.force) return
	## {ok:false, why:'주인 없는 성입니다'}`로 주인 없는 성을 거른다** —
	## 이 77성은 그래서 원작에서도 외교·계략 대상이 아니다(공격만 된다).
	## `realm_diplo_button.gd`/`realm_plot_button.gd`의 대상 목록 루프에
	## 같은 가드(`force가 비었으면 건너뛴다`)를 추가해 이 사실을 그대로
	## 반영했다 — 새 규칙이 아니라 원작 규칙을 처음으로 코드에 옮긴
	## 것이다(지금까지는 이 코드에 손이 안 갔다, 삼국지 30성이 전부
	## force 있는 성이었어서).
	##
	## `from_city`는 다시 data-city.js `LINKS`의 실제 인접 그래프를
	## BFS로 훑은 결과다 — 한국은 beiping(이번 세션에 방금 추가한 성)에서
	## 시작, 일본은 한국의 gimhae에서, 교주는 changsha에서, 서역은
	## wuwei에서, 남중은 jiangzhou에서, 천축은 남중의 yongchang에서,
	## 막북은 jinyang에서, 임읍은 교주의 rinan에서, 균열은 일본의
	## yamato에서, 폐허는 균열의 janyeong에서, 묘역은 폐허의 chimmuk에서
	## 각각 이어받는다 — 11개 지역이 사슬처럼 이어진 게 아니라(교주→
	## 임읍, 남중→천축, 일본→균열→폐허→묘역처럼 갈래가 갈린다) 한국·
	## 일본·균열·폐허·묘역만 한 줄로 쭉 이어진다.
	##
	## troops_start=garrison, food(런타임 `RealmCities.food_start()`)는
	## 원작(garrison*2, 훨씬 작다)과 다른 값이 나온다 — 25개 성 추가 때와
	## 같은 재해석("이미 있는 공식을 성 종류별로 안 가른다")을 그대로
	## 잇는다, 새로 코드를 안 가른다.
	{"id": "yangping", "name": "양평", "hanja": "襄平", "land": "plain", "from_city": "beiping",
	 "x": 97, "y": 6, "agri_start": 220, "comm_start": 180, "pop_start": 90000,
	 "wall_start": 3800, "troops_start": 12000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["kr2_pasodan"],
	 "desc": "요동의 관문. 중원과 반도 사이, 누구의 땅도 아니다."},
	{"id": "guknae", "name": "국내성", "hanja": "國內城", "land": "mount", "from_city": "yangping",
	 "x": 104, "y": 14, "agri_start": 200, "comm_start": 160, "pop_start": 100000,
	 "wall_start": 4600, "troops_start": 15000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["kr2_dokgaru", "kr2_sogaram"],
	 "desc": "산이 성벽을 대신하는 곳. 오르는 자가 지친다."},
	{"id": "nakrang", "name": "낙랑", "hanja": "樂浪", "land": "plain", "from_city": "guknae",
	 "x": 103, "y": 24, "agri_start": 260, "comm_start": 220, "pop_start": 130000,
	 "wall_start": 4200, "troops_start": 16000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["kr2_mokrihae"],
	 "desc": "옛 군현의 저자. 배와 수레가 다 모인다."},
	{"id": "daebang", "name": "대방", "hanja": "帶方", "land": "plain", "from_city": "nakrang",
	 "x": 100, "y": 33, "agri_start": 240, "comm_start": 200, "pop_start": 110000,
	 "wall_start": 4000, "troops_start": 14000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["kr2_ajinsa"],
	 "desc": "낙랑과 반도 남쪽을 잇는 목."},
	{"id": "wirye", "name": "위례성", "hanja": "慰禮城", "land": "river", "from_city": "daebang",
	 "x": 104, "y": 42, "agri_start": 300, "comm_start": 260, "pop_start": 150000,
	 "wall_start": 4600, "troops_start": 18000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["kr2_yeonuru", "kr2_jimasol"],
	 "desc": "큰 강을 낀 터. 다스리는 자마다 도읍으로 삼고 싶어한다."},
	{"id": "geumseong", "name": "금성", "hanja": "金城", "land": "hill", "from_city": "wirye",
	 "x": 118, "y": 52, "agri_start": 280, "comm_start": 240, "pop_start": 160000,
	 "wall_start": 5000, "troops_start": 20000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["kr2_umorin"],
	 "desc": "반도 동남단의 큰 성. 산으로 둘러싸여 지키기 좋다."},
	{"id": "gimhae", "name": "김해", "hanja": "金海", "land": "river", "from_city": "wirye",
	 "x": 112, "y": 58, "agri_start": 260, "comm_start": 300, "pop_start": 100000,
	 "wall_start": 3800, "troops_start": 13000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["kr2_seolharan"],
	 "desc": "남쪽 바닷가 나루. 배가 성벽만큼 값지다."},
	{"id": "tsushima", "name": "대마도", "hanja": "對馬島", "land": "river", "from_city": "gimhae",
	 "x": 122, "y": 64, "agri_start": 120, "comm_start": 160, "pop_start": 50000,
	 "wall_start": 3000, "troops_start": 8000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["jp_umihiko"],
	 "desc": "두 바다 사이 외딴 섬. 뭍이 보이는 날에만 배를 낸다."},
	{"id": "iki", "name": "일기도", "hanja": "壹岐島", "land": "river", "from_city": "tsushima",
	 "x": 128, "y": 69, "agri_start": 140, "comm_start": 150, "pop_start": 45000,
	 "wall_start": 2800, "troops_start": 7000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["jp_shioji"],
	 "desc": "징검다리 같은 섬. 다음 물길로 넘어가는 길목이다."},
	{"id": "chikushi", "name": "축자", "hanja": "筑紫", "land": "river", "from_city": "iki",
	 "x": 136, "y": 71, "agri_start": 260, "comm_start": 280, "pop_start": 140000,
	 "wall_start": 4400, "troops_start": 15000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["jp_taketsumi", "jp_himetsu"],
	 "desc": "규슈 북쪽의 큰 나루. 대륙 물건이 처음 닿는 자리다."},
	{"id": "hyuga", "name": "일향", "hanja": "日向", "land": "hill", "from_city": "chikushi",
	 "x": 133, "y": 80, "agri_start": 200, "comm_start": 160, "pop_start": 90000,
	 "wall_start": 3600, "troops_start": 12000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["jp_hikoyama"],
	 "desc": "규슈 남쪽의 산과 바다. 궁수가 많다."},
	{"id": "izumo", "name": "출운", "hanja": "出雲", "land": "river", "from_city": "chikushi",
	 "x": 145, "y": 64, "agri_start": 220, "comm_start": 240, "pop_start": 110000,
	 "wall_start": 4000, "troops_start": 14000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["jp_kazenari"],
	 "desc": "큰 바다를 낀 혼슈의 관문. 신을 모시는 저자가 있다."},
	{"id": "kibi", "name": "길비", "hanja": "吉備", "land": "plain", "from_city": "hyuga",
	 "x": 151, "y": 70, "agri_start": 300, "comm_start": 260, "pop_start": 150000,
	 "wall_start": 4600, "troops_start": 17000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["jp_asahime"],
	 "desc": "기름진 안쪽 바다 연안. 곡식이 남아돈다."},
	{"id": "yamato", "name": "야마토", "hanja": "大和", "land": "plain", "from_city": "kibi",
	 "x": 158, "y": 75, "agri_start": 340, "comm_start": 300, "pop_start": 180000,
	 "wall_start": 5200, "troops_start": 20000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["jp_wakahiko", "jp_tamakiri"],
	 "desc": "섬 안쪽의 너른 분지. 이곳을 쥔 자가 열도를 대표한다 여긴다."},
	{"id": "nanhai", "name": "남해", "hanja": "南海", "land": "plain", "from_city": "changsha",
	 "x": 70, "y": 88, "agri_start": 260, "comm_start": 280, "pop_start": 140000,
	 "wall_start": 4400, "troops_start": 15000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["jiao_luyan", "jiao_hoangmi"],
	 "desc": "영남으로 드는 첫 관문. 강남의 물건이 여기서 갈린다."},
	{"id": "cangwu", "name": "창오", "hanja": "蒼梧", "land": "hill", "from_city": "nanhai",
	 "x": 60, "y": 92, "agri_start": 200, "comm_start": 180, "pop_start": 90000,
	 "wall_start": 3600, "troops_start": 11000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["jiao_madang"],
	 "desc": "산과 강이 겹치는 안쪽 땅. 오가는 길이 하나뿐이다."},
	{"id": "hepu", "name": "합포", "hanja": "合浦", "land": "river", "from_city": "nanhai",
	 "x": 58, "y": 99, "agri_start": 170, "comm_start": 220, "pop_start": 85000,
	 "wall_start": 3200, "troops_start": 10000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["jiao_botran"],
	 "desc": "진주가 나는 바닷가. 배가 곧 재물이다."},
	{"id": "yulin", "name": "울림", "hanja": "鬱林", "land": "hill", "from_city": "cangwu",
	 "x": 52, "y": 95, "agri_start": 190, "comm_start": 160, "pop_start": 80000,
	 "wall_start": 3400, "troops_start": 10000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["jiao_dinggo"],
	 "desc": "숲이 짙은 산골. 코끼리가 짐을 나른다."},
	{"id": "jiaozhi", "name": "교지", "hanja": "交趾", "land": "river", "from_city": "hepu",
	 "x": 48, "y": 102, "agri_start": 280, "comm_start": 260, "pop_start": 150000,
	 "wall_start": 4600, "troops_start": 16000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["jiao_riquan", "jiao_jinja"],
	 "desc": "붉은 강이 바다로 드는 삼각주. 교주에서 가장 큰 저자다."},
	{"id": "jiuzhen", "name": "구진", "hanja": "九眞", "land": "plain", "from_city": "jiaozhi",
	 "x": 44, "y": 107, "agri_start": 200, "comm_start": 140, "pop_start": 70000,
	 "wall_start": 3000, "troops_start": 9000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["jiao_muya"],
	 "desc": "벼가 두 번 여무는 들. 남쪽으로 갈수록 낯설어진다."},
	{"id": "rinan", "name": "일남", "hanja": "日南", "land": "hill", "from_city": "jiuzhen",
	 "x": 42, "y": 112, "agri_start": 160, "comm_start": 120, "pop_start": 55000,
	 "wall_start": 2800, "troops_start": 7000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["jiao_banrok"],
	 "desc": "한(漢)의 땅이라 부르는 가장 남쪽 끝."},
	{"id": "dunhuang", "name": "돈황", "hanja": "敦煌", "land": "hill", "from_city": "wuwei",
	 "x": -8, "y": 22, "agri_start": 160, "comm_start": 200, "pop_start": 70000,
	 "wall_start": 3600, "troops_start": 9000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["xiyu_talban", "xiyu_yeoje"],
	 "desc": "하서주랑의 끝. 사막으로 나서는 마지막 우물."},
	{"id": "loulan", "name": "누란", "hanja": "樓蘭", "land": "hill", "from_city": "dunhuang",
	 "x": -20, "y": 30, "agri_start": 100, "comm_start": 160, "pop_start": 45000,
	 "wall_start": 2800, "troops_start": 7000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["xiyu_mokjil"],
	 "desc": "소금 호수 곁의 작은 나라. 대상(隊商)이 쉬어 간다."},
	{"id": "yanqi", "name": "언기", "hanja": "焉耆", "land": "plain", "from_city": "dunhuang",
	 "x": -22, "y": 14, "agri_start": 220, "comm_start": 180, "pop_start": 80000,
	 "wall_start": 3400, "troops_start": 10000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["xiyu_dansu"],
	 "desc": "북쪽 길의 첫 오아시스. 강이 눈 녹은 물을 실어 온다."},
	{"id": "khotan", "name": "우전", "hanja": "于闐", "land": "river", "from_city": "loulan",
	 "x": -36, "y": 34, "agri_start": 240, "comm_start": 220, "pop_start": 100000,
	 "wall_start": 3800, "troops_start": 12000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["xiyu_ochi"],
	 "desc": "옥이 강바닥에서 나는 나라. 남쪽 길의 요지."},
	{"id": "kucha", "name": "구자", "hanja": "龜茲", "land": "plain", "from_city": "yanqi",
	 "x": -34, "y": 12, "agri_start": 260, "comm_start": 240, "pop_start": 120000,
	 "wall_start": 4000, "troops_start": 13000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["xiyu_gumo"],
	 "desc": "서역 북도의 큰 나라. 악사와 상인이 함께 온다."},
	{"id": "kashgar", "name": "소륵", "hanja": "疏勒", "land": "plain", "from_city": "khotan",
	 "x": -48, "y": 20, "agri_start": 240, "comm_start": 260, "pop_start": 110000,
	 "wall_start": 4200, "troops_start": 14000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["xiyu_sarim", "xiyu_banwol"],
	 "desc": "남·북 두 길이 다시 만나는 자리. 파미르로 드는 문."},
	{"id": "dayuan", "name": "대완", "hanja": "大宛", "land": "hill", "from_city": "kashgar",
	 "x": -58, "y": 16, "agri_start": 180, "comm_start": 200, "pop_start": 60000,
	 "wall_start": 3200, "troops_start": 8000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["xiyu_cheonma"],
	 "desc": "한혈마(汗血馬)가 난다는 서쪽 끝의 나라."},
	{"id": "zhuti", "name": "주제", "hanja": "朱提", "land": "river", "from_city": "jiangzhou",
	 "x": 20, "y": 82, "agri_start": 160, "comm_start": 140, "pop_start": 55000,
	 "wall_start": 3200, "troops_start": 8500, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["nz_soman", "nz_ahyang"],
	 "desc": "노수(瀘水)를 건너야 닿는 첫 관문. 은광이 난다는 소문이 있다."},
	{"id": "jianning", "name": "건녕", "hanja": "建寧", "land": "plain", "from_city": "zhuti",
	 "x": 14, "y": 92, "agri_start": 200, "comm_start": 180, "pop_start": 85000,
	 "wall_start": 3800, "troops_start": 11000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["nz_mokro", "nz_eunga"],
	 "desc": "남중 여러 부족을 아우르는 다스림의 중심."},
	{"id": "yuexi", "name": "월수", "hanja": "越巂", "land": "mount", "from_city": "jianning",
	 "x": 4, "y": 78, "agri_start": 120, "comm_start": 100, "pop_start": 42000,
	 "wall_start": 2800, "troops_start": 7000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["nz_jeokpyo"],
	 "desc": "서쪽 산길, 강(羌)족과 맞닿은 변경."},
	{"id": "zangke", "name": "장가", "hanja": "牂柯", "land": "hill", "from_city": "jianning",
	 "x": 28, "y": 98, "agri_start": 150, "comm_start": 120, "pop_start": 50000,
	 "wall_start": 3000, "troops_start": 7500, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["nz_hyeoncheon"],
	 "desc": "협곡을 낀 물길, 배는 못 다녀도 걷기는 험하다."},
	{"id": "yunnan", "name": "운남", "hanja": "雲南", "land": "mount", "from_city": "jianning",
	 "x": 8, "y": 104, "agri_start": 140, "comm_start": 130, "pop_start": 46000,
	 "wall_start": 2900, "troops_start": 7200, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["nz_unhwa"],
	 "desc": "구름 남쪽의 큰 호수, 봄이면 꽃빛으로 물든다."},
	{"id": "xinggu", "name": "흥고", "hanja": "興古", "land": "hill", "from_city": "zangke",
	 "x": 18, "y": 112, "agri_start": 110, "comm_start": 90, "pop_start": 38000,
	 "wall_start": 2600, "troops_start": 6500, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["nz_heukwol"],
	 "desc": "가장 먼 변경, 지도 위 마지막 이름."},
	{"id": "yongchang", "name": "영창", "hanja": "永昌", "land": "plain", "from_city": "yunnan",
	 "x": -8, "y": 98, "agri_start": 170, "comm_start": 200, "pop_start": 60000,
	 "wall_start": 3400, "troops_start": 8800, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["nz_geumsang"],
	 "desc": "머나먼 서쪽 땅, 천축(天竺)의 물건도 이 길을 거쳐 온다."},
	{"id": "shendu", "name": "신독", "hanja": "身毒", "land": "plain", "from_city": "yongchang",
	 "x": -22, "y": 100, "agri_start": 220, "comm_start": 240, "pop_start": 95000,
	 "wall_start": 4000, "troops_start": 11000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["tz_beonwang", "tz_hyanggae"],
	 "desc": "한서(漢書)가 \"신독\"이라 적은 땅. 촉의 장사꾼도 여기까지는 온다."},
	{"id": "jiantuoluo", "name": "건타라", "hanja": "健馱邏", "land": "hill", "from_city": "shendu",
	 "x": -18, "y": 92, "agri_start": 160, "comm_start": 180, "pop_start": 58000,
	 "wall_start": 3400, "troops_start": 8500, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["tz_seoksang", "tz_ganda"],
	 "desc": "간다라의 저자. 석상을 새기는 장인이 많다."},
	{"id": "daxia", "name": "대하", "hanja": "大夏", "land": "hill", "from_city": "shendu",
	 "x": -15, "y": 86, "agri_start": 150, "comm_start": 170, "pop_start": 52000,
	 "wall_start": 3200, "troops_start": 8000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["tz_daehacheon"],
	 "desc": "박트리아의 옛 이름. 대월지가 한때 이곳에 자리 잡았다."},
	{"id": "moqietuo", "name": "마게타", "hanja": "摩揭陀", "land": "plain", "from_city": "shendu",
	 "x": -30, "y": 106, "agri_start": 200, "comm_start": 190, "pop_start": 70000,
	 "wall_start": 3600, "troops_start": 9500, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["tz_hangha"],
	 "desc": "마가다. 항하(恒河) 유역의 크고 오래된 나라."},
	{"id": "sheyi", "name": "사위", "hanja": "舍衛", "land": "plain", "from_city": "shendu",
	 "x": -26, "y": 112, "agri_start": 170, "comm_start": 150, "pop_start": 48000,
	 "wall_start": 3000, "troops_start": 7500, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["tz_sawi"],
	 "desc": "사위성. 순례자들이 마지막으로 닿는 저자."},
	{"id": "jibin", "name": "계빈", "hanja": "罽賓", "land": "mount", "from_city": "jiantuoluo",
	 "x": -25, "y": 80, "agri_start": 120, "comm_start": 140, "pop_start": 40000,
	 "wall_start": 2800, "troops_start": 6500, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["tz_seolsan"],
	 "desc": "눈 덮인 산 아래 나라. 카슈미르의 옛 이름이다."},
	{"id": "wuyishanli", "name": "오익산리", "hanja": "烏弋山離", "land": "hill", "from_city": "daxia",
	 "x": -32, "y": 88, "agri_start": 110, "comm_start": 130, "pop_start": 36000,
	 "wall_start": 2600, "troops_start": 6000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["tz_sanri"],
	 "desc": "알렉산드리아라 불리던 땅의 한역(漢譯) 이름."},
	{"id": "yunzhong", "name": "운중", "hanja": "雲中", "land": "plain", "from_city": "jinyang",
	 "x": 45, "y": 5, "agri_start": 160, "comm_start": 130, "pop_start": 55000,
	 "wall_start": 3400, "troops_start": 8500, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["mb_cheolgak", "mb_hoja", "mb_seonwoo"],
	 "desc": "흉노와 맞댄 첫 군(郡). 말 떼가 지평선을 채운다."},
	{"id": "yanmen", "name": "안문", "hanja": "雁門", "land": "mount", "from_city": "yunzhong",
	 "x": 55, "y": 0, "agri_start": 130, "comm_start": 110, "pop_start": 42000,
	 "wall_start": 3000, "troops_start": 6800, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["mb_baekwoon"],
	 "desc": "기러기도 넘기 힘들다는 고개. 봉화가 자주 오른다."},
	{"id": "dingxiang", "name": "정양", "hanja": "定襄", "land": "plain", "from_city": "yunzhong",
	 "x": 52, "y": -10, "agri_start": 140, "comm_start": 100, "pop_start": 38000,
	 "wall_start": 2800, "troops_start": 6300, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["mb_hanpung"],
	 "desc": "초원의 첫 저자. 가죽과 말을 바꾼다."},
	{"id": "shangjun", "name": "상군", "hanja": "上郡", "land": "hill", "from_city": "yunzhong",
	 "x": 30, "y": 10, "agri_start": 150, "comm_start": 120, "pop_start": 48000,
	 "wall_start": 3200, "troops_start": 7500, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["mb_hwangto"],
	 "desc": "황토 고원의 군. 오랜 세월 변방을 지켰다."},
	{"id": "beidi", "name": "북지", "hanja": "北地", "land": "plain", "from_city": "shangjun",
	 "x": 18, "y": 6, "agri_start": 170, "comm_start": 110, "pop_start": 44000,
	 "wall_start": 3000, "troops_start": 7000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["mb_gangho"],
	 "desc": "농서와 이어지는 변경. 강족과 흉노가 뒤섞인다."},
	{"id": "shuofang", "name": "삭방", "hanja": "朔方", "land": "plain", "from_city": "shangjun",
	 "x": 28, "y": -8, "agri_start": 180, "comm_start": 100, "pop_start": 40000,
	 "wall_start": 2900, "troops_start": 6600, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["mb_hanam"],
	 "desc": "하남지(河南地)의 요새. 황하가 크게 굽이치는 자리다."},
	{"id": "wuyuan", "name": "오원", "hanja": "五原", "land": "hill", "from_city": "shuofang",
	 "x": 38, "y": -15, "agri_start": 120, "comm_start": 90, "pop_start": 36000,
	 "wall_start": 2700, "troops_start": 6000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["mb_janggwang"],
	 "desc": "가장 먼 북쪽 군. 겨울이 유난히 길다."},
	{"id": "xianglin", "name": "상림", "hanja": "象林", "land": "plain", "from_city": "rinan",
	 "x": 38, "y": 118, "agri_start": 180, "comm_start": 150, "pop_start": 60000,
	 "wall_start": 3200, "troops_start": 8000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["ly_sangnim", "ly_uhwa"],
	 "desc": "일남군의 남쪽 끝 현. 임읍국이 바로 이곳에서 일어났다."},
	{"id": "luorong", "name": "노용", "hanja": "盧容", "land": "plain", "from_city": "xianglin",
	 "x": 34, "y": 122, "agri_start": 160, "comm_start": 130, "pop_start": 46000,
	 "wall_start": 2800, "troops_start": 6800, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["ly_nogyong"],
	 "desc": "상림과 나란한 옛 현. 벼가 두 번 여문다."},
	{"id": "dianchong", "name": "전충", "hanja": "典沖", "land": "plain", "from_city": "xianglin",
	 "x": 40, "y": 128, "agri_start": 220, "comm_start": 200, "pop_start": 72000,
	 "wall_start": 3800, "troops_start": 9500, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["ly_jeonchung", "ly_byeokjeon"],
	 "desc": "임읍국의 도성. 벽돌로 쌓은 성벽이 낯설다."},
	{"id": "zhuwu", "name": "주오", "hanja": "朱吾", "land": "river", "from_city": "luorong",
	 "x": 30, "y": 130, "agri_start": 130, "comm_start": 120, "pop_start": 38000,
	 "wall_start": 2600, "troops_start": 6200, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["ly_juoh"],
	 "desc": "한(漢)의 문서에 남은 가장 남쪽 현."},
	{"id": "bijing", "name": "비경", "hanja": "比景", "land": "river", "from_city": "dianchong",
	 "x": 44, "y": 124, "agri_start": 150, "comm_start": 170, "pop_start": 50000,
	 "wall_start": 3000, "troops_start": 7200, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["ly_jinju"],
	 "desc": "해안의 옛 현. 진주조개를 캐는 배가 나간다."},
	{"id": "xiquan", "name": "서권", "hanja": "西卷", "land": "hill", "from_city": "dianchong",
	 "x": 50, "y": 120, "agri_start": 140, "comm_start": 110, "pop_start": 40000,
	 "wall_start": 2700, "troops_start": 6400, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["ly_sanga"],
	 "desc": "산을 낀 서쪽 현. 코끼리가 짐을 나른다."},
	{"id": "quzu", "name": "구속", "hanja": "區粟", "land": "hill", "from_city": "dianchong",
	 "x": 36, "y": 134, "agri_start": 120, "comm_start": 100, "pop_start": 34000,
	 "wall_start": 2500, "troops_start": 5800, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["ly_heuksang"],
	 "desc": "지도 위 가장 남쪽 이름. 여기서부터는 기록도 흐릿하다."},
	{"id": "cheongwe", "name": "천궤", "hanja": "天軌", "land": "plain", "from_city": "yamato",
	 "x": 172, "y": 75, "agri_start": 200, "comm_start": 220, "pop_start": 70000,
	 "wall_start": 3400, "troops_start": 9000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["fu_seonghon", "fu_yuseong"],
	 "desc": "야마토 너머 바다 위, 시간이 어긋난 자리에 처음 나타난 관문."},
	{"id": "noeseong", "name": "뇌성", "hanja": "雷城", "land": "hill", "from_city": "cheongwe",
	 "x": 180, "y": 64, "agri_start": 150, "comm_start": 180, "pop_start": 55000,
	 "wall_start": 3000, "troops_start": 7500, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["fu_noejang"],
	 "desc": "번개를 가둬 쓰는 성벽. 밤에도 대낮처럼 밝다."},
	{"id": "gangcheol", "name": "강철", "hanja": "鋼鐵", "land": "plain", "from_city": "cheongwe",
	 "x": 178, "y": 90, "agri_start": 170, "comm_start": 160, "pop_start": 60000,
	 "wall_start": 3600, "troops_start": 8200, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["fu_gangma"],
	 "desc": "쇠로 지은 성. 옛 병기와 낯선 기계가 나란히 걸려 있다."},
	{"id": "yuri", "name": "유리", "hanja": "琉璃", "land": "river", "from_city": "noeseong",
	 "x": 196, "y": 68, "agri_start": 140, "comm_start": 240, "pop_start": 58000,
	 "wall_start": 3200, "troops_start": 7800, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["fu_yugwi"],
	 "desc": "투명한 벽 안에서 저잣거리가 돈다. 안이 훤히 다 보인다."},
	{"id": "hwanyeong", "name": "환영", "hanja": "幻影", "land": "plain", "from_city": "gangcheol",
	 "x": 186, "y": 78, "agri_start": 160, "comm_start": 200, "pop_start": 52000,
	 "wall_start": 3100, "troops_start": 7200, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["fu_hwanryeong"],
	 "desc": "실체 없는 형상이 저잣거리를 오간다. 다가서면 흩어진다."},
	{"id": "jongmal", "name": "종말", "hanja": "終末", "land": "plain", "from_city": "yuri",
	 "x": 194, "y": 60, "agri_start": 240, "comm_start": 260, "pop_start": 95000,
	 "wall_start": 4200, "troops_start": 13000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["fu_jongwang", "fu_myeongje"],
	 "desc": "이 땅에서 가장 늦게, 또는 가장 먼저 열린 자리. 시간이 여기서 겹친다."},
	{"id": "janyeong", "name": "잔영", "hanja": "殘影", "land": "hill", "from_city": "hwanyeong",
	 "x": 200, "y": 90, "agri_start": 130, "comm_start": 150, "pop_start": 48000,
	 "wall_start": 2900, "troops_start": 7000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["fu_janhon"],
	 "desc": "허물어진 자리마다 그림자가 아직 서 있다."},
	{"id": "pyedo", "name": "폐도", "hanja": "廢都", "land": "plain", "from_city": "janyeong",
	 "x": 210, "y": 95, "agri_start": 210, "comm_start": 190, "pop_start": 68000,
	 "wall_start": 3800, "troops_start": 9200, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["ru_busaeng", "ru_geohae"],
	 "desc": "균열 너머 가장 먼저 닿는 자리. 무너진 도읍의 잔해가 그대로 남았다."},
	{"id": "janjae", "name": "잔재", "hanja": "殘滓", "land": "hill", "from_city": "pyedo",
	 "x": 218, "y": 70, "agri_start": 130, "comm_start": 110, "pop_start": 42000,
	 "wall_start": 2900, "troops_start": 6400, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["ru_gogol", "ru_mangdok"],
	 "desc": "타다 남은 것들이 쌓여 둔덕을 이뤘다."},
	{"id": "oyeom", "name": "오염", "hanja": "汚染", "land": "river", "from_city": "pyedo",
	 "x": 214, "y": 112, "agri_start": 90, "comm_start": 120, "pop_start": 38000,
	 "wall_start": 2600, "troops_start": 5800, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["ru_sanaek"],
	 "desc": "흐르는 물빛이 탁하다. 가까이 가면 살갗이 따갑다."},
	{"id": "hoegok", "name": "회곡", "hanja": "灰谷", "land": "mount", "from_city": "janjae",
	 "x": 227, "y": 84, "agri_start": 100, "comm_start": 90, "pop_start": 45000,
	 "wall_start": 3000, "troops_start": 6800, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["ru_seogun"],
	 "desc": "재가 쌓여 골짜기를 메웠다. 바람이 불면 앞이 안 보인다."},
	{"id": "chimmuk", "name": "침묵", "hanja": "沈默", "land": "plain", "from_city": "oyeom",
	 "x": 222, "y": 102, "agri_start": 110, "comm_start": 100, "pop_start": 36000,
	 "wall_start": 2700, "troops_start": 5400, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["ru_sayeong"],
	 "desc": "아무 소리도 안 난다. 걷는 발소리조차 삼켜진다."},
	{"id": "yeokbyeong", "name": "역병", "hanja": "疫病", "land": "plain", "from_city": "hoegok",
	 "x": 231, "y": 66, "agri_start": 150, "comm_start": 130, "pop_start": 50000,
	 "wall_start": 2950, "troops_start": 6600, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["ru_wadok"],
	 "desc": "병이 먼저 휩쓸고 간 자리. 그래도 뭔가는 여전히 움직인다."},
	{"id": "janhyang", "name": "잔향", "hanja": "殘響", "land": "hill", "from_city": "hoegok",
	 "x": 236, "y": 96, "agri_start": 95, "comm_start": 80, "pop_start": 32000,
	 "wall_start": 2500, "troops_start": 5200, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["ru_doksi"],
	 "desc": "지도 위 가장 동쪽 이름. 무너진 것들의 마지막 메아리다."},
	{"id": "myomun", "name": "묘문", "hanja": "墓門", "land": "plain", "from_city": "chimmuk",
	 "x": 214, "y": 120, "agri_start": 180, "comm_start": 160, "pop_start": 62000,
	 "wall_start": 3600, "troops_start": 8600, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["tb_baekgi", "tb_ganghae"],
	 "desc": "폐허 남쪽, 땅 밑으로 이어지는 첫 관문. 안으로 들어가면 못 돌아온다는 말이 있다."},
	{"id": "baekgol", "name": "백골", "hanja": "白骨", "land": "hill", "from_city": "myomun",
	 "x": 206, "y": 132, "agri_start": 90, "comm_start": 70, "pop_start": 34000,
	 "wall_start": 2400, "troops_start": 5200, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["tb_japgol"],
	 "desc": "뼈가 쌓여 언덕을 이뤘다. 바람이 불면 서로 부딪혀 소리를 낸다."},
	{"id": "chimgwan", "name": "침관", "hanja": "沈棺", "land": "river", "from_city": "myomun",
	 "x": 220, "y": 128, "agri_start": 80, "comm_start": 100, "pop_start": 32000,
	 "wall_start": 2500, "troops_start": 5000, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["tb_gojeon", "tb_jongja"],
	 "desc": "물 아래 가라앉은 관들이 줄지어 있다. 물이 맑아 그대로 다 보인다."},
	{"id": "honro", "name": "혼로", "hanja": "魂爐", "land": "mount", "from_city": "baekgol",
	 "x": 200, "y": 140, "agri_start": 70, "comm_start": 90, "pop_start": 36000,
	 "wall_start": 2700, "troops_start": 5400, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["tb_amseup"],
	 "desc": "혼을 태우는 화로가 밤낮없이 탄다. 재는 안 남는다."},
	{"id": "jinhon", "name": "진혼", "hanja": "鎭魂", "land": "plain", "from_city": "chimgwan",
	 "x": 226, "y": 140, "agri_start": 100, "comm_start": 110, "pop_start": 30000,
	 "wall_start": 2600, "troops_start": 4800, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["tb_jamhon"],
	 "desc": "혼을 달래는 자리. 그런데도 잠들지 못한 것들이 여전히 걷는다."},
	{"id": "yugol", "name": "유골", "hanja": "遺骨", "land": "plain", "from_city": "honro",
	 "x": 210, "y": 146, "agri_start": 85, "comm_start": 75, "pop_start": 28000,
	 "wall_start": 2300, "troops_start": 4600, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["tb_saryeong"],
	 "desc": "주인 없는 뼈가 자리마다 놓여 있다. 이름은 다 잊혔다."},
	{"id": "simyeon", "name": "심연", "hanja": "深淵", "land": "hill", "from_city": "jinhon",
	 "x": 218, "y": 148, "agri_start": 75, "comm_start": 85, "pop_start": 26000,
	 "wall_start": 2200, "troops_start": 4400, "train_start": 40, "tech_start": 100,
	 "force": "", "lord": "",
	 "officers": ["tb_heukju"],
	 "desc": "지도 위 가장 남쪽 이름. 내려다보면 끝이 안 보인다."},
]

## rtk.js data-city.js LAND_TYPES의 def·siege — capOf류와 달리 아직 안
## 옮겨 둔 두 값. 성 셋이 plain·river뿐이라도 원작 표를 통째로 옮겼다
## (하나만 골라 옮기면 "왜 이건 빼고 저건 옮겼나"는 판단이 새로 끼는
## 셈이라, LAND_AGRI_CAP·LAND_COMM_CAP처럼 표 전체를 그대로 든다).
const LAND_DEF := {"plain": 1.0, "river": 1.1, "hill": 1.15, "mount": 1.3}
const LAND_SIEGE := {"plain": 1.0, "river": 0.95, "hill": 0.9, "mount": 0.75}

## rtk-ai.js CREED — 성향(2026-09-14, "타 세력 AI" 22절이 균일 확률로
## 미뤄 둔 "creed 차등"을 여기서 옮긴다). `js/data-force.js FORCES_194`의
## `creed` 필드 그대로 — cao(조조, 우리 자신)는 뺐다. force가 빈 문자열인
## 77개 재야 성은 애초에 AI 행동 주체가 아니라(realm_save_state.gd
## `_run_enemy_ai()`) 이 표에 없어도 된다.
const CREED := {
	"shao": "balanced", "zan": "aggressive", "rong": "turtle",
	"bei": "balanced", "bu": "aggressive", "shu": "aggressive",
	"ce": "aggressive", "biao": "turtle", "jue": "balanced",
	"teng": "balanced", "lu": "turtle", "zhang": "turtle",
	"quan": "balanced",  # 2026-09-14 추가 — 시나리오 200/208에서 손책(ce)이
	                      # 손권(quan)으로 넘어간 뒤 쓰는 force id. data-
	                      # force.js FORCES_200 quan 항목의 creed 그대로
	                      # (CREED.get()의 기본값과 우연히 같지만, 명시해 둔다).
}

static func creed_of(force_id: String) -> String:
	return String(CREED.get(force_id, "balanced"))


## **2026-09-14 추가 — 시나리오 200년(관도).** REALM 4절 "제외"에 마지막
## 남은 항목. `js/data-force.js FORCES_200`을 옮긴다 — 194(현재 유일한
## 시작)와 달리 조조(cao)가 처음부터 8개 성을 갖는다. 5개(낙양·장안·
## 소패·하비·수춘)는 194 기준으로 ENEMY_CITIES에 남의 세력으로 들어
## 있던 성인데, 이 시나리오에선 처음부터 우리 것이다 — 그 정의가 이미
## 갖고 있는 agri_start/comm_start/pop_start/wall_start/troops_start/
## train_start/tech_start로 채운다(`realm_save_state.gd
## start_scenario()`가 실제로 씀). **194에만 있던 세력 여섯(공손찬·
## 공융·이각·여포·원술·손책)은 200엔 없다** — 그 성은 남은 세력에게
## 재배정되거나(아래 SCENARIO_FORCE_OVERRIDE) 조조 몫이 된다(이각의
## 낙양·장안, 여포의 하비, 원술의 수춘·[여남은 유비에게], 유비의 소패는
## 조조 몫). 자세한 대응표는 `docs/VERTICAL_SLICE_REALM.md` 27절 참고.
const SCENARIO_CAO_CITIES := {
	"194": ["chenliu", "puyang", "xuchang"],
	"200": ["xuchang", "chenliu", "puyang", "luoyang", "changan",
	        "xiaopei", "xiapi", "shouchun"],
}

## ENEMY_CITIES에 정적으로 박힌 194 기준 `force`에서, 그 시나리오만
## 실제로 달라지는 자리만 담는다(나머지는 194 값 그대로 유효 — 예:
## shao 자신의 원래 세 성, teng·lu·zhang·biao 전부 194와 200이 같다).
## 194는 override가 없다(빈 Dictionary, 기본값 그대로).
const SCENARIO_FORCE_OVERRIDE := {
	"200": {
		"jixian": "shao", "beiping": "shao",  # 공손찬(zan) 소멸 → 원소가 흡수
		"beihai": "shao",                      # 공융(rong) 소멸 → 원소가 흡수
		"jianye": "quan", "chaisang": "quan", "kuaiji": "quan",  # 손책→손권
		"runan": "bei",                        # 원술(shu) 소멸 → 유비가 흡수
	},
}


## **재해석 — rtk-ai.js는 creed마다 손실 허용치(lossCap)가 다를 뿐, "친다/
## 안 친다" 확률표 자체는 없다**(실제 판단은 war.forecast()로 매번 다시
## 계산한다). 이 슬라이스엔 그 예측 판정이 없어(realm_save_state.gd
## `_run_enemy_ai()` 머리말 참고) creed를 "얼마나 자주 치려 드는가"로
## 옮겨 놓은 단순화다 — aggressive가 더 자주, turtle이 훨씬 뜸하게.
const CREED_CHANCE_MUL := {"aggressive": 1.5, "balanced": 1.0, "turtle": 0.35}

static func creed_chance_mul(force_id: String) -> float:
	return float(CREED_CHANCE_MUL.get(creed_of(force_id), 1.0))


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
