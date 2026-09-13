extends Node3D

## VERTICAL_SLICE_STORY.md 1절 — field_map.gd 머리말이 "문(portal)·채집·
## 보스는 이번 슬라이스에 안 옮긴다"고 적어 뒀던 셋의 마지막. data-side.js
## field.boss(황건 두목, cool:15분) 그대로 — 잡으면 BOSS_COOL_SEC 뒤
## 같은 자리에 다시 선다(story_gather.gd의 respawn과 같은 결, 다만
## 대상이 하나뿐이라 킬 시그널로 다음 스폰을 잇는다).
##
## **2026-09-13 추가 — 사냥터 공용화(21절)** — story_enemy_spawner.gd와
## 같은 이유로 `map_path` export로 바꿨다(보스 이름은 아직 화면에 안
## 띄운다 — field_map.gd BOSS_NAME 머리말 참고, 위치만 옮긴다).
##
## **2026-09-13 추가(같은 날 더) — 사냥터별 보스 배율.** hp_mul·dmg_mul·
## cool_sec을 더 이상 StoryCombat 전역 상수(field 값 하나뿐)로 안 쓰고
## 각 맵의 boss_hp_mul()/boss_dmg_mul()/boss_cool_sec()에서 읽는다
## (field/forest/cave/gorge 넷 다 정의돼 있다 — data-side.js 원문 그대로).

@export var map_path: String = "res://games/saga_story/data/field_map.gd"

const StoryEnemyScene := preload("res://games/saga_story/world/story_enemy.gd")

const GROUND_Y := 0.0

var _map: RefCounted


func _ready() -> void:
	_map = (load(map_path) as GDScript).new()
	_spawn_boss()


func _spawn_boss() -> void:
	var boss := Node3D.new()
	boss.set_script(StoryEnemyScene)
	boss.is_boss = true  # _ready()보다 먼저 잡아야 한다(add_child가 곧바로 _ready를 부른다)
	boss.boss_hp_mul = _map.boss_hp_mul()
	boss.boss_dmg_mul = _map.boss_dmg_mul()
	boss.position = Vector3(_map.boss_position_m(), GROUND_Y, 0)
	add_child(boss)
	boss.died.connect(_on_boss_died)


func _on_boss_died() -> void:
	get_tree().create_timer(_map.boss_cool_sec()).timeout.connect(_spawn_boss)
