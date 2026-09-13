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

## side.js GATHER_R=50px·GATHER_RESPAWN=45초(§136-137) 그대로 — field_map.gd
## SCALE(0.02)로 미터 환산. 필드 채집(허브 등) 판정 반경·되돋는 시간.
const GATHER_RADIUS_M := 1.0  # 50px * 0.02
const GATHER_RESPAWN_SEC := 45.0

## data-side.js GATHERS 표 — 이 슬라이스는 field.gathers가 전부 herb라
## 이 하나만 옮긴다(다른 사냥터가 늘어나면 berry/ore/cinder도 추가).
const GATHER_INFO := {
	"herb": {"name": "들꽃", "emoji": "🌼"},
}

## data-side.js field.boss(황건 두목) — hpMul 12·dmgMul 2.0·cool 15(분) 그대로.
## DMG_MUL은 2026-09-13(반격 추가)부터 실제로 쓰인다(story_enemy.gd
## `_physics_process()` — ENEMY_DMG에 곱한다).
const BOSS_HP_MUL := 12.0
const BOSS_DMG_MUL := 2.0
const BOSS_COOL_SEC := 900.0  # 15분 * 60초

## **2026-09-13 추가 — 장비(1절 "제외" 목록의 "장비/노획").** 처음엔
## 무기 한 자리(목검)만 옮겼다가, 같은 날 이어서 **10부위 tier1 전부**로
## 넓혔다 — data-gear.js RAW에서 need:1인 물건 정확히 열 개(부위마다
## 하나씩). 이 슬라이스는 `field`(lv1) 하나뿐이라 need>1인 물건은
## 애초에 못 낀다 — tier2~4·주문서·고유(unique)·상점은 여전히 범위
## 밖(그 부분만 남은 "장비 나머지"). gear.js `rollDrop()`의 gearRate
## (잡졸 0.035·보스 0.9)도 그대로.
##
## 가방이 없어 DUNGEON loot_pickup.gd처럼 **줍는 즉시 장착** — 부위별로
## 하나씩만 낄 수 있어(이미 그 부위를 꼈으면 같은 물건이 다시 안 뜬다)
## 드롭 풀은 "아직 안 낀 부위"로만 좁힌다(원작은 가방+판매가 있어 중복을
## 허용하지만, 단일 슬롯 포트에선 의미가 없어 새로 정한 규칙).
## price는 data-gear.js RAW의 7번째 칸(그 물건 하나뿐이라 gear.js priceMul()
## 같은 배수는 안 건드림) — story_merchant.gd가 그대로 읽는다.
const GEAR_ITEMS := {
	"sword1": {"slot": "weapon",   "name": "목검(木劍)",   "atk": 4.0, "def": 0.0, "hp": 0.0, "price": 240},
	"hat1":   {"slot": "hat",      "name": "가죽 두건",    "atk": 0.0, "def": 2.0, "hp": 6.0, "price": 180},
	"top1":   {"slot": "top",      "name": "무명 저고리",  "atk": 0.0, "def": 3.0, "hp": 10.0, "price": 220},
	"bot1":   {"slot": "bottom",   "name": "무명 바지",    "atk": 0.0, "def": 2.0, "hp": 8.0, "price": 160},
	"shoe1":  {"slot": "shoes",    "name": "짚신",         "atk": 0.0, "def": 1.0, "hp": 4.0, "price": 120},
	"glv1":   {"slot": "glove",    "name": "무명 팔찌",    "atk": 1.0, "def": 1.0, "hp": 2.0, "price": 200},
	"cap1":   {"slot": "cape",     "name": "베 망토",      "atk": 0.0, "def": 1.0, "hp": 8.0, "price": 150},
	"ring1":  {"slot": "ring",     "name": "무명 지환",    "atk": 2.0, "def": 0.0, "hp": 3.0, "price": 160},
	"neck1":  {"slot": "necklace", "name": "나무 목걸이",  "atk": 0.0, "def": 1.0, "hp": 6.0, "price": 150},
	"ear1":   {"slot": "earring",  "name": "나무 귀걸이",  "atk": 1.0, "def": 1.0, "hp": 2.0, "price": 150},
}
const GEAR_DROP_CHANCE_GRUNT := 0.035
const GEAR_DROP_CHANCE_BOSS := 0.9

## **2026-09-13 추가 — 상점(1절 "제외" 목록 "장비 나머지"의 첫 걸음).**
## side.js kill()의 금 계산 그대로: gold = round((6+lv*3)*(0.8~1.4)*mul*
## GAIN_GOLD). lv는 이 슬라이스가 늘 1(field.enemyLv, ENEMY_HP/DMG와 같은
## 전제) · GAIN_GOLD(core.tuned 기본 배수)는 1.0 그대로(손잡이 자체를 아직
## 안 옮겼다). mul은 보스 12·그 외 1.
const ENEMY_GOLD_BASE := 6.0
const ENEMY_GOLD_PER_LV := 3.0
const ENEMY_LV := 1.0
const BOSS_GOLD_MUL := 12.0
const GAIN_GOLD := 1.0

## side.js hurtMe()가 쓰는 gear.js cut(def) 그대로: min(0.6, def/(def+40)).
## amount *= (1 - cut) 형태로 적용한다 — story_player.gd take_damage() 참고.
static func damage_cut(def: float) -> float:
	if def <= 0.0:
		return 0.0
	return minf(0.6, def / (def + 40.0))


## 낀 물건 키 목록(equipped.values())에서 atk/def/hp 합을 뽑는다 —
## power()의 gearBonus()와 같은 자리(story_player.gd·story_save_state.gd
## 둘 다 이 셋을 쓴다).
static func gear_totals(equipped_keys: Array) -> Dictionary:
	var atk := 0.0
	var def := 0.0
	var hp := 0.0
	for key: String in equipped_keys:
		var it: Dictionary = GEAR_ITEMS.get(key, {})
		atk += float(it.get("atk", 0.0))
		def += float(it.get("def", 0.0))
		hp += float(it.get("hp", 0.0))
	return {"atk": atk, "def": def, "hp": hp}


## side.js kill()의 gold 계산 그대로(위 상수 참고) — Math.round와 같게
## roundi를 쓴다.
static func roll_gold(is_boss: bool) -> int:
	var mul: float = BOSS_GOLD_MUL if is_boss else 1.0
	var variance: float = 0.8 + randf() * 0.6
	return roundi((ENEMY_GOLD_BASE + ENEMY_LV * ENEMY_GOLD_PER_LV) * variance * mul * GAIN_GOLD)


## **2026-09-13 추가 — 전직 트리(4절 "제외" 목록)의 첫 걸음: 레벨/경험치.**
## 원작(`data-job.js`)의 전직은 레벨 문턱(1차 Lv.10)에 걸려 있는데, 이
## 슬라이스는 지금까지 레벨이 늘 1로 고정이었다(story_save_state.gd의
## `level`/`exp` 필드는 세이브 스키마에만 있고 아무도 안 채웠다) — 그래서
## 전직 자체보다 먼저 이 밑바탕을 채운다. `core.js` `gainExp()`/`expNeed()`
## 그대로: 경험치는 랜덤 없이 결정적(금과 달리 variance가 없다).
const EXP_BASE := 50.0
const EXP_GROWTH := 1.28
const ENEMY_EXP_BASE := 6.0
const ENEMY_EXP_PER_LV := 4.0
const BOSS_EXP_MUL := 15.0
const GAIN_EXP := 1.0

## core.js expNeed(level) = round(50 * 1.28^(level-1)) 그대로.
static func exp_need(level: int) -> int:
	return roundi(EXP_BASE * pow(EXP_GROWTH, float(level - 1)))


## core.js kill()의 gainExp 호출 인자 그대로: (6+lv*4)*(boss?15:1)*GAIN_EXP.
static func enemy_exp(is_boss: bool) -> int:
	var mul: float = BOSS_EXP_MUL if is_boss else 1.0
	return roundi((ENEMY_EXP_BASE + ENEMY_LV * ENEMY_EXP_PER_LV) * mul * GAIN_EXP)


## **1차 전직(Lv.10) 넷** — data-job.js JOBS tier:1 그대로(grow만 옮긴다,
## 그 자리에서 새로 열리는 무예 넷씩(총 16개)은 범위 밖 — 다음 걸음).
## key: {name, grow:{hp,atk,mp}}.
const JOBS_TIER1 := {
	"warrior": {"name": "무사(武士)", "hp": 40.0, "atk": 2.0, "mp": 0.0},
	"archer":  {"name": "궁수(弓手)", "hp": 10.0, "atk": 5.0, "mp": 0.0},
	"rogue":   {"name": "협객(俠客)", "hp": 18.0, "atk": 4.0, "mp": 0.0},
	"mage":    {"name": "방사(方士)", "hp": 12.0, "atk": 3.0, "mp": 40.0},
}
const JOB_CHANGE_LEVEL := 10

## **2026-09-13 추가(같은 날 더) — 전직 트리 다음 걸음: 무사(warrior)
## 무예 넷.** data-job.js SKILLS job:'warrior' 넷(w_cut/w_whirl/w_rush/
## w_iron).
##
## w_whirl의 r:128px는 SWEEP_RANGE_MUL(117/78=1.5)과 같은 방식으로
## REACH(78px, story_player.gd ATTACK_RANGE 자리)비로 옮긴다: 128/78.
## w_rush의 dist:210px는 SCALE(field_map.gd와 같은 0.02)로 미터 환산.
##
## **2026-09-13 추가(같은 날 더 더) — SP(무예 점수) 투자 시스템.**
## 지금까지 `FIXED_SKILL_LEVEL`(5, 임의의 중간값)로 mul을 고정해 뒀던 것을
## 실제 투자 레벨로 바꾼다 — `data-job.js` 머리말의 "레벨마다 3점을 찍어
## 무예를 0~10으로 올린다"를 `StorySaveState.skills`(key→레벨)로 옮기고,
## `job.js` `mulOf()`(mul[0]+mul[1]*max(0,lv-1))의 재해석을 그대로
## 이어간다 — 이 포트는 처음부터 (lv-1)이 아니라 lv를 그대로 곱하는
## 결로 갔었으니(과거 FIXED_SKILL_LEVEL 주석들) 그 관례를 유지한다:
## `skill_mul(base, per, lv) = base + per*lv`. **투자 0(안 배운 무예)은
## 아예 못 쓴다** — 원작 `job.js bar()`가 "찍은 것만" 조작 띠에 놓는 것과
## 같은 자리(story_player.gd 각 `_cast_*` 함수 맨 앞에서 확인).
const SKILL_MAX_LEVEL := 10
const SP_PER_LEVEL := 3  # data-job.js SP_PER_LEVEL 그대로

## key → job. StorySaveState.can_raise_skill()이 "이 직업의 무예가
## 맞는지" 확인할 때 쓴다(job.js canRaise()의 `JD.skillsOf(job)` 자리).
const SKILL_JOB := {
	"w_cut": "warrior", "w_whirl": "warrior", "w_rush": "warrior", "w_iron": "warrior",
	"a_shot": "archer", "a_double": "archer", "a_pierce": "archer", "a_eye": "archer",
	"r_twin": "rogue", "r_knife": "rogue", "r_step": "rogue", "r_vital": "rogue",
	"m_fire": "mage", "m_bolt": "mage", "m_heal": "mage", "m_talis": "mage",
}

## job → 그 직업 무예 넷의 key(입력 액션 story_job_skill_1~4·story_job_1~4
## 순서와 정확히 같다) — story_job_trainer.gd의 SP 투자 배선이 쓴다.
const JOB_SKILL_KEYS := {
	"warrior": ["w_cut", "w_whirl", "w_rush", "w_iron"],
	"archer": ["a_shot", "a_double", "a_pierce", "a_eye"],
	"rogue": ["r_twin", "r_knife", "r_step", "r_vital"],
	"mage": ["m_fire", "m_bolt", "m_heal", "m_talis"],
}


## job.js mulOf()의 이 포트 재해석 — base + per*lv(레벨 0이면 0, 호출
## 쪽이 먼저 "안 배웠으면 캐스팅 자체를 막는다"로 걸러 둔다).
static func skill_mul(base: float, per: float, level: int) -> float:
	return base + per * float(level)


const WARRIOR_CUT_COST := 6.0
const WARRIOR_CUT_CD := 0.5
const WARRIOR_CUT_BASE := 1.15
const WARRIOR_CUT_PER := 0.09  # 레벨10에서 2.05

const WARRIOR_WHIRL_COST := 20.0
const WARRIOR_WHIRL_CD := 3.6
const WARRIOR_WHIRL_BASE := 1.6
const WARRIOR_WHIRL_PER := 0.14
const WARRIOR_WHIRL_RANGE_MUL := 128.0 / 78.0

const WARRIOR_RUSH_COST := 24.0
const WARRIOR_RUSH_CD := 6.0
const WARRIOR_RUSH_BASE := 1.8
const WARRIOR_RUSH_PER := 0.16
const WARRIOR_RUSH_DIST_PX := 210.0
const WARRIOR_RUSH_SCALE := 0.02  # field_map.gd SCALE과 같다

const WARRIOR_IRON_COST := 28.0
const WARRIOR_IRON_CD := 16.0
const WARRIOR_IRON_SEC := 9.0
const WARRIOR_IRON_ATK_MUL := 1.2
const WARRIOR_IRON_GUARD := 0.35


static func warrior_rush_dist_m() -> float:
	return WARRIOR_RUSH_DIST_PX * WARRIOR_RUSH_SCALE


## **2026-09-13 추가(같은 날 더) — 전직 트리 다음 걸음: 궁수(archer)
## 무예 넷.** data-job.js SKILLS job:'archer' 넷(a_shot/a_double/
## a_pierce/a_eye) — 무사와 같은 FIXED_SKILL_LEVEL(5)로 mul 고정.
##
## effect 문자열이 무사 넷과 다르다('arrow'/'volley'는 이 포트에 처음
## 등장) — 둘 다 원문에 사거리(r/dist)가 없어(무사 참격과 같은 자리)
## **정면 판정+ATTACK_RANGE**로 좁힌다(활이라고 사거리를 늘리는 건 새
## 숫자를 상상하는 것이라 안 한다). a_pierce는 원문 effect가 이미
## 'bolt'라 기탄(BOLT_RANGE_MUL)과 같은 결로 사거리를 2배 늘린다 — 새
## 상수가 아니라 같은 재해석을 archer 몫으로 하나 더 둔 것뿐.
const ARCHER_SHOT_COST := 8.0
const ARCHER_SHOT_CD := 0.6
const ARCHER_SHOT_BASE := 1.3
const ARCHER_SHOT_PER := 0.11

## a_double(연사) — 원문 effect:'volley', shots:3(화살 셋을 잇달아).
## 투사체가 없어 "정면 판정을 세 번 잇달아 적용"으로 재해석(w_whirl이
## aoe를 한 번 도는 것과 같은 결 — 여러 번의 개별 roll_damage를 그대로
## 잇는다, 새 효과를 안 만든다).
const ARCHER_DOUBLE_COST := 22.0
const ARCHER_DOUBLE_CD := 3.4
const ARCHER_DOUBLE_BASE := 1.1
const ARCHER_DOUBLE_PER := 0.08
const ARCHER_DOUBLE_SHOTS := 3

const ARCHER_PIERCE_COST := 26.0
const ARCHER_PIERCE_CD := 6.0
const ARCHER_PIERCE_BASE := 2.0
const ARCHER_PIERCE_PER := 0.18
const ARCHER_PIERCE_RANGE_MUL := 2.0  # BOLT_RANGE_MUL과 같은 재해석, archer 몫

## a_eye(응안) — buff. sec:9·atk×1.4 원문 그대로(레벨로 안 오르는 buff
## 필드, 철갑과 같은 결 — WARRIOR_IRON_ATK_MUL도 FIXED_SKILL_LEVEL을
## 안 곱한다). guard 성분은 원문에 없다(철갑만의 것).
const ARCHER_EYE_COST := 30.0
const ARCHER_EYE_CD := 16.0
const ARCHER_EYE_SEC := 9.0
const ARCHER_EYE_ATK_MUL := 1.4


## **2026-09-13 추가(같은 날 더) — 전직 트리 다음 걸음: 협객(rogue)
## 무예 넷.** data-job.js SKILLS job:'rogue' 넷(r_twin/r_knife/r_step/
## r_vital) — 같은 FIXED_SKILL_LEVEL(5).
##
## r_twin은 원문 effect가 이미 'melee'에 hits:2 — a_double(volley)과
## 같은 재해석(정면 판정을 그 횟수만큼 잇달아 적용)을 그대로 재사용,
## 새 효과를 안 만든다.
const ROGUE_TWIN_COST := 7.0
const ROGUE_TWIN_CD := 0.42
const ROGUE_TWIN_BASE := 0.72
const ROGUE_TWIN_PER := 0.06
const ROGUE_TWIN_HITS := 2

const ROGUE_KNIFE_COST := 18.0
const ROGUE_KNIFE_CD := 2.6
const ROGUE_KNIFE_BASE := 1.0
const ROGUE_KNIFE_PER := 0.09
const ROGUE_KNIFE_SHOTS := 2

## r_step(은신보) — dash, dist:260px + **invuln:0.7(이 포트에 처음
## 등장)**. side.js dash 처리(`p.invuln = Math.max(p.invuln, sk.invuln)`,
## hurtMe()가 invuln>0이면 피해를 통째로 무시)를 story_player.gd의 공용
## `_invuln_time_left`로 옮긴다 — take_damage()가 그 값이 0보다 크면
## 방어 컷 계산 전에 그냥 무시한다. dist는 WARRIOR_RUSH_SCALE(0.02, 같은
## field_map.gd SCALE)로 미터 환산.
const ROGUE_STEP_COST := 22.0
const ROGUE_STEP_CD := 7.0
const ROGUE_STEP_BASE := 1.2
const ROGUE_STEP_PER := 0.1
const ROGUE_STEP_DIST_PX := 260.0
const ROGUE_STEP_INVULN_SEC := 0.7

const ROGUE_VITAL_COST := 26.0
const ROGUE_VITAL_CD := 15.0
const ROGUE_VITAL_SEC := 8.0
const ROGUE_VITAL_ATK_MUL := 1.55


static func rogue_step_dist_m() -> float:
	return ROGUE_STEP_DIST_PX * WARRIOR_RUSH_SCALE


## **2026-09-13 추가(같은 날 더) — 전직 트리 다음 걸음: 방사(mage)
## 무예 넷.** data-job.js SKILLS job:'mage' 넷(m_fire/m_bolt/m_heal/
## m_talis) — 같은 FIXED_SKILL_LEVEL(5).
##
## m_fire는 원문 effect가 이미 'bolt' — 기탄·관통시와 같은 재해석(사거리
## 2배). m_bolt(aoe, r:165px)는 선풍(w_whirl)과 같은 결로 REACH(78px)비를
## 옮긴다(165/78).
const MAGE_FIRE_COST := 12.0
const MAGE_FIRE_CD := 0.9
const MAGE_FIRE_BASE := 1.5
const MAGE_FIRE_PER := 0.13
const MAGE_FIRE_RANGE_MUL := 2.0  # BOLT_RANGE_MUL과 같은 재해석, mage 몫

const MAGE_BOLT_COST := 26.0
const MAGE_BOLT_CD := 4.0
const MAGE_BOLT_BASE := 1.9
const MAGE_BOLT_PER := 0.17
const MAGE_BOLT_RANGE_MUL := 165.0 / 78.0

## m_heal(치유) — **이 포트에 처음 등장하는 effect:'heal'.** side.js
## heal 처리(`pct = heal[0] + heal[1]*max(0,lv-1); hp = min(hpMax, hp +
## round(hpMax*pct))`) 그대로 옮기되, mul과 같은 결로 레벨을 직접 곱한다
## (skill_mul()과 같은 공식 — heal도 새 규칙을 따로 안 만든다).
const MAGE_HEAL_COST := 34.0
const MAGE_HEAL_CD := 11.0
const MAGE_HEAL_BASE := 0.18
const MAGE_HEAL_PER := 0.022

## m_talis(부적) — buff, sec:10·atk×1.25·**regen:2.6(이 포트에 처음
## 등장 — MP 회복 속도 배율)** 원문 그대로. side.js MP_REGEN*bf.regen과
## 같은 자리를 story_player.gd `_physics_process()`의 mp 회복 줄에 얹는다.
const MAGE_TALIS_COST := 30.0
const MAGE_TALIS_CD := 16.0
const MAGE_TALIS_SEC := 10.0
const MAGE_TALIS_ATK_MUL := 1.25
const MAGE_TALIS_REGEN_MUL := 2.6


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
