extends Node3D

## VERTICAL_SLICE_FOREST.md 4절 "제외" 목록 4번 — 박물관(사고). 웹판
## data-village.js MUSEUM_GRADES/MUSEUM_CATS 조사 결과: 원작은 "기증한
## 종 수"로 등급을 매기지만(곤충/물고기/화석/조개 네 갈래 각각 몇 종
## 있는지), 이 슬라이스엔 종 카탈로그 자체가 없다(갈래당 아이템 하나뿐 —
## 다른 물고기 도감을 새로 만들지 않는다, 44장 "에셋은 무작정 많이 넣지
## 않는다"와 같은 절제). 그래서 **누적 기증 개수**로 단순화했다 — 등급
## 이름·문턱 수치(0/5/12/22/32)는 웹판 그대로.

const ForestMap := preload("res://games/saga_forest/data/village_map.gd")
const TerrainBuilder := preload("res://games/saga_forest/world/forest_terrain_builder.gd")
const WorldCurveMaterial := preload("res://saga_core/world/world_curve_material.gd")
const Toast := preload("res://saga_core/ui/toast.gd")
const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")

const GRID := Vector2i(12, 6)
const RADIUS := 3.5
const CURVE_AMOUNT := 0.004
const GREET_GAP_SEC := 45.0

## 이 슬라이스에서 기증 가능한 갈래 — 웹판 MUSEUM_CATS 그대로(bug→곤충·
## fish→물고기·fossil→화석·shell→조개).
const DONATE_CATS := ["곤충", "물고기", "화석", "조개"]

const GRADES := [
	{"at": 0, "name": "빈 사고"},
	{"at": 5, "name": "문을 연 사고"},
	{"at": 12, "name": "갖춰지는 사고"},
	{"at": 22, "name": "이름난 사고"},
	{"at": 32, "name": "온전한 사고"},
]

var _in_range := false
var _last_greet_ms := -GREET_GAP_SEC * 1000.0


func _ready() -> void:
	var ground: float = TerrainBuilder.LEGEND["."].height
	position = ForestMap.world_pos(GRID.x, GRID.y) + Vector3(0, ground, 0)

	## 이 판에 어울리는 CC0 건물 조각이 없어 primitive로 표시한다(집
	## (wall-block.glb)만큼 공을 들일 자리는 아니라고 판단 — gatherable_
	## builder.gd의 꽃·곤충·조개와 같은 결).
	var mesh := BoxMesh.new()
	mesh.size = Vector3(2.0, 2.4, 2.0)
	var mi := MeshInstance3D.new()
	mi.name = "Visual"
	mi.mesh = mesh
	mi.position = Vector3(0, 1.2, 0)
	mi.material_override = WorldCurveMaterial.vertex_color_material(CURVE_AMOUNT, 0.8, Color(0.5, 0.45, 0.35))
	add_child(mi)

	var body := StaticBody3D.new()
	var cs := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = mesh.size
	cs.shape = box
	cs.position = Vector3(0, 1.2, 0)
	body.add_child(cs)
	add_child(body)

	var area := Area3D.new()
	area.name = "MuseumArea"
	var area_cs := CollisionShape3D.new()
	var area_shape := SphereShape3D.new()
	area_shape.radius = RADIUS
	area_cs.shape = area_shape
	area.add_child(area_cs)
	add_child(area)
	area.body_entered.connect(_on_entered)
	area.body_exited.connect(_on_exited)


func _grade_name() -> String:
	var chosen: String = GRADES[0].name
	for g: Dictionary in GRADES:
		if ForestSaveState.museum_donated >= int(g.at):
			chosen = g.name
	return chosen


func _on_entered(body: Node3D) -> void:
	if not body.is_in_group("player"):
		return
	_in_range = true
	var now := Time.get_ticks_msec()
	if now - _last_greet_ms < GREET_GAP_SEC * 1000.0:
		return
	_last_greet_ms = now
	Toast.show(self, "🏛️ %s — [G] 기증하기 (누적 %d개)" % [_grade_name(), ForestSaveState.museum_donated], 3.0)


func _on_exited(body: Node3D) -> void:
	if body.is_in_group("player"):
		_in_range = false


func _process(_delta: float) -> void:
	if _in_range and Input.is_action_just_pressed("forest_gather"):
		_open_donate_menu()


func _open_donate_menu() -> void:
	var available: Array = []
	for cat in DONATE_CATS:
		if ForestSaveState.item_count(cat) > 0:
			available.append(cat)
	if available.is_empty():
		Toast.show(self, "🏛️ 기증할 것이 없다 — 곤충·물고기·화석·조개를 모아 오게.", 2.5)
		return

	## 다른 선택지 메뉴(gatherable_builder.gd는 안 쓰지만 villager_builder.gd
	## 는 쓰는)와 같은 layer_box 우회 — ChoicePrompt.build() 결과를 콜백이
	## 생성 시점엔 아직 모른다.
	var layer_box := {}
	var choices: Array = []
	for cat in available:
		choices.append({
			"label": "%s 기증하기 (%d개 있음)" % [cat, ForestSaveState.item_count(cat)],
			"cb": func() -> void: _donate(cat, layer_box),
		})
	layer_box["layer"] = ChoicePrompt.build(self, "🏛️ 사고에 기증하기", choices)


func _donate(cat: String, layer_box: Dictionary) -> void:
	(layer_box["layer"] as CanvasLayer).queue_free()
	if not ForestSaveState.donate_to_museum(cat):
		return
	Toast.show(self, "🏛️ %s 을(를) 기증했다 — %s (누적 %d개)" %
		[cat, _grade_name(), ForestSaveState.museum_donated], 3.0)
