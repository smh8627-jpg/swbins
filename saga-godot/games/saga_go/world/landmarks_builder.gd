extends Node3D

## VERTICAL_SLICE.md 27절 — 지도 위 이름난 자리(랜드마크)를 세운다.
## 2026-09-11 — PLAN.md 45·46장(GLB 교체). 마을집·폐허 기둥·다리 널판을
## CC0 Kenney Fantasy Town Kit(assets/buildings, ASSET_GUIDE.md 참고)의
## GLB 조각으로 바꿨다. 굴 입구는 이 킷에 맞는 조각이 없어 이번 교체에서
## 빠졌었다 — 같은 날 뒤이어 CC0 Kenney Modular Cave Kit의 gate-rock.glb로
## 마저 바꿨다(아래 _add_cave 참고). 마을집도 처음엔 wall-block.glb 한 장을
## 비균등 스케일로 늘려 대체했었는데, 그 뒤 이어서 실제로 여러 장을 격자로
## 이어 붙이는 모듈형 조립(_build_wall_perimeter)으로 바꿨다 —
## docs/ASSET_GUIDE.md 참고.

const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")
const GLBUtils := preload("res://games/saga_go/world/glb_utils.gd")

const WALL_GLB := "res://assets/buildings/wall-block.glb"
const ROOF_GLB := "res://assets/buildings/roof-gable.glb"
const PILLAR_GLB := "res://assets/buildings/pillar-stone.glb"
const PLANK_GLB := "res://assets/buildings/planks.glb"
const CAVE_GATE_GLB := "res://assets/dungeon/gate-rock.glb"
const SHRINE_GLB := "res://assets/shrine/altar-stone.glb"

## wall-block.glb는 1x1x1 정육면체(바닥이 원점) — 실제 모듈형 킷답게
## 늘리지 않고 원래 크기 그대로 여러 장을 격자로 이어 붙인다(_build_wall_perimeter).
## 값은 발자국 x칸·z칸·y층수(전부 1m 단위) — 기존 primitive 몸통(10x4x10)과
## 같은 바깥 치수가 나오게 잡았다.
const WALL_FOOTPRINT := Vector3(10, 4, 10)
## roof-gable.glb(1.1 x 0.57 x 1.07)는 원래 비율이 이미 지붕다워서 세 축을
## 거의 같은 배수로만 키웠다 — 폭 기준 10배.
const ROOF_SCALE := Vector3(10, 10, 10)
## pillar-stone.glb(높이 1m 원기둥)의 지름 스케일 — 얇을수록 폐허답다.
const RUIN_PILLAR_RADIUS_SCALE := 4.0
## gate-rock.glb(4.0 x 4.05 x 2.454, 바닥 피벗)은 이미 아치 비율이 잡혀
## 있어 축을 고르게(균일) 키우기만 한다 — wall-block처럼 단순 색 아틀라스가
## 아니라 실제 바위 굴곡 노멀맵이 있는 조각이라, 비균등 스케일을 쓰면
## 그 결이 늘어나 이상해 보인다(ASSET_GUIDE.md "마을집이 늘어난 이유" 절
## 참고 — 거긴 색 아틀라스라 비균등이 통했지만 여긴 안 통한다). 원래
## primitive 높이(6)에 맞춰 스케일을 역산했다.
const CAVE_GATE_SIZE := Vector3(4.0, 4.05, 2.454)
const CAVE_GATE_SCALE := 6.0 / 4.05
## altar-stone.glb(CC0 Kenney Graveyard Kit, ASSET_GUIDE.md 참고, 실측
## 1.04 x 0.49 x 0.65m, 바닥 중앙 피벗)는 gate-rock.glb와 같은 이유로
## 균일 스케일만 쓴다(실제 돌 표면 굴곡이 있는 조각). 웃허리 높이 제단
## 하나가 목표라 primitive 선례 없이 새로 잡았다 — 최종 높이 약 1.2m,
## 너비 약 2.6m.
const SHRINE_SIZE := Vector3(1.04, 0.49, 0.65)
const SHRINE_SCALE := 2.5

## 2026-09-12⑩ — 산속 폭포(waterfall_falls, land.js 다섯 표식 중 마지막).
## 새 킷을 받지 않고 **이미 받아 둔** vegetation_builder.gd의 산 바위
## (rock_largeA.glb, 실측 0.78 x 0.26 x 1.02)를 절벽처럼 세로로 세워
## 재사용한다 — 사당·굴처럼 새 킷을 받을 정도로 다른 조각이 필요하진
## 않다고 판단(44장 "에셋은 무작정 많이 넣지 않는다"). 폭포 물줄기·물웅덩이는
## 이 판에 맞는 GLB가 아예 없어(강물도 마찬가지였다) terrain_builder.gd의
## WaterSurface와 같은 색·투명도의 primitive 평면으로 낸다 — "primitive는
## 프로토타입에서만"의 예외가 아니라, 강물 표면도 이미 같은 방식이었다.
const WATERFALL_ROCK_GLB := "res://assets/rocks/rock_largeA.glb"
const WATERFALL_ROCK_SCALE := Vector3(2.6, 5.0, 2.2)
const WATERFALL_FACE_SIZE := Vector2(2.6, 4.0)
const WATERFALL_POOL_SIZE := Vector2(3.2, 3.2)
const WATERFALL_WATER_COLOR := Color(0.25, 0.45, 0.62, 0.72) # terrain_builder.gd WaterSurface와 같은 색


## 2026-09-12④ — CodexState "지역" 갈래(§26 "발견 도감") 발견 반경.
## 사건 조우 반경(20m)보다 넉넉히 잡았다 — 위협이 아니라 그냥 랜드마크에
## 가까이 왔다는 것만 확인하면 되니 더 관대해도 된다.
const DISCOVERY_RADIUS := 25.0


func _ready() -> void:
	_add_cave()
	_add_village()
	_add_ruins()
	_add_bridge()
	_add_shrine()
	_add_waterfall()


func _box(size: Vector3, color: Color) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mi.mesh = mesh
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mi.material_override = mat
	return mi


## CodexState "지역" 발견 — 마을(집 두 채)처럼 한 곳에 여러 번 걸어도
## discover()가 알아서 dedup한다(두 번째부터는 조용히 아무 일도 안 함).
func _add_discovery_area(codex_id: String, pos: Vector3, parent: Node3D) -> void:
	var area := Area3D.new()
	area.name = "Discover_" + codex_id
	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = DISCOVERY_RADIUS
	cs.shape = shape
	area.add_child(cs)
	area.position = pos
	parent.add_child(area)
	area.body_entered.connect(func(body: Node3D) -> void:
		if body.is_in_group("player"):
			CodexState.discover("place", codex_id))


## 그림만 있고 부딪히지 않던 것 — 건물마다 이걸로 실제 벽을 붙인다.
func _solid(size: Vector3, local_pos: Vector3, parent: Node3D) -> void:
	var body := StaticBody3D.new()
	body.name = "Collision"
	body.position = local_pos
	var cs := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = size
	cs.shape = box
	body.add_child(cs)
	parent.add_child(body)


func _add_cave() -> void:
	var ground: float = TerrainBuilder.LEGEND["C"].height
	## 2026-09-11㉒ 지도 확장(+2,+2) — test_map.gd 참고.
	var base_pos := TestMap.world_pos(5, 2) + Vector3(0, ground, 0)
	var size := CAVE_GATE_SIZE * CAVE_GATE_SCALE
	var gate_mesh := GLBUtils.extract_mesh(CAVE_GATE_GLB)

	if gate_mesh != null:
		var mi := MeshInstance3D.new()
		mi.name = "CaveEntrance"
		mi.mesh = gate_mesh
		## gate-rock.glb는 바닥이 원점이라 primitive 시절처럼 높이 절반만큼
		## 띄울 필요가 없다(village/ruins와 같은 이유, ASSET_GUIDE.md 참고).
		mi.transform = Transform3D(Basis().scaled(Vector3.ONE * CAVE_GATE_SCALE), base_pos)
		add_child(mi)
	else:
		## 못 받아 왔으면 예전 primitive로 대체 — bridge의 fallback과 같은 패턴.
		var cave := _box(size, Color(0.12, 0.12, 0.14))
		cave.name = "CaveEntrance"
		cave.position = base_pos + Vector3(0, size.y * 0.5, 0)
		add_child(cave)

	## 충돌은 시각 메시의 피벗과 무관하게 중심 기준이라 그대로 둔다
	## (village 쪽 주석과 같은 이유) — 동굴 입구는 지나갈 수 있는 통로가
	## 아니라 랜드마크 장애물이라는 기존 동작을 그대로 유지한다.
	_solid(size, base_pos + Vector3(0, size.y * 0.5, 0), self)
	_add_discovery_area("cave", base_pos, self)


## 옛 사당(S) — test_map.gd LEGEND에 이미 있었지만 2026-09-11㉒ 지도 확장
## 전까지 지도에 한 번도 안 쓰인 자리(격자 (2,1), 북서쪽 숲 모퉁이). 굴·
## 폐허·다리처럼 눈에 보이는 랜드마크 하나만 세운다 — 안에 들어가는 씬은
## 아니다(§32와 같은 경계, 이번엔 사당이라 충돌은 얕게만 잡는다).
func _add_shrine() -> void:
	var ground: float = TerrainBuilder.LEGEND["S"].height
	var base_pos := TestMap.world_pos(2, 1) + Vector3(0, ground, 0)
	var size := SHRINE_SIZE * SHRINE_SCALE
	var altar_mesh := GLBUtils.extract_mesh(SHRINE_GLB)

	if altar_mesh != null:
		var mi := MeshInstance3D.new()
		mi.name = "ShrineAltar"
		mi.mesh = altar_mesh
		## altar-stone.glb도 바닥 중앙 피벗이라 cave/ruins와 같은 이유로
		## height*0.5만큼 안 띄워도 된다.
		mi.transform = Transform3D(Basis().scaled(Vector3.ONE * SHRINE_SCALE), base_pos)
		add_child(mi)
	else:
		## 못 받아 왔으면 예전 방식과 같은 fallback(primitive 박스).
		var altar := _box(size, Color(0.42, 0.4, 0.38))
		altar.name = "ShrineAltar"
		altar.position = base_pos + Vector3(0, size.y * 0.5, 0)
		add_child(altar)

	_solid(size, base_pos + Vector3(0, size.y * 0.5, 0), self)
	_add_discovery_area("shrine", base_pos, self)


## 산속 폭포(W) — 격자 (8,3), 옛 산(^) 자리 하나를 깎았다(test_map.gd 참고).
## rock_largeA.glb를 세로로 세운 절벽 배경 + primitive 물줄기·물웅덩이.
## 물줄기는 장식이라 충돌 없음 — 막히는 건 뒤쪽 바위뿐(사당과 같은 경계,
## "충돌은 얕게만 잡는다").
func _add_waterfall() -> void:
	var ground: float = TerrainBuilder.LEGEND["W"].height
	var base_pos := TestMap.world_pos(8, 3) + Vector3(0, ground, 0)
	var rock_back_offset := Vector3(0, 0, -1.2) # 물줄기 뒤로 살짝 물러난 자리
	var rock_mesh := GLBUtils.extract_mesh(WATERFALL_ROCK_GLB)

	if rock_mesh != null:
		var mi := MeshInstance3D.new()
		mi.name = "WaterfallRock"
		mi.mesh = rock_mesh
		mi.transform = Transform3D(Basis().scaled(WATERFALL_ROCK_SCALE),
			base_pos + rock_back_offset + Vector3(0, WATERFALL_ROCK_SCALE.y * 0.13, 0))
		add_child(mi)
	else:
		var fallback := _box(WATERFALL_ROCK_SCALE, Color(0.4, 0.4, 0.42))
		fallback.name = "WaterfallRock"
		fallback.position = base_pos + rock_back_offset + Vector3(0, WATERFALL_ROCK_SCALE.y * 0.5, 0)
		add_child(fallback)
	_solid(Vector3(WATERFALL_ROCK_SCALE.x, WATERFALL_ROCK_SCALE.y * 0.5, WATERFALL_ROCK_SCALE.z),
		base_pos + rock_back_offset + Vector3(0, WATERFALL_ROCK_SCALE.y * 0.25, 0), self)

	var water_mat := StandardMaterial3D.new()
	water_mat.albedo_color = WATERFALL_WATER_COLOR
	water_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	water_mat.cull_mode = BaseMaterial3D.CULL_DISABLED

	var face_mi := MeshInstance3D.new()
	face_mi.name = "WaterfallFace"
	var face_mesh := PlaneMesh.new()
	face_mesh.size = WATERFALL_FACE_SIZE
	face_mi.mesh = face_mesh
	face_mi.material_override = water_mat
	face_mi.rotation_degrees = Vector3(90, 0, 0)
	face_mi.position = base_pos + Vector3(0, WATERFALL_FACE_SIZE.y * 0.5, -0.5)
	add_child(face_mi)

	var pool_mi := MeshInstance3D.new()
	pool_mi.name = "WaterfallPool"
	var pool_mesh := PlaneMesh.new()
	pool_mesh.size = WATERFALL_POOL_SIZE
	pool_mi.mesh = pool_mesh
	pool_mi.material_override = water_mat
	pool_mi.position = base_pos + Vector3(0, 0.05, 0.7)
	add_child(pool_mi)

	_add_discovery_area("waterfall", base_pos, self)


func _add_village() -> void:
	var ground: float = TerrainBuilder.LEGEND["H"].height
	var wall_mesh := GLBUtils.extract_mesh(WALL_GLB)
	var roof_mesh := GLBUtils.extract_mesh(ROOF_GLB)

	## 2026-09-11㉒ 지도 확장(+2,+2) — test_map.gd 참고.
	for gx in [4, 5]:
		var house := Node3D.new()
		house.name = "House_%d" % gx
		house.position = TestMap.world_pos(gx, 5) + Vector3(0, ground, 0)
		add_child(house)

		var body_size := WALL_FOOTPRINT
		if wall_mesh != null:
			house.add_child(_build_wall_perimeter(wall_mesh, body_size))
		## 충돌은 시각 메시의 피벗과 무관하게 중심 기준이라 그대로 둔다.
		_solid(body_size, Vector3(0, body_size.y * 0.5, 0), house)

		if roof_mesh != null:
			var roof := MeshInstance3D.new()
			roof.name = "Roof"
			roof.mesh = roof_mesh
			roof.transform = Transform3D(Basis().scaled(ROOF_SCALE), Vector3(0, body_size.y, 0))
			house.add_child(roof)

		_add_discovery_area("village", house.position, self)


## wall-block.glb(1x1x1, 바닥 피벗) 여러 장을 footprint(x칸·y층·z칸, 전부
## 1m 단위) **둘레**에만 실제로 이어 붙인다 — 안쪽 칸은 비운다. 안쪽을
## 채우지 않아도 밖에서 보면 꽉 찬 벽과 구별이 안 되고(들어갈 수 없는
## 장식용 외형이라 내부가 안 보임), 400칸을 다 채우는 것보다 훨씬 가볍다.
## MultiMesh 하나로 몇 백 개를 놓아도 draw call은 house마다 1회(다리
## planks.glb와 같은 방식, master.md 35장).
func _build_wall_perimeter(wall_mesh: Mesh, footprint: Vector3) -> MultiMeshInstance3D:
	var cols_x := int(footprint.x)
	var layers := int(footprint.y)
	var cols_z := int(footprint.z)

	var cells: Array[Vector3] = []
	for ix in cols_x:
		for iz in cols_z:
			if ix == 0 or ix == cols_x - 1 or iz == 0 or iz == cols_z - 1:
				cells.append(Vector3(ix - cols_x * 0.5 + 0.5, 0, iz - cols_z * 0.5 + 0.5))

	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = wall_mesh
	mm.instance_count = cells.size() * layers

	var idx := 0
	for layer in layers:
		for cell in cells:
			mm.set_instance_transform(idx, Transform3D(Basis(), cell + Vector3(0, layer, 0)))
			idx += 1

	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.name = "Wall"
	return mmi


func _add_ruins() -> void:
	var ground: float = TerrainBuilder.LEGEND["R"].height
	## 2026-09-11㉒ 지도 확장(+2,+2) — test_map.gd 참고.
	var base := TestMap.world_pos(7, 5) + Vector3(0, ground, 0)
	var offsets := [Vector2(-3, -2), Vector2(2, 1), Vector2(-1, 3)]
	var pillar_mesh := GLBUtils.extract_mesh(PILLAR_GLB)
	## pillar-stone.glb는 높이 1m짜리 원기둥 — 스케일 값을 그대로 목표
	## 높이(m)로 쓸 수 있다. 반지름은 얇게 두는 쪽이 폐허다워서 primitive
	## 시절(반지름 최대 1.2)보다 가늘게 잡았다 — ASSET_GUIDE.md 참고.
	var radius_scale := RUIN_PILLAR_RADIUS_SCALE
	for i in offsets.size():
		var off: Vector2 = offsets[i]
		var height := 5.0 + float(i % 2) * 1.5
		var pos := base + Vector3(off.x, 0, off.y)

		if pillar_mesh != null:
			var mi := MeshInstance3D.new()
			mi.mesh = pillar_mesh
			mi.name = "RuinPillar_%d" % i
			## 바닥 피벗이라 그대로 세우면 된다(primitive 때는 중앙 피벗이라
			## height*0.5만큼 띄워야 했다).
			mi.transform = Transform3D(Basis().scaled(Vector3(radius_scale, height, radius_scale)), pos)
			add_child(mi)

		var body := StaticBody3D.new()
		body.name = "Collision"
		body.position = pos + Vector3(0, height * 0.5, 0)
		var cs := CollisionShape3D.new()
		var shape := CylinderShape3D.new()
		shape.radius = 0.08 * radius_scale
		shape.height = height
		cs.shape = shape
		body.add_child(cs)
		add_child(body)

	_add_discovery_area("ruins", base, self)


func _add_bridge() -> void:
	## 다리 밑은 강바닥(height -1.0)이고 그 위에 수면(-0.45)이 떠 있다
	## (terrain_builder.gd _build_water 참고) — 널판은 수면보다 확실히 위에 놓는다.
	## 충돌은 terrain_builder.gd의 "B" 타일이 이미 같은 높이(BRIDGE_CLEARANCE)에
	## 놓아 두므로 여기서 따로 만들지 않는다 — 두 파일이 각자 만들면 겹친다.
	var bed: float = TerrainBuilder.LEGEND["B"].height
	## 2026-09-11㉒ 지도 확장(+2,+2) — test_map.gd 참고.
	var base_pos := TestMap.world_pos(5, 7) + Vector3(0, bed + TerrainBuilder.BRIDGE_CLEARANCE, 0)
	var bridge_length := 44.0
	var bridge_width := 6.0

	var plank_mesh := GLBUtils.extract_mesh(PLANK_GLB)
	if plank_mesh == null:
		## 못 받아 왔으면 예전 primitive로 대체 — 다리가 아예 안 보이는 것보단 낫다.
		var plank := _box(Vector3(bridge_width, 0.6, bridge_length), Color(0.42, 0.3, 0.18))
		plank.name = "Bridge"
		plank.position = base_pos
		add_child(plank)
		_add_discovery_area("bridge", base_pos, self)
		return

	## planks.glb는 1x1x1칸짜리 널빤지 — primitive처럼 하나를 44배 길게
	## 늘리면 나뭇결이 다 뭉개져 보이므로, 강을 따라 실제로 이어 붙인다
	## (MultiMesh — 44개라도 draw call은 1회, master.md 35장 그대로).
	var plank_count := int(ceil(bridge_length))
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = plank_mesh
	mm.instance_count = plank_count

	var start_z := -bridge_length * 0.5 + 0.5
	for i in plank_count:
		var basis := Basis().scaled(Vector3(bridge_width, 2.0, 1.02))
		var pos := base_pos + Vector3(0, 0, start_z + i)
		mm.set_instance_transform(i, Transform3D(basis, pos))

	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.name = "Bridge"
	add_child(mmi)
	_add_discovery_area("bridge", base_pos, self)
