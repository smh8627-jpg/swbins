extends Label

## HpLabel·JobLabel과 같은 경계(상시 표시). 가진 부문(룬)·보석·주옥 총
## 개수만 보여준다 — 종류별 목록은 소켓 버튼을 눌렀을 때 ChoicePrompt가
## 보여준다. "제외" 목록 4번(원소 6결+저항)에서 보석·주옥 두 갈래를 더했다.

func _ready() -> void:
	DungeonMaterialsState.materials_changed.connect(_refresh)
	_refresh()

func _refresh() -> void:
	var runes := 0
	for k in DungeonMaterialsState.rune_counts:
		runes += int(DungeonMaterialsState.rune_counts[k])
	var gems := 0
	for k in DungeonMaterialsState.gem_counts:
		gems += int(DungeonMaterialsState.gem_counts[k])
	var jewels := DungeonMaterialsState.jewels.size()
	text = "🔩 부문 %d · 💎 보석 %d · ◈ 주옥 %d" % [runes, gems, jewels]
