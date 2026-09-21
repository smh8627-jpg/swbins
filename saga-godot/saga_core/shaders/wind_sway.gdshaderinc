// PLAN.md 102-5 "초목·지형·애니" — 나무 수관 흔들림. 표면을 몸통/수관으로
// 안 나눈 메시(Quaternius 나무 GLB, 2026-09-20 교체 뒤로 트렁크+캔오피가
// 이미 한 표면이다)에도 걸 수 있게, UV.y(세로 텍스처 좌표 — 밑동 0 →
// 꼭대기 1)를 흔들림 세기로 그대로 쓴다. 밑동은 거의 안 흔들리고
// 위쪽일수록 커진다 — 별도 표면 분리 없이 이 하나로 "수관만" 흔든다.
void apply_wind_sway(inout vec3 vertex, vec3 world_pos, vec2 uv) {
	vertex.x += sin(TIME * 1.2 + world_pos.x * 0.3) * 0.08 * uv.y;
}
