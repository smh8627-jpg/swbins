extends Node3D

## VERTICAL_SLICE.md Phase 6(61~71단계, Combat) — 29·34·35절의 "도적의 습격"
## 사건 + 실시간 전투를 잇는다. Vertical Slice 승인(PLAN.md 100단계, 2026-09-11
## 실기 확인) 이후 §30 "도적 두목 같은 강화형 사건"을 콘텐츠 확장 1호로 이
## 스크립트를 데이터 구동으로 바꿔 재사용했다 — TestVillage.tscn의
## BanditEncounter(산적)·BanditLeaderEncounter(도적 두목) 둘 다 이 스크립트고,
## @export 값만 다르다.
##
## 승패를 가르는 수식은 `data/duel_rules.gd`(웹판 js/duel.js 그대로)가 맡는다 —
## 여기는 그 상태를 3D 세계에 그려 보여주는 화면 층일 뿐이다(duel.js가
## 판정/화면 두 층으로 나눈 것과 같은 경계).
##
## "값을 치른다"·"달아난다"(사건 선택지)는 골드·소지품 시스템이 아직 Godot
## 쪽에 없어(Phase 9 몫) 대사만 보여주고 넘어간다 — 여기서 새 경제 시스템을
## 만들지 않는다. 내 공격력·방어력은 예전엔 이 파일의 임시 상수였는데,
## VERTICAL_SLICE.md 12단계 루프의 "도적이 부대에 합류한다"를 최소
## 구현하면서 games/saga_go/data/party_state.gd(자동 로드 싱글턴)의
## PartyState.atk/def로 옮겼다 — 도적을 이길 때마다 등용돼 이 값이 오른다.

const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")
const GLBUtils := preload("res://games/saga_go/world/glb_utils.gd")
const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")

## 2026-09-11 GLB 교체 — 플레이어(character-a)·주민(b·c)과 다른 글자를 써서
## 산적임을 옷 색만으로도 구별한다(docs/ASSET_GUIDE.md). 실측·스케일 근거는
## Player.tscn과 동일(2.7m 실측 → 1.25배).
const BANDIT_GLB := "res://assets/characters/character-d.glb"

const AMBUSH_RADIUS := 20.0
const RETRY_COOLDOWN_SEC := 8.0
const TOAST_SEC := 4.0

## 2026-09-11② — GO 사건 다양화(VERTICAL_SLICE §30). 예전엔 이 값들이 전부
## const라 "도적의 습격" 사건 하나만 표현할 수 있었다. @export로 바꿔
## 같은 스크립트를 인스턴스마다 다른 값으로 씬에 놓을 수 있게 했다 — 이번에
## 새로 만든 "도적 두목"(TestVillage.tscn의 BanditLeaderEncounter)이 이
## 스크립트를 그대로 재사용한다(§30 "새로 설계하지 않는다"와 같은 원칙).
@export var grid := Vector2i(5, 3)
@export var foe_name := "산적"
@export var foe_power := 120.0
@export var foe_hp_mul := 7.0           # 웹판 event.js "event.foeHpMul" 기본값
@export var bandit_scale := 1.25
@export var event_title := "🗡️ 도적의 습격"
@export var event_quote := "\"길세를 내고 가라. 아니면 두고 가든지.\""

## 물리친 적이 부대에 등용될 때 PartyState에 남기는 id. 아직 인물별
## 개성(saga_core 인물 데이터 연동)은 없다 — 이번 슬라이스는 "합류했다는
## 사실 자체"만 loop에 채운다.
@export var recruit_id := "산적"

## 비어 있지 않으면 승리 시 QuestState.complete(quest_id_to_complete)도
## 같이 부른다(§31 "마을의 부탁" — 도적 두목을 물리치면 사명이 끝난다).
@export var quest_id_to_complete := ""

## 웹판 event.js "bandit_ambush" 승리 시 exp:40과 같은 값. 도적 두목은
## 전투력 차이(약 2배)에 맞춰 TestVillage.tscn에서 더 높게 덮어쓴다.
@export var foe_exp_reward := 40.0

enum State { IDLE, PROMPT, FIGHT, COOLDOWN }

var _state := State.IDLE
var _duel: DuelRules = null
var _cooldown_left := 0.0

var _area: Area3D
var _visual: Node3D
## GLB로 바뀐 뒤로는 평소엔 텍스처 그대로 보여준다(material_override를
## 걸지 않는다) — "강타 예고" 순간에만 몸 전체를 물들이고 바로 원래
## 텍스처로 되돌린다. _base_color는 GLB를 못 받아 왔을 때의 캡슐
## 대체용으로만 쓴다.
var _base_color := Color(0.5, 0.14, 0.14)
var _using_glb := false

var _prompt_layer: CanvasLayer
var _combat_layer: CanvasLayer
var _flash_rect: ColorRect
var _hp_bar: ProgressBar
var _morale_bar: ProgressBar
var _ki_bar: ProgressBar
var _timer_label: Label
var _ult_button: Button

func _ready() -> void:
	_spawn_visual()
	_spawn_area()
	_build_prompt_ui()
	_build_combat_ui()

func _spawn_visual() -> void:
	var ch: String = TestMap.tile_at(grid.x, grid.y)
	var ground: float = TerrainBuilder.LEGEND[ch].height
	position = TestMap.world_pos(grid.x, grid.y) + Vector3(0, ground, 0)

	var scene: PackedScene = load(BANDIT_GLB)
	if scene != null:
		_visual = scene.instantiate()
		_visual.scale = Vector3.ONE * bandit_scale
		_using_glb = true
	else:
		## 못 받아 왔으면 예전 캡슐 — 산적이 아예 안 보이는 것보단 낫다.
		var mi := MeshInstance3D.new()
		var mesh := CapsuleMesh.new()
		mesh.radius = 0.9
		mesh.height = 3.4
		mi.mesh = mesh
		mi.position = Vector3(0, 1.7, 0)
		var mat := StandardMaterial3D.new()
		mat.albedo_color = _base_color
		mi.material_override = mat
		_visual = mi
	add_child(_visual)

func _spawn_area() -> void:
	_area = Area3D.new()
	_area.name = "AmbushArea"
	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = AMBUSH_RADIUS
	cs.shape = shape
	_area.add_child(cs)
	add_child(_area)

func _process(delta: float) -> void:
	match _state:
		State.IDLE:
			if _player_in_range():
				_state = State.PROMPT
				_prompt_layer.show()
		State.FIGHT:
			if _duel:
				var events: Array = _duel.step(delta)
				for e in events:
					_on_duel_event(e)
				_refresh_combat_ui()
				if _duel.over:
					_finish_fight()
		State.COOLDOWN:
			_cooldown_left -= delta
			if _cooldown_left <= 0.0:
				_state = State.IDLE

func _player_in_range() -> bool:
	for b in _area.get_overlapping_bodies():
		if b.is_in_group("player"):
			return true
	return false

func _unhandled_input(event: InputEvent) -> void:
	if _state != State.FIGHT:
		return
	if event.is_action_pressed("combat_quick"):
		_do_act("quick")
	elif event.is_action_pressed("combat_ult"):
		_do_act("ult")
	elif event.is_action_pressed("combat_dodge"):
		_do_act("dodge")

## ── 사건 선택지 (event.js bandit_ambush) ────────────────────────────
func _build_prompt_ui() -> void:
	_prompt_layer = ChoicePrompt.build(self, event_title + "\n" + event_quote, [
		{"label": "맞선다", "cb": _choose_fight},
		{"label": "값을 치른다", "cb": _choose_pay},
		{"label": "달아난다", "cb": _choose_flee_event},
	])
	_prompt_layer.visible = false

func _choose_fight() -> void:
	_prompt_layer.hide()
	_start_fight()

func _choose_pay() -> void:
	_prompt_layer.hide()
	_toast(foe_name + " — 길세를 치르고 지나갔다.")
	_enter_cooldown()

func _choose_flee_event() -> void:
	_prompt_layer.hide()
	_toast("어둠 속으로 달아났다.")
	_enter_cooldown()

## ── 전투 화면 ────────────────────────────────────────────────────
func _build_combat_ui() -> void:
	_combat_layer = CanvasLayer.new()
	_combat_layer.visible = false
	add_child(_combat_layer)

	_flash_rect = ColorRect.new()
	_flash_rect.color = Color(1, 0.15, 0.15, 0.0)
	_flash_rect.anchor_right = 1.0
	_flash_rect.anchor_bottom = 1.0
	_flash_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_combat_layer.add_child(_flash_rect)

	var box := VBoxContainer.new()
	box.anchor_right = 1.0
	box.offset_left = 40.0
	box.offset_right = -40.0
	box.offset_top = 40.0
	box.offset_bottom = 260.0
	box.add_theme_constant_override("separation", 6)
	_combat_layer.add_child(box)

	var head := HBoxContainer.new()
	box.add_child(head)
	var title := Label.new()
	title.text = "🗡️ " + foe_name
	title.add_theme_font_size_override("font_size", 24)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(title)
	_timer_label = Label.new()
	_timer_label.add_theme_font_size_override("font_size", 24)
	head.add_child(_timer_label)

	_hp_bar = _add_bar_row(box, "기세")
	_morale_bar = _add_bar_row(box, "사기")
	_ki_bar = _add_bar_row(box, "기(氣)")

	var pad := HBoxContainer.new()
	pad.add_theme_constant_override("separation", 12)
	box.add_child(pad)
	pad.add_child(_make_combat_button("속공\n(J)", func() -> void: _do_act("quick")))
	_ult_button = _make_combat_button("필살\n(K)", func() -> void: _do_act("ult"))
	pad.add_child(_ult_button)
	pad.add_child(_make_combat_button("회피\n(L)", func() -> void: _do_act("dodge")))
	pad.add_child(_make_combat_button("물러난다", _flee_combat))

func _add_bar_row(parent: VBoxContainer, label_text: String) -> ProgressBar:
	var row := HBoxContainer.new()
	parent.add_child(row)
	var lbl := Label.new()
	lbl.text = label_text
	lbl.custom_minimum_size = Vector2(70.0, 0.0)
	row.add_child(lbl)
	var bar := ProgressBar.new()
	bar.min_value = 0.0
	bar.max_value = 100.0
	bar.value = 100.0
	bar.show_percentage = false
	bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(bar)
	return bar

func _make_combat_button(text: String, cb: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(90.0, 64.0)
	b.pressed.connect(cb)
	return b

func _start_fight() -> void:
	_state = State.FIGHT
	var foe_hp := maxf(1.0, roundf(foe_power * foe_hp_mul))
	_duel = DuelRules.create(foe_hp, PartyState.atk, PartyState.def)
	_combat_layer.show()
	_refresh_combat_ui()

func _do_act(kind: String) -> void:
	if not _duel:
		return
	var r: Dictionary = _duel.act(kind)
	if r.get("ok", false):
		if kind == "quick":
			_pulse_visual(1.15)
		elif kind == "ult":
			_pulse_visual(1.4)
	_refresh_combat_ui()
	if _duel.over:
		_finish_fight()

func _flee_combat() -> void:
	if _duel:
		_duel.flee()
		_finish_fight()

func _on_duel_event(e: Dictionary) -> void:
	match e.t:
		"tell":
			_toast("강타가 온다 — 피하라!")
			_set_visual_color(Color(1.0, 0.55, 0.1))
		"heavy":
			_clear_visual_color()
			var dodged: bool = e.get("dodged", false)
			var col: Color = Color(0.2, 1.0, 0.4, 0.35) if dodged else Color(1.0, 0.15, 0.15, 0.45)
			_screen_flash(col)
		"hit":
			_screen_flash(Color(1.0, 0.15, 0.15, 0.3))

func _refresh_combat_ui() -> void:
	if not _duel:
		return
	_hp_bar.value = clampf(_duel.hp / _duel.foe_hp * 100.0, 0.0, 100.0)
	_morale_bar.value = clampf(_duel.morale / _duel.morale_max * 100.0, 0.0, 100.0)
	_ki_bar.value = clampf(_duel.ki / DuelRules.KI_MAX * 100.0, 0.0, 100.0)
	_timer_label.text = str(ceili(maxf(0.0, _duel.left))) + "초"
	_ult_button.disabled = _duel.ki < DuelRules.KI_MAX

func _finish_fight() -> void:
	var cleared: bool = _duel.cleared
	var dealt: float = _duel.dealt
	_combat_layer.hide()
	_duel = null
	if cleared:
		PartyState.recruit(recruit_id)
		PartyState.add_exp(foe_exp_reward)
		var msg := foe_name + "을 물리쳤다 — 부대에 합류했다! (전투력 %d)" % int(PartyState.atk + PartyState.def)
		if quest_id_to_complete != "":
			QuestState.complete(quest_id_to_complete)
			msg += "\n📋 사명을 완료했다!"
		_toast(msg)
		queue_free() # 물리친 적은 사라진다 — 이번 슬라이스에서는 다시 나지 않는다
		return
	if dealt <= 0.0:
		# 한 대도 못 때리고 물러난 것은 패배로 안 친다(웹판 event.js와 같은 경계)
		_toast("물러났다.")
	else:
		_toast("밀렸다. 물러났다.")
	_enter_cooldown()

func _enter_cooldown() -> void:
	_state = State.COOLDOWN
	_cooldown_left = RETRY_COOLDOWN_SEC

func _pulse_visual(scale_to: float) -> void:
	## GLB는 평소 스케일이 1.0이 아니라 bandit_scale이다 — 원래 크기로
	## 돌아오는 지점도 그 값이어야 "펀치 후 원래 크기"가 맞는다.
	var base := bandit_scale if _using_glb else 1.0
	var tw := create_tween()
	tw.tween_property(_visual, "scale", Vector3.ONE * scale_to * base, 0.08)
	tw.tween_property(_visual, "scale", Vector3.ONE * base, 0.16)

## GLB로 바뀐 뒤로는 캡슐 하나가 아니라 몸통·팔·다리·머리가 각각 다른
## MeshInstance3D다 — "강타 예고" 때 몸 전체를 물들이려면 전부 찾아
## 같이 바꿔야 한다(games/saga_go/world/glb_utils.gd 참고).
func _set_visual_color(color: Color) -> void:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	for mi in GLBUtils.find_all_mesh_instances(_visual):
		mi.material_override = mat

## 텔레그래프가 끝나면 원래 텍스처로 되돌린다(GLB일 때). 캡슐 대체
## 상태였다면 기본 색으로 되돌린다.
func _clear_visual_color() -> void:
	if _using_glb:
		for mi in GLBUtils.find_all_mesh_instances(_visual):
			mi.material_override = null
	else:
		_set_visual_color(_base_color)

func _screen_flash(color: Color) -> void:
	_flash_rect.color = color
	var tw := create_tween()
	tw.tween_property(_flash_rect, "color:a", 0.0, 0.35)

func _toast(text: String) -> void:
	var labels := get_tree().get_nodes_in_group("dialogue_label")
	if labels.is_empty():
		return
	var label: Label = labels[0]
	label.text = text
	label.show()
	get_tree().create_timer(TOAST_SEC).timeout.connect(func() -> void:
		if is_instance_valid(label) and label.text == text:
			label.hide()
	)
