extends Button

## "서고" 버튼 — quiz.js learnedList()를 옮긴 것(2026-09-12, "1,2,3
## 다해줘" 세 번째이자 마지막). 익힌 문제를 최근 순으로 다시 볼 수
## 있게 한다 — 목록에서 하나를 고르면 그 문제·정답·해설을 다시 보여준다
## (원작 서고가 "복습·확인" 용도인 것과 같은 결). realm_quiz_button.gd
## 와 같은 ChoicePrompt 패턴.

const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")
const Toast := preload("res://saga_core/ui/toast.gd")
const RealmQuizData := preload("res://games/saga_realm/data/realm_quiz_data.gd")

const TOAST_SEC := 5.0


func _ready() -> void:
	text = "서고"
	pressed.connect(_on_pressed)


func _on_pressed() -> void:
	var progress := RealmSaveState.quiz_progress()
	var entries := RealmSaveState.quiz_learned_list()
	if entries.is_empty():
		Toast.show(self, "아직 익힌 지식이 없습니다 — 문답을 풀어 보세요", TOAST_SEC)
		return

	var layer_box := {}
	var choices: Array = []
	for entry: Dictionary in entries:
		var label := "[%s·%s] %s" % [
			String(entry.cat_name), String(entry.lv_name), RealmQuizData.short_q(String(entry.q))]
		choices.append({
			"label": label,
			"cb": func() -> void: _show_detail(entry, layer_box),
		})
	var title := "서고 — 익힌 지식 %d/%d(최근 %d개)" % [
		int(progress.learned), int(progress.total), entries.size()]
	layer_box["layer"] = ChoicePrompt.build(self, title, choices)


func _show_detail(entry: Dictionary, layer_box: Dictionary) -> void:
	(layer_box["layer"] as CanvasLayer).queue_free()
	var msg := "%s\n정답: %s\n%s" % [String(entry.q), String(entry.answer), String(entry.why)]
	Toast.show(self, msg, TOAST_SEC)
