extends RefCounted

## VERTICAL_SLICE_DUNGEON.md 5절 — "노획". dungeon_enemy.gd가 죽을 때 이
## 정적 헬퍼로 하나 세운다(toast.gd·choice_prompt.gd와 같은 "여러 곳이
## 필요로 하면 공용 헬퍼로 뽑는다" 경계 — 지금은 호출하는 곳이 하나뿐이지만,
## 다른 적/보물상자도 나중에 같은 방식으로 쓸 걸 예상해 미리 헬퍼로 둔다).
##
## "제외" 목록 3번(장비 등급+접사) 구현 이후 — 처음엔 "이름만 있는 장비"
## (줍기만, 효과 없음)였는데, 이제 실제로 DungeonItems.roll()로 등급+
## 접사가 있는 무기를 굴려 즉시 장착한다(DungeonEquipmentState, 가방이
## 없어 줍는 즉시 갈아 든다).

const Toast := preload("res://saga_core/ui/toast.gd")
const TOAST_SEC := 4.0
const TRIGGER_RADIUS := 1.4


static func spawn_at(parent: Node, pos: Vector3, ilvl: int) -> void:
	var it := DungeonItems.roll(ilvl)
	var tier: Dictionary = DungeonItems.TIERS[it.tier]

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
			DungeonEquipmentState.equip(it)
			var lines := DungeonItems.item_lines(it)
			Toast.show(area, "🎁 %s · %s (%s)" % [tier.name, DungeonItems.item_name(it), " · ".join(lines)], TOAST_SEC)
			area.queue_free()
	)
