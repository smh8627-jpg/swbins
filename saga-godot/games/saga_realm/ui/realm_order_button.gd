extends Button

## "명령" 버튼 — GO ChoicePrompt를 그대로 재사용해 명령 넷(개간/상업/수색/
## 등용)을 고르는 패널을 띄운다(villager_builder.gd가 선물/구매 메뉴에
## 쓰는 것과 같은 패턴). 결과는 saga_core Toast로 한 줄 알린다.

const RealmOrders := preload("res://games/saga_realm/data/realm_orders.gd")
const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")
const Toast := preload("res://saga_core/ui/toast.gd")
const Characters := preload("res://saga_core/data/characters.gd")

const TOAST_SEC := 3.0


func _ready() -> void:
	text = "명령"
	pressed.connect(_on_pressed)


func _on_pressed() -> void:
	## GDScript 람다는 바깥 지역 변수를 "생성 시점 값"으로 캡처한다 —
	## villager_builder.gd의 선물/구매 메뉴와 같은 layer_box 우회
	## (ChoicePrompt.build() 호출 전에 만든 콜백이 그 결과를 미리 참조할
	## 수 없어서다).
	var layer_box := {}
	var choices: Array = []
	for o: Dictionary in RealmOrders.ORDERS:
		choices.append({
			"label": "%s %s (🪙%d) — %s" % [o.emoji, o.name, int(o.gold), o.desc],
			"cb": func() -> void: _run_order(String(o.key), String(o.name), layer_box),
		})
	layer_box["layer"] = ChoicePrompt.build(self, "명령", choices)


func _run_order(key: String, name_: String, layer_box: Dictionary) -> void:
	(layer_box["layer"] as CanvasLayer).queue_free()
	var r := RealmSaveState.execute_order(key)
	if not r.get("ok", false):
		Toast.show(self, "%s — %s" % [name_, r.get("why", "실패")], TOAST_SEC)
		return

	var msg: String
	if key == "search":
		var found_id: String = r.get("found", "")
		if found_id.is_empty():
			msg = "수색 — 더 찾을 사람이 없다."
		else:
			var h = Characters.find(found_id)
			msg = "🔍 %s 을(를) 찾았다!" % String(h.name)
	elif key == "hire":
		var hired_id: String = r.get("hired", "")
		if hired_id.is_empty():
			msg = "등용 — 상대가 사양했다."
		else:
			var h2 = Characters.find(hired_id)
			msg = "🤝 %s 이(가) 합류했다!" % String(h2.name)
	else:
		var amount: int = int(r.get("amount", 0))
		msg = "%s %s" % [name_, ("+%d" % amount if amount > 0 else "더 올릴 곳이 없다")]
		if r.get("crit", false):
			msg += " (대성공!)"

	Toast.show(self, msg, TOAST_SEC)
