extends RefCounted

## PLAN 106장 ㉕ — 원신식 이야기 임무(마신 임무 자리). 표만 — 진행은 world/story_quest.gd, 상태는 PartyState.story {ch, step}.
##   장(chapter)마다 단계를 차례로. 단계 type:
##     talk  — 그 인물(NPCS)에게 3m 안에서 F → 대화(줄마다 F·Space·누르기로 넘김, 고르는 줄은 대답만 다르다).
##             줄 = [말하는 이, 글, 표정?] — 표정은 world/talk_face.gd MOODS(joy·angry·sorrow·surprised·fun), 없으면 보통
##     go    — 그 자리 radius 안에 들어가기
##     boss  — 들판 보스(world/field_bosses.gd) 하나 쓰러뜨리기(보상 꽃은 따로)
##     kill  — 그 자리에 임무 적(되살아나지 않음·전리품 없음)이 서고, 다 쓰러뜨리기
##     light — 그 자리 옛 제단에 원소 스킬·폭발(어느 원소든)
##     domain — 그 비경(data/domains.gd)을 깨기(보상 나무는 따로)
##     gather — 그 채집물(data/cooking.gd GATHER)을 count 번 캐기(world/gathering.gd `gathered`, 센 수는 저장 안 함)
##     cook   — 아무 요리나 한 번(world/kitchen.gd `cooked`)
##     follow — 그 인물이 path(칸 좌표)를 따라 걷는다 — 내가 FOLLOW_NEAR 안이면 걷고 멀면 서서 기다린다. 길 끝에 닿으면 끝(불러오면 길 처음부터)
##     seal   — 그 자리 제단을 둘러싼 석등(order 순서의 SEAL_MARKS)을 order 차례대로 원소 스킬·폭발로 밝힌다(어느 원소든).
##              차례가 틀리면 다 꺼진다. 한 번에 여럿이 닿으면 다음 차례 것만 켜진다. 켠 수는 저장 안 함
##   인물 자리: appear(보일 때만 서 있는 인물) · stations(늘 있는 인물이 그 장·단계 동안 옮겨 서는 자리) —
##     둘 다 {ch, from, to, region?, cell?} 한 칸 또는 여러 칸. region·cell 이 있으면 그 동안 거기에 선다.
##   대화 줄 말하는 이가 바뀌면 카메라가 그쪽으로(player/camera_rig.gd talk_shot — 인물 말은 내 어깨 너머, 내 말은 인물 어깨 너머).
##   단계마다 부대 경험 STEP_EXP, 장 끝에 reward + exp. 장은 모험 등급 ar 에 열린다.
##   목표 자리엔 금빛 기둥·"◆ 거리", 왼쪽 미니맵 밑에 임무 이름·목표, 지도·미니맵에 금빛 마름모(미니맵 밖이면 가장자리).
## 이야기·이름은 이 판 것(오마주 문법만). 등장인물은 가상의 마을 사람.

const STEP_EXP := 10.0
const TALK_M := 3.0

const NPCS := {
	"elder": {"name": "청하 촌장 누리", "region": "village", "cell": Vector2(5.8, 3.3), "rarity": 3, "cloth": Color(0.42, 0.5, 0.38),
		"idle": "먹구름이 걷히면 마을 잔치를 열어야지."},
	"ferryman": {"name": "늙은 사공 버들", "region": "coast", "cell": Vector2(4.0, 4.65), "rarity": 2, "cloth": Color(0.3, 0.4, 0.55),
		"idle": "바다 냄새가 요즘 영 비릿해."},
	"scholar": {"name": "떠돌이 학자 은비", "region": "ruins", "cell": Vector2(3.1, 2.35), "rarity": 4, "cloth": Color(0.55, 0.42, 0.6),
		"idle": "이 비문, 읽을수록 이상하다니까."},
	## 4장에만 나오는 인물 — appear 의 장·단계 사이에만 서 있고, 따라가기(follow) 단계를 지나면 길 끝에 선다. mask = 얼굴에 흰 가면.
	"wanderer": {"name": "가면 쓴 나그네", "region": "village", "cell": Vector2(5.7, 6.2), "rarity": 4, "cloth": Color(0.22, 0.22, 0.28),
		"idle": "……", "mask": true, "appear": [{"ch": 3, "from": 1, "to": 5},
			{"ch": 4, "from": 6, "to": 6, "region": "village", "cell": Vector2(0.9, 1.62)}]},
}

## 학자는 5장 동안 서쪽 고개 옛길에 가 있다(0~3 단계 옛길 어귀, 4~7 단계 둘째 제단 곁).
const STATIONS := {
	"scholar": [{"ch": 4, "from": 0, "to": 3, "region": "village", "cell": Vector2(1.1, 2.55)},
		{"ch": 4, "from": 4, "to": 7, "region": "village", "cell": Vector2(1.5, 1.62)}],
}

## seal 석등 표지 — 글자·빛깔. 석등은 제단 둘레 SEAL_RING m 에, 놓인 자리 차례는 order 와 다르다(SEAL_LAYOUT).
const SEAL_MARKS := {
	"sun": {"name": "해", "color": Color(1.0, 0.62, 0.25)},
	"moon": {"name": "달", "color": Color(0.7, 0.8, 1.0)},
	"star": {"name": "별", "color": Color(0.95, 0.9, 0.55)},
}
const SEAL_RING := 6.0
const SEAL_LAYOUT := ["moon", "star", "sun"] # 둘레에 놓는 차례(북쪽부터 시계 방향)

const FOLLOW_NEAR := 12.0 # 이 안이면 따라가는 인물이 걷는다
const FOLLOW_SPEED := 2.6 # m/초
const FOLLOW_LOST := 30.0 # 이보다 멀면 추적 글자에 "놓치겠다"

const CHAPTERS := [
	{"id": "ch1", "name": "제1장 · 먹구름이 오는 마을", "ar": 1,
		"reward": {"fate_knot": 2, "mora": 10000, "book_m": 3, "talent_2": 2}, "exp": 100.0,
		"steps": [
			{"type": "talk", "npc": "elder", "text": "청하 촌장을 찾아가기",
				"lines": [["누리", "왔구나. 요 며칠 동쪽 숲에서 바람이 울고, 하늘에 먹구름이 걷히질 않는단다."],
					["누리", "옛날부터 먹구름은 나쁜 기운이 깨어날 때 온다고 했지."],
					["?", ["제가 알아볼게요.", "바람이 운다고요?"]],
					["누리", "동쪽 숲 끝에 가 보렴. 거기 커다란 새가 둥지를 틀었다는 소문이 있어."]]},
			{"type": "go", "region": "village", "cell": Vector2(9.3, 3.5), "radius": 12.0, "text": "동쪽 숲 끝, 바람이 우는 곳으로"},
			{"type": "boss", "boss": "gale_roc", "text": "돌개바람 수리왕을 쓰러뜨리기"},
			{"type": "talk", "npc": "ferryman", "text": "포구의 늙은 사공에게 먹구름을 묻기",
				"lines": [["버들", "수리왕을 잡았다고? 허, 그놈도 먹구름에 홀렸던 게야.", "surprised"],
					["버들", "먹구름은 바다 건너 제단에서 피어오르지. 거기 오래 잠든 이무기가 있다더군."],
					["?", ["이무기요?", "어떻게 막죠?"]],
					["버들", "폐허의 학자가 옛 비문을 읽고 있다던데, 그 아이한테 가 봐. 요즘 폐허 어귀에 졸개들이 들끓는다니 조심하고."]]},
			{"type": "kill", "region": "ruins", "cell": Vector2(2.0, 1.0), "kinds": ["thunder_cat", "thunder_cat", "bandit", "bandit"],
				"text": "폐허 어귀의 먹구름 졸개 물리치기"},
			{"type": "talk", "npc": "scholar", "text": "떠돌이 학자와 이야기하기",
				"lines": [["은비", "살았다! 졸개들 때문에 비문 곁엔 가지도 못했어.", "joy"],
					["은비", "여길 봐. '제단에 원소의 불을 밝히면 잠든 것의 이름이 드러난다' — 네 힘이면 될지도 몰라."]]},
			{"type": "light", "region": "ruins", "cell": Vector2(2.75, 2.7), "text": "옛 제단에 원소 스킬로 불 밝히기"},
			{"type": "talk", "npc": "elder", "text": "청하 촌장에게 알리기",
				"lines": [["누리", "먹구름 이무기라… 옛이야기인 줄로만 알았는데.", "sorrow"],
					["누리", "고맙다. 네 덕에 마을이 한시름 놓았구나. 이건 마을이 모은 작은 성의란다.", "joy"],
					["누리", "이무기를 상대하려면 더 강해져야 할 게다. 모험을 더 쌓고 오렴."]]},
		]},
	{"id": "ch2", "name": "제2장 · 먹구름 제단", "ar": 5,
		"reward": {"fate_knot": 3, "mora": 20000, "book_l": 1, "talent_3": 1}, "exp": 150.0,
		"steps": [
			{"type": "talk", "npc": "scholar", "text": "학자에게 제단 가는 길을 묻기",
				"lines": [["은비", "비문을 다 읽었어. 이무기는 포구 남쪽 모래밭, 먹구름 제단 안에 잠들어 있어."],
					["은비", "이무기는 번개를 두르면 불에 약해. 준비 단단히 해!"]]},
			{"type": "go", "region": "coast", "cell": Vector2(5.4, 7.0), "radius": 8.0, "text": "포구 남쪽 먹구름 제단으로"},
			{"type": "domain", "domain": "weekly", "text": "먹구름 제단에서 먹구름 이무기를 쓰러뜨리기"},
			{"type": "talk", "npc": "elder", "text": "청하 촌장에게 알리기",
				"lines": [["누리", "하늘이… 개었구나! 몇 해 만에 보는 맑은 하늘이냐.", "joy"],
					["누리", "이무기는 또 깨어날지 모르지만, 네가 있으니 든든하다. 잔치 준비를 해야겠구나!"]]},
		]},
	{"id": "ch3", "name": "제3장 · 잔칫날의 불청객", "ar": 7,
		"reward": {"fate_knot": 3, "mora": 25000, "book_l": 2, "talent_3": 1}, "exp": 180.0,
		"steps": [
			{"type": "talk", "npc": "elder", "text": "촌장에게 잔치 일손을 돕겠다고 하기",
				"lines": [["누리", "하늘이 갠 기념으로 잔치를 열기로 했단다. 그런데 일손이 모자라구나."],
					["누리", "마을 둘레에 피는 청하란을 셋만 꺾어다 주렴. 잔칫상에 꽂을 꽃이란다."],
					["?", ["맡겨 주세요.", "음식은요?"]],
					["누리", "꽃을 꺾거든 솥에서 요리도 하나 해 오렴. 사공 버들이 요즘 통 입맛이 없다더구나."]]},
			{"type": "gather", "item": "orchid", "count": 3, "text": "청하란 꺾기"},
			{"type": "cook", "text": "순간이동 지점 솥에서 요리 하나 만들기"},
			{"type": "talk", "npc": "ferryman", "text": "포구의 사공에게 요리 가져다주기",
				"lines": [["버들", "오, 냄새 좋구나! 이 늙은이를 다 챙겨 주고.", "joy"],
					["버들", "그런데 말이다, 어젯밤 폐허 쪽 하늘이 벌겋더구나. 잿불 도깨비왕이 또 날뛰는 게야."],
					["?", ["제가 가 볼게요.", "잔치에 불똥이 튀면 큰일이네요."]],
					["버들", "그놈 불씨가 바람을 타고 마을로 날아들면 잔치고 뭐고 다 타 버릴 게다. 조심하거라.", "angry"]]},
			{"type": "boss", "boss": "ember_king", "text": "잿불 도깨비왕을 쓰러뜨리기"},
			{"type": "talk", "npc": "scholar", "text": "떠돌이 학자에게 폐허 소식 전하기",
				"lines": [["은비", "도깨비왕을 잡았다고? 마침 잘 왔어. 비문 둘째 조각을 찾았거든."],
					["은비", "'가면 쓴 나그네가 제단을 두드려 잠든 것을 깨웠다' — 이무기는 스스로 깨어난 게 아니었어.", "surprised"],
					["?", ["가면 쓴 나그네?", "누가 그런 짓을?"]],
					["은비", "잠든 무덤 안쪽에 그 나그네가 남긴 흔적이 있을지도 몰라. 가 보자."]]},
			{"type": "domain", "domain": "tomb", "text": "잠든 무덤에서 나그네의 흔적 찾기"},
			{"type": "kill", "region": "village", "cell": Vector2(5.8, 3.3), "kinds": ["fire_imp", "fire_imp", "fire_imp", "wind_hawk"],
				"text": "잔치 마당에 쳐들어온 잿불 졸개 물리치기"},
			{"type": "talk", "npc": "elder", "text": "청하 촌장에게 알리기",
				"lines": [["누리", "휴, 네가 없었으면 잔치 마당이 잿더미가 될 뻔했구나.", "sorrow"],
					["누리", "가면 쓴 나그네라… 옛이야기에 그런 자가 있었지. 먹구름이 올 때마다 어딘가에 서 있었다던."],
					["누리", "오늘은 걱정 말고 실컷 먹고 즐기렴. 이건 잔치 손님께 드리는 선물이란다.", "joy"]]},
		]},
	{"id": "ch4", "name": "제4장 · 가면 쓴 나그네", "ar": 10,
		"reward": {"fate_knot": 3, "mora": 30000, "book_l": 2, "talent_3": 2}, "exp": 200.0,
		"steps": [
			{"type": "talk", "npc": "elder", "text": "촌장에게 새벽 소식 듣기",
				"lines": [["누리", "잔치 이튿날 새벽이었단다. 남쪽 다리목에 웬 가면 쓴 나그네가 서 있더래."],
					["누리", "말을 걸어도 대꾸도 않고 강물만 보더라는구나. 옛이야기 속 그자일까…"],
					["?", ["제가 만나 볼게요.", "위험한 사람일까요?"]],
					["누리", "조심하거라. 먹구름이 올 때마다 서 있었다던 자라면, 좋은 뜻인지 나쁜 뜻인지 아무도 모른단다.", "sorrow"]]},
			{"type": "talk", "npc": "wanderer", "text": "남쪽 다리목의 가면 쓴 나그네에게 말 걸기",
				"lines": [["나그네", "……먹구름을 걷어 낸 게 너로군."],
					["나그네", "여기선 귀가 많다. 할 말이 있으면 따라오게."],
					["?", ["따라가죠.", "당신은 누구죠?"]],
					["나그네", "걸으면서 생각해 보게. 너무 떨어지면 기다려 주지 않을 테니."]]},
			{"type": "follow", "npc": "wanderer", "region": "village",
				"path": [Vector2(5.7, 6.2), Vector2(5.0, 6.35), Vector2(5.0, 7.65), Vector2(5.0, 8.4), Vector2(6.3, 9.0), Vector2(7.2, 9.2)],
				"text": "가면 쓴 나그네를 놓치지 않고 따라가기"},
			{"type": "talk", "npc": "wanderer", "text": "남쪽 들녘에서 나그네의 말 듣기",
				"lines": [["나그네", "여기라면 듣는 이가 없겠지. 이무기를 깨운 건 내가 아니다."],
					["나그네", "나는 제단을 두드리고 다니는 자를 쫓고 있을 뿐이다. 그자도 가면을 쓰지 — 그래서 다들 나로 착각하더군."],
					["?", ["그럼 진짜는 따로 있다는 거예요?", "증거라도 있나요?"]],
					["나그네", "증거라… 마침 저기 풀숲이 수상하군. 너도 쫓기고 있었던 모양이다."]]},
			{"type": "kill", "region": "village", "cell": Vector2(7.2, 9.2), "kinds": ["bandit", "bandit", "ice_fox", "rock_bear"],
				"text": "들녘에 숨어 있던 가면 졸개 물리치기"},
			{"type": "talk", "npc": "wanderer", "text": "나그네에게 돌아가기",
				"lines": [["나그네", "제법이군. 이 졸개들이 쓴 가면을 보게 — 내 것과 무늬가 다르지."],
					["나그네", "이 조각을 폐허의 학자에게 보이게. 비문을 읽는 아이라면 알아볼 게다."],
					["나그네", "우린 또 만나겠지. 다음 먹구름이 오기 전에."]]},
			{"type": "talk", "npc": "scholar", "text": "떠돌이 학자에게 가면 조각 보이기",
				"lines": [["은비", "가면 조각? 어디 봐… 이 무늬, 비문 맨 아래 새겨진 거랑 똑같아!", "surprised"],
					["은비", "비문엔 제단이 다섯이라고 적혀 있어. 먹구름 제단은 그중 하나일 뿐이고."],
					["?", ["나머지 넷은 어디에?", "가면 쓴 자는 누구죠?"]],
					["은비", "아직은 몰라. 하지만 조각이 모이면 알 수 있을 거야. 서쪽 고개 너머 옛길을 먼저 뒤져 볼게."]]},
			{"type": "talk", "npc": "elder", "text": "청하 촌장에게 알리기",
				"lines": [["누리", "나그네가 쫓는 가면 쓴 자라… 먹구름이 다섯 번이나 더 올 수 있다는 말이냐.", "sorrow"],
					["누리", "네가 있어 다행이구나. 마을 사람들 몫으로 모은 것이니 받아 두렴."]]},
		]},
	{"id": "ch5", "name": "제5장 · 서쪽 고개 옛길", "ar": 12,
		"reward": {"fate_knot": 3, "mora": 35000, "book_l": 3, "talent_3": 2}, "exp": 220.0,
		"steps": [
			{"type": "talk", "npc": "elder", "text": "촌장에게 학자 소식 듣기",
				"lines": [["누리", "은비가 서쪽 고개 옛길로 떠난 지 사흘째란다. 그 뒤로 소식이 뚝 끊겼어.", "sorrow"],
					["누리", "그 길은 사당보다도 오래된 길이야. 숲에 묻혀서 이제 아는 사람도 드물지."],
					["?", ["제가 찾아볼게요.", "혼자 간 거예요?"]],
					["누리", "마을 서쪽 숲으로 들어가 고개 밑을 따라 북쪽으로 오르면 옛길이 나온단다. 서두르렴."]]},
			{"type": "go", "region": "village", "cell": Vector2(1.3, 4.6), "radius": 10.0, "text": "서쪽 숲 옛길 어귀로"},
			{"type": "kill", "region": "village", "cell": Vector2(1.1, 2.55), "kinds": ["bandit", "bandit", "grass_snake", "wind_hawk"],
				"text": "옛길에서 학자를 에워싼 가면 졸개 물리치기"},
			{"type": "talk", "npc": "scholar", "text": "옛길에서 학자와 이야기하기",
				"lines": [["은비", "휴, 살았다! 비문을 베끼다가 졸개들한테 딱 걸렸지 뭐야.", "joy"],
					["은비", "둘째 제단은 이 고개 너머, 옛 사당 뒤 숲에 있어. 석등 셋이 제단을 둘러싸고 있지."],
					["은비", "비문엔 이렇게 적혀 있었어 — '해가 뜨고, 달이 지고, 별이 남는다'. 그 차례대로 불을 밝혀야 봉인이 풀려."],
					["?", ["차례가 틀리면요?", "먼저 가 볼게요."]],
					["은비", "전부 꺼져 버리겠지. 해, 달, 별 — 잊으면 안 돼!"]]},
			{"type": "seal", "region": "village", "cell": Vector2(1.15, 1.3), "order": ["sun", "moon", "star"],
				"text": "둘째 제단 석등을 비문 차례대로 밝히기"},
			{"type": "kill", "region": "village", "cell": Vector2(1.15, 1.3), "kinds": ["bandit", "bandit", "thunder_cat", "ice_fox", "rock_bear"],
				"text": "제단에 몰려든 가면 무리 물리치기"},
			{"type": "talk", "npc": "wanderer", "text": "제단 곁의 가면 쓴 나그네와 이야기하기",
				"lines": [["나그네", "……한발 늦을 뻔했군. 그자가 이 제단을 두드리러 오던 참이었다."],
					["나그네", "네가 먼저 봉인을 밝혀 두었으니 깨우지는 못하고, 졸개만 풀어 놓고 달아났지."],
					["?", ["그자를 봤어요?", "어디로 갔죠?"]],
					["나그네", "북쪽 봉우리 너머로. 그자가 떨군 비문 조각이다 — 학자에게 건네게."]]},
			{"type": "talk", "npc": "scholar", "text": "학자에게 셋째 비문 조각 건네기",
				"lines": [["은비", "셋째 조각…! '다섯 제단이 모두 깨면 먹구름의 주인이 돌아온다'.", "surprised"],
					["은비", "가면 쓴 자가 노리는 건 이무기가 아니었어. 그 '주인'이야."],
					["?", ["먹구름의 주인?", "남은 제단은 셋이네요."]],
					["은비", "둘은 우리가 지켰어. 남은 셋은… 조각을 더 읽어 보고 알려 줄게."]]},
			{"type": "talk", "npc": "elder", "text": "청하 촌장에게 알리기",
				"lines": [["누리", "은비가 무사하다니 다행이구나. 먹구름의 주인이라… 이름만 들어도 오싹하다.", "sorrow"],
					["누리", "잊혔던 옛길까지 되살려 준 셈이니 마을이 네게 진 빚이 크구나. 받아 두렴.", "joy"]]},
		]},
]

static func chapter(i: int) -> Dictionary:
	return CHAPTERS[i] if i >= 0 and i < CHAPTERS.size() else {}

static func step_of(ch: int, st: int) -> Dictionary:
	var c := chapter(ch)
	if c.is_empty():
		return {}
	var steps: Array = c.steps
	return steps[st] if st >= 0 and st < steps.size() else {}

static func all_done(ch: int) -> bool:
	return ch >= CHAPTERS.size()

## appear·stations 값 → 칸 목록(한 칸짜리 사전도 받는다).
static func windows(v: Variant) -> Array:
	if v is Array:
		return v
	return [v] if v is Dictionary and not (v as Dictionary).is_empty() else []
