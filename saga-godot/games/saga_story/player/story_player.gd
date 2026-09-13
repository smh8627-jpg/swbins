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

## **2026-09-13 추가(같은 날 더) — 전직 다음 걸음: 무사(warrior) 무예 넷.**
## job이 'warrior'일 때만 실제로 쓰인다(story_combat.gd JOB_CHANGE_LEVEL
## 머리말 참고) — 다른 직업(궁수·협객·방사)은 아직 전용 무예가 없어
## 이 넷을 조용히 무시한다. 철갑(iron)의 버프는 기합(brace)과 **별도
## 타이머**로 둔다 — 둘 다 tier0/전직 넷으로 서로 다른 자리라 동시에
## 걸릴 수 있고(원작이 막지 않는다), _effective_atk()가 두 배율을
## 곱해서 적용한다.
var _cd_warrior_cut := 0.0
var _cd_warrior_whirl := 0.0
var _cd_warrior_rush := 0.0
var _cd_warrior_iron := 0.0
var _job_buff_time_left := 0.0

## **2026-09-13 추가 — 플레이어 체력(잡졸 반격).** story_enemy.gd 머리말이
## "추격·원거리 반격이 없다"고 적어 둔 것 중 반격(겹치면 맞는다, side.js
## overlap()+hurtMe())만 이번에 채운다 — 추격(쫓아오기)은 여전히 없다
## (잡졸은 제자리, 플레이어가 닿으면 맞는다). DUNGEON player_health.gd와
## 같은 정신으로 **죽음은 이번에도 범위 밖** — hp가 0 밑으로 안 내려가고
## 그냥 멈춘다(부활·게임오버 없음). mp처럼 세이브에 안 넣는다.
## side.js의 전역 피격무적(`p.invuln`, HIT_COOL)은 옮기지 않았다 — 잡졸이
## 하나(story_enemy.gd `_attack_cd_left`, 1초)뿐이라 같은 적이 연타하는
## 건 이미 막히고, 여러 적이 동시에 겹쳐 때리는 경우는 이번 슬라이스
## (그룬트 셋+보스 하나) 규모에선 드물다고 보고 좁혔다.
##
## **2026-09-13 추가(같은 날 더) — 장비 10부위, 이어서 전직(job).**
## max_hp는 이제 고정값이 아니라 StorySaveState.gear_totals().hp +
## job_grow().hp를 더한 값(power()의 hp = base + gear.hp + jb.hp와 같은
## 자리)이라 계산 프로퍼티(get)로 뺐다 — mp처럼 세이브에 hp 자체는 안
## 넣지만(재입장 시 가득 찬 채 시작), 장비(equipped)·직업(job)은 세이브에
## 있으므로 로드 직후 story_save_state.gd::try_load()가 hp를 새 max_hp로
## 채워 준다(안 그러면 이전 세션 보너스가 반영되기 전 기본치로 시작해
## 잠깐 어긋난다).
var hp := StoryCombat.START_HP

var max_hp: float:
	get: return StoryCombat.START_HP + float(StorySaveState.gear_totals().hp) + float(StorySaveState.job_grow().hp)

## 방사(mage) 전직의 jb.mp(+40)를 반영한 MP 최대치 — mp_bar.gd가 폴링한다.
var max_mp: float:
	get: return StoryCombat.MP_MAX + float(StorySaveState.job_grow().mp)


## side.js hurtMe()의 gear.cut(power().def) 그대로 — 방어구 def 합으로
## 받는 피해를 줄인다(story_combat.gd damage_cut() 참고). 철갑(iron)이
## 걸려 있으면 그 위에 guard(0.35)만큼 한 번 더 줄인다(방어구 컷과는
## 별개의 곱 — "9초간 덜 맞는다"는 원문 buff.guard를 그대로 얹은 것).
func take_damage(amount: float) -> void:
	if amount <= 0.0:
		return
	var def: float = float(StorySaveState.gear_totals().def)
	var cut: float = StoryCombat.damage_cut(def)
	var guard_mul: float = (1.0 - StoryCombat.WARRIOR_IRON_GUARD) if _job_buff_time_left > 0.0 else 1.0
	hp = clampf(hp - amount * (1.0 - cut) * guard_mul, 0.0, max_hp)


func _ready() -> void:
	visual.rotation.y = PI * 0.5  # 오른쪽(+X)을 보고 시작 — StoryPlayer.tscn 참고
	_play_anim("idle")


func _physics_process(delta: float) -> void:
	_attack_cd_left = maxf(0.0, _attack_cd_left - delta)
	_cd_sweep = maxf(0.0, _cd_sweep - delta)
	_cd_bolt = maxf(0.0, _cd_bolt - delta)
	_cd_brace = maxf(0.0, _cd_brace - delta)
	_buff_time_left = maxf(0.0, _buff_time_left - delta)
	_cd_warrior_cut = maxf(0.0, _cd_warrior_cut - delta)
	_cd_warrior_whirl = maxf(0.0, _cd_warrior_whirl - delta)
	_cd_warrior_rush = maxf(0.0, _cd_warrior_rush - delta)
	_cd_warrior_iron = maxf(0.0, _cd_warrior_iron - delta)
	_job_buff_time_left = maxf(0.0, _job_buff_time_left - delta)
	mp = minf(max_mp, mp + StoryCombat.MP_REGEN * delta)
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
	if StorySaveState.job == "warrior":
		if Input.is_action_just_pressed("story_job_skill_1"):
			_cast_warrior_cut()
		if Input.is_action_just_pressed("story_job_skill_2"):
			_cast_warrior_whirl()
		if Input.is_action_just_pressed("story_job_skill_3"):
			_cast_warrior_rush()
		if Input.is_action_just_pressed("story_job_skill_4"):
			_cast_warrior_iron()


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


## side.js power()의 atk = round(might*0.9+wisdom*0.3) + gearBonus().atk +
## jobGrow().atk — 낀 장비(10부위)·전직(job, 2026-09-13 추가) 전부의 atk
## 합을 그 위에 얹는다. 기합(brace)이 걸려 있으면 그 합계에 ×1.35(원문
## buff.atk 그대로, side.js가 pw.atk 자체를 buff로 올리는 것과 같은 결 —
## 스킬마다 따로 배율을 안 곱한다).
func _effective_atk() -> float:
	var atk := StoryCombat.START_ATK + float(StorySaveState.gear_totals().atk) + float(StorySaveState.job_grow().atk)
	atk *= StoryCombat.BRACE_ATK_MUL if _buff_time_left > 0.0 else 1.0
	atk *= StoryCombat.WARRIOR_IRON_ATK_MUL if _job_buff_time_left > 0.0 else 1.0
	return atk


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


## 참격(w_cut) — 연참과 같은 정면 판정, 사거리도 같다(원문에 별도
## 사거리가 없다). mul만 다르다(FIXED_SKILL_LEVEL=5에서 1.6).
func _cast_warrior_cut() -> void:
	if _cd_warrior_cut > 0.0 or mp < StoryCombat.WARRIOR_CUT_COST:
		return
	_cd_warrior_cut = StoryCombat.WARRIOR_CUT_CD
	mp -= StoryCombat.WARRIOR_CUT_COST
	_play_anim("sprint")
	_melee_hit(ATTACK_RANGE, StoryCombat.WARRIOR_CUT_MUL)


## 선풍(w_whirl) — aoe, 횡소(_cast_sweep)와 같은 360도 판정 구조.
func _cast_warrior_whirl() -> void:
	if _cd_warrior_whirl > 0.0 or mp < StoryCombat.WARRIOR_WHIRL_COST:
		return
	_cd_warrior_whirl = StoryCombat.WARRIOR_WHIRL_CD
	mp -= StoryCombat.WARRIOR_WHIRL_COST
	_play_anim("sprint")
	var range_m := ATTACK_RANGE * StoryCombat.WARRIOR_WHIRL_RANGE_MUL
	for enemy in get_tree().get_nodes_in_group("story_enemy"):
		var e := enemy as Node3D
		if e == null:
			continue
		var dx: float = e.global_position.x - global_position.x
		if absf(dx) > range_m:
			continue
		var roll: Dictionary = StoryCombat.roll_damage(_effective_atk(), StoryCombat.WARRIOR_WHIRL_MUL)
		e.take_damage(float(roll.dmg))
		if bool(roll.crit):
			StoryCombat.trigger_hitstop(get_tree())


## 돌진(w_rush) — dash. 이 슬라이스엔 원문처럼 부드러운 이동 애니메이션을
## 새로 안 짜고(재해석), **먼저 이동 경로 위 적을 때린 뒤 그 자리로
## 순간이동**한다(때리고 지나간 결과만 재현 — 다치는 적 판정이 이동
## 전/후로 갈리는 걸 피하려고 이 순서를 골랐다). 벽·구덩이 충돌은 이번
## 슬라이스에서 확인하지 않는다(다음에 볼 자리).
func _cast_warrior_rush() -> void:
	if _cd_warrior_rush > 0.0 or mp < StoryCombat.WARRIOR_RUSH_COST:
		return
	_cd_warrior_rush = StoryCombat.WARRIOR_RUSH_CD
	mp -= StoryCombat.WARRIOR_RUSH_COST
	_play_anim("sprint")
	var dist_m := StoryCombat.warrior_rush_dist_m()
	_melee_hit(dist_m, StoryCombat.WARRIOR_RUSH_MUL)
	global_position.x += dist_m * _facing


## 철갑(w_iron) — buff, 대미지 없음. 기합(brace)과 별개 타이머(위 변수
## 선언부 참고) — _effective_atk()가 곱하고, take_damage()가 guard를 뺀다.
func _cast_warrior_iron() -> void:
	if _cd_warrior_iron > 0.0 or mp < StoryCombat.WARRIOR_IRON_COST:
		return
	_cd_warrior_iron = StoryCombat.WARRIOR_IRON_CD
	mp -= StoryCombat.WARRIOR_IRON_COST
	_job_buff_time_left = StoryCombat.WARRIOR_IRON_SEC


func _play_anim(anim_name: String) -> void:
	if _anim == null or not _anim.has_animation(anim_name):
		return
	if _current_anim == anim_name:
		return
	_current_anim = anim_name
	_anim.play(anim_name)
