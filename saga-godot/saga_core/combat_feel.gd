extends Node

## PLAN.md 101-3 "C 손맛(다섯 판 공용 saga_core/combat_feel.gd 신설)" —
## 2026-09-17, PLAN 101-2 DUNGEON ③(손맛 2차)에서 처음 만든다. 다섯 판
## 공용 자리로 설계됐지만(101-3 원문 그대로) 그 세션은 DUNGEON 한 곳만
## 실제로 연결했다(`melee_attack.gd::_strike()` — 이미 있는 유일한 "타격
## 한 곳" 자리, 축복 3택 세션의 원소 시너지와 같은 판단 — 스킬 스크립트
## 80여 개까지 개별로 잇는 건 범위 밖, 다음 세션). **같은 날, STORY
## ①후보(손맛 표준)에서 `story_player.gd`도 이었다** — STORY는 무예마다
## 함수가 갈려 있지만(연참·횡소·기탄 등 18곳) 다 같은 3줄 패턴이라
## 한 번에 옮겼다(`story_player.gd` 헤더 참고). 옛 `trigger_hitstop()`
## (story_combat.gd, Engine.time_scale 직접 조작)은 지웠다. GO의 화면
## 플래시(0.35s)는 아직 안 건드렸다 — 다음에 그 판을 옮겨 붙일 자리로
## 남겨 둔다(PLAN 101-4 순서 2, GO·FOREST·REALM 몫).
##
## `hit(target, amount, crit)` 한 호출이 5요소를 낸다(101-3 수치 그대로):
## ① **hitstop** — `Engine.time_scale` 0.05로 70ms(치명 120ms). 여러
##    타격이 겹치면 남은 시간이 더 긴 쪽으로 늘어난다(dungeon_run_state.gd
##    `_temp_buffs`와 같은 "더 센/긴 쪽 유지" 결) — `_process()`가 실제
##    시각(Time.get_ticks_msec, time_scale의 영향을 안 받는다)으로 만료를
##    본다.
## ② **카메라 흔들림** — "camera_rig" 그룹의 첫 노드에 0.06m(4px 상당,
##    거리 8m 기준) 노이즈 120ms(`dungeon_camera_rig.gd::shake()` 참고).
##    그 그룹에 아무도 없으면(아직 안 옮긴 판) 조용히 건너뛴다.
## ③ **피격 플래시** — target의 첫 `MeshInstance3D` 자식을 본다. `cel_toon`
##    셰이더(surface override, CelShaderApply 가 입힌 Player·NPC)가 걸려
##    있으면 2026-09-18(PLAN 102-3)부터 그 `hit_flash` uniform을 80ms
##    1.0→0.0으로 쓴다. 아직 그 셰이더가 없는 대상(`dungeon_enemy.gd::
##    _spawn_visual()`의 `StandardMaterial3D` 단색 몬스터 등)은 예전처럼
##    `albedo_color`를 흰색으로 80ms 바꿨다 되돌리는 근사를 그대로 쓴다.
## ④ **숫자 팝** — `Label3D` 하나를 현재 씬 루트에 띄워 0.6초 동안 0.8m
##    떠오르며 사라진다(크리는 1.4배 크기·주황).
## ⑤ **타격음** — 3종 라운드로빈 인덱스만 돈다(67장 "사운드는 구조만" —
##    실제 오디오 자산이 없어 `AudioStreamPlayer3D`를 안 만든다, 소리가
##    생기면 이 자리에 스트림만 꽂으면 된다). `sound_triggered(idx)`
##    신호로 "울렸다"는 사실만 낸다.
##
## 다섯 신호(hitstop_triggered·shake_triggered·flash_triggered·
## popup_triggered·sound_triggered)는 101-3이 요구한 진단("hit() 1회 →
## 5요소 신호 5개")을 그대로 세게 하려고 둔 것 — 실제 소비자는 신호가
## 아니라 이 함수가 직접 부르는 부수효과(time_scale·마커·머티리얼 등)다.
##
## project.godot [autoload]에 CombatFeel로 등록.

signal hitstop_triggered(dur_ms: int)
signal shake_triggered(amp_m: float, dur_ms: int)
signal flash_triggered(target: Node)
signal popup_triggered(amount: float, crit: bool)
signal sound_triggered(idx: int)

const HITSTOP_MS := 70
const HITSTOP_CRIT_MS := 120
const HITSTOP_SCALE := 0.05
const SHAKE_AMP_M := 0.06
const SHAKE_MS := 120
const FLASH_MS := 80
const POPUP_SEC := 0.6
const POPUP_RISE_M := 0.8
const POPUP_CRIT_SCALE := 1.4
const SOUND_CUE_COUNT := 3
const CEL_SHADER := preload("res://saga_core/shaders/cel_toon.gdshader")

var _hitstop_until_msec := 0
var _flash_state: Dictionary = {}  # MeshInstance3D 인스턴스ID -> {mesh, orig, until}
var _sound_idx := 0


func hit(target: Node3D, amount: float, crit: bool) -> void:
	_do_hitstop(crit)
	_do_shake()
	if is_instance_valid(target):
		_do_flash(target)
		_do_popup(target, amount, crit)
	_do_sound()


func _do_hitstop(crit: bool) -> void:
	var dur := HITSTOP_CRIT_MS if crit else HITSTOP_MS
	var until := Time.get_ticks_msec() + dur
	_hitstop_until_msec = maxi(_hitstop_until_msec, until)
	Engine.time_scale = HITSTOP_SCALE
	hitstop_triggered.emit(dur)


func _process(_delta: float) -> void:
	if _hitstop_until_msec > 0 and Time.get_ticks_msec() >= _hitstop_until_msec:
		Engine.time_scale = 1.0
		_hitstop_until_msec = 0
	_tick_flash()


func _do_shake() -> void:
	var rig := get_tree().get_first_node_in_group("camera_rig")
	if rig != null and rig.has_method("shake"):
		rig.shake(SHAKE_AMP_M, SHAKE_MS / 1000.0)
	shake_triggered.emit(SHAKE_AMP_M, SHAKE_MS)


func _do_flash(target: Node3D) -> void:
	var mesh := _first_mesh(target)
	if mesh != null:
		var key := mesh.get_instance_id()
		var shader_mats := _cel_shader_materials(mesh)
		if not shader_mats.is_empty():
			for m in shader_mats:
				(m as ShaderMaterial).set_shader_parameter("hit_flash", 1.0)
			_flash_state[key] = {"kind": "shader", "mats": shader_mats,
				"until": Time.get_ticks_msec() + FLASH_MS}
		elif mesh.material_override is StandardMaterial3D:
			var mat: StandardMaterial3D = mesh.material_override
			if not _flash_state.has(key) or _flash_state[key].get("kind") != "standard":
				_flash_state[key] = {"kind": "standard", "mesh": mesh, "orig": mat.albedo_color}
			mat.albedo_color = Color.WHITE
			_flash_state[key]["until"] = Time.get_ticks_msec() + FLASH_MS
	flash_triggered.emit(target)


## mesh의 서피스 override 재질 중 cel_toon 셰이더를 쓰는 것만 모은다
## (CelShaderApply.apply_to가 이 셰이더를 surface override로 입힌다 —
## material_override 통짜가 아니라 서피스별이라 여기서 따로 훑는다).
func _cel_shader_materials(mesh: MeshInstance3D) -> Array:
	var result: Array = []
	if mesh.mesh == null:
		return result
	for i in mesh.mesh.get_surface_count():
		var mat := mesh.get_surface_override_material(i)
		if mat is ShaderMaterial and (mat as ShaderMaterial).shader == CEL_SHADER:
			result.append(mat)
	return result


func _tick_flash() -> void:
	if _flash_state.is_empty():
		return
	var now := Time.get_ticks_msec()
	var done: Array = []
	for key in _flash_state:
		var info: Dictionary = _flash_state[key]
		if now >= int(info.until):
			if info.kind == "shader":
				for m in info.mats:
					if is_instance_valid(m):
						(m as ShaderMaterial).set_shader_parameter("hit_flash", 0.0)
			else:
				var mesh: MeshInstance3D = info.mesh
				if is_instance_valid(mesh) and mesh.material_override is StandardMaterial3D:
					(mesh.material_override as StandardMaterial3D).albedo_color = info.orig
			done.append(key)
	for key in done:
		_flash_state.erase(key)


func _first_mesh(target: Node3D) -> MeshInstance3D:
	for child in target.get_children():
		if child is MeshInstance3D:
			return child
	return null


func _do_popup(target: Node3D, amount: float, crit: bool) -> void:
	var scene := get_tree().current_scene
	if scene == null:
		popup_triggered.emit(amount, crit)
		return
	var label := Label3D.new()
	label.text = str(int(roundf(amount)))
	label.modulate = Color(1.0, 0.55, 0.1) if crit else Color(1.0, 1.0, 1.0)
	label.font_size = 48
	label.pixel_size = 0.01 * (POPUP_CRIT_SCALE if crit else 1.0)
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.no_depth_test = true
	label.global_position = target.global_position + Vector3(0, 1.2, 0)
	scene.add_child(label)
	var tw := label.create_tween()
	tw.tween_property(label, "position:y", label.position.y + POPUP_RISE_M, POPUP_SEC)
	tw.parallel().tween_property(label, "modulate:a", 0.0, POPUP_SEC)
	tw.tween_callback(label.queue_free)
	popup_triggered.emit(amount, crit)


func _do_sound() -> void:
	_sound_idx = (_sound_idx + 1) % SOUND_CUE_COUNT
	sound_triggered.emit(_sound_idx)
