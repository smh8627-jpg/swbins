extends Node

## VERTICAL_SLICE_REALM.md 완료 조건 — GO/DUNGEON/FOREST/STORY save_state
## 계열과 같은 정신(로컬 파일 하나, 버전 필드, 게임마다 완전히 분리된
## 세이브)이되, REALM은 다섯 판 중 유일한 턴제라 player_pos 대신 성 하나의
## 살림(연·월·금·군량·개간·상업 수치)과 무장(로스터/재야록)을 담는다.
##
## project.godot [autoload]에 RealmSaveState로 등록.
##
## 명령 실행(`execute_order`)·달 넘기기(`next_month`)는 웹판 `rtk.js`
## order()/doSearch()/doHire()/tryHire()/settleMonth()/endMonth()를 성 하나·
## 무장 하나~둘 규모로 그대로 옮긴 것 — 새 판정식을 상상하지 않는다.
##
## **재해석 — 무장을 직접 고르지 않는다.** 웹판은 명령마다 "어느 무장이
## 쓸지"를 화면에서 고르지만, 이 슬라이스는 로스터가 1~2명뿐이라 그 자질
## (`stat`)이 가장 높은, 이번 달에 아직 안 쓴 무장을 자동으로 고른다
## (`_best_officer_for`) — 여러 성·여러 무장을 굴리게 될 다음 슬라이스에서
## 다시 볼 자리.
##
## 무작위(대성공 판정·수색·등용 성공률)는 FOREST 창작 몬스터들과 같은
## 이유로 고정 시드를 쓴다 — 헤드리스 검증이 "몇 번을 돌려도 같은 결과"를
## 낼 수 있어야 한다(루트 CLAUDE.md 검증 습관). 실제 플레이에서는 매번
## 다른 명령·다른 순서로 이 스트림을 소비하니 체감상 무작위와 다르지 않다.

const Characters := preload("res://saga_core/data/characters.gd")
const RealmOrders := preload("res://games/saga_realm/data/realm_orders.gd")
const RealmOfficerPool := preload("res://games/saga_realm/data/realm_officer_pool.gd")

const SAVE_PATH := "user://save_realm.json"
const SAVE_VERSION := 1
const RNG_SEED := 20260824  # 루트 CLAUDE.md 진단 시드와 같은 값(우연 아님, 관례를 따름)

## 허창(許昌) — data-city.js 그대로: land plain, agri 400, comm 360.
## 세력 금고 2000+cities.length(1)*400(rtk.js setup()) = 2400.
## 이 성의 시작 군량 8000+agri*8(rtk.js setup()) = 11200.
var year := 194
var month := 1
var gold := 2400
var food := 11200
var agri := 400
var comm := 360

var roster: Array = [RealmOfficerPool.STARTING_OFFICER]
var found: Array = []               # 수색으로 찾아냈지만 아직 등용 전
var _done_this_month: Dictionary = {}  # officer_id -> bool

var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	_rng.seed = RNG_SEED


## 명령을 실행한다 — rtk.js order()의 성 하나짜리 축약.
## 반환: {"ok": bool, "why": String}(실패) 또는
##       {"ok": true, "officer": String, "amount": int, "crit": bool}(개간/상업) /
##       {"ok": true, "found": String}(수색, 빈 문자열이면 "더 찾을 사람 없음") /
##       {"ok": true, "hired": String, "chance": float}(등용, 빈 문자열이면 거절)
func execute_order(key: String) -> Dictionary:
	var o := RealmOrders.by_key(key)
	if o.is_empty():
		return {"ok": false, "why": "없는 명령"}
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
	return _do_devel(key, o, officer_id)


func _do_devel(key: String, o: Dictionary, officer_id: String) -> Dictionary:
	var h = Characters.find(officer_id)
	var stat_val: float = float(h.stats.get(String(o.stat), 0))
	var crit := _rng.randf() < clampf(stat_val / 400.0, 0.03, 0.28)
	var amount := roundi((float(o.base) + stat_val * float(o.per)) * (1.5 if crit else 1.0))

	var before: int
	if key == "agri":
		before = agri
		agri = mini(RealmOrders.CAP_AGRI, agri + amount)
		amount = agri - before
	else:
		before = comm
		comm = mini(RealmOrders.CAP_COMM, comm + amount)
		amount = comm - before

	return {"ok": true, "officer": officer_id, "amount": amount, "crit": crit}


## rtk.js doSearch() — 재야 후보를 rarity 내림차순으로 보고, 지력이 높을수록
## "뻗치는 범위"(reach)가 넓어져 더 귀한 사람도 뽑힐 수 있다.
func _do_search(officer_id: String) -> Dictionary:
	var hidden: Array = []
	for id: String in RealmOfficerPool.HIDDEN_POOL:
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


## rtk.js settleMonth()+endMonth()의 성 하나짜리 축약 — 세력 금고 정산
## (수입-봉급) → 수확달(6·10월)에만 군량 정산 → 달을 올리고 명령표를 비운다.
func next_month() -> void:
	var gov_id := _governor()
	var mul := 1.0
	if not gov_id.is_empty():
		var h = Characters.find(gov_id)
		mul = RealmOrders.gov_mul(float(h.stats.get("wisdom", 0)), float(h.stats.get("command", 0)))

	var income := RealmOrders.gold_income(comm, mul)
	var upkeep := roster.size() * RealmOrders.UPKEEP_PER_OFFICER
	gold = maxi(0, gold + income - upkeep)

	if month in RealmOrders.HARVEST_MONTHS:
		food += RealmOrders.food_income(agri, mul)

	month += 1
	if month > 12:
		month = 1
		year += 1
	_done_this_month.clear()


## rtk.js "태수는 그 성의 으뜸 무장"(지력*0.6+통솔*0.4 최댓값) — 로스터가
## 바뀔 때마다(등용) 다시 매길 뿐, 따로 저장하지 않는다.
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
		"gold": gold, "food": food,
		"agri": agri, "comm": comm,
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
	gold = int(data.get("gold", 2400))
	food = int(data.get("food", 11200))
	agri = int(data.get("agri", 400))
	comm = int(data.get("comm", 360))
	roster = data.get("roster", [RealmOfficerPool.STARTING_OFFICER])
	found = data.get("found", [])
	_done_this_month.clear()
	return true
