extends Node3D

## VERTICAL_SLICE_REALM.md가 "다음에 볼 자리"로 여러 번 미뤄 온 realm3d.js식
## 월드맵의 첫 슬라이스(2026-09-12, "응 진행해") — 성 셋을 한 지도에 동시에
## 띄워 한눈에 본다. realm3d.js 전체(1006줄: 성 서른 곳·heightmap 지형·
## 해협·드래그 궤도 카메라)를 옮기지 않았다 — **재해석**: 이 슬라이스는
## 성이 셋뿐이라 지형 기복·바다 같은 지리적 디테일이 아직 값도 없다(축성
## 파손율처럼 없는 값은 안 그린다는 realm_city.gd와 같은 원칙). 그래서
## 이번엔 평평한 바닥 + 성마다 표지(marker) 하나 + 지금 조망 중인 성
## 강조만 옮겼다.
##
## 좌표는 data-city.js의 x·y(0~100, 지도 비율, `realm_cities.gd` CITIES)를
## 실측해 그대로 썼다 — 성 위치의 방향·비율은 원작 그대로, 축척(WORLD_SCALE)
## 만 성 셋짜리 슬라이스에 맞게 새로 골랐다(realm3d.js의 4.5는 성 서른 곳이
## 지도 전체에 퍼진 걸 가정한 값이라 그대로 쓰면 마커 셋이 한 덩어리로
## 겹친다).
##
## **2026-09-12 추가 — 성표 탭으로 조망 대상 바꾸기.** realm3d.js의
## "성을 탭하면 그 성을 연다"는 핵심 상호작용을 옮겼다(`ui.openCity()`
## 대신 이 슬라이스가 가진 것 — `current_city`를 바꾸는 것 — 을 부른다,
## 재해석). Area3D 물리 피킹(`get_viewport().physics_object_picking`)을
## 쓴다 — 이 프로젝트에 3D 오브젝트 탭 판정이 처음이라 새 패턴이지만,
## project.godot에 새 입력 액션·물리 레이어를 안 늘려도 되는 가장 가벼운
## 길이다(마우스·터치 둘 다 커버 — Godot 기본값이 터치를 마우스로도
## 흉내 낸다). 성 하나뿐인 디오라마 화면(realm_city.gd)에도 같은 좌표계
## 공간이 있지만 그 카메라의 시야가 원점 근처(반경 6~16)뿐이라 실수로
## 안 겹친다 — 그래도 숨어 있는 동안은 `input_ray_pickable`을 꺼서
## 확실히 막는다.
##
## **하지 않은 것(다음에 볼 자리)** — 지형 기복·해협
## (드래그 궤도 카메라는 realm_worldmap_camera.gd에서 옮겼다).
##
## **2026-09-12 추가 — 정복 성 편입.** 소패를 함락하면(`RealmSaveState.
## enemies.xiaopei.captured`) `_process()`가 그걸 보고 마커를 하나 더
## 짓는다 — `_ready()`가 CITIES 셋만 짓고 끝나던 것을 매 프레임 가볍게
## 폴링해 보완한다(FOREST gather_label.gd와 같은 폴링 결). 좌표·색은
## `ENEMY_CITIES`에 새로 들인 x·y·land로 CITIES 마커와 똑같이 잡힌다.

const RealmCities := preload("res://games/saga_realm/data/realm_cities.gd")
const WorldCurveMaterial := preload("res://saga_core/world/world_curve_material.gd")
const Toast := preload("res://saga_core/ui/toast.gd")

## **2026-09-14 정정 — WORLD_SCALE은 realm_cities.gd로 옮겼다.** 여기 있던
## 상수(14.0, 값은 그대로)를 `realm_worldmap_camera.gd`도 같이 봐야 해서
## 옮겼다(자세한 사정은 `RealmCities.WORLD_SCALE` 머리말 참고).
##
## **GROUND_SPAN 260 → 6000 — "월드맵 좌표계 몰아서 말고 지금 바로
## 확인해줘"로 발견된 문제.** 260은 성 셋(반경 130)만 가정한 값이라, 16·
## 17절에서 107성을 다 채운 지금은 어긋난다 — 실제로 확인해 보니 107개
## 중 103개(하비 포함, xiapi도 이미 260 밖이었다)의 마커가 이 평면
## 바깥에 떴다(임시 스크립트로 좌표를 다 뽑아 확인, 가장 먼 성 jinhon이
## 원점에서 2679 단위 — 260의 절반 130을 훌쩍 넘는다). **GROUND_SPAN만
## 6000으로 키운다** — 평면 메시는 세분(subdivide) 없이 사각형 하나라
## 커져도 비용이 없다. `WORLD_SCALE`은 그대로 둔다(줄이면 처음 3성
## 클러스터가 다닥다닥 붙어 보이는 문제가 되돌아온다 — 근접한 세 성과
## 저 먼 107성을 동시에 "적당한 크기"로 보여줄 하나의 축척은 없다,
## 카메라 쪽 정정과 짝을 이룬다).
const GROUND_SPAN := 6000.0
const COLOR_GROUND := Color(0.42, 0.48, 0.32)
const COLOR_FLAG := Color(0.85, 0.8, 0.7)
const COLOR_CURRENT := Color(0.95, 0.75, 0.2)
const LAND_COLOR := {"plain": Color(0.74, 0.62, 0.4), "river": Color(0.42, 0.58, 0.66)}
const TOAST_SEC := 2.0
const TAP_RADIUS := 2.6  # 기둥(반경 0.7)보다 훨씬 넉넉하게 — 손가락 탭 판정
const TAP_HEIGHT := 4.5

var _markers: Dictionary = {}  # city_id -> MeshInstance3D(성표(城標) 기둥, 강조 대상)
var _areas: Dictionary = {}    # city_id -> Area3D(탭 판정)
var _last_current := ""
var _last_visible := false


func _ready() -> void:
	get_viewport().physics_object_picking = true
	_build_ground()
	for c: Dictionary in RealmCities.CITIES:
		_build_marker(c)


## realm_city.gd/realm_camera.gd와 같은 손잡이(RealmSaveState.viewing_map)를
## 폴링한다(FOREST gather_label.gd 폴링 패턴과 같은 결) — 숨어 있는 동안은
## 강조 갱신도, 탭 판정도 건너뛴다.
func _process(_delta: float) -> void:
	_check_annexed()
	visible = RealmSaveState.viewing_map
	if visible != _last_visible:
		_last_visible = visible
		for city_id: String in _areas:
			(_areas[city_id] as Area3D).input_ray_pickable = visible
	if not visible:
		return

	var cur: String = RealmSaveState.current_city
	if cur == _last_current:
		return
	_last_current = cur
	for city_id: String in _markers:
		var marker: MeshInstance3D = _markers[city_id]
		marker.material_override = _mat(COLOR_CURRENT if city_id == cur else _land_color(city_id))


func _on_marker_input(_camera: Node, event: InputEvent, _pos: Vector3, _normal: Vector3,
		_shape_idx: int, city_id: String) -> void:
	var pressed := false
	if event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		pressed = mb.pressed and mb.button_index == MOUSE_BUTTON_LEFT
	elif event is InputEventScreenTouch:
		var st := event as InputEventScreenTouch
		pressed = st.pressed and st.index == 0
	if not pressed:
		return
	RealmSaveState.current_city = city_id
	var city_def := RealmCities.any_by_id(city_id)
	Toast.show(self, "%s 조망" % String(city_def.get("name", "")), TOAST_SEC)


func _land_color(city_id: String) -> Color:
	var land := String(RealmCities.any_by_id(city_id).get("land", "plain"))
	return LAND_COLOR.get(land, LAND_COLOR["plain"])


## 정복 성 편입 — 함락된 적 성마다 마커를 하나씩 세운다(한 번 세우면
## `_markers`에 남아 다시 안 짓는다). 갓 지은 마커의 탭 판정은 지금
## `visible` 상태에 맞춰 바로 켜 둔다 — 다음 가시성 전환을 기다리지 않는다.
func _check_annexed() -> void:
	for e: Dictionary in RealmCities.ENEMY_CITIES:
		var eid := String(e.id)
		if _markers.has(eid):
			continue
		if not bool(RealmSaveState.enemies.get(eid, {}).get("captured", false)):
			continue
		_build_marker(RealmCities.any_by_id(eid))
		(_areas[eid] as Area3D).input_ray_pickable = visible


func _world_pos(c: Dictionary) -> Vector3:
	var center := RealmCities.map_center()
	return Vector3(
		(float(c.x) - center.x) * RealmCities.WORLD_SCALE, 0.0,
		(float(c.y) - center.y) * RealmCities.WORLD_SCALE)


func _build_ground() -> void:
	var mi := MeshInstance3D.new()
	var mesh := PlaneMesh.new()
	mesh.size = Vector2(GROUND_SPAN, GROUND_SPAN)
	mi.mesh = mesh
	mi.material_override = _mat(COLOR_GROUND)
	add_child(mi)


## 성표(城標) — 기둥(강조 대상, 성마다 다른 색)에 깃발을 얹은 표지 하나로
## 성 하나를 대신한다(디오라마 전체를 지도 위에 얹지 않는다 — 개관용이라
## 실루엣만 있으면 된다).
func _build_marker(c: Dictionary) -> void:
	var pos := _world_pos(c)

	var pole := MeshInstance3D.new()
	var pole_mesh := CylinderMesh.new()
	pole_mesh.top_radius = 0.5
	pole_mesh.bottom_radius = 0.7
	pole_mesh.height = 3.0
	pole.mesh = pole_mesh
	pole.position = pos + Vector3(0, 1.5, 0)
	pole.material_override = _mat(_land_color(String(c.id)))
	add_child(pole)
	_markers[String(c.id)] = pole

	var flag := MeshInstance3D.new()
	var flag_mesh := BoxMesh.new()
	flag_mesh.size = Vector3(1.6, 1.0, 0.1)
	flag.mesh = flag_mesh
	flag.position = pos + Vector3(0.9, 2.6, 0)
	flag.material_override = _mat(COLOR_FLAG)
	add_child(flag)

	var city_id := String(c.id)
	var area := Area3D.new()
	area.input_ray_pickable = false  # 처음엔 숨김 상태 — _process()가 보일 때 켠다
	area.position = pos + Vector3(0, TAP_HEIGHT * 0.5, 0)
	var shape := CollisionShape3D.new()
	var cyl := CylinderShape3D.new()
	cyl.radius = TAP_RADIUS
	cyl.height = TAP_HEIGHT
	shape.shape = cyl
	area.add_child(shape)
	area.input_event.connect(_on_marker_input.bind(city_id))
	add_child(area)
	_areas[city_id] = area


func _mat(color: Color) -> ShaderMaterial:
	## realm_city.gd와 같은 이유로 WorldCurveMaterial을 쓴다(curve_amount
	## 0 — REALM은 걸어다니는 판이 아니라 구면 투영이 없다, saga_core 셰이더
	## 공유 경계를 유지한다).
	return WorldCurveMaterial.vertex_color_material(0.0, 0.9, color)
