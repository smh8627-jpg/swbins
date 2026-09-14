extends Node

## PLAN.md 51장 "장비→빌드" — 무예(스킬) 랭크 상태. DungeonPartyState의
## world_eff_sum()과 같은 계약(dungeon_run_state.gd::_sum_eff()가 은사·
## 장비·부대에 이어 네 번째로 더하는 자리)이라 그 파일을 그대로 본떴다.
##
## **점수는 직업마다 따로 센다**(data-skill.js 헤더 "점수는 직업마다
## 따로 센다 — 무기를 바꿔도 그 나무의 점수는 그대로 남는다" 그대로).
## **점수를 얻는 자리** — 원작은 "인물 레벨만큼"인데 이 슬라이스엔 인물
## 레벨 자체가 없다. 대신 이미 있는 리듬(방 클리어마다 은사 하나,
## test_room.gd::_finish_exit())에 그대로 얹었다 — 방 하나 클리어할
## 때마다, **그 순간 장착 중인 무기가 정하는 직업**에 점 하나(원작과
## 다른 결정이지만 새 시스템을 만들지 않고 이미 있는 리듬을 재사용한다).
##
## project.godot [autoload]에 DungeonSkillState로 등록.

signal skills_changed

var points: Dictionary = {}  # cls_key(String) -> unspent point(int)
var ranks: Dictionary = {}   # skill_key(String) -> rank(int)


func award_point(cls_key: String) -> void:
	points[cls_key] = int(points.get(cls_key, 0)) + 1
	skills_changed.emit()


func points_for(cls_key: String) -> int:
	return int(points.get(cls_key, 0))


func rank_of(skill_key: String) -> int:
	return int(ranks.get(skill_key, 0))


## data-skill.js의 두 규칙(앞 단에 1점 필요·다 못 채운다) 그대로 —
## 점수가 있고, MAX_RANK 미만이고, 앞 단(prereq)에 1점 이상 있어야 한다.
func can_invest(skill_key: String) -> bool:
	var sk := DungeonSkills.skill_by_key(skill_key)
	if sk.is_empty():
		return false
	if points_for(str(sk.cls)) <= 0:
		return false
	if rank_of(skill_key) >= DungeonSkills.MAX_RANK:
		return false
	var pre := DungeonSkills.prereq_of(sk)
	if not pre.is_empty() and rank_of(str(pre.key)) <= 0:
		return false
	return true


func invest(skill_key: String) -> bool:
	if not can_invest(skill_key):
		return false
	var sk := DungeonSkills.skill_by_key(skill_key)
	ranks[skill_key] = rank_of(skill_key) + 1
	points[str(sk.cls)] = points_for(str(sk.cls)) - 1
	skills_changed.emit()
	return true


func restore(saved_points: Dictionary, saved_ranks: Dictionary) -> void:
	points.clear()
	for k in saved_points:
		points[str(k)] = int(saved_points[k])
	ranks.clear()
	for k in saved_ranks:
		ranks[str(k)] = int(saved_ranks[k])
	skills_changed.emit()


## dungeon_run_state.gd::_sum_eff()가 boons·장비·부대와 나란히 더하는
## 네 번째 자리 — 랭크가 있는 무예 중 이 eff_key를 쓰는 것만 더한다.
func world_eff_sum(eff_key: String) -> float:
	if eff_key == "":
		return 0.0
	var total := 0.0
	for skill_key in ranks:
		var r := int(ranks[skill_key])
		if r <= 0:
			continue
		var sk := DungeonSkills.skill_by_key(str(skill_key))
		if not sk.is_empty() and str(sk.eff) == eff_key:
			total += DungeonSkills.value_at(sk, r)
	return total
