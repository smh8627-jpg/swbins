extends Node3D

## VERTICAL_SLICE.md 26절 — 주민 1~2명(대화만, 등용 대상 아님).
## PLAN.md Phase 8의 86·87단계(NPC 시스템·Dialogue 시스템)를 이 슬라이스
## 범위로 좁혀 구현한다. 이름·대사는 웹판 js/npc.js를 그대로 가져오되
## (LEGACY_FEATURE_AUDIT.md 참고), 하루 일과·날씨·LOD는 이번 슬라이스
## 범위 밖이라 뺐다 — 자리는 고정, 대사는 한 줄이다.

const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")

const TALK_RADIUS := 14.0
const TALK_GAP_SEC := 45.0
const LINE_SHOW_SEC := 4.0

const VILLAGERS := [
	{"id": "npc_elder", "name": "마을 촌장",
	 "line": "이 마을에 무슨 일로 오셨소.",
	 "grid": Vector2i(1, 3), "color": Color(0.54, 0.5, 0.42)},
	{"id": "npc_merchant", "name": "떠돌이 상인",
	 "line": "북쪽 산길은 요즘 값이 오르오. 짐꾼을 못 구해서.",
	 "grid": Vector2i(4, 3), "color": Color(0.48, 0.42, 0.25)},
]

var _last_said_ms := {}

func _ready() -> void:
	for v in VILLAGERS:
		_spawn(v)

func _spawn(v: Dictionary) -> void:
	var ch: String = TestMap.tile_at(v.grid.x, v.grid.y)
	var ground: float = TerrainBuilder.LEGEND[ch].height

	var root := Node3D.new()
	root.name = "Villager_%s" % v.id
	root.position = TestMap.world_pos(v.grid.x, v.grid.y) + Vector3(0, ground, 0)
	add_child(root)

	var body := MeshInstance3D.new()
	var mesh := CapsuleMesh.new()
	mesh.radius = 0.9
	mesh.height = 3.4
	body.mesh = mesh
	body.position = Vector3(0, 1.7, 0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = v.color
	body.material_override = mat
	root.add_child(body)

	var area := Area3D.new()
	area.name = "TalkArea"
	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = TALK_RADIUS
	cs.shape = shape
	area.add_child(cs)
	root.add_child(area)
	area.body_entered.connect(_on_body_entered.bind(v))

## 지나가다 듣는 한 마디다(웹판 npc.js와 같은 감각) — 누르는 대화창은
## 아니다. 조우 판정에는 손대지 않는다.
func _on_body_entered(body: Node3D, v: Dictionary) -> void:
	if not body.is_in_group("player"):
		return
	var now := Time.get_ticks_msec()
	var last: int = _last_said_ms.get(v.id, -TALK_GAP_SEC * 1000.0 as int)
	if now - last < TALK_GAP_SEC * 1000.0:
		return
	_last_said_ms[v.id] = now
	_say(v)

func _say(v: Dictionary) -> void:
	var labels := get_tree().get_nodes_in_group("dialogue_label")
	if labels.is_empty():
		return
	var label: Label = labels[0]
	var text := "%s — %s" % [v.name, v.line]
	label.text = text
	label.show()
	get_tree().create_timer(LINE_SHOW_SEC).timeout.connect(func() -> void:
		if is_instance_valid(label) and label.text == text:
			label.hide()
	)
