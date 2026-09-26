extends Node
## GO 이야기 4부(PLAN 106장 ㊽, 16장~) 자동 점검 — 평소엔 안 붙는다. 1부 probe_story · 2부 probe_story2 · 3부 probe_story3.
## test_village.gd 가 SAGA_STORY4_PROBE 가 있을 때만 단다.
##
##   SAGA_STORY4_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/world/TestVillage.tscn
##
## 16장 "별배가 돌아온 나루"(㊽-2): [1] 표·자리(아라 빛 고리·명소 몸에 안 묻힘·계류 탑 윗면 높이·climb above·반디 자리·
## 틈 문 열림·별배는 아직 고원에) [2] 반디(고원) → 틈 고개 [3] 틈 고개 [4] 아라 → 무리 [5] 무리 넷(나루에 섬) [6] 아라 → 계류 탑
## [7] 오르기(땅에선 안 넘어감·탑 옆면을 실제로 타고 올라 꼭대기에 섬) → 별배가 나루에 매이고 고원 별배는 사라짐
## [8] 반디(나루) → 계류대 [9] 지키기(동쪽 탑 쪽에서 안 나옴·산에서 안 나옴·물결 셋·"계류된 별배") [10] 아라 → 16장 끝·보상·✔ 제16장.
## 이야기 상태·부대 경험·가방은 끝에 되돌린다. 저장은 안 한다.

const Story := preload("res://games/saga_go/data/story.gd")
const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")
const Skyport := preload("res://games/saga_go/world/region5_skyport.gd")

const CH16 := 15 # 16장(0부터)
const R := "skyport"
const MAST_OFF := Vector3(12.0, 0.0, 0.0) # region5_skyport _build_port 계류 탑 자리(착륙판 가운데에서)
const MAST_H := 18.0

var _p: CharacterBody3D
var _sq: Node
var _frame := 0
var _step := 0
var _fails := 0
var _v: Variant = null
var _saved := {}

func _ready() -> void:
	Weather.force("clear")
	_p = get_tree().get_first_node_in_group("player") as CharacterBody3D

func _physics_process(_delta: float) -> void:
	_frame += 1
	if _sq == null:
		_sq = get_tree().get_first_node_in_group("go_story")
		_frame = 0
		return
	if _frame < 3 and _step == 0:
		return
	match _step:
		0: # 준비 — 16장 처음, 모험 등급 39
			_saved = {"story": PartyState.story.duplicate(true), "members": PartyState.members.duplicate(), "exp": PartyState.exp, "level": PartyState.level,
				"bag": PartyState.bag.duplicate(true), "ar_paid": PartyState.ar_paid, "resolved": EventState.resolved.duplicate(), "pos": _p.global_position, "wq": PartyState.world_quests.duplicate(true)}
			PartyState.exp = maxf(PartyState.exp, 39.0 * PartyState.EXP_PER_LEVEL)
			PartyState.level = maxi(PartyState.level, 39)
			PartyState.ar_paid = maxi(PartyState.ar_paid, PartyState.level + 1)
			PartyState.story = {"ch": CH16, "step": 0}
			_sq.call("set_track", "")
			_sq.call("_enter_step")
			_next()
		1: # [1] 표·자리
			if _frame < 70: # 문·별배는 1초마다 본다
				return
			var c := Story.chapter(CH16)
			var bad: Array = []
			if String(c.get("id", "")) != "ch16" or int(c.ar) <= int(Story.chapter(CH16 - 1).ar) or int(_sq.call("ch")) != CH16 or bool(_sq.call("locked")):
				bad.append("chapter ch=%d locked=%s" % [_sq.call("ch"), _sq.call("locked")])
			var info: Dictionary = Story.NPCS.ara
			if String(info.region) != R or String(info.get("era", "")) != "미래" or not bool(info.get("halo", false)):
				bad.append("ara info")
			var ah := _hits(_sq.call("npc_pos", "ara"))
			if not ah.is_empty():
				bad.append("ara in %s" % ah)
			var abody := get_tree().get_first_node_in_group("go_story").find_child("StoryNpc_ara", true, false)
			if abody == null or abody.find_child("Halo", true, false) == null:
				bad.append("halo")
			for s in c.steps:
				if s.has("cell") and ["~", "^"].has(TestMap.tile_at(roundi(s.cell.x), roundi(s.cell.y), String(s.region))):
					bad.append("step on %s" % TestMap.tile_at(roundi(s.cell.x), roundi(s.cell.y), String(s.region)))
			## 계류 탑 윗면 — 위에서 쏜 빛줄이 탑 윗면(땅 + MAST_H)에 닿는다. climb 칸이 탑 자리, above 가 윗면 + 2.
			var mast := _mast()
			if absf(_surface(mast) - (mast.y + MAST_H)) > 0.15:
				bad.append("mast top %.2f want %.2f" % [_surface(mast), mast.y + MAST_H])
			var climb: Dictionary = (c.steps as Array)[5]
			var cp := TestMap.world_pos(climb.cell.x, climb.cell.y, R)
			if String(climb.type) != "climb" or absf(float(climb.above) - (MAST_H + Story.CLIMB_SLACK - 0.5)) > 0.01 or _flat(cp, mast) > 0.5:
				bad.append("climb")
			var bw: Dictionary = Story.windows(Story.STATIONS.bandi).filter(func(w: Dictionary) -> bool: return int(w.ch) == CH16)[0]
			if String(bw.region) != R or not _hits(_cell3(bw.cell)).is_empty():
				bad.append("bandi station")
			var sk := get_tree().get_first_node_in_group("go_skyport_region")
			var fr := get_tree().get_first_node_in_group("go_frost_region")
			if not bool(sk.call("is_gate_open")) or bool(sk.call("is_docked")) or bool(fr.call("ship_away")):
				bad.append("gate=%s docked=%s away=%s" % [sk.call("is_gate_open"), sk.call("is_docked"), fr.call("ship_away")])
			_check("ch16_table", bad.is_empty(), str(bad))
			_next()
		2: # [2] 반디(고원) → 틈 고개
			_talk("bandi", 1, "ch16_bandi", Vector2(7.4, 3.0))
		3: # [3] 틈 고개
			_go(2, "ch16_pass", Vector2.INF)
		4: # [4] 아라 → 무리
			_talk("ara", 3, "ch16_ara", Vector2(5.3, 1.75))
		5: # [5] 무리 넷
			if _frame == 1:
				_put(_target() + Vector3(0, 0, 6))
			if _frame == 10:
				var es: Array = _sq.call("alive_quest_enemies")
				var here := es.filter(func(e: Node) -> bool: return TestMap.region_at((e as Node3D).global_position) == R).size()
				_v = {"n": es.size(), "here": here}
				for e in es:
					e.call("_die")
			if _frame == 16:
				_check("ch16_kill", int(_v.n) == 4 and int(_v.here) == 4 and int(_sq.call("st")) == 4, "n=%d here=%d st=%d" % [_v.n, _v.here, _sq.call("st")])
				_next()
		6: # [6] 아라 → 계류 탑
			_talk("ara", 5, "ch16_ara2", Vector2(5.55, 1.6))
		7: # [7] 오르기 — 땅에선 안 넘어가고, 탑 동쪽 옆면을 실제로 타고 올라 꼭대기에 서면 넘어간다 → 별배가 나루에 매인다
			var mast := _mast()
			if _frame == 1:
				_put(mast + Vector3(4.0, 0.0, 2.0))
			if _frame == 12:
				_v = {"ground_st": int(_sq.call("st")), "grab": false}
				_p.set("stamina", 999.0)
				_put(mast + Vector3(0.6 + 1.5, 0.0, 0.0))
			if _frame >= 12:
				var rig := get_tree().get_first_node_in_group("camera_rig") as Node3D
				if rig:
					rig.global_rotation = Vector3(rig.global_rotation.x, 0.0, 0.0)
			if _frame == 30:
				Input.action_press("move_left")
			if _frame > 30 and not bool(_v.grab) and _p.mode == _p.Mode.CLIMB:
				_v.grab = true
				Input.action_release("move_left")
				Input.action_press("move_forward")
			if _frame > 30 and int(_sq.call("st")) == 6 and not _v.has("at"):
				_v.at = _frame
			var settled: bool = _v is Dictionary and _v.has("at") and ((_p.mode == _p.Mode.GROUND and _p.is_on_floor()) or _frame > int(_v.at) + 240)
			if _frame > 30 and (settled or _frame > 1500):
				Input.action_release("move_forward")
				if not _v.has("stood"):
					_v.stood = {"y": _p.global_position.y, "mode": _p.mode, "st": int(_sq.call("st"))}
					_v.stood_at = _frame
				if _frame < int(_v.stood_at) + 70: # 매인 별배는 1초마다 본다
					return
				var sk := get_tree().get_first_node_in_group("go_skyport_region")
				var fr := get_tree().get_first_node_in_group("go_frost_region")
				var st: Dictionary = _v.stood
				var ok: bool = int(_v.ground_st) == 5 and bool(_v.grab) and int(st.st) == 6 and float(st.y) >= mast.y + MAST_H - 0.6 and int(st.mode) == _p.Mode.GROUND \
					and bool(sk.call("is_docked")) and bool(fr.call("ship_away"))
				_check("ch16_climb", ok, "ground_st=%d grab=%s st=%d y=%.1f top=%.1f mode=%d docked=%s away=%s" % [_v.ground_st, _v.grab, st.st, st.y, mast.y + MAST_H, st.mode,
					sk.call("is_docked"), fr.call("ship_away")])
				_next()
		8: # [8] 반디(나루) → 계류대
			if _frame == 1:
				_put(_cell3(Vector2(5.3, 1.9)))
			if _frame == 2:
				_v = _flat(_sq.call("npc_pos", "bandi"), TestMap.world_pos(5.44, 1.8, R))
			if _frame < 3:
				return
			_talk("bandi", 7, "ch16_bandi2", Vector2(5.3, 1.75), "bandi_at_port=%.1f" % float(_v), float(_v) < 1.0, 1)
		9: # [9] 지키기 — 동쪽(탑)·산에서 안 나옴, 물결 셋
			if _frame == 1:
				_put(_target() + Vector3(2.5, 0.0, 2.5))
				_v = {"east": false, "mtn": false, "waves": 0, "label": ""}
			if _frame > 4 and _frame % 6 == 0 and int(_sq.call("st")) == 7:
				var lbl := _sq.get("_defend_label") as Label3D
				if lbl and String(_v.label) == "":
					_v.label = lbl.text
				var altar := _target()
				for e in _sq.call("alive_quest_enemies"):
					var ep := (e as Node3D).global_position
					var g := TestMap.grid_at(R, ep)
					if TestMap.tile_at(g.x, g.y, R) == "^":
						_v.mtn = true
					var d := Vector2(ep.x - altar.x, ep.z - altar.z)
					if d.length() > 8.0 and absf(d.angle_to(Vector2(1, 0))) < deg_to_rad(20.0):
						_v.east = true
					e.call("_die")
				_v.waves = maxi(int(_v.waves), int(_sq.call("defend_wave")) + 1)
			if _frame > 4 and (int(_sq.call("st")) != 7 or _frame > 600):
				var ok: bool = int(_sq.call("st")) == 8 and not bool(_v.east) and not bool(_v.mtn) and int(_v.waves) == 3 and String(_v.label).begins_with("계류된 별배")
				_check("ch16_defend", ok, "st=%d east=%s mtn=%s waves=%d label='%s' frames=%d" % [_sq.call("st"), _v.east, _v.mtn, _v.waves, _v.label, _frame])
				_next()
		10: # [10] 아라 → 16장 끝
			if _frame == 1:
				_v = {"mora": PartyState.count("mora")}
				_near_npc("ara")
			if _frame == 10:
				_sq.call("interact")
				_drain()
			if _frame < 16:
				return
			_dismiss_prompts()
			if _frame < 22:
				return
			_sq.call("toggle_journal")
			var jt: String = _sq.call("journal_text")
			_sq.call("toggle_journal")
			var sk := get_tree().get_first_node_in_group("go_skyport_region")
			var ok: bool = int(_sq.call("ch")) == CH16 + 1 and jt.contains("✔ 제16장") and PartyState.count("mora") >= int(_v.mora) + 75000 and Skyport.ship_docked()
			_check("chapter16", ok, "ch=%d mora +%d docked=%s" % [_sq.call("ch"), PartyState.count("mora") - int(_v.mora), sk.call("is_docked")])
			_next()
		11:
			PartyState.story = _saved.story
			PartyState.members.assign(_saved.members)
			PartyState.exp = _saved.exp
			PartyState.level = _saved.level
			PartyState.bag = _saved.bag
			PartyState.ar_paid = _saved.ar_paid
			EventState.resolved.assign(_saved.resolved)
			PartyState.world_quests = _saved.wq
			_p.global_position = _saved.pos
			print("STORY4_PROBE_DONE fails=%d" % _fails)
			get_tree().quit()

func _mast() -> Vector3:
	return Skyport.cell_pos(Skyport.PORT_CELL) + MAST_OFF

## 대화 단계 — 곁에 가서 F·끝까지 넘기면 다음 단계가 want_st, 목표가 next_cell(목표 단계 지역, INF 면 안 봄).
func _talk(npc: String, want_st: int, name: String, next_cell: Vector2, extra := "", extra_ok := true, from := 0) -> void:
	if _frame == 2 + from * 2:
		_near_npc(npc)
	if _frame == 10 + from * 2:
		_sq.call("interact")
		_drain()
	if _frame == 14 + from * 2:
		var tgt_ok := next_cell == Vector2.INF or _flat(_target(), TestMap.world_pos(next_cell.x, next_cell.y, _step_region(want_st))) < 0.5
		_check(name, int(_sq.call("st")) == want_st and tgt_ok and extra_ok, "st=%d target=%s %s" % [_sq.call("st"), _target(), extra])
		_next()

func _go(want_st: int, name: String, next_cell: Vector2) -> void:
	if _frame == 1:
		_put(_target())
	if _frame == 12:
		var tgt_ok := next_cell == Vector2.INF or _flat(_target(), TestMap.world_pos(next_cell.x, next_cell.y, _step_region(want_st))) < 0.5
		_check(name, int(_sq.call("st")) == want_st and tgt_ok, "st=%d" % _sq.call("st"))
		_next()

func _step_region(st: int) -> String:
	return String(Story.step_of(int(_sq.call("ch")), st).get("region", R))

func _target() -> Vector3:
	return _sq.call("target_pos")

func _cell3(cell: Vector2) -> Vector3:
	var p := TestMap.world_pos(cell.x, cell.y, R)
	p.y = TerrainBuilder.height_at(R, p)
	return p

## 그 자리 1.2m 위에 걸리는 은하 나루 명소 충돌(지형은 뺀다).
func _hits(pos: Vector3) -> Array:
	var sk := get_tree().get_first_node_in_group("go_skyport_region")
	var q := PhysicsShapeQueryParameters3D.new()
	var sph := SphereShape3D.new()
	sph.radius = 0.6
	q.shape = sph
	q.collision_mask = 1
	q.exclude = [_p.get_rid()]
	q.transform = Transform3D(Basis(), pos + Vector3(0, 1.2, 0))
	var out: Array = []
	for hit in _p.get_world_3d().direct_space_state.intersect_shape(q, 4):
		var c: Object = hit.collider
		if c is Node and sk and sk.is_ancestor_of(c as Node) and not String((c as Node).get_parent().name).begins_with("Skyport"):
			out.append(String((c as Node).get_parent().name))
	return out

func _surface(p: Vector3) -> float:
	var q := PhysicsRayQueryParameters3D.create(Vector3(p.x, 80.0, p.z), Vector3(p.x, -20.0, p.z), 1)
	q.exclude = [_p.get_rid()]
	var hit := _p.get_world_3d().direct_space_state.intersect_ray(q)
	return (hit.position as Vector3).y if not hit.is_empty() else -99.0

var _pressed: Array = []

func _dismiss_prompts() -> void:
	for n in get_tree().get_nodes_in_group("ui_modal"):
		if n == _sq or n.get("visible") == false or _pressed.has(n):
			continue
		_pressed.append(n)
		var btns := (n as Node).find_children("*", "Button", true, false)
		if not btns.is_empty():
			(btns[0] as Button).pressed.emit()

func _drain() -> int:
	var choices := 0
	var guard := 0
	while _sq.call("is_dialogue_open") and guard < 50:
		guard += 1
		if _sq.get("_dlg_waiting_choice"):
			_sq.call("choose", 0)
			choices += 1
		else:
			_sq.call("next_line")
	return choices

func _flat(a: Vector3, b: Vector3) -> float:
	return Vector2(a.x - b.x, a.z - b.z).length()

func _near_npc(id: String) -> void:
	_dismiss_prompts()
	_put(_sq.call("npc_pos", id) + Vector3(0.0, 0.3, 1.5))

func _put(pos: Vector3) -> void:
	_p.global_position = pos + Vector3(0.0, 0.3, 0.0)
	_p.velocity = Vector3.ZERO

func _check(name: String, ok: bool, detail: String) -> void:
	if not ok:
		_fails += 1
	print("STORY4_PROBE %s %s %s" % [name, "ok" if ok else "FAIL", detail])

func _next() -> void:
	_step += 1
	_frame = 0
