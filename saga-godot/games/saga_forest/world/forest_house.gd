extends Node3D

## VERTICAL_SLICE_FOREST.md 4절 "집 하나 + 들어가기/나가기 — 구면 투영이
## 실제로 꺼졌다 켜지는 것을 증명하는 자리". 1절 결정 그대로: 외부는
## 마을 좌표계에서 곡률 셰이더(WorldCurveMaterial)를 쓰고, 내부는
## world_curve.gdshaderinc의 include를 아예 안 쓰는 평범한
## StandardMaterial3D로 짓는다. 씬 전환(로딩) 없이 텔레포트로만 오간다
## — 내부는 마을과 절대 안 겹치는 먼 좌표(INTERIOR_ORIGIN)에 짓는다.
##
## GO landmarks_builder.gd의 마을집(_add_village, _build_wall_perimeter)과
## 같은 GLB·재질 재사용이지만, 그쪽은 "들어가는 씬이 아니다"(장식)라 문
## 구멍이 없다 — 이 집은 실제로 들어가야 해서 남쪽 벽 가운데를 비우고
## (문틀 없이 뚫린 개구부, 프로토타입 수준) 충돌도 그 자리만 비운다.

const ForestMap := preload("res://games/saga_forest/data/village_map.gd")
const TerrainBuilder := preload("res://games/saga_forest/world/forest_terrain_builder.gd")
const GLBUtils := preload("res://games/saga_go/world/glb_utils.gd")
const WorldCurveMaterial := preload("res://saga_core/world/world_curve_material.gd")
const Toast := preload("res://saga_core/ui/toast.gd")

const WALL_GLB := "res://assets/buildings/wall-block.glb"
const ROOF_GLB := "res://assets/buildings/roof-gable.glb"
const BUILDING_TEXTURE := "res://assets/buildings/Textures/colormap.png"
const CURVE_AMOUNT := 0.004

## wall-block.glb는 1x1x1(바닥 피벗) — GO landmarks_builder.gd와 같은 단위.
const FOOTPRINT := Vector3(6, 4, 6)
const ROOF_SCALE := Vector3(6, 6, 6)
const DOOR_HALF_WIDTH := 1.0
const HOUSE_GRID := Vector2i(15, 9)  # village_map.gd의 "H" 타일과 같은 자리

## 마을과 절대 안 겹치는 먼 좌표 — 씬 전환 없이 텔레포트만으로 오간다.
const INTERIOR_ORIGIN := Vector3(500, 0, 500)
const INTERIOR_HALF := 4.0
const INTERIOR_WALL_HEIGHT := 4.0

var _exterior_spawn := Vector3.ZERO
var _interior_spawn := Vector3.ZERO


func _ready() -> void:
	_build_exterior()
	_build_interior()


func _build_exterior() -> void:
	var ground: float = TerrainBuilder.LEGEND["H"].height
	var base_pos := ForestMap.world_pos(HOUSE_GRID.x, HOUSE_GRID.y) + Vector3(0, ground, 0)

	var house := Node3D.new()
	house.name = "House"
	house.position = base_pos
	add_child(house)

	var wall_mesh := GLBUtils.extract_mesh(WALL_GLB)
	var roof_mesh := GLBUtils.extract_mesh(ROOF_GLB)
	var wall_mat := WorldCurveMaterial.textured_material(BUILDING_TEXTURE, CURVE_AMOUNT)

	if wall_mesh != null:
		var mmi := _build_wall_perimeter_with_door(wall_mesh, FOOTPRINT)
		mmi.material_override = wall_mat
		house.add_child(mmi)

	if roof_mesh != null:
		var roof := MeshInstance3D.new()
		roof.name = "Roof"
		roof.mesh = roof_mesh
		roof.material_override = wall_mat
		roof.transform = Transform3D(Basis().scaled(ROOF_SCALE), Vector3(0, FOOTPRINT.y, 0))
		house.add_child(roof)

	_build_exterior_wall_collision(house)

	var enter_area := Area3D.new()
	enter_area.name = "EnterTrigger"
	enter_area.position = Vector3(0, 1.0, -4.0)
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(DOOR_HALF_WIDTH * 2, 3.0, 2.0)
	cs.shape = shape
	enter_area.add_child(cs)
	house.add_child(enter_area)
	enter_area.body_entered.connect(_on_enter_house)

	## 밖에서 다시 나왔을 때 서는 자리 — EnterTrigger(local z=-4, 범위
	## -5..-3)보다 확실히 더 남쪽이라 도착하자마자 다시 안으로 빨려들지 않는다.
	_exterior_spawn = base_pos + Vector3(0, 0.1, -6.0)


## wall-block.glb 여러 장을 footprint 둘레에 이어 붙이되(GO
## landmarks_builder.gd의 _build_wall_perimeter와 같은 방식), 남쪽
## (iz=0) 가운데 DOOR_HALF_WIDTH*2 칸만큼 문 자리를 비운다.
func _build_wall_perimeter_with_door(wall_mesh: Mesh, footprint: Vector3) -> MultiMeshInstance3D:
	var cols_x := int(footprint.x)
	var layers := int(footprint.y)
	var cols_z := int(footprint.z)
	var door_lo: int = cols_x / 2 - int(DOOR_HALF_WIDTH)
	var door_hi: int = cols_x / 2 + int(DOOR_HALF_WIDTH) - 1

	var cells: Array[Vector3] = []
	for ix in cols_x:
		for iz in cols_z:
			var on_perimeter: bool = ix == 0 or ix == cols_x - 1 or iz == 0 or iz == cols_z - 1
			if not on_perimeter:
				continue
			if iz == 0 and ix >= door_lo and ix <= door_hi:
				continue  # 문 자리 — 전 층 다 비운다(단순 개구부, 프로토타입 수준)
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


## 시각 메시(MultiMesh)와 별도로 벽 넷을 충돌체로 놓는다 — 남쪽만 문
## 자리만큼 갈라 틈을 남긴다(DUNGEON test_room.gd의 _spawn_walls와 같은
## 발상). GO landmarks_builder.gd의 마을집은 문이 없어 한 박스로 충분했지만
## 이 집은 실제로 들어가야 해서 갈라야 한다.
func _build_exterior_wall_collision(parent: Node3D) -> void:
	var half: float = FOOTPRINT.x * 0.5
	var height: float = FOOTPRINT.y
	_wall(Vector3(FOOTPRINT.x, height, 1.0), Vector3(0, height * 0.5, half), parent)  # 북
	_wall(Vector3(1.0, height, FOOTPRINT.z), Vector3(half, height * 0.5, 0), parent)  # 동
	_wall(Vector3(1.0, height, FOOTPRINT.z), Vector3(-half, height * 0.5, 0), parent)  # 서

	var seg_len: float = half - DOOR_HALF_WIDTH
	if seg_len > 0.0:
		var seg_center: float = DOOR_HALF_WIDTH + seg_len * 0.5
		_wall(Vector3(seg_len, height, 1.0), Vector3(seg_center, height * 0.5, -half), parent)
		_wall(Vector3(seg_len, height, 1.0), Vector3(-seg_center, height * 0.5, -half), parent)


func _wall(size: Vector3, local_pos: Vector3, parent: Node3D) -> void:
	var body := StaticBody3D.new()
	body.position = local_pos
	var cs := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = size
	cs.shape = box
	body.add_child(cs)
	parent.add_child(body)


func _build_interior() -> void:
	var interior := Node3D.new()
	interior.name = "Interior"
	interior.position = INTERIOR_ORIGIN
	add_child(interior)

	## 평범한 StandardMaterial3D — world_curve.gdshaderinc를 아예 안 쓴다
	## (1절 "집 안·동굴 안은 이 include를 아예 안 쓰는 머티리얼로 남긴다").
	var floor_mat := StandardMaterial3D.new()
	floor_mat.albedo_color = Color(0.55, 0.42, 0.28)
	floor_mat.roughness = 0.9

	var floor_mesh := PlaneMesh.new()
	floor_mesh.size = Vector2(INTERIOR_HALF * 2, INTERIOR_HALF * 2)
	var floor_mi := MeshInstance3D.new()
	floor_mi.name = "InteriorFloor"
	floor_mi.mesh = floor_mesh
	floor_mi.material_override = floor_mat
	interior.add_child(floor_mi)

	var floor_box := BoxShape3D.new()
	floor_box.size = Vector3(INTERIOR_HALF * 2, 0.4, INTERIOR_HALF * 2)
	var floor_cs := CollisionShape3D.new()
	floor_cs.shape = floor_box
	var floor_body := StaticBody3D.new()
	floor_body.name = "InteriorFloorCollision"
	floor_body.position = Vector3(0, -0.2, 0)
	floor_body.add_child(floor_cs)
	interior.add_child(floor_body)

	var wall_mat := StandardMaterial3D.new()
	wall_mat.albedo_color = Color(0.42, 0.36, 0.3)
	wall_mat.roughness = 0.95

	_interior_wall(Vector3(INTERIOR_HALF * 2, INTERIOR_WALL_HEIGHT, 1.0),
		Vector3(0, INTERIOR_WALL_HEIGHT * 0.5, INTERIOR_HALF), wall_mat, interior)  # 북
	_interior_wall(Vector3(1.0, INTERIOR_WALL_HEIGHT, INTERIOR_HALF * 2),
		Vector3(INTERIOR_HALF, INTERIOR_WALL_HEIGHT * 0.5, 0), wall_mat, interior)  # 동
	_interior_wall(Vector3(1.0, INTERIOR_WALL_HEIGHT, INTERIOR_HALF * 2),
		Vector3(-INTERIOR_HALF, INTERIOR_WALL_HEIGHT * 0.5, 0), wall_mat, interior)  # 서

	var south_seg_len: float = INTERIOR_HALF - DOOR_HALF_WIDTH
	var south_seg_center: float = DOOR_HALF_WIDTH + south_seg_len * 0.5
	_interior_wall(Vector3(south_seg_len, INTERIOR_WALL_HEIGHT, 1.0),
		Vector3(south_seg_center, INTERIOR_WALL_HEIGHT * 0.5, -INTERIOR_HALF), wall_mat, interior)
	_interior_wall(Vector3(south_seg_len, INTERIOR_WALL_HEIGHT, 1.0),
		Vector3(-south_seg_center, INTERIOR_WALL_HEIGHT * 0.5, -INTERIOR_HALF), wall_mat, interior)

	var exit_area := Area3D.new()
	exit_area.name = "ExitTrigger"
	exit_area.position = Vector3(0, 1.0, -INTERIOR_HALF + 1.0)
	var exit_cs := CollisionShape3D.new()
	var exit_shape := BoxShape3D.new()
	exit_shape.size = Vector3(DOOR_HALF_WIDTH * 2, 3.0, 2.0)
	exit_cs.shape = exit_shape
	exit_area.add_child(exit_cs)
	interior.add_child(exit_area)
	exit_area.body_entered.connect(_on_exit_house)

	## ExitTrigger(local z=-3, 범위 -4..-2)보다 확실히 더 안쪽이라 들어오자마자
	## 다시 밖으로 안 튕겨 나간다.
	_interior_spawn = INTERIOR_ORIGIN + Vector3(0, 0.1, INTERIOR_HALF * 0.5)


func _interior_wall(size: Vector3, local_pos: Vector3, mat: StandardMaterial3D, parent: Node3D) -> void:
	var mi := MeshInstance3D.new()
	var box_mesh := BoxMesh.new()
	box_mesh.size = size
	mi.mesh = box_mesh
	mi.material_override = mat
	mi.position = local_pos
	parent.add_child(mi)

	var body := StaticBody3D.new()
	body.position = local_pos
	var cs := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = size
	cs.shape = box
	body.add_child(cs)
	parent.add_child(body)


func _on_enter_house(body: Node3D) -> void:
	if not body.is_in_group("player"):
		return
	body.global_position = _interior_spawn
	Toast.show(self, "집 안으로 들어왔다 — 굽었던 땅이 평평해졌다.", 3.0)


func _on_exit_house(body: Node3D) -> void:
	if not body.is_in_group("player"):
		return
	body.global_position = _exterior_spawn
	Toast.show(self, "밖으로 나왔다 — 다시 마을이 둥글게 휘어 보인다.", 3.0)
