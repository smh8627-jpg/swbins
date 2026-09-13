extends ProgressBar

## VERTICAL_SLICE_STORY.md 4절 — 횡소·기탄·기합이 MP를 쓰게 되면서 "MP가
## 있어야 쓴다"는 감각을 눈으로 확인할 길이 없었다(4절 GUI 실기 확인
## 메모: "MP를 보여줄 HUD가 없어 손맛 체감이 눈에 안 보인다"). quest_
## label.gd와 같은 폴링 패턴 — player.gd에 신호를 새로 안 뚫는다.

const StoryCombat := preload("res://games/saga_story/data/story_combat.gd")


func _ready() -> void:
	min_value = 0.0
	max_value = StoryCombat.MP_MAX
	show_percentage = false


## **2026-09-13 추가 — 전직(방사 jb.mp+40) 반영.** max_value도 player.
## max_mp를 그대로 따라간다(hp_bar.gd가 max_hp를 따라가는 것과 같은 결).
func _process(_delta: float) -> void:
	var players := get_tree().get_nodes_in_group("player")
	if players.is_empty():
		return
	max_value = float(players[0].max_mp)
	value = float(players[0].mp)
