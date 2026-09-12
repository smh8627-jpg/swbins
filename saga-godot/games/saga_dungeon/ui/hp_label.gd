extends Label

## VERTICAL_SLICE_DUNGEON.md 3절 — GO의 PartyLabel과 같은 경계(상시
## 표시). player_health.gd를 "player_health" 그룹으로 찾아 신호를
## 직접 구독한다(CodexLabel과 같은 패턴).

func _ready() -> void:
	var found := get_tree().get_nodes_in_group("player_health")
	if found.is_empty():
		return
	var health: Node = found[0]
	_refresh(health.hp, health.MAX_HP)
	health.hp_changed.connect(_refresh)

func _refresh(hp: float, max_hp: float) -> void:
	text = "❤ %d/%d" % [int(hp), int(max_hp)]
