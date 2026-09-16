extends Node

## PLAN 101-2 DUNGEON ⑤(난입, 2026-09-17) — saga-web/saga-dungeon/PLAN.md
## §5.5 "난입(亂入) — 15분 생존 파도"를 옮긴다. 웹도 아직 미구현(§8 로드맵
## Phase 3 예정, `dungeon.js`에 "horde" 문자열 자체가 없다 — grep으로 확인)
## 이지만, dungeon_boons.gd 헤더가 이미 밝힌 선례(101-4 "3D는 새로 설계하지
## 않는다"는 §5의 **설계**를 출처로 삼으라는 뜻)를 그대로 따른다.
##
## 웹 원안은 "모루골 결사비 옆 표식"이지만 이 슬라이스엔 마을/허브 씬이
## 없다(§28-8 A안 이전) — sigil_button.gd·hardcore_button.gd와 같은 경계로
## HUD 버튼(horde_button.gd) 하나로 켠다. "방 하나(큰 방, 3×3 방 크기)"도
## 새 지오메트리를 만들지 않고 시작한 자리(플레이어가 서 있는 기존 방)를
## 그대로 쓴다 — 부적 던전이 "새 층 5개" 대신 "있는 방 7개를 다시 돈다"로
## 재해석한 것과 같은 판단(실제 스폰은 horde_arena.gd).
##
## **레벨(처치 경험)** — 웹의 `core.save.player.level/exp`(dungeon.js 2500행
## `gainExp` 호출, `expNeed=50×1.28^(level-1)`) 자체가 이 슬라이스엔 아직
## 없다(플레이어 레벨 시스템이 통째로 없다 — grep으로 확인, DungeonSkillState는
## "무예 랭크"일 뿐 캐릭터 레벨이 아니다). 그 전제를 통째로 새로 만드는 건
## 이번 범위 밖이라, "난입 한정" 레벨을 여기 안에서만 굴린다: 처치 1회=경험 1,
## 레벨 L→L+1 필요 경험 L²×10(PLAN.md 101-2 표의 "경험 곡선 파도²×10"을
## "레벨²×10"으로 읽었다 — "파도"는 이미 "6+2×파도"로 다른 수치를 맡고 있어
## 경험 곡선에 다시 쓰일 이유가 없고, 웹도 미구현이라 대조할 코드가 없다).
##
## **즉석 3택** — dungeon_boons.gd의 3축·희귀도 굴림(roll_choice)을 그대로
## 재사용하되 `run_boons`(이 필드, 난입 시작마다 비운다)에 쌓는다 — 영구
## `DungeonRunState.boons`와 완전히 분리된 카운트라 난입이 끝나면 그 효과도
## 사라진다("난입 한정" 그대로). **"비급"(skillpoint, 즉시 영구 무예 점수
## 부여)만 후보 풀에서 뺀다** — 유일하게 되돌릴 수 없는 영구 효과라 "난입
## 한정"과 모순된다. 나머지 13개는 전부 `DungeonRunState._sum_eff()`의
## 일곱 번째 채널(world_eff_sum, 아래)로만 살고 죽는다.
##
## **적 배율** — 부적 던전(DungeonSigilState)과 같은 "1+0.35×티어" 공식을
## 재사용하되 완전히 독립된 숫자다(티어 = 파도/8, 웹 5.5 "티어는 파도/8"
## 그대로). `dungeon_enemy.gd`의 꼬리 인자 `extra_stat_mult`로 얹는다(정예·
## 보스·그림자·부적 배율이 이미 곱해진 맨 끝 — 부적과 같은 자리, 둘 다
## 켜져 있어도 곱만 쌓일 뿐 서로 안 건드린다, 웹 5.5 "충돌: 없음" 그대로).
##
## **보상** — 웹 "생존 시간 비례 금·공적 + 10분 이상 부적 1"에서 이 슬라이스엔
## 공적(feat) 시스템이 없다(GO 전용, `LEGACY_FEATURE_AUDIT.md` 참고) — 금만
## 준다: 초당 GOLD_PER_SEC(직접 정함 — 15분 완주 13500금, 지금까지 노획
## 규모(잡졸 처치 몇 판 분량)와 크게 안 어긋나게 잡았다). 10분(600초) 이상
## 생존하면 부적 1(티어 1 고정, `DungeonSigilState.add_sigil`)도 준다.
## 생존/사망 어느 쪽으로 끝나든 이 보상은 "생존한 만큼" 그대로 준다(웹
## 문구가 성공/실패를 가르지 않는다).
##
## 세이브: `save.dungeon.horde = {best(초), runs}` 그대로 — `best_survive_sec`·
## `runs`만 순수 추가 필드(버전 안 올림). 진행 중 상태(active·wave·kills·
## run_boons 등)는 저장하지 않는다 — 결사·부적과 달리 "회차를 넘겨 이어지는"
## 상태가 아니다(웹도 새로고침하면 난입이 리셋되는 것과 같은 경계).
##
## project.godot [autoload]에 DungeonHordeState로 등록.

signal horde_changed
signal horde_ended(survived: bool, elapsed_sec: float, gold_reward: int, got_sigil: bool)

const WAVE_INTERVAL_SEC := 30.0  # 웹 5.5 "30초마다 파도" 그대로
const ENEMY_CAP := 40  # 웹 5.5 "적 상한 40" 그대로
const RUN_LIMIT_SEC := 900.0  # 웹 5.5 "15분 생존" 그대로
const TIER_PER_WAVES := 8  # 웹 5.5 "티어는 파도/8" 그대로
const HP_DMG_MULT_PER_TIER := 0.35  # 부적 던전과 같은 공식, 독립된 숫자(파일 헤더 참고)
const GOLD_PER_SEC := 15  # 직접 정함(파일 헤더 참고)
const SIGIL_MIN_SEC := 600.0  # 웹 5.5 "10분 이상 부적 1" 그대로
const XP_PER_KILL := 1
## "비급" — 영구 효과라 뺀다(파일 헤더 "즉석 3택" 참고).
const EXCLUDED_BOON_KEYS: Array[String] = ["skillpoint"]

var active: bool = false
var wave: int = 0
var elapsed: float = 0.0
var kills: int = 0
var level: int = 1
var xp: int = 0
var run_boons: Dictionary = {}  # key(String) -> count(int), 난입 한정(파일 헤더)

var best_survive_sec: int = 0
var runs: int = 0

var _wave_clock: float = 0.0


func start() -> bool:
	if active:
		return false
	active = true
	wave = 0
	elapsed = 0.0
	_wave_clock = 0.0
	kills = 0
	level = 1
	xp = 0
	run_boons.clear()
	horde_changed.emit()
	return true


## 매 프레임 director(horde_arena.gd)가 부른다. 새 파도가 서야 하면 "wave"를,
## 15분이 다 찼으면 "finished"를, 그 밖엔 ""를 돌려준다.
func tick(delta: float) -> String:
	if not active:
		return ""
	elapsed += delta
	if elapsed >= RUN_LIMIT_SEC:
		return "finished"
	_wave_clock += delta
	if _wave_clock >= WAVE_INTERVAL_SEC:
		_wave_clock -= WAVE_INTERVAL_SEC
		wave += 1
		return "wave"
	return ""


## 웹 5.5 "적 수는 6+2×파도, 상한 40" 그대로.
static func enemy_count_for_wave(w: int) -> int:
	return mini(ENEMY_CAP, 6 + 2 * w)


static func tier_for_wave(w: int) -> int:
	return int(w / float(TIER_PER_WAVES))


static func enemy_stat_mult_for_wave(w: int) -> float:
	return 1.0 + HP_DMG_MULT_PER_TIER * float(tier_for_wave(w))


## 처치 1회 = 경험 1(파일 헤더) — 레벨업했으면 true(호출부가 즉석 3택을 연다).
## 여러 레벨을 한 번에 넘을 수도 있어(잡몹 한 방에 여러 마리) while로 다 턴다.
func register_kill() -> bool:
	if not active:
		return false
	kills += 1
	xp += XP_PER_KILL
	var leveled := false
	while xp >= _xp_need(level):
		xp -= _xp_need(level)
		level += 1
		leveled = true
	return leveled


static func _xp_need(lv: int) -> int:
	return lv * lv * 10


func roll_choice() -> Array[String]:
	return DungeonBoons.roll_choice(run_boons, EXCLUDED_BOON_KEYS)


## "비급"은 애초에 후보 풀에서 빠져 있어(roll_choice의 EXCLUDED_BOON_KEYS)
## allow_skill_grant는 안전하게 false로 고정한다(이중 방어).
func apply_boon(key: String) -> Dictionary:
	var b := DungeonRunState.apply_boon_to(key, run_boons, false)
	if not b.is_empty():
		horde_changed.emit()
	return b


## dungeon_run_state.gd::_sum_eff()가 일곱 번째로 더하는 자리(부적 다음) —
## 난입이 꺼져 있으면 조용히 0(DungeonSigilState.world_eff_sum과 같은 계약).
func world_eff_sum(eff_key: String) -> float:
	if not active:
		return 0.0
	var total := 0.0
	for key in run_boons:
		var b := DungeonBoons.by_key(str(key))
		if not b.is_empty() and b.eff.has(eff_key):
			total += float(b.eff[eff_key]) * int(run_boons[key])
	return total


## director(horde_arena.gd)가 15분 완주 또는 사망 시 부른다 — 보상을 주고
## 상태를 접는다. 이미 꺼져 있으면(중복 호출 방지) 빈 Dictionary.
func finish(survived: bool) -> Dictionary:
	if not active:
		return {}
	active = false
	var gold_reward := int(roundf(elapsed * GOLD_PER_SEC))
	DungeonGoldState.add(gold_reward)
	var got_sigil := false
	if elapsed >= SIGIL_MIN_SEC:
		DungeonSigilState.add_sigil(1)
		got_sigil = true
	best_survive_sec = maxi(best_survive_sec, int(elapsed))
	runs += 1
	horde_ended.emit(survived, elapsed, gold_reward, got_sigil)
	horde_changed.emit()
	return {"gold": gold_reward, "sigil": got_sigil, "elapsed": elapsed}


func restore(saved_best: int, saved_runs: int) -> void:
	best_survive_sec = maxi(0, saved_best)
	runs = maxi(0, saved_runs)
	horde_changed.emit()
