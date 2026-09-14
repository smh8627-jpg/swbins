extends Node

## PLAN.md 51장 "장비→빌드" — 첫 활성 무예. dungeon_skills.gd 헤더가
## "다음에 활성 무예를 옮길 때 그대로 쓰면 된다"고 남겨 둔 s_wave(기공파,
## shape:'bolt', el:'chi')를 옮긴다. 웹판 dungeon.js applyShapeSkill()의
## 'bolt'는 진짜 투사체(속도 330, 최대 1.5초 생존, 벽에 닿으면 소멸)를
## 쏘지만, 이 슬라이스엔 투사체 이동/충돌 시스템이 없어 "가장 가까운 적
## 하나를 즉시 맞히는" 히트스캔으로 근사했다(우물이 원작 미니게임을 즉시
## 회복으로 근사한 것과 같은 결의 판단) — melee_attack.gd의 ATK_RANGE
## (2.4)보다 훨씬 넓은 BOLT_RANGE로 "원거리" 감각만 살렸다.
##
## 기력(mp)이 이 슬라이스엔 없어 sk.cost(30)는 소비하지 않는다(다른 무예의
## mpRegen도 이미 "아직 기력 없음"으로 문서화돼 있다) — 쿨다운(sk.cd,
## 8초)만으로 남발을 막는다. 랭크가 0(투자 전)이면 아무 일도 안 한다.
##
## melee_attack.gd와 같은 경계(Player의 자식 컴포넌트, HUD 버튼이 그룹으로
## 찾아 같은 진입점을 부른다) — ATK_DAMAGE(맨손 기준 9)도 그대로 가져와
## 쓴다(새 기준치를 만들지 않는다).

const MeleeAttack := preload("res://games/saga_dungeon/player/melee_attack.gd")
const SKILL_KEY := "s_wave"
const BOLT_RANGE := 12.0

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_bolt")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_1"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(melee_attack.gd::try_attack()과 같은 경계).
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


## dungeon.js strike()가 shots 처리 루프에서 부르는 것과 같은 계산(atkOf()*mul
## *variance, 이후 crit·저항) — 여기선 variance(0.86~1.14)는 안 쓴다(랜덤 두
## 겹을 겹치지 않는다, 웹판도 crit 하나로 이미 편차가 크다는 판단은 melee_
## attack.gd가 이미 내린 것과 같은 결).
func _strike_bolt(enemy: Node, sk: Dictionary, rank: int) -> void:
	var pct_mult: float = DungeonRunState.atk_mult() + DungeonEquipmentState.atk_pct_bonus() / 100.0
	var base: float = MeleeAttack.ATK_DAMAGE * pct_mult + DungeonEquipmentState.atk_flat_bonus()
	var dmg: float = base * DungeonSkills.value_at(sk, rank) * DungeonRunState.skill_mul()
	if randf() * 100.0 < DungeonRunState.crit_chance():
		dmg *= MeleeAttack.CRIT_MULT
	var el: String = str(sk.get("el", "chi"))
	var res: float = float(enemy.resist_pct(el)) if enemy.has_method("resist_pct") else 0.0
	if res > 0.0:
		dmg *= 1.0 - res / 100.0
	dmg = maxf(1.0, roundf(dmg))
	if enemy.has_method("take_damage"):
		enemy.take_damage(dmg)
