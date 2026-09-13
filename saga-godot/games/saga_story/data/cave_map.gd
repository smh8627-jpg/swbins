class_name CaveMap
extends RefCounted

## VERTICAL_SLICE_STORY.md 22절 다음 걸음 — 나머지 사냥터 8곳 중
## 다섯째: 웹판 STAGES의 'cave'(한중 굴혈) 항목. forest_map.gd와 같은
## 패턴(진짜 전투 사냥터). mood:'cave'(어두운 배경)는 story_background.gd
## 팔레트가 아직 이름별로 안 갈려 있어(field/forest 전부 같은 하늘)
## 이번 슬라이스는 지형·전투만 옮기고 배경 분위기는 범위 밖으로 둔다.
##
## **재해석** — forest_map.gd 머리말과 같은 셋:
##   - 잡졸 스폰(원작 spawn:11) → 고정 자리 셋.
##   - 몬스터 종류(`data-enemy.js` tierOf(14)의 "정규군" 풀)는 아직 안
##     옮긴다 — 여전히 잡졸(황건적) 하나뿐(몬스터 도감은 범위 밖).
##   - 보스(위군 도독)도 이름만 원문, hpMul·dmgMul·cool은 story_combat.gd
##     의 field용 상수 재사용.
##
## **문** — 서쪽(70px)은 남정성, 동쪽(2930px)은 기산채로 이번에 둘 다
## 연다(기산채도 이 절에서 같이 짓는다).

const SCALE := 0.02

const WIDTH_PX := 3000.0
const FLOOR_PX := 560.0

## [x, y, w] px — 웹판 STAGES.cave.plats 그대로.
const PLATS_PX: Array = [
	[300.0, 470.0, 240.0],
	[700.0, 390.0, 200.0],
	[1080.0, 300.0, 240.0],
	[1460.0, 400.0, 220.0],
	[1840.0, 320.0, 240.0],
	[2240.0, 440.0, 300.0],
]

## 웹판 STAGES.cave.ropes 그대로.
const ROPES_PX: Array = [
	[325.0, 470.0, 560.0, "ladder"],
	[730.0, 390.0, 560.0, "ladder"],
	[1110.0, 300.0, 560.0, "ladder"],
	[1490.0, 400.0, 560.0, "rope"],
	[1870.0, 320.0, 560.0, "ladder"],
	[2270.0, 440.0, 560.0, "ladder"],
]

## 잡졸 스폰 자리(고정 셋) — 발판 사이 평지 위주, 채집·보스 자리와 안 겹치게.
const ENEMY_X_PX: Array = [900.0, 1700.0, 2400.0]

## data-side.js STAGES.cave.gathers 그대로 — [x, kind] 셋, 전부 ore(이끼 광물).
const GATHERS_PX: Array = [
	[500.0, "ore"],
	[1500.0, "ore"],
	[2500.0, "ore"],
]

## data-side.js cave.boss.name 그대로. 자리(x)는 원작에 없어 새로 정함 —
## 표준 -80px 관례로 동쪽 문 도착 자리(2850px)를 잡아도 이 값(2600px)과
## 250px(5.0m) 떨어져 있어 field/forest처럼 특별히 당길 필요가 없었다.
const BOSS_NAME := "위군 도독"
const BOSS_X_PX := 2600.0

## **2026-09-13 추가 — 사냥터별 보스 배율.** data-side.js cave.boss
## 그대로(hpMul 17·dmgMul 2.5·cool 30분).
const BOSS_HP_MUL := 17.0
const BOSS_DMG_MUL := 2.5
const BOSS_COOL_SEC := 1800.0  # 30분 * 60초

const PORTAL_WEST_X_PX := 70.0
## 남정성에서 건너올 때 도착하는 자리 — +80px 관례.
const ARRIVAL_FROM_NAMJEONGSEONG_X_PX := 150.0

const PORTAL_EAST_X_PX := 2930.0
## 기산채에서 건너올 때 도착하는 자리 — -80px 관례(보스와 5.0m 떨어져 안전).
const ARRIVAL_FROM_GISANCHAE_X_PX := 2850.0


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


static func boss_hp_mul() -> float:
	return BOSS_HP_MUL


static func boss_dmg_mul() -> float:
	return BOSS_DMG_MUL


static func boss_cool_sec() -> float:
	return BOSS_COOL_SEC


static func portal_west_m() -> float:
	return PORTAL_WEST_X_PX * SCALE


static func arrival_from_namjeongseong_m() -> float:
	return ARRIVAL_FROM_NAMJEONGSEONG_X_PX * SCALE


static func portal_east_m() -> float:
	return PORTAL_EAST_X_PX * SCALE


static func arrival_from_gisanchae_m() -> float:
	return ARRIVAL_FROM_GISANCHAE_X_PX * SCALE
