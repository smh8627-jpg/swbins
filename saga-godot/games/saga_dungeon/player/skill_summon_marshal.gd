extends Node

## PLAN.md 51장 "장비→빌드" — 도독(marshal) br=4의 row1을 채우는 "summon"
## 모양(dungeon_skills.gd 헤더 참고). skill_summon.gd(y_shade) 계열과
## 계산이 완전히 같다. **도독의 첫 summon** — prereq_of()가 m_javelin
## (같은 br row0, 1점 필요)을 가리킨다. m_reserve는 str 필드가 없어
## str_mul 기본값(1.0)을 쓴다.
##
## 기력(mp)이 없어 sk.cost(36)는 소비하지 않는다 — 쿨다운(sk.cd, 16초)
## 만으로 남발을 막는다.

const DungeonMinion := preload("res://games/saga_dungeon/world/dungeon_minion.gd")
const SKILL_KEY := "m_reserve"
const SCATTER_X := 40.0 * (6.0 / 148.0) / 2.0 # ≈0.81m — 웹 "(Math.random()-0.5)*40"의 절반
const SCATTER_Z := 30.0 * (6.0 / 148.0) / 2.0 # ≈0.61m

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_summon_marshal")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_54"):
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
