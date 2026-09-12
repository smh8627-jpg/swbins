extends CharacterBody3D

## 황건적(黃巾賊, tier1, biome:ruins) — VERTICAL_SLICE_DUNGEON.md 4절.
## `data-enemy.js`의 첫 항목을 그대로 옮겼다(새 몬스터를 상상하지
## 않는다) — 색(`#c9a83a`)까지 원작 그대로. HP·공격력은 `dungeon.js`의
## `enemyHp(1,false)`·`enemyDmg(1,false)` 공식을 floor=1로 계산한 값
## (24·5) — 원작 수치 그대로, 새로 만들지 않았다. "황건적"은 후한 말
## 반란 세력을 가리키는 역사 용어이지 실존 "인물"이 아니라, 루트
## CLAUDE.md의 이름 정책(HEROES 개별 인물 실명 회피)과는 다른 경계다 —
## "산적"·"정찰병"처럼 적 부류를 가리키는 일반명사로 GO에서도 이미
## 같은 방식을 쓴다.
##
## 시각은 캡슐(hero_encounter.gd·simple_event.gd와 같은 이유 — 이 판
## 전용 GLB가 아직 없다). 공격 간격(1.4초)은 원작에 없어(플레이어 공격
## 간격만 명시돼 있었다) 이번에 직접 정했다 — 너무 잦으면 첫 전투부터
## 벅차 보인다.

signal died

const ATTACK_COOLDOWN := 1.4  # 원작에 없는 값 — 직접 정함(위 주석 참고)
const CHASE_SPEED := 2.4
const DETECT_RADIUS := 9.0
const ATTACK_RANGE := 2.0
const COLOR := Color(0.788, 0.659, 0.227)  # data-enemy.js 황건적 color '#c9a83a' 그대로
const LootPickup := preload("res://games/saga_dungeon/world/loot_pickup.gd")

## "여러 방 연결"(§28-8 A안 이전의 최소 버전) — 방을 층처럼 취급해 웹판
## `dungeon.js`의 `enemyHp(floor, boss)`·`enemyDmg(floor, boss)` 공식을
## 그대로 옮겼다: `round(24 * 1.26^(floor-1))`·`round(5 * 1.20^(floor-1))`
## (boss=false 고정, mode().hp/dmg는 난도 시스템이 없어 1로 취급 — 기존
## 방 0의 24/5와 정확히 일치하는 걸로 확인). 새 몬스터를 상상하지 않고
## 같은 잡졸이 층마다 세지기만 한다.
var max_hp: float
var attack_damage: float
var hp: float
var _attack_cd_left := 0.0
var _player: Node3D
var _dead := false


func _init(floor_num: int = 1) -> void:
	max_hp = roundf(24.0 * pow(1.26, floor_num - 1))
	attack_damage = roundf(5.0 * pow(1.20, floor_num - 1))
	hp = max_hp


func _ready() -> void:
	add_to_group("dungeon_enemy")
	_player = get_tree().get_first_node_in_group("player")
	_spawn_visual()


func _spawn_visual() -> void:
	var mi := MeshInstance3D.new()
	var mesh := CapsuleMesh.new()
	mesh.radius = 0.7
	mesh.height = 1.7
	mi.mesh = mesh
	mi.position = Vector3(0, 0.85, 0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = COLOR
	mi.material_override = mat
	add_child(mi)

	var cs := CollisionShape3D.new()
	var shape := CapsuleShape3D.new()
	shape.radius = 0.7
	shape.height = 1.7
	cs.position = Vector3(0, 0.85, 0)
	cs.shape = shape
	add_child(cs)


func _physics_process(delta: float) -> void:
	if _dead or _player == null:
		return
	_attack_cd_left = maxf(0.0, _attack_cd_left - delta)
	var to_player: Vector3 = _player.global_position - global_position
	to_player.y = 0
	var dist := to_player.length()
	if dist <= ATTACK_RANGE:
		velocity = Vector3.ZERO
		if _attack_cd_left <= 0.0:
			_attack_cd_left = ATTACK_COOLDOWN
			_attack_player()
	elif dist <= DETECT_RADIUS:
		velocity = to_player.normalized() * CHASE_SPEED
	else:
		velocity = Vector3.ZERO
	move_and_slide()


func _attack_player() -> void:
	if _player.has_node("PlayerHealth"):
		_player.get_node("PlayerHealth").take_damage(attack_damage)


func take_damage(amount: float) -> void:
	if _dead or amount <= 0.0:
		return
	hp -= amount
	if hp <= 0.0:
		_dead = true
		died.emit()
		LootPickup.spawn_at(get_parent(), global_position)
		queue_free()
