extends Node3D

## VERTICAL_SLICE_REALM.md 2절 결정 — "렌더링 계층만 새로 얹는다"의 첫
## 자리. 성 하나(허창)를 조망하는 첫 슬라이스라 GLB 없이 primitive로
## 짓는다(이 프로젝트 전체 원칙 — 버섯·가구·몬스터와 같은 예외).
## 웹판 `city3d.js`/`realm3d.js`는 아직 실측 안 했다(VERTICAL_SLICE_
## REALM.md "다음" 참고) — 이번엔 "성처럼 보이는 최소 실루엣"만 세운다:
## 대(臺, 기단)+누각(원기둥 망루)+담장(상자 넷, 사방을 두른다).

const WorldCurveMaterial := preload("res://saga_core/world/world_curve_material.gd")

const COLOR_BASE := Color(0.56, 0.5, 0.4)     # 흙빛 기단
const COLOR_TOWER := Color(0.68, 0.6, 0.46)   # 누각(망루)
const COLOR_WALL := Color(0.42, 0.38, 0.3)    # 담장


func _ready() -> void:
	RealmSaveState.try_load()
	_build_base()
	_build_tower()
	_build_walls()


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
## 밖이라 순전히 실루엣용, 충돌체 없음).
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


func _mat(color: Color) -> ShaderMaterial:
	## REALM은 1절 결정에 구면 투영이 없다(월드맵 조망이지 걸어다니는 판이
	## 아니다) — 그래도 WorldCurveMaterial을 쓰는 건 curve_amount를 0으로
	## 둬 다른 네 판과 셰이더 하나를 공유하기 위해서다(saga_core 공용화
	## 경계, 새 머티리얼 종류를 안 늘린다).
	return WorldCurveMaterial.vertex_color_material(0.0, 0.9, color)
