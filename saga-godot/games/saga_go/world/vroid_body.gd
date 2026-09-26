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

## 가면 — 머리 뼈에 붙인다(뼈를 못 찾으면 몸 앞 얼굴 높이). 눈구멍 둘·줄 하나. 이야기 나그네(흰 가면·붉은 줄, world/story_quest.gd)·
## 검은 가면(field_enemy black_mask, 검은 가면·보랏빛 줄)이 쓴다.
## crack — 왼쪽 눈가에 흰 금(106장 ㉞ 7장 "금 간 검은 가면").
static func add_mask(body: Node3D, stripe: Color = Color(0.72, 0.12, 0.12), face_col: Color = Color(0.94, 0.92, 0.86), crack := false) -> void:
	var mask := Node3D.new()
	mask.name = "Mask"
	var skel := body.find_children("*", "Skeleton3D", true, false)
	var head := -1
	if not skel.is_empty():
		head = (skel[0] as Skeleton3D).find_bone("J_Bip_C_Head")
	if head >= 0:
		var att := BoneAttachment3D.new()
		att.bone_idx = head
		skel[0].add_child(att)
		att.add_child(mask)
		## 뼈대 공간 앞이 -Z 인 몸(saga_forest_avatar_01)이면 가면도 뒤집어 얼굴 쪽에.
		var front := front_sign(skel[0])
		mask.position = Vector3(0.0, 0.07, 0.085 * front)
		mask.rotation.y = 0.0 if front > 0.0 else PI
	else:
		body.add_child(mask)
		mask.position = Vector3(0.0, 1.52, 0.1)
	var face := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.1
	sm.height = 0.24
	face.mesh = sm
	face.scale = Vector3(1.0, 1.0, 0.35)
	var white := StandardMaterial3D.new()
	white.albedo_color = face_col
	white.roughness = 0.6
	face.material_override = white
	mask.add_child(face)
	var dark := StandardMaterial3D.new()
	dark.albedo_color = Color(0.06, 0.05, 0.06)
	var red := StandardMaterial3D.new()
	red.albedo_color = stripe
	for i in 3:
		var dot := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(0.035, 0.014, 0.01) if i < 2 else Vector3(0.012, 0.12, 0.01)
		dot.mesh = bm
		dot.material_override = dark if i < 2 else red
		dot.position = Vector3(-0.04 + 0.08 * i, 0.03, 0.036) if i < 2 else Vector3(0.0, -0.01, 0.037)
		mask.add_child(dot)
	if crack:
		var pale := StandardMaterial3D.new()
		pale.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		pale.albedo_color = Color(0.88, 0.84, 0.96)
		for k in 2:
			var cr := MeshInstance3D.new()
			var cm := BoxMesh.new()
			cm.size = Vector3(0.008, 0.075, 0.01)
			cr.mesh = cm
			cr.material_override = pale
			cr.name = "Crack%d" % k
			cr.position = Vector3(-0.055, 0.035, 0.037) if k == 0 else Vector3(-0.042, -0.035, 0.036)
			cr.rotation.z = 0.5 if k == 0 else -0.45
			mask.add_child(cr)

## 106장 ㊳ 왕관 — 머리 뼈 위(먹구름 임금). 금빛 테 하나 + 뿔 다섯. 뼈를 못 찾으면 몸 위 머리 높이.
static func add_crown(body: Node3D, gold: Color = Color(0.9, 0.74, 0.3)) -> void:
	var crown := Node3D.new()
	crown.name = "Crown"
	var skel := body.find_children("*", "Skeleton3D", true, false)
	var head := -1
	if not skel.is_empty():
		head = (skel[0] as Skeleton3D).find_bone("J_Bip_C_Head")
	if head >= 0:
		var att := BoneAttachment3D.new()
		att.bone_idx = head
		skel[0].add_child(att)
		att.add_child(crown)
		crown.position = Vector3(0.0, 0.17, 0.0)
	else:
		body.add_child(crown)
		crown.position = Vector3(0.0, 1.72, 0.0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = gold
	mat.metallic = 0.7
	mat.roughness = 0.35
	var band := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.085
	tm.outer_radius = 0.11
	band.mesh = tm
	band.material_override = mat
	crown.add_child(band)
	for i in 5:
		var a := TAU * i / 5.0
		var sp := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 0.0
		cm.bottom_radius = 0.022
		cm.height = 0.09
		cm.radial_segments = 6
		sp.mesh = cm
		sp.material_override = mat
		sp.position = Vector3(cos(a) * 0.098, 0.05, sin(a) * 0.098)
		crown.add_child(sp)

## 106장 ㊺-3 옛 장수 투구 — 머리 뼈 위(산성지기 바우, 과거). 쇠 사발 + 챙 + 꼭대기 붉은 술. 뼈를 못 찾으면 몸 위 머리 높이.
static func add_helmet(body: Node3D, iron: Color = Color(0.36, 0.35, 0.36), tassel: Color = Color(0.72, 0.16, 0.14)) -> void:
	var helm := Node3D.new()
	helm.name = "Helmet"
	var skel := body.find_children("*", "Skeleton3D", true, false)
	var head := -1
	if not skel.is_empty():
		head = (skel[0] as Skeleton3D).find_bone("J_Bip_C_Head")
	if head >= 0:
		var att := BoneAttachment3D.new()
		att.bone_idx = head
		skel[0].add_child(att)
		att.add_child(helm)
		helm.position = Vector3(0.0, 0.1, 0.0)
	else:
		body.add_child(helm)
		helm.position = Vector3(0.0, 1.66, 0.0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = iron
	mat.metallic = 0.6
	mat.roughness = 0.45
	var bowl := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.14
	sm.height = 0.16
	sm.is_hemisphere = true
	bowl.mesh = sm
	bowl.material_override = mat
	helm.add_child(bowl)
	var brim := MeshInstance3D.new()
	var bm := CylinderMesh.new()
	bm.top_radius = 0.16
	bm.bottom_radius = 0.17
	bm.height = 0.018
	brim.mesh = bm
	brim.material_override = mat
	helm.add_child(brim)
	var spike := MeshInstance3D.new()
	var km := CylinderMesh.new()
	km.top_radius = 0.0
	km.bottom_radius = 0.018
	km.height = 0.08
	km.radial_segments = 6
	spike.mesh = km
	spike.material_override = mat
	spike.position = Vector3(0.0, 0.2, 0.0)
	helm.add_child(spike)
	var red := StandardMaterial3D.new()
	red.albedo_color = tassel
	var tuft := MeshInstance3D.new()
	var tm := SphereMesh.new()
	tm.radius = 0.04
	tm.height = 0.11
	tuft.mesh = tm
	tuft.material_override = red
	tuft.position = Vector3(0.0, 0.25, 0.0)
	helm.add_child(tuft)

## 106장 ㊼-2 앞 시대 관측 바이저 — 머리 뼈 위(시간 틈 관측사 가온, 미래). 은빛 머리띠 + 눈앞 청록 빛 띠 + 한쪽 귀 안테나.
## 뼈대 앞이 -Z 인 몸이면 가면(add_mask)처럼 뒤집는다. 뼈를 못 찾으면 몸 위 눈 높이.
static func add_visor(body: Node3D, metal: Color = Color(0.78, 0.8, 0.84), glow: Color = Color(0.35, 0.95, 0.9)) -> void:
	var visor := Node3D.new()
	visor.name = "Visor"
	var skel := body.find_children("*", "Skeleton3D", true, false)
	var head := -1
	if not skel.is_empty():
		head = (skel[0] as Skeleton3D).find_bone("J_Bip_C_Head")
	if head >= 0:
		var att := BoneAttachment3D.new()
		att.bone_idx = head
		skel[0].add_child(att)
		att.add_child(visor)
		var front := front_sign(skel[0])
		visor.position = Vector3(0.0, 0.07, 0.0)
		visor.rotation.y = 0.0 if front > 0.0 else PI
	else:
		body.add_child(visor)
		visor.position = Vector3(0.0, 1.52, 0.0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = metal
	mat.metallic = 0.8
	mat.roughness = 0.3
	var band := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.1
	tm.outer_radius = 0.118
	band.mesh = tm
	band.material_override = mat
	band.scale = Vector3(1.0, 1.4, 1.1)
	visor.add_child(band)
	var lit := StandardMaterial3D.new()
	lit.albedo_color = glow
	lit.emission_enabled = true
	lit.emission = glow
	lit.emission_energy_multiplier = 1.6
	var shield := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(0.17, 0.035, 0.012)
	shield.mesh = bm
	shield.material_override = lit
	shield.position = Vector3(0.0, 0.0, 0.122)
	visor.add_child(shield)
	var ant := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.004
	cm.bottom_radius = 0.008
	cm.height = 0.12
	cm.radial_segments = 6
	ant.mesh = cm
	ant.material_override = mat
	ant.position = Vector3(0.115, 0.06, 0.0)
	ant.rotation.z = -0.25
	visor.add_child(ant)
	var tip := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.014
	sm.height = 0.028
	tip.mesh = sm
	tip.material_override = lit
	tip.position = Vector3(0.13, 0.12, 0.0)
	visor.add_child(tip)

## 106장 ㊼-3 파발꾼 벙거지 — 머리 뼈 위(파발꾼 달음, 과거). 검은 펠트 둥근 몸 + 넓고 처진 챙 + 붉은 띠 + 뒤로 늘어진 붉은 끈 둘.
## 뼈대 앞이 -Z 인 몸이면 뒤집는다(끈이 등 쪽에 오게). 뼈를 못 찾으면 몸 위 머리 높이.
static func add_hat(body: Node3D, felt: Color = Color(0.12, 0.11, 0.12), band: Color = Color(0.72, 0.14, 0.12)) -> void:
	var hat := Node3D.new()
	hat.name = "Hat"
	var skel := body.find_children("*", "Skeleton3D", true, false)
	var head := -1
	if not skel.is_empty():
		head = (skel[0] as Skeleton3D).find_bone("J_Bip_C_Head")
	if head >= 0:
		var att := BoneAttachment3D.new()
		att.bone_idx = head
		skel[0].add_child(att)
		att.add_child(hat)
		var front := front_sign(skel[0])
		hat.position = Vector3(0.0, 0.13, 0.0)
		hat.rotation.y = 0.0 if front > 0.0 else PI
	else:
		body.add_child(hat)
		hat.position = Vector3(0.0, 1.69, 0.0)
	var fm := StandardMaterial3D.new()
	fm.albedo_color = felt
	fm.roughness = 0.9
	var dome := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.12
	sm.height = 0.14
	sm.is_hemisphere = true
	dome.mesh = sm
	dome.material_override = fm
	hat.add_child(dome)
	var brim := MeshInstance3D.new()
	var bm := CylinderMesh.new()
	bm.top_radius = 0.2
	bm.bottom_radius = 0.26
	bm.height = 0.03
	brim.mesh = bm
	brim.material_override = fm
	brim.position = Vector3(0.0, -0.01, 0.0)
	hat.add_child(brim)
	var red := StandardMaterial3D.new()
	red.albedo_color = band
	var ring := MeshInstance3D.new()
	var rm := CylinderMesh.new()
	rm.top_radius = 0.123
	rm.bottom_radius = 0.123
	rm.height = 0.025
	ring.mesh = rm
	ring.material_override = red
	ring.position = Vector3(0.0, 0.02, 0.0)
	hat.add_child(ring)
	for k in [-1.0, 1.0]:
		var tail := MeshInstance3D.new()
		var tm := BoxMesh.new()
		tm.size = Vector3(0.025, 0.2, 0.006)
		tail.mesh = tm
		tail.material_override = red
		tail.position = Vector3(k * 0.035, -0.08, -0.2)
		tail.rotation = Vector3(-0.35, 0.0, k * 0.12)
		hat.add_child(tail)

## 106장 ㊽-2 머리 위 빛 고리 — 머리 뼈 위(나루지기 아라, 미래). 머리 위 떠 있는 청백 빛 고리 + 양쪽 귀 옆 작은 빛 조각 둘.
## 뼈를 못 찾으면 몸 위 머리 높이. 고리는 몸 앞뒤와 무관(둥글다)이라 뒤집지 않는다.
static func add_halo(body: Node3D, glow: Color = Color(0.6, 0.85, 1.0)) -> void:
	var halo := Node3D.new()
	halo.name = "Halo"
	var skel := body.find_children("*", "Skeleton3D", true, false)
	var head := -1
	if not skel.is_empty():
		head = (skel[0] as Skeleton3D).find_bone("J_Bip_C_Head")
	if head >= 0:
		var att := BoneAttachment3D.new()
		att.bone_idx = head
		skel[0].add_child(att)
		att.add_child(halo)
		halo.position = Vector3(0.0, 0.0, 0.0)
	else:
		body.add_child(halo)
		halo.position = Vector3(0.0, 1.5, 0.0)
	var lit := StandardMaterial3D.new()
	lit.albedo_color = glow
	lit.emission_enabled = true
	lit.emission = glow
	lit.emission_energy_multiplier = 1.8
	var ring := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.11
	tm.outer_radius = 0.13
	ring.mesh = tm
	ring.material_override = lit
	ring.position = Vector3(0.0, 0.28, 0.0)
	halo.add_child(ring)
	for k in [-1.0, 1.0]:
		var bit := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(0.012, 0.05, 0.03)
		bit.mesh = bm
		bit.material_override = lit
		bit.position = Vector3(k * 0.1, 0.05, 0.0)
		halo.add_child(bit)
