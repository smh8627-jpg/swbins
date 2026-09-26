shader_type spatial;
render_mode cull_disabled, diffuse_burley;

// PLAN 102-5 "바닥 한 색" 처방의 실물판 — ground_noise.gdshader가 남겨둔
// 자리를 그대로 잇는다(정점색·지형 판정 로직은 그대로, 새로 안 짠다).
// 103장 tilegen이 만든 잔디·흙·돌 3장(512, 각 albedo+normal+roughness)을
// 노이즈로 자연스럽게 섞어 "밋밋한 단색 평면"에 표면 디테일을 얹는다.
// terrain_builder.gd의 정점색(칸별 지형색, 산·강·길 구분)은 최종 곱으로
// 그대로 남아 지형 구분은 이 셰이더로 조금도 안 바뀐다 — 순수 디테일
// 추가. 지형 메시가 전부 위(+Y)만 보는 평평한 조각이라(terrain_builder.gd
// _build() 참고, 옆면 없음) 실제로는 XZ 평면 투영이면 충분하지만, 이름과
// 앞으로의 확장(경사면)을 대비해 삼축 투영으로 짠다.

uniform sampler2D grass_albedo : source_color;
uniform sampler2D grass_normal : hint_normal;
uniform sampler2D grass_rough;
uniform sampler2D dirt_albedo : source_color;
uniform sampler2D dirt_normal : hint_normal;
uniform sampler2D dirt_rough;
uniform sampler2D stone_albedo : source_color;
uniform sampler2D stone_normal : hint_normal;
uniform sampler2D stone_rough;

uniform float tile_scale : hint_range(0.05, 2.0) = 0.4; // 텍스처 반복 밀도(1/m)
uniform float patch_scale : hint_range(0.02, 1.0) = 0.12; // 얼룩 크기

varying vec3 world_pos;
varying vec3 world_normal;

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

// saga-godot 106장 ㊺ — 눈·얼음·모래 표시(terrain_builder.gd surface_of: CUSTOM0 .r 눈 · .g 얼음 · .b 모래). 안 싣는 메시는 0.
varying vec3 v_surf;

void vertex() {
	v_surf = CUSTOM0.rgb;
	world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	world_normal = (MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz;
}

// 삼축(XY·YZ·XZ) 투영을 법선 가중으로 섞는다(표준 triplanar). 이 메시는
// 늘 위를 보므로 실질적으로 XZ 항이 거의 전부를 차지한다.
vec4 _triplanar(sampler2D tex, vec3 pos, vec3 n, float scale) {
	vec3 w = abs(normalize(n));
	w /= (w.x + w.y + w.z);
	vec4 xy = texture(tex, pos.xy * scale);
	vec4 yz = texture(tex, pos.zy * scale);
	vec4 xz = texture(tex, pos.xz * scale);
	return xz * w.y + yz * w.x + xy * w.z;
}

void fragment() {
	vec3 grass_a = _triplanar(grass_albedo, world_pos, world_normal, tile_scale).rgb;
	vec3 dirt_a = _triplanar(dirt_albedo, world_pos, world_normal, tile_scale).rgb;
	vec3 stone_a = _triplanar(stone_albedo, world_pos, world_normal, tile_scale).rgb;
	// 텍스처 색([0,1])을 탄젠트 공간 벡터([-1,1])로 되돌려야 가중 평균이
	// 뜻이 있다 — [0,1] 그대로 블렌드하면 방향이 아니라 색을 섞는 꼴이 된다.
	vec3 grass_n = _triplanar(grass_normal, world_pos, world_normal, tile_scale).rgb * 2.0 - 1.0;
	vec3 dirt_n = _triplanar(dirt_normal, world_pos, world_normal, tile_scale).rgb * 2.0 - 1.0;
	vec3 stone_n = _triplanar(stone_normal, world_pos, world_normal, tile_scale).rgb * 2.0 - 1.0;
	float grass_r = _triplanar(grass_rough, world_pos, world_normal, tile_scale).r;
	float dirt_r = _triplanar(dirt_rough, world_pos, world_normal, tile_scale).r;
	float stone_r = _triplanar(stone_rough, world_pos, world_normal, tile_scale).r;

	float n1 = _value_noise(world_pos.xz * patch_scale);
	float n2 = _value_noise(world_pos.xz * patch_scale * 3.7 + vec2(11.0, 5.0));
	float dirt_w = smoothstep(0.55, 0.75, n1) * 0.6;
	float stone_w = smoothstep(0.6, 0.8, n2) * 0.5;
	// 2026-09-23 GO 절벽·봉우리(terrain_builder.gd) — 경사가 급할수록 돌.
	// 평지(법선 y=1)는 slope 0 이라 예전 화면 그대로다.
	float slope = 1.0 - clamp(normalize(world_normal).y, 0.0, 1.0);
	stone_w = max(stone_w, smoothstep(0.25, 0.6, slope));
	dirt_w *= 1.0 - smoothstep(0.25, 0.6, slope);
	float grass_w = max(0.05, 1.0 - dirt_w - stone_w);
	float wsum = grass_w + dirt_w + stone_w;

	vec3 detail_albedo = (grass_a * grass_w + dirt_a * dirt_w + stone_a * stone_w) / wsum;
	vec3 detail_normal = normalize(grass_n * grass_w + dirt_n * dirt_w + stone_n * stone_w);
	float detail_rough = (grass_r * grass_w + dirt_r * dirt_w + stone_r * stone_w) / wsum;

	ALBEDO = COLOR.rgb * detail_albedo;
	NORMAL_MAP = detail_normal * 0.5 + 0.5;
	ROUGHNESS = detail_rough;
	// 모래 표시 — 풀 텍스처 대신 모래색에 흙결만 옅게(평평한 모래밭).
	// 정점색은 sRGB 로 적은 값이라(풀·흙은 어두운 텍스처와 곱해져 맞았다) 그대로 칠하는 모래는 선형으로 — 안 그러면 한 단 허옇게 뜬다.
	float sand_w = smoothstep(0.25, 0.75, v_surf.z) * (1.0 - smoothstep(0.35, 0.7, slope));
	vec3 sand = pow(COLOR.rgb, vec3(2.2)) * mix(vec3(1.0), dirt_a * 2.5, 0.25) * (0.93 + 0.07 * n2);
	ALBEDO = mix(ALBEDO, sand, sand_w);
	ROUGHNESS = mix(ROUGHNESS, 0.9, sand_w);
	// saga-godot PLAN 106장 ㊺ 서리봉 고원 — 눈 표시(눈밭·눈 덮인 산)는 풀 텍스처 대신 눈으로,
	// 얼음 표시(얼어붙은 호수)는 매끈한 얼음으로. 표시는 정점색이 아니라 CUSTOM0 로 따로 온다(가장자리 섞임에 안 흔들린다).
	// 다른 지역·판은 표시가 0 이라 화면이 그대로다. 가파른 비탈은 돌을 남긴다.
	float snow_w = smoothstep(0.25, 0.75, v_surf.x) * (1.0 - smoothstep(0.35, 0.7, slope));
	// 눈은 정점색보다 한 단 희게(길·숲 바닥 색이 비치되 눈빛이 이기게) — AgX 톤매핑에서 0.86 은 회색으로 가라앉았다.
	vec3 snow = mix(COLOR.rgb, vec3(0.95, 0.97, 1.0), 0.6) * (0.92 + 0.08 * n2) * mix(vec3(1.0), stone_a * 1.6, 0.1);
	ALBEDO = mix(ALBEDO, snow, snow_w);
	ROUGHNESS = mix(ROUGHNESS, 0.75, snow_w);
	float ice_w = smoothstep(0.25, 0.75, v_surf.y) * (1.0 - snow_w);
	ALBEDO = mix(ALBEDO, COLOR.rgb * (0.94 + 0.06 * n1), ice_w);
	ROUGHNESS = mix(ROUGHNESS, 0.12, ice_w);
	NORMAL_MAP = mix(NORMAL_MAP, vec3(0.5, 0.5, 1.0), max(ice_w, snow_w * 0.6));
}
