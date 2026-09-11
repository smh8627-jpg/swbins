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
##
## choice_*_exp는 웹판 event.js의 exp 필드 값을 그대로 옮긴 것 — 0이면
## 그 선택지는 보상 없이 문구만 보여준다(TestVillage.tscn에서 사건마다
## 다르게 덮어씀, 이 스크립트의 기본값은 hurt_soldier 기준이다).
##
## 2026-09-11⑮ — map_scrap(보물 지도 조각)부터 choice_*_chance를 추가했다.
## 웹판 event.js는 `roll < 0.45` 식으로 선택지 하나가 두 갈래 결과를 낼 수
## 있는데, 지금까지 만든 사건은 다 결정적(1.0)이라 그 갈래가 없었다.
## 1.0(기본값, 항상 outcome/exp)이면 예전 사건들과 완전히 같게 동작하고,
## 1.0보다 낮으면 그 확률로만 outcome을, 나머지는 choice_*_fail_*을 쓴다.

const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")
const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")
const Toast := preload("res://games/saga_go/ui/toast.gd")

const TRIGGER_RADIUS := 16.0
const TOAST_SEC := 4.0

@export var grid := Vector2i(2, 4)
@export var event_title := "🩹 부상당한 병사\n\"물… 물 좀 주시오.\""
@export var visual_glb := ""
@export var vis_scale := 1.25
@export var choice_a_label := "돌본다"
@export var choice_a_outcome := "물병을 건네자 병사가 고개를 끄덕였다. \"고맙소, 이 은혜는 잊지 않겠소.\""
@export var choice_a_exp := 20.0
@export var choice_a_chance := 1.0
@export var choice_a_fail_outcome := ""
@export var choice_a_fail_exp := 0.0
@export var choice_b_label := "지나간다"
@export var choice_b_outcome := "뒤에서 낮은 기침 소리가 들렸다."
@export var choice_b_exp := 0.0
@export var choice_b_chance := 1.0
@export var choice_b_fail_outcome := ""
@export var choice_b_fail_exp := 0.0

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
		{"label": choice_a_label, "cb": func() -> void: _resolve_roll(choice_a_outcome, choice_a_exp, choice_a_fail_outcome, choice_a_fail_exp, choice_a_chance)},
		{"label": choice_b_label, "cb": func() -> void: _resolve_roll(choice_b_outcome, choice_b_exp, choice_b_fail_outcome, choice_b_fail_exp, choice_b_chance)},
	])

## chance가 1.0(기본값)이면 항상 outcome/exp — 예전 사건들과 동일하게
## 결정적이다. 그보다 낮으면 그 확률로만 성공, 나머지는 fail_outcome/
## fail_exp를 쓴다(웹판 event.js의 `roll < 0.45` 식 분기와 같은 감각).
func _resolve_roll(outcome: String, exp_reward: float, fail_outcome: String, fail_exp: float, chance: float) -> void:
	if chance < 1.0 and randf() > chance:
		_resolve(fail_outcome, fail_exp)
	else:
		_resolve(outcome, exp_reward)

func _resolve(text: String, exp_reward: float) -> void:
	if exp_reward > 0.0:
		PartyState.add_exp(exp_reward)
		text += " (경험 +%d)" % int(exp_reward)
	_toast(text)
	queue_free() # 패널·트리거 모두 이 노드 자식이라 같이 사라진다

func _toast(text: String) -> void:
	Toast.show(self, text, TOAST_SEC)
