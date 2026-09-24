extends "res://games/saga_go/combat/field_enemy.gd"

## PLAN 106장 ㉑ — 원신식 주간 보스 "먹구름 이무기"(field_enemy 를 이어받아 패턴만 더한다). 주간 보스 비경(domains.gd)이 원판 가운데에 둔다.
##   패턴 셋을 차례로(재사용 3.5초, 2단계 2.4초):
##     내려찍기 — 보스 둘레 5m 붉은 원 1.2초 예고 → 안에 있으면 공격 ×1.6(원 밖으로 나가거나 대시로 피한다)
##     먹구름 벼락 — 플레이어 발밑과 양옆 3m 에 원 셋(반경 2.5m) 1.0초 예고 → 안이면 ×1.2(한 번만)
##     물기 — 들판 적과 같은 돌진(가까울 때)
##   체력 절반에서 2단계: 뇌 원소 방패(체력 배율 × 600, 불로 ×2.5 — elements.gd 상성) + 패턴이 빨라짐. 방패가 깨지면 2초 비틀거림.
## 이름은 이 판 것.

const BossToast := preload("res://saga_core/ui/toast.gd")

signal phase_changed(phase: int)

const ROTATION := ["slam", "storm", "bite"]
const SKILL_CD := 3.5
const SKILL_CD_P2 := 2.4
const SLAM := {"radius": 5.0, "tell": 1.2, "mul": 1.6}
const STORM := {"radius": 2.5, "tell": 1.0, "mul": 1.2, "side": 3.0}
const PHASE2_SHIELD := 600.0
const PHASE2_AT := 0.5

var phase := 1
var skill := ""
var skill_t := 0.0
var skill_cd := 2.0
var hits_taken := 0 # 점검용 — 패턴에 맞은 번수
var _rot := 0
var _marks: Array = [] # [{pos, radius, node}]

func _physics_process(delta: float) -> void:
	if ai == AI.DEAD:
		_clear_marks()
		super(delta)
		return
	_check_phase()
	if skill != "":
		_tick_status(delta)
		if ai == AI.DEAD:
			_clear_marks()
			return
		velocity = Vector3(0.0, -1.0 if is_on_floor() else velocity.y - GRAVITY * delta, 0.0)
		move_and_slide()
		## 빙결이면 예고가 멈춘다(원신도 얼리면 끊긴다) — 시간만 안 흐르게.
		if frozen_t > 0.0:
			return
		skill_t -= delta
		if skill_t <= 0.0:
			_fire()
		return
	skill_cd -= delta
	if skill_cd <= 0.0 and frozen_t <= 0.0 and (ai == AI.CHASE or ai == AI.RECOVER):
		var player := get_tree().get_first_node_in_group("player") as Node3D
		if _player_can_fight(player):
			begin_skill(ROTATION[_rot % ROTATION.size()], player)
			_rot += 1
			return
	super(delta)

## 패턴 시작(점검이 바로 부를 수 있다). bite 는 들판 적 돌진에 맡긴다.
func begin_skill(which: String, player: Node3D) -> void:
	skill_cd = SKILL_CD if phase == 1 else SKILL_CD_P2
	if which == "bite" or player == null:
		return
	skill = which
	var to_p := player.global_position - global_position
	to_p.y = 0.0
	if to_p.length() > 0.1:
		_face(to_p, 1.0)
	match which:
		"slam":
			skill_t = SLAM.tell
			_mark(global_position, SLAM.radius)
		"storm":
			skill_t = STORM.tell
			var side := to_p.normalized().cross(Vector3.UP) if to_p.length() > 0.1 else Vector3.RIGHT
			for off in [Vector3.ZERO, side * STORM.side, -side * STORM.side]:
				_mark(player.global_position + off, STORM.radius)
	_set_tell(true)

func _fire() -> void:
	_set_tell(false)
	var player := get_tree().get_first_node_in_group("player") as Node3D
	var mul: float = SLAM.mul if skill == "slam" else STORM.mul
	var hit := false
	if player:
		for m in _marks:
			var d: Vector3 = player.global_position - m.pos
			d.y = 0.0
			if d.length() <= float(m.radius):
				hit = true
				break
	if hit:
		var fc := get_tree().get_first_node_in_group("go_field_combat")
		if fc and fc.call("can_be_targeted"):
			fc.call("take_damage", def.atk * mul * dmg_mul, self)
			hits_taken += 1
	var rig := get_tree().get_first_node_in_group("camera_rig")
	if rig and skill == "slam":
		rig.call("shake", 0.18, 0.3)
	_flash_marks()
	skill = ""
	ai = AI.RECOVER
	_t = 0.6

func _check_phase() -> void:
	if phase == 1 and hp <= max_hp * PHASE2_AT:
		phase = 2
		max_shield = PHASE2_SHIELD * (max_hp / float(def.hp))
		shield = max_shield
		skill_cd = minf(skill_cd, 1.0)
		_refresh_bar()
		BossToast.show(self, "먹구름 이무기가 번개를 두른다 — 불로 방패를 깨라", 3.0)
		phase_changed.emit(phase)

# ---------------------------------------------------------------- 예고 원

func _mark(pos: Vector3, radius: float) -> void:
	var mi := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = radius
	cm.bottom_radius = radius
	cm.height = 0.04
	cm.radial_segments = 28
	mi.mesh = cm
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Color(1.0, 0.25, 0.2, 0.35)
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	get_parent().add_child(mi)
	mi.global_position = Vector3(pos.x, global_position.y + 0.05, pos.z)
	_marks.append({"pos": pos, "radius": radius, "node": mi})

func _flash_marks() -> void:
	for m in _marks:
		var mi: MeshInstance3D = m.node
		if not is_instance_valid(mi):
			continue
		(mi.material_override as StandardMaterial3D).albedo_color = Color(0.9, 0.8, 1.0, 0.7)
		var tw := mi.create_tween()
		tw.tween_property(mi, "scale", Vector3(1.15, 1.0, 1.15), 0.2)
		tw.tween_callback(mi.queue_free)
	_marks.clear()

func _clear_marks() -> void:
	for m in _marks:
		if is_instance_valid(m.node):
			(m.node as Node).queue_free()
	_marks.clear()
	skill = ""

func _exit_tree() -> void:
	_clear_marks()
