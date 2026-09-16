extends Node3D

## VERTICAL_SLICE.md 12단계 루프의 마지막 단계 "다시 켜서 이어진다" —
## 씬이 다 만들어진 뒤(자식들의 _ready가 먼저 도는 Godot 기본 순서 그대로
## 이용) 저장 파일이 있으면 부대·플레이어 위치를 덮어쓴다. 없으면(첫
## 실행) 아무것도 안 하고 씬에 이미 놓인 스폰 위치 그대로 시작한다.
##
## 2026-09-11㉑ — "이미 끝낸 사건은 되살아나지 않는다"(EventState.gd)를
## 처음엔 각 사건 스크립트의 _ready()에서 `EventState.is_resolved(name)`
## 로 막으려 했는데, **실제로 확인해 보니 순서가 안 맞았다.** 위 주석대로
## "자식이 부모보다 먼저"는 맞지만, 그 말은 BanditEncounter 등 사건
## 노드들의 _ready()가 이 TestVillage._ready()(SaveState.try_load()를
## 부르는 자리)보다 **먼저** 끝난다는 뜻이었다 — 즉 사건 노드가 스스로를
## 확인하는 시점엔 EventState가 아직 텅 비어 있어(로드 전) 그 확인은
## 항상 무의미했다(임시로 두 _ready()에 순서 출력을 넣어 헤드리스로 직접
## 찍어 확인 — 추측 아님). 그래서 각 스크립트의 자체 확인은 지우고,
## 로드가 끝난 **뒤에** 여기서 한 번에 정리한다 — 사건 노드는 일단
## 평소대로 다 지어지고, 이미 끝난 것만 이 시점에 치운다.

func _ready() -> void:
	SaveState.try_load()
	_remove_resolved_events()
	if OS.get_environment("SAGA_DENSITY_REPORT") != "":
		_print_density_report()

## PLAN.md 104-5 — 지역 3(마을·포구·폐허) 발견 밀도(§3-E). 평소엔 안
## 돌린다(로그에 매번 섞이면 회귀 md5 가 흔들린다) — 측정할 때만
## `SAGA_DENSITY_REPORT=1` 로 켠다. "codex_discoverable" 그룹은
## landmarks_builder.gd·region2_coast.gd·region3_ruins.gd 의
## `_add_discovery_area()` 가 채운다.
func _print_density_report() -> void:
	var test_map := load("res://games/saga_go/data/test_map.gd")
	var density := load("res://saga_core/world/density_report.gd")
	for region_id in ["village", "coast", "ruins"]:
		var origin: Vector3 = test_map.origin_of(region_id)
		var size: Vector2i = test_map.size(region_id)
		var tile: float = test_map.tile_size_of(region_id)
		var half_w := size.x * 0.5 * tile
		var half_h := size.y * 0.5 * tile
		var points: Array = []
		for node in get_tree().get_nodes_in_group("codex_discoverable"):
			var local: Vector3 = (node as Node3D).global_position - origin
			if abs(local.x) <= half_w and abs(local.z) <= half_h:
				points.append(Vector2(local.x / tile + size.x * 0.5, local.z / tile + size.y * 0.5))
		var walkable := func(x: int, y: int) -> bool: return test_map.tile_at(x, y, region_id) != "^"
		var report: Dictionary = density.report(size, tile, points, 60.0, walkable)
		print("DENSITY %s total=%d empty=%d empty_pct=%.1f" % [region_id, report.total, report.empty, report.empty_pct])

## TestVillage 바로 아래 자식 중 이름이 EventState.resolved에 있는
## 것들을 치운다. 사건 노드는 전부 이 씬의 직계 자식(BanditEncounter·
## HeroEncounter 등)이라 한 단계만 훑으면 된다 — 자식의 자식(패널·트리거
## Area3D 등)까지는 볼 필요 없다.
func _remove_resolved_events() -> void:
	for child in get_children():
		if EventState.is_resolved(child.name):
			child.queue_free()
