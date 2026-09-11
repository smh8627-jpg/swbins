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

signal power_changed(atk: float, def: float)

const BASE_ATK := 60.0
const BASE_DEF := 35.0
const ATK_PER_MEMBER := 18.0
const DEF_PER_MEMBER := 10.0

var members: Array[String] = []
var atk: float = BASE_ATK
var def: float = BASE_DEF


func recruit(id: String) -> void:
	members.append(id)
	atk = BASE_ATK + members.size() * ATK_PER_MEMBER
	def = BASE_DEF + members.size() * DEF_PER_MEMBER
	power_changed.emit(atk, def)
