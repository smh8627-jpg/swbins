extends Node
## GO 성유물(106장 ⑰) 자동 점검 — 평소엔 안 붙는다. test_village.gd 가 SAGA_ARTIFACT_PROBE 가 있을 때만 단다.
##
##   SAGA_ARTIFACT_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/world/TestVillage.tscn
##
## ① 생성(같은 씨앗 같은 결과·꽃=체력·깃=공격력·부옵션 수·겹침 없음) ② 주옵션 값 계단 ③ 강화 +20 — +4 마다 부옵션, 넷까지
## ④ 끼면 공격력 공식에 들어감 ⑤ 맞바꿈 ⑥ 세트 2/4(물결 성자 스킬 +30%·불꽃 무녀 증발 +40%·바람 나그네 확산 +60%)
## ⑦ 원소 피해 보너스(치는 인물이 있을 때만) ⑧ 원소 괴물·정교 상자에서 ★4 ⑨ 분해 → 연마석(낀 건 안 됨)
## ⑩ restore(옛 세이브는 빈 상태) ⑪ 상한 200 ⑫ 인물 화면 "바꾸기"·"분해".
## 성장·가방·무기·성유물을 잠깐 바꿨다가 되돌린다. 저장은 안 한다.

const Artifacts := preload("res://games/saga_go/data/artifacts.gd")
const Growth := preload("res://games/saga_go/data/growth.gd")
const Characters := preload("res://saga_core/data/characters.gd")

var _p: CharacterBody3D
var _fc: Node
var _frame := 0
var _step := 0
var _fails := 0
var _saved := {}
var _uid := ""
var _n0 := 0

func _ready() -> void:
	Weather.force("clear")
	_p = get_tree().get_first_node_in_group("player")

func _physics_process(_delta: float) -> void:
	_frame += 1
	if _fc == null:
		_fc = get_tree().get_first_node_in_group("go_field_combat")
		if _fc:
			_saved = {"members": PartyState.members.duplicate(), "growth": PartyState.growth.duplicate(true), "bag": PartyState.bag.duplicate(true),
				"weapons": PartyState.weapons.duplicate(true), "equip": PartyState.equip.duplicate(true),
				"artifacts": PartyState.artifacts.duplicate(true), "seq": PartyState.artifact_seq}
			PartyState.members.assign([])
			PartyState.growth.clear()
			PartyState.bag.clear()
			PartyState.weapons.clear()
			PartyState.equip.clear()
			PartyState.artifacts.clear()
			PartyState.artifact_seq = 0
		return
	match _step:
		0: # ① 생성
			var same := JSON.stringify(Artifacts.generate(123, 5)) == JSON.stringify(Artifacts.generate(123, 5))
			var ok := same
			var detail := ""
			for i in 40:
				var r := 4 if i % 2 == 0 else 5
				var a := Artifacts.generate(1000 + i, r)
				var subs: Array = a.subs
				var keys := {}
				for s in subs:
					keys[s[0]] = true
				var lo := 2 if r == 4 else 3
				var good: bool = subs.size() >= lo and subs.size() <= lo + 1 and keys.size() == subs.size() and not keys.has(a.main) \
					and (Artifacts.SLOT_MAINS[a.slot] as Array).has(a.main)
				if a.slot == "flower":
					good = good and a.main == "hp"
				if a.slot == "plume":
					good = good and a.main == "atk"
				if not good:
					ok = false
					detail += "%d " % i
			_check("generate", ok, "same=%s bad=%s" % [same, detail])
			_next()
		1: # ② 주옵션 계단
			var f5 := {"main": "hp", "rarity": 5, "lv": 0}
			var v0 := Artifacts.main_value(f5)
			f5.lv = 20
			var v20 := Artifacts.main_value(f5)
			var f4 := {"main": "hp", "rarity": 4, "lv": 16}
			var v4 := Artifacts.main_value(f4)
			_check("main_values", is_equal_approx(v0, 32.0) and is_equal_approx(v20, 210.0) and is_equal_approx(v4, (32.0 + 178.0 * 0.8) * 0.8),
				"%.1f %.1f %.1f" % [v0, v20, v4])
			_next()
		2: # ③ 강화 +20
			_uid = PartyState.add_artifact(5, "gladiator", "plume")
			var n_sub0 := (PartyState.artifacts[_uid].subs as Array).size()
			PartyState.add_items({"polish": 200, "mora": 1000000})
			var steps := 0
			while PartyState.artifact_level_once(_uid) > 0:
				steps += 1
			var a: Dictionary = PartyState.artifacts[_uid]
			var used := 200 - PartyState.count("polish")
			_check("level", int(a.lv) == 20 and steps == 20 and (a.subs as Array).size() == 4 and n_sub0 >= 3 and used >= 126 \
				and PartyState.artifact_level_once(_uid) == -1, "lv=%d steps=%d subs %d→%d used=%d" % [int(a.lv), steps, n_sub0, (a.subs as Array).size(), used])
			_next()
		3: # ④ 끼면 공격력
			var atk0 := PartyState.char_atk("self")
			PartyState.equip_artifact("self", _uid)
			var atk1 := PartyState.char_atk("self")
			var g := PartyState.growth_of("self")
			var want: float = ((Growth.BASE_ATK * Growth.stat_mul(int(g.lv), int(g.asc)) + PartyState.weapon_atk("self")) * (1.0 + PartyState.stat("self", "atk_pct")) \
				+ PartyState.stat("self", "atk")) * PartyState.atk_mul()
			_check("equip_atk", atk1 > atk0 + 300.0 and is_equal_approx(atk1, want) and PartyState.stat("self", "atk") >= 311.0,
				"atk %.1f→%.1f want=%.1f" % [atk0, atk1, want])
			_next()
		4: # ⑤ 맞바꿈
			var hero: String = Characters.HEROES[0].id
			var other := PartyState.add_artifact(4, "emblem", "plume")
			PartyState.equip_artifact(hero, other)
			PartyState.equip_artifact(hero, _uid) # self 가 끼던 걸 hero 가 가져가면 hero 것은 self 에게
			var ok: bool = PartyState.artifacts[_uid].owner == hero and PartyState.artifacts[other].owner == "self"
			PartyState.equip_artifact("self", _uid)
			_check("swap", ok and PartyState.artifacts[_uid].owner == "self" and PartyState.artifacts[other].owner == hero, "")
			_next()
		5: # ⑥ 세트
			for s in ["flower", "sands", "goblet", "circlet"]:
				PartyState.equip_artifact("self", PartyState.add_artifact(4, "depth", s))
			var depth_ok: bool = int(PartyState.set_counts("self").get("depth", 0)) == 4 and is_equal_approx(PartyState.passive_mul("self", "skill"), 1.3) \
				and PartyState.stat("self", "elem_water") >= 0.15
			for s in ["flower", "sands", "goblet", "circlet"]:
				PartyState.equip_artifact("self", PartyState.add_artifact(4, "crimson", s))
			var crimson_ok: bool = is_equal_approx(PartyState.react_mul("self", "vaporize"), 1.4) and is_equal_approx(PartyState.react_mul("self", "electro"), 1.0) \
				and is_equal_approx(PartyState.passive_mul("self", "skill"), 1.0)
			for s in ["flower", "sands", "goblet", "circlet"]:
				PartyState.equip_artifact("self", PartyState.add_artifact(4, "viridescent", s))
			var vv_ok: bool = is_equal_approx(PartyState.react_mul("self", "swirl"), 1.6)
			_check("sets", depth_ok and crimson_ok and vv_ok, "depth=%s crimson=%s vv=%s" % [depth_ok, crimson_ok, vv_ok])
			_next()
		6: # ⑦ 원소 피해 보너스
			var gob := PartyState.artifact_of("self", "goblet")
			PartyState.artifacts[gob].main = "elem_fire"
			var want := 1.0 + PartyState.stat("self", "elem_fire")
			var b_prop: float = _fc.call("_dmg_bonus", "fire")
			_fc.set("_crit_id", "self")
			var b_on: float = _fc.call("_dmg_bonus", "fire")
			_fc.set("_crit_id", "")
			_check("dmg_bonus", want > 1.05 and is_equal_approx(PartyState.dmg_bonus("self", "fire"), want) and b_prop == 1.0 and is_equal_approx(b_on, want),
				"want=%.3f off=%.3f on=%.3f" % [want, b_prop, b_on])
			_next()
		7: # ⑧ 원소 괴물·정교 상자
			if _frame == 1:
				_n0 = PartyState.artifacts.size()
				for e in get_tree().get_nodes_in_group("field_enemy"):
					if not e.call("is_dead") and e.get("element") != "":
						e.set("shield", 0.0)
						e.call("apply_damage", 99999.0, false, Vector3.FORWARD)
						break
			if _frame == 3:
				var after_kill := PartyState.artifacts.size()
				var chest: Node = null
				for c in get_tree().get_nodes_in_group("treasure_chest"):
					if c.get("grade") == "exquisite" and not c.get("is_open"):
						chest = c
						break
				if chest:
					chest.call("unseal")
					chest.call("open")
				var newest: Dictionary = PartyState.artifacts["a%d" % PartyState.artifact_seq]
				_check("drops", after_kill == _n0 + 1 and chest != null and PartyState.artifacts.size() == _n0 + 2 and int(newest.rarity) == 4,
					"n %d→%d→%d" % [_n0, after_kill, PartyState.artifacts.size()])
				_next()
		8: # ⑨ 분해
			var spare := 0
			for k in PartyState.artifacts:
				var a: Dictionary = PartyState.artifacts[k]
				if a.owner == "" and int(a.rarity) <= 4 and int(a.lv) == 0:
					spare += 1
			var p0 := PartyState.count("polish")
			var n := PartyState.salvage_unused(4)
			var equipped_left := PartyState.equipped_artifacts("self").size()
			var blocked := not PartyState.salvage(_uid)
			PartyState.unequip_artifact("self", "plume")
			var total := float(PartyState.artifacts[_uid].total)
			var p1 := PartyState.count("polish")
			var ok5 := PartyState.salvage(_uid)
			var refund := PartyState.count("polish") - p1
			_check("salvage", n == spare and n >= 2 and PartyState.count("polish") - refund == p0 + n and equipped_left == 5 and blocked and ok5 \
				and refund == 2 + int(total * 0.8 / 2500.0), "n=%d spare=%d refund=%d" % [n, spare, refund])
			_next()
		9: # ⑩ restore
			var arts := PartyState.artifacts.duplicate(true)
			var seq := PartyState.artifact_seq
			var members: Array[String] = PartyState.members.duplicate()
			var perks: Array[String] = PartyState.perks.duplicate()
			var g := PartyState.growth.duplicate(true)
			var b := PartyState.bag.duplicate(true)
			var atk0 := PartyState.char_atk("self")
			var j0 := JSON.stringify(arts)
			PartyState.restore(members, PartyState.exp, perks, g, b, {}, {}, JSON.parse_string(j0), seq)
			var kept: bool = PartyState.artifacts.size() == arts.size() and PartyState.artifact_seq == seq and is_equal_approx(PartyState.char_atk("self"), atk0)
			PartyState.restore(members, PartyState.exp, perks, g, b)
			var legacy: bool = PartyState.artifacts.is_empty() and PartyState.artifact_seq == 0
			PartyState.restore(members, PartyState.exp, perks, g, b, {}, {}, arts, seq)
			_check("restore", kept and legacy, "kept=%s legacy=%s" % [kept, legacy])
			_next()
		10: # ⑪ 상한 200
			for i in 205:
				PartyState.add_artifact(4)
			_check("cap", PartyState.artifacts.size() <= Artifacts.CAP and PartyState.equipped_artifacts("self").size() == 4, "n=%d" % PartyState.artifacts.size())
			_next()
		11: # ⑫ 인물 화면
			var cs := get_tree().get_first_node_in_group("go_character_screen")
			cs.call("open_screen")
			cs.call("select", "self")
			PartyState.unequip_artifact("self", "plume")
			var sw: Button = (cs.get("_art_swap") as Dictionary)["plume"]
			sw.emit_signal("pressed")
			var got := PartyState.artifact_of("self", "plume")
			var label_ok := String((cs.get("_art_labels") as Dictionary)["plume"].text).contains("깃")
			var salv: Button = cs.get("_salvage_btn")
			var n0 := PartyState.artifacts.size()
			salv.emit_signal("pressed")
			var fewer := PartyState.artifacts.size() < n0
			cs.call("close_screen")
			_check("screen", got != "" and label_ok and fewer, "got=%s label=%s fewer=%s" % [got, label_ok, fewer])
			PartyState.members.assign(_saved.members)
			PartyState.growth = _saved.growth
			PartyState.bag = _saved.bag
			PartyState.weapons = _saved.weapons
			PartyState.equip = _saved.equip
			PartyState.artifacts = _saved.artifacts
			PartyState.artifact_seq = _saved.seq
			_next()
		12:
			print("ARTIFACT_PROBE_DONE fails=%d" % _fails)
			get_tree().quit()

func _check(name: String, ok: bool, detail: String) -> void:
	if not ok:
		_fails += 1
	print("ARTIFACT_PROBE %s %s %s" % [name, "ok" if ok else "FAIL", detail])

func _next() -> void:
	_step += 1
	_frame = 0
