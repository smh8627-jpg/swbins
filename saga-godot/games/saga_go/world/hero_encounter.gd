extends Node3D

## GO의 실제 정체성("saga — 역사 인물로 노는 웹 게임", 루트 CLAUDE.md 첫 줄)을
## 대표하는 사건 — 지금까지 만든 8개 사건(도적 두목·마을의 부탁·부상병 등)은
## 다 일반 산적·주민이었고, **실제 역사 인물을 만나 등용하는** 조우는 아직
## 하나도 없었다. saga_core/data/characters.gd(2026-08-31에 결정만 되고
## 안 만들어져 있던 것 — 이번에 105명 데이터를 옮겨 완성)를 처음 쓰는 자리다.
##
## 웹판 encounter.js의 "설득 어필(무/지/덕)이 인물 trait과 맞으면 호감도가
## 크게 오른다"는 미니게임은 이번 슬라이스 범위 밖 — 새로 설계하지 않고
## "등용한다/보낸다" 두 선택지로 좁혔다(항상 성공, VERTICAL_SLICE의 다른
## 사건들과 같은 최소 구현). 인물의 개성(trait·stats)은 데이터에 이미
## 있으니, 설득 미니게임을 실제로 만들 때 그대로 쓸 수 있다.
##
## 시각은 캡슐로 남겼다(다른 사건과 같은 이유 — 받아 둔 GLB 4종은 이미
## 플레이어·촌장·상인·산적 자리가 정해져 있다). rarity가 높을수록 금빛에
## 가깝게 색을 낸다 — 도감 rarity 색(data.js RARITY.5 = 금)과 같은 감각.

const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")
const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")
const Toast := preload("res://games/saga_go/ui/toast.gd")
const Characters := preload("res://saga_core/data/characters.gd")

const TRIGGER_RADIUS := 18.0
const TOAST_SEC := 5.0
## 웹판에는 "등용 exp"라는 필드가 따로 없다 — rarity(1~5)에 비례해서
## 새로 정한 값이다(설득 난이도가 곧 성장 보상이라는 감각).
const EXP_PER_RARITY := 15.0

@export var grid := Vector2i(5, 4)
@export var hero_id := "kr_yisunsin"

var _hero: Dictionary
var _triggered := false

func _ready() -> void:
	var found: Variant = Characters.find(hero_id)
	if found == null:
		push_warning("hero_encounter: unknown hero_id " + hero_id)
		queue_free()
		return
	_hero = found
	_spawn_visual()
	_spawn_area()

func _spawn_visual() -> void:
	var ch: String = TestMap.tile_at(grid.x, grid.y)
	var ground: float = TerrainBuilder.LEGEND[ch].height
	position = TestMap.world_pos(grid.x, grid.y) + Vector3(0, ground, 0)

	var mi := MeshInstance3D.new()
	var mesh := CapsuleMesh.new()
	mesh.radius = 0.85
	mesh.height = 3.2
	mi.mesh = mesh
	mi.position = Vector3(0, 1.6, 0)
	var mat := StandardMaterial3D.new()
	## rarity 5=금빛, 낮을수록 은빛 쪽으로 — data.js RARITY 색 감각을 흉내.
	var t: float = clampf((int(_hero.rarity) - 1) / 4.0, 0.0, 1.0)
	mat.albedo_color = Color(0.75, 0.7, 0.55).lerp(Color(0.95, 0.78, 0.25), t)
	mi.material_override = mat
	add_child(mi)

func _spawn_area() -> void:
	var area := Area3D.new()
	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = TRIGGER_RADIUS
	cs.shape = shape
	area.add_child(cs)
	add_child(area)
	area.body_entered.connect(_on_body_entered)

func _on_body_entered(body: Node3D) -> void:
	if _triggered or not body.is_in_group("player"):
		return
	_triggered = true
	var title := "%s %s(%s)\n\"%s\"" % [_hero.emoji, _hero.name, _hero.hanja, _hero.quote]
	ChoicePrompt.build(self, title, [
		{"label": "등용한다", "cb": _recruit},
		{"label": "보낸다", "cb": _let_go},
	])

func _recruit() -> void:
	PartyState.recruit(_hero.id)
	var exp_reward: float = int(_hero.rarity) * EXP_PER_RARITY
	PartyState.add_exp(exp_reward)
	Toast.show(self, "%s가 부대에 합류했다! (경험 +%d)" % [_hero.name, int(exp_reward)], TOAST_SEC)
	queue_free()

func _let_go() -> void:
	Toast.show(self, "%s가 길을 따라 멀어졌다." % _hero.name, TOAST_SEC)
	queue_free()
