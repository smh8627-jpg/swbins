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
##
## **2026-09-13 추가 — 보스(황건 두목, is_boss).** story_boss_spawner.gd가
## add_child 전에 `is_boss=true`를 세팅한다(story_gather.gd의 kind와 같은
## 배선 순서 — set_script 직후 값을 덮어써야 _ready()가 그 값을 본다).
## 몸집 배율(BOSS_VISUAL_SCALE)은 원작에 없는 값 — DUNGEON dungeon_
## enemy.gd가 r=boss?22:13(≈1.7배)로 몸집만 키우고 색은 그대로 두는
## 것과 같은 결로 새로 정했다.

const StoryCombat := preload("res://games/saga_story/data/story_combat.gd")

signal died

const COLOR := Color(0.788, 0.659, 0.227)  # data-enemy.js 황건적 color '#c9a83a'
const BOSS_VISUAL_SCALE := 1.6

var is_boss := false
var hp := StoryCombat.ENEMY_HP
var _dead := false


func _ready() -> void:
	if is_boss:
		hp = StoryCombat.ENEMY_HP * StoryCombat.BOSS_HP_MUL
		add_to_group("story_boss")
	add_to_group("story_enemy")
	_spawn_visual()


func _spawn_visual() -> void:
	var scale_mul: float = BOSS_VISUAL_SCALE if is_boss else 1.0
	var mi := MeshInstance3D.new()
	var mesh := CapsuleMesh.new()
	mesh.radius = 0.6 * scale_mul
	mesh.height = 1.6 * scale_mul
	mi.mesh = mesh
	mi.position = Vector3(0, 0.8 * scale_mul, 0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = COLOR
	mi.material_override = mat
	add_child(mi)

	var cs := CollisionShape3D.new()
	var shape := CapsuleShape3D.new()
	shape.radius = 0.6 * scale_mul
	shape.height = 1.6 * scale_mul
	cs.position = Vector3(0, 0.8 * scale_mul, 0)
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
