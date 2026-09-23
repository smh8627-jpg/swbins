extends Node3D

## VERTICAL_SLICE.md Phase 5 — 55~57절. Player의 자식으로 붙어 위치는
## 저절로 따라오고(Camera Follow), 회전·줌만 이 스크립트가 다룬다.
## 웹판 사가고 README "끌면 카메라가 돈다"와 같은 조작 감각 —
## 10px을 넘게 끌어야 돌기 시작한다(탭과 구분).

@onready var spring_arm: SpringArm3D = $SpringArm3D

const CameraNearFade := preload("res://saga_core/world/camera_near_fade.gd")
var _visual_meshes: Array[GeometryInstance3D] = []

const ROTATE_SPEED := 0.006
## PLAN 102-1·105 Q-h(c, 2026-09-19) — 1.7m 표준 캐릭터 기준 거리 8m,
## 줌 범위 6~11m(옛 4~16m는 3.4m 거인 기준이었다).
const MIN_ZOOM := 6.0
const MAX_ZOOM := 11.0
const ZOOM_STEP := 1.0
const DEFAULT_ZOOM := 8.0
const MIN_PITCH := 15.0
const MAX_PITCH := 70.0
const DRAG_THRESHOLD := 10.0

var _dragging := false
var _drag_start := Vector2.ZERO
var _drag_confirmed := false

## PLAN 101-2 GO(2026-09-18, combat_feel.gd 연결) — dungeon_camera_rig.gd
## shake()와 같은 결. 이 노드의 `position`만 흔든다(rotation_degrees는
## 위 드래그 조작이 쓰니 건드리지 않는다) — SpringArm3D가 자식이라 흔들림이
## 저절로 카메라까지 전해진다.
var _shake_amp_m := 0.0
var _shake_until_msec := 0

## PLAN 106장 ⑧ — 원신 PC 시점. 마우스를 창에 가둬 두고 움직이기만 하면 돈다(끌 필요
## 없음). Alt 를 누르는 동안·Esc 로 푼 뒤·선택지 창(그룹 "ui_modal")·옛 결투
## ("duel_active")·사진 모드(frozen)가 열린 동안엔 커서를 풀어 준다. Esc 로 풀었으면
## 화면을 한 번 누를 때 다시 가둔다. go_player.gd 만 켠다 — 이 씬을 빌려 쓰는 곳
## (REALM 초상 등)은 옛 끌기 그대로. 터치 화면·헤드리스에선 안 켜진다.
const LOOK_SPEED := 0.0032
const LOOK_UP_PITCH := 8.0
var mouse_look := false
var _look_released := false

func _ready() -> void:
	spring_arm.spring_length = DEFAULT_ZOOM
	rotation_degrees.x = -35.0
	add_to_group("camera_rig")
	var visual := get_parent().get_node_or_null("Visual")
	if visual:
		_visual_meshes = CameraNearFade.collect_meshes(visual)


func _process(_delta: float) -> void:
	if mouse_look:
		_update_capture()
	if Time.get_ticks_msec() < _shake_until_msec:
		position = Vector3(
			randf_range(-_shake_amp_m, _shake_amp_m),
			randf_range(-_shake_amp_m, _shake_amp_m),
			0.0)
	elif position != Vector3.ZERO:
		position = Vector3.ZERO
		_shake_amp_m = 0.0
	if not _visual_meshes.is_empty():
		var cam: Camera3D = spring_arm.get_node("Camera3D")
		CameraNearFade.apply(_visual_meshes, cam.global_position, global_position)


func shake(amp_m: float, dur_sec: float) -> void:
	var until := Time.get_ticks_msec() + int(dur_sec * 1000.0)
	_shake_until_msec = maxi(_shake_until_msec, until)
	_shake_amp_m = maxf(_shake_amp_m, amp_m)

func _look_active() -> bool:
	return mouse_look and DisplayServer.get_name() != "headless" and not DisplayServer.is_touchscreen_available()

func _modal_open() -> bool:
	var tree := get_tree()
	if tree.get_nodes_in_group("duel_active").size() > 0:
		return true
	## 선택지 창(choice_prompt)은 한 번 지어 두고 숨겼다 보였다 한다 — 숨은 창도 그룹에 남아 있어서
	## 보이는 것만 센다(안 그러면 마을에 사건이 하나만 있어도 커서가 한 번도 안 갇힌다).
	for n in tree.get_nodes_in_group("ui_modal"):
		if n.get("visible") != false:
			return true
	return bool(get_parent().get("frozen"))

func _update_capture() -> void:
	if not _look_active():
		return
	var want := not _look_released and not Input.is_key_pressed(KEY_ALT) and not _modal_open() 		and get_window().has_focus()
	var m := Input.MOUSE_MODE_CAPTURED if want else Input.MOUSE_MODE_VISIBLE
	if Input.mouse_mode != m:
		Input.mouse_mode = m

func _unhandled_input(event: InputEvent) -> void:
	if _look_active():
		_look_input(event)
		return
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

func _look_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		var rel := (event as InputEventMouseMotion).relative
		rotate_y(-rel.x * LOOK_SPEED)
		rotation_degrees.x = clamp(rotation_degrees.x - rel.y * LOOK_SPEED * 57.3, -MAX_PITCH, LOOK_UP_PITCH)
	elif event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.pressed and mb.button_index == MOUSE_BUTTON_WHEEL_UP:
			_zoom(-ZOOM_STEP)
		elif mb.pressed and mb.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			_zoom(ZOOM_STEP)
		elif mb.pressed and _look_released:
			_look_released = false
			get_viewport().set_input_as_handled()
	elif event is InputEventKey and (event as InputEventKey).pressed and (event as InputEventKey).keycode == KEY_ESCAPE:
		_look_released = true

func _zoom(delta: float) -> void:
	spring_arm.spring_length = clamp(spring_arm.spring_length + delta, MIN_ZOOM, MAX_ZOOM)
