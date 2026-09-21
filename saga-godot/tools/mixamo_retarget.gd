extends SceneTree
## Mixamo(assets/_mixamo_src/*.fbx, 로컬 전용 — .gitignore)에서 받은 모션을
## VRM Humanoid(J_Bip_*) 스켈레톤에 리타겟한다. GUI 없이 순수 계산으로,
## 본마다 "다음 본을 향하는 방향 벡터"의 스윙(최단 회전)만 옮긴다:
## 1) 매 프레임 소스 본의 글로벌 회전을 누적해 "rest 에서 자식 쪽으로
##    향하던 방향"이 지금 어디로 돌았는지(swing = 최단회전, 트위스트 없음)를 구하고,
## 2) 그 swing 을 타깃 본의 rest 글로벌 회전에 그대로 적용해 타깃 글로벌을 만들고,
## 3) 타깃 부모 글로벌로 나눠 로컬 트랙에 쓴다.
## (2026-09-21 팔 120도 오차 원인: 이전엔 "글로벌 rest 회전차 C=tgt_rest*src_rest^-1"를
## 통째로 프레임마다 왼쪽곱했었다 — src/tgt 의 트위스트(본 축 관례)가 다르면 이
## 방식은 rest 근처를 벗어날수록 어긋나고, 특히 팔은 mixamo(FBX) rest 가 진짜
## T포즈값인데 VRM(glTF) rest 는 거의 항등이라 어긋남이 100도 넘게 커졌다.
## 방향 벡터의 swing 만 옮기면 두 스켈레톤의 트위스트 관례가 달라도 안 깨진다 —
## 대신 각 본 자신의 축 비틀림(트위스트)은 rest 그대로 고정된다(팔의 손목
## pronation 처럼 트위스트가 도드라지는 동작엔 한계, 나머지엔 충분).
## 전제(2026-09-19 verify_chain.gd 로 실측 확인됨): 매핑한 22개 본이
## 두 스켈레톤에서 부모-자식 관계가 정확히 1:1로 일치한다(중간에 안 매핑된
## 본이 끼어있지 않음) — 안 그러면 부모 글로벌로 나누는 로컬 변환이 틀어진다.
## 결과 .res 는 assets/characters_vroid/anim/ 에 쌓인다(마찬가지로 로컬
## 전용 — 리타겟해도 모션 자체는 Mixamo 것이라 재배포 금지 그대로 적용).
##
## 사용법: Godot_..._console.exe --headless --path <프로젝트> \
##   --script tools/mixamo_retarget.gd -- <타깃 glb res://경로> <출력 파일명 접두어>
## 예:      -- res://assets/characters_vroid/AvatarSample_A.glb AvatarSample_A

const OUT_DIR = "res://assets/characters_vroid/anim"
const SRC_DIR = "res://assets/_mixamo_src"
const FPS = 30.0

## 본체 22본만 — 손가락/헤어/가슴 보조본은 Mixamo 쪽에 대응이 없어 뺀다.
const BONE_MAP = {
	"mixamorig_Hips": "J_Bip_C_Hips",
	"mixamorig_Spine": "J_Bip_C_Spine",
	"mixamorig_Spine1": "J_Bip_C_Chest",
	"mixamorig_Spine2": "J_Bip_C_UpperChest",
	"mixamorig_Neck": "J_Bip_C_Neck",
	"mixamorig_Head": "J_Bip_C_Head",
	"mixamorig_LeftShoulder": "J_Bip_L_Shoulder",
	"mixamorig_LeftArm": "J_Bip_L_UpperArm",
	"mixamorig_LeftForeArm": "J_Bip_L_LowerArm",
	"mixamorig_LeftHand": "J_Bip_L_Hand",
	"mixamorig_RightShoulder": "J_Bip_R_Shoulder",
	"mixamorig_RightArm": "J_Bip_R_UpperArm",
	"mixamorig_RightForeArm": "J_Bip_R_LowerArm",
	"mixamorig_RightHand": "J_Bip_R_Hand",
	"mixamorig_LeftUpLeg": "J_Bip_L_UpperLeg",
	"mixamorig_LeftLeg": "J_Bip_L_LowerLeg",
	"mixamorig_LeftFoot": "J_Bip_L_Foot",
	"mixamorig_LeftToeBase": "J_Bip_L_ToeBase",
	"mixamorig_RightUpLeg": "J_Bip_R_UpperLeg",
	"mixamorig_RightLeg": "J_Bip_R_LowerLeg",
	"mixamorig_RightFoot": "J_Bip_R_Foot",
	"mixamorig_RightToeBase": "J_Bip_R_ToeBase",
}

## 본마다 "스윙 방향"을 잴 기준 자식 하나. 대부분은 체인에 자식이 하나뿐이라
## 자명하지만 Hips(자식 Spine·LeftUpLeg·RightUpLeg)·Spine2(자식 Neck·양 Shoulder)만
## 여럿이라 몸통을 잇는 쪽(Spine·Neck)을 명시로 고른다 — 다리·어깨는 각자
## 자기 부모의 스윙을 물려받은 뒤 자기 체인 안에서 또 스윙을 구하므로 문제없다.
## 자식이 없는 말단(Head·양 Hand·양 ToeBase)은 이 표에 없고, rest 로컬 회전을
## 그대로 둔 채 부모 스윙만 물려받는다(손목 비틀림 등은 다음 과제).
const REF_CHILD = {
	"mixamorig_Hips": "mixamorig_Spine",
	"mixamorig_Spine": "mixamorig_Spine1",
	"mixamorig_Spine1": "mixamorig_Spine2",
	"mixamorig_Spine2": "mixamorig_Neck",
	"mixamorig_LeftShoulder": "mixamorig_LeftArm",
	"mixamorig_LeftArm": "mixamorig_LeftForeArm",
	"mixamorig_LeftForeArm": "mixamorig_LeftHand",
	"mixamorig_RightShoulder": "mixamorig_RightArm",
	"mixamorig_RightArm": "mixamorig_RightForeArm",
	"mixamorig_RightForeArm": "mixamorig_RightHand",
	"mixamorig_LeftUpLeg": "mixamorig_LeftLeg",
	"mixamorig_LeftLeg": "mixamorig_LeftFoot",
	"mixamorig_LeftFoot": "mixamorig_LeftToeBase",
	"mixamorig_RightUpLeg": "mixamorig_RightLeg",
	"mixamorig_RightLeg": "mixamorig_RightFoot",
	"mixamorig_RightFoot": "mixamorig_RightToeBase",
}

const CLIPS = ["idle", "walk", "run", "attack", "hit", "dodge", "death", "pickup"]
## idle/walk/run 은 이동 루프라 계속 돌아야 한다 — 나머지(공격·피격·구르기·
## 죽음·줍기)는 한 번만 재생하고 마지막 프레임에 멈춰야 하는 동작이라 LOOP_NONE
## 그대로 둔다. 2026-09-19 실기 스크린샷에서 idle이 첫 재생 뒤 그대로 얼어붙는
## 걸 보고 뒤늦게 발견 — 처음엔 LOOP_NONE 하나로 전부 저장했었다.
const LOOP_CLIPS = ["idle", "walk", "run"]

var src_parent := {}
var src_rest := {}
var tgt_parent := {}
var tgt_rest := {}


func _init():
	var args = OS.get_cmdline_user_args()
	if args.size() < 2:
		push_error("사용법: -- <타깃 glb res://경로> <출력 파일명 접두어>")
		quit(1)
		return
	var target_glb = args[0]
	var out_prefix = args[1]

	_load_skeleton_info(target_glb, tgt_parent, tgt_rest)
	_load_skeleton_info(SRC_DIR + "/idle.fbx", src_parent, src_rest)

	var chain_order = BONE_MAP.keys()
	chain_order.sort_custom(func(a, b): return _depth(a, src_parent) < _depth(b, src_parent))

	# 본마다 rest 글로벌 회전(스윙의 기준점) + 스윙 잴 기준 자식 방향(소스 로컬, 정규화).
	var src_g_rest := {}
	var tgt_g_rest := {}
	var dir_local_src := {}
	for src_name in chain_order:
		var tgt_name = BONE_MAP[src_name]
		src_g_rest[src_name] = _global_rest_rot(src_name, src_parent, src_rest)
		tgt_g_rest[tgt_name] = _global_rest_rot(tgt_name, tgt_parent, tgt_rest)
		if REF_CHILD.has(src_name):
			dir_local_src[src_name] = src_rest[REF_CHILD[src_name]].origin.normalized()

	var hips_src_name = "mixamorig_Hips"
	var hips_rest_local_pos = src_rest[hips_src_name].origin
	var tgt_hips_rest_pos = tgt_rest[BONE_MAP[hips_src_name]].origin
	var src_hip_h = _global_rest_transform(hips_src_name, src_parent, src_rest).origin.y
	var tgt_hip_h = _global_rest_transform(BONE_MAP[hips_src_name], tgt_parent, tgt_rest).origin.y
	var pos_scale = (tgt_hip_h / src_hip_h) if src_hip_h > 0.001 else 1.0
	print("hip height src=%s tgt=%s scale=%s" % [src_hip_h, tgt_hip_h, pos_scale])

	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(OUT_DIR))

	for clip in CLIPS:
		var src_path = "%s/%s.fbx" % [SRC_DIR, clip]
		if not ResourceLoader.exists(src_path):
			print("건너뜀(없음): ", src_path)
			continue
		var out_path = "%s/%s_%s.res" % [OUT_DIR, out_prefix, clip]
		_retarget_one(src_path, src_g_rest, tgt_g_rest, dir_local_src,
			chain_order, hips_src_name,
			hips_rest_local_pos, tgt_hips_rest_pos, pos_scale, out_path,
			LOOP_CLIPS.has(clip), LOOP_CLIPS.has(clip))

	_build_library(out_prefix)
	print("DONE")
	quit()


## AnimationLibrary 를 .tscn 안에 sub_resource(_data 딕셔너리)로 직접 써넣으면
## SubResource() 참조가 파싱 단계에서 깨진다(2026-09-19 확인, "int_resources.has(id)"
## 에러) — 그래서 리소스 파일로 따로 구워 .tscn 에선 ExtResource 로만 참조한다.
## 게임 코드가 기대하는 이름(player.gd 등: idle/walk/sprint)으로 여기서 맞춘다.
func _build_library(prefix):
	var lib = AnimationLibrary.new()
	var key_map = {
		"idle": "idle", "walk": "walk", "run": "sprint",
		"attack": "attack", "hit": "hit", "dodge": "dodge",
		"death": "death", "pickup": "pickup",
	}
	for clip in key_map.keys():
		var p = "%s/%s_%s.res" % [OUT_DIR, prefix, clip]
		if ResourceLoader.exists(p):
			lib.add_animation(key_map[clip], load(p))
	var out_path = "%s/%s_lib.res" % [OUT_DIR, prefix]
	var err = ResourceSaver.save(lib, out_path)
	print(out_path, " save_err=", err)


func _load_skeleton_info(scene_path, parent_out, rest_out):
	var packed = load(scene_path)
	var inst = packed.instantiate()
	var skel = _find_skeleton(inst)
	for i in range(skel.get_bone_count()):
		var name = skel.get_bone_name(i)
		var pidx = skel.get_bone_parent(i)
		var pname = "" if pidx < 0 else skel.get_bone_name(pidx)
		parent_out[name] = pname
		rest_out[name] = skel.get_bone_rest(i)
	inst.free()


func _find_skeleton(node):
	if node is Skeleton3D:
		return node
	for c in node.get_children():
		var r = _find_skeleton(c)
		if r:
			return r
	return null


func _find_anim_player(node):
	if node is AnimationPlayer:
		return node
	for c in node.get_children():
		var r = _find_anim_player(c)
		if r:
			return r
	return null


func _global_rest_rot(name, parent_map, rest_map):
	var q = rest_map[name].basis.get_rotation_quaternion()
	var p = parent_map[name]
	if p == "":
		return q
	return _global_rest_rot(p, parent_map, rest_map) * q


func _global_rest_transform(name, parent_map, rest_map):
	var local = rest_map[name]
	var p = parent_map[name]
	if p == "":
		return local
	return _global_rest_transform(p, parent_map, rest_map) * local


func _depth(name, parent_map):
	var d = 0
	var cur = name
	while parent_map.has(cur) and parent_map[cur] != "" and BONE_MAP.has(parent_map[cur]):
		cur = parent_map[cur]
		d += 1
	return d


func _retarget_one(src_path, src_g_rest, tgt_g_rest, dir_local_src,
		chain_order, hips_src_name,
		hips_rest_local_pos, tgt_hips_rest_pos, pos_scale, out_path,
		should_loop := false, strip_horizontal := false):
	var packed = load(src_path)
	var inst = packed.instantiate()
	var skel = _find_skeleton(inst)
	var ap = _find_anim_player(inst)
	var lib = ap.get_animation_library("")
	var anim_name = lib.get_animation_list()[0]
	var src_anim = lib.get_animation(anim_name)
	var length = src_anim.length

	var out_anim = Animation.new()
	out_anim.length = length
	out_anim.loop_mode = Animation.LOOP_LINEAR if should_loop else Animation.LOOP_NONE

	var rot_track := {}
	for src_name in chain_order:
		var tgt_name = BONE_MAP[src_name]
		var idx = out_anim.add_track(Animation.TYPE_ROTATION_3D)
		out_anim.track_set_path(idx, NodePath("Skeleton3D:%s" % tgt_name))
		out_anim.track_set_interpolation_type(idx, Animation.INTERPOLATION_LINEAR)
		rot_track[src_name] = idx

	var pos_track_idx = out_anim.add_track(Animation.TYPE_POSITION_3D)
	out_anim.track_set_path(pos_track_idx, NodePath("Skeleton3D:%s" % BONE_MAP[hips_src_name]))
	out_anim.track_set_interpolation_type(pos_track_idx, Animation.INTERPOLATION_LINEAR)

	ap.play(anim_name)

	var frame_count = int(ceil(length * FPS)) + 1
	var bone_idx_cache := {}
	for src_name in chain_order:
		bone_idx_cache[src_name] = skel.find_bone(src_name)

	for f in range(frame_count):
		var t = min(f / FPS, length)
		ap.seek(t, true)

		var src_global := {}
		var tgt_global := {}
		var swings := {}
		for src_name in chain_order:
			var bidx = bone_idx_cache[src_name]
			var local_q = skel.get_bone_pose_rotation(bidx)
			var p = src_parent[src_name]
			if p == "" or not src_global.has(p):
				src_global[src_name] = local_q
			else:
				src_global[src_name] = src_global[p] * local_q

			var tgt_name = BONE_MAP[src_name]
			var tgt_g
			if REF_CHILD.has(src_name):
				## 스윙 = "rest 때 자식 쪽을 향하던 방향"이 지금 어디로 돌았는지의
				## 최단 회전. 트위스트(자기 축 비틀림)는 안 건드린다.
				var src_dir_rest_world = src_g_rest[src_name] * dir_local_src[src_name]
				var src_dir_t_world = src_global[src_name] * dir_local_src[src_name]
				var swing = Quaternion(src_dir_rest_world, src_dir_t_world)
				swings[src_name] = swing
				tgt_g = swing * tgt_g_rest[tgt_name]
			else:
				## 말단(자식 없음): 부모 스윙만 물려받고 자기 로컬은 rest 그대로.
				var parent_tgt_g = tgt_global[p] if (p != "" and tgt_global.has(p)) else Quaternion.IDENTITY
				tgt_g = parent_tgt_g * tgt_rest[tgt_name].basis.get_rotation_quaternion()
			tgt_global[src_name] = tgt_g

			var tgt_local
			if p == "" or not tgt_global.has(p):
				tgt_local = tgt_g
			else:
				tgt_local = tgt_global[p].inverse() * tgt_g
			out_anim.rotation_track_insert_key(rot_track[src_name], t, tgt_local)

		var hips_bidx = bone_idx_cache[hips_src_name]
		var src_hips_pos = skel.get_bone_pose_position(hips_bidx)
		var delta = (src_hips_pos - hips_rest_local_pos) * pos_scale
		var corrected_delta = swings[hips_src_name] * delta
		if strip_horizontal:
			## Mixamo 소스가 "In Place" 없이 내려와 walk/run 은 1초에 1.5m씩
			## Hips 가 실제로 전진한다 — 게임 이동은 코드(속도)가 맡으므로
			## 수평(X·Z) 이동은 버리고 세로(Y) 들썩임만 남겨 제자리 루프로 만든다.
			corrected_delta.x = 0.0
			corrected_delta.z = 0.0
		out_anim.position_track_insert_key(pos_track_idx, t, tgt_hips_rest_pos + corrected_delta)

	var err = ResourceSaver.save(out_anim, out_path)
	print(out_path, " save_err=", err, " frames=", frame_count, " length=", length)
	inst.free()
