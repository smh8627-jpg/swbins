shader_type spatial;
render_mode cull_disabled;

// PLAN.md 102-5 — 나무 원본 StandardMaterial3D(알베도 텍스처+알파 시저+
// 러프니스/스페큘러)를 그대로 흉내 내면서 wind_sway.gdshaderinc 만 얹는다.
// 값은 하드코딩하지 않고 vegetation_builder.gd 가 원본 머티리얼에서 읽어
// 그대로 이 uniform 에 옮겨 담는다(에셋이 바뀌어도 따로 안 맞춰도 된다).
#include "res://saga_core/shaders/wind_sway.gdshaderinc"

uniform sampler2D albedo_texture : source_color;
uniform float alpha_scissor_threshold : hint_range(0.0, 1.0) = 0.0;
uniform float roughness_value : hint_range(0.0, 1.0) = 1.0;
uniform float specular_value : hint_range(0.0, 1.0) = 0.5;

void vertex() {
	vec3 world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	apply_wind_sway(VERTEX, world_pos, UV);
}

void fragment() {
	vec4 tex = texture(albedo_texture, UV);
	ALBEDO = tex.rgb;
	ALPHA = tex.a;
	ALPHA_SCISSOR_THRESHOLD = alpha_scissor_threshold;
	ROUGHNESS = roughness_value;
	SPECULAR = specular_value;
	METALLIC = 0.0;
}
