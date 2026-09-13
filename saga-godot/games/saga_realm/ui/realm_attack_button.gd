extends Button

## "공격" 버튼 — war.js march()/fight()를 좁혀 옮긴 첫 전투 슬라이스
## (2026-09-12, "전쟁 외교 이어해"). 처음엔 목표가 소패 하나뿐이라
## 상수(`TARGET`)로 고정해 두고 곧장 쳤다.
##
## **2026-09-13 추가 — 하비(下邳, xiapi) 목표.** 여포령이 `ENEMY_CITIES`에
## 둘째로 늘면서 이 버튼도 realm_city_button.gd·realm_transfer_button.gd
## 처럼 ChoicePrompt 목록으로 일반화했다 — 목표가 늘 때마다 이 파일을
## 다시 고치지 않아도 `realm_cities.gd ENEMY_CITIES`만 늘리면 된다.
## 이미 함락한 곳은 목록에서 뺀다. 출진 성이 아직 없어(예: 소패를
## 함락하기 전의 하비) `attack()`이 실패해도 그 이유(예: "없는 출진
## 성")를 그대로 토스트로 보여준다 — 목록 단계에서 미리 거르지 않는다
## (realm_city_button.gd가 늘 playable_ids() 전부를 보여주는 것과 같은
## 결, 뒤가 알아서 판정한다).

const RealmCities := preload("res://games/saga_realm/data/realm_cities.gd")
const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")
const Toast := preload("res://saga_core/ui/toast.gd")

const TOAST_SEC := 3.5


func _ready() -> void:
	text = "공격"
	pressed.connect(_on_pressed)


func _on_pressed() -> void:
	var layer_box := {}
	var choices: Array = []
	for e: Dictionary in RealmCities.ENEMY_CITIES:
		var eid := String(e.id)
		if bool(RealmSaveState.enemies.get(eid, {}).get("captured", false)):
			continue
		choices.append({
			"label": "%s(%s)" % [String(e.get("name", eid)), String(e.get("hanja", ""))],
			"cb": func() -> void: _attack(eid, layer_box),
		})
	if choices.is_empty():
		Toast.show(self, "칠 곳이 남지 않았습니다", TOAST_SEC)
		return
	layer_box["layer"] = ChoicePrompt.build(self, "공격 — 어디를", choices)


func _attack(target_id: String, layer_box: Dictionary) -> void:
	(layer_box["layer"] as CanvasLayer).queue_free()
	var r := RealmSaveState.attack(target_id)
	if not r.get("ok", false):
		Toast.show(self, "공격 — %s" % r.get("why", "실패"), TOAST_SEC)
		return

	var target_name := String(RealmCities.enemy_by_id(target_id).get("name", target_id))
	var msg: String
	var toast_sec := TOAST_SEC
	if r.won:
		msg = "🚩 %s 함락! (아군 손실 %d · 적 손실 %d)" % [target_name, int(r.loss_a), int(r.loss_d)]
		var boss_beaten := String(r.get("boss_beaten", ""))
		if not boss_beaten.is_empty():
			msg += "\n👑 보스급 수비 무장 %s 을(를) 꺾었다! 금 %d" % [boss_beaten, RealmSaveState.BOSS_BONUS_GOLD]
			toast_sec = TOAST_SEC + 1.5
	elif r.routed:
		msg = "↩️ 물러났다 (아군 손실 %d · 적 손실 %d)" % [int(r.loss_a), int(r.loss_d)]
	else:
		msg = "🌒 날이 저물었다 — 못 떨어뜨렸다 (아군 손실 %d · 적 손실 %d)" % [int(r.loss_a), int(r.loss_d)]
	Toast.show(self, msg, toast_sec)
