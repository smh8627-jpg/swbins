extends Label

## FOREST gather_label.gd와 같은 폴링 패턴 — 값이 바뀌는 곳이 여럿이라도
## (명령 버튼·다음 달 버튼) 폴링이 신호 배선보다 단순하다.

func _process(_delta: float) -> void:
	text = "%d년 %d월 · 🪙 %d · 🌾 %d · 🏪 %d · 재야 %d" % [
		RealmSaveState.year, RealmSaveState.month,
		RealmSaveState.gold, RealmSaveState.agri, RealmSaveState.comm,
		RealmSaveState.found.size(),
	]
