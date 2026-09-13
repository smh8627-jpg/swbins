extends Node

## VERTICAL_SLICE_STORY.md 1절 완료 조건의 마지막 두 단계 — "저장한다 →
## 다시 켜서 이어진다"(GO save_state.gd·DUNGEON dungeon_save_state.gd·
## FOREST forest_save_state.gd와 같은 정신: 로컬 파일 하나, 버전 필드,
## 게임마다 완전히 분리된 세이브 파일 — DUNGEON이 세운 선례 그대로).
##
## project.godot [autoload]에 StorySaveState로 등록.
##
## 저장하는 것 — 위치 + 레벨/경험치 + 사명("첫 사냥") 진행도 정도만
## (GO/DUNGEON/FOREST와 같은 최소 범위, 1절 "제외" 목록에 없는 것은
## 애초에 저장할 상태 자체가 없다).

const SAVE_PATH := "user://save_story.json"
const SAVE_VERSION := 3  # 1→2: mats 추가, 2→3: has_weapon(장비) 추가

var level := 1
var exp := 0
var kills := 0  # data-quest.js q_first(kill 10)의 진행 카운트
var mats: Dictionary = {}  # side.js s.mats[kind] 그대로 — 필드 채집(들꽃 등) 누적
var has_weapon := false  # data-gear.js sword1(목검) 장착 여부 — 슬롯 하나뿐이라 bool로 충분


func add_kill() -> void:
	kills += 1


func add_mat(kind: String, amount: int = 1) -> void:
	mats[kind] = int(mats.get(kind, 0)) + amount


func equip_weapon() -> void:
	has_weapon = true


func quest_done() -> bool:
	return kills >= 10


func save() -> bool:
	var player := _find_player()
	if player == null:
		return false
	var data := {
		"version": SAVE_VERSION,
		"player_pos": [player.global_position.x, player.global_position.y, player.global_position.z],
		"level": level,
		"exp": exp,
		"kills": kills,
		"mats": mats,
		"has_weapon": has_weapon,
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
		return false  # 스키마가 하나뿐이라 마이그레이션 체인 없이 그냥 포기

	level = int(data.get("level", 1))
	exp = int(data.get("exp", 0))
	kills = int(data.get("kills", 0))
	var loaded_mats: Variant = data.get("mats", {})
	mats = loaded_mats if typeof(loaded_mats) == TYPE_DICTIONARY else {}
	has_weapon = bool(data.get("has_weapon", false))

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
