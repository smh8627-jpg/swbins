extends Node3D

## PLAN.md 66-2 "적용 순서" 1번 — VRoid 임포트 모델(AvatarSample_A.glb)에
## 셀 셰이더(saga_core/shaders/cel_toon.gdshader)를 시험 적용하는
## 프로토타입. 게임 씬이 아니다 — 톤이 확정되면 이 스크립트/씬은 지우고
## 44장 순서(Player → 주요 Enemy → Boss → …)대로 실제 캐릭터에 반영한다.

const CEL_SHADER := preload("res://saga_core/shaders/cel_toon.gdshader")

@export var model: NodePath
@export var status_label: NodePath

func _ready() -> void:
	var root := get_node_or_null(model)
	var label := get_node_or_null(status_label) as Label
	if root == null:
		if label:
			label.text = "cel shader: model not found"
		return
	var applied := 0
	for mesh_instance in _find_mesh_instances(root):
		applied += _apply_cel_shader(mesh_instance)
	if label:
		label.text = "cel shader: on (%d surfaces)" % applied

func _find_mesh_instances(node: Node) -> Array[MeshInstance3D]:
	var result: Array[MeshInstance3D] = []
	if node is MeshInstance3D:
		result.append(node)
	for child in node.get_children():
		result.append_array(_find_mesh_instances(child))
	return result

func _apply_cel_shader(mesh_instance: MeshInstance3D) -> int:
	var mesh := mesh_instance.mesh
	if mesh == null:
		return 0
	var count := 0
	for surface_index in mesh.get_surface_count():
		var original := mesh_instance.get_active_material(surface_index)
		var shader_mat := ShaderMaterial.new()
		shader_mat.shader = CEL_SHADER
		if original is BaseMaterial3D:
			shader_mat.set_shader_parameter("albedo_texture", original.albedo_texture)
			shader_mat.set_shader_parameter("albedo_tint", original.albedo_color)
		mesh_instance.set_surface_override_material(surface_index, shader_mat)
		count += 1
	return count
