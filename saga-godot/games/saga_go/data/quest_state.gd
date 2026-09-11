extends Node

## VERTICAL_SLICE.md 31절 — "마을의 부탁" 같은 새 사건 유형 + 퀘스트 로그
## 최소 구현. 웹판 js/quest.js는 진행형(단계별 progress) 사명을 여러 개
## 동시에 든다 — 이번 슬라이스는 그 전체를 옮기지 않는다. 지금 필요한 건
## "사명 하나를 맡고, 무언가를 해내면 끝난다"는 loop 하나뿐이라
## **동시에 하나만** 든다. project.godot [autoload]에 QuestState로 등록된
## 싱글턴.

signal quest_changed

var active_id: String = ""
var active_name: String = ""
var done: bool = false

## 한 번 제안했던 사명 id 목록(수락·거절 상관없이) — NPC가 같은 사명을
## 두 번 다시 안 내놓게 하는 데만 쓴다.
var offered: Array[String] = []


func has_been_offered(id: String) -> bool:
	return offered.has(id)


func accept(id: String, display_name: String) -> void:
	if not offered.has(id):
		offered.append(id)
	active_id = id
	active_name = display_name
	done = false
	quest_changed.emit()


func decline(id: String) -> void:
	if not offered.has(id):
		offered.append(id)


func complete(id: String) -> void:
	if active_id != id or done:
		return
	done = true
	quest_changed.emit()


## save_state.gd가 저장 파일을 불러온 뒤 여기로 넘긴다(party_state.gd의
## restore()와 같은 경계 — 신호는 한 번만 쏜다).
func restore(saved_active_id: String, saved_active_name: String, saved_done: bool, saved_offered: Array[String]) -> void:
	active_id = saved_active_id
	active_name = saved_active_name
	done = saved_done
	offered = saved_offered.duplicate()
	quest_changed.emit()
