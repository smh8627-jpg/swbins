extends RefCounted

## PLAN 106장 ㊸ — 원신식 업적(표만 — 진척·알림·받기는 world/achievements.gd, 상태는 PartyState.achievements
## {"stats": {셈: 수}, "tier": {업적: 닿은 단계}, "claimed": {업적: 받은 단계}}).
##   업적 = 갈래 하나 · 셈(stat) 하나 · 단계 1~3(tiers = 닿아야 할 수). 단계에 닿으면 알림, 보상은 업적 화면(Y)에서 받는다(원신과 같다).
##   셈은 두 가지 — 신호로 세는 것(적 쓰러뜨림·반응·채집·요리·낚시·비경·급소 화살, stats 에 쌓임)과
##   이미 있는 상태에서 읽는 것(상자·별조각·지점·신상·탐험·이야기 장·세계 임무·모험 등급·물고기 가짓수·반응 가짓수 — DERIVED).
## 이름·글은 이 판 것(원작 업적 이름을 옮기지 않는다).

const CATEGORIES := ["explore", "combat", "element", "life", "story"]
const CATEGORY_NAMES := {"explore": "세상 곳곳", "combat": "싸움의 길", "element": "원소의 이치", "life": "살림살이", "story": "이야기"}

## 셈 가운데 상태에서 읽는 것(stats 에 안 쌓인다).
const DERIVED := ["chests", "shards", "waypoints", "statue", "regions_full", "chapters", "world_quests", "ar", "fish_kinds", "reaction_kinds"]

## 단계마다 기본 보상(업적 칸 reward 가 있으면 그것).
const TIER_REWARD := [
	{"mora": 3000},
	{"mora": 6000, "book_s": 3},
	{"book_m": 2, "ore_m": 2},
]

const ORDER := [
	"a_chests", "a_shards", "a_waypoints", "a_statue", "a_regions",
	"a_kills", "a_elemental", "a_bosses", "a_domains", "a_weak",
	"a_reactions", "a_reaction_kinds", "a_shatter", "a_swirl",
	"a_gather", "a_cook", "a_delicious", "a_fish", "a_fish_kinds",
	"a_story", "a_wq", "a_ar",
]

const LIST := {
	## 세상 곳곳
	"a_chests": {"cat": "explore", "name": "보물 사냥꾼", "desc": "보물 상자 %d개 열기", "stat": "chests", "tiers": [5, 10, 18]},
	"a_shards": {"cat": "explore", "name": "별 줍는 이", "desc": "별조각 %d개 줍기", "stat": "shards", "tiers": [5, 12, 20]},
	"a_waypoints": {"cat": "explore", "name": "길을 잇는 이", "desc": "순간이동 지점 %d곳 켜기", "stat": "waypoints", "tiers": [3, 6, 8]},
	"a_statue": {"cat": "explore", "name": "신상의 벗", "desc": "신상 레벨 %d", "stat": "statue", "tiers": [2, 5, 10]},
	"a_regions": {"cat": "explore", "name": "발 닿는 대로", "desc": "지역 %d곳 탐험도 100%%", "stat": "regions_full", "tiers": [1, 3],
		"reward": [{"mora": 10000}, {"fate_knot": 1, "book_m": 2}]},
	## 싸움의 길
	"a_kills": {"cat": "combat", "name": "들판의 파수꾼", "desc": "들판의 적 %d번 쓰러뜨리기", "stat": "kills", "tiers": [20, 100, 300]},
	"a_elemental": {"cat": "combat", "name": "원소 괴물 사냥", "desc": "원소 괴물 %d번 쓰러뜨리기", "stat": "kills_elemental", "tiers": [5, 20, 60]},
	"a_bosses": {"cat": "combat", "name": "우두머리 사냥", "desc": "보스 %d번 쓰러뜨리기(들판·주간·이야기)", "stat": "bosses", "tiers": [1, 5, 15]},
	"a_domains": {"cat": "combat", "name": "비경 탐험가", "desc": "비경 %d번 깨기", "stat": "domains", "tiers": [1, 5, 15]},
	"a_weak": {"cat": "combat", "name": "명사수", "desc": "활로 적 급소 %d번 맞히기", "stat": "weak_hits", "tiers": [1, 10, 30]},
	## 원소의 이치
	"a_reactions": {"cat": "element", "name": "원소 반응", "desc": "원소 반응 %d번 일으키기", "stat": "reactions", "tiers": [10, 50, 200]},
	"a_reaction_kinds": {"cat": "element", "name": "원소의 이치", "desc": "서로 다른 원소 반응 %d가지 일으키기", "stat": "reaction_kinds", "tiers": [4, 8, 14],
		"reward": [{"mora": 3000}, {"mora": 6000, "book_s": 3}, {"fate_knot": 1, "book_m": 2}]},
	"a_shatter": {"cat": "element", "name": "얼음 깨기", "desc": "얼어 있는 적을 %d번 깨뜨리기(쇄빙)", "stat": "react_shatter", "tiers": [1, 10]},
	"a_swirl": {"cat": "element", "name": "바람 따라", "desc": "확산 %d번 일으키기", "stat": "react_swirl", "tiers": [1, 20]},
	## 살림살이
	"a_gather": {"cat": "life", "name": "부지런한 손", "desc": "채집물 %d개 줍기", "stat": "gathered", "tiers": [20, 60, 150]},
	"a_cook": {"cat": "life", "name": "솥 앞의 하루", "desc": "요리 %d번 하기", "stat": "cooked", "tiers": [1, 10, 30]},
	"a_delicious": {"cat": "life", "name": "맛있는 한 상", "desc": "맛있는 요리 %d번 만들기", "stat": "delicious", "tiers": [1, 5, 15]},
	"a_fish": {"cat": "life", "name": "강태공", "desc": "물고기 %d마리 낚기", "stat": "fish", "tiers": [1, 10, 30]},
	"a_fish_kinds": {"cat": "life", "name": "물고기 도감", "desc": "물고기 %d가지 낚기", "stat": "fish_kinds", "tiers": [3, 5, 8]},
	## 이야기
	"a_story": {"cat": "story", "name": "먹구름을 걷고", "desc": "이야기 임무 %d장 마치기", "stat": "chapters", "tiers": [1, 5, 9],
		"reward": [{"mora": 5000}, {"mora": 10000, "book_m": 2}, {"fate_knot": 1, "book_m": 3}]},
	"a_wq": {"cat": "story", "name": "마을의 해결사", "desc": "세계 임무 %d개 마치기", "stat": "world_quests", "tiers": [1, 2, 3]},
	"a_ar": {"cat": "story", "name": "모험가의 발자취", "desc": "모험 등급 %d", "stat": "ar", "tiers": [5, 10, 20]},
}

static func info(id: String) -> Dictionary:
	return LIST.get(id, {})

static func tier_count(id: String) -> int:
	return (info(id).get("tiers", []) as Array).size()

## 그 값으로 닿은 단계(0 = 아직).
static func tier_for(id: String, value: int) -> int:
	var n := 0
	for t in info(id).get("tiers", []):
		if value >= int(t):
			n += 1
	return n

## t 번째 단계(1부터) 보상.
static func reward_of(id: String, t: int) -> Dictionary:
	var d := info(id)
	if d.has("reward"):
		return d.reward[t - 1]
	return TIER_REWARD[t - 1]

static func desc_of(id: String, t: int) -> String:
	var d := info(id)
	var tiers: Array = d.tiers
	return String(d.desc) % int(tiers[clampi(t - 1, 0, tiers.size() - 1)])

static func total_tiers() -> int:
	var n := 0
	for id in ORDER:
		n += tier_count(id)
	return n
