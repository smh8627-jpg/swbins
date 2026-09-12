extends Node3D

## VERTICAL_SLICE_FOREST.md 4절 "나무 몇 그루만(GO의 tree_oak.glb 재사용)"
## — 소나무·바위·꽃 등 다른 채집 대상은 "제외" 목록이라 여기 없다.
## 2절이 이미 확인해 둔 값 그대로 재사용한다: tree_oak.glb ×4.5가 이
## 3.0m 타일에 캐노피 폭 ≈2.9m로 딱 들어맞는다(새 자산 없이 GO의 나무를
## 그대로 가져다 쓴다).
##
## GO의 vegetation_builder.gd와 같은 원칙("자리는 시각의 순수 함수다") —
## 결정적 해시로 늘 같은 자리에 선다. 1절 결정(구면 투영)에 따라 나무도
## 땅과 같은 곡률 머티리얼을 써야 한다 — 안 그러면 나무가 굽은 땅 위에
## 붕 뜬 것처럼 보인다(world_curve.gdshaderinc 주석 그대로).

const ForestMap := preload("res://games/saga_forest/data/village_map.gd")
const GLBUtils := preload("res://games/saga_go/world/glb_utils.gd")
const WorldCurveMaterial := preload("res://saga_core/world/world_curve_material.gd")

const TREE_GLB := "res://assets/vegetation/tree_oak.glb"
const TREE_SCALE := 4.5  # VERTICAL_SLICE_FOREST.md 2절 — GO가 이미 검증한 값 그대로
const TREES_PER_EDGE_TILE := 2
const CURVE_AMOUNT := 0.004


func _ready() -> void:
	_scatter_trees()


static func _hash(gx: int, gy: int, salt: int) -> float:
	var h := (gx * 374761393) ^ (gy * 668265263) ^ (salt * 2246822519)
	h = (h ^ (h >> 13)) * 1274126177
	h = h ^ (h >> 16)
	return float(h & 0x7fffffff) / float(0x7fffffff)


func _scatter_trees() -> void:
	var ground := 0.0
	var positions: Array[Vector3] = []
	var scales: Array[float] = []
	var yaws: Array[float] = []
	var rows := ForestMap.ROWS
	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			if row[x] != "T":
				continue
			for i in TREES_PER_EDGE_TILE:
				var jx := (_hash(x, y, i * 2) - 0.5) * ForestMap.TILE_SIZE * 0.8
				var jz := (_hash(x, y, i * 2 + 1) - 0.5) * ForestMap.TILE_SIZE * 0.8
				var s := 0.7 + _hash(x, y, i * 2 + 100) * 0.6
				positions.append(ForestMap.world_pos(x, y) + Vector3(jx, ground, jz))
				scales.append(s)
				yaws.append(_hash(x, y, i * 2 + 200) * TAU)

	if positions.is_empty():
		return

	var tree_mesh := GLBUtils.extract_mesh(TREE_GLB)
	if tree_mesh == null:
		return

	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = tree_mesh
	mm.instance_count = positions.size()

	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.name = "Trees"
	mmi.material_override = WorldCurveMaterial.vertex_color_material(CURVE_AMOUNT)
	add_child(mmi)

	var trunks := StaticBody3D.new()
	trunks.name = "TreeTrunkCollisions"
	add_child(trunks)

	for i in positions.size():
		var s: float = scales[i] * TREE_SCALE
		var basis := Basis(Vector3.UP, yaws[i]).scaled(Vector3(s, s, s))
		var base_pos: Vector3 = positions[i]
		mm.set_instance_transform(i, Transform3D(basis, base_pos))

		## GO vegetation_builder.gd와 같은 값(줄기만 막는다, 캐노피는 안
		## 막는다) — 걷는 느낌을 그대로 물려받는다.
		var cs := CollisionShape3D.new()
		var shape := CylinderShape3D.new()
		shape.radius = 0.4 * scales[i]
		shape.height = 3.0 * scales[i]
		cs.shape = shape
		cs.position = base_pos + Vector3(0, 1.5 * scales[i], 0)
		trunks.add_child(cs)
