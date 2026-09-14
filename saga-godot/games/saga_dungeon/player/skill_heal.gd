extends Node

## PLAN.md 51장 "장비→빌드" — 다섯 직업 모두 첫 활성 무예를 가진 뒤,
## 책사(scholar)의 둘째 활성 무예로 "heal" 모양을 채운다(원작 desc
## "책사의 첫 회복" 그대로). skill_buff.gd처럼 대상도 방향도 없어
## `player_health.gd`의 기존 `heal_by()`를 그대로 부르기만 한다 — 새
## 상태·판정이 전혀 없는 가장 단순한 무예다.
##
## 기력(mp)이 없어 sk.cost(30)는 소비하지 않는다(다른 무예와 같은
## 판단) — 쿨다운(sk.cd, 16초)만으로 남발을 막는다.

const SKILL_KEY := "s_restore"

var _cooldown_left := 0.0


func _ready() -> void:
	add_to_group("skill_heal")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_6"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(skill_buff.gd::try_cast()와 같은 경계).
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
