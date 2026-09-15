extends Node

## PLAN.md 51장 "장비→빌드" — 궁장(archer) br=0의 row1을 채우는 "bolt"
## 모양(dungeon_skills.gd 헤더 참고). 이 슬라이스 전체에서 처음으로
## `shots` 필드를 쓰는 스킬 — 원작 dungeon.js applyShapeSkill()의
## 'bolt'는 shots개의 투사체를 조준 방향 기준 부채꼴(spread)로 쏘고,
## 각 투사체는 독립된 전체 위력을 낸다(데미지를 나눠 갖지 않는다).
## 이 슬라이스의 bolt는 투사체 없는 "최근접 적 즉시 명중" 히트스캔이라
## 조준 방향이 없다 — **부채꼴 산개(spread)는 근사 대상에서 빼고,
## "각 슛이 독립된 전체 위력"이라는 성질만 보존해 "가장 가까운 적
## 최대 shots명에게 각각 전체 위력으로 명중"으로 근사한다.** 대상이
## shots보다 적으면 있는 만큼만 맞는다(원작도 사거리 안에 적이 없으면
## 그 투사체는 허공으로 날아가 아무 일도 안 일어난다 — 결과가 같다).
## prereq_of()가 a_pierce(같은 br row0, 1점 필요)를 가리킨다. 궁장의
## 여섯 번째 bolt(a_pierce·a_fire·a_ice·a_storm·a_venom에 이어).
##
## 기력(mp)이 없어 sk.cost(24)는 소비하지 않는다(다른 무예와 같은 판단) —
## 쿨다운(sk.cd, 6초)만으로 남발을 막는다.

const MeleeAttack := preload("res://games/saga_dungeon/player/melee_attack.gd")
const SKILL_KEY := "a_multi"
const BOLT_RANGE := 12.0

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_bolt_archer6")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_75"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(skill_bolt.gd::try_cast()와 같은 경계).
func try_cast() -> bool:
	if _cooldown_left > 0.0:
		return false
	var rank := DungeonSkillState.rank_of(SKILL_KEY)
	if rank <= 0:
		return false
	var sk := DungeonSkills.skill_by_key(SKILL_KEY)
	var shots: int = int(sk.get("shots", 1))
	var targets := _nearest_enemies(shots)
	if targets.is_empty():
		return false
	_cooldown_left = float(sk.cd)
	for enemy in targets:
		_strike_multi(enemy, sk, rank)
	return true


## 위 헤더 근사 그대로 — 가장 가까운 적부터 최대 count명.
func _nearest_enemies(count: int) -> Array:
	var candidates: Array = []
	for enemy in get_tree().get_nodes_in_group("dungeon_enemy"):
		if not is_instance_valid(enemy):
			continue
		var d: float = enemy.global_position.distance_to(_player.global_position)
		if d <= BOLT_RANGE:
			candidates.append([d, enemy])
	candidates.sort_custom(func(a, b): return a[0] < b[0])
	var out: Array = []
	for i in range(mini(count, candidates.size())):
		out.append(candidates[i][1])
	return out


## skill_bolt.gd::_strike_bolt()와 같은 계산 — 원작대로 각 슛이 전체 위력을 낸다(나눠 갖지 않음).
func _strike_multi(enemy: Node, sk: Dictionary, rank: int) -> void:
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
