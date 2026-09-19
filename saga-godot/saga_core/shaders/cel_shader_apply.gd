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
## VRoid GLB의 "Face" 메시는 같은 자리에 겹친 알파컷아웃 데칼 여러 장
## (눈썹·눈꺼풀선·홍채·하이라이트 등, transparency=ALPHA_SCISSOR)으로
## 얼굴을 쌓는다 — 전부 같은 깊이값(진짜 z-offset이 아니라 원래 Unity
## MToon의 렌더큐 순서에만 기댐)이라 카메라 거리가 멀어지면(3인칭 카메라
## 9m 안팎) Godot의 불투명 큐 정렬이 흔들려 서피스 순서가 뒤바뀌고
## 이목구비가 사라진 채 살빛만 남는다(2026-09-19 VRoid 교체 중 실기로
## 발견). 런타임 정렬 강제(transparency+render_priority)는 단순 씬에선
## 됐지만 실제 게임 씬에선 원인을 못 찾은 채로 계속 깨졌다.
##
## **그래서 오프라인에서 7장을 한 장으로 미리 구웠다**(Blender 헤드리스
## 파이프라인, `tools/asset-forge/` 스크립트 참고, 결과물은
## `assets/characters_vroid/generated/AvatarSample_A_Face_Baked.png`).
## 7개 서피스 전부 같은 완성 텍스처를 쓰므로 어느 게 위에 그려지든
## 결과가 같아야 하는데 — **여전히 GO 실기 씬에서 하얗게 빈다(2026-09-19④,
## 미해결)**. transparency(SCISSOR/DISABLED 둘 다 시도)·shading_mode
## (UNSHADED로 바꿔도 그대로) 둘 다 원인이 아님을 확인했다. 다음 세션이
## 이어서 볼 것: `cull_mode`(이 메시가 원래 CULL_DISABLED였을 가능성 —
## 새 StandardMaterial3D 기본값 CULL_BACK이 이 메시 노멀 방향과 안
## 맞아서 앞면이 컬링되고 있을 수 있다, 아직 실기로 못 재봄). 경위는
## HISTORY.md 2026-09-19④.
const LAYERED_FACE_MESH_NAMES := ["Face"]
const BAKED_FACE_TEXTURE := preload("res://assets/characters_vroid/generated/AvatarSample_A_Face_Baked.png")

static func apply_to(root: Node) -> int:
	var applied := 0
	for mesh_instance in _find_mesh_instances(root):
		if mesh_instance.name in LAYERED_FACE_MESH_NAMES:
			_apply_baked_face(mesh_instance)
			continue
		applied += _apply_one(mesh_instance)
	return applied

static func _apply_baked_face(mesh_instance: MeshInstance3D) -> void:
	var mesh := mesh_instance.mesh
	if mesh == null:
		return
	for surface_index in mesh.get_surface_count():
		var mat := StandardMaterial3D.new()
		mat.albedo_texture = BAKED_FACE_TEXTURE
		mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR
		## 원본 VRM 얼굴 재질은 KHR_materials_unlit(무광원)이었다 — 새로
		## 만드는 이 재질도 같게 맞춘다(원본과 다르게 라이트를 받게 두면
		## 안 되는 게 맞다). 이것만으로 하얗게 비는 문제는 안 고쳐졌다 —
		## 위 클래스 주석 참고.
		mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		mesh_instance.set_surface_override_material(surface_index, mat)
	mesh_instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

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
