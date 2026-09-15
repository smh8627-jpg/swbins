extends Node

## PLAN.md 51장 "장비→빌드" — 도독(marshal) br=0의 row1을 채우는 "buff"
## 모양(dungeon_skills.gd 헤더 참고). skill_buff.gd(m_rally, 같은 br
## row0)와 계산이 완전히 같다 — `DungeonRunState.add_temp_buff()`를
## 그대로 부른다. **prereq_of()가 처음 실제로 걸리는 자리 중 하나** —
## m_rally에 먼저 1점을 넣어야 invest 가능하다. 도독의 두 번째 buff라
## 스크립트 이름은 `marshal2`. 다른 점은 SKILL_KEY·입력 액션·
## buff_eff(m_guard는 'guardPct')·sec뿐이다.
##
## 기력(mp)이 없어 sk.cost(30)는 소비하지 않는다(다른 무예와 같은 판단) —
## 쿨다운(sk.cd, 14초)만으로 남발을 막는다.

const SKILL_KEY := "m_guard"

var _cooldown_left := 0.0


func _ready() -> void:
	add_to_group("skill_buff_marshal2")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_30"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(skill_buff.gd::try_cast()와 같은 경계).
func try_cast() -> bool:
	if _cooldown_left > 0.0:
		return false
	var rank := DungeonSkillState.rank_of(SKILL_KEY)
	if rank <= 0:
		return false
	var sk := DungeonSkills.skill_by_key(SKILL_KEY)
	_cooldown_left = float(sk.cd)
	var value := DungeonSkills.value_at(sk, rank)
	DungeonRunState.add_temp_buff(str(sk.buff_eff), value, float(sk.sec))
	return true
