extends CharacterBody3D

## VERTICAL_SLICE_FOREST.md 4절 "제외" 목록 마지막 항목("몬스터·퓨전
## 콘텐츠") 착수 1호 — 5절 "몬스터·퓨전 자유" 결정을 실제로 쓴 첫 콘텐츠다.
##
## 웹판 `data-village.js`의 ANIMALS 상태기계(idle→wander→flee, "새 상태·
## 전투는 안 만들었다" 원문 그대로)를 3D로 옮긴다 — 전투·포획·HP는 이번에도
## 안 만든다(몬스터라도 이 판의 정체성은 "돌아다니면 재미있다"이지 전투가
## 아니다, LEGACY_FEATURE_AUDIT.md 핵심 루프 문장 그대로).
##
## **재해석** — 웹판 mushnub(포자괴물)를 그대로 옮기지 않았다. 5절 결정 자체가
## "몬스터·다른 시대 요소를 넣어도 된다"는 자유이지 "포자괴물을 옮겨라"가
## 아니라서, 새 창작 몬스터(숲도깨비 — 실존 인물·원작사 캐릭터가 아닌 한국
## 설화의 일반명사, "황건적"처럼 부류를 가리키는 이름)로 짓고 서식 바이옴도
## 어둑숲(dark)으로 새로 골랐다(원작은 버섯숲 한정).
##
## 시각은 primitive 둘(구 몸통+원뿔 뿔) — 이 판의 몬스터 전용 GLB가 없다
## (버섯·가구가 이미 쓴 예외와 같은 이유). WorldCurveMaterial을 쓴다 —
## 이동하는 오브젝트도 구면 투영 대상이다(villager_builder.gd와 같은 결).

const WorldCurveMaterial := preload("res://saga_core/world/world_curve_material.gd")

enum State { IDLE, WANDER, FLEE }

const CURVE_AMOUNT := 0.004
const COLOR := Color(0.22, 0.12, 0.28)  # 신규 창작색 — 어둑숲 톤에 맞춘 짙은 보라
const IDLE_TIME_MIN := 1.5
const IDLE_TIME_MAX := 3.5
const FLEE_TIME := 2.5
const ARRIVE_DIST := 0.3

var den: Vector3
var wander_radius: float
var flee_radius: float
var speed: float
var flee_speed: float

var _state: State = State.IDLE
var _timer := 0.0
var _target: Vector3
var _player: Node3D
var _rng := RandomNumberGenerator.new()


## 웹판 ANIMALS 항목 하나를 그대로 옮기는 자리 — 씨앗은 den 좌표로 고정해
## 매번 같은 진단 결과가 나오게 한다(루트 CLAUDE.md 검증 습관 "세 번 돌려
## 출력이 같은지").
func setup(p_den: Vector3, p_wander: float, p_flee: float, p_speed: float,
		p_flee_speed: float, seed_salt: int) -> void:
	den = p_den
	wander_radius = p_wander
	flee_radius = p_flee
	speed = p_speed
	flee_speed = p_flee_speed
	_rng.seed = seed_salt
	global_position = den


func _ready() -> void:
	_player = get_tree().get_first_node_in_group("player")
	_spawn_visual()
	_enter_idle()


func _spawn_visual() -> void:
	var mat: ShaderMaterial = WorldCurveMaterial.vertex_color_material(CURVE_AMOUNT, 0.85, COLOR)

	var body := MeshInstance3D.new()
	var body_mesh := SphereMesh.new()
	body_mesh.radius = 0.32
	body_mesh.height = 0.58
	body.mesh = body_mesh
	body.position = Vector3(0, 0.32, 0)
	body.material_override = mat
	add_child(body)

	var horn := MeshInstance3D.new()
	var horn_mesh := CylinderMesh.new()
	horn_mesh.top_radius = 0.0
	horn_mesh.bottom_radius = 0.09
	horn_mesh.height = 0.3
	horn.mesh = horn_mesh
	horn.position = Vector3(0, 0.68, 0)
	horn.material_override = mat
	add_child(horn)

	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = 0.32
	cs.position = Vector3(0, 0.32, 0)
	cs.shape = shape
	add_child(cs)


func _physics_process(delta: float) -> void:
	if _player == null or not is_instance_valid(_player):
		_player = get_tree().get_first_node_in_group("player")

	if _state != State.FLEE and _player != null and \
			global_position.distance_to(_player.global_position) <= flee_radius:
		_enter_flee()

	match _state:
		State.IDLE:
			_timer -= delta
			velocity = Vector3.ZERO
			if _timer <= 0.0:
				_enter_wander()
		State.WANDER:
			_step_toward(_target, speed)
			if global_position.distance_to(_target) <= ARRIVE_DIST:
				_enter_idle()
		State.FLEE:
			_timer -= delta
			if _player != null:
				var away: Vector3 = global_position - _player.global_position
				away.y = 0
				if away.length() > 0.01:
					_target = global_position + away.normalized() * 3.0
			_step_toward(_target, flee_speed)
			if _timer <= 0.0:
				_enter_idle()

	move_and_slide()


func _step_toward(target: Vector3, spd: float) -> void:
	var to_target: Vector3 = target - global_position
	to_target.y = 0
	if to_target.length() <= ARRIVE_DIST:
		velocity = Vector3.ZERO
		return
	velocity = to_target.normalized() * spd
	look_at(global_position + Vector3(velocity.x, 0, velocity.z), Vector3.UP)


func _enter_idle() -> void:
	_state = State.IDLE
	_timer = _rng.randf_range(IDLE_TIME_MIN, IDLE_TIME_MAX)


func _enter_wander() -> void:
	_state = State.WANDER
	var angle := _rng.randf_range(0.0, TAU)
	var dist := _rng.randf_range(wander_radius * 0.3, wander_radius)
	_target = den + Vector3(cos(angle), 0.0, sin(angle)) * dist


func _enter_flee() -> void:
	_state = State.FLEE
	_timer = FLEE_TIME
