extends Node3D

## VERTICAL_SLICE_STORY.md 1절 — <map>.enemy_positions_m()의 고정 자리
## 셋에 잡졸(story_enemy.gd)을 하나씩 세운다. 원작 spawnEnemy()의
## 무작위 리스폰은 "제외" 목록(day/파도 시스템 자체가 이번 슬라이스
## 밖)이라, 한 번 세우고 그걸로 끝 — 다 잡으면 "첫 사냥" 사명만 남는다.
##
## **2026-09-13 추가 — 사냥터 공용화(21절, story_terrain_builder.gd와
## 같은 결).** field 전용으로 FieldMap을 상수 preload하던 것을 `map_path`
## export로 바꿨다 — 새 사냥터를 추가할 때 이 파일을 복제하지 않는다.

@export var map_path: String = "res://games/saga_story/data/field_map.gd"

const StoryEnemyScene := preload("res://games/saga_story/world/story_enemy.gd")

const GROUND_Y := 0.0


func _ready() -> void:
	var map: RefCounted = (load(map_path) as GDScript).new()
	for x: float in map.enemy_positions_m():
		var enemy := Node3D.new()
		enemy.set_script(StoryEnemyScene)
		enemy.position = Vector3(x, GROUND_Y, 0)
		add_child(enemy)
