extends SceneTree
## 배치표(saga-layout/1, tools/scene-layout/layout.mjs) → .tscn 조립 — 새 씬 파일 하나만 쓴다(기존 씬·임포트 설정은 안 건드림).
##
##   "$GODOT" --headless --path saga-godot --script res://tools/build_from_layout.gd -- \
##       res://tools/layout/out/hebei.json res://games/_generated/hebei_layout.tscn
##
## 바닥은 칸마다 PlaneMesh(지형 색), 물건은 에셋 PackedScene 을 인스턴스로(씬 파일엔 경로만 남는다),
## 명소는 Marker3D(메타 place_name·hidden). 보기용 조명·카메라를 같이 둔다. 없는 에셋은 건너뛰고 이름을 찍는다.

func _init() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() < 2:
		push_error("사용: --script res://tools/build_from_layout.gd -- <배치표.json> <res://출력.tscn>")
		quit(1)
		return
	var out_path: String = args[1]
	var f := FileAccess.open(args[0], FileAccess.READ)
	if f == null:
		push_error("배치표를 못 엶: " + args[0])
		quit(1)
		return
	var data = JSON.parse_string(f.get_as_text())
	if typeof(data) != TYPE_DICTIONARY or data.get("schema", "") != "saga-layout/1":
		push_error("saga-layout/1 배치표가 아니다: " + args[0])
		quit(1)
		return

	var root := Node3D.new()
	root.name = "Layout_" + str(data["region"])
	root.set_meta("layout_source", str(data["source"]))
	root.set_meta("layout_seed", int(data["seed"]))
	var cell := float(data["cell"])

	# 바닥 — 지형마다 재질 하나, 칸마다 판 하나
	var ground := Node3D.new()
	ground.name = "Ground"
	root.add_child(ground)
	ground.owner = root
	var plane := PlaneMesh.new()
	plane.size = Vector2(cell, cell)
	var mats := {}
	var colors: Dictionary = data.get("groundColors", {})
	for g in data["ground"]:
		var k: String = str(g["kind"])
		if not mats.has(k):
			var m := StandardMaterial3D.new()
			m.albedo_color = Color.html(str(colors.get(k, "#808080")))
			m.roughness = 1.0
			mats[k] = m
		var mi := MeshInstance3D.new()
		mi.mesh = plane
		mi.material_override = mats[k]
		mi.position = Vector3(float(g["x"]), 0.0, float(g["z"]))
		mi.name = "g_%s_%s" % [str(int(g["tx"])), str(int(g["ty"]))]
		ground.add_child(mi)
		mi.owner = root

	# 물건 — 에셋을 인스턴스로
	var props := Node3D.new()
	props.name = "Props"
	root.add_child(props)
	props.owner = root
	var cache := {}
	var missing: Array[String] = []
	var placed := 0
	for it in data["items"]:
		var p: String = str(it["asset"])
		if not cache.has(p):
			cache[p] = load(p) if ResourceLoader.exists(p) else null
		var ps = cache[p]
		if ps == null or not (ps is PackedScene):
			if not missing.has(p):
				missing.append(p)
			continue
		var n: Node = ps.instantiate(PackedScene.GEN_EDIT_STATE_INSTANCE)
		var n3 := n as Node3D
		if n3 != null:
			n3.position = Vector3(float(it["x"]), float(it["y"]), float(it["z"]))
			n3.rotation_degrees = Vector3(0.0, float(it["rotY"]), 0.0)
			n3.scale = Vector3.ONE * float(it["scale"])
		n.name = "%s_%d" % [str(it["kind"]).replace("@", "at_"), placed]
		props.add_child(n)
		n.owner = root
		placed += 1

	# 명소 — 표식만(사람·사건은 게임 코드가 건다)
	var marks := Node3D.new()
	marks.name = "Places"
	root.add_child(marks)
	marks.owner = root
	for pl in data["places"]:
		var mk := Marker3D.new()
		mk.name = str(pl["id"])
		mk.position = Vector3(float(pl["x"]), 0.0, float(pl["z"]))
		mk.set_meta("place_name", str(pl["name"]))
		mk.set_meta("hidden", bool(pl["hidden"]))
		marks.add_child(mk)
		mk.owner = root

	# 보기용 — 해와 위에서 내려다보는 카메라
	var sun := DirectionalLight3D.new()
	sun.name = "Sun"
	sun.rotation_degrees = Vector3(-55.0, 35.0, 0.0)
	sun.shadow_enabled = true
	root.add_child(sun)
	sun.owner = root
	var cam := Camera3D.new()
	cam.name = "Overview"
	var span := maxf(float(data["w"]), float(data["h"])) * cell
	cam.position = Vector3(0.0, span * 0.9, span * 0.75)
	cam.rotation_degrees = Vector3(-50.0, 0.0, 0.0)
	cam.current = true
	root.add_child(cam)
	cam.owner = root

	var packed := PackedScene.new()
	var err := packed.pack(root)
	if err != OK:
		push_error("pack 실패: %d" % err)
		root.free()
		quit(1)
		return
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(out_path.get_base_dir()))
	err = ResourceSaver.save(packed, out_path)
	print("조립 %s — 바닥 %d · 물건 %d · 명소 %d · 없는 에셋 %d → %s (%s)" % [root.name, ground.get_child_count(), placed, marks.get_child_count(), missing.size(), out_path, "OK" if err == OK else "저장 실패 %d" % err])
	for mp in missing:
		print("  없는 에셋: " + mp)
	root.free()
	quit(0 if err == OK else 1)
