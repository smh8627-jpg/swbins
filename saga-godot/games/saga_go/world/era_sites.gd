extends Node3D

## PLAN 106장 ㊼ 이야기 3부 — "별배 날개 조각 셋이 여러 시대에 흩어졌다"(12장 끝 실마리)의 세 자리.
## 탐사 파견(data/dispatch.gd)이 이미 이름만 쓰던 자리를 실제 명소로 세운다:
##   ㊼-1 갯바람 포구 동쪽 물가 "녹슨 조선소"(현대) — 13장. 바다로 내려가는 선대·짓다 만 배 뼈대·올라갈 수 있는 문형 기중기.
##   (㊼-2 잿빛 폐허 "시간 틈 관측소"(미래) · ㊼-3 청하 마을 "옛 역참 길"(과거)은 다음 장에서 여기에 더한다.)
## 모양은 코드로 그린 상자·원기둥(고원 명소 region4_frost.gd 와 같은 결). 기중기 다리 바깥면은 들보 끝면과 같은 면이라
## 다리를 타고 오르면 그대로 들보 위로 넘어선다(벽 타기 — 정적 몸체 옆면).

const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")

const DISCOVER_R := 30.0
## 조선소 칸(바다 칸 (7,3) 남쪽 물가 — 북쪽 = 바다). 둘레 1칸 안의 가장 가까운 것: 조개 무리 (6.8,4.1) 29m · 쇠부리 터 비경 (7.3,4.6) 36m.
const SHIPYARD_CELL := Vector2(7.3, 3.85)
## 기중기 들보 윗면 높이(m, 땅에서) — 이야기 13장 climb 단계 above = 이 값 + CLIMB_SLACK - 0.5(들보 위에 올라서야 넘어간다).
const CRANE_TOP := 12.6
const CRANE_HALF := 7.0 # 들보 반 길이 — 다리 바깥면이 여기

const RUST := Color(0.52, 0.3, 0.18)
const RUST_DARK := Color(0.34, 0.2, 0.13)
const CONCRETE := Color(0.62, 0.62, 0.6)
const CRANE_PAINT := Color(0.82, 0.62, 0.18)
const HULL_GRAY := Color(0.45, 0.47, 0.5)

func _ready() -> void:
	add_to_group("go_era_sites")
	_build_shipyard()

static func cell_pos(region: String, c: Vector2) -> Vector3:
	var p := TestMap.world_pos(c.x, c.y, region)
	p.y = TerrainBuilder.height_at(region, p)
	return p

## 기중기 들보 윗면 한가운데(월드).
static func crane_top() -> Vector3:
	return cell_pos("coast", SHIPYARD_CELL) + Vector3(0, CRANE_TOP, -2.0)

func _build_shipyard() -> void:
	var root := Node3D.new()
	root.name = "Shipyard"
	add_child(root)
	root.position = cell_pos("coast", SHIPYARD_CELL)
	## 콘크리트 바닥 — 물가까지(북쪽 -z 가 바다).
	_solid_box(root, Vector3(18.0, 0.3, 14.0), Vector3(0, 0.15, 3.0), CONCRETE)
	## 선대 — 바닥 끝에서 바다로 내려가는 비탈(두 줄 레일).
	var slip := Node3D.new()
	slip.position = Vector3(0, -0.9, -14.0)
	slip.rotation.x = deg_to_rad(-9.0)
	root.add_child(slip)
	_box(slip, Vector3(8.0, 0.3, 18.0), Vector3.ZERO, CONCRETE.darkened(0.15))
	for x in [-2.2, 2.2]:
		_box(slip, Vector3(0.25, 0.25, 18.0), Vector3(x, 0.25, 0), RUST_DARK)
	## 짓다 만 배 — 용골 하나와 녹슨 늑골 여섯(선대 위, 뱃머리가 바다 쪽).
	_box(root, Vector3(0.5, 0.5, 11.0), Vector3(0, 0.55, -1.0), RUST_DARK)
	for k in 6:
		var z := -5.5 + k * 2.0
		var half_w := 2.6 - absf(k - 2.5) * 0.35
		for side in [-1.0, 1.0]:
			var rib := _box(root, Vector3(0.22, 3.2, 0.22), Vector3(side * half_w * 0.72, 2.0, z), RUST)
			rib.rotation.z = side * deg_to_rad(-22.0)
	_box(root, Vector3(4.6, 0.25, 3.0), Vector3(0, 3.4, 2.2), HULL_GRAY) # 반쯤 붙인 갑판 한 장
	## 문형 기중기 — 다리 둘(바깥면 = 들보 끝면, 타고 오른다)·들보·운전실·걸린 갈고리.
	for side in [-1.0, 1.0]:
		var leg_x: float = side * (CRANE_HALF - 0.6)
		_solid_box(root, Vector3(1.2, CRANE_TOP - 1.0, 1.2), Vector3(leg_x, (CRANE_TOP - 1.0) * 0.5, -2.0), CRANE_PAINT)
		for y in [3.0, 6.0, 9.0]:
			_box(root, Vector3(1.3, 0.12, 1.3), Vector3(leg_x, y, -2.0), RUST) # 녹슨 띠
	_solid_box(root, Vector3(CRANE_HALF * 2.0, 1.0, 1.6), Vector3(0, CRANE_TOP - 0.5, -2.0), CRANE_PAINT)
	_solid_box(root, Vector3(2.0, 1.6, 1.8), Vector3(3.2, CRANE_TOP - 1.8, -2.0), Color(0.72, 0.74, 0.7))
	_box(root, Vector3(0.06, 5.0, 0.06), Vector3(-1.5, CRANE_TOP - 3.5, -2.0), Color(0.2, 0.2, 0.22)) # 쇠줄
	_box(root, Vector3(0.6, 0.5, 0.3), Vector3(-1.5, CRANE_TOP - 6.2, -2.0), RUST_DARK) # 갈고리
	## 창고 — 골함석 지붕(남동쪽).
	_solid_box(root, Vector3(6.0, 3.4, 5.0), Vector3(7.5, 1.7, 9.0), Color(0.58, 0.5, 0.42))
	var roof := _box(root, Vector3(6.6, 0.2, 5.6), Vector3(7.5, 3.6, 9.0), RUST)
	roof.rotation.z = deg_to_rad(6.0)
	## 드럼통·쇠판 더미.
	for i in 3:
		var drum := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 0.4
		cm.bottom_radius = 0.4
		cm.height = 0.9
		drum.mesh = cm
		drum.material_override = _mat([RUST, Color(0.25, 0.4, 0.55), RUST_DARK][i])
		drum.position = Vector3(-7.0 + i * 0.9, 0.75, 8.5)
		root.add_child(drum)
	_box(root, Vector3(2.4, 0.6, 1.6), Vector3(-6.5, 0.6, 5.5), HULL_GRAY)
	_label(root, "녹슨 조선소", Vector3(0, CRANE_TOP + 2.2, -2.0), Color(1.0, 0.86, 0.6))
	_add_discovery("coast_shipyard", root.position, DISCOVER_R)

# ---------------------------------------------------------------- 도우미(region4_frost.gd 와 같은 결)

func _mat(c: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	return m

func _box(parent: Node3D, size: Vector3, pos: Vector3, color: Color) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = _mat(color)
	mi.position = pos
	parent.add_child(mi)
	return mi

func _solid_box(parent: Node3D, size: Vector3, pos: Vector3, color: Color) -> void:
	_box(parent, size, pos, color)
	var body := StaticBody3D.new()
	body.position = pos
	var cs := CollisionShape3D.new()
	var bs := BoxShape3D.new()
	bs.size = size
	cs.shape = bs
	body.add_child(cs)
	parent.add_child(body)

func _label(parent: Node3D, text: String, pos: Vector3, color: Color) -> void:
	var l := Label3D.new()
	l.text = text
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.font_size = 44
	l.outline_size = 8
	l.pixel_size = 0.008
	l.modulate = color
	l.position = pos
	parent.add_child(l)

func _add_discovery(codex_id: String, pos: Vector3, radius: float) -> void:
	var area := Area3D.new()
	area.name = "Discover_" + codex_id
	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = radius
	cs.shape = shape
	area.add_child(cs)
	area.position = pos
	area.add_to_group("codex_discoverable")
	add_child(area)
	area.body_entered.connect(func(body: Node3D) -> void:
		if body.is_in_group("player"):
			CodexState.discover("place", codex_id))
