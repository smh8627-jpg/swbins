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

func _ready() -> void:
	rotation_degrees.x = -pitch_deg
	_arm.spring_length = spring_length
