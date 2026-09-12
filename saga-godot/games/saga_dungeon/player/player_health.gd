extends Node

## VERTICAL_SLICE_DUNGEON.md 3절 — "때리는 손맛"을 검증하려면 적도
## 되받아쳐야 한다. 죽음·부활은 이번 슬라이스 범위 밖(완료 조건 8단계에
## 없음) — 체력이 0 밑으로 내려가도 그냥 멈춘다. GO의 Player.tscn/
## player.gd는 손대지 않고, Player 인스턴스 밑에 이 컴포넌트 하나만
## 얹는 방식으로 짰다(component 패턴 — melee_attack.gd와 같은 경계).

signal hp_changed(hp: float, max_hp: float)

## 이번 슬라이스엔 스탯 시스템이 없어(장비·직업 능력치 전부 제외 목록)
## 임의로 정한 값 — 잡졸(공격력≈5) 몇 대는 맞아도 버티는 정도를 노렸다.
const MAX_HP := 60.0

var hp := MAX_HP


func _ready() -> void:
	add_to_group("player_health")


func take_damage(amount: float) -> void:
	if amount <= 0.0:
		return
	hp = maxf(0.0, hp - amount)
	hp_changed.emit(hp, MAX_HP)
