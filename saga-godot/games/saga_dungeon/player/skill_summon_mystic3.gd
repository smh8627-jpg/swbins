extends Node

## PLAN.md 51장 "장비→빌드" — 방사(mystic) br=0의 row2를 채우는 "summon"
## 모양(dungeon_skills.gd 헤더 참고). skill_summon.gd(y_shade)·skill_
## summon_mystic2.gd(y_horde)와 계산이 완전히 같다 — prereq_of()가
## y_horde(같은 br row1, 1점 필요)를 가리킨다. 방사의 세 번째 summon이라
## 스크립트 이름은 `mystic3`. 이걸로 방사 br0이 3/3(y_shade·y_horde·
## y_golem)으로 찬다.
##
## `str`(4.0)은 기존 필드 그대로 소비(skill_summon.gd 참고). 원작의
## `big:true`(토우의 덩치 표시)는 이 슬라이스에 분신 크기를 다르게 그리는
## 시스템이 없어 값만 보존하고 안 쓴다(kb·mpRegen과 같은 결의 판단). v=1·
## grow=0이라 랭크와 무관하게 늘 1개만 소환된다(원작 "크고 오래 버티는
## 하나" 그대로).
##
## 기력(mp)이 없어 sk.cost(44)는 소비하지 않는다 — 쿨다운(sk.cd, 24초)
## 만으로 남발을 막는다.

const DungeonMinion := preload("res://games/saga_dungeon/world/dungeon_minion.gd")
const SKILL_KEY := "y_golem"
const SCATTER_X := 40.0 * (6.0 / 148.0) / 2.0 # ≈0.81m — 웹 "(Math.random()-0.5)*40"의 절반
const SCATTER_Z := 30.0 * (6.0 / 148.0) / 2.0 # ≈0.61m

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("skill_summon_mystic3")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_45"):
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
