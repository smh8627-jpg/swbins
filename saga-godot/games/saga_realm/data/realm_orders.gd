extends RefCounted

## VERTICAL_SLICE_REALM.md 3절 결정 — 웹판 `rtk.js` ORDERS(10종) 중 이
## 슬라이스가 쓰는 넷(개간·상업·수색·등용)만 그대로 이식했다. gold·base·per
## 값도 원작 그대로 — 새 판정식을 상상하지 않는다는 이 저장소 전체 습관.
##
## capOf()·goldOf()·foodOf()·secMul()·govMul()도 전부 `rtk.js` 원문 그대로
## 옮겼다. 이 슬라이스는 성이 허창(許昌) 하나뿐이고(land: plain, agriCap/
## commCap 둘 다 1.0) 치안(sec) 명령이 없어 sec가 시작값 60에 고정이라,
## capOf()·secMul()은 그 경우로 좁혀 상수로 굳혔다 — 공식 자체는 그대로다.

const ORDERS := [
	{"key": "agri", "name": "개간", "emoji": "🌾", "stat": "wisdom", "gold": 60, "base": 3, "per": 0.055,
	 "desc": "논밭을 넓힌다. 수확이 늘어 군량이 넉넉해진다."},
	{"key": "comm", "name": "상업", "emoji": "🏪", "stat": "wisdom", "gold": 60, "base": 3, "per": 0.055,
	 "desc": "저자를 키운다. 달마다 들어오는 금이 늘어난다."},
	{"key": "search", "name": "수색", "emoji": "🔍", "stat": "wisdom", "gold": 80, "base": 0, "per": 0,
	 "desc": "재야에 묻힌 인재를 찾는다. 찾아야 등용할 수 있다."},
	{"key": "hire", "name": "등용", "emoji": "🤝", "stat": "wisdom", "gold": 150, "base": 0, "per": 0,
	 "desc": "찾아낸 재야를 부른다."},
]

const CAP_AGRI := 900   # rtk.js capOf(): round(900 * land.agriCap), 허창 agriCap=1.0
const CAP_COMM := 900   # 위와 같음(commCap=1.0)

const UPKEEP_PER_OFFICER := 12   # rtk.js UPKEEP_PER_OFFICER
const GOLD_MUL := 0.55           # rtk.js goldOf()의 rtk.goldMul 튜닝값 기본값
const FOOD_MUL := 6.0            # rtk.js foodOf()의 rtk.foodMul 튜닝값 기본값
const SEC_MUL := 0.8             # rtk.js secMul(sec=60) = 0.5 + clamp(60,0,100)/200 — sec 명령이 없어 고정
const HARVEST_MONTHS := [6, 10]  # rtk.js HARVEST_MONTHS


static func by_key(key: String) -> Dictionary:
	for o: Dictionary in ORDERS:
		if o.key == key:
			return o
	return {}


## rtk.js govMul() — 태수(이 슬라이스에선 로스터 중 "지력*0.6+통솔*0.4"가
## 가장 높은 무장)의 자질이 그 성 살림에 얹힌다.
static func gov_mul(wisdom: float, command: float) -> float:
	return 1.0 + (wisdom * 0.6 + command * 0.4) / 100.0 * 0.35


## rtk.js goldOf() — round(comm * goldMul * secMul * govMul * harvestMul).
## harvestMul은 이 슬라이스에 재해(disaster)가 없어 1.0 고정.
static func gold_income(comm: int, mul: float) -> int:
	return roundi(float(comm) * GOLD_MUL * SEC_MUL * mul)


## rtk.js foodOf() — round(agri * foodMul * secMul * govMul * harvestMul).
static func food_income(agri: int, mul: float) -> int:
	return roundi(float(agri) * FOOD_MUL * SEC_MUL * mul)
