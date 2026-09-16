extends Node3D

## VERTICAL_SLICE_DUNGEON.md 2절 — 회전·줌 없는 고정 카메라. GO의
## camera_rig.gd(드래그 회전·핀치 줌)와 요구사항이 정반대라 재사용하지
## 않고 새로 짰다 — 2026-09-06 사용자 요청("디아블로4랑 완전 비슷하면
## 좋겠음", "디아블로처럼 화면을 고정 가능해")으로 웹판이 회전 카메라
## (`camAim3rd`)를 전부 지우고 고정 카메라(`camAim`)만 남긴 이력과 같은
## 결정. Player의 자식이라 위치는 저절로 따라온다(GO의 CameraRig와 같은
## 구조) — 이 스크립트는 각도·거리를 한 번 고정하는 것 말고는 아무
## 입력도 안 받는다.

@export var pitch_deg := 55.0
@export var spring_length := 12.0

@onready var _arm: SpringArm3D = $SpringArm3D

## PLAN 101-2 DUNGEON ③(손맛 2차, 2026-09-17) — saga_core/combat_feel.gd
## ②가 "camera_rig" 그룹의 첫 노드를 찾아 shake()를 부른다. SpringArm3D
## 자체가 아니라 그 부모(이 노드)의 `position`을 흔든다 — PLAN 101-3
## "카메라 SpringArm3D 부모에 노이즈" 그대로.
var _shake_amp_m := 0.0
var _shake_until_msec := 0

func _ready() -> void:
	rotation_degrees.x = -pitch_deg
	_arm.spring_length = spring_length
	add_to_group("camera_rig")


func _process(_delta: float) -> void:
	if Time.get_ticks_msec() < _shake_until_msec:
		position = Vector3(
			randf_range(-_shake_amp_m, _shake_amp_m),
			randf_range(-_shake_amp_m, _shake_amp_m),
			0.0)
	elif position != Vector3.ZERO:
		position = Vector3.ZERO
		_shake_amp_m = 0.0


## combat_feel.gd::_do_shake()가 부른다 — 겹치면(연타) 더 세거나 더 긴
## 쪽을 유지한다(dungeon_run_state.gd _temp_buffs와 같은 결).
func shake(amp_m: float, dur_sec: float) -> void:
	var until := Time.get_ticks_msec() + int(dur_sec * 1000.0)
	_shake_until_msec = maxi(_shake_until_msec, until)
	_shake_amp_m = maxf(_shake_amp_m, amp_m)
