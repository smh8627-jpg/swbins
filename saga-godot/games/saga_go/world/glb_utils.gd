class_name GLBUtils
extends RefCounted

## PLAN.md 41·45·46장 — primitive를 실제 GLB 에셋으로 교체하면서 여러 빌더
## (vegetation_builder.gd·landmarks_builder.gd)가 똑같이 필요로 하는 작업:
## 임포트된 GLB 씬을 한 번 인스턴스화해서 그 안의 Mesh 리소스만 뽑아내
## MultiMesh에 태운다(칸마다 노드를 만들지 않는다는 master.md 35장 원칙을
## GLB로 바꾼 뒤에도 그대로 지킨다).

## glb_path가 가리키는 씬 안에서 첫 번째 MeshInstance3D를 찾아 그 Mesh를
## 반환한다. 이 저장소가 받아 쓰는 Kenney CC0 소품(나무·바위·건물 조각)은
## 전부 "루트 Node3D 하나 + MeshInstance3D 하나"짜리 단순 구조라 이걸로 충분하다
## — 뼈대가 있는 캐릭터(assets/characters/*)에는 쓰지 않는다.
static func extract_mesh(glb_path: String) -> Mesh:
	var scene: PackedScene = load(glb_path)
	if scene == null:
		push_warning("GLBUtils: 로드 실패 — %s" % glb_path)
		return null
	var inst := scene.instantiate()
	var mi := _find_mesh_instance(inst)
	var mesh: Mesh = mi.mesh if mi != null else null
	inst.queue_free()
	return mesh

static func _find_mesh_instance(node: Node) -> MeshInstance3D:
	if node is MeshInstance3D:
		return node
	for c in node.get_children():
		var found := _find_mesh_instance(c)
		if found != null:
			return found
	return null
