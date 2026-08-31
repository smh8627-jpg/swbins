extends Node3D

## VERTICAL_SLICE.md 27절 — 지도 위 이름난 자리(랜드마크)를 primitive로 세운다.
## master.md 8장의 "Primitive는 프로토타입에서만" 원칙대로, 실제 GLB 에셋이
## 붙기 전까지만 쓰는 자리다. 좌표는 test_map.gd의 글자 지도와 맞춘다.

const TestMap := preload("res://games/saga_go/data/test_map.gd")

func _ready() -> void:
	_add_cave()
	_add_village()
	_add_ruins()
	_add_bridge()

func _box(size: Vector3, color: Color) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mi.mesh = mesh
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mi.material_override = mat
	return mi

func _add_cave() -> void:
	var cave := _box(Vector3(10, 6, 4), Color(0.12, 0.12, 0.14))
	cave.name = "CaveEntrance"
	cave.position = TestMap.world_pos(3, 0) + Vector3(0, 3, 0)
	add_child(cave)

func _add_village() -> void:
	for gx in [2, 3]:
		var house := Node3D.new()
		house.name = "House_%d" % gx
		house.position = TestMap.world_pos(gx, 3)
		add_child(house)

		var body := _box(Vector3(10, 4, 10), Color(0.85, 0.78, 0.6))
		body.position = Vector3(0, 2, 0)
		house.add_child(body)

		var roof := MeshInstance3D.new()
		var roof_mesh := PrismMesh.new()
		roof_mesh.size = Vector3(11, 3.5, 11)
		roof.mesh = roof_mesh
		var roof_mat := StandardMaterial3D.new()
		roof_mat.albedo_color = Color(0.5, 0.24, 0.18)
		roof.material_override = roof_mat
		roof.position = Vector3(0, 5.75, 0)
		house.add_child(roof)

func _add_ruins() -> void:
	var base := TestMap.world_pos(5, 3)
	var offsets := [Vector2(-3, -2), Vector2(2, 1), Vector2(-1, 3)]
	for i in offsets.size():
		var off: Vector2 = offsets[i]
		var mi := MeshInstance3D.new()
		var mesh := CylinderMesh.new()
		mesh.top_radius = 1.0
		mesh.bottom_radius = 1.2
		mesh.height = 5.0 + float(i % 2) * 1.5
		mi.mesh = mesh
		var mat := StandardMaterial3D.new()
		mat.albedo_color = Color(0.55, 0.52, 0.48)
		mi.material_override = mat
		mi.position = base + Vector3(off.x, mesh.height * 0.5, off.y)
		mi.name = "RuinPillar_%d" % i
		add_child(mi)

func _add_bridge() -> void:
	var plank := _box(Vector3(6, 0.6, 44), Color(0.42, 0.3, 0.18))
	plank.name = "Bridge"
	plank.position = TestMap.world_pos(3, 5) + Vector3(0, 1.2, 0)
	add_child(plank)
