extends Node

## VERTICAL_SLICE_FOREST.md 4절 "저장/불러오기(위치+채집한 과일 개수
## 정도, GO/DUNGEON과 같은 최소 범위)". GO save_state.gd·DUNGEON
## dungeon_save_state.gd와 같은 정신(로컬 파일 하나, 버전 필드)이지만
## 파일·스키마는 완전히 분리한다 — DUNGEON이 이미 세운 "게임별 분리"
## 선례(dungeon_save_state.gd 상단 주석 참고) 그대로.
##
## SAVE_VERSION이 아직 1뿐이라 GO/DUNGEON의 _migrate()/_migrate_step()
## 체인은 없다 — 스키마를 실제로 바꿀 때(필드 모양이 바뀌는 진짜 변경)
## 그 두 파일과 같은 패턴을 추가하면 된다.
##
## project.godot [autoload]에 ForestSaveState로 등록.

const SAVE_PATH := "user://save_forest.json"
const SAVE_VERSION := 1

var fruit_count := 0


func save() -> bool:
	var player := _find_player()
	if player == null:
		return false
	var data := {
		"version": SAVE_VERSION,
		"player_pos": [player.global_position.x, player.global_position.y, player.global_position.z],
		"fruit_count": fruit_count,
	}
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(data))
	return true


func try_load() -> bool:
	if not FileAccess.file_exists(SAVE_PATH):
		return false
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f == null:
		return false
	var parsed: Variant = JSON.parse_string(f.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		return false
	var data: Dictionary = parsed
	if int(data.get("version", 0)) != SAVE_VERSION:
		return false  # 아직 마이그레이션 경로가 없다(위 주석 참고)

	fruit_count = int(data.get("fruit_count", 0))
	var pos: Array = data.get("player_pos", [])
	if pos.size() != 3:
		return false
	var player := _find_player()
	if player != null:
		player.global_position = Vector3(float(pos[0]), float(pos[1]), float(pos[2]))
	return true


func _find_player() -> Node3D:
	var found := get_tree().get_nodes_in_group("player")
	return found[0] if found.size() > 0 else null
