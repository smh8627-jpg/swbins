extends Node3D

## VERTICAL_SLICE_STORY.md 1절 — field_map.gd 머리말이 "문(portal)·채집·
## 보스는 이번 슬라이스에 안 옮긴다"고 적어 뒀던 셋의 마지막. data-side.js
## field.boss(황건 두목, cool:15분) 그대로 — 잡으면 BOSS_COOL_SEC 뒤
## 같은 자리에 다시 선다(story_gather.gd의 respawn과 같은 결, 다만
## 대상이 하나뿐이라 킬 시그널로 다음 스폰을 잇는다).

const FieldMap := preload("res://games/saga_story/data/field_map.gd")
const StoryCombat := preload("res://games/saga_story/data/story_combat.gd")
const StoryEnemyScene := preload("res://games/saga_story/world/story_enemy.gd")

const GROUND_Y := 0.0


func _ready() -> void:
	_spawn_boss()


func _spawn_boss() -> void:
	var boss := Node3D.new()
	boss.set_script(StoryEnemyScene)
	boss.is_boss = true  # _ready()보다 먼저 잡아야 한다(add_child가 곧바로 _ready를 부른다)
	boss.position = Vector3(FieldMap.boss_position_m(), GROUND_Y, 0)
	add_child(boss)
	boss.died.connect(_on_boss_died)


func _on_boss_died() -> void:
	get_tree().create_timer(StoryCombat.BOSS_COOL_SEC).timeout.connect(_spawn_boss)
