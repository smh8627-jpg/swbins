extends Node3D

## master.md 43·44절 — Vegetation/Rock 배치. 웹판 전체가 지키는 원칙
## ("자리는 시각의 순수 함수다" — SAGA-HANDOFF.md의 npc.js/land.js 규칙)을
## 그대로 따른다: 매 프레임 새로 뽑지 않고, 격자 좌표에서 결정적으로 해시해
## 늘 같은 자리에 같은 나무가 선다.

const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")

const TREES_PER_FOREST_TILE := 3
const ROCKS_PER_MOUNTAIN_TILE := 1

func _ready() -> void:
	_scatter_trees()
	_scatter_rocks()

## 정수 좌표 + salt에서 결정적으로 0~1 값을 뽑는다. core.hash2와 같은 정신 —
## Math.random을 쓰지 않는다(무작위면 다시 켤 때마다 숲이 바뀐다).
static func _hash(gx: int, gy: int, salt: int) -> float:
	var h := (gx * 374761393) ^ (gy * 668265263) ^ (salt * 2246822519)
	h = (h ^ (h >> 13)) * 1274126177
	h = h ^ (h >> 16)
	return float(h & 0x7fffffff) / float(0x7fffffff)

func _scatter_trees() -> void:
	var ground: float = TerrainBuilder.LEGEND["T"].height
	var positions: Array = []
	var scales: Array[float] = []
	var rows := TestMap.ROWS
	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			if row[x] != "T":
				continue
			for i in TREES_PER_FOREST_TILE:
				var jx := (_hash(x, y, i * 2) - 0.5) * TestMap.TILE_SIZE * 0.8
				var jz := (_hash(x, y, i * 2 + 1) - 0.5) * TestMap.TILE_SIZE * 0.8
				var s := 0.7 + _hash(x, y, i * 2 + 100) * 0.6
				positions.append(TestMap.world_pos(x, y) + Vector3(jx, ground, jz))
				scales.append(s)

	if positions.is_empty():
		return

	var trunk_mesh := CylinderMesh.new()
	trunk_mesh.top_radius = 0.35
	trunk_mesh.bottom_radius = 0.5
	trunk_mesh.height = 3.0

	var canopy_mesh := SphereMesh.new()
	canopy_mesh.radius = 2.2
	canopy_mesh.height = 4.0

	var trunk_mat := StandardMaterial3D.new()
	trunk_mat.albedo_color = Color(0.32, 0.22, 0.14)
	var canopy_mat := StandardMaterial3D.new()
	canopy_mat.albedo_color = Color(0.18, 0.36, 0.16)

	var trunk_mm := MultiMesh.new()
	trunk_mm.transform_format = MultiMesh.TRANSFORM_3D
	trunk_mm.mesh = trunk_mesh
	trunk_mm.instance_count = positions.size()
	var trunk_mmi := MultiMeshInstance3D.new()
	trunk_mmi.multimesh = trunk_mm
	trunk_mmi.material_override = trunk_mat
	trunk_mmi.name = "TreeTrunks"
	add_child(trunk_mmi)

	var canopy_mm := MultiMesh.new()
	canopy_mm.transform_format = MultiMesh.TRANSFORM_3D
	canopy_mm.mesh = canopy_mesh
	canopy_mm.instance_count = positions.size()
	var canopy_mmi := MultiMeshInstance3D.new()
	canopy_mmi.multimesh = canopy_mm
	canopy_mmi.material_override = canopy_mat
	canopy_mmi.name = "TreeCanopies"
	add_child(canopy_mmi)

	var trunks := StaticBody3D.new()
	trunks.name = "TreeTrunkCollisions"
	add_child(trunks)

	for i in positions.size():
		var s: float = scales[i]
		var basis := Basis().scaled(Vector3(s, s, s))
		var base_pos: Vector3 = positions[i]
		trunk_mm.set_instance_transform(i, Transform3D(basis, base_pos + Vector3(0, 1.5 * s, 0)))
		canopy_mm.set_instance_transform(i, Transform3D(basis, base_pos + Vector3(0, 3.6 * s, 0)))

		## 잎(캐노피)까지 막지 않는다 — 줄기만 막아야 나무 사이를 지날 때
		## 자연스럽다. 그림보다 살짝 얇게 잡아(반지름 0.5 → 충돌 0.45) 스치는
		## 정도로는 안 걸리게 한다.
		var cs := CollisionShape3D.new()
		var shape := CylinderShape3D.new()
		shape.radius = 0.45 * s
		shape.height = 3.0 * s
		cs.shape = shape
		cs.position = base_pos + Vector3(0, 1.5 * s, 0)
		trunks.add_child(cs)

func _scatter_rocks() -> void:
	var ground: float = TerrainBuilder.LEGEND["^"].height
	var positions: Array[Vector3] = []
	var rows := TestMap.ROWS
	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			if row[x] != "^":
				continue
			for i in ROCKS_PER_MOUNTAIN_TILE:
				var jx := (_hash(x, y, i * 3 + 500) - 0.5) * TestMap.TILE_SIZE * 0.6
				var jz := (_hash(x, y, i * 3 + 501) - 0.5) * TestMap.TILE_SIZE * 0.6
				positions.append(TestMap.world_pos(x, y) + Vector3(jx, ground + 1.0, jz))

	if positions.is_empty():
		return

	var mesh := SphereMesh.new()
	mesh.radius = 1.4
	mesh.height = 2.2

	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.5, 0.48, 0.46)

	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = mesh
	mm.instance_count = positions.size()

	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.material_override = mat
	mmi.name = "Rocks"
	add_child(mmi)

	for i in positions.size():
		mm.set_instance_transform(i, Transform3D(Basis(), positions[i]))
