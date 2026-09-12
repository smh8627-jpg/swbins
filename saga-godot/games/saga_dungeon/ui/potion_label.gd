extends Label

## HpLabel·JobLabel·GoldLabel과 같은 경계(상시 표시). 벨트 네 칸을
## "1:소×2 2:- 3:- 4:-"처럼 키 번호와 나란히 보여준다(1~4 키가 그 칸을
## 그대로 마신다는 걸 화면에서 바로 연결해서 읽을 수 있게).

func _ready() -> void:
	DungeonPotionState.belt_changed.connect(_refresh)
	_refresh()

func _refresh() -> void:
	var parts: Array[String] = []
	for i in range(DungeonPotionState.SLOTS):
		var row: Dictionary = DungeonPotionState.belt[i]
		if row.is_empty():
			parts.append("%d:-" % (i + 1))
		else:
			var g := DungeonPotionState.grade_of(int(row.g))
			parts.append("%d:%s×%d" % [i + 1, g.name, int(row.n)])
	text = "🍶 " + " ".join(parts)
