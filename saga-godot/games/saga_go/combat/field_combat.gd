extends Node

## PLAN 106장 ③ — 원신식 들판 전투의 플레이어 쪽. go_player.gd 의 자식으로 붙는다
## (GO 만). 옛 사건 결투(bandit_encounter·shrine_trial, duel_rules.gd)는 그대로
## 두고, 결투가 열려 있는 동안엔 이 노드가 입력을 안 받는다(그룹 "duel_active").
##
##   J  기본 공격 3타(연타, 0.9초 안에 이어 누르면 다음 타)
##   K  원소 스킬 — 지금 인물의 원소로 둘레 4m, 인물마다 쿨 6초
##   Q  원소 폭발 — 기력(에너지) 100 을 모아 둘레 7m 큰 한 방
##   L  회피 — 짧게 미끄러지며 무적 0.3초(스태미나 15)
##   1~4 인물 교체 — 나 + 등용한 동료 앞 셋(쿨 1초). 인물마다 원소가 정해져 있다
## 원소가 적에 남아 있을 때 다른 원소로 치면 반응(elements.gd). 쓰러지면 마지막으로
## 딛은 땅에서 체력을 다 채워 일어난다. 피해 수식은 PartyState.atk/def 를 그대로 쓴다.

const Elements := preload("res://games/saga_go/combat/elements.gd")
const Characters := preload("res://saga_core/data/characters.gd")
const Toast := preload("res://saga_core/ui/toast.gd")

const COMBO_MUL := [0.35, 0.4, 0.6]
const COMBO_SEC := [0.32, 0.32, 0.45]
const COMBO_LINK_SEC := 0.9
const ATTACK_REACH := 2.6
const ATTACK_ARC_DOT := 0.25
const AUTO_AIM_RANGE := 7.0

const SKILL_MUL := 0.9
const SKILL_RADIUS := 4.0
const SKILL_CD := 6.0
const BURST_MUL := 2.4
const BURST_RADIUS := 7.0
const ENERGY_MAX := 100.0
const ENERGY_PER_HIT := 5.0
const ENERGY_PER_SKILL_HIT := 12.0

const SWITCH_CD := 1.0
const ROSTER_MAX := 4

const HP_BASE := 200.0
const HP_PER_DEF := 2.0
const REGEN_DELAY := 8.0
const REGEN_PER_SEC := 0.05 # 최대 체력 비율

const OVERLOAD_RADIUS := 4.0
const ELECTRO_SPREAD := 3.0

## PLAN 106장 ⑦ — 원소 쓰는 적에게 맞았을 때 덧붙는 효과.
##   화 → 화상: 1초마다 맞은 피해 ×BURN_MUL, BURN_TICKS 번
##   수 → 젖음: 스태미나 -SOAK_STAMINA
##   뇌 → 감전: 폭발 기력 -SHOCK_ENERGY
const BURN_TICKS := 3
const BURN_MUL := 0.2
const SOAK_STAMINA := 25.0
const SHOCK_ENERGY := 25.0

var hp := 1.0
var max_hp := 1.0
var energy := 0.0
var active := 0
var last_reaction := ""

var _player: CharacterBody3D = null
var _combo := 0
var _combo_link := 0.0
var _attack_t := 0.0
var _skill_cd: Dictionary = {}
var _switch_cd := 0.0
var _since_hurt := 99.0
var _burn_left := 0
var _burn_t := 0.0
var _burn_amount := 0.0
var _hud: Control = null
var _hp_bar: ProgressBar = null
var _energy_bar: ProgressBar = null
var _roster_label: Label = null
var _skill_label: Label = null

func _ready() -> void:
	add_to_group("go_field_combat")
	_player = get_parent() as CharacterBody3D
	_ensure_actions()
	_recompute_max_hp()
	hp = max_hp
	PartyState.power_changed.connect(func(_a: float, _d: float) -> void:
		var ratio := hp / max_hp
		_recompute_max_hp()
		hp = max_hp * ratio
		_refresh_hud())
	_build_hud()
	_refresh_hud()

## 새 입력 액션은 project.godot 를 고치지 않고 여기서 등록한다(없을 때만).
func _ensure_actions() -> void:
	var keys := {"combat_burst": KEY_Q, "party_1": KEY_1, "party_2": KEY_2, "party_3": KEY_3, "party_4": KEY_4}
	for action in keys:
		if InputMap.has_action(action):
			continue
		InputMap.add_action(action)
		var ev := InputEventKey.new()
		ev.physical_keycode = keys[action]
		InputMap.action_add_event(action, ev)

# ---------------------------------------------------------------- 인물

func roster() -> Array[String]:
	var r: Array[String] = ["self"]
	for id in PartyState.members:
		if r.size() >= ROSTER_MAX:
			break
		if not r.has(id):
			r.append(id)
	return r

func active_id() -> String:
	var r := roster()
	return r[clampi(active, 0, r.size() - 1)]

func active_element() -> String:
	return Elements.element_of(active_id())

func display_name(id: String) -> String:
	if id == "self":
		return "나"
	var h: Variant = Characters.find(id)
	return h.name if h != null else id

## 인물 공격 배율 — 희귀도 1~5 → 0.95~1.15. 도감에 없는 이(산적 등)는 1.0.
func _power_mul(id: String) -> float:
	if id == "self":
		return 1.0
	var h: Variant = Characters.find(id)
	if h == null:
		return 1.0
	return 0.9 + 0.05 * float(h.get("rarity", 2))

func switch_to(index: int) -> bool:
	var r := roster()
	if index < 0 or index >= r.size() or index == active or _switch_cd > 0.0:
		return false
	active = index
	_switch_cd = SWITCH_CD
	_ring_fx(_player.global_position, 1.6, Elements.color_of(active_element()), 0.35)
	CombatFeel.ui()
	_refresh_hud()
	return true

# ---------------------------------------------------------------- 입력

func _duel_open() -> bool:
	return get_tree().get_nodes_in_group("duel_active").size() > 0

func can_be_targeted() -> bool:
	return not _duel_open() and hp > 0.0

func _unhandled_input(event: InputEvent) -> void:
	if _duel_open() or _player == null or _player.get("frozen"):
		return
	if event.is_action_pressed("combat_quick"):
		attack()
	elif event.is_action_pressed("combat_ult"):
		skill()
	elif event.is_action_pressed("combat_burst"):
		burst()
	elif event.is_action_pressed("combat_dodge"):
		_player.call("start_dodge")
	for i in ROSTER_MAX:
		if event.is_action_pressed("party_%d" % (i + 1)):
			switch_to(i)

func _physics_process(delta: float) -> void:
	_combo_link = maxf(_combo_link - delta, 0.0)
	_attack_t = maxf(_attack_t - delta, 0.0)
	_switch_cd = maxf(_switch_cd - delta, 0.0)
	for k in _skill_cd.keys():
		_skill_cd[k] = maxf(_skill_cd[k] - delta, 0.0)
	if _combo_link <= 0.0:
		_combo = 0
	_since_hurt += delta
	if _burn_left > 0 and hp > 0.0:
		_burn_t -= delta
		if _burn_t <= 0.0:
			_burn_t = 1.0
			_burn_left -= 1
			hp = maxf(hp - _burn_amount, 1.0) # 화상만으로는 쓰러지지 않는다
			_since_hurt = 0.0
	if _since_hurt > REGEN_DELAY and hp < max_hp:
		hp = minf(hp + max_hp * REGEN_PER_SEC * delta, max_hp)
	_refresh_hud()

# ---------------------------------------------------------------- 행동

func _grounded_ok() -> bool:
	return _player.call("can_act")

func attack() -> bool:
	if _attack_t > 0.0 or not _grounded_ok():
		return false
	var step := _combo
	_combo = (_combo + 1) % COMBO_MUL.size()
	_combo_link = COMBO_LINK_SEC
	_attack_t = COMBO_SEC[step]
	_aim_at_nearest()
	_player.call("play_action", "attack", COMBO_SEC[step], 0.25)
	var fwd: Vector3 = _player.call("facing")
	var hits := 0
	for e in _enemies_near(_player.global_position, ATTACK_REACH + 0.5):
		var to_e: Vector3 = (e as Node3D).global_position - _player.global_position
		to_e.y = 0.0
		if to_e.length() > 0.3 and fwd.dot(to_e.normalized()) < ATTACK_ARC_DOT:
			continue
		## 기본 공격은 물리(원소 없음) — 원신과 같다(반응은 스킬·폭발로).
		_deal(e, PartyState.atk * COMBO_MUL[step] * _power_mul(active_id()), "", to_e)
		hits += 1
	if hits > 0:
		_gain_energy(ENERGY_PER_HIT * hits)
	return true

func skill() -> bool:
	var id := active_id()
	if _skill_cd.get(id, 0.0) > 0.0 or not _grounded_ok():
		return false
	_skill_cd[id] = SKILL_CD
	var el := active_element()
	_player.call("play_action", "attack", 0.4, 0.0)
	_ring_fx(_player.global_position, SKILL_RADIUS, Elements.color_of(el), 0.45)
	var hits := 0
	for e in _enemies_near(_player.global_position, SKILL_RADIUS):
		var to_e: Vector3 = (e as Node3D).global_position - _player.global_position
		_deal(e, PartyState.atk * SKILL_MUL * _power_mul(id), el, to_e)
		hits += 1
	_gain_energy(ENERGY_PER_SKILL_HIT * hits)
	## 106장 ⑥ 원소 석등(treasure_chest.gd) — 스킬 반경 안의 석등을 밝힌다.
	get_tree().call_group("element_receiver", "receive_element", _player.global_position, SKILL_RADIUS, el)
	return true

func burst() -> bool:
	if energy < ENERGY_MAX or not _grounded_ok():
		return false
	energy = 0.0
	var el := active_element()
	_player.call("play_action", "attack", 0.6, 0.0)
	_ring_fx(_player.global_position, BURST_RADIUS, Elements.color_of(el), 0.7)
	var rig := get_tree().get_first_node_in_group("camera_rig")
	if rig:
		rig.call("shake", 0.18, 0.35)
	for e in _enemies_near(_player.global_position, BURST_RADIUS):
		var to_e: Vector3 = (e as Node3D).global_position - _player.global_position
		_deal(e, PartyState.atk * BURST_MUL * _power_mul(active_id()), el, to_e)
	get_tree().call_group("element_receiver", "receive_element", _player.global_position, BURST_RADIUS, el)
	return true

func _gain_energy(amount: float) -> void:
	energy = minf(energy + amount, ENERGY_MAX)

func _aim_at_nearest() -> void:
	var best: Node3D = null
	var best_d := AUTO_AIM_RANGE
	for e in _enemies_near(_player.global_position, AUTO_AIM_RANGE):
		var d := ((e as Node3D).global_position - _player.global_position).length()
		if d < best_d:
			best_d = d
			best = e
	if best:
		_player.call("face_toward", best.global_position)

func _enemies_near(pos: Vector3, radius: float) -> Array:
	var out: Array = []
	for e in get_tree().get_nodes_in_group("field_enemy"):
		if e.call("is_dead"):
			continue
		var d: Vector3 = (e as Node3D).global_position - pos
		d.y *= 0.5
		if d.length() <= radius:
			out.append(e)
	return out

# ---------------------------------------------------------------- 피해·반응

## 한 번의 타격. 원소가 있으면 적의 부착 원소와 반응을 본다. 실제 준 피해를 돌려준다.
func _deal(enemy: Node, base: float, element: String, dir: Vector3) -> float:
	## 원소 방패가 있으면 반응·부착 없이 방패만 깎는다(106장 ⑦).
	if enemy.call("is_shielded"):
		last_reaction = ""
		var shield_el: String = enemy.get("element")
		var mul := Elements.shield_mul(shield_el, element)
		var dealt: float = enemy.call("apply_damage", base, false, dir, element)
		if mul == 0.0:
			_reaction_text(enemy as Node3D, "면역", Color(0.75, 0.75, 0.75))
		elif mul > 1.0:
			_reaction_text(enemy as Node3D, "약점!", Elements.color_of(element))
		if not enemy.call("is_shielded"):
			_reaction_text(enemy as Node3D, "방패 깨짐", Elements.color_of(shield_el))
			var rig := get_tree().get_first_node_in_group("camera_rig")
			if rig:
				rig.call("shake", 0.12, 0.25)
		return dealt
	var aura: String = enemy.get("aura")
	var reaction := Elements.reaction_of(aura, element)
	last_reaction = reaction
	var amount := base
	if reaction != "":
		var info: Dictionary = Elements.REACTION_INFO[reaction]
		amount *= float(info.mul)
		_reaction_text(enemy as Node3D, info.name, info.color)
		enemy.call("set_aura", "")
		match reaction:
			"overload":
				var center: Vector3 = (enemy as Node3D).global_position
				_ring_fx(center, OVERLOAD_RADIUS, info.color, 0.35)
				for other in _enemies_near(center, OVERLOAD_RADIUS):
					var push: Vector3 = (other as Node3D).global_position - center
					other.call("knockback", push if push.length() > 0.1 else dir, 7.0)
					if other != enemy:
						other.call("apply_damage", base, false, push)
			"electro":
				enemy.call("add_dot", 4, 0.5, base * 0.3)
				for other in _enemies_near((enemy as Node3D).global_position, ELECTRO_SPREAD):
					if other != enemy and other.get("aura") == "water":
						other.call("add_dot", 4, 0.5, base * 0.3)
	elif element != "":
		enemy.call("set_aura", element)
	return enemy.call("apply_damage", amount, reaction != "", dir)

func take_damage(amount: float, source: Node) -> void:
	if hp <= 0.0 or _duel_open():
		return
	if _player.call("is_invulnerable"):
		return
	var dmg := amount * (1.0 - PartyState.def / (PartyState.def + 120.0))
	hp = maxf(hp - dmg, 0.0)
	_since_hurt = 0.0
	CombatFeel.hit(_player.get_node("Visual"), dmg, false)
	_player.call("play_action", "hit", 0.3, 0.0)
	if hp <= 0.0:
		_down()
	elif source != null and source.get("element") != null:
		_elemental_hit(String(source.get("element")), dmg)
	_refresh_hud()

func _elemental_hit(el: String, dmg: float) -> void:
	match el:
		"fire":
			_burn_left = BURN_TICKS
			_burn_t = 1.0
			_burn_amount = dmg * BURN_MUL
			_reaction_text(_player, "화상", Elements.color_of(el))
		"water":
			_player.set("stamina", maxf(float(_player.get("stamina")) - SOAK_STAMINA, 0.0))
			_reaction_text(_player, "젖음", Elements.color_of(el))
		"thunder":
			energy = maxf(energy - SHOCK_ENERGY, 0.0)
			_reaction_text(_player, "감전", Elements.color_of(el))

## 쓰러짐 — 원신처럼 잃는 것 없이, 마지막으로 딛은 땅에서 다시 일어난다.
func _down() -> void:
	_player.call("respawn_safe")
	hp = max_hp
	energy = 0.0
	_burn_left = 0
	Toast.show(_player, "쓰러졌다 — 정신을 차려 보니 안전한 곳이다", 3.0)

func _recompute_max_hp() -> void:
	max_hp = HP_BASE + PartyState.def * HP_PER_DEF

# ---------------------------------------------------------------- 연출

func _ring_fx(center: Vector3, radius: float, color: Color, sec: float) -> void:
	var mi := MeshInstance3D.new()
	var torus := TorusMesh.new()
	torus.inner_radius = radius * 0.86
	torus.outer_radius = radius
	torus.rings = 32
	torus.ring_segments = 6
	mi.mesh = torus
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Color(color.r, color.g, color.b, 0.85)
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	get_tree().current_scene.add_child(mi)
	mi.global_position = center + Vector3.UP * 0.3
	mi.scale = Vector3(0.3, 1.0, 0.3)
	var tw := mi.create_tween()
	tw.set_parallel(true)
	tw.tween_property(mi, "scale", Vector3.ONE, sec)
	tw.tween_property(mat, "albedo_color:a", 0.0, sec)
	tw.chain().tween_callback(mi.queue_free)

func _reaction_text(target: Node3D, text: String, color: Color) -> void:
	var l := Label3D.new()
	l.text = text
	l.modulate = color
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.no_depth_test = true
	l.font_size = 64
	l.outline_size = 10
	l.pixel_size = 0.006
	get_tree().current_scene.add_child(l)
	l.global_position = target.global_position + Vector3.UP * 2.4
	var tw := l.create_tween()
	tw.set_parallel(true)
	tw.tween_property(l, "global_position:y", l.global_position.y + 1.0, 0.8)
	tw.tween_property(l, "modulate:a", 0.0, 0.8).set_delay(0.3)
	tw.chain().tween_callback(l.queue_free)

# ---------------------------------------------------------------- HUD

func _build_hud() -> void:
	var layer := CanvasLayer.new()
	layer.name = "FieldCombatHUD"
	add_child(layer)
	_hud = Control.new()
	_hud.set_anchors_preset(Control.PRESET_FULL_RECT)
	_hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(_hud)

	## 원신처럼 화면 아래 가운데 체력 막대, 그 위 원소 폭발 기력.
	_hp_bar = _bar(Color(0.45, 0.85, 0.35), Vector2(360, 14), -64)
	_energy_bar = _bar(Color(1.0, 0.85, 0.35), Vector2(200, 8), -86)
	_energy_bar.max_value = ENERGY_MAX

	_roster_label = Label.new()
	_roster_label.anchor_left = 1.0
	_roster_label.anchor_right = 1.0
	_roster_label.anchor_top = 0.35
	_roster_label.offset_left = -200
	_roster_label.offset_right = -16
	_roster_label.add_theme_font_size_override("font_size", 18)
	_roster_label.add_theme_constant_override("outline_size", 6)
	_roster_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	_hud.add_child(_roster_label)

	_skill_label = Label.new()
	_skill_label.anchor_left = 0.5
	_skill_label.anchor_right = 0.5
	_skill_label.anchor_top = 1.0
	_skill_label.anchor_bottom = 1.0
	_skill_label.offset_left = -180
	_skill_label.offset_right = 180
	_skill_label.offset_top = -46
	_skill_label.offset_bottom = -22
	_skill_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_skill_label.add_theme_font_size_override("font_size", 15)
	_skill_label.add_theme_constant_override("outline_size", 5)
	_skill_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	_hud.add_child(_skill_label)

	if DisplayServer.is_touchscreen_available():
		var specs := [["공격", "combat_quick", -170], ["스킬", "combat_ult", -300], ["폭발", "combat_burst", -430], ["회피", "combat_dodge", -560]]
		for sp in specs:
			var b := Button.new()
			b.text = sp[0]
			b.custom_minimum_size = Vector2(110, 110)
			b.anchor_left = 1.0
			b.anchor_right = 1.0
			b.anchor_top = 1.0
			b.anchor_bottom = 1.0
			b.offset_left = sp[2] - 110
			b.offset_right = sp[2]
			b.offset_top = -300
			b.offset_bottom = -190
			var action: String = sp[1]
			b.button_down.connect(func(): Input.action_press(action))
			b.button_up.connect(func(): Input.action_release(action))
			_hud.add_child(b)

func _bar(color: Color, size: Vector2, y: float) -> ProgressBar:
	var bar := ProgressBar.new()
	bar.show_percentage = false
	bar.anchor_left = 0.5
	bar.anchor_right = 0.5
	bar.anchor_top = 1.0
	bar.anchor_bottom = 1.0
	bar.offset_left = -size.x * 0.5
	bar.offset_right = size.x * 0.5
	bar.offset_top = y
	bar.offset_bottom = y + size.y
	var fill := StyleBoxFlat.new()
	fill.bg_color = color
	fill.set_corner_radius_all(4)
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0, 0, 0, 0.55)
	bg.set_corner_radius_all(4)
	bar.add_theme_stylebox_override("fill", fill)
	bar.add_theme_stylebox_override("background", bg)
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hud.add_child(bar)
	return bar

func _refresh_hud() -> void:
	if _hud == null:
		return
	_hp_bar.max_value = max_hp
	_hp_bar.value = hp
	_energy_bar.value = energy
	var lines: Array[String] = []
	var r := roster()
	for i in r.size():
		var el := Elements.element_of(r[i])
		var mark := "▶ " if i == active else "   "
		lines.append("%s%d %s [%s]" % [mark, i + 1, display_name(r[i]), Elements.name_of(el)])
	_roster_label.text = "\n".join(lines)
	var cd: float = _skill_cd.get(active_id(), 0.0)
	var skill_text := "스킬 준비" if cd <= 0.0 else "스킬 %.1f초" % cd
	var burst_text := "폭발 준비!" if energy >= ENERGY_MAX else "폭발 %d%%" % int(energy)
	_skill_label.text = "HP %d/%d · %s · %s" % [int(hp), int(max_hp), skill_text, burst_text]
