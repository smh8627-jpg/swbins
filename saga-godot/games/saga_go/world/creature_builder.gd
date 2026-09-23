extends RefCounted

## PLAN 106장 ④ — 캡슐·상자 자리표시자였던 짐승·신수를 둥근 도형 조립 + 셀 셰이딩
## + 외곽선으로 다시 그린다. 짐승 GLB 가 저장소에 없어서(CC0 짐승 팩 미확보) 코드가
## 그린다 — 루트 CLAUDE.md "그림은 코드가 그린다"와 같은 결. 원작 신수 디자인을
## 베끼지 않고 전설 동물의 일반 모양(세 발 까마귀·아홉 꼬리 여우·거북+뱀 등)만 쓴다.
##
##   build(kind, colors) → Node3D (앞 = +Z, 발밑 = y 0)
##   kind: beast · fox9 · bear · horse · bird · crow3 · serpent · turtle · goblin
## 몸은 cel_toon.gdshader(albedo_texture 없이 albedo_tint 색만) + cel_outline next_pass.
## 숨쉬기·떠다니기 같은 가벼운 움직임은 루프 트윈 하나로.

const CEL_SHADER := preload("res://saga_core/shaders/cel_toon.gdshader")
const OUTLINE_SHADER := preload("res://saga_core/shaders/cel_outline.gdshader")

## 신수 id → [모양, 몸색, 둘째색, 셋째색]
const PET_LOOKS := {
	"pt_samjogo": ["crow3", Color(0.12, 0.11, 0.14), Color(0.95, 0.75, 0.25), Color(0.9, 0.2, 0.15)],
	"pt_haetae": ["beast", Color(0.78, 0.84, 0.8), Color(0.25, 0.6, 0.55), Color(0.95, 0.8, 0.3)],
	"pt_cheongryong": ["serpent", Color(0.2, 0.55, 0.6), Color(0.85, 0.9, 0.6), Color(0.95, 0.85, 0.4)],
	"pt_baekho": ["beast", Color(0.95, 0.95, 0.92), Color(0.15, 0.15, 0.18), Color(0.4, 0.75, 0.95)],
	"pt_jujak": ["bird", Color(0.9, 0.25, 0.15), Color(1.0, 0.7, 0.2), Color(1.0, 0.95, 0.6)],
	"pt_hyeonmu": ["turtle", Color(0.2, 0.25, 0.28), Color(0.3, 0.45, 0.35), Color(0.55, 0.7, 0.6)],
	"pt_gumiho": ["fox9", Color(0.98, 0.9, 0.72), Color(1.0, 1.0, 1.0), Color(0.95, 0.45, 0.3)],
	"pt_dokkaebi": ["goblin", Color(0.85, 0.3, 0.25), Color(0.25, 0.35, 0.7), Color(0.95, 0.85, 0.5)],
	"pt_bulgasari": ["bear", Color(0.45, 0.48, 0.52), Color(0.25, 0.26, 0.3), Color(0.9, 0.55, 0.2)],
	"pt_jeoktoma": ["horse", Color(0.7, 0.18, 0.12), Color(1.0, 0.55, 0.15), Color(0.2, 0.12, 0.1)],
	"pt_jeolyeong": ["horse", Color(0.85, 0.88, 0.95), Color(0.45, 0.7, 1.0), Color(0.3, 0.32, 0.4)],
}

static func build_pet(pet_id: String, height_m: float) -> Node3D:
	var look: Array = PET_LOOKS.get(pet_id, ["beast", Color(0.8, 0.7, 0.5), Color(0.5, 0.4, 0.3), Color(0.9, 0.8, 0.4)])
	var root := build(look[0], [look[1], look[2], look[3]])
	_fit(root, look[0], height_m)
	return root

static func build(kind: String, colors: Array) -> Node3D:
	var root := Node3D.new()
	root.name = "Creature"
	var body := Node3D.new()
	body.name = "Body"
	root.add_child(body)
	var c0: Color = colors[0]
	var c1: Color = colors[1]
	var c2: Color = colors[2]
	match kind:
		"beast", "bear", "fox9", "horse":
			_quadruped(body, kind, c0, c1, c2)
		"bird", "crow3":
			_bird(body, kind, c0, c1, c2)
		"serpent":
			_serpent(body, c0, c1, c2)
		"turtle":
			_turtle(body, c0, c1, c2)
		"goblin":
			_goblin(body, c0, c1, c2)
		_:
			_quadruped(body, "beast", c0, c1, c2)
	_idle_motion(body, kind)
	return root

## 기준 키 대비 배율(모양마다 원래 높이가 달라 목표 키에 맞춘다).
static func _fit(root: Node3D, kind: String, height_m: float) -> void:
	var natural := {"beast": 1.25, "bear": 1.35, "fox9": 1.1, "horse": 1.9, "bird": 1.2,
		"crow3": 1.1, "serpent": 1.6, "turtle": 1.0, "goblin": 1.8}
	root.scale = Vector3.ONE * (height_m / float(natural.get(kind, 1.3)))

# ---------------------------------------------------------------- 모양

static func _quadruped(p: Node3D, kind: String, fur: Color, accent: Color, eye: Color) -> void:
	var horse := kind == "horse"
	var bear := kind == "bear"
	var leg_h := 0.95 if horse else (0.5 if bear else 0.55)
	var torso_len := 1.35 if horse else (1.1 if bear else 1.0)
	var torso_r := 0.34 if horse else (0.42 if bear else 0.3)
	var y := leg_h + torso_r * 0.6
	_capsule(p, torso_r, torso_len, Vector3(0, y, 0), Vector3(90, 0, 0), fur)
	_sphere(p, torso_r * 1.05, Vector3(0, y + 0.04, torso_len * 0.32), fur)
	# 목·머리
	var head_y := y + (0.62 if horse else 0.32)
	var head_z := torso_len * 0.5 + (0.28 if horse else 0.12)
	if horse:
		_capsule(p, 0.16, 0.8, Vector3(0, y + 0.35, torso_len * 0.45), Vector3(-35, 0, 0), fur)
	var head_r := 0.2 if horse else (0.3 if bear else 0.24)
	_sphere(p, head_r, Vector3(0, head_y, head_z), fur)
	_capsule(p, head_r * 0.55, head_r * 1.9, Vector3(0, head_y - head_r * 0.3, head_z + head_r * 0.9), Vector3(90, 0, 0), accent if not horse else fur.darkened(0.15))
	# 눈
	for sx in [-1.0, 1.0]:
		_sphere(p, head_r * 0.16, Vector3(sx * head_r * 0.5, head_y + head_r * 0.25, head_z + head_r * 0.75), eye, false)
	# 귀
	var ear_h := 0.18 if bear else 0.26
	for sx in [-1.0, 1.0]:
		if bear:
			_sphere(p, 0.09, Vector3(sx * head_r * 0.7, head_y + head_r * 0.85, head_z - 0.05), fur)
		else:
			_cone(p, 0.08, ear_h, Vector3(sx * head_r * 0.55, head_y + head_r * 0.95, head_z - 0.04), Vector3(0, 0, sx * -12), fur)
	# 다리
	var lx := torso_r * 0.65
	for lz in [torso_len * 0.36, -torso_len * 0.36]:
		for sx in [-1.0, 1.0]:
			_capsule(p, 0.1 if not bear else 0.15, leg_h + 0.12, Vector3(sx * lx, leg_h * 0.5, lz), Vector3.ZERO, fur.darkened(0.08))
			_sphere(p, 0.11 if not bear else 0.16, Vector3(sx * lx, 0.07, lz + 0.03), accent.darkened(0.3), false)
	# 꼬리·장식
	match kind:
		"fox9":
			for i in 9:
				var a := deg_to_rad(-60.0 + 15.0 * i)
				_capsule(p, 0.1, 0.85, Vector3(sin(a) * 0.35, y + 0.35, -torso_len * 0.55 - 0.2), Vector3(-45, rad_to_deg(a), 0), accent)
		"horse":
			_capsule(p, 0.1, 0.9, Vector3(0, y - 0.05, -torso_len * 0.6), Vector3(30, 0, 0), accent)
			for i in 5: # 갈기
				_sphere(p, 0.11, Vector3(0, y + 0.45 + i * 0.1, torso_len * 0.3 + i * 0.08), accent)
		"bear":
			for i in 5: # 등 쇠가시
				_cone(p, 0.1, 0.3, Vector3(0, y + torso_r * 0.9, -torso_len * 0.35 + i * 0.18), Vector3.ZERO, accent)
		_:
			_capsule(p, 0.07, 0.7, Vector3(0, y + 0.1, -torso_len * 0.6), Vector3(-40, 0, 0), fur)
			# 갈기 고리(해태·백호 모두 목에 두른 털)
			_torus(p, head_r * 0.9, head_r * 1.45, Vector3(0, head_y - 0.05, head_z - 0.12), Vector3(80, 0, 0), accent)

static func _bird(p: Node3D, kind: String, feather: Color, accent: Color, eye: Color) -> void:
	var y := 0.65
	_sphere(p, 0.34, Vector3(0, y, 0), feather, true, Vector3(1.0, 0.9, 1.3))
	_sphere(p, 0.2, Vector3(0, y + 0.36, 0.3), feather)
	_cone(p, 0.07, 0.24, Vector3(0, y + 0.33, 0.55), Vector3(90, 0, 0), accent)
	for sx in [-1.0, 1.0]:
		_sphere(p, 0.035, Vector3(sx * 0.11, y + 0.42, 0.44), eye, false)
		# 날개 — 납작한 캡슐을 비스듬히 편다
		_capsule(p, 0.12, 1.0, Vector3(sx * 0.55, y + 0.15, -0.05), Vector3(0, 0, sx * 70), feather.darkened(0.1), Vector3(1.0, 1.0, 0.35))
	var legs := 3 if kind == "crow3" else 2
	for i in legs:
		var lx := (float(i) - float(legs - 1) * 0.5) * 0.14
		_capsule(p, 0.035, 0.45, Vector3(lx, 0.22, 0.02), Vector3.ZERO, accent)
	var tails := 3 if kind == "crow3" else 5
	for i in tails:
		var a := deg_to_rad(-25.0 + 50.0 * float(i) / float(tails - 1))
		var length := 0.7 if kind == "crow3" else 1.3
		_capsule(p, 0.08, length, Vector3(sin(a) * 0.2, y - 0.05, -0.45 - length * 0.35), Vector3(-70, rad_to_deg(a), 0), accent if i % 2 == 0 else feather, Vector3(1.0, 1.0, 0.4))

static func _serpent(p: Node3D, scale_c: Color, belly: Color, horn: Color) -> void:
	var n := 12
	for i in n:
		var t := float(i) / float(n - 1)
		var r := lerpf(0.26, 0.1, t)
		var pos := Vector3(sin(t * TAU * 1.2) * 0.5, 0.9 + sin(t * TAU) * 0.35, 0.8 - t * 2.4)
		_sphere(p, r, pos, scale_c if i % 3 != 0 else belly)
	var head := Vector3(0, 0.95, 1.05)
	_sphere(p, 0.3, head, scale_c, true, Vector3(1.0, 0.85, 1.25))
	_capsule(p, 0.12, 0.4, head + Vector3(0, -0.06, 0.3), Vector3(90, 0, 0), belly)
	for sx in [-1.0, 1.0]:
		_cone(p, 0.05, 0.4, head + Vector3(sx * 0.14, 0.3, -0.12), Vector3(-30, 0, sx * -20), horn)
		_sphere(p, 0.05, head + Vector3(sx * 0.15, 0.1, 0.2), Color(0.95, 0.9, 0.3), false)
		_capsule(p, 0.02, 0.6, head + Vector3(sx * 0.2, -0.1, 0.35), Vector3(60, sx * 40, 0), horn) # 수염

static func _turtle(p: Node3D, shell: Color, skin: Color, snake: Color) -> void:
	_sphere(p, 0.6, Vector3(0, 0.42, 0), shell, true, Vector3(1.0, 0.6, 1.2))
	_sphere(p, 0.55, Vector3(0, 0.3, 0), skin.darkened(0.2), true, Vector3(1.05, 0.25, 1.25))
	_sphere(p, 0.2, Vector3(0, 0.42, 0.78), skin)
	for sx in [-1.0, 1.0]:
		for lz in [0.45, -0.45]:
			_capsule(p, 0.12, 0.35, Vector3(sx * 0.5, 0.15, lz), Vector3(0, 0, sx * 30), skin)
		_sphere(p, 0.035, Vector3(sx * 0.09, 0.5, 0.94), Color(0.95, 0.85, 0.3), false)
	# 등에 감긴 뱀
	for i in 8:
		var a := TAU * float(i) / 8.0
		_sphere(p, 0.1, Vector3(cos(a) * 0.45, 0.78 + sin(a * 2.0) * 0.05, sin(a) * 0.55), snake)
	_sphere(p, 0.14, Vector3(0.1, 1.0, -0.2), snake)

static func _goblin(p: Node3D, skin: Color, cloth: Color, horn: Color) -> void:
	for sx in [-1.0, 1.0]:
		_capsule(p, 0.12, 0.6, Vector3(sx * 0.16, 0.3, 0), Vector3.ZERO, skin.darkened(0.1))
	_capsule(p, 0.32, 0.8, Vector3(0, 0.85, 0), Vector3.ZERO, cloth)
	_sphere(p, 0.36, Vector3(0, 1.45, 0.02), skin)
	_cone(p, 0.09, 0.32, Vector3(0, 1.85, 0.0), Vector3.ZERO, horn)
	for sx in [-1.0, 1.0]:
		_sphere(p, 0.07, Vector3(sx * 0.13, 1.52, 0.3), Color(1, 1, 0.9), false)
		_capsule(p, 0.09, 0.62, Vector3(sx * 0.42, 0.95, 0.05), Vector3(0, 0, sx * 25), skin)
	# 방망이
	_capsule(p, 0.1, 0.9, Vector3(0.55, 0.9, 0.35), Vector3(60, 0, -20), horn.darkened(0.35))

# ---------------------------------------------------------------- 부품

static func _mat(color: Color, outline: bool) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = CEL_SHADER
	m.set_shader_parameter("albedo_tint", color)
	m.set_shader_parameter("albedo_texture", _white())
	if outline:
		var o := ShaderMaterial.new()
		o.shader = OUTLINE_SHADER
		m.next_pass = o
	return m

static var _white_tex: ImageTexture = null
static func _white() -> ImageTexture:
	if _white_tex == null:
		var img := Image.create(2, 2, false, Image.FORMAT_RGBA8)
		img.fill(Color.WHITE)
		_white_tex = ImageTexture.create_from_image(img)
	return _white_tex

static func _add(p: Node3D, mesh: Mesh, pos: Vector3, rot_deg: Vector3, color: Color, outline: bool, scl: Vector3 = Vector3.ONE) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.position = pos
	mi.rotation_degrees = rot_deg
	mi.scale = scl
	mi.material_override = _mat(color, outline)
	p.add_child(mi)
	return mi

static func _sphere(p: Node3D, r: float, pos: Vector3, color: Color, outline: bool = true, scl: Vector3 = Vector3.ONE) -> MeshInstance3D:
	var m := SphereMesh.new()
	m.radius = r
	m.height = r * 2.0
	m.radial_segments = 16
	m.rings = 8
	return _add(p, m, pos, Vector3.ZERO, color, outline, scl)

static func _capsule(p: Node3D, r: float, h: float, pos: Vector3, rot_deg: Vector3, color: Color, scl: Vector3 = Vector3.ONE) -> MeshInstance3D:
	var m := CapsuleMesh.new()
	m.radius = r
	m.height = maxf(h, r * 2.0)
	m.radial_segments = 12
	m.rings = 4
	return _add(p, m, pos, rot_deg, color, true, scl)

static func _cone(p: Node3D, r: float, h: float, pos: Vector3, rot_deg: Vector3, color: Color) -> MeshInstance3D:
	var m := CylinderMesh.new()
	m.top_radius = 0.0
	m.bottom_radius = r
	m.height = h
	m.radial_segments = 10
	return _add(p, m, pos, rot_deg, color, true)

static func _torus(p: Node3D, inner: float, outer: float, pos: Vector3, rot_deg: Vector3, color: Color) -> MeshInstance3D:
	var m := TorusMesh.new()
	m.inner_radius = inner
	m.outer_radius = outer
	m.rings = 16
	m.ring_segments = 8
	return _add(p, m, pos, rot_deg, color, true)

## 숨쉬기(짐승)·떠다니기(용·새). 트윈 루프라 매 프레임 스크립트가 안 돈다.
## 트리에 들어간 뒤에만 트윈을 만들 수 있어 tree_entered 에 건다.
static func _idle_motion(body: Node3D, kind: String) -> void:
	body.tree_entered.connect(func() -> void: _start_idle(body, kind), CONNECT_ONE_SHOT)

static func _start_idle(body: Node3D, kind: String) -> void:
	var tw := body.create_tween().set_loops()
	tw.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	if kind == "serpent" or kind == "bird" or kind == "crow3":
		tw.tween_property(body, "position:y", 0.18, 1.4)
		tw.tween_property(body, "position:y", 0.0, 1.4)
	else:
		tw.tween_property(body, "scale", Vector3(1.0, 1.03, 1.0), 1.1)
		tw.tween_property(body, "scale", Vector3.ONE, 1.1)
