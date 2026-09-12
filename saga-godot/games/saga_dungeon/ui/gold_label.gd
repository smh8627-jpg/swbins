extends Label

## HpLabel·JobLabel·MaterialsLabel과 같은 경계(상시 표시).

func _ready() -> void:
	DungeonGoldState.gold_changed.connect(_refresh)
	_refresh()

func _refresh() -> void:
	text = "💰 금 %d" % DungeonGoldState.gold
