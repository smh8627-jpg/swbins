extends Label

## fruit_label.gd(나무 하나짜리 첫 슬라이스)를 대체 — ForestSaveState.items가
## 여러 채집물(과일·솔방울·광석·꽃)을 담게 되면서 이름도 맞춰 바꿨다.
## GO party_label.gd와 같은 폴링 패턴(값이 바뀌는 곳이 gatherable_builder.gd
## 한 곳뿐이라 신호 배선보다 단순하다).

func _process(_delta: float) -> void:
	text = "🎒 채집물 %d개" % ForestSaveState.total_items()
