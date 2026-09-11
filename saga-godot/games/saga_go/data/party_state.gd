extends Node

## VERTICAL_SLICE.md 완료 조건(12단계 루프)의 나머지 두 단계 중 "도적이
## 부대에 합류한다" · "부대 전투력이 올랐다는 걸 화면에서 확인한다"를 위한
## 최소 구현. Phase 7(Stats/Item/Inventory/Equipment)을 통째로 만드는 게
## 아니라, 지금 loop을 완성하는 데 필요한 만큼만 — 등용한 인원 수만 세고
## 그 수에 비례해 공격력/방어력을 올린다. project.godot [autoload]에
## 등록된 싱글턴이라 어느 스크립트에서든 이름으로 바로 쓴다(PartyState.atk 등).
##
## BASE_ATK/BASE_DEF는 bandit_encounter.gd가 쓰던 예전 PLACEHOLDER_ATK/
## PLACEHOLDER_DEF와 같은 값이다 — 아직 아무도 등용하지 않았을 때 기존
## 전투 밸런스가 그대로 유지되도록 맞췄다.
##
## 2026-09-11⑬ — GO 사건 다양화로 사건마다 exp 보상(웹판 event.js의
## exp 필드)이 생겼는데, 그걸 받아 줄 자리가 없었다. Phase 7 전체(Stats/
## Item/Inventory/Equipment)를 만드는 대신, §37 재미 평가의 "레벨업이
## 의미가 있는가?"에 답할 만큼만 — 경험치를 모으면 부대 레벨이 오르고
## 그만큼 공격력/방어력이 조금씩 더 붙는다(EXP_PER_LEVEL마다 1레벨).

signal power_changed(atk: float, def: float)

const BASE_ATK := 60.0
const BASE_DEF := 35.0
const ATK_PER_MEMBER := 18.0
const DEF_PER_MEMBER := 10.0

const EXP_PER_LEVEL := 100.0
const ATK_PER_LEVEL := 4.0
const DEF_PER_LEVEL := 2.0

var members: Array[String] = []
var exp: float = 0.0
var level: int = 0
var atk: float = BASE_ATK
var def: float = BASE_DEF


func recruit(id: String) -> void:
	members.append(id)
	_recompute()
	power_changed.emit(atk, def)


## 사건 보상(고대 비문을 읽는다·부상병을 돌본다·적을 물리친다 등)이
## 경험치를 쌓는 유일한 통로다 — 걷기·시간 경과로는 안 오른다.
## 천후(weather.gd)가 이 보상에 보너스를 건다(웹판 weather.js의 expPct와
## 같은 자리 — 이 판엔 포획·스폰 계열이 없어 exp만 옮겼다).
func add_exp(amount: float) -> void:
	if amount <= 0.0:
		return
	exp += amount * Weather.exp_bonus_mul()
	_recompute()
	power_changed.emit(atk, def)


## save_state.gd가 저장 파일을 불러온 뒤 여기로 넘긴다 — recruit()·add_exp()와
## 다르게 이미 정해진 값을 통째로 앉히고 수치만 다시 계산한다(신호는 한 번만).
func restore(saved_members: Array[String], saved_exp: float = 0.0) -> void:
	members = saved_members.duplicate()
	exp = saved_exp
	_recompute()
	power_changed.emit(atk, def)


func _recompute() -> void:
	level = int(exp / EXP_PER_LEVEL)
	atk = BASE_ATK + members.size() * ATK_PER_MEMBER + level * ATK_PER_LEVEL
	def = BASE_DEF + members.size() * DEF_PER_MEMBER + level * DEF_PER_LEVEL
