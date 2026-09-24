extends Node
## GO 모험 등급·세계 등급(106장 ㉒) 자동 점검 — 평소엔 안 붙는다. test_village.gd 가 SAGA_ADVENTURE_PROBE 가 있을 때만 단다.
##
##   SAGA_ADVENTURE_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/world/TestVillage.tscn
##
## ① 시작 — 보상 등급을 지금 등급으로 앉힘·늑대 Lv 표시(그 뒤 모험 등급 1 로 맞춤) ② 모험 등급 5 → 밀린 보상 넷(매듭 하나)·세계 등급 1·늑대 체력 ×1.35·"Lv.20"
## ③ 부대 경험으로 한 등급 더 → level_up 신호로 보상 ④ 세계 등급 1 전리품(냥 ×1.25) ⑤ 세계 등급 3 — 냥 ×1.75·그 밖 +1
## ⑥ 싸우는 중에 등급이 바뀌어도 깎인 체력 비율 그대로 ⑦ 한 단계 낮추기·되돌리기 ⑧ 비경 단계 잠금(모험 등급 6·12)
## ⑨ 왼쪽 위 글자·의뢰판 줄. 저장은 안 한다.

const Adventure := preload("res://games/saga_go/data/adventure.gd")
const Domains := preload("res://games/saga_go/data/domains.gd")
const FieldEnemy := preload("res://games/saga_go/combat/field_enemy.gd")

var _adv: Node
var _frame := 0
var _step := 0
var _fails := 0

func _ready() -> void:
	Weather.force("clear")

func _physics_process(_delta: float) -> void:
	_frame += 1
	if _adv == null:
		_adv = get_tree().get_first_node_in_group("go_adventure")
		return
	match _step:
		0: # ① 시작 — 불러온 세이브(있으면) 그대로: 보상 등급은 지금 등급으로 앉고, 적은 지금 세계 등급
			var w := _wolf()
			var lbl: Label3D = w.get("_name_label")
			var wl := Adventure.world_level()
			var ok: bool = Adventure.ar() == PartyState.level + 1 and PartyState.ar_paid == Adventure.ar() \
				and int(w.get("world_lv")) == wl and lbl.text.begins_with("Lv.%d " % Adventure.enemy_level(wl))
			_check("start", ok, "wl=%d label=%s" % [wl, lbl.text])
			## 여기서부터는 모험 등급 1 에서 시작한다(세이브 값과 상관없이 같은 출력).
			_set_exp(0.0)
			PartyState.ar_paid = 1
			PartyState.wl_lowered = false
			_adv.call("sync")
			PartyState.world_changed.emit()
			_next()
		1: # ② 모험 등급 5
			var m0 := PartyState.count("mora")
			var k0 := PartyState.count("fate_knot")
			_set_exp(400.0)
			var paid: int = _adv.call("sync")
			var w := _wolf()
			var ok: bool = paid == 4 and Adventure.ar() == 5 and Adventure.world_level() == 1 and PartyState.count("mora") == m0 + 8000 \
				and PartyState.count("fate_knot") == k0 + 1 and is_equal_approx(float(w.get("max_hp")), FieldEnemy.KINDS.wolf.hp * 1.35) \
				and (w.get("_name_label") as Label3D).text.begins_with("Lv.20 ")
			_check("ar_rewards", ok, "paid=%d ar=%d wl=%d mora+%d hp=%.1f" % [paid, Adventure.ar(), Adventure.world_level(), PartyState.count("mora") - m0, w.get("max_hp")])
			_next()
		2: # ③ level_up 신호
			var b0 := PartyState.count("book_s")
			PartyState.add_exp(100.0)
			var ok: bool = Adventure.ar() == 6 and PartyState.ar_paid == 6 and PartyState.count("book_s") == b0 + 3
			_check("level_signal", ok, "ar=%d paid=%d" % [Adventure.ar(), PartyState.ar_paid])
			_next()
		3: # ④ 세계 등급 1 전리품
			var m0 := PartyState.count("mora")
			var f0 := PartyState.count("wolf_fang")
			_wolf().call("_die")
			_check("loot_wl1", PartyState.count("mora") == m0 + 50 and PartyState.count("wolf_fang") == f0 + 1,
				"mora+%d fang+%d" % [PartyState.count("mora") - m0, PartyState.count("wolf_fang") - f0])
			_next()
		4: # ⑤ 세계 등급 3
			_set_exp(1400.0)
			_adv.call("sync")
			var m0 := PartyState.count("mora")
			var f0 := PartyState.count("wolf_fang")
			var w := _wolf()
			w.call("_die")
			var ok: bool = Adventure.world_level() == 3 and PartyState.count("mora") == m0 + 70 and PartyState.count("wolf_fang") == f0 + 2 \
				and is_equal_approx(float(w.get("dmg_mul")), 1.66)
			_check("loot_wl3", ok, "wl=%d mora+%d fang+%d dmg=%.2f" % [Adventure.world_level(), PartyState.count("mora") - m0, PartyState.count("wolf_fang") - f0, w.get("dmg_mul")])
			_next()
		5: # ⑥ 비율 그대로
			var w := _wolf()
			w.set("hp", float(w.get("max_hp")) * 0.5)
			PartyState.wl_lowered = true
			PartyState.world_changed.emit()
			var ratio := float(w.get("hp")) / float(w.get("max_hp"))
			PartyState.wl_lowered = false
			PartyState.world_changed.emit()
			_check("hp_ratio", absf(ratio - 0.5) < 0.001 and absf(float(w.get("hp")) / float(w.get("max_hp")) - 0.5) < 0.001, "ratio=%.3f" % ratio)
			_next()
		6: # ⑦ 낮추기·되돌리기
			var a: bool = _adv.call("lower_world")
			var low := Adventure.world_level()
			var wl_hp: float = _wolf().get("max_hp")
			var b: bool = _adv.call("lower_world")
			var back := Adventure.world_level()
			var ok: bool = a and b and low == 2 and back == 3 and is_equal_approx(wl_hp, FieldEnemy.KINDS.wolf.hp * 1.7)
			_check("lower", ok, "low=%d back=%d hp=%.1f" % [low, back, wl_hp])
			_next()
		7: # ⑧ 비경 단계 잠금
			_set_exp(400.0) # 모험 등급 5
			var ii_locked := not Domains.level_open(1)
			_set_exp(500.0) # 6
			var ii_open := Domains.level_open(1) and not Domains.level_open(2)
			_set_exp(1100.0) # 12
			var iii_open := Domains.level_open(2)
			_check("domain_lock", ii_locked and ii_open and iii_open, "%s %s %s" % [ii_locked, ii_open, iii_open])
			_next()
		8: # ⑨ 글자
			_adv.call("sync")
			var pl := _find_label()
			var cm := get_tree().get_first_node_in_group("go_commissions")
			cm.call("toggle_panel")
			var ar_text: String = (cm.get("_ar_label") as Label).text
			var btn: Button = cm.get("_wl_btn")
			var ok: bool = pl != null and pl.text.begins_with("모험 등급 %d · 세계 등급 %d" % [Adventure.ar(), Adventure.world_level()]) \
				and ar_text.contains("모험 등급 %d" % Adventure.ar()) and btn.visible
			_check("labels", ok, "party='%s' panel='%s'" % [pl.text if pl else "-", ar_text.replace("\n", " | ")])
			cm.call("toggle_panel")
			_next()
		9:
			print("ADVENTURE_PROBE_DONE fails=%d" % _fails)
			get_tree().quit()

func _set_exp(v: float) -> void:
	PartyState.exp = v
	PartyState._recompute()

func _wolf() -> Node:
	var sp := get_tree().current_scene.get_node("FieldSpawner")
	for e in sp.get_children():
		if e.get("kind") == "wolf" and not e.call("is_dead"):
			return e
	return null

func _find_label() -> Label:
	for n in get_tree().current_scene.find_children("*", "Label", true, false):
		if (n as Label).get_script() != null and String((n as Label).get_script().resource_path).ends_with("party_label.gd"):
			return n
	return null

func _check(name: String, ok: bool, detail: String) -> void:
	if not ok:
		_fails += 1
	print("ADVENTURE_PROBE %s %s %s" % [name, "ok" if ok else "FAIL", detail])

func _next() -> void:
	_step += 1
	_frame = 0
