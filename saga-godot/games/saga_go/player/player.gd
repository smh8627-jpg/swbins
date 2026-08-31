extends CharacterBody3D

## VERTICAL_SLICE.md Phase 5 — 51~54절. 실제 GLB 캐릭터가 붙기 전까지는
## Visual(캡슐)이 몸을 대신한다(master.md 8장 "Primitive는 프로토타입에서만").

const WALK_SPEED := 6.0
const RUN_SPEED := 10.0
const GRAVITY := 20.0
const TURN_RATE := 12.0

@onready var camera_rig: Node3D = $CameraRig
@onready var visual: MeshInstance3D = $Visual

var _joystick: Control = null

func _ready() -> void:
	var found := get_tree().get_nodes_in_group("virtual_joystick")
	if found.size() > 0:
		_joystick = found[0]

func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	else:
		velocity.y = 0.0

	var input_dir := _movement_input()
	var move_dir := _world_direction(input_dir)

	var speed := RUN_SPEED if Input.is_action_pressed("run") else WALK_SPEED
	velocity.x = move_dir.x * speed
	velocity.z = move_dir.z * speed

	if move_dir.length() > 0.05:
		var target_yaw := atan2(move_dir.x, move_dir.z)
		visual.rotation.y = lerp_angle(visual.rotation.y, target_yaw, TURN_RATE * delta)

	move_and_slide()

## 조이스틱이 있으면 그걸 우선한다(모바일) — 없거나 안 밀었으면 키보드로 되돈다.
func _movement_input() -> Vector2:
	if _joystick and "value" in _joystick and (_joystick.value as Vector2).length() > 0.05:
		return _joystick.value
	var dir := Vector2.ZERO
	dir.x = Input.get_axis("move_left", "move_right")
	dir.y = Input.get_axis("move_back", "move_forward")
	return dir

## 입력(x=오른쪽, y=앞)을 카메라가 보는 방향 기준 월드 벡터로 바꾼다 —
## 카메라를 돌리면 "앞으로"가 그 방향을 따라간다(3인칭 액션 RPG 감각).
func _world_direction(input_dir: Vector2) -> Vector3:
	if input_dir.length() < 0.001:
		return Vector3.ZERO
	var cam_basis := camera_rig.global_transform.basis if camera_rig else global_transform.basis
	var forward := -cam_basis.z
	forward.y = 0.0
	forward = forward.normalized()
	var right := cam_basis.x
	right.y = 0.0
	right = right.normalized()
	var dir := forward * input_dir.y + right * input_dir.x
	if dir.length() > 1.0:
		dir = dir.normalized()
	return dir
