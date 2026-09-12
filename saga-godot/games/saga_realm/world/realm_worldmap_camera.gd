extends Camera3D

## realm_camera.gd(디오라마용 궤도 카메라)와 같은 요령 — 새 입력 액션을
## 늘리지 않고 기존 move_* 액션(WASD)을 그대로 재사용한다. 반경·높이만
## 성 셋을 한눈에 담게 더 크게 잡았다(디오라마는 성 하나, 이쪽은 지도
## 전체 — realm_worldmap.gd의 WORLD_SCALE에 맞춘 값).

const ORBIT_SPEED := 1.0     # rad/sec — realm_camera.gd와 같음
const ZOOM_SPEED := 30.0
const RADIUS_MIN := 60.0
const RADIUS_MAX := 220.0
const HEIGHT := 130.0
const LOOK_AT := Vector3(0, 0, 0)

var _yaw := 0.6
var _radius := 150.0


## realm_camera.gd와 같은 손잡이(RealmSaveState.viewing_map)로 켜고 끈다 —
## 둘이 같은 move_* 입력 액션을 나눠 쓰므로 정확히 하나만 매 프레임 반응해야
## 한다(viewing_map은 불리언이라 항상 둘 중 하나만 current=true가 된다).
func _process(delta: float) -> void:
	current = RealmSaveState.viewing_map
	if not current:
		return

	var turn := Input.get_axis("move_left", "move_right")
	_yaw += turn * ORBIT_SPEED * delta

	var zoom := Input.get_axis("move_forward", "move_back")  # 앞으로=당겨서 확대
	_radius = clampf(_radius - zoom * ZOOM_SPEED * delta, RADIUS_MIN, RADIUS_MAX)

	global_position = Vector3(sin(_yaw), 0.0, cos(_yaw)) * _radius + Vector3(0, HEIGHT, 0)
	look_at(LOOK_AT, Vector3.UP)
