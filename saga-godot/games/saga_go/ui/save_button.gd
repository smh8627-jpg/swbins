extends Button

## VERTICAL_SLICE.md 12단계 루프의 "저장한다" — 누르면 SaveState.save()를
## 부르고 결과를 토스트로 보여준다. bandit_encounter.gd의 _toast()와 같은
## 패턴(dialogue_label 그룹 재사용)을 여기서도 그대로 쓴다 — 공용 헬퍼로
## 뽑기엔 아직 이 화면 저 화면에서 딱 두 곳뿐이라 master.md 33장 "토큰
## 절약 규칙"대로 중복이 더 싸다.

const TOAST_SEC := 3.0

func _ready() -> void:
	text = "저장"
	pressed.connect(_on_pressed)

func _on_pressed() -> void:
	var ok := SaveState.save()
	_toast("저장했다." if ok else "저장 실패 — 플레이어를 못 찾았다.")

func _toast(text_: String) -> void:
	var labels := get_tree().get_nodes_in_group("dialogue_label")
	if labels.is_empty():
		return
	var label: Label = labels[0]
	label.text = text_
	label.show()
	get_tree().create_timer(TOAST_SEC).timeout.connect(func() -> void:
		if is_instance_valid(label) and label.text == text_:
			label.hide()
	)
