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
	## PLAN 106장 ⑦ — 원소 쓰는 적. 상자 무리 잠금(반경 12m)과 칸이 겹치지 않는 자리.
	["coast", Vector2i(6, 5), ["water_turtle", "water_turtle", "fire_imp"]],
	["ruins", Vector2i(4, 3), ["thunder_cat", "thunder_cat"]],
	["ruins", Vector2i(5, 5), ["fire_imp", "fire_imp", "thunder_cat"]],
	## PLAN 106장 ⑮ — 새 원소 넷. 상자 무리 잠금·순간이동 지점·별조각과 1.4칸(67m)+ 떨어진 자리.
	["coast", Vector2i(4, 6), ["wind_hawk", "wind_hawk", "grass_snake"]],
	["coast", Vector2i(6, 7), ["ice_fox", "ice_fox", "grass_snake"]],
	["ruins", Vector2i(1, 4), ["rock_bear", "rock_bear"]],
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
