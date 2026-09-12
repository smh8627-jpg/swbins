extends Label

## HpLabel·JobLabel과 같은 경계(상시 표시). 가진 부문(룬) 총 개수만
## 보여준다 — 종류별 목록은 소켓 버튼을 눌렀을 때 ChoicePrompt가 보여준다.

func _ready() -> void:
	DungeonMaterialsState.materials_changed.connect(_refresh)
	_refresh()

func _refresh() -> void:
	var total := 0
	for k in DungeonMaterialsState.rune_counts:
		total += int(DungeonMaterialsState.rune_counts[k])
	text = "🔩 부문 %d" % total
