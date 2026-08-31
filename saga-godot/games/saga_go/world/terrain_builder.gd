extends Node3D

## VERTICAL_SLICE.md 27절 — TestMap의 글자 지도를 읽어 색칠한 바닥을 세운다.
## 칸마다 MeshInstance3D를 만들지 않는다 — 종류별 MultiMesh 하나에 자리만
## 채운다(사가의숲 웹판 village-view3d.js의 InstancedMesh 원칙과 같다).

const TestMap := preload("res://games/saga_go/data/test_map.gd")

const LEGEND := {
	"^": {"name": "mountain", "color": Color(0.55, 0.53, 0.5), "walkable": false},
	"T": {"name": "forest", "color": Color(0.16, 0.32, 0.14), "walkable": true},
	"~": {"name": "river", "color": Color(0.22, 0.42, 0.6), "walkable": false},
	"=": {"name": "path", "color": Color(0.62, 0.5, 0.32), "walkable": true},
	"H": {"name": "village", "color": Color(0.78, 0.68, 0.42), "walkable": true},
	"F": {"name": "farmland", "color": Color(0.55, 0.58, 0.22), "walkable": true},
	".": {"name": "plains", "color": Color(0.38, 0.55, 0.24), "walkable": true},
	"C": {"name": "cave", "color": Color(0.2, 0.2, 0.22), "walkable": true},
	"S": {"name": "shrine", "color": Color(0.5, 0.42, 0.3), "walkable": true},
	"R": {"name": "ruins", "color": Color(0.45, 0.42, 0.4), "walkable": true},
	"B": {"name": "bridge", "color": Color(0.5, 0.36, 0.2), "walkable": true},
}

func _ready() -> void:
	_build()

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
			var pos := TestMap.world_pos(x, y)
			var xform := Transform3D(Basis(), pos)
			mmi.multimesh.set_instance_transform(slot.index, xform)
			slot.index += 1
