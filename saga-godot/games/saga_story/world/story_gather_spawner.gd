extends Node3D

## VERTICAL_SLICE_STORY.md 1절 — <map>.gather_positions_m()의 고정 자리
## 셋에 story_gather.gd(들꽃 등)를 하나씩 세운다. story_enemy_spawner.gd
## 와 같은 패턴(고정 자리, 무작위 없음).
##
## **2026-09-13 추가 — 사냥터 공용화(21절)** — story_enemy_spawner.gd와
## 같은 이유로 `map_path` export로 바꿨다.

@export var map_path: String = "res://games/saga_story/data/field_map.gd"

const StoryGatherScene := preload("res://games/saga_story/world/story_gather.gd")

const GROUND_Y := 0.0


func _ready() -> void:
	var map: RefCounted = (load(map_path) as GDScript).new()
	for g: Dictionary in map.gather_positions_m():
		var gather := Node3D.new()
		gather.set_script(StoryGatherScene)
		gather.position = Vector3(float(g.x), GROUND_Y, 0)
		gather.kind = String(g.kind)  # _ready()보다 먼저 잡아야 한다(add_child가 곧바로 _ready를 부른다)
		add_child(gather)
