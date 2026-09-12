extends Node

## VERTICAL_SLICE_FOREST.md 4절 "저장/불러오기(위치+채집한 과일 개수
## 정도, GO/DUNGEON과 같은 최소 범위)". GO save_state.gd·DUNGEON
## dungeon_save_state.gd와 같은 정신(로컬 파일 하나, 버전 필드)이지만
## 파일·스키마는 완전히 분리한다 — DUNGEON이 이미 세운 "게임별 분리"
## 선례(dungeon_save_state.gd 상단 주석 참고) 그대로.
##
## project.godot [autoload]에 ForestSaveState로 등록.
##
## 2번째 확장(제외 목록 1번 — 나무 이외 채집 대상 + 진짜 하루 1회 리셋) —
## 나무 하나짜리 fruit_count(int)를 여러 채집물을 담는 items(Dictionary)로
## 바꿨다. **필드 모양 자체가 바뀌는 진짜 스키마 변경**이라(GO
## save_state.gd·DUNGEON dungeon_save_state.gd가 세운 기준과 같음 — 추가만
## 이면 버전을 안 올리지만 이건 바꿔치기다) SAVE_VERSION을 1→2로 올리고
## _migrate_step()에 옛 fruit_count 하나를 items["과일"]로 옮기는 경로를
## 처음으로 채웠다.

const SAVE_PATH := "user://save_forest.json"
const SAVE_VERSION := 2

var items: Dictionary = {}  # item_label(String) -> count(int)

## prop_id(String) -> day_key(int, ForestDay.today_key()). 웹판
## village.js의 st().used와 같은 뜻 — "이 채집 대상을 마지막으로 쓴 날".
var used: Dictionary = {}


func can_gather(prop_id: String) -> bool:
	return int(used.get(prop_id, -1)) != ForestDay.today_key()


func mark_gathered(prop_id: String) -> void:
	used[prop_id] = ForestDay.today_key()


func add_item(item_label: String, amount: int) -> void:
	items[item_label] = int(items.get(item_label, 0)) + amount


func total_items() -> int:
	var total := 0
	for v in items.values():
		total += int(v)
	return total


func save() -> bool:
	var player := _find_player()
	if player == null:
		return false
	var data := {
		"version": SAVE_VERSION,
		"player_pos": [player.global_position.x, player.global_position.y, player.global_position.z],
		"items": items,
		"used": used,
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
	var migrated: Variant = _migrate(parsed)
	if migrated == null:
		return false
	var data: Dictionary = migrated

	var loaded_items: Variant = data.get("items", {})
	items = loaded_items if typeof(loaded_items) == TYPE_DICTIONARY else {}
	var loaded_used: Variant = data.get("used", {})
	used = loaded_used if typeof(loaded_used) == TYPE_DICTIONARY else {}

	var pos: Array = data.get("player_pos", [])
	if pos.size() != 3:
		return false
	var player := _find_player()
	if player != null:
		player.global_position = Vector3(float(pos[0]), float(pos[1]), float(pos[2]))
	return true


## GO save_state.gd·DUNGEON dungeon_save_state.gd와 완전히 같은 계약 —
## 버전이 낮으면 _migrate_step()을 한 단계씩 적용, 경로가 없거나(null)
## 이 빌드보다 나중 버전(다운그레이드)이면 null.
func _migrate(data: Dictionary) -> Variant:
	var version := int(data.get("version", 0))
	while version < SAVE_VERSION:
		var stepped: Variant = _migrate_step(version, data)
		if stepped == null:
			return null
		data = stepped
		version = int(data.get("version", version + 1))
	if version > SAVE_VERSION:
		return null
	return data


func _migrate_step(from_version: int, data: Dictionary) -> Variant:
	match from_version:
		1:
			## 나무 하나뿐이던 시절의 fruit_count를 items["과일"]로.
			data["items"] = {"과일": int(data.get("fruit_count", 0))}
			data["used"] = {}
			data.erase("fruit_count")
			data["version"] = 2
			return data
		_:
			return null


func _find_player() -> Node3D:
	var found := get_tree().get_nodes_in_group("player")
	return found[0] if found.size() > 0 else null
