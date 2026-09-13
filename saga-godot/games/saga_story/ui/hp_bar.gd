extends ProgressBar

## VERTICAL_SLICE_STORY.md — 잡졸 반격(2026-09-13)이 들어오면서 플레이어
## hp가 실제로 깎이게 됐다. mp_bar.gd와 같은 폴링 패턴(player.gd에 신호를
## 새로 안 뚫는다) — player.hp/max_hp를 그대로 읽는다.

const StoryCombat := preload("res://games/saga_story/data/story_combat.gd")


func _ready() -> void:
	min_value = 0.0
	max_value = StoryCombat.START_HP
	show_percentage = false


func _process(_delta: float) -> void:
	var players := get_tree().get_nodes_in_group("player")
	if players.is_empty():
		return
	max_value = float(players[0].max_hp)
	value = float(players[0].hp)
