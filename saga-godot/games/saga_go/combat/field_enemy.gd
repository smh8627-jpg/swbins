extends CharacterBody3D

## PLAN 106장 ③ — 들판에 떠도는 적. 원신 들판 몹의 문법: 제자리 배회 → 플레이어를
## 보면 쫓아옴 → 공격 전 예고(몸이 붉게 부풀고 "!") → 한 번 덤빔 → 잠깐 쉼.
## 너무 멀리 끌려 나오면(LEASH) 집으로 돌아가 체력을 채운다. 죽으면 RESPAWN_SEC 뒤
## 집 자리에서 다시 선다. 원소 부착(aura)·반응 계산은 field_combat.gd 가 한다 —
## 여기는 몸·체력·AI·머리 위 표시만.

const Elements := preload("res://games/saga_go/combat/elements.gd")
const Growth := preload("res://games/saga_go/data/growth.gd")
const VroidBody := preload("res://games/saga_go/world/vroid_body.gd")
const CreatureBuilder := preload("res://games/saga_go/world/creature_builder.gd")
const Adventure := preload("res://games/saga_go/data/adventure.gd")

signal died(enemy: Node)

const KINDS := {
	"wolf": {"name": "들늑대", "hp": 220.0, "atk": 14.0, "speed": 5.5, "aggro": 14.0,
		"reach": 1.8, "tell": 0.7, "cd": 1.6, "exp": 10.0},
	"bandit": {"name": "떠돌이 도적", "hp": 320.0, "atk": 18.0, "speed": 4.2, "aggro": 12.0,
		"reach": 2.0, "tell": 0.9, "cd": 2.0, "exp": 14.0},
	## PLAN 106장 ⑦ — 원소 쓰는 적(퓨전 괴물). 원소 방패(shield)가 있는 동안 체력은 안 깎이고
	## 방패만 깎인다(상성은 elements.gd shield_mul). 깨지면 BREAK_STAGGER 초 비틀거리고 그 뒤론
	## 보통 적처럼 원소가 붙고 반응도 난다. 덤벼 맞히면 원소 효과(field_combat.gd take_damage).
	"fire_imp": {"name": "불도깨비", "hp": 260.0, "atk": 16.0, "speed": 4.6, "aggro": 13.0,
		"reach": 2.0, "tell": 0.8, "cd": 1.8, "exp": 20.0, "element": "fire", "shield": 150.0,
		"shape": "goblin", "height": 1.5, "colors": [Color(0.85, 0.28, 0.18), Color(0.35, 0.18, 0.14), Color(1.0, 0.85, 0.3)]},
	"water_turtle": {"name": "물거북", "hp": 300.0, "atk": 15.0, "speed": 3.6, "aggro": 12.0,
		"reach": 2.0, "tell": 0.9, "cd": 2.0, "exp": 20.0, "element": "water", "shield": 180.0,
		"shape": "turtle", "height": 1.0, "colors": [Color(0.2, 0.42, 0.62), Color(0.35, 0.62, 0.72), Color(0.85, 0.95, 1.0)]},
	"thunder_cat": {"name": "번개살쾡이", "hp": 230.0, "atk": 17.0, "speed": 6.0, "aggro": 15.0,
		"reach": 1.8, "tell": 0.65, "cd": 1.5, "exp": 20.0, "element": "thunder", "shield": 130.0,
		"shape": "beast", "height": 1.05, "colors": [Color(0.42, 0.3, 0.6), Color(0.78, 0.65, 1.0), Color(1.0, 0.95, 0.45)]},
	## PLAN 106장 ⑮ — 새 원소 넷의 괴물(퓨전, 코드로 그림). 방패 상성은 elements.gd SHIELD_COUNTER.
	"wind_hawk": {"name": "회오리매", "hp": 200.0, "atk": 15.0, "speed": 6.5, "aggro": 16.0,
		"reach": 2.0, "tell": 0.6, "cd": 1.5, "exp": 20.0, "element": "wind", "shield": 140.0,
		"shape": "bird", "height": 1.2, "colors": [Color(0.35, 0.78, 0.66), Color(0.88, 0.98, 0.94), Color(1.0, 0.95, 0.5)]},
	"ice_fox": {"name": "눈여우", "hp": 240.0, "atk": 16.0, "speed": 5.8, "aggro": 14.0,
		"reach": 1.8, "tell": 0.7, "cd": 1.6, "exp": 20.0, "element": "ice", "shield": 170.0,
		"shape": "fox9", "height": 1.1, "colors": [Color(0.9, 0.95, 1.0), Color(0.55, 0.8, 0.95), Color(0.35, 0.7, 1.0)]},
	"rock_bear": {"name": "바위곰", "hp": 380.0, "atk": 22.0, "speed": 3.6, "aggro": 11.0,
		"reach": 2.3, "tell": 1.0, "cd": 2.2, "exp": 20.0, "element": "rock", "shield": 230.0,
		"shape": "bear", "height": 1.7, "colors": [Color(0.5, 0.4, 0.3), Color(0.9, 0.7, 0.3), Color(1.0, 0.85, 0.35)]},
	"grass_snake": {"name": "덩굴뱀", "hp": 250.0, "atk": 15.0, "speed": 4.4, "aggro": 12.0,
		"reach": 2.2, "tell": 0.8, "cd": 1.8, "exp": 20.0, "element": "grass", "shield": 160.0,
		"shape": "serpent", "height": 1.3, "colors": [Color(0.3, 0.6, 0.22), Color(0.7, 0.85, 0.35), Color(0.95, 0.55, 0.75)]},
	## 106장 ㉑ 주간 보스 — field_boss.gd 가 이 칸을 쓴다(패턴·2단계 뇌 방패는 거기). 처음엔 방패 없음.
	"storm_serpent": {"name": "먹구름 이무기", "hp": 6000.0, "atk": 40.0, "speed": 3.2, "aggro": 40.0,
		"reach": 3.2, "tell": 1.0, "cd": 1.8, "exp": 0.0, "element": "thunder", "shield": 0.0,
		"shape": "serpent", "height": 3.6, "colors": [Color(0.22, 0.24, 0.36), Color(0.55, 0.5, 0.85), Color(0.85, 0.7, 1.0)]},
	## 106장 ㉓ 들판 보스 셋 — field_boss.gd 로 세상에 서 있다(world/field_bosses.gd). 2단계 방패는 phase_shield, 경험·전리품은 보상 꽃에서.
	"gale_roc": {"name": "돌개바람 수리왕", "hp": 3000.0, "atk": 28.0, "speed": 4.0, "aggro": 16.0,
		"reach": 3.0, "tell": 0.9, "cd": 1.8, "exp": 0.0, "element": "wind", "shield": 0.0, "phase_shield": 400.0,
		"phase_text": "돌개바람 수리왕이 바람을 두른다 — 암으로 방패를 깨라",
		"shape": "bird", "height": 3.0, "colors": [Color(0.3, 0.62, 0.55), Color(0.9, 0.97, 0.92), Color(1.0, 0.85, 0.3)]},
	"tide_turtle": {"name": "물마루 거북왕", "hp": 3400.0, "atk": 26.0, "speed": 3.0, "aggro": 15.0,
		"reach": 3.2, "tell": 1.0, "cd": 2.0, "exp": 0.0, "element": "water", "shield": 0.0, "phase_shield": 450.0,
		"phase_text": "물마루 거북왕이 물을 두른다 — 뇌로 방패를 깨라",
		"shape": "turtle", "height": 2.4, "colors": [Color(0.16, 0.34, 0.52), Color(0.3, 0.58, 0.66), Color(0.95, 0.9, 0.7)]},
	"ember_king": {"name": "잿불 도깨비왕", "hp": 3000.0, "atk": 30.0, "speed": 3.8, "aggro": 16.0,
		"reach": 3.0, "tell": 0.9, "cd": 1.8, "exp": 0.0, "element": "fire", "shield": 0.0, "phase_shield": 400.0,
		"phase_text": "잿불 도깨비왕이 불을 두른다 — 수로 방패를 깨라",
		"shape": "goblin", "height": 3.4, "colors": [Color(0.55, 0.18, 0.12), Color(0.22, 0.14, 0.12), Color(1.0, 0.6, 0.2)]},
}

const GRAVITY := 20.0
const WANDER_RADIUS := 6.0
const LEASH := 26.0
const RESPAWN_SEC := 90.0
const LUNGE_SPEED := 9.0
const LUNGE_SEC := 0.18
## 원소 방패가 깨지면 이만큼 멈춰 선다(원신 방패 깨기의 보상 틈).
const BREAK_STAGGER := 2.0
## 폰 발열(2026-09-24) — 플레이어에게서 SLEEP_M 밖에서 쉬는(배회) 적은 AI·물리를 멈추고 제자리에 선다(원신도 먼 적은 서 있다).
## SLEEP_CHECK 초마다 거리만 보고, WAKE_M 안으로 들어오면 다시 움직인다. 세 지역 적 32마리가 물리 시간의 3/4 을 먹던 것.
const SLEEP_M := 100.0
const WAKE_M := 90.0
const SLEEP_CHECK := 0.5

enum AI { IDLE, CHASE, WINDUP, LUNGE, RECOVER, RETURN, DEAD }

var kind := "wolf"
var def: Dictionary = {}
var home := Vector3.ZERO
var hp := 1.0
var max_hp := 1.0
var aura := ""
var aura_t := 0.0
var ai := AI.IDLE
## 원소 방패 — 원소 없는 적은 0.
var element := ""
## PLAN 106장 ⑭ 반응이 남기는 상태(초). 빙결 = 멈춤, 초전도 = 물리 피해 ×1.4(field_combat 이 곱함),
## 촉진 = 뇌·초 피해 ×1.25(활성·발산, field_combat 이 곱함).
var frozen_t := 0.0
var phys_vuln_t := 0.0
var quicken_t := 0.0
var shield := 0.0
var max_shield := 0.0
## 106장 ⑳ 비경 — 공격 배율, 쓰러지면 되살아나지 않고 사라짐, 경험·전리품 없음(비경 보상은 끝에 한꺼번에).
var dmg_mul := 1.0
var respawns := true
var drops := true
## 106장 ㉒ 세계 등급 — field_spawner 가 앉힌다(비경 적은 안 씀 = -1, Lv 표시 없음).
var world_lv := -1
var _name_label: Label3D = null

var _t := 0.0
var _wander_target := Vector3.ZERO
var _knock := Vector3.ZERO
var _dots: Array = [] # [{left, every, t, amount}]
var _visual: Node3D = null
var _visual_scale := 1.0
var _bar_fill: MeshInstance3D = null
var _shield_fill: MeshInstance3D = null
var _shield_bg: MeshInstance3D = null
var _aura_dot: MeshInstance3D = null
var _tell_label: Label3D = null
var _anim: AnimationPlayer = null
var _rng := RandomNumberGenerator.new()
var asleep := false
var _sleep_t := 1.0 # 처음 1초는 땅에 내려앉게 깨어 있는다

func setup(kind_id: String, home_pos: Vector3, seed_value: int) -> void:
	kind = kind_id
	def = KINDS[kind]
	home = home_pos
	_rng.seed = seed_value
	max_hp = def.hp
	hp = max_hp
	element = def.get("element", "")
	max_shield = def.get("shield", 0.0)
	shield = max_shield

## 106장 ㉒ 세계 등급 — 체력·방패는 비율을 지킨 채 배율만 바꾼다(싸우는 중에 바뀌어도 깎인 만큼 그대로).
func apply_world_level(wl: int) -> void:
	world_lv = wl
	var hp_ratio := hp / max_hp if max_hp > 0.0 else 1.0
	var sh_ratio := shield / max_shield if max_shield > 0.0 else 1.0
	max_hp = float(def.hp) * Adventure.hp_mul(wl)
	hp = max_hp * hp_ratio
	max_shield = float(def.get("shield", 0.0)) * Adventure.hp_mul(wl)
	shield = max_shield * sh_ratio
	dmg_mul = Adventure.atk_mul(wl)
	if _name_label:
		_name_label.text = "Lv.%d %s" % [Adventure.enemy_level(wl), def.name]
	if is_inside_tree():
		_refresh_bar()

## 106장 ⑳ 비경 단계 — 체력·방패·공격 배율.
func scale_stats(hp_mul: float, atk_mul: float) -> void:
	max_hp *= hp_mul
	hp = max_hp
	max_shield *= hp_mul
	shield = max_shield
	dmg_mul = atk_mul

func _ready() -> void:
	add_to_group("field_enemy")
	collision_layer = 1
	collision_mask = 1
	var shape := CapsuleShape3D.new()
	shape.radius = 0.4 if kind == "bandit" else 0.45
	shape.height = 1.7 if kind == "bandit" else 1.0
	var cs := CollisionShape3D.new()
	cs.shape = shape
	cs.position = Vector3(0, shape.height * 0.5, 0)
	add_child(cs)
	global_position = home
	_visual = _build_visual()
	add_child(_visual)
	_build_overhead()
	_pick_wander()

# ---------------------------------------------------------------- AI

func _physics_process(delta: float) -> void:
	if ai == AI.DEAD:
		_t -= delta
		if _t <= 0.0:
			_revive()
		return
	if ai == AI.IDLE and _sleep_tick(delta):
		return
	_tick_status(delta)
	if ai == AI.DEAD:
		return
	if frozen_t > 0.0:
		## 빙결 — 제자리에 멈춘다(예고 중이었으면 끊김). 중력만.
		velocity.x = 0.0
		velocity.z = 0.0
		velocity.y = -1.0 if is_on_floor() else velocity.y - GRAVITY * delta
		move_and_slide()
		return
	var player := get_tree().get_first_node_in_group("player") as Node3D
	var to_player := Vector3.ZERO
	var dist := 999.0
	if player:
		to_player = player.global_position - global_position
		to_player.y = 0.0
		dist = to_player.length()
	var from_home := Vector3(global_position.x - home.x, 0, global_position.z - home.z).length()

	var move := Vector3.ZERO
	_t -= delta
	match ai:
		AI.IDLE:
			var to_w := _wander_target - global_position
			to_w.y = 0.0
			if to_w.length() > 0.6:
				move = to_w.normalized() * def.speed * 0.3
			elif _t <= 0.0:
				_pick_wander()
			if dist < def.aggro and _player_can_fight(player):
				ai = AI.CHASE
		AI.CHASE:
			if from_home > LEASH or not _player_can_fight(player):
				ai = AI.RETURN
			elif dist <= def.reach:
				ai = AI.WINDUP
				_t = def.tell
				_set_tell(true)
			else:
				move = to_player.normalized() * def.speed
		AI.WINDUP:
			_face(to_player, delta * 3.0)
			if _t <= 0.0:
				_set_tell(false)
				ai = AI.LUNGE
				_t = LUNGE_SEC
				_knock = _facing() * LUNGE_SPEED
				_try_hit_player(player)
		AI.LUNGE:
			if _t <= 0.0:
				ai = AI.RECOVER
				_t = def.cd
		AI.RECOVER:
			if _t <= 0.0:
				ai = AI.CHASE
		AI.RETURN:
			var to_h := home - global_position
			to_h.y = 0.0
			if to_h.length() < 1.0:
				hp = max_hp
				shield = max_shield
				_on_reset()
				_refresh_bar()
				ai = AI.IDLE
				_pick_wander()
			else:
				move = to_h.normalized() * def.speed

	if move.length() > 0.05:
		_face(move, delta)
	velocity.x = move.x + _knock.x
	velocity.z = move.z + _knock.z
	_knock = _knock.move_toward(Vector3.ZERO, 30.0 * delta)
	velocity.y = -1.0 if is_on_floor() else velocity.y - GRAVITY * delta
	move_and_slide()
	_play(move.length() > 0.05)
	## 산 절벽 밖이나 물에 빠지면 집으로(지형 끼임 안전망).
	if global_position.y < home.y - 6.0:
		global_position = home
		velocity = Vector3.ZERO
		ai = AI.IDLE

## 멀리 쉬는 중이면 true(이번 프레임은 아무것도 안 한다). 쉬는 동안엔 몸 애니도 멈춘다.
func _sleep_tick(delta: float) -> bool:
	_sleep_t -= delta
	if _sleep_t <= 0.0:
		_sleep_t = SLEEP_CHECK
		var player := get_tree().get_first_node_in_group("player") as Node3D
		var far := false
		if player:
			var d := Vector2(player.global_position.x - global_position.x, player.global_position.z - global_position.z).length()
			far = d > (WAKE_M if asleep else SLEEP_M)
		if far != asleep:
			asleep = far
			velocity = Vector3.ZERO
			if _visual:
				_visual.process_mode = Node.PROCESS_MODE_DISABLED if asleep else Node.PROCESS_MODE_INHERIT
	return asleep

func _player_can_fight(player: Node3D) -> bool:
	if player == null:
		return false
	var fc := get_tree().get_first_node_in_group("go_field_combat")
	return fc != null and fc.call("can_be_targeted")

func _try_hit_player(player: Node3D) -> void:
	if player == null:
		return
	var to_p := player.global_position - global_position
	to_p.y = 0.0
	if to_p.length() > def.reach + 0.6 or _facing().dot(to_p.normalized()) < 0.3:
		return
	var fc := get_tree().get_first_node_in_group("go_field_combat")
	if fc:
		fc.call("take_damage", def.atk * dmg_mul, self)

func _pick_wander() -> void:
	var a := _rng.randf() * TAU
	var r := _rng.randf() * WANDER_RADIUS
	_wander_target = home + Vector3(cos(a) * r, 0, sin(a) * r)
	_t = 2.0 + _rng.randf() * 3.0

# ---------------------------------------------------------------- 피해·상태

## field_combat.gd 가 부른다. 실제 깎인 양(방패가 있으면 방패 쪽)을 돌려준다.
## incoming_element 는 방패 상성에만 쓴다(과부하 튐·감전 지속처럼 원소를 모르는 피해는 "" = 물리).
func apply_damage(amount: float, crit: bool, from_dir: Vector3 = Vector3.ZERO, incoming_element: String = "") -> float:
	if ai == AI.DEAD:
		return 0.0
	if shield > 0.0:
		var dealt := amount * Elements.shield_mul(element, incoming_element)
		shield = maxf(shield - dealt, 0.0)
		if dealt > 0.0:
			CombatFeel.hit(_visual, dealt, false)
		if ai == AI.IDLE or ai == AI.RETURN:
			ai = AI.CHASE
		if shield <= 0.0:
			_break_shield(from_dir)
		_refresh_bar()
		return dealt
	hp -= amount
	CombatFeel.hit(_visual, amount, crit)
	if from_dir.length() > 0.01:
		_knock = from_dir.normalized() * 4.0
	if ai == AI.IDLE or ai == AI.RETURN:
		ai = AI.CHASE
	_refresh_bar()
	if hp <= 0.0:
		_die()
	return amount

func is_shielded() -> bool:
	return shield > 0.0

func _break_shield(from_dir: Vector3) -> void:
	shield = 0.0
	_set_tell(false)
	ai = AI.RECOVER
	_t = BREAK_STAGGER
	if from_dir.length() > 0.01:
		_knock = from_dir.normalized() * 6.0

## 집에 돌아가 체력을 채울 때·되살아날 때(보스가 단계를 처음으로 돌린다 — field_boss.gd).
func _on_reset() -> void:
	pass

## 쓰러진 채 sec 뒤에 되살아나게(들판 보스는 보상 꽃을 받을 때까지 기다린다 — world/field_bosses.gd).
func hold_respawn(sec: float) -> void:
	if ai == AI.DEAD:
		_t = sec

func knockback(dir: Vector3, force: float) -> void:
	_knock = Vector3(dir.x, 0, dir.z).normalized() * force

func set_aura(element: String) -> void:
	aura = element
	aura_t = Elements.AURA_SEC if element != "" else 0.0
	_refresh_aura()

## 빙결(106장 ⑭). 예고를 끊고 멈춘다 — 풀리면 잠깐 쉬었다가 다시 쫓는다.
func freeze(sec: float) -> void:
	frozen_t = maxf(frozen_t, sec)
	_set_tell(false)
	ai = AI.RECOVER
	_t = maxf(_t, 0.4)
	_refresh_aura()

func unfreeze() -> void:
	frozen_t = 0.0
	_refresh_aura()

func is_frozen() -> bool:
	return frozen_t > 0.0

func add_dot(ticks: int, every: float, amount: float) -> void:
	_dots.append({"left": ticks, "every": every, "t": every, "amount": amount})

func is_dead() -> bool:
	return ai == AI.DEAD

func _tick_status(delta: float) -> void:
	phys_vuln_t = maxf(phys_vuln_t - delta, 0.0)
	quicken_t = maxf(quicken_t - delta, 0.0)
	if frozen_t > 0.0:
		frozen_t -= delta
		if frozen_t <= 0.0:
			unfreeze()
	if aura_t > 0.0:
		aura_t -= delta
		if aura_t <= 0.0:
			aura = ""
			_refresh_aura()
	for d in _dots.duplicate():
		d.t -= delta
		if d.t <= 0.0:
			d.t = d.every
			d.left -= 1
			apply_damage(d.amount, false)
			if d.left <= 0:
				_dots.erase(d)
		if ai == AI.DEAD:
			_dots.clear()
			return

func _die() -> void:
	ai = AI.DEAD
	_t = RESPAWN_SEC
	_set_tell(false)
	aura = ""
	frozen_t = 0.0
	phys_vuln_t = 0.0
	quicken_t = 0.0
	_dots.clear()
	visible = false
	collision_layer = 0
	if not drops:
		died.emit(self)
		if not respawns:
			queue_free()
		return
	PartyState.add_exp(def.exp)
	## 106장 ⑩ — 육성 재료(냥·전리품·원소 결정·견문록). 정해진 양(growth.gd KILL_DROPS).
	var loot: Dictionary = Adventure.scale_loot(Growth.KILL_DROPS.get(kind, {}), maxi(world_lv, 0))
	if not loot.is_empty():
		PartyState.add_items(loot)
		## 106장 ⑰ — 원소 괴물은 ★4 성유물 하나.
		var art_text := ""
		if def.has("element"):
			PartyState.add_artifact(4)
			art_text = " · 성유물"
		CombatFeel.pickup(self, "냥 +%d%s" % [int(loot.get("mora", 0)), art_text])
	died.emit(self)
	if not respawns:
		queue_free()

func _revive() -> void:
	global_position = home
	hp = max_hp
	shield = max_shield
	visible = true
	collision_layer = 1
	ai = AI.IDLE
	_on_reset()
	_refresh_bar()
	_refresh_aura()
	_pick_wander()

# ---------------------------------------------------------------- 모양

func _facing() -> Vector3:
	var y := _visual.rotation.y if _visual else 0.0
	return Vector3(sin(y), 0, cos(y))

func _face(dir: Vector3, weight: float) -> void:
	if _visual == null or dir.length() < 0.01:
		return
	_visual.rotation.y = lerp_angle(_visual.rotation.y, atan2(dir.x, dir.z), clampf(10.0 * weight, 0.0, 1.0))

func _play(moving: bool) -> void:
	if _anim == null:
		return
	var want := "walk" if moving else "idle"
	if _anim.has_animation(want) and _anim.current_animation != want:
		_anim.play(want)

func _set_tell(on: bool) -> void:
	if _tell_label:
		_tell_label.visible = on
	if _visual:
		_visual.scale = Vector3.ONE * _visual_scale * (1.12 if on else 1.0)

## PLAN 106장 ④ — 도적은 VRoid 몸(검붉은 옷, 개체마다 머리색만 다름), 늑대는
## 코드로 그린 네발짐승(creature_builder.gd). 사건 늑대 무리(bandit_encounter)와 같은 모양.
func _build_visual() -> Node3D:
	var v: Node3D
	if kind == "bandit":
		v = VroidBody.build(String(name), 2, Color(0.55, 0.28, 0.25))
		_anim = v.get_node_or_null("AnimationPlayer") as AnimationPlayer
	elif def.has("shape"):
		v = CreatureBuilder.build(def.shape, def.colors)
		CreatureBuilder._fit(v, def.shape, def.height)
	else:
		v = CreatureBuilder.build("beast", [Color(0.42, 0.4, 0.38), Color(0.62, 0.6, 0.56), Color(0.95, 0.8, 0.25)])
		v.scale = Vector3.ONE * 0.9
	_visual_scale = v.scale.x
	return v

## 머리 위: 이름표 · 체력 막대 · 붙은 원소 점 · 공격 예고 "!".
func _build_overhead() -> void:
	var top := 2.15 if kind == "bandit" else (float(def.height) + 0.45 if def.has("height") else 1.45)
	var label := Label3D.new()
	label.text = def.name if world_lv < 0 else "Lv.%d %s" % [Adventure.enemy_level(world_lv), def.name]
	_name_label = label
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.no_depth_test = true
	label.font_size = 36
	label.outline_size = 8
	label.pixel_size = 0.005
	label.position = Vector3(0, top + 0.22, 0)
	add_child(label)

	var bg := _bar_quad(Color(0.1, 0.08, 0.08, 0.8), Vector2(1.0, 0.1))
	bg.position = Vector3(0, top, 0)
	add_child(bg)
	_bar_fill = _bar_quad(Color(0.9, 0.25, 0.2), Vector2(1.0, 0.07))
	_bar_fill.position = Vector3(0, top, 0.001)
	add_child(_bar_fill)
	## 원소 방패 막대 — 체력 막대 바로 위, 방패 원소 색(들판 보스는 2단계에 생기는 방패 자리를 미리).
	if max_shield > 0.0 or def.has("phase_shield"):
		_shield_bg = _bar_quad(Color(0.1, 0.08, 0.08, 0.8), Vector2(1.0, 0.08))
		_shield_bg.position = Vector3(0, top + 0.11, 0)
		add_child(_shield_bg)
		_shield_fill = _bar_quad(Elements.color_of(element), Vector2(1.0, 0.055))
		_shield_fill.position = Vector3(0, top + 0.11, 0.001)
		add_child(_shield_fill)
		label.position.y += 0.1

	_aura_dot = MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radius = 0.09
	sphere.height = 0.18
	_aura_dot.mesh = sphere
	_aura_dot.position = Vector3(0, top + 0.45, 0)
	add_child(_aura_dot)
	_refresh_aura()

	_tell_label = Label3D.new()
	_tell_label.text = "!"
	_tell_label.modulate = Color(1.0, 0.3, 0.2)
	_tell_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	_tell_label.no_depth_test = true
	_tell_label.font_size = 96
	_tell_label.outline_size = 12
	_tell_label.pixel_size = 0.006
	_tell_label.position = Vector3(0, top + 0.7, 0)
	_tell_label.visible = false
	add_child(_tell_label)

func _bar_quad(color: Color, size: Vector2) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = size
	mi.mesh = q
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = color
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	mat.no_depth_test = true
	mat.render_priority = 1
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mi

func _refresh_bar() -> void:
	if _bar_fill == null:
		return
	var r := clampf(hp / max_hp, 0.0, 1.0)
	(_bar_fill.mesh as QuadMesh).size = Vector2(maxf(r, 0.001), 0.07)
	if _shield_fill:
		var s := clampf(shield / max_shield, 0.0, 1.0) if max_shield > 0.0 else 0.0
		_shield_fill.visible = s > 0.0
		_shield_bg.visible = s > 0.0
		(_shield_fill.mesh as QuadMesh).size = Vector2(maxf(s, 0.001), 0.055)

func _refresh_aura() -> void:
	if _aura_dot == null:
		return
	## 빙결 중엔 얼음색(부착은 이미 반응으로 지워졌다).
	var shown := "ice" if frozen_t > 0.0 else aura
	_aura_dot.visible = shown != ""
	if shown != "":
		var mat := StandardMaterial3D.new()
		mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		mat.albedo_color = Elements.color_of(shown)
		mat.no_depth_test = true
		_aura_dot.material_override = mat
