class_name ForestDay
extends RefCounted

## 웹판 saga-forest/js/village.js의 today()/rollDay() — 채집물의 "하루 1회"
## 리셋(data-village.js PROPS의 reset:1)이 **게임 내 가속 시계가 아니라
## 실제 달력 날짜**를 기준으로 도는 것을 그대로 옮긴다. 원작은
## `new Date().getTimezoneOffset()`로 그 지역 자정을 직접 계산하지만,
## Godot의 `Time.get_datetime_dict_from_system(false)`는 이미 로컬 달력
## 날짜를 돌려주므로 그 계산이 필요 없다 — year*10000+month*100+day로
## "오늘"을 나타내는 정수 하나만 있으면 된다(산술은 안 하고 동등 비교만
## 하니 그레고리력 그대로 충분하다).
##
## 루트 CLAUDE.md "검증 습관" — "시각에 기대는 축은 진단에서 붙들어 둔다"
## (GO의 weather.gd·time_of_day.gd와 같은 이유) — force()가 없으면 헤드리스
## 검증 결과가 **이 코드를 실행하는 실제 날짜**에 따라 달라진다.

static var _forced: Variant = null  # null = 강제 안 함(실제 날짜), int = 강제된 day_key

static func force(day_key: Variant) -> void:
	_forced = day_key

static func today_key() -> int:
	if _forced != null:
		return int(_forced)
	var d := Time.get_datetime_dict_from_system(false)
	return int(d.year) * 10000 + int(d.month) * 100 + int(d.day)


## 제외 목록 5번(순무 시세) 추가 — 요일·주 번호를 셈하려면 today_key()의
## "년월일 숫자"가 아니라 **1970-01-01부터 며칠째인지**(정수 하나, 산술
## 가능)가 필요하다. 웹판 turnip.js의 dow()/week()가 `(날짜+4)%7`로
## 요일을 셈하는 것과 같은 기준 — 1970-01-01(Unix epoch)이 목요일이라
## +4가 일요일을 0으로 맞춘다. today_key()와 별도의 force를 둔다(서로
## 다른 계산이라 굳이 하나로 합칠 이유가 없다).
static var _forced_epoch_day: Variant = null

static func force_epoch_day(day_index: Variant) -> void:
	_forced_epoch_day = day_index

static func epoch_day_index() -> int:
	if _forced_epoch_day != null:
		return int(_forced_epoch_day)
	var d := Time.get_datetime_dict_from_system(false)
	d["hour"] = 0
	d["minute"] = 0
	d["second"] = 0
	var unix := Time.get_unix_time_from_datetime_dict(d)
	return int(floor(unix / 86400.0))
