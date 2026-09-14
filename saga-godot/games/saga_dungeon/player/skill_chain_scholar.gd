extends Node

## PLAN.md 51장 "장비→빌드" — 책사(scholar)의 셋째 활성 무예로 "chain"
## 모양을 채운다(dungeon_skills.gd 헤더 참고). skill_chain.gd(a_chain)·
## skill_chain_marshal.gd(m_chain)와 판정·감쇠 계산이 완전히 같다 — chain이
## 이걸로 세 번째로 공유하는 직업이 된다. 다른 점은 SKILL_KEY·입력 액션·el
## 기본값(s_chainfire는 el:'fire')뿐이다.
##
## 기력(mp)이 없어 sk.cost(26)는 소비하지 않는다(다른 무예와 같은 판단) —
## 쿨다운(sk.cd, 9초)만으로 남발을 막는다.

const MeleeAttack := preload("res://games/saga_dungeon/player/melee_attack.gd")
const SKILL_KEY := "s_chainfire"
const DEFAULT_HOPS := 3
const DEFAULT_RANGE := 7.65 # 원작 chainR 기본값 260px ÷ BASE_REACH(34)
const FALLOFF_PER_HOP := 0.12

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_chain_scholar")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_15"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(skill_chain.gd::try_cast()와 같은 경계).
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


## skill_chain.gd::_strike_chain()과 같은 계산 — el 기본값만 다르다(원작
## applyShapeSkill()의 "sk.el || 'phys'" 그대로, s_chainfire는 el:'fire').
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
