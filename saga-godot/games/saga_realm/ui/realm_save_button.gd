extends Button

## GO save_button.gd·FOREST forest_save_button.gd와 완전히 같은 패턴 —
## RealmSaveState만 다르다(player_pos가 없어 실패할 일이 없다).

const Toast := preload("res://saga_core/ui/toast.gd")
const TOAST_SEC := 3.0


func _ready() -> void:
	text = "저장"
	pressed.connect(_on_pressed)


func _on_pressed() -> void:
	var ok := RealmSaveState.save()
	Toast.show(self, "저장했다." if ok else "저장 실패.", TOAST_SEC)
