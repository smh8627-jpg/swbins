extends Node
## GO 이야기 4부(PLAN 106장 ㊽, 16장~) 자동 점검 — 평소엔 안 붙는다. 1부 probe_story · 2부 probe_story2 · 3부 probe_story3.
## test_village.gd 가 SAGA_STORY4_PROBE 가 있을 때만 단다.
##
##   SAGA_STORY4_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/world/TestVillage.tscn
##
## 16장 "별배가 돌아온 나루"(㊽-2): [1] 표·자리(아라 빛 고리·명소 몸에 안 묻힘·계류 탑 윗면 높이·climb above·반디 자리·
## 틈 문 열림·별배는 아직 고원에) [2] 반디(고원) → 틈 고개 [3] 틈 고개 [4] 아라 → 무리 [5] 무리 넷(나루에 섬) [6] 아라 → 계류 탑
## [7] 오르기(땅에선 안 넘어감·탑 옆면을 실제로 타고 올라 꼭대기에 섬) → 별배가 나루에 매이고 고원 별배는 사라짐
## [8] 반디(나루) → 계류대 [9] 지키기(동쪽 탑 쪽에서 안 나옴·산에서 안 나옴·물결 셋·"계류된 별배") [10] 아라 → 16장 끝·보상·✔ 제16장.
## 17장 "옛 절터의 종"(㊽-3): [11] 표·자리(한결 염주·종각 기단·지붕 충돌·종 울리는 칸 = 종각·쓰러진 종은 비탈에·대결 둘레 평탄·
## 이무기 초·풍이 방패를 깸) [12] 아라 → 절터 [13] 절터 [14] 한결 → 비탈 [15] 무리 넷 [16] 한결(종 곁) → 대결 [17] 이끼 이무기
## [18] 한결 → 반디(종 곁) [19] 반디 → 종 울리기 [20] 종이 종각에 걸리고 비탈의 종은 사라짐 [21] 먼 원소는 안 울림·종각에 닿으면 울림
## [22] 한결 → 17장 끝·보상·✔ 제17장.
## 18장 "은하역 막차"(㊽-4, 4부 끝): [23] 표·자리(도담 고글·동료 뇌·양손검·잔상 길 선로 위 평지·변전함 칸·막차 아직 꺼짐)
## [24] 반디(종각) → 역 [25] 역 [26] 도담 → 태양광 밭 [27] 무리 넷 [28] 변전함(돌 없음·먼 원소 안 됨) → 막차 전조등이 켜짐
## [29] 도담 → 잔상이 달아남(선장 모자·가면 없음) [30] 따라잡기 [31] 도담(선로 끝) → 막차 [32] 지키기(북쪽 객차 쪽에서 안 나옴·물결 셋)
## [33] 도담 → 18장 끝·보상·동료 도담·✔ 제18장.
## 이야기 상태·부대 경험·가방은 끝에 되돌린다. 저장은 안 한다.

const Story := preload("res://games/saga_go/data/story.gd")
const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")
const Skyport := preload("res://games/saga_go/world/region5_skyport.gd")
const FieldEnemy := preload("res://games/saga_go/combat/field_enemy.gd")
const Elements := preload("res://games/saga_go/combat/elements.gd")

const CH16 := 15 # 16장(0부터)
const CH17 := 16
const CH18 := 17
const R := "skyport"
const MAST_OFF := Vector3(12.0, 0.0, 0.0) # region5_skyport _build_port 계류 탑 자리(착륙판 가운데에서)
const MAST_H := 18.0

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
		0: # 준비 — 16장 처음, 모험 등급 43(18장까지)
			_saved = {"story": PartyState.story.duplicate(true), "members": PartyState.members.duplicate(), "exp": PartyState.exp, "level": PartyState.level,
				"bag": PartyState.bag.duplicate(true), "ar_paid": PartyState.ar_paid, "resolved": EventState.resolved.duplicate(), "pos": _p.global_position, "wq": PartyState.world_quests.duplicate(true)}
			PartyState.exp = maxf(PartyState.exp, 43.0 * PartyState.EXP_PER_LEVEL)
			PartyState.level = maxi(PartyState.level, 43)
			PartyState.ar_paid = maxi(PartyState.ar_paid, PartyState.level + 1)
			PartyState.story = {"ch": CH16, "step": 0}
			_sq.call("set_track", "")
			_sq.call("_enter_step")
			_next()
		1: # [1] 표·자리
			if _frame < 70: # 문·별배는 1초마다 본다
				return
			var c := Story.chapter(CH16)
			var bad: Array = []
			if String(c.get("id", "")) != "ch16" or int(c.ar) <= int(Story.chapter(CH16 - 1).ar) or int(_sq.call("ch")) != CH16 or bool(_sq.call("locked")):
				bad.append("chapter ch=%d locked=%s" % [_sq.call("ch"), _sq.call("locked")])
			var info: Dictionary = Story.NPCS.ara
			if String(info.region) != R or String(info.get("era", "")) != "미래" or not bool(info.get("halo", false)):
				bad.append("ara info")
			var ah := _hits(_sq.call("npc_pos", "ara"))
			if not ah.is_empty():
				bad.append("ara in %s" % ah)
			var abody := get_tree().get_first_node_in_group("go_story").find_child("StoryNpc_ara", true, false)
			if abody == null or abody.find_child("Halo", true, false) == null:
				bad.append("halo")
			for s in c.steps:
				if s.has("cell") and ["~", "^"].has(TestMap.tile_at(roundi(s.cell.x), roundi(s.cell.y), String(s.region))):
					bad.append("step on %s" % TestMap.tile_at(roundi(s.cell.x), roundi(s.cell.y), String(s.region)))
			## 계류 탑 윗면 — 위에서 쏜 빛줄이 탑 윗면(땅 + MAST_H)에 닿는다. climb 칸이 탑 자리, above 가 윗면 + 2.
			var mast := _mast()
			if absf(_surface(mast) - (mast.y + MAST_H)) > 0.15:
				bad.append("mast top %.2f want %.2f" % [_surface(mast), mast.y + MAST_H])
			var climb: Dictionary = (c.steps as Array)[5]
			var cp := TestMap.world_pos(climb.cell.x, climb.cell.y, R)
			if String(climb.type) != "climb" or absf(float(climb.above) - (MAST_H + Story.CLIMB_SLACK - 0.5)) > 0.01 or _flat(cp, mast) > 0.5:
				bad.append("climb")
			var bw: Dictionary = Story.windows(Story.STATIONS.bandi).filter(func(w: Dictionary) -> bool: return int(w.ch) == CH16)[0]
			if String(bw.region) != R or not _hits(_cell3(bw.cell)).is_empty():
				bad.append("bandi station")
			var sk := get_tree().get_first_node_in_group("go_skyport_region")
			var fr := get_tree().get_first_node_in_group("go_frost_region")
			if not bool(sk.call("is_gate_open")) or bool(sk.call("is_docked")) or bool(fr.call("ship_away")):
				bad.append("gate=%s docked=%s away=%s" % [sk.call("is_gate_open"), sk.call("is_docked"), fr.call("ship_away")])
			_check("ch16_table", bad.is_empty(), str(bad))
			_next()
		2: # [2] 반디(고원) → 틈 고개
			_talk("bandi", 1, "ch16_bandi", Vector2(7.4, 3.0))
		3: # [3] 틈 고개
			_go(2, "ch16_pass", Vector2.INF)
		4: # [4] 아라 → 무리
			_talk("ara", 3, "ch16_ara", Vector2(5.3, 1.75))
		5: # [5] 무리 넷
			if _frame == 1:
				_put(_target() + Vector3(0, 0, 6))
			if _frame == 10:
				var es: Array = _sq.call("alive_quest_enemies")
				var here := es.filter(func(e: Node) -> bool: return TestMap.region_at((e as Node3D).global_position) == R).size()
				_v = {"n": es.size(), "here": here}
				for e in es:
					e.call("_die")
			if _frame == 16:
				_check("ch16_kill", int(_v.n) == 4 and int(_v.here) == 4 and int(_sq.call("st")) == 4, "n=%d here=%d st=%d" % [_v.n, _v.here, _sq.call("st")])
				_next()
		6: # [6] 아라 → 계류 탑
			_talk("ara", 5, "ch16_ara2", Vector2(5.55, 1.6))
		7: # [7] 오르기 — 땅에선 안 넘어가고, 탑 동쪽 옆면을 실제로 타고 올라 꼭대기에 서면 넘어간다 → 별배가 나루에 매인다
			var mast := _mast()
			if _frame == 1:
				_put(mast + Vector3(4.0, 0.0, 2.0))
			if _frame == 12:
				_v = {"ground_st": int(_sq.call("st")), "grab": false}
				_p.set("stamina", 999.0)
				_put(mast + Vector3(0.6 + 1.5, 0.0, 0.0))
			if _frame >= 12:
				var rig := get_tree().get_first_node_in_group("camera_rig") as Node3D
				if rig:
					rig.global_rotation = Vector3(rig.global_rotation.x, 0.0, 0.0)
			if _frame == 30:
				Input.action_press("move_left")
			if _frame > 30 and not bool(_v.grab) and _p.mode == _p.Mode.CLIMB:
				_v.grab = true
				Input.action_release("move_left")
				Input.action_press("move_forward")
			if _frame > 30 and int(_sq.call("st")) == 6 and not _v.has("at"):
				_v.at = _frame
			var settled: bool = _v is Dictionary and _v.has("at") and ((_p.mode == _p.Mode.GROUND and _p.is_on_floor()) or _frame > int(_v.at) + 240)
			if _frame > 30 and (settled or _frame > 1500):
				Input.action_release("move_forward")
				if not _v.has("stood"):
					_v.stood = {"y": _p.global_position.y, "mode": _p.mode, "st": int(_sq.call("st"))}
					_v.stood_at = _frame
				if _frame < int(_v.stood_at) + 70: # 매인 별배는 1초마다 본다
					return
				var sk := get_tree().get_first_node_in_group("go_skyport_region")
				var fr := get_tree().get_first_node_in_group("go_frost_region")
				var st: Dictionary = _v.stood
				var ok: bool = int(_v.ground_st) == 5 and bool(_v.grab) and int(st.st) == 6 and float(st.y) >= mast.y + MAST_H - 0.6 and int(st.mode) == _p.Mode.GROUND \
					and bool(sk.call("is_docked")) and bool(fr.call("ship_away"))
				_check("ch16_climb", ok, "ground_st=%d grab=%s st=%d y=%.1f top=%.1f mode=%d docked=%s away=%s" % [_v.ground_st, _v.grab, st.st, st.y, mast.y + MAST_H, st.mode,
					sk.call("is_docked"), fr.call("ship_away")])
				_next()
		8: # [8] 반디(나루) → 계류대
			if _frame == 1:
				_put(_cell3(Vector2(5.3, 1.9)))
			if _frame == 2:
				_v = _flat(_sq.call("npc_pos", "bandi"), TestMap.world_pos(5.44, 1.8, R))
			if _frame < 3:
				return
			_talk("bandi", 7, "ch16_bandi2", Vector2(5.3, 1.75), "bandi_at_port=%.1f" % float(_v), float(_v) < 1.0, 1)
		9: # [9] 지키기 — 동쪽(탑)·산에서 안 나옴, 물결 셋
			if _frame == 1:
				_put(_target() + Vector3(2.5, 0.0, 2.5))
				_v = {"east": false, "mtn": false, "waves": 0, "label": ""}
			if _frame > 4 and _frame % 6 == 0 and int(_sq.call("st")) == 7:
				var lbl := _sq.get("_defend_label") as Label3D
				if lbl and String(_v.label) == "":
					_v.label = lbl.text
				var altar := _target()
				for e in _sq.call("alive_quest_enemies"):
					var ep := (e as Node3D).global_position
					var g := TestMap.grid_at(R, ep)
					if TestMap.tile_at(g.x, g.y, R) == "^":
						_v.mtn = true
					var d := Vector2(ep.x - altar.x, ep.z - altar.z)
					if d.length() > 8.0 and absf(d.angle_to(Vector2(1, 0))) < deg_to_rad(20.0):
						_v.east = true
					e.call("_die")
				_v.waves = maxi(int(_v.waves), int(_sq.call("defend_wave")) + 1)
			if _frame > 4 and (int(_sq.call("st")) != 7 or _frame > 600):
				var ok: bool = int(_sq.call("st")) == 8 and not bool(_v.east) and not bool(_v.mtn) and int(_v.waves) == 3 and String(_v.label).begins_with("계류된 별배")
				_check("ch16_defend", ok, "st=%d east=%s mtn=%s waves=%d label='%s' frames=%d" % [_sq.call("st"), _v.east, _v.mtn, _v.waves, _v.label, _frame])
				_next()
		10: # [10] 아라 → 16장 끝
			if _frame == 1:
				_v = {"mora": PartyState.count("mora")}
				_near_npc("ara")
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
			var sk := get_tree().get_first_node_in_group("go_skyport_region")
			var ok: bool = int(_sq.call("ch")) == CH16 + 1 and jt.contains("✔ 제16장") and PartyState.count("mora") >= int(_v.mora) + 75000 and Skyport.ship_docked()
			_check("chapter16", ok, "ch=%d mora +%d docked=%s" % [_sq.call("ch"), PartyState.count("mora") - int(_v.mora), sk.call("is_docked")])
			_next()
		11: # [11] 17장 표·자리
			if _frame < 3:
				return
			var c := Story.chapter(CH17)
			var bad: Array = []
			if String(c.get("id", "")) != "ch17" or int(c.ar) <= int(Story.chapter(CH16).ar) or int(_sq.call("ch")) != CH17 or bool(_sq.call("locked")):
				bad.append("chapter ch=%d locked=%s" % [_sq.call("ch"), _sq.call("locked")])
			var info: Dictionary = Story.NPCS.hangyeol
			if String(info.region) != R or String(info.get("era", "")) != "과거" or not bool(info.get("beads", false)):
				bad.append("hangyeol info")
			var hb := _sq.find_child("StoryNpc_hangyeol", true, false)
			if hb == null or hb.find_child("Beads", true, false) == null:
				bad.append("beads")
			var hp: Vector3 = _sq.call("npc_pos", "hangyeol")
			if not _hits(hp).is_empty() or _flat(hp, Skyport.belfry_pos()) > 6.0:
				bad.append("hangyeol at %s hits %s" % [hp, _hits(hp)])
			for s in c.steps:
				if s.has("cell") and ["~", "^"].has(TestMap.tile_at(roundi(s.cell.x), roundi(s.cell.y), String(s.region))):
					bad.append("step on %s" % TestMap.tile_at(roundi(s.cell.x), roundi(s.cell.y), String(s.region)))
			## 종각 — 기단 윗면(바닥 + 0.4)·지붕 윗면(바닥 + 4.9)이 충돌로 선다. 종 울리는 칸이 종각 자리.
			var bp := Skyport.belfry_pos()
			for off in [Vector3(2.4, 0, 2.4), Vector3(-2.4, 0, 0.5)]:
				if absf(_surface(bp + off) - (bp.y + 4.9)) > 0.15:
					bad.append("belfry roof %.2f want %.2f" % [_surface(bp + off), bp.y + 4.9])
			var ring: Dictionary = (c.steps as Array)[8]
			if String(ring.type) != "light" or not bool(ring.get("bell", false)) or _flat(TestMap.world_pos(ring.cell.x, ring.cell.y, R), bp) > 0.5:
				bad.append("ring step")
			## 쓰러진 종 곁 — 한결·반디 자리가 명소에 안 묻힘, 대결 둘레 8m 가 가운데와 1.5m 안(비탈이 너무 가파르지 않게).
			var hw: Dictionary = Story.windows(Story.STATIONS.hangyeol)[0]
			var bw: Array = Story.windows(Story.STATIONS.bandi).filter(func(w: Dictionary) -> bool: return int(w.ch) == CH17)
			if bw.size() != 3 or not _hits(_cell3(hw.cell)).is_empty():
				bad.append("stations")
			for w in bw:
				if String(w.region) != R or not _hits(_cell3(w.cell)).is_empty():
					bad.append("bandi station %s" % w.cell)
			var duel: Dictionary = (c.steps as Array)[5]
			var dc := _cell3(duel.cell)
			for k in 8:
				var q := dc + Vector3(cos(TAU * k / 8.0), 0.0, sin(TAU * k / 8.0)) * 8.0
				if absf(TerrainBuilder.height_at(R, q) - dc.y) > 1.5:
					bad.append("duel edge %d dy=%.1f" % [k, TerrainBuilder.height_at(R, q) - dc.y])
			if String(duel.kind) != "moss_serpent" or String(FieldEnemy.KINDS.moss_serpent.element) != "grass" or Elements.shield_mul("grass", "wind") <= 1.0:
				bad.append("duel kind")
			var sk := get_tree().get_first_node_in_group("go_skyport_region")
			var fallen := sk.find_child("Small_skyport_bell", true, false)
			if bool(sk.call("is_hung")) or fallen == null or not (fallen.get_node("Bell") as Node3D).visible:
				bad.append("hung early")
			_check("ch17_table", bad.is_empty(), str(bad))
			_next()
		12: # [12] 아라 → 절터
			_talk("ara", 1, "ch17_ara", Vector2(2.5, 3.5))
		13: # [13] 절터
			_go(2, "ch17_temple", Vector2.INF)
		14: # [14] 한결 → 비탈
			_talk("hangyeol", 3, "ch17_hangyeol", Vector2(1.6, 5.0))
		15: # [15] 무리 넷
			if _frame == 1:
				_put(_target() + Vector3(0, 0, 6))
			if _frame == 10:
				var es: Array = _sq.call("alive_quest_enemies")
				var here := es.filter(func(e: Node) -> bool: return TestMap.region_at((e as Node3D).global_position) == R).size()
				_v = {"n": es.size(), "here": here}
				for e in es:
					e.call("_die")
			if _frame == 16:
				_check("ch17_kill", int(_v.n) == 4 and int(_v.here) == 4 and int(_sq.call("st")) == 4, "n=%d here=%d st=%d" % [_v.n, _v.here, _sq.call("st")])
				_next()
		16: # [16] 한결(종 곁) → 대결
			if _frame == 1:
				_v = _flat(_sq.call("npc_pos", "hangyeol"), TestMap.world_pos(1.55, 4.88, R))
			_talk("hangyeol", 5, "ch17_hangyeol2", Vector2(2.0, 5.05), "hangyeol_at_bell=%.1f" % float(_v), float(_v) < 1.0, 1)
		17: # [17] 이끼 이무기 — 초, 밀물 줄 넷
			if _frame == 1:
				_put(_target() + Vector3(0, 0, 8))
			if _frame == 12:
				var bosses := get_tree().get_nodes_in_group("go_story_boss")
				var b: Node3D = bosses[0] if not bosses.is_empty() else null
				_v = {"n": bosses.size(), "marks": 0, "kind": "", "region": ""}
				if b:
					_v.kind = String(b.get("kind"))
					_v.region = TestMap.region_at(b.global_position)
					b.call("_clear_marks")
					b.call("_set_tell", false)
					b.call("begin_skill", "tide", _p)
					_v.marks = (b.get("_marks") as Array).size()
					b.call("_clear_marks")
					b.call("_die")
			if _frame == 20:
				var ok: bool = int(_v.n) == 1 and String(_v.kind) == "moss_serpent" and String(_v.region) == R and int(_v.marks) == 4 and int(_sq.call("st")) == 6
				_check("ch17_duel", ok, "n=%d kind=%s region=%s marks=%d st=%d" % [_v.n, _v.kind, _v.region, _v.marks, _sq.call("st")])
				_next()
		18: # [18] 한결 → 반디(종 곁) — 반디는 7단계에 들어서야 옮긴다(대화 뒤에 잰다)
			if _frame == 1:
				_v = -1.0
			if _frame == 15:
				_v = _flat(_sq.call("npc_pos", "bandi"), TestMap.world_pos(1.72, 5.2, R))
			_talk("hangyeol", 7, "ch17_hangyeol3", Vector2.INF, "bandi_at_bell=%.1f" % float(_v), float(_v) < 1.0, 1)
		19: # [19] 반디 → 종 울리기(목표 = 종각)
			_talk("bandi", 8, "ch17_bandi", Vector2(2.71, 3.54))
		20: # [20] 종이 종각에 — 1초마다 본다
			if _frame < 70:
				return
			var sk := get_tree().get_first_node_in_group("go_skyport_region")
			var fallen := sk.find_child("Small_skyport_bell", true, false)
			var hung := sk.find_child("HungBell", true, false) as Node3D
			var ok: bool = bool(sk.call("is_hung")) and hung != null and hung.is_visible_in_tree() and not (fallen.get_node("Bell") as Node3D).visible
			_check("ch17_hung", ok, "hung=%s fallen_visible=%s" % [sk.call("is_hung"), (fallen.get_node("Bell") as Node3D).visible])
			_next()
		21: # [21] 종 울리기 — 먼 원소는 안 울리고, 종각에 닿으면 울린다(제단 돌은 안 보임)
			var sk := get_tree().get_first_node_in_group("go_skyport_region")
			if _frame == 1:
				_put(Skyport.belfry_pos() + Vector3(0, 0.4, 3.5))
				_v = {"r0": int(sk.get("rings"))}
			if _frame == 4:
				var alt := _sq.get("_altar") as Node3D
				_v.stone = alt.get_children().any(func(n: Node) -> bool: return (n as Node3D).visible)
				_sq.call("receive_element", Skyport.belfry_pos() + Vector3(20.0, 0.0, 0.0), 3.0, "wind")
			if _frame == 6:
				_v.far = int(sk.get("rings")) - int(_v.r0)
				_sq.call("receive_element", Skyport.belfry_pos() + Vector3(1.0, 0.0, 1.0), 3.0, "wind")
			if _frame == 30:
				_v.swing = absf((sk.find_child("HungBell", true, false) as Node3D).rotation.x)
			if _frame == 80:
				var ok: bool = int(_sq.call("st")) == 9 and int(_v.far) == 0 and int(sk.get("rings")) - int(_v.r0) == 1 and not bool(_v.stone) and float(_v.swing) > 0.01
				_check("ch17_ring", ok, "st=%d far=%d rings=%d stone=%s swing=%.3f" % [_sq.call("st"), _v.far, int(sk.get("rings")) - int(_v.r0), _v.stone, _v.swing])
				_next()
		22: # [22] 한결 → 17장 끝
			if _frame == 1:
				_v = {"mora": PartyState.count("mora")}
				_near_npc("hangyeol")
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
			var ok: bool = int(_sq.call("ch")) == CH17 + 1 and jt.contains("✔ 제17장") and PartyState.count("mora") >= int(_v.mora) + 80000 and Skyport.bell_hung()
			_check("chapter17", ok, "ch=%d mora +%d hung=%s" % [_sq.call("ch"), PartyState.count("mora") - int(_v.mora), Skyport.bell_hung()])
			_next()
		23: # [23] 18장 표·자리
			if _frame < 3:
				return
			var c := Story.chapter(CH18)
			var bad: Array = []
			if String(c.get("id", "")) != "ch18" or int(c.ar) <= int(Story.chapter(CH17).ar) or int(_sq.call("ch")) != CH18 or bool(_sq.call("locked")):
				bad.append("chapter ch=%d locked=%s" % [_sq.call("ch"), _sq.call("locked")])
			var m: Variant = Story.MEMBERS.get(String(c.get("join", "")))
			if m == null or String(m.npc) != "dodam" or String(m.element) != "thunder" or String(m.weapon) != "claymore":
				bad.append("member")
			var info: Dictionary = Story.NPCS.dodam
			if String(info.region) != R or String(info.get("era", "")) != "현대" or not bool(info.get("goggles", false)):
				bad.append("dodam info")
			var db := _sq.find_child("StoryNpc_dodam", true, false)
			if db == null or db.find_child("Goggles", true, false) == null:
				bad.append("goggles")
			var dp: Vector3 = _sq.call("npc_pos", "dodam")
			if not _hits(dp).is_empty() or _flat(dp, _cell3(Skyport.STATION_CELL)) > 16.0:
				bad.append("dodam at %s hits %s" % [dp, _hits(dp)])
			for s in c.steps:
				if s.has("cell") and ["~", "^"].has(TestMap.tile_at(roundi(s.cell.x), roundi(s.cell.y), String(s.region))):
					bad.append("step on %s" % TestMap.tile_at(roundi(s.cell.x), roundi(s.cell.y), String(s.region)))
			## 잔상 길 — 점마다 역 바닥과 1m 안(선로 골)·명소 충돌 없음. 막차 지키는 자리·반디·도담 자리도 안 묻힘.
			var ground := _cell3(Skyport.STATION_CELL).y
			var chase: Dictionary = (c.steps as Array)[6]
			for pt in chase.path:
				var wp := _cell3(pt)
				if absf(wp.y - ground) > 1.0 or not _hits(wp).is_empty():
					bad.append("path %s y=%.1f hits %s" % [pt, wp.y, _hits(wp)])
			var defend: Dictionary = (c.steps as Array)[8]
			if not _hits(_cell3(defend.cell)).is_empty():
				bad.append("defend hits %s" % _hits(_cell3(defend.cell)))
			for w in Story.windows(Story.STATIONS.bandi).filter(func(w: Dictionary) -> bool: return int(w.ch) == CH18) + Story.windows(Story.STATIONS.dodam).filter(func(w: Dictionary) -> bool: return int(w.ch) == CH18):
				if String(w.region) != R or not _hits(_cell3(w.cell)).is_empty():
					bad.append("station %s" % w.cell)
			var light: Dictionary = (c.steps as Array)[4]
			if String(light.type) != "light" or not bool(light.get("bare", false)) or _flat(TestMap.world_pos(light.cell.x, light.cell.y, R), Skyport.substation_pos()) > 0.5:
				bad.append("substation step")
			var sk := get_tree().get_first_node_in_group("go_skyport_region")
			var lamps: Array = sk.get("_train_lights")
			if bool(sk.call("is_powered")) or lamps.is_empty() or (lamps[0] as Node3D).visible:
				bad.append("powered early")
			_check("ch18_table", bad.is_empty(), str(bad))
			_next()
		24: # [24] 반디(종각) → 역
			if _frame == 1:
				_v = _flat(_sq.call("npc_pos", "bandi"), TestMap.world_pos(2.64, 3.66, R))
			_talk("bandi", 1, "ch18_bandi", Vector2(5.0, 5.0), "bandi_at_belfry=%.1f" % float(_v), float(_v) < 1.0, 1)
		25: # [25] 역
			_go(2, "ch18_station", Vector2.INF)
		26: # [26] 도담 → 태양광 밭
			_talk("dodam", 3, "ch18_dodam", Vector2(3.5, 6.0))
		27: # [27] 무리 넷
			if _frame == 1:
				_put(_target() + Vector3(0, 0, 6))
			if _frame == 10:
				var es: Array = _sq.call("alive_quest_enemies")
				var here := es.filter(func(e: Node) -> bool: return TestMap.region_at((e as Node3D).global_position) == R).size()
				_v = {"n": es.size(), "here": here}
				for e in es:
					e.call("_die")
			if _frame == 16:
				_check("ch18_kill", int(_v.n) == 4 and int(_v.here) == 4 and int(_sq.call("st")) == 4, "n=%d here=%d st=%d" % [_v.n, _v.here, _sq.call("st")])
				_next()
		28: # [28] 변전함 — 돌 없음, 먼 원소는 안 되고 닿으면 다음 → 1초 안에 막차 전조등
			var sk := get_tree().get_first_node_in_group("go_skyport_region")
			var sub := Skyport.substation_pos()
			if _frame == 1:
				_put(sub + Vector3(0, 0, 3.0))
				_v = {}
			if _frame == 4:
				var alt := _sq.get("_altar") as Node3D
				_v.stone = alt.get_children().any(func(n: Node) -> bool: return (n as Node3D).visible)
				_sq.call("receive_element", sub + Vector3(20.0, 0.0, 0.0), 3.0, "thunder")
			if _frame == 6:
				_v.far_st = int(_sq.call("st"))
				_sq.call("receive_element", sub + Vector3(0.5, 0.0, 1.0), 3.0, "thunder")
			if _frame == 160:
				var lamps: Array = sk.get("_train_lights")
				var ok: bool = int(_sq.call("st")) == 5 and int(_v.far_st) == 4 and not bool(_v.stone) and bool(sk.call("is_powered")) and (lamps[0] as Node3D).is_visible_in_tree()
				_check("ch18_power", ok, "st=%d far_st=%d stone=%s powered=%s" % [_sq.call("st"), _v.far_st, _v.stone, sk.call("is_powered")])
				_next()
		29: # [29] 도담 → 잔상이 달아난다(선장 모자·가면 없음)
			if _frame == 1:
				_near_npc("dodam")
			if _frame == 10:
				_sq.call("interact")
				_drain()
			if _frame == 12:
				var th := _sq.get("_thief") as Node3D
				if th:
					_put(th.global_position + Vector3(0.0, 0.0, -6.0))
			if _frame == 40:
				var cs: Dictionary = _sq.call("chase_state")
				var th := _sq.get("_thief") as Node3D
				var body := th.get_node_or_null("Body") if th else null
				var cap: bool = body != null and body.find_child("Hat", true, false) != null and body.find_child("Mask", true, false) == null
				var ok: bool = int(_sq.call("st")) == 6 and bool(cs.run) and cap and String(_sq.call("tracker_text")).contains("선장의 잔상")
				_check("ch18_echo_runs", ok, "st=%d run=%s cap=%s tracker='%s'" % [_sq.call("st"), cs.run, cap, String(_sq.call("tracker_text")).replace("\n", " / ")])
				_next()
		30: # [30] 따라잡기
			if _frame == 1:
				_put((_sq.call("chase_state") as Dictionary).pos + Vector3(0.0, 0.5, 1.0))
			if _frame == 12:
				_check("ch18_catch", int(_sq.call("st")) == 7 and _sq.get("_thief") == null, "st=%d thief=%s" % [_sq.call("st"), _sq.get("_thief") != null])
				_next()
		31: # [31] 도담(선로 끝) → 막차
			if _frame == 1:
				_v = _flat(_sq.call("npc_pos", "dodam"), TestMap.world_pos(5.2, 6.85, R))
			_talk("dodam", 8, "ch18_dodam2", Vector2(5.0, 5.2), "dodam_at_end=%.1f" % float(_v), float(_v) < 1.0, 1)
		32: # [32] 막차 지키기 — 북쪽(객차)·산에서 안 나옴, 물결 셋
			if _frame == 1:
				_put(_target() + Vector3(2.5, 0.0, 2.5))
				_v = {"north": false, "mtn": false, "waves": 0, "label": ""}
			if _frame > 4 and _frame % 6 == 0 and int(_sq.call("st")) == 8:
				var lbl := _sq.get("_defend_label") as Label3D
				if lbl and String(_v.label) == "":
					_v.label = lbl.text
				var altar := _target()
				for e in _sq.call("alive_quest_enemies"):
					var ep := (e as Node3D).global_position
					var g := TestMap.grid_at(R, ep)
					if TestMap.tile_at(g.x, g.y, R) == "^":
						_v.mtn = true
					var d := Vector2(ep.x - altar.x, ep.z - altar.z)
					if d.length() > 8.0 and absf(d.angle_to(Vector2(0, -1))) < deg_to_rad(20.0):
						_v.north = true
					e.call("_die")
				_v.waves = maxi(int(_v.waves), int(_sq.call("defend_wave")) + 1)
			if _frame > 4 and (int(_sq.call("st")) != 8 or _frame > 600):
				var ok: bool = int(_sq.call("st")) == 9 and not bool(_v.north) and not bool(_v.mtn) and int(_v.waves) == 3 and String(_v.label).begins_with("출발을 기다리는 막차")
				_check("ch18_defend", ok, "st=%d north=%s mtn=%s waves=%d label='%s' frames=%d" % [_sq.call("st"), _v.north, _v.mtn, _v.waves, _v.label, _frame])
				_next()
		33: # [33] 도담 → 18장 끝·동료 도담
			if _frame == 1:
				_v = {"mora": PartyState.count("mora")}
				_near_npc("dodam")
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
			var ok: bool = int(_sq.call("ch")) == CH18 + 1 and jt.contains("✔ 제18장") and PartyState.count("mora") >= int(_v.mora) + 90000 \
				and PartyState.members.has("story_dodam") and Skyport.train_powered()
			_check("chapter18", ok, "ch=%d mora +%d dodam=%s powered=%s" % [_sq.call("ch"), PartyState.count("mora") - int(_v.mora), PartyState.members.has("story_dodam"), Skyport.train_powered()])
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
			print("STORY4_PROBE_DONE fails=%d" % _fails)
			get_tree().quit()

func _mast() -> Vector3:
	return Skyport.cell_pos(Skyport.PORT_CELL) + MAST_OFF

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
	return String(Story.step_of(int(_sq.call("ch")), st).get("region", R))

func _target() -> Vector3:
	return _sq.call("target_pos")

func _cell3(cell: Vector2) -> Vector3:
	var p := TestMap.world_pos(cell.x, cell.y, R)
	p.y = TerrainBuilder.height_at(R, p)
	return p

## 그 자리 1.2m 위에 걸리는 은하 나루 명소 충돌(지형은 뺀다).
func _hits(pos: Vector3) -> Array:
	var sk := get_tree().get_first_node_in_group("go_skyport_region")
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
		if c is Node and sk and sk.is_ancestor_of(c as Node) and not String((c as Node).get_parent().name).begins_with("Skyport"):
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
	print("STORY4_PROBE %s %s %s" % [name, "ok" if ok else "FAIL", detail])

func _next() -> void:
	_step += 1
	_frame = 0
