extends Node

## PLAN.md 51장 "장비→빌드" — 궁장(archer) br=4의 row2를 채우는 "summon"
## 모양(dungeon_skills.gd 헤더 참고). skill_summon.gd(y_shade)와 계산이
## 완전히 같다 — **궁장의 첫 summon**. prereq_of()가 a_speedy(같은 br
## row1, 1점 필요)를 가리킨다. 이걸로 궁장 br4가 3/3(a_flourish·a_speedy·
## a_hawk)으로 찬다.
##
## 원작에 `str` 필드가 없어 skill_summon.gd와 같은 기본 배율(1.0)을
## 그대로 쓴다(y_shade·m_reserve와 같은 경계). 기력(mp)이 없어 sk.cost
## (36)는 소비하지 않는다(다른 무예와 같은 판단) — 쿨다운(sk.cd, 16초)
## 만으로 남발을 막는다.

const DungeonMinion := preload("res://games/saga_dungeon/world/dungeon_minion.gd")
const SKILL_KEY := "a_hawk"
const SCATTER_X := 40.0 * (6.0 / 148.0) / 2.0 # ≈0.81m — skill_summon.gd와 같은 환산
const SCATTER_Z := 30.0 * (6.0 / 148.0) / 2.0 # ≈0.61m

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_summon_archer")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_56"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(skill_summon.gd::try_cast()와 같은 경계).
func try_cast() -> bool:
	if _cooldown_left > 0.0:
		return false
	var rank := DungeonSkillState.rank_of(SKILL_KEY)
	if rank <= 0:
		return false
	var sk := DungeonSkills.skill_by_key(SKILL_KEY)
	_cooldown_left = float(sk.cd)
	var n: int = roundi(DungeonSkills.value_at(sk, rank))
	var sec: float = float(sk.sec)
	var str_mul: float = float(sk.get("str", 1.0))
	var parent := get_tree().current_scene
	for i in range(n):
		var m: Node3D = DungeonMinion.new()
		parent.add_child(m)
		m.life_left = sec
		m.mul = 0.5 * str_mul
		m.global_position = _player.global_position + Vector3(
			(randf() - 0.5) * SCATTER_X * 2.0, 0.0, (randf() - 0.5) * SCATTER_Z * 2.0)
	return true
