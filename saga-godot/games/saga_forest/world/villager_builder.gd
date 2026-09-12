extends Node3D

## VERTICAL_SLICE_FOREST.md 4절 "제외" 목록 3번 착수 — 주민 5명 전체(+
## 첫 슬라이스의 숲지기 1명 = 총 6명) + 부탁(퀘스트)·선물. 웹판
## data-village.js NPCS/QUESTS 조사 결과: 여섯(+배달원)이 각자 하나씩
## "한 번뿐인 부탁"을 들고 있고(부탁 타입은 bagcat/chest/meetnpc 셋),
## 선물은 사람마다 좋아하는 채집물 갈래가 있어 맞혀 주면 정(친밀도)이
## 더 는다.
##
## **재해석한 부분(그대로 못 옮긴 것, 근거를 남겨 둔다):**
## - keeper(숲지기)의 원래 부탁은 "동굴 보물"(chest 타입) — 이 슬라이스엔
##   보물상자 시스템이 없어 bagcat(과일)로 바꿨다.
## - herbalist(약초꾼)의 원래 부탁은 "약초 다섯 뿌리" — 버섯숲 바이옴(4절
##   "제외" 목록 7번, 아직 없음) 전용 채집물이라 bagcat(광석)으로 바꿨다.
## - **배달원(courier)은 이번에 안 넣는다** — QUESTS 표가 없는 유일한
##   예외(반복 가능한 일거리라 "한 번뿐" 부탁 모델과 안 맞음, 택배 접수대
##   같은 새 사물도 필요)라 범위를 넘는다.
## - **편지(mail.js)는 이번에 안 넣는다** — 원작에서 편지는 "주민(residents)
##   이 이사 오고 나가는" 훨씬 큰 마을 시뮬레이션에 물려 있는 기능이라,
##   이 여섯 역할 NPC와는 다른 시스템이다. 얕은 흉내(가짜 편지 한 줄)보다
##   안 만드는 쪽을 골랐다 — 다음에 그 마을 시뮬레이션 자체를 만들 때
##   같이 볼 것.
##
## 나머지(angler·merchant·explorer·wanderer)의 부탁은 웹판 그대로(문구·
## 보상 금액도 같다) — 필요한 채집물이 이미 이 슬라이스에 다 있다.

const ForestMap := preload("res://games/saga_forest/data/village_map.gd")
const TerrainBuilder := preload("res://games/saga_forest/world/forest_terrain_builder.gd")
const GLBUtils := preload("res://games/saga_go/world/glb_utils.gd")
const WorldCurveMaterial := preload("res://saga_core/world/world_curve_material.gd")
const Toast := preload("res://saga_core/ui/toast.gd")
const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")

const NPC_CHAR_SCALE := 1.25  # GO npc_builder.gd와 같은 값(같은 킷, 같은 실측 키)
const TALK_RADIUS := 5.0
const TALK_GAP_SEC := 45.0
const LINE_SHOW_SEC := 4.0
const CURVE_AMOUNT := 0.004

## 선물로 줄 수 있는 갈래 — 이 슬라이스의 채집물 다섯 그대로(웹판
## GIFT_CATS는 곤충·조개·화석도 포함하지만 그건 아직 없는 도감 계열이다).
const GIFT_CATS := ["과일", "솔방울", "광석", "꽃", "물고기"]

## explorer의 meetnpc 부탁 — 웹판이 "count = 로스터 크기-1"로 두는 것과
## 같은 자리(설명은 아래 _quest_progress() 참고). 로스터가 6명이라 5.
const ROSTER_SIZE := 6

const VILLAGERS := [
	{"id": "npc_keeper", "name": "숲지기", "line": "이 숲은 내가 돌본다 — 짐승을 함부로 놀라게 하지 마시게",
	 "grid": Vector2i(19, 9), "glb": "res://assets/characters/character-b.glb",
	 "gift_like": "과일",
	 "quest": {"title": "숲의 몫", "type": "bagcat", "item_label": "과일", "count": 5, "reward": 300,
		"desc": "겨울 채비로 과일을 다섯 개만 나눠 주게"}},
	{"id": "npc_angler", "name": "낚시꾼", "line": "이 물엔 씨알 좋은 놈들이 산다네",
	 "grid": Vector2i(26, 5), "glb": "res://assets/characters/character-c.glb",
	 "gift_like": "물고기",
	 "quest": {"title": "씨알 좋은 물고기", "type": "bagcat", "item_label": "물고기", "count": 3, "reward": 350,
		"desc": "물고기 세 마리만 낚아다 주게"}},
	{"id": "npc_merchant", "name": "상인", "line": "먼 길 다니며 이것저것 모았지 — 나중에 풀어놓겠네",
	 "grid": Vector2i(5, 14), "glb": "res://assets/characters/character-d.glb",
	 "gift_like": "꽃",
	 "quest": {"title": "꽃 다섯 송이", "type": "bagcat", "item_label": "꽃", "count": 5, "reward": 300,
		"desc": "꽃 다섯 송이만 모아다 주게 — 팔 데가 있어"}},
	{"id": "npc_explorer", "name": "탐험가", "line": "이 폭포 너머에 뭐가 있는지 아직 아무도 몰라",
	 "grid": Vector2i(25, 8), "glb": "res://assets/characters/character-b.glb",
	 "gift_like": "광석",
	 "quest": {"title": "숲의 나머지 사람들", "type": "meetnpc", "count": ROSTER_SIZE - 1, "reward": 500,
		"desc": "이 숲 다른 사람들도 다 만나고 왔나?"}},
	{"id": "npc_herbalist", "name": "약초꾼", "line": "버섯 숲엔 좋은 약초가 지천이야",
	 "grid": Vector2i(5, 8), "glb": "res://assets/characters/character-c.glb",
	 "gift_like": "솔방울",
	 "quest": {"title": "광석 세 덩이", "type": "bagcat", "item_label": "광석", "count": 3, "reward": 400,
		"desc": "약을 지으려니 단단한 광석이 세 덩이 필요하네"}},
	{"id": "npc_wanderer", "name": "나그네", "line": "이 외딴집에서 하룻밤 신세 좀 지고 있다네",
	 "grid": Vector2i(14, 15), "glb": "res://assets/characters/character-d.glb",
	 "gift_like": "과일",
	 "quest": {"title": "길양식", "type": "bagcat", "item_label": "솔방울", "count": 4, "reward": 320,
		"desc": "먼 길 갈 양식으로 솔방울 네 알만 나눠 주게"}},
]

var _last_said_ms := {}
var _in_range := {}


func _ready() -> void:
	for v: Dictionary in VILLAGERS:
		_spawn(v)


func _spawn(v: Dictionary) -> void:
	var ch: String = ForestMap.tile_at(v.grid.x, v.grid.y)
	var ground: float = TerrainBuilder.LEGEND[ch].height

	var root := Node3D.new()
	root.name = "Villager_%s" % v.id
	root.position = ForestMap.world_pos(v.grid.x, v.grid.y) + Vector3(0, ground, 0)
	add_child(root)

	root.add_child(_build_body(v.glb))

	var area := Area3D.new()
	area.name = "TalkArea"
	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = TALK_RADIUS
	cs.shape = shape
	area.add_child(cs)
	root.add_child(area)
	area.body_entered.connect(_on_body_entered.bind(v))
	area.body_exited.connect(_on_body_exited.bind(v))

	_last_said_ms[v.id] = -TALK_GAP_SEC * 1000.0
	_in_range[v.id] = false


func _build_body(glb_path: String) -> Node3D:
	var scene: PackedScene = load(glb_path)
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
	## GO의 npc_builder.gd와 달리 여기는 각자 다른 텍스처를 쓰는 캐릭터가
	## 셋뿐(b/c/d)이라 파일명에서 곧바로 텍스처 경로를 뽑는다(a→player만
	## 예외라 이 목록엔 안 나온다).
	var letter: String = glb_path.get_file().trim_suffix(".glb").right(1)
	var texture_path := "res://assets/characters/Textures/texture-%s.png" % letter
	var mat := WorldCurveMaterial.textured_material(texture_path, CURVE_AMOUNT)
	for mi: MeshInstance3D in GLBUtils.find_all_mesh_instances(inst):
		mi.material_override = mat
	return inst


func _on_body_entered(body: Node3D, v: Dictionary) -> void:
	if not body.is_in_group("player"):
		return
	_in_range[v.id] = true
	ForestSaveState.mark_met(v.id)

	var now := Time.get_ticks_msec()
	if now - _last_said_ms[v.id] < TALK_GAP_SEC * 1000.0:
		return
	_last_said_ms[v.id] = now
	_talk(v)


func _on_body_exited(body: Node3D, v: Dictionary) -> void:
	if body.is_in_group("player"):
		_in_range[v.id] = false


## 웹판 talkNpc() 그대로 — 부탁을 이미 마쳤으면 인사말, 안 마쳤는데
## 조건을 채웠으면 그 자리에서 마치고 보상, 아직이면 진행 상황.
func _talk(v: Dictionary) -> void:
	if ForestSaveState.is_quest_done(v.id):
		Toast.show(self, "%s — %s" % [v.name, v.line], LINE_SHOW_SEC)
		return

	var q: Dictionary = v.quest
	var prog := _quest_progress(q)
	if prog.have < prog.need:
		Toast.show(self, "%s — %s (%d/%d)" % [v.name, q.desc, prog.have, prog.need], LINE_SHOW_SEC)
		return

	ForestSaveState.mark_quest_done(v.id)
	if q.type == "bagcat":
		ForestSaveState.items[q.item_label] = ForestSaveState.item_count(q.item_label) - int(q.count)
	ForestSaveState.add_gold(int(q.reward))
	Toast.show(self, "%s — 「%s」을 마쳤다! 🪙 +%d" % [v.name, q.title, q.reward], LINE_SHOW_SEC)


## bagcat(가방 속 채집물 개수)·meetnpc(만난 주민 수) 둘만 안다 — 웹판
## questProgress()와 같은 범위(chest는 이 슬라이스에 없어 빼뒀다, 위
## 상단 주석 "재해석한 부분" 참고).
func _quest_progress(q: Dictionary) -> Dictionary:
	if q.type == "meetnpc":
		return {"have": ForestSaveState.met_count(), "need": int(q.count)}
	return {"have": ForestSaveState.item_count(q.item_label), "need": int(q.count)}


func _process(_delta: float) -> void:
	for v: Dictionary in VILLAGERS:
		if _in_range.get(v.id, false) and Input.is_action_just_pressed("forest_gather"):
			_open_gift_menu(v)


## 선물 — 부탁과 달리 내가 골라서 준다. 사람마다 하루 한 번, 좋아하는
## 갈래를 맞히면 친밀도가 더 는다(웹판 giveGift()와 같은 배율: 3배 아니면
## 1배).
func _open_gift_menu(v: Dictionary) -> void:
	if ForestSaveState.gifted_today(v.id):
		Toast.show(self, "%s — 오늘은 이미 선물을 건넸다." % v.name, 2.0)
		return

	var available: Array = []
	for cat in GIFT_CATS:
		if ForestSaveState.item_count(cat) > 0:
			available.append(cat)
	if available.is_empty():
		Toast.show(self, "%s — 줄 만한 채집물이 없다." % v.name, 2.0)
		return

	## GDScript 람다는 바깥 지역 변수를 "생성 시점 값"으로 캡처한다 —
	## test_room.gd의 은사 선택지·npc_builder.gd의 사명 제안과 같은
	## layer_box 우회(ChoicePrompt.build() 호출 전에 만든 콜백이 그 결과를
	## 미리 참조할 수 없어서다).
	var layer_box := {}
	var choices: Array = []
	for cat in available:
		choices.append({
			"label": "%s 주기 (%d개 있음)" % [cat, ForestSaveState.item_count(cat)],
			"cb": func() -> void: _give_gift(v, cat, layer_box),
		})
	layer_box["layer"] = ChoicePrompt.build(self, "🎁 %s 에게 선물하기" % v.name, choices)


func _give_gift(v: Dictionary, cat: String, layer_box: Dictionary) -> void:
	(layer_box["layer"] as CanvasLayer).queue_free()
	ForestSaveState.items[cat] = ForestSaveState.item_count(cat) - 1
	ForestSaveState.mark_gifted(v.id)
	var loved: bool = cat == v.gift_like
	var up: int = 3 if loved else 1
	ForestSaveState.add_affinity(v.id, up)
	Toast.show(self, "%s%s 에게 %s 을(를) 건넸다 — 친밀도 +%d" %
		["아주 반긴다! " if loved else "", v.name, cat, up], LINE_SHOW_SEC)
