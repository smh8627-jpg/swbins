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


static func is_adjacent(a: String, b: String) -> bool:
	for pair: Array in ADJ:
		if (pair[0] == a and pair[1] == b) or (pair[0] == b and pair[1] == a):
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
const ENEMY_CITIES := [
	{"id": "xiaopei", "name": "소패", "hanja": "小沛", "land": "plain", "from_city": "xuchang",
	 "wall_start": 3600, "troops_start": 800, "train_start": 40, "tech_start": 100,
	 "desc": "서주의 작은 성. 유비령 — 허창과 맞닿아 있다."},
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


static func land_def(land: String) -> float:
	return float(LAND_DEF.get(land, 1.0))


static func land_siege(land: String) -> float:
	return float(LAND_SIEGE.get(land, 1.0))


static func _land(id: String) -> String:
	return String(by_id(id).get("land", "plain"))


## rtk.js capOf('agri'): round(900 * land.agriCap)
static func agri_cap(id: String) -> int:
	return roundi(900.0 * float(LAND_AGRI_CAP.get(_land(id), 1.0)))


## rtk.js capOf('comm'): round(900 * land.commCap)
static func comm_cap(id: String) -> int:
	return roundi(900.0 * float(LAND_COMM_CAP.get(_land(id), 1.0)))


## rtk.js capOf('wall'): round(d.wall * 2)
static func wall_cap(id: String) -> int:
	return roundi(float(by_id(id).get("wall_start", 4000)) * 2.0)


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
	return 8000 + int(by_id(id).get("agri_start", 0)) * 8
