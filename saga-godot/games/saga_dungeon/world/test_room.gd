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
	_spawn_enemy()


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


## 실제 저장(SaveState)은 GO 전용 스키마(플레이어 위치+PartyState)라
## DUNGEON에 그대로 못 쓴다 — 게임별 세이브를 어떻게 나눌지부터 정해야
## 하는 별도 결정이라(PROJECT_STATE.md 참고) 이번 슬라이스는 토스트만
## 보여주고 실제 파일 IO는 다음 단계로 미룬다(완료 조건 8절엔 "저장한다"
## 라고 적었지만, 지금은 그 자리만 비워 뒀다는 뜻 — 조용히 가짜로 채우지
## 않는다).
func _on_exit_entered(body: Node3D) -> void:
	if _exit_used or not body.is_in_group("player"):
		return
	_exit_used = true
	Toast.show(self, "이번 슬라이스는 여기까지 — 저장은 다음 단계에서 잇는다.", 5.0)


func _spawn_enemy() -> void:
	var enemy: CharacterBody3D = DungeonEnemy.new()
	enemy.position = Vector3(0, 0, -1.5)
	add_child(enemy)
