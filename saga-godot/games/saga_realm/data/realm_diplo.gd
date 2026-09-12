extends RefCounted

const Characters := preload("res://saga_core/data/characters.gd")

## diplo.js "우호"(relation)·"조공"(tribute)·"화친"(truce)을 좁혀 옮긴 것
## (2026-09-12, "외교도 이어해") — 지난 절(전쟁, 소패 공략)이 남긴 첫
## 후보였다. **판정식은 그대로**(조공 round(gold/120) 1~30, 화친 확률
## 0.30+지력/320+우호/260+금/12000, 우호 성공+12·실패+2) — 다만 이
## 슬라이스가 아직 안 가진 것은 뺐다:
## - **동맹(ally)** — 이 슬라이스는 세력이 우리(cao)와 소패의 주인
##   (유비) 둘뿐이라 "함께 칠 셋째 세력"이 없다. 동맹이 막을 전쟁 자체가
##   없어 뜻이 없다 — 화친(truce, "칠 수 없다")만으로 diplo.js의 "시간을
##   산다"는 목적이 이미 채워진다.
## - **국력 차(edge)·공동의 적(commonEnemy) 보정** — `envoyChance()`가
##   `R.summary(force).cities`·`R.ranking()`처럼 "세력 여럿의 성 수·순위"
##   를 비교하는데, 이 슬라이스는 세력을 온전히 굴리지 않아(소패는 정적
##   수치일 뿐 `R.force('bei')`가 없다) 그 비교 자체가 성립하지 않는다.
##   빼도 공식이 망가지지 않는다 — 두 항 다 원래 "0에 가까운 보정"이라
##   기본 확률(0.30)이 하는 일이 대부분이다.
## - **계략(plot: 이간·유언비어·매수·화계)** — 무장 충성(loyal)·태수
##   방어를 다루는데, 이 슬라이스의 로스터엔 충성 값 자체가 없다(REALM은
##   아직 loyal을 안 들였다). 값이 없는 시스템이라 통째로 다음에 볼
##   자리로 남긴다.
##
## **2026-09-12 추가 — 무장 충성(loyal) + 계략(plot) 절반.** "1,2,3
## 순서대로 다해"의 두 번째. `officer.js baseLoyal()`을 그대로 옮겨
## `RealmSaveState.officer_loyal`을 채운다(`LORD_ID`="sg_caocao" —
## data-force.js 시나리오 194의 조조군 군주, 우리 로스터엔 안 들어오지만
## baseLoyal()이 trait 비교에만 쓴다).
##
## **PLOTS는 넷이 아니라 둘만 옮겼다(유언비어·화계) — 재해석.** 이간·
## 매수는 **적 무장**을 대상으로 하는데(`off.atCity(cityId, c.force)`
## 후보 목록), `realm_war.gd` 머리말대로 소패엔 **이름 있는 수비 장수가
## 없다** — 대상 자체가 없어 늘 "홀릴 사람이 없습니다"만 뜨는 죽은
## 버튼이 된다. 유언비어(치안)·화계(군량)는 성 자체가 대상이라 옮길 수
## 있다 — 그러려면 `enemies[xiaopei]`에 `sec`·`food`가 있어야 해서
## `realm_save_state.gd _init_enemies()`가 이제 그 둘도 채운다(SAVE_
## VERSION 6→7). 이간·매수는 다음에 볼 자리(적 쪽에 이름 있는 무장을
## 먼저 들여야 한다).
##
## **화친 체크 없음 — 원작 그대로.** `plot()`은 `diplo.blocked()`를 안
## 본다(diplo.js 원문에 그 체크가 없다) — 첩보전은 정식 화친과 별개라는
## 뜻으로 그대로 옮겼다(`attack()`의 화친 체크와 다른 자리라 헷갈리지
## 않게 여기 적어 둔다).

const TRUCE_MONTHS := 8            # diplo.js TRUCE_MONTHS
const DEFAULT_RELATION := 40       # diplo.js relation() 기본값
const TRUCE_BASE := 0.30           # diplo.js envoyChance() kind==='truce'
const TRUCE_SUCCESS_BONUS := 12    # diplo.js envoy() 화친 성공 시 +우호
const TRUCE_FAIL_BONUS := 2        # diplo.js envoy() 사양당해도 +우호
const ENVOY_FEE := 100             # diplo.js envoy() "gold+100"의 고정 수수료

const LORD_ID := "sg_caocao"       # data-force.js force('cao').lord

## officer.js PLOTS 중 성 자체가 대상인 둘만 — 위 머리말 "재해석" 참고.
const PLOTS := [
	{"key": "rumor", "name": "유언비어", "emoji": "🗣️", "gold": 150,
	 "desc": "적 성에 뜬소문을 놓아 치안을 깎는다."},
	{"key": "fire", "name": "화계", "emoji": "🔥", "gold": 300,
	 "desc": "적 성의 군량에 불을 놓는다. 원정 나온 군대가 굶는다."},
]
const PLOT_RELATION_HIT := -4      # diplo.js plot() "걸기만 해도" 우호 하락
const PLOT_FAIL_RELATION_HIT := -6 # diplo.js plot() 들통났을 때 추가 하락
const PLOT_GUARD_WISDOM := 30      # diplo.js plotChance() "태수가 비어 있으면" 기본값
                                    # — 이 슬라이스는 적 태수를 안 다뤄 늘 이 값
const SEC_HIT_BASE := 10           # diplo.js plot() 'rumor': 10 + rand*12
const SEC_HIT_RANGE := 12
const FOOD_BURN_BASE := 0.25       # diplo.js plot() 'fire': round(food*(0.25+rand*0.3))
const FOOD_BURN_RANGE := 0.3


static func plot_by_key(key: String) -> Dictionary:
	for p: Dictionary in PLOTS:
		if p.key == key:
			return p
	return {}


## officer.js baseLoyal() — 군주(LORD_ID)와 trait이 같으면 +12, 귀할수록
## (rarity 클수록) -6씩, 삼국지 사람이 아니면(재야에서 온 이방인) -4.
static func base_loyal(officer_id: String) -> int:
	var h = Characters.find(officer_id)
	var lord = Characters.find(LORD_ID)
	if h == null:
		return 50
	var v := 52
	if lord != null and String(lord.trait) == String(h.trait):
		v += 12
	v -= (int(h.rarity) - 3) * 6
	if String(h.era) != "삼국지":
		v -= 4
	return clampi(v, 25, 85)


## diplo.js plotChance() — 이간/매수(무장 대상) 항은 뺐다(이 슬라이스가
## 안 옮긴 두 계략용이라 여기 있을 이유가 없다). 남은 rumor/fire 공통
## 항만: 기본 0.30 + (내 지력-태수 지력)/200 + (60-치안)/400.
static func plot_chance(mine_wisdom: float, guard_wisdom: float, sec: int) -> float:
	var p := 0.30 + (mine_wisdom - guard_wisdom) / 200.0
	p += (60.0 - float(sec)) / 400.0
	return clampf(p, 0.05, 0.9)


## diplo.js envoyChance(kind==='truce') — edge(국력 차)·commonEnemy(공동의
## 적) 보정은 위 머리말 이유로 뺐다.
static func truce_chance(wisdom: float, relation: int, gold: int) -> float:
	var p := TRUCE_BASE + wisdom / 320.0 + float(relation) / 260.0 + float(gold) / 12000.0
	return clampf(p, 0.03, 0.95)


## diplo.js envoy(kind==='tribute') — round(gold/120), 1~30 사이.
static func tribute_up(gold: int) -> int:
	return clampi(roundi(float(gold) / 120.0), 1, 30)


static func clamp_relation(v: int) -> int:
	return clampi(v, 0, 100)
