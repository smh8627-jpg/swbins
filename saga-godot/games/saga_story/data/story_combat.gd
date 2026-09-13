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
## lv 공식(E_HP/E_DMG=1 기본값 그대로, core.tuned 안 건드림):
## hp=round(18*1.22^(lv-1)), dmg=round(4+lv*1.6). lv=1(field)을 넣으면
## hp=18·dmg=6 — 이 슬라이스가 처음 옮겼던 고정값과 정확히 같다(그
## 고정값의 출처가 이 공식의 lv=1 케이스였다).
##
## **2026-09-13 추가 — 몬스터 도감(사냥터별 잡졸).** 지금까지 이 lv가
## field(1) 하나로 고정이었던 것을, field/forest/cave/gorge 각 맵의
## `enemy_lv()`를 story_enemy.gd가 그대로 넘겨받아 되살린다 — side.js
## `spawnEnemy()`/`spawnBoss()`가 실제로 쓰는 것과 같은 공식이다.
static func enemy_base_hp(lv: float) -> float:
	return maxf(1.0, roundf(18.0 * pow(1.22, lv - 1.0)))


static func enemy_base_dmg(lv: float) -> float:
	return roundf(4.0 + lv * 1.6)

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
## 이 하나만 옮겼었다(다른 사냥터가 늘어나면 berry/ore/cinder도 추가).
## **2026-09-13 추가(같은 날 더, 21절 다음 걸음) — 오림 숲(berry) 추가
## 당시 emoji/name을 원문(GATHERS.berry: '덤불 열매'🍇)을 안 보고 새로
## 지어냈었다("산딸기"🍓) — **같은 날 더 더(23절), 나머지 사냥터를
## 이어 지으며 발견해 바로잡는다.** ore·cinder도 이번에 원문 그대로 채움.
const GATHER_INFO := {
	"herb": {"name": "들꽃", "emoji": "🌼"},
	"berry": {"name": "덤불 열매", "emoji": "🍇"},
	"ore": {"name": "이끼 광물", "emoji": "⛏️"},
	"cinder": {"name": "그은 돌", "emoji": "🪨"},
}

## data-side.js field.boss(황건 두목) — hpMul 12·dmgMul 2.0·cool 15(분) 그대로.
## DMG_MUL은 2026-09-13(반격 추가)부터 실제로 쓰인다(story_enemy.gd
## `_physics_process()` — ENEMY_DMG에 곱한다).
##
## **2026-09-13 추가(같은 날 더) — 사냥터별 보스 배율로 옮김.** forest/
## cave/gorge는 각자 다른 hpMul·dmgMul·cool을 가진 보스라(field_map.gd·
## forest_map.gd·cave_map.gd·gorge_map.gd의 BOSS_HP_MUL 등 참고)
## story_boss_spawner.gd가 이제 이 세 값을 안 읽는다 — 여기 남겨 둔 값은
## field와 수치가 같고, map_path 없이 만들어진 story_enemy.gd 인스턴스의
## 기본값(안전값)으로만 쓰인다.
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
## GAIN_GOLD). GAIN_GOLD(core.tuned 기본 배수)는 1.0 그대로(손잡이 자체를
## 아직 안 옮겼다). mul은 보스 12·그 외 1.
##
## **2026-09-13 추가(같은 날 더, 몬스터 도감) — lv를 인자로 받는다.**
## 지금까지 lv가 이 상수(field.enemyLv=1) 하나로 고정이었던 것을,
## story_enemy.gd가 자기 맵의 enemy_lv를 넘기도록 바꿨다(forest/cave/
## gorge 킬이 이제 그 사냥터 lv 기준 금·경험치를 준다).
const ENEMY_GOLD_BASE := 6.0
const ENEMY_GOLD_PER_LV := 3.0
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
static func roll_gold(is_boss: bool, lv: float) -> int:
	var mul: float = BOSS_GOLD_MUL if is_boss else 1.0
	var variance: float = 0.8 + randf() * 0.6
	return roundi((ENEMY_GOLD_BASE + lv * ENEMY_GOLD_PER_LV) * variance * mul * GAIN_GOLD)


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
static func enemy_exp(is_boss: bool, lv: float) -> int:
	var mul: float = BOSS_EXP_MUL if is_boss else 1.0
	return roundi((ENEMY_EXP_BASE + lv * ENEMY_EXP_PER_LV) * mul * GAIN_EXP)


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

## **2026-09-13 추가 — 2~4차 전직(job 체인 재설계).** data-job.js JOBS는
## 실제로 갈래마다(무사→장군→원수→전신 등) `from`으로 이어지는 사슬 넷
## (서로 안 섞인다)이다. `job`은 여전히 문자열 하나뿐이고(전과 같다 —
## 원작 `job.js join()`도 그냥 덮어쓴다) 대신 이 사슬 정보를 데이터로
## 들여, `job_chain()`이 "이 job이 어느 사슬 위에 있는지"를 훑을 수 있게
## 한다 — story_player.gd의 여러 `job=="warrior"` 분기가 이제 이 사슬
## 소속 여부로 바뀐다(전직해도 하위 무예를 잃지 않는다, data-job.js
## skillsOf()의 chain-walk과 같은 정신).
##
## **무예 자체(6개씩×3단×4갈래=72개)는 이번 걸음 밖** — 그래서 tier2
## (장군 등)는 실제로 진급까지 열리지만, tier3·4는 `job.js canJoin()`의
## "하위 무예가 lv5/8/10 이상 하나 있어야 한다"(JOB_SKILL_LEVEL_GATE)
## 조건이 `JOB_SKILL_KEYS`에 tier2+ 항목이 아직 없어 자연히 못 채워진다
## (거짓으로 막지 않고 데이터가 없어 그냥 안 열린다) — tier2 무예가
## 생기기 전까지는 tier3 진급이 정직하게 막혀 있다.
const JOB_FROM := {
	"general": "warrior", "sniper": "archer", "assassin": "rogue", "sage": "mage",
	"marshal": "general", "flier": "sniper", "wraith": "assassin", "immortal": "sage",
	"warlord": "marshal", "falcon": "flier", "reaper": "wraith", "ascendant": "immortal",
}
const JOB_TIER := {
	"none": 0,
	"warrior": 1, "archer": 1, "rogue": 1, "mage": 1,
	"general": 2, "sniper": 2, "assassin": 2, "sage": 2,
	"marshal": 3, "flier": 3, "wraith": 3, "immortal": 3,
	"warlord": 4, "falcon": 4, "reaper": 4, "ascendant": 4,
}
const JOB_LEVEL_NEED := {
	"general": 25, "sniper": 25, "assassin": 25, "sage": 25,
	"marshal": 45, "flier": 45, "wraith": 45, "immortal": 45,
	"warlord": 70, "falcon": 70, "reaper": 70, "ascendant": 70,
}

## data-job.js JOBS의 tier2~4 grow(hp/atk/mp) 그대로 — JOBS_TIER1과 같은
## {name, hp, atk, mp} 모양.
const JOBS_TIER2 := {
	"general":  {"name": "장군(將軍)", "hp": 110.0, "atk": 7.0, "mp": 0.0},
	"sniper":   {"name": "신궁(神弓)", "hp": 40.0, "atk": 14.0, "mp": 0.0},
	"assassin": {"name": "자객(刺客)", "hp": 55.0, "atk": 11.0, "mp": 0.0},
	"sage":     {"name": "도사(道士)", "hp": 45.0, "atk": 9.0, "mp": 90.0},
}
const JOBS_TIER3 := {
	"marshal":  {"name": "원수(元帥)", "hp": 190.0, "atk": 13.0, "mp": 0.0},
	"flier":    {"name": "비장(飛將)", "hp": 70.0, "atk": 26.0, "mp": 0.0},
	"wraith":   {"name": "귀영(鬼影)", "hp": 95.0, "atk": 20.0, "mp": 0.0},
	"immortal": {"name": "진인(眞人)", "hp": 80.0, "atk": 17.0, "mp": 160.0},
}
const JOBS_TIER4 := {
	"warlord":   {"name": "전신(戰神)", "hp": 300.0, "atk": 20.0, "mp": 0.0},
	"falcon":    {"name": "궁성(弓聖)", "hp": 115.0, "atk": 39.0, "mp": 0.0},
	"reaper":    {"name": "명왕(冥王)", "hp": 155.0, "atk": 30.0, "mp": 0.0},
	"ascendant": {"name": "천존(天尊)", "hp": 130.0, "atk": 26.0, "mp": 260.0},
}

## job.js canJoin()의 tier별 무예 레벨 문턱(하위 무예 하나가 이 이상이어야
## 그 tier로 진급 가능) — tier2:5, tier3:8, tier4:10 그대로.
const JOB_SKILL_LEVEL_GATE := {2: 5, 3: 8, 4: 10}


static func job_tier(key: String) -> int:
	return int(JOB_TIER.get(key, 0))


static func job_info(key: String) -> Dictionary:
	if JOBS_TIER1.has(key):
		return JOBS_TIER1[key]
	if JOBS_TIER2.has(key):
		return JOBS_TIER2[key]
	if JOBS_TIER3.has(key):
		return JOBS_TIER3[key]
	if JOBS_TIER4.has(key):
		return JOBS_TIER4[key]
	return {"name": key, "hp": 0.0, "atk": 0.0, "mp": 0.0}


## key(자기 포함)에서 'none'까지 이어지는 사슬 — data-job.js skillsOf()의
## chain-walk 그대로(tier1은 JOB_FROM에 없어 get()의 기본값 "none"으로
## 바로 끊긴다).
static func job_chain(key: String) -> Array:
	var out: Array = []
	var cur := key
	while cur != "" and cur != "none":
		out.append(cur)
		cur = String(JOB_FROM.get(cur, "none"))
	return out


## job.js grow()의 chain-sum 그대로 — 사슬 위 모든 tier의 grow를 더한다.
static func job_grow_chain(key: String) -> Dictionary:
	var hp := 0.0
	var atk := 0.0
	var mp := 0.0
	for k: String in job_chain(key):
		var it: Dictionary = job_info(k)
		hp += float(it.get("hp", 0.0))
		atk += float(it.get("atk", 0.0))
		mp += float(it.get("mp", 0.0))
	return {"hp": hp, "atk": atk, "mp": mp}


## job.js canJoin()의 `j.from === core.save.job` 그대로 — key로 진급하려면
## 지금 이 job이어야 한다.
static func job_prereq(key: String) -> String:
	return String(JOB_FROM.get(key, "none"))


static func job_level_need(key: String) -> int:
	if JOBS_TIER1.has(key):
		return JOB_CHANGE_LEVEL
	return int(JOB_LEVEL_NEED.get(key, 999999))


static func job_advance_skill_gate(key: String) -> int:
	return int(JOB_SKILL_LEVEL_GATE.get(job_tier(key), 0))


## key에서 바로 다음(한 단계 위) job — 갈래가 안 갈리므로 항상 최대 하나.
## 없으면(예: tier4 극) 빈 문자열.
static func job_next(key: String) -> String:
	for k: String in JOB_FROM:
		if String(JOB_FROM[k]) == key:
			return k
	return ""

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
	## **2026-09-13 추가(같은 날 더 더) — tier2 무예 열둘.** 아래 SKILL_NEED
	## 머리말 참고.
	"g_smash": "general", "g_roar": "general", "g_wall": "general",
	"s_rain": "sniper", "s_snipe": "sniper", "s_split": "sniper",
	"x_storm": "assassin", "x_fan": "assassin", "x_shadow": "assassin",
	"p_quake": "sage", "p_beam": "sage", "p_ward": "sage",
	## **2026-09-13 추가(같은 날 더 더 더) — tier1 다섯째·여섯째 여덟.**
	## 아래 JOB_SKILL_KEYS 머리말 참고.
	"w_edge": "warrior", "w_vital": "warrior",
	"a_retreat": "archer", "a_burst": "archer",
	"r_whirl": "rogue", "r_dart": "rogue",
	"m_step": "mage", "m_orb": "mage",
	## 그 다섯째·여섯째가 열어 주는 tier2 나머지 여덟(SKILL_NEED 참고).
	"g_edge": "general", "g_vital": "general",
	"s_retreat": "sniper", "s_burst": "sniper",
	"x_whirl": "assassin", "x_dart": "assassin",
	"p_step": "sage", "p_orb": "sage",
	## **2026-09-13 추가(같은 날 더 더 더 더) — tier3 무예 스물넷.** 아래
	## SKILL_NEED 머리말 참고 — tier1·tier2가 전부 옮겨져 있어 갈래마다
	## 여섯 개 전부(원문 그대로) 채울 수 있었다.
	"n_heaven": "marshal", "n_quake": "marshal", "n_charge": "marshal",
	"n_banner": "marshal", "n_edge": "marshal", "n_vital": "marshal",
	"f_storm": "flier", "f_pierce": "flier", "f_volley": "flier",
	"f_focus": "flier", "f_retreat": "flier", "f_burst": "flier",
	"v_blur": "wraith", "v_petal": "wraith", "v_void": "wraith",
	"v_mark": "wraith", "v_whirl": "wraith", "v_dart": "wraith",
	"i_meteor": "immortal", "i_abyss": "immortal", "i_mend": "immortal",
	"i_tao": "immortal", "i_step": "immortal", "i_orb": "immortal",
	## **2026-09-13 추가(같은 날 더×5) — tier4 무예 스물넷(전신·궁성·
	## 명왕·천존 각 여섯, 갈래의 끝).** 아래 SKILL_NEED 머리말 참고 —
	## tier3가 전부 있어 갈래마다 여섯 개 전부 채웠다.
	"o_ruin": "warlord", "o_tremor": "warlord", "o_smite": "warlord",
	"o_conquer": "warlord", "o_edge": "warlord", "o_vital": "warlord",
	"h_tempest": "falcon", "h_ray": "falcon", "h_swarm": "falcon",
	"h_zenith": "falcon", "h_retreat": "falcon", "h_burst": "falcon",
	"d_carve": "reaper", "d_bloom": "reaper", "d_veil": "reaper",
	"d_curse": "reaper", "d_whirl": "reaper", "d_dart": "reaper",
	"z_starfall": "ascendant", "z_collapse": "ascendant", "z_rebirth": "ascendant",
	"z_eternity": "ascendant", "z_step": "ascendant", "z_orb": "ascendant",
}

## job → 그 직업 무예 key 목록. tier1(여섯)은 data-job.js SKILLS 등장
## 순서 그대로(cut/whirl/rush/iron/edge/vital 등) — 입력 액션
## story_job_skill_1~6·SP 투자 story_job_1~6과 정확히 같은 순서.
## tier2(다섯)도 마찬가지로 story_job_skill2_1~5·같은 story_job_1~5.
## story_job_trainer.gd의 SP 투자 배선이 이 순서를 그대로 쓴다.
const JOB_SKILL_KEYS := {
	"warrior": ["w_cut", "w_whirl", "w_rush", "w_iron", "w_edge", "w_vital"],
	"archer": ["a_shot", "a_double", "a_pierce", "a_eye", "a_retreat", "a_burst"],
	"rogue": ["r_twin", "r_knife", "r_step", "r_vital", "r_whirl", "r_dart"],
	"mage": ["m_fire", "m_bolt", "m_heal", "m_talis", "m_step", "m_orb"],
	## story_job_trainer.gd `_raise()`가 idx>=keys.size()면 조용히
	## 넘어가므로 tier1의 6번째 자리(물리키 6)는 tier2에서 그냥 안 쓰인다.
	"general": ["g_smash", "g_roar", "g_wall", "g_edge", "g_vital"],
	"sniper": ["s_rain", "s_snipe", "s_split", "s_retreat", "s_burst"],
	"assassin": ["x_storm", "x_fan", "x_shadow", "x_whirl", "x_dart"],
	"sage": ["p_quake", "p_beam", "p_ward", "p_step", "p_orb"],
	## tier3(여섯, tier1과 같은 개수)은 입력 story_job_skill3_1~6·SP 투자
	## story_job_1~6을 그대로 쓴다.
	"marshal": ["n_heaven", "n_quake", "n_charge", "n_banner", "n_edge", "n_vital"],
	"flier": ["f_storm", "f_pierce", "f_volley", "f_focus", "f_retreat", "f_burst"],
	"wraith": ["v_blur", "v_petal", "v_void", "v_mark", "v_whirl", "v_dart"],
	"immortal": ["i_meteor", "i_abyss", "i_mend", "i_tao", "i_step", "i_orb"],
	## tier4(여섯, 갈래의 끝)는 입력 story_job_skill4_1~6·SP 투자
	## story_job_1~6(이미 6자리까지 늘려 뒀다)을 그대로 쓴다.
	"warlord": ["o_ruin", "o_tremor", "o_smite", "o_conquer", "o_edge", "o_vital"],
	"falcon": ["h_tempest", "h_ray", "h_swarm", "h_zenith", "h_retreat", "h_burst"],
	"reaper": ["d_carve", "d_bloom", "d_veil", "d_curse", "d_whirl", "d_dart"],
	"ascendant": ["z_starfall", "z_collapse", "z_rebirth", "z_eternity", "z_step", "z_orb"],
}

## **2026-09-13 추가(같은 날 더 더) — 2~4차 전직 다음 걸음: tier2 무예
## 열둘.** data-job.js SKILLS의 tier2 스물(4갈래×5개) 중, 이 포트가 옮긴
## tier1 넷(cut/whirl/rush/iron 등) 안에 실제로 `need`가 걸리는 것만
## 골랐다 — 갈래마다 정확히 셋(장군·신궁·자객·도사 각 3개=12개).
##
## **`need`(선행 무예 lv5 이상) 게이트를 이번에 처음 실제로 켠다** —
## tier1엔 need가 없어 이 조건 자체가 없었지만, tier2부터는 원문에
## 실존하는 규칙이라 `StorySaveState.can_raise_skill()`이 이제 확인한다.
##
## **2026-09-13 추가(같은 날 더 더 더) — tier1 다섯째·여섯째(파공검·
## 생기결 등 여덟)를 마저 채우면서, 그 여덟에 need가 걸린 tier2 나머지
## 여덟(g_edge/g_vital·s_retreat/s_burst·x_whirl/x_dart·p_step/p_orb)도
## 이번에 같이 채웠다** — 28절이 "다섯째·여섯째 tier1이 옮겨지면 같이
## 열린다"고 적어 둔 그대로, 이걸로 data-job.js tier2 스물(4갈래×5개)이
## 전부 옮겨졌다. 돌진(w_rush)·응안(a_eye)·급소(r_vital)·치유(m_heal)만
## 여전히 tier2 대응이 없다(원문 자체가 그렇다 — 3차에서 바로 이어진다).
const SKILL_NEED := {
	"g_smash": {"key": "w_cut", "lv": 5},
	"g_roar": {"key": "w_whirl", "lv": 5},
	"g_wall": {"key": "w_iron", "lv": 5},
	"s_rain": {"key": "a_shot", "lv": 5},
	"s_snipe": {"key": "a_pierce", "lv": 5},
	"s_split": {"key": "a_double", "lv": 5},
	"x_storm": {"key": "r_twin", "lv": 5},
	"x_fan": {"key": "r_knife", "lv": 5},
	"x_shadow": {"key": "r_step", "lv": 5},
	"p_quake": {"key": "m_bolt", "lv": 5},
	"p_beam": {"key": "m_fire", "lv": 5},
	"p_ward": {"key": "m_talis", "lv": 5},
	"g_edge": {"key": "w_edge", "lv": 5},
	"g_vital": {"key": "w_vital", "lv": 5},
	"s_retreat": {"key": "a_retreat", "lv": 5},
	"s_burst": {"key": "a_burst", "lv": 5},
	"x_whirl": {"key": "r_whirl", "lv": 5},
	"x_dart": {"key": "r_dart", "lv": 5},
	"p_step": {"key": "m_step", "lv": 5},
	"p_orb": {"key": "m_orb", "lv": 5},
	## **2026-09-13 추가(같은 날 더 더 더 더) — tier3 무예 스물넷.**
	## data-job.js SKILLS의 need가 tier2뿐 아니라 tier1을 직접 가리키는
	## 경우도 있다(n_charge<-w_rush, f_focus<-a_eye, v_mark<-r_vital,
	## i_mend<-m_heal — 그 넷은 tier2에 대응 무예가 없어 원문이 tier1을
	## 바로 잇는다, 28절 머리말 참고) — 원문 그대로 옮겼다.
	"n_heaven": {"key": "g_smash", "lv": 5},
	"n_quake": {"key": "g_roar", "lv": 5},
	"n_charge": {"key": "w_rush", "lv": 5},
	"n_banner": {"key": "g_wall", "lv": 5},
	"n_edge": {"key": "g_edge", "lv": 5},
	"n_vital": {"key": "g_vital", "lv": 5},
	"f_storm": {"key": "s_rain", "lv": 5},
	"f_pierce": {"key": "s_snipe", "lv": 5},
	"f_volley": {"key": "s_split", "lv": 5},
	"f_focus": {"key": "a_eye", "lv": 5},
	"f_retreat": {"key": "s_retreat", "lv": 5},
	"f_burst": {"key": "s_burst", "lv": 5},
	"v_blur": {"key": "x_storm", "lv": 5},
	"v_petal": {"key": "x_fan", "lv": 5},
	"v_void": {"key": "x_shadow", "lv": 5},
	"v_mark": {"key": "r_vital", "lv": 5},
	"v_whirl": {"key": "x_whirl", "lv": 5},
	"v_dart": {"key": "x_dart", "lv": 5},
	"i_meteor": {"key": "p_beam", "lv": 5},
	"i_abyss": {"key": "p_quake", "lv": 5},
	"i_mend": {"key": "m_heal", "lv": 5},
	"i_tao": {"key": "p_ward", "lv": 5},
	"i_step": {"key": "p_step", "lv": 5},
	"i_orb": {"key": "p_orb", "lv": 5},
	## **2026-09-13 추가(같은 날 더×5) — tier4 무예 스물넷(갈래의 끝).**
	## 전부 바로 아래 tier3을 가리킨다(원문에 tier4는 tier2를 건너뛰는
	## 경우가 없다) — 원문 그대로.
	"o_ruin": {"key": "n_heaven", "lv": 5},
	"o_tremor": {"key": "n_quake", "lv": 5},
	"o_smite": {"key": "n_charge", "lv": 5},
	"o_conquer": {"key": "n_banner", "lv": 5},
	"o_edge": {"key": "n_edge", "lv": 5},
	"o_vital": {"key": "n_vital", "lv": 5},
	"h_tempest": {"key": "f_storm", "lv": 5},
	"h_ray": {"key": "f_pierce", "lv": 5},
	"h_swarm": {"key": "f_volley", "lv": 5},
	"h_zenith": {"key": "f_focus", "lv": 5},
	"h_retreat": {"key": "f_retreat", "lv": 5},
	"h_burst": {"key": "f_burst", "lv": 5},
	"d_carve": {"key": "v_blur", "lv": 5},
	"d_bloom": {"key": "v_petal", "lv": 5},
	"d_veil": {"key": "v_void", "lv": 5},
	"d_curse": {"key": "v_mark", "lv": 5},
	"d_whirl": {"key": "v_whirl", "lv": 5},
	"d_dart": {"key": "v_dart", "lv": 5},
	"z_starfall": {"key": "i_meteor", "lv": 5},
	"z_collapse": {"key": "i_abyss", "lv": 5},
	"z_rebirth": {"key": "i_mend", "lv": 5},
	"z_eternity": {"key": "i_tao", "lv": 5},
	"z_step": {"key": "i_step", "lv": 5},
	"z_orb": {"key": "i_orb", "lv": 5},
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


## **2026-09-13 추가(같은 날 더 더 더) — 무사 다섯째·여섯째 무예
## (파공검·생기결).** data-job.js SKILLS job:'warrior' 나머지 둘 —
## w_edge는 원문 effect가 이미 'bolt'(기탄과 같은 재해석, 사거리 2배).
## w_vital은 이 포트에 tier1 최초의 heal(치유는 mage 몫이었는데, 무사도
## 자가 치유를 갖는다 — mage m_heal과 같은 공식을 그대로 재사용).
const WARRIOR_EDGE_COST := 18.0
const WARRIOR_EDGE_CD := 5.0
const WARRIOR_EDGE_BASE := 1.6
const WARRIOR_EDGE_PER := 0.14
const WARRIOR_EDGE_RANGE_MUL := 2.0  # BOLT_RANGE_MUL과 같은 재해석, warrior 몫

const WARRIOR_VITAL_COST := 24.0
const WARRIOR_VITAL_CD := 18.0
const WARRIOR_VITAL_BASE := 0.14
const WARRIOR_VITAL_PER := 0.016


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


## **2026-09-13 추가(같은 날 더 더 더) — 궁수 다섯째·여섯째 무예
## (퇴보사·환시).** a_retreat는 dash지만 원문 자체가 "뒤로 물러나며"라
## _cast_archer_retreat()가 이동 방향을 반대로 뒤집는다(다른 dash류는
## 전부 전진). a_burst는 원문 effect가 이미 'aoe'(선풍각과 같은 재해석).
const ARCHER_RETREAT_COST := 20.0
const ARCHER_RETREAT_CD := 6.0
const ARCHER_RETREAT_BASE := 1.3
const ARCHER_RETREAT_PER := 0.11
const ARCHER_RETREAT_DIST_PX := 180.0

const ARCHER_BURST_COST := 20.0
const ARCHER_BURST_CD := 5.0
const ARCHER_BURST_BASE := 1.4
const ARCHER_BURST_PER := 0.12
const ARCHER_BURST_RANGE_MUL := 110.0 / 78.0


static func archer_retreat_dist_m() -> float:
	return ARCHER_RETREAT_DIST_PX * WARRIOR_RUSH_SCALE


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


## **2026-09-13 추가(같은 날 더 더 더) — 협객 다섯째·여섯째 무예
## (선풍각·관통표).** r_whirl은 원문 effect가 이미 'aoe'(선풍과 같은
## 재해석), r_dart는 이미 'bolt'(기탄과 같은 재해석, 사거리 2배).
const ROGUE_WHIRL_COST := 20.0
const ROGUE_WHIRL_CD := 5.0
const ROGUE_WHIRL_BASE := 1.4
const ROGUE_WHIRL_PER := 0.12
const ROGUE_WHIRL_RANGE_MUL := 110.0 / 78.0

const ROGUE_DART_COST := 18.0
const ROGUE_DART_CD := 5.0
const ROGUE_DART_BASE := 1.6
const ROGUE_DART_PER := 0.14
const ROGUE_DART_RANGE_MUL := 2.0  # BOLT_RANGE_MUL과 같은 재해석, rogue 몫


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


## **2026-09-13 추가(같은 날 더 더 더) — 방사 다섯째·여섯째 무예
## (축지·마탄).** m_step은 dash+invuln:0.5(은신보와 같은 구조). m_orb는
## 원문 effect가 이미 'volley'(연사와 같은 재해석).
const MAGE_STEP_COST := 22.0
const MAGE_STEP_CD := 7.0
const MAGE_STEP_BASE := 1.2
const MAGE_STEP_PER := 0.1
const MAGE_STEP_DIST_PX := 220.0
const MAGE_STEP_INVULN_SEC := 0.5

const MAGE_ORB_COST := 22.0
const MAGE_ORB_CD := 3.4
const MAGE_ORB_BASE := 1.1
const MAGE_ORB_PER := 0.08
const MAGE_ORB_SHOTS := 3


static func mage_step_dist_m() -> float:
	return MAGE_STEP_DIST_PX * WARRIOR_RUSH_SCALE


## **2026-09-13 추가(같은 날 더 더) — tier2 무예 열둘.** SKILL_NEED 머리말
## 참고. 사거리 배율(r/dist px → 배율)은 위 tier1과 같은 방식으로
## REACH(78px)비·WARRIOR_RUSH_SCALE(0.02)을 그대로 재사용한다 — job마다
## 새 환산 규칙을 만들지 않는다.

## 패왕격(g_smash) — melee, hits:2. 참격(w_cut)과 같은 정면 판정.
const GENERAL_SMASH_COST := 40.0
const GENERAL_SMASH_CD := 9.0
const GENERAL_SMASH_BASE := 3.4
const GENERAL_SMASH_PER := 0.3
const GENERAL_SMASH_HITS := 2

## 함성(g_roar) — aoe, r:190px.
const GENERAL_ROAR_COST := 34.0
const GENERAL_ROAR_CD := 14.0
const GENERAL_ROAR_BASE := 2.4
const GENERAL_ROAR_PER := 0.2
const GENERAL_ROAR_RANGE_MUL := 190.0 / 78.0

## 철벽(g_wall) — buff. sec:11·atk×1.15·guard0.5 원문 그대로.
const GENERAL_WALL_COST := 38.0
const GENERAL_WALL_CD := 20.0
const GENERAL_WALL_SEC := 11.0
const GENERAL_WALL_ATK_MUL := 1.15
const GENERAL_WALL_GUARD := 0.5

## 전우(s_rain) — 원문 effect:'rain'. 원문에 별도 사거리·반경이 없어(rain
## 류 공통 — data-job.js 어느 rain 항목도 r/dist가 없다) 사격(a_shot)과
## 같은 단순 정면 판정으로 재해석.
const SNIPER_RAIN_COST := 42.0
const SNIPER_RAIN_CD := 10.0
const SNIPER_RAIN_BASE := 2.6
const SNIPER_RAIN_PER := 0.24

## 일점사(s_snipe) — bolt. 관통시(a_pierce)와 같은 재해석(사거리 2배).
const SNIPER_SNIPE_COST := 36.0
const SNIPER_SNIPE_CD := 8.0
const SNIPER_SNIPE_BASE := 4.0
const SNIPER_SNIPE_PER := 0.34
const SNIPER_SNIPE_RANGE_MUL := 2.0

## 분시(s_split) — volley(shots:4). 연사(a_double)와 같은 재해석(정면
## 판정을 그 횟수만큼 잇달아 적용).
const SNIPER_SPLIT_COST := 34.0
const SNIPER_SPLIT_CD := 5.0
const SNIPER_SPLIT_BASE := 1.5
const SNIPER_SPLIT_PER := 0.12
const SNIPER_SPLIT_SHOTS := 4

## 난무(x_storm) — melee, hits:4.
const ASSASSIN_STORM_COST := 38.0
const ASSASSIN_STORM_CD := 8.0
const ASSASSIN_STORM_BASE := 1.5
const ASSASSIN_STORM_PER := 0.13
const ASSASSIN_STORM_HITS := 4

## 만천화우(x_fan) — volley(shots:5).
const ASSASSIN_FAN_COST := 40.0
const ASSASSIN_FAN_CD := 9.0
const ASSASSIN_FAN_BASE := 1.4
const ASSASSIN_FAN_PER := 0.12
const ASSASSIN_FAN_SHOTS := 5

## 그림자밟기(x_shadow) — dash, dist:300px + invuln:0.9. 은신보(r_step)와
## 같은 순서(경로 판정 → 순간이동, 무적시간 포함).
const ASSASSIN_SHADOW_COST := 32.0
const ASSASSIN_SHADOW_CD := 6.0
const ASSASSIN_SHADOW_BASE := 2.0
const ASSASSIN_SHADOW_PER := 0.17
const ASSASSIN_SHADOW_DIST_PX := 300.0
const ASSASSIN_SHADOW_INVULN_SEC := 0.9


static func assassin_shadow_dist_m() -> float:
	return ASSASSIN_SHADOW_DIST_PX * WARRIOR_RUSH_SCALE


## 지진(p_quake) — aoe, r:230px.
const SAGE_QUAKE_COST := 44.0
const SAGE_QUAKE_CD := 10.0
const SAGE_QUAKE_BASE := 3.2
const SAGE_QUAKE_PER := 0.28
const SAGE_QUAKE_RANGE_MUL := 230.0 / 78.0

## 천뢰(p_beam) — 원문 effect:'rain'. s_rain과 같은 단순 정면 재해석.
const SAGE_BEAM_COST := 40.0
const SAGE_BEAM_CD := 9.0
const SAGE_BEAM_BASE := 3.0
const SAGE_BEAM_PER := 0.26

## 호신부(p_ward) — buff. sec:12·atk×1.1·guard0.4·regen3.2 원문 그대로.
const SAGE_WARD_COST := 36.0
const SAGE_WARD_CD := 18.0
const SAGE_WARD_SEC := 12.0
const SAGE_WARD_ATK_MUL := 1.1
const SAGE_WARD_GUARD := 0.4
const SAGE_WARD_REGEN_MUL := 3.2


## **2026-09-13 추가(같은 날 더 더 더) — tier2 나머지 여덟(SKILL_NEED
## 머리말 참고).** 이걸로 data-job.js tier2 스물(4갈래×5개)이 전부
## 옮겨졌다.

## 벽공검(g_edge) — bolt. 파공검(w_edge)과 같은 재해석(사거리 2배).
const GENERAL_EDGE_COST := 32.0
const GENERAL_EDGE_CD := 7.0
const GENERAL_EDGE_BASE := 2.8
const GENERAL_EDGE_PER := 0.24
const GENERAL_EDGE_RANGE_MUL := 2.0

## 회천결(g_vital) — heal. 생기결(w_vital)과 같은 공식.
const GENERAL_VITAL_COST := 36.0
const GENERAL_VITAL_CD := 20.0
const GENERAL_VITAL_BASE := 0.26
const GENERAL_VITAL_PER := 0.024

## 활보사(s_retreat) — dash, dist:240px. 퇴보사(a_retreat)와 같은
## 재해석(뒤로 물러난다).
const SNIPER_RETREAT_COST := 34.0
const SNIPER_RETREAT_CD := 7.0
const SNIPER_RETREAT_BASE := 2.3
const SNIPER_RETREAT_PER := 0.2
const SNIPER_RETREAT_DIST_PX := 240.0


static func sniper_retreat_dist_m() -> float:
	return SNIPER_RETREAT_DIST_PX * WARRIOR_RUSH_SCALE


## 광환시(s_burst) — aoe, r:140px. 환시(a_burst)와 같은 재해석.
const SNIPER_BURST_COST := 34.0
const SNIPER_BURST_CD := 6.0
const SNIPER_BURST_BASE := 2.4
const SNIPER_BURST_PER := 0.21
const SNIPER_BURST_RANGE_MUL := 140.0 / 78.0

## 질풍각(x_whirl) — aoe, r:140px. 선풍각(r_whirl)과 같은 재해석.
const ASSASSIN_WHIRL_COST := 34.0
const ASSASSIN_WHIRL_CD := 6.0
const ASSASSIN_WHIRL_BASE := 2.4
const ASSASSIN_WHIRL_PER := 0.21
const ASSASSIN_WHIRL_RANGE_MUL := 140.0 / 78.0

## 암습표(x_dart) — bolt. 관통표(r_dart)와 같은 재해석(사거리 2배).
const ASSASSIN_DART_COST := 32.0
const ASSASSIN_DART_CD := 7.0
const ASSASSIN_DART_BASE := 2.8
const ASSASSIN_DART_PER := 0.24
const ASSASSIN_DART_RANGE_MUL := 2.0

## 축지술(p_step) — dash, dist:280px + invuln:0.7. 축지(m_step)와 같은
## 재해석(더 크게 나아간다).
const SAGE_STEP_COST := 36.0
const SAGE_STEP_CD := 8.0
const SAGE_STEP_BASE := 2.0
const SAGE_STEP_PER := 0.17
const SAGE_STEP_DIST_PX := 280.0
const SAGE_STEP_INVULN_SEC := 0.7


static func sage_step_dist_m() -> float:
	return SAGE_STEP_DIST_PX * WARRIOR_RUSH_SCALE


## 연환탄(p_orb) — volley(shots:4). 마탄(m_orb)과 같은 재해석.
const SAGE_ORB_COST := 34.0
const SAGE_ORB_CD := 5.0
const SAGE_ORB_BASE := 1.5
const SAGE_ORB_PER := 0.12
const SAGE_ORB_SHOTS := 4


## **2026-09-13 추가(같은 날 더 더 더 더) — tier3 무예 스물넷(원수·비장·
## 귀영·진인 각 여섯).** SKILL_NEED 머리말 참고 — tier1·tier2가 전부
## 있어 갈래마다 여섯 개 전부(원문 그대로) 채웠다. `f_focus`(원문
## speed:1.15)가 이 포트 job 버프 중 처음으로 이동속도 배율을 갖는다 —
## `_job_buff_speed_mul`(story_player.gd 신규, 기본 1.0)을 추가해 `_walk()`
## 속도 계산에 곱한다(BRACE_SPEED_MUL과 같은 자리, 별도 곱).

## 천붕격(n_heaven) — melee, hits:3.
const MARSHAL_HEAVEN_COST := 58.0
const MARSHAL_HEAVEN_CD := 11.0
const MARSHAL_HEAVEN_BASE := 4.6
const MARSHAL_HEAVEN_PER := 0.42
const MARSHAL_HEAVEN_HITS := 3

## 진각(n_quake) — aoe, r:264px.
const MARSHAL_QUAKE_COST := 52.0
const MARSHAL_QUAKE_CD := 12.0
const MARSHAL_QUAKE_BASE := 3.6
const MARSHAL_QUAKE_PER := 0.32
const MARSHAL_QUAKE_RANGE_MUL := 264.0 / 78.0

## 철기돌격(n_charge) — dash, dist:330px.
const MARSHAL_CHARGE_COST := 48.0
const MARSHAL_CHARGE_CD := 9.0
const MARSHAL_CHARGE_BASE := 3.2
const MARSHAL_CHARGE_PER := 0.28
const MARSHAL_CHARGE_DIST_PX := 330.0


static func marshal_charge_dist_m() -> float:
	return MARSHAL_CHARGE_DIST_PX * WARRIOR_RUSH_SCALE


## 대장기(n_banner) — buff. sec:13·atk×1.55·guard0.45·regen1.8 원문 그대로.
const MARSHAL_BANNER_COST := 56.0
const MARSHAL_BANNER_CD := 24.0
const MARSHAL_BANNER_SEC := 13.0
const MARSHAL_BANNER_ATK_MUL := 1.55
const MARSHAL_BANNER_GUARD := 0.45
const MARSHAL_BANNER_REGEN_MUL := 1.8

## 천단검(n_edge) — bolt. 벽공검(g_edge)과 같은 재해석(사거리 2배).
const MARSHAL_EDGE_COST := 44.0
const MARSHAL_EDGE_CD := 9.0
const MARSHAL_EDGE_BASE := 4.0
const MARSHAL_EDGE_PER := 0.35
const MARSHAL_EDGE_RANGE_MUL := 2.0

## 불사결(n_vital) — heal.
const MARSHAL_VITAL_COST := 48.0
const MARSHAL_VITAL_CD := 22.0
const MARSHAL_VITAL_BASE := 0.4
const MARSHAL_VITAL_PER := 0.034

## 시우(f_storm) — 원문 effect:'rain', 전우(s_rain)와 같은 단순 정면 재해석.
const FLIER_STORM_COST := 60.0
const FLIER_STORM_CD := 12.0
const FLIER_STORM_BASE := 4.2
const FLIER_STORM_PER := 0.38

## 파천시(f_pierce) — bolt. 일점사(s_snipe)와 같은 재해석(사거리 2배).
const FLIER_PIERCE_COST := 54.0
const FLIER_PIERCE_CD := 9.0
const FLIER_PIERCE_BASE := 6.4
const FLIER_PIERCE_PER := 0.55
const FLIER_PIERCE_RANGE_MUL := 2.0

## 만시(f_volley) — volley(shots:8). 분시(s_split)와 같은 재해석.
const FLIER_VOLLEY_COST := 50.0
const FLIER_VOLLEY_CD := 7.0
const FLIER_VOLLEY_BASE := 1.9
const FLIER_VOLLEY_PER := 0.16
const FLIER_VOLLEY_SHOTS := 8

## 정심(f_focus) — buff. sec:12·atk×1.75·**speed×1.15(job 버프 최초의
## 이동속도 배율)** 원문 그대로.
const FLIER_FOCUS_COST := 46.0
const FLIER_FOCUS_CD := 22.0
const FLIER_FOCUS_SEC := 12.0
const FLIER_FOCUS_ATK_MUL := 1.75
const FLIER_FOCUS_SPEED_MUL := 1.15

## 답공사(f_retreat) — dash, dist:300px. 활보사(s_retreat)와 같은
## 재해석(뒤로 물러난다).
const FLIER_RETREAT_COST := 46.0
const FLIER_RETREAT_CD := 8.0
const FLIER_RETREAT_BASE := 3.5
const FLIER_RETREAT_PER := 0.3
const FLIER_RETREAT_DIST_PX := 300.0


static func flier_retreat_dist_m() -> float:
	return FLIER_RETREAT_DIST_PX * WARRIOR_RUSH_SCALE


## 천환시(f_burst) — aoe, r:175px. 광환시(s_burst)와 같은 재해석.
const FLIER_BURST_COST := 46.0
const FLIER_BURST_CD := 7.0
const FLIER_BURST_BASE := 3.6
const FLIER_BURST_PER := 0.31
const FLIER_BURST_RANGE_MUL := 175.0 / 78.0

## 잔영(v_blur) — melee, hits:6.
const WRAITH_BLUR_COST := 52.0
const WRAITH_BLUR_CD := 8.0
const WRAITH_BLUR_BASE := 2.2
const WRAITH_BLUR_PER := 0.19
const WRAITH_BLUR_HITS := 6

## 낙화(v_petal) — volley(shots:7). 만천화우(x_fan)와 같은 재해석.
const WRAITH_PETAL_COST := 54.0
const WRAITH_PETAL_CD := 9.0
const WRAITH_PETAL_BASE := 1.8
const WRAITH_PETAL_PER := 0.15
const WRAITH_PETAL_SHOTS := 7

## 허공답보(v_void) — dash, dist:360px + invuln:1.2. 그림자밟기(x_shadow)와
## 같은 재해석(더 크게 나아가고 무적도 길다).
const WRAITH_VOID_COST := 44.0
const WRAITH_VOID_CD := 7.0
const WRAITH_VOID_BASE := 3.0
const WRAITH_VOID_PER := 0.26
const WRAITH_VOID_DIST_PX := 360.0
const WRAITH_VOID_INVULN_SEC := 1.2


static func wraith_void_dist_m() -> float:
	return WRAITH_VOID_DIST_PX * WARRIOR_RUSH_SCALE


## 사혼(v_mark) — buff. sec:10·atk×1.95 원문 그대로.
const WRAITH_MARK_COST := 48.0
const WRAITH_MARK_CD := 20.0
const WRAITH_MARK_SEC := 10.0
const WRAITH_MARK_ATK_MUL := 1.95

## 광풍각(v_whirl) — aoe, r:175px. 질풍각(x_whirl)과 같은 재해석.
const WRAITH_WHIRL_COST := 46.0
const WRAITH_WHIRL_CD := 7.0
const WRAITH_WHIRL_BASE := 3.6
const WRAITH_WHIRL_PER := 0.31
const WRAITH_WHIRL_RANGE_MUL := 175.0 / 78.0

## 귀표(v_dart) — bolt. 암습표(x_dart)와 같은 재해석(사거리 2배).
const WRAITH_DART_COST := 44.0
const WRAITH_DART_CD := 9.0
const WRAITH_DART_BASE := 4.0
const WRAITH_DART_PER := 0.35
const WRAITH_DART_RANGE_MUL := 2.0

## 유성(i_meteor) — 원문 effect:'rain', 천뢰(p_beam)와 같은 단순 정면 재해석.
const IMMORTAL_METEOR_COST := 64.0
const IMMORTAL_METEOR_CD := 12.0
const IMMORTAL_METEOR_BASE := 4.8
const IMMORTAL_METEOR_PER := 0.42

## 천붕지열(i_abyss) — aoe, r:300px. 지진(p_quake)과 같은 재해석.
const IMMORTAL_ABYSS_COST := 68.0
const IMMORTAL_ABYSS_CD := 14.0
const IMMORTAL_ABYSS_BASE := 5.0
const IMMORTAL_ABYSS_PER := 0.44
const IMMORTAL_ABYSS_RANGE_MUL := 300.0 / 78.0

## 회춘(i_mend) — heal. 치유(m_heal)와 같은 공식.
const IMMORTAL_MEND_COST := 50.0
const IMMORTAL_MEND_CD := 13.0
const IMMORTAL_MEND_BASE := 0.42
const IMMORTAL_MEND_PER := 0.035

## 태극(i_tao) — buff. sec:14·atk×1.5·guard0.3·regen4.0 원문 그대로.
const IMMORTAL_TAO_COST := 58.0
const IMMORTAL_TAO_CD := 22.0
const IMMORTAL_TAO_SEC := 14.0
const IMMORTAL_TAO_ATK_MUL := 1.5
const IMMORTAL_TAO_GUARD := 0.3
const IMMORTAL_TAO_REGEN_MUL := 4.0

## 이형보(i_step) — dash, dist:340px + invuln:0.9. 축지술(p_step)과 같은
## 재해석(더 크게 나아간다).
const IMMORTAL_STEP_COST := 48.0
const IMMORTAL_STEP_CD := 9.0
const IMMORTAL_STEP_BASE := 3.0
const IMMORTAL_STEP_PER := 0.26
const IMMORTAL_STEP_DIST_PX := 340.0
const IMMORTAL_STEP_INVULN_SEC := 0.9


static func immortal_step_dist_m() -> float:
	return IMMORTAL_STEP_DIST_PX * WARRIOR_RUSH_SCALE


## 유성탄(i_orb) — volley(shots:6). 연환탄(p_orb)과 같은 재해석.
const IMMORTAL_ORB_COST := 50.0
const IMMORTAL_ORB_CD := 7.0
const IMMORTAL_ORB_BASE := 1.9
const IMMORTAL_ORB_PER := 0.16
const IMMORTAL_ORB_SHOTS := 6


## **2026-09-13 추가(같은 날 더×5) — tier4 무예 스물넷(전신·궁성·명왕·
## 천존 각 여섯, 갈래의 끝).** SKILL_NEED 머리말 참고 — 전부 바로 아래
## tier3을 가리켜(원문에 예외가 없다) 모두 갈래마다 여섯 개 전부 채웠다.
## h_zenith(원문 speed:1.2)가 f_focus에 이어 두 번째로 이동속도 배율을
## 갖는 job 버프다.

## 파멸격(o_ruin) — melee, hits:4.
const WARLORD_RUIN_COST := 62.0
const WARLORD_RUIN_CD := 12.0
const WARLORD_RUIN_BASE := 6.2
const WARLORD_RUIN_PER := 0.57
const WARLORD_RUIN_HITS := 4

## 지열(o_tremor) — aoe, r:340px.
const WARLORD_TREMOR_COST := 58.0
const WARLORD_TREMOR_CD := 14.0
const WARLORD_TREMOR_BASE := 4.9
const WARLORD_TREMOR_PER := 0.44
const WARLORD_TREMOR_RANGE_MUL := 340.0 / 78.0

## 벽력돌(o_smite) — dash, dist:410px.
const WARLORD_SMITE_COST := 54.0
const WARLORD_SMITE_CD := 10.0
const WARLORD_SMITE_BASE := 4.5
const WARLORD_SMITE_PER := 0.4
const WARLORD_SMITE_DIST_PX := 410.0


static func warlord_smite_dist_m() -> float:
	return WARLORD_SMITE_DIST_PX * WARRIOR_RUSH_SCALE


## 패천기(o_conquer) — buff. sec:15·atk×1.8·guard0.5·regen2.4 원문 그대로.
const WARLORD_CONQUER_COST := 62.0
const WARLORD_CONQUER_CD := 26.0
const WARLORD_CONQUER_SEC := 15.0
const WARLORD_CONQUER_ATK_MUL := 1.8
const WARLORD_CONQUER_GUARD := 0.5
const WARLORD_CONQUER_REGEN_MUL := 2.4

## 파천검(o_edge) — bolt. 천단검(n_edge)과 같은 재해석(사거리 2배).
const WARLORD_EDGE_COST := 58.0
const WARLORD_EDGE_CD := 11.0
const WARLORD_EDGE_BASE := 5.6
const WARLORD_EDGE_PER := 0.5
const WARLORD_EDGE_RANGE_MUL := 2.0

## 재생결(o_vital) — heal.
const WARLORD_VITAL_COST := 60.0
const WARLORD_VITAL_CD := 24.0
const WARLORD_VITAL_BASE := 0.58
const WARLORD_VITAL_PER := 0.048

## 천사우(h_tempest) — 원문 effect:'rain', 시우(f_storm)와 같은 단순
## 정면 재해석.
const FALCON_TEMPEST_COST := 66.0
const FALCON_TEMPEST_CD := 13.0
const FALCON_TEMPEST_BASE := 5.6
const FALCON_TEMPEST_PER := 0.5

## 광시(h_ray) — bolt. 파천시(f_pierce)와 같은 재해석(사거리 2배).
const FALCON_RAY_COST := 60.0
const FALCON_RAY_CD := 10.0
const FALCON_RAY_BASE := 8.4
const FALCON_RAY_PER := 0.7
const FALCON_RAY_RANGE_MUL := 2.0

## 십이시(h_swarm) — volley(shots:12). 만시(f_volley)와 같은 재해석.
const FALCON_SWARM_COST := 56.0
const FALCON_SWARM_CD := 8.0
const FALCON_SWARM_BASE := 2.4
const FALCON_SWARM_PER := 0.2
const FALCON_SWARM_SHOTS := 12

## 궁천합(h_zenith) — buff. sec:14·atk×2.0·**speed×1.2** 원문 그대로.
const FALCON_ZENITH_COST := 52.0
const FALCON_ZENITH_CD := 24.0
const FALCON_ZENITH_SEC := 14.0
const FALCON_ZENITH_ATK_MUL := 2.0
const FALCON_ZENITH_SPEED_MUL := 1.2

## 익보사(h_retreat) — dash, dist:360px. 답공사(f_retreat)와 같은
## 재해석(뒤로 물러난다).
const FALCON_RETREAT_COST := 58.0
const FALCON_RETREAT_CD := 9.0
const FALCON_RETREAT_BASE := 5.0
const FALCON_RETREAT_PER := 0.44
const FALCON_RETREAT_DIST_PX := 360.0


static func falcon_retreat_dist_m() -> float:
	return FALCON_RETREAT_DIST_PX * WARRIOR_RUSH_SCALE


## 극환시(h_burst) — aoe, r:210px. 천환시(f_burst)와 같은 재해석.
const FALCON_BURST_COST := 58.0
const FALCON_BURST_CD := 8.0
const FALCON_BURST_BASE := 5.2
const FALCON_BURST_PER := 0.44
const FALCON_BURST_RANGE_MUL := 210.0 / 78.0

## 팔도(d_carve) — melee, hits:8.
const REAPER_CARVE_COST := 60.0
const REAPER_CARVE_CD := 9.0
const REAPER_CARVE_BASE := 3.0
const REAPER_CARVE_PER := 0.26
const REAPER_CARVE_HITS := 8

## 구화만개(d_bloom) — volley(shots:9). 낙화(v_petal)와 같은 재해석.
const REAPER_BLOOM_COST := 62.0
const REAPER_BLOOM_CD := 10.0
const REAPER_BLOOM_BASE := 2.2
const REAPER_BLOOM_PER := 0.18
const REAPER_BLOOM_SHOTS := 9

## 명계보(d_veil) — dash, dist:420px + invuln:1.5. 허공답보(v_void)와
## 같은 재해석(가장 크게 나아가고 무적도 가장 길다).
const REAPER_VEIL_COST := 50.0
const REAPER_VEIL_CD := 8.0
const REAPER_VEIL_BASE := 3.8
const REAPER_VEIL_PER := 0.32
const REAPER_VEIL_DIST_PX := 420.0
const REAPER_VEIL_INVULN_SEC := 1.5


static func reaper_veil_dist_m() -> float:
	return REAPER_VEIL_DIST_PX * WARRIOR_RUSH_SCALE


## 명왕부(d_curse) — buff. sec:12·atk×2.3 원문 그대로.
const REAPER_CURSE_COST := 56.0
const REAPER_CURSE_CD := 22.0
const REAPER_CURSE_SEC := 12.0
const REAPER_CURSE_ATK_MUL := 2.3

## 절명풍(d_whirl) — aoe, r:210px. 광풍각(v_whirl)과 같은 재해석.
const REAPER_WHIRL_COST := 58.0
const REAPER_WHIRL_CD := 8.0
const REAPER_WHIRL_BASE := 5.2
const REAPER_WHIRL_PER := 0.44
const REAPER_WHIRL_RANGE_MUL := 210.0 / 78.0

## 명표(d_dart) — bolt. 귀표(v_dart)와 같은 재해석(사거리 2배).
const REAPER_DART_COST := 58.0
const REAPER_DART_CD := 11.0
const REAPER_DART_BASE := 5.6
const REAPER_DART_PER := 0.5
const REAPER_DART_RANGE_MUL := 2.0

## 낙성우(z_starfall) — 원문 effect:'rain', 유성(i_meteor)과 같은 단순
## 정면 재해석.
const ASCENDANT_STARFALL_COST := 70.0
const ASCENDANT_STARFALL_CD := 13.0
const ASCENDANT_STARFALL_BASE := 6.5
const ASCENDANT_STARFALL_PER := 0.56

## 건곤붕(z_collapse) — aoe, r:330px. 천붕지열(i_abyss)과 같은 재해석.
const ASCENDANT_COLLAPSE_COST := 74.0
const ASCENDANT_COLLAPSE_CD := 15.0
const ASCENDANT_COLLAPSE_BASE := 6.8
const ASCENDANT_COLLAPSE_PER := 0.58
const ASCENDANT_COLLAPSE_RANGE_MUL := 330.0 / 78.0

## 환생(z_rebirth) — heal. 회춘(i_mend)과 같은 공식.
const ASCENDANT_REBIRTH_COST := 58.0
const ASCENDANT_REBIRTH_CD := 14.0
const ASCENDANT_REBIRTH_BASE := 0.65
const ASCENDANT_REBIRTH_PER := 0.05

## 무극(z_eternity) — buff. sec:16·atk×1.65·guard0.35·regen4.8 원문 그대로.
const ASCENDANT_ETERNITY_COST := 64.0
const ASCENDANT_ETERNITY_CD := 24.0
const ASCENDANT_ETERNITY_SEC := 16.0
const ASCENDANT_ETERNITY_ATK_MUL := 1.65
const ASCENDANT_ETERNITY_GUARD := 0.35
const ASCENDANT_ETERNITY_REGEN_MUL := 4.8

## 신행보(z_step) — dash, dist:400px + invuln:1.1. 이형보(i_step)와 같은
## 재해석(더 크게 나아간다).
const ASCENDANT_STEP_COST := 62.0
const ASCENDANT_STEP_CD := 10.0
const ASCENDANT_STEP_BASE := 4.2
const ASCENDANT_STEP_PER := 0.36
const ASCENDANT_STEP_DIST_PX := 400.0
const ASCENDANT_STEP_INVULN_SEC := 1.1


static func ascendant_step_dist_m() -> float:
	return ASCENDANT_STEP_DIST_PX * WARRIOR_RUSH_SCALE


## 성라탄(z_orb) — volley(shots:8). 유성탄(i_orb)과 같은 재해석.
const ASCENDANT_ORB_COST := 56.0
const ASCENDANT_ORB_CD := 8.0
const ASCENDANT_ORB_BASE := 2.4
const ASCENDANT_ORB_PER := 0.2
const ASCENDANT_ORB_SHOTS := 8


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
