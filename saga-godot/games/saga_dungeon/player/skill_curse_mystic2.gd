extends Node

## PLAN.md 51장 "장비→빌드" — 방사(mystic) br=1의 row2를 채우는 "curse"
## 모양(dungeon_skills.gd 헤더 참고). skill_curse_mystic.gd(y_curse, 같은
## br row0)와 계산이 완전히 같다 — prereq_of()가 y_wither(같은 br row1,
## 1점 필요)를 가리킨다. 방사의 두 번째 curse라 스크립트 이름은
## `mystic2`. 이걸로 방사 br1이 3/3(y_curse·y_wither·y_doom)으로 찬다.
##
## r=4.71은 원작 160px÷BASE_REACH(34px) — dungeon_skills.gd 헤더의 nova/
## curse 환산 그대로(s_meteor와 같은 값). 기력(mp)이 없어 sk.cost(40)는
## 소비하지 않는다 — 쿨다운(sk.cd, 18초)만으로 남발을 막는다.

const SKILL_KEY := "y_doom"
const SLOW_MULT := 0.35 # 원작 "ce.slowMul = 0.35" 그대로, 랭크 무관 고정

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_curse_mystic2")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_50"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(skill_curse_mystic.gd::try_cast()와 같은 경계).
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
