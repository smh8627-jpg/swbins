extends Label

## VERTICAL_SLICE.md 12단계 루프 — "부대 전투력이 올랐다는 걸 화면에서
## 확인한다." 도적 처치 뒤 잠깐 뜨는 토스트(dialogue_label)와 달리 이건
## 상시 표시되는 줄이라, 등용 전후 비교가 화면에 계속 남는다.
## PartyState(자동 로드 싱글턴)의 신호를 직접 구독한다 — 그룹 조회 없이도
## 씬 어디서든 하나뿐인 전역 상태라 이 편이 더 단순하다.
##
## 2026-09-11⑳ — 역사 인물을 등용해도(hero_encounter.gd) 그 이름은 5초짜리
## 토스트에만 잠깐 뜨고 이 상시 라벨은 그냥 "부대 N명"뿐이었다. GO의
## 핵심이 "누구를 얻었는가"인데 정작 상시 화면에 누굴 얻었는지가 안
## 남는 건 앞뒤가 안 맞아서, saga_core 인물이면 이름을 찾아 같이 보여주게
## 고쳤다. 일반 적(산적·도적 두목 — saga_core에 없는 id)은 그냥 id 그대로
## 보여준다.

const Characters := preload("res://saga_core/data/characters.gd")

func _ready() -> void:
	_refresh(PartyState.atk, PartyState.def)
	PartyState.power_changed.connect(_refresh)

func _refresh(atk: float, def: float) -> void:
	var names: Array = []
	for id in PartyState.members:
		var h: Variant = Characters.find(id)
		names.append(h.name if h != null else id)
	var names_text := " (" + "·".join(names) + ")" if not names.is_empty() else ""
	text = "부대 %d명%s · 전투력 %d · Lv.%d" % [PartyState.members.size(), names_text, int(atk + def), PartyState.level]
