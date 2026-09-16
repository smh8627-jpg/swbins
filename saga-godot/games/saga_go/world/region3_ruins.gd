extends Node3D

## GO 진짜 세 번째 지역 — "폐허"(REGIONS["ruins"], test_map.gd 참고).
## region2_coast.gd가 재설계로 확인한 payoff를 그대로 쓴 자리다: 새
## `REGIONS` 항목 하나 + 이 파일 하나(TerrainBuilder region_id 인스턴스
## 하나)로 지역 하나가 통째로 생긴다.
##
## **일부러 최소만 짓는다** — region2_coast.gd도 처음엔(2026-09-15)
## "역참으로 이어지는 자리" 하나뿐이었고 어부·게·표류물·조각배 같은
## 내용은 이후 세션에서 하나씩 얹혔다. 이 파일도 같은 순서를 따른다:
## 지형 + 왕복(입구/복귀) + 발견 지점 하나만 먼저 잇고, NPC·사건·짐승은
## 다음에(hero_encounter.gd·simple_event.gd 등이 지금은 전부 region_id
## 없는 마을 격자에 고정돼 있어, 여기 쓰려면 그 파일들도 region2_coast.gd
## 안 사건들처럼 이 파일 안에서 다시 짜야 한다 — 아직 안 함).
##
## 포구 쪽 입구는 이 파일이 아니라 region2_coast.gd `_build_ruins_gate()`에
## 있다(그 파일이 포구의 갈림길을 이미 갖고 있어서, 새 파일이 포구 좌표를
## 또 아는 것보다 그쪽에 세 번째 선택지를 얹는 게 더 쌌다). 이 파일은
## 반대 방향(폐허→포구)만 안다 — 단방향 의존 두 개로 왕복이 완성된다.

const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")
const ChoicePrompt := preload("res://games/saga_go/ui/choice_prompt.gd")
const Toast := preload("res://saga_core/ui/toast.gd")

const RUINS_REGION := "ruins"

## region2_coast.gd RUINS_ENTRY_GRID와 반드시 같은 값이어야 한다(그
## 파일이 플레이어를 내려놓는 자리와 여기가 발견을 찍는 중심이 같아야
## 하니) — 7×7 격자의 정중앙.
const ENTRY_GRID := Vector2i(3, 3)
const ENTRY_DISCOVERY_RADIUS := 60.0

## 복귀 트리거 — 입구에서 두 칸(96m) 떨어뜨려 도착 즉시 다시 뜨지 않게
## 한다(region2_coast.gd ARRIVAL_GRID/RETURN_GRID와 같은 여유).
const RETURN_GRID := Vector2i(3, 5)
const TRAVEL_TRIGGER_RADIUS := 5.0

## region2_coast.gd RUINS_GATE_GRID와 같은 값(그 칸에 내려놓아야 문이
## 열린 자리로 돌아간 느낌이 난다) — 코드로 서로를 참조하지 않고 좌표만
## 중복해 둔다(35장 예외, region2_coast.gd RUINS_GATE_GRID 주석 참고).
const HARBOR_GATE_GRID := Vector2i(1, 6)

var _layer: CanvasLayer
var _triggered := false


func _ready() -> void:
	_build_terrain()
	_build_entry_discovery()
	_build_return_trigger()


func _build_terrain() -> void:
	var terrain := Node3D.new()
	terrain.set_script(TerrainBuilder)
	terrain.name = "RuinsTerrain"
	terrain.set("region_id", RUINS_REGION)
	add_child(terrain)


## region2_coast.gd `_travel_to_ruins()`가 도착 즉시 discover()를 부르니
## 이 영역은 걸어서 온 경우(지금은 텔레포트뿐이라 이론상뿐)의 안전망이다
## — harbor 쪽 `_add_discovery_area("harbor", ...)`와 같은 판단.
func _build_entry_discovery() -> void:
	## id는 "ruins"가 아니라 "ruins_far"다 — landmarks_builder.gd _add_ruins()가
	## 마을 안 폐허에 이미 codex id "ruins"를 쓰고 있어(discover("place","ruins")),
	## 그대로 쓰면 서로 다른 두 랜드마크가 같은 book 키를 공유해 하나를
	## 발견하면 둘 다 발견된 걸로 잘못 찍히는 충돌이 생긴다.
	_add_discovery_area("ruins_far", TestMap.world_pos(ENTRY_GRID.x, ENTRY_GRID.y, RUINS_REGION), ENTRY_DISCOVERY_RADIUS)


func _build_return_trigger() -> void:
	var ground: float = TerrainBuilder.LEGEND["R"].height
	var pos := TestMap.world_pos(RETURN_GRID.x, RETURN_GRID.y, RUINS_REGION) + Vector3(0, ground, 0)
	var area := Area3D.new()
	area.name = "RuinsReturn"
	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = TRAVEL_TRIGGER_RADIUS
	cs.shape = shape
	area.add_child(cs)
	area.position = pos
	add_child(area)
	area.body_entered.connect(_on_return_entered)


func _on_return_entered(body: Node3D) -> void:
	if _triggered or not body.is_in_group("player"):
		return
	_triggered = true
	var choices: Array = [
		{"label": "🏝️ 포구로 돌아간다", "cb": func() -> void: _travel_to_harbor(body)},
		{"label": "그만둔다", "cb": _close_prompt},
	]
	_layer = ChoicePrompt.build(self, "폐허 — 여기서 포구로 돌아가는 길이 있다.", choices)


func _close_prompt() -> void:
	if _layer:
		_layer.queue_free()
	_triggered = false


func _travel_to_harbor(player: Node3D) -> void:
	if _layer:
		_layer.queue_free()
	var ground: float = TerrainBuilder.LEGEND["D"].height
	(player as Node3D).global_position = TestMap.world_pos(HARBOR_GATE_GRID.x, HARBOR_GATE_GRID.y, "coast") + Vector3(0, ground + 1.0, 0)
	Toast.show(self, "포구로 돌아왔다.", 2.5)
	_triggered = false


## region2_coast.gd `_add_discovery_area()`와 같은 계약·같은 판단(코드
## 세 줄 수준이라 복제, 단방향 의존).
func _add_discovery_area(codex_id: String, pos: Vector3, radius: float, kind: String = "place") -> void:
	var area := Area3D.new()
	area.name = "Discover_" + codex_id
	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = radius
	cs.shape = shape
	area.add_child(cs)
	area.position = pos
	add_child(area)
	area.body_entered.connect(func(body: Node3D) -> void:
		if body.is_in_group("player"):
			CodexState.discover(kind, codex_id))
