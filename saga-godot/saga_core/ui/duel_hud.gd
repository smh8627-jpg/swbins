extends RefCounted

## bandit_encounter.gd `_add_bar_row()`/`_make_combat_button()`을 뽑았다 —
## PLAN.md 101-2 GO ④"사당 시련"이 duel_rules.gd(판정 층)를 재사용하며
## 이 화면 조각도 같이 필요해져, 두 번째로 짜기 전에 공용으로 옮겼다
## (choice_prompt.gd·toast.gd와 같은 saga_core 경계).

static func add_bar_row(parent: VBoxContainer, label_text: String) -> ProgressBar:
	var row := HBoxContainer.new()
	parent.add_child(row)
	var lbl := Label.new()
	lbl.text = label_text
	lbl.custom_minimum_size = Vector2(70.0, 0.0)
	row.add_child(lbl)
	var bar := ProgressBar.new()
	bar.min_value = 0.0
	bar.max_value = 100.0
	bar.value = 100.0
	bar.show_percentage = false
	bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(bar)
	return bar


static func make_combat_button(text: String, cb: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(90.0, 64.0)
	b.pressed.connect(cb)
	return b
