extends CanvasLayer

## PLAN 106장 ⑩ — 원신식 인물 화면(C · 가방 B · 왼쪽 위 "인물" 단추). test_village.gd 가 붙인다(GO 만).
##   왼쪽: 인물 목록(나 + 등용한 동료 전원) · 가운데: 레벨/상한·경험 막대·돌파 단계·체력/공격/방어,
##   견문록 쓰기(한 레벨 올리기 · 권마다) · 돌파(상한에 닿고 재료가 있으면) · 오른쪽: 가방.
##   106장 ⑫: 가운데 아래 특성 셋(기본 공격·원소 스킬·원소 폭발, 줄마다 "올리기") · 운명의 자리(여섯 효과·"열기").
## 열려 있는 동안 그룹 ui_modal(마우스 시점이 커서를 풀어 줌) + 플레이어 frozen.

const Growth := preload("res://games/saga_go/data/growth.gd")
const Elements := preload("res://games/saga_go/combat/elements.gd")
const Characters := preload("res://saga_core/data/characters.gd")

var is_open := false
var selected := "self"

var _player: Node = null
var _root: Control = null
var _list: VBoxContainer = null
var _title: Label = null
var _level: Label = null
var _exp_bar: ProgressBar = null
var _stats: Label = null
var _asc_label: Label = null
var _asc_button: Button = null
var _book_buttons: Dictionary = {}
var _once_button: Button = null
var _bag_label: Label = null
var _talent_title: Label = null
var _talent_buttons: Dictionary = {}
var _con_label: Label = null
var _con_button: Button = null
var _frozen_before := false

func _ready() -> void:
	layer = 6
	add_to_group("go_character_screen")
	for pair in [["go_character", KEY_C], ["go_bag", KEY_B]]:
		if not InputMap.has_action(pair[0]):
			InputMap.add_action(pair[0])
			var ev := InputEventKey.new()
			ev.physical_keycode = pair[1]
			InputMap.action_add_event(pair[0], ev)
	_build()
	var open_btn := Button.new()
	open_btn.text = "인물 (C)"
	open_btn.position = Vector2(222, 20)
	open_btn.size = Vector2(96, 40)
	open_btn.pressed.connect(open_screen)
	add_child(open_btn)
	PartyState.bag_changed.connect(_refresh)
	PartyState.growth_changed.connect(func(_id: String) -> void: _refresh())

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("go_character") or event.is_action_pressed("go_bag"):
		if is_open:
			close_screen()
		else:
			open_screen()
		get_viewport().set_input_as_handled()
	elif is_open and event is InputEventKey and (event as InputEventKey).pressed and (event as InputEventKey).keycode == KEY_ESCAPE:
		close_screen()
		get_viewport().set_input_as_handled()

## 나 + 등용한 동료 전원(겹치는 id 는 한 번).
func owned() -> Array[String]:
	var out: Array[String] = ["self"]
	for id in PartyState.members:
		if not out.has(id):
			out.append(id)
	return out

func _name(id: String) -> String:
	if id == "self":
		return "나"
	var h: Variant = Characters.find(id)
	return h.name if h != null else id

func _rarity(id: String) -> int:
	if id == "self":
		return 5
	var h: Variant = Characters.find(id)
	return int(h.get("rarity", 2)) if h != null else 2

# ---------------------------------------------------------------- 짓기

func _build() -> void:
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.visible = false
	add_child(_root)
	var dim := ColorRect.new()
	dim.color = Color(0.05, 0.06, 0.1, 0.82)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.add_child(dim)

	var cols := HBoxContainer.new()
	cols.set_anchors_preset(Control.PRESET_FULL_RECT)
	cols.offset_left = 30
	cols.offset_right = -30
	cols.offset_top = 70
	cols.offset_bottom = -30
	cols.add_theme_constant_override("separation", 24)
	_root.add_child(cols)

	var left := ScrollContainer.new()
	left.custom_minimum_size = Vector2(220, 0)
	cols.add_child(left)
	_list = VBoxContainer.new()
	_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.add_child(_list)

	var mid_scroll := ScrollContainer.new()
	mid_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	mid_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	cols.add_child(mid_scroll)
	var mid := VBoxContainer.new()
	mid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	mid.add_theme_constant_override("separation", 10)
	mid_scroll.add_child(mid)
	_title = _label(mid, 28)
	_level = _label(mid, 20)
	_exp_bar = ProgressBar.new()
	_exp_bar.custom_minimum_size = Vector2(0, 14)
	_exp_bar.show_percentage = false
	mid.add_child(_exp_bar)
	_asc_label = _label(mid, 16)
	_stats = _label(mid, 18)
	var books := HBoxContainer.new()
	books.add_theme_constant_override("separation", 8)
	mid.add_child(books)
	_once_button = Button.new()
	_once_button.text = "한 레벨 올리기"
	_once_button.custom_minimum_size = Vector2(0, 44)
	_once_button.pressed.connect(func() -> void: PartyState.level_up_once(selected))
	books.add_child(_once_button)
	for book in Growth.BOOKS:
		var b := Button.new()
		b.custom_minimum_size = Vector2(0, 44)
		var bk: String = book
		b.pressed.connect(func() -> void: PartyState.use_book(selected, bk, 1))
		books.add_child(b)
		_book_buttons[book] = b
	_asc_button = Button.new()
	_asc_button.text = "돌파"
	_asc_button.custom_minimum_size = Vector2(0, 48)
	_asc_button.pressed.connect(func() -> void: PartyState.ascend(selected))
	mid.add_child(_asc_button)

	_talent_title = _label(mid, 20)
	for kind in Growth.TALENTS:
		var tb := Button.new()
		tb.custom_minimum_size = Vector2(0, 40)
		tb.alignment = HORIZONTAL_ALIGNMENT_LEFT
		var k: String = kind
		tb.pressed.connect(func() -> void: PartyState.talent_up(selected, k))
		mid.add_child(tb)
		_talent_buttons[kind] = tb
	_con_label = _label(mid, 16)
	_con_button = Button.new()
	_con_button.custom_minimum_size = Vector2(0, 44)
	_con_button.pressed.connect(func() -> void: PartyState.unlock_constellation(selected))
	mid.add_child(_con_button)

	var right := VBoxContainer.new()
	right.custom_minimum_size = Vector2(240, 0)
	cols.add_child(right)
	var bag_title := _label(right, 22)
	bag_title.text = "가방"
	_bag_label = _label(right, 16)

	var close := Button.new()
	close.text = "닫기"
	close.position = Vector2(30, 18)
	close.size = Vector2(90, 42)
	close.pressed.connect(close_screen)
	_root.add_child(close)

func _label(parent: Control, size_px: int) -> Label:
	var l := Label.new()
	l.add_theme_font_size_override("font_size", size_px)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	parent.add_child(l)
	return l

# ---------------------------------------------------------------- 보여 주기

func _refresh() -> void:
	if _root == null or not is_open:
		return
	for c in _list.get_children():
		c.queue_free()
	for id in owned():
		var b := Button.new()
		var el := Elements.element_of(id)
		b.text = "%s  Lv.%d  [%s]" % [_name(id), PartyState.char_level(id), Elements.name_of(el)]
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.custom_minimum_size = Vector2(0, 40)
		b.modulate = Elements.color_of(el).lightened(0.45) if id != selected else Color.WHITE
		var pick: String = id
		b.pressed.connect(func() -> void: select(pick))
		_list.add_child(b)

	var id := selected
	var g := PartyState.growth_of(id)
	var lv := int(g.lv)
	var asc := int(g.asc)
	var cap := Growth.cap_of(asc)
	var el := Elements.element_of(id)
	_title.text = "%s  %s  [%s]" % [_name(id), "★".repeat(_rarity(id)), Elements.name_of(el)]
	_title.add_theme_color_override("font_color", Elements.color_of(el).lightened(0.3))
	_level.text = "Lv. %d / %d" % [lv, cap]
	_exp_bar.max_value = Growth.exp_to_next(lv)
	_exp_bar.value = float(g.exp) if lv < cap else _exp_bar.max_value
	_asc_label.text = "돌파 %s" % ("◆".repeat(asc) + "◇".repeat(Growth.MAX_ASC - asc))
	var fc := get_tree().get_first_node_in_group("go_field_combat")
	var hp: float = fc.call("max_hp_of", id) if fc else 0.0
	var atk: float = fc.call("char_atk", id) if fc else PartyState.char_atk(id)
	_stats.text = "체력 %d   공격 %d   방어 %d" % [int(hp), int(atk), int(PartyState.char_def(id))]

	var at_cap := lv >= cap
	_once_button.disabled = at_cap
	for book in Growth.BOOKS:
		var b: Button = _book_buttons[book]
		var gain: int = Growth.ITEMS[book].exp
		b.text = "%s ×%d (%d냥)" % [Growth.item_name(book), PartyState.count(book), int(ceil(gain * Growth.MORA_PER_EXP))]
		b.disabled = at_cap or PartyState.count(book) <= 0
	var cost := Growth.ascend_cost(id, asc)
	if cost.is_empty():
		_asc_button.text = "돌파 끝"
		_asc_button.disabled = true
	else:
		var parts: Array[String] = []
		for item in cost:
			parts.append("%s %d/%d" % [Growth.item_name(item), PartyState.count(item), int(cost[item])])
		_asc_button.text = ("돌파 → Lv.%d 까지  |  " % Growth.cap_of(asc + 1)) + " · ".join(parts)
		_asc_button.disabled = not PartyState.can_ascend(id)
		if not at_cap:
			_asc_button.text += "  (Lv.%d 에 닿아야)" % cap

	var t_cap := PartyState.talent_cap(id)
	_talent_title.text = "특성  (상한 Lv.%d%s)" % [t_cap, "" if t_cap >= Growth.TALENT_MAX else " — 돌파하면 늘어난다"]
	for kind in Growth.TALENTS:
		var tb: Button = _talent_buttons[kind]
		var t_lv := PartyState.talent_level(id, kind)
		var bonus := PartyState.talent_effective(id, kind) - t_lv
		var head := "%s  Lv.%d%s  ×%.2f" % [Growth.TALENT_NAMES[kind], t_lv, " (+%d)" % bonus if bonus > 0 else "", PartyState.talent_mul(id, kind)]
		var t_cost := Growth.talent_cost(id, t_lv)
		if t_cost.is_empty():
			tb.text = head + "  |  끝"
			tb.disabled = true
			continue
		var t_parts: Array[String] = []
		for item in t_cost:
			t_parts.append("%s %d/%d" % [Growth.item_name(item), PartyState.count(item), int(t_cost[item])])
		tb.text = head + "  |  올리기: " + " · ".join(t_parts)
		if t_lv >= t_cap:
			tb.text += "  (돌파 먼저)"
		tb.disabled = not PartyState.can_talent_up(id, kind)
	var con := PartyState.constellation(id)
	var con_lines: Array[String] = ["운명의 자리  %s" % ("●".repeat(con) + "○".repeat(Growth.CONSTELLATION_MAX - con))]
	for i in Growth.CONSTELLATION_MAX:
		con_lines.append("%s %d. %s" % ["◆" if i < con else "◇", i + 1, Growth.CONSTELLATION_TEXT[i]])
	_con_label.text = "\n".join(con_lines)
	if con >= Growth.CONSTELLATION_MAX:
		_con_button.text = "운명의 자리 다 열었다"
		_con_button.disabled = true
	else:
		_con_button.text = "%d번째 자리 열기  |  %s %d/%d" % [con + 1, Growth.item_name("fate_knot"), PartyState.count("fate_knot"), int(Growth.CONSTELLATION_COST.fate_knot)]
		_con_button.disabled = not PartyState.can_unlock_constellation(id)

	var lines: Array[String] = []
	for item in Growth.ITEMS:
		var n := PartyState.count(item)
		if n > 0 or item == "mora":
			lines.append("%s  %d" % [Growth.item_name(item), n])
	_bag_label.text = "\n".join(lines)

func select(id: String) -> void:
	selected = id
	_refresh()

func open_screen() -> void:
	if is_open:
		return
	if get_tree().get_nodes_in_group("duel_active").size() > 0:
		return
	var wm := get_tree().get_first_node_in_group("go_world_map")
	if wm and wm.get("is_open"):
		return
	_player = get_tree().get_first_node_in_group("player")
	is_open = true
	_root.visible = true
	add_to_group("ui_modal")
	if _player:
		_frozen_before = bool(_player.get("frozen"))
		_player.set("frozen", true)
	if not owned().has(selected):
		selected = "self"
	_refresh()

func close_screen() -> void:
	if not is_open:
		return
	is_open = false
	_root.visible = false
	remove_from_group("ui_modal")
	if _player:
		_player.set("frozen", _frozen_before)
