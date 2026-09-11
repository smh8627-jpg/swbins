extends Label

## VERTICAL_SLICE.md 31절 "퀘스트 로그" 최소 구현. party_label.gd와 같은
## 경계 — 잠깐 뜨는 토스트(dialogue_label)가 아니라 상시 표시되는 줄이라,
## 사명을 맡았는지·끝냈는지가 화면에 계속 남는다. QuestState(자동 로드
## 싱글턴)의 신호를 직접 구독한다.

func _ready() -> void:
	_refresh()
	QuestState.quest_changed.connect(_refresh)

func _refresh() -> void:
	if QuestState.active_id == "":
		text = ""
	elif QuestState.done:
		text = "📋 사명 완료: " + QuestState.active_name
	else:
		text = "📋 사명: " + QuestState.active_name
