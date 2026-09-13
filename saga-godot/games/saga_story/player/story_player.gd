extends CharacterBody3D

## VERTICAL_SLICE_STORY.md 1·2·3절 — 2.5D 플랫포머 이동+공격.
## GO player.gd의 GLB·애니메이션 재사용 방식은 그대로 빌리되(character-
## a.glb, idle/walk/sprint), 이 판은 **가로(X)·높이(Y) 평면에만** 움직인다
## (2절 "Z는 이번 슬라이스에서 고정") — move_forward/move_back(W/S)은
## 이동에 안 쓰고 줄 오르내리기 전용으로 돌린다.
##
## 물리 상수는 VERTICAL_SLICE_STORY.md 2절 그대로(비율만 웹과 맞춘 재설계,
## 원문 픽셀값을 그대로 옮기지 않는다).

const GRAVITY := 36.0
const JUMP_SPEED := 15.0
const RUN_SPEED := 6.0
const CLIMB_SPEED := 4.0
const TURN_RATE := 12.0
const ATTACK_RANGE := 2.2
const ATTACK_COOLDOWN := 0.36  # 무예 연참(連斬) cd 0.36 그대로(js/data-job.js)

const StoryCombat := preload("res://games/saga_story/data/story_combat.gd")

@onready var visual: Node3D = $Visual
@onready var _anim: AnimationPlayer = visual.find_child("AnimationPlayer", true, false)

var _current_anim := ""
var _facing := 1.0  # +1 오른쪽, -1 왼쪽
var _attack_cd_left := 0.0
var _on_rope := false
var _rope_area: Area3D = null

## **2026-09-12 추가 — 무예 나머지 셋(횡소·기탄·기합).** story_combat.gd
## 머리말 참고. MP는 세이브에 안 넣는다(재입장 시 가득 찬 채 시작 —
## 원작도 "쉬는 중은 실제로 mp 가득 참으로 시작"이 기본 흐름이다).
var mp := StoryCombat.MP_MAX
var _cd_sweep := 0.0
var _cd_bolt := 0.0
var _cd_brace := 0.0
var _buff_time_left := 0.0  # 기합(brace) 남은 시간 — atk·speed 배율에 쓴다


func _ready() -> void:
	visual.rotation.y = PI * 0.5  # 오른쪽(+X)을 보고 시작 — StoryPlayer.tscn 참고
	_play_anim("idle")


func _physics_process(delta: float) -> void:
	_attack_cd_left = maxf(0.0, _attack_cd_left - delta)
	_cd_sweep = maxf(0.0, _cd_sweep - delta)
	_cd_bolt = maxf(0.0, _cd_bolt - delta)
	_cd_brace = maxf(0.0, _cd_brace - delta)
	_buff_time_left = maxf(0.0, _buff_time_left - delta)
	mp = minf(StoryCombat.MP_MAX, mp + StoryCombat.MP_REGEN * delta)
	_check_rope()

	if _on_rope and _rope_area != null:
		_climb(delta)
	else:
		_walk(delta)

	## 2절 "Z는 이번 슬라이스에서 고정" — 어떤 경로로도 Z가 안 밀리게
	## 매 프레임 되돌린다(바닥·발판 충돌이 얕은 Z폭을 갖다 보니 모서리에서
	## 아주 조금 밀릴 수 있다).
	global_position.z = 0.0

	move_and_slide()

	if Input.is_action_just_pressed("combat_quick") and _attack_cd_left <= 0.0:
		_attack()
	if Input.is_action_just_pressed("story_skill_sweep"):
		_cast_sweep()
	if Input.is_action_just_pressed("story_skill_bolt"):
		_cast_bolt()
	if Input.is_action_just_pressed("story_skill_brace"):
		_cast_brace()


func _walk(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	elif Input.is_action_just_pressed("jump"):
		velocity.y = JUMP_SPEED
	else:
		velocity.y = 0.0

	var axis := Input.get_axis("move_left", "move_right")
	var speed := RUN_SPEED * (StoryCombat.BRACE_SPEED_MUL if _buff_time_left > 0.0 else 1.0)
	velocity.x = axis * speed

	if absf(axis) > 0.05:
		_facing = signf(axis)
		visual.rotation.y = lerp_angle(visual.rotation.y, PI * 0.5 if _facing > 0 else -PI * 0.5, TURN_RATE * delta)
		_play_anim("walk")
	else:
		_play_anim("idle")


## 줄 안에서는 중력이 없다 — 위/아래(move_forward/move_back, 원래 3D
## 전후 이동용 축)를 오르내리기 전용으로 빌려 쓴다. 가로 입력이 세게
## 들어오면(> 0.3) 손을 놓은 것으로 본다(웹판엔 없는 규칙 — 로프에서
## 못 내려오는 사고를 막으려고 직접 정함, VERTICAL_SLICE_STORY.md에
## 안 적힌 세부 튜닝이라 여기 남겨 둔다).
func _climb(delta: float) -> void:
	var rope_x: float = float(_rope_area.get_meta("rope_x"))
	var top: float = float(_rope_area.get_meta("rope_top"))
	var bottom: float = float(_rope_area.get_meta("rope_bottom"))

	var vertical := Input.get_axis("move_back", "move_forward")
	if absf(Input.get_axis("move_left", "move_right")) > 0.3:
		_on_rope = false
		return

	global_position.x = rope_x
	velocity = Vector3.ZERO
	global_position.y = clampf(global_position.y + vertical * CLIMB_SPEED * delta, bottom, top)

	if absf(vertical) > 0.05:
		_play_anim("walk")
	else:
		_play_anim("idle")

	if Input.is_action_just_pressed("jump"):
		_on_rope = false
		velocity.y = JUMP_SPEED * 0.6


func _check_rope() -> void:
	if _on_rope:
		return
	if _rope_area == null:
		return
	var vertical := Input.get_axis("move_back", "move_forward")
	if absf(vertical) > 0.05:
		_on_rope = true


## story_terrain_builder.gd의 RopeArea가 body_entered/exited로 부른다
## (플레이어는 CharacterBody3D라 자기 쪽엔 Area3D 신호가 없다 — 줄
## 쪽에서 알려 주는 방향으로 배선했다).
func set_rope_area(area: Area3D) -> void:
	_rope_area = area


func clear_rope_area(area: Area3D) -> void:
	if _rope_area == area:
		_rope_area = null
		_on_rope = false


## side.js power()의 atk = round(might*0.9+wisdom*0.3) + gearBonus().atk —
## 무기(목검, 2026-09-13 추가)가 있으면 그 위에 얹는다. 기합(brace)이
## 걸려 있으면 그 합계에 ×1.35(원문 buff.atk 그대로, side.js가 pw.atk
## 자체를 buff로 올리는 것과 같은 결 — 스킬마다 따로 배율을 안 곱한다).
func _effective_atk() -> float:
	var atk := StoryCombat.START_ATK + (StoryCombat.WEAPON_ATK if StorySaveState.has_weapon else 0.0)
	return atk * (StoryCombat.BRACE_ATK_MUL if _buff_time_left > 0.0 else 1.0)


## 정면 판정 공용 — 연참(reach)·기탄(reach*2)이 같이 쓴다. mul은 무예별
## 배율(연참 1.0·기탄 BOLT_MUL), range는 사거리.
func _melee_hit(range_m: float, mul: float) -> void:
	for enemy in get_tree().get_nodes_in_group("story_enemy"):
		var e := enemy as Node3D
		if e == null:
			continue
		var dx: float = e.global_position.x - global_position.x
		if absf(dx) > range_m:
			continue
		if signf(dx) != 0.0 and signf(dx) != _facing and absf(dx) > 0.3:
			continue  # 등 뒤는 안 맞는다(바로 겹친 자리 정도는 봐준다)
		var roll: Dictionary = StoryCombat.roll_damage(_effective_atk(), mul)
		e.take_damage(float(roll.dmg))
		if bool(roll.crit):
			StoryCombat.trigger_hitstop(get_tree())


func _attack() -> void:
	_attack_cd_left = ATTACK_COOLDOWN
	_play_anim("sprint")  # 전용 공격 애니메이션이 없어 임시로 빌림(재해석, 실기 확인 때 다시 볼 것)
	_melee_hit(ATTACK_RANGE, 1.0)


## 횡소(sweep) — aoe, 등 뒤도 맞는다(360도 판정, side.js effect:'aoe' 그대로
## — 정면 판정이 없다). MP·쿨다운 부족하면 side.js castSkill()처럼 조용히
## 무시한다(원문에 실패 메시지가 없다).
func _cast_sweep() -> void:
	if _cd_sweep > 0.0 or mp < StoryCombat.SWEEP_COST:
		return
	_cd_sweep = StoryCombat.SWEEP_CD
	mp -= StoryCombat.SWEEP_COST
	_play_anim("sprint")
	var range_m := ATTACK_RANGE * StoryCombat.SWEEP_RANGE_MUL
	for enemy in get_tree().get_nodes_in_group("story_enemy"):
		var e := enemy as Node3D
		if e == null:
			continue
		var dx: float = e.global_position.x - global_position.x
		if absf(dx) > range_m:
			continue
		var roll: Dictionary = StoryCombat.roll_damage(_effective_atk(), StoryCombat.SWEEP_MUL)
		e.take_damage(float(roll.dmg))
		if bool(roll.crit):
			StoryCombat.trigger_hitstop(get_tree())


## 기탄(bolt) — 관통. 이 슬라이스는 투사체가 없어(적이 안 움직인다) "더
## 멀리 뻗는 정면 공격"으로 재해석(story_combat.gd BOLT_RANGE_MUL 참고).
func _cast_bolt() -> void:
	if _cd_bolt > 0.0 or mp < StoryCombat.BOLT_COST:
		return
	_cd_bolt = StoryCombat.BOLT_CD
	mp -= StoryCombat.BOLT_COST
	_play_anim("sprint")
	_melee_hit(ATTACK_RANGE * StoryCombat.BOLT_RANGE_MUL, StoryCombat.BOLT_MUL)


## 기합(brace) — buff, 대미지 없음. _effective_atk()·_walk()의 speed
## 배율이 _buff_time_left>0을 읽어 실제로 적용한다.
func _cast_brace() -> void:
	if _cd_brace > 0.0 or mp < StoryCombat.BRACE_COST:
		return
	_cd_brace = StoryCombat.BRACE_CD
	mp -= StoryCombat.BRACE_COST
	_buff_time_left = StoryCombat.BRACE_SEC


func _play_anim(anim_name: String) -> void:
	if _anim == null or not _anim.has_animation(anim_name):
		return
	if _current_anim == anim_name:
		return
	_current_anim = anim_name
	_anim.play(anim_name)
