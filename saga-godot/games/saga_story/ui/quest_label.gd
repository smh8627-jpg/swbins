extends Label

## VERTICAL_SLICE_STORY.md 1절 사명 — data-quest.js q_first(kill 10)·
## q_gather1(약초 캐기, gather 15) 진행도를 상시 표시한다. 원작은 q_gather1에
## need:2(레벨2)가 걸려 있지만 이 슬라이스엔 레벨링 자체가 없어(항상
## 레벨1, story_combat.gd START_HP 주석 참고) need를 안 가린다 — q_first와
## 같이 처음부터 진행된다. GO party_label.gd·FOREST gather_label.gd와 같은
## 폴링 패턴(값이 바뀌는 곳이 여럿이라도 폴링이 신호 배선보다 단순하다).

func _process(_delta: float) -> void:
	var kill_done := StorySaveState.quest_done()
	var gather_done := StorySaveState.gather_quest_done()
	text = "🗡️ 첫 사냥 %d/10%s\n🌼 약초 캐기 %d/15%s" % [
		mini(StorySaveState.kills, 10), " — 완료!" if kill_done else "",
		mini(StorySaveState.gathered_total(), 15), " — 완료!" if gather_done else "",
	]
