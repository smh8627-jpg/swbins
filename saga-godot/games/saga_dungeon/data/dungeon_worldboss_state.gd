extends Node

## PLAN 101-2 DUNGEON ⑥(월드 보스, 2026-09-17) — saga-web/saga-dungeon/PLAN.md
## §5.4 "월드 보스 시간표 — 실시간 75초 전투"를 옮긴다(웹도 아직 미구현 —
## dungeon.js에 "worldBoss" 문자열 자체가 없다, 부적 던전·난입과 같은 선례).
##
## **뺀 것 셋(정직하게 밝혀 둔다)**:
## - **부위 3(무기·갑주·머리) 파괴** — GO PLAN 101-2 ⑥"75초 토벌"이 이미
##   같은 이유로 뺀 자리다(`duel_rules.gd` 헤더 "새 부위 조준 UI가 필요해
##   범위 밖", `docs/PROJECT_STATE.md` 105장 "GO 부위 3 파괴 보류"와 같은
##   미결정). 이 판도 같은 결정을 따른다.
## - **HP 66%/33% 패턴 단계 전환** — `dungeon_enemy.gd`의 적 AI는 공격
##   하나뿐(접근→공격 쿨다운)이라 "전환할 패턴" 자체가 없다.
## - **저스트 회피(공격 예고 0.15초 전 회피)** — DUNGEON엔 GO의 DuelRules
##   같은 범용 회피 입력이 없다(직업별 dash 무예뿐, 회피 자체가 없다).
## 남는 건 "실시간 슬롯·예고·75초 안에 잡기·보상"(표준 H·E) — C(손맛)는
## ③손맛 2차(`combat_feel.gd`)가 이미 기본 공격에 물려 있어 그대로 상속.
##
## **슬롯** — 웹 `Math.floor(Date.now()/900000)`을 초 단위로 그대로: 15분
## (SLOT_SEC)마다 벽시계 경계가 하나씩 지난다. 그 경계를 넘는 순간 보스가
## 선다(`world_boss_director.gd`가 매 프레임 `current_slot()`을 비교해
## 감지). 경계 전 3분(WARN_SEC)은 HUD 카운트다운만(예고, 스폰 안 함).
##
## **보스** — 이 슬라이스엔 보스 몬스터가 하나뿐이다(황건 두목,
## `dungeon_enemy.gd` 헤더 "data-enemy.js BOSSES 첫 항목"만 옮김) — "보스
## 10 중 하나"는 그 하나를 그대로 쓴다. 체력만 8배(HP_MULT,
## `DungeonEnemy._init()`의 `hp_only_extra_mult` — 공격력은 그대로, 웹도
## "체력 8배"만 말한다). 층수는 `DungeonSaveState.rooms_cleared.count(true)
## +1`을 그대로 쓴다(`player_health.gd::_fall()`이 이미 같은 값을 "제 몇
## 층"으로 쓰는 자리 — 새 값을 안 만든다).
##
## **75초·보상** — 못 잡으면 도망: 금만 30%(FLEE_REWARD_PCT, `LootPickup.
## gold_amount()`를 재사용). 잡으면 정상 보스 노획(`LootPickup.spawn_at`,
## is_boss=true) + 전설 확률×3(LEGENDARY_MULT, `DungeonItems.roll()`의
## `legendary_mult`) + 부적 1(확정 — 보통 보스의 50%(BOSS_SIGIL_DROP_CHANCE)
## 확률과는 별개로 하나 더 준다, 웹 "부적(5.3) 1"이 확정형 문장이라서).
## "토벌첩"(도감)은 이 슬라이스에 몬스터 도감 자체가 없어(보스가 하나뿐이라
## 의미도 작다) 생략한다 — 아래 `last_rewarded_slot` 하나로 "같은 슬롯은
## 두 번 보상하지 않는다"만 지킨다.
##
## **세이브** — 웹 `save.world.bossDone`은 슬롯마다 쌓이는 Dictionary지만,
## 슬롯 번호가 벽시계로만 늘어나(되돌아갈 일이 없다) "마지막으로 보상한
## 슬롯" 정수 하나로 같은 효과를 낸다(무한히 안 커지는 순수 개선).
##
## project.godot [autoload]에 DungeonWorldBossState로 등록.

const LootPickup := preload("res://games/saga_dungeon/world/loot_pickup.gd")

signal boss_defeated(slot: int, floor_num: int)
signal boss_fled(slot: int)

const SLOT_SEC := 900.0  # 웹 5.4 "주기 15분" 그대로
const WARN_SEC := 180.0  # 웹 5.4 "예고 3분" 그대로
const FIGHT_SEC := 75.0  # 웹 5.4 "전투 75초" 그대로
const HP_MULT := 8.0  # 웹 5.4 "HP 8×enemyHp" 그대로(공격력은 안 건드림)
const LEGENDARY_MULT := 3.0  # 웹 5.4 "전설 확률×3" 그대로
const FLEE_REWARD_PCT := 0.30  # 웹 5.4 "도망 보상 30%" 그대로

var last_rewarded_slot: int = -1


static func current_slot() -> int:
	return int(Time.get_unix_time_from_system() / SLOT_SEC)


static func seconds_to_next_boundary() -> float:
	return SLOT_SEC - fmod(Time.get_unix_time_from_system(), SLOT_SEC)


static func is_warning() -> bool:
	return seconds_to_next_boundary() <= WARN_SEC


func slot_already_rewarded(slot: int) -> bool:
	return last_rewarded_slot == slot


## `player_health.gd::_fall()`과 같은 값(제 몇 층에 있는지 가늠하는 자리) —
## 새로 만들지 않고 그대로 가져다 쓴다.
func boss_floor_num() -> int:
	return DungeonSaveState.rooms_cleared.count(true) + 1


## world_boss_director.gd가 보스를 처치했을 때 부른다 — 정상 보상.
func reward_defeat(slot: int, parent: Node, pos: Vector3) -> void:
	if slot_already_rewarded(slot):
		return
	last_rewarded_slot = slot
	var floor_num := boss_floor_num()
	LootPickup.spawn_at(parent, pos, floor_num, true, false, LEGENDARY_MULT)
	DungeonSigilState.add_sigil(floor_num)
	boss_defeated.emit(slot, floor_num)


## world_boss_director.gd가 75초 안에 못 잡았을 때 부른다 — 금 30%만.
func reward_flee(slot: int) -> void:
	if slot_already_rewarded(slot):
		return
	last_rewarded_slot = slot
	var floor_num := boss_floor_num()
	var gold := int(roundf(LootPickup.gold_amount(floor_num, 5.0) * FLEE_REWARD_PCT))
	if gold > 0:
		DungeonGoldState.add(gold)
	boss_fled.emit(slot)


func restore(saved_last_slot: int) -> void:
	last_rewarded_slot = saved_last_slot
