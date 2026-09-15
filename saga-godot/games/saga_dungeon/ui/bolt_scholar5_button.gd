extends Button

## PLAN.md 51장 "장비→빌드" — 독무탄(s_venombolt) 모바일 버튼. bolt_scholar4_button.gd와
## 같은 패턴: "skill_bolt_scholar5" 그룹으로 찾아 같은 진입점(try_cast())을 부른다.

func _ready() -> void:
	pressed.connect(_on_pressed)

func _on_pressed() -> void:
	var found := get_tree().get_nodes_in_group("skill_bolt_scholar5")
	if not found.is_empty():
		found[0].try_cast()
