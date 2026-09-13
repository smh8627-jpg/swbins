extends RefCounted

## VERTICAL_SLICE_REALM.md 4절 "제외" — 승진/관직 5단(2026-09-14, "묻지말고
## 순서대로 다 진행해"로 이어감). `saga-web/saga-realm/js/hero.js`
## (MAX_LV·MAX_RANK·LV_STEP·RANK_STEP·expNeed·growMul)와 `officer.js`
## (EXP·promoteCost·RANK_KOR)를 그대로 옮겼다 — 새 판정식을 상상하지 않는다.
##
## **재해석 — EXP 종류를 이 슬라이스에 있는 시스템만큼만 옮긴다.** 원작
## officer.js EXP는 order/march/siege/win/duel/gov 여섯 가지다. 이 중
## siege(진을 치고 버팀, 진영 시스템 없음)·duel(일기토 없음)은 realm_war.gd
## 머리말이 이미 "진영 시스템이 없다"고 적어 둔 것과 같은 이유로 뺀다.
## order·gov·march·win 넷만 옮긴다(전부 realm_save_state.gd에 이미 있는
## 명령·태수·출진·함락 자리).

const MAX_LV := 30
const MAX_RANK := 5

const LV_STEP := 0.022      # 레벨 1당 능력치 +2.2%
const RANK_STEP := 0.06     # 승급 1단당 능력치 +6%

const RANK_KOR := ["무관(無官)", "교위(校尉)", "중랑장(中郞將)", "장군(將軍)",
	"대장군(大將軍)", "도독(都督)"]

## 120개월을 굴리면 무장이 Lv.8~12 언저리에 선다 — officer.js 머리말 그대로.
const EXP := {"order": 4, "gov": 2, "march": 12, "win": 20}


static func exp_need(lv: int) -> int:
	return roundi(28.0 * pow(1.22, float(lv - 1)))


## 성장 배율 (레벨 + 승급) — hero.js growMul() 그대로.
static func grow_mul(lv: int, rank: int) -> float:
	return (1.0 + float(lv - 1) * LV_STEP) * (1.0 + float(rank) * RANK_STEP)


static func rank_name(rank: int) -> String:
	return RANK_KOR[rank] if rank >= 0 and rank < RANK_KOR.size() else RANK_KOR[0]


## 승진에 드는 공과 금 — 올라갈수록 가파르다. officer.js promoteCost() 그대로.
static func promote_cost(rank: int) -> Dictionary:
	return {"feats": 20 + rank * 20, "gold": 300 + rank * 300}
