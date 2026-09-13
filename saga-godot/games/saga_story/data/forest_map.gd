class_name ForestMap
extends RefCounted

## VERTICAL_SLICE_STORY.md 21절 다음 걸음 — 나머지 사냥터 8곳 중 셋째:
## 웹판 `saga-story/js/data-side.js` STAGES의 'forest'(오림 숲) 항목.
## field_map.gd와 같은 패턴(진짜 전투 사냥터 — 잡졸·채집·보스가 있다,
## town이 아니다) — 좌표만 SCALE(0.02)로 옮긴다.
##
## **재해석** — field_map.gd 머리말과 같은 결:
##   - 잡졸 스폰(원작 spawn:9, 전투 중 무작위 보충)은 **고정된 자리
##     셋**으로 단순화(field와 같은 수 — day/파도 시스템 자체가 범위
##     밖이라 스폰 수를 원작 그대로 옮기는 의미가 없다).
##   - 몬스터 종류(data-enemy.js tierOf(6)이 주는 "변방" 풀)는 아직
##     안 옮긴다 — 이 슬라이스는 여전히 잡졸(황건적) 하나뿐이다(story_
##     enemy.gd). 여러 사냥터에 걸친 몬스터 도감은 더 큰 별도 작업 —
##     지금은 "새 사냥터가 있다"까지만 검증한다.
##   - 보스(오랑캐 족장)도 이름만 원문 그대로 옮기고(BOSS_NAME, 아직
##     화면에 안 뜬다 — field_map.gd 머리말과 같다), hpMul·dmgMul·cool은
##     story_combat.gd가 이미 갖고 있는 field용 상수를 그대로 재사용한다
##     (사냥터마다 다른 보스 배율을 도입하는 것도 몬스터 도감과 같은 결의
##     더 큰 확장 — 지금은 안 벌린다).
##
## **문** — 서쪽(70px)은 강릉진(이미 있다)으로 이번에 실제로 연결한다.
## 동쪽(2530px, 'namjeongseong')은 그 사냥터가 아직 없어 안 옮긴다
## (heodo_map.gd가 신야성 문을 미룬 것과 같은 자리).

const SCALE := 0.02

const WIDTH_PX := 2600.0
const FLOOR_PX := 560.0

## [x, y, w] px — 웹판 STAGES.forest.plats 그대로.
const PLATS_PX: Array = [
	[260.0, 450.0, 220.0],
	[620.0, 360.0, 200.0],
	[980.0, 280.0, 220.0],
	[1340.0, 380.0, 260.0],
	[1720.0, 300.0, 200.0],
	[2060.0, 430.0, 260.0],
]

## 웹판 STAGES.forest.ropes 그대로 — [x, top_px, bottom_px, kind] 여섯.
const ROPES_PX: Array = [
	[285.0, 450.0, 560.0, "rope"],
	[650.0, 360.0, 560.0, "rope"],
	[1010.0, 280.0, 560.0, "rope"],
	[1370.0, 380.0, 560.0, "ladder"],
	[1750.0, 300.0, 560.0, "rope"],
	[2090.0, 430.0, 560.0, "ladder"],
]

## 잡졸 스폰 자리(고정 셋, 위 "재해석" 참고) — 발판 사이 평지 위주.
const ENEMY_X_PX: Array = [500.0, 1200.0, 1900.0]

## data-side.js STAGES.forest.gathers 그대로 — [x, kind] 넷, 전부 berry(산딸기).
const GATHERS_PX: Array = [
	[420.0, "berry"],
	[1080.0, "berry"],
	[1780.0, "berry"],
	[2340.0, "berry"],
]

## data-side.js forest.boss.name 그대로. 자리(x)는 원작에 없어 새로
## 정함(field_map.gd BOSS_X_PX와 같은 방식) — 동쪽 문(2530px)이 아직
## 없어 field처럼 보스-도착지 간격을 미리 걱정할 필요는 없다(문을
## 나중에 놓을 때 이 값과 60px 이상 떨어뜨리면 된다, 21절 참고).
const BOSS_NAME := "오랑캐 족장"
const BOSS_X_PX := 2450.0

const PORTAL_WEST_X_PX := 70.0
## 강릉진에서 건너올 때 도착하는 자리 — heodo/gangneungjin과 같은
## +80px 관례.
const ARRIVAL_FROM_GANGNEUNGJIN_X_PX := 150.0


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


static func arrival_from_gangneungjin_m() -> float:
	return ARRIVAL_FROM_GANGNEUNGJIN_X_PX * SCALE
