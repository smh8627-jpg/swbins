extends Label

## PartyLabel·QuestLabel·CodexLabel과 같은 경계(상시 표시, 토스트 아님).
## 계절·천후는 시간이 지나야만 바뀌므로(1달·3시간) 신호로 안 알려 준다 —
## RendererDebugLabel처럼 한 번만 찍지는 않되, season_weather_visual.gd와
## 같은 주기로 드문드문 다시 읽는다.

@export var check_interval_sec: float = 60.0


func _ready() -> void:
	_refresh()
	var t := Timer.new()
	t.wait_time = check_interval_sec
	t.timeout.connect(_refresh)
	add_child(t)
	t.start()


func _refresh() -> void:
	text = SeasonWeatherVisual.summary()
