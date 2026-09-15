extends Node

## PLAN.md 51장 "장비→빌드" — 무장(warrior) br=3의 row1을 채우는 "dash"
## 모양(dungeon_skills.gd 헤더 참고). skill_dash_warrior.gd(w_dash)·skill_
## dash_warrior2.gd(w_leap)와 계산이 완전히 같다 — prereq_of()가 w_chain
## (같은 br row0, 1점 필요)을 가리킨다. 무장의 세 번째 dash라 스크립트
## 이름은 `warrior3`. w_blaze_dash는 far 필드가 없어 w_dash와 같은
## DASH_DURATION(0.2초)을 쓴다.
##
## 기력(mp)이 없어 sk.cost(22)는 소비하지 않는다(다른 무예와 같은 판단) —
## 쿨다운(sk.cd, 8초)만으로 남발을 막는다.

const MeleeAttack := preload("res://games/saga_dungeon/player/melee_attack.gd")
const SKILL_KEY := "w_blaze_dash"
const DASH_SPEED := 620.0 * (6.0 / 148.0) # 웹 BASE_SPD(148px/s)→WALK_SPEED(6.0m/s) 환산
const DASH_DURATION := 0.2 # 원작 "0.2 * (sk.far||1)" — w_blaze_dash은 far 없음
const HIT_RADIUS := 2.4 # melee_attack.gd ATK_RANGE 재사용(dungeon_skills.gd 헤더 참고)

var _cooldown_left := 0.0
var _dash_time_left := 0.0
var _hit_enemies: Array = []
var _cast_sk: Dictionary = {}
var _cast_rank := 0
@onready var _player: CharacterBody3D = get_parent()
@onready var _visual: Node3D = _player.get_node("Visual")


func _ready() -> void:
	add_to_group("skill_dash_warrior3")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_47"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(skill_dash_warrior.gd::try_cast()와 같은 경계).
func try_cast() -> bool:
	if _cooldown_left > 0.0 or _dash_time_left > 0.0:
		return false
	var rank := DungeonSkillState.rank_of(SKILL_KEY)
	if rank <= 0:
		return false
	var sk := DungeonSkills.skill_by_key(SKILL_KEY)
	_cooldown_left = float(sk.cd)
	_dash_time_left = DASH_DURATION
	_hit_enemies.clear()
	_cast_sk = sk
	_cast_rank = rank
	var dir: Vector3 = -_visual.global_transform.basis.z
	dir.y = 0.0
	if dir.length() < 0.001:
		dir = Vector3.FORWARD
	dir = dir.normalized()
	_player.dash_dir = dir
	_player.dash_speed = DASH_SPEED
	return true


## player.gd의 move_and_slide() 뒤에 도는 게 자연스럽도록 _physics_process를 쓴다.
func _physics_process(delta: float) -> void:
	if _dash_time_left <= 0.0:
		return
	_dash_time_left -= delta
	if _dash_time_left <= 0.0:
		_player.dash_speed = 0.0
	for enemy in get_tree().get_nodes_in_group("dungeon_enemy"):
		if not is_instance_valid(enemy) or _hit_enemies.has(enemy):
			continue
		if enemy.global_position.distance_to(_player.global_position) <= HIT_RADIUS:
			_hit_enemies.append(enemy)
			_strike_dash(enemy)


## skill_dash_warrior.gd::_strike_dash()와 같은 계산 — el 기본값만 다르다(w_blaze_dash는 el:'fire').
func _strike_dash(enemy: Node) -> void:
	var pct_mult: float = DungeonRunState.atk_mult() + DungeonEquipmentState.atk_pct_bonus() / 100.0
	var base: float = MeleeAttack.ATK_DAMAGE * pct_mult + DungeonEquipmentState.atk_flat_bonus()
	var dmg: float = base * DungeonSkills.value_at(_cast_sk, _cast_rank) * DungeonRunState.skill_mul()
	if randf() * 100.0 < DungeonRunState.crit_chance():
		dmg *= MeleeAttack.CRIT_MULT
	var el: String = str(_cast_sk.get("el", "phys"))
	var res: float = float(enemy.resist_pct(el)) if enemy.has_method("resist_pct") else 0.0
	if res > 0.0:
		dmg *= 1.0 - res / 100.0
	dmg = maxf(1.0, roundf(dmg))
	if enemy.has_method("take_damage"):
		enemy.take_damage(dmg)
