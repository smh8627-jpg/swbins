extends Button

## PLAN.md 51장 "장비→빌드" — 기공파(s_wave) 모바일 버튼. attack_button.gd와
## 같은 패턴: "skill_bolt" 그룹으로 찾아 같은 진입점(try_cast())을 부른다 —
## 키보드(R)와 버튼 둘 다 같은 판정을 타서 중복 로직이 안 생긴다.

func _ready() -> void:
	pressed.connect(_on_pressed)

func _on_pressed() -> void:
	var found := get_tree().get_nodes_in_group("skill_bolt")
	if not found.is_empty():
		found[0].try_cast()
