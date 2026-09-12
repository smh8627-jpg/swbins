extends RefCounted

const RealmCities := preload("res://games/saga_realm/data/realm_cities.gd")

## VERTICAL_SLICE_REALM.md 3절 결정 — 웹판 `rtk.js` ORDERS(10종)을 이제
## **전부** 그대로 이식했다(2026-09-12, "나머지 명령도 마저 추가해줘").
## gold·base·per 값도 원작 그대로 — 새 판정식을 상상하지 않는다는 이
## 저장소 전체 습관. 순서도 rtk.js ORDERS 배열 순서 그대로(agri·comm·
## tech·sec·wall·draft·train·ships·search·hire).
##
## **재해석 — 명령이 만드는 값만 들이고, 그 값에 딸린 다른 시스템은 안
## 들인다.** 치안(sec, 2026-09-12 1차 추가)과 같은 원칙:
## - 기술(tech)·훈련(train) — war.js가 없어(4절 "제외") 지금은 그냥 자라기만
##   하는 숫자다. 나중에 전투 슬라이스가 붙을 때 쓸 자리를 미리 마련해 둔
##   것뿐, 지금 당장 소비하는 곳은 없다.
## - 축성(wall) — 마찬가지로 공성(war.js)이 없어 숫자만 자란다. 성벽
##   파손율(maxWall과의 비율)은 여전히 없다(디오라마의 담장은 그대로 늘
##   꽉 찬 넷).
## - 징병(draft) — rtk.js 공식이 인구(pop)를 깎아 병력(troops)을 만드는
##   구조라 pop·troops 두 값을 이번에 들였다. 단 **인구가 저절로 늘거나
##   치안·개간에 연동해 변하는 rtk.js settleMonth()의 성장 공식은 안
##   옮겼다** — pop은 징병으로만 줄어든다. troops는 대신 매달 군량을
##   먹는다(rtk.js eatOf()/굶주림 로직은 그대로 옮겼다 — 안 그러면 병력이
##   군량과 아무 관계 없는 죽은 숫자가 된다).
## - 조선(ships) — land: plain(강 없음) 성에서는 rtk.js도 원래 늘 실패한다
##   ("물길이 없는 성입니다"). 새 판정을 안 만들고 그 실패 그대로 옮겼다.
##
## **2026-09-12 추가 — 여러 성(진류·복양·허창).** capOf()가 이제 성마다
## 다르다(`realm_cities.gd`의 land별 배율) — 성 하나(허창)만 있을 때
## 상수로 굳혔던 CAP_AGRI 등을 city_id를 받는 계산으로 되돌렸다. capOf()·
## goldOf()·foodOf()·secMul()·govMul() 공식 자체는 여전히 `rtk.js` 원문
## 그대로다.

const ORDERS := [
	{"key": "agri", "name": "개간", "emoji": "🌾", "stat": "wisdom", "gold": 60, "base": 3, "per": 0.055,
	 "desc": "논밭을 넓힌다. 수확이 늘어 군량이 넉넉해진다."},
	{"key": "comm", "name": "상업", "emoji": "🏪", "stat": "wisdom", "gold": 60, "base": 3, "per": 0.055,
	 "desc": "저자를 키운다. 달마다 들어오는 금이 늘어난다."},
	{"key": "tech", "name": "기술", "emoji": "🔨", "stat": "wisdom", "gold": 100, "base": 2, "per": 0.04,
	 "desc": "병장기를 벼린다. 나중에 병력이 더 세게 친다."},
	{"key": "sec", "name": "치안", "emoji": "🪧", "stat": "command", "gold": 40, "base": 3, "per": 0.05,
	 "desc": "민심을 다독인다. 낮으면 세수와 수확이 준다."},
	{"key": "wall", "name": "축성", "emoji": "🧱", "stat": "command", "gold": 120, "base": 60, "per": 3.2,
	 "desc": "성벽을 높인다. 나중에 공성을 오래 버틴다."},
	{"key": "draft", "name": "징병", "emoji": "🪖", "stat": "command", "gold": 200, "base": 200, "per": 9,
	 "desc": "백성을 병사로 뽑는다. 인구가 그만큼 준다."},
	{"key": "train", "name": "훈련", "emoji": "🎯", "stat": "might", "gold": 50, "base": 3, "per": 0.05,
	 "desc": "훈련도를 올린다. 같은 병력이 더 오래 버틴다."},
	{"key": "ships", "name": "조선", "emoji": "🛶", "stat": "command", "gold": 150, "base": 4, "per": 0.06,
	 "desc": "배를 짓는다. 물길이 있는 성에서만 가능하다."},
	{"key": "search", "name": "수색", "emoji": "🔍", "stat": "wisdom", "gold": 80, "base": 0, "per": 0,
	 "desc": "재야에 묻힌 인재를 찾는다. 찾아야 등용할 수 있다."},
	{"key": "hire", "name": "등용", "emoji": "🤝", "stat": "wisdom", "gold": 150, "base": 0, "per": 0,
	 "desc": "찾아낸 재야를 부른다."},
]

const CAP_TECH := 900     # rtk.js capOf(key === 'tech') 그대로 — land 무관
const CAP_SEC := 100      # rtk.js capOf(key === 'sec') 그대로 — land 무관
const CAP_TRAIN := 100    # rtk.js capOf(key === 'train') 그대로 — land 무관

const UPKEEP_PER_OFFICER := 12   # rtk.js UPKEEP_PER_OFFICER
const GOLD_MUL := 0.55           # rtk.js goldOf()의 rtk.goldMul 튜닝값 기본값
const FOOD_MUL := 6.0            # rtk.js foodOf()의 rtk.foodMul 튜닝값 기본값
const FOOD_PER_1000 := 10        # rtk.js FOOD_PER_1000 — 병사 1000명의 한 달 군량
const SEC_START := 60            # rtk.js setup()의 sec 시작값 — land 무관
const TECH_START := 100          # rtk.js setup()의 tech 시작값 — land 무관
const TRAIN_START := 40          # rtk.js setup()의 train 시작값 — land 무관
const HARVEST_MONTHS := [6, 10]  # rtk.js HARVEST_MONTHS


static func by_key(key: String) -> Dictionary:
	for o: Dictionary in ORDERS:
		if o.key == key:
			return o
	return {}


## rtk.js capOf() — draft(별도 공식)를 뺀 나머지 개발형 명령 전부.
## agri/comm/wall/ships는 성마다 다르다(RealmCities, land별 배율).
static func cap_of(key: String, city_id: String) -> int:
	match key:
		"agri": return RealmCities.agri_cap(city_id)
		"comm": return RealmCities.comm_cap(city_id)
		"tech": return CAP_TECH
		"sec": return CAP_SEC
		"wall": return RealmCities.wall_cap(city_id)
		"train": return CAP_TRAIN
		"ships": return RealmCities.ships_cap(city_id)
	return 999999


## rtk.js eatOf() — 병사 1000명이 한 달에 먹는 군량.
static func food_upkeep(troops: int) -> int:
	return roundi(float(troops) / 1000.0 * float(FOOD_PER_1000))


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
