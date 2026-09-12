extends Button

## "제외" 목록 2번(소켓+부문어) — attack_button.gd와 같은 경계(HUD 버튼
## 하나가 진입점 하나를 그대로 부른다). 지금 박을 수 있는 부위(무기부터
## 본다, DungeonEquipmentState.first_socketable_slot())를 찾아, 가진
## 부문 중 고를 수 있게 GO의 ChoicePrompt를 그대로 재사용한다(cross-game
## 재사용 경계 — bandit_encounter.gd의 은사 선택과 같은 패턴).

const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")
const Toast := preload("res://saga_core/ui/toast.gd")


func _ready() -> void:
	pressed.connect(_on_pressed)


func _on_pressed() -> void:
	var slot_name := DungeonEquipmentState.first_socketable_slot()
	if slot_name == "":
		Toast.show(self, "박을 빈 소켓이 없다.", 2.5)
		return
	var owned: Array[String] = []
	for r: Dictionary in DungeonItems.RUNES:
		if DungeonMaterialsState.count(str(r.key)) > 0:
			owned.append(str(r.key))
	if owned.is_empty():
		Toast.show(self, "가진 부문이 없다.", 2.5)
		return

	var choices: Array = []
	for key in owned:
		var r := DungeonItems.rune_by_key(key)
		var n := DungeonMaterialsState.count(key)
		choices.append({
			"label": "%s(%s) × %d" % [r.glyph, r.name, n],
			"cb": func() -> void: _on_rune_picked(slot_name, key),
		})
	ChoicePrompt.build(get_tree().current_scene, "🔨 무엇을 박을까", choices)


func _on_rune_picked(slot_name: String, key: String) -> void:
	if not DungeonMaterialsState.take_rune(key):
		return
	var word := DungeonEquipmentState.socket_rune(slot_name, key)
	if not word.is_empty():
		Toast.show(self, "《%s》 완성 — %s" % [word.name, word.desc], 4.0)
	else:
		var r := DungeonItems.rune_by_key(key)
		Toast.show(self, "%s(%s)을(를) 박았다." % [r.glyph, r.name], 3.0)
