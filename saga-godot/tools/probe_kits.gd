extends Node
## GO 인물별 고유 스킬(106장 ㉔) 자동 점검 — 평소엔 안 붙는다. test_village.gd 가 SAGA_KIT_PROBE 가 있을 때만 단다.
##
##   SAGA_KIT_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/world/TestVillage.tscn
##
## 세상 밖 비경 원판(잠든 무덤 자리) 위에서 멈춰 둔 허수아비 적 둘로 본다.
## ① 표(다섯·재사용 대기·기본 이름) ② 주인공 E 돌진 — 길 위 적만·앞으로 나감 ③ 주인공 Q 불새 깃 — 기본 공격에 화 부여·끝나면 물리
## ④ 현책 E 팔괘진 — 인물을 바꿔도 남아 친다 ⑤ 현책 Q — 다른 인물 기력 +15·재사용 두 배 ⑥ 해장 E 포탄 — 늦게 떨어짐
## ⑦ 해장 Q — 명단 공격 +20%·상태 줄 ⑧ 결사 E — 보호막 25%·12초 ⑨ 결사 Q — 받는 피해 ×0.7 ⑩ 도적 두목 E — 솟구침
## ⑪ 도적 두목 Q — 앞 7m 소용돌이 ⑫ 운명의 자리 1 이 고유 재사용에도·표에 없는 인물은 원소 기본.
## 저장은 안 한다(명단은 끝에 되돌린다).

const Kits := preload("res://games/saga_go/data/kits.gd")
const Domains := preload("res://games/saga_go/data/domains.gd")
const FieldEnemy := preload("res://games/saga_go/combat/field_enemy.gd")

var _p: CharacterBody3D
var _fc: Node
var _a: Node3D = null
var _b: Node3D = null
var _origin := Vector3.ZERO
var _members_before: Array = []
var _frame := 0
var _step := 0
var _fails := 0
var _v: Variant = null

func _ready() -> void:
	Weather.force("clear")
	_p = get_tree().get_first_node_in_group("player")

func _physics_process(_delta: float) -> void:
	_frame += 1
	if _fc == null:
		_fc = get_tree().get_first_node_in_group("go_field_combat")
		_frame = 0
		return
	match _step:
		0: # 자리 잡기
			if _frame == 1:
				_members_before = PartyState.members.duplicate()
				PartyState.members.assign(["sg_zhugeliang", "kr_yisunsin", "kr_gyebaek"])
				_origin = Domains.DOMAINS.tomb.arena + Vector3(0.0, 0.6, 6.0)
				_put(_origin)
				_fc.call("revive_all")
			if _frame == 30:
				_a = _dummy(_origin + Vector3(0.0, -0.3, -3.0))
				_b = _dummy(_origin + Vector3(5.0, -0.3, 0.0))
				_next()
		1: # ① 표
			var ok: bool = Kits.KITS.size() == 5 and is_equal_approx(float(_fc.call("skill_cd_of", "self")), 6.0) \
				and is_equal_approx(float(_fc.call("skill_cd_of", "sg_zhugeliang")), 12.0) \
				and Kits.name_of("kr_yeongaesomun", "skill", "fire") == "불꽃 부채" and Kits.name_of("self", "burst", "fire") == "불새 깃"
			for id in Kits.KITS:
				for w in ["skill", "burst"]:
					ok = ok and String(Kits.KITS[id][w].get("name", "")) != "" and String(Kits.KITS[id][w].get("text", "")) != ""
			_check("table", ok, "n=%d" % Kits.KITS.size())
			_next()
		2: # ② 주인공 E 돌진
			if _frame == 1:
				_use(0)
				_v = [_a.get("hp"), _b.get("hp"), _p.global_position]
				_v.append(_fc.call("skill"))
			if _frame == 25:
				var moved: float = Vector2(_p.global_position.x - (_v[2] as Vector3).x, _p.global_position.z - (_v[2] as Vector3).z).length()
				var ok: bool = bool(_v[3]) and float(_a.get("hp")) < float(_v[0]) and is_equal_approx(float(_b.get("hp")), float(_v[1])) and moved >= 1.5 \
					and float(_fc.get("_skill_cd").get("self", 0.0)) > 5.0
				_check("self_dash", ok, "a %.0f→%.0f b %.0f→%.0f moved=%.1f" % [_v[0], _a.get("hp"), _v[1], _b.get("hp"), moved])
				_next()
		3: # ③ 주인공 Q 불새 깃
			if _frame == 1:
				_use(0)
				_put(_a.global_position + Vector3(0.0, 0.3, 1.8))
			if _frame == 10:
				_fc.get("_energy")["self"] = 100.0
				var burst_ok: bool = _fc.call("burst")
				_a.call("set_aura", "")
				_fc.set("_attack_t", 0.0)
				var hit: bool = _fc.call("attack")
				_v = [burst_ok, _fc.call("infusion_of", "self"), hit, _a.get("aura")]
			if _frame == 50:
				_fc.get("_infuse")["self"].left = 0.0
				_a.call("set_aura", "")
				_fc.set("_attack_t", 0.0)
				_fc.call("attack")
				var ok: bool = bool(_v[0]) and _v[1] == "fire" and bool(_v[2]) and _v[3] == "fire" and _a.get("aura") == "" and _fc.call("infusion_of", "self") == ""
				_check("self_infuse", ok, "burst=%s inf=%s aura=%s after=%s" % [_v[0], _v[1], _v[3], _a.get("aura")])
				_next()
		4: # ④ 현책 E 팔괘진 — 바꿔도 남는다
			if _frame == 1:
				_use(1)
				_put(_a.global_position + Vector3(0.0, 0.3, 2.0))
			if _frame == 5:
				_v = [_a.get("hp"), _fc.call("skill")]
				_fc.set("active", 0) # 바로 주인공으로
			if _frame == 110:
				var zone := _kinds().count("kit_zone")
				var ok: bool = bool(_v[1]) and zone == 1 and float(_a.get("hp")) < float(_v[0])
				_check("zhuge_zone", ok, "zone=%d a %.0f→%.0f" % [zone, _v[0], _a.get("hp")])
				_next()
		5: # ⑤ 현책 Q 천기 뇌우
			if _frame == 1:
				_use(1)
				_fc.get("_energy")["sg_zhugeliang"] = 100.0
				_fc.get("_energy")["kr_yisunsin"] = 0.0
				var ok_b: bool = _fc.call("burst")
				_v = [ok_b, float(_fc.call("energy_of", "kr_yisunsin")), float(_fc.get("_haste_t"))]
				_fc.get("_skill_cd")["self"] = 4.0
			if _frame == 61:
				## 타격 멈춤(CombatFeel)이 시간을 늦추므로 가속 시계(_haste_t)가 흐른 만큼의 두 배가 줄었는지 본다.
				var left := float(_fc.get("_skill_cd").get("self", 0.0))
				var elapsed := float(_v[2]) - float(_fc.get("_haste_t"))
				var ok: bool = bool(_v[0]) and is_equal_approx(float(_v[1]), 15.0) and absf(float(_v[2]) - 12.0) < 0.05 and elapsed > 0.5 					and absf((4.0 - left) - 2.0 * elapsed) < 0.05
				_check("zhuge_haste", ok, "energy=%.0f haste=%.1f cd_speed=×%.1f" % [_v[1], _v[2], (4.0 - left) / maxf(elapsed, 0.01)])
				_fc.set("_haste_t", 0.0)
				_next()
		6: # ⑥ 해장 E 포탄
			if _frame == 1:
				_use(2)
				_v = [_a.get("hp"), _fc.call("skill"), _kinds().count("kit_shell")]
			if _frame == 5:
				_v.append(float(_a.get("hp")))
			if _frame == 50:
				var ok: bool = bool(_v[1]) and int(_v[2]) >= 1 and is_equal_approx(float(_v[3]), float(_v[0])) and float(_a.get("hp")) < float(_v[0]) \
					and _kinds().count("kit_shell") == 0
				_check("yisun_shells", ok, "shells=%d a %.0f→(%.0f)→%.0f" % [_v[2], _v[0], _v[3], _a.get("hp")])
				_next()
		7: # ⑦ 해장 Q 학날개 진
			_use(2)
			var before := float(_fc.call("char_atk", "self"))
			_fc.get("_energy")["kr_yisunsin"] = 100.0
			var ok_b: bool = _fc.call("burst")
			var after := float(_fc.call("char_atk", "self"))
			var bt: String = _fc.call("buff_text")
			_check("yisun_rally", ok_b and is_equal_approx(after, before * 1.2) and bt.contains("공격 +20%"), "atk %.1f→%.1f buff='%s'" % [before, after, bt])
			_fc.set("_rally_t", 0.0)
			_next()
		8: # ⑧ 결사 E 결사 방진
			_use(3)
			_fc.set("shield_hp", 0.0)
			var ok_s: bool = _fc.call("skill")
			var want := float(_fc.get("max_hp")) * 0.25
			_check("gyebaek_shield", ok_s and is_equal_approx(float(_fc.get("shield_hp")), want) and absf(float(_fc.get("_shield_t")) - 12.0) < 0.05,
				"shield=%.0f/%.0f t=%.1f" % [_fc.get("shield_hp"), want, _fc.get("_shield_t")])
			_next()
		9: # ⑨ 결사 Q 오천의 맹세
			if _frame == 1:
				_use(3)
				_fc.get("_energy")["kr_gyebaek"] = 100.0
				_v = _fc.call("burst")
				_fc.set("shield_hp", 0.0)
				_fc.call("revive_all")
			if _frame == 3:
				var hp0 := float(_fc.get("hp"))
				_fc.call("take_damage", 100.0, null)
				var d := PartyState.char_def("kr_gyebaek")
				var want := 100.0 * (1.0 - d / (d + 120.0)) * 0.7
				var lost := hp0 - float(_fc.get("hp"))
				_check("gyebaek_guard", bool(_v) and absf(lost - want) < 0.01, "lost=%.2f want=%.2f" % [lost, want])
				_fc.set("_guard_t", 0.0)
				_fc.call("revive_all")
				_next()
		10: # ⑩ 도적 두목 E 회오리 도약
			if _frame == 1:
				PartyState.members.assign(["도적_두목"])
				_use(1)
				_put(_origin)
			if _frame == 40:
				_v = [_p.global_position.y, _fc.call("skill"), _p.global_position.y]
			if _frame > 40:
				_v[2] = maxf(float(_v[2]), _p.global_position.y)
			if _frame == 100:
				var rise := float(_v[2]) - float(_v[0])
				_check("boss_updraft", bool(_v[1]) and rise > 3.0, "rise=%.2f" % rise)
				_next()
		11: # ⑪ 도적 두목 Q 돌개바람 올가미
			if _frame == 30:
				_use(1)
				_fc.get("_energy")["도적_두목"] = 100.0
				var ok_b: bool = _fc.call("burst")
				var d := -1.0
				for fx in _fc.get("_effects"):
					if fx.kind == "kit_vortex":
						d = Vector2(fx.center.x - _p.global_position.x, fx.center.z - _p.global_position.z).length()
				_check("boss_vortex", ok_b and absf(d - 7.0) < 0.3, "d=%.2f" % d)
				_next()
		12: # ⑫ 운명의 자리 1·기본 원소 스킬
			PartyState.growth["kr_gyebaek"] = {"lv": 1, "exp": 0.0, "asc": 0, "tn": 1, "ts": 1, "tb": 1, "con": 1}
			var c1 := float(_fc.call("skill_cd_of", "kr_gyebaek"))
			var plain := float(_fc.call("skill_cd_of", "kr_yeongaesomun"))
			PartyState.growth.erase("kr_gyebaek")
			_check("c1_and_default", is_equal_approx(c1, 9.6) and is_equal_approx(plain, 6.0) and not Kits.has_kit("kr_yeongaesomun"), "c1=%.2f plain=%.2f" % [c1, plain])
			_next()
		13:
			PartyState.members.assign(_members_before)
			print("KIT_PROBE_DONE fails=%d" % _fails)
			get_tree().quit()

## 멈춰 둔 허수아비 — 체력만 크고 움직이지 않는다(피해·부착은 그대로 받는다).
func _dummy(pos: Vector3) -> Node3D:
	var e: CharacterBody3D = FieldEnemy.new()
	e.name = "KitDummy_%d" % get_child_count()
	e.setup("wolf", pos, 20260824 + get_child_count())
	e.respawns = false
	e.drops = false
	add_child(e)
	e.set("max_hp", 1.0e6)
	e.set("hp", 1.0e6)
	e.process_mode = Node.PROCESS_MODE_DISABLED
	return e

## 그 명단 자리 인물로, 재사용 대기·남은 효과를 비우고.
func _use(index: int) -> void:
	_fc.set("active", index)
	(_fc.get("_skill_cd") as Dictionary).clear()
	(_fc.get("_effects") as Array).clear()

func _kinds() -> Array:
	return (_fc.get("_effects") as Array).map(func(fx: Dictionary) -> String: return String(fx.kind))

func _put(pos: Vector3) -> void:
	_p.global_position = pos
	_p.velocity = Vector3.ZERO

func _check(name: String, ok: bool, detail: String) -> void:
	if not ok:
		_fails += 1
	print("KIT_PROBE %s %s %s" % [name, "ok" if ok else "FAIL", detail])

func _next() -> void:
	_step += 1
	_frame = 0
