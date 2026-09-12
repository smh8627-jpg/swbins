extends Node3D

## VERTICAL_SLICE.md 27절 — TestMap의 글자 지도를 읽어 색칠한 바닥을 세운다.
## 칸마다 MeshInstance3D를 만들지 않는다 — 종류별 MultiMesh 하나에 자리만
## 채운다(사가의숲 웹판 village-view3d.js의 InstancedMesh 원칙과 같다).

const TestMap := preload("res://games/saga_go/data/test_map.gd")

## height — 사가의숲 웹판 village-view3d.js가 "물은 12cm 낮춘다"고 한 것과
## 같은 원칙. 산은 두드러지고 강은 패어 보이게, 나머지는 거의 평면에 가깝게.
const LEGEND := {
	"^": {"name": "mountain", "color": Color(0.55, 0.53, 0.5), "walkable": false, "height": 2.5},
	"T": {"name": "forest", "color": Color(0.16, 0.32, 0.14), "walkable": true, "height": 0.15},
	"~": {"name": "river", "color": Color(0.3, 0.26, 0.18), "walkable": false, "height": -1.0},
	"=": {"name": "path", "color": Color(0.62, 0.5, 0.32), "walkable": true, "height": 0.05},
	"H": {"name": "village", "color": Color(0.78, 0.68, 0.42), "walkable": true, "height": 0.1},
	"F": {"name": "farmland", "color": Color(0.55, 0.58, 0.22), "walkable": true, "height": 0.05},
	".": {"name": "plains", "color": Color(0.38, 0.55, 0.24), "walkable": true, "height": 0.0},
	"C": {"name": "cave", "color": Color(0.2, 0.2, 0.22), "walkable": true, "height": 0.2},
	"S": {"name": "shrine", "color": Color(0.5, 0.42, 0.3), "walkable": true, "height": 0.2},
	"R": {"name": "ruins", "color": Color(0.45, 0.42, 0.4), "walkable": true, "height": 0.2},
	"B": {"name": "bridge", "color": Color(0.5, 0.36, 0.2), "walkable": true, "height": -1.0},
	"W": {"name": "waterfall", "color": Color(0.3, 0.42, 0.48), "walkable": true, "height": 0.3},
}

const WATER_HEIGHT_ABOVE_BED := 0.55

## 다리 널판이 강바닥 위로 뜨는 높이. landmarks_builder.gd의 다리도
## 이 상수를 그대로 가져다 쓴다 — 두 파일이 각자 값을 정하면 어긋난다.
const BRIDGE_CLEARANCE := 2.0

## 산·강을 막는 벽의 높이(둘 다 walkable=false — 다리로만 강을 건넌다).
const BLOCK_HEIGHT := 6.0

## 칸 하나를 몇 조각으로 쪼개 경계 쪽만 색을 섞을지. 4는 saga-go 웹판
## terrainTexture()의 서브셀 블렌딩(SUB=4)과 같은 값 — 이미 검증된 감으로
## 맞췄다. 칸 중심(거리 0.5)에서 이 값(EDGE_BLEND_MARGIN)만큼 안쪽은 섞지
## 않고 제 색 그대로 두고, 가장자리로 갈수록만 이웃과 번진다.
const SUB := 4
const EDGE_BLEND_MARGIN := 0.34

func _ready() -> void:
	_build()
	_build_water()
	_build_collision()

## 칸마다 딱 잘린 단색 사각형을 따로 그리면 경계가 바둑판처럼 갈라져 보인다
## (2026-09-11, 사용자 실기 확인 지적 — saga-go 웹판이 2026-09-08에 같은
## 문제를 hash2 폴백에서 겪었던 것과 같은 종류). 칸마다 별도 메시를 쓰는 대신
## **한 장의 메시로 합쳐 모서리 쪽 색만 이웃 칸과 섞는다.** 처음엔 칸 전체를
## 네 모서리 사이로 통짜 보간했더니 이 지도의 칸(48m)이 작고 이웃 수가
## 다양해(특히 마을 근처) 칸 중심까지 뭉개져 밋밋한 흙빛 하나로 보였다 —
## 그래서 칸을 SUB개로 더 쪼개(_add_tile_quads), 중심 쪽 EDGE_BLEND_MARGIN
## 안쪽은 제 색 그대로 두고 가장자리 쪽만 이웃과 번지게 고쳤다. 높이는 안
## 섞는다 — 산·강은 여전히 벽처럼 뚝 끊겨야 막힌 지형임이 드러난다(충돌은
## 이미 칸마다 따로라 시각과 무관, `_build_collision()` 참고).
func _build() -> void:
	var rows := TestMap.ROWS
	var half := TestMap.TILE_SIZE * 0.5

	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)

	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			var ch: String = row[x]
			if not LEGEND.has(ch):
				push_warning("terrain_builder: 모르는 지형 글자 '%s'" % ch)
				continue
			var info: Dictionary = LEGEND[ch]
			var center := TestMap.world_pos(x, y) + Vector3(0, info.height, 0)
			var own_color: Color = info.color
			var col00 := _corner_color(rows, x, y)
			var col10 := _corner_color(rows, x + 1, y)
			var col01 := _corner_color(rows, x, y + 1)
			var col11 := _corner_color(rows, x + 1, y + 1)

			_add_tile_quads(st, center, half, own_color, col00, col10, col01, col11)

	var mesh := st.commit()
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.roughness = 0.95
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED  # 감김 방향 계산이 틀려도 안 뚫리게

	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.name = "Ground"
	mi.material_override = mat
	add_child(mi)

## 칸 하나를 SUB×SUB 조각으로 나눠 그린다. (u,v)는 칸 안의 상대 위치
## (0=한쪽 끝, 1=반대쪽 끝) — `_tile_vertex_color()`가 이 값으로 "제 색 그대로"
## vs "이웃과 섞은 색"을 가른다.
func _add_tile_quads(st: SurfaceTool, center: Vector3, half: float, own: Color,
		col00: Color, col10: Color, col01: Color, col11: Color) -> void:
	for j in SUB:
		var v0 := float(j) / SUB
		var v1 := float(j + 1) / SUB
		for i in SUB:
			var u0 := float(i) / SUB
			var u1 := float(i + 1) / SUB

			var p00 := center + Vector3(lerp(-half, half, u0), 0, lerp(-half, half, v0))
			var p10 := center + Vector3(lerp(-half, half, u1), 0, lerp(-half, half, v0))
			var p01 := center + Vector3(lerp(-half, half, u0), 0, lerp(-half, half, v1))
			var p11 := center + Vector3(lerp(-half, half, u1), 0, lerp(-half, half, v1))

			var cc00 := _tile_vertex_color(own, col00, col10, col01, col11, u0, v0)
			var cc10 := _tile_vertex_color(own, col00, col10, col01, col11, u1, v0)
			var cc01 := _tile_vertex_color(own, col00, col10, col01, col11, u0, v1)
			var cc11 := _tile_vertex_color(own, col00, col10, col01, col11, u1, v1)

			# 위(+Y)에서 봤을 때 앞면이 되는 감김 방향 — 00,11,10 / 00,01,11
			# (오른손 좌표계에서 외적이 +Y로 나오는 순서).
			st.set_normal(Vector3.UP)
			st.set_color(cc00); st.add_vertex(p00)
			st.set_color(cc11); st.add_vertex(p11)
			st.set_color(cc10); st.add_vertex(p10)

			st.set_normal(Vector3.UP)
			st.set_color(cc00); st.add_vertex(p00)
			st.set_color(cc01); st.add_vertex(p01)
			st.set_color(cc11); st.add_vertex(p11)

## (u,v) 자리의 실제 정점 색. 네 모서리 사이를 이중선형보간한 "이웃과 섞은
## 색"과 "제 색"을 가장자리까지 남은 거리(d)로 섞는다 — d가
## EDGE_BLEND_MARGIN보다 크면(칸 중심 쪽) 100% 제 색, 0이면(칸 끝) 100%
## 이웃-평균색.
func _tile_vertex_color(own: Color, c00: Color, c10: Color, c01: Color, c11: Color,
		u: float, v: float) -> Color:
	var corner_blend := c00.lerp(c10, u).lerp(c01.lerp(c11, u), v)
	var d: float = min(min(u, 1.0 - u), min(v, 1.0 - v))
	var t: float = clamp((EDGE_BLEND_MARGIN - d) / EDGE_BLEND_MARGIN, 0.0, 1.0)
	return own.lerp(corner_blend, t)

## 격자 교차점(cx, cy)에 맞닿은 칸(최대 4개, 가장자리는 그보다 적음)의 색을
## 평균낸다. 칸 (x,y)의 네 모서리는 교차점 (x,y)·(x+1,y)·(x,y+1)·(x+1,y+1)이다.
func _corner_color(rows: Array, cx: int, cy: int) -> Color:
	var total := Color(0, 0, 0, 0)
	var n := 0
	for dy in [-1, 0]:
		for dx in [-1, 0]:
			var ty: int = cy + dy
			var tx: int = cx + dx
			if ty < 0 or ty >= rows.size():
				continue
			var row: String = rows[ty]
			if tx < 0 or tx >= row.length():
				continue
			var ch: String = row[tx]
			if not LEGEND.has(ch):
				continue
			total += LEGEND[ch].color
			n += 1
	if n == 0:
		return Color(0, 0, 0)
	return total / float(n)

## 강 바닥(river) 타일 위에 반투명 파란 수면을 한 겹 더 얹는다. 다리(B) 밑도
## 강이므로 같이 덮는다 — 다리는 landmarks_builder.gd가 그 위에 널판을 놓는다.
func _build_water() -> void:
	var rows := TestMap.ROWS
	var positions: Array[Vector3] = []
	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			var ch: String = row[x]
			if ch != "~" and ch != "B":
				continue
			var bed_height: float = LEGEND[ch].height
			positions.append(TestMap.world_pos(x, y) + Vector3(0, bed_height + WATER_HEIGHT_ABOVE_BED, 0))

	if positions.is_empty():
		return

	var quad := PlaneMesh.new()
	quad.size = Vector2(TestMap.TILE_SIZE, TestMap.TILE_SIZE)

	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.25, 0.45, 0.62, 0.75)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA

	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = quad
	mm.instance_count = positions.size()

	var mmi := MultiMeshInstance3D.new()
	mmi.multimesh = mm
	mmi.name = "WaterSurface"
	mmi.material_override = mat
	add_child(mmi)

	for i in positions.size():
		mm.set_instance_transform(i, Transform3D(Basis(), positions[i]))

## 타일마다 실제 충돌체를 놓는다 — 하나짜리 평평한 바닥 대신, 산·강은 막힌
## 벽으로, 다리는 널판 높이에서, 나머지는 제 타일 높이에서 딛는다.
## (전에는 완전 평면 바닥 하나뿐이라 산이 허공에 뜬 것처럼 보였다.)
func _build_collision() -> void:
	var rows := TestMap.ROWS
	var body := StaticBody3D.new()
	body.name = "TerrainCollision"
	add_child(body)

	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			var ch: String = row[x]
			if not LEGEND.has(ch):
				continue
			var info: Dictionary = LEGEND[ch]
			var pos := TestMap.world_pos(x, y)
			var cs := CollisionShape3D.new()
			var box := BoxShape3D.new()

			if ch == "^" or ch == "~":
				box.size = Vector3(TestMap.TILE_SIZE, BLOCK_HEIGHT, TestMap.TILE_SIZE)
				cs.shape = box
				cs.position = pos + Vector3(0, info.height, 0)
			elif ch == "B":
				var bridge_top: float = info.height + BRIDGE_CLEARANCE
				box.size = Vector3(TestMap.TILE_SIZE, 0.6, TestMap.TILE_SIZE)
				cs.shape = box
				cs.position = pos + Vector3(0, bridge_top, 0)
			else:
				box.size = Vector3(TestMap.TILE_SIZE, 1.0, TestMap.TILE_SIZE)
				cs.shape = box
				cs.position = pos + Vector3(0, info.height - 0.5, 0)

			body.add_child(cs)
