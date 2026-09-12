extends Node

## VERTICAL_SLICE_DUNGEON.md "제외" 목록 1번 — "은사(恩賜, 방 클리어 후
## 버프 선택 UI)" 최소 구현. 웹판 `dungeon.js`의 `run.boons`(회차 한정,
## 저장 파일이 곧 회차이므로 이 슬라이스에선 "저장이 이어지는 한 유지"로
## 옮겼다)·`rollBoonChoice()`·`applyBoon()`을 그대로 이식한다 — 새 규칙을
## 만들지 않는다.
##
## project.godot [autoload]에 DungeonRunState로 등록.
##
## 이번 슬라이스에서 실제로 적용하는 eff 키: atkPct·atkSpdPct·moveSpdPct·
## reachPct·hpPct+healOnPick·guardPct·drainPct·critPct(1.85배, dungeon.js
## strike() 그대로)·echoPct. **적용하지 않는 키(시스템이 아직 없다)**:
## goldPct(경제 시스템 없음)·worldFindPct(장비 희귀도 없음, 노획은 이름만)
## ·healOnFloor(여러 방/층 진입 이벤트가 없음, 방 하나뿐)·reveal(안개·
## 시야 시스템 없음)·piercePct(적에게 방어력 자체가 없다 — 잡졸은 고정
## HP만 갖는다, 방어를 "무시"할 대상이 없음). 이 키들도 `boons` 딕셔너리엔
## 정상적으로 쌓인다 — 나중에 해당 시스템이 생기면 여기 getter만 추가하면
## 된다(데이터는 이미 다 있다).

signal boons_changed

var boons: Dictionary = {} # key(String) -> count(int)


func roll_choice() -> Array[String]:
	var pool: Array[String] = []
	for b: Dictionary in DungeonBoons.BOONS:
		if int(boons.get(b.key, 0)) < int(b.max):
			pool.append(b.key)
	var out: Array[String] = []
	while out.size() < 3 and pool.size() > 0:
		var idx := randi() % pool.size()
		out.append(pool[idx])
		pool.remove_at(idx)
	return out


## 은사 하나를 실제로 얹는다 — 상한을 넘겼으면 빈 Dictionary(실패).
## healOnPick이 있으면 player_health 그룹을 찾아 즉시 회복까지 시킨다
## (웹판 applyBoon()이 healBy()를 직접 부르는 것과 같은 자리).
func apply_boon(key: String) -> Dictionary:
	var b := DungeonBoons.by_key(key)
	if b.is_empty():
		return {}
	if int(boons.get(key, 0)) >= int(b.max):
		return {}
	boons[key] = int(boons.get(key, 0)) + 1
	boons_changed.emit()
	var heal: float = b.eff.get("healOnPick", 0.0)
	if heal > 0.0:
		var found := get_tree().get_nodes_in_group("player_health")
		if not found.is_empty():
			found[0].recalc_max_hp()
			found[0].heal_by(found[0].max_hp * heal / 100.0)
	return b


func restore(saved: Dictionary) -> void:
	boons.clear()
	for k in saved:
		boons[str(k)] = int(saved[k])
	boons_changed.emit()


func _sum_eff(eff_key: String) -> float:
	var total := 0.0
	for key in boons:
		var b := DungeonBoons.by_key(str(key))
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


func hp_mult() -> float:
	return 1.0 + _sum_eff("hpPct") / 100.0


func guard_mult() -> float:
	return 1.0 - _sum_eff("guardPct") / 100.0


func crit_chance() -> float:
	return _sum_eff("critPct")


func drain_pct() -> float:
	return _sum_eff("drainPct")


func echo_pct() -> float:
	return _sum_eff("echoPct")
