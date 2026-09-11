extends Node

## VERTICAL_SLICE.md §26이 "발견 도감 5갈래"로 미뤄 뒀던 것 — 웹판
## js/codex.js("본 것에 도장을 찍고 세는 일, 목록을 새로 만들지 않는다")를
## 그대로 옮긴다. 이 스크립트는 각 갈래에 **무엇이 있는지**는 안 들고
## 있다 — discover()를 부르는 쪽(landmarks_builder.gd·npc_builder.gd·
## animal_builder.gd·bandit_encounter.gd·simple_event.gd·hero_encounter.gd)
## 이 각자 "이걸 봤다"는 사실만 여기 도장 찍는다.
##
## 웹판 KINDS는 지역/사람/생물/사건/역사 다섯이다. 이 판에선 "역사"를
## event.record(사건이 남기는 별도 기록 문구) 대신 **역사 인물 조우**로
## 채웠다 — GO의 정체성 자체가 "역사 인물로 노는" 것이라(루트 CLAUDE.md)
## 그쪽이 "역사" 갈래의 취지에 더 맞는다고 판단했다(웹판 그대로 옮긴 게
## 아니라는 것을 밝혀 둔다).
##
## project.godot [autoload]에 CodexState로 등록된 싱글턴.

signal codex_changed

## 웹판 REWARD 테이블(codex.js) 그대로 — gold는 이 판에 재화 시스템이
## 없어 뺐다(다른 사건들과 같은 경계, PartyState.add_exp만 있다).
const REWARD := {
	"place": 12.0,
	"people": 8.0,
	"beast": 6.0,
	"event": 10.0,
	"record": 14.0,
}

## 갈래별 총 개수 — 지금 있는 Vertical Slice 지역(11×11) 기준 실제
## 개수다. 웹판처럼 목록 함수를 두지 않고 상수로 뒀다 — 지역이 하나뿐인
## 지금은 그걸로 충분하고, 지역이 늘면 그때 목록화한다(추측성 확장 방지).
const TOTAL := {
	"place": 5,   # 굴 입구·마을·폐허·다리·옛 사당
	"people": 2,  # 마을 촌장·떠돌이 상인
	"beast": 3,   # 사슴·까치·잉어
	"event": 11,  # 도적의 습격·도적 두목·부상병·비문·지도조각·약초·
	              # 사라진 아이·늑대 무리·정찰병·마을의 부탁·길 위의 상인
	"record": 2,  # 해장(이순신 오마주)·현책(제갈량 오마주)
}

var book: Dictionary = {}


## 처음 본 것에 도장을 찍는다. 처음일 때만 true를 준다 — 두 번째부터는
## 아무 일도 안 일어나니 지나갈 때마다 불러도 안전하다(웹판 discover()와
## 같은 계약).
func discover(kind: String, id: String) -> bool:
	if not TOTAL.has(kind):
		push_warning("CodexState: unknown kind " + kind)
		return false
	var key := kind + ":" + id
	if book.has(key):
		return false
	book[key] = true
	var reward: float = REWARD.get(kind, 0.0)
	if reward > 0.0:
		PartyState.add_exp(reward)
	codex_changed.emit()
	return true


func has(kind: String, id: String) -> bool:
	return book.has(kind + ":" + id)


func count() -> int:
	return book.size()


func total() -> int:
	var sum := 0
	for v in TOTAL.values():
		sum += v
	return sum


## save_state.gd가 저장 파일을 불러온 뒤 여기로 넘긴다(party_state.gd의
## restore()와 같은 경계).
func restore(saved_book: Dictionary) -> void:
	book = saved_book.duplicate()
	codex_changed.emit()
