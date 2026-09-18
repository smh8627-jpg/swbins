class_name CelShaderApply
extends RefCounted

## PLAN.md 66-2 "적용 순서" 2번 — cel_shader_prototype.gd에서 검증한
## 카툰 셰이더 적용 로직을 실제 게임 씬(Player/NPC)에서 재사용하는 공용
## 헬퍼. 텍스처가 있는 캐릭터 GLB 전용이다 — 텍스처 없는 단색 primitive
## (아직 GLB가 없는 Enemy/Boss 캡슐)에는 쓰지 않는다(albedo_texture가
## 비어 검게 나온다).

const CEL_SHADER := preload("res://saga_core/shaders/cel_toon.gdshader")
const OUTLINE_SHADER := preload("res://saga_core/shaders/cel_outline.gdshader")

## root 아래 모든 MeshInstance3D의 서피스 재질을 cel_toon 셰이더로 덮는다.
## 반환값은 적용된 서피스 개수.
static func apply_to(root: Node) -> int:
	var applied := 0
	for mesh_instance in _find_mesh_instances(root):
		applied += _apply_one(mesh_instance)
	return applied

static func _find_mesh_instances(node: Node) -> Array[MeshInstance3D]:
	var result: Array[MeshInstance3D] = []
	if node is MeshInstance3D:
		result.append(node)
	for child in node.get_children():
		result.append_array(_find_mesh_instances(child))
	return result

static func _apply_one(mesh_instance: MeshInstance3D) -> int:
	var mesh := mesh_instance.mesh
	if mesh == null:
		return 0
	var count := 0
	for surface_index in mesh.get_surface_count():
		var original := mesh_instance.get_active_material(surface_index)
		if not (original is BaseMaterial3D) or (original as BaseMaterial3D).albedo_texture == null:
			continue
		var shader_mat := ShaderMaterial.new()
		shader_mat.shader = CEL_SHADER
		shader_mat.set_shader_parameter("albedo_texture", (original as BaseMaterial3D).albedo_texture)
		shader_mat.set_shader_parameter("albedo_tint", (original as BaseMaterial3D).albedo_color)
		## PLAN 102-3 아웃라인 — 뒤집힌 헐 셰이더를 next_pass로 얹는다.
		## Player·NPC(이 함수를 부르는 곳)에만 자연히 걸린다.
		var outline_mat := ShaderMaterial.new()
		outline_mat.shader = OUTLINE_SHADER
		shader_mat.next_pass = outline_mat
		mesh_instance.set_surface_override_material(surface_index, shader_mat)
		count += 1
	return count
