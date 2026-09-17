extends RefCounted

## PLAN 101-2 REALM ③후보(웹판 §5-1 "인물 특성·야망") — CK3·코에이 삼국지
## "의리·야심"을 좁혀 옮긴 것. 258명(웹)을 105명(이 슬라이스)으로 줄인
## 것처럼, 특성 12종·야망 6종은 원문 이름 그대로 두고 **계수를 배정하는
## 대상만 이 슬라이스에 실제로 있는 시스템으로 좁혔다** — 일기토·보물·
## 인연(관계)·지역 개념이 없어서다(각 항목 주석 참고).
##
## **이름 충돌 주의 — `characters.gd`의 `trait`(might/wisdom/virtue, 설득
## 어필 축)와 이 파일의 "특성"(12종)은 다른 개념이다.** 그래서 이 파일은
## 함수 이름을 전부 `traits_of`/`has_trait`처럼 복수형으로 두어 기존
## `h.trait` 단수 필드와 안 섞이게 했다.
##
## **결정성 — 세이브에 안 담는다(웹판 §5-1 "특성은 세이브 안 함"과 같다).**
## `_stable_hash(id)`가 문자 코드로 직접 굴리는 다항 해시라 Godot 버전이
## 바뀌어도 같은 문자열은 항상 같은 정수를 낸다(엔진 내장 `String.hash()`
## 에 기대지 않는다 — 루트 CLAUDE.md 진단 습관과 같은 이유).
##
## **계수는 다섯 특성에만 배정했다(용맹·신중·야심·온화·교활·의리·냉혈
## 일곱은 배지·설명만).** 웹판 §5-1 본문도 12종 전부가 아니라 "예)"로
## 넷(탐욕·충직·호전·학구)만 수치를 들었다 — 여기 다섯째(청렴)는 탐욕의
## 반대짝으로 자연히 뒤따라온다. 계수는 전부 웹판 "0.7~1.5 사이만" 규칙
## 안에 있다.

const TRAITS := {
	"brave":      {"name": "용맹", "emoji": "🦁"},
	"cautious":   {"name": "신중", "emoji": "🛡️"},
	"greedy":     {"name": "탐욕", "emoji": "💰"},
	"honest":     {"name": "청렴", "emoji": "🌿"},
	"ambitious":  {"name": "야심", "emoji": "🔥"},
	"loyal_heart":{"name": "충직", "emoji": "🤝"},
	"scholarly":  {"name": "학구", "emoji": "📚"},
	"militant":   {"name": "호전", "emoji": "⚔️"},
	"gentle":     {"name": "온화", "emoji": "🍃"},
	"cunning":    {"name": "교활", "emoji": "🦊"},
	"righteous":  {"name": "의리", "emoji": "🗡️"},
	"cold":       {"name": "냉혈", "emoji": "❄️"},
}
const TRAIT_KEYS: Array = ["brave", "cautious", "greedy", "honest", "ambitious",
	"loyal_heart", "scholarly", "militant", "gentle", "cunning", "righteous", "cold"]

## ── 계수(0.7~1.5 사이만, 웹판 §5-1 "수치") ──────────────────────
const TRAIT_GREEDY_BRIBE_MUL := 1.4     # 탐욕: 매수 대상이면 넘어오기 쉽다
const TRAIT_HONEST_BRIBE_MUL := 0.75    # 청렴: 탐욕의 반대짝(매수 저항)
const TRAIT_GREEDY_REWARD_MUL := 1.5    # 탐욕: "상 받으면 충성 +50%"(승진 보상)
const TRAIT_LOYAL_DEFECT_MUL := 0.75    # 충직: 재해석 — "인연 끌림 2배"(§5-2 관계
                                          # 시스템 없음) 대신 자기 이탈 확률을 낮춘다
const TRAIT_MILITANT_MIGHT_MUL := 1.1   # 호전: 재해석 — "일기토 발생률"(없음) 대신
                                          # 출진할 때 위력을 더 낸다
const TRAIT_SCHOLARLY_QUIZ_MUL := 1.3   # 학구: 문답 상금 ×1.3(그대로)


static func _stable_hash(id: String) -> int:
	var h := 5381
	for i in range(id.length()):
		h = (h * 33 + id.unicode_at(i)) & 0x7fffffff
	return h


## 결정적 특성 2개 — 같은 id는 항상 같은 특성 둘(순서 무관, 서로 다름).
static func traits_of(officer_id: String) -> Array:
	var h := _stable_hash(officer_id)
	var n := TRAIT_KEYS.size()
	var first := h % n
	var second := (h / n) % (n - 1)
	if second >= first:
		second += 1
	return [TRAIT_KEYS[first], TRAIT_KEYS[second]]


static func has_trait(officer_id: String, key: String) -> bool:
	return key in traits_of(officer_id)


static func trait_badge(officer_id: String) -> String:
	var out: Array = []
	for key: String in traits_of(officer_id):
		out.append(String(TRAITS[key].emoji))
	return "".join(out)


## ── 야망 6종 ────────────────────────────────────────────────────
## 원작 여섯(태수·고향·숙적·부귀·명성·학문)의 이름은 그대로 두고, 조건은
## 이 슬라이스에 실제로 있는 값으로 재해석했다(§5-1 "메커니즘" 참고):
## - 태수: 원작 그대로("성 하나 다스리기") — `_governor_at()`로 이미 있다.
## - 고향: "자기 지역 성 회복" → 지역 개념이 없어 "세력이 성을 더 갖는다"로
##   좁혔다(재야 성 편입 자체가 "회복"의 3D 판 축약).
## - 숙적: "특정 인물 꺾기" → 상대를 지목하는 시스템이 없어 "적 무장을
##   계략으로 하나 제거한다"(이간 성공 이탈·매수 성공)로 좁혔다.
## - 부귀: "보물 2개" → 유물 시스템이 없어(§6-8 여러 곳의 "유물은 안 준다"
##   재해석과 같은 이유) 세력 금고 문턱으로 갈음했다.
## - 명성: "일기토 3승" → 일기토가 없어 승진 5단 중 2단(중랑장) 도달로
##   갈음했다(관직도 "이름을 떨쳤다"는 뜻이 통한다).
## - 학문: "학식 상한" → `quiz.lore`는 쌓였다 비워지는 값이라 상한 삼기
##   어색해, 누적 익힌 문항 수(`quiz.learned`)로 갈음했다.
const AMBITIONS := {
	"governor": {"name": "태수", "emoji": "🏯", "target": 3, "reward_stat": "wisdom",
		"desc": "한 성을 3달 연속 다스린다"},
	"hometown": {"name": "고향", "emoji": "🏞️", "target": 4, "reward_stat": "command",
		"desc": "세력이 성 4개를 갖는다"},
	"rival":    {"name": "숙적", "emoji": "⚔️", "target": 1, "reward_stat": "might",
		"desc": "계략으로 적 무장 하나를 꺾는다"},
	"wealth":   {"name": "부귀", "emoji": "💎", "target": 5000, "reward_stat": "wisdom",
		"desc": "세력 금고 5000금을 모은다"},
	"fame":     {"name": "명성", "emoji": "🎖️", "target": 2, "reward_stat": "command",
		"desc": "관직 중랑장(2단)에 오른다"},
	"scholar":  {"name": "학문", "emoji": "📖", "target": 10, "reward_stat": "wisdom",
		"desc": "학당 문답 10개를 익힌다"},
}
const AMBITION_KEYS: Array = ["governor", "hometown", "rival", "wealth", "fame", "scholar"]

const AMBITION_DONE_LOYAL := 20     # 웹판 §5-1 "달성 시 충성 +20"
const AMBITION_DONE_STAT := 2       # 웹판 §5-1 "능력 +2 영구"
const AMBITION_FRUSTRATE_MONTHS := 12         # 웹판 §5-1 "12달 넘게 좌절이면"
const AMBITION_FRUSTRATE_LOYAL_HIT := 3       # 웹판 §5-1 "충성 -3/달"
## 웹판 "이간 취약 ×1.5" 재해석 — 적이 우리를 이간하는 시스템이 없어(22-2
## 절 AI는 plot()을 안 쓴다), 좌절한 본인의 이탈 확률에 같은 배율을 건다.
const AMBITION_FRUSTRATE_DEFECT_MUL := 1.5


## 결정적 야망 하나 — 특성과 같은 해시를 쓰되 다른 항으로 섞어 특성 조합과
## 무관하게 고르게 퍼지게 한다.
static func ambition_of(officer_id: String) -> String:
	var h := _stable_hash(officer_id + "#amb")
	return AMBITION_KEYS[h % AMBITION_KEYS.size()]
