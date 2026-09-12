extends Node3D

## VERTICAL_SLICE_DUNGEON.md 1·5절 — DUNGEON 첫 방(고분 테마). CC0 Kenney
## Modular Cave Kit(assets/dungeon/, GO의 동굴 입구 gate-rock.glb와 같은
## 킷 — 이미 받아 둔 것을 재사용, 새 킷 다운로드 없음)의 room-small.glb
## (실측 12x4.4x12, 바닥 중앙 피벗 — 측정 스크립트로 직접 확인)를 쓴다.
## 이 GLB엔 충돌이 없어(단순 장식 메시라 Godot이 자동 생성 안 함) 벽·
## 바닥은 직접 만든다(GO의 terrain_builder.gd와 같은 방식) — 한쪽 벽에는
## 출구(gate.glb, 실측 폭 4.4) 폭만큼 틈을 낸다.
##
## "제외" 목록 2번(층 전체 — 여러 방 연결) 최소 착수 — §28-8 "진짜 이어진
## 세계" A안(웹판, 완전한 오픈월드)은 여전히 더 큰 다음 슬라이스 몫이다.
## 이번엔 그 정신(로딩 없이 걸어서 이어진다)만 가장 작게 증명한다: 방을
## `ROOM_COUNT`개 한 씬 안에 나란히 세우고 같은 킷의 `corridor.glb`
## (실측 4.0x4.05x4.0, 바닥 중앙 피벗 — 측정 스크립트로 확인)로 잇는다.
## 방 사이를 오갈 때 씬 전환이 전혀 없다 — 문을 지나면 그냥 다음 방이다.

const GLBUtils := preload("res://games/saga_go/world/glb_utils.gd")
const DungeonEnemy := preload("res://games/saga_dungeon/world/dungeon_enemy.gd")
const Toast := preload("res://saga_core/ui/toast.gd")
## GO의 사건 선택지 패널을 그대로 재사용한다(GLBUtils·Toast와 같은 cross-game
## 재사용 경계 — GO 전용 로직이 아니라 순수 UI 빌더라 옮길 필요가 없다).
const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")

const ROOM_GLB := "res://assets/dungeon/room-small.glb"
const GATE_GLB := "res://assets/dungeon/gate.glb"
const CORRIDOR_GLB := "res://assets/dungeon/corridor.glb"

const ROOM_COUNT := 2

const ROOM_HALF := Vector3(6.0, 0.0, 6.0)
const WALL_HEIGHT := 4.4
const WALL_THICK := 1.0
const GATE_HALF_WIDTH := 2.2 # gate.glb 실측 폭(4.4)의 절반

const CORRIDOR_TILE_LEN := 4.0 # corridor.glb 실측 깊이(측정 스크립트로 확인)
const CORRIDOR_TILES_PER_GAP := 2 # 방 사이 복도 길이 = 4.0 * 2 = 8.0
const CORRIDOR_HALF_WIDTH := 2.0 # corridor.glb 실측 폭의 절반
const CORRIDOR_GAP := CORRIDOR_TILE_LEN * CORRIDOR_TILES_PER_GAP
const ROOM_SPACING := ROOM_HALF.z * 2.0 + CORRIDOR_GAP # 방 원점 사이 거리(z)

var _exit_used: Array[bool] = []
var _room_origin_z: Array[float] = []


func _ready() -> void:
	for i in range(ROOM_COUNT):
		var origin_z := -float(i) * ROOM_SPACING
		_room_origin_z.append(origin_z)
		_spawn_room_mesh(origin_z)
		_spawn_walls(origin_z, i > 0)
		_spawn_gate(origin_z, true) # 북쪽(출구) 문은 방마다
		if i > 0:
			_spawn_gate(origin_z, false) # 남쪽(입구) 문 — 복도 쪽에서 보이는 면
			_spawn_corridor(origin_z + ROOM_SPACING, origin_z)
		_spawn_exit_trigger(origin_z, i)
		_exit_used.append(false)

	## GO의 test_village.gd::_ready()와 같은 순서 규칙(자식이 부모보다
	## 먼저 ready되므로 Player는 이미 트리에 있다) — 이미 클리어한 방이면
	## 잡졸을 다시 세우지 않는다(EventState의 "이미 끝난 사건은 되살아나지
	## 않는다"와 같은 경계, 이제 방마다 따로 확인한다).
	var loaded: bool = DungeonSaveState.try_load()
	for i in range(ROOM_COUNT):
		var cleared: bool = loaded and DungeonSaveState.is_room_cleared(i)
		if not cleared:
			_spawn_enemy(_room_origin_z[i], i + 1)
		else:
			## 클리어한 방을 불러오면 저장된 위치가 그 방의 출구 트리거
			## 안일 수 있다(마지막으로 나간 자리 그대로 복원하니까) —
			## _exit_used를 미리 true로 앉혀 두지 않으면 로드 직후 트리거가
			## 다시 걸려 매번 재저장(위치가 벽 depenetration으로 조금씩
			## 밀림)이 반복된다. 실제로 두 번째 프로세스 실행에서 이
			## 재발화를 헤드리스로 잡아냄(아래 검증 참고) — 추측이 아니라
			## 실측으로 찾은 문제다.
			_exit_used[i] = true
	if loaded:
		var player: Node3D = get_tree().get_first_node_in_group("player")
		if player:
			player.global_position = DungeonSaveState.player_pos


func _spawn_room_mesh(origin_z: float) -> void:
	var mesh := GLBUtils.extract_mesh(ROOM_GLB)
	if mesh == null:
		return
	var mi := MeshInstance3D.new()
	mi.name = "RoomMesh"
	mi.mesh = mesh
	mi.position = Vector3(0, 0, origin_z)
	add_child(mi)

	var floor_body := StaticBody3D.new()
	floor_body.name = "FloorCollision"
	var floor_cs := CollisionShape3D.new()
	var floor_box := BoxShape3D.new()
	floor_box.size = Vector3(ROOM_HALF.x * 2, 0.4, ROOM_HALF.z * 2)
	floor_cs.shape = floor_box
	floor_body.position = Vector3(0, -0.2, origin_z)
	floor_body.add_child(floor_cs)
	add_child(floor_body)


## 벽 넷 중 북쪽(-z, 출구)은 항상 틈을 남긴다. 남쪽(+z)은 첫 방(입구가
## 필요 없다)만 온전히 막고, 나머지 방은 복도로 이어지는 틈을 같은
## 자리에 남긴다(`has_south_gap`).
func _spawn_walls(origin_z: float, has_south_gap: bool) -> void:
	if has_south_gap:
		var side_len_s: float = ROOM_HALF.x - GATE_HALF_WIDTH
		if side_len_s > 0.0:
			var side_center_x_s: float = GATE_HALF_WIDTH + side_len_s * 0.5
			_wall(Vector3(side_len_s, WALL_HEIGHT, WALL_THICK),
				Vector3(side_center_x_s, WALL_HEIGHT * 0.5, origin_z + ROOM_HALF.z + WALL_THICK * 0.5))
			_wall(Vector3(side_len_s, WALL_HEIGHT, WALL_THICK),
				Vector3(-side_center_x_s, WALL_HEIGHT * 0.5, origin_z + ROOM_HALF.z + WALL_THICK * 0.5))
	else:
		_wall(Vector3(ROOM_HALF.x * 2, WALL_HEIGHT, WALL_THICK),
			Vector3(0, WALL_HEIGHT * 0.5, origin_z + ROOM_HALF.z + WALL_THICK * 0.5))

	_wall(Vector3(WALL_THICK, WALL_HEIGHT, ROOM_HALF.z * 2),
		Vector3(ROOM_HALF.x + WALL_THICK * 0.5, WALL_HEIGHT * 0.5, origin_z))
	_wall(Vector3(WALL_THICK, WALL_HEIGHT, ROOM_HALF.z * 2),
		Vector3(-ROOM_HALF.x - WALL_THICK * 0.5, WALL_HEIGHT * 0.5, origin_z))

	var side_len: float = ROOM_HALF.x - GATE_HALF_WIDTH
	if side_len > 0.0:
		var side_center_x: float = GATE_HALF_WIDTH + side_len * 0.5
		_wall(Vector3(side_len, WALL_HEIGHT, WALL_THICK),
			Vector3(side_center_x, WALL_HEIGHT * 0.5, origin_z - ROOM_HALF.z - WALL_THICK * 0.5))
		_wall(Vector3(side_len, WALL_HEIGHT, WALL_THICK),
			Vector3(-side_center_x, WALL_HEIGHT * 0.5, origin_z - ROOM_HALF.z - WALL_THICK * 0.5))


func _wall(size: Vector3, pos: Vector3) -> void:
	var body := StaticBody3D.new()
	body.position = pos
	var cs := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = size
	cs.shape = box
	body.add_child(cs)
	add_child(body)


## at_north=true면 그 방의 출구(북쪽, -z), false면 입구(남쪽, +z) — 같은
## gate.glb를 방향만 반대로 놓는다(아치는 앞뒤가 대칭이라 뒤집을 필요 없음).
func _spawn_gate(origin_z: float, at_north: bool) -> void:
	var mesh := GLBUtils.extract_mesh(GATE_GLB)
	if mesh == null:
		return
	var mi := MeshInstance3D.new()
	mi.name = "ExitGate" if at_north else "EntranceGate"
	var z_off: float = -ROOM_HALF.z if at_north else ROOM_HALF.z
	mi.position = Vector3(0, 0, origin_z + z_off)
	add_child(mi)


## from_z(앞 방의 출구 쪽, 더 큰 z)에서 to_z(다음 방의 입구, 더 작은 z)
## 까지 corridor.glb 타일을 이어 붙인다 + 옆벽·바닥 충돌(GLB 자체엔 충돌이
## 없다 — room-small.glb·gate.glb와 같은 이유).
func _spawn_corridor(from_z: float, to_z: float) -> void:
	var start_z: float = from_z - ROOM_HALF.z # 앞 방 북쪽 벽
	var mesh := GLBUtils.extract_mesh(CORRIDOR_GLB)
	for i in range(CORRIDOR_TILES_PER_GAP):
		var tile_center_z: float = start_z - CORRIDOR_TILE_LEN * (i + 0.5)
		if mesh != null:
			var mi := MeshInstance3D.new()
			mi.name = "CorridorTile%d" % i
			mi.mesh = mesh
			mi.position = Vector3(0, 0, tile_center_z)
			add_child(mi)

	var corridor_len: float = start_z - (to_z + ROOM_HALF.z) # 항상 CORRIDOR_GAP과 같음
	var corridor_center_z: float = (start_z + (to_z + ROOM_HALF.z)) * 0.5
	var floor_body := StaticBody3D.new()
	floor_body.name = "CorridorFloor"
	var floor_cs := CollisionShape3D.new()
	var floor_box := BoxShape3D.new()
	floor_box.size = Vector3(CORRIDOR_HALF_WIDTH * 2, 0.4, corridor_len)
	floor_cs.shape = floor_box
	floor_body.position = Vector3(0, -0.2, corridor_center_z)
	floor_body.add_child(floor_cs)
	add_child(floor_body)

	_wall(Vector3(WALL_THICK, WALL_HEIGHT, corridor_len),
		Vector3(CORRIDOR_HALF_WIDTH + WALL_THICK * 0.5, WALL_HEIGHT * 0.5, corridor_center_z))
	_wall(Vector3(WALL_THICK, WALL_HEIGHT, corridor_len),
		Vector3(-CORRIDOR_HALF_WIDTH - WALL_THICK * 0.5, WALL_HEIGHT * 0.5, corridor_center_z))


func _spawn_exit_trigger(origin_z: float, room_index: int) -> void:
	var area := Area3D.new()
	area.name = "ExitTrigger%d" % room_index
	area.position = Vector3(0, 1.0, origin_z - ROOM_HALF.z - 1.0)
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(GATE_HALF_WIDTH * 2, 3.0, 2.0)
	cs.shape = shape
	area.add_child(cs)
	add_child(area)
	## .bind()는 인자를 그 자리에서 바로 값으로 굳힌다 — 아래 은사 콜백
	## 람다에서 실제로 밟은 "생성 시점 값 캡처" 문제와 달리 여기 room_index는
	## 지역 변수가 아니라 함수 매개변수라 안전하다.
	area.body_entered.connect(_on_exit_entered.bind(room_index))


## "제외" 목록 1번(은사) — 웹판 dungeon.js의 descend()가 층을 내려가기 전에
## 은사 셋 중 하나를 고르게 하는 것과 같은 자리. 방마다(각 방의 출구에서)
## 한 번씩 고른다(웹판이 "층 클리어마다" 은사를 주는 것과 같은 리듬) —
## 마지막 방만 완주 저장을 겸한다.
func _on_exit_entered(body: Node3D, room_index: int) -> void:
	if _exit_used[room_index] or not body.is_in_group("player"):
		return
	_exit_used[room_index] = true
	var is_final: bool = room_index == ROOM_COUNT - 1
	var choice := DungeonRunState.roll_choice()
	if choice.is_empty():
		## 모든 은사가 상한까지 찬 드문 경우 — 고를 게 없으니 그냥 나간다.
		_finish_exit(body, room_index, is_final)
		return
	## GDScript 람다는 바깥 지역 변수를 "생성 시점 값"으로 캡처한다 —
	## `layer`를 ChoicePrompt.build() 호출 **전에** 만든 콜백에서 그대로
	## 참조하면 항상 null을 캡처한다(실측으로 확인: "Cannot call method
	## 'queue_free' on a null value"). Dictionary는 참조 타입이라 그 안에
	## 나중에 채워 넣으면 콜백도 같은 내용을 보게 된다 — 그 우회로 고쳤다.
	var layer_box := {}
	var choices: Array = []
	for key in choice:
		var b := DungeonBoons.by_key(key)
		choices.append({
			"label": "%s %s — %s" % [b.emoji, b.name, b.desc],
			"cb": func() -> void: _on_boon_picked(key, body, layer_box, room_index, is_final),
		})
	layer_box["layer"] = ChoicePrompt.build(self, "🎴 은사를 고르세요", choices)


func _on_boon_picked(key: String, body: Node3D, layer_box: Dictionary, room_index: int, is_final: bool) -> void:
	(layer_box["layer"] as CanvasLayer).queue_free()
	DungeonRunState.apply_boon(key)
	_finish_exit(body, room_index, is_final)


## 방마다 진행 상황을 저장한다(중간에 그만둬도 이미 클리어한 방은 안
## 되풀이된다) — 마지막 방만 "이번 슬라이스는 여기까지" 토스트를 겸한다
## (VERTICAL_SLICE_DUNGEON.md 완료 조건 8단계의 마지막 자리).
func _finish_exit(body: Node3D, room_index: int, is_final: bool) -> void:
	DungeonSaveState.mark_room_cleared(room_index)
	DungeonSaveState.save(body)
	if is_final:
		Toast.show(self, "이번 슬라이스는 여기까지 — 저장했다.", 5.0)
	else:
		Toast.show(self, "다음 방으로 향한다 — 진행 상황을 저장했다.", 3.0)


func _spawn_enemy(origin_z: float, floor_num: int) -> void:
	var enemy: CharacterBody3D = DungeonEnemy.new(floor_num)
	enemy.position = Vector3(0, 0, origin_z - 1.5)
	add_child(enemy)
