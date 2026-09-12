extends RefCounted

## VERTICAL_SLICE_DUNGEON.md 5절 — "노획". dungeon_enemy.gd가 죽을 때 이
## 정적 헬퍼로 하나 세운다(toast.gd·choice_prompt.gd와 같은 "여러 곳이
## 필요로 하면 공용 헬퍼로 뽑는다" 경계).
##
## "제외" 목록 3번(장비 등급+접사) 이후 — DungeonItems.roll()로 등급+접사가
## 있는 물건을 굴려 즉시 장착한다(가방이 없어 줍는 즉시 갈아 든다).
##
## "제외" 목록 2번(소켓+부문어·투장·내구) — roll()이 이제 무기·부적을
## 안 가리고 굴리므로(웹판 dropItem()과 같은 방식) **어느 부위가 나왔는지
## 보고** 장착한다. 또 dungeon.js::dropMat()의 부문(룬) 갈래를 옮겨,
## 같은 킬에 독립된 확률로 부문 하나가 따로 떨어질 수 있다(재료는 즉시
## 주머니로 — 웹판과 같은 규칙, "노획물 정산"을 안 탄다).

const Toast := preload("res://saga_core/ui/toast.gd")
const TOAST_SEC := 4.0
const TRIGGER_RADIUS := 1.4
const RUNE_DROP_CHANCE := 0.22 # dungeon.js dropMat() runeChance 그대로(bias 없음)
const RUNE_COLOR := Color(0.94, 0.65, 0.22) # dungeon.js take()의 룬 색('#f0a53a') 그대로


static func spawn_at(parent: Node, pos: Vector3, ilvl: int) -> void:
	var it := DungeonItems.roll(ilvl)
	var tier: Dictionary = DungeonItems.TIERS[it.tier]
	var b := DungeonItems.base_by_key(str(it.base))
	var slot_name := str(b.get("slot", "weapon"))

	var area := Area3D.new()
	area.name = "LootPickup"
	area.position = pos

	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = Vector3(0.5, 0.5, 0.5)
	mi.mesh = mesh
	mi.position = Vector3(0, 0.4, 0)
	var mat := StandardMaterial3D.new()
	## 등급색 그대로(data-item.js 원작 색) — "색만 보고 줍는다"는 반사신경을
	## 이 슬라이스에서도 살린다.
	mat.albedo_color = Color(String(tier.color))
	mat.metallic = 0.4
	mi.material_override = mat
	area.add_child(mi)

	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = TRIGGER_RADIUS
	cs.shape = shape
	area.add_child(cs)

	parent.add_child(area)
	area.body_entered.connect(func(body: Node3D) -> void:
		if body.is_in_group("player"):
			if slot_name == "charm":
				DungeonEquipmentState.equip_charm(it)
			else:
				DungeonEquipmentState.equip_weapon(it)
			var lines := DungeonItems.item_lines(it)
			Toast.show(area, "🎁 %s · %s (%s)" % [tier.name, DungeonItems.item_name(it), " · ".join(lines)], TOAST_SEC)
			area.queue_free()
	)

	if randf() < RUNE_DROP_CHANCE:
		_spawn_rune(parent, pos + Vector3(0.6, 0, 0.6), ilvl)


static func _spawn_rune(parent: Node, pos: Vector3, floor_num: int) -> void:
	var key := DungeonItems.roll_rune_drop(floor_num)
	if key == "":
		return
	var r := DungeonItems.rune_by_key(key)

	var area := Area3D.new()
	area.name = "RunePickup"
	area.position = pos

	var mi := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = 0.28
	mesh.height = 0.56
	mi.mesh = mesh
	mi.position = Vector3(0, 0.4, 0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = RUNE_COLOR
	mat.metallic = 0.6
	mi.material_override = mat
	area.add_child(mi)

	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = TRIGGER_RADIUS
	cs.shape = shape
	area.add_child(cs)

	parent.add_child(area)
	area.body_entered.connect(func(body: Node3D) -> void:
		if body.is_in_group("player"):
			DungeonMaterialsState.add_rune(key)
			Toast.show(area, "🪨 부문 획득 · %s(%s)" % [r.glyph, r.name], TOAST_SEC)
			area.queue_free()
	)
