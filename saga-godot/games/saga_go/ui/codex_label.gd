extends Label

## VERTICAL_SLICE.md §26 "발견 도감 5갈래" — PartyLabel·QuestLabel과 같은
## 경계(상시 표시, 토스트 아님). CodexState(자동 로드 싱글턴)의 신호를
## 직접 구독한다. 세부 목록(어떤 지역·인물을 아직 못 봤는지)을 보여주는
## 화면은 이번 범위 밖 — "발견했다는 사실 자체가 계속 쌓인다"는 느낌만
## 먼저 채운다(다른 사건들과 같은 최소 구현 원칙).

func _ready() -> void:
	_refresh()
	CodexState.codex_changed.connect(_refresh)

func _refresh() -> void:
	text = "📖 발견 %d/%d" % [CodexState.count(), CodexState.total()]
