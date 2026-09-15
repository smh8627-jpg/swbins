extends Label

## story_combat.gd TITLES/title_for() 참고 — 그동안 쌓이기만 하고 어디서도
## 안 읽히던 StorySaveState.feat(공적)에 처음으로 화면 표시를 준다.
## gold_label.gd·level_label.gd와 같은 폴링 패턴.

const StoryCombat := preload("res://games/saga_story/data/story_combat.gd")


func _process(_delta: float) -> void:
	text = "🎖️ %s" % StoryCombat.title_for(StorySaveState.feat)
