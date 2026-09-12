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
