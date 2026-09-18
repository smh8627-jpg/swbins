extends Node

## PLAN.md 101-2 STORY ⑤(비경, 2026-09-18) — story_labyrinth.gd 헤더 참고.
## dungeon_run_state.gd와 같은 뼈대(회차 한정 boons 딕셔너리 + _sum_eff()
## 합산 + 배율 getter들)지만, 비경의 "축복"은 **회차(run) 한정**이다(세이브에
## 안 담는다 — 던전과 달리 "저장 파일이 곧 회차"가 아니라 문을 나서면
## 끝나는 진짜 로그라이트 회차라서다, story_labyrinth.gd::end_run() 참고).
##
## project.godot [autoload]에 StoryLabyrinthState로 등록.

const StoryLabyrinth := preload("res://games/saga_story/data/story_labyrinth.gd")

var in_run := false
var floor_index := 0  # 0~3=노드 선택 층, 4=보스 층. 클리어한 층 수와 같다.
var boons: Dictionary = {}  # key(String) -> count(int), 회차 한정(세이브 안 함)


func start_run() -> void:
	in_run = true
	floor_index = 0
	boons.clear()


func roll_choice() -> Array[String]:
	return StoryLabyrinth.roll_choice(boons)


## 은사 하나를 얹는다 — healOnPick이 있으면 그 자리에서 바로 플레이어를
## 치유한다(dungeon_run_state.gd apply_boon()의 healOnPick 처리와 같은 자리).
func apply_boon(key: String) -> Dictionary:
	var b := StoryLabyrinth.by_key(key)
	if b.is_empty() or int(boons.get(key, 0)) >= int(b.max):
		return {}
	boons[key] = int(boons.get(key, 0)) + 1
	var heal: float = float(b.eff.get("healOnPick", 0.0))
	if heal > 0.0:
		_heal_player(heal / 100.0)
	return b


## §5-3 "정예 처치 후" 노드를 클리어할 때마다 부른다 — healOnClear 은사가
## 있으면 그만큼 회복한다.
func on_node_cleared() -> void:
	var pct := _sum_eff("healOnClear") / 100.0
	if pct > 0.0:
		_heal_player(pct)


func _heal_player(pct: float) -> void:
	var player := get_tree().get_first_node_in_group("player")
	if player != null and player.has_method("heal_pct"):
		player.heal_pct(pct)


func _sum_eff(eff_key: String) -> float:
	var total := 0.0
	for key in boons:
		var b := StoryLabyrinth.by_key(str(key))
		if not b.is_empty() and b.eff.has(eff_key):
			total += float(b.eff[eff_key]) * int(boons[key])
	return total


func atk_mult() -> float:
	return 1.0 + _sum_eff("atkPct") / 100.0


func atk_speed_mult() -> float:
	return 1.0 + _sum_eff("atkSpdPct") / 100.0


func move_speed_mult() -> float:
	return 1.0 + _sum_eff("moveSpdPct") / 100.0


func reach_mult() -> float:
	return 1.0 + _sum_eff("reachPct") / 100.0


func dmg_taken_mult() -> float:
	return maxf(0.2, 1.0 - _sum_eff("guardPct") / 100.0)


## rewardPct(은사) + 주간 변형자(story_labyrinth.gd 헤더 참고)를 한 배율로
## 합친다 — 보물/사건 노드가 금·재료를 줄 때 이 값 하나만 곱하면 된다.
func reward_mult() -> float:
	var mul := 1.0 + _sum_eff("rewardPct") / 100.0
	if StoryLabyrinth.weekly_modifier_active(StorySaveState.current_week()):
		mul *= StoryLabyrinth.WEEKLY_REWARD_MUL
	return mul


func weekly_enemy_hp_mult() -> float:
	return StoryLabyrinth.WEEKLY_ENEMY_HP_MUL if StoryLabyrinth.weekly_modifier_active(StorySaveState.current_week()) else 1.0


## 회차 정산 — floor_index(이미 클리어한 층 수)에 클리어 보너스(+1, 보스까지
## 잡았을 때만)와 기억(記憶) 은사 합을 더해 기억 조각을 StorySaveState에
## 얹고 회차를 리셋한다. 돌려주는 값은 호출부(story_labyrinth.gd)가 토스트
## 문구에 그대로 쓴다.
func end_run(cleared: bool) -> int:
	var frags := floor_index + (1 if cleared else 0)
	frags += roundi(_sum_eff("fragmentBonus"))
	StorySaveState.add_memory_fragments(frags)
	in_run = false
	boons.clear()
	floor_index = 0
	return frags
