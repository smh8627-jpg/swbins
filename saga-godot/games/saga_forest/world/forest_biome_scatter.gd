extends Node3D

## VERTICAL_SLICE_FOREST.md 4절 "제외" 목록 7번(마지막 항목) — 바이옴
## 지형 다양성 중 "그 바이옴다운 사물"(웹판 village.js BIOME_SCATTER)
## 절반. 땅 색은 forest_terrain_builder.gd가 이미 ForestBiome.color_at()
## 으로 칠했고, 여기는 그 위에 성긴 장식(순수 시각 — 충돌·채집 없음)을
## 얹는다.
##
## **재해석** — 웹판은 숲 고리(마을 훨씬 바깥)에 짐승·몬스터까지 곁들인
## 훨씬 큰 바이옴 산포 체계를 깐다. 이 슬라이스는 그 고리가 없어 마을
## 안 사분면에, 짐승·몬스터 없이 장식 사물만 흩뿌린다 — 그건 "몬스터·
## 퓨전 콘텐츠"(4절 5번, 여전히 별개 항목으로 제외).
##
## 자리는 forest_vegetation_builder.gd `_hash()`와 같은 원칙 —
## **좌표+salt 결정적 해시**(Math.random을 안 쓴다).

const ForestMap := preload("res://games/saga_forest/data/village_map.gd")
const ForestBiome := preload("res://games/saga_forest/data/forest_biome.gd")
const TerrainBuilder := preload("res://games/saga_forest/world/forest_terrain_builder.gd")
const GLBUtils := preload("res://games/saga_go/world/glb_utils.gd")
const WorldCurveMaterial := preload("res://saga_core/world/world_curve_material.gd")

const CURVE_AMOUNT := 0.004
const DENSITY := 10  # 풀밭 칸 10개 중 1개꼴(해시 문턱)에만 놓는다
const CLEAR_RADIUS := 2  # 이 격자 거리 안(주민·채집물·집 등)엔 안 놓는다

## 상호작용하는 고정 자리 — villager_builder.gd VILLAGERS·gatherable_builder.gd
## DEFS(약초 포함)·forest_house.gd HOUSE_GRID·museum.gd GRID·fishing_spot.gd
## GRID의 grid 값을 그대로 옮겨 적었다(각자 다른 스크립트의 const라 계산식
## 으로 못 끌어온다 — forest_planting.gd 상단과 같은 제약). **이 좌표들을
## 옮기게 되면 이 목록도 같이 고칠 것.**
const CLEAR_SPOTS: Array = [
	Vector2i(19, 9), Vector2i(26, 5), Vector2i(5, 14), Vector2i(25, 8),
	Vector2i(5, 8), Vector2i(14, 15),                                        # 주민 6
	Vector2i(24, 3), Vector2i(9, 12), Vector2i(22, 12), Vector2i(9, 5),
	Vector2i(14, 4), Vector2i(18, 13), Vector2i(6, 11), Vector2i(8, 15),      # 채집물 8(약초 포함)
	Vector2i(15, 9), Vector2i(12, 6), Vector2i(22, 5),                       # 집·박물관·낚시터
]


func _ready() -> void:
	var rows: Array = ForestMap.ROWS
	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			if row[x] != ".":
				continue
			if _too_close(Vector2i(x, y)):
				continue
			if _hash(x, y, 1) >= 1.0 / float(DENSITY):
				continue
			_spawn(x, y)


func _too_close(p: Vector2i) -> bool:
	for c: Vector2i in CLEAR_SPOTS:
		if absi(c.x - p.x) <= CLEAR_RADIUS and absi(c.y - p.y) <= CLEAR_RADIUS:
			return true
	return false


func _spawn(x: int, y: int) -> void:
	var biome := ForestBiome.biome_at(x, y)
	var ground: float = TerrainBuilder.LEGEND["."].height
	var pos := ForestMap.world_pos(x, y) + Vector3(0, ground, 0)
	pos.x += (_hash(x, y, 2) - 0.5) * ForestMap.TILE_SIZE * 0.7
	pos.z += (_hash(x, y, 3) - 0.5) * ForestMap.TILE_SIZE * 0.7

	match String(biome.key):
		"meadow":
			var mi := MeshInstance3D.new()
			var s := SphereMesh.new()
			s.radius = 0.14
			s.height = 0.28
			mi.mesh = s
			mi.position = pos + Vector3(0, 0.14, 0)
			mi.material_override = WorldCurveMaterial.vertex_color_material(
				CURVE_AMOUNT, 0.6, Color(0.95, 0.75, 0.55))
			add_child(mi)
		"dark":
			var mi := MeshInstance3D.new()
			var b := BoxMesh.new()
			b.size = Vector3(0.5, 0.4, 0.5)
			mi.mesh = b
			mi.position = pos + Vector3(0, 0.2, 0)
			mi.material_override = WorldCurveMaterial.vertex_color_material(
				CURVE_AMOUNT, 0.9, Color(0.1, 0.18, 0.11))
			add_child(mi)
		"mush":
			_spawn_mushroom(pos)
		"rocky":
			var mesh: Mesh = GLBUtils.extract_mesh("res://assets/rocks/rock_smallA.glb")
			if mesh != null:
				var mi := MeshInstance3D.new()
				mi.mesh = mesh
				mi.scale = Vector3.ONE * 0.6
				mi.position = pos
				mi.material_override = WorldCurveMaterial.vertex_color_material(
					CURVE_AMOUNT, 0.95, Color(1, 1, 1))
				add_child(mi)


## GLB 킷에 어울리는 버섯 조각이 없어 primitive 둘(줄기+갓)로 짓는다 —
## gatherable_builder.gd의 꽃(primitive 구)과 같은 "적당한 에셋이 없으면
## primitive" 예외.
func _spawn_mushroom(pos: Vector3) -> void:
	var root := Node3D.new()
	root.position = pos
	add_child(root)

	var stem := MeshInstance3D.new()
	var stem_mesh := CylinderMesh.new()
	stem_mesh.top_radius = 0.05
	stem_mesh.bottom_radius = 0.06
	stem_mesh.height = 0.22
	stem.mesh = stem_mesh
	stem.position = Vector3(0, 0.11, 0)
	stem.material_override = WorldCurveMaterial.vertex_color_material(
		CURVE_AMOUNT, 0.9, Color(0.9, 0.87, 0.78))
	root.add_child(stem)

	var cap := MeshInstance3D.new()
	var cap_mesh := SphereMesh.new()
	cap_mesh.radius = 0.16
	cap_mesh.height = 0.16
	cap.mesh = cap_mesh
	cap.position = Vector3(0, 0.24, 0)
	cap.material_override = WorldCurveMaterial.vertex_color_material(
		CURVE_AMOUNT, 0.7, Color(0.75, 0.22, 0.2))
	root.add_child(cap)


## forest_vegetation_builder.gd `_hash(gx,gy,salt)`와 완전히 같은
## 알고리즘 — 각자 자기 파일에 둔다(공용화할 이유가 없다는 이 코드베이스의
## 확립된 결, forest_turnip.gd·forest_planting.gd와 같은 이유).
static func _hash(gx: int, gy: int, salt: int) -> float:
	var h := (gx * 374761393) ^ (gy * 668265263) ^ (salt * 2246822519)
	h = (h ^ (h >> 13)) * 1274126177
	h = h ^ (h >> 16)
	return float(h & 0x7fffffff) / float(0x7fffffff)
