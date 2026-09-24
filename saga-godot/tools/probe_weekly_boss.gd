extends Node
## GO 주간 보스(106장 ㉑) 자동 점검 — 평소엔 안 붙는다. test_village.gd 가 SAGA_WEEKLY_PROBE 가 있을 때만 단다.
##
##   SAGA_WEEKLY_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/world/TestVillage.tscn
##
## ① 특성 7→8 부터 뇌룡 비늘(1·2·2)·주간 원기 30 ② 들어가기 → 보스 하나(가운데·체력 6000·방패 없음·180초)
## ③ 내려찍기 — 원 안이면 맞고 ④ 원 밖이면 안 맞음 ⑤ 먹구름 벼락 원 셋 — 발밑이면 맞음 ⑥ 체력 절반 → 2단계 뇌 방패 600·불 ×2.5
## ⑦ 쓰러뜨리면 보상 나무 → 원기 30·뇌룡 비늘·★5·이번 주 1번 ⑧ 할인 셋 뒤 60·새 주엔 다시 30 ⑨ 비늘이 있어야 특성 8.
## 저장은 안 한다.

const Domains := preload("res://games/saga_go/data/domains.gd")
const Growth := preload("res://games/saga_go/data/growth.gd")
const Elements := preload("res://games/saga_go/combat/elements.gd")
const FieldBoss := preload("res://games/saga_go/combat/field_boss.gd")

var _p: CharacterBody3D
var _dm: Node
var _fc: Node
var _boss: Node = null
var _frame := 0
var _step := 0
var _fails := 0
var _v: Variant = null

func _ready() -> void:
	Weather.force("clear")
	_p = get_tree().get_first_node_in_group("player")

func _physics_process(_delta: float) -> void:
	_frame += 1
	if _dm == null:
		_dm = get_tree().get_first_node_in_group("go_domains")
		_fc = get_tree().get_first_node_in_group("go_field_combat")
		return
	match _step:
		0: # ① 표
			PartyState.weekly = {}
			PartyState.resin_t = 0.0
			var c6 := Growth.talent_cost("self", 6)
			var ok: bool = not c6.has("boss_mat") and int(Growth.talent_cost("self", 7).get("boss_mat", 0)) == 1 \
				and int(Growth.talent_cost("self", 8).get("boss_mat", 0)) == 2 and int(Growth.talent_cost("self", 9).get("boss_mat", 0)) == 2 \
				and Domains.cost_of("weekly") == 30 and Domains.cost_of("tomb") == 20 and Domains.weekly_claims() == 0
			_check("table", ok, "lv7=%s" % Growth.talent_cost("self", 7))
			_next()
		1: # ② 들어가기
			if _frame == 1:
				_dm.call("enter", "weekly", 0)
			if _frame == 200:
				var alive: Array = _dm.call("alive_enemies")
				_boss = alive[0] if alive.size() == 1 else null
				var center: Vector3 = Domains.DOMAINS.weekly.arena
				var ok: bool = _boss != null and _boss is FieldBoss and Vector2(_boss.global_position.x - center.x, _boss.global_position.z - center.z).length() < 1.5 \
					and is_equal_approx(float(_boss.get("max_hp")), 6000.0) and float(_boss.get("shield")) == 0.0 and float(_dm.get("time_left")) > 170.0
				_check("enter", ok, "n=%d hp=%s time=%.0f" % [alive.size(), _boss.get("max_hp") if _boss else "-", _dm.get("time_left")])
				if _boss:
					_boss.set("skill_cd", 999.0) # 저절로 쓰는 패턴은 끈다 — 점검이 하나씩 부른다
				_next()
		2: # ③ 내려찍기 — 원 안
			if _frame == 1:
				_fc.call("revive_all")
				_near_boss(3.0)
				_boss.call("begin_skill", "slam", _p)
				_boss.set("skill_cd", 999.0)
				_v = [int(_boss.get("hits_taken")), float(_fc.call("hp_of", "self"))]
			if _frame == 90:
				var ok: bool = int(_boss.get("hits_taken")) == int(_v[0]) + 1 and float(_fc.call("hp_of", "self")) < float(_v[1]) and _boss.get("skill") == ""
				_check("slam_hit", ok, "hits=%d hp %.0f→%.0f" % [_boss.get("hits_taken"), _v[1], _fc.call("hp_of", "self")])
				_next()
		3: # ④ 원 밖
			if _frame == 1:
				_near_boss(3.0)
				_boss.call("begin_skill", "slam", _p)
				_boss.set("skill_cd", 999.0)
				_v = int(_boss.get("hits_taken"))
			if _frame == 10:
				_near_boss(9.0)
			if _frame == 90:
				_check("slam_dodge", int(_boss.get("hits_taken")) == int(_v), "hits=%d" % _boss.get("hits_taken"))
				_next()
		4: # ⑤ 먹구름 벼락
			if _frame == 1:
				_fc.call("revive_all")
				_near_boss(7.0)
				_boss.call("begin_skill", "storm", _p)
				_boss.set("skill_cd", 999.0)
				_v = [int(_boss.get("hits_taken")), (_boss.get("_marks") as Array).size()]
			if _frame == 80:
				_check("storm", int(_v[1]) == 3 and int(_boss.get("hits_taken")) == int(_v[0]) + 1, "marks=%d hits=%d" % [_v[1], _boss.get("hits_taken")])
				_next()
		5: # ⑥ 2단계
			if _frame == 1:
				_near_boss(12.0)
				_boss.set("hp", float(_boss.get("max_hp")) * 0.49)
			if _frame == 4:
				var ok: bool = int(_boss.get("phase")) == 2 and is_equal_approx(float(_boss.get("shield")), 600.0) and _boss.call("is_shielded") \
					and is_equal_approx(Elements.shield_mul("thunder", "fire"), 2.5)
				_check("phase2", ok, "phase=%d shield=%.0f" % [_boss.get("phase"), _boss.get("shield")])
				_next()
		6: # ⑦ 보상
			if _frame == 1:
				_v = [Domains.resin_now(), PartyState.count("boss_mat"), _fives()]
				_boss.call("_die")
			if _frame == 5:
				_p.global_position = Domains.DOMAINS.weekly.arena + Vector3(0.0, 0.6, 1.0)
				_p.velocity = Vector3.ZERO
			if _frame == 12:
				var ok: bool = bool(_dm.get("claimed")) and Domains.resin_now() == int(_v[0]) - 30 and PartyState.count("boss_mat") == int(_v[1]) + 1 \
					and _fives() == int(_v[2]) + 1 and Domains.weekly_claims() == 1
				_check("claim", ok, "resin %d→%d mat %d→%d claims=%d" % [_v[0], Domains.resin_now(), _v[1], PartyState.count("boss_mat"), Domains.weekly_claims()])
			if _frame == 200:
				_next()
		7: # ⑧ 할인 셋·새 주
			PartyState.weekly.claims = 3
			var full := Domains.cost_of("weekly")
			PartyState.weekly.week = Domains.this_week() - 1
			var fresh := Domains.cost_of("weekly")
			_check("discount", full == 60 and fresh == 30 and Domains.weekly_claims() == 0 and _dm.call("state_name") == "outside", "full=%d fresh=%d" % [full, fresh])
			_next()
		8: # ⑨ 특성 8 은 비늘이 있어야
			PartyState.growth["self"] = {"lv": 90, "exp": 0.0, "asc": 6, "tn": 7, "ts": 1, "tb": 1, "con": 0}
			var cost := Growth.talent_cost("self", 7)
			var give := cost.duplicate()
			give.erase("boss_mat")
			PartyState.bag.erase("boss_mat")
			PartyState.add_items(give)
			var blocked := not PartyState.talent_up("self", "normal")
			PartyState.add_items({"boss_mat": 1})
			var ok := PartyState.talent_up("self", "normal")
			_check("talent_needs_mat", blocked and ok and PartyState.talent_level("self", "normal") == 8, "blocked=%s ok=%s" % [blocked, ok])
			_next()
		9:
			print("WEEKLY_PROBE_DONE fails=%d" % _fails)
			get_tree().quit()

func _near_boss(dist: float) -> void:
	var b: Vector3 = _boss.global_position
	_p.global_position = b + Vector3(0.0, 0.3, dist)
	_p.velocity = Vector3.ZERO

func _fives() -> int:
	var n := 0
	for uid in PartyState.artifacts:
		if int(PartyState.artifacts[uid].rarity) == 5:
			n += 1
	return n

func _check(name: String, ok: bool, detail: String) -> void:
	if not ok:
		_fails += 1
	print("WEEKLY_PROBE %s %s %s" % [name, "ok" if ok else "FAIL", detail])

func _next() -> void:
	_step += 1
	_frame = 0
