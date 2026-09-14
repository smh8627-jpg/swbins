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
## (`s_wave`, 기(氣) 결 bolt)이 passive가 아니다 — 그래도 함께 옮긴
## 이유: 앞 단에 1점이 있어야 다음 단이 열리는 원작 규칙(`prereq_of()`)
## 을 지키려면 row 0이 있어야 row 1(`s_wit`)이 열린다. `s_wave`에 점을
## 넣어도 지금은 **아무 효과가 없다**(bolt 투사체 자체가 없다) — 값을
## 지어내지 않고 원작 그대로 둔 것뿐, 다음에 활성 무예(bolt 등)를 옮길
## 때 그대로 쓰면 된다.
##
## **eff 키 중 이번에 실제로 반영되는 것**: critPct·reachPct·atkSpdPct·
## hpPct·atkPct·drainPct·guardPct — 전부 `dungeon_run_state.gd`가 이미
## 소비 중이다(위 헤더 참고). **반영 안 되는 것(시스템이 아직 없다)**:
## mpRegen(기력 자체가 없다)·skillPct(무예 위력 배율 — 활성 무예 자체가
## 없다)·allResPct(원소 저항 합산 자리, `dungeon_equipment_state.gd
## elem_resist()`가 이미 있지만 "전체 결" 합산 채널은 없다). 데이터는
## 그대로 두고(다음에 채널이 생기면 그때 잇는다), 이 셋에 점을 넣어도
## 지금은 조용히 아무 효과가 없다 — dungeon_run_state.gd 헤더의
## "goldPct(경제 시스템 없음)"과 같은 결의 판단이다.

const MAX_RANK := 5

const SKILLS: Array[Dictionary] = [
	## 궁장(弓將) br=2 — data-skill.js 그대로.
	{ "key": "a_eye", "cls": "archer", "br": 2, "row": 0, "name": "매의 눈(鷹眼)",
		"eff": "critPct", "v": 4.0, "grow": 3.0, "desc": "치명타 확률이 오른다." },
	{ "key": "a_reach", "cls": "archer", "br": 2, "row": 1, "name": "장궁(長弓)",
		"eff": "reachPct", "v": 8.0, "grow": 6.0, "desc": "닿는 거리가 길어진다." },
	{ "key": "a_swift", "cls": "archer", "br": 2, "row": 2, "name": "질보(疾步)",
		"eff": "atkSpdPct", "v": 6.0, "grow": 4.0, "desc": "손이 빨라진다." },
	## 무장(武將) br=2 — data-skill.js 그대로.
	{ "key": "w_tough", "cls": "warrior", "br": 2, "row": 0, "name": "단련(鍛鍊)",
		"eff": "hpPct", "v": 8.0, "grow": 5.0, "desc": "부대 체력이 오른다." },
	{ "key": "w_mastery", "cls": "warrior", "br": 2, "row": 1, "name": "병기술(兵器術)",
		"eff": "atkPct", "v": 7.0, "grow": 5.0, "desc": "부대 공격력이 오른다." },
	{ "key": "w_second", "cls": "warrior", "br": 2, "row": 2, "name": "이혼대법(離魂)",
		"eff": "drainPct", "v": 2.0, "grow": 1.0, "desc": "적을 잡으면 체력이 조금 돌아온다." },
	## 책사(策士) br=2 — row 0(s_wave)만 passive가 아니다(위 헤더 참고).
	{ "key": "s_wave", "cls": "scholar", "br": 2, "row": 0, "name": "기공파(氣功波)",
		"eff": "", "v": 2.2, "grow": 0.5, "desc": "꿰뚫는 기를 쏜다.(아직 투사체 없음 — 값만 보존)" },
	{ "key": "s_wit", "cls": "scholar", "br": 2, "row": 1, "name": "명민(明敏)",
		"eff": "mpRegen", "v": 2.0, "grow": 1.4, "desc": "기력이 빨리 찬다.(아직 기력 없음)" },
	{ "key": "s_focus", "cls": "scholar", "br": 2, "row": 2, "name": "집중(集中)",
		"eff": "skillPct", "v": 10.0, "grow": 7.0, "desc": "무예의 위력이 오른다.(아직 활성 무예 없음)" },
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
		"eff": "skillPct", "v": 8.0, "grow": 6.0, "desc": "무예의 위력이 오른다.(아직 활성 무예 없음)" },
	{ "key": "y_spirit", "cls": "mystic", "br": 2, "row": 2, "name": "정신(精神)",
		"eff": "mpRegen", "v": 2.0, "grow": 1.2, "desc": "기력이 빨리 찬다.(아직 기력 없음)" },
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
