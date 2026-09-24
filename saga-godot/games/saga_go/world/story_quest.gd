extends Node3D

## PLAN 106장 ㉕ — 원신식 이야기 임무(진행·대화·목표 표시). 표는 data/story.gd, 상태는 PartyState.story {ch, step}.
##   임무 인물 셋(마을 촌장·포구 사공·폐허 학자)이 늘 서 있다. 3m 안 F(터치 "대화 (F)")로 말을 건다 —
##   지금 단계의 인물이면 대화가 이어지고(끝나면 다음 단계), 아니면 한 줄 혼잣말.
##   대화 창: 아래 가운데, 말하는 이·글. F·Space·Enter·누르기로 넘기고, 고르는 줄은 단추(대답만 다르다).
##   목표: 금빛 기둥 + "◆ 거리" 글자, 왼쪽 미니맵 밑 추적 글자, 지도·미니맵 금빛 마름모(world_map.gd 가 target_pos() 를 읽음).
##   임무 목록: O(터치 "임무" 단추) — 장마다 단계 ✔·▶·○.
## 세이브: PartyState.story 한 필드. 임무 적·제단 불은 저장하지 않는다(불러오면 그 단계 처음부터).

const Story := preload("res://games/saga_go/data/story.gd")
const Adventure := preload("res://games/saga_go/data/adventure.gd")
const Domains := preload("res://games/saga_go/data/domains.gd")
const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")
const FieldEnemy := preload("res://games/saga_go/combat/field_enemy.gd")
const FieldBosses := preload("res://games/saga_go/world/field_bosses.gd")
const VroidBody := preload("res://games/saga_go/world/vroid_body.gd")
const TalkFace := preload("res://games/saga_go/world/talk_face.gd")
const Toast := preload("res://saga_core/ui/toast.gd")

signal step_changed(ch: int, step: int)
signal chapter_done(ch: int)

const GOLD := Color(1.0, 0.84, 0.35)
const KILL_SPREAD := 4.5
const ALTAR_REACH := 1.5

var _player: Node3D = null
var _npcs: Dictionary = {} # id → Node3D
var _npc_pos: Dictionary = {} # id → Vector3
var _quest_enemies: Array = []
var _altar: Node3D = null
var _altar_flame: Node3D = null
var _marker: Node3D = null
var _marker_label: Label3D = null
var _tracker: Label = null
var _talk_btn: Button = null
var _journal: Control = null
var _journal_label: Label = null
var _journal_open := false
var _dlg: Control = null
var _dlg_name: Label = null
var _dlg_text: Label = null
var _dlg_choices: VBoxContainer = null
var _dlg_lines: Array = []
var _dlg_i := 0
var _dlg_waiting_choice := false
var _dlg_open := false
var _dlg_done: Callable
var _dlg_npc := "" # 말 거는 임무 인물(대화 카메라가 그쪽을 잡는다, 비면 카메라 그대로)
var _frozen_before := false
var _count := 0 # gather 단계에서 캔 수(저장 안 함)
var _follow_i := 0 # follow 단계 — 다음에 걸어갈 길 점
var _follow_far := false # follow 단계 — 내가 FOLLOW_LOST 밖인가(추적 글자)
var follow_speed_mul := 1.0 # 점검이 걸음을 빠르게 돌릴 때만
## 106장 ㉙ 대화 몸짓 — 임무 인물 id → TalkFace(world/talk_face.gd), 나는 첫 대화 때 붙인다. 글자는 REVEAL_CPS 로 흘린다.
const REVEAL_CPS := 30.0
var _faces: Dictionary = {}
var _player_tf: Node = null
var _reveal := -1.0 # 흘러나온 글자 수(음수면 다 보임)
var _reveal_face: Node = null

func _ready() -> void:
	add_to_group("go_story")
	_player = get_tree().get_first_node_in_group("player")
	_ensure_actions()
	for id in Story.NPCS:
		_build_npc(id)
	_build_marker()
	_build_ui()
	var fb := get_tree().get_first_node_in_group("go_field_bosses")
	if fb:
		for bid in FieldBosses.FB.ORDER:
			var b: Node = fb.call("boss", bid)
			if b:
				b.connect("died", func(_e: Node) -> void: _on_boss_died(bid))
	var dm := get_tree().get_first_node_in_group("go_domains")
	if dm:
		dm.connect("state_changed", func(s: String) -> void:
			if s == "cleared":
				_on_domain_cleared(String(dm.get("current"))))
	var ga := get_tree().get_first_node_in_group("go_gathering")
	if ga:
		ga.connect("gathered", _on_gathered)
	var ki := get_tree().get_first_node_in_group("go_kitchen")
	if ki:
		ki.connect("cooked", func(_r: String, _q: int) -> void: _on_cooked())
	_enter_step()

func _ensure_actions() -> void:
	if not InputMap.has_action("go_domain"):
		InputMap.add_action("go_domain")
		var ev := InputEventKey.new()
		ev.physical_keycode = KEY_F
		InputMap.action_add_event("go_domain", ev)
	if not InputMap.has_action("go_journal"):
		InputMap.add_action("go_journal")
		var ej := InputEventKey.new()
		ej.physical_keycode = KEY_O
		InputMap.action_add_event("go_journal", ej)

# ---------------------------------------------------------------- 상태

func ch() -> int:
	return int(PartyState.story.get("ch", 0))

func st() -> int:
	return int(PartyState.story.get("step", 0))

func current_step() -> Dictionary:
	if locked():
		return {}
	return Story.step_of(ch(), st())

## 지금 장이 모험 등급에 막혀 있는가.
func locked() -> bool:
	var c := Story.chapter(ch())
	return not c.is_empty() and Adventure.ar() < int(c.ar)

func npc_pos(id: String) -> Vector3:
	return _npc_pos.get(id, Vector3.INF)

## 지금 목표 자리(없으면 INF) — 지도·미니맵·기둥이 쓴다.
func target_pos() -> Vector3:
	var s := current_step()
	if s.is_empty():
		return Vector3.INF
	match String(s.type):
		"talk":
			return npc_pos(String(s.npc))
		"go", "kill", "light":
			return _cell_pos(String(s.region), s.cell)
		"boss":
			var fb := get_tree().get_first_node_in_group("go_field_bosses")
			if fb and fb.call("boss", String(s.boss)):
				return FieldBosses.home_of(String(s.boss))
		"domain":
			var dm := get_tree().get_first_node_in_group("go_domains")
			if dm:
				return dm.call("gate_pos", String(s.domain))
		"follow":
			return npc_pos(String(s.npc))
		"gather":
			var ga := get_tree().get_first_node_in_group("go_gathering")
			if ga and _player:
				return ga.call("nearest", String(s.item), _player.global_position)
		"cook":
			var ki := get_tree().get_first_node_in_group("go_kitchen")
			if ki and _player:
				var best := Vector3.INF
				for p in ki.call("pots"):
					if best == Vector3.INF or _player.global_position.distance_to(p) < _player.global_position.distance_to(best):
						best = p
				return best
	return Vector3.INF

func tracker_text() -> String:
	return _tracker.text

## 지금 단계 목표 글(gather 는 센 수까지).
func step_text() -> String:
	var s := current_step()
	if s.is_empty():
		return ""
	if String(s.type) == "gather":
		return "%s %d/%d" % [s.text, _count, int(s.count)]
	if String(s.type) == "follow" and _follow_far:
		return "%s — 너무 멀다, 가까이!" % s.text
	return String(s.text)

## 그 인물이 지금 세상에 서 있는가 — appear 가 있으면 그 장의 from~to 단계에만.
func npc_visible(id: String) -> bool:
	var ap: Dictionary = Story.NPCS[id].get("appear", {})
	if ap.is_empty():
		return true
	return not locked() and ch() == int(ap.ch) and st() >= int(ap.from) and st() <= int(ap.to)

## appear 인물을 보이거나 숨기고, 따라가기를 지난 뒤면 길 끝에 세운다(불러오기·단계마다).
func _place_npcs() -> void:
	for id in _npcs:
		var info: Dictionary = Story.NPCS[id]
		if not info.has("appear"):
			continue
		var root: Node3D = _npcs[id]
		root.visible = npc_visible(id)
		var p := _cell_pos(String(info.region), info.cell)
		var c := Story.chapter(int(info.appear.ch))
		if ch() == int(info.appear.ch) and not c.is_empty():
			var steps: Array = c.steps
			for j in steps.size():
				var sj: Dictionary = steps[j]
				if String(sj.type) == "follow" and String(sj.npc) == id and st() > j:
					var path: Array = sj.path
					p = _cell_pos(String(sj.region), path[path.size() - 1])
		root.global_position = p
		_npc_pos[id] = p

## follow 단계 — 내가 가까우면 다음 길 점으로 걷고, 멀면 서서 기다린다. 길 끝이면 다음 단계.
func _follow_tick(s: Dictionary, delta: float) -> void:
	var id := String(s.npc)
	var root: Node3D = _npcs.get(id)
	if root == null:
		return
	var path: Array = s.path
	var body := root.get_node_or_null("Body") as Node3D
	var anim := body.get_node_or_null("AnimationPlayer") as AnimationPlayer if body else null
	var to_p := _player.global_position - root.global_position
	to_p.y = 0.0
	var far := to_p.length() > Story.FOLLOW_LOST
	if far != _follow_far:
		_follow_far = far
		_refresh()
	if _follow_i >= path.size():
		advance()
		return
	var walking := to_p.length() <= Story.FOLLOW_NEAR
	if walking:
		var goal := _cell_pos(String(s.region), path[_follow_i])
		var step := goal - root.global_position
		step.y = 0.0
		var move := Story.FOLLOW_SPEED * follow_speed_mul * delta
		if step.length() <= move:
			root.global_position = goal
			_follow_i += 1
		else:
			var np := root.global_position + step.normalized() * move
			np.y = _ground_y(String(s.region), np)
			root.global_position = np
			if body:
				body.rotation.y = lerp_angle(body.rotation.y, atan2(step.x, step.z), 0.2)
		_npc_pos[id] = root.global_position
	if anim:
		var want := "walk" if walking and anim.has_animation("walk") else "idle"
		if anim.current_animation != want and anim.has_animation(want):
			anim.play(want)

func follow_index() -> int:
	return _follow_i

## 걷는 인물의 발 높이 — 레이어 1 을 아래로 쏜다(다리 상판·바위 위). 나·적은 빼고, 못 맞히면 지형 높이.
func _ground_y(region: String, p: Vector3) -> float:
	var h := TerrainBuilder.height_at(region, p)
	var q := PhysicsRayQueryParameters3D.create(Vector3(p.x, h + 12.0, p.z), Vector3(p.x, h - 6.0, p.z), 1)
	var skip: Array[RID] = []
	if _player is CollisionObject3D:
		skip.append((_player as CollisionObject3D).get_rid())
	for e in get_tree().get_nodes_in_group("field_enemy"):
		if e is CollisionObject3D:
			skip.append((e as CollisionObject3D).get_rid())
	q.exclude = skip
	var hit := get_world_3d().direct_space_state.intersect_ray(q)
	return float((hit.position as Vector3).y) if not hit.is_empty() else h

func gathered_count() -> int:
	return _count

static func _cell_pos(region: String, cell: Vector2) -> Vector3:
	var p := TestMap.world_pos(cell.x, cell.y, region)
	p.y = TerrainBuilder.height_at(region, p)
	return p

# ---------------------------------------------------------------- 단계

## 단계에 들어설 때 — 임무 적·제단을 세우고 표시를 새로.
func _enter_step() -> void:
	_clear_step_objects()
	_count = 0
	_follow_i = 0
	_follow_far = false
	_place_npcs()
	var s := current_step()
	match String(s.get("type", "")):
		"kill":
			var center := _cell_pos(String(s.region), s.cell)
			var kinds: Array = s.kinds
			for i in kinds.size():
				var a := TAU * float(i) / float(kinds.size())
				var p := center + Vector3(cos(a), 0.0, sin(a)) * KILL_SPREAD
				p.y = TerrainBuilder.height_at(String(s.region), p) + 0.3
				var e: CharacterBody3D = FieldEnemy.new()
				e.name = "StoryEnemy_%d" % i
				e.setup(String(kinds[i]), p, 20260824 + 900 + i)
				e.respawns = false
				e.drops = false
				e.apply_world_level(Adventure.world_level())
				add_child(e)
				_quest_enemies.append(e)
		"light":
			_build_altar(_cell_pos(String(s.region), s.cell))
		"boss":
			## 이미 쓰러뜨려 보상 꽃을 기다리는 중이면(다시 서지 않으니) 그대로 넘긴다.
			var fb := get_tree().get_first_node_in_group("go_field_bosses")
			var b: Node = fb.call("boss", String(s.boss)) if fb else null
			if b and b.call("is_dead"):
				call_deferred("advance")
	_refresh()

func _clear_step_objects() -> void:
	for e in _quest_enemies:
		if is_instance_valid(e):
			e.queue_free()
	_quest_enemies.clear()
	if _altar:
		_altar.queue_free()
		_altar = null
		_altar_flame = null
	if is_in_group("element_receiver"):
		remove_from_group("element_receiver")

## 지금 단계를 끝내고 다음으로(장 끝이면 보상).
func advance() -> void:
	var c := Story.chapter(ch())
	if c.is_empty() or locked():
		return
	PartyState.add_exp(Story.STEP_EXP)
	var next := st() + 1
	if next >= (c.steps as Array).size():
		PartyState.add_items(c.reward)
		PartyState.add_exp(float(c.exp))
		PartyState.story = {"ch": ch() + 1, "step": 0}
		Toast.show(self, "이야기 임무 완료 — %s\n보상: %s" % [c.name, _reward_text(c.reward)], 4.0)
		CombatFeel.ui()
		chapter_done.emit(ch() - 1)
	else:
		PartyState.story = {"ch": ch(), "step": next}
		var s := current_step()
		if not s.is_empty():
			Toast.show(self, "◆ %s" % s.text, 2.5)
	step_changed.emit(ch(), st())
	_enter_step()

func _reward_text(r: Dictionary) -> String:
	var parts: Array[String] = []
	var growth := preload("res://games/saga_go/data/growth.gd")
	for item in r:
		parts.append("%s %d" % [growth.item_name(item), int(r[item])])
	return " · ".join(parts)

func _on_boss_died(bid: String) -> void:
	var s := current_step()
	if String(s.get("type", "")) == "boss" and String(s.boss) == bid:
		advance()

func _on_domain_cleared(did: String) -> void:
	var s := current_step()
	if String(s.get("type", "")) == "domain" and String(s.domain) == did:
		advance()

func _on_gathered(item: String) -> void:
	var s := current_step()
	if String(s.get("type", "")) != "gather" or String(s.item) != item:
		return
	_count += 1
	if _count >= int(s.count):
		advance()
	else:
		_refresh()

func _on_cooked() -> void:
	if String(current_step().get("type", "")) == "cook":
		advance()

## 옛 제단(element_receiver 그룹) — 어느 원소든 스킬·폭발이 닿으면 불이 붙고 다음 단계.
func receive_element(pos: Vector3, radius: float, element: String) -> void:
	if _altar == null or element == "":
		return
	var ap := _altar.global_position
	if Vector2(ap.x - pos.x, ap.z - pos.z).length() > radius + ALTAR_REACH:
		return
	_altar_flame.visible = true
	remove_from_group("element_receiver")
	var s := current_step()
	if String(s.get("type", "")) == "light":
		get_tree().create_timer(0.8).timeout.connect(advance)

func _physics_process(delta: float) -> void:
	if _player == null:
		_player = get_tree().get_first_node_in_group("player")
		return
	var s := current_step()
	var walker := String(s.npc) if String(s.get("type", "")) == "follow" else ""
	match String(s.get("type", "")):
		"follow":
			if not _dlg_open:
				_follow_tick(s, delta)
			if current_step() != s:
				return
		"go":
			var t := _cell_pos(String(s.region), s.cell)
			if Vector2(_player.global_position.x - t.x, _player.global_position.z - t.z).length() <= float(s.radius):
				advance()
				return
		"kill":
			if not _quest_enemies.is_empty() and alive_quest_enemies().is_empty():
				_quest_enemies.clear()
				advance()
				return
	var near := near_npc()
	_talk_btn.visible = near != "" and not _dlg_open and not _modal_open()
	for id in _npcs:
		var n: Node3D = _npcs[id]
		if Story.NPCS[id].has("appear"):
			n.visible = npc_visible(id) # 모험 등급이 올라 장이 풀릴 때도
		if id == walker or not n.visible:
			continue
		var to_p := _player.global_position - n.global_position
		to_p.y = 0.0
		if to_p.length() < 6.0 and to_p.length() > 0.1:
			var body := n.get_node_or_null("Body") as Node3D
			if body:
				body.rotation.y = lerp_angle(body.rotation.y, atan2(to_p.x, to_p.z), 0.15)
	_refresh_marker()

## 보이는 창이 떠 있는가(숨겨 둔 선택지 창은 그룹에 남아 있다 — camera_rig._modal_open 과 같게). 자기 자신은 뺀다.
func _modal_open() -> bool:
	for n in get_tree().get_nodes_in_group("ui_modal"):
		if n != self and n.get("visible") != false:
			return true
	return false

func alive_quest_enemies() -> Array:
	return _quest_enemies.filter(func(e: Variant) -> bool: return is_instance_valid(e) and not e.call("is_dead"))

func quest_enemies() -> Array:
	return _quest_enemies

func near_npc() -> String:
	if _player == null:
		return ""
	var s := current_step()
	for id in _npc_pos:
		## 숨은 인물·지금 앞장서 걷는 인물에겐 말을 못 건다.
		if not npc_visible(id) or (String(s.get("type", "")) == "follow" and String(s.npc) == id):
			continue
		var d: Vector3 = _player.global_position - _npc_pos[id]
		d.y = 0.0
		if d.length() <= Story.TALK_M:
			return id
	return ""

# ---------------------------------------------------------------- 입력·대화

func _unhandled_input(event: InputEvent) -> void:
	if _dlg_open:
		var next := event.is_action_pressed("go_domain") or event.is_action_pressed("jump")
		if event is InputEventKey and (event as InputEventKey).pressed and not (event as InputEventKey).echo \
				and (event as InputEventKey).keycode in [KEY_ENTER, KEY_KP_ENTER]:
			next = true
		if next:
			next_line()
			get_viewport().set_input_as_handled()
		return
	if event.is_action_pressed("go_journal"):
		toggle_journal()
		get_viewport().set_input_as_handled()
	elif _journal_open and event is InputEventKey and (event as InputEventKey).pressed and (event as InputEventKey).keycode == KEY_ESCAPE:
		toggle_journal()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("go_domain"):
		if interact():
			get_viewport().set_input_as_handled()

## 가까운 임무 인물에게 말을 건다. 말을 걸었으면 true.
func interact() -> bool:
	var id := near_npc()
	if id == "" or _dlg_open or _modal_open():
		return false
	var s := current_step()
	if String(s.get("type", "")) == "talk" and String(s.npc) == id:
		open_dialogue(s.lines, advance, id)
	else:
		var info: Dictionary = Story.NPCS[id]
		open_dialogue([[String(info.name), String(info.idle)]], Callable(), id)
	return true

func is_dialogue_open() -> bool:
	return _dlg_open

## npc_id 가 있으면 나를 그 인물 쪽으로 돌려 세우고, 줄마다 말하는 이를 카메라가 잡는다(106장 ㉗).
func open_dialogue(lines: Array, on_done: Callable, npc_id := "") -> void:
	_dlg_lines = lines
	_dlg_i = 0
	_dlg_done = on_done
	_dlg_npc = npc_id if _npc_pos.has(npc_id) else ""
	_dlg_open = true
	_dlg.visible = true
	add_to_group("ui_modal")
	_frozen_before = bool(_player.get("frozen"))
	_player.set("frozen", true)
	if _dlg_npc != "" and _player.has_method("face_toward"):
		_player.call("face_toward", _npc_pos[_dlg_npc])
	_show_line()

## 말하는 이 쪽으로 카메라 — 인물이 말하면 내 어깨 너머로 인물을, 내가 말하면 인물 어깨 너머로 나를.
func _frame_speaker(me: bool) -> void:
	if _dlg_npc == "":
		return
	var rig := _player.get_node_or_null("CameraRig")
	if rig == null or not rig.has_method("talk_shot"):
		return
	var npc: Vector3 = _npc_pos[_dlg_npc]
	var pp := _player.global_position
	if me:
		rig.call("talk_shot", pp, npc)
	else:
		rig.call("talk_shot", npc, pp)

## 지금 카메라가 잡은 말하는 이("me"·"npc"·"") — 점검용.
func speaker_side() -> String:
	if not _dlg_open or _dlg_npc == "":
		return ""
	var line: Array = _dlg_lines[_dlg_i]
	return "me" if String(line[0]) == "?" or _dlg_name.text == "나" else "npc"

## 다음 줄(고르는 줄이면 고르기 전엔 안 넘어간다). 글자가 흘러나오는 중이면 먼저 줄 전체를 한 번에 보인다(원신처럼 두 번 눌러 넘김).
func next_line() -> void:
	if not _dlg_open or _dlg_waiting_choice:
		return
	if _reveal >= 0.0:
		_finish_reveal()
		return
	_dlg_i += 1
	if _dlg_i >= _dlg_lines.size():
		_close_dialogue()
	else:
		_show_line()

## 고르는 줄에서 i 번째 대답.
func choose(i: int) -> void:
	if not _dlg_waiting_choice:
		return
	var opts: Array = _dlg_lines[_dlg_i][1]
	_dlg_waiting_choice = false
	for c in _dlg_choices.get_children():
		c.queue_free()
	_dlg_name.text = "나"
	_begin_reveal(String(opts[clampi(i, 0, opts.size() - 1)]), _player_face(), "")
	_frame_speaker(true)

func _show_line() -> void:
	var line: Array = _dlg_lines[_dlg_i]
	for c in _dlg_choices.get_children():
		c.queue_free()
	if String(line[0]) == "?":
		_dlg_waiting_choice = true
		_dlg_name.text = "나"
		_begin_reveal("", null, "")
		_dlg_text.text = "…"
		var opts: Array = line[1]
		for i in opts.size():
			var b := Button.new()
			b.text = "▸ " + String(opts[i])
			b.alignment = HORIZONTAL_ALIGNMENT_LEFT
			b.custom_minimum_size = Vector2(0, 40)
			var k: int = i
			b.pressed.connect(func() -> void: choose(k))
			_dlg_choices.add_child(b)
		_frame_speaker(true)
	else:
		_dlg_waiting_choice = false
		_dlg_name.text = String(line[0])
		var me := String(line[0]) == "나"
		_begin_reveal(String(line[1]), _player_face() if me else _faces.get(_dlg_npc), String(line[2]) if line.size() > 2 else "")
		_frame_speaker(me)

# ---------------------------------------------------------------- 대화 몸짓(106장 ㉙, world/talk_face.gd)

## 말하는 이의 몸짓을 켜고(다른 이는 끄고) 글자를 처음부터 흘린다. face 가 null 이면 몸짓 없이 글자만.
func _begin_reveal(text: String, face: Node, mood: String) -> void:
	for f in _all_faces():
		if f != face:
			f.call("set_talking", false)
			f.call("set_mood", "")
	_reveal_face = face
	_dlg_text.text = text
	if face:
		face.call("set_talking", true)
		face.call("set_mood", mood)
	if text.is_empty():
		_reveal = -1.0
		_dlg_text.visible_characters = -1
		return
	_reveal = 0.0
	_dlg_text.visible_characters = 0

## 줄 전체를 보이고 입을 닫는다(손짓은 다음 줄까지 남는다).
func _finish_reveal() -> void:
	_reveal = -1.0
	_dlg_text.visible_characters = -1
	if _reveal_face:
		_reveal_face.call("speak", "")

func is_revealing() -> bool:
	return _reveal >= 0.0

func _process(delta: float) -> void:
	if _reveal < 0.0 or not _dlg_open:
		return
	var text := _dlg_text.text
	var before := int(_reveal)
	_reveal += REVEAL_CPS * delta
	var now := mini(int(_reveal), text.length())
	if _reveal_face:
		for i in range(before, now):
			_reveal_face.call("speak", text[i])
	_dlg_text.visible_characters = now
	if now >= text.length():
		_finish_reveal()

## 그 인물(또는 "me")의 몸짓 노드 — 점검용.
func face_of(id: String) -> Node:
	return _player_face() if id == "me" else _faces.get(id)

func _player_face() -> Node:
	if _player_tf == null and _player:
		var vis := _player.get_node_or_null("Visual")
		if vis:
			_player_tf = TalkFace.attach(vis)
	return _player_tf

func _all_faces() -> Array:
	var out: Array = _faces.values()
	if _player_tf:
		out.append(_player_tf)
	return out

func _close_dialogue() -> void:
	for f in _all_faces():
		f.call("set_talking", false)
		f.call("set_mood", "")
	_reveal = -1.0
	_reveal_face = null
	_dlg_open = false
	_dlg.visible = false
	remove_from_group("ui_modal")
	_player.set("frozen", _frozen_before)
	var rig := _player.get_node_or_null("CameraRig")
	if _dlg_npc != "" and rig and rig.has_method("end_talk"):
		rig.call("end_talk")
	_dlg_npc = ""
	var cb := _dlg_done
	_dlg_done = Callable()
	if cb.is_valid():
		cb.call()

# ---------------------------------------------------------------- 표시

func _refresh() -> void:
	var c := Story.chapter(ch())
	if c.is_empty():
		_tracker.text = ""
	elif locked():
		_tracker.text = "◆ %s\n   모험 등급 %d 에 열린다" % [c.name, int(c.ar)]
	else:
		_tracker.text = "◆ %s\n   %s" % [c.name, step_text()]
	_refresh_journal()
	_refresh_marker()

func _refresh_marker() -> void:
	var t := target_pos()
	_marker.visible = t != Vector3.INF
	if not _marker.visible:
		return
	_marker.global_position = t
	var d := 0
	if _player:
		d = roundi(Vector2(_player.global_position.x - t.x, _player.global_position.z - t.z).length())
	_marker_label.text = "◆ %dm" % d
	var c := Story.chapter(ch())
	if not c.is_empty() and not locked():
		var lines := _tracker.text.split("\n")
		if lines.size() >= 2:
			_tracker.text = "%s\n   %s  %dm" % [lines[0], step_text(), d]

func toggle_journal() -> void:
	if not _journal_open and _modal_open():
		return
	_journal_open = not _journal_open
	_journal.visible = _journal_open
	if _journal_open:
		add_to_group("ui_modal")
		_refresh_journal()
	else:
		remove_from_group("ui_modal")

func is_journal_open() -> bool:
	return _journal_open

func journal_text() -> String:
	return _journal_label.text

func _refresh_journal() -> void:
	if _journal_label == null:
		return
	var out: Array[String] = ["이야기 임무"]
	for i in Story.CHAPTERS.size():
		var c: Dictionary = Story.CHAPTERS[i]
		var mark := "✔" if i < ch() else ("▶" if i == ch() else "○")
		var tail := ""
		if i == ch() and locked():
			tail = "  (모험 등급 %d 에 열림)" % int(c.ar)
		out.append("\n%s %s%s" % [mark, c.name, tail])
		if i == ch() and not locked():
			var steps: Array = c.steps
			for j in steps.size():
				var sm := "✔" if j < st() else ("▶" if j == st() else "·")
				out.append("    %s %s" % [sm, steps[j].text])
	_journal_label.text = "\n".join(out)

# ---------------------------------------------------------------- 모양

func _build_npc(id: String) -> void:
	var info: Dictionary = Story.NPCS[id]
	var p := _cell_pos(String(info.region), info.cell)
	var root := Node3D.new()
	root.name = "StoryNpc_" + id
	add_child(root)
	root.global_position = p
	var body := VroidBody.build("story_" + id, int(info.rarity), info.cloth)
	body.name = "Body"
	root.add_child(body)
	var anim := body.get_node_or_null("AnimationPlayer") as AnimationPlayer
	if anim and anim.has_animation("idle"):
		anim.play("idle")
	if info.get("mask", false):
		_add_mask(body)
	var tf := TalkFace.attach(body)
	if tf:
		_faces[id] = tf
	var label := Label3D.new()
	label.text = String(info.name)
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.font_size = 34
	label.outline_size = 8
	label.pixel_size = 0.005
	label.modulate = Color(1.0, 0.95, 0.8)
	label.position = Vector3(0.0, 2.1, 0.0)
	root.add_child(label)
	_npcs[id] = root
	_npc_pos[id] = p

## 흰 가면 — 머리 뼈에 붙인다(뼈를 못 찾으면 몸 앞 얼굴 높이). 눈구멍 둘·붉은 줄 하나.
func _add_mask(body: Node3D) -> void:
	var mask := Node3D.new()
	mask.name = "Mask"
	var skel := body.find_children("*", "Skeleton3D", true, false)
	var head := -1
	if not skel.is_empty():
		head = (skel[0] as Skeleton3D).find_bone("J_Bip_C_Head")
	if head >= 0:
		var att := BoneAttachment3D.new()
		att.bone_idx = head
		skel[0].add_child(att)
		att.add_child(mask)
		## 뼈대 공간 앞이 -Z 인 몸(saga_forest_avatar_01)이면 가면도 뒤집어 얼굴 쪽에.
		var front := VroidBody.front_sign(skel[0])
		mask.position = Vector3(0.0, 0.07, 0.085 * front)
		mask.rotation.y = 0.0 if front > 0.0 else PI
	else:
		body.add_child(mask)
		mask.position = Vector3(0.0, 1.52, 0.1)
	var face := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.1
	sm.height = 0.24
	face.mesh = sm
	face.scale = Vector3(1.0, 1.0, 0.35)
	var white := StandardMaterial3D.new()
	white.albedo_color = Color(0.94, 0.92, 0.86)
	white.roughness = 0.6
	face.material_override = white
	mask.add_child(face)
	var dark := StandardMaterial3D.new()
	dark.albedo_color = Color(0.06, 0.05, 0.06)
	var red := StandardMaterial3D.new()
	red.albedo_color = Color(0.72, 0.12, 0.12)
	for i in 3:
		var dot := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(0.035, 0.014, 0.01) if i < 2 else Vector3(0.012, 0.12, 0.01)
		dot.mesh = bm
		dot.material_override = dark if i < 2 else red
		dot.position = Vector3(-0.04 + 0.08 * i, 0.03, 0.036) if i < 2 else Vector3(0.0, -0.01, 0.037)
		mask.add_child(dot)

func has_mask(id: String) -> bool:
	var root: Node3D = _npcs.get(id)
	return root != null and not root.find_children("Mask", "Node3D", true, false).is_empty()

func _build_marker() -> void:
	_marker = Node3D.new()
	_marker.name = "StoryMarker"
	add_child(_marker)
	var beam := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.18
	cm.bottom_radius = 0.35
	cm.height = 40.0
	beam.mesh = cm
	var bm := StandardMaterial3D.new()
	bm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	bm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	bm.albedo_color = Color(GOLD.r, GOLD.g, GOLD.b, 0.28)
	bm.cull_mode = BaseMaterial3D.CULL_DISABLED
	beam.material_override = bm
	beam.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	beam.position = Vector3(0.0, 20.0, 0.0)
	_marker.add_child(beam)
	_marker_label = Label3D.new()
	_marker_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	_marker_label.no_depth_test = true
	_marker_label.fixed_size = true
	_marker_label.pixel_size = 0.0022
	_marker_label.font_size = 30
	_marker_label.outline_size = 8
	_marker_label.modulate = GOLD
	_marker_label.position = Vector3(0.0, 3.2, 0.0)
	_marker.add_child(_marker_label)

## 옛 제단 — 돌 받침 + 붙으면 켜지는 불꽃. 붙기 전까지 element_receiver.
func _build_altar(p: Vector3) -> void:
	_altar = Node3D.new()
	_altar.name = "StoryAltar"
	add_child(_altar)
	_altar.global_position = p
	var stone := StandardMaterial3D.new()
	stone.albedo_color = Color(0.52, 0.5, 0.47)
	for i in 2:
		var mi := MeshInstance3D.new()
		var c := CylinderMesh.new()
		c.top_radius = 0.7 - i * 0.25
		c.bottom_radius = 0.85 - i * 0.25
		c.height = 0.5
		mi.mesh = c
		mi.material_override = stone
		mi.position = Vector3(0.0, 0.25 + i * 0.5, 0.0)
		_altar.add_child(mi)
	_altar_flame = MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.3
	sm.height = 0.8
	(_altar_flame as MeshInstance3D).mesh = sm
	var fm := StandardMaterial3D.new()
	fm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	fm.albedo_color = Color(1.0, 0.7, 0.3)
	(_altar_flame as MeshInstance3D).material_override = fm
	_altar_flame.position = Vector3(0.0, 1.4, 0.0)
	_altar_flame.visible = false
	_altar.add_child(_altar_flame)
	add_to_group("element_receiver")

func _build_ui() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 5
	add_child(layer)
	## 추적 글자 — 미니맵·왼쪽 위 글자들 밑(world_map 이 옮긴 날씨 줄 아래).
	_tracker = Label.new()
	_tracker.offset_left = 40
	_tracker.offset_top = 455
	_tracker.add_theme_font_size_override("font_size", 17)
	_tracker.add_theme_color_override("font_color", GOLD)
	_tracker.add_theme_color_override("font_outline_color", Color(0, 0, 0))
	_tracker.add_theme_constant_override("outline_size", 6)
	_tracker.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(_tracker)
	_talk_btn = Button.new()
	_talk_btn.text = "대화 (F)"
	_talk_btn.anchor_left = 0.5
	_talk_btn.anchor_right = 0.5
	_talk_btn.anchor_top = 1.0
	_talk_btn.anchor_bottom = 1.0
	_talk_btn.offset_left = -70
	_talk_btn.offset_right = 70
	_talk_btn.offset_top = -170
	_talk_btn.offset_bottom = -124
	_talk_btn.visible = false
	_talk_btn.pressed.connect(func() -> void: interact())
	layer.add_child(_talk_btn)
	var jb := Button.new()
	jb.text = "임무 (O)"
	jb.position = Vector2(540, 20)
	jb.custom_minimum_size = Vector2(96, 40)
	jb.pressed.connect(toggle_journal)
	layer.add_child(jb)
	## 임무 목록.
	var jl := CanvasLayer.new()
	jl.layer = 6
	add_child(jl)
	_journal = Control.new()
	_journal.set_anchors_preset(Control.PRESET_FULL_RECT)
	_journal.visible = false
	jl.add_child(_journal)
	var dim := ColorRect.new()
	dim.color = Color(0.05, 0.05, 0.1, 0.82)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	_journal.add_child(dim)
	_journal_label = Label.new()
	_journal_label.position = Vector2(120, 80)
	_journal_label.add_theme_font_size_override("font_size", 18)
	_journal.add_child(_journal_label)
	var close := Button.new()
	close.text = "닫기 (Esc)"
	close.position = Vector2(120, 30)
	close.custom_minimum_size = Vector2(120, 40)
	close.pressed.connect(toggle_journal)
	_journal.add_child(close)
	## 대화 창 — 아래 가운데. 창을 누르면 다음 줄.
	var dl := CanvasLayer.new()
	dl.layer = 7
	add_child(dl)
	_dlg = Control.new()
	_dlg.anchor_left = 0.5
	_dlg.anchor_right = 0.5
	_dlg.anchor_top = 1.0
	_dlg.anchor_bottom = 1.0
	_dlg.offset_left = -380
	_dlg.offset_right = 380
	_dlg.offset_top = -250
	_dlg.offset_bottom = -40
	_dlg.visible = false
	dl.add_child(_dlg)
	var bg := Button.new()
	bg.flat = false
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.modulate = Color(1, 1, 1, 0.92)
	bg.pressed.connect(next_line)
	_dlg.add_child(bg)
	_dlg_name = Label.new()
	_dlg_name.position = Vector2(24, 14)
	_dlg_name.add_theme_font_size_override("font_size", 20)
	_dlg_name.add_theme_color_override("font_color", GOLD)
	_dlg_name.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_dlg.add_child(_dlg_name)
	_dlg_text = Label.new()
	_dlg_text.position = Vector2(24, 48)
	_dlg_text.size = Vector2(712, 70)
	_dlg_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_dlg_text.add_theme_font_size_override("font_size", 18)
	_dlg_text.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_dlg.add_child(_dlg_text)
	_dlg_choices = VBoxContainer.new()
	_dlg_choices.position = Vector2(420, 96)
	_dlg_choices.custom_minimum_size = Vector2(320, 0)
	_dlg.add_child(_dlg_choices)
	var hint := Label.new()
	hint.text = "F · Space · 누르기 ▶"
	hint.position = Vector2(24, 176)
	hint.add_theme_font_size_override("font_size", 13)
	hint.modulate = Color(1, 1, 1, 0.6)
	hint.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_dlg.add_child(hint)
