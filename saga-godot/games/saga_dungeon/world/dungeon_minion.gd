extends Node3D

## PLAN.md 51장 "장비→빌드" — 무예 "summon"(분신술 등)이 세우는 분신 하나.
## dungeon_skills.gd 헤더 참고 — `CharacterBody3D`가 아니라 맨 `Node3D`다
## (물리 충돌 없음, `global_position`을 직접 옮긴다 — 원작 분신도 몸통
## 충돌이 없다, dash가 겪은 문제를 아예 피한다). 적이 이 분신을 공격하지
## 않는다(원작 그대로) — hp도, 죽음도 없다. `life_left`가 다 되면 스스로
## `queue_free()`한다.
##
## 원작 dungeon.js updateMinions() 그대로: 가장 가까운 적을 쫓다가 닿으면
## 멈춰 서서 주기적으로 때리고, 적이 없으면 플레이어 곁으로 돌아온다.

const MeleeAttack := preload("res://games/saga_dungeon/player/melee_attack.gd")
const CHASE_SPEED := 110.0 * (6.0 / 148.0) # ≈4.46m/s — dungeon_skills.gd 헤더 참고
const RETURN_SPEED := 90.0 * (6.0 / 148.0) # ≈3.65m/s
const ATTACK_RANGE := 2.4 # melee_attack.gd ATK_RANGE 재사용(위 헤더 참고)
const ATTACK_COOLDOWN := 0.7 # 원작 "mn.cd = big ? 1.1 : 0.7" 그대로(big 없음)
const RETURN_DEADZONE := 40.0 * (6.0 / 148.0) # 원작 "pd > 40"의 그 40px

var life_left := 12.0
var mul := 0.5
var _atk_cd := 0.0
var _player: Node3D


func _ready() -> void:
	add_to_group("dungeon_minion")
	_player = get_tree().get_first_node_in_group("player")


func _physics_process(delta: float) -> void:
	life_left -= delta
	if life_left <= 0.0:
		queue_free()
		return
	_atk_cd = maxf(0.0, _atk_cd - delta)

	var target := _nearest_enemy()
	if target == null:
		_return_to_player(delta)
		return

	var to_target: Vector3 = target.global_position - global_position
	to_target.y = 0.0
	var dist := to_target.length()
	if dist > ATTACK_RANGE:
		global_position += to_target.normalized() * CHASE_SPEED * delta
	elif _atk_cd <= 0.0:
		_atk_cd = ATTACK_COOLDOWN
		_strike(target)


func _return_to_player(delta: float) -> void:
	if not is_instance_valid(_player):
		return
	var to_player: Vector3 = _player.global_position - global_position
	to_player.y = 0.0
	if to_player.length() > RETURN_DEADZONE:
		global_position += to_player.normalized() * RETURN_SPEED * delta


func _nearest_enemy() -> Node:
	var best: Node = null
	var best_d := INF
	for enemy in get_tree().get_nodes_in_group("dungeon_enemy"):
		if not is_instance_valid(enemy):
			continue
		var d: float = enemy.global_position.distance_to(global_position)
		if d < best_d:
			best_d = d
			best = enemy
	return best


## dungeon.js "strike(best, mn.mul, 4, 'phys')" 그대로 — skill_nova.gd
## 등과 같은 계산이지만 `value_at(rank)` 대신 고정 `mul`을 쓴다(랭크는
## 데미지가 아니라 분신 개체 수를 늘린다, 위 헤더 참고).
func _strike(enemy: Node) -> void:
	var pct_mult: float = DungeonRunState.atk_mult() + DungeonEquipmentState.atk_pct_bonus() / 100.0
	var base: float = MeleeAttack.ATK_DAMAGE * pct_mult + DungeonEquipmentState.atk_flat_bonus()
	var dmg: float = base * mul
	if randf() * 100.0 < DungeonRunState.crit_chance():
		dmg *= MeleeAttack.CRIT_MULT
	var res: float = float(enemy.resist_pct("phys")) if enemy.has_method("resist_pct") else 0.0
	if res > 0.0:
		dmg *= 1.0 - res / 100.0
	dmg = maxf(1.0, roundf(dmg))
	if enemy.has_method("take_damage"):
		enemy.take_damage(dmg)
