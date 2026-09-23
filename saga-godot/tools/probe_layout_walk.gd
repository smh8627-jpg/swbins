extends Node
## games/saga_go/layout/LayoutWalk.tscn 자동 걷기 점검 — 평소엔 안 붙는다. layout_walk.gd 가 SAGA_LAYOUT_PROBE 가 있을 때만 단다.
##
##   SAGA_LAYOUT_PROBE=1 "$GODOT" --headless --path saga-godot res://games/saga_go/layout/LayoutWalk.tscn
##
## ① 바닥에 선다 ② 강가에서 남쪽으로 걸으면 물 칸 앞에서 막힌다 ③ 옛 다리 칸으론 건넌다
## ④ 명소마다 데려가 발견이 13/13, 숨은 이름표가 찾은 뒤 보인다. 끝에 LAYOUT_PROBE_DONE 한 줄을 찍고 끈다.
## 이동은 실제 입력(move_back 액션)으로 — 카메라 기본 방향(yaw 0)에서 "뒤"가 +z(남쪽)다.

const WALK_FRAMES := 120  # 2초(60Hz) — 걷는 속도 6m/s 면 12m

var _walk: Node3D
var _player: CharacterBody3D
var _frame := 0
var _step := 0
var _marks: Array = []
var _results: Array[String] = []
var _fails := 0


func _ready() -> void:
	_walk = get_parent()
	_player = get_tree().get_first_node_in_group("player")
	_marks = _walk.get_node("Layout/Places").get_children()


func _physics_process(_delta: float) -> void:
	_frame += 1
	match _step:
		0:
			if _frame == 30:
				var ok := _player.is_on_floor() and absf(_player.global_position.y) < 0.2
				_check("floor", ok, "y=%.2f" % _player.global_position.y)
				_teleport(Vector3(20, 0.5, 20))
				Input.action_press("move_back")
				_next()
		1:
			if _frame == WALK_FRAMES:
				Input.action_release("move_back")
				var z := _player.global_position.z
				_check("water_block", z < 26.0, "z=%.1f" % z)
				_teleport(Vector3(-4, 0.5, 20))
				Input.action_press("move_back")
				_next()
		2:
			if _frame == WALK_FRAMES:
				Input.action_release("move_back")
				var z := _player.global_position.z
				_check("bridge_cross", z > 30.0, "z=%.1f" % z)
				## 명소에 데려가기 전에 이미 다 찾아져 있으면 판정이 거리를 안 본다는 뜻이다.
				_check("not_yet", _walk.found.size() < _walk.places_total, "before=%d" % _walk.found.size())
				_next()
		3:
			## 명소 하나에 4프레임씩 — 순간이동 뒤 Area3D 가 겹침을 알아채는 데 한두 스텝 걸린다.
			var i := floori((_frame - 1) / 4.0)
			if i < _marks.size():
				if (_frame - 1) % 4 == 0:
					_teleport(_marks[i].position + Vector3(0, 0.5, 0))
			else:
				var n: int = _walk.found.size()
				_check("found", n == _walk.places_total, "%d/%d" % [n, _walk.places_total])
				var hidden_ok := true
				for mk in _marks:
					if bool(mk.get_meta("hidden", false)):
						hidden_ok = hidden_ok and _walk.get_node("Name_" + str(mk.name)).visible
				_check("hidden_labels", hidden_ok, "")
				var body := _walk.get_node("LayoutColliders")
				_results.append("water_cells=%d" % int(body.get_meta("water_cells")))
				print("LAYOUT_PROBE_DONE fails=%d %s" % [_fails, " ".join(_results)])
				get_tree().quit(0 if _fails == 0 else 1)
				_step = 99


func _teleport(p: Vector3) -> void:
	_player.global_position = p
	_player.velocity = Vector3.ZERO


func _next() -> void:
	_step += 1
	_frame = 0


func _check(name_: String, ok: bool, detail: String) -> void:
	if not ok:
		_fails += 1
	_results.append("%s=%s%s" % [name_, "ok" if ok else "FAIL", ("(" + detail + ")") if detail != "" else ""])
