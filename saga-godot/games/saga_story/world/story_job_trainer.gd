extends Node3D

## VERTICAL_SLICE_STORY.md 4절 "제외" 목록 "전직 트리"의 첫 걸음.
##
## **재해석** — 원작은 전직에 딱히 정해진 위치가 없다(`js/ui.js`의 상시
## 열리는 "무예" 탭에서 고른다). 이 포트는 아직 탭 UI가 없어(가방·상점과
## 같은 이유, story_merchant.gd 참고) **허도(마을)에 자리 하나를 새로
## 두는 것**으로 좁혔다 — data-side.js heodo.npcs에 있는 기존 NPC(장로·
## 문지기·행상 등)를 흉내 내지 않고, "전직"이라는 새 기능 전용 자리임을
## 그대로 드러낸다.
##
## **선택 방식** — data-job.js JOBS tier:1 네 갈래(무사·궁수·협객·방사)
## 중 하나를 **직접 고른다**(상점의 "가장 싼 것 자동" 방식과 다르다 —
## 전직은 원작도 "되돌릴 수 없다"고 못박은 영구적 결정이라, 자동으로
## 대신 골라 주면 그 의미가 사라진다). 새 입력 액션 넷(`story_job_1~4`,
## 숫자 1~4 — potion_1~4와 물리 키는 같지만 다른 액션 이름이라 겹치지
## 않는다)을 K 범위 안에서만 받는다.
##
## **grow(hp/atk/mp)만 옮긴다** — 1차 전직에서 새로 열리는 무예 넷씩
## (총 16개, `data-job.js` SKILLS job:'warrior' 등)은 범위 밖(다음 걸음).
## 지금은 "직업을 고르면 스탯이 달라진다"까지만 검증한다.

const Toast := preload("res://saga_core/ui/toast.gd")
const StoryCombat := preload("res://games/saga_story/data/story_combat.gd")

const BODY_COLOR := Color(0.25, 0.35, 0.72)  # 상인(붉은 톤)과 구분되는 파란 톤
const RANGE_RADIUS := 1.8

## data-job.js JOBS tier:1의 등장 순서 그대로 — story_job_1~4가 이 순서에 대응.
const JOB_ORDER := ["warrior", "archer", "rogue", "mage"]

var _player_in_range := false


func _ready() -> void:
	_spawn_visual()
	_spawn_area()


func _spawn_visual() -> void:
	var mi := MeshInstance3D.new()
	var mesh := CapsuleMesh.new()
	mesh.radius = 0.5
	mesh.height = 1.7
	mi.mesh = mesh
	mi.position = Vector3(0, 0.85, 0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = BODY_COLOR
	mi.material_override = mat
	add_child(mi)


func _spawn_area() -> void:
	var area := Area3D.new()
	area.name = "TrainerRange"
	var cs := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = RANGE_RADIUS
	cs.shape = shape
	area.add_child(cs)
	area.position = Vector3(0, 0.85, 0)
	area.body_entered.connect(_on_range_entered)
	area.body_exited.connect(_on_range_exited)
	add_child(area)


func _on_range_entered(body: Node3D) -> void:
	if not body.is_in_group("player"):
		return
	_player_in_range = true
	Toast.show(self, _status_text(), 2.5)


func _on_range_exited(body: Node3D) -> void:
	if not body.is_in_group("player"):
		return
	_player_in_range = false


func _status_text() -> String:
	if StorySaveState.job != "none":
		var name_: String = String(StoryCombat.JOBS_TIER1.get(StorySaveState.job, {}).get("name", StorySaveState.job))
		return "🎖️ 이미 전직했다 — %s" % name_
	if StorySaveState.level < StoryCombat.JOB_CHANGE_LEVEL:
		return "🎖️ 전직은 Lv.%d부터(현재 Lv.%d) — 1:무사 2:궁수 3:협객 4:방사" % [StoryCombat.JOB_CHANGE_LEVEL, StorySaveState.level]
	return "🎖️ 전직할 수 있다 — 1:무사 2:궁수 3:협객 4:방사"


## story_merchant.gd·story_portal.gd와 같은 폴링 방식.
func _process(_delta: float) -> void:
	if not _player_in_range:
		return
	if Input.is_action_just_pressed("story_interact"):
		Toast.show(self, _status_text(), 2.5)
		return
	for i in JOB_ORDER.size():
		if Input.is_action_just_pressed("story_job_%d" % (i + 1)):
			_choose(JOB_ORDER[i])
			return


func _choose(key: String) -> void:
	if not StorySaveState.choose_job(key):
		Toast.show(self, _status_text(), 2.5)
		return
	var it: Dictionary = StoryCombat.JOBS_TIER1[key]
	Toast.show(self, "🎖️ %s로 전직! 체력+%d 공격+%d%s" % [
		String(it.name), int(it.hp), int(it.atk),
		(" 기력+%d" % int(it.mp)) if float(it.mp) > 0.0 else "",
	], 3.0)
