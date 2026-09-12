extends Button

## "외교" 버튼 — diplo.js의 조공(tribute)·화친(truce)을 좁혀 옮긴 첫
## 외교 슬라이스(2026-09-12, "외교도 이어해" — 전쟁 슬라이스가 남긴
## 첫 후보). city_button.gd/order_button.gd와 같은 ChoicePrompt 패턴.
## 상대는 소패의 주인(`realm_cities.gd ENEMY_CITIES[0].lord`) 하나뿐이라
## 목표 선택 UI는 없다.

const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")
const Toast := preload("res://saga_core/ui/toast.gd")
const Characters := preload("res://saga_core/data/characters.gd")
const RealmCities := preload("res://games/saga_realm/data/realm_cities.gd")
const RealmDiplo := preload("res://games/saga_realm/data/realm_diplo.gd")

const TARGET := "xiaopei"
const TOAST_SEC := 3.5


func _ready() -> void:
	text = "외교"
	pressed.connect(_on_pressed)


func _lord_name() -> String:
	var enemy_def := RealmCities.enemy_by_id(TARGET)
	var h = Characters.find(String(enemy_def.get("lord", "")))
	return String(h.name) if h else "상대"


func _on_pressed() -> void:
	var layer_box := {}
	var choices: Array = [
		{"label": "🎁 조공 — 금을 보내 우호를 올린다(확정)",
		 "cb": func() -> void: _run_tribute(layer_box)},
		{"label": "🤝 화친 — 정전을 청한다(성공하면 %d개월간 공격 못 함)" % RealmDiplo.TRUCE_MONTHS,
		 "cb": func() -> void: _run_truce(layer_box)},
	]
	layer_box["layer"] = ChoicePrompt.build(self, "외교 — %s" % _lord_name(), choices)


func _run_tribute(layer_box: Dictionary) -> void:
	(layer_box["layer"] as CanvasLayer).queue_free()
	var r := RealmSaveState.envoy_tribute(TARGET)
	if not r.get("ok", false):
		Toast.show(self, "조공 — %s" % r.get("why", "실패"), TOAST_SEC)
		return
	Toast.show(self, "🎁 조공 — 우호 +%d (지금 %d)" % [int(r.up), int(r.relation)], TOAST_SEC)


func _run_truce(layer_box: Dictionary) -> void:
	(layer_box["layer"] as CanvasLayer).queue_free()
	var r := RealmSaveState.envoy_truce(TARGET)
	if not r.get("ok", false):
		Toast.show(self, "화친 — %s" % r.get("why", "실패"), TOAST_SEC)
		return
	if r.accepted:
		Toast.show(self, "🤝 화친을 맺었다! (우호 %d)" % int(r.relation), TOAST_SEC)
	else:
		Toast.show(self, "📜 화친을 사양했다 (우호 %d)" % int(r.relation), TOAST_SEC)
