class_name Season
extends RefCounted

## saga-go 웹판 js/season.js를 옮긴다("새로 설계하지 않는다", duel_rules.gd와
## 같은 원칙). 웹판처럼 달(月)만 보는 순수 함수 — 실제 벽시계 월을 그대로 쓴다
## (TimeOfDay가 실제 시각을 쓰는 것과 같은 이유, "시각의 순수 함수").
##
## 웹판 SEASONS는 나뭇잎/논밭/들 색·NPC 옷 밝기·사건 가중치까지 건드리지만,
## 이 슬라이스에 있는 자리는 그중 둘뿐이다 — **날씨 확률**(weather.gd가
## wx 표를 읽어 간다, 웹판과 같은 경계 "날씨만 판정에 닿는다")과 **환경광
## 색 배수**(season_weather_visual.gd가 읽어 계절 분위기만 살짝 낸다).
## 식생 색 틴트·NPC 옷 색은 이번 범위 밖(다음에 손댈 때 이 표에 필드만
## 추가하면 된다 — 구조는 이미 확장 가능하게 짜 뒀다).

static var _forced: String = "" # "" = 강제 안 함(실제 벽시계 월)

const SPRING := "spring"
const SUMMER := "summer"
const AUTUMN := "autumn"
const WINTER := "winter"

## wx: 그 계절에 그 날씨가 얼마나 더/덜 나오는지 배수(웹판 SEASONS[].wx 그대로,
##     weather.gd가 이 값으로 가중치를 기울인다)
## ambient_mul: 환경광·안개색을 이 배수로 민다(시각 전용, 판정에는 안 닿는다)
const TABLE := {
	SPRING: {
		"name": "봄", "emoji": "🌸", "months": [3, 4, 5],
		"wx": {"clear": 1.2, "cloud": 1.0, "rain": 1.1, "wind": 1.2, "fog": 1.1, "snow": 0.05},
		"ambient_mul": Color(1.0, 1.02, 0.98),
	},
	SUMMER: {
		"name": "여름", "emoji": "🌿", "months": [6, 7, 8],
		"wx": {"clear": 1.1, "cloud": 1.1, "rain": 1.9, "wind": 0.8, "fog": 0.7, "snow": 0.0},
		"ambient_mul": Color(1.0, 1.0, 1.0),
	},
	AUTUMN: {
		"name": "가을", "emoji": "🍂", "months": [9, 10, 11],
		"wx": {"clear": 1.3, "cloud": 1.0, "rain": 0.7, "wind": 1.3, "fog": 1.4, "snow": 0.1},
		"ambient_mul": Color(1.05, 0.98, 0.9),
	},
	WINTER: {
		"name": "겨울", "emoji": "❄️", "months": [12, 1, 2],
		"wx": {"clear": 0.9, "cloud": 1.2, "rain": 0.2, "wind": 1.1, "fog": 0.9, "snow": 2.6},
		"ambient_mul": Color(0.95, 0.97, 1.05),
	},
}

const ORDER := [SPRING, SUMMER, AUTUMN, WINTER]


static func force(key: String) -> void:
	_forced = key if TABLE.has(key) else ""


static func key_at_month(month: int) -> String:
	for k in ORDER:
		if TABLE[k]["months"].has(month):
			return k
	return SPRING


static func current_key() -> String:
	if _forced != "":
		return _forced
	var month: int = Time.get_datetime_dict_from_system()["month"]
	return key_at_month(month)


static func current() -> Dictionary:
	return TABLE[current_key()]


## weather.gd가 물어보는 문 — 이 계절에 그 날씨가 얼마나 더 나오는지 배수
static func weather_weight(weather_key: String) -> float:
	var wx: Dictionary = current()["wx"]
	return wx.get(weather_key, 1.0)
