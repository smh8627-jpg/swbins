extends Node3D

## VERTICAL_SLICE.md Phase 6(61~71단계, Combat 61~71 — 72~74 엘리트/보스는
## 이번 슬라이스에서 스킵, PROJECT_STATE.md 2026-09-04 순서 재검토 참고).
## 29·34·35절의 "도적의 습격" 단 하나의 사건 + 실시간 전투를 잇는다.
##
## 승패를 가르는 수식은 `data/duel_rules.gd`(웹판 js/duel.js 그대로)가 맡는다 —
## 여기는 그 상태를 3D 세계에 그려 보여주는 화면 층일 뿐이다(duel.js가
## 판정/화면 두 층으로 나눈 것과 같은 경계).
##
## "값을 치른다"·"달아난다"(사건 선택지)는 골드·소지품 시스템이 아직 Godot
## 쪽에 없어(Phase 9 몫) 대사만 보여주고 넘어간다 — 여기서 새 경제 시스템을
## 만들지 않는다. 내 공격력·방어력도 Phase 7(Stats)이 없어 임시 상수다 —
## 부대 전투력이 들어오면 이 두 상수만 그 값으로 바꾸면 된다.

const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")

const GRID := Vector2i(5, 3)
const FOE_NAME := "산적"
const FOE_POWER := 120.0
const FOE_HP_MUL := 7.0                 # 웹판 event.js "event.foeHpMul" 기본값
const AMBUSH_RADIUS := 20.0
const RETRY_COOLDOWN_SEC := 8.0
const TOAST_SEC := 4.0

const PLACEHOLDER_ATK := 60.0           # Phase 7 Stats가 들어오면 부대 전투력으로 교체
const PLACEHOLDER_DEF := 35.0

enum State { IDLE, PROMPT, FIGHT, COOLDOWN }

var _state := State.IDLE
var _duel: DuelRules = null
var _cooldown_left := 0.0

var _area: Area3D
var _visual: MeshInstance3D
var _base_color := Color(0.5, 0.14, 0.14)

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
	var ch: String = TestMap.tile_at(GRID.x, GRID.y)
	var ground: float = TerrainBuilder.LEGEND[ch].height
	position = TestMap.world_pos(GRID.x, GRID.y) + Vector3(0, ground, 0)

	_visual = MeshInstance3D.new()
	var mesh := CapsuleMesh.new()
	mesh.radius = 0.9
	mesh.height = 3.4
	_visual.mesh = mesh
	_visual.position = Vector3(0, 1.7, 0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = _base_color
	_visual.material_override = mat
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
	_prompt_layer = CanvasLayer.new()
	_prompt_layer.visible = false
	add_child(_prompt_layer)

	var panel := PanelContainer.new()
	panel.anchor_left = 0.5
	panel.anchor_right = 0.5
	panel.anchor_top = 0.5
	panel.anchor_bottom = 0.5
	panel.offset_left = -190.0
	panel.offset_right = 190.0
	panel.offset_top = -120.0
	panel.offset_bottom = 130.0
	_prompt_layer.add_child(panel)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)
	panel.add_child(vbox)

	var title := Label.new()
	title.text = "🗡️ 도적의 습격\n\"길세를 내고 가라. 아니면 두고 가든지.\""
	title.autowrap_mode = 3 # TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(title)

	vbox.add_child(_make_menu_button("맞선다", _choose_fight))
	vbox.add_child(_make_menu_button("값을 치른다", _choose_pay))
	vbox.add_child(_make_menu_button("달아난다", _choose_flee_event))

func _make_menu_button(text: String, cb: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(0, 44)
	b.pressed.connect(cb)
	return b

func _choose_fight() -> void:
	_prompt_layer.hide()
	_start_fight()

func _choose_pay() -> void:
	_prompt_layer.hide()
	_toast(FOE_NAME + " — 길세를 치르고 지나갔다.")
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
	title.text = "🗡️ " + FOE_NAME
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
	var foe_hp := maxf(1.0, roundf(FOE_POWER * FOE_HP_MUL))
	_duel = DuelRules.create(foe_hp, PLACEHOLDER_ATK, PLACEHOLDER_DEF)
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
			_set_visual_color(_base_color)
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
		_toast(FOE_NAME + "을 물리쳤다. 두고 간 전대가 남았다.")
		queue_free() # 물리친 도적은 사라진다 — 이번 슬라이스에서는 다시 나지 않는다
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
	var tw := create_tween()
	tw.tween_property(_visual, "scale", Vector3.ONE * scale_to, 0.08)
	tw.tween_property(_visual, "scale", Vector3.ONE, 0.16)

func _set_visual_color(color: Color) -> void:
	var mat := _visual.material_override as StandardMaterial3D
	if mat:
		mat.albedo_color = color

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
