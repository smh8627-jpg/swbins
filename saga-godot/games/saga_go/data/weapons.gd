extends RefCounted

## PLAN 106장 ⑯ — 원신식 무기(표·계산만, 상태는 PartyState.weapons·equip).
##   종류 다섯: 한손검·양손검·장병기·법구·활 — 인물마다 id 해시로 하나(주인공 = 한손검). 종류마다 기본 공격
##   모양이 다르다(field_combat.gd WEAPON_KIT). 무기는 그 종류 인물만 든다.
##   무기 = 기본 공격력 + 부옵션 하나 + 효과 하나(재련 1~5 로 세짐). 레벨 1~90·돌파 0~6(상한 계단은 인물과 같다).
##   공격력 배율 1 + 0.12×(Lv-1) + 0.3×돌파, 부옵션 배율 1 + 0.04×(Lv-1).
##   수련용(★1)은 종류마다 하나씩 처음부터 있고 여럿이 같이 든다. ★3·★4 는 한 자루씩 — 같은 걸 또 얻으면 재련 +1.
## 이름·수치는 이 판 것(원작 무기 이름을 옮기지 않는다).

const Growth := preload("res://games/saga_go/data/growth.gd")
const Story := preload("res://games/saga_go/data/story.gd")

const TYPES := ["sword", "claymore", "polearm", "catalyst", "bow"]
const TYPE_NAMES := {"sword": "한손검", "claymore": "양손검", "polearm": "장병기", "catalyst": "법구", "bow": "활"}

## 부옵션·효과 이름. 부옵션 값은 비율(0.077 = 7.7%).
const STAT_NAMES := {"atk_pct": "공격력", "crit_rate": "치명타 확률", "crit_dmg": "치명타 피해", "energy": "기력 획득", "hp_pct": "체력"}
const PASSIVE_NAMES := {"normal": "기본 공격 피해", "skill": "원소 스킬 피해", "burst": "원소 폭발 피해", "reaction": "원소 반응 피해"}

## id → {name, type, rarity, atk(Lv1), sub, sub_value(Lv1), passive, passive_value(재련 1)}
const WEAPONS := {
	"w_sword_0": {"name": "수련용 목검", "type": "sword", "rarity": 1, "atk": 23.0},
	"w_claymore_0": {"name": "수련용 목도", "type": "claymore", "rarity": 1, "atk": 23.0},
	"w_polearm_0": {"name": "수련용 장대", "type": "polearm", "rarity": 1, "atk": 23.0},
	"w_catalyst_0": {"name": "수련용 서첩", "type": "catalyst", "rarity": 1, "atk": 23.0},
	"w_bow_0": {"name": "수련용 단궁", "type": "bow", "rarity": 1, "atk": 23.0},
	"w_sword_3": {"name": "청동 환도", "type": "sword", "rarity": 3, "atk": 39.0, "sub": "atk_pct", "sub_value": 0.077, "passive": "normal", "passive_value": 0.12},
	"w_claymore_3": {"name": "나무꾼 큰도끼", "type": "claymore", "rarity": 3, "atk": 39.0, "sub": "hp_pct", "sub_value": 0.077, "passive": "burst", "passive_value": 0.12},
	"w_polearm_3": {"name": "대나무 창", "type": "polearm", "rarity": 3, "atk": 40.0, "sub": "crit_dmg", "sub_value": 0.102, "passive": "normal", "passive_value": 0.12},
	"w_catalyst_3": {"name": "해진 서책", "type": "catalyst", "rarity": 3, "atk": 39.0, "sub": "energy", "sub_value": 0.085, "passive": "reaction", "passive_value": 0.12},
	"w_bow_3": {"name": "사냥꾼 활", "type": "bow", "rarity": 3, "atk": 40.0, "sub": "crit_dmg", "sub_value": 0.102, "passive": "normal", "passive_value": 0.12},
	"w_sword_4": {"name": "청하 보검", "type": "sword", "rarity": 4, "atk": 44.0, "sub": "crit_rate", "sub_value": 0.04, "passive": "skill", "passive_value": 0.16},
	"w_claymore_4": {"name": "파도 참마도", "type": "claymore", "rarity": 4, "atk": 42.0, "sub": "atk_pct", "sub_value": 0.09, "passive": "reaction", "passive_value": 0.2},
	"w_polearm_4": {"name": "봉수 월도", "type": "polearm", "rarity": 4, "atk": 44.0, "sub": "energy", "sub_value": 0.067, "passive": "burst", "passive_value": 0.16},
	"w_catalyst_4": {"name": "별자리 두루마리", "type": "catalyst", "rarity": 4, "atk": 42.0, "sub": "atk_pct", "sub_value": 0.09, "passive": "skill", "passive_value": 0.16},
	"w_bow_4": {"name": "갯바람 각궁", "type": "bow", "rarity": 4, "atk": 44.0, "sub": "crit_rate", "sub_value": 0.04, "passive": "burst", "passive_value": 0.16},
	## 106장 ㊷ 낚시 조합에서 물고기로 바꾸는 작살(상자에서는 안 나온다 — chest_weapon 은 w_<종류>_<등급> 만).
	"w_polearm_catch": {"name": "갯바람 작살", "type": "polearm", "rarity": 4, "atk": 42.0, "sub": "energy", "sub_value": 0.1, "passive": "burst", "passive_value": 0.16},
}

const REFINE_MAX := 5
const ATK_PER_LEVEL := 0.12
const ATK_PER_ASC := 0.3
const SUB_PER_LEVEL := 0.04
const MORA_PER_EXP := 0.1 # 경험 10 = 1냥
const EXP_SCALE := 0.6 # 다음 레벨 경험 = 인물 경험표 × 이 값

## 치명타 — 모든 인물 기본 확률 5%·피해 50%(원신과 같다). 부옵션이 더한다.
const BASE_CRIT_RATE := 0.05
const BASE_CRIT_DMG := 0.5

## 무기 경험 재료(강화석) — growth.gd ITEMS 에도 이름이 있다.
const ORES := ["ore_s", "ore_m", "ore_l"]
const ORE_EXP := {"ore_s": 400, "ore_m": 2000, "ore_l": 10000}

## 무기 돌파 n(1~6) — 냥 + 무쇠 조각 + 돌파 전리품(든 인물 것이 아니라 무기 종류마다: 검·창 늑대 송곳니, 나머지 도적 휘장).
const ASCEND_COST := [
	{"mora": 5000, "iron": 2, "common": 2},
	{"mora": 10000, "iron": 4, "common": 5},
	{"mora": 15000, "iron": 6, "common": 8},
	{"mora": 20000, "iron": 8, "common": 12},
	{"mora": 25000, "iron": 12, "common": 15},
	{"mora": 30000, "iron": 16, "common": 20},
]

static func info(wid: String) -> Dictionary:
	return WEAPONS.get(wid, WEAPONS["w_sword_0"])

static func default_of(type_id: String) -> String:
	return "w_%s_0" % type_id

static func is_shared(wid: String) -> bool:
	return int(info(wid).rarity) <= 1

## 인물 id → 무기 종류. id 해시(원소와 다른 씨앗)로 고정 — 주인공은 한손검.
static func type_of(member_id: String) -> String:
	if member_id == "self":
		return "sword"
	if Story.MEMBERS.has(member_id): # 106장 ㉛ 이야기 동료는 표로
		return String(Story.MEMBERS[member_id].weapon)
	var h := 7
	for i in member_id.length():
		h = (h * 37 + member_id.unicode_at(i)) & 0x7fffffff
	return TYPES[h % TYPES.size()]

static func exp_to_next(lv: int) -> int:
	return int(Growth.exp_to_next(lv) * EXP_SCALE)

static func atk_at(wid: String, lv: int, asc: int) -> float:
	return float(info(wid).atk) * (1.0 + ATK_PER_LEVEL * float(lv - 1) + ATK_PER_ASC * float(asc))

static func sub_at(wid: String, lv: int) -> float:
	var w := info(wid)
	return float(w.get("sub_value", 0.0)) * (1.0 + SUB_PER_LEVEL * float(lv - 1))

static func passive_at(wid: String, refine: int) -> float:
	var w := info(wid)
	return float(w.get("passive_value", 0.0)) * (1.0 + 0.25 * float(clampi(refine, 1, REFINE_MAX) - 1))

static func common_of(wid: String) -> String:
	var t: String = info(wid).type
	return "wolf_fang" if t == "sword" or t == "polearm" else "bandit_badge"

static func ascend_cost(wid: String, asc: int) -> Dictionary:
	if asc >= Growth.MAX_ASC:
		return {}
	var c: Dictionary = ASCEND_COST[asc]
	var out := {"mora": c.mora, "iron": c.iron}
	out[common_of(wid)] = c.common
	return out

## 보물 상자에서 나오는 무기 — 진귀 ★3·화려 ★4, 상자 id 해시로 종류를 고른다(늘 같은 상자는 같은 무기).
static func chest_weapon(chest_id: String, grade: String) -> String:
	var rarity := 3 if grade == "precious" else (4 if grade == "luxurious" else 0)
	if rarity == 0:
		return ""
	var h := 0
	for i in chest_id.length():
		h = (h * 31 + chest_id.unicode_at(i)) & 0x7fffffff
	return "w_%s_%d" % [TYPES[h % TYPES.size()], rarity]
