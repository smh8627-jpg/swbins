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

const MAX_RANK := 5

const SKILLS: Array[Dictionary] = [
	## 궁장(弓將) br=2 — data-skill.js 그대로.
	{ "key": "a_eye", "cls": "archer", "br": 2, "row": 0, "name": "매의 눈(鷹眼)",
		"eff": "critPct", "v": 4.0, "grow": 3.0, "desc": "치명타 확률이 오른다." },
	{ "key": "a_reach", "cls": "archer", "br": 2, "row": 1, "name": "장궁(長弓)",
		"eff": "reachPct", "v": 8.0, "grow": 6.0, "desc": "닿는 거리가 길어진다." },
	{ "key": "a_swift", "cls": "archer", "br": 2, "row": 2, "name": "질보(疾步)",
		"eff": "atkSpdPct", "v": 6.0, "grow": 4.0, "desc": "손이 빨라진다." },
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
