extends Node3D

## VERTICAL_SLICE_STORY.md 1·2절 — 허창 들판을 FieldMap.gd 데이터로
## 짓는다. 2.5D라 모든 발판·바닥은 Z축으로 얕은 깊이(PLATFORM_DEPTH)만
## 갖는다 — 플레이어가 Z=0에 고정이라(2절) 더 깊을 필요가 없다.
##
## primitive 박스뿐이다(GLB 없음) — 이 판은 이제 막 첫 슬라이스를
## 시작하는 단계라 GO/FOREST의 "primitive는 프로토타입에서만" 원칙
## 그대로.

const FieldMap := preload("res://games/saga_story/data/field_map.gd")

const PLATFORM_DEPTH := 4.0
const PLATFORM_THICKNESS := 0.4
const GROUND_COLOR := Color(0.435, 0.686, 0.333)  # data-side.js field.ground '#6faf55'
const PLAT_COLOR := Color(0.55, 0.42, 0.28)
const ROPE_COLOR := Color(0.6, 0.5, 0.35)
const LADDER_COLOR := Color(0.42, 0.32, 0.2)  # 사다리 — 줄보다 짙은 목재색
const WALL_HEIGHT := 20.0


func _ready() -> void:
	_build_ground()
	for p: Dictionary in FieldMap.plats_m():
		_build_platform(p)
	for r: Dictionary in FieldMap.ropes_m():
		_build_climb(r)
	_build_boundary_walls()


func _build_ground() -> void:
	var width: float = FieldMap.width_m()
	_build_box(width * 0.5, -PLATFORM_THICKNESS * 0.5, width, PLATFORM_THICKNESS, GROUND_COLOR, "Ground")


func _build_platform(p: Dictionary) -> void:
	var w: float = float(p.half_w) * 2.0
	_build_box(float(p.x), float(p.height) - PLATFORM_THICKNESS * 0.5, w, PLATFORM_THICKNESS, PLAT_COLOR, "Platform")


func _build_box(center_x: float, center_y: float, width: float, thickness: float, color: Color, name_: String) -> void:
	var body := StaticBody3D.new()
	body.name = name_
	body.position = Vector3(center_x, center_y, 0)
	add_child(body)

	var mi := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(width, thickness, PLATFORM_DEPTH)
	mi.mesh = box
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mi.material_override = mat
	body.add_child(mi)

	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = box.size
	cs.shape = shape
	body.add_child(cs)


## 웹판 field.ropes 다섯(rope 넷+ladder 하나) — 오르내리는 동안 옆으로
## 못 움직이게 story_player.gd가 이 Area3D 안에서만 "on_rope" 상태로
## 바뀐다. kind는 시각만 가른다(등반 판정은 story_player.gd가 rope든
## ladder든 똑같이 다룬다 — 원작도 물리를 안 가른다, field_map.gd 참고).
func _build_climb(r: Dictionary) -> void:
	var height: float = float(r.top) - float(r.bottom)
	var mid_y: float = float(r.bottom) + height * 0.5
	var kind: String = String(r.kind)

	if kind == "ladder":
		_build_ladder_visual(float(r.x), mid_y, height)
	else:
		_build_rope_visual(float(r.x), mid_y, height)

	var area := Area3D.new()
	area.name = "LadderArea" if kind == "ladder" else "RopeArea"
	area.add_to_group("story_rope")
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(0.6, height, 1.2)
	cs.shape = shape
	area.add_child(cs)
	area.position = Vector3(float(r.x), mid_y, 0)
	area.set_meta("rope_top", float(r.top))
	area.set_meta("rope_bottom", float(r.bottom))
	area.set_meta("rope_x", float(r.x))
	area.body_entered.connect(_on_rope_body_entered.bind(area))
	area.body_exited.connect(_on_rope_body_exited.bind(area))
	add_child(area)


func _build_rope_visual(x: float, mid_y: float, height: float) -> void:
	var visual := MeshInstance3D.new()
	visual.name = "Rope"
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.06
	cyl.bottom_radius = 0.06
	cyl.height = height
	visual.mesh = cyl
	var mat := StandardMaterial3D.new()
	mat.albedo_color = ROPE_COLOR
	visual.material_override = mat
	visual.position = Vector3(x, mid_y, 0)
	add_child(visual)


## 사다리 — 세로 기둥 둘(폭 0.5m) + 0.4m 간격 가로대. 줄과 시각으로만
## 갈린다(위 _build_climb() 머리말).
func _build_ladder_visual(x: float, mid_y: float, height: float) -> void:
	var root := Node3D.new()
	root.name = "Ladder"
	root.position = Vector3(x, mid_y, 0)
	add_child(root)

	var mat := StandardMaterial3D.new()
	mat.albedo_color = LADDER_COLOR

	for side_x: float in [-0.25, 0.25]:
		var rail := MeshInstance3D.new()
		var rail_mesh := CylinderMesh.new()
		rail_mesh.top_radius = 0.04
		rail_mesh.bottom_radius = 0.04
		rail_mesh.height = height
		rail.mesh = rail_mesh
		rail.material_override = mat
		rail.position = Vector3(side_x, 0, 0)
		root.add_child(rail)

	var rung_gap := 0.4
	var rung_count: int = maxi(1, floori(height / rung_gap))
	for i in rung_count:
		var rung := MeshInstance3D.new()
		var rung_mesh := CylinderMesh.new()
		rung_mesh.top_radius = 0.035
		rung_mesh.bottom_radius = 0.035
		rung_mesh.height = 0.5
		rung.mesh = rung_mesh
		rung.material_override = mat
		rung.rotation.z = PI * 0.5
		rung.position = Vector3(0, height * 0.5 - float(i) * rung_gap, 0)
		root.add_child(rung)


func _on_rope_body_entered(body: Node3D, area: Area3D) -> void:
	if body.is_in_group("player") and body.has_method("set_rope_area"):
		body.set_rope_area(area)


func _on_rope_body_exited(body: Node3D, area: Area3D) -> void:
	if body.is_in_group("player") and body.has_method("clear_rope_area"):
		body.clear_rope_area(area)


## 문(portal)이 없는 이번 슬라이스에서 양 끝으로 걸어 나가지 못하게
## 막는다(1절 "제외" 목록 — 사냥터 이동 자체가 범위 밖).
func _build_boundary_walls() -> void:
	var width: float = FieldMap.width_m()
	_build_wall(-0.5)
	_build_wall(width + 0.5)


func _build_wall(x: float) -> void:
	var body := StaticBody3D.new()
	body.name = "Boundary"
	body.position = Vector3(x, WALL_HEIGHT * 0.5, 0)
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(1.0, WALL_HEIGHT, PLATFORM_DEPTH)
	cs.shape = shape
	body.add_child(cs)
	add_child(body)
