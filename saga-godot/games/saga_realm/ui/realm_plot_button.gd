extends Button

## "계략" 버튼 — diplo.js PLOTS 중 성 자체가 대상인 유언비어(치안)·화계
## (군량) 둘만 옮긴 첫 슬라이스(2026-09-12, "1,2,3 순서대로 다해" 두 번째).
## 이간·매수(적 무장 대상)는 소패에 이름 있는 수비 장수가 없어 다음에 볼
## 자리(`realm_diplo.gd` 머리말 참고). realm_diplo_button.gd와 같은
## ChoicePrompt 패턴이되, "계략은 성공률을 숨기지 않는다"(diplo.js 머리말)
## 는 원칙대로 메뉴에 성공률을 미리 계산해 보여 준다.

const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")
const Toast := preload("res://saga_core/ui/toast.gd")
const RealmCities := preload("res://games/saga_realm/data/realm_cities.gd")
const RealmDiplo := preload("res://games/saga_realm/data/realm_diplo.gd")

const TARGET := "xiaopei"
const TOAST_SEC := 3.5


func _ready() -> void:
	text = "계략"
	pressed.connect(_on_pressed)


func _target_name() -> String:
	return String(RealmCities.enemy_by_id(TARGET).get("name", "상대"))


func _on_pressed() -> void:
	var layer_box := {}
	var choices: Array = []
	for p: Dictionary in RealmDiplo.PLOTS:
		var key: String = String(p.key)
		var preview := RealmSaveState.plot_preview(key, TARGET)
		var label: String
		if bool(preview.get("ok", false)):
			label = "%s %s (🪙%d, 성공률 %d%%) — %s" % [
				String(p.emoji), String(p.name), int(p.gold),
				roundi(float(preview.get("chance", 0.0)) * 100.0), String(p.desc)]
		else:
			label = "%s %s — %s" % [String(p.emoji), String(p.name), String(preview.get("why", "실패"))]
		choices.append({
			"label": label,
			"cb": func() -> void: _run(key, String(p.name), layer_box),
		})
	layer_box["layer"] = ChoicePrompt.build(self, "계략 — %s" % _target_name(), choices)


func _run(kind: String, name_: String, layer_box: Dictionary) -> void:
	(layer_box["layer"] as CanvasLayer).queue_free()
	var r := RealmSaveState.plot(kind, TARGET)
	if not r.get("ok", false):
		Toast.show(self, "%s — %s" % [name_, r.get("why", "실패")], TOAST_SEC)
		return

	if not bool(r.get("done", false)):
		Toast.show(self, "🕳️ %s — 들통났다 (성공률 %d%%였다)" % [name_, roundi(float(r.chance) * 100.0)], TOAST_SEC)
		return

	var msg: String
	if kind == "rumor":
		msg = "🗣️ %s — 치안 %d → %d" % [name_, int(r.sec_from), int(r.sec_to)]
	elif kind == "fire":
		msg = "🔥 %s — 군량 %d 이(가) 탔다" % [name_, int(r.burned)]
	else:
		msg = "%s 성공" % name_
	Toast.show(self, msg, TOAST_SEC)
