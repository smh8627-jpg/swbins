extends Button

## "다음 달" 버튼 — RealmSaveState.next_month()(정산) 실행 후 결과를 토스트로.

const Toast := preload("res://saga_core/ui/toast.gd")
const TOAST_SEC := 3.0


func _ready() -> void:
	text = "다음 달"
	pressed.connect(_on_pressed)


func _on_pressed() -> void:
	var before_gold := RealmSaveState.gold
	var before_food := RealmSaveState.food
	RealmSaveState.next_month()

	var gold_diff := RealmSaveState.gold - before_gold
	var msg := "%d년 %d월 — 🪙 %s%d" % [
		RealmSaveState.year, RealmSaveState.month, "+" if gold_diff >= 0 else "", gold_diff]
	var food_diff := RealmSaveState.food - before_food
	if food_diff != 0:
		msg += " · 🌾 %s%d" % ["+" if food_diff >= 0 else "", food_diff]
	Toast.show(self, msg, TOAST_SEC)
