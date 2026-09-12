shader_type spatial;
render_mode blend_mix, cull_back, diffuse_burley, specular_schlick_ggx;

// saga_core/shaders/world_curve.gdshaderinc를 쓰는 두 공용 머티리얼 중
// 하나 — 텍스처 없이 정점 색만으로 칠하는 메시용(터레인 SurfaceTool,
// CC0 Kenney Nature Kit 나무·바위처럼 정점색 기반 GLB). 다른 하나는
// curved_textured.gdshader(텍스처가 있는 메시용). 나머지는 전부
// saga_core/world/world_curve_material.gd가 감싸 준다 — 이 파일을
// 직접 쓰는 자리는 없어야 한다.

#include "res://saga_core/shaders/world_curve.gdshaderinc"

uniform float curve_amount : hint_range(0.0, 0.02) = 0.004;
uniform float roughness_value : hint_range(0.0, 1.0) = 0.95;

void vertex() {
	VERTEX = saga_apply_world_curve(VERTEX, MODEL_MATRIX, curve_amount);
}

void fragment() {
	ALBEDO = COLOR.rgb;
	ROUGHNESS = roughness_value;
}
