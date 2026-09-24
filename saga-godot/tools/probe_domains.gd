extends Node
## GO 비경(106장 ⑳) 자동 점검 — 평소엔 안 붙는다. test_village.gd 가 SAGA_DOMAIN_PROBE 가 있을 때만 단다.
##
##   SAGA_DOMAIN_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/world/TestVillage.tscn
##
## ① 입구 셋·원기 가득 160 ② 입구 곁 → 단계 창(III 잠김) ③ 들어가기 → 원판·지도 안 열림 ④ 3초 뒤 파도 1(도적 셋) →
## 다 쓰러뜨리면 파도 2 · 전리품 없음 · 서당 지맥(기력 +8) ⑤ 다 쓰러뜨리면 보상 나무 → 원기 20·보상·입구로
## ⑥ 시간 초과 실패(원기 그대로·적 치움·쇠부리 공격 ×1.3) ⑦ 모두 쓰러짐 실패·무덤 지맥(물) ⑧ II 단계 체력 ×2·성유물 ★4 2·★5 1
## ⑨ 원기 8분에 1 · 모자라면 못 받음. 저장은 안 한다.

const Domains := preload("res://games/saga_go/data/domains.gd")
const FieldEnemy := preload("res://games/saga_go/combat/field_enemy.gd")

var _p: CharacterBody3D
var _dm: Node
var _fc: Node
var _frame := 0
var _step := 0
var _fails := 0
var _v: Variant = null
var _lv0 := 0

func _ready() -> void:
	Weather.force("clear")
	_p = get_tree().get_first_node_in_group("player")

func _physics_process(_delta: float) -> void:
	_frame += 1
	if _dm == null:
		_dm = get_tree().get_first_node_in_group("go_domains")
		_fc = get_tree().get_first_node_in_group("go_field_combat")
		_lv0 = PartyState.level
		return
	match _step:
		0: # ① 입구·원기
			var ok := true
			for id in Domains.ORDER:
				ok = ok and _dm.call("gate_pos", id) != Vector3.INF
			PartyState.resin_t = 0.0
			_check("layout", ok and Domains.resin_now() == 160 and Domains.level_open(0), "resin=%d" % PartyState.resin)
			_next()
		1: # ② 단계 창
			if _frame == 1:
				PartyState.level = 0
				_stand(_dm.call("gate_pos", "school") + Vector3(0.0, 0.0, 1.5))
			if _frame == 5:
				var near: String = _dm.call("near_gate")
				_dm.call("open_menu", "school")
				var opened: bool = _dm.call("is_menu_open") and _dm.is_in_group("ui_modal") and bool(_p.get("frozen"))
				var locked := not Domains.level_open(2)
				var entered_locked: bool = _dm.call("enter", "school", 2)
				_dm.call("close_menu")
				_check("menu", near == "school" and opened and locked and not entered_locked and not _dm.is_in_group("ui_modal"),
					"near=%s opened=%s" % [near, opened])
				_next()
		2: # ③ 들어가기
			var ok: bool = _dm.call("enter", "school", 0)
			var arena: Vector3 = Domains.DOMAINS.school.arena
			var wm := get_tree().get_first_node_in_group("go_world_map")
			wm.call("open_map")
			var map_blocked := not bool(wm.get("is_open"))
			_check("enter", ok and _dm.call("state_name") == "starting" and _p.global_position.distance_to(arena) < Domains.ARENA_R \
				and _dm.is_in_group("go_domain_active") and map_blocked, "state=%s dist=%.1f" % [_dm.call("state_name"), _p.global_position.distance_to(arena)])
			_next()
		3: # ④ 파도
			if _frame == 1:
				_v = null
			if _v == null and _dm.call("state_name") == "fighting":
				var alive: Array = _dm.call("alive_enemies")
				var m0 := PartyState.count("mora")
				var e0: float = _fc.call("energy_of", "self")
				for e in alive:
					e.call("_die")
				var e1: float = _fc.call("energy_of", "self")
				_v = [alive.size(), alive[0].get("kind"), m0, e1 - e0]
			if _v != null and _frame > 200:
				var alive2: Array = _dm.call("alive_enemies")
				var ok: bool = int(_v[0]) == 3 and _v[1] == "bandit" and int(_dm.get("wave")) == 1 and alive2.size() == 2 \
					and PartyState.count("mora") == int(_v[2]) and absf(float(_v[3]) - 24.0) < 0.01
				_check("waves", ok, "w1=%d kind=%s wave=%d w2=%d energy+%.1f" % [_v[0], _v[1], _dm.get("wave"), alive2.size(), _v[3]])
				for e in alive2:
					e.call("_die")
				_next()
		4: # ⑤ 보상 나무
			if _frame == 3:
				_v = [_dm.call("state_name"), PartyState.count("talent_1"), PartyState.count("mora"), Domains.resin_now()]
				_stand(Domains.DOMAINS.school.arena + Vector3(0.0, 0.2, 1.0))
			if _frame == 8:
				var ok: bool = _v[0] == "cleared" and bool(_dm.get("claimed")) and Domains.resin_now() == int(_v[3]) - 20 \
					and PartyState.count("talent_1") == int(_v[1]) + 3 and PartyState.count("mora") == int(_v[2]) + 1000
				_check("claim", ok, "state=%s resin %d→%d talent_1 %d→%d" % [_v[0], _v[3], Domains.resin_now(), _v[1], PartyState.count("talent_1")])
			if _frame == 200:
				var back: float = _p.global_position.distance_to(_dm.call("gate_pos", "school"))
				_check("leave", _dm.call("state_name") == "outside" and back < 6.0 and not _dm.is_in_group("go_domain_active"), "back=%.1f" % back)
				_next()
		5: # ⑥ 시간 초과
			if _frame == 1:
				_v = Domains.resin_now()
				_dm.call("enter", "forge", 0)
			if _frame == 200:
				var dmul: float = (_dm.call("alive_enemies") as Array)[0].get("dmg_mul")
				_dm.set("time_left", 0.01)
				_v = [_v, dmul]
			if _frame == 205:
				var left := 0
				for c in _dm.get_children():
					if c is FieldEnemy and not c.is_queued_for_deletion():
						left += 1
				_check("fail_time", _dm.call("state_name") == "outside" and _dm.get("last_result") == "fail_time" and Domains.resin_now() == int(_v[0]) \
					and absf(float(_v[1]) - 1.3) < 0.001 and left == 0, "result=%s dmg_mul=%.2f left=%d" % [_dm.get("last_result"), _v[1], left])
				_next()
		6: # ⑦ 모두 쓰러짐 · 물 지맥
			if _frame == 1:
				_dm.call("enter", "tomb", 0)
			if _frame == 200:
				var wet := 0
				for e in _dm.call("alive_enemies"):
					if e.get("aura") == "water":
						wet += 1
				_fc.emit_signal("party_wiped")
				_check("fail_wipe", wet >= 2 and _dm.call("state_name") == "outside" and _dm.get("last_result") == "fail_wipe", "wet=%d result=%s" % [wet, _dm.get("last_result")])
				_next()
		7: # ⑧ II 단계
			if _frame == 1:
				PartyState.level = 3
				_v = PartyState.artifacts.size()
				_dm.call("enter", "tomb", 1)
			if _frame == 200:
				var wolf_hp := 0.0
				for e in _dm.call("alive_enemies"):
					if e.get("kind") == "wolf":
						wolf_hp = e.get("max_hp")
					e.call("_die")
				_v = [_v, wolf_hp]
			if _frame == 203:
				for e in _dm.call("alive_enemies"):
					e.call("_die")
			if _frame == 206:
				_stand(Domains.DOMAINS.tomb.arena + Vector3(0.0, 0.2, 1.0))
			if _frame == 212:
				var got: int = PartyState.artifacts.size() - int(_v[0])
				var fives := 0
				for uid in PartyState.artifacts:
					if int(PartyState.artifacts[uid].rarity) == 5:
						fives += 1
				_check("level2", is_equal_approx(float(_v[1]), FieldEnemy.KINDS.wolf.hp * 2.0) and got == 3 and fives >= 1 and bool(_dm.get("claimed")),
					"wolf_hp=%.0f got=%d fives=%d" % [_v[1], got, fives])
			if _frame == 380:
				_next()
		8: # ⑨ 원기 회복·모자람
			PartyState.resin = 10
			PartyState.resin_t = Domains.now() - Domains.RESIN_SEC * 3.0 - 5.0
			var r := Domains.resin_now()
			var spent := Domains.spend_resin(20)
			PartyState.resin = 160
			PartyState.resin_t = Domains.now() - 1000.0
			Domains.spend_resin(20)
			var clock_reset := absf(float(PartyState.resin_t) - Domains.now()) < 1.0
			_check("resin", r == 13 and not spent and PartyState.resin == 140 and clock_reset, "r=%d spent=%s after=%d" % [r, spent, PartyState.resin])
			PartyState.level = _lv0
			_next()
		9:
			print("DOMAIN_PROBE_DONE fails=%d" % _fails)
			get_tree().quit()

func _stand(at: Vector3) -> void:
	_p.global_position = at + Vector3.UP * 0.4
	_p.velocity = Vector3.ZERO

func _check(name: String, ok: bool, detail: String) -> void:
	if not ok:
		_fails += 1
	print("DOMAIN_PROBE %s %s %s" % [name, "ok" if ok else "FAIL", detail])

func _next() -> void:
	_step += 1
	_frame = 0
