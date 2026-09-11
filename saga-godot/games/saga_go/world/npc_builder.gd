extends Node3D

## VERTICAL_SLICE.md 26절 — 주민 1~2명(대화만, 등용 대상 아님).
## PLAN.md Phase 8의 86·87단계(NPC 시스템·Dialogue 시스템)를 이 슬라이스
## 범위로 좁혀 구현한다. 이름·대사는 웹판 js/npc.js를 그대로 가져오되
## (LEGACY_FEATURE_AUDIT.md 참고), 하루 일과·날씨·LOD는 이번 슬라이스
## 범위 밖이라 뺐다 — 자리는 고정, 대사는 한 줄이다.

const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")
const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")
const Toast := preload("res://games/saga_go/ui/toast.gd")

const TALK_RADIUS := 14.0
const TALK_GAP_SEC := 45.0
const LINE_SHOW_SEC := 4.0

## character-a.glb는 플레이어 몫(Player.tscn) — 주민마다 다른 글자를 써서
## 최소한 옷 색만으로도 플레이어·서로와 구별되게 한다(같은 킷 공유,
## docs/ASSET_GUIDE.md 참고). 실측 키(2.7m)·스케일(1.25배)도 플레이어와 같다.
const NPC_CHAR_SCALE := 1.25

## 2026-09-11② — GO 사건 다양화(VERTICAL_SLICE §31 "마을의 부탁"). 촌장에게
## quest_* 필드를 추가했다 — 있으면 처음 말 걸었을 때 사명 제안 패널을
## 띄우고, 그 뒤로는 진행/완료 상태에 맞는 대사로 갈아 낀다. 상인은 그대로
## 한 줄뿐인 예전 방식이다(모든 NPC가 사명을 들 필요는 없다).
const VILLAGERS := [
	{"id": "npc_elder", "name": "마을 촌장",
	 "line": "이 마을에 무슨 일로 오셨소.",
	 "grid": Vector2i(1, 3), "glb": "res://assets/characters/character-b.glb",
	 "quest_id": "village_ask", "quest_name": "도적 두목을 물리쳐라",
	 "quest_offer_title": "🙏 마을의 부탁\n\"보아하니 멀리서 오신 분 같은데, 청이 하나 있소. 요 며칠 산길에 도적 두목이 나타나 오가는 이들을 괴롭힌다오. 그자를 물리쳐 주실 수 있겠소?\"",
	 "quest_wait_line": "아직인가... 부디 조심하시게.",
	 "quest_done_line": "정말 고맙소이다! 이 은혜는 잊지 않겠소."},
	{"id": "npc_merchant", "name": "떠돌이 상인",
	 "line": "북쪽 산길은 요즘 값이 오르오. 짐꾼을 못 구해서.",
	 "grid": Vector2i(4, 3), "glb": "res://assets/characters/character-c.glb",
	 "offer_title": "🧺 길 위의 상인\n\"수레가 무거워 못 가겠소. 값은 후하게 쳐 드리리다.\"",
	 "offer_a_label": "짐을 덜어 준다", "offer_a_outcome": "상인이 등용서와 사료를 얹어 주었다.",
	 "offer_a_exp": 8.0,
	 "offer_b_label": "지나간다", "offer_b_outcome": "수레가 삐걱대는 소리가 뒤로 멀어졌다.",
	 "offer_b_exp": 0.0},
]

var _last_said_ms := {}
var _quest_prompt_by_id := {}
## 웹판 road_merchant처럼 "우연히 한 번" 마주치는 제안 — quest_id와 달리
## 완료 조건이 없어 QuestState에 안 올리고 이 세션 안에서만 기억한다
## (저장/로드로는 안 이어짐, 재실행하면 다시 제안할 수 있다 — 사명과
## 달리 결과가 가볍고 반복돼도 loop이 안 깨지는 성격이라 지금은 이 정도로
## 충분하다고 판단, 필요해지면 save_state.gd에 필드를 더 추가하면 된다).
var _offer_used := {}

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

	var body := _build_body(v.glb)
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

	if v.has("quest_id"):
		_quest_prompt_by_id[v.id] = _build_quest_prompt(v)

## GLB 캐릭터를 통째로 인스턴스한다(대화만 하는 주민이라 애니메이션은
## idle 그대로 둔다 — player.gd처럼 걷기 전환이 필요 없다). 못 받아 왔으면
## 예전 캡슐로 대체해 주민이 아예 안 보이는 것보단 낫게 한다.
func _build_body(glb_path: String) -> Node3D:
	var scene: PackedScene = load(glb_path)
	if scene != null:
		var inst := scene.instantiate()
		inst.scale = Vector3.ONE * NPC_CHAR_SCALE
		return inst

	var body := MeshInstance3D.new()
	var mesh := CapsuleMesh.new()
	mesh.radius = 0.9
	mesh.height = 3.4
	body.mesh = mesh
	body.position = Vector3(0, 1.7, 0)
	return body

## 지나가다 듣는 한 마디다(웹판 npc.js와 같은 감각) — 누르는 대화창은
## 아니다. 조우 판정에는 손대지 않는다. 사명이 딸린 NPC(촌장)는 처음
## 말 걸었을 때만 제안 패널(_build_quest_prompt)이 뜨고, 그 뒤로는
## 진행/완료 상태에 맞는 한 줄로 갈아 낀다 — event.js village_ask가
## "한 번 맡으면 다시 안 묻는다"는 것과 같은 경계.
func _on_body_entered(body: Node3D, v: Dictionary) -> void:
	if not body.is_in_group("player"):
		return
	var now := Time.get_ticks_msec()
	var last: int = _last_said_ms.get(v.id, -TALK_GAP_SEC * 1000.0 as int)
	if now - last < TALK_GAP_SEC * 1000.0:
		return
	_last_said_ms[v.id] = now

	if v.has("quest_id"):
		if not QuestState.has_been_offered(v.quest_id):
			_quest_prompt_by_id[v.id].show()
			return
		if QuestState.active_id == v.quest_id:
			_say(v.name, v.quest_done_line if QuestState.done else v.quest_wait_line)
			return
	if v.has("offer_title") and not _offer_used.get(v.id, false):
		_offer_used[v.id] = true
		_show_offer_prompt(v)
		return
	_say(v.name, v.line)

## road_merchant 같은 일회성 제안 — 사명과 달리 상시 유지되는 패널을
## 미리 만들어 두지 않고 트리거될 때 그때 세운다(simple_event.gd의
## 사건 패널과 같은 경계, 어차피 _offer_used로 한 번뿐이라 재사용 필요 없다).
func _show_offer_prompt(v: Dictionary) -> void:
	var layer: CanvasLayer
	layer = ChoicePrompt.build(self, v.offer_title, [
		{"label": v.offer_a_label, "cb": func() -> void: _resolve_offer(layer, v.offer_a_outcome, v.offer_a_exp)},
		{"label": v.offer_b_label, "cb": func() -> void: _resolve_offer(layer, v.offer_b_outcome, v.offer_b_exp)},
	])

func _resolve_offer(layer: CanvasLayer, text: String, exp_reward: float) -> void:
	layer.queue_free()
	if exp_reward > 0.0:
		PartyState.add_exp(exp_reward)
		text += " (경험 +%d)" % int(exp_reward)
	Toast.show(self, text, LINE_SHOW_SEC)

func _build_quest_prompt(v: Dictionary) -> CanvasLayer:
	var layer := ChoicePrompt.build(self, v.quest_offer_title, [
		{"label": "맡는다", "cb": func() -> void:
			_quest_prompt_by_id[v.id].hide()
			QuestState.accept(v.quest_id, v.quest_name)
			_say(v.name, "고맙소, 부디 몸조심하시게.")},
		{"label": "사양한다", "cb": func() -> void:
			_quest_prompt_by_id[v.id].hide()
			QuestState.decline(v.quest_id)
			_say(v.name, "그런가... 아쉽구려.")},
	])
	layer.visible = false
	return layer

func _say(npc_name: String, line: String) -> void:
	Toast.show(self, "%s — %s" % [npc_name, line], LINE_SHOW_SEC)
