extends Node3D

## VERTICAL_SLICE.md 12단계 루프의 마지막 단계 "다시 켜서 이어진다" —
## 씬이 다 만들어진 뒤(자식들의 _ready가 먼저 도는 Godot 기본 순서 그대로
## 이용) 저장 파일이 있으면 부대·플레이어 위치를 덮어쓴다. 없으면(첫
## 실행) 아무것도 안 하고 씬에 이미 놓인 스폰 위치 그대로 시작한다.


func _ready() -> void:
	SaveState.try_load()
