extends Node
## GO 일일 의뢰(106장 ⑲) 자동 점검 — 평소엔 안 붙는다. test_village.gd 가 SAGA_COMMISSION_PROBE 가 있을 때만 단다.
##
##   SAGA_COMMISSION_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/world/TestVillage.tscn
##
## ① 날짜 고정(번호 20000) → 넷·종류 안 겹침·같은 날 같은 넷·다음 날 다른 넷 ② 토벌(늑대 셋 → 완료·보상)
## ③ 채집(박하 셋) ④ 요리(두 번) ⑤ 둘러보기(폭포 12m 안) ⑥ 게시판 — 멀면 안 받고 곁이면 추가 보상·목표판 "의뢰 4/4"
## ⑦ 원소 괴물 토벌(늑대는 안 셈) ⑧ 원소 반응(실제 증발 한 번 + 신호) ⑨ 날이 바뀌면 새로 굴림 ⑩ JSON 저장 모양 그대로 읽힘.
## 저장은 안 한다. 날짜는 Commissions.time_offset 으로 붙들고 끝에 되돌린다.

const Commissions := preload("res://games/saga_go/data/commissions.gd")
const CommissionsNode := preload("res://games/saga_go/world/commissions.gd")
const DAY := 20000

var _p: CharacterBody3D
var _cm: Node
var _frame := 0
var _step := 0
var _fails := 0
var _v: Variant = null

func _ready() -> void:
	Weather.force("clear")
	_p = get_tree().get_first_node_in_group("player")

func _physics_process(_delta: float) -> void:
	_frame += 1
	if _cm == null:
		_cm = get_tree().get_first_node_in_group("go_commissions")
		return
	match _step:
		0: # ① 굴리기
			Commissions.time_offset += float(DAY - Commissions.today()) * 86400.0
			PartyState.commissions = {}
			var rolled: bool = _cm.call("ensure_today")
			var ids: Array = []
			var kinds := {}
			for e in _cm.call("entries"):
				ids.append(e.id)
				kinds[Commissions.POOL[e.id].kind] = int(kinds.get(Commissions.POOL[e.id].kind, 0)) + 1
			var max_same := 0
			for k in kinds:
				max_same = maxi(max_same, int(kinds[k]))
			var ok: bool = rolled and Commissions.today() == DAY and ids.size() == 4 and max_same == 1 \
				and Commissions.roll(DAY) == Commissions.roll(DAY) and Commissions.roll(DAY) != Commissions.roll(DAY + 1) \
				and not bool(_cm.call("ensure_today"))
			_check("roll", ok, "ids=%s kinds=%s" % [ids, kinds])
			_set_list(["k_wolf", "g_mint", "c_cook", "v_fall"])
			_next()
		1: # ② 토벌
			var b0 := PartyState.count("book_s")
			var ar0 := PartyState.ar_paid # 106장 ㉒ — 의뢰 보상 부대 경험으로 모험 등급이 오르면 그 보상(짧은 견문록 3)도 든다
			var wolves := _enemies("wolf")
			for i in 3:
				wolves[i].call("_die")
			var e: Dictionary = _entry("k_wolf")
			_check("kill", e.done and int(e.p) == 3 and PartyState.count("book_s") == b0 + 2 + 3 * (PartyState.ar_paid - ar0) and int(_cm.call("done_count")) == 1,
				"p=%d done=%s book %d→%d" % [e.p, e.done, b0, PartyState.count("book_s")])
			_next()
		2: # ③ 채집
			var ga := get_tree().get_first_node_in_group("go_gathering")
			for k in 3:
				ga.call("pick", "v_mint_w_%d" % k)
			var e: Dictionary = _entry("g_mint")
			_check("gather", e.done and int(e.p) == 3, "p=%d" % e.p)
			_next()
		3: # ④ 요리
			var ki := get_tree().get_first_node_in_group("go_kitchen")
			PartyState.add_items({"honey_flower": 4, "apple": 2})
			ki.call("cook", "honey_cake", 1)
			var half: int = _entry("c_cook").p
			ki.call("cook", "honey_cake", 2)
			var e: Dictionary = _entry("c_cook")
			_check("cook", half == 1 and e.done, "half=%d done=%s" % [half, e.done])
			_next()
		4: # ⑤ 둘러보기
			if _frame == 1:
				_stand(CommissionsNode.visit_pos("v_fall") + Vector3(3.0, 0.0, 0.0))
			if _frame == 40:
				var e: Dictionary = _entry("v_fall")
				_check("visit", e.done and bool(_cm.call("all_done")), "done=%s all=%s" % [e.done, _cm.call("all_done")])
				_next()
		5: # ⑥ 게시판 — 폭포에선 못 받고 곁에서 받는다
			if _frame == 1:
				_v = [bool(_cm.call("bonus_claimed")), PartyState.count("book_m"), PartyState.count("polish")]
				_stand(_cm.get("board_pos") + Vector3(0.0, 0.0, 2.0))
			if _frame == 40:
				var board := get_tree().get_first_node_in_group("goal_board")
				var btext: String = board.get("text") if board else ""
				var ok: bool = not bool(_v[0]) and bool(_cm.call("bonus_claimed")) and PartyState.count("book_m") == int(_v[1]) + 1 \
					and PartyState.count("polish") == int(_v[2]) + 2 and btext.contains("의뢰 4/4") and not btext.contains("게시판 보상") \
					and String(_cm.call("panel_text")).contains("4/4")
				_check("bonus", ok, "claimed=%s book_m %d→%d board='%s'" % [_cm.call("bonus_claimed"), _v[1], PartyState.count("book_m"), btext.replace("\n", " | ")])
				_next()
		6: # ⑦ 원소 괴물 토벌 — 늑대는 안 센다
			_set_list(["k_elem", "r_react", "g_clam", "v_cave"])
			_enemies("wolf")[0].call("_die")
			var after_wolf: int = _entry("k_elem").p
			for e in _enemies("thunder_cat").slice(0, 2):
				e.call("_die")
			_check("kill_elemental", after_wolf == 0 and int(_entry("k_elem").p) == 2, "wolf=%d cats=%d" % [after_wolf, _entry("k_elem").p])
			_next()
		7: # ⑧ 원소 반응 — 실제 증발 한 번(물 붙은 늑대에 화) + 신호 다섯
			var fc := get_tree().get_first_node_in_group("go_field_combat")
			var target: Node = null
			for w in _enemies("wolf"):
				if not w.call("is_dead"):
					target = w
					break
			target.call("set_aura", "water")
			fc.call("_deal", target, 1.0, "fire", Vector3.FORWARD)
			var real: int = _entry("r_react").p
			for i in 5:
				fc.emit_signal("reacted", "vaporize")
			_check("react", real == 1 and _entry("r_react").done, "real=%d last=%s" % [real, fc.get("last_reaction")])
			_next()
		8: # ⑨ 날이 바뀜
			Commissions.time_offset += 86400.0
			var rolled: bool = _cm.call("ensure_today")
			var zero := true
			for e in _cm.call("entries"):
				zero = zero and int(e.p) == 0 and not e.done
			_check("next_day", rolled and int(PartyState.commissions.day) == DAY + 1 and not bool(_cm.call("bonus_claimed")) and zero \
				and int(_cm.call("done_count")) == 0, "day=%d" % PartyState.commissions.day)
			_next()
		9: # ⑩ 저장 모양(JSON — 수가 float 로 돌아온다)
			_entry_any().p = 1
			var back: Variant = JSON.parse_string(JSON.stringify(PartyState.commissions))
			PartyState.commissions = (back as Dictionary).duplicate(true)
			var same_day := not bool(_cm.call("ensure_today"))
			_check("json", same_day and (_cm.call("entries") as Array).size() == 4 and int(_cm.call("entries")[0].p) == 1,
				"same_day=%s" % same_day)
			Commissions.time_offset = 0.0
			_next()
		10:
			print("COMMISSION_PROBE_DONE fails=%d" % _fails)
			get_tree().quit()

func _set_list(ids: Array) -> void:
	var list: Array = []
	for id in ids:
		list.append({"id": id, "p": 0, "done": false})
	PartyState.commissions = {"day": Commissions.today(), "list": list, "bonus": false}

func _entry(id: String) -> Dictionary:
	for e in _cm.call("entries"):
		if e.id == id:
			return e
	return {"p": -1, "done": false}

func _entry_any() -> Dictionary:
	return _cm.call("entries")[0]

func _enemies(kind: String) -> Array:
	var out: Array = []
	for e in get_tree().get_nodes_in_group("field_enemy"):
		if e.get("kind") == kind:
			out.append(e)
	return out

func _stand(at: Vector3) -> void:
	_p.global_position = at + Vector3.UP * 0.5
	_p.velocity = Vector3.ZERO

func _check(name: String, ok: bool, detail: String) -> void:
	if not ok:
		_fails += 1
	print("COMMISSION_PROBE %s %s %s" % [name, "ok" if ok else "FAIL", detail])

func _next() -> void:
	_step += 1
	_frame = 0
