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
## PLAN.md 101-2 GO ②"승급 3택" — 레벨이 실제로 오를 때만 emit(로드로
## 옛 레벨을 앉히는 restore()는 emit 안 함, 그 경위는 add_exp()·recruit()
## 쪽 주석 참고).
signal level_up(new_level: int)

const Perks := preload("res://games/saga_go/data/perks.gd")

const BASE_ATK := 60.0
const BASE_DEF := 35.0
const ATK_PER_MEMBER := 18.0
const DEF_PER_MEMBER := 10.0

const EXP_PER_LEVEL := 100.0
const ATK_PER_LEVEL := 4.0
const DEF_PER_LEVEL := 2.0

## 승급 3택 거절 보상 — 웹판 "단사 10"(재화)에 대응하나 이 판엔 재화가
## 없어 경험치로 갈아탔다.
const REJECT_EXP := 20.0

var members: Array[String] = []
var exp: float = 0.0
var level: int = 0
var atk: float = BASE_ATK
var def: float = BASE_DEF
var perks: Array[String] = []

var _session_start_exp: float = 0.0


## PLAN.md 101-4 "이번 세션" 줄의 기준점 — test_village.gd가 SaveState.
## try_load()(그러니까 restore()가 이미 exp를 앉힌) 뒤에 부른다. 그 전에
## 부르면 세션 델타가 로드 전 값(보통 0)을 기준으로 잡혀 "이번 세션에
## 이만큼 벌었다"가 실제로는 세이브를 불러오기 전부터의 누적으로 부풀어
## 보인다.
func begin_session() -> void:
	_session_start_exp = exp


func session_exp_gained() -> float:
	return exp - _session_start_exp


func recruit(id: String) -> void:
	members.append(id)
	var old_level := level
	_recompute()
	power_changed.emit(atk, def)
	if level > old_level:
		level_up.emit(level)


## 사건 보상(고대 비문을 읽는다·부상병을 돌본다·적을 물리친다 등)이
## 경험치를 쌓는 유일한 통로다 — 걷기·시간 경과로는 안 오른다.
## 천후(weather.gd)가 이 보상에 보너스를 건다(웹판 weather.js의 expPct와
## 같은 자리 — 이 판엔 포획·스폰 계열이 없어 exp만 옮겼다). "보" 축
## 특성(101-2)이 여기 더 얹인다.
func add_exp(amount: float) -> void:
	if amount <= 0.0:
		return
	exp += amount * Weather.exp_bonus_mul() * (1.0 + _support_bonus())
	var old_level := level
	_recompute()
	power_changed.emit(atk, def)
	if level > old_level:
		level_up.emit(level)


## save_state.gd가 저장 파일을 불러온 뒤 여기로 넘긴다 — recruit()·add_exp()와
## 다르게 이미 정해진 값을 통째로 앉히고 수치만 다시 계산한다(신호는 한 번만,
## level_up 은 안 emit — 로드는 새 성장이 아니다).
func restore(saved_members: Array[String], saved_exp: float = 0.0, saved_perks: Array[String] = []) -> void:
	members = saved_members.duplicate()
	exp = saved_exp
	perks = saved_perks.duplicate()
	_recompute()
	power_changed.emit(atk, def)


## level_up 카드에서 고른 특성을 확정한다(games/saga_go/ui나 test_village.gd가
## 부른다 — party_state.gd는 카드 UI를 모른다, codex_state.gd discover()와
## 같은 경계).
func add_perk(id: String) -> void:
	if not perks.has(id):
		perks.append(id)
	_recompute()
	power_changed.emit(atk, def)


func _support_bonus() -> float:
	var bonus := 0.0
	for pid in perks:
		var p: Dictionary = Perks.find(pid)
		if not p.is_empty() and p.axis == "support":
			bonus += float(p.mul)
	return bonus


func _recompute() -> void:
	level = int(exp / EXP_PER_LEVEL)
	var atk_mul := 1.0
	var def_mul := 1.0
	for pid in perks:
		var p: Dictionary = Perks.find(pid)
		if p.is_empty():
			continue
		if p.axis == "attack":
			atk_mul += float(p.mul)
		elif p.axis == "defense":
			def_mul += float(p.mul)
	atk = (BASE_ATK + members.size() * ATK_PER_MEMBER + level * ATK_PER_LEVEL) * atk_mul
	def = (BASE_DEF + members.size() * DEF_PER_MEMBER + level * DEF_PER_LEVEL) * def_mul
