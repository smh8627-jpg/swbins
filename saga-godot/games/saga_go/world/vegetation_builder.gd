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
## 2026-09-12 — 논밭(F) 타일 산포. 마을 사방 채집 밀도(§60)와는 무관하게
## 그냥 시각 채움이라, 숲보다 조금 더 촘촘하게 둬도 된다(밀 이랑 느낌).
const CROPS_PER_FARM_TILE := 6

## 원본 GLB는 이 세계 격자 단위보다 훨씬 작게 모델링돼 있다(실측:
## tree_oak ~1.2m, rock_largeA ~1.0m, crops_wheatStageB ~0.53m). 기존
## primitive가 만들던 나무·바위 크기(트렁크 높이 3·수관 반지름 2.2 / 바위
## 반지름 1.4)에 맞춰 스케일을 역산했다 — ASSET_GUIDE.md에 실측값과 계산
## 근거를 남겨 둠. 밀은 그런 primitive 선례가 없어 인물 키(character-a
## ×1.25 ≈ 3.4m)의 1/3 정도(허리~가슴 높이)를 목표로 새로 잡았다.
const CROP_SCALE := 2.5

## 2026-09-20 — Kenney tree_oak/rock_largeA를 Quaternius(103-5 팔레트
## 스냅 68종 완비)로 교체. Quaternius는 실척(=실제 미터) 모델이라 Kenney
## 저폴리(작게 만들고 크게 스케일)와 원본 크기가 전혀 달라 지역마다 같은
## `TREE_SCALE` 하나를 못 쓴다 — 종별 실측(trimesh, ASSET_GUIDE 해당
## 날짜)에서 옛 tree_oak 최종 높이(1.226×4.5≈5.52m, 승인판 그대로 유지)에
## 맞춰 역산한 배율을 `REGION_TREE_SCALE`로 따로 둔다.
const REGION_TREE_GLB := {
	"village": "res://assets/generated/variants/CommonTree_1__go_village.glb",
	"ruins": "res://assets/generated/variants/DeadTree_1__go_ruins.glb",
}
const REGION_TREE_SCALE := {
	"village": 0.759,  # CommonTree_1 실측고 7.265 → 5.52/7.265
	"ruins": 0.581,    # DeadTree_1 실측고 9.495 → 5.52/9.495
}
## 바위도 같은 이유로 Rock_Medium_1(큰)·Rock_Medium_2(작은, 모양만 다름)
## 로 교체 — Pebble·RockPath 계열은 103-3 스냅 때 이미 "산책로 장식" 용도로
## 못박아 뒀으니(HISTORY 09-20⑰) 산 바위 자리엔 안 쓴다. 옛 최종 높이
## (rock_largeA 0.675m·rock_smallA 0.669m)에 맞춰 역산.
const REGION_ROCK_LARGE_GLB := {
	"village": "res://assets/generated/variants/Rock_Medium_1__go_village.glb",
	"coast": "res://assets/generated/variants/Rock_Medium_1__go_coast.glb",
	"ruins": "res://assets/generated/variants/Rock_Medium_1__go_ruins.glb",
}
const REGION_ROCK_SMALL_GLB := {
	"village": "res://assets/generated/variants/Rock_Medium_2__go_village.glb",
	"coast": "res://assets/generated/variants/Rock_Medium_2__go_coast.glb",
	"ruins": "res://assets/generated/variants/Rock_Medium_2__go_ruins.glb",
}
const ROCK_LARGE_SCALE := 0.299  # Rock_Medium_1 실측고 2.260 → 0.675/2.260
const ROCK_SMALL_SCALE := 0.352  # Rock_Medium_2 실측고 1.899 → 0.669/1.899
const CROP_GLB := "res://assets/vegetation/crops_wheatStageB.glb"

## 2026-09-20 — 103-5 잔디꽃 22종 스냅 완비분 중 첫 실사용. 평지("." 타일)에
## 성긴 지면 장식 하나만 얹는다(순수 시각, 충돌 없음 — FOREST forest_biome_
## scatter.gd DENSITY 방식과 같은 결). 옛 참조 크기가 없어(신규 장식) 실측
## 30cm 안팎(사람 발목 높이)을 목표로 새로 잡았다.
const REGION_CLUTTER_GLB := {
	"village": "res://assets/generated/variants/Clover_1__go_village.glb",
	"coast": "res://assets/generated/variants/Clover_1__go_coast.glb",
	"ruins": "res://assets/generated/variants/Grass_Wispy_Short__go_ruins.glb",
}
const REGION_CLUTTER_SCALE := {
	"village": 0.262,  # Clover_1 실측고 1.145 → 0.3/1.145
	"coast": 0.262,
	"ruins": 0.28,     # Grass_Wispy_Short 실측고 1.072 → 0.3/1.072
}
const CLUTTER_DENSITY := 6  # 평지 칸 6개 중 1개꼴에만 놓는다(FOREST DENSITY=10과 같은 결)

var region_id := "village"


func _ready() -> void:
	_scatter_trees()
	_scatter_rocks()
	_scatter_crops()
	_scatter_clutter()


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
	var rows := TestMap.rows_of(region_id)
	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			if row[x] != "T":
				continue
			for i in TREES_PER_FOREST_TILE:
				var jx := (_hash(x, y, i * 2) - 0.5) * TestMap.TILE_SIZE * 0.8
				var jz := (_hash(x, y, i * 2 + 1) - 0.5) * TestMap.TILE_SIZE * 0.8
				var s := 0.7 + _hash(x, y, i * 2 + 100) * 0.6
				positions.append(TestMap.world_pos(x, y, region_id) + Vector3(jx, ground, jz))
				scales.append(s)
				yaws.append(_hash(x, y, i * 2 + 200) * TAU)

	if positions.is_empty():
		return

	var tree_mesh := GLBUtils.extract_mesh(REGION_TREE_GLB.get(region_id, REGION_TREE_GLB["village"]))
	if tree_mesh == null:
		return
	var region_tree_scale: float = REGION_TREE_SCALE.get(region_id, REGION_TREE_SCALE["village"])

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
		var s: float = scales[i] * region_tree_scale
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


## 밀은 나무처럼 줄기가 굵지 않아 충돌을 안 붙인다 — 숲의 캐노피처럼
## "스쳐도 안 걸린다" 쪽이 논밭 한가운데를 걸어 지날 때 자연스럽다
## (다른 지면 장식인 vegetation 없음, 새로 만든 첫 예외).
func _scatter_crops() -> void:
	var ground: float = TerrainBuilder.LEGEND["F"].height
	var positions: Array[Vector3] = []
	var scales: Array[float] = []
	var yaws: Array[float] = []
	var rows := TestMap.rows_of(region_id)
	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			if row[x] != "F":
				continue
			for i in CROPS_PER_FARM_TILE:
				var jx := (_hash(x, y, i * 2 + 700) - 0.5) * TestMap.TILE_SIZE * 0.85
				var jz := (_hash(x, y, i * 2 + 701) - 0.5) * TestMap.TILE_SIZE * 0.85
				var s := 0.8 + _hash(x, y, i * 2 + 800) * 0.4
				positions.append(TestMap.world_pos(x, y, region_id) + Vector3(jx, ground, jz))
				scales.append(s)
				yaws.append(_hash(x, y, i * 2 + 900) * TAU)

	if positions.is_empty():
		return

	var crop_mesh := GLBUtils.extract_mesh(CROP_GLB)
	if crop_mesh == null:
		return

	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = crop_mesh
	mm.instance_count = positions.size()

	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.name = "Crops"
	add_child(mmi)

	for i in positions.size():
		var s: float = scales[i] * CROP_SCALE
		var basis := Basis(Vector3.UP, yaws[i]).scaled(Vector3(s, s, s))
		mm.set_instance_transform(i, Transform3D(basis, positions[i]))


func _scatter_rocks() -> void:
	var ground: float = TerrainBuilder.LEGEND["^"].height
	var positions: Array[Vector3] = []
	var use_large: Array[bool] = []
	var yaws: Array[float] = []
	var rows := TestMap.rows_of(region_id)
	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			if row[x] != "^":
				continue
			for i in ROCKS_PER_MOUNTAIN_TILE:
				var jx := (_hash(x, y, i * 3 + 500) - 0.5) * TestMap.TILE_SIZE * 0.6
				var jz := (_hash(x, y, i * 3 + 501) - 0.5) * TestMap.TILE_SIZE * 0.6
				positions.append(TestMap.world_pos(x, y, region_id) + Vector3(jx, ground, jz))
				use_large.append(_hash(x, y, i * 3 + 502) > 0.5)
				yaws.append(_hash(x, y, i * 3 + 503) * TAU)

	if positions.is_empty():
		return

	## 큰 바위·작은 바위 두 GLB를 섞어 산 능선이 다 똑같아 보이지 않게 한다
	## — MultiMesh는 메시 하나당 하나라 종류별로 둘을 만든다(draw call 2회,
	## 여전히 칸마다 노드를 만드는 것보단 훨씬 싸다).
	var large_mesh := GLBUtils.extract_mesh(REGION_ROCK_LARGE_GLB.get(region_id, REGION_ROCK_LARGE_GLB["village"]))
	var small_mesh := GLBUtils.extract_mesh(REGION_ROCK_SMALL_GLB.get(region_id, REGION_ROCK_SMALL_GLB["village"]))

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


func _scatter_clutter() -> void:
	var ground: float = TerrainBuilder.LEGEND["."].height
	var positions: Array[Vector3] = []
	var yaws: Array[float] = []
	var rows := TestMap.rows_of(region_id)
	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			if row[x] != ".":
				continue
			if _hash(x, y, 600) >= 1.0 / float(CLUTTER_DENSITY):
				continue
			var jx := (_hash(x, y, 601) - 0.5) * TestMap.TILE_SIZE * 0.7
			var jz := (_hash(x, y, 602) - 0.5) * TestMap.TILE_SIZE * 0.7
			positions.append(TestMap.world_pos(x, y, region_id) + Vector3(jx, ground, jz))
			yaws.append(_hash(x, y, 603) * TAU)

	if positions.is_empty():
		return

	var glb: String = REGION_CLUTTER_GLB.get(region_id, REGION_CLUTTER_GLB["village"])
	var clutter_mesh := GLBUtils.extract_mesh(glb)
	if clutter_mesh == null:
		return
	var s: float = REGION_CLUTTER_SCALE.get(region_id, REGION_CLUTTER_SCALE["village"])

	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = clutter_mesh
	mm.instance_count = positions.size()

	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.name = "Clutter"
	add_child(mmi)

	for i in positions.size():
		var basis := Basis(Vector3.UP, yaws[i]).scaled(Vector3.ONE * s)
		mm.set_instance_transform(i, Transform3D(basis, positions[i]))
