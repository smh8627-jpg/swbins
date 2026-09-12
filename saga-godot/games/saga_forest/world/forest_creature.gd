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
## 아니라서, 새 창작 몬스터로 짓는다 — 전부 실존 인물·원작사 캐릭터가 아닌
## 한국 설화의 일반명사("황건적"처럼 부류를 가리키는 이름) 계열이다.
##
## 종 셋(forest_creature_builder.gd CREATURES 참고, `kind`로 갈린다):
## - "dokkaebi"(숲도깨비, 어둑숲) — 구 몸통+원뿔 뿔, 짙은 보라.
## - "bawi"(바위도깨비, 바위 지대, 2026-09-12 추가) — 상자 몸통+상자 혹 둘,
##   돌빛 회갈색. 몸집이 크고 느린 대신(speed·flee_speed가 낮다) 잘 안
##   달아난다는 인상을 주려고 flee_radius도 좁게 잡았다(builder 쪽 수치).
## - "beoseot"(버섯정령, 버섯숲, 2026-09-12 추가) — 원기둥 대+구 갓, 청록빛.
##   웹판 mushnub(포자괴물)가 원래 살던 바이옴(버섯숲)을 이걸로 마저
##   채웠지만 이름·색·행동은 그대로 안 옮겼다(위 "재해석" 원칙 그대로) —
##   forest_biome_scatter.gd의 장식용 버섯(줄기+갓, 살구색 갓)과 갓 색을
##   달리해 "장식이 아니라 살아 움직이는 것"이 한눈에 갈리게 했다. 셋 중
##   가장 재빠르고(speed·flee_speed가 가장 높다) 대신 아주 가까이 가야만
##   놀란다(flee_radius가 가장 좁다) — 붙임성 있는 인상.
## - "kkot"(꽃정령, 꽃밭, 2026-09-12 추가) — 구 몸통+토러스(고리) 꽃관, 분홍.
##   네 바이옴 중 마지막으로 비워 뒀던 꽃밭을 채운다. 꽃밭이 이 마을에서
##   가장 밝고 트인 곳이라는 인상에 맞춰 넷 중 가장 넓게 돌아다니게
##   (wander_m 최댓값) 잡았다 — 앞선 셋(어둡거나 좁은 바이옴)과는 다른
##   축으로 갈랐다.
##
## 시각은 전부 primitive — 이 판의 몬스터 전용 GLB가 없다(버섯·가구가 이미
## 쓴 예외와 같은 이유). WorldCurveMaterial을 쓴다 — 이동하는 오브젝트도
## 구면 투영 대상이다(villager_builder.gd와 같은 결).

const WorldCurveMaterial := preload("res://saga_core/world/world_curve_material.gd")

enum State { IDLE, WANDER, FLEE }

const CURVE_AMOUNT := 0.004
const COLOR_DOKKAEBI := Color(0.22, 0.12, 0.28)  # 신규 창작색 — 어둑숲 톤에 맞춘 짙은 보라
const COLOR_BAWI := Color(0.42, 0.38, 0.33)      # 신규 창작색 — 바위 지대 톤에 맞춘 돌빛 회갈색
const COLOR_BEOSEOT_STEM := Color(0.88, 0.85, 0.74)  # forest_biome_scatter.gd 장식 버섯 줄기와 같은 톤
const COLOR_BEOSEOT_CAP := Color(0.22, 0.55, 0.5)    # 장식 버섯(살구색 갓)과 갈리는 청록빛 신규 창작색
const COLOR_KKOT_BODY := Color(0.95, 0.93, 0.85)     # 신규 창작색 — 꽃받침을 연상시키는 아이보리
const COLOR_KKOT_CROWN := Color(0.86, 0.42, 0.55)    # 신규 창작색 — 꽃밭 톤에 맞춘 분홍
const IDLE_TIME_MIN := 1.5
const IDLE_TIME_MAX := 3.5
const FLEE_TIME := 2.5
const ARRIVE_DIST := 0.3

var den: Vector3
var wander_radius: float
var flee_radius: float
var speed: float
var flee_speed: float

var _kind := "dokkaebi"
var _state: State = State.IDLE
var _timer := 0.0
var _target: Vector3
var _player: Node3D
var _rng := RandomNumberGenerator.new()


## 웹판 ANIMALS 항목 하나를 그대로 옮기는 자리 — 씨앗은 den 좌표로 고정해
## 매번 같은 진단 결과가 나오게 한다(루트 CLAUDE.md 검증 습관 "세 번 돌려
## 출력이 같은지"). kind는 위 주석의 종 키("dokkaebi"·"bawi") — 안 주면
## 첫 종(숲도깨비) 그대로.
func setup(p_den: Vector3, p_wander: float, p_flee: float, p_speed: float,
		p_flee_speed: float, seed_salt: int, kind: String = "dokkaebi") -> void:
	den = p_den
	wander_radius = p_wander
	flee_radius = p_flee
	speed = p_speed
	flee_speed = p_flee_speed
	_rng.seed = seed_salt
	_kind = kind
	global_position = den


func _ready() -> void:
	_player = get_tree().get_first_node_in_group("player")
	_spawn_visual()
	_enter_idle()


func _spawn_visual() -> void:
	match _kind:
		"bawi":
			_spawn_visual_bawi()
		"beoseot":
			_spawn_visual_beoseot()
		"kkot":
			_spawn_visual_kkot()
		_:
			_spawn_visual_dokkaebi()


func _spawn_visual_dokkaebi() -> void:
	var mat: ShaderMaterial = WorldCurveMaterial.vertex_color_material(CURVE_AMOUNT, 0.85, COLOR_DOKKAEBI)

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


## 바위도깨비 — 몸집이 다부지다는 인상을 상자 셋(몸통+혹 둘)으로 준다.
func _spawn_visual_bawi() -> void:
	var mat: ShaderMaterial = WorldCurveMaterial.vertex_color_material(CURVE_AMOUNT, 0.95, COLOR_BAWI)

	var body := MeshInstance3D.new()
	var body_mesh := BoxMesh.new()
	body_mesh.size = Vector3(0.56, 0.5, 0.46)
	body.mesh = body_mesh
	body.position = Vector3(0, 0.3, 0)
	body.material_override = mat
	add_child(body)

	var bump_l := MeshInstance3D.new()
	var bump_mesh := BoxMesh.new()
	bump_mesh.size = Vector3(0.16, 0.16, 0.16)
	bump_l.mesh = bump_mesh
	bump_l.position = Vector3(-0.15, 0.62, 0)
	bump_l.rotation.y = 0.5
	bump_l.material_override = mat
	add_child(bump_l)

	var bump_r: MeshInstance3D = bump_l.duplicate()
	bump_r.position = Vector3(0.15, 0.62, 0)
	bump_r.rotation.y = -0.5
	add_child(bump_r)

	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(0.56, 0.5, 0.46)
	cs.position = Vector3(0, 0.3, 0)
	cs.shape = shape
	add_child(cs)


## 버섯정령 — forest_biome_scatter.gd `_spawn_mushroom()`과 같은 2부(줄기+갓)
## 구성이되 갓 색만 달리해(청록 vs 장식의 살구색) "이건 움직인다"가
## 갈린다. 크기도 장식보다 한결 크게(갓 반지름 0.16→0.22) 해서 눈에 띈다.
func _spawn_visual_beoseot() -> void:
	var stem_mat: ShaderMaterial = WorldCurveMaterial.vertex_color_material(
		CURVE_AMOUNT, 0.9, COLOR_BEOSEOT_STEM)
	var cap_mat: ShaderMaterial = WorldCurveMaterial.vertex_color_material(
		CURVE_AMOUNT, 0.6, COLOR_BEOSEOT_CAP)

	var stem := MeshInstance3D.new()
	var stem_mesh := CylinderMesh.new()
	stem_mesh.top_radius = 0.07
	stem_mesh.bottom_radius = 0.08
	stem_mesh.height = 0.3
	stem.mesh = stem_mesh
	stem.position = Vector3(0, 0.15, 0)
	stem.material_override = stem_mat
	add_child(stem)

	var cap := MeshInstance3D.new()
	var cap_mesh := SphereMesh.new()
	cap_mesh.radius = 0.22
	cap_mesh.height = 0.22
	cap.mesh = cap_mesh
	cap.position = Vector3(0, 0.33, 0)
	cap.material_override = cap_mat
	add_child(cap)

	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = 0.22
	cs.position = Vector3(0, 0.24, 0)
	cs.shape = shape
	add_child(cs)


## 꽃정령 — 구 몸통 위에 토러스(고리) 하나를 꽃관처럼 얹는다. 앞선 셋
## (구+원뿔·상자+상자·원기둥+구)과 겹치지 않는 새 조합.
func _spawn_visual_kkot() -> void:
	var body_mat: ShaderMaterial = WorldCurveMaterial.vertex_color_material(
		CURVE_AMOUNT, 0.7, COLOR_KKOT_BODY)
	var crown_mat: ShaderMaterial = WorldCurveMaterial.vertex_color_material(
		CURVE_AMOUNT, 0.5, COLOR_KKOT_CROWN)

	var body := MeshInstance3D.new()
	var body_mesh := SphereMesh.new()
	body_mesh.radius = 0.26
	body_mesh.height = 0.48
	body.mesh = body_mesh
	body.position = Vector3(0, 0.26, 0)
	body.material_override = body_mat
	add_child(body)

	var crown := MeshInstance3D.new()
	var crown_mesh := TorusMesh.new()
	crown_mesh.inner_radius = 0.08
	crown_mesh.outer_radius = 0.22
	crown.mesh = crown_mesh
	crown.position = Vector3(0, 0.5, 0)
	crown.material_override = crown_mat
	add_child(crown)

	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = 0.26
	cs.position = Vector3(0, 0.26, 0)
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
