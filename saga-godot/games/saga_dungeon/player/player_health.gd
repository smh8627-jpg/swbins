extends Node

## VERTICAL_SLICE_DUNGEON.md 3절 — "때리는 손맛"을 검증하려면 적도
## 되받아쳐야 한다. 죽음·부활은 이번 슬라이스 범위 밖(완료 조건 8단계에
## 없음) — 체력이 0 밑으로 내려가도 그냥 멈춘다. GO의 Player.tscn/
## player.gd는 손대지 않고, Player 인스턴스 밑에 이 컴포넌트 하나만
## 얹는 방식으로 짰다(component 패턴 — melee_attack.gd와 같은 경계).
##
## 은사(철벽) 적용 — max_hp가 더 이상 상수가 아니라 DungeonRunState.hp_mult()
## 로 다시 계산된다(웹판 dungeon.js hpMaxOf()와 같은 자리). 수호부(guardPct)
## 는 받는 피해를 줄인다(dungeon.js의 "amount *= 1 - boonVal('guardPct')/100"
## 그대로).
##
## "제외" 목록 6번(결사) — 위 "죽음은 범위 밖" 원칙은 **비결사 모드에서는
## 그대로 유지한다**(hp 0에서 그냥 멈춘다, 새 규칙을 안 만든다). 결사가
## 켜져 있을 때만 hp 0을 "쓰러짐"으로 취급해 dungeon.js die()의 결사
## 갈래(그 판이 끝난다)를 옮긴다 — `_dead` 가드는 그 판정을 한 번만 하기
## 위한 것일 뿐, 그 자체로 비결사 모드 동작을 바꾸지 않는다(hp는 이미
## 0에서 그대로 머물러 있었다).

signal hp_changed(hp: float, max_hp: float)
signal died

const Toast := preload("res://saga_core/ui/toast.gd")

var _dead := false

## 이번 슬라이스엔 스탯 시스템이 없어(장비·직업 능력치 전부 제외 목록)
## 임의로 정한 값 — 잡졸(공격력≈5) 몇 대는 맞아도 버티는 정도를 노렸다.
const MAX_HP_BASE := 60.0

var max_hp := MAX_HP_BASE
var hp := MAX_HP_BASE


func _ready() -> void:
	add_to_group("player_health")
	DungeonRunState.boons_changed.connect(recalc_max_hp)
	## "제외" 목록 3번(장비 등급+접사) — hp_mult()가 이제 장비의 hpPct
	## 접사도 같이 더하므로(DungeonRunState._sum_eff 참고), 장비가 바뀔
	## 때도 다시 계산해야 한다. "제외" 목록 2번(투장·내구)에서 부적(charm)
	## 이 더해지고 부서짐(is_broken)이 hpPct 반영分을 껐다 켰다 하므로
	## charm_changed도 같이 구독한다(wear_all()이 부서뜨렸을 때도 신호를
	## 쏜다 — dungeon_equipment_state.gd::wear_all() 참고).
	DungeonEquipmentState.weapon_changed.connect(recalc_max_hp)
	DungeonEquipmentState.charm_changed.connect(recalc_max_hp)
	## "제외" 목록 5번(인물 등용) — DungeonPartyState도 hpPct를 보태므로
	## (dungeon_run_state.gd::_sum_eff 참고) 인원이 늘 때도 다시 계산한다.
	DungeonPartyState.party_changed.connect(recalc_max_hp)
	recalc_max_hp()


func recalc_max_hp() -> void:
	max_hp = MAX_HP_BASE * DungeonRunState.hp_mult()
	hp = minf(hp, max_hp)
	hp_changed.emit(hp, max_hp)


func heal_by(amount: float) -> void:
	if amount <= 0.0:
		return
	hp = minf(max_hp, hp + amount)
	hp_changed.emit(hp, max_hp)


func take_damage(amount: float) -> void:
	if _dead or amount <= 0.0:
		return
	hp = maxf(0.0, hp - amount * DungeonRunState.guard_mult())
	hp_changed.emit(hp, max_hp)
	if hp <= 0.0:
		_dead = true
		died.emit()
		if DungeonHardcoreState.hardcore:
			_fall()


## dungeon.js die()의 결사(決死) 갈래 — 정확한 "층"을 아는 자리(현재 방
## 인덱스)가 여기엔 없어, 이미 클리어한 방 수 + 1로 가늠한다(방 하나
## 클리어할 때마다 DungeonSaveState.rooms_cleared에 표시가 남는다 —
## dungeon_save_state.gd 참고). 스러진 순간 화면 전체를 멈춘다
## (dungeon_hardcore_state.gd 헤더 참고) — HUD 버튼도 같이 멎는다.
func _fall() -> void:
	var floor_reached: int = DungeonSaveState.rooms_cleared.count(true) + 1
	DungeonHardcoreState.mark_fallen(floor_reached)
	DungeonSaveState.save(get_parent())
	Toast.show(self, "☠️ 결사 — 제%d층에서 스러졌다. 이 판은 여기까지다." % floor_reached, 8.0)
	get_tree().paused = true
