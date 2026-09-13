class_name GangneungjinMap
extends RefCounted

## VERTICAL_SLICE_STORY.md 20절(SP 시스템) 다음 걸음 — 나머지 사냥터
## 8곳 중 둘째: 웹판 `saga-story/js/data-side.js` STAGES의 'gangneungjin'
## (강릉진) 항목. heodo_map.gd와 같은 패턴(town:true — spawn:0, 적·
## 채집·보스가 없다) — 발판·줄 좌표만 SCALE(0.02)로 옮긴다.
##
## **재해석** — 원작 portals는 [[70,'field'],[1230,'forest']] 둘이지만,
## 오림 숲(forest)은 이 슬라이스 범위 밖(나머지 사냥터 8곳 중 남은
## 항목)이라 동쪽 문은 안 옮긴다 — heodo_map.gd가 신야성(sinya) 문을
## 미뤄 둔 것과 같은 이유·같은 자리(경계벽만 있는 막다른 길로 남는다).
##
## 원작 npcs([[220,'guard'],[620,'elder'],[980,'merchant']])는 이 슬라이스
## 범위 밖 — 상점·전직은 이미 허도 하나에만 있는 것으로 좁혀 뒀다(14·15절
## "재해석", 마을이 여럿이어도 기능은 허도에 몰아 둔다는 결정을 그대로
## 따른다). 이 마을은 지나가는 길목(field↔forest 사이 중계지)일 뿐이다.

const SCALE := 0.02

const WIDTH_PX := 1300.0
const FLOOR_PX := 560.0

## [x, y, w] px — 웹판 STAGES.gangneungjin.plats 그대로.
const PLATS_PX: Array = [
	[400.0, 420.0, 240.0],
	[820.0, 360.0, 220.0],
]

## 웹판 STAGES.gangneungjin.ropes 그대로 — [x, top_px, bottom_px, kind] 둘.
const ROPES_PX: Array = [
	[420.0, 420.0, 560.0, "ladder"],
	[840.0, 360.0, 560.0, "rope"],
]

## data-side.js gangneungjin.portals[0] — [70,'field']. portals[1]
## ([1230,'forest'])은 위 머리말 참고, 안 옮긴다.
const PORTAL_WEST_X_PX := 70.0
## field에서 건너올 때 도착하는 자리 — heodo_map.gd arrival_from_field
## 와 같은 +80px 관례(서쪽 문 바로 앞이 아니라 한 걸음 안쪽).
const ARRIVAL_FROM_FIELD_X_PX := 150.0


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


static func arrival_from_field_m() -> float:
	return ARRIVAL_FROM_FIELD_X_PX * SCALE
