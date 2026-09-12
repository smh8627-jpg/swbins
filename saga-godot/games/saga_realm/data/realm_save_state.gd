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
## **재해석 — 무장의 "위치"는 안 따진다.** rtk.js는 무장마다 소속 성이
## 있어 그 성에서만 명령을 쓸 수 있지만, 이 슬라이스는 로스터가 1~2명뿐
## 이라 "무장을 어느 성에 두는가"라는 시스템 자체를 아직 안 만들었다 —
## 명령은 current_city가 어디든 로스터 중 자질이 가장 높은 무장이 쓴다.
## 여러 무장을 여러 성에 나눠 배치하는 건 다음에 볼 자리(이미 2026-09-12
## 1차 추가 때부터 그렇게 적어 뒀다).
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
const SAVE_VERSION := 2  # 1(성 하나) → 2(성 여러 곳, cities 딕셔너리로 구조 변경)
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

var roster: Array = [RealmOfficerPool.STARTING_OFFICER]
var found: Array = []               # 수색으로 찾아냈지만 아직 등용 전
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

	var officer_id := _best_officer_for(String(o.stat))
	if officer_id.is_empty():
		return {"ok": false, "why": "명령을 쓸 무장이 없습니다"}

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
	_done_this_month[target_id] = true  # rtk.js: 들어온 달에는 일하지 않는다
	return {"ok": true, "hired": target_id, "chance": chance}


## rtk.js settleMonth()+endMonth()의 축약 — 세력 금고는 **성 전부의 소득
## 합**(rtk.js settleMonth() "세력 금고" 루프 그대로)에서 정산하고, 군량·
## 치안·병력은 성마다 따로 정산한다.
func next_month() -> void:
	var gov_id := _governor()
	var mul := 1.0
	if not gov_id.is_empty():
		var h = Characters.find(gov_id)
		mul = RealmOrders.gov_mul(float(h.stats.get("wisdom", 0)), float(h.stats.get("command", 0)))

	var income := 0
	for city_id: String in cities.keys():
		var c: Dictionary = cities[city_id]
		income += RealmOrders.gold_income(int(c.comm), mul, int(c.sec))
	var upkeep := roster.size() * RealmOrders.UPKEEP_PER_OFFICER
	gold = maxi(0, gold + income - upkeep)

	var harvest := month in RealmOrders.HARVEST_MONTHS
	for city_id: String in cities.keys():
		var c: Dictionary = cities[city_id]
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

	month += 1
	if month > 12:
		month = 1
		year += 1
	_done_this_month.clear()


## rtk.js "태수는 그 성의 으뜸 무장"(지력*0.6+통솔*0.4 최댓값) — 여러 무장을
## 성마다 따로 앉히는 대신, 로스터 전체에서 가장 나은 하나를 모든 성의
## 태수로 재사용한다(위 "무장 위치는 안 따진다" 재해석과 같은 결).
func _governor() -> String:
	var best_id := ""
	var best_val := -1.0
	for id: String in roster:
		var h = Characters.find(id)
		if h == null:
			continue
		var v: float = float(h.stats.get("wisdom", 0)) * 0.6 + float(h.stats.get("command", 0)) * 0.4
		if v > best_val:
			best_val = v
			best_id = id
	return best_id


func _best_officer_for(stat: String) -> String:
	var best_id := ""
	var best_val := -1.0
	for id: String in roster:
		if _done_this_month.get(id, false):
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
	_done_this_month.clear()
	return true
