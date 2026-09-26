extends Node
## GO 이야기 3부(PLAN 106장 ㊼, 13장~) 자동 점검 — 평소엔 안 붙는다. 1부는 probe_story.gd · 2부는 probe_story2.gd.
## test_village.gd 가 SAGA_STORY3_PROBE 가 있을 때만 단다.
##
##   SAGA_STORY3_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/world/TestVillage.tscn
##
## 13장 "녹슨 조선소의 날개"(㊼-1): [1] 표·자리(다온·반디가 조선소 몸에 안 묻힘·목표 칸이 바다·산이 아님·기중기 들보 윗면 높이·
## 다리 바깥면이 들보 끝면과 같은 면·도감 발견 자리) [2] 반디 → 조선소 목표(포구) [3] 조선소 [4] 다온 → 무리 [5] 무리 넷(포구에 섬)
## [6] 다온 → 기중기 [7] 오르기(땅에 서면 안 넘어감·들보 위에 서면 넘어감) [8] 반디(조선소에 날아와 있음) → 용접대
## [9] 지키기(바다 쪽 북쪽에서 안 나옴·물결 셋·"용접대") [10] 다온 → 13장 끝·보상·✔ 제13장·반디는 비행선으로.
## 14장 "시간 틈 관측소"(㊼-2): [11] 표·자리(가온·반디 자리가 명소 몸에 안 묻힘·관측대 윗면 높이·climb above·kill lift·
## 시간 기둥 밑이 관측대에 안 가림·아직 안 섬·도감) [12] 반디(비행선) → 폐허 [13] 관측소 [14] 가온(바이저) → 무리 [15] 무리 넷(폐허에 섬)
## [16] 가온 → 석등(목표 글자 "별 → 해 → 달") [17] 석등 차례(틀리면 꺼짐 [0,1,0,3]·석등이 기둥에 안 가림·다 켜면 시간 기둥이 섬)
## [18] 가온 → 오르기 [19] 오르기(땅에 서면 안 넘어감 · 시간 기둥에 실제로 뛰어들어 솟고 → 앞으로 활공해 관측대에 내려앉음)
## [20] 관측대 파수 셋(관측대 위에 섬·떨어지면 제자리로) [21] 반디(관측대 위) → 14장 끝·보상·✔ 제14장·시간 기둥은 남음.
## 15장 "옛 역참 길"(㊼-3): [22] 표·자리(달음 벙거지·명소 몸에 안 묻힘·역마 길이 골짜기 평지·동료 표·별배 아직 안 뜸·도감)
## [23] 반디 → 마을 [24] 옛 역참 길 [25] 달음 → 역마가 달아남(코드 몸 말·마구간이 빔) [26] 따라잡기 → 마구간에 말이 돌아옴
## [27] 달음 → 무리 [28] 무리 넷(마을에 섬) [29] 여우불 구미호(화·틈새 질주 원 다섯) [30] 달음 → 별배 [31] 별배(달음이 먼저 와 있음)
## [32] 날개 이음매에 불 [33] 반디 → 15장 끝·보상·달음 동료·✔ 제15장 → 별배가 FLY_H 위로 뜨고 날개가 보임.
## 이야기 상태·부대 경험·가방은 끝에 되돌린다. 저장은 안 한다.

const Story := preload("res://games/saga_go/data/story.gd")
const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")
const EraSites := preload("res://games/saga_go/world/era_sites.gd")
const Kits := preload("res://games/saga_go/data/kits.gd")
const FieldEnemy := preload("res://games/saga_go/combat/field_enemy.gd")

const CH13 := 12 # 13장(0부터)
const CH14 := 13
const CH15 := 14
const Frost := preload("res://games/saga_go/world/region4_frost.gd")

var _p: CharacterBody3D
var _sq: Node
var _frame := 0
var _step := 0
var _fails := 0
var _v: Variant = null
var _saved := {}

func _ready() -> void:
	Weather.force("clear")
	_p = get_tree().get_first_node_in_group("player") as CharacterBody3D

func _physics_process(_delta: float) -> void:
	_frame += 1
	if _sq == null:
		_sq = get_tree().get_first_node_in_group("go_story")
		_frame = 0
		return
	if _frame < 3 and _step == 0:
		return
	match _step:
		0: # 준비 — 13장 처음, 모험 등급 37(15장 ar 36 까지 열림)
			_saved = {"story": PartyState.story.duplicate(true), "members": PartyState.members.duplicate(), "exp": PartyState.exp, "level": PartyState.level,
				"bag": PartyState.bag.duplicate(true), "ar_paid": PartyState.ar_paid, "resolved": EventState.resolved.duplicate(), "pos": _p.global_position, "wq": PartyState.world_quests.duplicate(true)}
			PartyState.exp = maxf(PartyState.exp, 37.0 * PartyState.EXP_PER_LEVEL)
			PartyState.level = maxi(PartyState.level, 37)
			PartyState.ar_paid = maxi(PartyState.ar_paid, PartyState.level + 1)
			PartyState.story = {"ch": CH13, "step": 0}
			_sq.call("set_track", "")
			_sq.call("_enter_step")
			_next()
		1: # [1] 표·자리
			var c := Story.chapter(CH13)
			var bad: Array = []
			if String(c.get("id", "")) != "ch13" or int(c.ar) <= int(Story.chapter(CH13 - 1).ar):
				bad.append("chapter")
			var info: Dictionary = Story.NPCS.daon
			if String(info.region) != "coast" or not info.has("era"):
				bad.append("daon info")
			var h := _hits(_sq.call("npc_pos", "daon"))
			if not h.is_empty():
				bad.append("daon in %s" % h)
			var bw: Dictionary = Story.windows(Story.STATIONS.bandi).filter(func(w: Dictionary) -> bool: return int(w.ch) == CH13)[0]
			var bh := _hits(_cell3(bw.cell))
			if not bh.is_empty():
				bad.append("bandi in %s" % bh)
			for s in c.steps:
				if s.has("cell") and ["~", "^"].has(TestMap.tile_at(roundi(s.cell.x), roundi(s.cell.y), String(s.region))):
					bad.append("step on %s" % TestMap.tile_at(roundi(s.cell.x), roundi(s.cell.y), String(s.region)))
			## 들보 윗면 — 위에서 쏜 빛줄이 기중기 윗면(땅 + CRANE_TOP)에 닿는다. climb above 와 같다.
			var top := EraSites.crane_top()
			var ground := top.y - EraSites.CRANE_TOP
			var surf := _surface(top)
			if absf(surf - top.y) > 0.15:
				bad.append("crane top %.2f want %.2f" % [surf, top.y])
			var climb: Dictionary = (c.steps as Array)[5]
			if absf(float(climb.get("above", 0.0)) - (EraSites.CRANE_TOP + Story.CLIMB_SLACK - 0.5)) > 0.01:
				bad.append("above")
			## 다리 바깥면 = 들보 끝면 — 들보 끝 바로 밖(0.3m)에서 내려쏜 빛줄은 땅에 닿는다(튀어나온 들보 밑에 막히지 않는다).
			for side in [-1.0, 1.0]:
				var out := top + Vector3(side * (EraSites.CRANE_HALF + 0.3), 0, 0)
				if _surface(out) > ground + 1.0:
					bad.append("overhang %s" % side)
			if not get_tree().get_first_node_in_group("go_era_sites").find_child("Discover_coast_shipyard", true, false):
				bad.append("discovery")
			_check("ch13_table", bad.is_empty(), str(bad))
			_next()
		2: # [2] 반디 → 조선소
			_talk("bandi", 1, "ch13_bandi", Vector2(7.1, 4.25))
		3: # [3] 조선소
			_go(2, "ch13_shipyard", Vector2.INF)
		4: # [4] 다온 → 무리
			_talk("daon", 3, "ch13_daon", Vector2(7.0, 4.45))
		5: # [5] 무리 넷
			if _frame == 1:
				_put(_target() + Vector3(0, 0, 6))
			if _frame == 10:
				var es: Array = _sq.call("alive_quest_enemies")
				var here := es.filter(func(e: Node) -> bool: return TestMap.region_at((e as Node3D).global_position) == "coast").size()
				_v = {"n": es.size(), "coast": here}
				for e in es:
					e.call("_die")
			if _frame == 16:
				_check("ch13_kill", int(_v.n) == 4 and int(_v.coast) == 4 and int(_sq.call("st")) == 4, "n=%d coast=%d st=%d" % [_v.n, _v.coast, _sq.call("st")])
				_next()
		6: # [6] 다온 → 기중기
			_talk("daon", 5, "ch13_daon2", Vector2(7.3, 3.81))
		7: # [7] 오르기 — 땅에선 안 넘어가고, 동쪽 다리 바깥면을 실제로 타고 올라 들보 위에 서면 넘어간다
			var top := EraSites.crane_top()
			if _frame == 1:
				_put(_cell3(Vector2(7.3, 4.1)))
			if _frame == 12:
				_v = {"ground_st": int(_sq.call("st")), "grab": false}
				_p.set("stamina", 999.0)
				_put(Vector3(top.x + EraSites.CRANE_HALF + 1.5, top.y - EraSites.CRANE_TOP, top.z))
			if _frame >= 12:
				## 입력은 카메라 받침 전역 방향 기준(player.gd _world_direction) — 몸이 돌아 있어도 북쪽을 보게(왼쪽 = -x).
				var rig := get_tree().get_first_node_in_group("camera_rig") as Node3D
				if rig:
					rig.global_rotation = Vector3(rig.global_rotation.x, 0.0, 0.0)
			if _frame == 30:
				Input.action_press("move_left")
			if _frame > 30 and not bool(_v.grab) and _p.mode == _p.Mode.CLIMB:
				_v.grab = true # 붙는 순간 위로(옆으로 계속 밀면 폭 1.2m 다리 끝으로 미끄러져 떨어진다)
				Input.action_release("move_left")
				Input.action_press("move_forward")
			if _frame > 30 and int(_sq.call("st")) == 6 and not _v.has("at"):
				_v.at = _frame # 넘어간 때 — 들보 위로 다 올라서서(땅 걷기로 돌아와) 멈출 때까지 조금 더 민다
			var settled: bool = _v is Dictionary and _v.has("at") and ((_p.mode == _p.Mode.GROUND and _p.is_on_floor()) or _frame > int(_v.at) + 240)
			if _frame > 30 and (settled or _frame > 1500):
				Input.action_release("move_forward")
				_check("ch13_climb", int(_v.ground_st) == 5 and bool(_v.grab) and int(_sq.call("st")) == 6 and _p.global_position.y >= top.y - 0.6 and _p.mode == _p.Mode.GROUND,
					"ground_st=%d grab=%s st=%d y=%.1f top=%.1f mode=%d frames=%d/%d" % [_v.ground_st, _v.grab, _sq.call("st"), _p.global_position.y, top.y, _p.mode, _v.get("at", -1), _frame])
				_next()
		8: # [8] 반디(조선소) → 용접대
			if _frame == 1:
				_put(_cell3(Vector2(7.0, 4.3)))
			if _frame == 2:
				_v = _flat(_sq.call("npc_pos", "bandi"), TestMap.world_pos(7.05, 4.02, "coast"))
			if _frame < 3:
				return
			_talk("bandi", 7, "ch13_bandi2", Vector2(7.3, 4.3), "bandi_at_yard=%.1f" % float(_v), float(_v) < 1.0, 1)
		9: # [9] 지키기 — 바다(북쪽)에서 안 나옴, 물결 셋
			if _frame == 1:
				_put(_target() + Vector3(2.5, 0.0, 2.5))
				_v = {"sea": false, "waves": 0, "label": ""}
			if _frame > 4 and _frame % 6 == 0 and int(_sq.call("st")) == 7:
				var lbl := _sq.get("_defend_label") as Label3D
				if lbl and String(_v.label) == "":
					_v.label = lbl.text
				for e in _sq.call("alive_quest_enemies"):
					var ep := (e as Node3D).global_position
					if TestMap.tile_at(TestMap.grid_at("coast", ep).x, TestMap.grid_at("coast", ep).y, "coast") == "~":
						_v.sea = true
					e.call("_die")
				_v.waves = maxi(int(_v.waves), int(_sq.call("defend_wave")) + 1)
			if _frame > 4 and (int(_sq.call("st")) != 7 or _frame > 600):
				var ok: bool = int(_sq.call("st")) == 8 and not bool(_v.sea) and int(_v.waves) == 3 and String(_v.label).begins_with("용접대")
				_check("ch13_defend", ok, "st=%d sea=%s waves=%d label='%s' frames=%d" % [_sq.call("st"), _v.sea, _v.waves, _v.label, _frame])
				_next()
		10: # [10] 다온 → 13장 끝
			if _frame == 1:
				_v = {"mora": PartyState.count("mora")}
				_near_npc("daon")
			if _frame == 10:
				_sq.call("interact")
				_drain()
			if _frame < 16:
				return
			_dismiss_prompts()
			if _frame < 22:
				return
			_sq.call("toggle_journal")
			var jt: String = _sq.call("journal_text")
			_sq.call("toggle_journal")
			var bandi_home := _flat(_sq.call("npc_pos", "bandi"), TestMap.world_pos(6.0, 4.8, "frost"))
			var ok: bool = int(_sq.call("ch")) == CH13 + 1 and jt.contains("✔ 제13장") and PartyState.count("mora") >= int(_v.mora) + 55000 and bandi_home < 1.0
			_check("chapter13", ok, "ch=%d mora +%d bandi_home=%.1f" % [_sq.call("ch"), PartyState.count("mora") - int(_v.mora), bandi_home])
			_next()
		11: # [11] 14장 표·자리
			if _frame < 3:
				return
			var c := Story.chapter(CH14)
			var bad: Array = []
			if String(c.get("id", "")) != "ch14" or int(c.ar) <= int(Story.chapter(CH13).ar) or int(_sq.call("ch")) != CH14 or bool(_sq.call("locked")):
				bad.append("chapter ch=%d locked=%s" % [_sq.call("ch"), _sq.call("locked")])
			var info: Dictionary = Story.NPCS.gaon
			if String(info.region) != "ruins" or String(info.get("era", "")) != "미래" or not bool(info.get("visor", false)):
				bad.append("gaon info")
			var gh := _hits(_sq.call("npc_pos", "gaon"))
			if not gh.is_empty():
				bad.append("gaon in %s" % gh)
			var gbody := get_tree().get_first_node_in_group("go_story").find_child("StoryNpc_gaon", true, false)
			if gbody == null or gbody.find_child("Visor", true, false) == null:
				bad.append("visor")
			for s in c.steps:
				if s.has("cell") and ["~", "^"].has(TestMap.tile_at(roundi(s.cell.x), roundi(s.cell.y), String(s.region))):
					bad.append("step on %s" % TestMap.tile_at(roundi(s.cell.x), roundi(s.cell.y), String(s.region)))
			var top := EraSites.obs_top()
			if absf(_surface(top) - top.y) > 0.15:
				bad.append("deck %.2f want %.2f" % [_surface(top), top.y])
			var climb: Dictionary = (c.steps as Array)[7]
			var guard: Dictionary = (c.steps as Array)[8]
			if String(climb.type) != "climb" or absf(float(climb.above) - (EraSites.OBS_RISE + 2.0)) > 0.01 or absf(float(guard.get("lift", 0.0)) - EraSites.OBS_RISE) > 0.01:
				bad.append("climb/lift")
			var bw: Dictionary = Story.windows(Story.STATIONS.bandi).filter(func(w: Dictionary) -> bool: return int(w.ch) == CH14)[0]
			var bp := TestMap.world_pos(bw.cell.x, bw.cell.y, "ruins")
			bp.y = TerrainBuilder.height_at("ruins", bp) + float(bw.lift)
			if absf(float(bw.lift) - EraSites.OBS_RISE) > 0.01 or not EraSites.on_obs(bp) or not _hits(bp).is_empty():
				bad.append("bandi deck %s" % _hits(bp))
			## 시간 기둥 밑 — 위가 트여 있다(관측대에 안 가림), 땅 높이 차 작다. 아직(0단계) 안 섬.
			var db := EraSites.draft_base()
			if _surface(db) > db.y + 1.0 or Vector2(db.x - top.x, db.z - top.z).length() < EraSites.OBS_R + EraSites.DRAFT_R:
				bad.append("draft covered %.1f" % _surface(db))
			var es := get_tree().get_first_node_in_group("go_era_sites")
			if bool(es.call("draft_active")):
				bad.append("draft early")
			if not es.find_child("Discover_ruins_rift_observatory", true, false) or int(CodexState.TOTAL.place) < 58:
				bad.append("discovery")
			_check("ch14_table", bad.is_empty(), str(bad))
			_next()
		12: # [12] 반디(비행선) → 관측소
			_talk("bandi", 1, "ch14_bandi", Vector2(1.2, 2.3))
		13: # [13] 관측소
			_go(2, "ch14_observatory", Vector2.INF)
		14: # [14] 가온 → 무리
			_talk("gaon", 3, "ch14_gaon", Vector2(1.2, 2.34))
		15: # [15] 무리 넷
			if _frame == 1:
				_put(_target() + Vector3(0, 0, 6))
			if _frame == 10:
				var es: Array = _sq.call("alive_quest_enemies")
				var here := es.filter(func(e: Node) -> bool: return TestMap.region_at((e as Node3D).global_position) == "ruins").size()
				_v = {"n": es.size(), "ruins": here}
				for e in es:
					e.call("_die")
			if _frame == 16:
				_check("ch14_kill", int(_v.n) == 4 and int(_v.ruins) == 4 and int(_sq.call("st")) == 4, "n=%d ruins=%d st=%d" % [_v.n, _v.ruins, _sq.call("st")])
				_next()
		16: # [16] 가온 → 석등
			if _frame < 14:
				_talk("gaon", 5, "ch14_gaon2", Vector2(1.2, 2.2))
				return
			_talk("gaon", 5, "ch14_gaon2", Vector2(1.2, 2.2), "tracker='%s'" % String(_sq.call("tracker_text")).replace("\n", " / "),
				String(_sq.call("tracker_text")).contains("별 → 해 → 달"))
		17: # [17] 석등 차례 — 해 먼저(틀림) → 별 → 달(해 앞에 — 다 꺼짐) → 별·해·달, 다 켜지면 시간 기둥
			if _frame == 1:
				_put(_target() + Vector3(0.0, 0.0, 3.0))
				_v = {"lit": [], "blocked": [], "early": false}
			if _frame == 6:
				_v.early = bool(get_tree().get_first_node_in_group("go_era_sites").call("draft_active"))
				## 석등이 부서진 기둥에 안 묻힘 — 석등 자리 둘레에 명소 충돌이 없다.
				for m in ["star", "sun", "moon"]:
					var lp: Vector3 = _sq.call("seal_lamp_pos", m)
					if not _hits(lp - Vector3(0, 0.6, 0)).is_empty():
						_v.blocked.append(m)
				_sq.call("receive_element", _sq.call("seal_lamp_pos", "sun"), 0.5, "fire")
				_v.lit.append(int(_sq.call("seal_lit")))
				_sq.call("receive_element", _sq.call("seal_lamp_pos", "star"), 0.5, "thunder")
				_v.lit.append(int(_sq.call("seal_lit")))
				_sq.call("receive_element", _sq.call("seal_lamp_pos", "moon"), 0.5, "fire")
				_v.lit.append(int(_sq.call("seal_lit")))
				for m in ["star", "sun", "moon"]:
					_sq.call("receive_element", _sq.call("seal_lamp_pos", m), 0.5, "fire")
				_v.lit.append(int(_sq.call("seal_lit")))
			if _frame == 90: # 다 켜면 0.8초 뒤 다음 단계(story_quest _advance_later)
				var on: bool = get_tree().get_first_node_in_group("go_era_sites").call("draft_active")
				var ok: bool = _v.lit == [0, 1, 0, 3] and int(_sq.call("st")) == 6 and (_v.blocked as Array).is_empty() and not bool(_v.early) and on
				_check("ch14_seal", ok, "lit=%s st=%d blocked=%s early=%s draft=%s" % [_v.lit, _sq.call("st"), _v.blocked, _v.early, on])
				_next()
		18: # [18] 가온 → 오르기
			_talk("gaon", 7, "ch14_gaon3", Vector2(1.2, 2.2))
		19: # [19] 오르기 — 땅에선 안 넘어가고, 시간 기둥에 뛰어들어 솟은 뒤 북쪽(관측대)으로 활공해 내려앉으면 넘어간다
			var top := EraSites.obs_top()
			var b := EraSites.draft_base()
			if _frame == 1:
				_put(_cell3r(Vector2(1.2, 2.2)) + Vector3(3.0, 0.0, 3.0))
			if _frame == 12:
				_v = {"ground_st": int(_sq.call("st")), "peak": -1e9, "glide": false, "pushed": false}
				_p.set("stamina", float(_p.get("stamina_max")))
				_put(b + Vector3(0.0, 2.5, 0.0))
				_p.call("_set_mode", _p.Mode.AIR)
			if _frame >= 12:
				var rig := get_tree().get_first_node_in_group("camera_rig") as Node3D
				if rig:
					rig.global_rotation = Vector3(rig.global_rotation.x, 0.0, 0.0)
				_v.peak = maxf(float(_v.peak), _p.global_position.y)
				_v.glide = bool(_v.glide) or _p.mode == _p.Mode.GLIDE
			if _frame > 12 and not bool(_v.pushed) and _p.global_position.y > top.y + 4.0:
				_v.pushed = true
				Input.action_press("move_forward") # 북쪽 = 관측대 쪽
			## 관측대 한가운데 위에 오면 손을 떼고 활공을 접어(점프) 내려앉는다 — 계속 밀면 반지름 9m 를 지나 북쪽으로 넘어간다.
			if _frame > 12 and bool(_v.pushed) and not _v.has("fold") and Vector2(_p.global_position.x - top.x, _p.global_position.z - top.z).length() < 3.0:
				_v.fold = _frame
				Input.action_release("move_forward")
				if _p.mode == _p.Mode.GLIDE:
					_p.set("_jump_buffer", 0.12)
			var landed: bool = _frame > 12 and bool(_v.pushed) and _p.mode == _p.Mode.GROUND and _p.is_on_floor()
			if landed or _frame > 1500:
				Input.action_release("move_forward")
				var ok: bool = _v.has("fold") and int(_v.ground_st) == 7 and bool(_v.glide) and float(_v.peak) > top.y + 4.0 and int(_sq.call("st")) == 8 and EraSites.on_obs(_p.global_position)
				_check("ch14_climb", ok, "ground_st=%d glide=%s peak=%.1f top=%.1f st=%d y=%.1f off=%.1f,%.1f on_obs=%s frames=%d" % [_v.ground_st, _v.glide, _v.peak, top.y, _sq.call("st"), _p.global_position.y,
					_p.global_position.x - top.x, _p.global_position.z - top.z, EraSites.on_obs(_p.global_position), _frame])
				_next()
		20: # [20] 관측대 파수 셋 — 관측대 위에 서고, 떨어지면 제자리로
			if _frame == 1:
				_put(EraSites.obs_top() + Vector3(0.0, 0.2, 5.0))
			if _frame == 6:
				var es: Array = _sq.call("alive_quest_enemies")
				_v = {"n": es.size(), "high": es.all(func(e: Variant) -> bool: return EraSites.on_obs((e as Node3D).global_position)), "back": false}
				if not es.is_empty():
					_v.fell = es[0]
					(es[0] as Node3D).global_position = EraSites.cell_pos("ruins", EraSites.RIFT_CELL) + Vector3(12.0, 0.5, 0.0)
			if _frame == 12:
				_v.back = _v.has("fell") and EraSites.on_obs((_v.fell as Node3D).global_position)
				for e in _sq.call("alive_quest_enemies"):
					e.call("_die")
			if _frame == 18:
				_check("ch14_guards", int(_v.n) == 3 and bool(_v.high) and bool(_v.back) and int(_sq.call("st")) == 9, "n=%d high=%s back=%s st=%d" % [_v.n, _v.high, _v.back, _sq.call("st")])
				_next()
		21: # [21] 반디(관측대 위) → 14장 끝
			if _frame == 1:
				_v = {"mora": PartyState.count("mora"), "bandi_on": EraSites.on_obs(_sq.call("npc_pos", "bandi"))}
				_near_npc("bandi")
			if _frame == 10:
				_sq.call("interact")
				_drain()
			if _frame < 16:
				return
			_dismiss_prompts()
			if _frame < 22:
				return
			_sq.call("toggle_journal")
			var jt: String = _sq.call("journal_text")
			_sq.call("toggle_journal")
			var on: bool = get_tree().get_first_node_in_group("go_era_sites").call("draft_active")
			var ok: bool = int(_sq.call("ch")) == CH14 + 1 and jt.contains("✔ 제14장") and PartyState.count("mora") >= int(_v.mora) + 60000 and bool(_v.bandi_on) and on
			_check("chapter14", ok, "ch=%d mora +%d bandi_on=%s draft=%s" % [_sq.call("ch"), PartyState.count("mora") - int(_v.mora), _v.bandi_on, on])
			_next()
		22: # [22] 15장 표·자리
			if _frame < 3:
				return
			var c := Story.chapter(CH15)
			var bad: Array = []
			if String(c.get("id", "")) != "ch15" or int(c.ar) <= int(Story.chapter(CH14).ar) or int(_sq.call("ch")) != CH15 or bool(_sq.call("locked")) \
					or String(c.get("join", "")) != "story_dareum":
				bad.append("chapter ch=%d locked=%s" % [_sq.call("ch"), _sq.call("locked")])
			var m: Dictionary = Story.MEMBERS.get("story_dareum", {})
			if String(m.get("element", "")) != "rock" or String(m.get("weapon", "")) != "polearm" or String(m.get("npc", "")) != "dareum" or not Kits.KITS.has("story_dareum"):
				bad.append("member")
			var info: Dictionary = Story.NPCS.dareum
			if String(info.region) != "village" or String(info.get("era", "")) != "과거" or not bool(info.get("hat", false)):
				bad.append("dareum info")
			var dh := _hits(_sq.call("npc_pos", "dareum"))
			if not dh.is_empty():
				bad.append("dareum in %s" % dh)
			var dbody := get_tree().get_first_node_in_group("go_story").find_child("StoryNpc_dareum", true, false)
			if dbody == null or dbody.find_child("Hat", true, false) == null:
				bad.append("hat")
			for s in c.steps:
				if s.has("cell") and ["~", "^"].has(TestMap.tile_at(roundi(s.cell.x), roundi(s.cell.y), String(s.region))):
					bad.append("step on %s" % TestMap.tile_at(roundi(s.cell.x), roundi(s.cell.y), String(s.region)))
			## 역마 길 — 점마다 골짜기 평지(높이 1m 아래)·명소 충돌 없음.
			var chase: Dictionary = (c.steps as Array)[3]
			for pt in chase.path:
				var wp := TestMap.world_pos(pt.x, pt.y, "village")
				wp.y = TerrainBuilder.height_at("village", wp)
				if wp.y > 1.0 or not _hits(wp).is_empty():
					bad.append("path %s y=%.1f" % [pt, wp.y])
			## 구미호 자리 둘레 8m 가 평지(틈새 질주가 막히지 않게).
			var duel: Dictionary = (c.steps as Array)[6]
			var dc := TestMap.world_pos(duel.cell.x, duel.cell.y, "village")
			for k in 8:
				var q := dc + Vector3(cos(TAU * k / 8.0), 0.0, sin(TAU * k / 8.0)) * 8.0
				if TerrainBuilder.height_at("village", q) > 1.0:
					bad.append("duel edge %d" % k)
			if String(duel.kind) != "rift_fox_ember" or String(FieldEnemy.KINDS.rift_fox_ember.element) != "fire":
				bad.append("duel kind")
			var es := get_tree().get_first_node_in_group("go_era_sites")
			if not es.find_child("Discover_village_old_road", true, false) or int(CodexState.TOTAL.place) < 59:
				bad.append("discovery")
			var horse := es.find_child("StationHorse", true, false) as Node3D
			if horse == null or not horse.visible:
				bad.append("station horse")
			var fr := get_tree().get_first_node_in_group("go_frost_region")
			if fr == null or bool(fr.call("ship_up")):
				bad.append("ship early")
			_check("ch15_table", bad.is_empty(), str(bad))
			_next()
		23: # [23] 반디 → 옛 역참 길
			_talk("bandi", 1, "ch15_bandi", Vector2(4.9, 8.8))
		24: # [24] 옛 역참 길
			_go(2, "ch15_road", Vector2.INF)
		25: # [25] 달음 → 역마가 달아난다(말 몸·마구간이 빔)
			if _frame == 1:
				_near_npc("dareum")
			if _frame == 10:
				_sq.call("interact")
				_drain()
			if _frame == 30:
				var cs: Dictionary = _sq.call("chase_state")
				var th := _sq.get("_thief") as Node3D
				var body := th.get_node_or_null("Body") if th else null
				var is_horse: bool = body != null and body.get_node_or_null("Body") != null and body.find_children("*", "Skeleton3D", true, false).is_empty()
				var horse := get_tree().get_first_node_in_group("go_era_sites").find_child("StationHorse", true, false) as Node3D
				var ok: bool = int(_sq.call("st")) == 3 and bool(cs.run) and is_horse and not horse.visible and String(_sq.call("tracker_text")).contains("놀란 역마")
				_check("ch15_horse_runs", ok, "st=%d run=%s horse_body=%s station_horse=%s tracker='%s'" % [_sq.call("st"), cs.run, is_horse, horse.visible, String(_sq.call("tracker_text")).replace("\n", " / ")])
				_next()
		26: # [26] 따라잡기 — 마구간에 말이 돌아온다
			if _frame == 1:
				_put((_sq.call("chase_state") as Dictionary).pos + Vector3(0.0, 0.5, 1.0))
			if _frame == 12:
				var horse := get_tree().get_first_node_in_group("go_era_sites").find_child("StationHorse", true, false) as Node3D
				var ok: bool = int(_sq.call("st")) == 4 and _sq.get("_thief") == null and horse.visible
				_check("ch15_catch", ok, "st=%d thief=%s station_horse=%s" % [_sq.call("st"), _sq.get("_thief") != null, horse.visible])
				_next()
		27: # [27] 달음 → 무리
			_talk("dareum", 5, "ch15_dareum2", Vector2(5.0, 9.35))
		28: # [28] 무리 넷
			if _frame == 1:
				_put(_target() + Vector3(0, 0, 6))
			if _frame == 10:
				var es: Array = _sq.call("alive_quest_enemies")
				var here := es.filter(func(e: Node) -> bool: return TestMap.region_at((e as Node3D).global_position) == "village").size()
				_v = {"n": es.size(), "village": here}
				for e in es:
					e.call("_die")
			if _frame == 16:
				_check("ch15_kill", int(_v.n) == 4 and int(_v.village) == 4 and int(_sq.call("st")) == 6, "n=%d village=%d st=%d" % [_v.n, _v.village, _sq.call("st")])
				_next()
		29: # [29] 여우불 구미호 — 화, 틈새 질주 원 다섯·줄 끝으로 옮겨 나타남
			if _frame == 1:
				_put(_target() + Vector3(0, 0, 8))
			if _frame == 12:
				var bosses := get_tree().get_nodes_in_group("go_story_boss")
				var b: Node3D = bosses[0] if not bosses.is_empty() else null
				_v = {"n": bosses.size(), "marks": 0, "moved": -1.0, "kind": ""}
				if b:
					_v.kind = String(b.get("kind"))
					b.call("_clear_marks")
					b.call("_set_tell", false)
					b.call("begin_skill", "rift", _p)
					var marks: Array = b.get("_marks")
					_v.marks = marks.size()
					var end: Vector3 = marks[marks.size() - 1].pos if not marks.is_empty() else Vector3.INF
					b.call("_fire")
					_v.moved = _flat(b.global_position, end)
					b.call("_die")
			if _frame == 20:
				var ok: bool = int(_v.n) == 1 and String(_v.kind) == "rift_fox_ember" and int(_v.marks) == 5 and float(_v.moved) < 0.5 and int(_sq.call("st")) == 7
				_check("ch15_duel", ok, "n=%d kind=%s marks=%d moved=%.2f st=%d" % [_v.n, _v.kind, _v.marks, _v.moved, _sq.call("st")])
				_next()
		30: # [30] 달음 → 별배
			_talk("dareum", 8, "ch15_dareum3", Vector2(6.1, 5.05))
		31: # [31] 별배 — 달음이 먼저 와 있다
			if _frame == 1:
				_put(_target())
			if _frame == 12:
				var d := _flat(_sq.call("npc_pos", "dareum"), TestMap.world_pos(5.62, 4.95, "frost"))
				_check("ch15_ship", int(_sq.call("st")) == 9 and d < 1.0, "st=%d dareum_at_ship=%.1f" % [_sq.call("st"), d])
				_next()
		32: # [32] 날개 이음매에 불
			if _frame == 1:
				_put(_target() + Vector3(2.5, 0.0, 2.5))
			if _frame == 6:
				_sq.call("receive_element", (_sq.get("_altar") as Node3D).global_position, 2.0, "rock")
			if _frame == 80:
				_check("ch15_light", int(_sq.call("st")) == 10, "st=%d" % _sq.call("st"))
				_next()
		33: # [33] 반디 → 15장 끝 · 달음 동료 · 별배가 뜬다
			if _frame == 1:
				_v = {"mora": PartyState.count("mora")}
				_near_npc("bandi")
			if _frame == 10:
				_sq.call("interact")
				_drain()
			if _frame < 16:
				return
			_dismiss_prompts()
			if _frame < 22:
				return
			if _frame == 22:
				_sq.call("toggle_journal")
				_v.jt = String(_sq.call("journal_text"))
				_sq.call("toggle_journal")
			var fr := get_tree().get_first_node_in_group("go_frost_region")
			var ship := fr.find_child("Ship", true, false) as Node3D
			if _frame < 22 + int(60.0 * (Frost.FLY_SEC + 1.5)) and not (bool(fr.call("ship_up")) and ship.position.y > Frost.FLY_H - 0.05):
				return
			var wings := fr.find_child("StarWings", true, false) as Node3D
			var ok: bool = int(_sq.call("ch")) == CH15 + 1 and String(_v.jt).contains("✔ 제15장") and PartyState.count("mora") >= int(_v.mora) + 70000 \
				and PartyState.members.count("story_dareum") == 1 and bool(fr.call("ship_up")) and ship.position.y > Frost.FLY_H - 0.05 and wings.visible
			_check("chapter15", ok, "ch=%d mora +%d dareum=%s ship_up=%s ship_y=%.2f wings=%s frames=%d" % [_sq.call("ch"), PartyState.count("mora") - int(_v.mora),
				PartyState.members.has("story_dareum"), fr.call("ship_up"), ship.position.y, wings.visible, _frame])
			_next()
		34:
			PartyState.story = _saved.story
			PartyState.members.assign(_saved.members)
			PartyState.exp = _saved.exp
			PartyState.level = _saved.level
			PartyState.bag = _saved.bag
			PartyState.ar_paid = _saved.ar_paid
			EventState.resolved.assign(_saved.resolved)
			PartyState.world_quests = _saved.wq
			_p.global_position = _saved.pos
			print("STORY3_PROBE_DONE fails=%d" % _fails)
			get_tree().quit()

## 대화 단계 — 곁에 가서 F·끝까지 넘기면 다음 단계가 want_st, 목표가 next_cell(목표 단계 지역, INF 면 안 봄).
func _talk(npc: String, want_st: int, name: String, next_cell: Vector2, extra := "", extra_ok := true, from := 0) -> void:
	if _frame == 2 + from * 2:
		_near_npc(npc)
	if _frame == 10 + from * 2:
		_sq.call("interact")
		_drain()
	if _frame == 14 + from * 2:
		var tgt_ok := next_cell == Vector2.INF or _flat(_target(), TestMap.world_pos(next_cell.x, next_cell.y, _step_region(want_st))) < 0.5
		_check(name, int(_sq.call("st")) == want_st and tgt_ok and extra_ok, "st=%d target=%s %s" % [_sq.call("st"), _target(), extra])
		_next()

func _go(want_st: int, name: String, next_cell: Vector2) -> void:
	if _frame == 1:
		_put(_target())
	if _frame == 12:
		var tgt_ok := next_cell == Vector2.INF or _flat(_target(), TestMap.world_pos(next_cell.x, next_cell.y, _step_region(want_st))) < 0.5
		_check(name, int(_sq.call("st")) == want_st and tgt_ok, "st=%d" % _sq.call("st"))
		_next()

func _step_region(st: int) -> String:
	return String(Story.step_of(int(_sq.call("ch")), st).get("region", "coast"))

func _target() -> Vector3:
	return _sq.call("target_pos")

func _cell3r(cell: Vector2) -> Vector3:
	var p := TestMap.world_pos(cell.x, cell.y, "ruins")
	p.y = TerrainBuilder.height_at("ruins", p)
	return p

func _cell3(cell: Vector2) -> Vector3:
	var p := TestMap.world_pos(cell.x, cell.y, "coast")
	p.y = TerrainBuilder.height_at("coast", p)
	return p

## 그 자리 1.2m 위에 걸리는 3부 명소 충돌.
func _hits(pos: Vector3) -> Array:
	var es := get_tree().get_first_node_in_group("go_era_sites")
	var q := PhysicsShapeQueryParameters3D.new()
	var sph := SphereShape3D.new()
	sph.radius = 0.6
	q.shape = sph
	q.collision_mask = 1
	q.exclude = [_p.get_rid()]
	q.transform = Transform3D(Basis(), pos + Vector3(0, 1.2, 0))
	var out: Array = []
	for hit in _p.get_world_3d().direct_space_state.intersect_shape(q, 4):
		var c: Object = hit.collider
		if c is Node and es and es.is_ancestor_of(c as Node):
			out.append(String((c as Node).get_parent().name))
	return out

func _surface(p: Vector3) -> float:
	var q := PhysicsRayQueryParameters3D.create(Vector3(p.x, 80.0, p.z), Vector3(p.x, -20.0, p.z), 1)
	q.exclude = [_p.get_rid()]
	var hit := _p.get_world_3d().direct_space_state.intersect_ray(q)
	return (hit.position as Vector3).y if not hit.is_empty() else -99.0

var _pressed: Array = []

func _dismiss_prompts() -> void:
	for n in get_tree().get_nodes_in_group("ui_modal"):
		if n == _sq or n.get("visible") == false or _pressed.has(n):
			continue
		_pressed.append(n)
		var btns := (n as Node).find_children("*", "Button", true, false)
		if not btns.is_empty():
			(btns[0] as Button).pressed.emit()

func _drain() -> int:
	var choices := 0
	var guard := 0
	while _sq.call("is_dialogue_open") and guard < 50:
		guard += 1
		if _sq.get("_dlg_waiting_choice"):
			_sq.call("choose", 0)
			choices += 1
		else:
			_sq.call("next_line")
	return choices

func _flat(a: Vector3, b: Vector3) -> float:
	return Vector2(a.x - b.x, a.z - b.z).length()

func _near_npc(id: String) -> void:
	_dismiss_prompts()
	_put(_sq.call("npc_pos", id) + Vector3(0.0, 0.3, 1.5))

func _put(pos: Vector3) -> void:
	_p.global_position = pos + Vector3(0.0, 0.3, 0.0)
	_p.velocity = Vector3.ZERO

func _check(name: String, ok: bool, detail: String) -> void:
	if not ok:
		_fails += 1
	print("STORY3_PROBE %s %s %s" % [name, "ok" if ok else "FAIL", detail])

func _next() -> void:
	_step += 1
	_frame = 0
