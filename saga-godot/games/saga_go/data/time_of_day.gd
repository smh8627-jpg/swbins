class_name TimeOfDay
extends RefCounted

## saga-go 웹판 js/npc.js·js/event.js·js/animal.js가 전부 공유하던
## hourOf()/isNight()를 그대로 옮긴다 — "새로 설계하지 않는다"(duel_rules.gd
## 와 같은 원칙). 웹판은 게임 내 가속 시계가 아니라 **실제 기기의 벽시계
## 시각**을 그대로 쓴다(`new Date(t).getHours()`) — 밤 21시~새벽 4시가
## 게임 속 "밤"이다. Godot 쪽도 `Time.get_time_dict_from_system()`으로
## 똑같이 실제 시각을 읽어 같은 경계를 지킨다.
##
## 루트 CLAUDE.md "검증 습관" — "시각에 기대는 축은 진단에서 붙들어 둔다
## (weather.force('clear') 등)"과 같은 이유로 `force()`를 둔다. 이게 없으면
## 헤드리스 검증 결과가 **이 코드를 실행하는 실제 시각**에 따라 달라져
## "세 번 돌려 출력이 한 줄도 다르지 않은지" 습관이 깨진다.

static var _forced: Variant = null # null = 강제 안 함(실제 시각), true/false = 강제

static func force(is_night_value: Variant) -> void:
	_forced = is_night_value

static func is_night() -> bool:
	if _forced != null:
		return _forced
	var h: int = Time.get_time_dict_from_system()["hour"]
	return h >= 21 or h < 4
