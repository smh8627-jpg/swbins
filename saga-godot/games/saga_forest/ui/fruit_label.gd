extends Label

## GO party_label.gd와 같은 자리(상시 표시) — ForestSaveState.fruit_count를
## 매 프레임 그대로 읽는다. 신호를 따로 안 만든 이유 — 값이 바뀌는 곳이
## gatherable_tree.gd 한 곳뿐이라(master.md 33장 "토큰 절약 규칙", 중복이
## 더 싼 경우) 폴링이 신호 배선보다 간단하다.

func _process(_delta: float) -> void:
	text = "🍎 과일 %d개" % ForestSaveState.fruit_count
