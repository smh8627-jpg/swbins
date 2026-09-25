extends Node
## GO 업적(PLAN 106장 ㊸, world/achievements.gd · data/achievements.gd) 자동 점검 — 평소엔 안 붙는다.
## test_village.gd 가 SAGA_ACHIEVE_PROBE 가 있을 때만 단다.
##
##   SAGA_ACHIEVE_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/world/TestVillage.tscn
##
## ① 표(목록·갈래·단계 오름·보상 칸 수·셈 이름) ② 불러온 직후 알림 없음·상태 셈(모험 등급)이 이미 단계에 들어감
## ③ 실제 적 쓰러뜨림 → kills ④ 신호마다 셈·단계·알림(반응·확산·급소·요리·맛있는·낚시·비경) ⑤ 반응 가짓수
## ⑥ 받기 — 한 번만 ⑦ 여러 단계 한꺼번에(보상 합) ⑧ 모두 받기 ⑨ 화면(갈래·줄 글·얼림).
## 업적·가방은 끝에 되돌린다. 저장은 안 한다.

const Achievements := preload("res://games/saga_go/data/achievements.gd")
const Adventure := preload("res://games/saga_go/data/adventure.gd")

var _p: Node3D
var _ac: Node
var _frame := 0
var _step := 0
var _fails := 0
var _saved := {}
var _v: Variant = null
var _a0 := 0

func _ready() -> void:
	Weather.force("clear")
	_p = get_tree().get_first_node_in_group("player")

func _physics_process(_delta: float) -> void:
	_frame += 1
	if _ac == null:
		_ac = get_tree().get_first_node_in_group("go_achievements")
		_frame = 0
		return
	if _frame < 3 and _step == 0:
		return
	match _step:
		0: # ① 표
			var bad: Array = []
			if Achievements.ORDER.size() != Achievements.LIST.size():
				bad.append("order %d list %d" % [Achievements.ORDER.size(), Achievements.LIST.size()])
			for id in Achievements.ORDER:
				var d := Achievements.info(id)
				var tiers: Array = d.get("tiers", [])
				if d.is_empty() or not (String(d.cat) in Achievements.CATEGORIES) or tiers.is_empty() or tiers.size() > 3:
					bad.append(id)
					continue
				for i in range(1, tiers.size()):
					if int(tiers[i]) <= int(tiers[i - 1]):
						bad.append(id + " 단계")
				if d.has("reward") and (d.reward as Array).size() != tiers.size():
					bad.append(id + " 보상")
				if not Achievements.desc_of(id, 1).contains(str(tiers[0])):
					bad.append(id + " 글")
			_check("tables", bad.is_empty(), str(bad))
			_next()
		1: # ② 알림 없이 채움
			var t := int(_ac.call("tier_of", "a_ar"))
			var want := Achievements.tier_for("a_ar", Adventure.ar())
			_check("silent_load", int(_ac.get("announced")) == 0 and t == want, "announced=%d a_ar=%d want=%d ar=%d" % [_ac.get("announced"), t, want, Adventure.ar()])
			_saved = {"ach": PartyState.achievements.duplicate(true), "bag": PartyState.bag.duplicate(true)}
			PartyState.achievements = {}
			_ac.set("_silent", true)
			_ac.call("check")
			_ac.set("_silent", false)
			_a0 = int(_ac.get("announced"))
			_next()
		2: # ③ 실제 적 쓰러뜨림
			if _frame == 1:
				_v = int(_ac.call("stat", "kills"))
				var e := _plain_enemy()
				_p.global_position = (e as Node3D).global_position + Vector3(0, 0.5, 6.0)
				e.call("apply_damage", 999999.0, false)
			if _frame == 5:
				_check("kill_counts", int(_ac.call("stat", "kills")) == int(_v) + 1, "%d→%d" % [_v, _ac.call("stat", "kills")])
				_next()
		3: # ④ 신호마다
			var fc := get_tree().get_first_node_in_group("go_field_combat")
			fc.emit_signal("reacted", "swirl")
			fc.emit_signal("reacted", "melt")
			(fc.get("aim") as Node).emit_signal("weak_hit")
			get_tree().get_first_node_in_group("go_kitchen").emit_signal("cooked", "honey_cake", 2)
			get_tree().get_first_node_in_group("go_fishing").emit_signal("caught", "crucian")
			get_tree().get_first_node_in_group("go_domains").emit_signal("state_changed", "cleared")
			var want := {"a_swirl": 1, "a_weak": 1, "a_cook": 1, "a_delicious": 1, "a_fish": 1, "a_domains": 1}
			var bad: Array = []
			for id in want:
				if int(_ac.call("tier_of", id)) != want[id]:
					bad.append("%s=%d" % [id, _ac.call("tier_of", id)])
			var announced := int(_ac.get("announced")) - _a0
			_check("signals", bad.is_empty() and int(_ac.call("stat", "reactions")) == 2 and announced >= 6, "bad=%s reactions=%d announced=%d" % [bad, _ac.call("stat", "reactions"), announced])
			## ⑤ 반응 가짓수 = 두 가지
			_check("reaction_kinds", int(_ac.call("value_of", "reaction_kinds")) == 2, "%d" % int(_ac.call("value_of", "reaction_kinds")))
			_next()
		4: # ⑥ 받기 한 번만
			var m0 := PartyState.count("mora")
			var got: Dictionary = _ac.call("claim", "a_swirl")
			var again: Dictionary = _ac.call("claim", "a_swirl")
			_check("claim_once", int(got.get("mora", 0)) == 3000 and PartyState.count("mora") == m0 + 3000 and again.is_empty() and int(_ac.call("claimed_of", "a_swirl")) == 1,
				"got=%s again=%s" % [got, again])
			_next()
		5: # ⑦ 여러 단계 한꺼번에
			(PartyState.achievements.stats as Dictionary)["kills"] = 300
			_ac.call("check")
			var got: Dictionary = _ac.call("claim", "a_kills")
			var want := {"mora": 9000, "book_s": 3, "book_m": 2, "ore_m": 2}
			_check("claim_multi", int(_ac.call("tier_of", "a_kills")) == 3 and got == want, "tier=%d got=%s" % [_ac.call("tier_of", "a_kills"), got])
			_next()
		6: # ⑧ 모두 받기
			var before := int(_ac.call("claimable"))
			_ac.call("claim_all")
			_check("claim_all", before > 0 and int(_ac.call("claimable")) == 0, "before=%d after=%d" % [before, _ac.call("claimable")])
			_next()
		7: # ⑨ 화면
			var opened: bool = _ac.call("open_screen")
			_ac.call("show_category", "combat")
			var txt: String = _ac.call("list_text")
			var frozen := bool(_p.get("frozen"))
			_ac.call("close_screen")
			_check("screen", opened and frozen and txt.contains("들판의 파수꾼") and txt.contains("명사수") and not txt.contains("강태공") and not bool(_p.get("frozen")), txt.substr(0, 160))
			_next()
		8:
			PartyState.achievements = _saved.ach
			PartyState.bag = _saved.bag
			print("ACHIEVE_PROBE_DONE fails=%d" % _fails)
			get_tree().quit()

func _plain_enemy() -> Node:
	for e in get_tree().get_nodes_in_group("field_enemy"):
		if not e.call("is_dead") and not e.call("is_shielded") and not e.get("def").has("rotation"):
			return e
	return null

func _check(name: String, ok: bool, detail: String) -> void:
	if not ok:
		_fails += 1
	print("ACHIEVE_PROBE %s %s %s" % ["ok  " if ok else "FAIL", name, detail])

func _next() -> void:
	_step += 1
	_frame = 0
