extends Node
## GO 이야기 임무(106장 ㉕) 자동 점검 — 평소엔 안 붙는다. test_village.gd 가 SAGA_STORY_PROBE 가 있을 때만 단다.
##
##   SAGA_STORY_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/world/TestVillage.tscn
##
## ① 표(장 둘·인물·보스·비경 id) ② 처음 — 추적 글자·목표 = 촌장 ③ 촌장 대화(고르는 줄 포함) → 다음 단계·멈춤 풀림
## ④ 그 자리 가기 ⑤ 들판 보스 쓰러뜨리기 ⑥ 사공 대화 → 임무 적 넷 ⑦ 다 쓰러뜨리기 ⑧ 학자 대화 → 제단
## ⑨ 원소로 제단 밝히기 ⑩ 촌장 → 1장 끝·보상·2장은 모험 등급 5 에 잠김 ⑪ 잠긴 동안은 혼잣말만
## ⑫ 2장 — 학자·제단 가기·주간 보스 비경 깨기·촌장 → 다 끝남 ⑬ 임무 목록(O).
## 저장은 안 한다(부대 경험·이야기 상태는 메모리에서만 바꾸고 끝에 되돌린다).

const Story := preload("res://games/saga_go/data/story.gd")
const FieldBosses := preload("res://games/saga_go/world/field_bosses.gd")
const Domains := preload("res://games/saga_go/data/domains.gd")
const FieldEnemy := preload("res://games/saga_go/combat/field_enemy.gd")

var _p: CharacterBody3D
var _sq: Node
var _fb: Node
var _dm: Node
var _frame := 0
var _step := 0
var _fails := 0
var _v: Variant = null
var _saved := {}

func _ready() -> void:
	Weather.force("clear")
	_p = get_tree().get_first_node_in_group("player")

func _physics_process(_delta: float) -> void:
	_frame += 1
	if _sq == null:
		_sq = get_tree().get_first_node_in_group("go_story")
		_fb = get_tree().get_first_node_in_group("go_field_bosses")
		_dm = get_tree().get_first_node_in_group("go_domains")
		_frame = 0
		return
	match _step:
		0: # 준비 — 처음부터, 부대 경험 0(1장 보상으로 모험 등급 5 를 넘지 않게)
			_saved = {"story": PartyState.story.duplicate(), "exp": PartyState.exp, "level": PartyState.level, "resin": PartyState.resin, "resin_t": PartyState.resin_t}
			PartyState.exp = 0.0
			PartyState.level = 0
			PartyState.story = {}
			_sq.call("_enter_step")
			_next()
		1: # ① 표
			var ok := Story.CHAPTERS.size() == 2
			for c in Story.CHAPTERS:
				for s in c.steps:
					match String(s.type):
						"talk": ok = ok and Story.NPCS.has(String(s.npc)) and (s.lines as Array).size() > 0
						"boss": ok = ok and FieldBosses.FB.BOSSES.has(String(s.boss))
						"domain": ok = ok and Domains.DOMAINS.has(String(s.domain))
						"go", "kill", "light": ok = ok and s.has("region") and s.has("cell")
						_: ok = false
			_check("table", ok, "chapters=%d" % Story.CHAPTERS.size())
			_next()
		2: # ② 처음
			var t: Vector3 = _sq.call("target_pos")
			var tx: String = _sq.call("tracker_text")
			_check("start", int(_sq.call("st")) == 0 and t.distance_to(_sq.call("npc_pos", "elder")) < 0.01 and tx.contains("제1장") and tx.contains("촌장"), "tracker='%s'" % tx.replace("\n", " / "))
			_next()
		3: # ③ 촌장 대화
			if _frame == 1:
				_near_npc("elder")
			if _frame == 10:
				var btn := bool((_sq.get("_talk_btn") as Button).visible) # 숨긴 선택지 창이 그룹에 남아 있어도 단추는 보여야
				var opened: bool = _sq.call("interact")
				var modal := _sq.is_in_group("ui_modal") and bool(_p.get("frozen"))
				var choices := _drain()
				_check("talk_elder", btn and opened and modal and choices == 1 and int(_sq.call("st")) == 1 and not bool(_p.get("frozen")) and not _sq.is_in_group("ui_modal"),
					"btn=%s opened=%s modal=%s choices=%d st=%d" % [btn, opened, modal, choices, _sq.call("st")])
				_next()
		4: # ④ 가기
			if _frame == 1:
				_put(_sq.call("target_pos"))
			if _frame == 10:
				_check("go", int(_sq.call("st")) == 2, "st=%d" % _sq.call("st"))
				_next()
		5: # ⑤ 들판 보스
			if _frame == 1:
				_fb.call("boss", "gale_roc").call("_die")
			if _frame == 5:
				_check("boss", int(_sq.call("st")) == 3 and _fb.call("has_bloom", "gale_roc"), "st=%d" % _sq.call("st"))
				_next()
		6: # ⑥ 사공 → 임무 적
			if _frame == 1:
				_near_npc("ferryman")
			if _frame == 10:
				_sq.call("interact")
				_drain()
				var n := (_sq.call("alive_quest_enemies") as Array).size()
				_check("talk_ferryman", int(_sq.call("st")) == 4 and n == 4, "st=%d enemies=%d" % [_sq.call("st"), n])
				_next()
		7: # ⑦ 다 쓰러뜨리기
			if _frame == 1:
				for e in _sq.call("alive_quest_enemies"):
					e.call("_die")
			if _frame == 5:
				_check("kill", int(_sq.call("st")) == 5, "st=%d" % _sq.call("st"))
				_next()
		8: # ⑧ 학자 → 제단
			if _frame == 1:
				_near_npc("scholar")
			if _frame == 10:
				_sq.call("interact")
				_drain()
				var altar: Node = _sq.get("_altar")
				_check("talk_scholar", int(_sq.call("st")) == 6 and altar != null and _sq.is_in_group("element_receiver"), "st=%d" % _sq.call("st"))
				_next()
		9: # ⑨ 제단 밝히기 — 멀리서는 안 되고 곁에서 된다
			if _frame == 1:
				var ap: Vector3 = (_sq.get("_altar") as Node3D).global_position
				_sq.call("receive_element", ap + Vector3(20.0, 0.0, 0.0), 4.0, "water")
				_v = int(_sq.call("st"))
				get_tree().call_group("element_receiver", "receive_element", ap + Vector3(1.0, 0.0, 0.0), 4.0, "water")
			if _frame == 90:
				_check("light", int(_v) == 6 and int(_sq.call("st")) == 7, "far_st=%d st=%d" % [_v, _sq.call("st")])
				_next()
		10: # ⑩ 1장 끝
			if _frame == 1:
				_near_npc("elder")
			if _frame == 10:
				var knots := PartyState.count("fate_knot")
				_sq.call("interact")
				_drain()
				var tx: String = _sq.call("tracker_text")
				var ok: bool = int(_sq.call("ch")) == 1 and int(_sq.call("st")) == 0 and PartyState.count("fate_knot") == knots + 2 \
					and _sq.call("locked") and tx.contains("모험 등급 5") and _sq.call("target_pos") == Vector3.INF
				_check("chapter1_done", ok, "ch=%d knots %d→%d ar=%d tracker='%s'" % [_sq.call("ch"), knots, PartyState.count("fate_knot"), PartyState.level + 1, tx.replace("\n", " / ")])
				_next()
		11: # ⑪ 잠긴 동안은 혼잣말(그 전에 1장 경험으로 뜬 승급 3택 창을 닫는다 — 창이 떠 있으면 말을 안 건다)
			if _frame == 1:
				_v = not _sq.call("interact") if _visible_prompts() > 0 else true
				_dismiss_prompts()
				return
			if _frame < 6:
				_dismiss_prompts()
				return
			var blocked := bool(_v)
			var opened: bool = _sq.call("interact")
			var lines := (_sq.get("_dlg_lines") as Array).size()
			_drain()
			_check("locked_idle", blocked and opened and lines == 1 and int(_sq.call("ch")) == 1 and int(_sq.call("st")) == 0, "lines=%d" % lines)
			_next()
		12: # ⑫ 2장
			if _frame == 1:
				PartyState.exp = 400.0
				PartyState.level = 4 # 모험 등급 5
				PartyState.resin = Domains.RESIN_MAX
				PartyState.resin_t = Domains.now()
				_sq.call("_refresh")
				_near_npc("scholar")
			if _frame == 10:
				_sq.call("interact")
				_drain()
				_put(_sq.call("target_pos"))
			if _frame == 20:
				_v = [int(_sq.call("st"))]
				_dm.call("enter", "weekly", 0)
			if _frame == 230:
				for e in _dm.call("alive_enemies"):
					e.call("_die")
			if _frame == 236:
				_v.append(int(_sq.call("st")))
				_dm.call("leave")
			if _frame == 250:
				_near_npc("elder")
			if _frame == 260:
				_sq.call("interact")
				_drain()
				var ok: bool = int(_v[0]) == 2 and int(_v[1]) == 3 and int(_sq.call("ch")) == 2 and _sq.call("tracker_text") == "" and _sq.call("target_pos") == Vector3.INF
				_check("chapter2", ok, "go_st=%d domain_st=%d ch=%d" % [_v[0], _v[1], _sq.call("ch")])
				_next()
		13: # ⑬ 임무 목록
			if _frame < 6:
				_dismiss_prompts()
				return
			_sq.call("toggle_journal")
			var jt: String = _sq.call("journal_text")
			var open: bool = _sq.call("is_journal_open")
			_sq.call("toggle_journal")
			_check("journal", open and jt.contains("✔ 제1장") and jt.contains("✔ 제2장") and not _sq.call("is_journal_open"), "text=%s" % jt.replace("\n", " / "))
			_next()
		14:
			PartyState.story = _saved.story
			PartyState.exp = _saved.exp
			PartyState.level = _saved.level
			PartyState.resin = _saved.resin
			PartyState.resin_t = _saved.resin_t
			print("STORY_PROBE_DONE fails=%d" % _fails)
			get_tree().quit()

## 보이는 선택지 창(승급 3택 등) 수 — 이야기 노드 자신은 뺀다.
func _visible_prompts() -> int:
	return get_tree().get_nodes_in_group("ui_modal").filter(func(n: Node) -> bool: return n != _sq and n.get("visible") != false).size()

## 보이는 선택지 창마다 첫 단추를 한 번 누른다(사람이 고르는 것처럼). 창은 그 프레임 끝에 사라지므로 몇 프레임 뒤에 본다.
var _pressed: Array = []

func _dismiss_prompts() -> void:
	for n in get_tree().get_nodes_in_group("ui_modal"):
		if n == _sq or n.get("visible") == false or _pressed.has(n):
			continue
		_pressed.append(n)
		var btns := (n as Node).find_children("*", "Button", true, false)
		if not btns.is_empty():
			(btns[0] as Button).pressed.emit()

## 대화를 끝까지 넘긴다(고르는 줄은 첫 대답). 고른 줄 수를 돌려준다.
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

func _near_npc(id: String) -> void:
	_dismiss_prompts()
	_put(_sq.call("npc_pos", id) + Vector3(0.0, 0.3, 1.5))

func _put(pos: Vector3) -> void:
	_p.global_position = pos + Vector3(0.0, 0.3, 0.0)
	_p.velocity = Vector3.ZERO

func _check(name: String, ok: bool, detail: String) -> void:
	if not ok:
		_fails += 1
	print("STORY_PROBE %s %s %s" % [name, "ok" if ok else "FAIL", detail])

func _next() -> void:
	_step += 1
	_frame = 0
