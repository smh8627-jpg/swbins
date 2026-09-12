extends Label

## FOREST gather_label.gd와 같은 폴링 패턴 — 값이 바뀌는 곳이 여럿이라도
## (명령 버튼·다음 달 버튼·성 버튼) 폴링이 신호 배선보다 단순하다.
##
## 2026-09-12 — 여러 성 추가로 agri/comm/sec/troops가 이제 current_city
## 안에 있다. 성 이름을 맨 앞에 붙여 "지금 어느 성을 보고 있는지"부터
## 보이게 했다(성 버튼으로 바꿀 수 있다).

const RealmCities := preload("res://games/saga_realm/data/realm_cities.gd")


func _process(_delta: float) -> void:
	var c: Dictionary = RealmSaveState.cities.get(RealmSaveState.current_city, {})
	var city_def := RealmCities.by_id(RealmSaveState.current_city)
	text = "%s · %d년 %d월 · 🪙 %d · 🌾 %d · 🏪 %d · 🪧 %d · 🪖 %d · 재야 %d" % [
		String(city_def.get("name", "")),
		RealmSaveState.year, RealmSaveState.month,
		RealmSaveState.gold,
		int(c.get("agri", 0)), int(c.get("comm", 0)), int(c.get("sec", 0)), int(c.get("troops", 0)),
		RealmSaveState.found.size(),
	]
