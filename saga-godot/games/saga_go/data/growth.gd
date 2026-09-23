extends RefCounted

## PLAN 106장 ⑩ — 원신식 인물 육성 규칙(수치·표만, 상태는 PartyState.growth·bag).
##   레벨 1~90, 돌파 0~6 — 돌파 단계마다 레벨 상한 20·40·50·60·70·80·90(원신과 같은 계단).
##   경험치는 견문록(짧은 1000·보통 5000·두꺼운 20000)으로만 오른다 — 사건·상자 경험치는 옛 부대
##   레벨(모험 등급 자리)로 그대로 간다. 레벨 올리는 값: 경험 5마다 1냥.
##   돌파: 냥 + 그 인물 원소 결정 + 전리품(늑대 송곳니 또는 도적 휘장 — id 해시로 고정).
##   능력치 배율 = 1 + 0.035×(레벨-1) + 0.08×돌파. 공격 60·방어 35 에 곱한다(희귀도·공명·특성은 전투 쪽).
## 이름·수치는 이 판 것(원작 아이템 이름을 옮기지 않는다).

const Elements := preload("res://games/saga_go/combat/elements.gd")

const LEVEL_CAPS := [20, 40, 50, 60, 70, 80, 90]
const MAX_ASC := 6
const BASE_ATK := 60.0
const BASE_DEF := 35.0
const MUL_PER_LEVEL := 0.035
const MUL_PER_ASC := 0.08
const MORA_PER_EXP := 0.2 # 경험 5 = 1냥

const ITEMS := {
	"mora": {"name": "냥"},
	"book_s": {"name": "짧은 견문록", "exp": 1000},
	"book_m": {"name": "견문록", "exp": 5000},
	"book_l": {"name": "두꺼운 견문록", "exp": 20000},
	"crystal_fire": {"name": "화 결정"},
	"crystal_water": {"name": "수 결정"},
	"crystal_thunder": {"name": "뇌 결정"},
	"wolf_fang": {"name": "늑대 송곳니"},
	"bandit_badge": {"name": "도적 휘장"},
}
const BOOKS := ["book_s", "book_m", "book_l"]

## 돌파 단계 n(1~6)으로 올라갈 때 드는 것. 결정은 인물 원소, 전리품은 인물마다.
const ASCEND_COST := [
	{"mora": 5000, "crystal": 1, "common": 3},
	{"mora": 10000, "crystal": 3, "common": 10},
	{"mora": 20000, "crystal": 6, "common": 15},
	{"mora": 30000, "crystal": 9, "common": 20},
	{"mora": 40000, "crystal": 12, "common": 25},
	{"mora": 60000, "crystal": 20, "common": 30},
]

## 들판 적을 쓰러뜨리면(field_enemy._die). 정해진 양 — 운은 없다(점검이 늘 같게).
const KILL_DROPS := {
	"wolf": {"mora": 40, "wolf_fang": 1},
	"bandit": {"mora": 60, "bandit_badge": 1},
	"fire_imp": {"mora": 90, "crystal_fire": 1, "book_s": 1},
	"water_turtle": {"mora": 90, "crystal_water": 1, "book_s": 1},
	"thunder_cat": {"mora": 90, "crystal_thunder": 1, "book_s": 1},
}

## 보물 상자 등급마다(treasure_chest.open). 진귀·화려의 결정 "any" 는 주인공 원소(화)로.
const CHEST_LOOT := {
	"common": {"mora": 300, "book_s": 1},
	"exquisite": {"mora": 800, "book_s": 3},
	"precious": {"mora": 1500, "book_m": 2, "crystal_fire": 1, "crystal_water": 1, "crystal_thunder": 1},
	"luxurious": {"mora": 3000, "book_m": 3, "book_l": 1, "crystal_fire": 2, "crystal_water": 2, "crystal_thunder": 2},
}

static func cap_of(asc: int) -> int:
	return LEVEL_CAPS[clampi(asc, 0, MAX_ASC)]

## 레벨 lv 에서 다음 레벨까지 드는 경험.
static func exp_to_next(lv: int) -> int:
	return 400 + 6 * lv * lv

static func stat_mul(lv: int, asc: int) -> float:
	return 1.0 + MUL_PER_LEVEL * float(lv - 1) + MUL_PER_ASC * float(asc)

static func crystal_of(member_id: String) -> String:
	return "crystal_" + Elements.element_of(member_id)

## 인물마다 돌파 전리품 — 주인공은 늑대 송곳니, 동료는 id 해시로.
static func common_of(member_id: String) -> String:
	if member_id == "self":
		return "wolf_fang"
	var h := 0
	for i in member_id.length():
		h = (h * 17 + member_id.unicode_at(i)) & 0x7fffffff
	return "wolf_fang" if h % 2 == 0 else "bandit_badge"

## 다음 돌파에 드는 것 {item: 수}. 끝까지 돌파했으면 빈 사전.
static func ascend_cost(member_id: String, asc: int) -> Dictionary:
	if asc >= MAX_ASC:
		return {}
	var c: Dictionary = ASCEND_COST[asc]
	return {"mora": c.mora, crystal_of(member_id): c.crystal, common_of(member_id): c.common}

static func item_name(item: String) -> String:
	return ITEMS[item].name if ITEMS.has(item) else item

## 옛 부대 레벨(v2 세이브) → 인물 첫 레벨. 부대 레벨 1 에 인물 2 레벨씩, 첫 상한(20)까지.
static func seed_level(party_level: int) -> int:
	return clampi(1 + party_level * 2, 1, LEVEL_CAPS[0])
