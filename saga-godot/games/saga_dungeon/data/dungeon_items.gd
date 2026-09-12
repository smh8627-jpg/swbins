extends RefCounted
class_name DungeonItems

## "제외" 목록 3번(장비 등급+접사) — 웹판 `saga-dungeon/js/data-item.js`·
## `item.js`의 등급(TIERS)·접사(AFFIXES) 표와 굴림 공식(`roll()`)을 값 하나
## 안 바꾸고 옮겼다.
##
## "제외" 목록 2번(소켓+부문어·투장·내구) — `data-gem.js`의 RUNES·WORDS,
## `data-set.js`의 SETS(스킬 필드는 제외 — 무예/핫바 시스템이 아직 없다),
## `item.js`의 rollSockets()·내구 공식을 여기 이어 옮겼다. **감정(미확인)·
## 고유(유니크)·가방/창고**는 여전히 이 슬라이스 밖이다.
##
## "제외" 목록 4번(원소 6결+저항) — `data-elem.js`의 ELEMENTS·`data-gem.js`의
## GRADES·GEMS·JEWEL_*를 여기 이어 옮겼다(아래 ELEMENTS 블록부터). 갑주
## 슬롯이 없어 보석(GEMS)의 armor 자리(원소 저항)는 안 닿지만, 데이터는
## 원작 그대로 셋(weapon/armor/charm) 다 옮겨 뒀다 — 주옥(珠玉)은 부위를
## 안 가려 우리 무기·부적 소켓에도 저항이 그대로 붙는다.
##
## BASES는 원본 31종 중 **무기 10종 + 부적(charm) 5종**만 옮겼다(갑주·
## 투구·장갑·신발·목걸이·반지는 여전히 뺐다 — 방어력·기질 스탯 자체가
## 없어 걸칠 자리가 없다). 부적을 새로 더한 이유는 투장(세트)이 최소
## 두 부위를 동시에 걸쳐야 뜻이 생기는데(data-set.js "한 벌은 셋(무기·
## 갑주·부적)이다"), 우리는 갑주가 없어 **무기+부적 두 점**으로 세트의
## "2점" 문턱까지만 시험할 수 있다 — 3점(무기+갑주+부적) 완성은 갑주
## 슬롯이 생겨야 가능하다(그때까지 세트 10벌 중 갑주만 걸치는 조각이
## 낀 것들은 계속 미완성으로 남는다 — 새 세트를 상상해 채우지 않는다).
##
## "제외" 목록 3번(행상/투전/연단·단약/요대·감정·창고) — `vendor.js`의
## 투전(GAMBLE_W) 표·`item.js`의 값어치(price)·수리 공식, **감정(unid)**을
## 여기 이어 옮겼다. 감정은 원작과 다르게 지킨다: 원작은 "미확인은 장착
## 자체가 안 된다"(가방에 넣어 두고 감정서를 쓸 때까지 기다린다)인데, 이
## 슬라이스엔 가방이 없어 주우면 무조건 즉시 장착된다는 원칙이 이미
## 있었다 — 그 원칙과 충돌하지 않게 **미확인이어도 그대로 장착되지만
## 이름·옵션 표시만 잠근다**("《무엇을 손에 쥐었는지는 알지만 옵션은
## 감정해야 보인다》"). 능력치 자체는 그대로 적용된다(원작처럼 완전히
## 막지 않는다) — 대신 감정 전엔 **무엇이 붙었는지 모른 채** 쓰는 셈이라
## "감정해서 확인하고 싶다"는 동기만은 살아 있다. 창고(倉庫)는 여전히
## 이 슬라이스 밖 — 지킬 가방/인벤토리 자체가 없다(창고는 "가방에 있는
## 것"과 "창고에 있는 것"을 가르는 장치인데 우리는 애초에 가방이 없다).

const TIERS: Array[Dictionary] = [
	{ "key": 0, "name": "상품", "hanja": "常品", "color": "#d0c8b8", "mul": 1.00, "affix": 0, "weight": 100.0 },
	{ "key": 1, "name": "양품", "hanja": "良品", "color": "#6f6fff", "mul": 1.18, "affix": 1, "weight": 52.0 },
	{ "key": 2, "name": "명품", "hanja": "名品", "color": "#ffff64", "mul": 1.40, "affix": 2, "weight": 22.0 },
	{ "key": 3, "name": "보물", "hanja": "寶物", "color": "#00c000", "mul": 1.70, "affix": 3, "weight": 7.0 },
	{ "key": 4, "name": "전설", "hanja": "傳說", "color": "#c7a76c", "mul": 2.15, "affix": 4, "weight": 1.6 },
]

## 무기 10종 + 부적 5종 — data-item.js BASES 중 slot이 weapon/charm인 것만, 값 그대로.
const BASES: Array[Dictionary] = [
	## 무장(武將) — spear/club/axe/halberd
	{ "key": "w_pyeongon", "slot": "weapon", "name": "편곤", "main": "might", "base": 10.0, "look": "club" },
	{ "key": "w_changj", "slot": "weapon", "name": "장창", "main": "might", "base": 11.0, "look": "spear" },
	{ "key": "w_bugae", "slot": "weapon", "name": "부월", "main": "might", "base": 11.0, "look": "axe" },
	{ "key": "w_geukchang", "slot": "weapon", "name": "극창", "main": "might", "base": 13.0, "look": "halberd" },
	## 궁장(弓將) — bow
	{ "key": "w_gakgung", "slot": "weapon", "name": "각궁", "main": "might", "base": 8.0, "look": "bow" },
	{ "key": "w_cheoltae", "slot": "weapon", "name": "철태궁", "main": "might", "base": 10.0, "look": "bow" },
	## 책사(策士) — fan/brush
	{ "key": "w_seonchae", "slot": "weapon", "name": "선채", "main": "wisdom", "base": 9.0, "look": "fan" },
	{ "key": "w_bilbut", "slot": "weapon", "name": "필묵", "main": "wisdom", "base": 7.0, "look": "brush" },
	## 도독(都督) — sword/guandao
	{ "key": "w_hwando", "slot": "weapon", "name": "환도", "main": "might", "base": 9.0, "look": "sword" },
	{ "key": "w_wolto", "slot": "weapon", "name": "월도", "main": "might", "base": 12.0, "look": "guandao" },
	## 방사(方士) — staff/scroll
	{ "key": "w_jukjang", "slot": "weapon", "name": "죽장", "main": "wisdom", "base": 8.0, "look": "staff" },
	{ "key": "w_byeongseo", "slot": "weapon", "name": "병서", "main": "command", "base": 8.0, "look": "scroll" },
	## 부적(符籍) — look 없음(원작도 없다), 장신구라 안 닳는다(NO_DUR_SLOT)
	{ "key": "c_hopae", "slot": "charm", "name": "호패", "main": "command", "base": 5.0 },
	{ "key": "c_yeombul", "slot": "charm", "name": "염주", "main": "wisdom", "base": 6.0 },
	{ "key": "c_hobu", "slot": "charm", "name": "호부", "main": "might", "base": 6.0 },
	{ "key": "c_dokkaebi", "slot": "charm", "name": "도깨비방울", "main": "might", "base": 7.0 },
	{ "key": "c_gyeong", "slot": "charm", "name": "청동경", "main": "command", "base": 7.0 },
]

## data-skill.js WEAPON_CLASS 그대로 — 장착한 무기의 look이 직업을 정한다
## (원작 그대로, VERTICAL_SLICE_DUNGEON.md 1절). 맨손(look 없음)은 warrior로
## 본다 — melee_attack.gd의 기본 ATK_DAMAGE가 애초에 무장 기준으로 잡힌 값.
const WEAPON_CLASS: Dictionary = {
	"bow": "archer",
	"spear": "warrior", "club": "warrior", "axe": "warrior", "halberd": "warrior",
	"fan": "scholar", "brush": "scholar",
	"sword": "marshal", "guandao": "marshal",
	"staff": "mystic", "scroll": "mystic",
}

## 화면 표기용 — 실제 인물 이름이 아니라 직업 이름이라 원작 상표 회피
## 정책(루트 CLAUDE.md)과 무관하다.
const CLASS_NAMES: Dictionary = {
	"warrior": "무장", "archer": "궁장", "scholar": "책사",
	"marshal": "도독", "mystic": "방사",
}


## 장착 중인 무기(DungeonEquipmentState.weapon)로 현재 직업 key를 정한다.
static func class_key_for_weapon(weapon: Dictionary) -> String:
	if weapon.is_empty():
		return "warrior"
	var b := base_by_key(str(weapon.get("base", "")))
	if b.is_empty():
		return "warrior"
	return str(WEAPON_CLASS.get(b.get("look"), "warrior"))


static func class_name_for_weapon(weapon: Dictionary) -> String:
	return str(CLASS_NAMES.get(class_key_for_weapon(weapon), "무장"))

## data-item.js AFFIXES 13종 전부 — 클래스에 안 맞는(지력·통솔) 것도 값은
## 그대로 굴러 나온다(원작도 아무 등급에나 아무 접사가 붙는다). might/
## all이 아닌 stat(wisdom·command)은 이 슬라이스에 목표 스탯이 없어
## 이름에는 실리지만 수치 효과는 안 붙는다(dungeon_equipment_state.gd
## 참고) — world kind(전역 접사)는 은사와 같은 eff 키 이름(atkPct·hpPct·
## critPct 등)을 그대로 쓴다.
const AFFIXES: Array[Dictionary] = [
	{ "key": "might", "kind": "flat", "stat": "might", "lo": 4.0, "hi": 9.0, "pre": "용맹한", "label": "무력" },
	{ "key": "wisdom", "kind": "flat", "stat": "wisdom", "lo": 4.0, "hi": 9.0, "pre": "지혜로운", "label": "지력" },
	{ "key": "command", "kind": "flat", "stat": "command", "lo": 4.0, "hi": 9.0, "pre": "위엄있는", "label": "통솔" },
	{ "key": "allstat", "kind": "flat", "stat": "all", "lo": 2.0, "hi": 5.0, "pre": "완전한", "label": "전 능력치" },
	{ "key": "mightPct", "kind": "pct", "stat": "might", "lo": 3.0, "hi": 8.0, "pre": "패도의", "label": "무력" },
	{ "key": "wisdomPct", "kind": "pct", "stat": "wisdom", "lo": 3.0, "hi": 8.0, "pre": "현묘한", "label": "지력" },
	{ "key": "allPct", "kind": "pct", "stat": "all", "lo": 2.0, "hi": 6.0, "pre": "천명의", "label": "전 능력치" },
	{ "key": "loot", "kind": "world", "eff": "lootPct", "lo": 4.0, "hi": 11.0, "post": "약탈", "label": "전리품" },
	{ "key": "gold", "kind": "world", "eff": "goldPct", "lo": 4.0, "hi": 12.0, "post": "치부", "label": "금 획득" },
	{ "key": "exp", "kind": "world", "eff": "expPct", "lo": 3.0, "hi": 9.0, "post": "수학", "label": "경험치" },
	{ "key": "atk", "kind": "world", "eff": "atkPct", "lo": 2.0, "hi": 6.0, "post": "전열", "label": "부대 공격력" },
	{ "key": "hp", "kind": "world", "eff": "hpPct", "lo": 2.0, "hi": 7.0, "post": "수성", "label": "부대 체력" },
	{ "key": "find", "kind": "world", "eff": "findPct", "lo": 5.0, "hi": 14.0, "post": "탐색", "label": "좋은 물건 찾기" },
	{ "key": "crit", "kind": "world", "eff": "critPct", "lo": 3.0, "hi": 8.0, "post": "일격", "label": "치명타" },
]

## 장신구는 안 닳는다(item.js NO_DUR_SLOT) — 우리 쪽은 charm뿐이지만
## ring/neck도 원작 표 그대로 남겨 둔다(뜻은 없어도 값을 지어내지 않는다).
const NO_DUR_SLOT: Dictionary = { "charm": true, "ring": true, "neck": true }

## data-item.js SOCK_MAX 중 우리가 가진 부위만(무기 3 · 부적 2).
const SOCK_MAX: Dictionary = { "weapon": 3, "charm": 2 }

## data-gem.js RUNES 12종 전부 — eff 모양은 장비 접사와 같다(flat·pct·world).
const RUNES: Array[Dictionary] = [
	{ "key": "cheon", "glyph": "天", "name": "천", "tier": 1, "eff": { "kind": "flat", "stat": "wisdom", "v": 6.0 }, "desc": "하늘 천." },
	{ "key": "ji", "glyph": "地", "name": "지", "tier": 1, "eff": { "kind": "flat", "stat": "command", "v": 6.0 }, "desc": "땅 지." },
	{ "key": "in", "glyph": "人", "name": "인", "tier": 1, "eff": { "kind": "flat", "stat": "might", "v": 6.0 }, "desc": "사람 인." },
	{ "key": "mu", "glyph": "武", "name": "무", "tier": 2, "eff": { "kind": "pct", "stat": "might", "v": 5.0 }, "desc": "굳셀 무." },
	{ "key": "mun", "glyph": "文", "name": "문", "tier": 2, "eff": { "kind": "pct", "stat": "wisdom", "v": 5.0 }, "desc": "글월 문." },
	{ "key": "chung", "glyph": "忠", "name": "충", "tier": 2, "eff": { "kind": "pct", "stat": "command", "v": 5.0 }, "desc": "충성 충." },
	{ "key": "ui", "glyph": "義", "name": "의", "tier": 3, "eff": { "kind": "world", "eff": "lootPct", "v": 10.0 }, "desc": "옳을 의." },
	{ "key": "yong", "glyph": "勇", "name": "용", "tier": 3, "eff": { "kind": "world", "eff": "atkPct", "v": 7.0 }, "desc": "날랠 용." },
	{ "key": "ji2", "glyph": "智", "name": "지(智)", "tier": 3, "eff": { "kind": "world", "eff": "expPct", "v": 9.0 }, "desc": "슬기 지." },
	{ "key": "sin", "glyph": "信", "name": "신", "tier": 4, "eff": { "kind": "world", "eff": "hpPct", "v": 9.0 }, "desc": "믿을 신." },
	{ "key": "ryong", "glyph": "龍", "name": "용(龍)", "tier": 4, "eff": { "kind": "pct", "stat": "all", "v": 4.0 }, "desc": "용 룡. 드물다." },
	{ "key": "wang", "glyph": "王", "name": "왕", "tier": 5, "eff": { "kind": "flat", "stat": "all", "v": 8.0 }, "desc": "임금 왕. 아주 드물다." },
]

## "제외" 목록 4번(원소 6결+저항) — data-elem.js ELEMENTS 그대로: phys(물리)
## 하나 + 보석으로 얻는 6결(화·빙·뇌·독·기·전자). 결마다 성질이 다르다
## (빙=느려짐·뇌=편차 큼·독=dot·화/기/전자=곧은 한 방) — melee_attack.gd·
## dungeon_enemy.gd가 이 성질(slow/spread/dot)을 그대로 읽어 적용한다.
const ELEMENTS: Array[Dictionary] = [
	{ "key": "phys", "name": "물리", "hanja": "物理", "color": "#d0c8b8",
		"desc": "칼과 주먹. 보석으로는 못 얻는다 — 무기가 곧 물리다." },
	{ "key": "fire", "name": "화", "hanja": "火", "color": "#e2601a",
		"desc": "큰 한 방." },
	{ "key": "cold", "name": "빙", "hanja": "氷", "color": "#5fa8e8", "slow": 0.45, "slow_sec": 1.6,
		"desc": "맞은 적이 잠깐 느려진다." },
	{ "key": "lit", "name": "뇌", "hanja": "雷", "color": "#f0d060", "spread": 1.4,
		"desc": "편차가 크다 — 적게 들어가거나 크게 들어간다." },
	{ "key": "pois", "name": "독", "hanja": "毒", "color": "#7ac943", "dot": 3.0,
		"desc": "3초에 걸쳐 들어간다. 즉발이 아니다." },
	{ "key": "chi", "name": "기", "hanja": "氣", "color": "#b98ae0",
		"desc": "이 판의 마법. 곧게 들어간다." },
	{ "key": "emp", "name": "전자", "hanja": "電磁", "color": "#ff4fd8",
		"desc": "미래에서 흘러든 낯선 힘. 큰 한 방, 곁들이는 것은 없다." },
]

## 보석으로 얻을 수 있는 결(물리는 무기 자체라 못 얻는다) — data-elem.js GEM_ELEMENTS.
const GEM_ELEMENTS: Array[String] = ["fire", "cold", "lit", "pois", "chi", "emp"]

## 저항 상한 — data-enemy.js·dungeon.js RESIST_CAP 그대로(면역은 안 둔다).
const RESIST_CAP := 75.0

## data-gem.js GRADES 5등급 — 거칠수록 값이 작다. 보석·주옥이 아니라
## **보석에만** 등급이 있다(주옥은 등급 없이 접사가 굴러 나온다).
const GRADES: Array[Dictionary] = [
	{ "g": 0, "name": "조(粗)", "mul": 1.0, "color": "#9aa3b2" },
	{ "g": 1, "name": "양(良)", "mul": 1.8, "color": "#5ec26a" },
	{ "g": 2, "name": "정(精)", "mul": 3.0, "color": "#4aa3f0" },
	{ "g": 3, "name": "보(寶)", "mul": 4.6, "color": "#b06bf0" },
	{ "g": 4, "name": "완(完)", "mul": 7.0, "color": "#f0a53a" },
]


static func grade(g: int) -> Dictionary:
	return GRADES[clampi(g, 0, GRADES.size() - 1)]


## data-gem.js GEMS 6종 전부 — **박는 자리에 따라 다른 것을 준다**(원작 그대로):
##   무기(weapon)  그 원소의 피해(eldmg)
##   갑주(armor)   그 원소의 저항(elres) — 이 슬라이스엔 갑주 슬롯이 없어 안 닿는다
##                 (아래 GEM_SLOT_CAT이 weapon·charm만 있는 이유. 데이터 자체는
##                 원작 그대로 셋 다 옮겨 뒀다 — 나중에 갑주가 생기면 바로 쓴다)
##   부적(charm)   능력치
const GEMS: Array[Dictionary] = [
	{ "key": "agate", "name": "마노(瑪瑙)", "emoji": "🔴", "el": "fire",
		"weapon": { "kind": "eldmg", "el": "fire", "v": 6.0 },
		"armor": { "kind": "elres", "el": "fire", "v": 8.0 },
		"charm": { "kind": "pct", "stat": "might", "v": 3.0 },
		"desc": "붉은 마노. 박으면 불이 붙는다." },
	{ "key": "pearl", "name": "진주(眞珠)", "emoji": "⚪", "el": "cold",
		"weapon": { "kind": "eldmg", "el": "cold", "v": 5.0 },
		"armor": { "kind": "elres", "el": "cold", "v": 8.0 },
		"charm": { "kind": "pct", "stat": "command", "v": 3.0 },
		"desc": "바다에서 온 구슬. 맞은 것이 굼떠진다." },
	{ "key": "amber", "name": "호박(琥珀)", "emoji": "🟠", "el": "lit",
		"weapon": { "kind": "eldmg", "el": "lit", "v": 7.0 },
		"armor": { "kind": "elres", "el": "lit", "v": 8.0 },
		"charm": { "kind": "world", "eff": "lootPct", "v": 4.0 },
		"desc": "송진이 굳은 돌. 번개를 머금는다." },
	{ "key": "jade", "name": "옥(玉)", "emoji": "🟢", "el": "pois",
		"weapon": { "kind": "eldmg", "el": "pois", "v": 8.0 },
		"armor": { "kind": "elres", "el": "pois", "v": 8.0 },
		"charm": { "kind": "pct", "stat": "wisdom", "v": 3.0 },
		"desc": "맑은 옥. 스미면 오래 간다." },
	{ "key": "onyx", "name": "흑요(黑曜)", "emoji": "⚫", "el": "chi",
		"weapon": { "kind": "eldmg", "el": "chi", "v": 6.0 },
		"armor": { "kind": "elres", "el": "chi", "v": 8.0 },
		"charm": { "kind": "flat", "stat": "all", "v": 2.0 },
		"desc": "검게 빛나는 돌. 기(氣)가 곧게 뻗는다." },
	{ "key": "voidstone", "name": "전자석(電磁石)", "emoji": "🟣", "el": "emp",
		"weapon": { "kind": "eldmg", "el": "emp", "v": 7.0 },
		"armor": { "kind": "elres", "el": "emp", "v": 8.0 },
		"charm": { "kind": "world", "eff": "expPct", "v": 6.0 },
		"desc": "출처를 알 수 없는 돌. 미래의 힘이 깃들었다." },
]

## data-item.js GEM_SLOT_CAT 중 우리가 가진 부위만(무기·부적). 갑주 계열
##(armor/helm/glove/boot)·장신구 계열(ring/neck)은 슬롯 자체가 없어 뺐다.
const GEM_SLOT_CAT: Dictionary = { "weapon": "weapon", "charm": "charm" }

## data-gem.js JEWEL_TWO·JEWEL_MAX 그대로.
const JEWEL_TWO := 0.34
const JEWEL_MAX := 40

## data-gem.js JEWEL_AFFIXES 20종 전부 — **부위를 안 가린다**(주옥의 정체).
## 원소 저항(elres)이 이 슬라이스에서 갑주 없이도 손에 닿는 유일한 길이다
## (보석의 armor 자리는 안 쓰이지만 주옥은 무기·부적 소켓에도 그대로 붙는다).
const JEWEL_AFFIXES: Array[Dictionary] = [
	{ "key": "j_fire", "kind": "eldmg", "el": "fire", "lo": 3.0, "hi": 8.0, "pre": "타는" },
	{ "key": "j_cold", "kind": "eldmg", "el": "cold", "lo": 3.0, "hi": 7.0, "pre": "시린" },
	{ "key": "j_lit", "kind": "eldmg", "el": "lit", "lo": 4.0, "hi": 10.0, "pre": "벼락 든" },
	{ "key": "j_pois", "kind": "eldmg", "el": "pois", "lo": 4.0, "hi": 9.0, "pre": "검푸른" },
	{ "key": "j_chi", "kind": "eldmg", "el": "chi", "lo": 3.0, "hi": 7.0, "pre": "고요한" },
	{ "key": "j_emp", "kind": "eldmg", "el": "emp", "lo": 4.0, "hi": 9.0, "pre": "낯선" },
	{ "key": "j_rfire", "kind": "elres", "el": "fire", "lo": 4.0, "hi": 9.0, "post": "방화(防火)" },
	{ "key": "j_rcold", "kind": "elres", "el": "cold", "lo": 4.0, "hi": 9.0, "post": "방한(防寒)" },
	{ "key": "j_rlit", "kind": "elres", "el": "lit", "lo": 4.0, "hi": 9.0, "post": "피뢰(避雷)" },
	{ "key": "j_rpois", "kind": "elres", "el": "pois", "lo": 4.0, "hi": 9.0, "post": "해독(解毒)" },
	{ "key": "j_rchi", "kind": "elres", "el": "chi", "lo": 4.0, "hi": 9.0, "post": "진기(鎭氣)" },
	{ "key": "j_remp", "kind": "elres", "el": "emp", "lo": 4.0, "hi": 9.0, "post": "차폐(遮蔽)" },
	{ "key": "j_might", "kind": "flat", "stat": "might", "lo": 3.0, "hi": 7.0, "pre": "억센" },
	{ "key": "j_wisdom", "kind": "flat", "stat": "wisdom", "lo": 3.0, "hi": 7.0, "pre": "밝은" },
	{ "key": "j_command", "kind": "flat", "stat": "command", "lo": 3.0, "hi": 7.0, "pre": "무거운" },
	{ "key": "j_all", "kind": "flat", "stat": "all", "lo": 1.0, "hi": 3.0, "pre": "온전한" },
	{ "key": "j_atk", "kind": "world", "eff": "atkPct", "lo": 2.0, "hi": 5.0, "post": "전열" },
	{ "key": "j_crit", "kind": "world", "eff": "critPct", "lo": 2.0, "hi": 5.0, "post": "일격" },
	{ "key": "j_find", "kind": "world", "eff": "findPct", "lo": 4.0, "hi": 10.0, "post": "탐색" },
	{ "key": "j_loot", "kind": "world", "eff": "lootPct", "lo": 3.0, "hi": 8.0, "post": "약탈" },
]

## data-gem.js WORDS 5종 전부 — slot이 null이면 부위를 안 가린다.
const WORDS: Array[Dictionary] = [
	{ "key": "cheonjiin", "name": "천지인(天地人)", "runes": ["cheon", "ji", "in"], "slot": null,
		"eff": [{ "kind": "flat", "stat": "all", "v": 14.0 }, { "kind": "pct", "stat": "all", "v": 6.0 }],
		"desc": "하늘과 땅과 사람이 한자리에 선다." },
	{ "key": "chungui", "name": "충의(忠義)", "runes": ["chung", "ui"], "slot": null,
		"eff": [{ "kind": "pct", "stat": "command", "v": 12.0 }, { "kind": "world", "eff": "lootPct", "v": 18.0 }],
		"desc": "섬김이 곧 이로움이 된다." },
	{ "key": "munmu", "name": "문무(文武)", "runes": ["mun", "mu"], "slot": null,
		"eff": [{ "kind": "pct", "stat": "might", "v": 10.0 }, { "kind": "pct", "stat": "wisdom", "v": 10.0 }],
		"desc": "붓과 칼을 함께 쥔다." },
	{ "key": "yongho", "name": "용호(勇龍)", "runes": ["yong", "ryong"], "slot": "weapon",
		"eff": [{ "kind": "pct", "stat": "might", "v": 16.0 }, { "kind": "world", "eff": "atkPct", "v": 14.0 }],
		"desc": "무기에만 든다. 날래고 사납다." },
	{ "key": "wangdo", "name": "왕도(王道)", "runes": ["wang", "ji", "sin"], "slot": null,
		"eff": [{ "kind": "flat", "stat": "all", "v": 20.0 }, { "kind": "pct", "stat": "all", "v": 10.0 },
			{ "kind": "world", "eff": "goldPct", "v": 25.0 }],
		"desc": "임금의 길. 좀처럼 이루어지지 않는다." },
]

## data-set.js SETS 10벌 — `skill` 필드(세트 전용 무예)는 뺐다(스킬트리·
## 핫바 시스템이 이 슬라이스에 없다). bonus는 누적(2점 값 위에 3점 값을
## 더 얹는다) — 우리는 갑주가 없어 3점 문턱은 넘을 수 없다(위 헤더 참고).
const SETS: Array[Dictionary] = [
	{ "key": "chungmu", "name": "충무(忠武)", "pieces": ["w_hwando", "a_dujeong", "c_hopae"],
		"bonus": { 2: [{ "kind": "flat", "stat": "command", "v": 14.0 }],
			3: [{ "kind": "pct", "stat": "all", "v": 8.0 }, { "kind": "world", "eff": "atkPct", "v": 12.0 }] } },
	{ "key": "waryong", "name": "와룡(臥龍)", "pieces": ["w_seonchae", "a_dopo", "c_yeombul"],
		"bonus": { 2: [{ "kind": "flat", "stat": "wisdom", "v": 16.0 }],
			3: [{ "kind": "pct", "stat": "wisdom", "v": 12.0 }, { "kind": "world", "eff": "expPct", "v": 20.0 }] } },
	{ "key": "horang", "name": "호랑(虎狼)", "pieces": ["w_changj", "a_chalgap", "c_hobu"],
		"bonus": { 2: [{ "kind": "flat", "stat": "might", "v": 16.0 }],
			3: [{ "kind": "pct", "stat": "might", "v": 12.0 }, { "kind": "world", "eff": "critPct", "v": 10.0 }] } },
	{ "key": "cheongnang", "name": "청낭(靑囊)", "pieces": ["w_bilbut", "a_myeongap", "c_gyeong"],
		"bonus": { 2: [{ "kind": "world", "eff": "lootPct", "v": 12.0 }],
			3: [{ "kind": "world", "eff": "goldPct", "v": 30.0 }, { "kind": "world", "eff": "findPct", "v": 25.0 }] } },
	{ "key": "cheolong", "name": "철옹(鐵甕)", "pieces": ["a_jichap", "h_tumo", "n_geumpae"],
		"bonus": { 2: [{ "kind": "flat", "stat": "command", "v": 14.0 }],
			3: [{ "kind": "pct", "stat": "command", "v": 10.0 }, { "kind": "world", "eff": "hpPct", "v": 20.0 }] } },
	{ "key": "eunha", "name": "은하(銀河)", "pieces": ["w_jukjang", "n_okpae", "c_okgae"],
		"bonus": { 2: [{ "kind": "flat", "stat": "wisdom", "v": 14.0 }],
			3: [{ "kind": "pct", "stat": "wisdom", "v": 10.0 }, { "kind": "world", "eff": "findPct", "v": 20.0 }] } },
	{ "key": "maenghon", "name": "맹혼(猛魂)", "pieces": ["w_bugae", "a_cheollip", "g_wangap"],
		"bonus": { 2: [{ "kind": "flat", "stat": "might", "v": 14.0 }],
			3: [{ "kind": "pct", "stat": "might", "v": 10.0 }, { "kind": "world", "eff": "atkPct", "v": 15.0 }] } },
	{ "key": "biyeong", "name": "비영(飛影)", "pieces": ["w_gakgung", "b_hwaje", "r_geumji"],
		"bonus": { 2: [{ "kind": "flat", "stat": "might", "v": 10.0 }],
			3: [{ "kind": "pct", "stat": "might", "v": 8.0 }, { "kind": "world", "eff": "critPct", "v": 18.0 }] } },
	{ "key": "paewang", "name": "패왕(霸王)", "pieces": ["w_wolto", "a_pigap", "c_dokkaebi"],
		"bonus": { 2: [{ "kind": "flat", "stat": "might", "v": 16.0 }],
			3: [{ "kind": "pct", "stat": "might", "v": 14.0 }, { "kind": "world", "eff": "atkPct", "v": 18.0 }] } },
	{ "key": "hyeonhak", "name": "현학(玄鶴)", "pieces": ["w_byeongseo", "g_wandae", "b_jipsin"],
		"bonus": { 2: [{ "kind": "flat", "stat": "wisdom", "v": 12.0 }],
			3: [{ "kind": "pct", "stat": "wisdom", "v": 8.0 }, { "kind": "world", "eff": "expPct", "v": 18.0 }] } },
]

const SET_TIER := 3 # 보물(寶物) 등급에만 붙는다
const SET_CHANCE := 0.55

## vendor.js GAMBLE_W 그대로 — 던전 드랍(100/52/22/7/1.6)보다 위쪽이 훨씬
## 두껍다. 투전이 비싼 대신 좋은 등급이 잘 나오는 이유.
const GAMBLE_W: Array[float] = [10.0, 44.0, 30.0, 13.0, 3.0]


static func base_by_key(k: String) -> Dictionary:
	for b: Dictionary in BASES:
		if b.key == k:
			return b
	return {}


static func affix_by_key(k: String) -> Dictionary:
	for a: Dictionary in AFFIXES:
		if a.key == k:
			return a
	return {}


static func rune_by_key(k: String) -> Dictionary:
	for r: Dictionary in RUNES:
		if r.key == k:
			return r
	return {}


static func elem_by_key(k: String) -> Dictionary:
	for e: Dictionary in ELEMENTS:
		if e.key == k:
			return e
	return {}


## data-elem.js elemName() — "화(火)" 형태. 못 찾으면 키를 그대로 보여준다
## (새 결을 잊고 표에 안 넣었을 때 조용히 숨기지 않기 위해).
static func elem_name(k: String) -> String:
	var e := elem_by_key(k)
	return "%s(%s)" % [e.name, e.hanja] if not e.is_empty() else k


static func gem_by_key(k: String) -> Dictionary:
	for g: Dictionary in GEMS:
		if g.key == k:
			return g
	return {}


static func jewel_affix_by_key(k: String) -> Dictionary:
	for a: Dictionary in JEWEL_AFFIXES:
		if a.key == k:
			return a
	return {}


## data-gem.js rollJewel(ilvl) — 접사 하나(66%) 또는 둘(34%), flat·eldmg만
## 층(ilvl)을 탄다(%는 안 탄다 — 고유·주옥이 같은 이유, 깊은 층에서 저항·
## 전역 효과가 걷잡을 수 없이 커지는 것을 막는다). id는 여기서 안 붙인다
## (DungeonMaterialsState.add_jewel()이 붙인다 — item.js addJewel()과 같은 경계).
static func roll_jewel(ilvl: int) -> Dictionary:
	ilvl = maxi(1, ilvl)
	var n := 2 if randf() < JEWEL_TWO else 1
	var aff: Array[Dictionary] = []
	var used: Dictionary = {}
	var guard := 0
	while aff.size() < n and guard < 30:
		guard += 1
		var a: Dictionary = JEWEL_AFFIXES[randi() % JEWEL_AFFIXES.size()]
		if used.has(a.key):
			continue
		used[a.key] = true
		var grow: float = (1.0 + ilvl * 0.05) if (a.kind == "flat" or a.kind == "eldmg") else 1.0
		var v: float = (a.lo + randf() * (a.hi - a.lo)) * grow
		aff.append({"k": a.key, "v": maxf(1.0, roundf(v))})
	return {"aff": aff}


## 주옥이 내는 것 — 보석·투장과 같은 모양(kind/stat/eff/el/v)이라
## socket_effects()가 그대로 더한다.
static func jewel_eff(j: Dictionary) -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	if j.is_empty() or not j.has("aff"):
		return out
	for a_ref: Dictionary in j.aff:
		var a := jewel_affix_by_key(str(a_ref.k))
		if a.is_empty():
			continue
		out.append({"kind": a.kind, "stat": a.get("stat", ""), "eff": a.get("eff", ""),
			"el": a.get("el", ""), "v": float(a_ref.v)})
	return out


## '타는 주옥 · 일격' — 접사가 이름이 된다(item.js jewelName()과 같은 규칙).
static func jewel_name(j: Dictionary) -> String:
	if j.is_empty() or not j.has("aff"):
		return "주옥(珠玉)"
	var pre := ""
	var post := ""
	for a_ref: Dictionary in j.aff:
		var a := jewel_affix_by_key(str(a_ref.k))
		if a.is_empty():
			continue
		if a.get("pre", "") != "" and pre == "":
			pre = str(a.pre) + " "
		elif a.get("post", "") != "" and post == "":
			post = " · " + str(a.post)
	return pre + "주옥" + post


## dungeon.js dropMat()의 보석 갈래 — 등급도 층을 탄다(45%씩 더, 층/3만큼 상한).
static func roll_gem_drop(floor_num: int) -> Dictionary:
	var gem: Dictionary = GEMS[randi() % GEMS.size()]
	var g := 0
	var cap: int = clampi(floor_num / 3, 0, 4)
	while g < cap and randf() < 0.45:
		g += 1
	return {"kind": "gem", "key": gem.key, "g": g}


## dungeon.js dropMat() 전체 — 주옥(4층부터, 최대 10%) → 부문(22%) → 보석
## (나머지) 순으로 갈린다. 바깥 확률(잡졸 12%, loot_pickup.gd MAT_DROP_CHANCE)은
## 호출 쪽이 이미 걸러 부른다고 본다.
static func roll_material_drop(floor_num: int) -> Dictionary:
	if floor_num >= 4:
		var jewel_chance: float = minf(0.10, 0.02 + float(floor_num) * 0.004)
		if randf() < jewel_chance:
			return {"kind": "jewel", "j": roll_jewel(floor_num + 1)}
	if randf() < 0.22:
		var key := roll_rune_drop(floor_num)
		if key != "":
			return {"kind": "rune", "key": key}
	return roll_gem_drop(floor_num)


## forge.js nextRune() — RUNES는 tier 순으로 늘어서 있어 "다음 글자"는
## 그냥 다음 칸이다. 마지막 글자(王)면 "".
static func next_rune_key(key: String) -> String:
	for i in range(RUNES.size()):
		if RUNES[i].key == key:
			return str(RUNES[i + 1].key) if i + 1 < RUNES.size() else ""
	return ""


static func set_by_key(k: String) -> Dictionary:
	for s: Dictionary in SETS:
		if s.key == k:
			return s
	return {}


## 이 밑감이 속한 한 벌(없으면 빈 Dictionary) — data-set.js setOfBase() 그대로.
static func set_of_base(base_key: String) -> Dictionary:
	for s: Dictionary in SETS:
		if (s.pieces as Array).has(base_key):
			return s
	return {}


## 몇 점을 걸쳤을 때 붙는 효과 — 누적(2점 값 위에 3점 값을 더 얹는다).
static func bonus_for(s: Dictionary, n: int) -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	if s.is_empty():
		return out
	var bonus: Dictionary = s.get("bonus", {})
	for k in bonus:
		if n >= int(k):
			for e: Dictionary in bonus[k]:
				out.append(e)
	return out


## rollTier(bias) — findPct 시스템이 없어 bias는 늘 0(웹판 item.js와 같은
## 가중 추첨, 탐색안 보정만 뺐다).
static func roll_tier() -> int:
	var total := 0.0
	var w: Array[float] = []
	for i in range(TIERS.size()):
		w.append(TIERS[i].weight)
		total += w[i]
	var r := randf() * total
	for i in range(w.size()):
		r -= w[i]
		if r <= 0.0:
			return i
	return 0


## item.js::rollSockets(slot, tier) — opts.sock 강제 지정(진단/데모 전용)은
## 이 슬라이스에서 안 씀. 상품 28% ~ 전설 60% 확률로 최소 1개, 그 뒤론
## 42% 확률로 하나씩 더(부위별 SOCK_MAX까지).
static func roll_sockets(slot: String, tier: int) -> Array:
	var max_n: int = int(SOCK_MAX.get(slot, 0))
	if max_n <= 0:
		return []
	var chance: float = 0.28 + float(tier) * 0.08
	if randf() > chance:
		return []
	var n := 1
	while n < max_n and randf() < 0.42:
		n += 1
	var out: Array = []
	for i in range(n):
		out.append(null)
	return out


## item.js::rollSet(base, tier) — 보물(SET_TIER) 등급에서만, 그 밑감이
## 한 벌에 속할 때만 SET_CHANCE 확률로 붙는다.
static func roll_set(base: Dictionary, tier: int) -> String:
	if tier != SET_TIER:
		return ""
	var s := set_of_base(str(base.key))
	if s.is_empty():
		return ""
	return str(s.key) if randf() < SET_CHANCE else ""


## item.js::durMaxOf() — 장신구(부적)는 0(안 닳는다), 나머지는 24 + tier*10
## (상품 24 … 전설 64).
static func dur_max_of(it: Dictionary) -> float:
	if it.is_empty():
		return 0.0
	var b := base_by_key(str(it.get("base", "")))
	if b.is_empty() or bool(NO_DUR_SLOT.get(b.slot, false)):
		return 0.0
	return 24.0 + float(it.get("tier", 0)) * 10.0


## item.js::isBroken() — 안 닳는 부위는 절대 안 부서진다.
static func is_broken(it: Dictionary) -> bool:
	var max_d := dur_max_of(it)
	if max_d <= 0.0:
		return false
	return float(it.get("dur", max_d)) <= 0.0


## item.js::price(it) — 등급·수준만 본다(접사는 안 본다, power()와는 다른
## 함수다). 행상 매입값·투전값·수리값이 전부 이 값 하나에서 갈라진다.
static func price(it: Dictionary) -> int:
	if it.is_empty():
		return 0
	return int(roundf(18.0 * pow(float(it.get("tier", 0)) + 1.0, 1.7) * (1.0 + float(it.get("ilvl", 1)) * 0.12)))


## item.js::repairCost(it) — 닳은 만큼만 낸다(가득 차 있으면 0).
static func repair_cost(it: Dictionary) -> int:
	var max_d := dur_max_of(it)
	if max_d <= 0.0:
		return 0
	var lost: float = max_d - float(it.get("dur", max_d))
	if lost <= 0.0:
		return 0
	return maxi(1, int(roundf(float(price(it)) * 0.4 * (lost / max_d))))


## vendor.js gamblePrice(slot, lv) 그대로.
static func gamble_price(slot: String, lv: int) -> int:
	var base: float = 120.0 if slot == "charm" else 150.0
	return int(roundf(base * (1.0 + float(lv) * 0.55)))


## vendor.js scrollPrice() 그대로 — "막는 관문이 아니라 거쳐 가는 자리".
static func scroll_price(lv: int) -> int:
	return 30 + int(roundf(float(lv) * 4.0))


## dungeon.js::dropMat()의 부문(룬) 갈래만 옮겼다(보석·주옥 갈래는 이
## 슬라이스 밖 — 위 헤더 참고). "층이 감당하는 등급까지만"(maxTier) ·
## 낮은 등급일수록 잘 나온다(가중치 1/tier) 둘 다 원작 공식 그대로.
static func roll_rune_drop(floor_num: int) -> String:
	var max_tier: int = clampi(1 + floor_num / 4, 1, 5)
	var pool: Array[Dictionary] = []
	for r: Dictionary in RUNES:
		if int(r.tier) <= max_tier:
			pool.append(r)
	if pool.is_empty():
		return ""
	var wsum := 0.0
	for r: Dictionary in pool:
		wsum += 1.0 / float(r.tier)
	var pick := randf() * wsum
	for r: Dictionary in pool:
		pick -= 1.0 / float(r.tier)
		if pick <= 0.0:
			return str(r.key)
	return str(pool[0].key)


## 이 장비에 박힌 것이 부문어를 이루는가 — data-gem.js wordOf() 그대로,
## **순서까지 맞아야** 한다. 빈 구멍이 하나라도 있으면 말이 안 된다.
static func word_of(sock: Array, slot: String) -> Dictionary:
	if sock.is_empty():
		return {}
	var keys: Array[String] = []
	for s in sock:
		if s == null:
			return {}
		if str(s.get("t", "")) != "rune":
			return {}
		keys.append(str(s.key))
	for w: Dictionary in WORDS:
		var runes: Array = w.runes
		if runes.size() != keys.size():
			continue
		if w.slot != null and str(w.slot) != slot:
			continue
		var same := true
		for i in range(keys.size()):
			if keys[i] != str(runes[i]):
				same = false
				break
		if same:
			return w
	return {}


## 이 장비의 소켓이 내는 효과 — 부문어가 이루어졌으면 글자 하나하나 대신
## **부문어의 효과만** 낸다(item.js::socketEffects()와 같은 규칙).
static func socket_effects(it: Dictionary) -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	var sock: Array = it.get("sock", [])
	if sock.is_empty():
		return out
	var b := base_by_key(str(it.get("base", "")))
	var slot := str(b.get("slot", "")) if not b.is_empty() else ""
	var word := word_of(sock, slot)
	if not word.is_empty():
		for e: Dictionary in word.eff:
			out.append(e)
		return out
	for s in sock:
		if s == null:
			continue
		match str(s.get("t", "")):
			"rune":
				var r := rune_by_key(str(s.get("key", "")))
				if not r.is_empty():
					out.append(r.eff)
			## "제외" 목록 4번(원소 6결+저항) — item.js socketEffects()의 gem
			## 갈래. 보석은 **박힌 부위**로 무엇을 내는지가 갈린다(GEM_SLOT_CAT)
			## — 우리는 weapon(eldmg)·charm(pct/flat/world)만 닿는다.
			"gem":
				var gd := gem_by_key(str(s.get("key", "")))
				var cat: String = str(GEM_SLOT_CAT.get(slot, slot))
				if not gd.is_empty() and gd.has(cat):
					var e: Dictionary = gd[cat]
					var mul: float = grade(int(s.get("g", 0))).mul
					out.append({"kind": e.kind, "stat": e.get("stat", ""), "eff": e.get("eff", ""),
						"el": e.get("el", ""), "v": maxf(1.0, roundf(float(e.v) * mul))})
			## 주옥 — **부위를 안 가린다**(어디에 박아도 굴려 나온 접사 그대로).
			"jewel":
				out.append_array(jewel_eff(s.get("j", {})))
	return out


## item.js::roll(ilvl, {slot, tier, unid}) — sock·set·dur·unid를 여기서
## 같이 굴린다. 고유(유니크)는 이 슬라이스 밖이라 안 붙인다.
## slot을 안 주면(기본값 "") **웹판 dropItem()과 같은 방식**으로 무기·
## 부적을 안 가리고 전체 BASES에서 고른다 — 노획이 어느 부위가 나올지도
## 굴림의 일부다(호출 쪽이 base.slot을 보고 어디에 장착할지 정한다).
## forced_tier(0 이상)를 주면 등급 추첨 대신 그 등급으로 고정한다(투전이
## GAMBLE_W로 직접 고른 등급을 여기 넣는 자리). force_identified가 참이면
## 등급과 상관없이 확인된 채로 나온다(행상·투전에서 산 것은 원작도 확인된
## 채로 온다 — item.js roll()의 `unid: opts.unid===false?false:t>=1`과 같음).
static func roll(ilvl: int, slot: String = "", forced_tier: int = -1, force_identified: bool = false) -> Dictionary:
	ilvl = maxi(1, ilvl)
	var pool: Array[Dictionary] = []
	for b: Dictionary in BASES:
		if slot == "" or b.slot == slot:
			pool.append(b)
	if pool.is_empty():
		pool = BASES
	var base: Dictionary = pool[randi() % pool.size()]
	var t: int = forced_tier if forced_tier >= 0 else roll_tier()
	var tier: Dictionary = TIERS[t]

	var aff: Array[Dictionary] = []
	var used: Dictionary = {}
	var guard := 0
	while aff.size() < int(tier.affix) and guard < 40:
		guard += 1
		var a: Dictionary = AFFIXES[randi() % AFFIXES.size()]
		if used.has(a.key):
			continue
		used[a.key] = true
		var span: float = a.hi - a.lo
		var grow: float = (1.0 + ilvl * 0.055) if a.kind == "flat" else (1.0 + ilvl * 0.022)
		var v: float = (a.lo + randf() * span) * tier.mul * grow
		aff.append({"k": a.key, "v": maxf(1.0, roundf(v))})

	var it := {
		"base": base.key,
		"tier": t,
		"ilvl": ilvl,
		"main": maxf(1.0, roundf(base.base * tier.mul * (1.0 + ilvl * 0.085))),
		"aff": aff,
		"sock": roll_sockets(base.slot, t),
		"set": roll_set(base, t),
		"unid": false if force_identified else t >= 1,
	}
	it["dur"] = dur_max_of(it)
	return it


## vendor.js pickW(GAMBLE_W) — 투전 전용 등급 추첨(TIERS.weight보다 위쪽이
## 훨씬 두껍다).
static func roll_tier_gamble() -> int:
	var total := 0.0
	for w in GAMBLE_W:
		total += w
	var r := randf() * total
	for i in range(GAMBLE_W.size()):
		r -= GAMBLE_W[i]
		if r <= 0.0:
			return i
	return 0


## item.js::name() — 미확인이면 밑감 이름만(원작처럼 접사·부문어·투장이
## 안 새어 나간다), 그 외엔 부문어·투장이 이루어졌을 때 그 이름이 앞선다
## (원작과 같은 순서). 고유(uniq)는 이 슬라이스에 없어 그 분기는 뺐다.
static func item_name(it: Dictionary) -> String:
	var b := base_by_key(str(it.get("base", "")))
	if b.is_empty():
		return "?"
	if bool(it.get("unid", false)):
		return b.name
	var sock: Array = it.get("sock", [])
	var word := word_of(sock, str(b.get("slot", "")))
	if not word.is_empty():
		return "《%s》 %s" % [word.name, b.name]
	var prefix := ""
	var set_key := str(it.get("set", ""))
	if set_key != "":
		var s := set_by_key(set_key)
		if not s.is_empty():
			prefix = "〈%s〉 " % s.name
	var pre := ""
	var post := ""
	for a_ref: Dictionary in it.get("aff", []):
		var a := affix_by_key(a_ref.k)
		if a.is_empty():
			continue
		if a.get("pre", "") != "" and pre == "":
			pre = a.pre + " "
		elif a.get("post", "") != "" and post == "":
			post = " · " + a.post
	return prefix + pre + b.name + post


## item.js::lines() — 미확인이면 원작 문구("미확인 — 감정해야 옵션이
## 보입니다") 한 줄만(내구조차 안 보여준다, 원작과 같은 경계). 그 외엔
## 주 능력치 · 접사 · 소켓(또는 부문어) · 내구 순. 고유(uniq) 분기는 이
## 슬라이스에 없어 뺐다.
static func item_lines(it: Dictionary) -> Array[String]:
	if bool(it.get("unid", false)):
		return ["미확인 — 감정해야 옵션이 보입니다"]
	var b := base_by_key(str(it.get("base", "")))
	var out: Array[String] = []
	if not b.is_empty():
		out.append(_stat_kor(b.main) + " +%d" % int(it.main))
	for a_ref: Dictionary in it.get("aff", []):
		var a := affix_by_key(a_ref.k)
		if a.is_empty():
			continue
		var suffix := "%" if a.kind != "flat" else ""
		out.append(a.label + " +%d%s" % [int(a_ref.v), suffix])

	var sock: Array = it.get("sock", [])
	if not sock.is_empty():
		var slot := str(b.get("slot", "")) if not b.is_empty() else ""
		var word := word_of(sock, slot)
		if not word.is_empty():
			out.append("《%s》 완성 — %s" % [word.name, word.desc])
		else:
			var filled := 0
			for s in sock:
				if s == null:
					continue
				filled += 1
				match str(s.get("t", "")):
					"rune":
						var r := rune_by_key(str(s.get("key", "")))
						if not r.is_empty():
							out.append("소켓: %s(%s)" % [r.glyph, r.name])
					"gem":
						var gd := gem_by_key(str(s.get("key", "")))
						if not gd.is_empty():
							out.append("소켓: %s %s" % [grade(int(s.get("g", 0))).name, gd.name])
					"jewel":
						out.append("소켓: %s" % jewel_name(s.get("j", {})))
			var empty_n: int = sock.size() - filled
			if empty_n > 0:
				out.append("빈 소켓 %d" % empty_n)

	var dur_max := dur_max_of(it)
	if dur_max > 0.0:
		out.append("내구 %d/%d" % [int(it.get("dur", dur_max)), int(dur_max)])
	return out


static func _stat_kor(s: String) -> String:
	match s:
		"might": return "무력"
		"wisdom": return "지력"
		"command": return "통솔"
		_: return s
