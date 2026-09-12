extends RefCounted

## VERTICAL_SLICE_DUNGEON.md 5절 — "노획". 잡졸을 이기면 이름만 있는
## 장비 하나가 바닥에 떨어진다(줍기만, 착용 효과 없음 — 등급·접사 등
## 실제 장비 시스템은 이번 슬라이스 제외 목록). dungeon_enemy.gd가 죽을
## 때 이 정적 헬퍼로 하나 세운다(toast.gd·choice_prompt.gd와 같은 "여러
## 곳이 필요로 하면 공용 헬퍼로 뽑는다" 경계 — 지금은 호출하는 곳이
## 하나뿐이지만, 다른 적/보물상자도 나중에 같은 방식으로 쓸 걸 예상해
## 미리 헬퍼로 둔다).

const Toast := preload("res://saga_core/ui/toast.gd")
const TOAST_SEC := 3.0
const TRIGGER_RADIUS := 1.4


static func spawn_at(parent: Node, pos: Vector3) -> void:
	var area := Area3D.new()
	area.name = "LootPickup"
	area.position = pos

	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = Vector3(0.5, 0.5, 0.5)
	mi.mesh = mesh
	mi.position = Vector3(0, 0.4, 0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.7, 0.65, 0.35)
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
			Toast.show(area, "이름 없는 장비를 주웠다.", TOAST_SEC)
			area.queue_free()
	)
