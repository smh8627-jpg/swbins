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

## PLAN.md 102-5 "초목·지형·애니" — 나무 수관 흔들림(2026-09-21, 순수
## 추가). 원본 StandardMaterial3D 값을 그대로 복사해 셰이더로 바꿔치기
## 하므로(_apply_wind_shader) 겉모습은 그대로고 정점만 흔들린다.
const WIND_SHADER := preload("res://saga_core/shaders/vegetation_wind.gdshader")

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

## PLAN 103-3 "포구·폐허 빈 칸 채우기" — procgen.py 비석(stele, 2026-09-20⑥
## 신설, 그동안 씬에 안 물렸다)을 폐허(ruins)에만 순수 시각 장식으로
## 흩뿌린다. 나무·바위와 달리 별도 스케일 역산이 필요 없다 — make_stele()이
## 이미 실제 미터(기본 높이 1.6m)로 지어 102-1 "사람 1.7m" 세계에 그대로
## 맞는다. 두 씨앗(s1·s2)을 섞어 전부 똑같은 비석으로 안 보이게 한다.
const STELE_GLB_A := "res://assets/generated/props/stele_s1_01.glb"
const STELE_GLB_B := "res://assets/generated/props/stele_s2_02.glb"
const STELE_COLOR := Color(0.55, 0.53, 0.5)  # rock 회색과 같은 톤(102-1 팔레트 확정 전 임시)
## 폐허 바닥(R)은 지역 전체에 21칸뿐(7×7 지도, 실측)이라 clutter 1/6
## 비율로는(실측: 헤드리스로 직접 세어 봄) 겨우 1개만 나온다 — 표본이
## 작아 기대값 언저리에서도 쉽게 빈다. 1/3로 올려 실측 5개로 확인.
const RUINS_DEBRIS_DENSITY := 3

## 2026-09-23 — HISTORY 09-22 재감사에서 나온 "실제로 안 쓰인" procgen
## 산출물 중 rock(노이즈 바위)·fence/wall(울타리·돌담) 마저 배선한다
## (stele만 먼저 됐던 이유는 없음, 그냥 순서 문제). 103-3 표의 지정
## 용도 그대로 "폐허 빈 칸 채우기" — stele(비석, 순수 발견 primitive와
## 안 겹치는 R 칸)와 구별되는 두 자리에 놓는다:
## ① rock — R 바닥에 stele와 같이 흩어지는 저상 잔해(돌무더기, 비석보다
##    낮고 넓어 한눈에 구별된다). ② wall/fence — 산(^) 테두리에 "무너진
##    담장·울타리"로, 이미 있는 Rock_Medium(_scatter_rocks)과 섞여 서서
##    "폐허를 둘러싼 담이 무너져 바위처럼 나뒹군다"는 그림을 만든다.
const RUBBLE_ROCK_GLB := [
	"res://assets/generated/props/rock_s1_01.glb",
	"res://assets/generated/props/rock_s2_02.glb",
	"res://assets/generated/props/rock_s3_03.glb",
	"res://assets/generated/props/rock_s4_04.glb",
]
const RUBBLE_DENSITY := 4  # R 칸 1/4 — stele(1/3)보다 성기게, 화면이 안 빽빽하게
const WALL_FENCE_GLB := [
	"res://assets/generated/props/wall_s1_01.glb",
	"res://assets/generated/props/wall_s2_02.glb",
	"res://assets/generated/props/fence_s1_01.glb",
	"res://assets/generated/props/fence_s2_02.glb",
]
const WALL_FENCE_DENSITY := 3  # ^ 테두리 1/3
const RUBBLE_COLOR := Color(0.4, 0.37, 0.34)

var region_id := "village"


func _ready() -> void:
	_scatter_trees()
	_scatter_rocks()
	_scatter_crops()
	_scatter_clutter()
	_scatter_ruins_debris()
	_scatter_ruins_rubble()
	_scatter_ruins_wall_fence()


## 정수 좌표 + salt에서 결정적으로 0~1 값을 뽑는다. core.hash2와 같은 정신 —
## Math.random을 쓰지 않는다(무작위면 다시 켤 때마다 숲이 바뀐다).
static func _hash(gx: int, gy: int, salt: int) -> float:
	var h := (gx * 374761393) ^ (gy * 668265263) ^ (salt * 2246822519)
	h = (h ^ (h >> 13)) * 1274126177
	h = h ^ (h >> 16)
	return float(h & 0x7fffffff) / float(0x7fffffff)


## 원본 StandardMaterial3D 의 텍스처·알파 시저·러프니스·스페큘러 값을
## 그대로 읽어 wind_sway 셰이더 쪽으로 옮긴다 — 하드코딩하지 않아 원본
## 에셋이 나중에 바뀌어도 이 값들이 따로 안 어긋난다. transparency 가
## ALPHA_SCISSOR 가 아니면(DeadTree 처럼 opaque) 컷아웃을 걸지 않는다.
func _apply_wind_shader(mesh: Mesh, surface_idx: int) -> void:
	var orig := mesh.surface_get_material(surface_idx)
	if not (orig is BaseMaterial3D):
		return
	var bm := orig as BaseMaterial3D
	var mat := ShaderMaterial.new()
	mat.shader = WIND_SHADER
	mat.set_shader_parameter("albedo_texture", bm.albedo_texture)
	var scissor := bm.alpha_scissor_threshold if bm.transparency == BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR else 0.0
	mat.set_shader_parameter("alpha_scissor_threshold", scissor)
	mat.set_shader_parameter("roughness_value", bm.roughness)
	mat.set_shader_parameter("specular_value", bm.metallic_specular)
	mesh.surface_set_material(surface_idx, mat)


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
	_apply_wind_shader(tree_mesh, 0)
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


## clutter와 달리 "." 평지가 아니라 폐허 바닥("R")을 스캔한다 — ruins
## 지도(test_map.gd REGIONS.ruins)엔 "." 타일이 아예 없다(전부 R·T·^뿐,
## 확인함). 충돌은 안 붙인다(rock·clutter와 같은 결 — 순수 시각).
func _scatter_ruins_debris() -> void:
	if region_id != "ruins":
		return
	var ground: float = TerrainBuilder.LEGEND["R"].height
	var positions: Array[Vector3] = []
	var yaws: Array[float] = []
	var use_b: Array[bool] = []
	var rows := TestMap.rows_of(region_id)
	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			if row[x] != "R":
				continue
			if _hash(x, y, 700) >= 1.0 / float(RUINS_DEBRIS_DENSITY):
				continue
			var jx := (_hash(x, y, 701) - 0.5) * TestMap.TILE_SIZE * 0.6
			var jz := (_hash(x, y, 702) - 0.5) * TestMap.TILE_SIZE * 0.6
			positions.append(TestMap.world_pos(x, y, region_id) + Vector3(jx, ground, jz))
			yaws.append(_hash(x, y, 703) * TAU)
			use_b.append(_hash(x, y, 704) > 0.5)

	if positions.is_empty():
		return

	var mesh_a := GLBUtils.extract_mesh(STELE_GLB_A)
	var mesh_b := GLBUtils.extract_mesh(STELE_GLB_B)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = STELE_COLOR

	var xf_a: Array[Transform3D] = []
	var xf_b: Array[Transform3D] = []
	for i in positions.size():
		var basis := Basis(Vector3.UP, yaws[i])
		var xf := Transform3D(basis, positions[i])
		if use_b[i]:
			xf_b.append(xf)
		else:
			xf_a.append(xf)

	if mesh_a != null and not xf_a.is_empty():
		var mmi_a := _build_rock_multimesh(mesh_a, xf_a, "RuinsDebrisA")
		mmi_a.material_override = mat
		add_child(mmi_a)
	if mesh_b != null and not xf_b.is_empty():
		var mmi_b := _build_rock_multimesh(mesh_b, xf_b, "RuinsDebrisB")
		mmi_b.material_override = mat
		add_child(mmi_b)


## procgen.py make_rock() — 이코사구 노이즈 바위, 씨앗마다 정점색을 이미
## 구워 넣었다(_concat_colored, 103-1 헤더 참고) — stele·wall/fence와
## 달리 material_override를 씌우지 않는다(씌우면 그 정점색 변주가
## 사라진다). stele와 같은 R 바닥에 놓이지만 더 낮고(반지름 0.5 안팎)
## 넓어 비석과 한눈에 구별된다 — "무너진 건물 잔해 위에 뒹구는 돌무더기".
func _scatter_ruins_rubble() -> void:
	if region_id != "ruins":
		return
	var ground: float = TerrainBuilder.LEGEND["R"].height
	var xf_by_variant: Array[Array] = []
	for i in RUBBLE_ROCK_GLB.size():
		var arr: Array[Transform3D] = []
		xf_by_variant.append(arr)
	var rows := TestMap.rows_of(region_id)
	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			if row[x] != "R":
				continue
			if _hash(x, y, 720) >= 1.0 / float(RUBBLE_DENSITY):
				continue
			var jx := (_hash(x, y, 721) - 0.5) * TestMap.TILE_SIZE * 0.65
			var jz := (_hash(x, y, 722) - 0.5) * TestMap.TILE_SIZE * 0.65
			var pos := TestMap.world_pos(x, y, region_id) + Vector3(jx, ground, jz)
			var yaw := _hash(x, y, 723) * TAU
			var variant := int(_hash(x, y, 724) * RUBBLE_ROCK_GLB.size()) % RUBBLE_ROCK_GLB.size()
			(xf_by_variant[variant] as Array[Transform3D]).append(Transform3D(Basis(Vector3.UP, yaw), pos))

	for i in RUBBLE_ROCK_GLB.size():
		var xforms: Array[Transform3D] = xf_by_variant[i]
		if xforms.is_empty():
			continue
		var mesh := GLBUtils.extract_mesh(RUBBLE_ROCK_GLB[i])
		if mesh == null:
			continue
		add_child(_build_rock_multimesh(mesh, xforms, "RuinsRubble%d" % i))


## procgen.py make_wall()/make_fence() — 담장·울타리 한 칸씩(103-1 헤더
## 참고), 정점색 없이 임포트되니 stele처럼 flat material_override가
## 필요하다. _scatter_rocks()가 이미 세우는 Rock_Medium과 같은 "^"
## 테두리 칸에 섞어 놓아 "폐허를 둘러싼 담이 무너져 바위 사이에 뒹군다"는
## 그림을 만든다 — stele·rubble(R 바닥)과는 자리가 겹치지 않는다.
func _scatter_ruins_wall_fence() -> void:
	if region_id != "ruins":
		return
	var ground: float = TerrainBuilder.LEGEND["^"].height
	var xf_by_variant: Array[Array] = []
	for i in WALL_FENCE_GLB.size():
		var arr: Array[Transform3D] = []
		xf_by_variant.append(arr)
	var rows := TestMap.rows_of(region_id)
	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			if row[x] != "^":
				continue
			if _hash(x, y, 740) >= 1.0 / float(WALL_FENCE_DENSITY):
				continue
			var jx := (_hash(x, y, 741) - 0.5) * TestMap.TILE_SIZE * 0.5
			var jz := (_hash(x, y, 742) - 0.5) * TestMap.TILE_SIZE * 0.5
			var pos := TestMap.world_pos(x, y, region_id) + Vector3(jx, ground, jz)
			var yaw := _hash(x, y, 743) * TAU
			var variant := int(_hash(x, y, 744) * WALL_FENCE_GLB.size()) % WALL_FENCE_GLB.size()
			(xf_by_variant[variant] as Array[Transform3D]).append(Transform3D(Basis(Vector3.UP, yaw), pos))

	var mat := StandardMaterial3D.new()
	mat.albedo_color = RUBBLE_COLOR
	for i in WALL_FENCE_GLB.size():
		var xforms: Array[Transform3D] = xf_by_variant[i]
		if xforms.is_empty():
			continue
		var mesh := GLBUtils.extract_mesh(WALL_FENCE_GLB[i])
		if mesh == null:
			continue
		var mmi := _build_rock_multimesh(mesh, xforms, "RuinsWallFence%d" % i)
		mmi.material_override = mat
		add_child(mmi)
