extends Node3D

## VERTICAL_SLICE_DUNGEON.md 1·5절 — DUNGEON 첫 방(고분 테마). CC0 Kenney
## Modular Cave Kit(assets/dungeon/, GO의 동굴 입구 gate-rock.glb와 같은
## 킷 — 이미 받아 둔 것을 재사용, 새 킷 다운로드 없음)의 room-small.glb
## (실측 12x4.4x12, 바닥 중앙 피벗 — 측정 스크립트로 직접 확인)를 쓴다.
## 이 GLB엔 충돌이 없어(단순 장식 메시라 Godot이 자동 생성 안 함) 벽·
## 바닥은 직접 만든다(GO의 terrain_builder.gd와 같은 방식) — 한쪽 벽에는
## 출구(gate.glb, 실측 폭 4.4) 폭만큼 틈을 낸다.

const GLBUtils := preload("res://games/saga_go/world/glb_utils.gd")
const DungeonEnemy := preload("res://games/saga_dungeon/world/dungeon_enemy.gd")
const Toast := preload("res://saga_core/ui/toast.gd")
## GO의 사건 선택지 패널을 그대로 재사용한다(GLBUtils·Toast와 같은 cross-game
## 재사용 경계 — GO 전용 로직이 아니라 순수 UI 빌더라 옮길 필요가 없다).
const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")

const ROOM_GLB := "res://assets/dungeon/room-small.glb"
const GATE_GLB := "res://assets/dungeon/gate.glb"

const ROOM_HALF := Vector3(6.0, 0.0, 6.0)
const WALL_HEIGHT := 4.4
const WALL_THICK := 1.0
const GATE_HALF_WIDTH := 2.2 # gate.glb 실측 폭(4.4)의 절반

var _exit_used := false


func _ready() -> void:
	_spawn_room_mesh()
	_spawn_walls()
	_spawn_gate()
	_spawn_exit_trigger()
	## GO의 test_village.gd::_ready()와 같은 순서 규칙(자식이 부모보다
	## 먼저 ready되므로 Player는 이미 트리에 있다) — 이미 클리어한 방이면
	## 잡졸을 다시 세우지 않는다(EventState의 "이미 끝난 사건은 되살아나지
	## 않는다"와 같은 경계).
	var loaded: bool = DungeonSaveState.try_load()
	if not (loaded and DungeonSaveState.room_cleared):
		_spawn_enemy()
	if loaded:
		var player: Node3D = get_tree().get_first_node_in_group("player")
		if player:
			player.global_position = DungeonSaveState.player_pos
		## 클리어한 방을 불러오면 저장된 위치가 출구 트리거 안일 수 있다
		## (마지막으로 나간 자리 그대로 복원하니까) — _exit_used를 미리
		## true로 앉혀 두지 않으면 로드 직후 트리거가 다시 걸려 매번
		## 재저장(위치가 벽 depenetration으로 조금씩 밀림)이 반복된다.
		## 실제로 두 번째 프로세스 실행에서 이 재발화를 헤드리스로 잡아냄
		## (아래 검증 참고) — 추측이 아니라 실측으로 찾은 문제다.
		if DungeonSaveState.room_cleared:
			_exit_used = true


func _spawn_room_mesh() -> void:
	var mesh := GLBUtils.extract_mesh(ROOM_GLB)
	if mesh == null:
		return
	var mi := MeshInstance3D.new()
	mi.name = "RoomMesh"
	mi.mesh = mesh
	add_child(mi)

	var floor_body := StaticBody3D.new()
	floor_body.name = "FloorCollision"
	var floor_cs := CollisionShape3D.new()
	var floor_box := BoxShape3D.new()
	floor_box.size = Vector3(ROOM_HALF.x * 2, 0.4, ROOM_HALF.z * 2)
	floor_cs.shape = floor_box
	floor_body.position = Vector3(0, -0.2, 0)
	floor_body.add_child(floor_cs)
	add_child(floor_body)


## 벽 넷 중 북쪽(-z)만 출구 틈을 남기고 나머지 셋은 온전히 막는다.
func _spawn_walls() -> void:
	_wall(Vector3(ROOM_HALF.x * 2, WALL_HEIGHT, WALL_THICK),
		Vector3(0, WALL_HEIGHT * 0.5, ROOM_HALF.z + WALL_THICK * 0.5))
	_wall(Vector3(WALL_THICK, WALL_HEIGHT, ROOM_HALF.z * 2),
		Vector3(ROOM_HALF.x + WALL_THICK * 0.5, WALL_HEIGHT * 0.5, 0))
	_wall(Vector3(WALL_THICK, WALL_HEIGHT, ROOM_HALF.z * 2),
		Vector3(-ROOM_HALF.x - WALL_THICK * 0.5, WALL_HEIGHT * 0.5, 0))

	var side_len: float = ROOM_HALF.x - GATE_HALF_WIDTH
	if side_len > 0.0:
		var side_center_x: float = GATE_HALF_WIDTH + side_len * 0.5
		_wall(Vector3(side_len, WALL_HEIGHT, WALL_THICK),
			Vector3(side_center_x, WALL_HEIGHT * 0.5, -ROOM_HALF.z - WALL_THICK * 0.5))
		_wall(Vector3(side_len, WALL_HEIGHT, WALL_THICK),
			Vector3(-side_center_x, WALL_HEIGHT * 0.5, -ROOM_HALF.z - WALL_THICK * 0.5))


func _wall(size: Vector3, pos: Vector3) -> void:
	var body := StaticBody3D.new()
	body.position = pos
	var cs := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = size
	cs.shape = box
	body.add_child(cs)
	add_child(body)


func _spawn_gate() -> void:
	var mesh := GLBUtils.extract_mesh(GATE_GLB)
	if mesh == null:
		return
	var mi := MeshInstance3D.new()
	mi.name = "ExitGate"
	mi.mesh = mesh
	mi.position = Vector3(0, 0, -ROOM_HALF.z)
	add_child(mi)


func _spawn_exit_trigger() -> void:
	var area := Area3D.new()
	area.name = "ExitTrigger"
	area.position = Vector3(0, 1.0, -ROOM_HALF.z - 1.0)
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(GATE_HALF_WIDTH * 2, 3.0, 2.0)
	cs.shape = shape
	area.add_child(cs)
	add_child(area)
	area.body_entered.connect(_on_exit_entered)


## "제외" 목록 1번(은사) — 웹판 dungeon.js의 descend()가 층을 내려가기 전에
## 은사 셋 중 하나를 고르게 하는 것과 같은 자리. 이 슬라이스는 층이 아니라
## 방 하나뿐이라 "문으로 나간다"가 그 자리를 대신한다. 고른 뒤에야 실제로
## 저장한다(DungeonSaveState, GO의 SaveState와 완전히 분리) —
## VERTICAL_SLICE_DUNGEON.md 완료 조건 8단계의 마지막 자리.
func _on_exit_entered(body: Node3D) -> void:
	if _exit_used or not body.is_in_group("player"):
		return
	_exit_used = true
	var choice := DungeonRunState.roll_choice()
	if choice.is_empty():
		## 모든 은사가 상한까지 찬 드문 경우 — 고를 게 없으니 그냥 나간다.
		_finish_exit(body)
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
			"cb": func() -> void: _on_boon_picked(key, body, layer_box),
		})
	layer_box["layer"] = ChoicePrompt.build(self, "🎴 은사를 고르세요", choices)


func _on_boon_picked(key: String, body: Node3D, layer_box: Dictionary) -> void:
	(layer_box["layer"] as CanvasLayer).queue_free()
	DungeonRunState.apply_boon(key)
	_finish_exit(body)


func _finish_exit(body: Node3D) -> void:
	DungeonSaveState.save(body, true)
	Toast.show(self, "이번 방을 클리어했다 — 저장했다.", 5.0)


func _spawn_enemy() -> void:
	var enemy: CharacterBody3D = DungeonEnemy.new()
	enemy.position = Vector3(0, 0, -1.5)
	add_child(enemy)
