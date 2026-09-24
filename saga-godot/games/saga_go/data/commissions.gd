extends RefCounted

## PLAN 106장 ⑲ — 원신식 일일 의뢰(표·계산만, 상태는 PartyState.commissions).
##   하루(새벽 4시 갈림, 이 기기 지역 시각) 넷 — 풀 열둘에서 날짜 해시로 고른다(종류 다섯 중 넷이 겹치지 않게).
##   종류 다섯: 토벌(적 kind·원소 괴물) · 채집(채집물) · 요리(조리 번수) · 원소 반응(번수) · 둘러보기(자리 반경 안에 들기).
##   하나 끝내면 곧바로 보상(냥 1200·짧은 견문록 2·부대 경험 20), 넷 다 끝내고 마을 역참 옆 의뢰 게시판 4m 안에 서면
##   추가 보상(냥 3000·견문록 1·강화석 2·연마석 2·부대 경험 40). 부대 경험은 옛 부대 레벨(모험 등급 자리)로 간다.
## 이름·수치는 이 판 것.

const PER_DAY := 4
const MAX_SAME_KIND := 1
const RESET_HOUR := 4
const REWARD := {"mora": 1200, "book_s": 2}
const REWARD_EXP := 20.0
const BONUS := {"mora": 3000, "book_m": 1, "ore_m": 2, "polish": 2}
const BONUS_EXP := 40.0
const VISIT_M := 12.0

## id → {kind, name, desc, n, ...}. kind 별 추가 칸: kill target("elemental" = 원소 괴물 아무거나) ·
## gather item · visit region·cell.
const POOL := {
	"k_wolf": {"kind": "kill", "target": "wolf", "n": 3, "name": "늑대 쫓기", "desc": "들판 늑대 셋을 쫓아낸다 (마을 서쪽·남쪽, 포구)"},
	"k_bandit": {"kind": "kill", "target": "bandit", "n": 2, "name": "도적 소탕", "desc": "도적 둘을 물리친다 (마을 동쪽·폐허)"},
	"k_elem": {"kind": "kill", "target": "elemental", "n": 3, "name": "원소 괴물 퇴치", "desc": "원소 방패를 두른 괴물 셋 (포구·폐허)"},
	"g_mint": {"kind": "gather", "item": "mint", "n": 3, "name": "박하 모으기", "desc": "박하 셋 (마을 숲 가장자리)"},
	"g_honey": {"kind": "gather", "item": "honey_flower", "n": 3, "name": "꿀꽃 모으기", "desc": "꿀꽃 셋 (마을 들판·폐허)"},
	"g_clam": {"kind": "gather", "item": "clam", "n": 3, "name": "바지락 캐기", "desc": "바지락 셋 (포구 물가 모래밭)"},
	"g_mush": {"kind": "gather", "item": "mushroom", "n": 2, "name": "송이버섯 따기", "desc": "송이버섯 둘 (마을 북쪽 숲·폐허)"},
	"c_cook": {"kind": "cook", "n": 2, "name": "냄비 밥 짓기", "desc": "신상 옆 냄비에서 요리 두 번"},
	"r_react": {"kind": "react", "n": 6, "name": "원소 수련", "desc": "들판 적에게 원소 반응 여섯 번"},
	"v_fall": {"kind": "visit", "region": "village", "cell": Vector2(8.0, 3.0), "n": 1, "name": "폭포 살피기", "desc": "마을 북동쪽 폭포 둘레를 살펴본다"},
	"v_cave": {"kind": "visit", "region": "village", "cell": Vector2(5.0, 2.0), "n": 1, "name": "굴 어귀 살피기", "desc": "마을 북쪽 굴 어귀에 가 본다"},
	"v_ruin": {"kind": "visit", "region": "ruins", "cell": Vector2(3.0, 5.0), "n": 1, "name": "폐허 남쪽 뜰", "desc": "잿빛 폐허 남쪽 뜰을 둘러본다"},
}
const ORDER := ["k_wolf", "k_bandit", "k_elem", "g_mint", "g_honey", "g_clam", "g_mush", "c_cook", "r_react", "v_fall", "v_cave", "v_ruin"]
const KIND_NAMES := {"kill": "토벌", "gather": "채집", "cook": "요리", "react": "수련", "visit": "둘러보기"}

## 게시판 — 마을 역참 앞 순간이동 지점(waypoints.gd v_station) 곁.
const BOARD_REGION := "village"
const BOARD_CELL := Vector2(5.35, 3.0)
const BOARD_OFFSET := Vector3(-4.0, 0.0, 2.0)
const BOARD_M := 4.0

## 점검이 날짜를 돌릴 때(하루 = 86400).
static var time_offset := 0.0

## 오늘 번호 — 이 기기 지역 시각에서 새벽 4시에 넘어간다.
static func today() -> int:
	var bias_min := int(Time.get_time_zone_from_system().get("bias", 0))
	var t := Time.get_unix_time_from_system() + time_offset + bias_min * 60.0 - RESET_HOUR * 3600.0
	return floori(t / 86400.0)

static func _h(day: int, id: String) -> int:
	var h := day * 2654435 + 12345
	for i in id.length():
		h = (h * 31 + id.unicode_at(i)) & 0x7fffffff
	return h

## 그날 의뢰 넷(id). 날짜 해시 차례로, 같은 종류는 MAX_SAME_KIND 까지.
static func roll(day: int) -> Array[String]:
	var ids: Array = ORDER.duplicate()
	ids.sort_custom(func(a: String, b: String) -> bool: return _h(day, a) < _h(day, b))
	var out: Array[String] = []
	var kinds := {}
	for id in ids:
		var k: String = POOL[id].kind
		if int(kinds.get(k, 0)) >= MAX_SAME_KIND:
			continue
		kinds[k] = int(kinds.get(k, 0)) + 1
		out.append(id)
		if out.size() >= PER_DAY:
			break
	return out
