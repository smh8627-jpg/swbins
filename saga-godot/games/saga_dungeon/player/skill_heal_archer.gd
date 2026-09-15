extends Node

## PLAN.md 51장 "장비→빌드" — 궁장(archer) br=5의 row1을 채우는 "heal"
## 모양(dungeon_skills.gd 헤더 참고). skill_heal.gd(s_restore)와 계산이
## 완전히 같다 — `player_health.gd`의 heal_by()를 그대로 부른다. **궁장의
## 첫 heal** — prereq_of()가 a_dashshot(같은 br row0, 1점 필요)를 가리킨다.
##
## 기력(mp)이 없어 sk.cost(26)는 소비하지 않는다(다른 무예와 같은 판단) —
## 쿨다운(sk.cd, 14초)만으로 남발을 막는다.

const SKILL_KEY := "a_firstaid"

var _cooldown_left := 0.0


func _ready() -> void:
	add_to_group("skill_heal_archer")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_51"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(skill_heal.gd::try_cast()와 같은 경계).
func try_cast() -> bool:
	if _cooldown_left > 0.0:
		return false
	var rank := DungeonSkillState.rank_of(SKILL_KEY)
	if rank <= 0:
		return false
	var found := get_tree().get_nodes_in_group("player_health")
	if found.is_empty():
		return false
	var sk := DungeonSkills.skill_by_key(SKILL_KEY)
	_cooldown_left = float(sk.cd)
	var ph: Node = found[0]
	ph.heal_by(float(ph.max_hp) * DungeonSkills.value_at(sk, rank) / 100.0)
	return true
