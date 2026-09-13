class_name FieldMap
extends RefCounted

## VERTICAL_SLICE_STORY.md 1절 — 웹판 `saga-story/js/data-side.js`
## STAGES의 'field'(허창 들판) 항목을 그대로 옮긴다(발판·줄 좌표·
## enemyLv 값 하나 안 바꿈). 웹은 화면 픽셀 좌표(y는 아래로 증가,
## floor=560이 바닥)라 Godot 미터로 **스케일만** 바꿔 옮긴다.
##
## SCALE=0.02(50px≈1m) — VERTICAL_SLICE_STORY.md 2절이 다시 잡은 점프
## 높이(≈3m)를 웹의 점프 높이(JUMP²/(2·GRAV)≈152px)와 맞춰 역산한 값
## (152px × 0.02 ≈ 3.0m). 정확한 도출식이 아니라 "같은 만큼 뛰어
## 보인다"는 느낌만 지키는 근사치다(DUNGEON 카메라 각도를 다시 잡을
## 때와 같은 방식, 원문 그대로 이식하지 않는다).
##
## **재해석(1절 "제외" 목록)** — 문(portal)·채집(gathers)·보스는 이번
## 슬라이스에 안 옮긴다. 잡졸 스폰은 원작의 "spawn:7"(전투 중 무작위
## 보충)이 아니라 **고정된 자리 셋**으로 단순화했다 — day/파도 시스템
## 자체가 이번 슬라이스 밖이다.
##
## **2026-09-12 추가 — 사다리(로프 나머지 넷).** VERTICAL_SLICE_STORY.md
## 1절이 "줄 이동 하나만"으로 좁혔던 것을 마저 채운다 — data-side.js
## field.ropes 다섯 다 옮겼다(4 rope + 1 ladder, 좌표·kind 안 바꿈).
## 각 줄의 top이 그 옆 platform의 y와 정확히 같다 — 발판마다 전용
## 오름길이 하나씩 있는 구조였다(원작 그대로, 새로 지어낸 배치 아님).
## kind는 물리(오르내리기)엔 안 쓴다 — side.js도 `kind: r[3] || 'rope'`를
## 렌더링에만 쓰고 등반 로직은 rope/ladder를 안 가른다(같은 Area3D
## 판정, story_player.gd 변경 없음) — story_terrain_builder.gd가 시각만
## 다르게 그린다(사다리는 세로 기둥 둘+가로대, 줄은 원통 하나).
##
## **2026-09-13 추가 — 필드 채집(gathers).** field_map.gd 머리말이
## "문(portal)·채집·보스는 이번 슬라이스에 안 옮긴다"고 적어 뒀던 셋 중
## 하나를 채운다 — data-side.js field.gathers 셋(전부 herb) 그대로.
##
## **2026-09-13 추가(같은 날 더) — 보스(황건 두목).** 위 셋 중 남은 하나.
## data-side.js field.boss엔 자리(x) 데이터가 없다(사냥터 오른쪽 끝을
## 지킨다는 설명뿐) — 마지막 발판(1900px)과 문(2130px, 아직 안 옮김)
## 사이로 새로 정했다. hpMul·dmgMul·cool은 원문 그대로(story_combat.gd).

const SCALE := 0.02

const WIDTH_PX := 2200.0
const FLOOR_PX := 560.0

## [x, y, w] px — 웹판 FIELDS.field.plats 그대로.
const PLATS_PX: Array = [
	[320.0, 430.0, 260.0],
	[760.0, 350.0, 220.0],
	[1180.0, 440.0, 300.0],
	[1620.0, 340.0, 240.0],
	[1900.0, 450.0, 220.0],
]

## 웹판 FIELDS.field.ropes 그대로 — [x, top_px, bottom_px, kind] 다섯.
const ROPES_PX: Array = [
	[340.0, 430.0, 560.0, "rope"],
	[790.0, 350.0, 560.0, "rope"],
	[1210.0, 440.0, 560.0, "rope"],
	[1650.0, 340.0, 560.0, "rope"],
	[1930.0, 450.0, 560.0, "ladder"],
]

## 잡졸 스폰 자리(고정 셋, 위 "재해석" 참고) — 발판 사이 평지 위주로 골랐다.
const ENEMY_X_PX: Array = [520.0, 1000.0, 1500.0]

## data-side.js FIELDS.field.gathers 그대로 — [x, kind] 셋, 전부 herb(들꽃).
const GATHERS_PX: Array = [
	[480.0, "herb"],
	[1050.0, "herb"],
	[1750.0, "herb"],
]

## data-side.js field.boss.name 그대로. 자리(x)는 원작에 없어 새로 정함(위 참고).
const BOSS_NAME := "황건 두목"
const BOSS_X_PX := 2050.0

## **2026-09-13 추가 — 사냥터별 보스 배율.** data-side.js field.boss
## 그대로(hpMul 12·dmgMul 2.0·cool 15분). 지금까지는 story_combat.gd
## BOSS_HP_MUL/BOSS_DMG_MUL/BOSS_COOL_SEC를 모든 사냥터가 같이 썼는데
## (field 값과 우연히 같았을 뿐), forest/cave/gorge가 각자 다른 배율을
## 가진 사냥터라 이 사냥터 전용 값으로 옮긴다. field는 story_combat.gd
## 값과 수치가 같다(원래 그 값의 출처가 field였다).
const BOSS_HP_MUL := 12.0
const BOSS_DMG_MUL := 2.0
const BOSS_COOL_SEC := 900.0  # 15분 * 60초

## **2026-09-13 추가 — 문(portal, 15절).** data-side.js field.portals[0]
## ([70,'heodo']) 그대로. portals[1]([2130,'gangneungjin'])은 그 사냥터가
## 아직 없어 안 옮겼었다 — **2026-09-13 추가(같은 날 더, 20절 SP 시스템
## 다음 걸음) — 강릉진을 지으며 이 동쪽 문도 마저 옮긴다.**
const PORTAL_WEST_X_PX := 70.0
## 허도에서 건너올 때 도착하는 자리 — 문 바로 앞이 아니라 한 걸음
## 안쪽으로 잡아 도착하자마자 다시 경계벽에 닿지 않게 여유를 둔다.
const ARRIVAL_FROM_HEODO_X_PX := 150.0

const PORTAL_EAST_X_PX := 2130.0
## 강릉진에서 건너올 때 도착하는 자리 — 서쪽 문과 같은 "한 걸음 안쪽"
## 관례를 그대로 따르면 2050px인데, 그 값은 BOSS_X_PX와 정확히 겹친다
## (보스 자리는 원작에 없어 이 포트가 새로 정한 값이라 우연히 부딪혔다).
## story_enemy.gd의 보스 접촉 판정 반경(OVERLAP_RANGE 0.6m × BOSS_
## VISUAL_SCALE 1.6 = 0.96m)보다 확실히 먼 거리(1.2m 이상)를 두려고
## 문 쪽으로 20px만 더 붙여 2110px로 잡았다(보스(2050px)와 60px=1.2m
## 차이 — 도착하자마자 겹쳐 맞는 사고를 피한다).
const ARRIVAL_FROM_GANGNEUNGJIN_X_PX := 2110.0


static func width_m() -> float:
	return WIDTH_PX * SCALE


## 바닥(floor_px) 기준 높이(m) — 값이 클수록 위(웹은 y가 작을수록 위라 뒤집는다).
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
			"bottom": height_of_px(float(r[2])),  # = 0.0(바닥)
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


static func arrival_from_heodo_m() -> float:
	return ARRIVAL_FROM_HEODO_X_PX * SCALE


static func portal_east_m() -> float:
	return PORTAL_EAST_X_PX * SCALE


static func arrival_from_gangneungjin_m() -> float:
	return ARRIVAL_FROM_GANGNEUNGJIN_X_PX * SCALE
