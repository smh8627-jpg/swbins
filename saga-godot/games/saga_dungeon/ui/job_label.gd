extends Label

## "제외" 목록 6번(직업 5종 전부) — HpLabel·PartyLabel과 같은 경계(상시
## 표시). 무기를 갈아 들 때마다 DungeonItems.class_name_for_weapon()으로
## 현재 직업이 바뀌는 걸 화면에서 바로 확인할 수 있게 한다(무예 스킬트리는
## 아직 없어 직업이 실제로 바꾸는 건 이름·주 능력치뿐이지만, 그것부터
## 눈에 보여야 다음 세션이 "정말 직업이 바뀌는지" 실기로 확인할 수 있다).

func _ready() -> void:
	DungeonEquipmentState.weapon_changed.connect(_refresh)
	_refresh()

func _refresh() -> void:
	text = "🧭 직업: %s" % DungeonItems.class_name_for_weapon(DungeonEquipmentState.weapon)
