extends Node
## GO 들판 전투(games/saga_go/combat/) 자동 점검 — 평소엔 안 붙는다. test_village.gd 가
## SAGA_COMBAT_PROBE 가 있을 때만 단다.
##
##   SAGA_COMBAT_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/world/TestVillage.tscn
##
## ① 반응 표 ② 적 무리 수 ③ 기본 공격으로 늑대를 잡으면 경험치 ④ 증발 ×1.5
## ⑤ 과부하 광역 ⑥ 감전 지속 ⑦ 가만히 서 있으면 적에게 맞는다 ⑧ 회피 중 무적
## ⑨ 쓰러지면 안전한 곳에서 체력 가득 ⑩ 인물 교체 명단. 저장은 안 한다.

const Elements := preload("res://games/saga_go/combat/elements.gd")
const TestMap := preload("res://games/saga_go/data/test_map.gd")

var _p: CharacterBody3D
var _fc: Node
var _frame := 0
var _step := 0
var _fails := 0
var _target: Node = null
var _exp0 := 0.0
var _hp0 := 0.0

func _ready() -> void:
	Weather.force("clear")
	_p = get_tree().get_first_node_in_group("player")

func _physics_process(_delta: float) -> void:
	_frame += 1
	if _fc == null:
		_fc = get_tree().get_first_node_in_group("go_field_combat")
		return
	match _step:
		0:
			var ok := Elements.reaction_of("water", "fire") == "vaporize" \
				and Elements.reaction_of("fire", "thunder") == "overload" \
				and Elements.reaction_of("thunder", "water") == "electro" \
				and Elements.reaction_of("fire", "fire") == "" and Elements.reaction_of("", "fire") == ""
			_check("reaction_table", ok, "")
			var n := get_tree().get_nodes_in_group("field_enemy").size()
			_check("spawn_count", n == 13, "n=%d" % n)
			_next()
		1: # ③ 마을 서쪽 늑대 무리 한 마리 앞에 서서 기본 공격 연타
			if _frame == 1:
				_target = _enemy_near(TestMap.world_pos(1, 4))
				_exp0 = PartyState.exp
				_place_facing(_target)
			if _frame > 1 and _frame % 20 == 0 and not _target.call("is_dead"):
				_place_facing(_target)
				_fc.call("attack")
			if _target.call("is_dead"):
				_check("kill_exp", PartyState.exp > _exp0, "exp %.1f→%.1f f=%d" % [_exp0, PartyState.exp, _frame])
				_next()
			elif _frame == 1200:
				_check("kill_exp", false, "timeout hp=%.1f" % float(_target.get("hp")))
				_next()
		2: # ④ 증발 — 수 부착 뒤 화 한 방
			var e := _enemy_near(TestMap.world_pos(1, 4))
			e.call("set_aura", "water")
			var dealt: float = _fc.call("_deal", e, 20.0, "fire", Vector3.FORWARD)
			_check("vaporize", is_equal_approx(dealt, 30.0) and _fc.get("last_reaction") == "vaporize" and e.get("aura") == "", "dealt=%.1f" % dealt)
			_next()
		3: # ⑤ 과부하 — 뇌 부착 적을 화로 치면 둘레의 다른 적도 맞는다
			var e := _enemy_near(TestMap.world_pos(1, 4))
			var others: Array = []
			for o in get_tree().get_nodes_in_group("field_enemy"):
				if o != e and not o.call("is_dead"):
					others.append(o)
			var o: Node3D = others[0]
			o.global_position = (e as Node3D).global_position + Vector3(1.5, 0, 0)
			var hp_before: float = o.get("hp")
			e.call("set_aura", "thunder")
			_fc.call("_deal", e, 20.0, "fire", Vector3.FORWARD)
			_check("overload", _fc.get("last_reaction") == "overload" and float(o.get("hp")) < hp_before, "other %.1f→%.1f" % [hp_before, float(o.get("hp"))])
			_next()
		4: # ⑥ 감전 — 2초 동안 체력이 계속 준다
			if _frame == 1:
				_target = _enemy_near(TestMap.world_pos(9, 5))
				_target.call("set_aura", "water")
				_fc.call("_deal", _target, 10.0, "thunder", Vector3.FORWARD)
				_hp0 = _target.get("hp")
			if _frame == 150:
				var hp: float = _target.get("hp")
				_check("electro_dot", _hp0 - hp > 10.0, "hp %.1f→%.1f" % [_hp0, hp])
				_next()
		5: # ⑦ 도적 앞에 가만히 서 있기
			if _frame == 1:
				_hp0 = _fc.get("hp")
				_place_facing(_target)
			if _frame == 360:
				var hp: float = _fc.get("hp")
				_check("take_hit", hp < _hp0, "hp %.1f→%.1f" % [_hp0, hp])
				_next()
		6: # ⑧ 회피 중엔 안 맞는다
			if _frame == 1:
				_p.stamina = _p.STAMINA_MAX
				var ok: bool = _p.call("start_dodge")
				_hp0 = _fc.get("hp")
				_fc.call("take_damage", 50.0, null)
				var hp: float = _fc.get("hp")
				_check("dodge_iframe", ok and is_equal_approx(hp, _hp0), "started=%s hp %.1f→%.1f" % [ok, _hp0, hp])
			if _frame == 30:
				_next()
		7: # ⑨ 쓰러짐 → 안전한 곳에서 가득
			_fc.set("hp", 1.0)
			_fc.call("take_damage", 500.0, null)
			var full: bool = is_equal_approx(float(_fc.get("hp")), float(_fc.get("max_hp")))
			_check("down_respawn", full, "hp=%.1f" % float(_fc.get("hp")))
			_next()
		8: # ⑩ 명단 — 나 + 등용한 동료 앞 셋
			var r: Array = _fc.call("roster")
			var uniq: Array = []
			for m in PartyState.members:
				if not uniq.has(m):
					uniq.append(m)
			var want := 1 + mini(3, uniq.size())
			_check("roster", r.size() == want and r[0] == "self", "size=%d want=%d" % [r.size(), want])
			_next()
		9:
			print("COMBAT_PROBE_DONE fails=%d" % _fails)
			get_tree().quit()

func _enemy_near(pos: Vector3) -> Node:
	var best: Node = null
	var best_d := 1e9
	for e in get_tree().get_nodes_in_group("field_enemy"):
		if e.call("is_dead"):
			continue
		var d := ((e as Node3D).global_position - pos).length()
		if d < best_d:
			best_d = d
			best = e
	return best

## 적 바로 앞 1.6m 에 세우고 적 쪽을 보게.
func _place_facing(e: Node) -> void:
	var ep: Vector3 = (e as Node3D).global_position
	_p.global_position = ep + Vector3(0, 0.3, 1.6)
	_p.velocity = Vector3.ZERO
	_p.call("face_toward", ep)

func _check(name: String, ok: bool, detail: String) -> void:
	if not ok:
		_fails += 1
	print("COMBAT_PROBE %s %s %s" % [name, "ok" if ok else "FAIL", detail])

func _next() -> void:
	_step += 1
	_frame = 0
