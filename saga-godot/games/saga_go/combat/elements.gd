extends RefCounted

const Story := preload("res://games/saga_go/data/story.gd")

## PLAN 106장 ③·⑭ — 원소 일곱과 반응. 원신의 "원소를 겹쳐 반응을 일으킨다" 문법만
## 따르고 이름·수치는 이 판 것으로 정했다(화·수·뇌·풍·빙·암·초).
##   화+수 → 증발 : 이번 타격 ×1.5                화+빙 → 융해 : 이번 타격 ×1.5
##   화+뇌 → 과부하: ×1.2 + 둘레 4m 폭발·밀쳐냄    수+뇌 → 감전 : 2초 지속 피해, 둘레 3m 젖은 적에게 번짐
##   수+빙 → 빙결 : 2.5초 얼어 멈춤(강공격·낙하로 치면 쇄빙 ×1.5 + 풀림)
##   빙+뇌 → 초전도: 둘레 3m 기본 ×0.5 + 8초 물리 피해 ×1.4
##   풍+(화·수·뇌·빙) → 확산: 둘레 4m 적에게 그 원소를 옮겨 붙이고 기본 ×0.6
##   암+(화·수·뇌·빙) → 결정: 명단 전체 보호막(지금 인물 최대 체력 20%, 15초)
##   초+수 → 개화 : 1.5초 뒤 터지는 씨앗(둘레 3m 기본 ×1.5)   초+화 → 연소: 4초 지속 피해
##   초+뇌 → 촉진 : 8초 동안 그 적에게 뇌 ×1.25(활성)·초 ×1.25(발산)
## 풍·암은 적에게 붙지 않는다(원신과 같다). 적에 남는 원소(부착)는 AURA_SEC 동안 산다.
## 같은 원소를 또 맞으면 시간만 갱신.

const AURA_SEC := 6.0

const INFO := {
	"fire": {"name": "화", "color": Color(1.0, 0.42, 0.22)},
	"water": {"name": "수", "color": Color(0.25, 0.62, 1.0)},
	"thunder": {"name": "뇌", "color": Color(0.72, 0.42, 1.0)},
	"wind": {"name": "풍", "color": Color(0.4, 0.92, 0.75)},
	"ice": {"name": "빙", "color": Color(0.7, 0.93, 1.0)},
	"rock": {"name": "암", "color": Color(0.93, 0.72, 0.3)},
	"grass": {"name": "초", "color": Color(0.55, 0.85, 0.22)},
}
## 106장 ⑭ 전에 셋이던 순서를 앞에 그대로 둔다. 동료 원소는 id 해시 % 7 이라 옛 동료 원소가 바뀐다
## (세이브에 원소를 저장하지 않으니 옮길 것은 없다 — 주인공은 늘 화).
const ORDER := ["fire", "water", "thunder", "wind", "ice", "rock", "grass"]
## 부착되지 않는 원소 — 스스로는 반응만 일으킨다.
const NO_AURA := ["wind", "rock"]
## 확산·결정이 반응하는 원소.
const SWIRLABLE := ["fire", "water", "thunder", "ice"]

## 적에 붙은 원소 aura 에 incoming 이 들어올 때 반응 id(순서 무관 쌍 + 풍·암). 없으면 "".
static func reaction_of(aura: String, incoming: String) -> String:
	if aura == "" or incoming == "" or aura == incoming:
		return ""
	if incoming == "wind":
		return "swirl" if SWIRLABLE.has(aura) else ""
	if incoming == "rock":
		return "crystallize" if SWIRLABLE.has(aura) else ""
	var pair := [aura, incoming]
	pair.sort()
	match pair:
		["fire", "water"]: return "vaporize"
		["fire", "thunder"]: return "overload"
		["thunder", "water"]: return "electro"
		["fire", "ice"]: return "melt"
		["ice", "water"]: return "frozen"
		["ice", "thunder"]: return "superconduct"
		["grass", "water"]: return "bloom"
		["fire", "grass"]: return "burning"
		["grass", "thunder"]: return "quicken"
	return ""

## 이 원소를 맞은 적에게 원소가 남는가.
static func attaches(element: String) -> bool:
	return element != "" and not NO_AURA.has(element)

const REACTION_INFO := {
	"vaporize": {"name": "증발", "mul": 1.5, "color": Color(1.0, 0.75, 0.35)},
	"overload": {"name": "과부하", "mul": 1.2, "color": Color(1.0, 0.45, 0.7)},
	"electro": {"name": "감전", "mul": 1.0, "color": Color(0.7, 0.6, 1.0)},
	"melt": {"name": "융해", "mul": 1.5, "color": Color(1.0, 0.7, 0.55)},
	"frozen": {"name": "빙결", "mul": 1.0, "color": Color(0.6, 0.85, 1.0)},
	"superconduct": {"name": "초전도", "mul": 1.0, "color": Color(0.7, 0.75, 1.0)},
	"swirl": {"name": "확산", "mul": 1.0, "color": Color(0.5, 1.0, 0.85)},
	"crystallize": {"name": "결정", "mul": 1.0, "color": Color(1.0, 0.85, 0.4)},
	"bloom": {"name": "개화", "mul": 1.0, "color": Color(0.45, 0.95, 0.45)},
	"burning": {"name": "연소", "mul": 1.0, "color": Color(1.0, 0.55, 0.2)},
	"quicken": {"name": "촉진", "mul": 1.0, "color": Color(0.45, 0.9, 0.55)},
	"aggravate": {"name": "활성", "mul": 1.25, "color": Color(0.75, 0.5, 1.0)},
	"spread": {"name": "발산", "mul": 1.25, "color": Color(0.6, 0.95, 0.3)},
	"shatter": {"name": "쇄빙", "mul": 1.5, "color": Color(0.85, 0.95, 1.0)},
}

## PLAN 106장 ⑦ — 원소 방패 상성. 방패 원소 → 그 방패를 빨리 깨는 원소(수>화, 뇌>수, 화>뇌).
## 같은 원소는 방패를 못 긁고(면역), 원소 없는 기본 공격은 SHIELD_PHYSICAL 만큼만.
## 106장 ⑮ 새 넷: 풍 ← 암(바람에 안 밀림) · 빙 ← 화(녹임) · 암 ← 초(뿌리가 쪼갬) · 초 ← 풍(덩굴을 찢음).
## 바위 방패는 물리로도 제대로 깎인다(원신 바위 방패를 둔기로 깨는 문법).
const SHIELD_COUNTER := {"fire": "water", "water": "thunder", "thunder": "fire",
	"wind": "rock", "ice": "fire", "rock": "grass", "grass": "wind"}
const SHIELD_COUNTER_MUL := 2.5
const SHIELD_PHYSICAL := 0.4
const SHIELD_PHYSICAL_BY := {"rock": 1.0}

static func shield_mul(shield_element: String, incoming: String) -> float:
	if incoming == "":
		return float(SHIELD_PHYSICAL_BY.get(shield_element, SHIELD_PHYSICAL))
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
	if Story.MEMBERS.has(member_id): # 106장 ㉛ 이야기 동료는 표로
		return String(Story.MEMBERS[member_id].element)
	var h := 0
	for i in member_id.length():
		h = (h * 31 + member_id.unicode_at(i)) & 0x7fffffff
	return ORDER[h % ORDER.size()]
