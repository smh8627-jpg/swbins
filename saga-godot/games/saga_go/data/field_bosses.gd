extends RefCounted

## PLAN 106장 ㉓ — 원신식 들판 보스(세계에 서 있는 보스) 규칙. 진행은 world/field_bosses.gd, 저장은 없다
## (불러오면 셋 다 서 있다 — 원신도 들판 보스는 늘 다시 선다. 원기만 PartyState.resin 으로 남는다).
##   셋 — 마을 동쪽 숲 가장자리 돌개바람 수리왕(풍) · 포구 동쪽 모래밭 물마루 거북왕(수) · 폐허 동쪽 뜰 잿불 도깨비왕(화).
##   몸·패턴은 주간 보스 틀(combat/field_boss.gd): 내려찍기·먹구름 벼락·물기, 체력 절반에서 보스 원소 방패.
##   세계 등급을 받는다(field_enemy.apply_world_level — 들판 적과 같은 배율·Lv 표시).
##   쓰러뜨리면 그 자리에 보상 꽃 — 3m 안에서 F(터치 "보상" 단추)로 원기 40 을 쓰고 받는다(모자라면 꽃이 남는다).
##   받으면 RESPAWN_SEC 뒤 보스가 다시 선다. 받지 않으면 꽃도, 쓰러진 보스도 그대로.
##   보상 = 그 보스 재료(인물 돌파 2 단계부터, growth.gd boss_of) + 보스 원소 결정 + 냥 + 짧은 견문록 + ★4 성유물 하나
##   + 부대 경험 — 세계 등급만큼 불린다(adventure.gd scale_loot: 냥 +25%·그 밖 3 단계마다 +1).
## 이름·수치는 이 판 것.

const Adventure := preload("res://games/saga_go/data/adventure.gd")
const Growth := preload("res://games/saga_go/data/growth.gd")

const RESIN_COST := 40
const CLAIM_M := 3.0
const RESPAWN_SEC := 150.0
const ENGAGE_M := 30.0 # 이 안에서 보스가 싸우는 중이면 화면 위에 보스 막대
const REWARD_EXP := 30.0

## kind 는 field_enemy.gd KINDS 칸, cell 은 글자 지도 칸(가운데 = 정수). 자리는 상자·무리·지점·별조각·비경 입구·사건 칸과
## 1칸(48m)+ 떨어지고 반경 12m 가 평평한 곳(2026-09-24 height_at 표본으로 골랐다).
const BOSSES := {
	"gale_roc": {"kind": "gale_roc", "region": "village", "cell": Vector2(10.0, 3.5), "mat": "gale_plume",
		"reward": {"mora": 1800, "gale_plume": 2, "crystal_wind": 1, "book_s": 2}},
	"tide_turtle": {"kind": "tide_turtle", "region": "coast", "cell": Vector2(7.0, 6.5), "mat": "tide_pearl",
		"reward": {"mora": 1800, "tide_pearl": 2, "crystal_water": 1, "book_s": 2}},
	"ember_king": {"kind": "ember_king", "region": "ruins", "cell": Vector2(5.0, 4.0), "mat": "ember_horn",
		"reward": {"mora": 1800, "ember_horn": 2, "crystal_fire": 1, "book_s": 2}},
}
const ORDER := ["gale_roc", "tide_turtle", "ember_king"]

static func reward_of(id: String, wl: int) -> Dictionary:
	return Adventure.scale_loot(BOSSES[id].reward, wl)

## 보상 한 줄(표시).
static func reward_text(id: String, wl: int) -> String:
	var r := reward_of(id, wl)
	var parts: Array[String] = []
	for item in r:
		parts.append("%s %d" % [Growth.item_name(item), int(r[item])])
	parts.append("★4 성유물 1")
	return " · ".join(parts)
