extends Node3D

## VERTICAL_SLICE_FOREST.md 4절 "채집 동사 하나만: 나무 흔들기 → 과일
## 하나 획득(data-village.js GATHER.tree 그대로, reset:1은 이번엔 무시 —
## 무제한으로 흔들 수 있다)". 하루/시간 시스템 자체가 이번 슬라이스 밖이라
## 쿨다운 없이 누를 때마다 과일이 는다.
##
## 장식용 산포 나무(forest_vegetation_builder.gd)와 달리 이건 유일하게
## 상호작용하는 나무 하나라 MultiMesh가 아니라 MeshInstance3D 하나로
## 둔다(Area3D를 노드별로 붙여야 하니 인스턴스 하나가 필요하다).

const ForestMap := preload("res://games/saga_forest/data/village_map.gd")
const TerrainBuilder := preload("res://games/saga_forest/world/forest_terrain_builder.gd")
const GLBUtils := preload("res://games/saga_go/world/glb_utils.gd")
const WorldCurveMaterial := preload("res://saga_core/world/world_curve_material.gd")
const Toast := preload("res://saga_core/ui/toast.gd")

const TREE_GLB := "res://assets/vegetation/tree_oak.glb"
const TREE_SCALE := 4.5  # forest_vegetation_builder.gd와 같은 값
const GRID := Vector2i(19, 7)
const GATHER_RADIUS := 3.5
const CURVE_AMOUNT := 0.004

var _in_range := false


func _ready() -> void:
	var ground: float = TerrainBuilder.LEGEND["."].height
	position = ForestMap.world_pos(GRID.x, GRID.y) + Vector3(0, ground, 0)

	var mesh := GLBUtils.extract_mesh(TREE_GLB)
	if mesh != null:
		var mi := MeshInstance3D.new()
		mi.name = "Visual"
		mi.mesh = mesh
		mi.material_override = WorldCurveMaterial.vertex_color_material(CURVE_AMOUNT)
		mi.scale = Vector3.ONE * TREE_SCALE
		add_child(mi)

	## GO vegetation_builder.gd의 트렁크 충돌과 같은 값(스케일 1일 때
	## 기준 magic number를 그대로 물려받는다 — 그 파일 주석 참고).
	var trunk := StaticBody3D.new()
	var cs := CollisionShape3D.new()
	var shape := CylinderShape3D.new()
	shape.radius = 0.4
	shape.height = 3.0
	cs.shape = shape
	cs.position = Vector3(0, 1.5, 0)
	trunk.add_child(cs)
	add_child(trunk)

	var area := Area3D.new()
	area.name = "GatherArea"
	var area_cs := CollisionShape3D.new()
	var area_shape := SphereShape3D.new()
	area_shape.radius = GATHER_RADIUS
	area_cs.shape = area_shape
	area.add_child(area_cs)
	add_child(area)
	area.body_entered.connect(_on_body_entered)
	area.body_exited.connect(_on_body_exited)


func _process(_delta: float) -> void:
	if _in_range and Input.is_action_just_pressed("forest_gather"):
		_gather()


func _on_body_entered(body: Node3D) -> void:
	if not body.is_in_group("player"):
		return
	_in_range = true
	Toast.show(self, "[나무를 흔들려면 G] 과일이 열려 있다.", 2.0)


func _on_body_exited(body: Node3D) -> void:
	if body.is_in_group("player"):
		_in_range = false


func _gather() -> void:
	ForestSaveState.fruit_count += 1
	Toast.show(self, "🍎 나무를 흔들어 과일을 주웠다 (총 %d개)" % ForestSaveState.fruit_count, 2.5)
