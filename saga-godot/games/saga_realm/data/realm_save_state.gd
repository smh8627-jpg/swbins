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
const RealmWar := preload("res://games/saga_realm/data/realm_war.gd")
const RealmDiplo := preload("res://games/saga_realm/data/realm_diplo.gd")
const RealmQuizData := preload("res://games/saga_realm/data/realm_quiz_data.gd")

const SAVE_PATH := "user://save_realm.json"
const SAVE_VERSION := 9  # 1(성 하나) → 2(성 여러 곳) → 3(officer_city) → 4(enemies) → 5(diplomacy) → 6(정복 성 편입) → 7(충성·계략) → 8(문답) → 9(이간·매수)
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
## **2026-09-12 추가 — 무장 충성(loyal).** officer_id -> int(0~100).
## `_ready()`가 시작 무장을, `_do_hire()`가 새로 합류한 무장을 `RealmDiplo.
## base_loyal()`로 채운다. `next_month()`가 매달 12 이하인 사람을 35%
## 확률로 이탈시킨다(officer.js checkDefection() 그대로) — 이 슬라이스엔
## 아직 충성을 깎는 수단(이간)이 없어 실전에서 잘 안 터지는 안전망이지만,
## 값과 문(door)은 이걸로 열어 둔다.
var officer_loyal: Dictionary = {RealmOfficerPool.STARTING_OFFICER: RealmDiplo.base_loyal(RealmOfficerPool.STARTING_OFFICER)}
var _done_this_month: Dictionary = {}  # officer_id -> bool

## **2026-09-12 추가 — 적 목표(realm_war.gd 첫 전투 슬라이스).**
## enemy_id -> {troops, wall, max_wall, train, tech, captured}. _init_enemies()
## 가 RealmCities.ENEMY_CITIES 기본값으로 채운다(try_load()가 있으면 그
## 값으로 덮어쓴다) — cities와 같은 패턴. next_month()는 이 값을 안 건드린다
## (적 AI가 없어 매달 그대로다 — attack()으로 싸울 때만 바뀐다).
var enemies: Dictionary = {}

## **2026-09-12 추가 — 이간·매수(적 수비 무장의 충성).** officer_id ->
## int(0~100). `officer_loyal`과 같은 모양이지만 남의 로스터라 따로
## 둔다(우리 쪽 `_check_defection()`이 실수로 적 무장을 훑지 않도록).
## `_init_enemies()`가 `ENEMY_CITIES[].officers`마다 `RealmDiplo.
## base_loyal(id, 그 성 lord)`로 채운다. 매수·이간으로 빠져나가면
## (`enemies[eid].officers`에서 지워질 때) 여기서도 같이 지운다.
var enemy_officer_loyal: Dictionary = {}

## **2026-09-12 추가 — 외교(realm_diplo.gd).** force_id("bei") -> {relation,
## truce_months}. diplo.js relKey()가 세력 둘을 한 쌍으로 묶는 것과 달리
## 이 슬라이스는 상대가 하나뿐이라 force_id 하나로 바로 찾는다. 화친 중
## (truce_months>0)이면 attack()이 막힌다(war.js canMarch()의 `diplo.
## blocked()` 체크와 같은 자리). next_month()가 매달 truce_months를
## 하나씩 깎는다(diplo.js monthly()).
var diplomacy: Dictionary = {}

## **2026-09-12 추가 — 문답(quiz.js, "1,2,3 순서대로 다해" 세 번째).**
## quiz.js `qstate()`와 같은 모양 — learned(id→true)·wrongs(id→틀린
## 횟수)·total·correct·streak·best_streak·lore(학식, `LORE_PER_FIND`가
## 차면 `_reveal_free()`로 재야 하나가 저절로 드러난다). feat/fame/scroll
## 은 이 슬라이스에 그 축 자체가 없어(REALM엔 player.fame 같은 게 없다)
## 뺐다 — 첫 정답 보상은 세력 금고(gold)와 학식뿐이다(`quiz_answer()`
## 참고).
var quiz: Dictionary = {}

var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	_rng.seed = RNG_SEED
	_init_cities()
	_init_enemies()
	_init_diplomacy()
	_init_quiz()


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


## RealmCities.ENEMY_CITIES 기본값으로 채운다 — _init_cities()와 같은 패턴.
## **2026-09-12 추가 — sec·food.** 계략(유언비어·화계)의 대상 값 — 이전엔
## 전투에만 쓰는 값만 있었다. sec는 `RealmOrders.SEC_START`(우리 성 시작값과
## 같은 기준, 적 태수 정보가 없어 새 값을 안 지어냈다), food는 `_init_cities()`
## 와 같은 공식(`RealmCities.food_start()`).
## **2026-09-12 추가 — officers.** 이간·매수 대상(`realm_diplo.gd` 머리말
## 참고) — 정적 정의(`ENEMY_CITIES[].officers`)를 그대로 복사해 실행 중
## 지워질 수 있는 배열로 든다(`cities`가 정적 시작값을 복사해 실행 중
## 값으로 쓰는 것과 같은 패턴). `enemy_officer_loyal`도 여기서 같이 채운다.
func _init_enemies() -> void:
	for def: Dictionary in RealmCities.ENEMY_CITIES:
		var eid: String = String(def.id)
		var def_officers: Array = (def.get("officers", []) as Array).duplicate()
		enemies[eid] = {
			"troops": int(def.troops_start), "wall": int(def.wall_start),
			"max_wall": int(def.wall_start), "train": int(def.train_start),
			"tech": int(def.tech_start), "captured": false,
			"sec": RealmOrders.SEC_START, "food": RealmCities.food_start(eid),
			"officers": def_officers,
		}
		var lord_id: String = String(def.get("lord", ""))
		for oid: String in def_officers:
			if not enemy_officer_loyal.has(oid):
				enemy_officer_loyal[oid] = RealmDiplo.base_loyal(oid, lord_id)


## ENEMY_CITIES의 force마다 우호 기본값(40)을 채운다 — 세력이 같은
## enemy_id 여럿을 가리켜도(지금은 xiaopei→bei 하나뿐) 세력당 한 번만.
func _init_diplomacy() -> void:
	for def: Dictionary in RealmCities.ENEMY_CITIES:
		var fid: String = String(def.get("force", ""))
		if fid.is_empty() or diplomacy.has(fid):
			continue
		diplomacy[fid] = {"relation": RealmDiplo.DEFAULT_RELATION, "truce_months": 0}


## quiz.js qstate()의 기본값 그대로(best_streak는 camelCase→snake_case만).
func _init_quiz() -> void:
	quiz = {
		"learned": {}, "wrongs": {}, "total": 0, "correct": 0,
		"streak": 0, "best_streak": 0, "lore": 0,
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
	officer_loyal[target_id] = RealmDiplo.base_loyal(target_id)
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

	## diplo.js monthly() — 화친이 달마다 한 달씩 닳는다. 0에서 멈춘다(원작은
	## 다 닳으면 키 자체를 지우는데, 이 슬라이스는 항상 값이 있는 Dictionary로
	## 두는 쪽이 `attack()`의 `dip.get("truce_months",0)` 체크와 더 맞는다).
	for force_id: String in diplomacy.keys():
		var dip: Dictionary = diplomacy[force_id]
		dip.truce_months = maxi(0, int(dip.truce_months) - 1)

	_check_defection()

	month += 1
	if month > 12:
		month = 1
		year += 1
	_done_this_month.clear()


## officer.js checkDefection() — 충성이 12 이하면 35% 확률로 스스로
## 떠난다. 원작은 떠난 사람을 그 성의 재야(found)로 되돌리는데, 이
## 슬라이스는 그 경로를 안 옮겼다(re-hire 창구를 새로 여는 셈이라
## 스코프가 는다) — 로스터·배치·충성 기록에서 조용히 지운다.
func _check_defection() -> void:
	var leaving: Array = []
	for id: String in roster:
		if int(officer_loyal.get(id, 50)) > RealmDiplo.DEFECT_LOYAL_FLOOR:
			continue
		if _rng.randf() > RealmDiplo.DEFECT_CHANCE:
			continue
		leaving.append(id)
	for id: String in leaving:
		roster.erase(id)
		officer_city.erase(id)
		officer_loyal.erase(id)


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


## war.js march()+fight()+finishMarch()를 좁혀 옮긴 것(2026-09-12, "전쟁
## 외교 이어해") — `realm_war.gd`가 판정 자체(armyPower/stepRound/fight)를
## 맡고, 여기는 원작 setupMarch()/finishMarch()가 하던 "출진 준비 → 판정
## 호출 → 뒤처리"만 좁혀서 한다. **재해석**:
## - 수량 선택 UI가 없다 — `from_city`에 있는 **전군**을 보낸다(이 판
##   다른 명령들처럼 버튼 하나로 결과만 보는 것과 같은 결).
## - 원정 준비(setupMarch)의 구원군(reinforce)·개입형 진행(marchInteractive)
##   은 안 옮겼다 — 적이 하나뿐이고 이웃 성도 없어 구원군 자체가 없다.
## - 승부가 안 갈리면(stalemate) 원작은 진(camp)을 쳐 다음 달로 넘기는데,
##   이 슬라이스엔 진영 시스템이 없어(realm_war.gd 머리말 참고) **routed와
##   같이 취급** — 살아남은 병력이 그냥 돌아간다.
## - 이기면(capture) 원작의 관리 인계(무장 배치·태수·치안 반토막 등)는
##   옮기지 않았다 — 이 슬라이스는 아직 정복한 성을 플레이 가능한 성으로
##   안 들인다(다음에 볼 자리, `captured` 깃발만 세운다).
func attack(enemy_id: String) -> Dictionary:
	var enemy_def := RealmCities.enemy_by_id(enemy_id)
	if enemy_def.is_empty():
		return {"ok": false, "why": "없는 목표"}
	var e: Dictionary = enemies.get(enemy_id, {})
	if bool(e.get("captured", false)):
		return {"ok": false, "why": "이미 함락한 성입니다"}
	## war.js canMarch() "diplo.blocked()" 체크와 같은 자리 — 화친 중이면
	## 못 친다(2026-09-12 외교 슬라이스, `realm_diplo.gd` 머리말 참고).
	var force_id: String = String(enemy_def.get("force", ""))
	var dip: Dictionary = diplomacy.get(force_id, {})
	if int(dip.get("truce_months", 0)) > 0:
		return {"ok": false, "why": "맹약이 있어 칠 수 없습니다"}

	var from_city: String = String(enemy_def.get("from_city", ""))
	if not cities.has(from_city):
		return {"ok": false, "why": "없는 출진 성"}
	var c: Dictionary = cities[from_city]
	var troops: int = int(c.troops)
	if troops < 500:
		return {"ok": false, "why": "오백은 넘겨야 군대라 하지요"}  # war.js canMarch()와 같은 문구

	var officer_id := _best_officer_for("might", from_city)
	if officer_id.is_empty():
		return {"ok": false, "why": "데려갈 장수가 없습니다"}
	if _done_this_month.get(officer_id, false):
		return {"ok": false, "why": "이 달에 이미 명령을 썼습니다"}

	## war.js canMarch() "원정 군량 — 병력의 한 달치는 들고 가야 한다"(×2).
	var need := RealmOrders.food_upkeep(troops) * 2
	if int(c.food) < need:
		return {"ok": false, "why": "군량이 모자랍니다"}

	c.troops = 0
	c.food = int(c.food) - need

	var h = Characters.find(officer_id)
	var atk := {
		"troops": troops, "start": troops, "train": int(c.train), "tech": int(c.tech),
		"best_command": float(h.stats.get("command", 0)), "best_might": float(h.stats.get("might", 0)),
		"officer_count": 1,
	}
	## **2026-09-12 갱신 — 이간·매수로 이름 있는 수비 무장이 생겼다.**
	## `e.officers`(비면 예전처럼 0)를 그대로 반영한다 — 매수·이간으로
	## 미리 빼내면 그만큼 수비가 약해진다(officer_count·best_command·
	## best_might가 실제로 준다).
	var def_officers: Array = e.get("officers", [])
	var def_best_command := 0.0
	var def_best_might := 0.0
	for oid: String in def_officers:
		var dh = Characters.find(oid)
		if dh == null:
			continue
		def_best_command = maxf(def_best_command, float(dh.stats.get("command", 0)))
		def_best_might = maxf(def_best_might, float(dh.stats.get("might", 0)))
	var def_army := {
		"troops": int(e.troops), "start": int(e.troops), "train": int(e.train), "tech": int(e.tech),
		"best_command": def_best_command, "best_might": def_best_might, "officer_count": def_officers.size(),
	}
	var wall := {"wall": int(e.wall), "max_wall": int(e.max_wall)}
	var land: String = String(enemy_def.get("land", "plain"))

	var rep := RealmWar.fight(atk, def_army, wall, RealmCities.land_def(land), RealmCities.land_siege(land), _rng)
	_done_this_month[officer_id] = true

	e.wall = wall.wall
	if rep.won:
		e.captured = true
		e.troops = 0
		## war.js capture() "사로잡힌다" — 소패는 몸 붙일 이웃 성이 없어
		## (refuge 없음, `bei`가 소패 하나뿐) 원작에서도 전부 사로잡히는
		## 경로만 탄다. 사로잡힌 무장은 그 성(이제 우리 성)의 재야가
		## 된다(`off.rec(id).found=true`와 같은 결) — 매수·이간으로 미리
		## 빼낸 이는 이미 e.officers에서 빠져 여기 안 걸린다.
		for oid: String in (def_officers as Array).duplicate():
			if not (oid in found) and not (oid in roster):
				found.append(oid)
			enemy_officer_loyal.erase(oid)
		e.officers = []
		_annex_city(enemy_id, enemy_def, int(rep.atk_troops_left), int(c.train))
	else:
		## war.js finishMarch() routed 분기 — 치중(baggage)은 need에서 이 달
		## 먹은 몫(food_upkeep(troops), 정확히 need의 절반)을 뺀 나머지다.
		var baggage := RealmOrders.food_upkeep(troops)
		c.troops = int(c.troops) + int(rep.atk_troops_left)
		c.food = int(c.food) + baggage
		e.troops = int(rep.def_troops_left)
	enemies[enemy_id] = e

	return {
		"ok": true, "won": rep.won, "routed": rep.routed, "sortie": rep.sortie,
		"loss_a": rep.loss_a, "loss_d": rep.loss_d,
		"wall_from": rep.wall_from, "wall_to": rep.wall_to,
	}


## war.js capture()를 좁혀 옮긴 것(2026-09-12, "1,2,3 순서대로 다해" —
## 3·4절이 "함락 뒤처리" 통째로 미뤄 둔 나머지 절반). attack()이 이겼을
## 때만 부른다. **2026-09-12 갱신 — 사로잡힌 수비 무장.** 이간·매수
## 슬라이스가 소패에 이름 있는 수비 무장(sg_guanyu·sg_zhangfei)을
## 들이면서, 그때까지 안 빠져나간 이들을 위(`attack()`)에서 `found[]`로
## 옮기는 것까지 옮겼다(war.js capture()의 caught 분기 — 소패는 몸 붙일
## 이웃 성이 없어 fled 분기는 원작에서도 안 탄다). **보스전 보상은
## 여전히 안 옮겼다** — `def.officers`에 `boss:true`인 사람이 없다(이
## 슬라이스가 들인 둘은 보스가 아니다). 세력 멸망 판정도 안 옮겼다 —
## `bei`가 소패 하나만 들고 있다는 걸 `enemies` Dictionary가 몰라(정적
## 수치일 뿐 성 목록을 세력별로 묶지 않는다), "세력의 마지막 성을
## 뺏었는가"를 새로 판정하는 대신 다음에 볼 자리로 남긴다.
## **옮긴 부분**: `to.force`(정복 자체) · `to.troops = atk.troops`(살아남은
## 원정군이 그대로 수비대가 된다) · `to.train = atk.train`(원정군의
## 훈련도를 물려받는다) · `to.sec = max(10, round(그 성 sec*0.5))`("갓
## 뺏은 성은 어수선하다" — 이 성은 sec 기록이 없던 적 성이라 기준값을
## `RealmOrders.SEC_START`로 삼는다) 전부 war.js 원문 그대로. `agri`·
## `comm`·`pop`은 `ENEMY_CITIES`에 새로 들인 `*_start`(data-city.js
## 원문)로 채우고, `food`·`ships`는 `_init_cities()`가 새 성에 쓰는
## 것과 같은 공식(`RealmCities.food_start()`/`ships_start()`)을 그대로
## 쓴다 — 새 성이 늘 때와 같은 절차라 특수 케이스를 안 만든다.
func _annex_city(city_id: String, enemy_def: Dictionary, garrison: int, train_val: int) -> void:
	cities[city_id] = {
		"agri": int(enemy_def.get("agri_start", 0)), "comm": int(enemy_def.get("comm_start", 0)),
		"sec": maxi(10, roundi(float(RealmOrders.SEC_START) * 0.5)),
		"tech": int(enemies[city_id].tech),
		"wall": int(enemies[city_id].wall), "train": train_val,
		"pop": int(enemy_def.get("pop_start", 0)), "troops": garrison,
		"food": RealmCities.food_start(city_id),
		"ships": RealmCities.ships_start(city_id),
	}


const ENVOY_GOLD := 300     # diplo.js envoy()의 "gold" 매개변수 — 수량 선택
                             # UI가 없어 고정값(전임·전군출진과 같은 결)
const ENVOY_FEE := RealmDiplo.ENVOY_FEE
const TRIBUTE_GOLD := 600   # 조공에 실어 보내는 금 — 위와 같은 이유로 고정


## diplo.js envoy(kind==='truce') — 사자(지력 으뜸 무장, 위치 무관 — 로스터
## 전체에서 고른다, 원작도 성 소속을 안 따진다)를 보내 정전을 청한다.
## 성공하면 `RealmDiplo.TRUCE_MONTHS`간 `attack()`이 막힌다.
func envoy_truce(enemy_id: String) -> Dictionary:
	var enemy_def := RealmCities.enemy_by_id(enemy_id)
	if enemy_def.is_empty():
		return {"ok": false, "why": "없는 상대"}
	var force_id: String = String(enemy_def.get("force", ""))
	var cost := ENVOY_GOLD + ENVOY_FEE
	if gold < cost:
		return {"ok": false, "why": "금이 모자랍니다"}

	var officer_id := _best_officer_for("wisdom")
	if officer_id.is_empty():
		return {"ok": false, "why": "보낼 사자가 없습니다"}
	if _done_this_month.get(officer_id, false):
		return {"ok": false, "why": "이 달에 이미 명령을 썼습니다"}

	gold -= cost
	_done_this_month[officer_id] = true

	var dip: Dictionary = diplomacy.get(force_id, {"relation": RealmDiplo.DEFAULT_RELATION, "truce_months": 0})
	var h = Characters.find(officer_id)
	var chance := RealmDiplo.truce_chance(float(h.stats.get("wisdom", 0)), int(dip.relation), ENVOY_GOLD)

	var accepted := _rng.randf() <= chance
	if accepted:
		dip.truce_months = RealmDiplo.TRUCE_MONTHS
		dip.relation = RealmDiplo.clamp_relation(int(dip.relation) + RealmDiplo.TRUCE_SUCCESS_BONUS)
	else:
		dip.relation = RealmDiplo.clamp_relation(int(dip.relation) + RealmDiplo.TRUCE_FAIL_BONUS)
	diplomacy[force_id] = dip

	return {"ok": true, "accepted": accepted, "chance": chance, "relation": int(dip.relation)}


## diplo.js envoy(kind==='tribute') — 굴림 없이 확정으로 우호를 올린다.
func envoy_tribute(enemy_id: String) -> Dictionary:
	var enemy_def := RealmCities.enemy_by_id(enemy_id)
	if enemy_def.is_empty():
		return {"ok": false, "why": "없는 상대"}
	var force_id: String = String(enemy_def.get("force", ""))
	var cost := TRIBUTE_GOLD + ENVOY_FEE
	if gold < cost:
		return {"ok": false, "why": "금이 모자랍니다"}

	var officer_id := _best_officer_for("wisdom")
	if officer_id.is_empty():
		return {"ok": false, "why": "보낼 사자가 없습니다"}
	if _done_this_month.get(officer_id, false):
		return {"ok": false, "why": "이 달에 이미 명령을 썼습니다"}

	gold -= cost
	_done_this_month[officer_id] = true

	var dip: Dictionary = diplomacy.get(force_id, {"relation": RealmDiplo.DEFAULT_RELATION, "truce_months": 0})
	var up := RealmDiplo.tribute_up(TRIBUTE_GOLD)
	dip.relation = RealmDiplo.clamp_relation(int(dip.relation) + up)
	diplomacy[force_id] = dip

	return {"ok": true, "up": up, "relation": int(dip.relation)}


## diplo.js plot() — 처음엔 성 자체가 대상인 rumor/fire만 옮겼다가
## (2026-09-12, "1,2,3 순서대로 다해" 두 번째), 이번에 이간(discord)·
## 매수(bribe)를 마저 옮겼다(같은 지시의 세 번째, 이번 절). 화친 체크가
## 없는 것도 원작 그대로(plot()은 `attack()`과 달리 diplo.blocked()를
## 안 본다 — 첩보전은 정식 화친과 별개다).
func plot(kind: String, enemy_id: String) -> Dictionary:
	var chk := _plot_check(kind, enemy_id)
	if not bool(chk.get("ok", false)):
		return chk

	var officer_id: String = chk.officer_id
	var force_id: String = chk.force_id
	var e: Dictionary = chk.e
	var dip: Dictionary = chk.dip
	var chance: float = chk.chance

	gold -= int(RealmDiplo.plot_by_key(kind).gold)
	_done_this_month[officer_id] = true
	dip.relation = RealmDiplo.clamp_relation(int(dip.relation) + RealmDiplo.PLOT_RELATION_HIT)

	if _rng.randf() > chance:
		dip.relation = RealmDiplo.clamp_relation(int(dip.relation) + RealmDiplo.PLOT_FAIL_RELATION_HIT)
		diplomacy[force_id] = dip
		return {"ok": true, "done": false, "chance": chance}

	var result := {"ok": true, "done": true, "chance": chance}
	if kind == "rumor":
		var before_sec := int(e.sec)
		e.sec = maxi(0, before_sec - roundi(RealmDiplo.SEC_HIT_BASE + _rng.randf() * RealmDiplo.SEC_HIT_RANGE))
		result["sec_from"] = before_sec
		result["sec_to"] = int(e.sec)
		enemies[enemy_id] = e
	elif kind == "fire":
		var burned := roundi(float(e.food) * (RealmDiplo.FOOD_BURN_BASE + _rng.randf() * RealmDiplo.FOOD_BURN_RANGE))
		e.food = maxi(0, int(e.food) - burned)
		result["burned"] = burned
		enemies[enemy_id] = e
	elif kind == "discord":
		var target_id: String = String(chk.target_id)
		var before_loyal := int(enemy_officer_loyal.get(target_id, 50))
		var hit := RealmDiplo.DISCORD_HIT_BASE + floori(_rng.randf() * RealmDiplo.DISCORD_HIT_RANGE)
		var after_loyal := clampi(before_loyal - hit, 0, 100)
		enemy_officer_loyal[target_id] = after_loyal
		result["target"] = target_id
		result["loyal_from"] = before_loyal
		result["loyal_to"] = after_loyal
		result["defected"] = false
		## **재해석 — 원작은 월말 checkDefection()이 12 이하를 35% 확률로
		## 몰아낸다. 이 슬라이스는 적 로스터를 매달 훑는 자리가 없어, 이간이
		## 방금 만든 결과에 대해 그 자리에서 같은 굴림을 한 번 돈다.**
		if after_loyal <= RealmDiplo.DEFECT_LOYAL_FLOOR and _rng.randf() <= RealmDiplo.DEFECT_CHANCE:
			(e.officers as Array).erase(target_id)
			enemy_officer_loyal.erase(target_id)
			if not (target_id in found) and not (target_id in roster):
				found.append(target_id)
			result["defected"] = true
			enemies[enemy_id] = e
	elif kind == "bribe":
		var target_id: String = String(chk.target_id)
		(e.officers as Array).erase(target_id)
		enemy_officer_loyal.erase(target_id)
		enemies[enemy_id] = e
		roster.append(target_id)
		officer_city[target_id] = RealmCities.DEFAULT_CITY
		officer_loyal[target_id] = RealmDiplo.BRIBE_LOYAL_SET
		result["target"] = target_id
		result["home_city"] = RealmCities.DEFAULT_CITY

	diplomacy[force_id] = dip
	return result


## `plot()`과 같은 검증·확률 계산을 상태 변경 없이 미리 보여 준다
## ("계략은 성공률을 숨기지 않는다", diplo.js 머리말) — 버튼이 메뉴를
## 띄우기 전에 부른다.
func plot_preview(kind: String, enemy_id: String) -> Dictionary:
	return _plot_check(kind, enemy_id)


## 현재 `enemies[eid].officers` 중 지력 최댓값 — "태수"(guard) 역할.
## 아무도 안 남았으면(다 매수·이간으로 빠지거나 함락 전이라도 애초에
## 없으면) `RealmDiplo.PLOT_GUARD_WISDOM`(30) 기본값으로 돌아간다.
func _enemy_guard_wisdom(enemy_id: String) -> float:
	var e: Dictionary = enemies.get(enemy_id, {})
	var best := -1.0
	for oid: String in (e.get("officers", []) as Array):
		var h = Characters.find(oid)
		if h == null:
			continue
		best = maxf(best, float(h.stats.get("wisdom", 0)))
	return best if best >= 0.0 else float(RealmDiplo.PLOT_GUARD_WISDOM)


## diplo.js plot()의 "targetId 없으면 자동으로 고른다" — 충성이 가장
## 낮은 사람이 가장 잘 흔들린다(cands.sort by loyalOf asc). 군주는
## `ENEMY_CITIES[].officers`에 애초에 안 들어 있어(realm_cities.gd
## 머리말 참고) 따로 걸러낼 필요가 없다.
func _pick_plot_target(enemy_id: String) -> String:
	var e: Dictionary = enemies.get(enemy_id, {})
	var best_id := ""
	var best_loyal := 101
	for oid: String in (e.get("officers", []) as Array):
		var lv: int = int(enemy_officer_loyal.get(oid, 50))
		if lv < best_loyal:
			best_loyal = lv
			best_id = oid
	return best_id


func _plot_check(kind: String, enemy_id: String) -> Dictionary:
	var plot_def := RealmDiplo.plot_by_key(kind)
	if plot_def.is_empty():
		return {"ok": false, "why": "없는 계략"}
	var enemy_def := RealmCities.enemy_by_id(enemy_id)
	if enemy_def.is_empty():
		return {"ok": false, "why": "없는 목표"}
	var e: Dictionary = enemies.get(enemy_id, {})
	if bool(e.get("captured", false)):
		return {"ok": false, "why": "우리 성입니다"}

	## diplo.js touching() — 우리 성 중 하나라도 대상과 맞닿아 있어야 한다.
	var touching := false
	for cid: String in RealmCities.playable_ids():
		if RealmCities.is_adjacent(cid, enemy_id):
			touching = true
			break
	if not touching:
		return {"ok": false, "why": "손이 닿지 않는 성입니다"}

	if gold < int(plot_def.gold):
		return {"ok": false, "why": "금이 모자랍니다"}

	var officer_id := _best_officer_for("wisdom")
	if officer_id.is_empty():
		return {"ok": false, "why": "계략을 쓸 무장이 없습니다"}
	if _done_this_month.get(officer_id, false):
		return {"ok": false, "why": "이 달에 이미 명령을 썼습니다"}

	## 이간·매수는 대상 무장이 있어야 한다 — 없으면(다 빠져나갔거나 원래
	## 없으면) "홀릴 사람이 없습니다"(diplo.js plot() 그대로).
	var target_id := ""
	if kind == "discord" or kind == "bribe":
		target_id = _pick_plot_target(enemy_id)
		if target_id.is_empty():
			return {"ok": false, "why": "홀릴 사람이 없습니다"}

	var force_id: String = String(enemy_def.get("force", ""))
	var dip: Dictionary = diplomacy.get(force_id, {"relation": RealmDiplo.DEFAULT_RELATION, "truce_months": 0})
	var h = Characters.find(officer_id)
	var mine_wisdom := float(h.stats.get("wisdom", 0))
	var guard_wisdom := _enemy_guard_wisdom(enemy_id)
	var sec := int(e.get("sec", 50))

	var chance: float
	match kind:
		"discord":
			var target_loyal := int(enemy_officer_loyal.get(target_id, 50))
			chance = RealmDiplo.discord_chance(mine_wisdom, guard_wisdom, sec, target_loyal)
		"bribe":
			var target_loyal2 := int(enemy_officer_loyal.get(target_id, 50))
			var th = Characters.find(target_id)
			var target_rarity := int(th.rarity) if th != null else 3
			chance = RealmDiplo.bribe_chance(mine_wisdom, guard_wisdom, sec, target_loyal2, target_rarity)
		_:
			chance = RealmDiplo.plot_chance(mine_wisdom, guard_wisdom, sec)

	return {
		"ok": true, "officer_id": officer_id, "force_id": force_id,
		"e": e, "dip": dip, "chance": chance, "target_id": target_id,
	}


## quiz.js draw() — 안 익힌 문제 우선(그 안에서는 쉬운 등급부터), 다
## 익혔으면 틀린 것 위주로 복습. 보기 순서는 낼 때마다 섞는다(_present()).
## 무작위(등급 안에서 고르기·복습 후보 중 고르기·보기 섞기)는 모두
## `_rng`(고정 시드)를 써 헤드리스 검증이 재현 가능하다.
func quiz_draw() -> Dictionary:
	var pool := RealmQuizData.BANK
	if pool.is_empty():
		return {}

	var fresh: Array = []
	for ref: Dictionary in pool:
		if not quiz.learned.has(String(ref.id)):
			fresh.append(ref)

	var chosen: Dictionary
	if not fresh.is_empty():
		var low := 3
		for ref: Dictionary in fresh:
			low = mini(low, RealmQuizData.lv_of(ref))
		var tier: Array = []
		for ref: Dictionary in fresh:
			if RealmQuizData.lv_of(ref) == low:
				tier.append(ref)
		chosen = tier[_rng.randi_range(0, tier.size() - 1)]
	else:
		## 전부 익혔다 — 틀린 횟수 내림차순 정렬 후 상위 1/4(최소 4)에서 고른다.
		var review: Array = pool.duplicate()
		review.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
			return int(quiz.wrongs.get(String(a.id), 0)) > int(quiz.wrongs.get(String(b.id), 0)))
		var top_n := maxi(4, ceili(float(review.size()) / 4.0))
		top_n = mini(top_n, review.size())
		var top: Array = review.slice(0, top_n)
		chosen = top[_rng.randi_range(0, top.size() - 1)]

	return _present(chosen)


## quiz.js present() — 보기 넷을 Fisher-Yates로 섞는다. `order[i]`는
## "i번째로 보여줄 보기가 원래 몇 번(정답 인덱스 기준)이었는가".
func _present(ref: Dictionary) -> Dictionary:
	var order: Array = [0, 1, 2, 3]
	for i in range(order.size() - 1, 0, -1):
		var j := _rng.randi_range(0, i)
		var t: int = order[i]
		order[i] = order[j]
		order[j] = t

	var choices: Array = []
	for idx: int in order:
		choices.append(String(ref.c[idx]))

	var lv := RealmQuizData.lv_of(ref)
	return {
		"id": String(ref.id), "cat": String(ref.cat), "lv": lv,
		"lv_name": String(RealmQuizData.LV_NAME[lv]),
		"q": String(ref.q), "choices": choices, "order": order,
		"review": quiz.learned.has(String(ref.id)),
	}


## quiz.js answer() — `p`는 quiz_draw()가 준 문제, choice_idx는 화면에
## 보인 보기 번호(섞인 순서 기준). **REALM 재해석 — 보상 축소.** 원작
## reward는 feat/fame/scroll까지 주는데, 이 슬라이스엔 그 값 자체가
## 없어(REALM엔 player.fame·items.scroll이 없다) gold(세력 금고, rtk.js
## study()가 하던 일)와 lore→재야 공개만 남겼다.
func quiz_answer(p: Dictionary, choice_idx: int) -> Dictionary:
	var ref := RealmQuizData.by_id(String(p.get("id", "")))
	if ref.is_empty():
		return {"ok": false}

	var qid: String = String(ref.id)
	var order: Array = p.order
	var correct: bool = int(order[choice_idx]) == int(ref.a)
	var first: bool = correct and not quiz.learned.has(qid)
	quiz.total = int(quiz.total) + 1

	var lv := RealmQuizData.lv_of(ref)
	var rw: Dictionary = RealmQuizData.LV_REWARD[lv]
	var reward := {"gold": 0, "lv": lv, "found": ""}

	if correct:
		quiz.correct = int(quiz.correct) + 1
		quiz.streak = int(quiz.streak) + 1
		if int(quiz.wrongs.get(qid, 0)) > 0:
			quiz.wrongs[qid] = maxi(0, int(quiz.wrongs[qid]) - 1)
			if int(quiz.wrongs[qid]) == 0:
				quiz.wrongs.erase(qid)
		if int(quiz.streak) > int(quiz.best_streak):
			quiz.best_streak = quiz.streak

		if first:
			## **2026-09-12 추가 — 서고(learnedList).** 원작은 `Date.now()`로
			## "언제 익혔는지"를 남겨 서고를 최근순으로 보여준다. 이 슬라이스는
			## 그 대신 `quiz.total`(그 시점까지 누적 시도 횟수, 항상 증가)을
			## 쓴다 — 실제 시각을 쓰면 헤드리스 검증의 "세 번 돌려도 같은 결과"
			## 요건이 깨진다(루트 CLAUDE.md 검증 습관). 값 자체는 안 보여주고
			## 정렬(내림차순 = 최근 익힌 순)에만 쓴다.
			quiz.learned[qid] = quiz.total
			reward.gold = int(rw.gold)
			## rtk.js study() — 학식이 LORE_PER_FIND만큼 쌓일 때마다 재야
			## 하나가 저절로 드러난다(수색 없이, 지력 판정도 없이).
			quiz.lore = int(quiz.lore) + maxi(1, lv)
			while int(quiz.lore) >= RealmQuizData.LORE_PER_FIND:
				quiz.lore = int(quiz.lore) - RealmQuizData.LORE_PER_FIND
				var got := _reveal_free()
				if not got.is_empty():
					reward.found = got
		else:
			reward.gold = int(rw.rgold)

		gold += int(reward.gold)
	else:
		quiz.streak = 0
		quiz.wrongs[qid] = int(quiz.wrongs.get(qid, 0)) + 1

	return {
		"ok": true, "correct": correct, "first": first, "why": String(ref.why),
		"answer_text": String(ref.c[int(ref.a)]),
		"lv": lv, "lv_name": String(RealmQuizData.LV_NAME[lv]),
		"streak": int(quiz.streak), "reward": reward,
	}


## rtk.js revealFree() — 우리 성(playable_ids())에 묻힌 재야 중 아직
## 안 드러난(found·roster 어디에도 없는) 사람을 rarity 내림차순으로
## 하나 고른다. `_do_search()`(지력 판정 있음)와 달리 판정이 없다 —
## 원작도 study()가 부를 땐 그냥 가장 귀한 사람을 바로 준다.
func _reveal_free() -> String:
	var pool: Array = []
	for city_id: String in RealmCities.playable_ids():
		for oid: String in RealmOfficerPool.HIDDEN_POOL_BY_CITY.get(city_id, []):
			if oid in found or oid in roster:
				continue
			pool.append(oid)
	if pool.is_empty():
		return ""

	pool.sort_custom(func(a: String, b: String) -> bool:
		return int(Characters.find(a).rarity) > int(Characters.find(b).rarity))
	var got: String = pool[0]
	found.append(got)
	return got


## quiz.js progress() 축약 — 분야·등급별 세부는 quiz_cat_counts()가 맡는다.
func quiz_progress() -> Dictionary:
	return {
		"learned": quiz.learned.size(), "total": RealmQuizData.BANK.size(),
		"answered": int(quiz.total), "correct": int(quiz.correct),
		"streak": int(quiz.streak), "best_streak": int(quiz.best_streak),
	}


## quiz.js learnedList() — 익힌 지식 목록(서고), 최근에 익힌 것부터.
## **2026-09-12 추가("1,2,3 다해줘" 세 번째)** — `quiz.learned[qid]`가
## 이제 `quiz.total`(익힌 시점의 누적 시도 횟수) 값을 담고 있어(위
## `quiz_answer()` 참고) 그 값 내림차순 정렬이 곧 "최근 익힌 순"이다.
## `limit`(기본 20) — `ChoicePrompt.build()`가 choices 수만큼 패널
## 높이를 늘리기만 하고 스크롤이 없어서(games/saga_go/ui/choice_
## prompt.gd), 학습이 쌓여도 화면이 안 넘치게 최근 것만 자른다(전체
## 목록·페이지네이션은 다음에 볼 자리).
func quiz_learned_list(cat_key: String = "", limit: int = 20) -> Array:
	var out: Array = []
	for ref: Dictionary in RealmQuizData.BANK:
		var qid: String = String(ref.id)
		if not quiz.learned.has(qid):
			continue
		if not cat_key.is_empty() and String(ref.cat) != cat_key:
			continue
		out.append({
			"id": qid, "cat": String(ref.cat), "cat_name": RealmQuizData.cat_name(String(ref.cat)),
			"lv": RealmQuizData.lv_of(ref), "lv_name": String(RealmQuizData.LV_NAME[RealmQuizData.lv_of(ref)]),
			"q": String(ref.q), "answer": String(ref.c[int(ref.a)]), "why": String(ref.why),
			"at": int(quiz.learned[qid]),
		})
	out.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		return int(a.at) > int(b.at))
	return out.slice(0, mini(limit, out.size()))


## 서고 "분야 필터" 메뉴(2026-09-12, 서고 UI 확장) — 분야별 학습 현황
## (분야 key·이름·익힌 수·전체 문항 수). 분야당 문항이 최대 15개라
## quiz_learned_list(cat_key)의 기본 limit(20)에 걸릴 일이 없다.
func quiz_cat_counts() -> Array:
	var out: Array = []
	for c: Dictionary in RealmQuizData.CATS:
		var key: String = String(c.key)
		var total := 0
		var learned := 0
		for ref: Dictionary in RealmQuizData.BANK:
			if String(ref.cat) != key:
				continue
			total += 1
			if quiz.learned.has(String(ref.id)):
				learned += 1
		out.append({"key": key, "name": String(c.name), "learned": learned, "total": total})
	return out


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
		"officer_loyal": officer_loyal,
		"enemies": enemies,
		"enemy_officer_loyal": enemy_officer_loyal,
		"diplomacy": diplomacy,
		"quiz": quiz,
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
	var loaded_officer_loyal: Variant = data.get("officer_loyal", {})
	if typeof(loaded_officer_loyal) == TYPE_DICTIONARY and not loaded_officer_loyal.is_empty():
		officer_loyal = loaded_officer_loyal
	var loaded_enemies: Variant = data.get("enemies", {})
	if typeof(loaded_enemies) == TYPE_DICTIONARY and not loaded_enemies.is_empty():
		enemies = loaded_enemies
	var loaded_enemy_officer_loyal: Variant = data.get("enemy_officer_loyal", {})
	if typeof(loaded_enemy_officer_loyal) == TYPE_DICTIONARY and not loaded_enemy_officer_loyal.is_empty():
		enemy_officer_loyal = loaded_enemy_officer_loyal
	var loaded_diplomacy: Variant = data.get("diplomacy", {})
	if typeof(loaded_diplomacy) == TYPE_DICTIONARY and not loaded_diplomacy.is_empty():
		diplomacy = loaded_diplomacy
	var loaded_quiz: Variant = data.get("quiz", {})
	if typeof(loaded_quiz) == TYPE_DICTIONARY and not loaded_quiz.is_empty():
		quiz = loaded_quiz
	_done_this_month.clear()
	return true
