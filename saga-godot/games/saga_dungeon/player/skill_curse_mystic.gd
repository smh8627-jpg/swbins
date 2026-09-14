extends Node

## PLAN.md 51장 "장비→빌드" — 방사(mystic)의 셋째 활성 무예로 "curse"
## 모양을 채운다(dungeon_skills.gd 헤더 참고). skill_curse.gd(w_intimidate)와
## 계산이 완전히 같다(느려짐은 `apply_elem_slow()`, 저주는 `apply_hex()` —
## 둘 다 기존 것을 재사용, 새 상태 없음). 다른 점은 SKILL_KEY·입력 액션뿐 —
## y_curse는 w_intimidate와 v·r·sec가 원작에서부터 전부 같다.
##
## 기력(mp)이 없어 sk.cost(20)는 소비하지 않는다(다른 무예와 같은 판단) —
## 쿨다운(sk.cd, 8초)만으로 남발을 막는다.

const SKILL_KEY := "y_curse"
const SLOW_MULT := 0.35 # 원작 "ce.slowMul = 0.35" 그대로, 랭크 무관 고정

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_curse_mystic")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_14"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(skill_curse.gd::try_cast()와 같은 경계).
func try_cast() -> bool:
	if _cooldown_left > 0.0:
		return false
	var rank := DungeonSkillState.rank_of(SKILL_KEY)
	if rank <= 0:
		return false
	var sk := DungeonSkills.skill_by_key(SKILL_KEY)
	var targets := _enemies_in_radius(float(sk.r))
	if targets.is_empty():
		return false
	_cooldown_left = float(sk.cd)
	var value := DungeonSkills.value_at(sk, rank)
	var sec := float(sk.sec)
	for enemy in targets:
		enemy.apply_elem_slow(SLOW_MULT, sec)
		enemy.apply_hex(value, sec)
	return true


func _enemies_in_radius(radius: float) -> Array:
	var out: Array = []
	for enemy in get_tree().get_nodes_in_group("dungeon_enemy"):
		if not is_instance_valid(enemy):
			continue
		if enemy.global_position.distance_to(_player.global_position) <= radius:
			out.append(enemy)
	return out
