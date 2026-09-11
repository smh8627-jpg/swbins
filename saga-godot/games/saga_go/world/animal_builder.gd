extends Node3D

## PLAN.md 25장 "동물 시스템"(Idle/Wander/Flee/Group)의 GO 첫 이식 —
## VERTICAL_SLICE.md §26이 "짐승 생태(사슴·늑대·까치 등 관찰용 동물)"로
## 미뤄 뒀던 것. §37 재미 평가 체크리스트의 "NPC/동물/몬스터가 살아
## 움직이는가?"에 지금까지 동물 쪽이 답이 없었다.
##
## 웹판 js/animal.js의 KINDS 다섯 종(사슴·늑대·까치·잉어·소) 중 이번엔
## **사슴·까치 둘만** 옮겼다 — 웹판 그대로:
##   - 늑대는 이미 `bandit_encounter.gd`(night_only)의 "늑대 무리" 전투
##     사건으로 있다. 걸어 다니는(전투 없는) 늑대까지 더하면 "이 늑대는
##     싸우는 늑대인가 아닌가" 혼란이 생겨 뺐다.
##   - 잉어(물)·소(매인 짐승, 농경)는 이번 범위 밖 — 다음에 이어 붙일 자리.
## 웹판 HERDS(이름난 자리 둘 사이를 사인 곡선으로 오가는 무리 이동)는 이
## 판에 "이름난 자리" 개념이 없어 그대로 못 옮긴다 — 대신 각자 집 자리
## 근처를 맴돈다(같은 감각, 다른 구현). 어울리는 GLB가 없어(동물 킷을
## 새로 안 받음) 이번엔 primitive로 남긴다 — ASSET_GUIDE.md "다음에 GLB
## 교체할 자리"에 적어 둔다.

const TestMap := preload("res://games/saga_go/data/test_map.gd")
const TerrainBuilder := preload("res://games/saga_go/world/terrain_builder.gd")

## 웹판 animal.js KINDS.deer/magpie의 sense(감지 거리)를 그대로 옮겼다.
const DEER_HOME := Vector2i(1, 4)
const DEER_COUNT := 3
const DEER_WANDER_RADIUS := 5.0
const DEER_SENSE_RADIUS := 30.0
const DEER_FLEE_SPEED := 6.0
const DEER_COLOR := Color(0.765, 0.604, 0.416) # 웹판 #c39a6a

const MAGPIE_HOMES := [Vector2i(9, 4), Vector2i(9, 6)]
const MAGPIE_SENSE_RADIUS := 18.0
const MAGPIE_FLY_COOLDOWN_SEC := 20.0
const MAGPIE_COLOR := Color(0.184, 0.2, 0.251) # 웹판 #2f3340

var _deer: Array[Dictionary] = []
var _magpies: Array[Dictionary] = []


func _ready() -> void:
	_spawn_deer()
	_spawn_magpies()


static func _hash(i: int, salt: int) -> float:
	var h := (i * 374761393) ^ (salt * 2246822519)
	h = (h ^ (h >> 13)) * 1274126177
	h = h ^ (h >> 16)
	return float(h & 0x7fffffff) / float(0x7fffffff)


func _spawn_deer() -> void:
	var ground: float = TerrainBuilder.LEGEND["T"].height
	var home_pos := TestMap.world_pos(DEER_HOME.x, DEER_HOME.y) + Vector3(0, ground, 0)
	for i in DEER_COUNT:
		var body := _build_deer_body()
		body.position = home_pos
		add_child(body)
		_deer.append({"node": body, "home": home_pos, "phase": _hash(i, 11) * TAU})


func _build_deer_body() -> Node3D:
	var root := Node3D.new()
	root.name = "Deer"
	var mat := StandardMaterial3D.new()
	mat.albedo_color = DEER_COLOR

	var torso := MeshInstance3D.new()
	var tmesh := BoxMesh.new()
	tmesh.size = Vector3(1.6, 0.9, 0.7)
	torso.mesh = tmesh
	torso.position = Vector3(0, 0.6, 0)
	torso.material_override = mat
	root.add_child(torso)

	var head := MeshInstance3D.new()
	var hmesh := BoxMesh.new()
	hmesh.size = Vector3(0.5, 0.5, 0.6)
	head.mesh = hmesh
	head.position = Vector3(0, 0.95, 0.55)
	head.material_override = mat
	root.add_child(head)
	return root


func _spawn_magpies() -> void:
	var ground: float = TerrainBuilder.LEGEND["T"].height
	for home in MAGPIE_HOMES:
		var perch_pos := TestMap.world_pos(home.x, home.y) + Vector3(0, ground + 2.6, 0)
		var body := _build_magpie_body()
		body.position = perch_pos
		add_child(body)
		_magpies.append({"node": body, "home": perch_pos, "cooldown": 0.0})


func _build_magpie_body() -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = Vector3(0.3, 0.3, 0.45)
	mi.mesh = mesh
	var mat := StandardMaterial3D.new()
	mat.albedo_color = MAGPIE_COLOR
	mi.material_override = mat
	return mi


func _find_player() -> Node3D:
	var players := get_tree().get_nodes_in_group("player")
	return players[0] if not players.is_empty() else null


## 웹판 KINDS.deer/magpie 둘 다 `only:'day'` — 밤엔 TimeOfDay로 숨긴다
## (bandit_encounter.gd의 night_only와 같은 판정, 여긴 반대로 낮에만).
func _process(delta: float) -> void:
	var is_day := not TimeOfDay.is_night()
	var player := _find_player()
	var t := Time.get_ticks_msec() / 1000.0

	for d in _deer:
		var node: Node3D = d.node
		node.visible = is_day
		if not is_day:
			continue
		var home: Vector3 = d.home
		var phase: float = d.phase
		var desired := home + Vector3(sin(t * 0.4 + phase), 0.0, cos(t * 0.31 + phase * 1.3)) * DEER_WANDER_RADIUS
		if player != null:
			var dist := node.global_position.distance_to(player.global_position)
			if dist < DEER_SENSE_RADIUS:
				var away: Vector3 = node.global_position - player.global_position
				away.y = 0.0
				if away.length() > 0.01:
					away = away.normalized()
				desired = node.global_position + away * DEER_WANDER_RADIUS
		node.position = node.position.move_toward(desired, DEER_FLEE_SPEED * delta)

	for m in _magpies:
		var mnode: MeshInstance3D = m.node
		var cooldown: float = m.cooldown
		if cooldown > 0.0:
			cooldown -= delta
			m.cooldown = cooldown
			mnode.visible = false
			continue
		mnode.visible = is_day
		if not is_day:
			continue
		if player != null and mnode.global_position.distance_to(player.global_position) < MAGPIE_SENSE_RADIUS:
			m.cooldown = MAGPIE_FLY_COOLDOWN_SEC
			mnode.visible = false
