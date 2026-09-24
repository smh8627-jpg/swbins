extends RefCounted

## PLAN 106장 ㉔ — 인물별 고유 스킬(원신은 인물마다 E·Q 가 다르다). 표만 — 쓰는 곳은 combat/field_combat.gd `_kit_skill`·`_kit_burst`.
## 인물이 105 라 대표 다섯부터: 주인공 · 마을·폐허에 서 있는 역사 인물 셋(현책·해장·결사) · 도적 두목(습격 사건 등용).
## 표에 없는 인물은 지금처럼 원소마다 같은 스킬(field_combat 원소 표) — 이름만 ELEMENT_NAMES 로 붙인다.
## 원소·무기는 그대로 id 해시(elements.gd·weapons.gd). 특성 배율·운명의 자리(1 스킬 쿨 -20%)는 고유 스킬에도 똑같이 든다.
##
## 스킬 type: dash(앞으로 돌진하며 지나간 길) · zone(발밑 진 — 인물을 바꿔도 남아 몇 초마다 가까운 적을 친다) ·
##   shells(앞 적 몇에 늦게 떨어지는 포탄) · guard(명단 보호막 + 둘레) · updraft(위로 솟구침 + 둘레 끌어올림 — 활공·낙하로 잇는다)
## 폭발 type(모두 먼저 둘레 radius 에 mul 한 번): infuse(그 인물 기본 공격에 원소 부여) · haste(명단 스킬 재사용이 두 배로 돎 + 다른 인물 기력) ·
##   rally(명단 공격 +) · guard(명단이 받는 피해 -) · vortex(앞 지점에 적을 빨아들이는 소용돌이)
## 이름·수치는 이 판 것(원작 스킬 이름을 옮기지 않는다).

const KITS := {
	"self": {
		"skill": {"name": "불꽃 돌진", "type": "dash", "cd": 6.0, "sec": 0.25, "speed": 18.0, "width": 2.0, "mul": 1.3,
			"text": "앞으로 4.5m 돌진하며 지나간 길의 적을 벤다(돌진 중 무적)"},
		"burst": {"name": "불새 깃", "type": "infuse", "radius": 6.0, "mul": 2.0, "sec": 8.0, "normal_mul": 1.2,
			"text": "둘레 6m 를 태우고, 8초 동안 기본 공격·강공격·낙하 공격이 화 원소(피해 ×1.2)"},
	},
	"sg_zhugeliang": {
		"skill": {"name": "팔괘진", "type": "zone", "cd": 12.0, "radius": 4.5, "sec": 10.0, "tick": 1.5, "targets": 2, "mul": 0.45, "energy": 2.0,
			"text": "발밑에 10초 진 — 1.5초마다 안의 가까운 적 둘에 낙뢰, 맞힐 때마다 명단 기력. 인물을 바꿔도 남는다"},
		"burst": {"name": "천기 뇌우", "type": "haste", "radius": 7.0, "mul": 1.4, "sec": 12.0, "energy": 15.0,
			"text": "둘레 7m 낙뢰, 12초 동안 명단 원소 스킬 재사용이 두 배로 돌고 다른 인물 기력 +15"},
	},
	"kr_yisunsin": {
		"skill": {"name": "일제 포격", "type": "shells", "cd": 7.0, "reach": 12.0, "count": 3, "delay": 0.6, "radius": 2.5, "mul": 1.0,
			"text": "12m 안 적 셋 자리에 0.6초 뒤 포탄(둘레 2.5m) — 적이 없으면 앞 8m 에 하나"},
		"burst": {"name": "학날개 진", "type": "rally", "radius": 8.0, "mul": 1.8, "sec": 10.0, "atk": 1.2,
			"text": "둘레 8m 포화, 10초 동안 명단 공격 +20%"},
	},
	"kr_gyebaek": {
		"skill": {"name": "결사 방진", "type": "guard", "cd": 12.0, "radius": 3.5, "mul": 0.8, "shield": 0.25, "sec": 12.0,
			"text": "둘레 3.5m 를 치고, 명단에 보호막(지금 인물 최대 체력 25%, 12초)"},
		"burst": {"name": "오천의 맹세", "type": "guard", "radius": 7.0, "mul": 1.6, "sec": 10.0, "taken": 0.7,
			"text": "둘레 7m 번개, 10초 동안 명단이 받는 피해 -30%"},
	},
	"도적_두목": {
		"skill": {"name": "회오리 도약", "type": "updraft", "cd": 8.0, "radius": 3.5, "mul": 1.2, "lift": 14.0, "pull": 5.0,
			"text": "둘레 3.5m 적을 끌어 치고 위로 솟구친다 — 그대로 활공하거나 낙하 공격"},
		"burst": {"name": "돌개바람 올가미", "type": "vortex", "radius": 5.0, "mul": 1.0, "ahead": 7.0, "sec": 8.0, "tick": 0.5, "bolt": 0.3, "pull": 6.0,
			"text": "앞 7m 에 8초 소용돌이 — 적을 빨아들이며 0.5초마다 풍(확산)"},
	},
}

## 표에 없는 인물이 쓰는 원소 기본 스킬의 이름(인물 화면 표시).
const ELEMENT_NAMES := {
	"fire": ["불꽃 부채", "불꽃 고리"], "water": ["물결 치유", "치유의 비"], "thunder": ["낙뢰 셋", "뇌운"],
	"wind": ["바람 끌기", "소용돌이"], "ice": ["얼음 부채", "눈보라"], "rock": ["바위 기둥", "바위 방패"], "grass": ["덩굴 가시", "가시덤불"],
}

static func has_kit(id: String) -> bool:
	return KITS.has(id)

static func skill_of(id: String) -> Dictionary:
	return KITS[id].skill if KITS.has(id) else {}

static func burst_of(id: String) -> Dictionary:
	return KITS[id].burst if KITS.has(id) else {}

## "skill"·"burst" 이름(고유가 없으면 원소 기본 이름).
static func name_of(id: String, which: String, element: String) -> String:
	if KITS.has(id):
		return String(KITS[id][which].name)
	var pair: Array = ELEMENT_NAMES.get(element, ["원소 스킬", "원소 폭발"])
	return String(pair[0 if which == "skill" else 1])

static func text_of(id: String, which: String) -> String:
	return String(KITS[id][which].text) if KITS.has(id) else "원소마다 같은 기본 %s" % ("스킬" if which == "skill" else "폭발")
