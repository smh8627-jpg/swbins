extends Node
## GO 특성 레벨·운명의 자리(106장 ⑫) 자동 점검 — 평소엔 안 붙는다. test_village.gd 가 SAGA_TALENT_PROBE 가 있을 때만 단다.
##
##   SAGA_TALENT_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/world/TestVillage.tscn
##
## ① 표(상한 계단·배율·비용) ② 돌파 0 이면 특성 상한 1 — 재료가 있어도 못 올림 ③ 돌파 2 → 스킬 1→2, 재료 차감, 상한 2 에서 멈춤
## ④ 기본 공격 특성이 실제 한 방 바탕(_normal_atk)에 곱해짐 ⑤ 매듭 없으면 못 엶 → 1 자리: 스킬 쿨 6→4.8
## ⑥ 3 자리 스킬 +3 · 4 자리 체력 ×1.2 · 5 자리 폭발 +3 ⑦ 6 자리: 폭발 뒤 10초 공격 ×1.25
## ⑧ restore — 특성·자리 그대로, 옛(⑫ 이전) 칸은 특성 1·자리 0 ⑨ 원소 괴물·상자에서 무예 쪽지 ⑩ 인물 화면 "올리기"·"열기" 단추.
## 저장 파일은 안 건드린다(성장·가방은 끝에 처음 값으로 되돌린다).

const Growth := preload("res://games/saga_go/data/growth.gd")

var _p: Node
var _fc: Node
var _frame := 0
var _step := 0
var _fails := 0
var _growth0: Dictionary = {}
var _bag0: Dictionary = {}
var _target: Node = null
var _n0 := 0

func _ready() -> void:
	Weather.force("clear")
	_p = get_tree().get_first_node_in_group("player")

func _physics_process(_delta: float) -> void:
	_frame += 1
	if _fc == null:
		_fc = get_tree().get_first_node_in_group("go_field_combat")
		_growth0 = PartyState.growth.duplicate(true)
		_bag0 = PartyState.bag.duplicate(true)
		return
	match _step:
		0: # ① 표
			var c := Growth.talent_cost("self", 1)
			var ok: bool = Growth.talent_cap(0) == 1 and Growth.talent_cap(1) == 1 and Growth.talent_cap(2) == 2 and Growth.talent_cap(6) == 10 \
				and is_equal_approx(Growth.talent_mul(10), 1.8) and is_equal_approx(Growth.talent_mul(13), 2.125) \
				and c.get("mora") == 2500 and c.get("talent_1") == 3 and c.get("wolf_fang") == 3 and Growth.talent_cost("self", 10).is_empty()
			_check("tables", ok, "cost1=%s" % [c])
			_next()
		1: # ② 돌파 0 — 특성 상한 1
			PartyState.growth["self"] = {"lv": 20, "exp": 0.0, "asc": 0}
			PartyState.bag.clear()
			PartyState.add_items({"mora": 100000, "talent_1": 10, "talent_2": 20, "wolf_fang": 50})
			var blocked := not PartyState.talent_up("self", "skill")
			_check("cap_gate", blocked and PartyState.talent_cap("self") == 1 and PartyState.talent_level("self", "skill") == 1, "")
			_next()
		2: # ③ 돌파 2 → 스킬 1→2, 그다음 상한 2 에서 멈춤
			PartyState.growth["self"]["asc"] = 2
			var mora0 := PartyState.count("mora")
			var up := PartyState.talent_up("self", "skill")
			var paid := PartyState.count("mora") == mora0 - 2500 and PartyState.count("talent_1") == 7 and PartyState.count("wolf_fang") == 47
			var stop := not PartyState.talent_up("self", "skill")
			_check("talent_up", up and paid and stop and PartyState.talent_level("self", "skill") == 2 \
				and is_equal_approx(PartyState.talent_mul("self", "skill"), 1.075),
				"up=%s paid=%s stop=%s lv=%d" % [up, paid, stop, PartyState.talent_level("self", "skill")])
			_next()
		3: # ④ 기본 공격 특성이 한 방 바탕에 곱해짐
			_fc.set("active", 0)
			var base: float = _fc.call("_normal_atk")
			PartyState.growth["self"]["tn"] = 10
			var high: float = _fc.call("_normal_atk")
			PartyState.growth["self"]["tn"] = 1
			_check("normal_scale", is_equal_approx(high, base * 1.8) and is_equal_approx(base, float(_fc.call("char_atk", "self"))),
				"base=%.1f high=%.1f" % [base, high])
			_next()
		4: # ⑤ 운명의 자리 1 — 스킬 쿨 -20%
			var blocked := not PartyState.unlock_constellation("self")
			var cd0: float = _fc.call("skill_cd_of", "self")
			PartyState.add_items({"fate_knot": 6})
			var ok := PartyState.unlock_constellation("self")
			var cd1: float = _fc.call("skill_cd_of", "self")
			_check("con1_cd", blocked and ok and PartyState.constellation("self") == 1 and PartyState.count("fate_knot") == 5 \
				and is_equal_approx(cd0, 6.0) and is_equal_approx(cd1, 4.8), "cd %.2f→%.2f" % [cd0, cd1])
			_next()
		5: # ⑥ 3 자리 스킬 +3 · 4 자리 체력 ×1.2 · 5 자리 폭발 +3
			PartyState.unlock_constellation("self")
			PartyState.unlock_constellation("self")
			var skill_eff := PartyState.talent_effective("self", "skill")
			var burst3 := PartyState.talent_effective("self", "burst")
			var hp3: float = _fc.call("max_hp_of", "self")
			PartyState.unlock_constellation("self")
			var hp4: float = _fc.call("max_hp_of", "self")
			PartyState.unlock_constellation("self")
			var burst5 := PartyState.talent_effective("self", "burst")
			_check("con3_5", skill_eff == 5 and burst3 == 1 and is_equal_approx(hp4, hp3 * 1.2) and burst5 == 4 \
				and PartyState.talent_level("self", "burst") == 1 and PartyState.constellation("self") == 5,
				"skill=%d burst %d→%d hp %.1f→%.1f" % [skill_eff, burst3, burst5, hp3, hp4])
			_next()
		6: # ⑦ 6 자리 — 폭발 뒤 10초 공격 ×1.25
			if _frame == 1:
				PartyState.unlock_constellation("self")
				_n0 = 0
				_fc.set("energy", 100.0)
				var atk0: float = _fc.call("char_atk", "self")
				var fired: bool = _fc.call("burst")
				var atk1: float = _fc.call("char_atk", "self")
				var left: float = (_fc.get("_c6_left") as Dictionary).get("self", 0.0)
				_check("con6_buff", fired and PartyState.constellation("self") == 6 and is_equal_approx(atk1, atk0 * 1.25) and left > 9.9 \
					and not PartyState.can_unlock_constellation("self"),
					"fired=%s atk %.1f→%.1f left=%.2f" % [fired, atk0, atk1, left])
				(_fc.get("_c6_left") as Dictionary).clear()
				_next()
		7: # ⑧ restore
			var g := PartyState.growth.duplicate(true)
			g["old_hero"] = {"lv": 5, "exp": 0.0, "asc": 0}
			var b := PartyState.bag.duplicate(true)
			var members: Array[String] = PartyState.members.duplicate()
			var perks: Array[String] = PartyState.perks.duplicate()
			PartyState.restore(members, PartyState.exp, perks, g, b)
			_check("restore", PartyState.talent_level("self", "skill") == 2 and PartyState.constellation("self") == 6 \
				and PartyState.talent_level("old_hero", "burst") == 1 and PartyState.constellation("old_hero") == 0, "")
			PartyState.growth.erase("old_hero")
			_next()
		8: # ⑨ 원소 괴물·상자에서 무예 쪽지
			if _frame == 1:
				_target = _enemy_kind("fire_imp")
				_n0 = PartyState.count("talent_1")
				if _target:
					_hp_kill(_target)
			if _frame == 5:
				var killed := _target != null and bool(_target.call("is_dead")) and PartyState.count("talent_1") == _n0 + 1
				var loot_ok: bool = Growth.CHEST_LOOT.common.get("talent_1") == 1 and Growth.CHEST_LOOT.luxurious.get("fate_knot") == 2
				_check("drops", killed and loot_ok, "target=%s talent_1 %d→%d" % [_target != null, _n0, PartyState.count("talent_1")])
				_next()
		9: # ⑩ 인물 화면 단추
			PartyState.growth["self"] = {"lv": 20, "exp": 0.0, "asc": 2}
			PartyState.add_items({"mora": 10000, "talent_1": 3, "wolf_fang": 3, "fate_knot": 1})
			var cs := get_tree().get_first_node_in_group("go_character_screen")
			cs.call("open_screen")
			cs.call("select", "self")
			var tb: Button = (cs.get("_talent_buttons") as Dictionary)["burst"]
			var tb_on := not tb.disabled
			tb.emit_signal("pressed")
			var cb: Button = cs.get("_con_button")
			var cb_on := not cb.disabled
			cb.emit_signal("pressed")
			var text_ok := String(cs.get("_con_label").text).contains("◆ 1.")
			cs.call("close_screen")
			_check("screen", tb_on and cb_on and PartyState.talent_level("self", "burst") == 2 and PartyState.constellation("self") == 1 and text_ok,
				"tb_on=%s cb_on=%s burst=%d con=%d text=%s" % [tb_on, cb_on, PartyState.talent_level("self", "burst"), PartyState.constellation("self"), text_ok])
			PartyState.growth = _growth0
			PartyState.bag = _bag0
			_next()
		10:
			print("TALENT_PROBE_DONE fails=%d" % _fails)
			get_tree().quit()

func _hp_kill(e: Node) -> void:
	e.set("shield", 0.0)
	e.call("apply_damage", 99999.0, false, Vector3.FORWARD)

func _enemy_kind(kind: String) -> Node:
	for e in get_tree().get_nodes_in_group("field_enemy"):
		if e.get("kind") == kind and not e.call("is_dead"):
			return e
	return null

func _check(name: String, ok: bool, detail: String) -> void:
	if not ok:
		_fails += 1
	print("TALENT_PROBE %s %s %s" % [name, "ok" if ok else "FAIL", detail])

func _next() -> void:
	_step += 1
	_frame = 0
