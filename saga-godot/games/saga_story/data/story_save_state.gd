extends Node

## VERTICAL_SLICE_STORY.md 1절 완료 조건의 마지막 두 단계 — "저장한다 →
## 다시 켜서 이어진다"(GO save_state.gd·DUNGEON dungeon_save_state.gd·
## FOREST forest_save_state.gd와 같은 정신: 로컬 파일 하나, 버전 필드,
## 게임마다 완전히 분리된 세이브 파일 — DUNGEON이 세운 선례 그대로).
##
## project.godot [autoload]에 StorySaveState로 등록.
##
## 저장하는 것 — 위치 + 레벨/경험치 + 사명("첫 사냥") 진행도 정도만
## (GO/DUNGEON/FOREST와 같은 최소 범위, 1절 "제외" 목록에 없는 것은
## 애초에 저장할 상태 자체가 없다).

const StoryCombat := preload("res://games/saga_story/data/story_combat.gd")

const SAVE_PATH := "user://save_story.json"
const SAVE_VERSION := 7  # 1→2: mats, 2→3: has_weapon, 3→4: equipped, 4→5: gold, 5→6: job(1차 전직), 6→7: skills(SP 투자)

var level := 1
var exp := 0
var kills := 0  # data-quest.js q_first(kill 10)의 진행 카운트
var mats: Dictionary = {}  # side.js s.mats[kind] 그대로 — 필드 채집(들꽃 등) 누적
var equipped: Dictionary = {}  # slot(String) -> gear key(String), StoryCombat.GEAR_ITEMS 참고
var gold := 0  # side.js core.save.player.gold 그대로 — 상인(story_merchant.gd)이 쓴다
var job := "none"  # data-job.js JOBS key — StoryCombat.JOBS_TIER1 참고, 한 번 정하면 안 바뀐다(전직 트리 첫 걸음)

## **2026-09-13 추가(같은 날 더) — SP(무예 점수) 투자.** key(StoryCombat.
## SKILL_JOB) → 투자한 레벨(1~10). job.js `core.save.skills`와 같은 자리 —
## SP 자체는 담지 않는다(sp_total()-sp_spent()의 파생값, job.js 머리말과
## 같은 이유: 레벨이 오르면 저절로 는다).
var skills: Dictionary = {}

## **2026-09-13 추가 — 문(portal, 15절).** 씬을 넘나들 때 세이브 위치
## 대신 문이 정해 준 자리에 서게 하는 임시 값 — story_portal.gd가 넘어가기
## 직전에 세팅하고, 도착한 씬의 _ready()가 한 번 읽고 바로 끈다(세이브에는
## 안 담는다, 이 값은 "다음 씬 진입 한 번"만을 위한 신호다).
var pending_spawn_x := 0.0
var has_pending_spawn := false


func set_pending_spawn(x_m: float) -> void:
	pending_spawn_x = x_m
	has_pending_spawn = true


## 호출 즉시 플래그를 끈다 — 씬이 한 번 읽고 나면 다음부터는 다시
## try_load()/기본 위치로 돌아가야 한다(문으로 안 들어온 재실행까지
## 이 값을 계속 쓰면 안 된다).
func consume_pending_spawn() -> float:
	has_pending_spawn = false
	return pending_spawn_x


func add_kill() -> void:
	kills += 1


func add_mat(kind: String, amount: int = 1) -> void:
	mats[kind] = int(mats.get(kind, 0)) + amount


## data-quest.js q_gather1("약초 캐기", goal.type:'gather', n:15)의 진행도.
## 이 슬라이스는 채집물이 herb 하나뿐이지만, mats 전체 합으로 뽑아 둬야
## 다른 채집물이 늘어도 이 사명이 그대로 맞는다(원작도 kind를 안 가린다).
func gathered_total() -> int:
	var total := 0
	for v: Variant in mats.values():
		total += int(v)
	return total


func gather_quest_done() -> bool:
	return gathered_total() >= 15


func add_gold(n: int) -> void:
	if n == 0:
		return
	gold = maxi(0, gold + n)


## 모자라면 아무것도 안 하고 false — DUNGEON DungeonGoldState.spend()와 같은 계약.
func spend_gold(n: int) -> bool:
	if n <= 0 or gold < n:
		return false
	gold -= n
	return true


## 부위는 StoryCombat.GEAR_ITEMS[key].slot에서 뽑는다 — 호출 쪽이 슬롯을
## 따로 안 넘겨도 된다(story_enemy.gd가 드롭 풀을 고를 때 이미 이 표를
## 훑으므로 중복 데이터가 안 생긴다).
func equip_gear(key: String) -> void:
	var it: Dictionary = StoryCombat.GEAR_ITEMS.get(key, {})
	if it.is_empty():
		return
	equipped[String(it.slot)] = key


func has_slot(slot: String) -> bool:
	return equipped.has(slot)


func gear_totals() -> Dictionary:
	return StoryCombat.gear_totals(equipped.values())


func quest_done() -> bool:
	return kills >= 10


## **2026-09-13 추가 — 전직 트리 첫 걸음.** core.js gainExp() 그대로:
## 랜덤 없이 결정적으로 exp_need(level)만큼씩 소비하며 오른다(한 번에
## 여러 레벨도 오를 수 있다 — while 루프, 원문과 같다).
func add_exp(amount: int) -> void:
	if amount <= 0:
		return
	exp += amount
	var need := StoryCombat.exp_need(level)
	while exp >= need:
		exp -= need
		level += 1
		need = StoryCombat.exp_need(level)


func can_change_job() -> bool:
	return job == "none" and level >= StoryCombat.JOB_CHANGE_LEVEL


## data-job.js "되돌릴 수 없다" 그대로 — 이미 정했으면 무시.
func choose_job(key: String) -> bool:
	if not can_change_job() or not StoryCombat.JOBS_TIER1.has(key):
		return false
	job = key
	return true


## **2026-09-13 추가 — 2~4차 전직.** job.js canJoin() 그대로: key가 지금
## job의 바로 다음 자리여야 하고(사슬, StoryCombat.job_prereq), 레벨
## 문턱을 넘어야 하고, 지금 job의 무예 중 하나가 그 tier의 레벨 문턱
## (JOB_SKILL_LEVEL_GATE) 이상이어야 한다. 이 슬라이스는 tier2+ 무예가
## 아직 없어(JOB_SKILL_KEYS에 항목 없음) 그 목록이 비고, 따라서 tier3+
## 진급은 자연히 못 연다(거짓으로 막은 게 아니라 채울 무예가 아직 없다).
func can_advance_job(key: String) -> bool:
	if StoryCombat.job_prereq(key) != job:
		return false
	if level < StoryCombat.job_level_need(key):
		return false
	var gate := StoryCombat.job_advance_skill_gate(key)
	for k: String in StoryCombat.JOB_SKILL_KEYS.get(job, []):
		if skill_level(String(k)) >= gate:
			return true
	return false


func advance_job(key: String) -> bool:
	if not can_advance_job(key):
		return false
	job = key
	return true


## 사슬 전체(현재 job + 그 위 모든 tier)의 grow(hp/atk/mp) 합 — job이
## 'none'이면 전부 0(빈 사슬).
func job_grow() -> Dictionary:
	return StoryCombat.job_grow_chain(job)


## job.js spTotal()/spSpent()/spLeft() 그대로 — 총점은 (레벨-1)×SP_PER_LEVEL,
## 남은 점수는 총점에서 이미 찍은 레벨의 합을 뺀 파생값(세이브에 안 담는다).
func sp_total() -> int:
	return maxi(0, (level - 1) * StoryCombat.SP_PER_LEVEL)


func sp_spent() -> int:
	var sum := 0
	for v: Variant in skills.values():
		sum += int(v)
	return sum


func sp_left() -> int:
	return maxi(0, sp_total() - sp_spent())


func skill_level(key: String) -> int:
	return int(skills.get(key, 0))


## job.js canRaise() 그대로 — 이 무예가 지금 job의 사슬 안(자기 job이거나
## 그 아래 tier)에 있는지·아직 만렙이 아닌지·남은 점수가 있는지 본다.
## **2026-09-13 추가 — 2~4차 전직**: 전에는 `job` 하나와 정확히 같은지만
## 봤는데(그때는 사슬이 tier1 하나뿐이라 같은 결과), 이제 진급해도 하위
## 무예(예: 장군이 된 뒤에도 무사 무예)에 계속 투자할 수 있어야 하므로
## 사슬 소속 여부로 바꿨다(원작 skillsOf()의 chain-walk과 같은 정신).
## **2026-09-13 추가(같은 날 더 더) — tier2 무예 열둘.** 원문 `need`(한
## 무예를 올리려면 그 앞 무예가 lv5 이상이어야 한다, data-job.js SKILLS
## need 필드)를 이제 실제로 확인한다 — tier1은 need가 없어 이 검사 자체가
## 전에는 없었다(story_combat.gd SKILL_NEED 머리말 참고).
func can_raise_skill(key: String) -> bool:
	var skill_job := String(StoryCombat.SKILL_JOB.get(key, ""))
	if skill_job == "" or not StoryCombat.job_chain(job).has(skill_job):
		return false
	if skill_level(key) >= StoryCombat.SKILL_MAX_LEVEL:
		return false
	if StoryCombat.SKILL_NEED.has(key):
		var need: Dictionary = StoryCombat.SKILL_NEED[key]
		if skill_level(String(need.key)) < int(need.lv):
			return false
	return sp_left() > 0


func raise_skill(key: String) -> bool:
	if not can_raise_skill(key):
		return false
	skills[key] = skill_level(key) + 1
	return true


func save() -> bool:
	var player := _find_player()
	if player == null:
		return false
	var data := {
		"version": SAVE_VERSION,
		"player_pos": [player.global_position.x, player.global_position.y, player.global_position.z],
		"level": level,
		"exp": exp,
		"kills": kills,
		"mats": mats,
		"equipped": equipped,
		"gold": gold,
		"job": job,
		"skills": skills,
	}
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(data))
	return true


func try_load() -> bool:
	if not FileAccess.file_exists(SAVE_PATH):
		return false
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f == null:
		return false
	var parsed: Variant = JSON.parse_string(f.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		return false
	var data: Dictionary = parsed
	if int(data.get("version", 0)) != SAVE_VERSION:
		return false  # 스키마가 하나뿐이라 마이그레이션 체인 없이 그냥 포기

	level = int(data.get("level", 1))
	exp = int(data.get("exp", 0))
	kills = int(data.get("kills", 0))
	var loaded_mats: Variant = data.get("mats", {})
	mats = loaded_mats if typeof(loaded_mats) == TYPE_DICTIONARY else {}
	var loaded_equipped: Variant = data.get("equipped", {})
	equipped = loaded_equipped if typeof(loaded_equipped) == TYPE_DICTIONARY else {}
	gold = int(data.get("gold", 0))
	job = String(data.get("job", "none"))
	var loaded_skills: Variant = data.get("skills", {})
	skills = loaded_skills if typeof(loaded_skills) == TYPE_DICTIONARY else {}

	var pos: Array = data.get("player_pos", [])
	if pos.size() != 3:
		return false
	var player := _find_player()
	if player != null:
		player.global_position = Vector3(float(pos[0]), float(pos[1]), float(pos[2]))
		## mp와 달리 equipped는 세이브에 있으므로, 로드 직후 hp를 새
		## max_hp(장비 hp 보너스 포함)로 채운다 — 안 그러면 "재입장 시
		## 가득 찬 채 시작"이 이전 세션 장비 보너스 반영 전 기본치로
		## 잠깐 어긋난다(player.gd 머리말 참고).
		if player.has_method("take_damage"):
			player.hp = player.max_hp
	return true


func _find_player() -> Node3D:
	var found := get_tree().get_nodes_in_group("player")
	return found[0] if found.size() > 0 else null
