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
	"crystal_wind": {"name": "풍 결정"},
	"crystal_ice": {"name": "빙 결정"},
	"crystal_rock": {"name": "암 결정"},
	"crystal_grass": {"name": "초 결정"},
	"wolf_fang": {"name": "늑대 송곳니"},
	"bandit_badge": {"name": "도적 휘장"},
	"talent_1": {"name": "무예 쪽지"},
	"talent_2": {"name": "무예 교본"},
	"talent_3": {"name": "무예 비전"},
	"fate_knot": {"name": "인연 매듭"},
	## 106장 ⑯ 무기 — 강화석(무기 경험 400·2000·10000)·무쇠 조각(무기 돌파).
	"ore_s": {"name": "강화석 조각"},
	"ore_m": {"name": "강화석"},
	"ore_l": {"name": "정련 강화석"},
	"iron": {"name": "무쇠 조각"},
	"polish": {"name": "연마석"}, # 106장 ⑰ 성유물 강화(경험 2500)
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
	"bandit": {"mora": 60, "bandit_badge": 1, "iron": 1},
	"fire_imp": {"mora": 90, "crystal_fire": 1, "book_s": 1, "talent_1": 1, "ore_s": 1},
	"water_turtle": {"mora": 90, "crystal_water": 1, "book_s": 1, "talent_1": 1, "ore_s": 1},
	"thunder_cat": {"mora": 90, "crystal_thunder": 1, "book_s": 1, "talent_1": 1, "ore_s": 1},
	"wind_hawk": {"mora": 90, "crystal_wind": 1, "book_s": 1, "talent_1": 1, "ore_s": 1},
	"ice_fox": {"mora": 90, "crystal_ice": 1, "book_s": 1, "talent_1": 1, "ore_s": 1},
	"rock_bear": {"mora": 90, "crystal_rock": 1, "book_s": 1, "talent_1": 1, "ore_s": 1},
	"grass_snake": {"mora": 90, "crystal_grass": 1, "book_s": 1, "talent_1": 1, "ore_s": 1},
}

## 보물 상자 등급마다(treasure_chest.open). 진귀·화려는 원소 일곱 결정을 다(풍·빙·암·초는 106장 ⑮ 괴물도 떨군다).
const CHEST_LOOT := {
	"common": {"mora": 300, "book_s": 1, "talent_1": 1, "ore_s": 2},
	"exquisite": {"mora": 800, "book_s": 3, "talent_1": 2, "ore_m": 1, "iron": 2},
	"precious": {"mora": 1500, "book_m": 2, "crystal_fire": 1, "crystal_water": 1, "crystal_thunder": 1, "crystal_wind": 1, "crystal_ice": 1, "crystal_rock": 1, "crystal_grass": 1, "talent_2": 2, "fate_knot": 1, "ore_m": 3, "iron": 3},
	"luxurious": {"mora": 3000, "book_m": 3, "book_l": 1, "crystal_fire": 2, "crystal_water": 2, "crystal_thunder": 2, "crystal_wind": 2, "crystal_ice": 2, "crystal_rock": 2, "crystal_grass": 2, "talent_2": 3, "talent_3": 1, "fate_knot": 2, "ore_l": 1, "ore_m": 3, "iron": 5},
}

## ---------------------------------------------------------------- 특성·운명의 자리(106장 ⑫)
## 특성 셋 — 기본 공격(3타·강공격·낙하)·원소 스킬·원소 폭발. 레벨 1~10, 돌파 단계가 상한을 연다
## (돌파 0~1 → 1 · 2 → 2 · 3 → 4 · 4 → 6 · 5 → 8 · 6 → 10, 원신과 같은 계단). 운명의 자리 3·5 가 스킬·폭발에
## +3(최대 13). 레벨마다 그 특성 피해 배율 TALENT_MUL. 올리는 값: 냥 + 무예 책(쪽지 → 교본 → 비전) + 돌파 전리품.
## 주간 보스 재료(원신 7→8 부터)는 주간 보스 갈래가 생길 때 붙인다.
const TALENTS := ["normal", "skill", "burst"]
const TALENT_NAMES := {"normal": "기본 공격", "skill": "원소 스킬", "burst": "원소 폭발"}
const TALENT_MAX := 10
const TALENT_BONUS := 3
const TALENT_CAP_BY_ASC := [1, 1, 2, 4, 6, 8, 10]
const TALENT_MUL := [1.0, 1.075, 1.15, 1.25, 1.325, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.125]
## 레벨 n → n+1 에 드는 것(n = 1~9).
const TALENT_COST := [
	{"mora": 2500, "book": "talent_1", "books": 3, "common": 3},
	{"mora": 3500, "book": "talent_2", "books": 2, "common": 4},
	{"mora": 5000, "book": "talent_2", "books": 4, "common": 6},
	{"mora": 6000, "book": "talent_2", "books": 6, "common": 8},
	{"mora": 7500, "book": "talent_2", "books": 9, "common": 10},
	{"mora": 24000, "book": "talent_3", "books": 4, "common": 12},
	{"mora": 52000, "book": "talent_3", "books": 6, "common": 15},
	{"mora": 90000, "book": "talent_3", "books": 12, "common": 18},
	{"mora": 140000, "book": "talent_3", "books": 16, "common": 22},
]

## 운명의 자리 0~6 — 같은 인물을 두 번 등용하는 대신 인연 매듭 하나로 한 자리씩 연다(인물 가리지 않는 재료:
## 진귀·화려 상자, 신상 Lv). 자리마다 효과가 정해져 있다(인물마다 다르게 짜는 건 인물 수가 105라 나중).
const CONSTELLATION_MAX := 6
const CONSTELLATION_COST := {"fate_knot": 1}
const C1_SKILL_CD_MUL := 0.8
const C2_REACTION_MUL := 1.15
const C4_HP_MUL := 1.2
const C6_BUFF_SEC := 10.0
const C6_ATK_MUL := 1.25
const CONSTELLATION_TEXT := [
	"원소 스킬 재사용 대기 -20%",
	"원소 반응 피해 +15%",
	"원소 스킬 특성 +3",
	"최대 체력 +20%",
	"원소 폭발 특성 +3",
	"원소 폭발 뒤 10초 공격 +25%",
]

static func talent_cap(asc: int) -> int:
	return TALENT_CAP_BY_ASC[clampi(asc, 0, MAX_ASC)]

static func talent_mul(level: int) -> float:
	return TALENT_MUL[clampi(level, 1, TALENT_MUL.size()) - 1]

## 특성 레벨 lv 에서 하나 올릴 때 드는 것 {item: 수}. 10 이면 빈 사전.
static func talent_cost(member_id: String, lv: int) -> Dictionary:
	if lv < 1 or lv >= TALENT_MAX:
		return {}
	var c: Dictionary = TALENT_COST[lv - 1]
	var out := {"mora": c.mora, c.book: c.books}
	out[common_of(member_id)] = c.common
	return out

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
