extends RefCounted
class_name DungeonSkills

## PLAN.md 51장 "장비→빌드" — 11·12장(장비 8부위)이 끝난 뒤 남은 마지막
## 갈래. 웹판 `data-skill.js`는 직업 다섯 × 여덟 갈래 × 세 단 = 120개
## 무예를 갖고 있지만, 그중 실제로 **전투 코드가 없어도(투사체·소환·
## 범위 판정을 새로 안 짜도) 이 슬라이스에 바로 꽂히는 것은 `shape:
## 'passive'` 열넷뿐**이다 — `dungeon_run_state.gd::_sum_eff()`가 이미
## boons(은사)·장비·부대 세 갈래를 world eff 키(atkPct·hpPct·critPct·
## reachPct·atkSpdPct·drainPct·guardPct 등) 하나로 합산해 melee_attack.gd·
## player_health.gd가 그대로 소비하고 있다 — 여기에 "무예로 얻은 랭크"
## 라는 **네 번째 자리**만 얹으면 새 시스템(투사체·소환·쿨타임 UI 등)
## 없이도 실제 전투에 즉시 반영된다.
##
## **직업(cls) 표는 새로 안 만든다** — dungeon_items.gd의
## `class_key_for_weapon()`/`CLASS_NAMES`(무기 look → 직업)를 그대로
## 쓴다(원작도 같은 표를 두 파일이 나눠 쓴다, data-skill.js WEAPON_CLASS
## == data-item.js 없음, dungeon_items.gd가 이미 이 슬라이스의 유일한
## 소스). 이 파일은 SKILLS 표 하나만 갖는다.
##
## 궁장(archer)·무장(warrior)·도독(marshal)·방사(mystic)는 br=2 세 단
## (row 0~2)이 전부 passive라 그대로 옮겼다. 책사(scholar)만 br=2 row 0
## (`s_wave`, 기(氣) 결 bolt)이 passive가 아니었다.
## **2026-09-14, 같은 날 이어서 — 첫 활성 무예로 옮겼다**(`games/
## saga_dungeon/player/skill_bolt.gd` 참고). 진짜 투사체(속도 330, 최대
## 1.5초 생존) 대신 "가장 가까운 적 하나를 즉시 맞히는" 히트스캔으로
## 근사했다 — 우물이 원작 미니게임을 즉시 회복으로 근사한 것과 같은 결의
## 판단. `shape`·`cd`·`el` 세 필드를 이때 채워 넣었다(원작 값 그대로,
## 지어내지 않음). `s_focus`·`y_hex`가 쌓아 온 `skillPct`도 이걸로 처음
## 실제 소비된다(`DungeonRunState.skill_mul()`).
##
## **eff 키 중 반영되는 것**: critPct·reachPct·atkSpdPct·hpPct·atkPct·
## drainPct·guardPct — 전부 `dungeon_run_state.gd`가 이미 소비 중이다
## (위 헤더 참고). skillPct는 world eff 합산이 아니라 skill_bolt.gd가
## `DungeonRunState.skill_mul()`로 직접 소비한다(passive들과 다른 자리 —
## "무예 위력 배율"은 무예 데미지에만 곱해야지 은사/장비의 다른 수치에
## 섞이면 안 된다). **아직 반영 안 되는 것(시스템이 없다)**: mpRegen
## (기력 자체가 없다)·allResPct(원소 저항 합산 자리, `dungeon_equipment_
## state.gd elem_resist()`가 이미 있지만 "전체 결" 합산 채널은 없다).
## 데이터는 그대로 두고(다음에 채널이 생기면 그때 잇는다), 이 둘에 점을
## 넣어도 지금은 조용히 아무 효과가 없다 — dungeon_run_state.gd 헤더의
## "goldPct(경제 시스템 없음)"과 같은 결의 판단이다.
##
## **2026-09-14, 또 이어서 — 무장(warrior) br=0 row=0 `w_whirl`(회전참,
## shape:'swing') 추가**(`games/saga_dungeon/player/skill_whirl.gd` 참고).
## bolt(가장 가까운 적 하나)와 달리 swing은 자기 둘레 반경(`sk.r`×reach_
## mult()) 안의 적 **전부**를 때린다 — 새 반경 판정이지만 투사체·소환보다
## 훨씬 작은 몫이라 다음으로 골랐다. 원작의 넉백(`kb:30`)은 이 슬라이스에
## 넉백 자체가 없어(melee_attack.gd도 안 한다) 값만 보존하고 안 쓴다.
##
## **2026-09-15, 이어서 — 방사(mystic) br=5 row=0 `y_thunderdoom`(뇌쇄,
## shape:'nova') 추가**(`games/saga_dungeon/player/skill_nova.gd` 참고).
## 방사는 여태 br=2 세 단(passive)뿐이라 이걸로 첫 활성 무예를 얻는다
## (bolt→scholar, swing→warrior, 이제 nova→mystic). swing과 판정은 같지만
## (둘레 반경 안 전부) **reach_mult()를 안 곱한다** — 원작 dungeon.js
## `applyShapeSkill()`의 'nova'는 `sk.r`을 그대로 반경으로 쓰지 swing처럼
## `reachOf()`를 곱하지 않는다(코드 그대로). 다만 원작 `sk.r`(130)은
## `reachOf()`에 곱해질 걸 전제 안 한 **원시 픽셀** 값이라 swing의 `sk.r`
## (1.7~3.2, 이미 미터로 쓸 만한 크기)과 자릿수가 다르다 — 그대로 미터로
## 쓰면 방 절반(6m)의 곱절이 넘는다. swing 포팅이 "웹 `sk.r`를 그대로
## 미터로 쓴다"고 정한 선례를 지키려면 두 무예의 **원작 반경 비율**부터
## 맞춰야 한다: 웹에서 실제 반경은 swing이 `reachOf()×sk.r`(예: w_whirl
## 34×2.3=78.2px), nova는 `sk.r`(130px) 그대로 — 즉 nova의 원시 `sk.r`은
## `reachOf()`의 기준값 `BASE_REACH`(34px)만큼 "이미 스케일업"돼 있다.
## 그래서 여기서는 `sk.r`을 그 34로 나눠(130/34=3.82) swing과 같은
## 자릿수로 되돌린 값을 미터로 쓴다 — 결과 비율(3.82/2.3=1.66)이 웹의
## 실제 반경 비율(130/78.2=1.66)과 정확히 같다(같은 판단의 연장, 새
## 임의 상수 아님). **아직 반영 안 되는 것**: `el`(lit, 원소 저항은
## `melee_attack.gd`가 아니라 무예 자체가 직접 계산한다, skill_bolt.gd와
## 같은 경계).
##
## **2026-09-15, 또 이어서 — 궁장(archer) br=5 row=0 `a_dashshot`(질주사,
## shape:'dash') 추가**(`games/saga_dungeon/player/skill_dash.gd` 참고).
## 궁장은 여태 br=2 세 단(passive)뿐이라 넷째 직업이 첫 활성 무예를 얻는다.
## bolt·swing·nova는 "제자리에서 판정"이지만 dash는 **그 자리에서 짧게
## 돌진하며 지나는 적을 벤다** — 처음으로 플레이어 위치 자체를 옮기는
## 무예라 `player.gd`(GO와 공유)에 아주 작은 훅 둘(`dash_dir`·`dash_speed`)
## 을 추가했다: 0이 아니면 그 프레임 이동 입력을 무시하고 그 방향/속력으로
## `move_and_slide()`한다 — boon_speed_sync.gd가 `speed_mult`를 미는 것과
## 같은 결의 일방 통행(하위 호환: 기본값 0이라 GO는 아무 영향 없다).
## `player.gd`는 여전히 `DungeonRunState`를 모른다. **실측으로 고친 것** —
## 처음엔 `velocity`+`move_and_slide()`로 옮겼더니 적(CharacterBody3D)과
## 몸통이 부딪혀 옆으로 밀려났다(검증 스크립트가 사거리 밖 적까지 맞히는
## 걸로 드러남). 원작 dungeon.js 돌진도 `p.x`/`p.y`를 충돌 없이 직접
## 더할 뿐이라, `player.gd`의 돌진 분기는 `global_position`을 직접
## 옮기고 그 프레임 `move_and_slide()`(와 중력)를 건너뛴다.
##
## **2026-09-15, 또 이어서 — 도독(marshal) br=0 row=0 `m_rally`(사기,
## shape:'buff') 추가**(`games/saga_dungeon/player/skill_buff.gd` 참고).
## 이걸로 다섯 직업 전부 활성 무예를 하나씩 갖는다(bolt·swing·nova·dash·
## buff). buff는 처음으로 **한동안**(sec초) 효과가 붙는 무예라 —
## `dungeon_run_state.gd`에 `_temp_buffs`(잠깐짜리 world eff, 다섯 번째
## 합산 자리) 신규. 원작 dungeon.js `addBuff()`/`boonVal()` 그대로: 값과
## 만료 시각만 들고 있다가 `_sum_eff()`가 조회 시점에 안 끝났으면 더한다
## (틱 타이머로 안 지운다 — 굳이 지울 필요가 없다, 만료된 항목은 그냥
## 조용히 안 더해질 뿐이고 다음에 같은 eff로 다시 buff를 걸면 덮어 쓴다).
## 세이브에는 안 남는다(원작 주석 "잠깐짜리 무예·분신은 회차 안에서만
## 산다" 그대로).
##
## **속도 환산** — dash는 "반경"이 아니라 "이동"이라 `BASE_REACH`가 아니라
## `BASE_SPD`(148px/s, 원작 이동속도 기준값)를 기준으로 삼는다. `player.gd`
## 의 `WALK_SPEED`(6.0m/s)가 그 Godot 쪽 짝이므로, 원작 돌진 속도(620px/s,
## dungeon.js 하드코딩값)를 `620×(6.0/148)≈25.14`m/s로 옮긴다. 지속시간은
## 원작 `0.2×(sk.far||1)`초 그대로(a_dashshot은 far 없음 → 0.2초) — 즉
## 한 번에 약 5m를 돌진한다. 지나는 적 판정 반경("de.r+P_R+6", 몬스터별
## 픽셀 반지름)은 이 슬라이스에 몬스터 개별 충돌 반지름을 안 두므로(swing·
## nova도 마찬가지) 새 상수를 안 만들고 `melee_attack.gd`의 `ATK_RANGE`
## (2.4m)를 그대로 재사용한다("스쳐 지나가며 벤다"는 접촉 판정이라 평타
## 사거리와 같은 성격). 원작의 무적(`p.invuln`)은 이 슬라이스에 회피·
## 무적 시스템 자체가 없어(`combat_dodge` 입력 액션도 아직 아무 데도
## 안 걸려 있다) 값만 흘리고 안 쓴다 — kb·mpRegen과 같은 결의 판단.

const MAX_RANK := 5

const SKILLS: Array[Dictionary] = [
	## 궁장(弓將) br=2 — data-skill.js 그대로.
	{ "key": "a_eye", "cls": "archer", "br": 2, "row": 0, "name": "매의 눈(鷹眼)",
		"eff": "critPct", "v": 4.0, "grow": 3.0, "desc": "치명타 확률이 오른다." },
	{ "key": "a_reach", "cls": "archer", "br": 2, "row": 1, "name": "장궁(長弓)",
		"eff": "reachPct", "v": 8.0, "grow": 6.0, "desc": "닿는 거리가 길어진다." },
	{ "key": "a_swift", "cls": "archer", "br": 2, "row": 2, "name": "질보(疾步)",
		"eff": "atkSpdPct", "v": 6.0, "grow": 4.0, "desc": "손이 빨라진다." },
	## 궁장(弓將) br=5 row 0 — data-skill.js 그대로(cost=18은 기력이 없어
	## 안 씀). el 없음(물리) — 위 헤더의 dash 환산 참고.
	{ "key": "a_dashshot", "cls": "archer", "br": 5, "row": 0, "name": "질주사(疾走射)",
		"shape": "dash", "cd": 6.0,
		"eff": "", "v": 1.3, "grow": 0.3, "desc": "몸을 날려 스치며 벤다." },
	## 무장(武將) br=0 row 0 — data-skill.js 그대로. shape/cd는 원작 값
	## 그대로(cost=22는 기력이 없어 안 씀, kb=30은 넉백이 없어 안 씀).
	{ "key": "w_whirl", "cls": "warrior", "br": 0, "row": 0, "name": "회전참(回轉斬)",
		"shape": "swing", "cd": 5.0, "r": 2.3,
		"eff": "", "v": 1.7, "grow": 0.35, "desc": "둘레의 모든 적을 벤다." },
	## 무장(武將) br=2 — data-skill.js 그대로.
	{ "key": "w_tough", "cls": "warrior", "br": 2, "row": 0, "name": "단련(鍛鍊)",
		"eff": "hpPct", "v": 8.0, "grow": 5.0, "desc": "부대 체력이 오른다." },
	{ "key": "w_mastery", "cls": "warrior", "br": 2, "row": 1, "name": "병기술(兵器術)",
		"eff": "atkPct", "v": 7.0, "grow": 5.0, "desc": "부대 공격력이 오른다." },
	{ "key": "w_second", "cls": "warrior", "br": 2, "row": 2, "name": "이혼대법(離魂)",
		"eff": "drainPct", "v": 2.0, "grow": 1.0, "desc": "적을 잡으면 체력이 조금 돌아온다." },
	## 책사(策士) br=2 — row 0(s_wave)만 passive가 아니다(위 헤더 참고).
	## shape/cd/el은 data-skill.js 그대로(cost=30은 기력이 없어 안 씀).
	{ "key": "s_wave", "cls": "scholar", "br": 2, "row": 0, "name": "기공파(氣功波)",
		"shape": "bolt", "cd": 8.0, "el": "chi",
		"eff": "", "v": 2.2, "grow": 0.5, "desc": "꿰뚫는 기를 쏜다." },
	{ "key": "s_wit", "cls": "scholar", "br": 2, "row": 1, "name": "명민(明敏)",
		"eff": "mpRegen", "v": 2.0, "grow": 1.4, "desc": "기력이 빨리 찬다.(아직 기력 없음)" },
	{ "key": "s_focus", "cls": "scholar", "br": 2, "row": 2, "name": "집중(集中)",
		"eff": "skillPct", "v": 10.0, "grow": 7.0, "desc": "무예의 위력이 오른다." },
	## 도독(都督) br=0 row 0 — data-skill.js 그대로(cost=34는 기력이 없어
	## 안 씀). sec(지속초)은 랭크와 무관하게 고정(원작 그대로) — v(위력)만
	## value_at()으로 랭크에 따라 는다. **`eff`를 비워 둔 이유** — 다른
	## shape 무예(bolt·swing·nova·dash)와 같은 이유다: `eff`를 채우면
	## `dungeon_skill_state.gd::world_eff_sum()`이 "랭크만 있으면 늘
	## 더하는 패시브"로 착각해 버프가 안 걸려 있어도 영구히 atkSpdPct가
	## 오른다. 실제로 버프할 자리는 `buff_eff`라는 별도 필드에 둔다
	## (skill_buff.gd가 캐스팅 순간에만 이 값을 읽어 `DungeonRunState.
	## add_temp_buff()`로 넘긴다 — 랭크 합산과 완전히 분리된 경로).
	{ "key": "m_rally", "cls": "marshal", "br": 0, "row": 0, "name": "사기(士氣)",
		"shape": "buff", "cd": 16.0, "sec": 6.0, "buff_eff": "atkSpdPct",
		"eff": "", "v": 30.0, "grow": 8.0, "desc": "한동안 손과 발이 빨라진다." },
	## 도독(都督) br=2 — data-skill.js 그대로.
	{ "key": "m_res", "cls": "marshal", "br": 2, "row": 0, "name": "기수련(氣修)",
		"eff": "allResPct", "v": 5.0, "grow": 4.0, "desc": "모든 결의 저항이 오른다.(아직 합산 채널 없음)" },
	{ "key": "m_wall", "cls": "marshal", "br": 2, "row": 1, "name": "철벽(鐵壁)",
		"eff": "guardPct", "v": 4.0, "grow": 3.0, "desc": "받는 피해가 늘 조금 준다." },
	{ "key": "m_lead", "cls": "marshal", "br": 2, "row": 2, "name": "통솔(統率)",
		"eff": "hpPct", "v": 6.0, "grow": 4.0, "desc": "부대 체력이 오른다." },
	## 방사(方士) br=2 — data-skill.js 그대로.
	{ "key": "y_leech", "cls": "mystic", "br": 2, "row": 0, "name": "흡정(吸精)",
		"eff": "drainPct", "v": 2.0, "grow": 1.5, "desc": "적을 잡으면 체력이 돌아온다." },
	{ "key": "y_hex", "cls": "mystic", "br": 2, "row": 1, "name": "주술(呪術)",
		"eff": "skillPct", "v": 8.0, "grow": 6.0, "desc": "무예의 위력이 오른다." },
	{ "key": "y_spirit", "cls": "mystic", "br": 2, "row": 2, "name": "정신(精神)",
		"eff": "mpRegen", "v": 2.0, "grow": 1.2, "desc": "기력이 빨리 찬다.(아직 기력 없음)" },
	## 방사(方士) br=5 row 0 — data-skill.js 그대로(cost=30은 기력이 없어
	## 안 씀). r=3.82는 원작 130px÷BASE_REACH(34px) — 위 헤더 참고.
	{ "key": "y_thunderdoom", "cls": "mystic", "br": 5, "row": 0, "name": "뇌쇄(雷殺)",
		"shape": "nova", "cd": 9.0, "r": 3.82, "el": "lit",
		"eff": "", "v": 2.2, "grow": 0.5, "desc": "벼락이 둘레에 떨어진다." },
]


static func skill_by_key(k: String) -> Dictionary:
	for s: Dictionary in SKILLS:
		if s.key == k:
			return s
	return {}


static func skills_of(cls_key: String) -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	for s: Dictionary in SKILLS:
		if s.cls == cls_key:
			out.append(s)
	return out


## data-skill.js valueAt() 그대로 — 0단이면 0, 그 뒤론 v + grow*(rank-1).
static func value_at(sk: Dictionary, rank: int) -> float:
	if rank <= 0:
		return 0.0
	return float(sk.v) + float(sk.grow) * float(rank - 1)


## data-skill.js prereqOf() 그대로 — row 0은 조건 없음(null). row>0은
## 같은 갈래(cls+br)의 바로 앞 단(row-1)에 1점이 있어야 한다.
static func prereq_of(sk: Dictionary) -> Dictionary:
	if int(sk.row) == 0:
		return {}
	for s: Dictionary in skills_of(str(sk.cls)):
		if int(s.br) == int(sk.br) and int(s.row) == int(sk.row) - 1:
			return s
	return {}
