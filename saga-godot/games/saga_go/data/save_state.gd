extends Node

## VERTICAL_SLICE.md 26절 "저장/로드(로컬 파일 하나)" — 12단계 완료 조건의
## 마지막 단계. PLAN.md 28장은 레벨·경험치·장비·인벤토리·퀘스트·월드
## 상태까지 저장하라고 하지만 그중 이 슬라이스에 실제로 있는 상태는
## 플레이어 위치와 부대(PartyState)뿐이다 — 없는 시스템을 저장하는 코드는
## 만들지 않는다. 28장이 요구하는 "버전 필드"와 PLAN.md Phase 9(97단계)
## "Data Versioning"은 아래 _migrate_step()으로 지킨다.
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
		"party_exp": PartyState.exp,
		"quest_active_id": QuestState.active_id,
		"quest_active_name": QuestState.active_name,
		"quest_done": QuestState.done,
		"quest_offered": QuestState.offered,
	}
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(data))
	return true


## 저장 파일이 있으면 부대·플레이어 위치에 적용하고 true, 없거나
## 마이그레이션 경로가 없거나 깨져 있으면 아무것도 바꾸지 않고 false
## (새 게임 취급).
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

	var members: Array[String] = []
	for m in data.get("party_members", []):
		members.append(str(m))
	## party_exp도 §31 이후 추가된 필드다 — 없으면 0.0(경험치 없음)으로
	## 안전하게 채워진다, 위 quest_* 필드와 같은 경계(마이그레이션 불필요).
	PartyState.restore(members, float(data.get("party_exp", 0.0)))

	var pos: Array = data.get("player_pos", [])
	var player := _find_player()
	if player != null and pos.size() == 3:
		player.global_position = Vector3(float(pos[0]), float(pos[1]), float(pos[2]))

	## 이 세 필드는 §31에서 새로 추가됐다 — 그 전에 저장된 파일엔 아예 없다.
	## 값이 없어도 기본값(빈 사명·안 물어본 목록)으로 안전하게 채워지므로
	## SAVE_VERSION을 올리는 마이그레이션은 필요 없다(추가만 있고 기존 필드
	## 모양은 안 바뀌었다).
	var offered: Array[String] = []
	for id in data.get("quest_offered", []):
		offered.append(str(id))
	QuestState.restore(
		str(data.get("quest_active_id", "")),
		str(data.get("quest_active_name", "")),
		bool(data.get("quest_done", false)),
		offered
	)
	return true


## data의 "version"이 SAVE_VERSION보다 낮으면 _migrate_step()을 한 단계씩
## 적용해 최신 모양으로 바꿔 돌려준다(딱 맞으면 그대로). 마이그레이션
## 경로가 없거나(_migrate_step이 null을 돌려줌) 이 빌드보다 나중 버전
## (다운그레이드)이면 null — 데이터를 반쯤 바꾼 채로 적용하지 않는다.
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


## 버전 from_version에서 온 data를 from_version+1 모양으로 바꿔 돌려준다.
## 등록된 경로가 없으면 null. 지금은 SAVE_VERSION이 1뿐이라 등록된
## 마이그레이션이 없다 — 스키마를 실제로 바꿀 때(필드 추가·이름 변경 등)
## SAVE_VERSION을 올리고 여기 match에 그 버전 분기를 추가하면 된다(예:
## `1: data["new_field"] = ...; data["version"] = 2; return data`).
func _migrate_step(from_version: int, data: Dictionary) -> Variant:
	match from_version:
		_:
			return null


func _find_player() -> Node3D:
	var found := get_tree().get_nodes_in_group("player")
	return found[0] if found.size() > 0 else null
