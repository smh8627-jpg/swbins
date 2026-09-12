extends Node3D

## villager_builder.gd·gatherable_builder.gd와 같은 "정의 배열 하나 + _ready()
## 에서 스폰" 패턴 — forest_creature.gd(개체 행동)를 몇 마리 세울지는 이
## 파일이 정한다. 지금은 1종("숲도깨비", forest_creature.gd 상단 주석 참고)
## 뿐이지만, 나중에 종을 늘릴 때 이 배열에 한 줄만 보태면 된다(웹판
## ANIMALS가 원래 그런 모양이었다).

const ForestMap := preload("res://games/saga_forest/data/village_map.gd")
const ForestCreature := preload("res://games/saga_forest/world/forest_creature.gd")

## den(격자) — 어둑숲 바이옴(forest_biome.gd: grid_y<10 and grid_x>=15)
## 안, villager_builder.gd VILLAGERS·gatherable_builder.gd·forest_house.gd·
## fishing_spot.gd 등 기존 고정 자리(forest_biome_scatter.gd CLEAR_SPOTS
## 참고)에서 전부 격자거리 3 이상 떨어진 빈 풀밭.
const CREATURES := [
	{"id": "creature_dokkaebi", "den": Vector2i(19, 3), "wander_m": 4.0,
	 "flee_m": 6.0, "speed": 1.5, "flee_speed": 3.5},
]


func _ready() -> void:
	for c: Dictionary in CREATURES:
		var inst: CharacterBody3D = ForestCreature.new()
		inst.name = c.id
		add_child(inst)
		var den_grid: Vector2i = c.den
		var den_world: Vector3 = ForestMap.world_pos(den_grid.x, den_grid.y)
		## 씨앗은 격자 좌표 해시(forest_biome_scatter.gd `_hash()`와 같은
		## 원칙 — Math.random을 안 쓴다, 세 번 돌려도 같은 진단 결과).
		var seed_salt: int = den_grid.x * 92821 + den_grid.y * 68917
		inst.setup(den_world, float(c.wander_m), float(c.flee_m),
			float(c.speed), float(c.flee_speed), seed_salt)
