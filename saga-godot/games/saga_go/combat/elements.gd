extends RefCounted

## PLAN 106장 ③ — 원소 셋과 반응 셋. 원신의 "원소를 겹쳐 반응을 일으킨다" 문법만
## 따르고 이름·수치는 이 판 것으로 정했다(화·수·뇌, 증발·과부하·감전).
##   화+수 → 증발 : 이번 타격 ×1.5, 원소 지움
##   화+뇌 → 과부하: 이번 타격 ×1.2 + 둘레 4m 폭발(기본 피해 ×1.0) + 밀쳐냄
##   수+뇌 → 감전 : 이번 타격 그대로 + 2초 동안 0.5초마다 기본 ×0.3, 둘레 3m 젖은 적에게 번짐
## 적에 남는 원소(부착)는 AURA_SEC 동안 산다. 같은 원소를 또 맞으면 시간만 갱신.

const AURA_SEC := 6.0

const INFO := {
	"fire": {"name": "화", "color": Color(1.0, 0.42, 0.22)},
	"water": {"name": "수", "color": Color(0.25, 0.62, 1.0)},
	"thunder": {"name": "뇌", "color": Color(0.72, 0.42, 1.0)},
}
const ORDER := ["fire", "water", "thunder"]

## 두 원소(순서 무관) → 반응 id. 없으면 "".
static func reaction_of(aura: String, incoming: String) -> String:
	if aura == "" or incoming == "" or aura == incoming:
		return ""
	var pair := [aura, incoming]
	pair.sort()
	match pair:
		["fire", "water"]: return "vaporize"
		["fire", "thunder"]: return "overload"
		["thunder", "water"]: return "electro"
	return ""

const REACTION_INFO := {
	"vaporize": {"name": "증발", "mul": 1.5, "color": Color(1.0, 0.75, 0.35)},
	"overload": {"name": "과부하", "mul": 1.2, "color": Color(1.0, 0.45, 0.7)},
	"electro": {"name": "감전", "mul": 1.0, "color": Color(0.7, 0.6, 1.0)},
}

## PLAN 106장 ⑦ — 원소 방패 상성. 방패 원소 → 그 방패를 빨리 깨는 원소(수>화, 뇌>수, 화>뇌).
## 같은 원소는 방패를 못 긁고(면역), 원소 없는 기본 공격은 SHIELD_PHYSICAL 만큼만.
const SHIELD_COUNTER := {"fire": "water", "water": "thunder", "thunder": "fire"}
const SHIELD_COUNTER_MUL := 2.5
const SHIELD_PHYSICAL := 0.4

static func shield_mul(shield_element: String, incoming: String) -> float:
	if incoming == "":
		return SHIELD_PHYSICAL
	if incoming == shield_element:
		return 0.0
	if SHIELD_COUNTER.get(shield_element, "") == incoming:
		return SHIELD_COUNTER_MUL
	return 1.0

static func color_of(element: String) -> Color:
	return INFO[element].color if INFO.has(element) else Color.WHITE

static func name_of(element: String) -> String:
	return INFO[element].name if INFO.has(element) else ""

## 동료 id → 원소. id 해시로 고정(저장할 것 없음, 같은 인물은 늘 같은 원소).
## 주인공("self")은 화.
static func element_of(member_id: String) -> String:
	if member_id == "self":
		return "fire"
	var h := 0
	for i in member_id.length():
		h = (h * 31 + member_id.unicode_at(i)) & 0x7fffffff
	return ORDER[h % ORDER.size()]
