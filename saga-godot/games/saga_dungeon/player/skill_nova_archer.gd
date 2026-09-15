extends Node

## PLAN.md 51장 "장비→빌드" — 궁장(archer) br=5의 row2를 채우는 "nova"
## 모양(dungeon_skills.gd 헤더 참고). skill_nova.gd(y_thunderdoom)와
## 계산이 완전히 같다(자기 둘레 반경 안 적 전부, reach_mult() 안 곱함).
## **궁장의 첫 nova** — prereq_of()가 a_firstaid(같은 br row1, 1점 필요)를
## 가리킨다. 이걸로 궁장 br5가 3/3(a_dashshot·a_firstaid·a_gale)으로 찬다.
##
## r=3.82는 y_thunderdoom과 원작 r이 똑같이 130이라 같은 환산값이 그대로
## 나온다(dungeon_skills.gd 헤더 참고). 기력(mp)이 없어 sk.cost(30)는
## 소비하지 않는다(다른 무예와 같은 판단) — 쿨다운(sk.cd, 9초)만으로
## 남발을 막는다.

const MeleeAttack := preload("res://games/saga_dungeon/player/melee_attack.gd")
const SKILL_KEY := "a_gale"

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_nova_archer")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_61"):
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
		_strike_gale(enemy, sk, rank)
	return true


func _enemies_in_radius(radius: float) -> Array:
	var out: Array = []
	for enemy in get_tree().get_nodes_in_group("dungeon_enemy"):
		if not is_instance_valid(enemy):
			continue
		if enemy.global_position.distance_to(_player.global_position) <= radius:
			out.append(enemy)
	return out


## skill_nova.gd::_strike_nova()와 같은 계산 — el 기본값만 다르다(a_gale은 el:'chi').
func _strike_gale(enemy: Node, sk: Dictionary, rank: int) -> void:
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
