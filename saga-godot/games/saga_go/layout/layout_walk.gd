extends Node3D

## 글자 지도 조립 씬(tools/scene-layout → games/_generated/*.tscn)을 걸어 다니게 배선한다.
## 생성 씬은 build_from_layout.gd 가 다시 쓰면 통째로 덮이니 거기엔 손대지 않는다 —
## 이 래퍼가 인스턴스로 품고, 실행 시점에 그 안의 Ground·Places 를 읽어 붙인다:
##   · 바닥 판 하나 + 가장자리 벽(StaticBody3D)
##   · 물 칸 막기 — TestVillage LEGEND 의 "강은 못 걷는다"와 같은 규칙. 다리가 놓인 물 칸은 연다.
##     산은 막지 않는다(굴·폭포·산등성이 명소가 산 칸 안에 있어 막으면 못 간다 — 웹 원판도 산을 걷는다).
##   · 명소마다 발견 판정(Area3D body_entered + "player" 그룹, landmarks_builder.gd _add_discovery_area 와 같은 결)
##     과 이름표(Label3D). hidden 명소의 이름표는 찾기 전엔 안 보인다.
## 발견은 CodexState 에 넣지 않고 이 씬 안에서만 센다 — 명소 id(gate_n·temple…)가 GO 도감 43칸에 없고,
## 여기서 도장을 찍으면 TestVillage 세이브·도감 총계가 어긋난다. 같은 이유로 HUD 의 저장 버튼은 뗀다.
## 물건(나무·바위)은 부딪히지 않는다 — 보기용 배치표라 충돌 모양이 없다. 다만 손으로 놓은 deco 중 웹 게임에서
## 벽인 것(집·탑·우물·장터 — 웹 world3d.houseRects 와 같은 넷)은 모델 경계 상자로 막는다(소품 자식이라 돌림·크기를 따른다).

signal place_found(id: String, place_name: String)

const TOAST_SEC := 3.0
## 한 칸(cell) 대비 발견 반경 — 이웃 명소가 3칸(12m) 떨어져 있어 한 칸 안쪽이면 겹치지 않는다.
const DISCOVER_RADIUS_CELLS := 0.9
const WATER_WALL_HEIGHT := 4.0
const LABEL_HEIGHT := 3.2
## 배치표 items 의 kind "deco:<종류>" — 노드 이름에선 ':' 가 '_' 로 바뀐다(deco_house_400)
const SOLID_DECO := ["deco_house_", "deco_tower_", "deco_well_", "deco_market_"]

@onready var _layout: Node3D = $Layout
@onready var _hud: CanvasLayer = $MobileHUD

var found: Dictionary = {}
var places_total := 0
var cell := 4.0
var _count_label: Label = null
var _labels: Dictionary = {}


func _ready() -> void:
	cell = float(_layout.get_meta("layout_cell", 4.0))
	_use_player_camera()
	_trim_hud()
	_build_colliders()
	_wire_places()
	_refresh_count()
	if OS.get_environment("SAGA_LAYOUT_PROBE") != "":
		add_child(load("res://tools/probe_layout_walk.gd").new())


## 생성 씬의 Overview 카메라도 current=true 로 저장돼 있다 — 플레이어 카메라를 확실히 쓴다.
func _use_player_camera() -> void:
	var overview := _layout.get_node_or_null("Overview") as Camera3D
	if overview:
		overview.current = false
	var player := get_tree().get_first_node_in_group("player")
	if player:
		var cam := player.find_child("Camera3D", true, false) as Camera3D
		if cam:
			cam.make_current()


## 저장 버튼은 떼고(위 머리 주석), 도감·사명·목표판 줄은 이 씬과 무관해 숨긴다.
## 명소 개수 줄은 CodexLabel 을 스크립트 없이 복제해 같은 자리·같은 글꼴로 쓴다.
func _trim_hud() -> void:
	var save := _hud.get_node_or_null("SaveButton")
	if save:
		save.queue_free()
	for n in ["QuestLabel", "GoalBoard"]:
		var c := _hud.get_node_or_null(n) as CanvasItem
		if c:
			c.hide()
	var codex := _hud.get_node_or_null("CodexLabel") as Label
	if codex:
		_count_label = codex.duplicate(0) as Label
		_count_label.name = "PlaceLabel"
		codex.hide()
		_hud.add_child(_count_label)


func _build_colliders() -> void:
	var ground := _layout.get_node("Ground")
	## 물 칸 중 명소 물건(배치표 mark, Props 의 at_* — 옛 다리)이 선 칸만 연다. 명소 표식만 있는 물 칸(강나루)은
	## 막힌 채 둔다 — 발견 반경이 칸 가장자리 너머까지 닿아 강가에서 찾아진다.
	var mark_cells := {}
	for pr in _layout.get_node("Props").get_children():
		if str(pr.name).begins_with("at_"):
			mark_cells[_cell_key(pr.position)] = true

	var min_v := Vector2(INF, INF)
	var max_v := Vector2(-INF, -INF)
	var body := StaticBody3D.new()
	body.name = "LayoutColliders"
	add_child(body)
	var water := 0
	for g in ground.get_children():
		var p: Vector3 = g.position
		min_v = Vector2(minf(min_v.x, p.x), minf(min_v.y, p.z))
		max_v = Vector2(maxf(max_v.x, p.x), maxf(max_v.y, p.z))
		if str(g.get_meta("kind", "")) == "water" and not mark_cells.has(_cell_key(p)):
			_box(body, Vector3(cell, WATER_WALL_HEIGHT, cell), Vector3(p.x, WATER_WALL_HEIGHT * 0.5, p.z))
			water += 1
	var half := cell * 0.5
	var lo := min_v - Vector2(half, half)
	var hi := max_v + Vector2(half, half)
	var size := hi - lo
	var mid := (lo + hi) * 0.5
	_box(body, Vector3(size.x, 1.0, size.y), Vector3(mid.x, -0.5, mid.y))
	_box(body, Vector3(size.x, 6.0, 1.0), Vector3(mid.x, 3.0, lo.y - 0.5))
	_box(body, Vector3(size.x, 6.0, 1.0), Vector3(mid.x, 3.0, hi.y + 0.5))
	_box(body, Vector3(1.0, 6.0, size.y), Vector3(lo.x - 0.5, 3.0, mid.y))
	_box(body, Vector3(1.0, 6.0, size.y), Vector3(hi.x + 0.5, 3.0, mid.y))
	body.set_meta("water_cells", water)
	var solids := 0
	for pr in _layout.get_node("Props").get_children():
		if pr is Node3D and _is_solid_deco(str(pr.name)) and _add_prop_body(pr):
			solids += 1
	body.set_meta("deco_solids", solids)


func _is_solid_deco(n: String) -> bool:
	for s in SOLID_DECO:
		if n.begins_with(s):
			return true
	return false


## 소품 안 메시들의 경계를 소품 좌표로 모아 상자 하나 — StaticBody3D 를 소품 자식으로 달아 돌림·크기를 그대로 따른다.
func _add_prop_body(pr: Node3D) -> bool:
	var inv := pr.global_transform.affine_inverse()
	var box := AABB()
	var first := true
	for n in pr.find_children("*", "MeshInstance3D", true, false):
		var mi := n as MeshInstance3D
		if mi.mesh == null:
			continue
		var a: AABB = (inv * mi.global_transform) * mi.get_aabb()
		box = a if first else box.merge(a)
		first = false
	if first:
		return false
	var sb := StaticBody3D.new()
	sb.name = "DecoSolid"
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = box.size
	cs.shape = shape
	cs.position = box.get_center()
	sb.add_child(cs)
	pr.add_child(sb)
	return true


func _box(body: StaticBody3D, size: Vector3, pos: Vector3) -> void:
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	cs.shape = shape
	cs.position = pos
	body.add_child(cs)


func _cell_key(p: Vector3) -> Vector2i:
	return Vector2i(roundi(p.x / cell), roundi(p.z / cell))


func _wire_places() -> void:
	for mk in _layout.get_node("Places").get_children():
		var id: String = mk.name
		var place_name := str(mk.get_meta("place_name", id))
		var hidden := bool(mk.get_meta("hidden", false))
		places_total += 1

		var label := Label3D.new()
		label.name = "Name_" + id
		label.text = place_name
		label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		label.font_size = 48
		label.outline_size = 10
		label.pixel_size = 0.01
		label.position = mk.position + Vector3(0, LABEL_HEIGHT, 0)
		label.visible = not hidden
		add_child(label)
		_labels[id] = label

		var area := Area3D.new()
		area.name = "Discover_" + id
		var cs := CollisionShape3D.new()
		var shape := SphereShape3D.new()
		shape.radius = cell * DISCOVER_RADIUS_CELLS
		cs.shape = shape
		area.add_child(cs)
		area.position = mk.position
		add_child(area)
		area.body_entered.connect(func(b: Node3D) -> void:
			if b.is_in_group("player"):
				_discover(id, place_name))


func _discover(id: String, place_name: String) -> void:
	if found.has(id):
		return
	found[id] = true
	var label: Label3D = _labels.get(id)
	if label:
		label.visible = true
		label.modulate = Color(1.0, 0.9, 0.55)
	_refresh_count()
	_toast("📍 %s (%d/%d)" % [place_name, found.size(), places_total])
	place_found.emit(id, place_name)


func _refresh_count() -> void:
	if _count_label:
		_count_label.text = "📍 명소 %d/%d" % [found.size(), places_total]


## save_button.gd·simple_event.gd 의 _toast 와 같은 패턴(dialogue_label 그룹 재사용).
func _toast(text_: String) -> void:
	var labels := get_tree().get_nodes_in_group("dialogue_label")
	if labels.is_empty():
		return
	var label: Label = labels[0]
	label.text = text_
	label.show()
	get_tree().create_timer(TOAST_SEC).timeout.connect(func() -> void:
		if is_instance_valid(label) and label.text == text_:
			label.hide()
	)
