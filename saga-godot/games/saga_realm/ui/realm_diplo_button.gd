extends Button

## "외교" 버튼 — diplo.js의 조공(tribute)·화친(truce)을 좁혀 옮긴 첫
## 외교 슬라이스(2026-09-12, "외교도 이어해" — 전쟁 슬라이스가 남긴
## 첫 후보). city_button.gd/order_button.gd와 같은 ChoicePrompt 패턴.
##
## **2026-09-13 추가 — 하비(xiapi, 여포령) 목표 추가.** 상대가 소패
## 하나뿐이던 것을 realm_attack_button.gd·realm_transfer_button.gd와
## 같은 결로 일반화했다 — 대상 고르기(1단) → 조공/화친 고르기(2단).
## `RealmCities.ENEMY_CITIES`가 늘 때마다 이 파일은 다시 안 고쳐도 된다.

const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")
const Toast := preload("res://saga_core/ui/toast.gd")
const Characters := preload("res://saga_core/data/characters.gd")
const RealmCities := preload("res://games/saga_realm/data/realm_cities.gd")
const RealmDiplo := preload("res://games/saga_realm/data/realm_diplo.gd")

const TOAST_SEC := 3.5


func _ready() -> void:
	text = "외교"
	pressed.connect(_on_pressed)


func _lord_name(target_id: String) -> String:
	var enemy_def := RealmCities.enemy_by_id(target_id)
	var h = Characters.find(String(enemy_def.get("lord", "")))
	return String(h.name) if h else "상대"


func _on_pressed() -> void:
	var layer_box := {}
	var choices: Array = []
	for e: Dictionary in RealmCities.ENEMY_CITIES:
		var eid := String(e.id)
		if bool(RealmSaveState.enemies.get(eid, {}).get("captured", false)):
			continue
		choices.append({
			"label": "%s — %s" % [String(e.get("name", eid)), _lord_name(eid)],
			"cb": func() -> void: _pick_action(eid, layer_box),
		})
	if choices.is_empty():
		Toast.show(self, "외교할 상대가 없습니다", TOAST_SEC)
		return
	layer_box["layer"] = ChoicePrompt.build(self, "외교 — 누구와", choices)


func _pick_action(target_id: String, layer_box: Dictionary) -> void:
	(layer_box["layer"] as CanvasLayer).queue_free()
	var action_box := {}
	var choices: Array = [
		{"label": "🎁 조공 — 금을 보내 우호를 올린다(확정)",
		 "cb": func() -> void: _run_tribute(target_id, action_box)},
		{"label": "🤝 화친 — 정전을 청한다(성공하면 %d개월간 공격 못 함)" % RealmDiplo.TRUCE_MONTHS,
		 "cb": func() -> void: _run_truce(target_id, action_box)},
	]
	action_box["layer"] = ChoicePrompt.build(self, "외교 — %s" % _lord_name(target_id), choices)


func _run_tribute(target_id: String, layer_box: Dictionary) -> void:
	(layer_box["layer"] as CanvasLayer).queue_free()
	var r := RealmSaveState.envoy_tribute(target_id)
	if not r.get("ok", false):
		Toast.show(self, "조공 — %s" % r.get("why", "실패"), TOAST_SEC)
		return
	Toast.show(self, "🎁 조공 — 우호 +%d (지금 %d)" % [int(r.up), int(r.relation)], TOAST_SEC)


func _run_truce(target_id: String, layer_box: Dictionary) -> void:
	(layer_box["layer"] as CanvasLayer).queue_free()
	var r := RealmSaveState.envoy_truce(target_id)
	if not r.get("ok", false):
		Toast.show(self, "화친 — %s" % r.get("why", "실패"), TOAST_SEC)
		return
	if r.accepted:
		Toast.show(self, "🤝 화친을 맺었다! (우호 %d)" % int(r.relation), TOAST_SEC)
	else:
		Toast.show(self, "📜 화친을 사양했다 (우호 %d)" % int(r.relation), TOAST_SEC)
