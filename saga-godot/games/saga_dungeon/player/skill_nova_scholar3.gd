extends Node

## PLAN.md 51장 "장비→빌드" — 책사(scholar) br=1의 row1을 채우는 "nova"
## 모양(dungeon_skills.gd 헤더 참고). skill_nova_scholar2.gd(s_meteor)와
## 계산이 완전히 같다 — prereq_of()가 s_ice(같은 br row0, 1점 필요)를
## 가리킨다. 책사의 세 번째 nova라 스크립트 이름은 `scholar3`.
##
## r=3.97은 원작 135px÷BASE_REACH(34px) — dungeon_skills.gd 헤더의 nova
## 환산 그대로. 기력(mp)이 없어 sk.cost(28)는 소비하지 않는다 — 쿨다운
## (sk.cd, 9초)만으로 남발을 막는다.

const MeleeAttack := preload("res://games/saga_dungeon/player/melee_attack.gd")
const SKILL_KEY := "s_frost"

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_nova_scholar3")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_38"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(skill_nova_scholar.gd::try_cast()와 같은 경계).
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
		_strike_frost(enemy, sk, rank)
	return true


func _enemies_in_radius(radius: float) -> Array:
	var out: Array = []
	for enemy in get_tree().get_nodes_in_group("dungeon_enemy"):
		if not is_instance_valid(enemy):
			continue
		if enemy.global_position.distance_to(_player.global_position) <= radius:
			out.append(enemy)
	return out


## skill_nova_scholar2.gd::_strike_meteor()와 같은 계산 — el 기본값만 다르다(s_frost는 el:'cold').
func _strike_frost(enemy: Node, sk: Dictionary, rank: int) -> void:
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
