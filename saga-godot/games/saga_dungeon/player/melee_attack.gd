extends Node

## VERTICAL_SLICE_DUNGEON.md 3절 — 실시간 근접 공격. GO의 duel_rules.gd
## (턴형 선택지 판정, 화면이 멈추고 버튼을 고른다)와는 완전히 다른 모델이라
## 새로 짰다 — 이동하며 버튼 한 번으로 때리는 실시간 액션. 웹판
## `dungeon.js`의 BASE_ATK_CD(0.55초)를 그대로 이식했다(새 수치를 만들지
## 않는다). 데미지(9)는 이번 슬라이스에 장비 시스템이 없어(제외 목록)
## 직접 정한 값이다 — 잡졸(HP≈24)을 세 대 안에 눕히는 감각을 노렸다.
##
## Player의 자식 컴포넌트로 붙는다(player_health.gd와 같은 경계) — 이
## 스크립트가 곧 "공격 입력을 받는 자리"다. HUD의 공격 버튼도 이 노드를
## "melee_attack" 그룹으로 찾아 같은 진입점(`try_attack()`)을 부른다.

const ATK_COOLDOWN := 0.55 # 웹판 BASE_ATK_CD 그대로
const ATK_DAMAGE := 9.0
const ATK_RANGE := 2.4

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("melee_attack")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_pressed("dungeon_attack"):
		try_attack()


## HUD의 공격 버튼도 이 진입점을 그대로 부른다(키보드/버튼 두 입력이
## 같은 판정을 타게 해 중복 로직이 안 생긴다).
func try_attack() -> void:
	if _cooldown_left > 0.0:
		return
	_cooldown_left = ATK_COOLDOWN
	for enemy in get_tree().get_nodes_in_group("dungeon_enemy"):
		if not is_instance_valid(enemy):
			continue
		if enemy.global_position.distance_to(_player.global_position) <= ATK_RANGE:
			if enemy.has_method("take_damage"):
				enemy.take_damage(ATK_DAMAGE)
