extends Node3D

## VERTICAL_SLICE.md 27절 — 지도 위 이름난 자리(랜드마크)를 세운다.
## 2026-09-11 — PLAN.md 45·46장(GLB 교체). 마을집·폐허 기둥·다리 널판을
## CC0 Kenney Fantasy Town Kit(assets/buildings, ASSET_GUIDE.md 참고)의
## GLB 조각으로 바꿨다. 굴 입구는 이 킷에 맞는 조각이 없어 이번 교체에서
## 빠졌었다 — 같은 날 뒤이어 CC0 Kenney Modular Cave Kit의 gate-rock.glb로
## 마저 바꿨다(아래 _add_cave 참고, docs/ASSET_GUIDE.md 참고).

const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")
const GLBUtils := preload("res://games/saga_go/world/glb_utils.gd")

const WALL_GLB := "res://assets/buildings/wall-block.glb"
const ROOF_GLB := "res://assets/buildings/roof-gable.glb"
const PILLAR_GLB := "res://assets/buildings/pillar-stone.glb"
const PLANK_GLB := "res://assets/buildings/planks.glb"
const CAVE_GATE_GLB := "res://assets/dungeon/gate-rock.glb"

## wall-block.glb는 1x1x1 정육면체(바닥이 원점) — 기존 박스 몸통(10x4x10)에
## 맞춰 축마다 다르게 늘렸다. 텍스처가 단순 색 아틀라스라 늘려도 눈에 띄게
## 이상하진 않다(ASSET_GUIDE.md에 실측·근거 기록). 진짜 모듈형 벽 타일링은
## 이번 교체 범위 밖 — 다음 손질 때 여러 장 이어 붙이는 걸로 바꿀 수 있다.
const WALL_SCALE := Vector3(10, 4, 10)
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
	var base_pos := TestMap.world_pos(3, 0) + Vector3(0, ground, 0)
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


func _add_village() -> void:
	var ground: float = TerrainBuilder.LEGEND["H"].height
	var wall_mesh := GLBUtils.extract_mesh(WALL_GLB)
	var roof_mesh := GLBUtils.extract_mesh(ROOF_GLB)

	for gx in [2, 3]:
		var house := Node3D.new()
		house.name = "House_%d" % gx
		house.position = TestMap.world_pos(gx, 3) + Vector3(0, ground, 0)
		add_child(house)

		var body_size := Vector3(10, 4, 10)
		if wall_mesh != null:
			var body := MeshInstance3D.new()
			body.name = "Wall"
			body.mesh = wall_mesh
			## wall-block.glb는 바닥이 원점이라 y=0에 그대로 세우면 된다
			## (BoxMesh였을 때처럼 높이 절반만큼 띄울 필요가 없다).
			body.transform = Transform3D(Basis().scaled(WALL_SCALE), Vector3.ZERO)
			house.add_child(body)
		## 충돌은 시각 메시의 피벗과 무관하게 중심 기준이라 그대로 둔다.
		_solid(body_size, Vector3(0, body_size.y * 0.5, 0), house)

		if roof_mesh != null:
			var roof := MeshInstance3D.new()
			roof.name = "Roof"
			roof.mesh = roof_mesh
			roof.transform = Transform3D(Basis().scaled(ROOF_SCALE), Vector3(0, body_size.y, 0))
			house.add_child(roof)


func _add_ruins() -> void:
	var ground: float = TerrainBuilder.LEGEND["R"].height
	var base := TestMap.world_pos(5, 3) + Vector3(0, ground, 0)
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


func _add_bridge() -> void:
	## 다리 밑은 강바닥(height -1.0)이고 그 위에 수면(-0.45)이 떠 있다
	## (terrain_builder.gd _build_water 참고) — 널판은 수면보다 확실히 위에 놓는다.
	## 충돌은 terrain_builder.gd의 "B" 타일이 이미 같은 높이(BRIDGE_CLEARANCE)에
	## 놓아 두므로 여기서 따로 만들지 않는다 — 두 파일이 각자 만들면 겹친다.
	var bed: float = TerrainBuilder.LEGEND["B"].height
	var base_pos := TestMap.world_pos(3, 5) + Vector3(0, bed + TerrainBuilder.BRIDGE_CLEARANCE, 0)
	var bridge_length := 44.0
	var bridge_width := 6.0

	var plank_mesh := GLBUtils.extract_mesh(PLANK_GLB)
	if plank_mesh == null:
		## 못 받아 왔으면 예전 primitive로 대체 — 다리가 아예 안 보이는 것보단 낫다.
		var plank := _box(Vector3(bridge_width, 0.6, bridge_length), Color(0.42, 0.3, 0.18))
		plank.name = "Bridge"
		plank.position = base_pos
		add_child(plank)
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
