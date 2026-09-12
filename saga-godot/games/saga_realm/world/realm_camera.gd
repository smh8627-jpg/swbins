extends Camera3D

## VERTICAL_SLICE_REALM.md 1절 결정 — REALM엔 걸어다니는 플레이어가 없다
## ("성 조망"이 이 슬라이스의 유일한 시점 조작). 그래서 GO/DUNGEON/FOREST/
## STORY의 WASD 이동 입력 액션(move_left/move_right/move_forward/
## move_back, project.godot에 이미 있음)을 **그대로 재사용**해 카메라를
## 좌우로 돌리고(원작 rtk의 "성 조망" 감각) 앞뒤로 당겨 줌한다 — 새 입력
## 액션을 project.godot에 늘리지 않는다(헤드리스 에디터가 project.godot을
## 건드릴 수 있다는 이 프로젝트의 알려진 흠, saga-godot/CLAUDE.md 참고 —
## 최대한 건드릴 일 자체를 줄인다).

const ORBIT_SPEED := 1.0     # rad/sec
const ZOOM_SPEED := 6.0
const RADIUS_MIN := 6.0
const RADIUS_MAX := 16.0
const HEIGHT := 7.0
const LOOK_AT := Vector3(0, 2.0, 0)

var _yaw := 0.6
var _radius := 11.0


## **2026-09-12 추가 — 월드맵 카메라(realm_worldmap_camera.gd)와 화면을
## 나눠 쓴다.** RealmSaveState.viewing_map이 켜지면 이 카메라를 끄고 조작도
## 멈춘다(둘이 같은 move_* 입력 액션을 나눠 쓰므로 동시에 반응하면 안 된다).
func _process(delta: float) -> void:
	current = not RealmSaveState.viewing_map
	if not current:
		return

	var turn := Input.get_axis("move_left", "move_right")
	_yaw += turn * ORBIT_SPEED * delta

	var zoom := Input.get_axis("move_forward", "move_back")  # 앞으로=당겨서 확대
	_radius = clampf(_radius - zoom * ZOOM_SPEED * delta, RADIUS_MIN, RADIUS_MAX)

	global_position = Vector3(sin(_yaw), 0.0, cos(_yaw)) * _radius + Vector3(0, HEIGHT, 0)
	look_at(LOOK_AT, Vector3.UP)
