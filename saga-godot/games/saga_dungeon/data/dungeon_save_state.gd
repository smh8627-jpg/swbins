extends Node

## VERTICAL_SLICE_DUNGEON.md 완료 조건의 마지막 단계 — "저장한다 → 다시
## 켜서 이어진다". GO의 save_state.gd와 같은 정신(로컬 파일 하나, 버전
## 필드)이지만 **파일·스키마를 완전히 분리한다** — PartyState/SaveState는
## GO 전용 형태(플레이어 위치+등용 인원)라 그대로 못 쓴다는 게
## 2026-09-12⑫ 조사 때 이미 나온 결론이었다. 공용 세이브 스키마로 합칠지는
## 아직 미결(LEGACY_FEATURE_AUDIT.md 4장)이지만, 파일을 분리해 두면 지금
## 당장 서로 안 건드리는 것만은 확실하고 나중에 합치기도 어렵지 않다.
##
## project.godot [autoload]에 DungeonSaveState로 등록.

const SAVE_PATH := "user://save_dungeon.json"
const SAVE_VERSION := 1

var room_cleared := false
var player_pos := Vector3.ZERO


func save(player: Node3D, cleared: bool) -> void:
	room_cleared = cleared
	player_pos = player.global_position
	var data := {
		"version": SAVE_VERSION,
		"room_cleared": room_cleared,
		"player_pos": [player_pos.x, player_pos.y, player_pos.z],
	}
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(data))


## GO의 save_state.gd::try_load()와 같은 계약 — 있으면 읽어서 true,
## 없거나 버전이 안 맞으면 false(안전하게 포기, 마이그레이션은 이번
## 슬라이스 범위 밖 — 스키마가 SAVE_VERSION 1 하나뿐이다).
func try_load() -> bool:
	if not FileAccess.file_exists(SAVE_PATH):
		return false
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f == null:
		return false
	var parsed: Variant = JSON.parse_string(f.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY or parsed.get("version") != SAVE_VERSION:
		return false
	room_cleared = parsed.get("room_cleared", false)
	var p: Array = parsed.get("player_pos", [0.0, 0.0, 0.0])
	player_pos = Vector3(p[0], p[1], p[2])
	return true
