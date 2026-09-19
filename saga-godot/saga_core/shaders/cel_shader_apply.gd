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
## 발견, 가까이서는 멀쩡해 보여 처음엔 못 잡았다). cel_toon으로 바꾸는
## 대신 `_fix_layered_face()`로 투명(ALPHA)+`render_priority`를 줘서
## Godot의 투명 큐 정렬(항상 안정적)을 타게 한다.
const LAYERED_FACE_MESH_NAMES := ["Face"]

## 재질 이름에 포함된 부위 키워드 → 뒤(0)에서 앞(큰 수)으로 그릴 순서.
## 순서 안 맞으면 뒤 레이어가 앞 레이어를 덮어 이목구비가 사라진다.
const FACE_LAYER_ORDER := [
	"SKIN", "EyeWhite", "EyeIris", "EyeHighlight", "Brow", "Eyeline", "Mouth",
]

static func apply_to(root: Node) -> int:
	var applied := 0
	for mesh_instance in _find_mesh_instances(root):
		if mesh_instance.name in LAYERED_FACE_MESH_NAMES:
			_fix_layered_face(mesh_instance)
			continue
		applied += _apply_one(mesh_instance)
	return applied

static func _fix_layered_face(mesh_instance: MeshInstance3D) -> void:
	var mesh := mesh_instance.mesh
	if mesh == null:
		return
	for surface_index in mesh.get_surface_count():
		var original := mesh_instance.get_active_material(surface_index)
		if not (original is BaseMaterial3D):
			continue
		var bm := original as BaseMaterial3D
		var priority := 0
		for i in FACE_LAYER_ORDER.size():
			if FACE_LAYER_ORDER[i] in bm.resource_name:
				priority = i
				break
		bm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		bm.render_priority = priority
	## 겹친 알파 레이어끼리 스스로 그림자를 드리우면(셀프섀도) 그림자맵
	## 정밀도 한계로 겹친 자리에 얼룩/누락이 생긴다 — 얼굴은 머리카락에
	## 가려 그림자가 잘 안 보이니 아예 그림자를 안 던지게 한다.
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
