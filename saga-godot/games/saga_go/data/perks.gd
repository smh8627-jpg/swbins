extends RefCounted

## PLAN.md 101-2 GO ②"승급 3택"(표준 D) — 웹판 PLAN.md §5-⑦(js/perk.js,
## 웹에도 아직 없다 — 이 판이 먼저 착수) 특성 갈래를 GO-Godot 성장
## 모델에 맞춰 옮긴다. 웹은 인물별 rank up(중복 뽑기)에 붙지만 이
## 판엔 인물별 랭크가 없다(부대 단일 레벨, party_state.gd) — 그래서
## "부대 레벨업"을 그 자리로 쓴다. 웹의 거절 보상(재화 "단사" 10)은
## 이 판에 재화가 없어(경험치뿐) 경험치로 갈아탔다(party_state.gd
## REJECT_EXP).
##
## 축 3(공/수/보) · 풀 12(축마다 4) · 효과는 배율로만(기본치 불변
## 규칙 유지, 웹 §5-⑦과 같은 수치대).

const PERKS := [
	{"id": "gangyeok", "name": "강격", "axis": "attack", "mul": 0.08},
	{"id": "maenggong", "name": "맹공", "axis": "attack", "mul": 0.06},
	{"id": "bunjeon", "name": "분전", "axis": "attack", "mul": 0.07},
	{"id": "pilsa", "name": "필사", "axis": "attack", "mul": 0.05},
	{"id": "cheolbyeok", "name": "철벽", "axis": "defense", "mul": 0.08},
	{"id": "inne", "name": "인내", "axis": "defense", "mul": 0.06},
	{"id": "bangbyeok", "name": "방벽", "axis": "defense", "mul": 0.07},
	{"id": "gutgeon", "name": "굳건", "axis": "defense", "mul": 0.05},
	{"id": "hwallyeok", "name": "활력", "axis": "support", "mul": 0.08},
	{"id": "seongsil", "name": "성실", "axis": "support", "mul": 0.06},
	{"id": "geunmyeon", "name": "근면", "axis": "support", "mul": 0.07},
	{"id": "chongmyeong", "name": "총명", "axis": "support", "mul": 0.05},
]

const AXIS_LABEL := {"attack": "공", "defense": "수", "support": "보"}


static func find(id: String) -> Dictionary:
	for p in PERKS:
		if p.id == id:
			return p
	return {}


## 축 중복 금지(웹 §5-⑦ "셋이 서로 다른 축") — 축마다 하나씩, 이미
## 가진 특성은 다시 안 준다. 축의 풀이 다 떨어졌으면(그 축 4개 다 가짐)
## 그 축은 건너뛴다 — 그래서 결과가 3장보다 적을 수 있다(풀 12를 다
## 가지면 빈 배열, add_perk() 호출 자체가 필요 없어진다).
static func roll_three(already_have: Array) -> Array:
	var axes := ["attack", "defense", "support"]
	axes.shuffle()
	var picked: Array = []
	for axis in axes:
		var pool: Array = PERKS.filter(func(p: Dictionary) -> bool:
			return p.axis == axis and not already_have.has(p.id))
		if pool.is_empty():
			continue
		picked.append(pool[randi() % pool.size()])
	return picked
