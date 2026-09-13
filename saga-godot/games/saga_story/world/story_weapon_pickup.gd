extends RefCounted

## VERTICAL_SLICE_STORY.md 1절 "제외" 목록 — "장비/노획"의 첫 컷.
## field_map.gd 머리말이 이미 좁혀 둔 대로 무기 한 자리(목검)뿐이다 —
## DUNGEON loot_pickup.gd와 같은 뼈대(Area3D 트리거+즉시 장착)를
## 빌리되, 물건이 하나뿐이라 등급·부위 분기가 없다.

const Toast := preload("res://saga_core/ui/toast.gd")
const StoryCombat := preload("res://games/saga_story/data/story_combat.gd")

const TRIGGER_RADIUS := 1.2
const COLOR := Color(0.75, 0.55, 0.3)  # 목검 — 나무 손잡이 톤


static func spawn_at(parent: Node, pos: Vector3) -> void:
	var area := Area3D.new()
	area.name = "WeaponPickup"
	area.position = pos

	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = Vector3(0.15, 0.6, 0.15)
	mi.mesh = mesh
	mi.position = Vector3(0, 0.3, 0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = COLOR
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
			StorySaveState.equip_weapon()
			Toast.show(area, "🗡️ %s 획득 · 공격력 +%d" % [StoryCombat.WEAPON_NAME, int(StoryCombat.WEAPON_ATK)], 3.0)
			area.queue_free()
	)
