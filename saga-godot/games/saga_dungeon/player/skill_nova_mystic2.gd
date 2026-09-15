extends Node

## PLAN.md 51장 "장비→빌드" — 방사(mystic) br=1의 row1을 채우는 "nova"
## 모양(dungeon_skills.gd 헤더 참고). skill_nova.gd(y_thunderdoom, br5)와
## 계산이 완전히 같다(자기 둘레 반경 안 적 전부, reach_mult() 안 곱함).
## **prereq_of()가 처음 실제로 걸리는 자리 중 하나** — y_curse(같은 br
## row0)에 먼저 1점을 넣어야 invest 가능하다. 방사의 두 번째 nova라
## 스크립트 이름은 `mystic2`. 다른 점은 SKILL_KEY·입력 액션·el 기본값
## (y_wither는 el:'pois')뿐이다.
##
## 기력(mp)이 없어 sk.cost(28)는 소비하지 않는다(다른 무예와 같은 판단) —
## 쿨다운(sk.cd, 9초)만으로 남발을 막는다.

const MeleeAttack := preload("res://games/saga_dungeon/player/melee_attack.gd")
const SKILL_KEY := "y_wither"

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_nova_mystic2")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_31"):
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
	for enemy in targets:
		_strike_wither(enemy, sk, rank)
	return true


func _enemies_in_radius(radius: float) -> Array:
	var out: Array = []
	for enemy in get_tree().get_nodes_in_group("dungeon_enemy"):
		if not is_instance_valid(enemy):
			continue
		if enemy.global_position.distance_to(_player.global_position) <= radius:
			out.append(enemy)
	return out


## skill_nova.gd::_strike_nova()와 같은 계산 — el 기본값만 다르다(y_wither는 el:'pois').
func _strike_wither(enemy: Node, sk: Dictionary, rank: int) -> void:
	var pct_mult: float = DungeonRunState.atk_mult() + DungeonEquipmentState.atk_pct_bonus() / 100.0
	var base: float = MeleeAttack.ATK_DAMAGE * pct_mult + DungeonEquipmentState.atk_flat_bonus()
	var dmg: float = base * DungeonSkills.value_at(sk, rank) * DungeonRunState.skill_mul()
	if randf() * 100.0 < DungeonRunState.crit_chance():
		dmg *= MeleeAttack.CRIT_MULT
	var el: String = str(sk.get("el", "phys"))
	var res: float = float(enemy.resist_pct(el)) if enemy.has_method("resist_pct") else 0.0
	if res > 0.0:
		dmg *= 1.0 - res / 100.0
	dmg = maxf(1.0, roundf(dmg))
	if enemy.has_method("take_damage"):
		enemy.take_damage(dmg)
