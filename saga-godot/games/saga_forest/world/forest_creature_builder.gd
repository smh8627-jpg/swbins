extends Node3D

## villager_builder.gd·gatherable_builder.gd와 같은 "정의 배열 하나 + _ready()
## 에서 스폰" 패턴 — forest_creature.gd(개체 행동)를 몇 마리 세울지는 이
## 파일이 정한다. 종을 늘릴 땐 이 배열에 한 줄만 보태면 된다(웹판 ANIMALS가
## 원래 그런 모양이었다).

const ForestMap := preload("res://games/saga_forest/data/village_map.gd")
const ForestCreature := preload("res://games/saga_forest/world/forest_creature.gd")

## den(격자)은 전부 자기 바이옴(forest_biome.gd biome_at()) 안, 기존
## 고정 자리(villager_builder.gd VILLAGERS·gatherable_builder.gd·
## forest_house.gd·fishing_spot.gd 등, forest_biome_scatter.gd CLEAR_SPOTS
## 참고)에서 격자거리 3 이상 떨어진 빈 풀밭으로 손으로 골랐다.
##
## kind는 forest_creature.gd `_spawn_visual()`이 아는 시각(+행동 체감) 키다.
## 2026-09-12: 2종째 "바위도깨비"(바위 지대, biome_at(24,15)=rocky 확인됨)
## 추가 — 숲도깨비보다 느리고(speed·flee_speed↓) 덜 겁내게(flee_m↓) 해서
## 첫 종과 체감이 겹치지 않게 갈랐다(웹판 ANIMALS도 종마다 speed/flee가
## 다 달랐던 것과 같은 이유).
## 2026-09-12: 3종째 "버섯정령"(버섯숲, biome_at(11,16)=mush 확인됨) 추가 —
## 웹판 mushnub가 원래 살던 바이옴을 이걸로 마저 채웠다. 셋 중 가장
## 재빠르고(speed·flee_speed 최댓값) 가장 안 겁내게(flee_m 최솟값) 잡아
## 앞선 두 종과 또 다르게 갈랐다.
const CREATURES := [
	{"id": "creature_dokkaebi", "kind": "dokkaebi", "den": Vector2i(19, 3),
	 "wander_m": 4.0, "flee_m": 6.0, "speed": 1.5, "flee_speed": 3.5},
	{"id": "creature_bawi", "kind": "bawi", "den": Vector2i(24, 15),
	 "wander_m": 2.5, "flee_m": 4.0, "speed": 0.9, "flee_speed": 2.2},
	{"id": "creature_beoseot", "kind": "beoseot", "den": Vector2i(11, 16),
	 "wander_m": 3.5, "flee_m": 3.0, "speed": 2.0, "flee_speed": 4.2},
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
			float(c.speed), float(c.flee_speed), seed_salt, String(c.kind))
