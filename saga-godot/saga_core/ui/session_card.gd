extends RefCounted

## 표준 B "세션 마무리 카드"(PLAN.md 101-1·101-4) — games/saga_go/ui/
## choice_prompt.gd와 같은 자급자족 패턴(다섯 판 HUD 에 미리 박아 두지
## 않고, 부르는 쪽이 그 자리에서 짓는다). 선택지 없이 "닫기" 하나뿐이라는
## 점만 choice_prompt.gd와 다르다.

## lines: Array of String — 이번 세션에 쌓인 것을 한 줄씩.
static func show(parent: Node, title_text: String, lines: Array) -> CanvasLayer:
	var layer := CanvasLayer.new()
	layer.add_to_group("ui_modal") # GO 마우스 시점이 커서를 풀어 준다(다른 판엔 영향 없음)
	parent.add_child(layer)

	var panel := PanelContainer.new()
	panel.anchor_left = 0.5
	panel.anchor_right = 0.5
	panel.anchor_top = 0.5
	panel.anchor_bottom = 0.5
	panel.offset_left = -170.0
	panel.offset_right = 170.0
	panel.offset_top = -100.0
	panel.offset_bottom = -100.0 + 74.0 + lines.size() * 28.0 + 54.0
	layer.add_child(panel)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)
	panel.add_child(vbox)

	var title := Label.new()
	title.text = title_text
	title.autowrap_mode = 3 # TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(title)

	for line in lines:
		var lbl := Label.new()
		lbl.text = String(line)
		vbox.add_child(lbl)

	var btn := Button.new()
	btn.text = "닫기"
	btn.custom_minimum_size = Vector2(0, 44)
	btn.pressed.connect(func() -> void:
		CombatFeel.ui()
		layer.queue_free()
	)
	vbox.add_child(btn)

	return layer
