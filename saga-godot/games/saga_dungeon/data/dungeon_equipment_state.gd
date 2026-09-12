extends Node

## "제외" 목록 3번(장비 등급+접사) — 무기 한 자루짜리 최소 장착 상태.
## 이 슬라이스엔 가방·창고·다른 부위(갑주 등)가 없어(DungeonItems 참고)
## 딱 하나, `weapon` 하나만 들고 있는다. 새로 주우면 이전 것을 그냥
## 대체한다(가방에 안 넣고 비교하지 않는다 — item.js의 autoEquip처럼
## "더 나은지"를 재는 것도 이 슬라이스 밖).
##
## project.godot [autoload]에 DungeonEquipmentState로 등록.

signal weapon_changed

## {} 면 "맨손"(시작 상태, 방 0의 기존 손맛을 그대로 유지 — melee_attack.gd
## ATK_DAMAGE 상수만으로 움직인다). 처음 주운 물건부터 실제로 바뀐다.
var weapon: Dictionary = {}


func equip(it: Dictionary) -> void:
	weapon = it
	weapon_changed.emit()


func restore(saved: Dictionary) -> void:
	weapon = saved
	weapon_changed.emit()


## main + might/all 계열 flat 접사 — 이 슬라이스의 유일한 목표 스탯(무력)에
## 실제로 닿는 값만 더한다. 지력·통솔 계열 flat은 목표가 없어 0을 더한다
## (수치는 이름에 실리지만 효과는 안 낸다 — DungeonItems 주석 참고).
func atk_flat_bonus() -> float:
	if weapon.is_empty():
		return 0.0
	var total: float = float(weapon.main)
	for a_ref: Dictionary in weapon.get("aff", []):
		var a := DungeonItems.affix_by_key(a_ref.k)
		if a.is_empty() or a.kind != "flat":
			continue
		if a.stat == "might" or a.stat == "all":
			total += float(a_ref.v)
	return total


## mightPct/allPct 접사 — atk_flat_bonus와 같은 경계(might/all만 우리
## 무력 채널에 닿는다). melee_attack.gd가 DungeonRunState.atk_mult()와
## 곱하는 게 아니라 **더하는** 별도 배율이다(웹판 might/allPct가
## statBonus().pct.might로 따로 쌓이는 것과 같은 자리 — 은사의 atkPct와는
## 다른 채널이지만 이 슬라이스는 단순화를 위해 같은 공식에 합산한다).
func atk_pct_bonus() -> float:
	if weapon.is_empty():
		return 0.0
	var total := 0.0
	for a_ref: Dictionary in weapon.get("aff", []):
		var a := DungeonItems.affix_by_key(a_ref.k)
		if a.is_empty() or a.kind != "pct":
			continue
		if a.stat == "might" or a.stat == "all":
			total += float(a_ref.v)
	return total


## world kind 접사 합 — 은사(DungeonRunState)와 완전히 같은 eff 키 이름
## (atkPct·hpPct·critPct 등)을 쓰므로, DungeonRunState._sum_eff()가 이
## 함수를 더해 은사+장비를 한 공식으로 합산한다.
func world_eff_sum(eff_key: String) -> float:
	if weapon.is_empty():
		return 0.0
	var total := 0.0
	for a_ref: Dictionary in weapon.get("aff", []):
		var a := DungeonItems.affix_by_key(a_ref.k)
		if a.is_empty() or a.kind != "world":
			continue
		if a.eff == eff_key:
			total += float(a_ref.v)
	return total
