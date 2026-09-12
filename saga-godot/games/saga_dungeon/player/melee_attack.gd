extends Node

## VERTICAL_SLICE_DUNGEON.md 3절 — 실시간 근접 공격. GO의 duel_rules.gd
## (턴형 선택지 판정, 화면이 멈추고 버튼을 고른다)와는 완전히 다른 모델이라
## 새로 짰다 — 이동하며 버튼 한 번으로 때리는 실시간 액션. 웹판
## `dungeon.js`의 BASE_ATK_CD(0.55초)를 그대로 이식했다(새 수치를 만들지
## 않는다). 데미지(9)는 이번 슬라이스에 장비 시스템이 없어(제외 목록)
## 직접 정한 값이다 — 잡졸(HP≈24)을 세 대 안에 눕히는 감각을 노렸다.
##
## Player의 자식 컴포넌트로 붙는다(player_health.gd와 같은 경계) — 이
## 스크립트가 곧 "공격 입력을 받는 자리"다. HUD의 공격 버튼도 이 노드를
## "melee_attack" 그룹으로 찾아 같은 진입점(`try_attack()`)을 부른다.
##
## 은사(DungeonRunState) 적용 — 웹판 dungeon.js strike()/atkCdOf()/reachOf()
## 그대로: 공격력·공격 속도·사거리는 배율, 치명타는 1.85배(crit 확률은
## critPct 합), 분신(echoPct)은 같은 대상을 한 번 더 때린다, 흡혈(drainPct)은
## 그 타격으로 죽였을 때 최대 체력의 %만큼 회복한다.

const ATK_COOLDOWN := 0.55 # 웹판 BASE_ATK_CD 그대로
const ATK_DAMAGE := 9.0
const ATK_RANGE := 2.4
const CRIT_MULT := 1.85 # 웹판 dungeon.js strike()의 "dmg *= 1.85" 그대로

var _cooldown_left := 0.0
@onready var _player: Node3D = get_parent()


func _ready() -> void:
	add_to_group("melee_attack")


func _process(delta: float) -> void:
	_cooldown_left = maxf(0.0, _cooldown_left - delta)
	if Input.is_action_pressed("dungeon_attack"):
		try_attack()


## HUD의 공격 버튼도 이 진입점을 그대로 부른다(키보드/버튼 두 입력이
## 같은 판정을 타게 해 중복 로직이 안 생긴다).
func try_attack() -> void:
	if _cooldown_left > 0.0:
		return
	_cooldown_left = ATK_COOLDOWN / DungeonRunState.atk_speed_mult()
	var range_now: float = ATK_RANGE * DungeonRunState.reach_mult()
	for enemy in get_tree().get_nodes_in_group("dungeon_enemy"):
		if not is_instance_valid(enemy):
			continue
		if enemy.global_position.distance_to(_player.global_position) <= range_now:
			if enemy.has_method("take_damage"):
				_strike(enemy)
				if is_instance_valid(enemy) and randf() * 100.0 < DungeonRunState.echo_pct():
					_strike(enemy)


func _strike(enemy: Node) -> void:
	var was_alive: bool = enemy.hp > 0.0
	var dmg: float = ATK_DAMAGE * DungeonRunState.atk_mult()
	if randf() * 100.0 < DungeonRunState.crit_chance():
		dmg *= CRIT_MULT
	enemy.take_damage(dmg)
	var drain: float = DungeonRunState.drain_pct()
	if was_alive and drain > 0.0 and (not is_instance_valid(enemy) or enemy.hp <= 0.0):
		var found := get_tree().get_nodes_in_group("player_health")
		if not found.is_empty():
			found[0].heal_by(found[0].max_hp * drain / 100.0)
