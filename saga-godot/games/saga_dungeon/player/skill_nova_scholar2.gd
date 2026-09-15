extends Node

## PLAN.md 51장 "장비→빌드" — 책사(scholar) br=0의 row2를 채우는 "nova"
## 모양(dungeon_skills.gd 헤더 참고). skill_nova_scholar.gd(s_blaze, 같은
## br row1)와 계산이 완전히 같다 — prereq_of()가 s_blaze(1점 필요)를
## 가리킨다. 책사의 두 번째 nova라 스크립트 이름은 `scholar2`. 이걸로
## 책사 br0이 3/3(s_fire·s_blaze·s_meteor)으로 찬다.
##
## r=4.71은 원작 160px÷BASE_REACH(34px) — dungeon_skills.gd 헤더의 nova
## 환산 그대로(s_blaze의 3.53=120/34과 같은 요령). 기력(mp)이 없어
## sk.cost(42)는 소비하지 않는다 — 쿨다운(sk.cd, 14초)만으로 남발을 막는다.

const MeleeAttack := preload("res://games/saga_dungeon/player/melee_attack.gd")
const SKILL_KEY := "s_meteor"

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_nova_scholar2")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_34"):
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
		_strike_meteor(enemy, sk, rank)
	return true


func _enemies_in_radius(radius: float) -> Array:
	var out: Array = []
	for enemy in get_tree().get_nodes_in_group("dungeon_enemy"):
		if not is_instance_valid(enemy):
			continue
		if enemy.global_position.distance_to(_player.global_position) <= radius:
			out.append(enemy)
	return out


## skill_nova_scholar.gd::_strike_blaze()와 같은 계산 — el 기본값만 다르다(s_meteor는 el:'fire').
func _strike_meteor(enemy: Node, sk: Dictionary, rank: int) -> void:
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
