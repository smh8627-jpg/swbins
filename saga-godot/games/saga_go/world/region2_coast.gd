extends Node3D

## PLAN.md 51장 GO 축("월드 확장→탐험→지역→이벤트→수집→희귀 몬스터")의
## 마지막 남은 항목 — "지역"의 첫 걸음. §26에서 이미 "역참(길손이 쉬어
## 가는 정자)"을 세워 뒀지만(landmarks_builder.gd _add_waystation) 그냥
## 발견만 되는 장식이었다 — 실제로 "다른 곳으로 통하는 길목"이라는 자리
## 의미를 이번에 준다.
##
## **범위를 크게 줄였다** — terrain_builder.gd·landmarks_builder.gd는 둘 다
## `TestMap` 하나에 고정 결합돼 있어(각각 11회·다수 호출) 진짜 두 번째
## 타일맵 지역을 만들려면 그 둘을 다중 지역용으로 다시 설계해야 한다(꽤
## 큰 일). 그 재설계 대신, FOREST의 집 안(forest_house.gd 헤더 — "씬
## 전환 없이 텔레포트로만 오간다", 마을 좌표계와 절대 안 겹치는 먼 좌표에
## 짓는다)과 같은 이미 검증된 패턴을 그대로 써서, 작은 포구 하나만 먼저
## 연다. 두 번째 진짜 타일맵 지역은 이 첫 걸음이 재미있는지 확인한 뒤
## 판단할 몫으로 남긴다(PLAN.md 3.1 Vertical Slice First 원칙 그대로).
##
## **정직하게 밝혀 둔다** — "갈매기"는 웹판 js/animal.js KINDS에 없는,
## 이 슬라이스만의 새 짐승이다(사가고 퓨전 방향 메모 — 포켓몬GO 완전
## 모방은 필요 없다는 결). ox와 같은 완전 정지형(배회·도주 없음, 근접만
## 으로 발견)으로 둬 새 상태기계를 만들지 않았다.

const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")
const GLBUtils := preload("res://games/saga_go/world/glb_utils.gd")
const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")
const Toast := preload("res://saga_core/ui/toast.gd")

const PLANK_GLB := "res://assets/buildings/planks.glb"

## 마을 격자(11x11, TILE_SIZE 48 = 528m 사방)보다 훨씬 먼 좌표 — FOREST
## INTERIOR_ORIGIN과 같은 발상. 절대 마을 지형과 안 겹친다.
const REGION_ORIGIN := Vector3(8000.0, 0.0, 0.0)
const HARBOR_HALF := 40.0
const WATER_COLOR := Color(0.25, 0.45, 0.62, 0.75)   # terrain_builder.gd WaterSurface와 같은 색
const SAND_COLOR := Color(0.76, 0.68, 0.5)
const WALL_HEIGHT := 8.0

## landmarks_builder.gd _add_waystation()과 같은 격자·계산 — 이 파일이
## 그쪽을 몰라도 되게(단방향 의존) 여기서 다시 구한다. 역참 좌표가 바뀌면
## 두 곳을 같이 고쳐야 한다는 게 유일한 대가(35장 "동일한 코드를 복사하지
## 않는다"의 예외로 둔 것 — 좌표 하나 재계산일 뿐 로직 복제가 아니다).
const VILLAGE_WAYSTATION_GRID := Vector2i(5, 3)
const TRAVEL_TRIGGER_RADIUS := 5.0
## 포구는 남(모래사장, 도착 지점) → 북(바다) 한 축으로 배치한다. 도착
## 지점(-24)은 귀환 트리거(0, 반경 5)에서 충분히 떨어져 있어 도착하자마자
## 되돌아가는 선택지가 다시 뜨지 않는다.
const ARRIVAL_LOCAL := Vector3(0.0, 1.0, -24.0)
const GULL_LOCAL := Vector3(12.0, 0.6, -14.0)
const WATER_Z_OFFSET := 20.0   # 물은 북쪽 절반(z 0~40)만 덮는다
const DOCK_Z_OFFSET := 10.0    # 모래에서 물 쪽으로 뻗은 짧은 선착장

var _village_layer: CanvasLayer
var _village_triggered := false
var _harbor_layer: CanvasLayer
var _harbor_triggered := false


func _ready() -> void:
	_build_departure_trigger()
	_build_harbor()


## === 마을 쪽 — 역참에 실제 기능을 단다 ===

func _build_departure_trigger() -> void:
	var ground: float = TerrainBuilder.LEGEND["="].height
	var pos := TestMap.world_pos(VILLAGE_WAYSTATION_GRID.x, VILLAGE_WAYSTATION_GRID.y) + Vector3(0, ground, 0)
	var area := Area3D.new()
	area.name = "WaystationTravel"
	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = TRAVEL_TRIGGER_RADIUS
	cs.shape = shape
	area.add_child(cs)
	area.position = pos
	add_child(area)
	area.body_entered.connect(_on_village_entered)


func _on_village_entered(body: Node3D) -> void:
	if _village_triggered or not body.is_in_group("player"):
		return
	_village_triggered = true
	var choices: Array = [
		{"label": "🚢 먼 포구로 길을 나선다", "cb": func() -> void: _travel_to_harbor(body)},
		{"label": "그만둔다", "cb": _close_village_prompt},
	]
	_village_layer = ChoicePrompt.build(self, "역참 — 여기서 먼 포구로 통하는 길이 있다.", choices)


func _close_village_prompt() -> void:
	if _village_layer:
		_village_layer.queue_free()
	_village_triggered = false


func _travel_to_harbor(player: Node3D) -> void:
	if _village_layer:
		_village_layer.queue_free()
	(player as Node3D).global_position = REGION_ORIGIN + ARRIVAL_LOCAL
	CodexState.discover("place", "harbor")
	Toast.show(self, "먼 포구에 닿았다.", 2.5)
	_village_triggered = false


## === 포구(두 번째 지역) ===

func _build_harbor() -> void:
	_build_ground()
	_build_water()
	_build_walls()
	_build_dock()
	_build_gull()
	_build_return_trigger()


func _build_ground() -> void:
	var mi := MeshInstance3D.new()
	var mesh := PlaneMesh.new()
	mesh.size = Vector2(HARBOR_HALF * 2.0, HARBOR_HALF * 2.0)
	mi.mesh = mesh
	mi.position = REGION_ORIGIN
	var mat := StandardMaterial3D.new()
	mat.albedo_color = SAND_COLOR
	mi.material_override = mat
	add_child(mi)

	## 물 위까지 포함해 한 장짜리 평평한 충돌로 덮는다(FOREST 집 안 바닥과
	## 같은 절 — 두 번째 지역은 첫 걸음이라 "물엔 못 들어간다"는 규칙까지
	## 만들지 않는다, 얕은 물가를 걸을 수 있는 정도로 남긴다).
	var body := StaticBody3D.new()
	body.name = "HarborGround"
	var cs := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(HARBOR_HALF * 2.0, 1.0, HARBOR_HALF * 2.0)
	cs.shape = box
	cs.position = REGION_ORIGIN + Vector3(0, -0.5, 0)
	body.add_child(cs)
	add_child(body)


func _build_water() -> void:
	var mi := MeshInstance3D.new()
	var mesh := PlaneMesh.new()
	## 북쪽 절반(z 0~HARBOR_HALF)만 덮는다 — 담벼락(_build_walls) 밖으로
	## 안 삐져나오게 정확히 절반 크기·절반 오프셋으로 맞췄다.
	mesh.size = Vector2(HARBOR_HALF * 2.0, HARBOR_HALF)
	mi.mesh = mesh
	mi.position = REGION_ORIGIN + Vector3(0, 0.05, WATER_Z_OFFSET)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = WATER_COLOR
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mi.material_override = mat
	add_child(mi)


## 첫 걸음이라 포구를 사방 담벼락으로만 둘러 "밖으로 못 나간다"는 걸
## 확실히 한다(TestMap의 "^" 산 벽과 같은 역할 — 새 지형 시스템 없이
## primitive 벽 넷으로 대신한다).
func _build_walls() -> void:
	var half := HARBOR_HALF
	var specs := [
		[Vector3(0, WALL_HEIGHT * 0.5, -half), Vector3(half * 2.0, WALL_HEIGHT, 1.0)],
		[Vector3(0, WALL_HEIGHT * 0.5, half), Vector3(half * 2.0, WALL_HEIGHT, 1.0)],
		[Vector3(-half, WALL_HEIGHT * 0.5, 0), Vector3(1.0, WALL_HEIGHT, half * 2.0)],
		[Vector3(half, WALL_HEIGHT * 0.5, 0), Vector3(1.0, WALL_HEIGHT, half * 2.0)],
	]
	for spec: Array in specs:
		var body := StaticBody3D.new()
		var cs := CollisionShape3D.new()
		var box := BoxShape3D.new()
		box.size = spec[1]
		cs.shape = box
		cs.position = REGION_ORIGIN + spec[0]
		body.add_child(cs)
		add_child(body)


## landmarks_builder.gd _add_bridge()의 planks.glb 이어 붙이기와 같은
## 방식(35장) — 모래에서 물 쪽으로 뻗은 짧은 선착장.
func _build_dock() -> void:
	var dock_length := 18.0
	var dock_width := 4.0
	var base_pos := REGION_ORIGIN + Vector3(0, 0.1, DOCK_Z_OFFSET)

	var plank_mesh := GLBUtils.extract_mesh(PLANK_GLB)
	if plank_mesh == null:
		var plank := MeshInstance3D.new()
		var box := BoxMesh.new()
		box.size = Vector3(dock_width, 0.4, dock_length)
		plank.mesh = box
		var mat := StandardMaterial3D.new()
		mat.albedo_color = Color(0.42, 0.3, 0.18)
		plank.material_override = mat
		plank.position = base_pos
		add_child(plank)
	else:
		var plank_count := int(ceil(dock_length))
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = plank_mesh
		mm.instance_count = plank_count
		var start_z := -dock_length * 0.5 + 0.5
		for i in plank_count:
			var basis := Basis().scaled(Vector3(dock_width, 2.0, 1.02))
			var pos := base_pos + Vector3(0, 0, start_z + i)
			mm.set_instance_transform(i, Transform3D(basis, pos))
		var mmi := MultiMeshInstance3D.new()
		mmi.multimesh = mm
		mmi.name = "Dock"
		add_child(mmi)

	_add_discovery_area("harbor", REGION_ORIGIN, 25.0)


## animal_builder.gd OX_HOMES와 같은 완전 정지형(act:null) — 배회·도주가
## 없어 근접만으로 발견을 찍는다(그 파일 헤더의 소 항목과 같은 경계).
func _build_gull() -> void:
	var pos := REGION_ORIGIN + GULL_LOCAL
	var mi := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = 0.35
	mesh.height = 0.7
	mi.mesh = mesh
	mi.position = pos
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.92, 0.92, 0.9)
	mi.material_override = mat
	add_child(mi)
	_add_discovery_area("gull", pos, 15.0, "beast")


func _build_return_trigger() -> void:
	var pos := REGION_ORIGIN
	var area := Area3D.new()
	area.name = "HarborReturn"
	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = TRAVEL_TRIGGER_RADIUS
	cs.shape = shape
	area.add_child(cs)
	area.position = pos
	add_child(area)
	area.body_entered.connect(_on_harbor_entered)


func _on_harbor_entered(body: Node3D) -> void:
	if _harbor_triggered or not body.is_in_group("player"):
		return
	_harbor_triggered = true
	var choices: Array = [
		{"label": "🏘️ 마을로 돌아간다", "cb": func() -> void: _travel_to_village(body)},
		{"label": "그만둔다", "cb": _close_harbor_prompt},
	]
	_harbor_layer = ChoicePrompt.build(self, "포구 — 여기서 마을로 돌아가는 길이 있다.", choices)


func _close_harbor_prompt() -> void:
	if _harbor_layer:
		_harbor_layer.queue_free()
	_harbor_triggered = false


func _travel_to_village(player: Node3D) -> void:
	if _harbor_layer:
		_harbor_layer.queue_free()
	var ground: float = TerrainBuilder.LEGEND["="].height
	var pos := TestMap.world_pos(VILLAGE_WAYSTATION_GRID.x, VILLAGE_WAYSTATION_GRID.y) + Vector3(0, ground, 0)
	(player as Node3D).global_position = pos + Vector3(0, 1.0, -12.0)
	Toast.show(self, "마을로 돌아왔다.", 2.5)
	_harbor_triggered = false


## landmarks_builder.gd _add_discovery_area()와 같은 계약(가까이 오면
## kind 하나를 도장 찍는다, 중복은 CodexState.discover()가 알아서
## 막는다) — 그 파일을 몰라도 되게 여기서 다시 구현한다(코드 세 줄
## 수준이라 복제 부담이 code_review 수준의 문제가 아니라고 판단).
func _add_discovery_area(codex_id: String, pos: Vector3, radius: float, kind: String = "place") -> void:
	var area := Area3D.new()
	area.name = "Discover_" + codex_id
	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = radius
	cs.shape = shape
	area.add_child(cs)
	area.position = pos
	add_child(area)
	area.body_entered.connect(func(body: Node3D) -> void:
		if body.is_in_group("player"):
			CodexState.discover(kind, codex_id))
