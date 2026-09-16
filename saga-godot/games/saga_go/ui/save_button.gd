extends Button

## VERTICAL_SLICE.md 12단계 루프의 "저장한다" — 누르면 SaveState.save()를
## 부르고 결과를 토스트로 보여준다. bandit_encounter.gd의 _toast()와 같은
## 패턴(dialogue_label 그룹 재사용)을 여기서도 그대로 쓴다 — 공용 헬퍼로
## 뽑기엔 아직 이 화면 저 화면에서 딱 두 곳뿐이라 master.md 33장 "토큰
## 절약 규칙"대로 중복이 더 싸다.

const TOAST_SEC := 3.0
const SessionCard := preload("res://saga_core/ui/session_card.gd")

func _ready() -> void:
	text = "저장"
	pressed.connect(_on_pressed)

## PLAN.md 101-4 GO ①후보 "마무리 카드" — 저장을 "이번 세션 접기"로
## 본다(다른 사건들과 같은 경계로, GO엔 던전 클리어·월말 같은 명확한
## "세션 끝" 이벤트가 없어 사용자가 직접 접는 저장 시점을 그 자리로
## 쓴다). 실패 시(플레이어를 못 찾음)엔 아직 세션이 끝난 게 아니니
## 카드 없이 토스트만.
func _on_pressed() -> void:
	var ok := SaveState.save()
	if ok:
		SessionCard.show(get_tree().current_scene, "저장했다 — 이번 세션", [
			"경험치 +%.0f" % PartyState.session_exp_gained(),
			"발견 +%d" % CodexState.session_discovered(),
			"부대 %d명" % PartyState.members.size(),
		])
	else:
		_toast("저장 실패 — 플레이어를 못 찾았다.")

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
