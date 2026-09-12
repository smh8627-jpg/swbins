extends Button

## "공격" 버튼 — war.js march()/fight()를 좁혀 옮긴 첫 전투 슬라이스
## (2026-09-12, "전쟁 외교 이어해"). 이 슬라이스는 목표가 하나뿐이다 —
## 소패(허창과 맞닿은 유비령, `realm_cities.gd ENEMY_CITIES`). 병력은
## 항상 허창에 있는 전군을 보낸다(수량 선택 UI 없음 — 이 판 다른
## 명령들처럼 버튼 하나로 결과만 본다).

const Toast := preload("res://saga_core/ui/toast.gd")

const TARGET := "xiaopei"
const TOAST_SEC := 3.5


func _ready() -> void:
	text = "공격"
	pressed.connect(_on_pressed)


func _on_pressed() -> void:
	var r := RealmSaveState.attack(TARGET)
	if not r.get("ok", false):
		Toast.show(self, "공격 — %s" % r.get("why", "실패"), TOAST_SEC)
		return

	var msg: String
	if r.won:
		msg = "🚩 소패 함락! (아군 손실 %d · 적 손실 %d)" % [int(r.loss_a), int(r.loss_d)]
	elif r.routed:
		msg = "↩️ 물러났다 (아군 손실 %d · 적 손실 %d)" % [int(r.loss_a), int(r.loss_d)]
	else:
		msg = "🌒 날이 저물었다 — 못 떨어뜨렸다 (아군 손실 %d · 적 손실 %d)" % [int(r.loss_a), int(r.loss_d)]
	Toast.show(self, msg, TOAST_SEC)
