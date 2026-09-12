extends Node3D

## VERTICAL_SLICE_STORY.md 1·3절 — 잡졸 하나(황건적, data-enemy.js 첫
## 항목 그대로, weapon:club·color '#c9a83a' — DUNGEON dungeon_enemy.gd가
## 이미 같은 색으로 옮겨 둔 값과 같다). HP=18·DMG=6은 side.js
## spawnEnemy()의 lv=1 공식(story_combat.gd 상단 참고).
##
## **재해석** — 이번 슬라이스는 추격·원거리 반격이 없다(1·3절 "제외" —
## "때린다→쓰러진다" 감각부터 검증한다). DUNGEON dungeon_enemy.gd처럼
## 플레이어를 쫓아오지 않고 **제자리에 서서 맞기만 한다** — 넉백조차
## 이번엔 안 넣었다(시각 반응 없이 HP만 깎인다, 다음 콘텐츠 확장 때
## dungeon_enemy.gd 패턴을 참고해 추격·반격을 붙이면 된다).

const StoryCombat := preload("res://games/saga_story/data/story_combat.gd")

signal died

const COLOR := Color(0.788, 0.659, 0.227)  # data-enemy.js 황건적 color '#c9a83a'

var hp := StoryCombat.ENEMY_HP
var _dead := false


func _ready() -> void:
	add_to_group("story_enemy")
	_spawn_visual()


func _spawn_visual() -> void:
	var mi := MeshInstance3D.new()
	var mesh := CapsuleMesh.new()
	mesh.radius = 0.6
	mesh.height = 1.6
	mi.mesh = mesh
	mi.position = Vector3(0, 0.8, 0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = COLOR
	mi.material_override = mat
	add_child(mi)

	var cs := CollisionShape3D.new()
	var shape := CapsuleShape3D.new()
	shape.radius = 0.6
	shape.height = 1.6
	cs.position = Vector3(0, 0.8, 0)
	cs.shape = shape
	add_child(cs)


func take_damage(amount: float) -> void:
	if _dead or amount <= 0.0:
		return
	hp -= amount
	if hp <= 0.0:
		_die()


func _die() -> void:
	if _dead:
		return
	_dead = true
	died.emit()
	StorySaveState.add_kill()
	queue_free()
