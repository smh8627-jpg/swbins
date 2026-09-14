extends Node

## PLAN.md 51장 "장비→빌드" — 둘째 활성 무예. skill_bolt.gd(기공파, 가장
## 가까운 적 하나)와 같은 경계로 무장(warrior)의 첫 무예 w_whirl(회전참,
## shape:'swing')을 옮긴다 — 이번엔 "자기 둘레 반경 안의 적 전부"를 때린다
## (웹판 applyShapeSkill()의 'swing': `radius = reachOf() * (sk.r || 2.0)`
## 그대로, 여기선 `DungeonRunState.reach_mult()`가 그 reach 배율 자리).
##
## 기력(mp)이 없어 sk.cost(22)는 소비하지 않고 쿨다운(sk.cd, 5초)만
## 남발을 막는다 — skill_bolt.gd와 같은 판단. 원작의 넉백(kb=30)은 이
## 슬라이스에 넉백 자체가 없어(melee_attack.gd도 안 한다) 값만 보존하고
## 적용하지 않는다.

const MeleeAttack := preload("res://games/saga_dungeon/player/melee_attack.gd")
const SKILL_KEY := "w_whirl"

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_whirl")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_2"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(skill_bolt.gd::try_cast()와 같은 경계).
func try_cast() -> bool:
	if _cooldown_left > 0.0:
		return false
	var rank := DungeonSkillState.rank_of(SKILL_KEY)
	if rank <= 0:
		return false
	var sk := DungeonSkills.skill_by_key(SKILL_KEY)
	var targets := _enemies_in_radius(float(sk.r) * DungeonRunState.reach_mult())
	if targets.is_empty():
		return false
	_cooldown_left = float(sk.cd)
	for enemy in targets:
		_strike_whirl(enemy, sk, rank)
	return true


func _enemies_in_radius(radius: float) -> Array:
	var out: Array = []
	for enemy in get_tree().get_nodes_in_group("dungeon_enemy"):
		if not is_instance_valid(enemy):
			continue
		if enemy.global_position.distance_to(_player.global_position) <= radius:
			out.append(enemy)
	return out


## skill_bolt.gd::_strike_bolt()와 같은 계산 — el 기본값만 다르다(원작
## applyShapeSkill()의 "sk.el || 'phys'" 그대로, w_whirl은 el을 안 갖는다).
func _strike_whirl(enemy: Node, sk: Dictionary, rank: int) -> void:
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
