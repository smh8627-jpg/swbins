extends Button

## "다음 달" 버튼 — RealmSaveState.next_month()(정산) 실행 후 결과를 토스트로.
##
## **2026-09-12 고침 — `RealmSaveState.food`는 "여러 성" 확장(commit d41c687)
## 때 `cities[city_id].food`로 옮겨졌는데 이 스크립트가 안 따라와, 없는
## 최상위 `food` 프로퍼티를 읽으려다 파싱 자체가 실패하고 있었다(헤드리스
## 검증에서 "exit 0"만 보고 로그의 SCRIPT ERROR는 그때 안 훑어서 놓쳤던
## 것 — 이번 세션에서 발견). 정산은 성마다 따로 나니 `current_city`(HUD가
## "지금 조망 중인 성"으로 쓰는 것과 같은 관점) 기준으로 고쳤다.

const Toast := preload("res://saga_core/ui/toast.gd")
const TOAST_SEC := 3.0


func _ready() -> void:
	text = "다음 달"
	pressed.connect(_on_pressed)


func _on_pressed() -> void:
	var city_id := RealmSaveState.current_city
	var before_gold := RealmSaveState.gold
	var before_food := int(RealmSaveState.cities[city_id].food)
	RealmSaveState.next_month()

	var gold_diff := RealmSaveState.gold - before_gold
	var msg := "%d년 %d월 — 🪙 %s%d" % [
		RealmSaveState.year, RealmSaveState.month, "+" if gold_diff >= 0 else "", gold_diff]
	var food_diff := int(RealmSaveState.cities[city_id].food) - before_food
	if food_diff != 0:
		msg += " · 🌾 %s%d" % ["+" if food_diff >= 0 else "", food_diff]
	Toast.show(self, msg, TOAST_SEC)
