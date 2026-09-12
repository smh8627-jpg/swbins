extends Node3D

## VERTICAL_SLICE_FOREST.md 4절 "제외" 목록 6번(옷) 중 화면에 보이는
## 절반 — forest_wear.gd 상단 주석 참고: 옷 빛(dye)은 GLB 텍스처에
## StandardMaterial3D.albedo_color를 곱색으로 얹고(games/saga_go/world/
## bandit_encounter.gd의 강타 예고 물들이기와 같은 GLBUtils.
## find_all_mesh_instances 활용 — 다만 여기는 되돌리지 않고 계속
## 남긴다), 덧옷(cape)은 등에 붙는 얇은 판 하나를 켜고 끈다. 겉옷·머리는
## 그림 자산이 없어 이 스크립트가 아예 안 본다(폴링할 이유가 없다).
##
## GO/DUNGEON의 Player.tscn·player.gd는 건드리지 않는다 — 이 스크립트가
## TestVillageForest.tscn에만 붙어 FOREST 안에서만 플레이어를 찾아
## 건드린다(player.gd 자체는 GO/FOREST가 공유하는 범용 컴포넌트라
## FOREST 전용 로직을 거기 넣지 않는다).

const GLBUtils := preload("res://games/saga_go/world/glb_utils.gd")
const PLAYER_TEXTURE := "res://assets/characters/Textures/texture-a.png"

var _player: Node3D = null
var _cape: MeshInstance3D = null
var _last_dye := ""
var _last_cape := ""


func _process(_delta: float) -> void:
	if _player == null or not is_instance_valid(_player):
		_player = get_tree().get_first_node_in_group("player")
		if _player == null:
			return
		_cape = _build_cape(_player)
		_last_dye = ""  # 처음 찾았을 때 강제로 한 번 다시 칠한다
		_last_cape = ""

	var dye: String = ForestSaveState.wearing("dye")
	if dye != _last_dye:
		_last_dye = dye
		_apply_dye(dye)

	var cape: String = ForestSaveState.wearing("cape")
	if cape != _last_cape:
		_last_cape = cape
		_cape.visible = cape == "on"


func _apply_dye(dye: String) -> void:
	var it := ForestWear.item("dye", dye)
	var tint := Color(1, 1, 1)
	if String(it.get("c", "")) != "":
		tint = Color(String(it.c))
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = load(PLAYER_TEXTURE)
	mat.albedo_color = tint
	for mi: MeshInstance3D in GLBUtils.find_all_mesh_instances(_player):
		mi.material_override = mat


func _build_cape(player: Node3D) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = "WearCape"
	var box := BoxMesh.new()
	box.size = Vector3(0.9, 1.3, 0.08)
	mi.mesh = box
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.35, 0.28, 0.5)
	mi.material_override = mat
	## 등 쪽 — 정확한 앞/뒤 미세조정은 실기 확인 때 눈으로 본다(프로토타입
	## 수준, 루트 CLAUDE.md "실기 확인은 몰아서" 방침 그대로).
	mi.position = Vector3(0, 1.5, 0.4)
	mi.visible = false
	player.add_child(mi)
	return mi
