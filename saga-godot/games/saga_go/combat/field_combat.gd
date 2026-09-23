extends Node

## PLAN 106장 ③·⑧ — 원신식 들판 전투의 플레이어 쪽. go_player.gd 의 자식으로 붙는다
## (GO 만). 옛 사건 결투(bandit_encounter·shrine_trial, duel_rules.gd)는 그대로
## 두고, 결투가 열려 있는 동안엔 이 노드가 입력을 안 받는다(그룹 "duel_active").
##
##   마우스 왼쪽 / J  기본 공격 3타 · 길게 누르면 강공격(스태미나 20) · 공중에서 누르면 낙하 공격
##   E / K            원소 스킬 — 원소마다 모양이 다르다(아래 KIT), 인물마다 쿨 6초
##   Q                원소 폭발 — 그 인물의 기력 100 을 모아 큰 한 방 + 남는 효과
##   Shift / 오른쪽 / L  대시(회피) — 무적 0.3초, 스태미나 15 (Shift 는 계속 누르면 달리기)
##   1~4              인물 교체 — 나 + 등용한 동료 앞 셋(쿨 1초). 인물마다 원소가 정해져 있다
## 체력·기력은 인물마다 따로(원신과 같다). 지금 인물이 쓰러지면 다음 인물로 저절로 바뀌고,
## 다 쓰러지면 마지막으로 딛은 땅에서 모두 가득 차서 일어난다. 명단에 같은 원소가 둘 이상이면
## 원소 공명(화 공격 +25% · 수 최대 체력 +25% · 뇌 기력 +50%). 공격·방어·체력은 인물마다 레벨·돌파로
## 정해진다(106장 ⑩, PartyState.char_atk/char_def) — 옛 부대 전투력(PartyState.atk)은 사건 결투만 쓴다.
## 106장 ⑫: 기본 공격·스킬·폭발 피해에 그 인물 특성 레벨 배율(PartyState.talent_mul), 운명의 자리 여섯 효과
## (1 스킬 쿨 -20% · 2 반응 피해 +15% · 3/5 특성 +3 · 4 체력 +20% · 6 폭발 뒤 10초 공격 +25%).
## 106장 ⑭: 원소 일곱(풍·빙·암·초 추가)과 반응(elements.gd), 명단 전체 보호막(결정·암 폭발 — 받는 피해를 먼저 막고
## 원소 효과도 막는다), 쇄빙(얼어 있는 적을 강공격·낙하로).

const Elements := preload("res://games/saga_go/combat/elements.gd")
const Characters := preload("res://saga_core/data/characters.gd")
const Toast := preload("res://saga_core/ui/toast.gd")
const Growth := preload("res://games/saga_go/data/growth.gd")

const COMBO_MUL := [0.35, 0.4, 0.6]
const COMBO_SEC := [0.32, 0.32, 0.45]
const COMBO_LINK_SEC := 0.9
const ATTACK_REACH := 2.6
const ATTACK_ARC_DOT := 0.25
const AUTO_AIM_RANGE := 7.0

## 106장 ⑧ 강공격·낙하 공격(둘 다 물리).
const CHARGE_SEC := 0.4
const CHARGE_COST := 20.0
const CHARGE_MUL := 1.3
const CHARGE_REACH := 3.2
const PLUNGE_RADIUS := 3.5
const PLUNGE_MUL := 1.2
const PLUNGE_MUL_PER_M := 0.1
const PLUNGE_MAX_M := 15.0

const SKILL_MUL := 0.9
const SKILL_RADIUS := 4.0
const SKILL_CD := 6.0
const BURST_MUL := 2.4
const BURST_RADIUS := 7.0
const ENERGY_MAX := 100.0
const ENERGY_PER_HIT := 5.0
const ENERGY_PER_SKILL_HIT := 12.0
const ENERGY_OFF_FIELD := 0.6 # 대기 중인 인물이 받는 몫

## 106장 ⑧ — 원소마다 스킬·폭발 모양. 수치는 atk 배율.
##   화 스킬: 앞 부채꼴 5m 한 번 ×1.1          화 폭발: 둘레 7m ×2.4 + 3초 불 고리(0.5초마다 ×0.25)
##   수 스킬: 둘레 4m ×0.9 + 살아 있는 인물 모두 체력 8% 회복
##   수 폭발: 둘레 7m ×1.6 + 8초 동안 1초마다 지금 인물 체력 5% 회복
##   뇌 스킬: 8m 안 가까운 적 셋에 낙뢰 ×1.0    뇌 폭발: 둘레 7m ×1.2 + 6초 동안 0.6초마다 가까운 적 하나에 낙뢰 ×0.7
const FIRE_SKILL := {"reach": 5.0, "dot": 0.3, "mul": 1.1}
const FIRE_BURST_RING := {"sec": 3.0, "tick": 0.5, "mul": 0.25, "radius": 5.0}
const WATER_SKILL_HEAL := 0.08
const WATER_BURST := {"mul": 1.6, "sec": 8.0, "tick": 1.0, "heal": 0.05}
const THUNDER_SKILL := {"reach": 8.0, "targets": 3, "mul": 1.0}
const THUNDER_BURST := {"mul": 1.2, "sec": 6.0, "tick": 0.6, "bolt": 0.7, "reach": 9.0}
## 106장 ⑭ — 새 원소 넷.
##   풍 스킬: 둘레 5m ×1.0 + 끌어당김          풍 폭발: 둘레 7m ×1.0 + 6초 소용돌이(0.5초마다 5m ×0.3, 가운데로 당김)
##   빙 스킬: 앞 부채꼴 6m ×1.2                빙 폭발: 둘레 7m ×1.4 + 6초 눈보라(0.5초마다 인물 둘레 4.5m ×0.3)
##   암 스킬: 앞 2.5m 바위 기둥 둘레 3m ×1.3    암 폭발: 둘레 7m ×2.0 + 보호막(지금 인물 최대 체력 30%, 15초)
##   초 스킬: 둘레 4m ×1.0                     초 폭발: 둘레 7m ×1.2 + 8초 가시덤불(1초마다 5m ×0.35)
const WIND_SKILL := {"reach": 5.0, "mul": 1.0, "pull": 8.0}
const WIND_BURST := {"mul": 1.0, "sec": 6.0, "tick": 0.5, "radius": 5.0, "bolt": 0.3, "pull": 4.0}
const ICE_SKILL := {"reach": 6.0, "dot": 0.2, "mul": 1.2}
const ICE_BURST := {"mul": 1.4, "sec": 6.0, "tick": 0.5, "radius": 4.5, "bolt": 0.3}
const ROCK_SKILL := {"ahead": 2.5, "radius": 3.0, "mul": 1.3}
const ROCK_BURST := {"mul": 2.0, "shield": 0.3}
const GRASS_SKILL := {"radius": 4.0, "mul": 1.0}
const GRASS_BURST := {"mul": 1.2, "sec": 8.0, "tick": 1.0, "radius": 5.0, "bolt": 0.35}

## 106장 ⑭ 반응 수치(표는 elements.gd 머리말).
const FREEZE_SEC := 2.5
const SUPERCONDUCT_RADIUS := 3.0
const SUPERCONDUCT_MUL := 0.5
const PHYS_VULN_SEC := 8.0
const PHYS_VULN_MUL := 1.4
const SWIRL_RADIUS := 4.0
const SWIRL_MUL := 0.6
const CRYSTAL_SHIELD := 0.2
const SHIELD_SEC := 15.0
const BLOOM_DELAY := 1.5
const BLOOM_RADIUS := 3.0
const BLOOM_MUL := 1.5
const BURNING := {"ticks": 8, "every": 0.5, "mul": 0.2}
const QUICKEN_SEC := 8.0

## 원소 공명 — 명단(2명 이상)에 같은 원소가 둘 이상이면.
const RESONANCE_FIRE_ATK := 1.25
const RESONANCE_WATER_HP := 1.25
const RESONANCE_THUNDER_ENERGY := 1.5
## 106장 ⑭ — 풍 스태미나 소모 -15% · 빙 부착·빙결된 적에게 +15% · 암 보호막 있는 동안 +15% · 초 반응 피해 +20%.
const RESONANCE_WIND_STAMINA := 0.85
const RESONANCE_ICE_DMG := 1.15
const RESONANCE_ROCK_DMG := 1.15
const RESONANCE_GRASS_REACTION := 1.2

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

## 인물마다 체력·기력(없는 칸 = 체력 가득·기력 0). hp·energy 는 지금 인물 것.
var _hp: Dictionary = {}
var _energy: Dictionary = {}
var hp: float:
	get: return hp_of(active_id())
	set(v): _hp[active_id()] = v
var energy: float:
	get: return float(_energy.get(active_id(), 0.0))
	set(v): _energy[active_id()] = v
var max_hp: float:
	get: return max_hp_of(active_id())
var active := 0
var last_reaction := ""

var _player: CharacterBody3D = null
var _combo := 0
var _combo_link := 0.0
var _attack_t := 0.0
var _charge_armed := false
var _charge_hold := 0.0
var _skill_cd: Dictionary = {}
var _switch_cd := 0.0
var _since_hurt := 99.0
var _burn_left := 0
var _burn_t := 0.0
var _burn_amount := 0.0
var _effects: Array = [] # 폭발이 남기는 효과 {kind, center, left, tick, t, base}
var _c6_left: Dictionary = {} # 운명의 자리 6 — 인물 id → 남은 초
## 106장 ⑭ 명단 전체 보호막(결정·암 폭발). 원소는 표시용.
var shield_hp := 0.0
var shield_element := ""
var _shield_t := 0.0
var _heavy := false # 지금 치는 게 강공격·낙하인가(쇄빙)
var _hud: Control = null
var _hp_bar: ProgressBar = null
var _status_label: Label = null
var _roster_box: VBoxContainer = null
var _roster_sig := ""
var _roster_rows: Array = [] # [{label, bar}]
var _skill_orb: Orb = null
var _burst_orb: Orb = null
var _touch_buttons: Dictionary = {}

func _ready() -> void:
	add_to_group("go_field_combat")
	_player = get_parent() as CharacterBody3D
	_ensure_actions()
	PartyState.power_changed.connect(func(_a: float, _d: float) -> void: _refresh_hud())
	_build_hud()
	_refresh_hud()

## 새 입력 액션·키는 project.godot 를 고치지 않고 여기서 등록한다(GO 만 — 다른 판엔 안 샌다).
## 106장 ⑧: 원신 PC 배치(마우스 왼쪽 공격·E 스킬·오른쪽 대시)를 옛 J/K/L 옆에 더한다.
func _ensure_actions() -> void:
	var keys := {"combat_burst": KEY_Q, "party_1": KEY_1, "party_2": KEY_2, "party_3": KEY_3, "party_4": KEY_4}
	for action in keys:
		if InputMap.has_action(action):
			continue
		InputMap.add_action(action)
		var ev := InputEventKey.new()
		ev.physical_keycode = keys[action]
		InputMap.action_add_event(action, ev)
	var extra_keys := {"combat_ult": KEY_E}
	for action in extra_keys:
		if InputMap.has_action(action) and not _has_key(action, extra_keys[action]):
			var ev := InputEventKey.new()
			ev.physical_keycode = extra_keys[action]
			InputMap.action_add_event(action, ev)
	var buttons := {"combat_quick": MOUSE_BUTTON_LEFT, "combat_dodge": MOUSE_BUTTON_RIGHT}
	for action in buttons:
		if InputMap.has_action(action) and not _has_button(action, buttons[action]):
			var mb := InputEventMouseButton.new()
			mb.button_index = buttons[action]
			InputMap.action_add_event(action, mb)

func _has_key(action: String, key: int) -> bool:
	for ev in InputMap.action_get_events(action):
		if ev is InputEventKey and (ev as InputEventKey).physical_keycode == key:
			return true
	return false

func _has_button(action: String, button: int) -> bool:
	for ev in InputMap.action_get_events(action):
		if ev is InputEventMouseButton and (ev as InputEventMouseButton).button_index == button:
			return true
	return false

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

func hp_of(id: String) -> float:
	var m := max_hp_of(id)
	return minf(float(_hp.get(id, m)), m)

## 인물 최대 체력 — 그 인물 방어(레벨·돌파) × 2 + 200, 수 공명 +25%.
func max_hp_of(id: String) -> float:
	var m := HP_BASE + PartyState.char_def(id) * HP_PER_DEF
	if resonance() == "water":
		m *= RESONANCE_WATER_HP
	if PartyState.constellation(id) >= 4:
		m *= Growth.C4_HP_MUL
	return m

## 인물 공격 — 레벨·돌파(PartyState) × 희귀도·화 공명(_power_mul) × 운명의 자리 6(폭발 뒤 10초).
func char_atk(id: String) -> float:
	var a := PartyState.char_atk(id) * _power_mul(id)
	if float(_c6_left.get(id, 0.0)) > 0.0:
		a *= Growth.C6_ATK_MUL
	return a

## 이 인물 스킬 재사용 대기(운명의 자리 1 이면 -20%).
func skill_cd_of(id: String) -> float:
	return SKILL_CD * (Growth.C1_SKILL_CD_MUL if PartyState.constellation(id) >= 1 else 1.0)

func energy_of(id: String) -> float:
	return float(_energy.get(id, 0.0))

## 명단에 같은 원소가 둘 이상인 원소(없으면 ""). 명단이 한 명이면 공명 없음.
func resonance() -> String:
	var r := roster()
	if r.size() < 2:
		return ""
	var count := {}
	for id in r:
		var el := Elements.element_of(id)
		count[el] = int(count.get(el, 0)) + 1
	for el in Elements.ORDER:
		if int(count.get(el, 0)) >= 2:
			return el
	return ""

## 인물 공격 배율 — 희귀도 1~5 → 0.95~1.15. 도감에 없는 이(산적 등)는 1.0. 화 공명 +25%.
func _power_mul(id: String) -> float:
	var mul := 1.0
	if id != "self":
		var h: Variant = Characters.find(id)
		if h != null:
			mul = 0.9 + 0.05 * float(h.get("rarity", 2))
	if resonance() == "fire":
		mul *= RESONANCE_FIRE_ATK
	elif resonance() == "rock" and shield_hp > 0.0:
		mul *= RESONANCE_ROCK_DMG
	return mul

func switch_to(index: int, forced := false) -> bool:
	var r := roster()
	if index < 0 or index >= r.size() or index == active:
		return false
	if not forced and _switch_cd > 0.0:
		return false
	if hp_of(r[index]) <= 0.0:
		return false
	active = index
	_switch_cd = SWITCH_CD
	_ring_fx(_player.global_position, 1.6, Elements.color_of(active_element()), 0.35)
	CombatFeel.ui()
	_refresh_hud()
	return true

## 쓰러진 인물까지 모두 가득(쓰러져 안전한 곳에서 일어날 때 — 순간이동 지점도 부른다).
func revive_all() -> void:
	_hp.clear()
	_burn_left = 0

# ---------------------------------------------------------------- 입력

func _duel_open() -> bool:
	return get_tree().get_nodes_in_group("duel_active").size() > 0

func can_be_targeted() -> bool:
	return not _duel_open() and hp > 0.0

## 마우스 시점(camera_rig mouse_look)을 쓰는 PC 에선 커서가 풀려 있는 동안 마우스 단추를
## 전투로 안 친다(Alt·선택지 창에서 누른 게 공격으로 새지 않게).
func _mouse_blocked(event: InputEvent) -> bool:
	if not (event is InputEventMouseButton):
		return false
	if DisplayServer.get_name() == "headless" or DisplayServer.is_touchscreen_available():
		return false
	return Input.mouse_mode != Input.MOUSE_MODE_CAPTURED

func _unhandled_input(event: InputEvent) -> void:
	if _duel_open() or _player == null or _player.get("frozen") or _mouse_blocked(event):
		return
	if event.is_action_pressed("combat_quick"):
		press_attack()
	elif event.is_action_released("combat_quick"):
		_charge_armed = false
	elif event.is_action_pressed("combat_ult"):
		skill()
	elif event.is_action_pressed("combat_burst"):
		burst()
	elif event.is_action_pressed("combat_dodge"):
		_player.call("start_dodge")
	for i in ROSTER_MAX:
		if event.is_action_pressed("party_%d" % (i + 1)):
			switch_to(i)

## 공격 단추를 눌렀을 때 — 공중이면 낙하 공격, 아니면 기본 공격 한 타 + 강공격 대기.
func press_attack() -> bool:
	if _player.call("start_plunge"):
		return true
	_charge_armed = true
	_charge_hold = 0.0
	return attack()

func _physics_process(delta: float) -> void:
	_combo_link = maxf(_combo_link - delta, 0.0)
	_attack_t = maxf(_attack_t - delta, 0.0)
	_switch_cd = maxf(_switch_cd - delta, 0.0)
	for k in _skill_cd.keys():
		_skill_cd[k] = maxf(_skill_cd[k] - delta, 0.0)
	for k in _c6_left.keys():
		_c6_left[k] = maxf(_c6_left[k] - delta, 0.0)
	if _shield_t > 0.0:
		_shield_t -= delta
		if _shield_t <= 0.0:
			shield_hp = 0.0
	_player.set("stamina_cost_mul", RESONANCE_WIND_STAMINA if resonance() == "wind" else 1.0)
	if _combo_link <= 0.0:
		_combo = 0
	if _charge_armed:
		_charge_hold += delta
		if _charge_hold >= CHARGE_SEC:
			_charge_armed = false
			charged_attack()
	_since_hurt += delta
	if _burn_left > 0 and hp > 0.0:
		_burn_t -= delta
		if _burn_t <= 0.0:
			_burn_t = 1.0
			_burn_left -= 1
			hp = maxf(hp - _burn_amount, 1.0) # 화상만으로는 쓰러지지 않는다
			_since_hurt = 0.0
	if _since_hurt > REGEN_DELAY:
		for id in roster():
			var h := hp_of(id)
			var m := max_hp_of(id)
			if h > 0.0 and h < m:
				_hp[id] = minf(h + m * REGEN_PER_SEC * delta, m)
	_tick_effects(delta)
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
	var hits := _hit_front(ATTACK_REACH, ATTACK_ARC_DOT, _normal_atk() * COMBO_MUL[step], "")
	if hits > 0:
		_gain_energy(ENERGY_PER_HIT * hits)
	return true

## 강공격 — 기본 공격 단추를 CHARGE_SEC 넘게 누르고 있으면. 앞쪽 넓게 한 번, 스태미나를 쓴다.
func charged_attack() -> bool:
	if not _grounded_ok() or float(_player.get("stamina")) < CHARGE_COST:
		return false
	_player.call("_spend", CHARGE_COST)
	_combo = 0
	_attack_t = 0.5
	_aim_at_nearest()
	_player.call("play_action", "attack", 0.5, 0.0)
	_ring_fx(_player.global_position + _player.call("facing") * 1.2, 1.8, Color(0.95, 0.95, 0.85), 0.3)
	_heavy = true
	var hits := _hit_front(CHARGE_REACH, -0.2, _normal_atk() * CHARGE_MUL, "")
	_heavy = false
	if hits > 0:
		_gain_energy(ENERGY_PER_HIT * hits)
	return true

## 낙하 공격이 땅에 닿았을 때 go_player.gd 가 부른다 — 높이 떨어질수록 세다.
func plunge_land(fell_m: float) -> int:
	var mul := PLUNGE_MUL + PLUNGE_MUL_PER_M * clampf(fell_m, 0.0, PLUNGE_MAX_M)
	var center := _player.global_position
	_ring_fx(center, PLUNGE_RADIUS, Color(0.95, 0.9, 0.75), 0.4)
	var rig := get_tree().get_first_node_in_group("camera_rig")
	if rig:
		rig.call("shake", 0.14, 0.3)
	var hits := 0
	_heavy = true
	for e in _enemies_near(center, PLUNGE_RADIUS):
		var to_e: Vector3 = (e as Node3D).global_position - center
		_deal(e, _normal_atk() * mul, "", to_e)
		hits += 1
	_heavy = false
	if hits > 0:
		_gain_energy(ENERGY_PER_HIT * hits)
	return hits

## 기본 공격·강공격·낙하 공격 한 방의 바탕 — 지금 인물 공격 × 기본 공격 특성.
func _normal_atk() -> float:
	return char_atk(active_id()) * PartyState.talent_mul(active_id(), "normal")

func skill() -> bool:
	var id := active_id()
	if _skill_cd.get(id, 0.0) > 0.0 or not _grounded_ok():
		return false
	_skill_cd[id] = skill_cd_of(id)
	var el := active_element()
	var atk := char_atk(id) * PartyState.talent_mul(id, "skill")
	_player.call("play_action", "attack", 0.4, 0.0)
	var hits := 0
	match el:
		"fire":
			_aim_at_nearest()
			var fwd: Vector3 = _player.call("facing")
			_ring_fx(_player.global_position + fwd * 2.5, 2.5, Elements.color_of(el), 0.35)
			hits = _hit_front(FIRE_SKILL.reach, FIRE_SKILL.dot, atk * FIRE_SKILL.mul, el)
		"water":
			_ring_fx(_player.global_position, SKILL_RADIUS, Elements.color_of(el), 0.45)
			for e in _enemies_near(_player.global_position, SKILL_RADIUS):
				_deal(e, atk * SKILL_MUL, el, (e as Node3D).global_position - _player.global_position)
				hits += 1
			_heal_all(WATER_SKILL_HEAL)
		"thunder":
			var targets := _nearest(_player.global_position, THUNDER_SKILL.reach, THUNDER_SKILL.targets)
			for e in targets:
				_bolt(e, atk * THUNDER_SKILL.mul)
			hits = targets.size()
		"wind":
			var c := _player.global_position
			_ring_fx(c, WIND_SKILL.reach, Elements.color_of(el), 0.45)
			for e in _enemies_near(c, WIND_SKILL.reach):
				var to_e: Vector3 = (e as Node3D).global_position - c
				_deal(e, atk * WIND_SKILL.mul, el, to_e)
				e.call("knockback", -to_e, WIND_SKILL.pull)
				hits += 1
		"ice":
			_aim_at_nearest()
			var fwd_i: Vector3 = _player.call("facing")
			_ring_fx(_player.global_position + fwd_i * 3.0, 3.0, Elements.color_of(el), 0.35)
			hits = _hit_front(ICE_SKILL.reach, ICE_SKILL.dot, atk * ICE_SKILL.mul, el)
		"rock":
			_aim_at_nearest()
			var at: Vector3 = _player.global_position + (_player.call("facing") as Vector3) * ROCK_SKILL.ahead
			_ring_fx(at, ROCK_SKILL.radius, Elements.color_of(el), 0.5)
			for e in _enemies_near(at, ROCK_SKILL.radius):
				_deal(e, atk * ROCK_SKILL.mul, el, (e as Node3D).global_position - at)
				hits += 1
		"grass":
			_ring_fx(_player.global_position, GRASS_SKILL.radius, Elements.color_of(el), 0.45)
			for e in _enemies_near(_player.global_position, GRASS_SKILL.radius):
				_deal(e, atk * GRASS_SKILL.mul, el, (e as Node3D).global_position - _player.global_position)
				hits += 1
	_gain_energy(ENERGY_PER_SKILL_HIT * hits)
	## 106장 ⑥ 원소 석등(treasure_chest.gd) — 스킬을 쓴 자리 둘레 4m 석등을 밝힌다(원소마다 같게).
	get_tree().call_group("element_receiver", "receive_element", _player.global_position, SKILL_RADIUS, el)
	return true

func burst() -> bool:
	if energy < ENERGY_MAX or not _grounded_ok():
		return false
	energy = 0.0
	var el := active_element()
	var atk := char_atk(active_id()) * PartyState.talent_mul(active_id(), "burst")
	if PartyState.constellation(active_id()) >= 6:
		_c6_left[active_id()] = Growth.C6_BUFF_SEC
	var center := _player.global_position
	_player.call("play_action", "attack", 0.6, 0.0)
	_ring_fx(center, BURST_RADIUS, Elements.color_of(el), 0.7)
	var rig := get_tree().get_first_node_in_group("camera_rig")
	if rig:
		rig.call("shake", 0.18, 0.35)
	var mul: float = BURST_MUL
	match el:
		"water": mul = WATER_BURST.mul
		"thunder": mul = THUNDER_BURST.mul
		"wind": mul = WIND_BURST.mul
		"ice": mul = ICE_BURST.mul
		"rock": mul = ROCK_BURST.mul
		"grass": mul = GRASS_BURST.mul
	for e in _enemies_near(center, BURST_RADIUS):
		_deal(e, atk * mul, el, (e as Node3D).global_position - center)
	match el:
		"fire":
			_effects.append({"kind": "fire_ring", "center": center, "left": FIRE_BURST_RING.sec, "tick": FIRE_BURST_RING.tick, "t": FIRE_BURST_RING.tick, "base": atk})
		"water":
			_effects.append({"kind": "water_heal", "center": center, "left": WATER_BURST.sec, "tick": WATER_BURST.tick, "t": WATER_BURST.tick, "base": atk})
		"thunder":
			_effects.append({"kind": "thunder_bolts", "center": center, "left": THUNDER_BURST.sec, "tick": THUNDER_BURST.tick, "t": THUNDER_BURST.tick, "base": atk})
		"wind":
			_effects.append({"kind": "wind_vortex", "center": center, "left": WIND_BURST.sec, "tick": WIND_BURST.tick, "t": WIND_BURST.tick, "base": atk})
		"ice":
			_effects.append({"kind": "ice_storm", "center": center, "left": ICE_BURST.sec, "tick": ICE_BURST.tick, "t": ICE_BURST.tick, "base": atk})
		"rock":
			grant_shield(max_hp * ROCK_BURST.shield, "rock")
		"grass":
			_effects.append({"kind": "grass_thorns", "center": center, "left": GRASS_BURST.sec, "tick": GRASS_BURST.tick, "t": GRASS_BURST.tick, "base": atk})
	get_tree().call_group("element_receiver", "receive_element", center, BURST_RADIUS, el)
	return true

func _tick_effects(delta: float) -> void:
	for fx in _effects:
		fx.left -= delta
		fx.t -= delta
		if fx.t > 0.0:
			continue
		fx.t += fx.tick
		match fx.kind:
			"fire_ring":
				_ring_fx(fx.center, FIRE_BURST_RING.radius, Elements.color_of("fire"), 0.3)
				for e in _enemies_near(fx.center, FIRE_BURST_RING.radius):
					_deal(e, fx.base * FIRE_BURST_RING.mul, "fire", (e as Node3D).global_position - fx.center)
			"water_heal":
				if hp > 0.0:
					hp = minf(hp + max_hp * WATER_BURST.heal, max_hp)
			"thunder_bolts":
				for e in _nearest(_player.global_position, THUNDER_BURST.reach, 1):
					_bolt(e, fx.base * THUNDER_BURST.bolt)
			"wind_vortex":
				_ring_fx(fx.center, WIND_BURST.radius, Elements.color_of("wind"), 0.3)
				for e in _enemies_near(fx.center, WIND_BURST.radius):
					var to_e: Vector3 = (e as Node3D).global_position - fx.center
					_deal(e, fx.base * WIND_BURST.bolt, "wind", to_e)
					e.call("knockback", -to_e, WIND_BURST.pull)
			"ice_storm":
				var pc := _player.global_position
				_ring_fx(pc, ICE_BURST.radius, Elements.color_of("ice"), 0.3)
				for e in _enemies_near(pc, ICE_BURST.radius):
					_deal(e, fx.base * ICE_BURST.bolt, "ice", (e as Node3D).global_position - pc)
			"grass_thorns":
				_ring_fx(fx.center, GRASS_BURST.radius, Elements.color_of("grass"), 0.3)
				for e in _enemies_near(fx.center, GRASS_BURST.radius):
					_deal(e, fx.base * GRASS_BURST.bolt, "grass", (e as Node3D).global_position - fx.center)
			"bloom_seed":
				## 개화 씨앗이 터짐 — 원소 없는 반응 피해(방패엔 초로 친다).
				var info: Dictionary = Elements.REACTION_INFO["bloom"]
				_ring_fx(fx.center, BLOOM_RADIUS, info.color, 0.4)
				for e in _enemies_near(fx.center, BLOOM_RADIUS):
					var push: Vector3 = (e as Node3D).global_position - fx.center
					e.call("apply_damage", fx.base * BLOOM_MUL * _reaction_mul(), true, push, "grass")
	_effects = _effects.filter(func(fx: Dictionary) -> bool: return fx.left > 0.0)

func _hit_front(reach: float, arc_dot: float, amount: float, element: String) -> int:
	var fwd: Vector3 = _player.call("facing")
	var hits := 0
	for e in _enemies_near(_player.global_position, reach + 0.5):
		var to_e: Vector3 = (e as Node3D).global_position - _player.global_position
		to_e.y = 0.0
		if to_e.length() > 0.3 and fwd.dot(to_e.normalized()) < arc_dot:
			continue
		_deal(e, amount, element, to_e)
		hits += 1
	return hits

func _bolt(e: Node, amount: float) -> void:
	var pos: Vector3 = (e as Node3D).global_position
	_bolt_fx(pos)
	_deal(e, amount, "thunder", pos - _player.global_position)

func _heal_all(ratio: float) -> void:
	for id in roster():
		var h := hp_of(id)
		if h > 0.0:
			_hp[id] = minf(h + max_hp_of(id) * ratio, max_hp_of(id))

## 명단 전원이 기력을 받는다 — 지금 인물은 다, 대기 인물은 ENERGY_OFF_FIELD 몫(원신과 같다). 뇌 공명 +50%.
func _gain_energy(amount: float) -> void:
	if resonance() == "thunder":
		amount *= RESONANCE_THUNDER_ENERGY
	var now := active_id()
	for id in roster():
		var got := amount if id == now else amount * ENERGY_OFF_FIELD
		_energy[id] = minf(energy_of(id) + got, ENERGY_MAX)

func _aim_at_nearest() -> void:
	var best := _nearest(_player.global_position, AUTO_AIM_RANGE, 1)
	if not best.is_empty():
		_player.call("face_toward", (best[0] as Node3D).global_position)

func _nearest(pos: Vector3, radius: float, count: int) -> Array:
	var list := _enemies_near(pos, radius)
	list.sort_custom(func(a: Node3D, b: Node3D) -> bool:
		return a.global_position.distance_squared_to(pos) < b.global_position.distance_squared_to(pos))
	return list.slice(0, count)

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
	var amount := base
	## 초전도가 남은 적 — 물리 피해 ×1.4. 빙 공명 — 빙이 붙었거나 얼어 있는 적에게 +15%.
	if element == "" and float(enemy.get("phys_vuln_t")) > 0.0:
		amount *= PHYS_VULN_MUL
	if resonance() == "ice" and (enemy.get("aura") == "ice" or enemy.call("is_frozen")):
		amount *= RESONANCE_ICE_DMG
	## 쇄빙 — 얼어 있는 적을 강공격·낙하로 치면 크게 들어가고 풀린다.
	if _heavy and enemy.call("is_frozen"):
		var sh: Dictionary = Elements.REACTION_INFO["shatter"]
		amount *= float(sh.mul) * _reaction_mul()
		last_reaction = "shatter"
		_reaction_text(enemy as Node3D, sh.name, sh.color)
		enemy.call("unfreeze")
		return enemy.call("apply_damage", amount, true, dir)
	## 촉진이 남은 적 — 뇌는 활성, 초는 발산(×1.25).
	var bonus := ""
	if float(enemy.get("quicken_t")) > 0.0 and (element == "thunder" or element == "grass"):
		bonus = "aggravate" if element == "thunder" else "spread"
		var bi: Dictionary = Elements.REACTION_INFO[bonus]
		amount *= float(bi.mul) * _reaction_mul()
		_reaction_text(enemy as Node3D, bi.name, bi.color)
	var aura: String = enemy.get("aura")
	var reaction := Elements.reaction_of(aura, element)
	last_reaction = reaction if reaction != "" else bonus
	if reaction != "":
		var info: Dictionary = Elements.REACTION_INFO[reaction]
		amount *= float(info.mul) * _reaction_mul()
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
			"frozen":
				enemy.call("freeze", FREEZE_SEC)
			"superconduct":
				var sc_center: Vector3 = (enemy as Node3D).global_position
				_ring_fx(sc_center, SUPERCONDUCT_RADIUS, info.color, 0.35)
				for other in _enemies_near(sc_center, SUPERCONDUCT_RADIUS):
					other.set("phys_vuln_t", PHYS_VULN_SEC)
					if other != enemy:
						other.call("apply_damage", base * SUPERCONDUCT_MUL, false, (other as Node3D).global_position - sc_center, "ice")
			"swirl":
				## 확산 — 둘레 적에게 빨아올린 원소를 옮겨 붙이고 그 원소로 조금 친다(옮겨 붙은 원소로 또 반응은 안 한다).
				var sw_center: Vector3 = (enemy as Node3D).global_position
				_ring_fx(sw_center, SWIRL_RADIUS, Elements.color_of(aura), 0.4)
				for other in _enemies_near(sw_center, SWIRL_RADIUS):
					if other == enemy:
						continue
					if not other.call("is_shielded") and other.get("aura") == "":
						other.call("set_aura", aura)
					other.call("apply_damage", base * SWIRL_MUL, false, (other as Node3D).global_position - sw_center, aura)
			"crystallize":
				grant_shield(max_hp * CRYSTAL_SHIELD, aura)
			"bloom":
				_effects.append({"kind": "bloom_seed", "center": (enemy as Node3D).global_position, "left": BLOOM_DELAY, "tick": BLOOM_DELAY, "t": BLOOM_DELAY, "base": base})
			"burning":
				enemy.call("add_dot", BURNING.ticks, BURNING.every, base * BURNING.mul)
			"quicken":
				enemy.set("quicken_t", QUICKEN_SEC)
	elif Elements.attaches(element):
		enemy.call("set_aura", element)
	return enemy.call("apply_damage", amount, reaction != "" or bonus != "", dir)

## 반응 피해 배율 — 초 공명 +20% · 운명의 자리 2 +15%.
func _reaction_mul() -> float:
	var m := 1.0
	if resonance() == "grass":
		m *= RESONANCE_GRASS_REACTION
	if PartyState.constellation(active_id()) >= 2:
		m *= Growth.C2_REACTION_MUL
	return m

## 명단 전체 보호막 — 더 큰 쪽으로 갈고 시간은 새로.
func grant_shield(amount: float, element: String) -> void:
	shield_hp = maxf(shield_hp, amount)
	shield_element = element
	_shield_t = SHIELD_SEC
	_ring_fx(_player.global_position, 1.3, Elements.color_of(element), 0.5)

func take_damage(amount: float, source: Node) -> void:
	if hp <= 0.0 or _duel_open():
		return
	if _player.call("is_invulnerable"):
		return
	var d := PartyState.char_def(active_id())
	var dmg := amount * (1.0 - d / (d + 120.0))
	## 보호막이 먼저 받는다 — 다 막으면 원소 효과(화상·젖음·감전)도 안 든다.
	if shield_hp > 0.0:
		var absorbed := minf(shield_hp, dmg)
		shield_hp -= absorbed
		dmg -= absorbed
		if dmg <= 0.0:
			_reaction_text(_player, "막음", Elements.color_of(shield_element))
			_refresh_hud()
			return
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

## 지금 인물이 쓰러짐 — 살아 있는 다음 인물로 바로 바뀐다. 다 쓰러졌으면 원신처럼 잃는 것 없이
## 마지막으로 딛은 땅에서 모두 가득 차서 다시 일어난다.
func _down() -> void:
	var fallen := display_name(active_id())
	_burn_left = 0
	var r := roster()
	for step in range(1, r.size()):
		var i := (active + step) % r.size()
		if hp_of(r[i]) > 0.0:
			switch_to(i, true)
			Toast.show(_player, "%s 쓰러짐 — %s 교체" % [fallen, display_name(r[i])], 2.5)
			return
	_player.call("respawn_safe")
	revive_all()
	shield_hp = 0.0
	energy = 0.0
	Toast.show(_player, "쓰러졌다 — 정신을 차려 보니 안전한 곳이다", 3.0)

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

## 낙뢰 — 하늘에서 적 머리로 떨어지는 가는 기둥.
func _bolt_fx(pos: Vector3) -> void:
	var mi := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.08
	cyl.bottom_radius = 0.18
	cyl.height = 9.0
	cyl.radial_segments = 6
	mi.mesh = cyl
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Elements.color_of("thunder").lightened(0.3)
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	get_tree().current_scene.add_child(mi)
	mi.global_position = pos + Vector3.UP * 4.5
	var tw := mi.create_tween()
	tw.tween_property(mat, "albedo_color:a", 0.0, 0.25)
	tw.tween_callback(mi.queue_free)

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

## 106장 ⑧ 원신 배치 — 아래 가운데 지금 인물 체력, 오른쪽 명단(인물마다 원소색·체력 막대),
## 오른쪽 아래 E(스킬 쿨)·Q(폭발 기력) 원.
class Orb extends Control:
	var ratio := 1.0
	var key_text := ""
	var sub_text := ""
	var color := Color.WHITE
	var glow := false

	func _draw() -> void:
		var c := size * 0.5
		var r := minf(size.x, size.y) * 0.5 - 3.0
		draw_circle(c, r, Color(0, 0, 0, 0.55))
		if ratio > 0.0:
			draw_arc(c, r - 2.0, -PI * 0.5, -PI * 0.5 + TAU * clampf(ratio, 0.0, 1.0), 48, color, 4.0, true)
		if glow:
			draw_arc(c, r + 1.0, 0.0, TAU, 48, color.lightened(0.4), 2.0, true)
		var font := ThemeDB.fallback_font
		draw_string(font, Vector2(0, c.y + 7), key_text, HORIZONTAL_ALIGNMENT_CENTER, size.x, 22, Color.WHITE)
		if sub_text != "":
			draw_string(font, Vector2(0, c.y + 24), sub_text, HORIZONTAL_ALIGNMENT_CENTER, size.x, 12, Color(1, 1, 1, 0.85))

func _build_hud() -> void:
	var layer := CanvasLayer.new()
	layer.name = "FieldCombatHUD"
	add_child(layer)
	_hud = Control.new()
	_hud.set_anchors_preset(Control.PRESET_FULL_RECT)
	_hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(_hud)

	_hp_bar = _bar(Color(0.45, 0.85, 0.35), Vector2(360, 14), -64)

	_status_label = Label.new()
	_status_label.anchor_left = 0.5
	_status_label.anchor_right = 0.5
	_status_label.anchor_top = 1.0
	_status_label.anchor_bottom = 1.0
	_status_label.offset_left = -180
	_status_label.offset_right = 180
	_status_label.offset_top = -46
	_status_label.offset_bottom = -22
	_status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_status_label.add_theme_font_size_override("font_size", 15)
	_status_label.add_theme_constant_override("outline_size", 5)
	_status_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	_hud.add_child(_status_label)

	_roster_box = VBoxContainer.new()
	_roster_box.anchor_left = 1.0
	_roster_box.anchor_right = 1.0
	_roster_box.anchor_top = 0.32
	_roster_box.offset_left = -210
	_roster_box.offset_right = -16
	_roster_box.add_theme_constant_override("separation", 8)
	_roster_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hud.add_child(_roster_box)

	if DisplayServer.is_touchscreen_available():
		var specs := [["공격", "combat_quick", -170], ["스킬", "combat_ult", -300], ["폭발", "combat_burst", -430], ["대시", "combat_dodge", -560]]
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
			_touch_buttons[action] = b
	else:
		_skill_orb = _orb("E", -196)
		_burst_orb = _orb("Q", -108)

func _orb(key: String, x: float) -> Orb:
	var o := Orb.new()
	o.key_text = key
	o.anchor_left = 1.0
	o.anchor_right = 1.0
	o.anchor_top = 1.0
	o.anchor_bottom = 1.0
	o.offset_left = x
	o.offset_right = x + 76
	o.offset_top = -120
	o.offset_bottom = -44
	o.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hud.add_child(o)
	return o

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
	_style_bar(bar, color)
	_hud.add_child(bar)
	return bar

func _style_bar(bar: ProgressBar, color: Color) -> void:
	var fill := StyleBoxFlat.new()
	fill.bg_color = color
	fill.set_corner_radius_all(4)
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0, 0, 0, 0.55)
	bg.set_corner_radius_all(4)
	bar.add_theme_stylebox_override("fill", fill)
	bar.add_theme_stylebox_override("background", bg)
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE

func _rebuild_roster(r: Array[String]) -> void:
	for c in _roster_box.get_children():
		c.queue_free()
	_roster_rows.clear()
	for i in r.size():
		var row := VBoxContainer.new()
		row.add_theme_constant_override("separation", 2)
		row.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var l := Label.new()
		l.add_theme_font_size_override("font_size", 17)
		l.add_theme_constant_override("outline_size", 6)
		l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
		row.add_child(l)
		var bar := ProgressBar.new()
		bar.show_percentage = false
		bar.custom_minimum_size = Vector2(150, 6)
		_style_bar(bar, Elements.color_of(Elements.element_of(r[i])))
		row.add_child(bar)
		_roster_box.add_child(row)
		_roster_rows.append({"label": l, "bar": bar})

func _refresh_hud() -> void:
	if _hud == null:
		return
	var r := roster()
	var sig := ",".join(r)
	if sig != _roster_sig:
		_roster_sig = sig
		_rebuild_roster(r)
	_hp_bar.max_value = max_hp
	_hp_bar.value = hp
	for i in r.size():
		var row: Dictionary = _roster_rows[i]
		var el := Elements.element_of(r[i])
		var mark := "▶ " if i == active else "   "
		var down := " (쓰러짐)" if hp_of(r[i]) <= 0.0 else ""
		(row.label as Label).text = "%s%d %s Lv.%d [%s]%s" % [mark, i + 1, display_name(r[i]), PartyState.char_level(r[i]), Elements.name_of(el), down]
		var bar: ProgressBar = row.bar
		bar.max_value = max_hp_of(r[i])
		bar.value = hp_of(r[i])
	var cd: float = _skill_cd.get(active_id(), 0.0)
	var el_now := active_element()
	var res := resonance()
	var res_text := " · 공명 %s" % Elements.name_of(res) if res != "" else ""
	if shield_hp > 0.0:
		res_text += " · 보호막 %d" % int(shield_hp)
	_status_label.text = "%s HP %d/%d%s" % [display_name(active_id()), int(hp), int(max_hp), res_text]
	if _skill_orb:
		_skill_orb.color = Elements.color_of(el_now)
		_skill_orb.ratio = 1.0 - cd / skill_cd_of(active_id())
		_skill_orb.glow = cd <= 0.0
		_skill_orb.sub_text = "" if cd <= 0.0 else "%.1f" % cd
		_skill_orb.queue_redraw()
		_burst_orb.color = Elements.color_of(el_now)
		_burst_orb.ratio = energy / ENERGY_MAX
		_burst_orb.glow = energy >= ENERGY_MAX
		_burst_orb.sub_text = "" if energy >= ENERGY_MAX else "%d%%" % int(energy)
		_burst_orb.queue_redraw()
	if _touch_buttons.has("combat_ult"):
		(_touch_buttons.combat_ult as Button).text = "스킬" if cd <= 0.0 else "%.1f" % cd
		(_touch_buttons.combat_burst as Button).text = "폭발!" if energy >= ENERGY_MAX else "폭발 %d%%" % int(energy)
