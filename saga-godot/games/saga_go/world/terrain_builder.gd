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
}

const WATER_HEIGHT_ABOVE_BED := 0.55

func _ready() -> void:
	_build()
	_build_water()

func _build() -> void:
	var rows := TestMap.ROWS
	var counts := {}
	for row in rows:
		for i in row.length():
			var ch: String = row[i]
			counts[ch] = counts.get(ch, 0) + 1

	var quad := PlaneMesh.new()
	quad.size = Vector2(TestMap.TILE_SIZE, TestMap.TILE_SIZE)

	var slots := {}
	for ch in counts.keys():
		if not LEGEND.has(ch):
			push_warning("terrain_builder: 모르는 지형 글자 '%s'" % ch)
			continue
		var info: Dictionary = LEGEND[ch]
		var mat := StandardMaterial3D.new()
		mat.albedo_color = info.color
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = quad
		mm.instance_count = counts[ch]
		var mmi := MultiMeshInstance3D.new()
		mmi.multimesh = mm
		mmi.name = "Tiles_" + info.name
		mmi.material_override = mat
		add_child(mmi)
		slots[ch] = {"mmi": mmi, "index": 0}

	for y in rows.size():
		var row: String = rows[y]
		for x in row.length():
			var ch: String = row[x]
			if not slots.has(ch):
				continue
			var slot: Dictionary = slots[ch]
			var mmi: MultiMeshInstance3D = slot.mmi
			var info: Dictionary = LEGEND[ch]
			var pos := TestMap.world_pos(x, y) + Vector3(0, info.height, 0)
			var xform := Transform3D(Basis(), pos)
			mmi.multimesh.set_instance_transform(slot.index, xform)
			slot.index += 1

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
