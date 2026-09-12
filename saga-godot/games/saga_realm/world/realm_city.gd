extends Node3D

## VERTICAL_SLICE_REALM.md 2절 결정 — "렌더링 계층만 새로 얹는다". 웹판
## `city3d.js`를 실측(2026-09-12)한 뒤 그 핵심 개념을 옮겼다: "장식이 아니라
## 읽는 화면"(원문 그대로) — 성 숫자(개간·상업·군량·로스터)를 그대로 센
## 소품 개수로 디오라마를 짓는다. 새 판정은 없다, 숫자를 셀 뿐이다.
##
## **재해석 — 이 슬라이스가 안 가진 값은 뺐다.** 원작은 성벽 파손율(wall/
## maxWall)·인구(pop)까지 세는데, 이 슬라이스엔 축성·인구 명령이 없어(3·4절
## "제외") 그 값 자체가 없다. 그래서:
## - 성벽은 파손 없이 늘 꽉 찬 넷(기존 그대로 유지)
## - "집(인구)" 자리 대신 **로스터(무장) 깃발**을 세운다 — 이 슬라이스가
##   실제로 갖고 있는 값이라 더 정직하다
## - 시장(상업)·밭(개간)·곳간(군량)은 원작 그대로: 개수 = clamp(round(수치
##   /기준),최소,최대)
## - **2026-09-12 추가 — 치안(sec)이 명령으로 들어와 값이 생겼다.**
##   city3d.js "치안이 높으면 횃불 하나가 더 선다"(sec>=80)를 그대로
##   옮겨 셋째 횃불을 `_dyn` 아래로 옮겼다(값에 물리니 고정 소품이 아니다).
##
## 대(기단)+누각(망루)+담장은 고정(전 세션에 지음, 안 바꿨다). 이 디오라마
## 링만 원작 `city3d.js` `build()`의 sig() 비교 방식(값이 바뀔 때만 다시
## 짓는다)을 그대로 옮겨 매 프레임 재생성을 피한다.

const WorldCurveMaterial := preload("res://saga_core/world/world_curve_material.gd")

const COLOR_BASE := Color(0.56, 0.5, 0.4)     # 흙빛 기단
const COLOR_TOWER := Color(0.68, 0.6, 0.46)   # 누각(망루)
const COLOR_WALL := Color(0.42, 0.38, 0.3)    # 담장
const COLOR_FARM := Color(0.42, 0.58, 0.24)   # 밭(개간)
const COLOR_MARKET := Color(0.74, 0.56, 0.28) # 시장(상업)
const COLOR_MARKET_ROOF := Color(0.6, 0.24, 0.2)
const COLOR_GRANARY := Color(0.5, 0.36, 0.2)  # 곳간 통나무(군량)
const COLOR_BANNER_POLE := Color(0.3, 0.28, 0.24)
const COLOR_WELL := Color(0.55, 0.55, 0.58)
const COLOR_TORCH_POLE := Color(0.25, 0.2, 0.15)
const COLOR_TORCH_FLAME := Color(0.95, 0.55, 0.15)

## city3d.js build()의 기준값 그대로 — 밭 90·시장 80·곳간 400 단위마다 하나.
const FARM_PER := 90.0
const MARKET_PER := 80.0
const GRANARY_PER := 400.0

var _dyn: Node3D
var _last_sig := ""


func _ready() -> void:
	RealmSaveState.try_load()
	_build_base()
	_build_tower()
	_build_walls()
	_build_fixtures()

	_dyn = Node3D.new()
	_dyn.name = "Diorama"
	add_child(_dyn)


func _process(_delta: float) -> void:
	_rebuild_if_changed()


## city3d.js sig()/render() 그대로 — 성이 다르거나 숫자가 바뀌었을 때만
## 다시 짓는다(매 프레임 재생성 방지).
func _rebuild_if_changed() -> void:
	var sig := "%d:%d:%d:%d:%s" % [
		RealmSaveState.agri, RealmSaveState.comm, RealmSaveState.food, RealmSaveState.sec,
		",".join(RealmSaveState.roster)]
	if sig == _last_sig:
		return
	_last_sig = sig

	for c in _dyn.get_children():
		c.queue_free()
	_build_farms()
	_build_markets()
	_build_granary()
	_build_roster_banners()
	_build_sec_torch()


func _build_base() -> void:
	var mi := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = 4.2
	mesh.bottom_radius = 4.6
	mesh.height = 0.6
	mi.mesh = mesh
	mi.position = Vector3(0, 0.3, 0)
	mi.material_override = _mat(COLOR_BASE)
	add_child(mi)


func _build_tower() -> void:
	var mi := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = 1.6
	mesh.bottom_radius = 2.0
	mesh.height = 4.0
	mi.mesh = mesh
	mi.position = Vector3(0, 2.6, 0)
	mi.material_override = _mat(COLOR_TOWER)
	add_child(mi)

	var roof := MeshInstance3D.new()
	var roof_mesh := CylinderMesh.new()
	roof_mesh.top_radius = 0.0
	roof_mesh.bottom_radius = 2.1
	roof_mesh.height = 1.4
	roof.mesh = roof_mesh
	roof.position = Vector3(0, 5.3, 0)
	roof.material_override = _mat(COLOR_WALL)
	add_child(roof)


## 담장 넷 — 기단 둘레에 상자를 사방으로 두른다(포위·공성은 이 슬라이스
## 밖이라 순전히 실루엣용, 충돌체 없음, 파손율도 없어 늘 꽉 차 있다).
func _build_walls() -> void:
	var offsets := [Vector3(0, 0, -3.6), Vector3(0, 0, 3.6), Vector3(-3.6, 0, 0), Vector3(3.6, 0, 0)]
	for off: Vector3 in offsets:
		var mi := MeshInstance3D.new()
		var mesh := BoxMesh.new()
		var along_x: bool = absf(off.x) > absf(off.z)
		mesh.size = Vector3(1.6, 1.2, 6.0) if along_x else Vector3(6.0, 1.2, 1.6)
		mi.mesh = mesh
		mi.position = off + Vector3(0, 0.9, 0)
		mi.material_override = _mat(COLOR_WALL)
		add_child(mi)


## city3d.js build() 끝자락 "우물·횃불 — 늘 있는 살림"을 그대로 — 이 둘은
## 값에 안 물려 한 번만 짓는다. 셋째 횃불(치안 조건부)은 `_build_sec_torch()`
## 로 따로 뺐다 — `_dyn`에 물려 값이 바뀔 때만 다시 짓는다.
func _build_fixtures() -> void:
	_well(Vector3(4.0, 0, -2.2))
	_torch(self, Vector3(2.4, 0, 3.8))
	_torch(self, Vector3(-2.4, 0, 3.8))


func _well(pos: Vector3) -> void:
	var mi := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = 0.35
	mesh.bottom_radius = 0.4
	mesh.height = 0.5
	mi.mesh = mesh
	mi.position = pos + Vector3(0, 0.25, 0)
	mi.material_override = _mat(COLOR_WELL)
	add_child(mi)


func _torch(parent: Node3D, pos: Vector3) -> void:
	var pole := MeshInstance3D.new()
	var pole_mesh := CylinderMesh.new()
	pole_mesh.top_radius = 0.05
	pole_mesh.bottom_radius = 0.06
	pole_mesh.height = 1.1
	pole.mesh = pole_mesh
	pole.position = pos + Vector3(0, 0.55, 0)
	pole.material_override = _mat(COLOR_TORCH_POLE)
	parent.add_child(pole)

	var flame := MeshInstance3D.new()
	var flame_mesh := SphereMesh.new()
	flame_mesh.radius = 0.13
	flame_mesh.height = 0.26
	flame.mesh = flame_mesh
	flame.position = pos + Vector3(0, 1.18, 0)
	flame.material_override = _mat(COLOR_TORCH_FLAME)
	parent.add_child(flame)


## city3d.js "치안이 높으면 횃불 하나가 더 선다"(sec>=80) 그대로.
func _build_sec_torch() -> void:
	if RealmSaveState.sec >= 80:
		_torch(_dyn, Vector3(0, 0, -4.6))


## 밭 — 개간(agri). city3d.js: clamp(round(agri/90), 2, 6).
func _build_farms() -> void:
	var n := clampi(roundi(RealmSaveState.agri / FARM_PER), 2, 6)
	for p: Vector2 in _ring(n, 6.4, -2.0):
		var mi := MeshInstance3D.new()
		var mesh := BoxMesh.new()
		mesh.size = Vector3(1.1, 0.12, 0.8)
		mi.mesh = mesh
		mi.position = Vector3(p.x, 0.06, p.y)
		mi.material_override = _mat(COLOR_FARM)
		_dyn.add_child(mi)


## 시장 — 상업(comm). city3d.js: clamp(round(comm/80), 1, 5).
func _build_markets() -> void:
	var n := clampi(roundi(RealmSaveState.comm / MARKET_PER), 1, 5)
	for p: Vector2 in _ring(n, 5.6, 1.1):
		var stall := MeshInstance3D.new()
		var stall_mesh := BoxMesh.new()
		stall_mesh.size = Vector3(0.7, 0.5, 0.6)
		stall.mesh = stall_mesh
		stall.position = Vector3(p.x, 0.25, p.y)
		stall.material_override = _mat(COLOR_MARKET)
		_dyn.add_child(stall)

		var roof := MeshInstance3D.new()
		var roof_mesh := CylinderMesh.new()
		roof_mesh.top_radius = 0.0
		roof_mesh.bottom_radius = 0.55
		roof_mesh.height = 0.35
		roof.mesh = roof_mesh
		roof.position = Vector3(p.x, 0.68, p.y)
		roof.material_override = _mat(COLOR_MARKET_ROOF)
		_dyn.add_child(roof)


## 곳간 통나무 — 군량(food). city3d.js: clamp(round(food/400)+1, 1, 4).
func _build_granary() -> void:
	var n := clampi(roundi(RealmSaveState.food / GRANARY_PER) + 1, 1, 4)
	for i in n:
		var mi := MeshInstance3D.new()
		var mesh := CylinderMesh.new()
		mesh.top_radius = 0.16
		mesh.bottom_radius = 0.16
		mesh.height = 1.0
		mi.mesh = mesh
		mi.rotation_degrees = Vector3(0, 0, 90)
		mi.position = Vector3(-4.6 - i * 0.4, 0.16, -1.4)
		mi.material_override = _mat(COLOR_GRANARY)
		_dyn.add_child(mi)


## 로스터 깃발 — 원작에 없는, 이 슬라이스만의 값(무장 수). 등용에 성공할
## 때마다 깃발이 하나 는다.
func _build_roster_banners() -> void:
	for p: Vector2 in _ring(RealmSaveState.roster.size(), 4.9, 3.6):
		var pole := MeshInstance3D.new()
		var pole_mesh := CylinderMesh.new()
		pole_mesh.top_radius = 0.04
		pole_mesh.bottom_radius = 0.05
		pole_mesh.height = 1.4
		pole.mesh = pole_mesh
		pole.position = Vector3(p.x, 0.7, p.y)
		pole.material_override = _mat(COLOR_BANNER_POLE)
		_dyn.add_child(pole)

		var flag := MeshInstance3D.new()
		var flag_mesh := BoxMesh.new()
		flag_mesh.size = Vector3(0.5, 0.32, 0.02)
		flag.mesh = flag_mesh
		flag.position = Vector3(p.x + 0.27, 1.2, p.y)
		flag.material_override = _mat(COLOR_TOWER)
		_dyn.add_child(flag)


## city3d.js ring(n, r, startAng) 그대로 — 중심 기준 원 위에 n개를 고르게.
func _ring(n: int, r: float, start_ang: float) -> Array:
	var pts: Array = []
	for i in n:
		var a: float = start_ang + (float(i) / float(n)) * TAU
		pts.append(Vector2(cos(a) * r, sin(a) * r))
	return pts


func _mat(color: Color) -> ShaderMaterial:
	## REALM은 1절 결정에 구면 투영이 없다(월드맵 조망이지 걸어다니는 판이
	## 아니다) — 그래도 WorldCurveMaterial을 쓰는 건 curve_amount를 0으로
	## 둬 다른 네 판과 셰이더 하나를 공유하기 위해서다(saga_core 공용화
	## 경계, 새 머티리얼 종류를 안 늘린다).
	return WorldCurveMaterial.vertex_color_material(0.0, 0.9, color)
