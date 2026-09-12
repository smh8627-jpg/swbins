extends Label

## VERTICAL_SLICE_STORY.md 1절 사명 — data-quest.js q_first("첫 사냥",
## kill 10) 진행도를 상시 표시한다. GO party_label.gd·FOREST
## gather_label.gd와 같은 폴링 패턴(값이 바뀌는 곳이 story_enemy.gd
## 하나뿐이라도 폴링이 신호 배선보다 단순하다, master.md 33장).

func _process(_delta: float) -> void:
	var done := StorySaveState.quest_done()
	text = "🗡️ 첫 사냥 %d/10%s" % [mini(StorySaveState.kills, 10), " — 완료!" if done else ""]
