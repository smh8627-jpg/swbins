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
// saga-godot 106장 ㊻-4 눈 전용 나무 — 위를 보는 잎·가지에 눈이 얹힌다(0 이면 예전 그대로).
// 잎 색도 snow_amount 만큼 서늘하게 가라앉힌다(고원 침엽수가 마을 잎빛 그대로면 눈밭에서 뜬다).
uniform float snow_amount : hint_range(0.0, 1.0) = 0.0;
varying vec3 v_world_normal;

void vertex() {
	v_world_normal = (MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz;
	vec3 world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	apply_wind_sway(VERTEX, world_pos, UV);
}

void fragment() {
	vec4 tex = texture(albedo_texture, UV);
	ALBEDO = tex.rgb;
	if (snow_amount > 0.0) {
		float lum = dot(tex.rgb, vec3(0.3, 0.59, 0.11));
		ALBEDO = mix(tex.rgb, vec3(lum) * vec3(0.78, 0.92, 0.98), 0.35 * snow_amount);
		float up = smoothstep(0.2, 0.75, normalize(v_world_normal).y);
		ALBEDO = mix(ALBEDO, vec3(0.93, 0.95, 0.99), snow_amount * up);
	}
	ALPHA = tex.a;
	ALPHA_SCISSOR_THRESHOLD = alpha_scissor_threshold;
	ROUGHNESS = roughness_value;
	SPECULAR = specular_value;
	METALLIC = 0.0;
}
