extends Node
## GO 이야기 3부(PLAN 106장 ㊼, 13장~) 자동 점검 — 평소엔 안 붙는다. 1부는 probe_story.gd · 2부는 probe_story2.gd.
## test_village.gd 가 SAGA_STORY3_PROBE 가 있을 때만 단다.
##
##   SAGA_STORY3_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/world/TestVillage.tscn
##
## 13장 "녹슨 조선소의 날개"(㊼-1): [1] 표·자리(다온·반디가 조선소 몸에 안 묻힘·목표 칸이 바다·산이 아님·기중기 들보 윗면 높이·
## 다리 바깥면이 들보 끝면과 같은 면·도감 발견 자리) [2] 반디 → 조선소 목표(포구) [3] 조선소 [4] 다온 → 무리 [5] 무리 넷(포구에 섬)
## [6] 다온 → 기중기 [7] 오르기(땅에 서면 안 넘어감·들보 위에 서면 넘어감) [8] 반디(조선소에 날아와 있음) → 용접대
## [9] 지키기(바다 쪽 북쪽에서 안 나옴·물결 셋·"용접대") [10] 다온 → 13장 끝·보상·✔ 제13장·반디는 비행선으로.
## 이야기 상태·부대 경험·가방은 끝에 되돌린다. 저장은 안 한다.

const Story := preload("res://games/saga_go/data/story.gd")
const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")
const EraSites := preload("res://games/saga_go/world/era_sites.gd")

const CH13 := 12 # 13장(0부터)

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
		0: # 준비 — 13장 처음, 모험 등급 33
			_saved = {"story": PartyState.story.duplicate(true), "members": PartyState.members.duplicate(), "exp": PartyState.exp, "level": PartyState.level,
				"bag": PartyState.bag.duplicate(true), "ar_paid": PartyState.ar_paid, "resolved": EventState.resolved.duplicate(), "pos": _p.global_position, "wq": PartyState.world_quests.duplicate(true)}
			PartyState.exp = maxf(PartyState.exp, 33.0 * PartyState.EXP_PER_LEVEL)
			PartyState.level = maxi(PartyState.level, 33)
			PartyState.ar_paid = maxi(PartyState.ar_paid, PartyState.level + 1)
			PartyState.story = {"ch": CH13, "step": 0}
			_sq.call("set_track", "")
			_sq.call("_enter_step")
			_next()
		1: # [1] 표·자리
			var c := Story.chapter(CH13)
			var bad: Array = []
			if String(c.get("id", "")) != "ch13" or int(c.ar) <= int(Story.chapter(CH13 - 1).ar):
				bad.append("chapter")
			var info: Dictionary = Story.NPCS.daon
			if String(info.region) != "coast" or not info.has("era"):
				bad.append("daon info")
			var h := _hits(_sq.call("npc_pos", "daon"))
			if not h.is_empty():
				bad.append("daon in %s" % h)
			var bw: Dictionary = Story.windows(Story.STATIONS.bandi).filter(func(w: Dictionary) -> bool: return int(w.ch) == CH13)[0]
			var bh := _hits(_cell3(bw.cell))
			if not bh.is_empty():
				bad.append("bandi in %s" % bh)
			for s in c.steps:
				if s.has("cell") and ["~", "^"].has(TestMap.tile_at(roundi(s.cell.x), roundi(s.cell.y), String(s.region))):
					bad.append("step on %s" % TestMap.tile_at(roundi(s.cell.x), roundi(s.cell.y), String(s.region)))
			## 들보 윗면 — 위에서 쏜 빛줄이 기중기 윗면(땅 + CRANE_TOP)에 닿는다. climb above 와 같다.
			var top := EraSites.crane_top()
			var ground := top.y - EraSites.CRANE_TOP
			var surf := _surface(top)
			if absf(surf - top.y) > 0.15:
				bad.append("crane top %.2f want %.2f" % [surf, top.y])
			var climb: Dictionary = (c.steps as Array)[5]
			if absf(float(climb.get("above", 0.0)) - (EraSites.CRANE_TOP + Story.CLIMB_SLACK - 0.5)) > 0.01:
				bad.append("above")
			## 다리 바깥면 = 들보 끝면 — 들보 끝 바로 밖(0.3m)에서 내려쏜 빛줄은 땅에 닿는다(튀어나온 들보 밑에 막히지 않는다).
			for side in [-1.0, 1.0]:
				var out := top + Vector3(side * (EraSites.CRANE_HALF + 0.3), 0, 0)
				if _surface(out) > ground + 1.0:
					bad.append("overhang %s" % side)
			if not get_tree().get_first_node_in_group("go_era_sites").find_child("Discover_coast_shipyard", true, false):
				bad.append("discovery")
			_check("ch13_table", bad.is_empty(), str(bad))
			_next()
		2: # [2] 반디 → 조선소
			_talk("bandi", 1, "ch13_bandi", Vector2(7.1, 4.25))
		3: # [3] 조선소
			_go(2, "ch13_shipyard", Vector2.INF)
		4: # [4] 다온 → 무리
			_talk("daon", 3, "ch13_daon", Vector2(7.0, 4.45))
		5: # [5] 무리 넷
			if _frame == 1:
				_put(_target() + Vector3(0, 0, 6))
			if _frame == 10:
				var es: Array = _sq.call("alive_quest_enemies")
				var here := es.filter(func(e: Node) -> bool: return TestMap.region_at((e as Node3D).global_position) == "coast").size()
				_v = {"n": es.size(), "coast": here}
				for e in es:
					e.call("_die")
			if _frame == 16:
				_check("ch13_kill", int(_v.n) == 4 and int(_v.coast) == 4 and int(_sq.call("st")) == 4, "n=%d coast=%d st=%d" % [_v.n, _v.coast, _sq.call("st")])
				_next()
		6: # [6] 다온 → 기중기
			_talk("daon", 5, "ch13_daon2", Vector2(7.3, 3.81))
		7: # [7] 오르기 — 땅에선 안 넘어가고, 동쪽 다리 바깥면을 실제로 타고 올라 들보 위에 서면 넘어간다
			var top := EraSites.crane_top()
			if _frame == 1:
				_put(_cell3(Vector2(7.3, 4.1)))
			if _frame == 12:
				_v = {"ground_st": int(_sq.call("st")), "grab": false}
				_p.set("stamina", 999.0)
				_put(Vector3(top.x + EraSites.CRANE_HALF + 1.5, top.y - EraSites.CRANE_TOP, top.z))
			if _frame >= 12:
				## 입력은 카메라 받침 전역 방향 기준(player.gd _world_direction) — 몸이 돌아 있어도 북쪽을 보게(왼쪽 = -x).
				var rig := get_tree().get_first_node_in_group("camera_rig") as Node3D
				if rig:
					rig.global_rotation = Vector3(rig.global_rotation.x, 0.0, 0.0)
			if _frame == 30:
				Input.action_press("move_left")
			if _frame > 30 and not bool(_v.grab) and _p.mode == _p.Mode.CLIMB:
				_v.grab = true # 붙는 순간 위로(옆으로 계속 밀면 폭 1.2m 다리 끝으로 미끄러져 떨어진다)
				Input.action_release("move_left")
				Input.action_press("move_forward")
			if _frame > 30 and int(_sq.call("st")) == 6 and not _v.has("at"):
				_v.at = _frame # 넘어간 때 — 들보 위로 다 올라서서(땅 걷기로 돌아와) 멈출 때까지 조금 더 민다
			var settled: bool = _v is Dictionary and _v.has("at") and ((_p.mode == _p.Mode.GROUND and _p.is_on_floor()) or _frame > int(_v.at) + 240)
			if _frame > 30 and (settled or _frame > 1500):
				Input.action_release("move_forward")
				_check("ch13_climb", int(_v.ground_st) == 5 and bool(_v.grab) and int(_sq.call("st")) == 6 and _p.global_position.y >= top.y - 0.6 and _p.mode == _p.Mode.GROUND,
					"ground_st=%d grab=%s st=%d y=%.1f top=%.1f mode=%d frames=%d/%d" % [_v.ground_st, _v.grab, _sq.call("st"), _p.global_position.y, top.y, _p.mode, _v.get("at", -1), _frame])
				_next()
		8: # [8] 반디(조선소) → 용접대
			if _frame == 1:
				_put(_cell3(Vector2(7.0, 4.3)))
			if _frame == 2:
				_v = _flat(_sq.call("npc_pos", "bandi"), TestMap.world_pos(7.05, 4.02, "coast"))
			if _frame < 3:
				return
			_talk("bandi", 7, "ch13_bandi2", Vector2(7.3, 4.3), "bandi_at_yard=%.1f" % float(_v), float(_v) < 1.0, 1)
		9: # [9] 지키기 — 바다(북쪽)에서 안 나옴, 물결 셋
			if _frame == 1:
				_put(_target() + Vector3(2.5, 0.0, 2.5))
				_v = {"sea": false, "waves": 0, "label": ""}
			if _frame > 4 and _frame % 6 == 0 and int(_sq.call("st")) == 7:
				var lbl := _sq.get("_defend_label") as Label3D
				if lbl and String(_v.label) == "":
					_v.label = lbl.text
				for e in _sq.call("alive_quest_enemies"):
					var ep := (e as Node3D).global_position
					if TestMap.tile_at(TestMap.grid_at("coast", ep).x, TestMap.grid_at("coast", ep).y, "coast") == "~":
						_v.sea = true
					e.call("_die")
				_v.waves = maxi(int(_v.waves), int(_sq.call("defend_wave")) + 1)
			if _frame > 4 and (int(_sq.call("st")) != 7 or _frame > 600):
				var ok: bool = int(_sq.call("st")) == 8 and not bool(_v.sea) and int(_v.waves) == 3 and String(_v.label).begins_with("용접대")
				_check("ch13_defend", ok, "st=%d sea=%s waves=%d label='%s' frames=%d" % [_sq.call("st"), _v.sea, _v.waves, _v.label, _frame])
				_next()
		10: # [10] 다온 → 13장 끝
			if _frame == 1:
				_v = {"mora": PartyState.count("mora")}
				_near_npc("daon")
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
			var bandi_home := _flat(_sq.call("npc_pos", "bandi"), TestMap.world_pos(6.0, 4.8, "frost"))
			var ok: bool = int(_sq.call("ch")) == CH13 + 1 and jt.contains("✔ 제13장") and PartyState.count("mora") >= int(_v.mora) + 55000 and bandi_home < 1.0
			_check("chapter13", ok, "ch=%d mora +%d bandi_home=%.1f" % [_sq.call("ch"), PartyState.count("mora") - int(_v.mora), bandi_home])
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
			print("STORY3_PROBE_DONE fails=%d" % _fails)
			get_tree().quit()

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
	return String(Story.step_of(CH13, st).get("region", "coast"))

func _target() -> Vector3:
	return _sq.call("target_pos")

func _cell3(cell: Vector2) -> Vector3:
	var p := TestMap.world_pos(cell.x, cell.y, "coast")
	p.y = TerrainBuilder.height_at("coast", p)
	return p

## 그 자리 1.2m 위에 걸리는 3부 명소 충돌.
func _hits(pos: Vector3) -> Array:
	var es := get_tree().get_first_node_in_group("go_era_sites")
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
		if c is Node and es and es.is_ancestor_of(c as Node):
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
	print("STORY3_PROBE %s %s %s" % [name, "ok" if ok else "FAIL", detail])

func _next() -> void:
	_step += 1
	_frame = 0
