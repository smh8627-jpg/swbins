extends Node3D

## VERTICAL_SLICE_FOREST.md 4절 "주민 1명(NPCS 중 하나, 이름 그대로) +
## 말 걸기(대사만 — 부탁/선물/편지는 제외)". GO의 npc_builder.gd와 같은
## 얼개(Area3D 반경 안에 들어오면 한 마디, 쿨다운 지나야 다시)지만 사명·
## 제안 패널은 아예 없다 — 훨씬 단순하다. 도감(CodexState)도 이번
## 슬라이스 범위 밖이라 안 부른다(4절 "제외" 목록).
##
## data-village.js의 NPCS(숲지기·낚시꾼·상인·탐험가·약초꾼·나그네)는
## 역할 이름이지 실존 인물이 아니다(4절에서 이미 확인) — 그중 "숲지기"
## 하나를 고른다.
##
## 1절 결정(구면 투영)에 따라 NPC도 땅과 같은 곡률을 써야 한다(안 그러면
## 붕 떠 보인다) — GLB가 몸통·팔·다리·머리로 나뉜 뼈대 캐릭터라
## find_all_mesh_instances()로 전부 찾아 같이 덮어씌운다(GO
## bandit_encounter.gd와 같은 이유).

const ForestMap := preload("res://games/saga_forest/data/village_map.gd")
const TerrainBuilder := preload("res://games/saga_forest/world/forest_terrain_builder.gd")
const GLBUtils := preload("res://games/saga_go/world/glb_utils.gd")
const WorldCurveMaterial := preload("res://saga_core/world/world_curve_material.gd")
const Toast := preload("res://saga_core/ui/toast.gd")

const NPC_NAME := "숲지기"
const NPC_LINE := "이 숲은 내가 다 안다오 — 나무를 흔들면 열매가 떨어질 게요."
const NPC_GLB := "res://assets/characters/character-b.glb"
const NPC_TEXTURE := "res://assets/characters/Textures/texture-b.png"
const NPC_CHAR_SCALE := 1.25  # GO npc_builder.gd와 같은 값(같은 킷, 같은 실측 키)
const GRID := Vector2i(19, 9)
const TALK_RADIUS := 5.0
const TALK_GAP_SEC := 45.0
const LINE_SHOW_SEC := 4.0
const CURVE_AMOUNT := 0.004

var _last_said_ms := -TALK_GAP_SEC * 1000.0


func _ready() -> void:
	var ch: String = ForestMap.tile_at(GRID.x, GRID.y)
	var ground: float = TerrainBuilder.LEGEND[ch].height

	position = ForestMap.world_pos(GRID.x, GRID.y) + Vector3(0, ground, 0)

	var body := _build_body()
	add_child(body)

	var area := Area3D.new()
	area.name = "TalkArea"
	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = TALK_RADIUS
	cs.shape = shape
	area.add_child(cs)
	add_child(area)
	area.body_entered.connect(_on_body_entered)


func _build_body() -> Node3D:
	var scene: PackedScene = load(NPC_GLB)
	if scene == null:
		var fallback := MeshInstance3D.new()
		var mesh := CapsuleMesh.new()
		mesh.radius = 0.9
		mesh.height = 3.4
		fallback.mesh = mesh
		fallback.position = Vector3(0, 1.7, 0)
		return fallback

	var inst := scene.instantiate()
	inst.scale = Vector3.ONE * NPC_CHAR_SCALE
	var mat := WorldCurveMaterial.textured_material(NPC_TEXTURE, CURVE_AMOUNT)
	for mi: MeshInstance3D in GLBUtils.find_all_mesh_instances(inst):
		mi.material_override = mat
	return inst


func _on_body_entered(body: Node3D) -> void:
	if not body.is_in_group("player"):
		return
	var now := Time.get_ticks_msec()
	if now - _last_said_ms < TALK_GAP_SEC * 1000.0:
		return
	_last_said_ms = now
	Toast.show(self, "%s — %s" % [NPC_NAME, NPC_LINE], LINE_SHOW_SEC)
