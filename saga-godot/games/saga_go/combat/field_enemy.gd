extends CharacterBody3D

## PLAN 106장 ③ — 들판에 떠도는 적. 원신 들판 몹의 문법: 제자리 배회 → 플레이어를
## 보면 쫓아옴 → 공격 전 예고(몸이 붉게 부풀고 "!") → 한 번 덤빔 → 잠깐 쉼.
## 너무 멀리 끌려 나오면(LEASH) 집으로 돌아가 체력을 채운다. 죽으면 RESPAWN_SEC 뒤
## 집 자리에서 다시 선다. 원소 부착(aura)·반응 계산은 field_combat.gd 가 한다 —
## 여기는 몸·체력·AI·머리 위 표시만.

const Elements := preload("res://games/saga_go/combat/elements.gd")
const VroidBody := preload("res://games/saga_go/world/vroid_body.gd")
const CreatureBuilder := preload("res://games/saga_go/world/creature_builder.gd")

signal died(enemy: Node)

const KINDS := {
	"wolf": {"name": "들늑대", "hp": 220.0, "atk": 14.0, "speed": 5.5, "aggro": 14.0,
		"reach": 1.8, "tell": 0.7, "cd": 1.6, "exp": 10.0},
	"bandit": {"name": "떠돌이 도적", "hp": 320.0, "atk": 18.0, "speed": 4.2, "aggro": 12.0,
		"reach": 2.0, "tell": 0.9, "cd": 2.0, "exp": 14.0},
}

const GRAVITY := 20.0
const WANDER_RADIUS := 6.0
const LEASH := 26.0
const RESPAWN_SEC := 90.0
const LUNGE_SPEED := 9.0
const LUNGE_SEC := 0.18

enum AI { IDLE, CHASE, WINDUP, LUNGE, RECOVER, RETURN, DEAD }

var kind := "wolf"
var def: Dictionary = {}
var home := Vector3.ZERO
var hp := 1.0
var max_hp := 1.0
var aura := ""
var aura_t := 0.0
var ai := AI.IDLE

var _t := 0.0
var _wander_target := Vector3.ZERO
var _knock := Vector3.ZERO
var _dots: Array = [] # [{left, every, t, amount}]
var _visual: Node3D = null
var _visual_scale := 1.0
var _bar_fill: MeshInstance3D = null
var _aura_dot: MeshInstance3D = null
var _tell_label: Label3D = null
var _anim: AnimationPlayer = null
var _rng := RandomNumberGenerator.new()

func setup(kind_id: String, home_pos: Vector3, seed_value: int) -> void:
	kind = kind_id
	def = KINDS[kind]
	home = home_pos
	_rng.seed = seed_value
	max_hp = def.hp
	hp = max_hp

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
	_tick_status(delta)
	if ai == AI.DEAD:
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
		fc.call("take_damage", def.atk, self)

func _pick_wander() -> void:
	var a := _rng.randf() * TAU
	var r := _rng.randf() * WANDER_RADIUS
	_wander_target = home + Vector3(cos(a) * r, 0, sin(a) * r)
	_t = 2.0 + _rng.randf() * 3.0

# ---------------------------------------------------------------- 피해·상태

## field_combat.gd 가 부른다. 실제 깎인 양을 돌려준다.
func apply_damage(amount: float, crit: bool, from_dir: Vector3 = Vector3.ZERO) -> float:
	if ai == AI.DEAD:
		return 0.0
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

func knockback(dir: Vector3, force: float) -> void:
	_knock = Vector3(dir.x, 0, dir.z).normalized() * force

func set_aura(element: String) -> void:
	aura = element
	aura_t = Elements.AURA_SEC if element != "" else 0.0
	_refresh_aura()

func add_dot(ticks: int, every: float, amount: float) -> void:
	_dots.append({"left": ticks, "every": every, "t": every, "amount": amount})

func is_dead() -> bool:
	return ai == AI.DEAD

func _tick_status(delta: float) -> void:
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
	_dots.clear()
	visible = false
	collision_layer = 0
	PartyState.add_exp(def.exp)
	died.emit(self)

func _revive() -> void:
	global_position = home
	hp = max_hp
	visible = true
	collision_layer = 1
	ai = AI.IDLE
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
	else:
		v = CreatureBuilder.build("beast", [Color(0.42, 0.4, 0.38), Color(0.62, 0.6, 0.56), Color(0.95, 0.8, 0.25)])
		v.scale = Vector3.ONE * 0.9
	_visual_scale = v.scale.x
	return v

## 머리 위: 이름표 · 체력 막대 · 붙은 원소 점 · 공격 예고 "!".
func _build_overhead() -> void:
	var top := 2.15 if kind == "bandit" else 1.45
	var label := Label3D.new()
	label.text = def.name
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

func _refresh_aura() -> void:
	if _aura_dot == null:
		return
	_aura_dot.visible = aura != ""
	if aura != "":
		var mat := StandardMaterial3D.new()
		mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		mat.albedo_color = Elements.color_of(aura)
		mat.no_depth_test = true
		_aura_dot.material_override = mat
