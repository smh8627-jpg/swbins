extends Node

## PLAN.md 51장 "장비→빌드" — 다섯째 활성 무예. 이걸로 다섯 직업 전부
## 활성 무예를 하나씩 갖는다(bolt·swing·nova·dash·buff). bolt·swing·nova·
## dash는 전부 "즉시 데미지"였지만 buff는 **자신에게 한동안(sec초) 효과를
## 건다** — 대상도 방향도 없어 지금까지 중 가장 단순한 판정이다.
##
## `DungeonRunState.add_temp_buff(eff_key, value, sec)`(신규, dungeon_
## run_state.gd 참고)를 그대로 부른다 — 값과 만료 시각만 넘기면 그 뒤
## `atk_speed_mult()` 등 기존 getter가 알아서 반영한다(새 getter를 안
## 만든다). 기력(mp)이 없어 sk.cost(34)는 소비하지 않는다(다른 무예와
## 같은 판단) — 쿨다운(sk.cd, 16초)만으로 남발을 막는다.

const SKILL_KEY := "m_rally"

var _cooldown_left := 0.0


func _ready() -> void:
	add_to_group("skill_buff")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_just_pressed("dungeon_skill_5"):
		try_cast()


## HUD의 무예 버튼도 이 진입점을 그대로 부른다(skill_dash.gd::try_cast()와 같은 경계).
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
