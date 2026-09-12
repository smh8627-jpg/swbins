class_name WorldCurveMaterial
extends RefCounted

## VERTICAL_SLICE_FOREST.md 1절(구면 투영)을 쓰는 모든 머티리얼이 공통으로
## 필요로 하는 두 가지를 여기 한 곳에 모았다:
## 1) saga_world_curve_center 전역 유니폼을 한 번 등록하는 것 —
##    saga-godot/CLAUDE.md의 2026-09-12 발견("헤드리스 --editor --quit로
##    자동 등록되지 않는다, 런타임 코드가 직접 등록해야 한다")을 그대로
##    반영. 처음 머티리얼을 만들 때 자동으로 등록되므로 호출자가 순서를
##    신경 쓸 필요는 없다(멱등 — 여러 번 불러도 안전).
## 2) 그 유니폼을 실제로 읽는 ShaderMaterial 두 종류(정점색 전용/텍스처
##    전용)를 만드는 것 — saga_core/shaders/curved_vertex_color.gdshader ·
##    curved_textured.gdshader.
##
## FOREST 전용이 아니라 saga_core에 둔 이유 — world_curve.gdshaderinc
## 자체가 이미 "다른 트랙·다른 게임이 나중에 재사용할 수 있게" 공용
## include로 뽑혀 있다(그 파일 주석 참고); 이 헬퍼도 같은 경계.

const VERTEX_COLOR_SHADER := preload("res://saga_core/shaders/curved_vertex_color.gdshader")
const TEXTURED_SHADER := preload("res://saga_core/shaders/curved_textured.gdshader")

const GLOBAL_PARAM_NAME := "saga_world_curve_center"

static var _global_registered := false


static func ensure_global_registered() -> void:
	if _global_registered:
		return
	_global_registered = true
	RenderingServer.global_shader_parameter_add(
		GLOBAL_PARAM_NAME, RenderingServer.GLOBAL_VAR_TYPE_VEC3, Vector3.ZERO)


## 곡률의 중심 — 보통 플레이어 위치. 씬의 루트 스크립트가 매 프레임(또는
## 이동할 때) 한 번씩 불러 준다(games/saga_forest/world/forest_village.gd 참고).
static func update_center(center: Vector3) -> void:
	RenderingServer.global_shader_parameter_set(GLOBAL_PARAM_NAME, center)


static func vertex_color_material(curve_amount: float, roughness_value: float = 0.95,
		tint_color: Color = Color(1, 1, 1)) -> ShaderMaterial:
	ensure_global_registered()
	var mat := ShaderMaterial.new()
	mat.shader = VERTEX_COLOR_SHADER
	mat.set_shader_parameter("curve_amount", curve_amount)
	mat.set_shader_parameter("roughness_value", roughness_value)
	mat.set_shader_parameter("tint_color", tint_color)
	return mat


static func textured_material(texture_path: String, curve_amount: float, roughness_value: float = 0.9) -> ShaderMaterial:
	ensure_global_registered()
	var mat := ShaderMaterial.new()
	mat.shader = TEXTURED_SHADER
	mat.set_shader_parameter("albedo_texture", load(texture_path))
	mat.set_shader_parameter("curve_amount", curve_amount)
	mat.set_shader_parameter("roughness_value", roughness_value)
	return mat
