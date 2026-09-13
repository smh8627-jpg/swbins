class_name GorgeMap
extends RefCounted

## VERTICAL_SLICE_STORY.md 22절 다음 걸음 — 나머지 사냥터 8곳 중
## 일곱째(문 있는 곳으로는 마지막): 웹판 STAGES의 'gorge'(호로곡) 항목 —
## 원작에서 "갈래의 끝"(3차 전직 Lv.45가 서는 가장 깊은 사냥터). cave/
## forest와 같은 패턴(진짜 전투 사냥터), 발판이 여덟으로 가장 많다.
##
## **재해석** — forest/cave_map.gd와 같은 셋(잡졸 스폰 고정 셋·몬스터
## 종류 미이식·보스 배율은 field 상수 재사용). 원작 portals는 서쪽
## ([70,'gisanchae']) 하나뿐 — "갈래의 끝"이라 동쪽 문 자체가 없다
## (경계벽이 그 자리를 막는다).

const SCALE := 0.02

const WIDTH_PX := 3400.0
const FLOOR_PX := 560.0

## [x, y, w] px — 웹판 STAGES.gorge.plats 그대로(여덟).
const PLATS_PX: Array = [
	[260.0, 480.0, 200.0],
	[600.0, 400.0, 180.0],
	[940.0, 310.0, 200.0],
	[1300.0, 420.0, 180.0],
	[1640.0, 330.0, 200.0],
	[2000.0, 250.0, 180.0],
	[2360.0, 400.0, 220.0],
	[2740.0, 320.0, 200.0],
]

## 웹판 STAGES.gorge.ropes 그대로(여덟).
const ROPES_PX: Array = [
	[285.0, 480.0, 560.0, "rope"],
	[630.0, 400.0, 560.0, "ladder"],
	[970.0, 310.0, 560.0, "rope"],
	[1330.0, 420.0, 560.0, "rope"],
	[1670.0, 330.0, 560.0, "ladder"],
	[2030.0, 250.0, 560.0, "rope"],
	[2390.0, 400.0, 560.0, "ladder"],
	[2770.0, 320.0, 560.0, "rope"],
]

## 잡졸 스폰 자리(고정 셋) — 발판 사이, 채집·보스와 안 겹치게.
const ENEMY_X_PX: Array = [1100.0, 2100.0, 3100.0]

## data-side.js STAGES.gorge.gathers 그대로 — [x, kind] 셋, 전부 cinder(그은 돌).
const GATHERS_PX: Array = [
	[700.0, "cinder"],
	[1800.0, "cinder"],
	[2900.0, "cinder"],
]

## data-side.js gorge.boss.name 그대로. 자리(x)는 원작에 없어 새로 정함 —
## 동쪽 문이 아예 없어 field/forest/cave처럼 도착 지점과의 간격을
## 걱정할 필요가 없었다(마지막 발판(2740px) 너머, 채집 마지막 자리와
## 350px=7m 떨어뜨렸다).
const BOSS_NAME := "적국 대장군"
const BOSS_X_PX := 3250.0

const PORTAL_WEST_X_PX := 70.0
## 기산채에서 건너올 때 도착하는 자리 — +80px 관례.
const ARRIVAL_FROM_GISANCHAE_X_PX := 150.0


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


static func enemy_positions_m() -> Array:
	var out: Array = []
	for x: float in ENEMY_X_PX:
		out.append(x * SCALE)
	return out


static func gather_positions_m() -> Array:
	var out: Array = []
	for g: Array in GATHERS_PX:
		out.append({"x": float(g[0]) * SCALE, "kind": String(g[1])})
	return out


static func boss_position_m() -> float:
	return BOSS_X_PX * SCALE


static func portal_west_m() -> float:
	return PORTAL_WEST_X_PX * SCALE


static func arrival_from_gisanchae_m() -> float:
	return ARRIVAL_FROM_GISANCHAE_X_PX * SCALE
