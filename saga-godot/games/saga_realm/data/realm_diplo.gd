extends RefCounted

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

const TRUCE_MONTHS := 8            # diplo.js TRUCE_MONTHS
const DEFAULT_RELATION := 40       # diplo.js relation() 기본값
const TRUCE_BASE := 0.30           # diplo.js envoyChance() kind==='truce'
const TRUCE_SUCCESS_BONUS := 12    # diplo.js envoy() 화친 성공 시 +우호
const TRUCE_FAIL_BONUS := 2        # diplo.js envoy() 사양당해도 +우호
const ENVOY_FEE := 100             # diplo.js envoy() "gold+100"의 고정 수수료


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
