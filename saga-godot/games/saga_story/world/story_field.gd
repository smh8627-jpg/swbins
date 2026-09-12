extends Node3D

## VERTICAL_SLICE_STORY.md 완료 조건의 마지막 두 단계 — "저장한다 →
## 다시 켜서 이어진다"(GO test_village.gd·FOREST forest_village.gd와
## 같은 순서 규칙: 자식들의 _ready()가 부모보다 먼저 돈다).
##
## 이 판은 구면 투영이 없어(2.5D 고정 카메라, VERTICAL_SLICE_STORY.md
## 2절) WorldCurveMaterial 등록이 필요 없다 — FOREST test_village.gd와
## 달리 이 부분이 빠진다.

func _ready() -> void:
	StorySaveState.try_load()
