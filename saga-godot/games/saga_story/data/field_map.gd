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
## **재해석(1절 "제외" 목록)** — 사다리(ladder)·문(portal)·채집
## (gathers)·보스는 이번 슬라이스에 안 옮긴다. 줄(rope)은 다섯 중
## **첫째 하나만** 옮긴다. 잡졸 스폰은 원작의 "spawn:7"(전투 중 무작위
## 보충)이 아니라 **고정된 자리 셋**으로 단순화했다 — day/파도 시스템
## 자체가 이번 슬라이스 밖이다.

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

## 웹판 ropes[0] = [340, 430, 560, 'rope'] — kind가 'rope'인 것 중 첫째.
const ROPE_TOP_PX := 430.0
const ROPE_BOTTOM_PX := 560.0
const ROPE_X_PX := 340.0

## 잡졸 스폰 자리(고정 셋, 위 "재해석" 참고) — 발판 사이 평지 위주로 골랐다.
const ENEMY_X_PX: Array = [520.0, 1000.0, 1500.0]


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


static func rope_m() -> Dictionary:
	return {
		"x": ROPE_X_PX * SCALE,
		"top": height_of_px(ROPE_TOP_PX),
		"bottom": height_of_px(ROPE_BOTTOM_PX),  # = 0.0(바닥)
	}


static func enemy_positions_m() -> Array:
	var out: Array = []
	for x: float in ENEMY_X_PX:
		out.append(x * SCALE)
	return out
