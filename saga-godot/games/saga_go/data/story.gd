extends RefCounted

## PLAN 106장 ㉕ — 원신식 이야기 임무(마신 임무 자리). 표만 — 진행은 world/story_quest.gd, 상태는 PartyState.story {ch, step}.
##   장(chapter)마다 단계를 차례로. 단계 type:
##     talk  — 그 인물(NPCS)에게 3m 안에서 F → 대화(줄마다 F·Space·누르기로 넘김, 고르는 줄은 대답만 다르다)
##     go    — 그 자리 radius 안에 들어가기
##     boss  — 들판 보스(world/field_bosses.gd) 하나 쓰러뜨리기(보상 꽃은 따로)
##     kill  — 그 자리에 임무 적(되살아나지 않음·전리품 없음)이 서고, 다 쓰러뜨리기
##     light — 그 자리 옛 제단에 원소 스킬·폭발(어느 원소든)
##     domain — 그 비경(data/domains.gd)을 깨기(보상 나무는 따로)
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
}

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
				"lines": [["버들", "수리왕을 잡았다고? 허, 그놈도 먹구름에 홀렸던 게야."],
					["버들", "먹구름은 바다 건너 제단에서 피어오르지. 거기 오래 잠든 이무기가 있다더군."],
					["?", ["이무기요?", "어떻게 막죠?"]],
					["버들", "폐허의 학자가 옛 비문을 읽고 있다던데, 그 아이한테 가 봐. 요즘 폐허 어귀에 졸개들이 들끓는다니 조심하고."]]},
			{"type": "kill", "region": "ruins", "cell": Vector2(2.0, 1.0), "kinds": ["thunder_cat", "thunder_cat", "bandit", "bandit"],
				"text": "폐허 어귀의 먹구름 졸개 물리치기"},
			{"type": "talk", "npc": "scholar", "text": "떠돌이 학자와 이야기하기",
				"lines": [["은비", "살았다! 졸개들 때문에 비문 곁엔 가지도 못했어."],
					["은비", "여길 봐. '제단에 원소의 불을 밝히면 잠든 것의 이름이 드러난다' — 네 힘이면 될지도 몰라."]]},
			{"type": "light", "region": "ruins", "cell": Vector2(2.75, 2.7), "text": "옛 제단에 원소 스킬로 불 밝히기"},
			{"type": "talk", "npc": "elder", "text": "청하 촌장에게 알리기",
				"lines": [["누리", "먹구름 이무기라… 옛이야기인 줄로만 알았는데."],
					["누리", "고맙다. 네 덕에 마을이 한시름 놓았구나. 이건 마을이 모은 작은 성의란다."],
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
				"lines": [["누리", "하늘이… 개었구나! 몇 해 만에 보는 맑은 하늘이냐."],
					["누리", "이무기는 또 깨어날지 모르지만, 네가 있으니 든든하다. 잔치 준비를 해야겠구나!"]]},
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
