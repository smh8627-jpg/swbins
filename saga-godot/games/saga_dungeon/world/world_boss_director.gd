extends Node

## PLAN 101-2 DUNGEON ⑥(월드 보스, 2026-09-17) — `DungeonWorldBossState`
## (숫자·판정, 파일 헤더가 설계를 적어 뒀다)의 실제 스폰·전투 타이머·HUD를
## 맡는 director. `horde_arena.gd`와 같은 경계(TestRoom.tscn 형제 노드,
## 상시 대기) — 새 지오메트리 없이 방 0 안 고정 자리에 선다("어디로
## 가나"가 매번 같은 자리라 찾기 쉽다, 웹 5.4 표준 E).

const DungeonEnemy := preload("res://games/saga_dungeon/world/dungeon_enemy.gd")
const Toast := preload("res://saga_core/ui/toast.gd")

## test_room.gd 방 0의 정예 스폰(Vector3(0,0,-1.5)·(1.8,0,-0.6))과 안 겹치는
## 자리 — 직접 정함(방 0 안, 플레이어 시작 자리(0,0.1,4) 근처 반대편 구석).
const SPAWN_POS := Vector3(3.0, 0, 3.0)

var _last_seen_slot: int = -1
var _boss: CharacterBody3D = null
var _fight_left: float = 0.0
var _fight_slot: int = -1

var _hud: CanvasLayer
var _warn_label: Label
var _fight_box: VBoxContainer
var _fight_label: Label
var _hp_bar: ProgressBar


func _ready() -> void:
	## 켜자마자 지금 슬롯을 기준으로 삼는다 — 씬을 새로 열 때마다 "방금
	## 놓친 슬롯"을 소급 스폰하지 않는다(웹 "실시간" 그대로, 지나간 시간표는
	## 되돌리지 않는다).
	_last_seen_slot = DungeonWorldBossState.current_slot()
	_build_hud()


func _process(delta: float) -> void:
	if _boss != null and is_instance_valid(_boss):
		_fight_left -= delta
		_refresh_fight_hud()
		if _fight_left <= 0.0:
			_on_boss_fled()
		return

	var slot := DungeonWorldBossState.current_slot()
	if slot != _last_seen_slot:
		_last_seen_slot = slot
		if not DungeonWorldBossState.slot_already_rewarded(slot):
			_spawn_boss(slot)
	_refresh_warn_hud()


func _spawn_boss(slot: int) -> void:
	var floor_num := DungeonWorldBossState.boss_floor_num()
	_boss = DungeonEnemy.new(floor_num, true, false, false, 1.0, DungeonWorldBossState.HP_MULT)
	_boss.position = SPAWN_POS
	_boss.add_to_group("world_boss")
	_boss.died.connect(_on_boss_died.bind(slot))
	get_parent().add_child(_boss)
	_fight_left = DungeonWorldBossState.FIGHT_SEC
	_fight_slot = slot
	_fight_box.show()
	Toast.show(self, "🐲 월드 보스 출현! 75초 안에 처치하라.", 4.0)


func _on_boss_died(slot: int) -> void:
	DungeonWorldBossState.reward_defeat(slot, get_parent(), SPAWN_POS)
	Toast.show(self, "🐲 월드 보스 처치! 전설 확률↑·부적 획득.", 5.0)
	_end_fight()


func _on_boss_fled() -> void:
	DungeonWorldBossState.reward_flee(_fight_slot)
	Toast.show(self, "🐲 월드 보스가 도망쳤다 — 보상 30%.", 4.0)
	if is_instance_valid(_boss):
		_boss.queue_free()
	_end_fight()


func _end_fight() -> void:
	_boss = null
	_fight_box.hide()


func _build_hud() -> void:
	_hud = CanvasLayer.new()
	add_child(_hud)

	_warn_label = Label.new()
	_warn_label.anchor_left = 1.0
	_warn_label.anchor_right = 1.0
	_warn_label.offset_left = -260.0
	_warn_label.offset_right = -20.0
	_warn_label.offset_top = 20.0
	_warn_label.offset_bottom = 60.0
	_warn_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_warn_label.add_theme_font_size_override("font_size", 20)
	_warn_label.visible = false
	_hud.add_child(_warn_label)

	_fight_box = VBoxContainer.new()
	_fight_box.anchor_left = 0.5
	_fight_box.anchor_right = 0.5
	_fight_box.offset_left = -160.0
	_fight_box.offset_right = 160.0
	_fight_box.offset_top = 120.0
	_fight_box.offset_bottom = 200.0
	_fight_box.visible = false
	_hud.add_child(_fight_box)

	var head := HBoxContainer.new()
	_fight_box.add_child(head)
	var title := Label.new()
	title.text = "🐲 월드 보스"
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(title)
	_fight_label = Label.new()
	head.add_child(_fight_label)

	_hp_bar = ProgressBar.new()
	_hp_bar.min_value = 0.0
	_hp_bar.max_value = 100.0
	_hp_bar.value = 100.0
	_hp_bar.show_percentage = false
	_fight_box.add_child(_hp_bar)


func _refresh_warn_hud() -> void:
	if DungeonWorldBossState.is_warning():
		_warn_label.visible = true
		_warn_label.text = "🐲 월드 보스 %d초 후" % int(ceil(DungeonWorldBossState.seconds_to_next_boundary()))
	else:
		_warn_label.visible = false


func _refresh_fight_hud() -> void:
	_fight_label.text = "%d초" % int(ceil(maxf(0.0, _fight_left)))
	if _boss != null and is_instance_valid(_boss):
		_hp_bar.value = clampf(_boss.hp / _boss.max_hp * 100.0, 0.0, 100.0)
