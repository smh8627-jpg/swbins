extends Node

## PLAN.md 51장 "장비→빌드" — 무장(warrior)의 둘째 활성 무예로 "curse"
## 모양을 채운다(원작 desc "무장의 첫 저주" 그대로). skill_nova.gd와
## 같은 반경 판정(자기 둘레, reach_mult() 안 곱함 — dungeon_skills.gd
## 헤더 참고)이지만 데미지 대신 **상태 둘**을 건다: 느려짐(기존
## `apply_elem_slow()` 재사용)·저주(`apply_hex()` 신규, 그동안 받는
## 모든 피해가 v%만큼 는다).
##
## 기력(mp)이 없어 sk.cost(24)는 소비하지 않는다(다른 무예와 같은
## 판단) — 쿨다운(sk.cd, 9초)만으로 남발을 막는다.

const SKILL_KEY := "w_intimidate"
const SLOW_MULT := 0.35 # 원작 "ce.slowMul = 0.35" 그대로, 랭크 무관 고정

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_curse")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_7"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(skill_nova.gd::try_cast()와 같은 경계).
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
