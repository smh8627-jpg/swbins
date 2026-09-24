extends Node
## GO 인물 육성(106장 ⑩) 자동 점검 — 평소엔 안 붙는다. test_village.gd 가 SAGA_GROWTH_PROBE 가 있을 때만 단다.
##
##   SAGA_GROWTH_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/world/TestVillage.tscn
##
## ① 계단(상한 20·40…90)·경험표 ② 견문록 → 레벨·냥 차감 ③ 상한에서 멈춤(남는 경험 버림)
## ④ 재료 없으면 돌파 못 함 → 재료 있으면 돌파·재료 차감·상한 40 ⑤ 레벨이 오르면 들판 공격·체력이 오름
## ⑥ 들판 적을 쓰러뜨리면 냥·전리품 ⑦ 보물 상자에서 견문록·냥 ⑧ v2 세이브 → v3(부대 레벨로 인물 레벨 채움)
## ⑨ restore 로 성장·가방이 그대로 돌아옴 ⑩ 인물 화면 열기(ui_modal·frozen)·"한 레벨 올리기" 단추.
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
		0: # ① 계단·경험표
			var ok := Growth.cap_of(0) == 20 and Growth.cap_of(1) == 40 and Growth.cap_of(6) == 90 \
				and Growth.exp_to_next(1) == 406 and Growth.exp_to_next(19) == 2566
			_check("tables", ok, "")
			_next()
		1: # ② 짧은 견문록 3권 → 1000×3 경험, 냥 600
			PartyState.growth.erase("self")
			PartyState.bag.clear()
			PartyState.add_items({"book_s": 3, "mora": 10000})
			var up := PartyState.use_book("self", "book_s", 3)
			var g := PartyState.growth_of("self")
			## 406+424+454=1284 → 2단, 남는 1716 → 454(3→4)… 계산: 1→2 406, 2→3 424, 3→4 454, 4→5 496, 5→6 550(누적 2330), 6→7 616(2946)
			_check("use_book", PartyState.char_level("self") == 7 and up == 6 and PartyState.count("mora") == 9400 and PartyState.count("book_s") == 0,
				"lv=%d up=%d exp=%.0f mora=%d" % [PartyState.char_level("self"), up, float(g.exp), PartyState.count("mora")])
			_next()
		2: # ③ 상한 20 에서 멈춤
			PartyState.add_items({"book_l": 3, "mora": 20000})
			PartyState.use_book("self", "book_l", 3)
			var g := PartyState.growth_of("self")
			var left_books := PartyState.count("book_l")
			_check("cap_stop", PartyState.char_level("self") == 20 and float(g.exp) == 0.0 and left_books >= 1 and PartyState.use_book("self", "book_l", 1) == -1,
				"lv=%d exp=%.0f books_left=%d" % [PartyState.char_level("self"), float(g.exp), left_books])
			_next()
		3: # ④ 돌파
			var blocked := not PartyState.ascend("self")
			var cost := Growth.ascend_cost("self", 0)
			PartyState.add_items(cost)
			var mora0 := PartyState.count("mora")
			var ok := PartyState.ascend("self")
			var crystal_left := PartyState.count(Growth.crystal_of("self"))
			_check("ascend", blocked and ok and PartyState.char_asc("self") == 1 and PartyState.char_cap("self") == 40 \
				and PartyState.count("mora") == mora0 - int(cost.mora) and crystal_left == 0,
				"blocked=%s ok=%s asc=%d cap=%d cost=%s" % [blocked, ok, PartyState.char_asc("self"), PartyState.char_cap("self"), cost])
			_next()
		4: # ⑤ 레벨이 오르면 들판 공격·체력이 오른다
			var atk20: float = _fc.call("char_atk", "self")
			var hp20: float = _fc.call("max_hp_of", "self")
			PartyState.growth["self"] = {"lv": 1, "exp": 0.0, "asc": 0}
			var atk1: float = _fc.call("char_atk", "self")
			var hp1: float = _fc.call("max_hp_of", "self")
			## 106장 ⑯ — 공격 = (인물 기본 × 배율 + 무기 공격력) × 승급 특성. 인물 몫만 1.6배 넘게 올라야 한다.
			var w: float = PartyState.weapon_atk("self")
			_check("stats_scale", (atk20 - w) > (atk1 - w) * 1.6 and hp20 > hp1 and is_equal_approx(PartyState.char_atk("self"), (Growth.BASE_ATK + w) * PartyState.atk_mul()),
				"atk %.1f→%.1f hp %.1f→%.1f" % [atk1, atk20, hp1, hp20])
			PartyState.growth["self"] = {"lv": 20, "exp": 0.0, "asc": 1}
			_next()
		5: # ⑥ 늑대를 쓰러뜨리면 냥 40·늑대 송곳니 1
			if _frame == 1:
				_target = _enemy_kind("wolf")
				_n0 = PartyState.count("wolf_fang")
				_hp_kill(_target)
			if _frame == 5:
				_check("kill_loot", _target.call("is_dead") and PartyState.count("wolf_fang") == _n0 + 1, "fang %d→%d" % [_n0, PartyState.count("wolf_fang")])
				_next()
		6: # ⑦ 보물 상자 — 평범한 상자에서 짧은 견문록 1·냥 300
			var chest: Node = null
			for c in get_tree().get_nodes_in_group("treasure_chest"):
				if c.get("grade") == "common" and not c.get("sealed") and not c.get("is_open"):
					chest = c
					break
			if chest == null:
				for c in get_tree().current_scene.find_children("Chest_*", "", true, false):
					if c.get("grade") == "common" and not c.get("sealed") and not c.get("is_open"):
						chest = c
						break
			var books0 := PartyState.count("book_s")
			var mora0 := PartyState.count("mora")
			var got: float = chest.call("open") if chest else 0.0
			_check("chest_loot", chest != null and got > 0.0 and PartyState.count("book_s") == books0 + 1 and PartyState.count("mora") == mora0 + 300,
				"chest=%s books %d→%d mora %d→%d" % [chest != null, books0, PartyState.count("book_s"), mora0, PartyState.count("mora")])
			_next()
		7: # ⑧ v2 → v3 마이그레이션
			var v2 := {"version": 2, "party_exp": 550.0, "party_members": ["hero_a", "hero_b"]}
			var out: Variant = SaveState.call("_migrate", v2)
			var ok := false
			var cg: Dictionary = {}
			if out != null:
				cg = out["char_growth"]
				ok = int(out["version"]) == 3 and cg.has("self") and int(cg["self"]["lv"]) == 11 \
					and int(cg["hero_b"]["lv"]) == 11 and (out["bag"] as Dictionary).is_empty()
			_check("migrate_v3", ok, "char_growth=%s" % [cg])
			_next()
		8: # ⑨ restore 로 성장·가방이 그대로
			var g := PartyState.growth.duplicate(true)
			var b := PartyState.bag.duplicate(true)
			var members: Array[String] = PartyState.members.duplicate()
			var perks: Array[String] = PartyState.perks.duplicate()
			PartyState.restore(members, PartyState.exp, perks, g, b)
			_check("restore", PartyState.char_level("self") == 20 and PartyState.char_asc("self") == 1 and PartyState.bag == b, "")
			_next()
		9: # ⑩ 인물 화면
			var cs := get_tree().get_first_node_in_group("go_character_screen")
			cs.call("open_screen")
			var modal: bool = cs.is_in_group("ui_modal") and bool(_p.get("frozen"))
			PartyState.add_items({"book_m": 1, "mora": 5000})
			var lv0 := PartyState.char_level("self")
			var btn: Button = cs.get("_once_button")
			btn.emit_signal("pressed")
			var up := PartyState.char_level("self") > lv0
			cs.call("close_screen")
			var closed: bool = not cs.is_in_group("ui_modal") and not bool(_p.get("frozen"))
			_check("screen", modal and up and closed, "modal=%s lv %d→%d closed=%s" % [modal, lv0, PartyState.char_level("self"), closed])
			PartyState.growth = _growth0
			PartyState.bag = _bag0
			_next()
		10:
			print("GROWTH_PROBE_DONE fails=%d" % _fails)
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
	print("GROWTH_PROBE %s %s %s" % [name, "ok" if ok else "FAIL", detail])

func _next() -> void:
	_step += 1
	_frame = 0
