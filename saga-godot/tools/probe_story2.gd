extends Node
## GO 이야기 2부(PLAN 106장 ㊺-2~) 자동 점검 — 평소엔 안 붙는다. 1부(1~9장)는 probe_story.gd.
## test_village.gd 가 SAGA_STORY2_PROBE 가 있을 때만 단다.
##
##   SAGA_STORY2_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/world/TestVillage.tscn
##
## 10장 "서리 고개 너머": [1] 표·인물 자리(명소 충돌에 안 묻힘·따라가는 길이 걸어서 이어짐) [2] 촌장 → 고개 목표(고원)
## [3] 고개 [4] 고원 신상 [5] 호수 무리 넷(고원에 섬) [6] 하람 → 따라가기 [7] 따라가기 끝 = 길 끝 [8] 반디(하람은 비행선 곁)
## [9] 산성 터(하람도 산성으로) [10] 하람 → 10장 끝·보상·✔ 제10장·하람은 관측소로.
## 이야기 상태·부대 경험·가방은 끝에 되돌린다. 저장은 안 한다.

const Story := preload("res://games/saga_go/data/story.gd")
const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")

const CH := 9 # 10장(0부터)

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
		0: # 준비 — 10장 처음, 모험 등급 31
			_saved = {"story": PartyState.story.duplicate(true), "members": PartyState.members.duplicate(), "exp": PartyState.exp, "level": PartyState.level,
				"bag": PartyState.bag.duplicate(true), "ar_paid": PartyState.ar_paid, "resolved": EventState.resolved.duplicate(), "pos": _p.global_position, "wq": PartyState.world_quests.duplicate(true)}
			## 레벨은 경험에서 다시 셈해지므로(단계 경험이 붙을 때) 경험으로 올린다.
			PartyState.exp = maxf(PartyState.exp, 30.0 * PartyState.EXP_PER_LEVEL)
			PartyState.level = maxi(PartyState.level, 30)
			PartyState.ar_paid = maxi(PartyState.ar_paid, PartyState.level + 1)
			PartyState.story = {"ch": CH, "step": 0}
			_sq.call("set_track", "") # 실제 세이브가 세계 임무를 따라가는 중이면 이야기로
			_sq.call("_enter_step")
			_next()
		1: # [1] 표·인물 자리
			var c := Story.chapter(CH)
			var bad: Array = []
			if String(c.get("id", "")) != "ch10" or int(c.ar) <= int(Story.chapter(CH - 1).ar):
				bad.append("chapter")
			for id in ["haram", "bandi"]:
				var info: Dictionary = Story.NPCS[id]
				if String(info.region) != "frost" or not info.has("era"):
					bad.append(id + " info")
				var hits := _hits(_sq.call("npc_pos", id))
				if not hits.is_empty():
					bad.append("%s in %s" % [id, hits])
			## 따라가는 길 — 칸이 산이 아니고, 점과 점 사이를 걸어서 갈 수 있다(1m 마다 턱 0.5m 이하·막힘 없음).
			var path: Array = (c.steps as Array)[5].path
			for i in range(path.size() - 1):
				var a := TestMap.world_pos(path[i].x, path[i].y, "frost")
				var b := TestMap.world_pos(path[i + 1].x, path[i + 1].y, "frost")
				var why := _walk_block(a, b)
				if why != "":
					bad.append("path %d: %s" % [i, why])
			## 무리·산성 목표 자리도 산이 아니다.
			for si in [1, 2, 3, 7]:
				var s: Dictionary = (c.steps as Array)[si]
				if TestMap.tile_at(roundi(s.cell.x), roundi(s.cell.y), "frost") == "^":
					bad.append("step %d on mountain" % si)
			_check("ch10_table", bad.is_empty(), str(bad))
			_next()
		2: # [2] 촌장 → 고개
			_talk("elder", 1, "ch10_elder", Vector2(4.0, 7.4))
		3: # [3] 고개
			_go(2, "ch10_pass", Vector2(5.0, 4.5))
		4: # [4] 고원 신상
			_go(3, "ch10_statue", Vector2(3.7, 2.45))
		5: # [5] 호수 무리 넷
			if _frame == 1:
				_put(_target() + Vector3(0, 0, 6))
			if _frame == 10:
				var es: Array = _sq.call("alive_quest_enemies")
				var in_frost := es.filter(func(e: Node) -> bool: return TestMap.region_at((e as Node3D).global_position) == "frost").size()
				_v = {"n": es.size(), "frost": in_frost}
				for e in es:
					e.call("_die")
			if _frame == 16:
				_check("ch10_kill", int(_v.n) == 4 and int(_v.frost) == 4 and int(_sq.call("st")) == 4, "n=%d frost=%d st=%d" % [_v.n, _v.frost, _sq.call("st")])
				_next()
		6: # [6] 하람 → 따라가기
			_talk("haram", 5, "ch10_haram", Vector2.INF)
		7: # [7] 따라가기 끝
			var w: Vector3 = _sq.call("npc_pos", "haram")
			if _frame == 1:
				_sq.set("follow_speed_mul", 20.0)
			if int(_sq.call("st")) == 5 and _frame < 1500:
				_put(w + Vector3(0.0, 0.0, 3.0))
				return
			_sq.set("follow_speed_mul", 1.0)
			var path: Array = (Story.chapter(CH).steps as Array)[5].path
			var end := TestMap.world_pos(path[path.size() - 1].x, path[path.size() - 1].y, "frost")
			_check("ch10_follow", int(_sq.call("st")) == 6 and _flat(w, end) < 1.0, "st=%d frames=%d to_end=%.1f" % [_sq.call("st"), _frame, _flat(w, end)])
			_next()
		8: # [8] 반디 — 하람은 비행선 곁
			if _frame == 1:
				_v = _flat(_sq.call("npc_pos", "haram"), TestMap.world_pos(5.85, 4.85, "frost"))
			_talk("bandi", 7, "ch10_bandi", Vector2(3.0, 4.3), "haram_at_ship=%.1f" % float(_v), float(_v) < 1.0)
		9: # [9] 산성 터 — 하람도 산성으로
			if _frame == 1:
				_put(_target())
			if _frame == 12:
				var h := _flat(_sq.call("npc_pos", "haram"), TestMap.world_pos(3.25, 4.5, "frost"))
				_check("ch10_fort", int(_sq.call("st")) == 8 and h < 1.0 and _hits(_sq.call("npc_pos", "haram")).is_empty(), "st=%d haram_at_fort=%.1f" % [_sq.call("st"), h])
				_next()
		10: # [10] 하람 → 10장 끝
			if _frame == 1:
				_v = {"mora": PartyState.count("mora")}
				_near_npc("haram")
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
			var home := _flat(_sq.call("npc_pos", "haram"), TestMap.world_pos(3.85, 1.7, "frost"))
			var ok: bool = int(_sq.call("ch")) == CH + 1 and jt.contains("✔ 제10장") and PartyState.count("mora") >= int(_v.mora) + 40000 and home < 1.0
			_check("chapter10", ok, "ch=%d mora +%d haram_home=%.1f tracker='%s'" % [_sq.call("ch"), PartyState.count("mora") - int(_v.mora), home, _sq.call("tracker_text")])
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
			print("STORY2_PROBE_DONE fails=%d" % _fails)
			get_tree().quit()

## 대화 단계 — 곁에 가서 F·끝까지 넘기면 다음 단계가 want_st, 목표가 next_cell(고원, INF 면 안 봄).
func _talk(npc: String, want_st: int, name: String, next_cell: Vector2, extra := "", extra_ok := true) -> void:
	if _frame == 2:
		_near_npc(npc)
	if _frame == 10:
		_sq.call("interact")
		_drain()
	if _frame == 14:
		var tgt_ok := next_cell == Vector2.INF or _flat(_target(), TestMap.world_pos(next_cell.x, next_cell.y, "frost")) < 0.5
		_check(name, int(_sq.call("st")) == want_st and tgt_ok and extra_ok, "st=%d target=%s %s" % [_sq.call("st"), _target(), extra])
		_next()

## 가기 단계 — 목표에 서면 넘어가고 다음 목표가 next_cell.
func _go(want_st: int, name: String, next_cell: Vector2) -> void:
	if _frame == 1:
		_put(_target())
	if _frame == 12:
		_check(name, int(_sq.call("st")) == want_st and _flat(_target(), TestMap.world_pos(next_cell.x, next_cell.y, "frost")) < 0.5, "st=%d" % _sq.call("st"))
		_next()

func _target() -> Vector3:
	return _sq.call("target_pos")

## 그 자리 1.2m 위에 걸리는 고원 명소 충돌(지형·나무 빼고).
func _hits(pos: Vector3) -> Array:
	var fr := get_tree().get_first_node_in_group("go_frost_region")
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
		if c is Node and fr and fr.is_ancestor_of(c as Node) and not String((c as Node).get_parent().name).begins_with("Frost"):
			out.append(String((c as Node).get_parent().name))
	return out

## a → b 를 1m 씩 — 턱이 0.5m 를 넘거나 몸(캡슐)이 막히면 까닭.
func _walk_block(a: Vector3, b: Vector3) -> String:
	var steps := maxi(int(a.distance_to(b)), 1)
	var prev := _surface(a)
	for k in range(1, steps + 1):
		var p0 := a.lerp(b, float(k - 1) / steps)
		var p1 := a.lerp(b, float(k) / steps)
		var h := _surface(p1)
		if absf(h - prev) > 0.5:
			return "step %.2f at (%.0f,%.0f)" % [h - prev, p1.x, p1.z]
		var q := PhysicsShapeQueryParameters3D.new()
		var cap := CapsuleShape3D.new()
		cap.radius = 0.35
		cap.height = 1.2
		q.shape = cap
		q.collision_mask = 1 | TerrainBuilder.BORDER_LAYER
		var excl: Array[RID] = [_p.get_rid()]
		for e in get_tree().get_nodes_in_group("field_enemy"):
			if e is CollisionObject3D:
				excl.append((e as CollisionObject3D).get_rid())
		q.exclude = excl
		q.transform = Transform3D(Basis(), Vector3(p0.x, maxf(prev, h) + 0.95, p0.z))
		q.motion = Vector3(p1.x - p0.x, 0, p1.z - p0.z)
		var r := _p.get_world_3d().direct_space_state.cast_motion(q)
		if r.size() > 0 and float(r[0]) < 1.0:
			return "blocked at (%.0f,%.0f)" % [p1.x, p1.z]
		prev = h
	return ""

func _surface(p: Vector3) -> float:
	var q := PhysicsRayQueryParameters3D.create(Vector3(p.x, 80.0, p.z), Vector3(p.x, -20.0, p.z), 1)
	q.exclude = [_p.get_rid()]
	var hit := _p.get_world_3d().direct_space_state.intersect_ray(q)
	return (hit.position as Vector3).y if not hit.is_empty() else TerrainBuilder.height_at("frost", p)

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
	print("STORY2_PROBE %s %s %s" % [name, "ok" if ok else "FAIL", detail])

func _next() -> void:
	_step += 1
	_frame = 0
