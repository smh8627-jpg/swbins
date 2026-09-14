extends Node

## PLAN.md 51장 "장비→빌드" — 방사(mystic)의 가장 원래 모양 "summon"을
## 채운다(원작 `CLASSES` 설명 "분신을 세우고 적을 묶는다" 그대로).
## `dungeon_minion.gd`(신규, 화면에 남는 분신 하나)를 랭크만큼(`round(
## value_at(rank))`개) 플레이어 둘레에 흩어 놓는다 — dungeon_skills.gd
## 헤더의 속도·거리 환산 참고.
##
## 기력(mp)이 없어 sk.cost(26)는 소비하지 않는다(다른 무예와 같은
## 판단) — 쿨다운(sk.cd, 12초)만으로 남발을 막는다.

const DungeonMinion := preload("res://games/saga_dungeon/world/dungeon_minion.gd")
const SKILL_KEY := "y_shade"
const SCATTER_X := 40.0 * (6.0 / 148.0) / 2.0 # ≈0.81m — 웹 "(Math.random()-0.5)*40"의 절반
const SCATTER_Z := 30.0 * (6.0 / 148.0) / 2.0 # ≈0.61m

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_summon")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_8"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(skill_curse.gd::try_cast()와 같은 경계).
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
