extends Node3D

## VERTICAL_SLICE_FOREST.md 4절 "제외" 목록 2번 — 낚시(별도 미니게임).
## 웹판 village.js 조사 결과: 낚시터(`spot`, PROPS의 `reset: 0`)만 하루
## 몫이 없다 — "즉시 획득으로 두면 자동이 낚시터 하나를 무한히 반복한다"는
## 실제로 겪은 문제가 주석에 남아 있어, 원작(동물의숲)처럼 **찌를 던지고
## 입질을 기다렸다 당기는** 타이밍 미니게임으로 만들어 뒀다. 그 규칙을
## 상수 하나 안 바꾸고 그대로 옮긴다(duel_rules.gd·world_curve.gdshaderinc
## 등과 같은 "새로 설계하지 않는다" 원칙).
##
##   던진다 → CAST_MIN~CAST_MIN+CAST_VAR 뒤 입질 → BITE_WINDOW 안에
##   당기면 잡는다. 너무 이르면(성급) 놓치고, 너무 늦으면도 놓친다.
##   낚시터에서 REACH*1.4보다 멀어지면 줄이 끊긴다.
##
## 나무·소나무·바위·꽃(gatherable_builder.gd)과 달리 day 리셋이 없다 —
## ForestSaveState.can_gather()/mark_gathered()를 아예 안 부른다(reset:0).
## 입질 타이밍은 세계 배치가 아니라 순간의 반응 게임이라 결정적 해시를
## 안 쓴다 — 웹판도 여기만은 Math.random()을 그대로 쓴다.

const ForestMap := preload("res://games/saga_forest/data/village_map.gd")
const TerrainBuilder := preload("res://games/saga_forest/world/forest_terrain_builder.gd")
const WorldCurveMaterial := preload("res://saga_core/world/world_curve_material.gd")
const Toast := preload("res://saga_core/ui/toast.gd")

const GRID := Vector2i(22, 5)
const CAST_RADIUS := 3.5
## 웹판 REACH*1.4 — 2절이 정한 REACH≈3.45m 그대로 대입.
const FISH_RANGE := 4.8
const CAST_MIN_MS := 1200
const CAST_VAR_MS := 2300
const BITE_WINDOW_MS := 700
const LATE_GRACE_MS := 400
const FISH_ITEM_LABEL := "물고기"
const CURVE_AMOUNT := 0.004

enum State { IDLE, LINE_OUT }

var _state := State.IDLE
var _bite_at_ms := 0
var _ends_at_ms := 0
var _bite_notified := false
var _in_range := false
var _player: Node3D = null


func _ready() -> void:
	var ground: float = TerrainBuilder.LEGEND["."].height
	position = ForestMap.world_pos(GRID.x, GRID.y) + Vector3(0, ground + 0.02, 0)

	## 연못은 primitive다 — 어울리는 CC0 GLB가 없어서가 아니라, 이번엔
	## "낚시터 하나"만 필요하지 아직 물가 바이옴 자체(§4 "제외" 목록 7번,
	## 별개 항목)를 짓는 게 아니라서다. terrain_builder.gd의 WaterSurface·
	## landmarks_builder.gd의 폭포 물웅덩이와 같은 결(장식 평면).
	var pond := MeshInstance3D.new()
	pond.name = "Pond"
	var mesh := PlaneMesh.new()
	mesh.size = Vector2(2.5, 2.5)
	pond.mesh = mesh
	pond.material_override = WorldCurveMaterial.vertex_color_material(CURVE_AMOUNT, 0.15, Color(0.25, 0.45, 0.62))
	add_child(pond)

	var area := Area3D.new()
	area.name = "CastArea"
	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = CAST_RADIUS
	cs.shape = shape
	area.add_child(cs)
	add_child(area)
	area.body_entered.connect(_on_entered)
	area.body_exited.connect(_on_exited)


func _on_entered(body: Node3D) -> void:
	if not body.is_in_group("player"):
		return
	_in_range = true
	_player = body
	if _state == State.IDLE:
		Toast.show(self, "[G] 낚시터 — 찌를 던진다", 2.0)


func _on_exited(body: Node3D) -> void:
	if body.is_in_group("player"):
		_in_range = false


func _process(_delta: float) -> void:
	if _state == State.LINE_OUT:
		if _player != null and _player.global_position.distance_to(global_position) > FISH_RANGE:
			_state = State.IDLE
			Toast.show(self, "줄이 끊겼다 — 낚시터에서 너무 멀어졌다", 2.0)
		else:
			var now := Time.get_ticks_msec()
			if not _bite_notified and now >= _bite_at_ms:
				_bite_notified = true
				Toast.show(self, "🎣 입질이 왔다! [G]", 2.0)
			elif now > _ends_at_ms + LATE_GRACE_MS:
				_state = State.IDLE
				Toast.show(self, "🎣 입질을 놓쳤다", 2.0)

	if _in_range and Input.is_action_just_pressed("forest_gather"):
		_on_press()


func _on_press() -> void:
	if _state == State.IDLE:
		_cast()
	else:
		_hook()


func _cast() -> void:
	var now := Time.get_ticks_msec()
	_bite_at_ms = now + CAST_MIN_MS + (randi() % (CAST_VAR_MS + 1))
	_ends_at_ms = _bite_at_ms + BITE_WINDOW_MS
	_bite_notified = false
	_state = State.LINE_OUT
	Toast.show(self, "🎣 찌를 던졌다 — 입질을 기다린다", 2.0)


func _hook() -> void:
	var now := Time.get_ticks_msec()
	var early: bool = now < _bite_at_ms
	var late: bool = now > _ends_at_ms
	_state = State.IDLE
	if early:
		Toast.show(self, "성급했다 — 물고기가 달아났다", 2.0)
	elif late:
		Toast.show(self, "늦었다 — 놓쳤다", 2.0)
	else:
		ForestSaveState.add_item(FISH_ITEM_LABEL, 1)
		Toast.show(self, "🐟 낚았다 — %s +1" % FISH_ITEM_LABEL, 2.5)
