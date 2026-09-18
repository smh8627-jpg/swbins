shader_type spatial;
render_mode cull_disabled, diffuse_burley, specular_disabled;

// PLAN 102-5 "바닥 한 색" 처방의 경량판 — 102-5가 적어둔 heightmap+
// 트라이플레이너(잔디·흙·돌 3타일)는 103장 tilegen 결과물이 있어야
// 하는데 아직 없다. 그게 들어오기 전까지, 새 텍스처 없이 값 노이즈로만
// 정점색(칸별 지형색) 위에 미세한 명암 얼룩을 얹어 "밋밋한 단색 평면"만
// 먼저 깬다. tilegen 타일이 생기면 이 셰이더는 걷어내고 진짜
// terrain_triplanar.gdshader로 넘어간다.

uniform float noise_scale : hint_range(0.05, 5.0) = 0.35;
uniform float noise_strength : hint_range(0.0, 0.5) = 0.4;

float _hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float _value_noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	float a = _hash(i);
	float b = _hash(i + vec2(1.0, 0.0));
	float c = _hash(i + vec2(0.0, 1.0));
	float d = _hash(i + vec2(1.0, 1.0));
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void fragment() {
	// 큰 얼룩 하나 + 잔 얼룩 하나를 겹쳐 규칙적인 격자 느낌을 지운다.
	// 밝기만 살짝 곱하면 안개·톤맵(AgX)에 눌려 안 보인다(2026-09-19 실기로
	// 확인) — 색조 자체가 다른 색(약간 더 따뜻하고 밝은 마른 잎/흙 톤)과
	// 섞어야 눈에 띈다.
	float n1 = _value_noise(VERTEX.xz * noise_scale);
	float n2 = _value_noise(VERTEX.xz * noise_scale * 4.3 + vec2(19.0, 7.0));
	float n = n1 * 0.7 + n2 * 0.3;
	vec3 patch_tint = COLOR.rgb * vec3(1.25, 1.1, 0.8) + vec3(0.04, 0.03, -0.02);
	ALBEDO = mix(COLOR.rgb, patch_tint, smoothstep(0.4, 0.6, n) * noise_strength * 2.5);
	ROUGHNESS = 0.95;
}
