extends RefCounted
class_name DungeonBoons

## VERTICAL_SLICE_DUNGEON.md "제외" 목록 1번(은사) 착수. 웹판
## `saga-dungeon/js/data-dungeon.js`의 BOONS를 key·name·emoji·max·desc·eff
## 상수 하나 안 바꾸고 그대로 옮겼다(루트 CLAUDE.md "새로 설계하지 않는다").
## eff의 각 키가 뭘 하는지는 dungeon_run_state.gd가 실제로 읽어 적용한다 —
## 이 파일은 데이터만 들고 있는다(웹판 data-dungeon.js와 같은 경계).

const BOONS: Array[Dictionary] = [
	{ "key": "fury", "name": "맹공(猛攻)", "emoji": "⚔️", "max": 5,
		"desc": "공격력 +18%", "eff": { "atkPct": 18.0 } },
	{ "key": "wall", "name": "철벽(鐵壁)", "emoji": "🛡️", "max": 5,
		"desc": "최대 체력 +20% · 즉시 그만큼 회복", "eff": { "hpPct": 20.0, "healOnPick": 20.0 } },
	{ "key": "haste", "name": "연격(連擊)", "emoji": "💨", "max": 4,
		"desc": "공격 속도 +14%", "eff": { "atkSpdPct": 14.0 } },
	{ "key": "dash", "name": "질주(疾走)", "emoji": "🏃", "max": 3,
		"desc": "이동 속도 +16%", "eff": { "moveSpdPct": 16.0 } },
	{ "key": "pierce", "name": "관통(貫通)", "emoji": "🗡️", "max": 4,
		"desc": "적 방어를 25% 무시", "eff": { "piercePct": 25.0 } },
	{ "key": "drain", "name": "흡혈(吸血)", "emoji": "🩸", "max": 4,
		"desc": "적을 잡으면 체력 3% 회복", "eff": { "drainPct": 3.0 } },
	{ "key": "crit", "name": "일격(一擊)", "emoji": "✨", "max": 5,
		"desc": "치명타 확률 +8%", "eff": { "critPct": 8.0 } },
	{ "key": "reach", "name": "장병(長兵)", "emoji": "📏", "max": 3,
		"desc": "공격 사거리 +18%", "eff": { "reachPct": 18.0 } },
	{ "key": "greed", "name": "재물운(財)", "emoji": "🪙", "max": 4,
		"desc": "던전에서 얻는 금 +30%", "eff": { "goldPct": 30.0 } },
	{ "key": "eye", "name": "탐색안(眼)", "emoji": "🔎", "max": 4,
		"desc": "좋은 물건이 나올 확률 +20%", "eff": { "worldFindPct": 20.0 } },
	{ "key": "mend", "name": "회복술(治)", "emoji": "🌿", "max": 3,
		"desc": "층에 들어설 때 체력 25% 회복", "eff": { "healOnFloor": 25.0 } },
	{ "key": "ghost", "name": "분신(分身)", "emoji": "👥", "max": 3,
		"desc": "공격 시 22% 확률로 한 번 더", "eff": { "echoPct": 22.0 } },
	{ "key": "ward", "name": "수호부(符)", "emoji": "🧿", "max": 3,
		"desc": "받는 피해 -12%", "eff": { "guardPct": 12.0 } },
	{ "key": "scout", "name": "척후(斥候)", "emoji": "🗺️", "max": 2,
		"desc": "방을 들어서면 그 방이 바로 밝아진다", "eff": { "reveal": 1.0 } },
]


static func by_key(k: String) -> Dictionary:
	for b: Dictionary in BOONS:
		if b.key == k:
			return b
	return {}
