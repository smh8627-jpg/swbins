extends RefCounted

## SAGA-DESIGN §3-E "발견 밀도" 진단(웹 §3-E와 같은 수치, PLAN.md 101-3·104-5).
## 지역 격자에서 발견 지점(points, 격자 좌표) 하나도 radius_m 반경 안에
## 없는 칸의 비율을 잰다. 순수 격자 계산이라 어느 판에도 그대로 쓴다 —
## GO 3지역(test_map.gd)·FOREST(village_map.gd)가 격자 크기·타일 크기만
## 다르고 이 계산은 같다. codex_state.gd처럼 "위치는 호출부가 들고 온다"
## 원칙을 그대로 따른다(이 스크립트는 points가 무엇인지 모른다).
static func report(size: Vector2i, tile_size: float, points: Array, radius_m: float = 60.0, walkable: Callable = Callable()) -> Dictionary:
	var radius_tiles := radius_m / tile_size
	var total := 0
	var empty := 0
	for y in size.y:
		for x in size.x:
			if walkable.is_valid() and not walkable.call(x, y):
				continue
			total += 1
			var near := false
			for p in points:
				var pv := Vector2(p.x, p.y)
				if Vector2(x, y).distance_to(pv) <= radius_tiles:
					near = true
					break
			if not near:
				empty += 1
	var pct := (float(empty) / float(total) * 100.0) if total > 0 else 0.0
	return {"total": total, "empty": empty, "empty_pct": pct}
