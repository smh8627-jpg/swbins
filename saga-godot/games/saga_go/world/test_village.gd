extends Node3D

const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")
const Perks := preload("res://games/saga_go/data/perks.gd")
const CompanionFollow := preload("res://saga_core/world/companion_follow.gd")

## VERTICAL_SLICE.md 12단계 루프의 마지막 단계 "다시 켜서 이어진다" —
## 씬이 다 만들어진 뒤(자식들의 _ready가 먼저 도는 Godot 기본 순서 그대로
## 이용) 저장 파일이 있으면 부대·플레이어 위치를 덮어쓴다. 없으면(첫
## 실행) 아무것도 안 하고 씬에 이미 놓인 스폰 위치 그대로 시작한다.
##
## 2026-09-11㉑ — "이미 끝낸 사건은 되살아나지 않는다"(EventState.gd)를
## 처음엔 각 사건 스크립트의 _ready()에서 `EventState.is_resolved(name)`
## 로 막으려 했는데, **실제로 확인해 보니 순서가 안 맞았다.** 위 주석대로
## "자식이 부모보다 먼저"는 맞지만, 그 말은 BanditEncounter 등 사건
## 노드들의 _ready()가 이 TestVillage._ready()(SaveState.try_load()를
## 부르는 자리)보다 **먼저** 끝난다는 뜻이었다 — 즉 사건 노드가 스스로를
## 확인하는 시점엔 EventState가 아직 텅 비어 있어(로드 전) 그 확인은
## 항상 무의미했다(임시로 두 _ready()에 순서 출력을 넣어 헤드리스로 직접
## 찍어 확인 — 추측 아님). 그래서 각 스크립트의 자체 확인은 지우고,
## 로드가 끝난 **뒤에** 여기서 한 번에 정리한다 — 사건 노드는 일단
## 평소대로 다 지어지고, 이미 끝난 것만 이 시점에 치운다.

func _ready() -> void:
	SaveState.try_load()
	_remove_resolved_events()
	if OS.get_environment("SAGA_DENSITY_REPORT") != "":
		_print_density_report()
	## PLAN 106장 ③ — 들판 적 무리.
	var spawner := preload("res://games/saga_go/combat/field_spawner.gd").new()
	spawner.name = "FieldSpawner"
	add_child(spawner)
	## PLAN 106장 ⑥ — 보물 상자(무리 잠금이 적의 home 을 보므로 FieldSpawner 뒤).
	var chests := preload("res://games/saga_go/world/treasure_spawner.gd").new()
	chests.name = "TreasureSpawner"
	add_child(chests)
	## 원신식 이동(go_player.gd) 자동 점검 — 측정할 때만 붙인다.
	if OS.get_environment("SAGA_TRAVERSAL_PROBE") != "":
		add_child(load("res://tools/probe_traversal.gd").new())
	if OS.get_environment("SAGA_COMBAT_PROBE") != "":
		add_child(load("res://tools/probe_field_combat.gd").new())
	if OS.get_environment("SAGA_TREASURE_PROBE") != "":
		add_child(load("res://tools/probe_treasure.gd").new())

	## PLAN.md 101-4 GO ①후보 "일과판" — 로드가 끝난 뒤(위와 같은 이유,
	## 세션 델타의 기준점이 로드 전 값이면 안 된다) 세션을 연다.
	PartyState.begin_session()
	CodexState.begin_session()
	QuestState.quest_changed.connect(_refresh_goal_board)
	CodexState.codex_changed.connect(_refresh_goal_board)
	PartyState.power_changed.connect(func(_atk: float, _def: float) -> void: _refresh_goal_board())
	PartyState.level_up.connect(_on_party_level_up)
	_refresh_goal_board()

	## 101-3 G "동행 실루엣" — 등용 인원 수만큼 Player 뒤를 따르는 실루엣.
	var companions := CompanionFollow.new()
	add_child(companions)
	companions.setup(get_tree().get_first_node_in_group("player"))
	companions.set_count(PartyState.members.size())
	PartyState.power_changed.connect(func(_atk: float, _def: float) -> void: companions.set_count(PartyState.members.size()))


## saga_core/ui/goal_board.gd는 QuestState·CodexState·PartyState를 모른다
## (saga_core가 GO만의 싱글턴을 알면 안 된다) — 그래서 이 셋을 다 아는
## 이 판의 월드 스크립트가 3줄을 조립해 넣어 준다. "이번 주"는 아직
## 없는 걸 있는 척하지 않고 "—"로 정직하게 비워 둔다(PLAN.md 105 Q-f
## 옆, 주간 축 자체가 101-1 §H의 열린 구멍).
func _refresh_goal_board() -> void:
	var board := get_tree().get_first_node_in_group("goal_board")
	if board == null:
		return
	var now: String
	if QuestState.active_id != "" and not QuestState.done:
		now = "사명: " + QuestState.active_name
	else:
		now = "도감 채우기 (%d/%d)" % [CodexState.count(), CodexState.total()]
	var session := "경험치 +%.0f · 발견 +%d" % [PartyState.session_exp_gained(), CodexState.session_discovered()]
	board.set_goals(now, session, "—")

## PLAN.md 104-5 — 지역 3(마을·포구·폐허) 발견 밀도(§3-E). 평소엔 안
## 돌린다(로그에 매번 섞이면 회귀 md5 가 흔들린다) — 측정할 때만
## `SAGA_DENSITY_REPORT=1` 로 켠다. "codex_discoverable" 그룹은
## landmarks_builder.gd·region2_coast.gd·region3_ruins.gd 의
## `_add_discovery_area()` 가 채운다.
func _print_density_report() -> void:
	var test_map := load("res://games/saga_go/data/test_map.gd")
	var density := load("res://saga_core/world/density_report.gd")
	var terrain := load("res://games/saga_go/world/terrain_builder.gd")
	for region_id in ["village", "coast", "ruins"]:
		var origin: Vector3 = test_map.origin_of(region_id)
		var size: Vector2i = test_map.size(region_id)
		var tile: float = test_map.tile_size_of(region_id)
		var half_w := size.x * 0.5 * tile
		var half_h := size.y * 0.5 * tile
		var points: Array = []
		for node in get_tree().get_nodes_in_group("codex_discoverable"):
			var local: Vector3 = (node as Node3D).global_position - origin
			if abs(local.x) <= half_w and abs(local.z) <= half_h:
				points.append(Vector2(local.x / tile + size.x * 0.5, local.z / tile + size.y * 0.5))
		## 2026-09-18 고침 — "^"(산)만 걸러내던 예전 식은 강("~")도 걸어
		## 들어갈 수 있는 칸처럼 셌다. terrain_builder.gd LEGEND가 이미
		## 칸마다 walkable 진위를 들고 있으니(강은 false) 그걸 그대로
		## 쓴다 — 포구는 격자 절반이 바다라 이 한 줄로 분모가 크게
		## 줄어든다(PLAN 101-1 E, HISTORY 09-18 재측정 참고).
		var walkable := func(x: int, y: int) -> bool:
			return terrain.LEGEND[test_map.tile_at(x, y, region_id)].walkable
		var report: Dictionary = density.report(size, tile, points, 60.0, walkable)
		print("DENSITY %s total=%d empty=%d empty_pct=%.1f" % [region_id, report.total, report.empty, report.empty_pct])

## PLAN.md 101-2 GO ②"승급 3택" — 부대가 레벨업할 때마다(웹판의 인물별
## rank up 대신 이 판 유일한 성장 지점인 부대 레벨을 쓴다) 공/수/보
## 축에서 하나씩 카드 3장 + 거절을 보여준다. npc_builder.gd
## `_show_offer_prompt()`와 같은 `layer_box` 관용구(ChoicePrompt 클로저
## 버그, PLAN.md 104-4 참고) — `opt`는 for 루프 변수라 별개(스냅샷 캡처가
## 매 반복 제 값을 찍는다는 걸 test_loop_closure.gd로 직접 확인했다).
func _on_party_level_up(new_level: int) -> void:
	var options: Array = Perks.roll_three(PartyState.perks)
	if options.is_empty():
		return # 풀 12를 이미 다 가졌다 — 더 줄 특성이 없다.
	var layer_box := {}
	var choices: Array = []
	for opt in options:
		var label := "%s [%s] +%d%%" % [opt.name, Perks.AXIS_LABEL[opt.axis], int(opt.mul * 100.0)]
		choices.append({"label": label, "cb": func() -> void:
			PartyState.add_perk(opt.id)
			(layer_box["layer"] as CanvasLayer).queue_free()})
	choices.append({"label": "거절한다 (경험치 +%d)" % int(PartyState.REJECT_EXP), "cb": func() -> void:
		PartyState.add_exp(PartyState.REJECT_EXP)
		(layer_box["layer"] as CanvasLayer).queue_free()})
	layer_box["layer"] = ChoicePrompt.build(self, "Lv.%d — 특성을 하나 고른다" % new_level, choices)


## TestVillage 바로 아래 자식 중 이름이 EventState.resolved에 있는
## 것들을 치운다. 사건 노드는 전부 이 씬의 직계 자식(BanditEncounter·
## HeroEncounter 등)이라 한 단계만 훑으면 된다 — 자식의 자식(패널·트리거
## Area3D 등)까지는 볼 필요 없다.
func _remove_resolved_events() -> void:
	for child in get_children():
		if EventState.is_resolved(child.name):
			child.queue_free()
