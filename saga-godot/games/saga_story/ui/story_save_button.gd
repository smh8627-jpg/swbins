extends Button

## GO save_button.gd·FOREST forest_save_button.gd와 완전히 같은 패턴 —
## StorySaveState만 다르다.

const TOAST_SEC := 3.0


func _ready() -> void:
	text = "저장"
	pressed.connect(_on_pressed)


func _on_pressed() -> void:
	var ok := StorySaveState.save()
	_toast("저장했다." if ok else "저장 실패 — 플레이어를 못 찾았다.")


func _toast(text_: String) -> void:
	var labels := get_tree().get_nodes_in_group("dialogue_label")
	if labels.is_empty():
		return
	var label: Label = labels[0]
	label.text = text_
	label.show()
	get_tree().create_timer(TOAST_SEC).timeout.connect(func() -> void:
		if is_instance_valid(label) and label.text == text_:
			label.hide()
	)
