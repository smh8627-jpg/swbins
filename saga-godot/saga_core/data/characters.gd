extends RefCounted

## saga_core — 다섯 판(GO/DUNGEON/FOREST/STORY/REALM 예정) Godot 포트가 공유하는
## 인물 데이터. LEGACY_FEATURE_AUDIT.md 6장 결정(2026-08-31) — id는 기존 다섯
## 웹 프로젝트(saga-go 등)의 js/data.js HEROES와 완전히 동일하게 유지한다(그
## 다섯 곳은 서로 md5로 동일함을 확인하며 유지되는 한 벌이라, 여기 옮긴 것도
## 그 한 벌에서 그대로 가져온 것 — 새 id 체계를 만들지 않았다).
##
## 2026-09-11 시점 105명(삼국지 22·한국사 26·일본사 20·세계사 37). REALM
## 전용 무장(js/data-force.js, 130명+)은 이번에 포함하지 않았다 — LEGACY_
## FEATURE_AUDIT.md는 REALM 것도 통합하기로 했지만, REALM Godot 포트는
## 39장 순서상(Core→Vertical Slice→GO→DUNGEON→FOREST→STORY→REALM) 아직
## 멀었고 그때까지 REALM 쪽 웹판 데이터가 계속 바뀔 수 있어, 지금 당장
## 쓰는 GO부터 먼저 옮기고 REALM은 그 차례가 왔을 때 다시 최신본을 옮기는
## 쪽이 낫다고 판단했다(추측성 선작업 방지). id·이름 정책(가명, 루트
## CLAUDE.md "이름 정책")은 원본에서 이미 지켜진 상태 그대로 옮겼다 —
## name·hanja만 가명, BIOS(열전)는 옮기지 않았다(정책 미준수 상태라 그대로
## 들고 오면 saga_core에도 같은 문제가 생긴다 — 옮기지 않는 것이 맞다).
##
## 필드: id(불변 고유키) · name(표시 이름, 가명) · era(시대 그룹) ·
## faction(세력) · rarity(1~5) · trait(might/wisdom/virtue, 설득 어필 방향) ·
## stats(might/wisdom/command) · hanja(표시용 가명 한자) · emoji · quote(대사).
##
## find(id)로 하나 찾는다 — 없으면 null.

const HEROES := [
	{
		"id": "sg_guanyu",
		"name": "명운",
		"era": "삼국지",
		"faction": "촉",
		"rarity": 5,
		"trait": "virtue",
		"stats": {
			"might": 97,
			"wisdom": 75,
			"command": 95
		},
		"hanja": "明雲",
		"emoji": "🗡️",
		"quote": "의(義)를 아는 이와 함께라면 어디든 가겠소."
	},
	{
		"id": "sg_zhangfei",
		"name": "뇌호",
		"era": "삼국지",
		"faction": "촉",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 98,
			"wisdom": 45,
			"command": 80
		},
		"hanja": "雷虎",
		"emoji": "🍶",
		"quote": "술이나 한잔 하며 이야기하세!"
	},
	{
		"id": "sg_zhaoyun",
		"name": "은창",
		"era": "삼국지",
		"faction": "촉",
		"rarity": 5,
		"trait": "virtue",
		"stats": {
			"might": 96,
			"wisdom": 76,
			"command": 91
		},
		"hanja": "銀槍",
		"emoji": "🐎",
		"quote": "한 몸 바쳐 주공을 지키겠습니다."
	},
	{
		"id": "sg_zhugeliang",
		"name": "현책",
		"era": "삼국지",
		"faction": "촉",
		"rarity": 5,
		"trait": "wisdom",
		"stats": {
			"might": 38,
			"wisdom": 100,
			"command": 92
		},
		"hanja": "玄策",
		"emoji": "🪭",
		"quote": "삼고초려의 뜻, 잊지 않겠습니다."
	},
	{
		"id": "sg_liubei",
		"name": "인형",
		"era": "삼국지",
		"faction": "촉",
		"rarity": 5,
		"trait": "virtue",
		"stats": {
			"might": 72,
			"wisdom": 78,
			"command": 90
		},
		"hanja": "仁衡",
		"emoji": "👑",
		"quote": "백성을 생각하는 마음이 같구려."
	},
	{
		"id": "sg_machao",
		"name": "서풍",
		"era": "삼국지",
		"faction": "촉",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 97,
			"wisdom": 44,
			"command": 87
		},
		"hanja": "西風",
		"emoji": "🏇",
		"quote": "서량의 창끝을 빌려주겠다."
	},
	{
		"id": "sg_huangzhong",
		"name": "노궁",
		"era": "삼국지",
		"faction": "촉",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 93,
			"wisdom": 62,
			"command": 85
		},
		"hanja": "老弓",
		"emoji": "🏹",
		"quote": "늙었다 얕보지 마라!"
	},
	{
		"id": "sg_caocao",
		"name": "패헌",
		"era": "삼국지",
		"faction": "위",
		"rarity": 5,
		"trait": "wisdom",
		"stats": {
			"might": 72,
			"wisdom": 96,
			"command": 98
		},
		"hanja": "霸軒",
		"emoji": "⚔️",
		"quote": "내가 천하를 저버릴지언정, 천하가 나를 저버리게 두지 않는다."
	},
	{
		"id": "sg_simayi",
		"name": "은인",
		"era": "삼국지",
		"faction": "위",
		"rarity": 5,
		"trait": "wisdom",
		"stats": {
			"might": 63,
			"wisdom": 98,
			"command": 94
		},
		"hanja": "隱忍",
		"emoji": "🕸️",
		"quote": "때를 기다릴 줄 아는 자가 이깁니다."
	},
	{
		"id": "sg_xiahoudun",
		"name": "언무",
		"era": "삼국지",
		"faction": "위",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 92,
			"wisdom": 58,
			"command": 88
		},
		"hanja": "彦武",
		"emoji": "🩹",
		"quote": "이 한쪽 눈으로도 적은 충분히 보인다."
	},
	{
		"id": "sg_zhangliao",
		"name": "철벽",
		"era": "삼국지",
		"faction": "위",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 94,
			"wisdom": 78,
			"command": 93
		},
		"hanja": "鐵壁",
		"emoji": "🛡️",
		"quote": "팔백으로 십만을 막아 보이겠소."
	},
	{
		"id": "sg_xunyu",
		"name": "청안",
		"era": "삼국지",
		"faction": "위",
		"rarity": 4,
		"trait": "wisdom",
		"stats": {
			"might": 30,
			"wisdom": 96,
			"command": 70
		},
		"hanja": "淸眼",
		"emoji": "📜",
		"quote": "왕좌지재(王佐之才)라 불러주시니 부끄럽습니다."
	},
	{
		"id": "sg_sunquan",
		"name": "벽해",
		"era": "삼국지",
		"faction": "오",
		"rarity": 4,
		"trait": "virtue",
		"stats": {
			"might": 70,
			"wisdom": 86,
			"command": 89
		},
		"hanja": "碧海",
		"emoji": "🔷",
		"quote": "강동은 손을 잡을 줄 아는 자를 반깁니다."
	},
	{
		"id": "sg_zhouyu",
		"name": "화풍",
		"era": "삼국지",
		"faction": "오",
		"rarity": 5,
		"trait": "wisdom",
		"stats": {
			"might": 71,
			"wisdom": 96,
			"command": 97
		},
		"hanja": "火風",
		"emoji": "🔥",
		"quote": "동남풍이 불면, 그때가 우리의 때입니다."
	},
	{
		"id": "sg_luxun",
		"name": "담연",
		"era": "삼국지",
		"faction": "오",
		"rarity": 4,
		"trait": "wisdom",
		"stats": {
			"might": 66,
			"wisdom": 95,
			"command": 94
		},
		"hanja": "淡然",
		"emoji": "🌊",
		"quote": "서두르지 않는 것이 제 병법입니다."
	},
	{
		"id": "sg_taishici",
		"name": "궁성",
		"era": "삼국지",
		"faction": "오",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 93,
			"wisdom": 66,
			"command": 82
		},
		"hanja": "弓星",
		"emoji": "🎯",
		"quote": "활 솜씨를 보여드리지요."
	},
	{
		"id": "sg_ganning",
		"name": "영진",
		"era": "삼국지",
		"faction": "오",
		"rarity": 3,
		"trait": "might",
		"stats": {
			"might": 94,
			"wisdom": 60,
			"command": 79
		},
		"hanja": "鈴陣",
		"emoji": "🔔",
		"quote": "방울 소리가 들리면 이미 늦은 것이다."
	},
	{
		"id": "sg_lubu",
		"name": "패창",
		"era": "삼국지",
		"faction": "군웅",
		"rarity": 5,
		"trait": "might",
		"stats": {
			"might": 100,
			"wisdom": 26,
			"command": 88
		},
		"hanja": "霸槍",
		"emoji": "🐉",
		"quote": "천하무쌍! 나를 막을 자가 있나?"
	},
	{
		"id": "sg_diaochan",
		"name": "월영",
		"era": "삼국지",
		"faction": "군웅",
		"rarity": 5,
		"trait": "virtue",
		"stats": {
			"might": 20,
			"wisdom": 88,
			"command": 40
		},
		"hanja": "月影",
		"emoji": "🌙",
		"quote": "이 몸이 도움이 된다면요."
	},
	{
		"id": "sg_pangtong",
		"name": "봉래",
		"era": "삼국지",
		"faction": "촉",
		"rarity": 4,
		"trait": "wisdom",
		"stats": {
			"might": 40,
			"wisdom": 97,
			"command": 80
		},
		"hanja": "鳳來",
		"emoji": "🦅",
		"quote": "봉래가 여기 있습니다."
	},
	{
		"id": "sg_huatuo",
		"name": "신침",
		"era": "삼국지",
		"faction": "재야",
		"rarity": 4,
		"trait": "virtue",
		"stats": {
			"might": 15,
			"wisdom": 92,
			"command": 20
		},
		"hanja": "神鍼",
		"emoji": "💊",
		"quote": "사람을 살리는 일이라면 함께하지요."
	},
	{
		"id": "sg_menghuo",
		"name": "만왕",
		"era": "삼국지",
		"faction": "남만",
		"rarity": 3,
		"trait": "might",
		"stats": {
			"might": 88,
			"wisdom": 40,
			"command": 76
		},
		"hanja": "蠻王",
		"emoji": "🐘",
		"quote": "일곱 번 져도 여덟 번 일어난다!"
	},
	{
		"id": "kr_yisunsin",
		"name": "해장",
		"era": "한국사",
		"faction": "조선",
		"rarity": 5,
		"trait": "virtue",
		"stats": {
			"might": 92,
			"wisdom": 98,
			"command": 100
		},
		"hanja": "海將",
		"emoji": "🚢",
		"quote": "아직 신에게는 열두 척의 배가 남아 있사옵니다."
	},
	{
		"id": "kr_euljimundeok",
		"name": "현묘",
		"era": "한국사",
		"faction": "고구려",
		"rarity": 5,
		"trait": "wisdom",
		"stats": {
			"might": 88,
			"wisdom": 97,
			"command": 98
		},
		"hanja": "玄妙",
		"emoji": "🌊",
		"quote": "만족함을 알고 그만두기를 권하노라."
	},
	{
		"id": "kr_ganggamchan",
		"name": "강우",
		"era": "한국사",
		"faction": "고려",
		"rarity": 5,
		"trait": "wisdom",
		"stats": {
			"might": 80,
			"wisdom": 96,
			"command": 97
		},
		"hanja": "江雨",
		"emoji": "⛰️",
		"quote": "강물을 터뜨릴 준비는 끝났소."
	},
	{
		"id": "kr_kimyusin",
		"name": "화랑준",
		"era": "한국사",
		"faction": "신라",
		"rarity": 5,
		"trait": "might",
		"stats": {
			"might": 95,
			"wisdom": 88,
			"command": 96
		},
		"hanja": "花郞俊",
		"emoji": "🗡️",
		"quote": "삼한을 하나로 잇겠소."
	},
	{
		"id": "kr_gyebaek",
		"name": "결사",
		"era": "한국사",
		"faction": "백제",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 94,
			"wisdom": 70,
			"command": 90
		},
		"hanja": "決死",
		"emoji": "🛡️",
		"quote": "오천으로 오만을 맞겠다."
	},
	{
		"id": "kr_yeongaesomun",
		"name": "철령",
		"era": "한국사",
		"faction": "고구려",
		"rarity": 5,
		"trait": "might",
		"stats": {
			"might": 96,
			"wisdom": 82,
			"command": 95
		},
		"hanja": "鐵嶺",
		"emoji": "🪓",
		"quote": "요동의 성벽은 무너지지 않는다."
	},
	{
		"id": "kr_gwanggaeto",
		"name": "정복왕",
		"era": "한국사",
		"faction": "고구려",
		"rarity": 5,
		"trait": "might",
		"stats": {
			"might": 97,
			"wisdom": 85,
			"command": 99
		},
		"hanja": "征服王",
		"emoji": "🏇",
		"quote": "북으로, 더 북으로 나아가자."
	},
	{
		"id": "kr_sejong",
		"name": "훈민",
		"era": "한국사",
		"faction": "조선",
		"rarity": 5,
		"trait": "wisdom",
		"stats": {
			"might": 40,
			"wisdom": 100,
			"command": 95
		},
		"hanja": "訓民",
		"emoji": "📖",
		"quote": "백성이 쉽게 익혀 날로 쓰게 하고자 함이라."
	},
	{
		"id": "kr_jangyeongsil",
		"name": "성시",
		"era": "한국사",
		"faction": "조선",
		"rarity": 4,
		"trait": "wisdom",
		"stats": {
			"might": 25,
			"wisdom": 97,
			"command": 45
		},
		"hanja": "星時",
		"emoji": "⏱️",
		"quote": "해 그림자로 시간을 재어 보이겠습니다."
	},
	{
		"id": "kr_choemuseon",
		"name": "화포공",
		"era": "한국사",
		"faction": "고려",
		"rarity": 4,
		"trait": "wisdom",
		"stats": {
			"might": 55,
			"wisdom": 94,
			"command": 70
		},
		"hanja": "火砲工",
		"emoji": "🧨",
		"quote": "화약이라면 제게 맡기시지요."
	},
	{
		"id": "kr_daejoyeong",
		"name": "요동패",
		"era": "한국사",
		"faction": "발해",
		"rarity": 5,
		"trait": "command",
		"stats": {
			"might": 90,
			"wisdom": 88,
			"command": 96
		},
		"hanja": "遼東覇",
		"emoji": "🌅",
		"quote": "고구려의 뒤를 잇겠소."
	},
	{
		"id": "kr_wanggeon",
		"name": "통합공",
		"era": "한국사",
		"faction": "고려",
		"rarity": 5,
		"trait": "virtue",
		"stats": {
			"might": 82,
			"wisdom": 88,
			"command": 94
		},
		"hanja": "統合公",
		"emoji": "👑",
		"quote": "흩어진 것을 다시 모으는 일이오."
	},
	{
		"id": "kr_jeongyakyong",
		"name": "만기",
		"era": "한국사",
		"faction": "조선",
		"rarity": 4,
		"trait": "wisdom",
		"stats": {
			"might": 20,
			"wisdom": 98,
			"command": 60
		},
		"hanja": "萬機",
		"emoji": "🏗️",
		"quote": "거중기로 백성의 짐을 덜겠습니다."
	},
	{
		"id": "kr_heojun",
		"name": "활인",
		"era": "한국사",
		"faction": "조선",
		"rarity": 4,
		"trait": "virtue",
		"stats": {
			"might": 15,
			"wisdom": 95,
			"command": 40
		},
		"hanja": "活人",
		"emoji": "🌿",
		"quote": "병 앞에 귀천이 어디 있겠습니까."
	},
	{
		"id": "kr_sinsaimdang",
		"name": "초충당",
		"era": "한국사",
		"faction": "조선",
		"rarity": 4,
		"trait": "virtue",
		"stats": {
			"might": 12,
			"wisdom": 92,
			"command": 55
		},
		"hanja": "草蟲堂",
		"emoji": "🎨",
		"quote": "붓끝에 마음을 담을 뿐입니다."
	},
	{
		"id": "kr_ahnjunggeun",
		"name": "동양평",
		"era": "한국사",
		"faction": "대한제국",
		"rarity": 5,
		"trait": "virtue",
		"stats": {
			"might": 88,
			"wisdom": 90,
			"command": 85
		},
		"hanja": "東洋平",
		"emoji": "🕊️",
		"quote": "하루라도 글을 읽지 않으면 입에 가시가 돋는다."
	},
	{
		"id": "kr_yugwansun",
		"name": "소녀화",
		"era": "한국사",
		"faction": "일제강점기",
		"rarity": 5,
		"trait": "virtue",
		"stats": {
			"might": 60,
			"wisdom": 80,
			"command": 88
		},
		"hanja": "少女花",
		"emoji": "🔔",
		"quote": "나라에 바칠 목숨이 하나뿐인 것이 슬플 따름입니다."
	},
	{
		"id": "kr_kimgu",
		"name": "자강",
		"era": "한국사",
		"faction": "일제강점기",
		"rarity": 5,
		"trait": "virtue",
		"stats": {
			"might": 70,
			"wisdom": 92,
			"command": 94
		},
		"hanja": "自强",
		"emoji": "🇰🇷",
		"quote": "나의 소원은 오직 완전한 자주독립이오."
	},
	{
		"id": "kr_wonhyo",
		"name": "각원",
		"era": "한국사",
		"faction": "신라",
		"rarity": 4,
		"trait": "wisdom",
		"stats": {
			"might": 30,
			"wisdom": 96,
			"command": 50
		},
		"hanja": "覺圓",
		"emoji": "🪷",
		"quote": "모든 것은 마음이 짓는 것이오."
	},
	{
		"id": "kr_kimjeongho",
		"name": "방각",
		"era": "한국사",
		"faction": "조선",
		"rarity": 4,
		"trait": "wisdom",
		"stats": {
			"might": 35,
			"wisdom": 93,
			"command": 40
		},
		"hanja": "方刻",
		"emoji": "🗺️",
		"quote": "이 땅을 한 장에 담아보겠습니다."
	},
	{
		"id": "kr_gwakjaeu",
		"name": "초모의",
		"era": "한국사",
		"faction": "조선",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 89,
			"wisdom": 80,
			"command": 88
		},
		"hanja": "草募義",
		"emoji": "🔴",
		"quote": "홍의(紅衣)를 보면 왜적이 달아난다 하더이다."
	},
	{
		"id": "kr_nongae",
		"name": "화영",
		"era": "한국사",
		"faction": "조선",
		"rarity": 4,
		"trait": "virtue",
		"stats": {
			"might": 55,
			"wisdom": 70,
			"command": 50
		},
		"hanja": "花影",
		"emoji": "🌸",
		"quote": "남강의 물결을 기억해 주십시오."
	},
	{
		"id": "kr_yihwang",
		"name": "경헌",
		"era": "한국사",
		"faction": "조선",
		"rarity": 3,
		"trait": "wisdom",
		"stats": {
			"might": 15,
			"wisdom": 95,
			"command": 55
		},
		"hanja": "敬軒",
		"emoji": "📚",
		"quote": "경(敬)으로써 마음을 바로 합니다."
	},
	{
		"id": "kr_yii",
		"name": "문형",
		"era": "한국사",
		"faction": "조선",
		"rarity": 3,
		"trait": "wisdom",
		"stats": {
			"might": 20,
			"wisdom": 96,
			"command": 65
		},
		"hanja": "文衡",
		"emoji": "✒️",
		"quote": "십만 양병이 늦지 않았기를 바랍니다."
	},
	{
		"id": "kr_hwanghui",
		"name": "균형공",
		"era": "한국사",
		"faction": "조선",
		"rarity": 3,
		"trait": "virtue",
		"stats": {
			"might": 18,
			"wisdom": 90,
			"command": 75
		},
		"hanja": "均衡公",
		"emoji": "⚖️",
		"quote": "네 말도 옳고, 네 말도 옳다."
	},
	{
		"id": "kr_jeongmongju",
		"name": "청죽",
		"era": "한국사",
		"faction": "고려",
		"rarity": 4,
		"trait": "virtue",
		"stats": {
			"might": 35,
			"wisdom": 93,
			"command": 68
		},
		"hanja": "靑竹",
		"emoji": "🌉",
		"quote": "일백 번 고쳐 죽어도 마음은 하나입니다."
	},
	{
		"id": "jp_himiko",
		"name": "여왕영",
		"era": "일본사",
		"faction": "야마타이",
		"rarity": 5,
		"trait": "wisdom",
		"stats": {
			"might": 20,
			"wisdom": 98,
			"command": 80
		},
		"hanja": "女王影",
		"emoji": "🔮",
		"quote": "귀도(鬼道)로 백성의 마음을 다스리오."
	},
	{
		"id": "jp_taira",
		"name": "평가주",
		"era": "일본사",
		"faction": "다이라가",
		"rarity": 4,
		"trait": "wisdom",
		"stats": {
			"might": 70,
			"wisdom": 80,
			"command": 92
		},
		"hanja": "平家主",
		"emoji": "⚓",
		"quote": "헤이케(平家) 아니면 사람이 아니다."
	},
	{
		"id": "jp_yoritomo",
		"name": "막부조",
		"era": "일본사",
		"faction": "가마쿠라막부",
		"rarity": 5,
		"trait": "wisdom",
		"stats": {
			"might": 65,
			"wisdom": 90,
			"command": 97
		},
		"hanja": "幕府祖",
		"emoji": "🏯",
		"quote": "무사의 세상을 열겠다."
	},
	{
		"id": "jp_yoshitsune",
		"name": "비장군",
		"era": "일본사",
		"faction": "겐지가",
		"rarity": 5,
		"trait": "might",
		"stats": {
			"might": 95,
			"wisdom": 80,
			"command": 88
		},
		"hanja": "悲將軍",
		"emoji": "⚔️",
		"quote": "형의 그늘 아래서도 활은 빗나가지 않았다."
	},
	{
		"id": "jp_murasaki",
		"name": "원씨필",
		"era": "일본사",
		"faction": "헤이안",
		"rarity": 4,
		"trait": "wisdom",
		"stats": {
			"might": 10,
			"wisdom": 99,
			"command": 40
		},
		"hanja": "源氏筆",
		"emoji": "🖋️",
		"quote": "덧없는 세상, 이야기로 남기겠소."
	},
	{
		"id": "jp_seishonagon",
		"name": "침초필",
		"era": "일본사",
		"faction": "헤이안",
		"rarity": 3,
		"trait": "wisdom",
		"stats": {
			"might": 8,
			"wisdom": 96,
			"command": 35
		},
		"hanja": "枕草筆",
		"emoji": "📝",
		"quote": "봄은 새벽이 가장 좋습니다."
	},
	{
		"id": "jp_tomoegozen",
		"name": "여무연",
		"era": "일본사",
		"faction": "겐지가",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 90,
			"wisdom": 60,
			"command": 78
		},
		"hanja": "女武蓮",
		"emoji": "🗡️",
		"quote": "여인이라 활을 못 당길 이유가 없소."
	},
	{
		"id": "jp_nobunaga",
		"name": "화천마",
		"era": "일본사",
		"faction": "오다가",
		"rarity": 5,
		"trait": "might",
		"stats": {
			"might": 88,
			"wisdom": 90,
			"command": 97
		},
		"hanja": "火天魔",
		"emoji": "🔥",
		"quote": "울지 않는 새는 베어버린다."
	},
	{
		"id": "jp_hideyoshi",
		"name": "태합원",
		"era": "일본사",
		"faction": "도요토미가",
		"rarity": 5,
		"trait": "wisdom",
		"stats": {
			"might": 60,
			"wisdom": 96,
			"command": 96
		},
		"hanja": "太閤猿",
		"emoji": "🐒",
		"quote": "천하는 재주로도 쥘 수 있소."
	},
	{
		"id": "jp_ieyasu",
		"name": "인내옹",
		"era": "일본사",
		"faction": "도쿠가와막부",
		"rarity": 5,
		"trait": "virtue",
		"stats": {
			"might": 70,
			"wisdom": 94,
			"command": 98
		},
		"hanja": "忍耐翁",
		"emoji": "🐢",
		"quote": "두견새는 울 때까지 기다리면 되오."
	},
	{
		"id": "jp_shingen",
		"name": "풍림화",
		"era": "일본사",
		"faction": "다케다가",
		"rarity": 5,
		"trait": "might",
		"stats": {
			"might": 90,
			"wisdom": 88,
			"command": 95
		},
		"hanja": "風林火",
		"emoji": "⛰️",
		"quote": "바람처럼 빠르고 숲처럼 고요하게."
	},
	{
		"id": "jp_kenshin",
		"name": "군신아",
		"era": "일본사",
		"faction": "우에스기가",
		"rarity": 5,
		"trait": "virtue",
		"stats": {
			"might": 93,
			"wisdom": 85,
			"command": 94
		},
		"hanja": "軍神牙",
		"emoji": "❄️",
		"quote": "적에게 소금을 보내지 않을 이유가 없소."
	},
	{
		"id": "jp_masamune",
		"name": "독안룡",
		"era": "일본사",
		"faction": "다테가",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 91,
			"wisdom": 82,
			"command": 90
		},
		"hanja": "獨眼龍",
		"emoji": "🐉",
		"quote": "한쪽 눈으로도 천하는 다 보인다."
	},
	{
		"id": "jp_yukimura",
		"name": "일번창",
		"era": "일본사",
		"faction": "사나다가",
		"rarity": 5,
		"trait": "might",
		"stats": {
			"might": 96,
			"wisdom": 75,
			"command": 89
		},
		"hanja": "日番槍",
		"emoji": "🔴",
		"quote": "오사카의 마지막 창은 내가 쥐겠소."
	},
	{
		"id": "jp_musashi",
		"name": "이도인",
		"era": "일본사",
		"faction": "낭인",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 97,
			"wisdom": 70,
			"command": 60
		},
		"hanja": "二刀人",
		"emoji": "🗡️",
		"quote": "천 일의 연습, 만 일의 단련."
	},
	{
		"id": "jp_hanzo",
		"name": "암영조",
		"era": "일본사",
		"faction": "이가",
		"rarity": 4,
		"trait": "wisdom",
		"stats": {
			"might": 75,
			"wisdom": 88,
			"command": 65
		},
		"hanja": "暗影祖",
		"emoji": "🥷",
		"quote": "그림자는 소리를 남기지 않는다."
	},
	{
		"id": "jp_mitsukuni",
		"name": "천하부",
		"era": "일본사",
		"faction": "도쿠가와막부",
		"rarity": 3,
		"trait": "wisdom",
		"stats": {
			"might": 30,
			"wisdom": 92,
			"command": 75
		},
		"hanja": "天下副",
		"emoji": "📖",
		"quote": "이 나라의 역사를 편찬하겠소."
	},
	{
		"id": "jp_naosuke",
		"name": "개항로",
		"era": "일본사",
		"faction": "도쿠가와막부",
		"rarity": 3,
		"trait": "wisdom",
		"stats": {
			"might": 25,
			"wisdom": 90,
			"command": 80
		},
		"hanja": "開港老",
		"emoji": "⚓",
		"quote": "문을 여는 것도 나라를 지키는 길이오."
	},
	{
		"id": "jp_saigo",
		"name": "최후향",
		"era": "일본사",
		"faction": "메이지유신",
		"rarity": 5,
		"trait": "virtue",
		"stats": {
			"might": 85,
			"wisdom": 80,
			"command": 92
		},
		"hanja": "最後鄕",
		"emoji": "🐕",
		"quote": "경천애인(敬天愛人), 하늘을 공경하고 사람을 사랑하라."
	},
	{
		"id": "jp_ryoma",
		"name": "해원랑",
		"era": "일본사",
		"faction": "메이지유신",
		"rarity": 4,
		"trait": "wisdom",
		"stats": {
			"might": 55,
			"wisdom": 92,
			"command": 85
		},
		"hanja": "海援郞",
		"emoji": "⛵",
		"quote": "세상을 다시 씻어내야 하오."
	},
	{
		"id": "eu_caesar",
		"name": "발레리안",
		"era": "세계사",
		"faction": "로마",
		"rarity": 5,
		"trait": "wisdom",
		"stats": {
			"might": 78,
			"wisdom": 92,
			"command": 98
		},
		"hanja": "Valerian",
		"emoji": "🏛️",
		"quote": "왔노라, 보았노라, 그리고 함께 가겠노라."
	},
	{
		"id": "eu_alexander",
		"name": "카시안더",
		"era": "세계사",
		"faction": "마케도니아",
		"rarity": 5,
		"trait": "might",
		"stats": {
			"might": 94,
			"wisdom": 88,
			"command": 97
		},
		"hanja": "Kassiander",
		"emoji": "🐎",
		"quote": "세상의 끝까지 가 보고 싶지 않은가."
	},
	{
		"id": "eu_hannibal",
		"name": "마그나로",
		"era": "세계사",
		"faction": "카르타고",
		"rarity": 5,
		"trait": "wisdom",
		"stats": {
			"might": 85,
			"wisdom": 95,
			"command": 94
		},
		"hanja": "Magnaro",
		"emoji": "🐘",
		"quote": "길이 없다면 알프스를 넘어 만들면 된다."
	},
	{
		"id": "eu_charlemagne",
		"name": "로타리안",
		"era": "세계사",
		"faction": "프랑크",
		"rarity": 5,
		"trait": "virtue",
		"stats": {
			"might": 85,
			"wisdom": 82,
			"command": 95
		},
		"hanja": "Lotharian",
		"emoji": "👑",
		"quote": "검과 글을 함께 쥔 나라를 세우려 하오."
	},
	{
		"id": "eu_joan",
		"name": "셀렌느",
		"era": "세계사",
		"faction": "프랑스",
		"rarity": 5,
		"trait": "virtue",
		"stats": {
			"might": 78,
			"wisdom": 70,
			"command": 92
		},
		"hanja": "Selenne",
		"emoji": "⚜️",
		"quote": "두려움은 제 것이 아닙니다. 깃발을 드십시오."
	},
	{
		"id": "eu_napoleon",
		"name": "발데나르",
		"era": "세계사",
		"faction": "프랑스",
		"rarity": 5,
		"trait": "wisdom",
		"stats": {
			"might": 80,
			"wisdom": 96,
			"command": 99
		},
		"hanja": "Baldenar",
		"emoji": "🎖️",
		"quote": "불가능이라는 말은 겁쟁이의 변명이오."
	},
	{
		"id": "eu_davinci",
		"name": "마라노",
		"era": "세계사",
		"faction": "이탈리아",
		"rarity": 5,
		"trait": "wisdom",
		"stats": {
			"might": 25,
			"wisdom": 100,
			"command": 58
		},
		"hanja": "Marano",
		"emoji": "🪶",
		"quote": "아직 그리지 못한 것이 너무 많소."
	},
	{
		"id": "eu_augustus",
		"name": "세레누스",
		"era": "세계사",
		"faction": "로마",
		"rarity": 4,
		"trait": "wisdom",
		"stats": {
			"might": 55,
			"wisdom": 94,
			"command": 92
		},
		"hanja": "Serenus",
		"emoji": "🦅",
		"quote": "벽돌의 도시를 대리석으로 바꾸겠소."
	},
	{
		"id": "eu_scipio",
		"name": "코르비날",
		"era": "세계사",
		"faction": "로마",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 82,
			"wisdom": 88,
			"command": 90
		},
		"hanja": "Corvinal",
		"emoji": "🛡️",
		"quote": "마그나로를 이기는 법은 마그나로에게 배웠소."
	},
	{
		"id": "eu_leonidas",
		"name": "테살로르",
		"era": "세계사",
		"faction": "스파르타",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 92,
			"wisdom": 60,
			"command": 86
		},
		"hanja": "Thessalor",
		"emoji": "🔺",
		"quote": "와서 가져가라."
	},
	{
		"id": "eu_aurelius",
		"name": "베렌델",
		"era": "세계사",
		"faction": "로마",
		"rarity": 4,
		"trait": "virtue",
		"stats": {
			"might": 58,
			"wisdom": 96,
			"command": 84
		},
		"hanja": "Verendel",
		"emoji": "📖",
		"quote": "오늘 할 수 있는 선(善)을 미루지 마시오."
	},
	{
		"id": "eu_richard",
		"name": "코드윈",
		"era": "세계사",
		"faction": "잉글랜드",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 93,
			"wisdom": 65,
			"command": 86
		},
		"hanja": "Cordwin",
		"emoji": "🦁",
		"quote": "사자의 심장은 물러서는 법을 모른다."
	},
	{
		"id": "eu_william",
		"name": "펜드릭",
		"era": "세계사",
		"faction": "노르만",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 88,
			"wisdom": 78,
			"command": 90
		},
		"hanja": "Fendric",
		"emoji": "🏹",
		"quote": "바다를 건넜으면 배는 태워야 하오."
	},
	{
		"id": "eu_harald",
		"name": "오스트바르드",
		"era": "세계사",
		"faction": "노르웨이",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 95,
			"wisdom": 62,
			"command": 84
		},
		"hanja": "Ostvard",
		"emoji": "🪓",
		"quote": "북쪽에서 왔다. 노를 저을 줄 아는가."
	},
	{
		"id": "eu_frederick",
		"name": "바실로른",
		"era": "세계사",
		"faction": "프로이센",
		"rarity": 4,
		"trait": "wisdom",
		"stats": {
			"might": 78,
			"wisdom": 93,
			"command": 95
		},
		"hanja": "Vasilorn",
		"emoji": "🎼",
		"quote": "왕은 나라의 첫째 종복이오."
	},
	{
		"id": "eu_peter",
		"name": "볼카노프",
		"era": "세계사",
		"faction": "러시아",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 82,
			"wisdom": 90,
			"command": 93
		},
		"hanja": "Volkanov",
		"emoji": "⚓",
		"quote": "바다로 나가는 창을 열어야 하오."
	},
	{
		"id": "eu_elizabeth",
		"name": "코리넬레",
		"era": "세계사",
		"faction": "잉글랜드",
		"rarity": 4,
		"trait": "wisdom",
		"stats": {
			"might": 25,
			"wisdom": 95,
			"command": 90
		},
		"hanja": "Corinelle",
		"emoji": "💍",
		"quote": "나는 이 나라와 혼인했소."
	},
	{
		"id": "eu_nelson",
		"name": "애쉬그레이브",
		"era": "세계사",
		"faction": "잉글랜드",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 85,
			"wisdom": 88,
			"command": 92
		},
		"hanja": "Ashgrave",
		"emoji": "🔭",
		"quote": "나라가 각자의 본분을 기대하고 있다."
	},
	{
		"id": "eu_machiavelli",
		"name": "반토렐리",
		"era": "세계사",
		"faction": "이탈리아",
		"rarity": 4,
		"trait": "wisdom",
		"stats": {
			"might": 22,
			"wisdom": 96,
			"command": 70
		},
		"hanja": "Vantorelli",
		"emoji": "🖋️",
		"quote": "사랑받기 어렵다면, 적어도 얕보이지는 마시오."
	},
	{
		"id": "eu_newton",
		"name": "할베린",
		"era": "세계사",
		"faction": "잉글랜드",
		"rarity": 3,
		"trait": "wisdom",
		"stats": {
			"might": 15,
			"wisdom": 100,
			"command": 48
		},
		"hanja": "Halberin",
		"emoji": "🍎",
		"quote": "거인의 어깨에 올라섰을 뿐이오."
	},
	{
		"id": "eu_michelangelo",
		"name": "첼로리니",
		"era": "세계사",
		"faction": "이탈리아",
		"rarity": 3,
		"trait": "wisdom",
		"stats": {
			"might": 32,
			"wisdom": 94,
			"command": 54
		},
		"hanja": "Cellorini",
		"emoji": "🗿",
		"quote": "돌 안에 이미 있는 것을 꺼낼 뿐이오."
	},
	{
		"id": "eu_eleanor",
		"name": "바엘린",
		"era": "세계사",
		"faction": "프랑스",
		"rarity": 3,
		"trait": "virtue",
		"stats": {
			"might": 20,
			"wisdom": 90,
			"command": 78
		},
		"hanja": "Vaellyn",
		"emoji": "🌹",
		"quote": "두 왕국의 왕비였으니, 셈은 제가 하겠소."
	},
	{
		"id": "wd_ashoka",
		"name": "법륜왕",
		"era": "세계사",
		"faction": "마우리아",
		"rarity": 5,
		"trait": "virtue",
		"stats": {
			"might": 60,
			"wisdom": 92,
			"command": 90
		},
		"hanja": "Dharmandra",
		"emoji": "☸️",
		"quote": "칼로 얻은 땅을 이제 법으로 다스리겠다."
	},
	{
		"id": "wd_akbar",
		"name": "관용제",
		"era": "세계사",
		"faction": "무굴",
		"rarity": 5,
		"trait": "wisdom",
		"stats": {
			"might": 75,
			"wisdom": 93,
			"command": 95
		},
		"hanja": "Akbaran",
		"emoji": "🕌",
		"quote": "믿음은 강요로 얻어지지 않는다."
	},
	{
		"id": "wd_saladin",
		"name": "의검주",
		"era": "세계사",
		"faction": "아이유브",
		"rarity": 5,
		"trait": "virtue",
		"stats": {
			"might": 88,
			"wisdom": 90,
			"command": 96
		},
		"hanja": "Salahin",
		"emoji": "🌙",
		"quote": "예루살렘의 문은 자비로도 열린다."
	},
	{
		"id": "wd_suleiman",
		"name": "장려제",
		"era": "세계사",
		"faction": "오스만",
		"rarity": 5,
		"trait": "wisdom",
		"stats": {
			"might": 80,
			"wisdom": 95,
			"command": 97
		},
		"hanja": "Suleyman",
		"emoji": "🕌",
		"quote": "법과 영광을 함께 세우겠다."
	},
	{
		"id": "wd_ibnsina",
		"name": "의철인",
		"era": "세계사",
		"faction": "페르시아",
		"rarity": 4,
		"trait": "wisdom",
		"stats": {
			"might": 10,
			"wisdom": 99,
			"command": 40
		},
		"hanja": "Sinardo",
		"emoji": "📗",
		"quote": "몸의 이치를 책 한 권에 담겠소."
	},
	{
		"id": "wd_genghis",
		"name": "초원패",
		"era": "세계사",
		"faction": "몽골제국",
		"rarity": 5,
		"trait": "might",
		"stats": {
			"might": 96,
			"wisdom": 85,
			"command": 99
		},
		"hanja": "Tengoran",
		"emoji": "🏹",
		"quote": "세상의 끝까지 말을 달리겠다."
	},
	{
		"id": "wd_khubilai",
		"name": "대원조",
		"era": "세계사",
		"faction": "원",
		"rarity": 5,
		"trait": "wisdom",
		"stats": {
			"might": 75,
			"wisdom": 90,
			"command": 95
		},
		"hanja": "Khuvilan",
		"emoji": "🐎",
		"quote": "초원과 중원을 하나로 잇겠다."
	},
	{
		"id": "wd_mansamusa",
		"name": "황금왕",
		"era": "세계사",
		"faction": "말리제국",
		"rarity": 5,
		"trait": "virtue",
		"stats": {
			"might": 55,
			"wisdom": 88,
			"command": 90
		},
		"hanja": "Mansaren",
		"emoji": "🪙",
		"quote": "금은 나눌수록 내 것이 된다."
	},
	{
		"id": "wd_shaka",
		"name": "창군왕",
		"era": "세계사",
		"faction": "줄루왕국",
		"rarity": 4,
		"trait": "might",
		"stats": {
			"might": 94,
			"wisdom": 75,
			"command": 92
		},
		"hanja": "Shakandu",
		"emoji": "🛡️",
		"quote": "짧은 창이 긴 창을 이긴다."
	},
	{
		"id": "wd_cleopatra",
		"name": "나일화",
		"era": "세계사",
		"faction": "프톨레마이오스",
		"rarity": 5,
		"trait": "wisdom",
		"stats": {
			"might": 30,
			"wisdom": 95,
			"command": 88
		},
		"hanja": "Cleonara",
		"emoji": "🐍",
		"quote": "나일강은 아직 나의 편이오."
	},
	{
		"id": "wd_pachacuti",
		"name": "태양개",
		"era": "세계사",
		"faction": "잉카제국",
		"rarity": 4,
		"trait": "wisdom",
		"stats": {
			"might": 65,
			"wisdom": 88,
			"command": 93
		},
		"hanja": "Pachaneth",
		"emoji": "🏔️",
		"quote": "세상을 뒤바꾸는 자, 그것이 나의 이름이다."
	},
	{
		"id": "wd_moctezuma",
		"name": "독수리주",
		"era": "세계사",
		"faction": "아즈텍",
		"rarity": 4,
		"trait": "virtue",
		"stats": {
			"might": 60,
			"wisdom": 82,
			"command": 85
		},
		"hanja": "Moctezan",
		"emoji": "🦅",
		"quote": "별들이 낯선 자들의 도착을 알렸다."
	},
	{
		"id": "wd_ibnbattuta",
		"name": "천리객",
		"era": "세계사",
		"faction": "여행자",
		"rarity": 3,
		"trait": "wisdom",
		"stats": {
			"might": 20,
			"wisdom": 90,
			"command": 50
		},
		"hanja": "Battutan",
		"emoji": "🧭",
		"quote": "길이 있는 한 걸음을 멈추지 않겠소."
	},
	{
		"id": "wd_hammurabi",
		"name": "율법석",
		"era": "세계사",
		"faction": "바빌로니아",
		"rarity": 4,
		"trait": "virtue",
		"stats": {
			"might": 50,
			"wisdom": 92,
			"command": 88
		},
		"hanja": "Hammuran",
		"emoji": "🪨",
		"quote": "눈에는 눈, 이에는 이, 돌에 새겨 두겠다."
	},
	{
		"id": "wd_attila",
		"name": "재앙편",
		"era": "세계사",
		"faction": "훈제국",
		"rarity": 5,
		"trait": "might",
		"stats": {
			"might": 95,
			"wisdom": 78,
			"command": 94
		},
		"hanja": "Attilan",
		"emoji": "🐎",
		"quote": "신의 채찍이 여기 있다."
	}
]


static func find(id: String) -> Variant:
	for h in HEROES:
		if h.id == id:
			return h
	return null
