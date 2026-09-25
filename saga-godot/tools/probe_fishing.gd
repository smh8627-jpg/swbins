extends Node
## GO 낚시(PLAN 106장 ㊷, world/fishing.gd · data/fishing.gd) 자동 점검 — 평소엔 안 붙는다.
## test_village.gd 가 SAGA_FISH_PROBE 가 있을 때만 단다.
##
##   SAGA_FISH_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/world/TestVillage.tscn
##
## ① 표(물고기 여덟·미끼·낚시터 물고기·가방 이름·작살·바꾸기) ② 자리(서는 곳 땅·던지는 곳 물·거리·적 무리와 25m+·게시판 땅)
## ③ 들어가기(얼림·낚싯대·던질 자리 고리) ④ 땅에 던지면 안 됨 → 물에 던지면 미끼 하나 씀
## ⑤ 건드릴 때 당기면 달아남 ⑥ 입질 → 줄다리기 → 잡음(가방·기록·그 자리 비움·경험) ⑦ 좋아하는 물고기가 없으면 "오지 않는다"
## ⑧ 줄다리기에서 안 누르면 놓침 ⑨ RESPAWN_SEC 뒤 다시 섬 ⑩ 낚시 조합 — 작살(처음 얻음)·냥 ⑪ 그만 → 풀림.
## 가방·낚시 상태·무기·경험은 끝에 되돌린다. 저장은 안 한다.

const Fishing := preload("res://games/saga_go/data/fishing.gd")
const FishingWorld := preload("res://games/saga_go/world/fishing.gd")
const Growth := preload("res://games/saga_go/data/growth.gd")
const Weapons := preload("res://games/saga_go/data/weapons.gd")
const Cooking := preload("res://games/saga_go/data/cooking.gd")

var _p: CharacterBody3D
var _fw: Node
var _frame := 0
var _step := 0
var _fails := 0
var _saved := {}
var _v: Variant = null
var _exp0 := 0.0

func _ready() -> void:
	Weather.force("clear")
	_p = get_tree().get_first_node_in_group("player")

func _physics_process(_delta: float) -> void:
	_frame += 1
	if _fw == null:
		_fw = get_tree().get_first_node_in_group("go_fishing")
		_frame = 0
		return
	match _step:
		0: # ① 표
			var bad: Array = []
			for f in Fishing.FISH_ORDER:
				var d := Fishing.fish(f)
				if d.is_empty() or not Fishing.BAITS.has(String(d.bait)) or not Growth.ITEMS.has(Fishing.item_id(f)) or not (String(d.era) in ["과거", "현대", "미래"]):
					bad.append(f)
			for sid in Fishing.SPOT_ORDER:
				for f in Fishing.spot(sid).fish:
					if not Fishing.FISH.has(f):
						bad.append("%s:%s" % [sid, f])
			for row in Fishing.EXCHANGE:
				for f in row.cost:
					if not Fishing.FISH.has(f):
						bad.append("x:" + f)
			var ok: bool = bad.is_empty() and Fishing.FISH.size() == 8 and Weapons.WEAPONS.has("w_polearm_catch") and Weapons.info("w_polearm_catch").type == "polearm"
			_check("tables", ok, str(bad))
			_next()
		1: # ② 자리
			var bad: Array = []
			for sid in Fishing.SPOT_ORDER:
				var sp := Fishing.spot(sid)
				var st: Vector3 = FishingWorld.stand_pos(sid)
				var cc: Vector3 = FishingWorld.cast_center(sid)
				var d := Vector2(st.x - cc.x, st.z - cc.z).length()
				if FishingWorld.is_water(String(sp.region), st) or st.y < -0.2:
					bad.append("%s 서는 곳 물(%.1f)" % [sid, st.y])
				if not FishingWorld.is_water(String(sp.region), cc):
					bad.append("%s 던지는 곳 땅" % sid)
				if d < Fishing.CAST_MIN or d > Fishing.CAST_MAX:
					bad.append("%s 거리 %.1f" % [sid, d])
				for e in get_tree().get_nodes_in_group("field_enemy"):
					var hm: Vector3 = e.get("home")
					if Vector2(hm.x - st.x, hm.z - st.z).length() < 25.0:
						bad.append("%s 적 %.0fm" % [sid, Vector2(hm.x - st.x, hm.z - st.z).length()])
			var bp: Vector3 = FishingWorld.board_pos()
			if FishingWorld.is_water("coast", bp):
				bad.append("게시판 물")
			_check("layout", bad.is_empty(), ", ".join(bad))
			_next()
		2: # ③ 들어가기
			if _frame == 1:
				_saved = {"bag": PartyState.bag.duplicate(true), "fishing": PartyState.fishing.duplicate(true), "weapons": PartyState.weapons.duplicate(true), "exp": PartyState.exp}
				PartyState.fishing = {}
				PartyState.bag["honey_flower"] = 6
				PartyState.bag["apple"] = 3
				PartyState.bag["meat"] = 3
				_fw.set("bait", "honey_flower")
				_put(FishingWorld.stand_pos("v_river_w"))
			if _frame == 30:
				var ok: bool = String(_fw.call("near_spot")) == "v_river_w" and _fw.call("begin", "")
				var rod: Node = _p.get_node_or_null("Visual/FishingRod")
				_check("begin", ok and String(_fw.call("state_name")) == "aim" and bool(_p.get("frozen")) and rod != null, "state=%s frozen=%s rod=%s" % [_fw.call("state_name"), _p.get("frozen"), rod != null])
				_next()
		3: # ④ 땅에 던지기 안 됨 → 물
			var st: Vector3 = FishingWorld.stand_pos("v_river_w")
			var cc: Vector3 = FishingWorld.cast_center("v_river_w")
			_fw.set("reticle", _fw.call("_clamp_reticle", st + (st - cc)))
			var land_no: bool = not _fw.call("cast")
			_fw.set("reticle", _fw.call("_clamp_reticle", cc))
			var n0 := PartyState.count("honey_flower")
			var yes: bool = _fw.call("cast")
			_check("cast", land_no and yes and PartyState.count("honey_flower") == n0 - 1 and String(_fw.call("state_name")) == "wait", "land_no=%s yes=%s bait %d→%d" % [land_no, yes, n0, PartyState.count("honey_flower")])
			_next()
		4: # ⑤ 건드릴 때 당기면 달아남
			if String(_fw.call("state_name")) == "nibble":
				_fw.call("press", "fish", true)
				_fw.call("press", "fish", false)
				_check("early_scare", String(_fw.get("last_result")) == "scared" and String(_fw.call("state_name")) == "aim", "result=%s" % _fw.get("last_result"))
				_next()
			elif _frame > 900:
				_check("early_scare", false, "no nibble state=%s" % _fw.call("state_name"))
				_next()
		5: # ⑥ 입질 → 줄다리기 → 잡음 — 찌가 칸 아래면 누르고 위면 뗀다
			if _frame == 1:
				_exp0 = PartyState.exp
				_v = int(_fw.call("fish_left", "v_river_w"))
				_fw.call("cast")
			var s: String = _fw.call("state_name")
			if s == "bite":
				_fw.call("press", "fish", true)
			elif s == "reel":
				_fw.set("holding", float(_fw.get("cursor")) < float(_fw.get("zone_c")))
			var res: String = _fw.get("last_result")
			if res.begins_with("caught:"):
				var fid := res.substr(7)
				var log: Dictionary = PartyState.fishing.get("log", {})
				var gone: Dictionary = PartyState.fishing.get("gone", {})
				_check("catch", Fishing.likes(fid, "honey_flower") and PartyState.count(Fishing.item_id(fid)) >= 1 and int(log.get(fid, 0)) == 1 \
					and gone.size() == 1 and int(_fw.call("fish_left", "v_river_w")) == int(_v) - 1 and PartyState.exp > _exp0, "fish=%s left %d→%d gone=%d" % [fid, _v, _fw.call("fish_left", "v_river_w"), gone.size()])
				_next()
			elif res == "escaped" or _frame > 2400:
				_check("catch", false, "res=%s state=%s f=%d" % [res, s, _frame])
				_next()
		6: # ⑦ 올 물고기가 없으면 — 다 놀라게 해 두고 던짐
			if _frame == 1:
				for f in (_fw.get("_fish") as Dictionary)["v_river_w"]:
					f.scared = 999.0
				_fw.set("last_result", "")
				_fw.call("cast")
			if String(_fw.get("last_result")) == "no_fish":
				_check("no_fish", String(_fw.call("state_name")) == "aim" and _frame >= int(Fishing.WAIT_MAX * 60.0) - 5, "f=%d" % _frame)
				for f in (_fw.get("_fish") as Dictionary)["v_river_w"]:
					f.scared = 0.0
				_next()
			elif _frame > int(Fishing.WAIT_MAX * 60.0) + 120:
				_check("no_fish", false, "state=%s" % _fw.call("state_name"))
				_next()
		7: # ⑧ 줄다리기에서 손을 놓고 있으면 놓침
			if _frame == 1:
				_fw.set("last_result", "")
				_fw.call("cast")
			var s: String = _fw.call("state_name")
			if s == "bite":
				_fw.call("press", "fish", true)
				_fw.call("press", "fish", false)
			elif s == "reel":
				_fw.set("holding", false)
				_fw.set("zone_c", 0.9) # 찌는 바닥, 칸은 위 — 칸 밖
			var res: String = _fw.get("last_result")
			if res == "escaped":
				_check("escape", String(_fw.call("state_name")) == "aim", "")
				_next()
			elif res.begins_with("caught") or _frame > 2400:
				_check("escape", false, "res=%s" % res)
				_next()
		8: # ⑨ 다시 섬 — 잡은 시각을 RESPAWN_SEC 앞으로
			if _frame == 1:
				_v = int(_fw.call("fish_left", "v_river_w"))
				var gone: Dictionary = PartyState.fishing["gone"]
				for k in gone.keys():
					gone[k] = Cooking.now() - Fishing.RESPAWN_SEC - 1.0
			if _frame == 5:
				_check("respawn", int(_fw.call("fish_left", "v_river_w")) == int(_v) + 1, "%d→%d" % [_v, _fw.call("fish_left", "v_river_w")])
				_next()
		9: # ⑪ 그만 → 풀림
			_fw.call("press", "stop", true)
			var rod: Node = _p.get_node_or_null("Visual/FishingRod")
			_check("stop", String(_fw.call("state_name")) == "idle" and not bool(_p.get("frozen")), "state=%s frozen=%s" % [_fw.call("state_name"), _p.get("frozen")])
			_next()
		10: # ⑩ 낚시 조합
			if _frame == 1:
				_put(FishingWorld.board_pos() + Vector3(0, 0, 1.5))
				PartyState.bag[Fishing.item_id("gizzard")] = 6
				PartyState.bag[Fishing.item_id("lanternpuffer")] = 3
				PartyState.bag[Fishing.item_id("steelflounder")] = 2
				PartyState.bag[Fishing.item_id("crucian")] = 3
				PartyState.weapons.erase("w_polearm_catch")
			if _frame == 30:
				var opened: bool = _fw.call("near_board") and _fw.call("open_board")
				var mora0 := PartyState.count("mora")
				var got_spear: String = _fw.call("exchange", 0)
				var got_mora: String = _fw.call("exchange", 1)
				var again: String = _fw.call("exchange", 1) # 붕어가 없다
				_fw.call("close_board")
				_check("exchange", opened and got_spear.contains("얻음") and PartyState.weapons.has("w_polearm_catch") and PartyState.count(Fishing.item_id("gizzard")) == 0 \
					and got_mora != "" and PartyState.count("mora") == mora0 + 3000 and again == "" and not bool(_p.get("frozen")),
					"open=%s spear=%s mora=%s again=%s" % [opened, got_spear, got_mora, again])
				_next()
		11:
			PartyState.bag = _saved.bag
			PartyState.fishing = _saved.fishing
			PartyState.weapons = _saved.weapons
			PartyState.exp = _saved.exp
			print("FISH_PROBE_DONE fails=%d" % _fails)
			get_tree().quit()

func _put(pos: Vector3) -> void:
	_p.global_position = pos + Vector3(0.0, 0.4, 0.0)
	_p.velocity = Vector3.ZERO

func _check(name: String, ok: bool, detail: String) -> void:
	if not ok:
		_fails += 1
	print("FISH_PROBE %s %s %s" % ["ok  " if ok else "FAIL", name, detail])

func _next() -> void:
	_step += 1
	_frame = 0
