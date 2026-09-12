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
const SAVE_VERSION := 2

## "제외" 목록 2번(여러 방 연결) — 방 하나짜리 `room_cleared: bool`을
## 방마다 하나씩인 `rooms_cleared: Array[bool]`로 바꿨다. 기존 필드의
## "모양"이 바뀌는 진짜 스키마 변경이라(GO save_state.gd의 기준과 같음
## — 추가만이면 버전을 안 올리지만 이건 바꿔치기다) SAVE_VERSION을 1→2로
## 올리고 아래 `_migrate_step()`에 옛 `room_cleared` 하나를
## `rooms_cleared[0]`로 옮기는 경로를 처음으로 채웠다.
var rooms_cleared: Array[bool] = []
var player_pos := Vector3.ZERO


func is_room_cleared(index: int) -> bool:
	return index < rooms_cleared.size() and rooms_cleared[index]


func mark_room_cleared(index: int) -> void:
	while rooms_cleared.size() <= index:
		rooms_cleared.append(false)
	rooms_cleared[index] = true


func save(player: Node3D) -> void:
	player_pos = player.global_position
	var data := {
		"version": SAVE_VERSION,
		"rooms_cleared": rooms_cleared,
		"player_pos": [player_pos.x, player_pos.y, player_pos.z],
		## §"제외" 1번(은사) — GO의 save_state.gd와 같은 경계(순수 추가
		## 필드는 SAVE_VERSION을 안 올린다, 없으면 빈 Dictionary로 안전하게
		## 채워짐).
		"boons": DungeonRunState.boons,
		## §"제외" 3번(장비 등급+접사) — 같은 경계, 순수 추가 필드.
		"weapon": DungeonEquipmentState.weapon,
		## §"제외" 2번(소켓+부문어·투장·내구) — 부적(charm)도 무기와 같은
		## 경계(순수 추가 필드). 소켓(sock)·내구(dur)·세트(set)는 weapon/
		## charm 안에 이미 들어 있어 따로 안 적는다(item Dictionary 그대로
		## 저장). 부문(룬) 주머니는 별도 최상위 필드.
		"charm": DungeonEquipmentState.charm,
		"runes": DungeonMaterialsState.rune_counts,
		## §"제외" 3번(행상/투전/연단·단약/요대·감정·창고) — 전부 순수
		## 추가 필드(창고는 안 만들었으니 저장할 것도 없다).
		"scrolls": DungeonMaterialsState.scrolls,
		"gold": DungeonGoldState.gold,
		"belt": DungeonPotionState.belt,
	}
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(data))


## GO의 save_state.gd::try_load()와 같은 계약 — 있으면 읽어서 true,
## 없거나 마이그레이션 경로가 없거나 깨져 있으면 false(안전하게 포기).
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

	var rc: Variant = data.get("rooms_cleared", [])
	rooms_cleared.clear()
	if rc is Array:
		for v in rc:
			rooms_cleared.append(bool(v))

	var p: Variant = data.get("player_pos", [0.0, 0.0, 0.0])
	if not (p is Array) or p.size() < 3:
		return false # 손상된 저장 파일 — 인덱스 에러 대신 안전하게 포기
	player_pos = Vector3(p[0], p[1], p[2])
	var boons: Variant = data.get("boons", {})
	DungeonRunState.restore(boons if typeof(boons) == TYPE_DICTIONARY else {})
	var weapon: Variant = data.get("weapon", {})
	var charm: Variant = data.get("charm", {})
	DungeonEquipmentState.restore(
		weapon if typeof(weapon) == TYPE_DICTIONARY else {},
		charm if typeof(charm) == TYPE_DICTIONARY else {})
	var runes: Variant = data.get("runes", {})
	var scrolls: Variant = data.get("scrolls", 0)
	DungeonMaterialsState.restore(
		runes if typeof(runes) == TYPE_DICTIONARY else {},
		int(scrolls) if (typeof(scrolls) == TYPE_INT or typeof(scrolls) == TYPE_FLOAT) else 0)
	var gold: Variant = data.get("gold", 0)
	DungeonGoldState.restore(int(gold) if (typeof(gold) == TYPE_INT or typeof(gold) == TYPE_FLOAT) else 0)
	var belt: Variant = data.get("belt", [])
	DungeonPotionState.restore(belt if belt is Array else [])
	return true


## GO의 save_state.gd::_migrate()와 완전히 같은 계약 — 버전이 낮으면
## _migrate_step()을 한 단계씩 적용, 경로가 없거나(null) 이 빌드보다
## 나중 버전(다운그레이드)이면 null.
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
			## 방 하나뿐이던 시절의 room_cleared를 방 0 하나짜리 배열로.
			data["rooms_cleared"] = [bool(data.get("room_cleared", false))]
			data.erase("room_cleared")
			data["version"] = 2
			return data
		_:
			return null
