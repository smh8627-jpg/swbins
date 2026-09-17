extends Button

## GO save_button.gd와 완전히 같은 패턴 — ForestSaveState만 다르다.

const TOAST_SEC := 3.0
const SessionCard := preload("res://saga_core/ui/session_card.gd")
const VillagerBuilder := preload("res://games/saga_forest/world/villager_builder.gd")


func _ready() -> void:
	text = "저장"
	pressed.connect(_on_pressed)


## PLAN.md 101-4 표준 B(세션 마무리 카드) — GO save_button.gd와 같은 경계
## 결정: FOREST엔 던전 클리어·월말 같은 명확한 "세션 끝"이 없어, 사용자가
## 직접 접는 저장 시점을 그 자리로 쓴다.
func _on_pressed() -> void:
	var ok := ForestSaveState.save()
	if ok:
		SessionCard.show(get_tree().current_scene, "저장했다 — 이번 세션", [
			"골드 +%d" % ForestSaveState.session_gold_gained(),
			"채집 +%d" % ForestSaveState.session_items_gathered(),
			"만난 주민 %d/%d" % [ForestSaveState.met_count(), VillagerBuilder.ROSTER_SIZE],
		])
	else:
		_toast("저장 실패 — 플레이어를 못 찾았다.")


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
