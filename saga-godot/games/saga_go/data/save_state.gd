extends Node

## VERTICAL_SLICE.md 26절 "저장/로드(로컬 파일 하나)" — 12단계 완료 조건의
## 마지막 단계. PLAN.md 28장은 레벨·경험치·장비·인벤토리·퀘스트·월드
## 상태까지 저장하라고 하지만 그중 이 슬라이스에 실제로 있는 상태는
## 플레이어 위치와 부대(PartyState)뿐이다 — 없는 시스템을 저장하는 코드는
## 만들지 않는다. 28장이 요구하는 "버전 필드"만 그대로 지킨다.
##
## project.godot [autoload]에 SaveState로 등록된 싱글턴.

const SAVE_PATH := "user://save.json"
const SAVE_VERSION := 1


func save() -> bool:
	var player := _find_player()
	if player == null:
		return false
	var data := {
		"version": SAVE_VERSION,
		"player_pos": [player.global_position.x, player.global_position.y, player.global_position.z],
		"party_members": PartyState.members,
	}
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(data))
	return true


## 저장 파일이 있으면 부대·플레이어 위치에 적용하고 true, 없거나
## 버전이 안 맞거나 깨져 있으면 아무것도 바꾸지 않고 false(새 게임 취급).
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
		## 지금은 마이그레이션 없이 그냥 무시한다 — Data Versioning은
		## PLAN.md Phase 9(97단계) 몫, 아직 안 만듦.
		return false

	var members: Array[String] = []
	for m in data.get("party_members", []):
		members.append(str(m))
	PartyState.restore(members)

	var pos: Array = data.get("player_pos", [])
	var player := _find_player()
	if player != null and pos.size() == 3:
		player.global_position = Vector3(float(pos[0]), float(pos[1]), float(pos[2]))
	return true


func _find_player() -> Node3D:
	var found := get_tree().get_nodes_in_group("player")
	return found[0] if found.size() > 0 else null
