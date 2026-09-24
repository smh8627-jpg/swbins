extends RefCounted

## PLAN 106장 ④ — 역사 인물·주민·도적을 캡슐/Kenney 블록에서 VRoid 몸으로.
## 이 저장소에 있는 VRoid 셋(플레이어 몫 AvatarSample_A 는 빼고 둘)을 쓰고,
## 인물마다 머리·옷 색을 id 해시로 바꿔(셀 셰이더 albedo_tint) 같은 몸이라도
## 구별되게 한다. ★5 는 가장자리 빛(rim)을 금색으로 — 원신의 "전설 등급" 신호.
## 얼굴·피부는 건드리지 않는다. 주역 전용 조형은 사람 몫(VRoid Studio)이다.

const CelShaderApply := preload("res://saga_core/shaders/cel_shader_apply.gd")

const BODIES := [
	{"glb": "res://assets/characters_vroid/dungeon_hero_01.glb", "scale": 0.933514,
		"lib": "res://assets/characters_vroid/anim_cc0/dungeon_hero_01_lib.res"},
	{"glb": "res://assets/characters_vroid/saga_forest_avatar_01.glb", "scale": 1.0344,
		"lib": "res://assets/characters_vroid/anim_cc0/saga_forest_avatar_01_lib.res"},
]

const HAIR_TINTS := [
	Color(1, 1, 1), Color(0.55, 0.45, 0.4), Color(0.4, 0.42, 0.55), Color(1.0, 0.85, 0.7),
	Color(0.75, 0.55, 0.5), Color(0.6, 0.7, 0.85), Color(0.35, 0.33, 0.35), Color(0.9, 0.75, 0.95),
]
const CLOTH_TINTS := [
	Color(1, 1, 1), Color(0.85, 0.45, 0.4), Color(0.45, 0.6, 0.9), Color(0.5, 0.8, 0.55),
	Color(0.9, 0.8, 0.45), Color(0.65, 0.5, 0.85), Color(0.55, 0.55, 0.6), Color(0.95, 0.65, 0.4),
]
const GOLD_RIM := Color(1.0, 0.82, 0.35)

## 같은 id 는 늘 같은 몸·색. rarity 5 면 금 테두리. cloth_override 가 있으면 옷색을 그걸로
## (도적 = 검붉은 옷처럼 무리 전체를 한 색으로 묶을 때).
static func build(id: String, rarity: int = 3, cloth_override: Variant = null) -> Node3D:
	var h := _hash(id)
	var body: Dictionary = BODIES[h % BODIES.size()]
	var v := (load(body.glb) as PackedScene).instantiate() as Node3D
	v.scale = Vector3.ONE * float(body.scale)
	## 2026-09-24 — saga_forest_avatar_01 은 뼈대 공간 앞이 -Z(VRM 1.0 식)라, 부르는 쪽이 모두 "앞 = +Z"로
	## 돌리던(atan2(x, z)) 인물·도적이 등을 보이며 걸었다. 안쪽 자식을 Y축 180° 돌려 돌려주는 몸은 늘 +Z 를 보게 한다
	## (애니 트랙은 "Skeleton3D:뼈" 경로라 안 바뀐다. 뼈대 공간 자체는 그대로 -Z 라 뼈에 뭘 붙일 땐 front_sign 을 본다).
	var skels := v.find_children("*", "Skeleton3D", true, false)
	if not skels.is_empty() and front_sign(skels[0]) < 0.0:
		for c in v.get_children():
			if c is Node3D:
				(c as Node3D).transform = Transform3D(Basis(Vector3.UP, PI), Vector3.ZERO) * (c as Node3D).transform
	CelShaderApply.apply_to(v)
	## 부르는 쪽이 또 apply_to 하면 얼굴 베이크가 두 번 덮여 단색이 된다(재질 감사 flat-tint).
	v.set_meta("cel_applied", true)
	var hair: Color = HAIR_TINTS[(h >> 3) % HAIR_TINTS.size()]
	var cloth: Color = cloth_override if cloth_override != null else CLOTH_TINTS[(h >> 7) % CLOTH_TINTS.size()]
	_tint(v, hair, cloth, rarity >= 5)
	var ap := AnimationPlayer.new()
	ap.name = "AnimationPlayer"
	v.add_child(ap)
	ap.add_animation_library("", load(body.lib))
	if ap.has_animation("idle"):
		ap.play("idle")
		## 무리가 박자 맞춰 숨쉬지 않게 시작점을 어긋낸다.
		ap.seek(float(h % 100) / 100.0 * ap.current_animation_length, true)
	return v

## 뼈대 공간에서 몸 앞이 +Z 면 1, -Z 면 -1 — 오른발목 → 발끝 쉬는 자세 방향(뼈가 없으면 1).
static func front_sign(skel: Skeleton3D) -> float:
	var foot := skel.find_bone("J_Bip_R_Foot")
	var toe := skel.find_bone("J_Bip_R_ToeBase")
	if foot < 0 or toe < 0:
		return 1.0
	return -1.0 if skel.get_bone_global_rest(toe).origin.z < skel.get_bone_global_rest(foot).origin.z else 1.0

static func _tint(root: Node, hair: Color, cloth: Color, gold: bool) -> void:
	for mi in root.find_children("*", "MeshInstance3D", true, false):
		var m := (mi as MeshInstance3D).mesh
		if m == null:
			continue
		for i in m.get_surface_count():
			var src := m.surface_get_material(i)
			var over := (mi as MeshInstance3D).get_surface_override_material(i) as ShaderMaterial
			if src == null or over == null:
				continue
			var n := src.resource_name
			var base: Color = over.get_shader_parameter("albedo_tint")
			if n.contains("HAIR"):
				over.set_shader_parameter("albedo_tint", base * hair)
			elif n.contains("CLOTH"):
				over.set_shader_parameter("albedo_tint", base * cloth)
			if gold:
				over.set_shader_parameter("rim_color", GOLD_RIM)
				over.set_shader_parameter("rim_strength", 0.55)

static func _hash(id: String) -> int:
	var h := 7
	for i in id.length():
		h = (h * 131 + id.unicode_at(i)) & 0x7fffffff
	return h
