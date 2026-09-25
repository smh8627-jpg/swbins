extends Node
## GO 탐사 파견(PLAN 106장 ㊹, world/dispatch.gd · data/dispatch.gd) 자동 점검 — 평소엔 안 붙는다.
## test_village.gd 가 SAGA_DISPATCH_PROBE 가 있을 때만 단다.
##
##   SAGA_DISPATCH_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/world/TestVillage.tscn
##
## ① 표(탐사지·지역·원소·재료 칸·시간 배율 오름·자리 수·네 지역 모두) ② 게시판 자리(물 밖·평평·막힘 없음·의뢰 게시판·냄비·인물·지점과 떨어짐)
## ③ 둘레에서 안내 단추·F 겹침 없음(냄비·낚시) ④ 보낼 수 있는 동료(나·들판 명단 제외) ⑤ 신상 안 켠 지역은 잠김
## ⑥ 보내기 → 탐사 중(명단·편성에 못 넣음) ⑦ 같은 자리·자리 수 넘기 막힘 ⑧ 부르기 = 보상 없음
## ⑨ 시간이 흐르면 알림·받기(한 번만) ⑩ 잘 맞는 원소 +25% ⑪ 세이브 JSON 을 거쳐도 그대로 ⑫ 화면(얼림·목록·고르기·보내기).
## 탐사·가방·명단·지점·시각은 끝에 되돌린다. 저장은 안 한다.

const Dispatch := preload("res://games/saga_go/data/dispatch.gd")
const DispatchNode := preload("res://games/saga_go/world/dispatch.gd")
const Growth := preload("res://games/saga_go/data/growth.gd")
const Elements := preload("res://games/saga_go/combat/elements.gd")
const Characters := preload("res://saga_core/data/characters.gd")
const Commissions := preload("res://games/saga_go/data/commissions.gd")
const Story := preload("res://games/saga_go/data/story.gd")
const WorldQuests := preload("res://games/saga_go/data/world_quests.gd")
const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")
const WorldMap := preload("res://games/saga_go/ui/world_map.gd")

var _p: Node3D
var _d: Node
var _frame := 0
var _step := 0
var _fails := 0
var _saved := {}
var _m: Array[String] = [] # 점검에 쓸 동료(명단 밖)

func _ready() -> void:
	Weather.force("clear")
	_p = get_tree().get_first_node_in_group("player")

func _physics_process(_delta: float) -> void:
	_frame += 1
	if _d == null:
		_d = get_tree().get_first_node_in_group("go_dispatch")
		_frame = 0
		return
	if _frame < 3 and _step == 0:
		return
	match _step:
		0: # ① 표
			var bad: Array = []
			if Dispatch.ORDER.size() != Dispatch.SPOTS.size():
				bad.append("order")
			var eras := {}
			for id in Dispatch.ORDER:
				var s := Dispatch.spot(id)
				eras[s.era] = true
				if not WorldMap.REGION_STATUE.has(String(s.region)) or not Elements.ORDER.has(String(s.element)):
					bad.append(id)
				for k in s.base:
					if not Growth.ITEMS.has(k):
						bad.append(id + " " + k)
				var last := {}
				for h in Dispatch.HOURS:
					var r := Dispatch.reward_of(id, h, false)
					var ra := Dispatch.reward_of(id, h, true)
					for k in r:
						if int(r[k]) < int(last.get(k, 0)) or int(ra[k]) <= int(r[k]) - 1 or int(ra[k]) < int(r[k]):
							bad.append("%s %dh %s" % [id, h, k])
					last = r
			var sl := [Dispatch.slots_for_ar(1), Dispatch.slots_for_ar(5), Dispatch.slots_for_ar(10), Dispatch.slots_for_ar(15), Dispatch.slots_for_ar(60)]
			var regs := {}
			for id in Dispatch.ORDER:
				regs[String(Dispatch.spot(id).region)] = int(regs.get(String(Dispatch.spot(id).region), 0)) + 1
			for r in WorldMap.REGION_STATUE:
				if int(regs.get(r, 0)) != 2:
					bad.append("region %s=%d" % [r, int(regs.get(r, 0))])
			_check("tables", bad.is_empty() and eras.size() == 3 and sl == [2, 3, 4, 5, 5], "bad=%s eras=%s slots=%s" % [bad, eras.keys(), sl])
			_next()
		1: # ② 게시판 자리
			var b := DispatchNode.board_pos()
			var bad: Array = []
			if b.y < TerrainBuilder.WATER_LEVEL + 0.3:
				bad.append("water %.2f" % b.y)
			for o in [Vector3(1, 0, 0), Vector3(-1, 0, 0), Vector3(0, 0, 1), Vector3(0, 0, -1)]:
				if absf(TerrainBuilder.height_at("village", b + o) - b.y) > 0.6:
					bad.append("slope")
					break
			var cb := TestMap.world_pos(Commissions.BOARD_CELL.x, Commissions.BOARD_CELL.y, "village") + Commissions.BOARD_OFFSET
			var near := {"commission_board": cb, "station": TestMap.world_pos(Dispatch.BOARD_CELL.x, Dispatch.BOARD_CELL.y, "village")}
			for tbl in [Story.NPCS, WorldQuests.NPCS]:
				for nid in tbl:
					if String(tbl[nid].get("region", "")) == "village":
						near[nid] = TestMap.world_pos(tbl[nid].cell.x, tbl[nid].cell.y, "village")
			var ki := get_tree().get_first_node_in_group("go_kitchen")
			var pi := 0
			for pp in (ki.get("_pots") if ki else []):
				near["pot%d" % pi] = pp
				pi += 1
			var mind := 999.0
			for k in near:
				var dd := Vector2(b.x - near[k].x, b.z - near[k].z).length()
				mind = minf(mind, dd)
				if dd < 5.0:
					bad.append("%s %.1fm" % [k, dd])
			var q := PhysicsShapeQueryParameters3D.new()
			var sph := SphereShape3D.new()
			sph.radius = 0.7
			q.shape = sph
			q.transform = Transform3D(Basis(), b + Vector3(0, 1.3, 0))
			q.exclude = [(_p as CollisionObject3D).get_rid()]
			var hits := _p.get_world_3d().direct_space_state.intersect_shape(q, 8)
			if not hits.is_empty():
				bad.append("blocked %s" % hits.map(func(h: Dictionary) -> String: return str(h.collider.name)))
			_check("board_spot", bad.is_empty(), "bad=%s min=%.1fm pos=%s" % [bad, mind, b])
			_next()
		2: # ③ 안내 단추·F 겹침
			if _frame == 1:
				_saved = {"dispatch": PartyState.dispatch.duplicate(true), "bag": PartyState.bag.duplicate(true), "members": PartyState.members.duplicate(),
					"party_size": PartyState.party_size, "presets": PartyState.presets.duplicate(true), "preset_i": PartyState.preset_i,
					"resolved": EventState.resolved.duplicate(), "pos": _p.global_position}
				PartyState.dispatch = {}
				_p.global_position = DispatchNode.board_pos() + Vector3(1.5, 0.6, 1.0)
			if _frame == 6:
				var fi := get_tree().get_first_node_in_group("go_fishing")
				var ki := get_tree().get_first_node_in_group("go_kitchen")
				var btn: Button = _d.get("_prompt_btn")
				var clash := (fi != null and (String(fi.call("near_spot")) != "" or bool(fi.call("near_board")))) or (ki != null and bool(ki.call("near_pot")))
				_check("prompt", bool(_d.call("near_board")) and btn.visible and not clash, "near=%s btn=%s clash=%s" % [_d.call("near_board"), btn.visible, clash])
				_next()
		3: # ④ 보낼 수 있는 동료 — 명단 밖 동료가 모자라면 도감 인물을 잠깐 더한다(끝에 되돌림)
			for h in Characters.HEROES:
				if _m.size() + (_d.call("candidates") as Array).size() >= 6:
					break
				var hid := String(h.id)
				if not PartyState.members.has(hid):
					PartyState.members.append(hid)
			## 잘 맞는 원소(⑩)를 실제로 보려고 옛 역참 길(풍) 인물 하나는 꼭.
			var has_wind := false
			for id in _d.call("candidates"):
				has_wind = has_wind or Elements.element_of(String(id)) == "wind"
			if not has_wind:
				for h in Characters.HEROES:
					if Elements.element_of(String(h.id)) == "wind" and not PartyState.members.has(String(h.id)):
						PartyState.members.append(String(h.id))
						break
			for id in _d.call("candidates"):
				_m.append(String(id))
			var pl := PartyState.party()
			var bad: Array = []
			for id in pl:
				if String(_d.call("why_not", id)) == "":
					bad.append(id)
			if String(_d.call("why_not", "self")) == "":
				bad.append("self")
			for id in _m:
				if PartyState.in_party(id):
					bad.append("cand " + id)
			_check("candidates", bad.is_empty() and _m.size() >= 5, "bad=%s cand=%d party=%s" % [bad, _m.size(), pl])
			_next()
		4: # ⑤ 잠김 — 폐허 신상을 잠깐 끈다
			for k in WorldMap.REGION_STATUE:
				EventState.mark_resolved("wp_" + String(WorldMap.REGION_STATUE[k]))
			EventState.resolved.erase("wp_" + String(WorldMap.REGION_STATUE.ruins))
			var err := String(_d.call("send", "d_rift", _m[0], 4))
			var locked := not bool(_d.call("unlocked", "d_rift")) and bool(_d.call("unlocked", "d_road")) and bool(_d.call("unlocked", "f_wreck"))
			EventState.mark_resolved("wp_" + String(WorldMap.REGION_STATUE.ruins))
			## ㊻-2 고원 탐사지 둘은 고원 신상으로.
			EventState.resolved.erase("wp_" + String(WorldMap.REGION_STATUE.frost))
			var err_f := String(_d.call("send", "f_fortress", _m[0], 4))
			var frost_locked := not bool(_d.call("unlocked", "f_fortress")) and not bool(_d.call("unlocked", "f_wreck")) and bool(_d.call("unlocked", "d_rift"))
			EventState.mark_resolved("wp_" + String(WorldMap.REGION_STATUE.frost))
			var frost_open := bool(_d.call("unlocked", "f_fortress")) and bool(_d.call("unlocked", "f_wreck"))
			_check("locked", locked and frost_locked and frost_open and err.contains("신상") and err_f.contains("신상") and PartyState.dispatch.get("out", {}).is_empty(),
				"locked=%s frost=%s/%s err=%s err_f=%s" % [locked, frost_locked, frost_open, err, err_f])
			_next()
		5: # ⑥ 보내기 → 탐사 중
			var err := String(_d.call("send", "d_road", _m[0], 4))
			var away := PartyState.is_away(_m[0])
			var put := PartyState.put_in_party(_m[0])
			var k := (PartyState.preset_i + 1) % PartyState.PRESET_COUNT
			PartyState.presets[k] = [_m[0]]
			var in_preset := PartyState.preset_party(k).has(_m[0])
			var no_cand := not (_d.call("candidates") as Array).has(_m[0])
			_check("send", err == "" and away and not put and not in_preset and no_cand and not PartyState.in_party(_m[0]),
				"err=%s away=%s put=%s preset=%s" % [err, away, put, in_preset])
			_next()
		6: # ⑦ 같은 자리·자리 수
			PartyState.level = maxi(PartyState.level, 0)
			var same := String(_d.call("send", "d_road", _m[1], 4))
			var slots := int(_d.call("slots"))
			var i := 1
			for spot in Dispatch.ORDER:
				if int(_d.call("used")) >= slots:
					break
				if not PartyState.dispatch.out.has(spot):
					_d.call("send", spot, _m[i], 8)
					i += 1
			var free := ""
			for spot in Dispatch.ORDER:
				if not PartyState.dispatch.out.has(spot):
					free = spot
					break
			var over := String(_d.call("send", free, _m[i], 4)) if free != "" else "자리"
			_check("limits", same.contains("이미") and int(_d.call("used")) == slots and over.contains("명까지"), "same=%s used=%d/%d over=%s" % [same, _d.call("used"), slots, over])
			_next()
		7: # ⑧ 부르기 = 보상 없음
			var bag0 := PartyState.bag.duplicate(true)
			var who := String(_d.call("member_at", "d_road"))
			var ok: bool = _d.call("recall", "d_road")
			_check("recall", ok and not PartyState.is_away(who) and PartyState.bag == bag0 and not PartyState.dispatch.out.has("d_road"), "ok=%s bag same=%s" % [ok, PartyState.bag == bag0])
			_next()
		8: # ⑨ 시간이 흐르면 알림·받기
			if _frame == 1:
				_d.call("send", "d_road", _m[0], 4)
				DispatchNode.time_offset = 4 * 3600.0 - 5.0
				_d.set("_first_check", false)
				_saved["ann"] = int(_d.get("announced"))
				_saved["early"] = bool(_d.call("is_done", "d_road"))
				DispatchNode.time_offset = 4 * 3600.0 + 2.0
			if _frame == 80:
				var m0 := PartyState.count("mora")
				var want := Dispatch.reward_of("d_road", 4, bool(_d.call("affinity", "d_road", _m[0])))
				var got: Dictionary = _d.call("claim", "d_road")
				var again: Dictionary = _d.call("claim", "d_road")
				var ann := int(_d.get("announced")) - int(_saved.ann)
				_check("claim", not _saved.early and ann >= 1 and got == want and PartyState.count("mora") == m0 + int(want.mora) and again.is_empty() and not PartyState.is_away(_m[0]) and int(PartyState.dispatch.get("done", 0)) == 1,
					"early=%s ann=%d got=%s want=%s again=%s" % [_saved.early, ann, got, want, again])
				_next()
		9: # ⑩ 잘 맞는 원소
			var aff := ""
			var plain := ""
			for id in _m:
				if PartyState.is_away(id):
					continue
				if Elements.element_of(id) == "wind" and aff == "":
					aff = id
				elif Elements.element_of(id) != "wind" and plain == "":
					plain = id
			if aff == "":
				## 명단 밖에 풍 인물이 없으면 셈만(그 인물이 있으면 보낸다).
				_check("affinity", int(Dispatch.reward_of("d_road", 20, true).mora) == ceili(1500 * 3.8 * 1.25) and not bool(_d.call("affinity", "d_road", plain)), "no wind member (table only)")
			else:
				_d.call("send", "d_road", aff, 20)
				var r: Dictionary = _d.call("reward_at", "d_road")
				_check("affinity", int(r.mora) == ceili(1500 * 3.8 * 1.25) and not bool(_d.call("affinity", "d_road", plain)), "r=%s" % r)
				_d.call("recall", "d_road")
			_next()
		10: # ⑪ 세이브 JSON 을 거쳐도
			_d.call("send", "d_road", _m[0], 12)
			var before := int(_d.call("remaining", "d_road"))
			var round: Variant = JSON.parse_string(JSON.stringify(PartyState.dispatch))
			PartyState.dispatch = (round as Dictionary).duplicate(true)
			var after := int(_d.call("remaining", "d_road"))
			_check("save_json", PartyState.is_away(_m[0]) and absi(after - before) <= 1 and after > 11 * 3600 and int(_d.call("used")) == int(_d.call("slots")),
				"before=%d after=%d used=%d" % [before, after, _d.call("used")])
			_d.call("recall", "d_road")
			_next()
		11: # ⑫ 화면
			var opened: bool = _d.call("open_screen")
			var frozen := bool(_p.get("frozen"))
			var txt: String = _d.call("list_text")
			_d.call("begin_pick", "d_road")
			_d.set("pick_hours", 8)
			var pick_vis := (_d.get("_pick_box") as Control).visible
			var n_btn := (_d.get("_members") as Node).get_child_count()
			var who := String(_d.call("candidates")[0]) if not (_d.call("candidates") as Array).is_empty() else ""
			_d.call("pick_member", who)
			var sent := String(_d.call("member_at", "d_road")) == who and int((PartyState.dispatch.out.d_road as Dictionary).hours) == 8
			var txt2: String = _d.call("list_text")
			_d.call("close_screen")
			_check("screen", opened and frozen and txt.contains("옛 역참 길") and txt.contains("시간 틈 관측소") and txt.contains("추락한 비행선 잔해") and txt.contains("부르기") and pick_vis and n_btn > 0 and sent
				and txt2.contains("탐사 중") and not bool(_p.get("frozen")), "opened=%s pick=%s btns=%d sent=%s\n%s" % [opened, pick_vis, n_btn, sent, txt2.substr(0, 400)])
			_next()
		12:
			DispatchNode.time_offset = 0.0
			PartyState.dispatch = _saved.dispatch
			PartyState.bag = _saved.bag
			PartyState.members.assign(_saved.members)
			PartyState.party_size = _saved.party_size
			PartyState.presets = _saved.presets
			PartyState.preset_i = _saved.preset_i
			EventState.resolved.assign(_saved.resolved)
			print("DISPATCH_PROBE_DONE fails=%d" % _fails)
			get_tree().quit()

func _check(name: String, ok: bool, detail: String) -> void:
	if not ok:
		_fails += 1
	print("DISPATCH_PROBE %s %s %s" % ["ok  " if ok else "FAIL", name, detail])

func _next() -> void:
	_step += 1
	_frame = 0
