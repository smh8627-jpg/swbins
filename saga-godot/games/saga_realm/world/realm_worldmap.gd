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
## **하지 않은 것(다음에 볼 자리)** — 마커를 탭해 성을 바꾸는 것(원작
## realm3d.js의 핵심 상호작용, `ui.openCity()`를 그대로 부르는 것과 같은
## 결로 다음에 볼 것), 지형 기복·해협, 드래그 궤도 카메라(지금은
## realm_worldmap_camera.gd가 realm_camera.gd와 같은 WASD 재사용). 지금은
## "성" 버튼(ChoicePrompt, realm_city_button.gd)으로만 조망 대상을 바꾸고
## 이 지도는 순전히 개관용이다.

const RealmCities := preload("res://games/saga_realm/data/realm_cities.gd")
const WorldCurveMaterial := preload("res://saga_core/world/world_curve_material.gd")

const WORLD_SCALE := 14.0
const GROUND_SPAN := 260.0  # 성 셋의 실측 좌표가 대각선으로 최대 240 정도 벌어져(허창-복양) 220으론 가장자리가 빠듯했다
const COLOR_GROUND := Color(0.42, 0.48, 0.32)
const COLOR_FLAG := Color(0.85, 0.8, 0.7)
const COLOR_CURRENT := Color(0.95, 0.75, 0.2)
const LAND_COLOR := {"plain": Color(0.74, 0.62, 0.4), "river": Color(0.42, 0.58, 0.66)}

var _markers: Dictionary = {}  # city_id -> MeshInstance3D(성표(城標) 기둥, 강조 대상)
var _last_current := ""


func _ready() -> void:
	_build_ground()
	for c: Dictionary in RealmCities.CITIES:
		_build_marker(c)


## realm_city.gd/realm_camera.gd와 같은 손잡이(RealmSaveState.viewing_map)를
## 폴링한다(FOREST gather_label.gd 폴링 패턴과 같은 결) — 숨어 있는 동안은
## 강조 갱신도 건너뛴다.
func _process(_delta: float) -> void:
	visible = RealmSaveState.viewing_map
	if not visible:
		return

	var cur: String = RealmSaveState.current_city
	if cur == _last_current:
		return
	_last_current = cur
	for city_id: String in _markers:
		var marker: MeshInstance3D = _markers[city_id]
		marker.material_override = _mat(COLOR_CURRENT if city_id == cur else _land_color(city_id))


func _land_color(city_id: String) -> Color:
	var land := String(RealmCities.by_id(city_id).get("land", "plain"))
	return LAND_COLOR.get(land, LAND_COLOR["plain"])


func _world_pos(c: Dictionary) -> Vector3:
	var center := RealmCities.map_center()
	return Vector3(
		(float(c.x) - center.x) * WORLD_SCALE, 0.0,
		(float(c.y) - center.y) * WORLD_SCALE)


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


func _mat(color: Color) -> ShaderMaterial:
	## realm_city.gd와 같은 이유로 WorldCurveMaterial을 쓴다(curve_amount
	## 0 — REALM은 걸어다니는 판이 아니라 구면 투영이 없다, saga_core 셰이더
	## 공유 경계를 유지한다).
	return WorldCurveMaterial.vertex_color_material(0.0, 0.9, color)
