extends SceneTree
## Mixamo(assets/_mixamo_src/*.fbx, 로컬 전용 — .gitignore)에서 받은 모션을
## VRM Humanoid(J_Bip_*) 스켈레톤에 리타겟한다. GUI 없이 순수 계산으로:
## 1) 본마다 "레스트 포즈에서 상대측 글로벌 회전과 일치하게 만드는" 상수
##    보정 쿼터니언 C(i) = tgt_rest_global(i) * src_rest_global(i)^-1 를 구하고,
## 2) 매 프레임 소스의 로컬 포즈를 글로벌로 누적한 뒤 C(i) 를 곱해 타깃
##    글로벌로 옮기고, 다시 타깃 로컬로 나눠 새 Animation 트랙에 쓴다.
## 전제(2026-09-19 verify_chain.gd 로 실측 확인됨): 매핑한 22개 본이
## 두 스켈레톤에서 부모-자식 관계가 정확히 1:1로 일치한다(중간에 안 매핑된
## 본이 끼어있지 않음) — 안 그러면 이 "로컬로 나누기"가 틀어진다.
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

const CLIPS = ["idle", "walk", "run", "attack", "hit", "dodge", "death", "pickup"]

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

	var correction := {}
	for src_name in BONE_MAP.keys():
		var tgt_name = BONE_MAP[src_name]
		var src_g = _global_rest_rot(src_name, src_parent, src_rest)
		var tgt_g = _global_rest_rot(tgt_name, tgt_parent, tgt_rest)
		correction[src_name] = tgt_g * src_g.inverse()

	var chain_order = BONE_MAP.keys()
	chain_order.sort_custom(func(a, b): return _depth(a, src_parent) < _depth(b, src_parent))

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
		_retarget_one(src_path, correction, chain_order, hips_src_name,
			hips_rest_local_pos, tgt_hips_rest_pos, pos_scale, out_path)

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


func _retarget_one(src_path, correction, chain_order, hips_src_name,
		hips_rest_local_pos, tgt_hips_rest_pos, pos_scale, out_path):
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
	out_anim.loop_mode = Animation.LOOP_NONE

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
		for src_name in chain_order:
			var bidx = bone_idx_cache[src_name]
			var local_q = skel.get_bone_pose_rotation(bidx)
			var p = src_parent[src_name]
			if p == "" or not src_global.has(p):
				src_global[src_name] = local_q
			else:
				src_global[src_name] = src_global[p] * local_q
			var corrected = correction[src_name] * src_global[src_name]
			tgt_global[src_name] = corrected

			var tgt_local
			if p == "" or not tgt_global.has(p):
				tgt_local = corrected
			else:
				tgt_local = tgt_global[p].inverse() * corrected
			out_anim.rotation_track_insert_key(rot_track[src_name], t, tgt_local)

		var hips_bidx = bone_idx_cache[hips_src_name]
		var src_hips_pos = skel.get_bone_pose_position(hips_bidx)
		var delta = (src_hips_pos - hips_rest_local_pos) * pos_scale
		var corrected_delta = correction[hips_src_name] * delta
		out_anim.position_track_insert_key(pos_track_idx, t, tgt_hips_rest_pos + corrected_delta)

	var err = ResourceSaver.save(out_anim, out_path)
	print(out_path, " save_err=", err, " frames=", frame_count, " length=", length)
	inst.free()
