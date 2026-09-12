extends Node

## "제외" 목록 3번(장비 등급+접사) — 무기 한 자루짜리 최소 장착 상태였던
## 것에, "제외" 목록 2번(소켓+부문어·투장·내구)에서 **부적(charm) 한
## 점**을 더했다(dungeon_items.gd 헤더 참고 — 투장이 2점을 채우려면
## 부위가 최소 둘 있어야 한다). 여전히 가방·창고는 없다 — 새로 주우면
## 그 부위의 이전 것을 그냥 대체한다(대체된 물건에 박혀 있던 룬은
## 그대로 사라진다 — 원작도 "한 번 박은 룬은 못 뺀다"였으니 이 손실은
## 새 버그가 아니라 같은 규칙의 자연스러운 결과다).
##
## project.godot [autoload]에 DungeonEquipmentState로 등록.

signal weapon_changed
signal charm_changed

## {} 면 "맨손"/"부적 없음"(시작 상태). 처음 주운 물건부터 실제로 바뀐다.
var weapon: Dictionary = {}
var charm: Dictionary = {}


func equip_weapon(it: Dictionary) -> void:
	weapon = it
	weapon_changed.emit()


func equip_charm(it: Dictionary) -> void:
	charm = it
	charm_changed.emit()


func restore(saved_weapon: Dictionary, saved_charm: Dictionary = {}) -> void:
	weapon = saved_weapon
	charm = saved_charm
	weapon_changed.emit()
	charm_changed.emit()


## 부서진 장비는 아무 값도 안 낸다(item.js "부서지면 능력치를 안 준다") —
## main·접사·소켓 효과·투장 집계 전부 이 문턱 하나를 공유한다.
func _active_items() -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	for it in [weapon, charm]:
		if not it.is_empty() and not DungeonItems.is_broken(it):
			out.append(it)
	return out


## 장착 중인(안 부서진) 것들의 접사 + 소켓(부문어 포함) 효과를 한 목록으로
## 모은다 — atk_flat_bonus()·atk_pct_bonus()·world_eff_sum()이 전부 이
## 하나만 훑는다(dungeon_run_state.gd::_sum_eff()와 같은 "단일 집계 지점"
## 패턴).
func _affix_and_socket_effects() -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	for it: Dictionary in _active_items():
		for a_ref: Dictionary in it.get("aff", []):
			var a := DungeonItems.affix_by_key(a_ref.k)
			if a.is_empty():
				continue
			out.append({"kind": a.kind, "stat": a.get("stat", ""), "eff": a.get("eff", ""), "v": float(a_ref.v)})
		for e: Dictionary in DungeonItems.socket_effects(it):
			out.append(e)
	return out


## 걸친(안 부서진) 무기·부적이 같은 투장(세트)에 속하면 그 점수만큼의
## 세트 효과를 더한다 — data-set.js bonusFor()는 누적이라 2점 값 위에
## 3점 값도 더 있으면 같이 붙지만, 우리는 갑주가 없어 3점은 못 채운다.
func _set_effects() -> Array[Dictionary]:
	var counts: Dictionary = {}
	for it: Dictionary in _active_items():
		var set_key := str(it.get("set", ""))
		if set_key == "":
			continue
		counts[set_key] = int(counts.get(set_key, 0)) + 1
	var out: Array[Dictionary] = []
	for key in counts:
		var s := DungeonItems.set_by_key(str(key))
		for e: Dictionary in DungeonItems.bonus_for(s, int(counts[key])):
			out.append(e)
	return out


## main + might/all 계열 flat 접사 — 이 슬라이스의 유일한 목표 스탯(무력)에
## 실제로 닿는 값만 더한다. 지력·통솔 계열은 목표가 없어 0을 더한다
## (수치는 이름에 실리지만 효과는 안 낸다 — DungeonItems 주석 참고).
func atk_flat_bonus() -> float:
	var total := 0.0
	for it: Dictionary in _active_items():
		var b := DungeonItems.base_by_key(str(it.get("base", "")))
		if not b.is_empty() and b.main == "might":
			total += float(it.main)
	for e: Dictionary in _affix_and_socket_effects():
		if e.kind == "flat" and (e.stat == "might" or e.stat == "all"):
			total += float(e.v)
	for e: Dictionary in _set_effects():
		if e.kind == "flat" and (e.stat == "might" or e.stat == "all"):
			total += float(e.v)
	return total


## mightPct/allPct 접사 — atk_flat_bonus와 같은 경계(might/all만 우리
## 무력 채널에 닿는다). melee_attack.gd가 DungeonRunState.atk_mult()와
## 곱하는 게 아니라 **더하는** 별도 배율이다.
func atk_pct_bonus() -> float:
	var total := 0.0
	for e: Dictionary in _affix_and_socket_effects():
		if e.kind == "pct" and (e.stat == "might" or e.stat == "all"):
			total += float(e.v)
	for e: Dictionary in _set_effects():
		if e.kind == "pct" and (e.stat == "might" or e.stat == "all"):
			total += float(e.v)
	return total


## world kind 접사 합 — 은사(DungeonRunState)와 완전히 같은 eff 키 이름
## (atkPct·hpPct·critPct 등)을 쓰므로, DungeonRunState._sum_eff()가 이
## 함수를 더해 은사+장비를 한 공식으로 합산한다.
func world_eff_sum(eff_key: String) -> float:
	var total := 0.0
	for e: Dictionary in _affix_and_socket_effects():
		if e.kind == "world" and e.eff == eff_key:
			total += float(e.v)
	for e: Dictionary in _set_effects():
		if e.kind == "world" and e.eff == eff_key:
			total += float(e.v)
	return total


## "제외" 목록 2번(내구) — item.js::wearAll(), "층을 내려갈 때마다 1
## 닳는다"를 test_room.gd의 방 출구(descend에 해당)에서 부른다. 방금
## 부서진 부위 이름("weapon"/"charm")만 돌려준다(토스트용) — 장신구
## (charm)는 dur_max_of()가 0을 주므로 애초에 안 닳는다.
func wear_all(n: float = 1.0) -> Array[String]:
	var broke: Array[String] = []
	for slot_name in ["weapon", "charm"]:
		var it: Dictionary = weapon if slot_name == "weapon" else charm
		if it.is_empty():
			continue
		var max_d := DungeonItems.dur_max_of(it)
		if max_d <= 0.0:
			continue
		var was: float = float(it.get("dur", max_d))
		it["dur"] = clampf(was - n, 0.0, max_d)
		if was > 0.0 and it.dur <= 0.0:
			broke.append(slot_name)
	if not broke.is_empty():
		weapon_changed.emit()
		charm_changed.emit()
	return broke


## "제외" 목록 2번(소켓) — 무기부터 살펴 빈 구멍이 있는 첫 부위를 준다
## (없으면 ""). 소켓 UI가 "지금 뭘 박을 수 있는지"를 물을 때 쓴다.
func first_socketable_slot() -> String:
	for slot_name in ["weapon", "charm"]:
		var it: Dictionary = weapon if slot_name == "weapon" else charm
		if it.is_empty():
			continue
		var sock: Array = it.get("sock", [])
		if sock.has(null):
			return slot_name
	return ""


## 그 부위의 첫 빈 구멍에 부문(룬) 하나를 박는다. 재료는 호출 쪽이 이미
## DungeonMaterialsState에서 있는지 확인하고 불렀다고 본다(socket_button.gd).
## @returns 부문어가 새로 이루어졌으면 그 정의(word), 아니면 {}.
func socket_rune(slot_name: String, rune_key: String) -> Dictionary:
	var it: Dictionary = weapon if slot_name == "weapon" else charm
	if it.is_empty():
		return {}
	var sock: Array = it.get("sock", [])
	var idx := sock.find(null)
	if idx < 0:
		return {}
	sock[idx] = {"t": "rune", "key": rune_key}
	if slot_name == "weapon":
		weapon_changed.emit()
	else:
		charm_changed.emit()
	var b := DungeonItems.base_by_key(str(it.get("base", "")))
	return DungeonItems.word_of(sock, str(b.get("slot", "")))


## "제외" 목록 4번(원소 6결+저항) — socket_rune()과 같은 경계(부문어 여부를
## 돌려준다, 여기선 보석·주옥이 섞이면 부문어가 절대 안 되니 늘 {}다).
func socket_gem(slot_name: String, gem_key: String, grade_num: int) -> Dictionary:
	var it: Dictionary = weapon if slot_name == "weapon" else charm
	if it.is_empty():
		return {}
	var sock: Array = it.get("sock", [])
	var idx := sock.find(null)
	if idx < 0:
		return {}
	sock[idx] = {"t": "gem", "key": gem_key, "g": grade_num}
	if slot_name == "weapon":
		weapon_changed.emit()
	else:
		charm_changed.emit()
	return {}


## 주옥은 **부위를 안 가린다** — 어느 소켓에 박아도 굴려 나온 접사 그대로 낸다.
func socket_jewel(slot_name: String, jewel: Dictionary) -> Dictionary:
	var it: Dictionary = weapon if slot_name == "weapon" else charm
	if it.is_empty():
		return {}
	var sock: Array = it.get("sock", [])
	var idx := sock.find(null)
	if idx < 0:
		return {}
	sock[idx] = {"t": "jewel", "j": jewel}
	if slot_name == "weapon":
		weapon_changed.emit()
	else:
		charm_changed.emit()
	return {}


## item.js elemDamage() 그대로 — 걸친(안 부서진) 것들의 소켓 효과 중 eldmg만
## 결별로 더한다. melee_attack.gd가 물리 타격 뒤 이 결과를 결마다 따로 적용한다.
func elem_damage() -> Dictionary:
	var out: Dictionary = {}
	for e: Dictionary in _affix_and_socket_effects():
		if e.kind == "eldmg":
			var el := str(e.el)
			out[el] = float(out.get(el, 0.0)) + float(e.v)
	return out


## item.js elemResist() 그대로 — 결별 저항(%), 상한은 DungeonItems.RESIST_CAP.
## 갑주 슬롯이 없어 보석의 elres는 안 닿고, **주옥만**(부위를 안 가리므로)
## 이 값을 채울 수 있다.
func elem_resist(el: String) -> float:
	var total := 0.0
	for e: Dictionary in _affix_and_socket_effects():
		if e.kind == "elres" and str(e.el) == el:
			total += float(e.v)
	return clampf(total, 0.0, DungeonItems.RESIST_CAP)


## "제외" 목록 3번(감정) — 미확인 표시를 끈다. 재료(감정서)는 호출 쪽
## (vendor_button.gd)이 이미 DungeonMaterialsState에서 있는지 확인하고
## 불렀다고 본다(socket_rune()과 같은 경계). 이미 확인된 물건이면 false.
func identify(slot_name: String) -> bool:
	var it: Dictionary = weapon if slot_name == "weapon" else charm
	if it.is_empty() or not bool(it.get("unid", false)):
		return false
	it["unid"] = false
	if slot_name == "weapon":
		weapon_changed.emit()
	else:
		charm_changed.emit()
	return true


## "제외" 목록 3번(수리) — item.js::repairCost()의 합. 0이면 수리할 게 없다.
func repair_all_cost() -> int:
	var total := 0
	for it: Dictionary in [weapon, charm]:
		if not it.is_empty():
			total += DungeonItems.repair_cost(it)
	return total


## 무기·부적을 모두 최대 내구까지 고친다 — 비용은 호출 쪽이 이미
## repair_all_cost()로 확인하고 금을 뗐다고 본다.
func repair_all() -> void:
	for slot_name in ["weapon", "charm"]:
		var it: Dictionary = weapon if slot_name == "weapon" else charm
		if it.is_empty():
			continue
		var max_d := DungeonItems.dur_max_of(it)
		if max_d > 0.0:
			it["dur"] = max_d
	weapon_changed.emit()
	charm_changed.emit()
