extends Label

## VERTICAL_SLICE.md 12단계 루프 — "부대 전투력이 올랐다는 걸 화면에서
## 확인한다." 도적 처치 뒤 잠깐 뜨는 토스트(dialogue_label)와 달리 이건
## 상시 표시되는 줄이라, 등용 전후 비교가 화면에 계속 남는다.
## PartyState(자동 로드 싱글턴)의 신호를 직접 구독한다 — 그룹 조회 없이도
## 씬 어디서든 하나뿐인 전역 상태라 이 편이 더 단순하다.

func _ready() -> void:
	_refresh(PartyState.atk, PartyState.def)
	PartyState.power_changed.connect(_refresh)

func _refresh(atk: float, def: float) -> void:
	text = "부대 %d명 · 전투력 %d" % [PartyState.members.size(), int(atk + def)]
