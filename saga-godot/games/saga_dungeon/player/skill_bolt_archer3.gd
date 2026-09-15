extends Node

## PLAN.md 51장 "장비→빌드" — 궁장(archer) br=1의 row1을 채우는 "bolt"
## 모양(dungeon_skills.gd 헤더 참고). skill_bolt_archer2.gd(a_fire,
## 같은 br row0)와 계산이 완전히 같다. **prereq_of()가 처음 실제로
## 걸리는 자리 중 하나** — a_fire에 먼저 1점을 넣어야 invest 가능하다.
## 궁장의 세 번째 bolt라 스크립트 이름은 `archer3`. 다른 점은
## SKILL_KEY·입력 액션·el 기본값(a_ice는 el:'cold')뿐이다.
##
## 기력(mp)이 없어 sk.cost(22)는 소비하지 않는다(다른 무예와 같은 판단) —
## 쿨다운(sk.cd, 5초)만으로 남발을 막는다.

const MeleeAttack := preload("res://games/saga_dungeon/player/melee_attack.gd")
const SKILL_KEY := "a_ice"
const BOLT_RANGE := 12.0

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_bolt_archer3")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_27"):
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


## skill_bolt.gd::_strike_bolt()와 같은 계산 — el 기본값만 다르다(a_ice는 el:'cold').
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
