class_name ForestFestival
extends RefCounted

## VERTICAL_SLICE_FOREST.md 4절 "제외" 목록 6번 — 계절행사 8일. 웹판
## js/data-village.js EVENTS·js/town.js를 그대로 옮긴다(양력 고정 여덟
## 날, 이름·가격 배율 값 하나 안 바꿈).
##
## **재해석한 부분** — 웹판은 행사날 밤하늘·나무 겉모습을 바꾸는 시각
## 연출(tag: moon/star/blossom/fire, 달이 커지거나 벚꽃이 흩날리는 것)을
## 곁들이지만, 이 슬라이스엔 그걸 그릴 대상(밤하늘 연출·계절 텍스처
## 교체)이 아직 없다 — hello/desc 텍스트 안내와 up(가격 배율)만 옮기고
## 시각 연출은 범위 밖으로 남긴다.
##
## 날짜는 ForestDay.today_key()(year*10000+month*100+day)에서 월/일만
## 뽑아 비교한다 — 행사는 "날짜만 본다"는 웹판 town.js 원칙 그대로 세이브에
## 남기지 않는다.

const EVENTS: Array = [
	{"key": "seollal", "name": "설날", "m": 1, "d": 1, "tag": "newyear",
	 "hello": "새해 첫날입니다", "desc": "주민에게 말을 걸면 세뱃돈을 줍니다(사람마다 한 번)."},
	{"key": "daeborum", "name": "대보름", "m": 2, "d": 15, "up_cat": "솔방울", "up_mul": 2.0,
	 "hello": "보름달이 큽니다", "desc": "부럼(솔방울) 값이 갑절입니다."},
	{"key": "samjin", "name": "삼짇날", "m": 4, "d": 3, "up_cat": "꽃", "up_mul": 2.0,
	 "hello": "꽃놀이 가는 날입니다", "desc": "꽃 값이 갑절입니다."},
	{"key": "dano", "name": "단오", "m": 6, "d": 5, "up_cat": "꽃", "up_mul": 1.8,
	 "hello": "창포에 머리 감는 날입니다", "desc": "꽃 값이 오릅니다."},
	{"key": "chilseok", "name": "칠석", "m": 7, "d": 7, "up_cat": "곤충", "up_mul": 1.6,
	 "hello": "견우와 직녀가 만나는 밤입니다", "desc": "곤충 값이 오릅니다."},
	{"key": "baekjung", "name": "백중", "m": 8, "d": 15, "up_cat": "물고기", "up_mul": 1.6,
	 "hello": "호미를 씻고 노는 날입니다", "desc": "물고기 값이 오릅니다."},
	{"key": "chuseok", "name": "한가위", "m": 9, "d": 17, "up_cat": "과일", "up_mul": 2.0,
	 "hello": "더도 말고 덜도 말고 오늘만 같아라", "desc": "과일 값이 갑절입니다."},
	{"key": "dongji", "name": "동지", "m": 12, "d": 22, "up_cat": "과일", "up_mul": 1.5,
	 "hello": "밤이 가장 긴 날입니다", "desc": "과일 값이 오릅니다."},
]


static func _month_of(day_key: int) -> int:
	return (day_key / 100) % 100


static func _day_of(day_key: int) -> int:
	return day_key % 100


static func event_of_day_key(day_key: int) -> Dictionary:
	var m := _month_of(day_key)
	var d := _day_of(day_key)
	for e: Dictionary in EVENTS:
		if int(e.m) == m and int(e.d) == d:
			return e
	return {}


static func event_of_today() -> Dictionary:
	return event_of_day_key(ForestDay.today_key())


## 오늘 이 갈래(item_label)가 비싸게 팔리나 — 없으면 1.0.
static func price_mul(item_label: String) -> float:
	var e := event_of_today()
	if e.is_empty() or not e.has("up_cat"):
		return 1.0
	return float(e.up_mul) if String(e.up_cat) == item_label else 1.0


static func is_new_year() -> bool:
	var e := event_of_today()
	return not e.is_empty() and String(e.get("tag", "")) == "newyear"
