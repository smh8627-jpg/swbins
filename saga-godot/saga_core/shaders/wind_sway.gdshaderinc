// PLAN.md 102-5 "초목·지형·애니" — 나무 수관 흔들림. UV.y(세로 텍스처
// 좌표)를 흔들림 세기로 그대로 쓴다 — 줄기는 밑동이 거의 안 흔들리고,
// 잎 카드는 카드마다 아래→위로 살랑인다. (2026-09-23 정정: 예전 주석은
// "스냅 나무는 트렁크+캐노피가 한 표면"이라 했으나 실제론 줄기·잎 두
// 표면이다 — vegetation_builder.gd가 이제 표면 전부에 건다.)
void apply_wind_sway(inout vec3 vertex, vec3 world_pos, vec2 uv) {
	vertex.x += sin(TIME * 1.2 + world_pos.x * 0.3) * 0.08 * uv.y;
}
