extends Node3D

## VERTICAL_SLICE.md §30·31 확장(GO 사건 다양화) 2호 — 전투도 사명도 아닌,
## 웹판 event.js의 "발견/돕기" 계열 사건(hurt_soldier 등). 선택지를 고르면
## 짧은 결과 문구만 보여주고 끝나는 가장 가벼운 사건 형태다.
## bandit_encounter.gd(전투, 진 뒤 재도전 가능)·npc_builder.gd의 퀘스트
## 제안(대화 트리거, 상태가 남는다)과 달리 이건 **한 번뿐**이다 — 웹판
## event.js도 이런 "우연히 마주친" 사건은 재등장하지 않는다. 고르고 나면
## queue_free().
##
## visual_glb를 비워 두면 캡슐로 대체한다 — 지금 받아 둔 GLB 4종
## (character-a~d)은 이미 플레이어·촌장·상인·산적으로 자리가 정해져 있어
## 그대로 재사용하면 "부상당한 병사가 사실 상인이었나?" 같은 혼란이 생긴다.
## 다른 primitive→GLB 교체(동굴 입구 등)와 같은 경계로, 어울리는 조각을
## 새로 받기 전까진 primitive로 남겨 둔다.

const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")
const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")

const TRIGGER_RADIUS := 16.0
const TOAST_SEC := 4.0

@export var grid := Vector2i(2, 4)
@export var event_title := "🩹 부상당한 병사\n\"물… 물 좀 주시오.\""
@export var visual_glb := ""
@export var vis_scale := 1.25
@export var choice_a_label := "돌본다"
@export var choice_a_outcome := "물병을 건네자 병사가 고개를 끄덕였다. \"고맙소, 이 은혜는 잊지 않겠소.\""
@export var choice_b_label := "지나간다"
@export var choice_b_outcome := "뒤에서 낮은 기침 소리가 들렸다."

var _area: Area3D
var _triggered := false

func _ready() -> void:
	_spawn_visual()
	_spawn_area()

func _spawn_visual() -> void:
	var ch: String = TestMap.tile_at(grid.x, grid.y)
	var ground: float = TerrainBuilder.LEGEND[ch].height
	position = TestMap.world_pos(grid.x, grid.y) + Vector3(0, ground, 0)

	var visual: Node3D = null
	if visual_glb != "":
		var scene: PackedScene = load(visual_glb)
		if scene != null:
			visual = scene.instantiate()
			visual.scale = Vector3.ONE * vis_scale
	if visual == null:
		var mi := MeshInstance3D.new()
		var mesh := CapsuleMesh.new()
		mesh.radius = 0.7
		mesh.height = 1.5
		mi.mesh = mesh
		mi.position = Vector3(0, 0.75, 0)
		var mat := StandardMaterial3D.new()
		mat.albedo_color = Color(0.45, 0.4, 0.32)
		mi.material_override = mat
		visual = mi
	add_child(visual)

func _spawn_area() -> void:
	_area = Area3D.new()
	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = TRIGGER_RADIUS
	cs.shape = shape
	_area.add_child(cs)
	add_child(_area)
	_area.body_entered.connect(_on_body_entered)

func _on_body_entered(body: Node3D) -> void:
	if _triggered or not body.is_in_group("player"):
		return
	_triggered = true
	ChoicePrompt.build(self, event_title, [
		{"label": choice_a_label, "cb": func() -> void: _resolve(choice_a_outcome)},
		{"label": choice_b_label, "cb": func() -> void: _resolve(choice_b_outcome)},
	])

func _resolve(text: String) -> void:
	_toast(text)
	queue_free() # 패널·트리거 모두 이 노드 자식이라 같이 사라진다

func _toast(text: String) -> void:
	var labels := get_tree().get_nodes_in_group("dialogue_label")
	if labels.is_empty():
		return
	var label: Label = labels[0]
	label.text = text
	label.show()
	get_tree().create_timer(TOAST_SEC).timeout.connect(func() -> void:
		if is_instance_valid(label) and label.text == text:
			label.hide()
	)
