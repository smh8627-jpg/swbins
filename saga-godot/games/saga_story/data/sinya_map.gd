class_name SinyaMap
extends RefCounted

## VERTICAL_SLICE_STORY.md 22절 다음 걸음 — 나머지 사냥터 8곳 중
## 마지막(신야성). 웹판 `saga-story/js/data-side.js` STAGES의 'sinya'
## 항목 — town:true(spawn:0), 발판·줄이 하나씩뿐인 가장 작은 마을(원작이
## 첫 시작 지점으로 쓰는 자리). heodo_map.gd와 같은 패턴.
##
## **재해석** — 원작 portals는 [[1130,'heodo']] 하나뿐(서쪽엔 아예 문이
## 없다 — 이 마을이 지도의 서쪽 끝이다). npcs(elder/guard/merchant/
## wanderer)는 다른 마을들과 같은 이유로 안 옮긴다(상점·전직은 허도에만).

const SCALE := 0.02

const WIDTH_PX := 1200.0
const FLOOR_PX := 560.0

## [x, y, w] px — 웹판 STAGES.sinya.plats 그대로(하나뿐).
const PLATS_PX: Array = [
	[520.0, 430.0, 240.0],
]

## 웹판 STAGES.sinya.ropes 그대로 — 하나뿐(ladder).
const ROPES_PX: Array = [
	[540.0, 430.0, 560.0, "ladder"],
]

## data-side.js sinya.portals[0] — [1130,'heodo'].
const PORTAL_EAST_X_PX := 1130.0
## 허도에서 건너올 때 도착하는 자리 — 다른 마을들과 같은 -80px 관례.
const ARRIVAL_FROM_HEODO_X_PX := 1050.0


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


static func portal_east_m() -> float:
	return PORTAL_EAST_X_PX * SCALE


static func arrival_from_heodo_m() -> float:
	return ARRIVAL_FROM_HEODO_X_PX * SCALE
