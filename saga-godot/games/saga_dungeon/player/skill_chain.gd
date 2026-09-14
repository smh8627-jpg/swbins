extends Node

## PLAN.md 51장 "장비→빌드" — 궁장(archer)의 둘째 활성 무예로 "chain"
## 모양을 채운다(dungeon_skills.gd 헤더 참고, 원작 desc "가까운 적을 꿰고
## 다음 적으로 튄다" 그대로). skill_nova.gd·skill_curse.gd와 데미지 계산은
## 같지만 판정이 다르다 — 반경 안 전부/제자리가 아니라 **가장 가까운
## 적부터 시작해, 아직 안 맞은 적 중 가장 가까운 쪽으로 최대 hops(기본
## 3)번 옮겨 붙는다**(원작 dungeon.js applyShapeSkill()의 'chain' 그대로).
## 튈 때마다 12%씩 약해진다.
##
## 기력(mp)이 없어 sk.cost(22)는 소비하지 않는다(다른 무예와 같은 판단) —
## 쿨다운(sk.cd, 9초)만으로 남발을 막는다.

const MeleeAttack := preload("res://games/saga_dungeon/player/melee_attack.gd")
const SKILL_KEY := "a_chain"
const DEFAULT_HOPS := 3
const DEFAULT_RANGE := 7.65 # 원작 chainR 기본값 260px ÷ BASE_REACH(34)
const FALLOFF_PER_HOP := 0.12

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_chain")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_9"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(skill_nova.gd::try_cast()와 같은 경계).
func try_cast() -> bool:
	if _cooldown_left > 0.0:
		return false
	var rank := DungeonSkillState.rank_of(SKILL_KEY)
	if rank <= 0:
		return false
	var sk := DungeonSkills.skill_by_key(SKILL_KEY)
	var enemies := get_tree().get_nodes_in_group("dungeon_enemy")
	var cur: Node = _nearest_to(_player.global_position, enemies, [])
	if cur == null:
		return false
	_cooldown_left = float(sk.cd)
	var value := DungeonSkills.value_at(sk, rank)
	var chain_r: float = float(sk.get("r", DEFAULT_RANGE))
	var hops: int = int(sk.get("hops", DEFAULT_HOPS))
	var hit: Array = []
	var hop := 0
	while cur != null and hop < hops:
		_strike_chain(cur, sk, value * (1.0 - hop * FALLOFF_PER_HOP))
		hit.append(cur)
		cur = _nearest_to(cur.global_position, enemies, hit, chain_r)
		hop += 1
	return true


func _nearest_to(from: Vector3, candidates: Array, exclude: Array, max_range: float = INF) -> Node:
	var best: Node = null
	var best_d := max_range
	for enemy in candidates:
		if not is_instance_valid(enemy) or enemy.hp <= 0.0 or exclude.has(enemy):
			continue
		var d: float = enemy.global_position.distance_to(from)
		if d <= best_d:
			best_d = d
			best = enemy
	return best


## skill_nova.gd::_strike_nova()와 같은 계산 — mult가 무예 값(rank·falloff
## 적용 뒤)을 그대로 받는다는 점만 다르다(nova는 value_at() 결과 하나뿐).
func _strike_chain(enemy: Node, sk: Dictionary, mult: float) -> void:
	var pct_mult: float = DungeonRunState.atk_mult() + DungeonEquipmentState.atk_pct_bonus() / 100.0
	var base: float = MeleeAttack.ATK_DAMAGE * pct_mult + DungeonEquipmentState.atk_flat_bonus()
	var dmg: float = base * mult * DungeonRunState.skill_mul()
	if randf() * 100.0 < DungeonRunState.crit_chance():
		dmg *= MeleeAttack.CRIT_MULT
	var el: String = str(sk.get("el", "phys"))
	var res: float = float(enemy.resist_pct(el)) if enemy.has_method("resist_pct") else 0.0
	if res > 0.0:
		dmg *= 1.0 - res / 100.0
	dmg = maxf(1.0, roundf(dmg))
	if enemy.has_method("take_damage"):
		enemy.take_damage(dmg)
