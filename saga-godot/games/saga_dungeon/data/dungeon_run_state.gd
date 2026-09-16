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
## strike() 그대로)·echoPct·**skillPct(2026-09-17, 축복 3택 무예 축 신규 —
## 아래 skill_mul() 참고)**. **적용하지 않는 키(시스템이 아직 없다)**:
## goldPct(경제 시스템 없음)·worldFindPct(장비 희귀도 없음, 노획은 이름만)
## ·healOnFloor(여러 방/층 진입 이벤트가 없음, 방 하나뿐)·reveal(안개·
## 시야 시스템 없음)·piercePct(적에게 방어력 자체가 없다 — 잡졸은 고정
## HP만 갖는다, 방어를 "무시"할 대상이 없음). 이 키들도 `boons` 딕셔너리엔
## 정상적으로 쌓인다 — 나중에 해당 시스템이 생기면 여기 getter만 추가하면
## 된다(데이터는 이미 다 있다). **skillPointGrant는 이 채널을 안 탄다** —
## _sum_eff()가 아니라 apply_boon()이 직접 한 번만 소비한다(아래 참고).

signal boons_changed

var boons: Dictionary = {} # key(String) -> count(int)

## PLAN.md 51장 "장비→빌드" — 무예 "buff"(사기 등)의 잠깐짜리 효과.
## 웹판 dungeon.js addBuff()/boonVal()의 그 자리 그대로: eff_key마다
## 값(v)과 만료 시각만 들고, 지나면 자연히 무시된다(_process로 안 지운다
## — run.buffs도 사라진 항목을 매 프레임 delete할 뿐 실질은 "만료
## 검사"였다, 여기선 조회 시점에 그 검사를 한다). 세이브에 안 남는다
## (웹판 주석 "잠깐짜리 무예 · 분신은 회차 안에서만 산다" 그대로 —
## boons/ranks와 달리 dungeon_save_state.gd가 이 자리를 저장하지 않는다).
var _temp_buffs: Dictionary = {} # eff_key(String) -> {v: float, until_msec: int}


## addBuff() 그대로 — 기존 값이 더 세고 아직 안 끝났으면 안 덮는다(약한
## 재시전이 강한 버프를 깎아 먹지 않도록).
func add_temp_buff(eff_key: String, value: float, sec: float) -> void:
	var cur: Dictionary = _temp_buffs.get(eff_key, {})
	if not cur.is_empty() and float(cur.v) > value and Time.get_ticks_msec() < int(cur.until_msec):
		return
	_temp_buffs[eff_key] = {"v": value, "until_msec": Time.get_ticks_msec() + int(sec * 1000.0)}


## 2026-09-17, PLAN 101-2 DUNGEON ①(축복 3택) — saga-web/saga-dungeon/
## PLAN.md §5.1 "같은 축 중복 금지"·희귀도 3단(common 60%·rare 30%·
## legendary 10%)을 옮겼다. 축(axis) 셋(skill·hero·world)에서 하나씩
## 뽑아 카드 셋을 채운다 — dungeon_boons.gd 파일 헤더가 이 슬라이스의
## 세 축이 뭘 뜻하는지 적어 뒀다.
func roll_choice() -> Array[String]:
	var out: Array[String] = []
	var axes := ["skill", "hero", "world"]
	axes.shuffle()
	for axis in axes:
		if out.size() >= 3:
			break
		var picked := _roll_one_of_axis(axis, out)
		if picked != "":
			out.append(picked)
	## 축 하나(또는 그 이상)가 상한까지 다 차 카드를 못 낸 드문 경우 —
	## 축 안 가리고 남은 자리를 채운다("같은 축 중복 금지"보다 "카드 셋을
	## 못 채우는 쪽"이 더 나쁘다, 원안도 축이 부족하면 그 자리는 못 채운다고
	## 정하지 않았다).
	if out.size() < 3:
		var pool: Array[String] = []
		for b: Dictionary in DungeonBoons.BOONS:
			if out.has(str(b.key)):
				continue
			if int(boons.get(b.key, 0)) < int(b.max):
				pool.append(str(b.key))
		while out.size() < 3 and pool.size() > 0:
			var idx := randi() % pool.size()
			out.append(pool[idx])
			pool.remove_at(idx)
	return out


## 한 축 안에서 희귀도 가중(60/30/10)으로 하나 뽑는다 — 뽑힌 등급에 후보가
## 없으면 다음으로 흔한 등급으로 내려간다(등급 하나가 텅 빈 축도 카드를
## 낼 수 있게).
func _roll_one_of_axis(axis: String, exclude: Array[String]) -> String:
	var by_rarity := {"common": [] as Array[String], "rare": [] as Array[String], "legendary": [] as Array[String]}
	for b: Dictionary in DungeonBoons.BOONS:
		if str(b.axis) != axis or exclude.has(str(b.key)):
			continue
		if int(boons.get(b.key, 0)) >= int(b.max):
			continue
		var r: String = str(b.get("rarity", "common"))
		if not by_rarity.has(r):
			r = "common"
		by_rarity[r].append(str(b.key))
	var roll := randf() * 100.0
	var order: Array[String] = ["common", "rare", "legendary"]
	if roll >= 90.0:
		order = ["legendary", "rare", "common"]
	elif roll >= 60.0:
		order = ["rare", "common", "legendary"]
	for tier in order:
		var arr: Array[String] = by_rarity[tier]
		if arr.size() > 0:
			return arr[randi() % arr.size()]
	return ""


## 5.1 "거절 시 금 30×층" 그대로 — room_index(0부터)를 웹의 "층"(1부터)에
## 맞춰 +1 한다. 골드를 직접 넣고 실제로 넣은 값을 돌려준다(호출부가 토스트
## 문구에 그대로 쓴다).
func reject_choice(room_index: int) -> int:
	var gold := (room_index + 1) * 30
	DungeonGoldState.add(gold)
	return gold


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
	## "비급(祕笈)" — dungeon_boons.gd 헤더 참고. _sum_eff() 채널이 아니라
	## 여기서 즉시 한 번만 소비한다(test_room.gd::_finish_exit()이 방
	## 클리어마다 주는 것과 같은 자리·같은 규칙 — 그 순간 장착 중인 무기가
	## 정하는 직업에 준다).
	if b.eff.get("skillPointGrant", 0.0) > 0.0:
		var cls_key := DungeonItems.class_key_for_weapon(DungeonEquipmentState.weapon)
		DungeonSkillState.award_point(cls_key)
	return b


func restore(saved: Dictionary) -> void:
	boons.clear()
	for k in saved:
		boons[str(k)] = int(saved[k])
	boons_changed.emit()


## "제외" 목록 3번(장비 등급+접사) — 장비의 world 접사가 은사와 완전히
## 같은 eff 키 이름을 쓰므로 여기서 같이 더한다(DungeonEquipmentState.
## world_eff_sum 참고). "제외" 목록 5번(인물 등용)에서 DungeonPartyState도
## 같은 자리에 이어 붙였다(atkPct·hpPct만 반응, dungeon_party_state.gd
## 참고). PLAN.md 51장 "장비→빌드"(2026-09-14)에서 DungeonSkillState도
## 네 번째로 이어 붙였다(critPct·reachPct·atkSpdPct·hpPct·atkPct·
## drainPct·guardPct에 반응, dungeon_skill_state.gd 참고). 이 함수
## 하나로 atk_mult()·hp_mult()·crit_chance() 등 아래 모든 getter가
## 은사+장비+부대+무예를 자동으로 같이 반영한다. 2026-09-15, 51장
## "장비→빌드"의 무예 "buff"(m_rally 등)를 위해 다섯 번째로 `_temp_buffs`
## (잠깐짜리, 아래 정의)를 더했다 — 나머지 넷과 달리 시간이 지나면
## 저절로 빠진다. 2026-09-17, PLAN 101-2 DUNGEON ④(부적 던전)에서
## DungeonSigilState를 여섯 번째로 이어 붙였다 — "유리대포" 부적이 켜져
## 있을 때만 atkPct/guardPct에 반응한다.
func _sum_eff(eff_key: String) -> float:
	var total := 0.0
	for key in boons:
		var b := DungeonBoons.by_key(str(key))
		if not b.is_empty() and b.eff.has(eff_key):
			total += float(b.eff[eff_key]) * int(boons[key])
	total += DungeonEquipmentState.world_eff_sum(eff_key)
	total += DungeonPartyState.world_eff_sum(eff_key)
	total += DungeonSkillState.world_eff_sum(eff_key)
	## PLAN 101-2 DUNGEON ④(부적 던전, 2026-09-17) — "유리대포" 모드가
	## 뽑힌 부적이 켜져 있을 때만 atkPct/guardPct에 반응(dungeon_sigil_
	## state.gd 참고). 여섯 번째 자리.
	total += DungeonSigilState.world_eff_sum(eff_key)
	var buf: Dictionary = _temp_buffs.get(eff_key, {})
	if not buf.is_empty() and Time.get_ticks_msec() < int(buf.until_msec):
		total += float(buf.v)
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


## dungeon.js skillMul()의 "1 + boonVal('skillPct')/100" 그대로 — 처음엔
## dungeon_skills.gd s_focus·y_hex 무예만 이 채널을 채웠는데, 2026-09-17
## 축복 3택 "무예 축"(skillamp1·skillamp2, dungeon_boons.gd)이 은사로도
## 채우는 첫 사례가 됐다(_sum_eff()가 boons를 이미 순회하므로 여기 새
## 코드는 없다). atk_mult() 등과 달리 world eff 합산에 안 섞고 skill_
## bolt.gd 등 무예 스크립트가 직접 부른다 — "무예 위력"은 무예 데미지에만
## 곱해야 하는 계수라서다(기본 공격엔 안 곱는다).
func skill_mul() -> float:
	return 1.0 + _sum_eff("skillPct") / 100.0


## "제외" 목록 3번(행상 등) — dungeon.js dropGold()의 `(1+boonVal('goldPct')/100)
## *(1+core.effect('goldPct')/100)` 두 배율을 여기 하나로 합친다(은사+장비가
## 이미 _sum_eff 한 곳에서 더해진다 — atk_mult()와 같은 경계).
func gold_mult() -> float:
	return 1.0 + _sum_eff("goldPct") / 100.0
