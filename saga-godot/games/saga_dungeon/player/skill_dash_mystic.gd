extends Node

## PLAN.md 51장 "장비→빌드" — 방사(mystic) br=4의 row1을 채우는 "dash"
## 모양(dungeon_skills.gd 헤더 참고). skill_dash.gd(a_dashshot)와 계산이
## 완전히 같다 — **방사의 첫 dash**. prereq_of()가 y_soulbolt(같은 br
## row0, 1점 필요)를 가리킨다.
##
## 원작에 `far` 필드가 없어 기본 지속시간 0.2초(w_dash·m_charge와
## 같음, dungeon_skills.gd 헤더 dash 환산 참고). 기력(mp)이 없어 sk.cost
## (20)는 소비하지 않는다(다른 무예와 같은 판단) — 쿨다운(sk.cd, 7초)
## 만으로 남발을 막는다.

const MeleeAttack := preload("res://games/saga_dungeon/player/melee_attack.gd")
const SKILL_KEY := "y_specter"
const DASH_SPEED := 620.0 * (6.0 / 148.0) # skill_dash.gd와 같은 환산
const DASH_DURATION := 0.2 # 원작 "0.2 * (sk.far||1)" — y_specter는 far 없음
const HIT_RADIUS := 2.4 # melee_attack.gd ATK_RANGE 재사용(위 헤더 참고)

var _cooldown_left := 0.0
var _dash_time_left := 0.0
var _hit_enemies: Array = []
var _cast_sk: Dictionary = {}
var _cast_rank := 0
@onready var _player: CharacterBody3D = get_parent()
@onready var _visual: Node3D = _player.get_node("Visual")


func _ready() -> void:
	add_to_group("skill_dash_mystic")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_65"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(skill_dash.gd::try_cast()와 같은 경계).
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


## player.gd의 move_and_slide() 뒤에 도는 게 자연스럽도록 _physics_process를 쓴다(skill_dash.gd와 같음).
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
			_strike_specter(enemy)


## skill_dash.gd::_strike_dash()와 같은 계산 — el 기본값만 다르다(y_specter는 el:'pois').
func _strike_specter(enemy: Node) -> void:
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
