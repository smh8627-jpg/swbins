extends RefCounted
class_name DungeonItems

## "제외" 목록 3번(장비 등급+접사) — 웹판 `saga-dungeon/js/data-item.js`·
## `item.js`의 등급(TIERS)·접사(AFFIXES) 표와 굴림 공식(`roll()`)을 값 하나
## 안 바꾸고 옮겼다. **소켓·부문어(룬워드)·투장(세트)·고유(유니크)·감정
## (미확인)·내구/수리·가방/창고**는 여전히 이 슬라이스 밖이다(그 전부가
## 원래 "제외" 목록 같은 줄에 묶여 있던 것 — 등급+접사만 먼저 뗀다).
##
## BASES는 원본 27종 중 **무기 10종 전부**(갑주·투구·장갑·신발·목걸이·부적·
## 반지는 여전히 뺐다 — 우리 쪽에 아직 방어력·기질 스탯 자체가 없어 걸칠
## 자리가 없다, 장착해도 아무 효과가 안 난다. 새 스탯을 상상해서 채우지
## 않는다). "제외" 목록 6번(직업 5종 전부)에서 무장 넷에 나머지 세 직업
## (궁장·책사·도독·방사)의 무기 여섯을 더했다 — `data-skill.js`의
## `WEAPON_CLASS`(아래 참고) 기준 그대로, 새 무기를 상상하지 않는다.

const TIERS: Array[Dictionary] = [
	{ "key": 0, "name": "상품", "hanja": "常品", "color": "#d0c8b8", "mul": 1.00, "affix": 0, "weight": 100.0 },
	{ "key": 1, "name": "양품", "hanja": "良品", "color": "#6f6fff", "mul": 1.18, "affix": 1, "weight": 52.0 },
	{ "key": 2, "name": "명품", "hanja": "名品", "color": "#ffff64", "mul": 1.40, "affix": 2, "weight": 22.0 },
	{ "key": 3, "name": "보물", "hanja": "寶物", "color": "#00c000", "mul": 1.70, "affix": 3, "weight": 7.0 },
	{ "key": 4, "name": "전설", "hanja": "傳說", "color": "#c7a76c", "mul": 2.15, "affix": 4, "weight": 1.6 },
]

## 무기 10종 전부 — data-item.js BASES 중 slot이 weapon인 것만, 값 그대로.
const BASES: Array[Dictionary] = [
	## 무장(武將) — spear/club/axe/halberd
	{ "key": "w_pyeongon", "slot": "weapon", "name": "편곤", "main": "might", "base": 10.0, "look": "club" },
	{ "key": "w_changj", "slot": "weapon", "name": "장창", "main": "might", "base": 11.0, "look": "spear" },
	{ "key": "w_bugae", "slot": "weapon", "name": "부월", "main": "might", "base": 11.0, "look": "axe" },
	{ "key": "w_geukchang", "slot": "weapon", "name": "극창", "main": "might", "base": 13.0, "look": "halberd" },
	## 궁장(弓將) — bow
	{ "key": "w_gakgung", "slot": "weapon", "name": "각궁", "main": "might", "base": 8.0, "look": "bow" },
	{ "key": "w_cheoltae", "slot": "weapon", "name": "철태궁", "main": "might", "base": 10.0, "look": "bow" },
	## 책사(策士) — fan/brush
	{ "key": "w_seonchae", "slot": "weapon", "name": "선채", "main": "wisdom", "base": 9.0, "look": "fan" },
	{ "key": "w_bilbut", "slot": "weapon", "name": "필묵", "main": "wisdom", "base": 7.0, "look": "brush" },
	## 도독(都督) — sword/guandao
	{ "key": "w_hwando", "slot": "weapon", "name": "환도", "main": "might", "base": 9.0, "look": "sword" },
	{ "key": "w_wolto", "slot": "weapon", "name": "월도", "main": "might", "base": 12.0, "look": "guandao" },
	## 방사(方士) — staff/scroll
	{ "key": "w_jukjang", "slot": "weapon", "name": "죽장", "main": "wisdom", "base": 8.0, "look": "staff" },
	{ "key": "w_byeongseo", "slot": "weapon", "name": "병서", "main": "command", "base": 8.0, "look": "scroll" },
]

## data-skill.js WEAPON_CLASS 그대로 — 장착한 무기의 look이 직업을 정한다
## (원작 그대로, VERTICAL_SLICE_DUNGEON.md 1절). 맨손(look 없음)은 warrior로
## 본다 — melee_attack.gd의 기본 ATK_DAMAGE가 애초에 무장 기준으로 잡힌 값.
const WEAPON_CLASS: Dictionary = {
	"bow": "archer",
	"spear": "warrior", "club": "warrior", "axe": "warrior", "halberd": "warrior",
	"fan": "scholar", "brush": "scholar",
	"sword": "marshal", "guandao": "marshal",
	"staff": "mystic", "scroll": "mystic",
}

## 화면 표기용 — 실제 인물 이름이 아니라 직업 이름이라 원작 상표 회피
## 정책(루트 CLAUDE.md)과 무관하다.
const CLASS_NAMES: Dictionary = {
	"warrior": "무장", "archer": "궁장", "scholar": "책사",
	"marshal": "도독", "mystic": "방사",
}


## 장착 중인 무기(DungeonEquipmentState.weapon)로 현재 직업 key를 정한다.
static func class_key_for_weapon(weapon: Dictionary) -> String:
	if weapon.is_empty():
		return "warrior"
	var b := base_by_key(str(weapon.get("base", "")))
	if b.is_empty():
		return "warrior"
	return str(WEAPON_CLASS.get(b.look, "warrior"))


static func class_name_for_weapon(weapon: Dictionary) -> String:
	return str(CLASS_NAMES.get(class_key_for_weapon(weapon), "무장"))

## data-item.js AFFIXES 13종 전부 — 클래스에 안 맞는(지력·통솔) 것도 값은
## 그대로 굴러 나온다(원작도 아무 등급에나 아무 접사가 붙는다). might/
## all이 아닌 stat(wisdom·command)은 이 슬라이스에 목표 스탯이 없어
## 이름에는 실리지만 수치 효과는 안 붙는다(dungeon_equipment_state.gd
## 참고) — world kind(전역 접사)는 은사와 같은 eff 키 이름(atkPct·hpPct·
## critPct 등)을 그대로 쓴다.
const AFFIXES: Array[Dictionary] = [
	{ "key": "might", "kind": "flat", "stat": "might", "lo": 4.0, "hi": 9.0, "pre": "용맹한", "label": "무력" },
	{ "key": "wisdom", "kind": "flat", "stat": "wisdom", "lo": 4.0, "hi": 9.0, "pre": "지혜로운", "label": "지력" },
	{ "key": "command", "kind": "flat", "stat": "command", "lo": 4.0, "hi": 9.0, "pre": "위엄있는", "label": "통솔" },
	{ "key": "allstat", "kind": "flat", "stat": "all", "lo": 2.0, "hi": 5.0, "pre": "완전한", "label": "전 능력치" },
	{ "key": "mightPct", "kind": "pct", "stat": "might", "lo": 3.0, "hi": 8.0, "pre": "패도의", "label": "무력" },
	{ "key": "wisdomPct", "kind": "pct", "stat": "wisdom", "lo": 3.0, "hi": 8.0, "pre": "현묘한", "label": "지력" },
	{ "key": "allPct", "kind": "pct", "stat": "all", "lo": 2.0, "hi": 6.0, "pre": "천명의", "label": "전 능력치" },
	{ "key": "loot", "kind": "world", "eff": "lootPct", "lo": 4.0, "hi": 11.0, "post": "약탈", "label": "전리품" },
	{ "key": "gold", "kind": "world", "eff": "goldPct", "lo": 4.0, "hi": 12.0, "post": "치부", "label": "금 획득" },
	{ "key": "exp", "kind": "world", "eff": "expPct", "lo": 3.0, "hi": 9.0, "post": "수학", "label": "경험치" },
	{ "key": "atk", "kind": "world", "eff": "atkPct", "lo": 2.0, "hi": 6.0, "post": "전열", "label": "부대 공격력" },
	{ "key": "hp", "kind": "world", "eff": "hpPct", "lo": 2.0, "hi": 7.0, "post": "수성", "label": "부대 체력" },
	{ "key": "find", "kind": "world", "eff": "findPct", "lo": 5.0, "hi": 14.0, "post": "탐색", "label": "좋은 물건 찾기" },
	{ "key": "crit", "kind": "world", "eff": "critPct", "lo": 3.0, "hi": 8.0, "post": "일격", "label": "치명타" },
]


static func base_by_key(k: String) -> Dictionary:
	for b: Dictionary in BASES:
		if b.key == k:
			return b
	return {}


static func affix_by_key(k: String) -> Dictionary:
	for a: Dictionary in AFFIXES:
		if a.key == k:
			return a
	return {}


## rollTier(bias) — findPct 시스템이 없어 bias는 늘 0(웹판 item.js와 같은
## 가중 추첨, 탐색안 보정만 뺐다).
static func roll_tier() -> int:
	var total := 0.0
	var w: Array[float] = []
	for i in range(TIERS.size()):
		w.append(TIERS[i].weight)
		total += w[i]
	var r := randf() * total
	for i in range(w.size()):
		r -= w[i]
		if r <= 0.0:
			return i
	return 0


## item.js::roll(ilvl) — sock/set/uniq/unid는 이 슬라이스 밖이라 뺐다.
static func roll(ilvl: int) -> Dictionary:
	ilvl = maxi(1, ilvl)
	var base: Dictionary = BASES[randi() % BASES.size()]
	var t: int = roll_tier()
	var tier: Dictionary = TIERS[t]

	var aff: Array[Dictionary] = []
	var used: Dictionary = {}
	var guard := 0
	while aff.size() < int(tier.affix) and guard < 40:
		guard += 1
		var a: Dictionary = AFFIXES[randi() % AFFIXES.size()]
		if used.has(a.key):
			continue
		used[a.key] = true
		var span: float = a.hi - a.lo
		var grow: float = (1.0 + ilvl * 0.055) if a.kind == "flat" else (1.0 + ilvl * 0.022)
		var v: float = (a.lo + randf() * span) * tier.mul * grow
		aff.append({"k": a.key, "v": maxf(1.0, roundf(v))})

	return {
		"base": base.key,
		"tier": t,
		"ilvl": ilvl,
		"main": maxf(1.0, roundf(base.base * tier.mul * (1.0 + ilvl * 0.085))),
		"aff": aff,
	}


## item.js::name() — unid/aiName/uniq/set/word 분기는 이 슬라이스에 없어
## 뺐다(늘 "확인된" 상태로 취급, 곧 접사가 이름에 그대로 드러난다).
static func item_name(it: Dictionary) -> String:
	var b := base_by_key(it.base)
	if b.is_empty():
		return "?"
	var pre := ""
	var post := ""
	for a_ref: Dictionary in it.aff:
		var a := affix_by_key(a_ref.k)
		if a.is_empty():
			continue
		if a.get("pre", "") != "" and pre == "":
			pre = a.pre + " "
		elif a.get("post", "") != "" and post == "":
			post = " · " + a.post
	return pre + b.name + post


## item.js::lines() 중 socket/uniq 분기를 뺀 나머지 — 주 능력치 한 줄 +
## 접사 한 줄씩.
static func item_lines(it: Dictionary) -> Array[String]:
	var b := base_by_key(it.base)
	var out: Array[String] = []
	if not b.is_empty():
		out.append(_stat_kor(b.main) + " +%d" % int(it.main))
	for a_ref: Dictionary in it.aff:
		var a := affix_by_key(a_ref.k)
		if a.is_empty():
			continue
		var suffix := "%" if a.kind != "flat" else ""
		out.append(a.label + " +%d%s" % [int(a_ref.v), suffix])
	return out


static func _stat_kor(s: String) -> String:
	match s:
		"might": return "무력"
		"wisdom": return "지력"
		"command": return "통솔"
		_: return s
