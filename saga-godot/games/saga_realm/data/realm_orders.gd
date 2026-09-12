extends RefCounted

## VERTICAL_SLICE_REALM.md 3절 결정 — 웹판 `rtk.js` ORDERS(10종) 중 이
## 슬라이스가 쓰는 다섯(개간·상업·치안·수색·등용)만 그대로 이식했다.
## gold·base·per 값도 원작 그대로 — 새 판정식을 상상하지 않는다는 이
## 저장소 전체 습관.
##
## **2026-09-12 추가 — 치안(sec).** 4절 "제외" 목록에 있던 것을 VERTICAL_
## SLICE_REALM.md에 정정 기록을 남기고 끌어왔다 — govMul()과 달리 secMul()
## 은 애초부터 gold_income()/food_income() 공식 안에 들어 있었는데(치안
## 명령이 없어) sec를 시작값 60에 **고정한 상수**로 흉내만 냈었다. 명령을
## 넣는 것은 그 자리를 실제 값으로 바꾸는 것뿐이라 인구(pop)·성벽(wall)·
## 재해(disaster) 같은 아직 없는 다른 시스템을 끌어들이지 않는다.
##
## capOf()·goldOf()·foodOf()·secMul()·govMul()도 전부 `rtk.js` 원문 그대로
## 옮겼다. 이 슬라이스는 성이 허창(許昌) 하나뿐이고(land: plain, agriCap/
## commCap 둘 다 1.0) capOf()는 그 경우로 좁혀 상수로 굳혔다 — 공식 자체는
## 그대로다.

const ORDERS := [
	{"key": "agri", "name": "개간", "emoji": "🌾", "stat": "wisdom", "gold": 60, "base": 3, "per": 0.055,
	 "desc": "논밭을 넓힌다. 수확이 늘어 군량이 넉넉해진다."},
	{"key": "comm", "name": "상업", "emoji": "🏪", "stat": "wisdom", "gold": 60, "base": 3, "per": 0.055,
	 "desc": "저자를 키운다. 달마다 들어오는 금이 늘어난다."},
	{"key": "sec", "name": "치안", "emoji": "🪧", "stat": "command", "gold": 40, "base": 3, "per": 0.05,
	 "desc": "민심을 다독인다. 낮으면 세수와 수확이 준다."},
	{"key": "search", "name": "수색", "emoji": "🔍", "stat": "wisdom", "gold": 80, "base": 0, "per": 0,
	 "desc": "재야에 묻힌 인재를 찾는다. 찾아야 등용할 수 있다."},
	{"key": "hire", "name": "등용", "emoji": "🤝", "stat": "wisdom", "gold": 150, "base": 0, "per": 0,
	 "desc": "찾아낸 재야를 부른다."},
]

const CAP_AGRI := 900   # rtk.js capOf(): round(900 * land.agriCap), 허창 agriCap=1.0
const CAP_COMM := 900   # 위와 같음(commCap=1.0)
const CAP_SEC := 100    # rtk.js capOf(key === 'sec') 그대로

const UPKEEP_PER_OFFICER := 12   # rtk.js UPKEEP_PER_OFFICER
const GOLD_MUL := 0.55           # rtk.js goldOf()의 rtk.goldMul 튜닝값 기본값
const FOOD_MUL := 6.0            # rtk.js foodOf()의 rtk.foodMul 튜닝값 기본값
const SEC_START := 60            # rtk.js setup()의 sec 시작값
const HARVEST_MONTHS := [6, 10]  # rtk.js HARVEST_MONTHS


static func by_key(key: String) -> Dictionary:
	for o: Dictionary in ORDERS:
		if o.key == key:
			return o
	return {}


## rtk.js capOf() — 이 슬라이스가 쓰는 세 개발 명령(agri/comm/sec)만 좁혔다.
static func cap_of(key: String) -> int:
	match key:
		"agri": return CAP_AGRI
		"comm": return CAP_COMM
		"sec": return CAP_SEC
	return 999999


## rtk.js govMul() — 태수(이 슬라이스에선 로스터 중 "지력*0.6+통솔*0.4"가
## 가장 높은 무장)의 자질이 그 성 살림에 얹힌다.
static func gov_mul(wisdom: float, command: float) -> float:
	return 1.0 + (wisdom * 0.6 + command * 0.4) / 100.0 * 0.35


## rtk.js secMul() — 0.5 ~ 1.0. sec 명령이 이제 있으니 고정값 대신 실제
## 값을 받는다.
static func sec_mul(sec: int) -> float:
	return 0.5 + clampf(float(sec), 0.0, 100.0) / 200.0


## rtk.js goldOf() — round(comm * goldMul * secMul * govMul * harvestMul).
## harvestMul은 이 슬라이스에 재해(disaster)가 없어 1.0 고정.
static func gold_income(comm: int, mul: float, sec: int) -> int:
	return roundi(float(comm) * GOLD_MUL * sec_mul(sec) * mul)


## rtk.js foodOf() — round(agri * foodMul * secMul * govMul * harvestMul).
static func food_income(agri: int, mul: float, sec: int) -> int:
	return roundi(float(agri) * FOOD_MUL * sec_mul(sec) * mul)
