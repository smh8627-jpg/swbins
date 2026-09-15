extends Node

## PLAN.md 51장 "장비→빌드" — 책사(scholar) br=1의 row2를 채우는 "bolt"
## 모양(dungeon_skills.gd 헤더 참고). skill_bolt_scholar3.gd(s_ice, 같은
## br row1)의 뒤를 잇는 row2 — prereq_of()가 s_frost(같은 br, row1)를
## 가리킨다(s_ice가 아니라 이번 절에서 새로 채운 s_frost다 — row1이
## bolt에서 nova로 갈아탄 자리였기 때문). 책사의 네 번째 bolt라 스크립트
## 이름은 `scholar4`. 이걸로 책사 br1이 3/3(s_ice·s_frost·s_bolt)으로 찬다.
##
## 기력(mp)이 없어 sk.cost(32)는 소비하지 않는다(다른 무예와 같은 판단) —
## 쿨다운(sk.cd, 7초)만으로 남발을 막는다.

const MeleeAttack := preload("res://games/saga_dungeon/player/melee_attack.gd")
const SKILL_KEY := "s_bolt"
const BOLT_RANGE := 12.0

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_bolt_scholar4")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_43"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(skill_bolt.gd::try_cast()와 같은 경계).
func try_cast() -> bool:
	if _cooldown_left > 0.0:
		return false
	var rank := DungeonSkillState.rank_of(SKILL_KEY)
	if rank <= 0:
		return false
	var target := _nearest_enemy()
	if target == null:
		return false
	var sk := DungeonSkills.skill_by_key(SKILL_KEY)
	_cooldown_left = float(sk.cd)
	_strike_bolt(target, sk, rank)
	return true


func _nearest_enemy() -> Node:
	var best: Node = null
	var best_d := BOLT_RANGE
	for enemy in get_tree().get_nodes_in_group("dungeon_enemy"):
		if not is_instance_valid(enemy):
			continue
		var d: float = enemy.global_position.distance_to(_player.global_position)
		if d <= best_d:
			best_d = d
			best = enemy
	return best


## skill_bolt.gd::_strike_bolt()와 같은 계산 — el 기본값만 다르다(s_bolt는 el:'lit').
func _strike_bolt(enemy: Node, sk: Dictionary, rank: int) -> void:
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
