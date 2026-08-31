extends Node3D

## VERTICAL_SLICE.md Phase 5 — 55~57절. Player의 자식으로 붙어 위치는
## 저절로 따라오고(Camera Follow), 회전·줌만 이 스크립트가 다룬다.
## 웹판 사가고 README "끌면 카메라가 돈다"와 같은 조작 감각 —
## 10px을 넘게 끌어야 돌기 시작한다(탭과 구분).

@onready var spring_arm: SpringArm3D = $SpringArm3D

const ROTATE_SPEED := 0.006
const MIN_ZOOM := 4.0
const MAX_ZOOM := 16.0
const ZOOM_STEP := 1.0
const MIN_PITCH := 15.0
const MAX_PITCH := 70.0
const DRAG_THRESHOLD := 10.0

var _dragging := false
var _drag_start := Vector2.ZERO
var _drag_confirmed := false

func _ready() -> void:
	spring_arm.spring_length = 9.0
	rotation_degrees.x = -35.0

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_LEFT:
			_begin_drag(mb.pressed, mb.position)
		elif mb.button_index == MOUSE_BUTTON_WHEEL_UP and mb.pressed:
			_zoom(-ZOOM_STEP)
		elif mb.button_index == MOUSE_BUTTON_WHEEL_DOWN and mb.pressed:
			_zoom(ZOOM_STEP)
	elif event is InputEventMouseMotion and _dragging:
		_apply_drag((event as InputEventMouseMotion).relative, (event as InputEventMouseMotion).position)
	elif event is InputEventScreenTouch:
		var st := event as InputEventScreenTouch
		if st.index == 0:
			_begin_drag(st.pressed, st.position)
	elif event is InputEventScreenDrag:
		var sd := event as InputEventScreenDrag
		if sd.index == 0:
			_apply_drag(sd.relative, sd.position)

func _begin_drag(pressed: bool, pos: Vector2) -> void:
	_dragging = pressed
	if pressed:
		_drag_start = pos
		_drag_confirmed = false

func _apply_drag(relative: Vector2, pos: Vector2) -> void:
	if not _drag_confirmed:
		if pos.distance_to(_drag_start) < DRAG_THRESHOLD:
			return
		_drag_confirmed = true
	rotate_y(-relative.x * ROTATE_SPEED)
	var pitch: float = clamp(rotation_degrees.x - relative.y * ROTATE_SPEED * 57.3, -MAX_PITCH, -MIN_PITCH)
	rotation_degrees.x = pitch

func _zoom(delta: float) -> void:
	spring_arm.spring_length = clamp(spring_arm.spring_length + delta, MIN_ZOOM, MAX_ZOOM)
