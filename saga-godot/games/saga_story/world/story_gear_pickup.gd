extends RefCounted

## VERTICAL_SLICE_STORY.md 1절 "제외" 목록 — "장비/노획". 처음엔 무기
## 한 자리(story_weapon_pickup.gd)만 있었다가, 같은 날 이어서 10부위
## 전부로 넓히며 이 파일로 일반화했다 — DUNGEON loot_pickup.gd와 같은
## 뼈대(Area3D 트리거+즉시 장착), 물건 키 하나만 받으면 어떤 부위든
## 처리한다(story_combat.gd GEAR_ITEMS를 그대로 읽는다).

const Toast := preload("res://saga_core/ui/toast.gd")
const StoryCombat := preload("res://games/saga_story/data/story_combat.gd")

const TRIGGER_RADIUS := 1.2

## 부위별 상자 색 — 실제 그림은 없지만(primitive) 슬롯 갈래는 한눈에
## 구분되게(무기=나무 손잡이 톤, 방어구=가죽, 장신구=금속광). 원작에
## 없는 값(색 자체는 장식일 뿐 데이터가 아니다).
const SLOT_COLOR := {
	"weapon": Color(0.75, 0.55, 0.3),
	"hat": Color(0.55, 0.42, 0.3), "top": Color(0.55, 0.42, 0.3),
	"bottom": Color(0.55, 0.42, 0.3), "shoes": Color(0.55, 0.42, 0.3),
	"glove": Color(0.55, 0.42, 0.3), "cape": Color(0.55, 0.42, 0.3),
	"ring": Color(0.85, 0.75, 0.35), "necklace": Color(0.85, 0.75, 0.35),
	"earring": Color(0.85, 0.75, 0.35),
}


static func spawn_at(parent: Node, pos: Vector3, key: String) -> void:
	var it: Dictionary = StoryCombat.GEAR_ITEMS.get(key, {})
	if it.is_empty():
		return
	var slot: String = String(it.slot)

	var area := Area3D.new()
	area.name = "GearPickup"
	area.position = pos

	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = Vector3(0.15, 0.6, 0.15) if slot == "weapon" else Vector3(0.4, 0.4, 0.4)
	mi.mesh = mesh
	mi.position = Vector3(0, 0.3, 0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = SLOT_COLOR.get(slot, Color(0.7, 0.7, 0.7))
	mi.material_override = mat
	area.add_child(mi)

	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = TRIGGER_RADIUS
	cs.shape = shape
	area.add_child(cs)

	parent.add_child(area)
	area.body_entered.connect(func(body: Node3D) -> void:
		if not body.is_in_group("player"):
			return
		## **2026-09-13 추가(같은 날 더, tier2~4) — 요구 레벨을 못 채우면
		## 못 낀다(story_save_state.gd equip_gear() 게이트). 가방이 없어
		## "일단 담아 둔다"가 안 되니, 이 포트에선 **줍지 않고 그대로 둔다**
		## — 레벨이 오른 뒤 다시 와서 주울 수 있게(원작의 "가방에 넣고 나중에
		## 낀다"와 결과가 같다, 담아 두는 자리만 가방 대신 바닥이다).
		if StorySaveState.equip_gear(key):
			Toast.show(area, "🎁 %s 획득 · %s" % [String(it.name), _stat_line(it)], 3.0)
			area.queue_free()
		else:
			Toast.show(area, "⚠️ Lv.%d 부터 낄 수 있다 · %s" % [int(it.need), String(it.name)], 2.5)
	)


static func _stat_line(it: Dictionary) -> String:
	var parts: Array[String] = []
	if float(it.get("atk", 0.0)) > 0.0:
		parts.append("공격력 +%d" % int(it.atk))
	if float(it.get("def", 0.0)) > 0.0:
		parts.append("방어력 +%d" % int(it.def))
	if float(it.get("hp", 0.0)) > 0.0:
		parts.append("체력 +%d" % int(it.hp))
	return " · ".join(parts)
