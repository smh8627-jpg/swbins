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
##
## **2026-09-13 추가 — 사냥터별 보스 배율.** hp_mul/dmg_mul은 이제
## story_boss_spawner.gd가 add_child 전에 맵별 값(is_boss와 같은 배선
## 순서)으로 덮어쓴다 — 기본값(story_combat.gd BOSS_HP_MUL/DMG_MUL)은
## map_path를 안 거치는 맨몸 인스턴스용 안전값일 뿐이다.
##
## **2026-09-13 추가(같은 날 더) — 몬스터 도감.** `enemy_lv`/`enemy_color`
## 신규 — hp·dmg가 이제 story_combat.gd의 lv 공식(`enemy_base_hp`/
## `enemy_base_dmg`)을 따르고, 몸 색도 맵이 넘긴 값을 쓴다(story_enemy_
## spawner.gd는 잡졸 색을, story_boss_spawner.gd는 보스 전용 색을
## 넘긴다 — 이 파일이 알던 하드코딩된 `COLOR` 하나(황건적/황건 두목,
## field 전용)는 이제 그 둘의 기본값일 뿐이다).
##
## **2026-09-13 추가(같은 날 더 더) — 원거리 적(1절 "제외" 목록).**
## `is_ranged`(story_enemy_spawner.gd가 map.enemy_is_ranged()로 세팅,
## 보스는 안 씀 — story_boss_spawner.gd가 안 건드려 기본값 false 그대로)
## true면 근접 접촉 피해와 별개로 사거리 안에서 화살을 쏜다(story_combat.gd
## RANGED_* 참고). 두 공격은 서로 독립된 쿨다운이라(side.js `e.cd`와
## `e.shotCd`가 다른 변수인 것과 같다) 한 쪽이 쿨다운 중이어도 다른 쪽은
## 정상 작동해야 한다 — `_physics_process()`를 그렇게 갈랐다.
const StoryCombat := preload("res://games/saga_story/data/story_combat.gd")
const StoryGearPickup := preload("res://games/saga_story/world/story_gear_pickup.gd")
const StoryGoldPickup := preload("res://games/saga_story/world/story_gold_pickup.gd")
const StoryEnemyShot := preload("res://games/saga_story/world/story_enemy_shot.gd")

signal died

const COLOR := Color(0.788, 0.659, 0.227)  # data-enemy.js 황건적 color '#c9a83a'
const BOSS_VISUAL_SCALE := 1.6
const OVERLAP_RANGE := 0.6  # (P_W/2 + enemy_w/2)px * SCALE = (13+17)*0.02
const ATTACK_COOLDOWN := 1.0  # side.js e.cd = 1.0 그대로

var is_boss := false
var is_ranged := false
var boss_hp_mul := StoryCombat.BOSS_HP_MUL
var boss_dmg_mul := StoryCombat.BOSS_DMG_MUL
var enemy_lv := 1.0
var enemy_color := COLOR
var hp: float
var _dead := false
var _attack_cd_left := 0.0
var _shot_cd_left := 0.0


func _ready() -> void:
	var base_hp: float = StoryCombat.enemy_base_hp(enemy_lv)
	if is_boss:
		hp = base_hp * boss_hp_mul
		add_to_group("story_boss")
	else:
		hp = base_hp
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
	mat.albedo_color = enemy_color
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
	_shot_cd_left = maxf(0.0, _shot_cd_left - delta)
	var player := get_tree().get_first_node_in_group("player")
	if player == null or not player.has_method("take_damage"):
		return
	var scale_mul: float = BOSS_VISUAL_SCALE if is_boss else 1.0
	var dx: float = player.global_position.x - global_position.x

	if _attack_cd_left <= 0.0 and absf(dx) <= OVERLAP_RANGE * scale_mul:
		_attack_cd_left = ATTACK_COOLDOWN
		var base_dmg: float = StoryCombat.enemy_base_dmg(enemy_lv)
		var dmg: float = base_dmg * (boss_dmg_mul if is_boss else 1.0)
		player.take_damage(dmg)

	if is_ranged and not is_boss and _shot_cd_left <= 0.0 and absf(dx) <= StoryCombat.RANGED_RANGE_M:
		_shot_cd_left = StoryCombat.RANGED_CD_SEC
		_fire_shot(dx)


## side.js eshot 그대로: dir·spd(RANGED_SPD_M)로 날아가 RANGED_MUL만큼
## 깎인 피해를 준다(enemy_base_dmg(enemy_lv) 기준 — 근접 피해와 같은
## lv 공식에서 갈라져 나온다).
func _fire_shot(dx: float) -> void:
	var dir: float = 1.0 if dx > 0.0 else -1.0
	var dmg: float = StoryCombat.enemy_base_dmg(enemy_lv) * StoryCombat.RANGED_MUL
	var shot := Area3D.new()
	shot.set_script(StoryEnemyShot)
	shot.global_position = global_position + Vector3(dir * 0.5, 0.9, 0)
	shot.dir = dir
	shot.speed = StoryCombat.RANGED_SPD_M
	shot.damage = dmg
	shot.life_left = StoryCombat.RANGED_LIFE_SEC
	get_parent().add_child(shot)


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
	StorySaveState.add_exp(StoryCombat.enemy_exp(is_boss, enemy_lv))
	StoryGoldPickup.spawn_at(get_parent(), global_position + Vector3(-0.4, 0, 0.4), StoryCombat.roll_gold(is_boss, enemy_lv))
	_maybe_drop_gear()
	queue_free()


## **2026-09-13 추가(같은 날 더, tier2~4) — 사냥터 lv 기준 풀로 좁힘.**
## StoryCombat.gear_pool_for(enemy_lv)(data-gear.js poolFor와 같음, need
## <= enemy_lv+3)에서 **이미 끼고 있는 바로 그 키**만 뺀다 — 부위 전체를
## 빼던 전엔 tier1 하나뿐이라 결과가 같았지만, 이제 tier가 여럿이라
## 부위 전체를 빼면 승급(더 좋은 tier로 교체)이 영영 안 된다.
func _maybe_drop_gear() -> void:
	var pool: Array = []
	for key: String in StoryCombat.gear_pool_for(enemy_lv):
		var slot: String = String(StoryCombat.GEAR_ITEMS[key].slot)
		if String(StorySaveState.equipped.get(slot, "")) != key:
			pool.append(key)
	if pool.is_empty():
		return
	var chance: float = StoryCombat.GEAR_DROP_CHANCE_BOSS if is_boss else StoryCombat.GEAR_DROP_CHANCE_GRUNT
	if randf() < chance:
		var picked: String = pool[randi() % pool.size()]
		## **2026-09-13 추가(같은 날 더 더, 고유) — gear.js rollDrop() 그대로:
		## 보스가 tier4 밑감(need==20)을 떨굴 때만, 그것도 UNIQUE_CHANCE(16%)
		## 로 이름 있는 물건으로 바뀐다. 그 부위에 고유가 없으면(UNIQUE_ITEMS에
		## 항목이 없으면) unique_for_base()가 ""를 줘 그냥 밑감 그대로 나간다.
		if is_boss and int(StoryCombat.GEAR_ITEMS[picked].need) == 20 and randf() < StoryCombat.UNIQUE_CHANCE:
			var uniq: String = StoryCombat.unique_for_base(picked)
			if uniq != "":
				picked = uniq
		StoryGearPickup.spawn_at(get_parent(), global_position, picked)
