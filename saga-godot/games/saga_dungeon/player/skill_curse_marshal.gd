extends Node

## PLAN.md 51장 "장비→빌드" — 도독(marshal) br=3의 row1을 채우는 "curse"
## 모양(dungeon_skills.gd 헤더 참고). skill_curse.gd(w_intimidate)·skill_
## curse_mystic.gd(y_curse)·skill_curse_archer.gd(a_cripple)와 계산이
## 완전히 같다(느려짐은 apply_elem_slow(), 저주는 apply_hex() — 둘 다
## 기존 것을 재사용, 새 상태 없음). **도독의 첫 curse** — prereq_of()가
## m_chain(같은 br row0, 1점 필요)을 가리킨다.
##
## r=4.12는 원작 140px÷BASE_REACH(34px) — dungeon_skills.gd 헤더의 nova/
## curse 환산 그대로(m_ring·a_cripple과 같은 값). 기력(mp)이 없어
## sk.cost(26)는 소비하지 않는다 — 쿨다운(sk.cd, 10초)만으로 남발을 막는다.

const SKILL_KEY := "m_press"
const SLOW_MULT := 0.35 # 원작 "ce.slowMul = 0.35" 그대로, 랭크 무관 고정

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_curse_marshal")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_49"):
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
