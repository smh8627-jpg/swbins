extends Node

## PLAN.md 51장 "장비→빌드" — 무장(warrior) br=0의 row1을 채우는 "swing"
## 모양(dungeon_skills.gd 헤더 참고). skill_whirl.gd(w_whirl, 같은 br
## row0)와 계산이 완전히 같다(자기 둘레 반경 안 적 전부, `DungeonRunState.
## reach_mult()` 포함). **prereq_of()가 처음 실제로 걸리는 자리 중
## 하나** — w_whirl에 먼저 1점을 넣어야 invest 가능하다. 무장의 두
## 번째 swing이라 스크립트 이름은 `warrior2`. 다른 점은 SKILL_KEY·
## 입력 액션·반경(r=1.7)뿐(el은 둘 다 없음 → phys).
##
## 기력(mp)이 없어 sk.cost(28)는 소비하지 않는다(다른 무예와 같은 판단) —
## 쿨다운(sk.cd, 7초)만으로 남발을 막는다.

const MeleeAttack := preload("res://games/saga_dungeon/player/melee_attack.gd")
const SKILL_KEY := "w_cleave"

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_swing_warrior2")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_28"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(skill_whirl.gd::try_cast()와 같은 경계).
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
		_strike_cleave(enemy, sk, rank)
	return true


func _enemies_in_radius(radius: float) -> Array:
	var out: Array = []
	for enemy in get_tree().get_nodes_in_group("dungeon_enemy"):
		if not is_instance_valid(enemy):
			continue
		if enemy.global_position.distance_to(_player.global_position) <= radius:
			out.append(enemy)
	return out


## skill_whirl.gd::_strike_whirl()과 같은 계산 — el 기본값만 다르다(w_cleave도 el 없음 → phys, 값은 같은 자리).
func _strike_cleave(enemy: Node, sk: Dictionary, rank: int) -> void:
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
