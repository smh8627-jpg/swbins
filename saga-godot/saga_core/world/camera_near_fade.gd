extends RefCounted

## 102-7 "카메라 클리핑"(부분: SpringArm3D 있음, 근접 페이드 없음) 처방.
## SpringArm3D가 장애물에 눌려 카메라가 캐릭터 몸 안쪽까지 파고들면
## `GeometryInstance3D.transparency` 인스턴스 속성만 올려 살짝 투명하게
## 만든다 — cel_toon 머티리얼·hit_flash uniform은 그대로 안 건드린다.
## GO camera_rig.gd·DUNGEON/FOREST dungeon_camera_rig.gd가 같이 쓴다.

const FADE_DIST := 1.5

static func collect_meshes(visual_root: Node) -> Array[GeometryInstance3D]:
	var out: Array[GeometryInstance3D] = []
	_collect(visual_root, out)
	return out

static func _collect(node: Node, out: Array[GeometryInstance3D]) -> void:
	if node is GeometryInstance3D:
		out.append(node)
	for child in node.get_children():
		_collect(child, out)

static func apply(meshes: Array[GeometryInstance3D], cam_pos: Vector3, ref_pos: Vector3) -> void:
	var dist := cam_pos.distance_to(ref_pos)
	var t := clampf((FADE_DIST - dist) / FADE_DIST, 0.0, 1.0)
	for mesh in meshes:
		if is_instance_valid(mesh):
			mesh.transparency = t
