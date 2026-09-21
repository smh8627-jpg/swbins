extends Label

## HpLabel·JobLabel·MaterialsLabel과 같은 경계(상시 표시).

const NumberFormat := preload("res://saga_core/ui/number_format.gd")

func _ready() -> void:
	DungeonGoldState.gold_changed.connect(_refresh)
	_refresh()

func _refresh() -> void:
	text = "💰 금 %s" % NumberFormat.comma(DungeonGoldState.gold)
