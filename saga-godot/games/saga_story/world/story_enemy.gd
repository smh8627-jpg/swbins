extends Node3D

## VERTICAL_SLICE_STORY.md 1·3절 — 잡졸 하나(황건적, data-enemy.js 첫
## 항목 그대로, weapon:club·color '#c9a83a' — DUNGEON dungeon_enemy.gd가
## 이미 같은 색으로 옮겨 둔 값과 같다). HP=18·DMG=6은 side.js
## spawnEnemy()의 lv=1 공식(story_combat.gd 상단 참고).
##
## **재해석** — 추격은 여전히 없다(1·3절 "제외" — 잡졸은 제자리에 서
## 있다, 넉백도 없음). **2026-09-13 추가 — 반격만 채운다**: side.js
## `overlap(p, e) && e.cd<=0`이면 `hurtMe(e.dmg)` 그대로 — 플레이어가
## 닿으면(추격 없이) 맞는다. 원문 `e.cd=1.0`(1초 쿨다운) 그대로. 겹침
## 판정 반경은 `P_W`(26px)/2 + 잡졸 `w`(34px)/2 = 30px×0.02=0.6m로
## 역산(원문은 AABB 겹침이지만 이 포트는 X축 거리 하나로 충분히
## 재현한다 — story_player.gd `_melee_hit()`도 같은 방식).
##
## **2026-09-13 추가 — 보스(황건 두목, is_boss).** story_boss_spawner.gd가
## add_child 전에 `is_boss=true`를 세팅한다(story_gather.gd의 kind와 같은
## 배선 순서 — set_script 직후 값을 덮어써야 _ready()가 그 값을 본다).
## 몸집 배율(BOSS_VISUAL_SCALE)은 원작에 없는 값 — DUNGEON dungeon_
## enemy.gd가 r=boss?22:13(≈1.7배)로 몸집만 키우고 색은 그대로 두는
## 것과 같은 결로 새로 정했다.

const StoryCombat := preload("res://games/saga_story/data/story_combat.gd")
const StoryGearPickup := preload("res://games/saga_story/world/story_gear_pickup.gd")

signal died

const COLOR := Color(0.788, 0.659, 0.227)  # data-enemy.js 황건적 color '#c9a83a'
const BOSS_VISUAL_SCALE := 1.6
const OVERLAP_RANGE := 0.6  # (P_W/2 + enemy_w/2)px * SCALE = (13+17)*0.02
const ATTACK_COOLDOWN := 1.0  # side.js e.cd = 1.0 그대로

var is_boss := false
var hp := StoryCombat.ENEMY_HP
var _dead := false
var _attack_cd_left := 0.0


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


func _physics_process(delta: float) -> void:
	if _dead:
		return
	_attack_cd_left = maxf(0.0, _attack_cd_left - delta)
	if _attack_cd_left > 0.0:
		return
	var player := get_tree().get_first_node_in_group("player")
	if player == null or not player.has_method("take_damage"):
		return
	var scale_mul: float = BOSS_VISUAL_SCALE if is_boss else 1.0
	var dx: float = player.global_position.x - global_position.x
	if absf(dx) > OVERLAP_RANGE * scale_mul:
		return
	_attack_cd_left = ATTACK_COOLDOWN
	var dmg: float = StoryCombat.ENEMY_DMG * (StoryCombat.BOSS_DMG_MUL if is_boss else 1.0)
	player.take_damage(dmg)


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
	_maybe_drop_gear()
	queue_free()


## 아직 안 낀 부위만 드롭 풀에 넣는다(story_combat.gd GEAR_ITEMS 머리말
## — 가방이 없어 중복 습득이 의미 없다). 전부 꼈으면 드롭 자체가 없다.
func _maybe_drop_gear() -> void:
	var pool: Array = []
	for key: String in StoryCombat.GEAR_ITEMS:
		var slot: String = String(StoryCombat.GEAR_ITEMS[key].slot)
		if not StorySaveState.has_slot(slot):
			pool.append(key)
	if pool.is_empty():
		return
	var chance: float = StoryCombat.GEAR_DROP_CHANCE_BOSS if is_boss else StoryCombat.GEAR_DROP_CHANCE_GRUNT
	if randf() < chance:
		var picked: String = pool[randi() % pool.size()]
		StoryGearPickup.spawn_at(get_parent(), global_position, picked)
