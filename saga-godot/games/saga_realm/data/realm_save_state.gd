extends Node

## VERTICAL_SLICE_REALM.md 완료 조건 — GO/DUNGEON/FOREST/STORY save_state
## 계열과 같은 정신(로컬 파일 하나, 버전 필드, 게임마다 완전히 분리된
## 세이브)이되, REALM은 다섯 판 중 유일한 턴제라 player_pos 대신 세력
## 살림(연·월·금고)과 성마다 따로 노는 살림(개간·상업·기술·치안·축성·
## 훈련·인구·병력·군량)과 무장(로스터/재야록)을 담는다.
##
## project.godot [autoload]에 RealmSaveState로 등록.
##
## 명령 실행(`execute_order`)·달 넘기기(`next_month`)는 웹판 `rtk.js`
## order()/doSearch()/doHire()/tryHire()/settleMonth()/endMonth()를 성
## 여러 곳·무장 하나~둘 규모로 그대로 옮긴 것 — 새 판정식을 상상하지 않는다.
##
## **2026-09-12 추가 — 여러 성(진류·복양·허창).** "여러 성으로 넓히는 것부터
## 해줘" — data-force.js 시나리오 194의 조조군이 원래부터 성 셋을 갖고
## 시작한다는 사실을 그대로 썼다(전쟁·정복 없이 넓히는 유일한 방법,
## `realm_cities.gd` 머리말 참고). `agri`·`comm`·`sec`·`tech`·`wall`·
## `train`·`pop`·`troops`·`food`·`ships`는 이제 `cities[city_id]` 안에
## 있다 — `current_city`가 "지금 조망 중인 성"이고, 명령은 전부 그 성에
## 적용된다. `gold`(세력 금고)·`roster`(무장)·`year`/`month`(달력)는
## rtk.js처럼 여전히 세력 전체가 공유한다.
##
## **2026-09-12 추가 — 무장의 성 소속(officer_city).** "무장 위치는 안
## 따진다"던 재해석을 이제 절반 뒤집었다: **개발형 명령(agri~ships·
## draft)은 그 성에 배치된 무장만 쓸 수 있다** — rtk.js order()의
## `r.city !== cityId` 체크를 그대로 들였다. 시작 무장(현책)은 허창에
## 배치돼 있어 허창은 그대로 돌아가지만, 진류·복양은 그 성 소속 무장을
## 얻기 전까진 개발형 명령을 못 쓴다 — "가서 인재를 심어야 그 성이
## 자란다"는 의도된 결과다. **수색(search)·등용(hire)만 예외** — 아직
## 로스터 전체 아무나 실행할 수 있다. 안 그러면 "그 성에 무장이 있어야
## 수색할 수 있는데 수색해야 무장이 생긴다"는 순환이 막힌다(2-5절에서
## 이미 이 문제를 피하려고 재야를 성마다 나눠 묻는 것까지만 했었다).
## 등용에 성공하면 그 무장은 **찾아낸(수색한) 성**에 배치된다.
##
## 무작위(대성공 판정·수색·등용 성공률)는 FOREST 창작 몬스터들과 같은
## 이유로 고정 시드를 쓴다 — 헤드리스 검증이 "몇 번을 돌려도 같은 결과"를
## 낼 수 있어야 한다(루트 CLAUDE.md 검증 습관). 실제 플레이에서는 매번
## 다른 명령·다른 순서로 이 스트림을 소비하니 체감상 무작위와 다르지 않다.

const Characters := preload("res://saga_core/data/characters.gd")
const RealmOrders := preload("res://games/saga_realm/data/realm_orders.gd")
const RealmOfficerPool := preload("res://games/saga_realm/data/realm_officer_pool.gd")
const RealmCities := preload("res://games/saga_realm/data/realm_cities.gd")

const SAVE_PATH := "user://save_realm.json"
const SAVE_VERSION := 3  # 1(성 하나) → 2(성 여러 곳) → 3(officer_city 추가)
const RNG_SEED := 20260824  # 루트 CLAUDE.md 진단 시드와 같은 값(우연 아님, 관례를 따름)

var year := 194
var month := 1
## 조조군 시작 금고 — rtk.js setup(): 2000 + cities.length(3) * 400 = 3200.
var gold := 3200

## city_id -> {agri, comm, sec, tech, wall, train, pop, troops, food, ships}.
## _init_cities()가 RealmCities.CITIES 기본값으로 채운다(try_load()가 있으면
## 그 값으로 덮어쓴다).
var cities: Dictionary = {}
var current_city := RealmCities.DEFAULT_CITY  # "지금 조망 중인 성"

## **2026-09-12 추가 — 월드맵 손잡이(viewing_map).** true면 realm_worldmap.gd
## (성 셋을 한눈에)를 보여주고 diorama(realm_city.gd, "성 하나를 3D로
## 조망")를 숨긴다. **저장하지 않는다** — 세이브를 열 때마다 항상 디오라마
## 부터 보이는 게 원작 rtk.js의 "2D 지도가 기본"과 같은 결(realm3d.js는
## 2026-09-11부터 기본 on이지만, 그건 30개 성 전체를 다루는 원작 얘기고
## 이 슬라이스는 아직 지도가 순전히 조망용이라 디오라마가 더 자주 쓰인다).
var viewing_map := false

var roster: Array = [RealmOfficerPool.STARTING_OFFICER]
var found: Array = []               # 수색으로 찾아냈지만 아직 등용 전
## officer_id -> city_id. 개발형 명령(agri~ships·draft)은 이 배치를 따진다
## (수색·등용은 예외, "재해석" 문단 참고).
var officer_city: Dictionary = {RealmOfficerPool.STARTING_OFFICER: RealmCities.DEFAULT_CITY}
var _done_this_month: Dictionary = {}  # officer_id -> bool

var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	_rng.seed = RNG_SEED
	_init_cities()


## rtk.js setup()의 도시 초기화 — RealmCities.CITIES 정의 그대로.
func _init_cities() -> void:
	for def: Dictionary in RealmCities.CITIES:
		var cid: String = String(def.id)
		cities[cid] = {
			"agri": int(def.agri_start), "comm": int(def.comm_start),
			"sec": RealmOrders.SEC_START, "tech": RealmOrders.TECH_START,
			"wall": int(def.wall_start), "train": RealmOrders.TRAIN_START,
			"pop": int(def.pop_start), "troops": 0,
			"food": RealmCities.food_start(cid),
			"ships": RealmCities.ships_start(cid),
		}


## 명령을 실행한다 — rtk.js order()를 current_city 하나에 적용하는 축약.
## 반환: {"ok": bool, "why": String}(실패) 또는
##       {"ok": true, "officer": String, "amount": int, "crit": bool}
##       (개간/상업/기술/치안/축성/징병/훈련/조선) /
##       {"ok": true, "found": String}(수색, 빈 문자열이면 "더 찾을 사람 없음") /
##       {"ok": true, "hired": String, "chance": float}(등용, 빈 문자열이면 거절)
func execute_order(key: String) -> Dictionary:
	var o := RealmOrders.by_key(key)
	if o.is_empty():
		return {"ok": false, "why": "없는 명령"}
	## rtk.js order() "배는 물가에서만 짓는다" — capOf('ships')가 0인
	## (land: plain) 성은 항상 여기서 막힌다. 금·무장 턴을 쓰기 전에 먼저
	## 걸러 원작 순서(금 차감보다 먼저)를 그대로 지켰다.
	if key == "ships" and RealmOrders.cap_of("ships", current_city) <= 0:
		return {"ok": false, "why": "물길이 없는 성입니다"}
	if gold < int(o.gold):
		return {"ok": false, "why": "금이 모자랍니다"}

	## 수색·등용은 로스터 전체 아무나(성 소속 무관), 나머지(개발형·징병)는
	## current_city에 배치된 무장만 — 위 "재해석" 문단 참고.
	var location_bound := key != "search" and key != "hire"
	var officer_id := _best_officer_for(String(o.stat), current_city if location_bound else "")
	if officer_id.is_empty():
		var why := "이 성에 배치된 무장이 없습니다" if location_bound else "명령을 쓸 무장이 없습니다"
		return {"ok": false, "why": why}

	gold -= int(o.gold)
	_done_this_month[officer_id] = true

	if key == "search":
		return _do_search(officer_id)
	if key == "hire":
		return _do_hire(officer_id)
	if key == "draft":
		return _do_draft(o, officer_id)
	return _do_devel(key, o, officer_id)


## rtk.js order()의 "대성공 판정 + 성과량" 부분 — 개발형 명령(devel)과
## 징병(draft)이 공유한다(뒤에서 amount를 다르게 다룰 뿐 굴리는 방식은 같다).
func _roll_amount(o: Dictionary, officer_id: String) -> Dictionary:
	var h = Characters.find(officer_id)
	var stat_val: float = float(h.stats.get(String(o.stat), 0))
	var crit := _rng.randf() < clampf(stat_val / 400.0, 0.03, 0.28)
	var amount := roundi((float(o.base) + stat_val * float(o.per)) * (1.5 if crit else 1.0))
	return {"amount": amount, "crit": crit}


## agri/comm/tech/sec/wall/train/ships 일곱 다 같은 모양(cap까지 채우고
## 남은 만큼만 는다)이라 current_city의 Dictionary를 직접 읽고 쓴다.
func _do_devel(key: String, o: Dictionary, officer_id: String) -> Dictionary:
	var roll := _roll_amount(o, officer_id)
	var amount: int = roll.amount

	var c: Dictionary = cities[current_city]
	var cap := RealmOrders.cap_of(key, current_city)
	var before: int = int(c.get(key, 0))
	var after: int = mini(cap, before + amount)
	c[key] = after
	amount = after - before

	return {"ok": true, "officer": officer_id, "amount": amount, "crit": roll.crit}


## rtk.js order()의 draft 분기 그대로 — 인구가 뽑을 수 있는 만큼(room)만
## 병력이 늘고, 그만큼 인구가 준다. 새 병사가 섞이면 훈련도가 희석된다.
## 전부 current_city 안에서 일어난다(인구·병력은 성마다 따로 논다).
func _do_draft(o: Dictionary, officer_id: String) -> Dictionary:
	var roll := _roll_amount(o, officer_id)
	var amount: int = roll.amount

	var c: Dictionary = cities[current_city]
	var pop_val: int = int(c.pop)
	var troops_val: int = int(c.troops)
	var room := floori(float(pop_val) * 0.06) - troops_val
	amount = maxi(0, mini(amount, maxi(0, room)))
	amount = mini(amount, floori(float(pop_val) / 12.0))
	c.troops = troops_val + amount
	c.pop = pop_val - amount
	if int(c.troops) > 0:
		c.train = roundi(float(c.train) * float(int(c.troops) - amount) / float(c.troops))

	return {"ok": true, "officer": officer_id, "amount": amount, "crit": roll.crit}


## rtk.js doSearch() — 재야 후보를 rarity 내림차순으로 보고, 지력이 높을수록
## "뻗치는 범위"(reach)가 넓어져 더 귀한 사람도 뽑힐 수 있다.
## **2026-09-12 추가 — 재야는 이제 current_city에 묻힌 사람만 나온다**
## (`HIDDEN_POOL_BY_CITY`, rtk.js doSearch()가 애초에 그 성 소속만 찾던
## 것과 같은 결) — 성마다 다른 재야가 있어 세 성을 다 둘러볼 이유가 생겼다.
func _do_search(officer_id: String) -> Dictionary:
	var hidden: Array = []
	for id: String in RealmOfficerPool.HIDDEN_POOL_BY_CITY.get(current_city, []):
		if id in found or id in roster:
			continue
		hidden.append(id)
	if hidden.is_empty():
		return {"ok": true, "found": ""}

	hidden.sort_custom(func(a: String, b: String) -> bool:
		return int(Characters.find(a).rarity) > int(Characters.find(b).rarity))

	var h = Characters.find(officer_id)
	var wis: float = float(h.stats.get("wisdom", 0))
	var reach := clampi(roundi(hidden.size() * wis / 130.0), 1, hidden.size())
	var pick_idx := _rng.randi_range(0, reach - 1)
	var got: String = hidden[pick_idx]
	found.append(got)
	return {"ok": true, "found": got}


## rtk.js doHire()/tryHire() — 찾아낸 재야 중 가장 먼저 찾은 이를 부른다.
## 성공률은 부르는 쪽의 지력과 상대의 rarity(콧대)가 가른다 — 같은 trait면
## +10%p.
func _do_hire(officer_id: String) -> Dictionary:
	if found.is_empty():
		return {"ok": true, "hired": ""}

	var target_id: String = found[0]
	var by = Characters.find(officer_id)
	var t = Characters.find(target_id)
	var wis: float = float(by.stats.get("wisdom", 0))
	var chance := clampf(0.28 + wis / 260.0 - (float(t.rarity) - 2.0) * 0.09, 0.05, 0.9)
	if String(by.trait) == String(t.trait):
		chance += 0.10

	if _rng.randf() > chance:
		return {"ok": true, "hired": "", "chance": chance}

	found.erase(target_id)
	roster.append(target_id)
	officer_city[target_id] = current_city  # 찾아낸(수색한) 성에 배치된다
	_done_this_month[target_id] = true  # rtk.js: 들어온 달에는 일하지 않는다
	return {"ok": true, "hired": target_id, "chance": chance}


## rtk.js settleMonth()+endMonth()의 축약 — 세력 금고는 **성 전부의 소득
## 합**(rtk.js settleMonth() "세력 금고" 루프 그대로)에서 정산하고, 군량·
## 치안·병력은 성마다 따로 정산한다.
func next_month() -> void:
	var income := 0
	var harvest := month in RealmOrders.HARVEST_MONTHS
	for city_id: String in cities.keys():
		var c: Dictionary = cities[city_id]

		## rtk.js govMul(cityId) — 그 성에 배치된 무장 중 으뜸(태수)의 자질이
		## 그 성 살림에만 얹힌다. 배치된 무장이 없으면 mul=1.0(rtk.js: !c.gov
		## 이면 1을 돌려주는 것과 같다) — 인재를 안 심은 성은 더 못 큰다.
		var gov_id := _governor_at(city_id)
		var mul := 1.0
		if not gov_id.is_empty():
			var h = Characters.find(gov_id)
			mul = RealmOrders.gov_mul(float(h.stats.get("wisdom", 0)), float(h.stats.get("command", 0)))

		income += RealmOrders.gold_income(int(c.comm), mul, int(c.sec))
		if harvest:
			c.food = int(c.food) + RealmOrders.food_income(int(c.agri), mul, int(c.sec))

		## rtk.js settleMonth() "군량이 떨어지면 병사가 흩어진다" — 병력이
		## 생긴 이상(징병) 매달 군량을 먹는다는 것까지는 옮겨야 징병이 군량과
		## 관계 없는 죽은 숫자가 되지 않는다. troops=0이면 food_upkeep도 0.
		c.food = int(c.food) - RealmOrders.food_upkeep(int(c.troops))
		if int(c.food) < 0:
			var lost := mini(int(c.troops), roundi(-float(c.food) / float(RealmOrders.FOOD_PER_1000) * 1000.0))
			c.troops = int(c.troops) - lost
			c.food = 0

		## rtk.js settleMonth() "치안은 가만두면 내려간다" — 그대로 이식.
		## 인구 증감(치안·개간 연동 성장 공식)은 그 값 자체가 없어(4절
		## "제외") 안 옮겼다 — pop은 징병으로만 준다.
		c.sec = clampi(int(c.sec) - 1, 0, 100)

	var upkeep := roster.size() * RealmOrders.UPKEEP_PER_OFFICER
	gold = maxi(0, gold + income - upkeep)

	month += 1
	if month > 12:
		month = 1
		year += 1
	_done_this_month.clear()


## rtk.js war.js moveOfficer() — 무장을 맞닿은 성으로 옮긴다(그 달의 명령을
## 쓴다). 이 슬라이스는 성 셋이 전부 우리 것이라 원작의 `to.force !== r.force`
## 체크(남의 성인가)는 늘 통과 — 맞닿음과 "이 달에 이미 명령을 썼는가"만
## 실제로 갈린다. 태수(`from.gov = null`) 정리는 옮기지 않았다 — 이 슬라이스는
## 태수를 저장하지 않고 `_governor_at()`이 매번 배치를 보고 다시 골라서다.
func transfer_officer(officer_id: String, to_city_id: String) -> Dictionary:
	if not (officer_id in roster):
		return {"ok": false, "why": "로스터에 없는 무장"}
	var from_city: String = officer_city.get(officer_id, "")
	if from_city == to_city_id:
		return {"ok": false, "why": "이미 그 성에 있습니다"}
	if not RealmCities.is_adjacent(from_city, to_city_id):
		return {"ok": false, "why": "맞닿아 있지 않습니다"}
	if _done_this_month.get(officer_id, false):
		return {"ok": false, "why": "이 달에 이미 명령을 썼습니다"}

	officer_city[officer_id] = to_city_id
	_done_this_month[officer_id] = true
	return {"ok": true}


## rtk.js "태수는 그 성의 으뜸 무장"(지력*0.6+통솔*0.4 최댓값) — 이제
## officer_city로 실제 배치를 아니까, 그 성에 배치된 무장 중에서만 고른다.
func _governor_at(city_id: String) -> String:
	var best_id := ""
	var best_val := -1.0
	for id: String in roster:
		if officer_city.get(id, "") != city_id:
			continue
		var h = Characters.find(id)
		if h == null:
			continue
		var v: float = float(h.stats.get("wisdom", 0)) * 0.6 + float(h.stats.get("command", 0)) * 0.4
		if v > best_val:
			best_val = v
			best_id = id
	return best_id


## city_filter가 비어 있으면(수색·등용) 로스터 전체를 본다. 아니면
## officer_city[id] == city_filter인 무장만 본다(개발형 명령·징병).
func _best_officer_for(stat: String, city_filter: String = "") -> String:
	var best_id := ""
	var best_val := -1.0
	for id: String in roster:
		if _done_this_month.get(id, false):
			continue
		if not city_filter.is_empty() and officer_city.get(id, "") != city_filter:
			continue
		var h = Characters.find(id)
		if h == null:
			continue
		var v: float = float(h.stats.get(stat, 0))
		if v > best_val:
			best_val = v
			best_id = id
	return best_id


func save() -> bool:
	var data := {
		"version": SAVE_VERSION,
		"year": year, "month": month,
		"gold": gold,
		"cities": cities,
		"current_city": current_city,
		"roster": roster, "found": found,
		"officer_city": officer_city,
	}
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(data))
	return true


func try_load() -> bool:
	if not FileAccess.file_exists(SAVE_PATH):
		return false
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f == null:
		return false
	var parsed: Variant = JSON.parse_string(f.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		return false
	var data: Dictionary = parsed
	if int(data.get("version", 0)) != SAVE_VERSION:
		return false

	year = int(data.get("year", 194))
	month = int(data.get("month", 1))
	gold = int(data.get("gold", 3200))
	var loaded_cities: Variant = data.get("cities", {})
	if typeof(loaded_cities) == TYPE_DICTIONARY and not loaded_cities.is_empty():
		cities = loaded_cities
	current_city = String(data.get("current_city", RealmCities.DEFAULT_CITY))
	roster = data.get("roster", [RealmOfficerPool.STARTING_OFFICER])
	found = data.get("found", [])
	var loaded_officer_city: Variant = data.get("officer_city", {})
	if typeof(loaded_officer_city) == TYPE_DICTIONARY and not loaded_officer_city.is_empty():
		officer_city = loaded_officer_city
	_done_this_month.clear()
	return true
