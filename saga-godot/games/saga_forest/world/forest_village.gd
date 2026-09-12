extends Node3D

## VERTICAL_SLICE_FOREST.md 4절 완료 조건의 마지막 두 단계 —
## "저장한다 → 다시 켜서 이어진다"(GO test_village.gd와 같은 순서 규칙,
## 자식들의 _ready()가 먼저 돈다) + 1절 결정(구면 투영)의 중심을 매 프레임
## 플레이어 위치로 갱신하는 역할을 겸한다.

const WorldCurveMaterial := preload("res://saga_core/world/world_curve_material.gd")
const Toast := preload("res://saga_core/ui/toast.gd")

var _player: Node3D = null


func _ready() -> void:
	WorldCurveMaterial.ensure_global_registered()
	ForestSaveState.try_load()

	## 제외 목록 6번(계절행사 8일) — 오늘이 그 여덟 날 중 하나면 들어오자마자
	## 안내한다(gather_label.gd가 상시 표시하는 것과 별개로, 첫 인상은
	## 한 번 크게).
	var e := ForestFestival.event_of_today()
	if not e.is_empty():
		Toast.show(self, "🎊 %s — %s" % [e.name, e.hello], 4.0)


func _process(_delta: float) -> void:
	if _player == null or not is_instance_valid(_player):
		_player = get_tree().get_first_node_in_group("player")
		if _player == null:
			return
	WorldCurveMaterial.update_center(_player.global_position)
