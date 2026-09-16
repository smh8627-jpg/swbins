extends Label

## 표준 A "목표판 3줄"(지금·이번 세션·이번 주, PLAN.md 101-1·101-4) —
## party_label.gd·quest_label.gd와 같은 경계: 다섯 판 HUD 에 같은
## 스크립트를 붙인 Label 하나를 둔다. 이 스크립트는 codex_state.gd의
## discover()처럼 무엇을 보여줄지 모른다 — saga_core 는 개별 판의
## QuestState·CodexState 같은 싱글턴을 모르니, 판별 *_state.gd 가
## set_goals()를 불러 3줄을 채운다(그룹 "goal_board"로 이 노드를 찾는다).
## 아직 안 부른 판은 빈 줄 그대로다("만든 판만 켠다" — DUNGEON·REALM 등).

func _ready() -> void:
	add_to_group("goal_board")
	text = ""


func set_goals(now: String, session: String, week: String) -> void:
	text = "🎯 %s\n⏱ %s\n📅 %s" % [now, session, week]
