extends Label

## VERTICAL_SLICE_STORY.md 4절 "제외" 목록 "전직 트리"의 첫 걸음 —
## 레벨/경험치. quest_label.gd·gold_label.gd와 같은 폴링 패턴.

const StoryCombat := preload("res://games/saga_story/data/story_combat.gd")


func _process(_delta: float) -> void:
	var need := StoryCombat.exp_need(StorySaveState.level)
	text = "⭐ Lv.%d (%d/%d)" % [StorySaveState.level, StorySaveState.exp, need]
