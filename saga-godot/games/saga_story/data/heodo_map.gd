class_name HeodoMap
extends RefCounted

## VERTICAL_SLICE_STORY.md 15절 — 웹판 `saga-story/js/data-side.js`
## STAGES의 'heodo'(허도) 항목. `town:true`(spawn:0 — 적·보스·채집이
## 없다) 그대로: field_map.gd와 같은 SCALE(0.02)·좌표 변환 방식으로
## 발판·줄만 옮긴다.
##
## **2026-09-13 추가(같은 날 더, 23절) — 서쪽 문(sinya) 개통.** 나머지
## 사냥터 8곳의 마지막인 신야성이 생겨서 원작 portals[0]([70,'sinya'])도
## 마저 옮긴다 — 동쪽 문(field)과 같은 구조.
##
## **재해석(상점)** — 14절이 "마을이 없어" field 안에 임시로 세웠던
## 상인(story_merchant.gd)을 이 절에서 원래 자리인 여기로 옮긴다
## (data-side.js heodo.npcs의 'merchant' 항목).

const SCALE := 0.02

const WIDTH_PX := 1400.0
const FLOOR_PX := 560.0

## [x, y, w] px — 웹판 STAGES.heodo.plats 그대로.
const PLATS_PX: Array = [
	[300.0, 430.0, 240.0],
	[900.0, 380.0, 260.0],
]

## 웹판 STAGES.heodo.ropes 그대로 — [x, top_px, bottom_px, kind] 둘.
const ROPES_PX: Array = [
	[320.0, 430.0, 560.0, "ladder"],
	[920.0, 380.0, 560.0, "rope"],
]

## data-side.js heodo.portals[1] — [1330,'field'].
const PORTAL_EAST_X_PX := 1330.0
## field에서 건너올 때 도착하는 자리 — 문 한 걸음 안쪽.
const ARRIVAL_FROM_FIELD_X_PX := 1250.0

## data-side.js heodo.portals[0] — [70,'sinya'].
const PORTAL_WEST_X_PX := 70.0
## 신야성에서 건너올 때 도착하는 자리 — +80px 관례.
const ARRIVAL_FROM_SINYA_X_PX := 150.0

## data-side.js heodo.npcs의 'merchant' 항목 — 자리(x)는 원작에 없어
## (npcs 배열이 [x, key] 쌍인데 원문 그대로 옮기면 220px, 첫 NPC 자리에
## merchant가 없다 — merchant는 두 번째 [620,'healer']가 아니라
## npcs:[[220,'merchant'],...]의 첫 자리다, 그대로 옮긴다).
const MERCHANT_X_PX := 220.0


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


static func arrival_from_field_m() -> float:
	return ARRIVAL_FROM_FIELD_X_PX * SCALE


static func portal_west_m() -> float:
	return PORTAL_WEST_X_PX * SCALE


static func arrival_from_sinya_m() -> float:
	return ARRIVAL_FROM_SINYA_X_PX * SCALE


static func merchant_position_m() -> float:
	return MERCHANT_X_PX * SCALE
