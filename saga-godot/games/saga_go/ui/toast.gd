extends RefCounted

## 화면 위쪽에 잠깐 뜨는 한 마디(NPC 대사·사건 결과 토스트 등)를 보여주는
## 공용 헬퍼. bandit_encounter.gd·simple_event.gd·npc_builder.gd 세 곳이
## 각자 dialogue_label 그룹을 찾아 text를 얹고 몇 초 뒤 숨기는 같은 코드를
## 따로 두고 있던 걸 choice_prompt.gd와 같은 이유로 하나로 뽑았다.

static func show(node: Node, text: String, show_sec: float) -> void:
	var labels := node.get_tree().get_nodes_in_group("dialogue_label")
	if labels.is_empty():
		return
	var label: Label = labels[0]
	label.text = text
	label.show()
	node.get_tree().create_timer(show_sec).timeout.connect(func() -> void:
		if is_instance_valid(label) and label.text == text:
			label.hide()
	)
