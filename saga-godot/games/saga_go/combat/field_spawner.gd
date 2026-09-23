extends Node3D

## PLAN 106장 ③ — 들판 적 무리를 지역마다 몇 곳에 둔다(원신 들판의 몹 캠프).
## 자리는 글자 지도 칸 + 씨앗 흔들기로 결정적이다. 사건(도적 습격·인물 조우)
## 자리와 겹치지 않게 칸을 골랐다(bandit_encounter 기본 칸 (7,5) 등에서 2칸+).

const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")
const FieldEnemy := preload("res://games/saga_go/combat/field_enemy.gd")

## [지역, 칸, [종류...]]
const CAMPS := [
	["village", Vector2i(1, 4), ["wolf", "wolf", "wolf"]],
	["village", Vector2i(9, 5), ["bandit", "bandit"]],
	["village", Vector2i(8, 9), ["wolf", "wolf", "bandit"]],
	["coast", Vector2i(2, 6), ["wolf", "wolf"]],
	["ruins", Vector2i(2, 2), ["bandit", "bandit", "bandit"]],
]
const SPREAD := 5.0

func _ready() -> void:
	var n := 0
	for camp in CAMPS:
		var region: String = camp[0]
		var grid: Vector2i = camp[1]
		var kinds: Array = camp[2]
		var center := TestMap.world_pos(grid.x, grid.y, region)
		for i in kinds.size():
			var a := TAU * float(i) / float(kinds.size())
			var p := center + Vector3(cos(a), 0, sin(a)) * SPREAD
			p.y = TerrainBuilder.height_at(region, p) + 0.3
			var e := FieldEnemy.new()
			e.name = "FieldEnemy_%s_%d" % [region, n]
			e.setup(kinds[i], p, 20260824 + n)
			add_child(e)
			n += 1
