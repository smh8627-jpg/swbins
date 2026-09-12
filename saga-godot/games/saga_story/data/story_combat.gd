class_name StoryCombat
extends RefCounted

## VERTICAL_SLICE_STORY.md 3절 — 웹판 `side.js`의 전투 판정. 급소(crit)·
## 경직(히트스톱) 상수는 원문 그대로(critRate 0.15·critMul 1.6·
## freeze 0.055초 — `core.tuned` 기본값·`game.js`의 freeze 상수).
##
## **재해석** — 웹판 `power()`는 등용한 인물(saga_core Characters,
## might/wisdom/command)에서 공격력을 뽑지만, 이 슬라이스는 아직 인물
## 로스터를 안 붙였다(VERTICAL_SLICE_STORY.md 1절 "제외" — 그건 GO의
## "등용"처럼 콘텐츠 확장 단계 몫). `side.js power()`가 인물 미선택일
## 때 쓰는 대체값(`{might:20, wisdom:10, command:15}`)을 그대로 시작
## 스탯으로 삼는다 — 새 숫자를 상상하지 않는다.

const CRIT_RATE := 0.15
const CRIT_MUL := 1.6
const HITSTOP_TIME_SCALE := 0.12
const HITSTOP_SECONDS := 0.055

## side.js power()의 might=20·wisdom=10·command=15 대체값 그대로.
## atk = might*0.9 + wisdom*0.3, hp = 60 + command*6 + level*12(레벨1 고정).
const START_ATK := 21.0  # round(20*0.9 + 10*0.3) = round(21.0)
const START_HP := 162.0  # 60 + 15*6 + 1*12

## 잡졸(황건적) — data-enemy.js 첫 항목 + side.js spawnEnemy()의
## lv=1 공식: hp=round(18*1.22^0)=18, dmg=round(4+1*1.6)=6(E_HP=E_DMG=1
## 기본값 그대로, core.tuned 안 건드림).
const ENEMY_HP := 18.0
const ENEMY_DMG := 6.0

## **2026-09-12 추가 — 무예 나머지 셋(횡소·기탄·기합).** VERTICAL_
## SLICE_STORY.md 1절 "제외" 목록의 "무예 나머지(48-1개)" 중, 무명이
## 처음부터 갖는 tier0 넷(`data-job.js` SKILLS job:'none') 나머지 셋만
## 먼저 채운다. cost·cd·mul·buff는 원문 그대로(재해석 없음). `side.js`
## MP_MAX=100·MP_REGEN=8(core.tuned('side.mpRegen', 8) 기본값) 그대로 —
## "앉아 쉬면 더 빨리 찬다"(resting 보너스)는 이번엔 안 옮긴다(입력 하나
## 더 얹는 것보다 "MP가 있어야 쓴다"는 핵심 감각부터 검증한다, 다음에
## 볼 자리).
const MP_MAX := 100.0
const MP_REGEN := 8.0  # 초당

## 횡소(橫掃) — aoe, r:117(px) = REACH(78px)*1.5. ATTACK_RANGE(2.2m,
## story_player.gd)가 REACH의 자리를 대신하므로 같은 1.5배를 그대로 곱해
## 미터로 옮긴다(원문 그대로 픽셀을 안 옮기고 "비율만" 지키는 이 포트의
## 기존 방식과 같다, VERTICAL_SLICE_STORY.md 2절).
const SWEEP_COST := 18.0
const SWEEP_CD := 4.0
const SWEEP_MUL := 1.8
const SWEEP_RANGE_MUL := 1.5  # story_player.gd ATTACK_RANGE에 곱한다

## 기탄(氣彈) — bolt(관통). 이 슬라이스엔 투사체 이동이 없어(적이 제자리에
## 서 있다, story_enemy.gd 머리말) "더 멀리 뻗는 관통 공격"으로 재해석 —
## 사거리만 늘리고(연참의 2배) 판정은 연참과 같은 정면 판정을 그대로 쓴다.
const BOLT_COST := 24.0
const BOLT_CD := 6.0
const BOLT_MUL := 2.1
const BOLT_RANGE_MUL := 2.0  # story_player.gd ATTACK_RANGE에 곱한다

## 기합(氣合) — buff. sec:8·atk×1.35·speed×1.2 원문 그대로.
const BRACE_COST := 30.0
const BRACE_CD := 14.0
const BRACE_SEC := 8.0
const BRACE_ATK_MUL := 1.35
const BRACE_SPEED_MUL := 1.2

static var _hitstop_active := false


## side.js 883줄대 hit() 그대로: atk*(mul||1)*(0.88~1.12)*(crit?1.6:1).
static func roll_damage(atk: float, mul: float = 1.0) -> Dictionary:
	var crit: bool = randf() < CRIT_RATE
	var variance: float = 0.88 + randf() * 0.24
	var dmg: float = atk * mul * variance * (CRIT_MUL if crit else 1.0)
	return {"dmg": dmg, "crit": crit}


## game.js의 freeze — 급소가 터진 순간 화면 전체가 0.055초 동안 12%
## 속도로 느려진다. Engine.time_scale은 이 저장소가 아직 안 쓰던
## 값이라(다른 판은 델타를 직접 스케일하지 않는다) 이 프로토타입에서
## 처음 쓴다 — Godot가 이미 제공하는 정확히 같은 개념이라 새로 안 짠다.
static func trigger_hitstop(tree: SceneTree) -> void:
	if _hitstop_active:
		return
	_hitstop_active = true
	Engine.time_scale = HITSTOP_TIME_SCALE
	await tree.create_timer(HITSTOP_SECONDS, true, false, true).timeout
	Engine.time_scale = 1.0
	_hitstop_active = false
