extends Button

## VERTICAL_SLICE_DUNGEON.md 3절 — 모바일 공격 버튼. melee_attack.gd를
## "melee_attack" 그룹으로 찾아 같은 진입점(try_attack())을 부른다 —
## 키보드(F)와 버튼 둘 다 같은 판정을 타서 중복 로직이 안 생긴다
## (save_button.gd가 SaveState.save()를 직접 부르는 것과 같은 패턴).

func _ready() -> void:
	pressed.connect(_on_pressed)

func _on_pressed() -> void:
	var found := get_tree().get_nodes_in_group("melee_attack")
	if not found.is_empty():
		found[0].try_attack()
