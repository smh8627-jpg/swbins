extends Node

## VERTICAL_SLICE_DUNGEON.md 3절 — "때리는 손맛"을 검증하려면 적도
## 되받아쳐야 한다. 죽음·부활은 이번 슬라이스 범위 밖(완료 조건 8단계에
## 없음) — 체력이 0 밑으로 내려가도 그냥 멈춘다. GO의 Player.tscn/
## player.gd는 손대지 않고, Player 인스턴스 밑에 이 컴포넌트 하나만
## 얹는 방식으로 짰다(component 패턴 — melee_attack.gd와 같은 경계).
##
## 은사(철벽) 적용 — max_hp가 더 이상 상수가 아니라 DungeonRunState.hp_mult()
## 로 다시 계산된다(웹판 dungeon.js hpMaxOf()와 같은 자리). 수호부(guardPct)
## 는 받는 피해를 줄인다(dungeon.js의 "amount *= 1 - boonVal('guardPct')/100"
## 그대로).

signal hp_changed(hp: float, max_hp: float)

## 이번 슬라이스엔 스탯 시스템이 없어(장비·직업 능력치 전부 제외 목록)
## 임의로 정한 값 — 잡졸(공격력≈5) 몇 대는 맞아도 버티는 정도를 노렸다.
const MAX_HP_BASE := 60.0

var max_hp := MAX_HP_BASE
var hp := MAX_HP_BASE


func _ready() -> void:
	add_to_group("player_health")
	DungeonRunState.boons_changed.connect(recalc_max_hp)
	recalc_max_hp()


func recalc_max_hp() -> void:
	max_hp = MAX_HP_BASE * DungeonRunState.hp_mult()
	hp = minf(hp, max_hp)
	hp_changed.emit(hp, max_hp)


func heal_by(amount: float) -> void:
	if amount <= 0.0:
		return
	hp = minf(max_hp, hp + amount)
	hp_changed.emit(hp, max_hp)


func take_damage(amount: float) -> void:
	if amount <= 0.0:
		return
	hp = maxf(0.0, hp - amount * DungeonRunState.guard_mult())
	hp_changed.emit(hp, max_hp)
