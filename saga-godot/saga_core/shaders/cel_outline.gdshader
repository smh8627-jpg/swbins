shader_type spatial;
render_mode cull_front, unshaded, depth_draw_always;

// PLAN.md 102-3 — 아웃라인(뒤집힌 헐). cel_toon.gdshader의 next_pass로만
// 붙는다(CelShaderApply.apply_to 참고) — 단독으로는 안 쓴다. 대상은 지금
// 텍스처 캐릭터(Player·NPC)뿐이다: Enemy·채집물은 아직 이 셰이더를 입힐
// 재질 자체가 없어(단색 StandardMaterial3D) 이번 패스에서 빠졌다.
// 101-3 G(무기 등급 색 외곽선)가 이 셰이더를 그대로 재사용하며
// outline_color만 등급별로 바꿔 쓸 예정.

uniform float thickness : hint_range(0.0, 0.05) = 0.015;
uniform vec3 outline_color : source_color = vec3(0.08, 0.06, 0.10);

void vertex() {
	VERTEX += NORMAL * thickness;
}

void fragment() {
	ALBEDO = outline_color;
}
