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

const CITIES := [
	{"id": "chenliu", "name": "진류", "hanja": "陳留", "land": "plain",
	 "agri_start": 340, "comm_start": 320, "wall_start": 4800, "pop_start": 240000,
	 "desc": "연주의 중심. 의병을 일으키기 좋은 자리."},
	{"id": "puyang", "name": "복양", "hanja": "濮陽", "land": "river",
	 "agri_start": 300, "comm_start": 280, "wall_start": 4600, "pop_start": 210000,
	 "desc": "황하를 낀 연주의 목. 물길이 곧 길이다."},
	{"id": "xuchang", "name": "허창", "hanja": "許昌", "land": "plain",
	 "agri_start": 400, "comm_start": 360, "wall_start": 5400, "pop_start": 260000,
	 "desc": "중원 한복판. 둔전을 벌이기에 이만한 땅이 없다."},
]

## rtk.js data-city.js LAND_TYPES — 이 슬라이스가 실제로 쓰는 두 land(plain·
## river)만 옮겼다(둘 다 agriCap 1.0이라 즉시 갈리는 건 commCap과 ships뿐).
const LAND_AGRI_CAP := {"plain": 1.0, "river": 1.0, "hill": 0.85, "mount": 0.7}
const LAND_COMM_CAP := {"plain": 1.0, "river": 1.15, "hill": 0.9, "mount": 0.8}

const DEFAULT_CITY := "xuchang"  # 기존 단일 슬라이스가 쓰던 성 — 하위 호환


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
