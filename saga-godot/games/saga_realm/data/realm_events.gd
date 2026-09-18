extends RefCounted

const RealmTraits := preload("res://games/saga_realm/data/realm_traits.gd")

## PLAN 101-2 REALM ⑤후보(웹판 §5-2 "관계·이벤트 체인") — CK3 이벤트 체인·
## 코에이 "역사 이벤트"를 옮긴 것. **재해석 — "관계"가 없다.** 웹판은
## 무장 54+HEROES 105 중 가명 오마주 관계 20~30쌍(의형제·원수·사제)을 선언해
## 두 사람 사이 사건을 벌이지만, 이 슬라이스는 로스터가 보통 한둘~서넛뿐이고
## 관계 표 자체가 없다(`realm_officer_pool.gd` 머리말 참고) — 대신 **이미
## 있는 무장 하나의 특성·야망**(`realm_traits.gd`, 101-2 ③)을 조건으로 삼는
## **1인 서사 카드**로 좁혔다. 12종 대신 8종(특성 7가지+야망 1가지 채널)으로
## 시작한다.
##
## 각 항목의 `choices`는 웹판 "선택지 3개(공격/방어/유틸 축)"를 그대로 담되,
## 효과는 이 슬라이스에 실제 있는 값(충성·금·경험)만 쓴다. `chain`이 있으면
## 그 선택을 골랐을 때만 `chain_months` 뒤 같은 무장에게 후속 이벤트가 걸린다
## (웹판 "체인 2~3단, 3~6달 뒤"). 체인 전용 항목(`greedy_bribe_2`·
## `militant_rematch`)은 `trait`가 비어 있어 무작위 발생 후보에서 빠진다
## (`realm_save_state.gd::_tick_events()`가 이 필드로 거른다).

const EVENT_CHANCE := 0.18   # 웹판 "달마다 발생 확률 18%" 그대로
const MAX_CONCURRENT := 2    # 웹판 "세력당 동시 진행 체인 최대 2" 그대로

const EVENTS := {
	"greedy_bribe": {
		"name": "뇌물 소문", "emoji": "💰", "trait": "greedy",
		"text": "%s 이(가) 뇌물을 받았다는 소문이 돈다.",
		"choices": [
			{"label": "엄벌한다(공격)", "axis": "공격", "loyal": -8, "gold": 150, "exp": 0},
			{"label": "용서한다(방어)", "axis": "방어", "loyal": 6, "gold": 0, "exp": 0},
			{"label": "눈감아준다(유틸)", "axis": "유틸", "loyal": -3, "gold": 250, "exp": 0, "chain": "greedy_bribe_2", "chain_months": 4},
		],
	},
	"greedy_bribe_2": {
		"name": "재발", "emoji": "💸", "trait": "",
		"text": "%s 이(가) 또 손을 벌린다 — 이번엔 눈감아준 게 발목을 잡는다.",
		"choices": [
			{"label": "이번엔 끊는다(공격)", "axis": "공격", "loyal": -10, "gold": 200, "exp": 0},
			{"label": "다시 눈감는다(방어)", "axis": "방어", "loyal": 2, "gold": 300, "exp": 0},
			{"label": "다른 자리로 돌린다(유틸)", "axis": "유틸", "loyal": -2, "gold": 0, "exp": 6},
		],
	},
	"honest_report": {
		"name": "부정 고발", "emoji": "🌿", "trait": "honest",
		"text": "%s 이(가) 아전의 부정을 고발한다.",
		"choices": [
			{"label": "함께 조사한다(공격)", "axis": "공격", "loyal": 5, "gold": -50, "exp": 8},
			{"label": "조용히 덮는다(방어)", "axis": "방어", "loyal": -4, "gold": 0, "exp": 0},
			{"label": "상을 내린다(유틸)", "axis": "유틸", "loyal": 10, "gold": -150, "exp": 0},
		],
	},
	"militant_challenge": {
		"name": "대련 청함", "emoji": "⚔️", "trait": "militant",
		"text": "%s 이(가) 무예를 겨루자 청한다.",
		"choices": [
			{"label": "응한다(공격)", "axis": "공격", "loyal": -3, "gold": 0, "exp": 15, "chain": "militant_rematch", "chain_months": 3},
			{"label": "거절한다(방어)", "axis": "방어", "loyal": -2, "gold": 0, "exp": 0},
			{"label": "은자로 달랜다(유틸)", "axis": "유틸", "loyal": 4, "gold": -150, "exp": 0},
		],
	},
	"militant_rematch": {
		"name": "재대결", "emoji": "🗡️", "trait": "",
		"text": "%s 이(가) 재대결을 청한다 — 지난 승부가 성에 안 찼다.",
		"choices": [
			{"label": "다시 응한다(공격)", "axis": "공격", "loyal": 2, "gold": 0, "exp": 18},
			{"label": "이제 그만하라 이른다(방어)", "axis": "방어", "loyal": -3, "gold": 0, "exp": 0},
			{"label": "다른 무장을 붙인다(유틸)", "axis": "유틸", "loyal": 0, "gold": -100, "exp": 8},
		],
	},
	"scholarly_petition": {
		"name": "학당 청원", "emoji": "📚", "trait": "scholarly",
		"text": "%s 이(가) 학당 지원을 청한다.",
		"choices": [
			{"label": "크게 지원한다(공격)", "axis": "공격", "loyal": 6, "gold": -200, "exp": 12},
			{"label": "거절한다(방어)", "axis": "방어", "loyal": -4, "gold": 0, "exp": 0},
			{"label": "절충한다(유틸)", "axis": "유틸", "loyal": 2, "gold": -80, "exp": 5},
		],
	},
	"ambitious_petition": {
		"name": "승진 청탁", "emoji": "🔥", "trait": "ambitious",
		"text": "%s 이(가) 승진을 청탁한다.",
		"choices": [
			{"label": "힘을 실어준다(공격)", "axis": "공격", "loyal": 8, "gold": 0, "exp": 14},
			{"label": "거절한다(방어)", "axis": "방어", "loyal": -6, "gold": 0, "exp": 0},
			{"label": "다음 기회로 미룬다(유틸)", "axis": "유틸", "loyal": -1, "gold": 0, "exp": 4},
		],
	},
	"cunning_scheme": {
		"name": "계략 건의", "emoji": "🦊", "trait": "cunning",
		"text": "%s 이(가) 계략 하나를 은밀히 건의한다.",
		"choices": [
			{"label": "채택한다(공격)", "axis": "공격", "loyal": 3, "gold": -100, "exp": 10},
			{"label": "거절한다(방어)", "axis": "방어", "loyal": -2, "gold": 0, "exp": 0},
			{"label": "조건부로 허락한다(유틸)", "axis": "유틸", "loyal": 3, "gold": -50, "exp": 4},
		],
	},
	"cold_training": {
		"name": "혹독한 훈련", "emoji": "❄️", "trait": "cold",
		"text": "%s 이(가) 병사를 더 혹독히 훈련시키겠다 청한다.",
		"choices": [
			{"label": "허락한다(공격)", "axis": "공격", "loyal": -2, "gold": 0, "exp": 10},
			{"label": "말린다(방어)", "axis": "방어", "loyal": 2, "gold": 0, "exp": 0},
			{"label": "절반만 허락한다(유틸)", "axis": "유틸", "loyal": 0, "gold": 0, "exp": 5},
		],
	},
	"rival_chance": {
		"name": "숙적을 노릴 기회", "emoji": "🎯", "trait": "", "ambition": "rival",
		"text": "%s 이(가) 벼르던 적 장수를 노릴 기회가 왔다고 알려온다.",
		"choices": [
			{"label": "은밀히 처리한다(공격)", "axis": "공격", "loyal": 4, "gold": -100, "exp": 0, "ambition_progress": true},
			{"label": "때를 기다린다(방어)", "axis": "방어", "loyal": 0, "gold": 0, "exp": 0},
			{"label": "금으로 매수를 돕는다(유틸)", "axis": "유틸", "loyal": 2, "gold": -200, "exp": 0, "ambition_progress": true},
		],
	},
}

## 무작위 발생 후보 — `trait`(비특성 트리거) 또는 `ambition`이 있는 항목만.
## 체인 전용 항목(`greedy_bribe_2` 등)은 둘 다 비어 있어 자동으로 빠진다.
static func by_key(k: String) -> Dictionary:
	return EVENTS.get(k, {})


static func _roll_candidates() -> Array[String]:
	var out: Array[String] = []
	for key: String in EVENTS:
		var e: Dictionary = EVENTS[key]
		if not String(e.get("trait", "")).is_empty() or not String(e.get("ambition", "")).is_empty():
			out.append(key)
	return out


## officer_id가 걸릴 수 있는 이벤트 하나를 무작위로 고른다(특성 2개·야망
## 1개 중 겹치는 항목 전부가 후보) — 후보가 없으면 "". `rng`는 호출부의
## 고정 시드 `_rng`를 그대로 받아 결정성을 유지한다.
static func pick_for(officer_id: String, ambition_key: String, rng: RandomNumberGenerator) -> String:
	var pool: Array[String] = []
	for key: String in _roll_candidates():
		var e: Dictionary = EVENTS[key]
		var trait_key := String(e.get("trait", ""))
		var amb_key := String(e.get("ambition", ""))
		if not trait_key.is_empty() and RealmTraits.has_trait(officer_id, trait_key):
			pool.append(key)
		elif not amb_key.is_empty() and amb_key == ambition_key:
			pool.append(key)
	if pool.is_empty():
		return ""
	return pool[rng.randi_range(0, pool.size() - 1)]
