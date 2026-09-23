shader_type spatial;
render_mode blend_mix, cull_disabled, diffuse_burley, specular_schlick_ggx;

// curved_vertex_color.gdshader와 색 계산은 똑같고(정점색 × tint), 원본
// 텍스처에서 알파만 빌려 모양을 오려낸다 — 잎 카드 gltf(alphaMode MASK)를
// 승인된 색감 그대로 두고 네모판만 없애려는 용도(FOREST 나무 CommonTree_1).
// 기존 curved_vertex_color는 그대로 둔다(primitive·불투명 메시가 쓴다).

#include "res://saga_core/shaders/world_curve.gdshaderinc"

uniform sampler2D alpha_texture;
uniform float curve_amount : hint_range(0.0, 0.02) = 0.004;
uniform float roughness_value : hint_range(0.0, 1.0) = 0.95;
uniform vec3 tint_color : source_color = vec3(1.0);
uniform float alpha_cutoff : hint_range(0.0, 1.0) = 0.2;

void vertex() {
	VERTEX = saga_apply_world_curve(VERTEX, MODEL_MATRIX, curve_amount);
}

void fragment() {
	ALBEDO = COLOR.rgb * tint_color;
	ALPHA = texture(alpha_texture, UV).a;
	ALPHA_SCISSOR_THRESHOLD = alpha_cutoff;
	ROUGHNESS = roughness_value;
}
