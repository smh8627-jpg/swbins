extends Node3D

## master.md 43·44절 — Vegetation/Rock 배치. 웹판 전체가 지키는 원칙
## ("자리는 시각의 순수 함수다" — SAGA-HANDOFF.md의 npc.js/land.js 규칙)을
## 그대로 따른다: 매 프레임 새로 뽑지 않고, 격자 좌표에서 결정적으로 해시해
## 늘 같은 자리에 같은 나무가 선다.
##
## 2026-09-11 — PLAN.md 43·44장(GLB 교체). 나무/바위 모두 CC0 Kenney
## Nature Kit(assets/vegetation·assets/rocks, ASSET_GUIDE.md 참고)의
## GLB 메시로 바꿨다. 각 GLB는 "루트 하나 + MeshInstance3D 하나"(나무는
## 몸통+수관이 한 Mesh 안에 표면 2장으로 이미 합쳐져 있다)라 primitive였을
## 때와 똑같이 MultiMesh 하나에 얹을 수 있다 — draw call 수는 그대로다
## (master.md 35장).

const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")
const GLBUtils := preload("res://games/saga_go/world/glb_utils.gd")

const TREES_PER_FOREST_TILE := 3
const ROCKS_PER_MOUNTAIN_TILE := 1

## 원본 GLB는 이 세계 격자 단위보다 훨씬 작게 모델링돼 있다(실측:
## tree_oak ~1.2m, rock_largeA ~1.0m). 기존 primitive가 만들던 나무·바위
## 크기(트렁크 높이 3·수관 반지름 2.2 / 바위 반지름 1.4)에 맞춰 스케일을
## 역산했다 — ASSET_GUIDE.md에 실측값과 계산 근거를 남겨 둠.
const TREE_SCALE := 4.5
const ROCK_LARGE_SCALE := 2.6
const ROCK_SMALL_SCALE := 3.5

const TREE_GLB := "res://assets/vegetation/tree_oak.glb"
const ROCK_LARGE_GLB := "res://assets/rocks/rock_largeA.glb"
const ROCK_SMALL_GLB := "res://assets/rocks/rock_smallA.glb"


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
	var positions: Array[Vector3] = []
	var scales: Array[float] = []
	var yaws: Array[float] = []
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
	add_child(mmi)

	var trunks := StaticBody3D.new()
	trunks.name = "TreeTrunkCollisions"
	add_child(trunks)

	for i in positions.size():
		var s: float = scales[i] * TREE_SCALE
		var basis := Basis(Vector3.UP, yaws[i]).scaled(Vector3(s, s, s))
		var base_pos: Vector3 = positions[i]
		mm.set_instance_transform(i, Transform3D(basis, base_pos))

		## 잎(캐노피)까지 막지 않는다 — 줄기만 막아야 나무 사이를 지날 때
		## 자연스럽다. GLB 몸통 폭보다 얇게 잡아(0.4·1.3 unscaled)
		## 스치는 정도로는 안 걸리게 한다. 값은 GLB 실측 기반이 아니라
		## primitive 시절 충돌 크기를 그대로 유지한 것 — 걷는 느낌이
		## 에셋 교체로 갑자기 바뀌지 않게 하려는 의도적 선택.
		var cs := CollisionShape3D.new()
		var shape := CylinderShape3D.new()
		shape.radius = 0.4 * scales[i]
		shape.height = 3.0 * scales[i]
		cs.shape = shape
		cs.position = base_pos + Vector3(0, 1.5 * scales[i], 0)
		trunks.add_child(cs)


func _scatter_rocks() -> void:
	var ground: float = TerrainBuilder.LEGEND["^"].height
	var positions: Array[Vector3] = []
	var use_large: Array[bool] = []
	var yaws: Array[float] = []
	var rows := TestMap.ROWS
	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			if row[x] != "^":
				continue
			for i in ROCKS_PER_MOUNTAIN_TILE:
				var jx := (_hash(x, y, i * 3 + 500) - 0.5) * TestMap.TILE_SIZE * 0.6
				var jz := (_hash(x, y, i * 3 + 501) - 0.5) * TestMap.TILE_SIZE * 0.6
				positions.append(TestMap.world_pos(x, y) + Vector3(jx, ground, jz))
				use_large.append(_hash(x, y, i * 3 + 502) > 0.5)
				yaws.append(_hash(x, y, i * 3 + 503) * TAU)

	if positions.is_empty():
		return

	## 큰 바위·작은 바위 두 GLB를 섞어 산 능선이 다 똑같아 보이지 않게 한다
	## — MultiMesh는 메시 하나당 하나라 종류별로 둘을 만든다(draw call 2회,
	## 여전히 칸마다 노드를 만드는 것보단 훨씬 싸다).
	var large_mesh := GLBUtils.extract_mesh(ROCK_LARGE_GLB)
	var small_mesh := GLBUtils.extract_mesh(ROCK_SMALL_GLB)

	var large_positions: Array[Transform3D] = []
	var small_positions: Array[Transform3D] = []
	for i in positions.size():
		var basis: Basis
		var xf: Transform3D
		if use_large[i]:
			basis = Basis(Vector3.UP, yaws[i]).scaled(Vector3.ONE * ROCK_LARGE_SCALE)
			xf = Transform3D(basis, positions[i])
			large_positions.append(xf)
		else:
			basis = Basis(Vector3.UP, yaws[i]).scaled(Vector3.ONE * ROCK_SMALL_SCALE)
			xf = Transform3D(basis, positions[i])
			small_positions.append(xf)

	if large_mesh != null and not large_positions.is_empty():
		add_child(_build_rock_multimesh(large_mesh, large_positions, "RocksLarge"))
	if small_mesh != null and not small_positions.is_empty():
		add_child(_build_rock_multimesh(small_mesh, small_positions, "RocksSmall"))


func _build_rock_multimesh(mesh: Mesh, transforms: Array[Transform3D], node_name: String) -> MultiMeshInstance3D:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = mesh
	mm.instance_count = transforms.size()
	for i in transforms.size():
		mm.set_instance_transform(i, transforms[i])

	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.name = node_name
	return mmi
