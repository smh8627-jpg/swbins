class_name NamjeongseongMap
extends RefCounted

## VERTICAL_SLICE_STORY.md 22절 다음 걸음 — 나머지 사냥터 8곳 중
## 넷째: 웹판 STAGES의 'namjeongseong'(남정성) 항목. gangneungjin_map.gd
## 와 같은 패턴(town:true 중계 마을, forest↔cave 사이).

const SCALE := 0.02

const WIDTH_PX := 1300.0
const FLOOR_PX := 560.0

## [x, y, w] px — 웹판 STAGES.namjeongseong.plats 그대로.
const PLATS_PX: Array = [
	[380.0, 420.0, 240.0],
	[860.0, 360.0, 220.0],
]

## 웹판 STAGES.namjeongseong.ropes 그대로.
const ROPES_PX: Array = [
	[400.0, 420.0, 560.0, "ladder"],
	[880.0, 360.0, 560.0, "rope"],
]

## data-side.js namjeongseong.portals[0] — [70,'forest'].
const PORTAL_WEST_X_PX := 70.0
## forest에서 건너올 때 도착하는 자리 — +80px 관례.
const ARRIVAL_FROM_FOREST_X_PX := 150.0

## data-side.js namjeongseong.portals[1] — [1230,'cave'].
const PORTAL_EAST_X_PX := 1230.0
## 한중 굴혈에서 건너올 때 도착하는 자리 — -80px 관례(town이라 위험물 없음).
const ARRIVAL_FROM_CAVE_X_PX := 1150.0


static func width_m() -> float:
	return WIDTH_PX * SCALE


static func height_of_px(y_px: float) -> float:
	return (FLOOR_PX - y_px) * SCALE


static func plats_m() -> Array:
	var out: Array = []
	for p: Array in PLATS_PX:
		out.append({
			"x": float(p[0]) * SCALE,
			"height": height_of_px(float(p[1])),
			"half_w": float(p[2]) * SCALE * 0.5,
		})
	return out


static func ropes_m() -> Array:
	var out: Array = []
	for r: Array in ROPES_PX:
		out.append({
			"x": float(r[0]) * SCALE,
			"top": height_of_px(float(r[1])),
			"bottom": height_of_px(float(r[2])),
			"kind": String(r[3]),
		})
	return out


static func portal_west_m() -> float:
	return PORTAL_WEST_X_PX * SCALE


static func arrival_from_forest_m() -> float:
	return ARRIVAL_FROM_FOREST_X_PX * SCALE


static func portal_east_m() -> float:
	return PORTAL_EAST_X_PX * SCALE


static func arrival_from_cave_m() -> float:
	return ARRIVAL_FROM_CAVE_X_PX * SCALE
