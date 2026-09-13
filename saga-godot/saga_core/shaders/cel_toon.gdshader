shader_type spatial;
render_mode blend_mix, cull_back, diffuse_burley, specular_disabled;

// PLAN.md 66-2 — 카툰/셀셰이딩(원신류) 프로토타입 1호.
// 밴드형(quantized) 명암 2~3단 + rim light. godotshaders.com 계열
// 공개 예제(light() 커스텀 함수로 NdotL을 계단화하는 방식)를 참고해
// 직접 짰다 — 원신 실제 셰이더 코드나 데이터마이닝 자료는 쓰지 않았다
// (루트 CLAUDE.md 원작 에셋 금지 원칙).
//
// 대상: 텍스처가 있는 캐릭터/몬스터/NPC 메시(VRoid GLB 등). 아웃라인은
// 이 셰이더에 없다 — 66-2장 "적용 순서" 3번에서 성능 검토 후 별도로 붙인다.

uniform sampler2D albedo_texture : source_color;
uniform vec4 albedo_tint : source_color = vec4(1.0);
uniform int band_count : hint_range(2, 4) = 3;
uniform float band_softness : hint_range(0.0, 1.0) = 0.15;
uniform vec3 rim_color : source_color = vec3(1.0, 0.95, 0.85);
uniform float rim_power : hint_range(0.5, 8.0) = 3.0;
uniform float rim_strength : hint_range(0.0, 2.0) = 0.6;

void fragment() {
	vec4 tex = texture(albedo_texture, UV);
	ALBEDO = tex.rgb * albedo_tint.rgb;
	ALPHA = tex.a * albedo_tint.a;
	ROUGHNESS = 1.0;
}

void light() {
	float ndotl = clamp(dot(NORMAL, LIGHT), 0.0, 1.0);
	float band_step = 1.0 / float(band_count);
	float banded = floor(ndotl / band_step) * band_step;
	float t = smoothstep(banded, banded + band_softness * band_step, ndotl);
	float lit = clamp(mix(banded, banded + band_step, t), 0.0, 1.0);

	float rim = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), rim_power) * rim_strength;
	rim *= smoothstep(0.0, 0.3, ndotl);

	DIFFUSE_LIGHT += ALBEDO * LIGHT_COLOR * ATTENUATION * lit;
	DIFFUSE_LIGHT += rim_color * rim * LIGHT_COLOR * ATTENUATION;
}
