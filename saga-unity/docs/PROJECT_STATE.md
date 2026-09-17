# PROJECT_STATE — saga-unity (상태만, ≤15KB, 덮어쓴다)

**규칙**(`../../SAGA-DESIGN.md` §9 상태 파일): 여기엔 **지금 상태만** 적고 세션이 끝나면 **덮어쓴다**. 날짜별 경위·판단 이유·대화 인용은 `docs/HISTORY.md` 에 append 한다(2026-09-16 재편 전 본문 5,532줄은 그쪽 첫 절에 그대로 있다). 넘치면 `tools/precheck.sh` 가 막는다.
마지막 갱신: 2026-09-17 (REALM 51장 15차 + Localization 잔여 감사(완료 확인) + PLAN 101-2 A·B **다섯 판 전부 이식 완료**(REALM은 "월간 요약 카드"로 변형, 사용자 확정) + 다섯 게임 전부 컴파일·씬 재생성·헤드리스 3연속 검증 완료, STORY 실제 버그 1건 발견·수정).

## 완료 요약 — 다섯 게임 × 진척

| 게임 | 씬 | Vertical Slice(Phase 1~8) | 51장 콘텐츠 확장 | 44장 에셋 교체 | 공통(66-2 라이팅·67~69 사운드/설정/Localization) |
|---|---|---|---|---|---|
| GO | `TestVillage` | 완료 — 도적의 습격(이동·촌장·상인·나그네·조우·전투·등용·EXP·장비·루트·저장 v5+) | 동물 Group·나그네·은닉 보물·산신당·행운 돌탑·동굴 유물·채집·오버월드 지도 | Player·주요 Enemy·Environment·Building·Props 전부 GLB/PBR | 전부 붙음. 디버그 오버레이·저장 버튼·**목표판/세션카드(101-2 A·B, 2026-09-17 컴파일·헤드리스 3연속 검증 완료)** |
| DUNGEON | `TestDungeon` | 완료 — 첫 방→무리·엘리트/보스·방 종류(우물·상자·성소·행상)·회피·강공격·필드(방 2+복도)·동행 | 마을 넷·층 진행·매복·구출·수수께끼·은닉 창고·빌드(회전베기)·도감·보석/영웅 상태 | Player·잡졸(황건적)·미니보스/두목·Environment·Building | 전부 붙음(SFX 실클립 통일). **목표판/세션카드(101-2 A·B, 2026-09-17 검증 완료)** |
| FOREST | `TestVillageForest` | 완료(이동 전용 컨트롤러) — 마을·집·주민 | 벽지/장판·가구 자유 배치(1m 격자)·생물(Flee/Group)·과일나무·채집·좌판·밀어내기 전투 | Environment 완료 | 전부 붙음(데이터 콘텐츠 en 번역도 2026-09-17 감사로 완료 확인). **목표판/세션카드(101-2 A·B, 2026-09-17 검증 완료)** |
| STORY | `TestField` | 완료 — 2.5D 횡스크롤(Z 고정)·잡졸 10·두목·사명 2·볼트·로프 | 척후병 NPC·사건·관계·선택(51장 완결)·전직(Lv.10, 무사/궁수/협객/방사) | 척후병 실제 모델 | 전부 붙음. **목표판/세션카드(101-2 A·B, 2026-09-17 검증 완료)**. `PlayAttackAnim()` animator?. 버그 2026-09-17 수정 |
| REALM | `TestCity` | 완료(경영형, 캐릭터 없음) — 명령·계략(유언비어·화계)·문답 36·서고·월드맵·전투·함락 편입 | **적국 24, 성 27**(51장 15차, 세 사슬 전부 막다른 끝: 허창→소패→하비→수춘→여남→강하→양양→강릉→장사→시상→건업→회계 / 복양→정도→업→진양→운중→상군→삭방→오원 / 진류→낙양→장안→한중→성도→강주→영안) | 도시 Environment/Building | 전부 붙음. `RealmCommandUi` 직렬화 버그(2026-09-15) 수정·저장 버튼 신설. **목표판/세션카드(101-2 A·B, 2026-09-17 컴파일·헤드리스 3연속 검증 완료 — "월간 요약 카드"로 변형, 트리거는 무입력 대신 다음 달)** |

렌더러: 66-1장 PC(Forward+, MSAA 4)/Mobile(Forward, MSAA 2) 이중 프로파일 + `FF16Volume_PC/Mobile.asset`(ACES·Bloom 0.35·Vignette 0.25·PC 만 Grain/CA). 아트 방향은 **사실적 PBR(FF16 톤)** — 66-2장·102장.
캐릭터 파이프라인: Mixamo(Maria·Abe·Brute) → `MixamoRigUtil.RigCharacter()`(Humanoid+`ExtractTextures`) → Animator 8클립. 헤어카드·SSS 는 Shader Graph 배선 대기(사람 몫).

## 현재 작업

- **"이 PC에 Unity 없다"는 이번 세션 초반 판단이 틀렸다** — 사용자가 반문해서 다시 찾아보니 `Editor/6000.3.24f1`이 실제로 있었다(왜 처음 확인이 비었는지 원인 불명 — 다음 세션은 과신하지 말고 다시 `find`할 것). 덕분에 아래 전부 실제로 검증했다.
- **다섯 게임 전부 컴파일·씬 재생성·헤드리스 3연속 검증 완료** — 배치 컴파일 exit 0(라이선스 경고만) → GO/DUNGEON/FOREST/STORY 씬 재생성(REALM `TestCity`는 `BuildTestCityScene.cs`가 도시 데이터를 안 써서 제외, grep으로 확인) → `PlaytestHeadless`·`PlaytestDungeonHeadless`·`PlaytestForestHeadless`·`PlaytestStorySlice`·`PlaytestRealmSlice` 각 3연속. **GO/DUNGEON/FOREST/REALM은 첫 시도부터 3/3**, REALM 검증으로 51장 12~15차 사슬(운중→상군→삭방→오원)도 실제 확인됨.
- **STORY 버그 발견·수정** — `PlaytestStorySlice` 3/3 전부 결정적으로 실패(`UnassignedReferenceException: animator has not been assigned`, GoalBoard 검증은 통과한 뒤라 이번 세션 작업과 무관). 원인: 이 PC엔 Maria 믹사모 애셋이 없어 캡슐 폴백 → `animator`가 "직렬화 때 한 번도 안 채워진" 상태로 남는데, `StoryPlayerController.PlayAttackAnim()`이 `animator?.SetTrigger(...)`(null-조건 연산자)를 써서 Unity의 가짜-null을 못 거르고 `UnassignedReferenceException`을 던졌다(`Update()`의 `if (animator != null)`과 다른 패턴 — 파일 안에서도 일관성이 깨져 있었다). `if (animator != null)`로 고치고 3연속 재검증 — OK. DUNGEON에도 같은 `animator?.` 패턴이 있지만 거긴 이미 3/3 통과라 손 안 댐.
- 부작용: `ProjectSettings/ProjectVersion.txt`·`EditorSettings.asset`·`Packages/manifest.json`·`packages-lock.json`(이 PC 6000.3.24f1 > 프로젝트 6000.3.23f1로 자동 갱신, 매번 `git checkout --`로 원복) · 씬 4개 fileID 전체 churn(정당 — GoalBoard가 실제로 들어감) · 스크립트 7개(GoalBoard·SessionCard·IGoalSource·Go/Dungeon/Forest/StorySessionTracker) `.cs.meta` 자동 생성.
- **PLAN 101-2 A·B REALM 이식 완료(다섯 판 전부 끝)** — REALM 은 캐릭터·이동이 없어 공통 "무입력 5분→세션 카드" 트리거가 안 맞아, 이식 전에 사용자에게 물어 "월간 요약 카드"로 확정(5-7 아이디어 재사용). `RealmSessionTracker`(`Assets/Games/SagaRealm/UI/`)가 `RealmCityState.Changed` 를 구독해 달이 정확히 1개월 넘어갈 때만(세이브 로드로 여러 달 건너뛰는 건 델타로 걸러 제외) `SessionCard` 를 띄운다. "지금"=조망 성+금, "이번 세션"=함락 성 수·금 증감, "이번 주"자리는 의미만 "함락 x/24성"으로 바꿨다(GoalBoard 라벨 자체는 안 건드림). `BuildTestCityScene.BuildGoalBoardUi()`로 배선, `PlaytestRealmSlice`에 구조 체크(`CheckGoalBoardAndSessionCard`, Init 단계)+Phase.Agri 첫 "다음 달" 뒤 실제 트리거 확인 추가 — 컴파일·씬 재생성·3연속 전부 OK.
- (이전 세션들 완료, 이번 세션에 컴파일 검증까지 끝남) PLAN 104-1 Phase 0 ①②③, PLAN 101-2 GO·DUNGEON·FOREST·STORY 이식, REALM 51장 12~15차 확장(진양→운중→상군→삭방→오원, 세 사슬 전부 막다른 끝), Localization 잔여 감사(다섯 게임 전부 완료 확인, node key-by-key 비교) — 경위는 각각 HISTORY 2026-09-16·2026-09-17 grep.

## 다음 작업 (우선순위, 상세는 PLAN 해당 장 · 경위는 HISTORY 날짜 grep)

1. ~~컴파일·재검증~~ — 2026-09-17 이 PC에서 완료(다섯 게임 컴파일·씬 재생성·헤드리스 3연속 전부 OK, STORY 버그 1건 수정). 앞으로 새 소스 변경분만 그때그때 검증하면 된다(전부 다시 쌓아 둘 필요 없음).
2. ~~PLAN 101-2 A·B~~ — REALM 까지 포함해 **다섯 판 전부 완료**(2026-09-17, 위 "현재 작업" 참고).
3. **실기 GUI 확인 몰아서** — 아래 "실기 확인 대기" 전부(다섯 SettingsPanel + 다섯 판 목표판/세션카드 포함). 사용자가 직접 하거나 명시 요청 시(폴더 CLAUDE.md).
4. **PLAN 104장 Phase 0 나머지** — `Assets/Art/*_candidates` 정리 판정만 남음(102-4 표는 있으나 105장 Q1 완성판 트랙 결정 뒤로 미룸 — 사용자 결정 대기, 손대지 않음).
5. **REALM 51장 더 늘리기(범위 재검토 필요, 사용자 상의)** — **세 사슬(허창·복양·진류) 전부 확정된 막다른 끝에 닿았다**(15차, 2026-09-17). 계속 늘리려면: (a) 새 시작 성/사슬을 아예 새로 여는 방법(원작 시나리오 194 조조군 성 셋 밖), 또는 (b) `RealmCityData.cs` 클래스 주석의 "정복·외교는 안 들인다(제외)" 결정을 재검토하는 방법 중 사용자와 상의해서 골라야 한다 — 감으로 먼저 코드를 고치지 말 것.

## 알려진 오류

- 없음(컴파일·헤드리스 기준, 2026-09-17 다섯 게임 전부 재확인).
- **함정(오류 아님)**: 이 PC Unity 6000.3.24f1 > 프로젝트 6000.3.23f1 → 배치 모드가 `ProjectSettings/ProjectVersion.txt`·`EditorSettings.asset`·`Packages/manifest.json`·`packages-lock.json` 을 조용히 고친다. 커밋 전 `git checkout -- ProjectSettings/ Packages/`.
- `PlaytestHeadless.Run()` 은 `-quit` 없이 부른다(Run 이 스스로 Exit). Play 진입 시 도메인 리로드 비활성 설정을 걸고 끝에 원복한다.
- 씬 `Build()` 는 GameObject 구성이 바뀔 때만 다시 돈다(안 그러면 fileID churn 14000줄).
- 에디터 빌드 스크립트가 한 번만 채우는 컴포넌트의 참조 필드는 반드시 `[SerializeField]`(plain private 는 재로드 후 null — REALM·LocalizedButtonLabel 두 번 밟음).
- **`animator?.SetTrigger(...)`(null-조건 연산자) 쓰지 말 것** — 애셋 폴백으로 "직렬화 때 한 번도 안 채워진" `UnityEngine.Object`는 진짜 C# null이 아니라 `?.`가 못 거르고 `UnassignedReferenceException`을 던진다. `if (animator != null)`로 명시적으로 막을 것(2026-09-17 STORY `PlayAttackAnim()`에서 실제로 겪음 — DUNGEON에도 같은 패턴이 남아 있으나 거긴 안 터져서 안 건드림, 터지면 같은 식으로 고칠 것).

## 테스트 상태 (2026-09-17 기준, 전부 배치 모드, 이 PC Unity 6000.3.24f1로 실제 실행)

| 검증 | 결과 |
|---|---|
| `-batchmode -nographics -quit` 컴파일 | exit 0, 오류 0(라이선스 토큰 경고만) |
| 씬 재생성(GO/DUNGEON/FOREST/STORY) | 4개 전부 exit 0, GoalBoard 실제 삽입 확인 |
| 씬 재생성(REALM `TestCity`, GoalBoard/SessionCard 배선 추가분) | exit 0 |
| `PlaytestHeadless`(GO) | 3연속 OK |
| `PlaytestDungeonHeadless` | 3연속 OK. 하위 슬라이스(`FloorProgression`·`FieldAmbush`·`Shortcut`·`Town2`·`Towns34`) 도 이번 세션에 1회씩 재검증 — 전부 OK, 회귀 없음 |
| `PlaytestForestHeadless` | 3연속 OK. 하위 슬라이스(`Creatures`·`Finish`·`Furniture`·`HouseTransition`) 도 이번 세션에 1회씩 재검증 — 전부 OK, 회귀 없음 |
| `PlaytestOverworldMap`(GO) | 1회 재검증 — OK, 회귀 없음 |
| `PlaytestStorySlice`(전직·언어 전환·save/load 포함) | 첫 3연속 전부 실패(animator 버그) → 수정 후 3연속 OK |
| `PlaytestRealmSlice`(적국 24 함락·편입·패널 실제 토글·저장 버튼·save/load, 51장 12~15차 사슬, GoalBoard 구조+월간 트리거 실제 확인 포함) | 3연속 OK |
| GUI 실제 Play 확인 | GO 라이팅 톤·`TestCharacterRealistic`(Maria idle/run/attack) 만. 나머지 아래(여전히 미확인 — 헤드리스와 별개) |

## 실기 확인 대기 (항목명만 — 경위는 HISTORY grep)

- GO: 조우·전투·등용 손맛, 상점·퀘스트 대사 3단계, 은닉 보물·산신당·돌탑·유물, 동물 Group 발동 장면, 채집, 드로우콜 Before/After(Stats 창), **목표판 3줄 화면 배치(대화창과 안 겹치는지)·세션카드 실제 등장(무입력 5분 체감)**
- DUNGEON: 카메라 각도·공격 버튼 vs CameraRig 드래그 겹침, 아홉 슬라이스 전부(무리·엘리트/보스·방 종류·회피·필드·강공격·행상·동행·GLB), 마을 넷·층 진행·매복·구출·수수께끼·회전베기, 사실적 Player/Enemy/Boss 톤, 무드 유지 판단, **목표판 3줄 화면 배치(미니맵과 안 겹치는지)·세션카드 실제 등장**
- FOREST: 벽지/장판, 가구 자유 배치 18칸, 생물·과일나무·좌판, 밀어내기 전투, 팔레트 데움 정도, **목표판 3줄 화면 배치·세션카드 실제 등장**
- STORY: 두목 크기·타격감(반격 없음이 샌드백처럼 느껴지는지), 사건·관계·선택 흐름, 전직 팝업, 척후병 모델, **목표판 3줄 화면 배치·세션카드 실제 등장**
- REALM: 월드맵, 적국 사슬 진행 체감, 패널 여덟 실제 조작, 저장 토스트, **목표판 3줄 화면 배치(다섯 버튼 행과 안 겹치는지)·세션카드 실제 등장("다음 달" 클릭 체감, 무입력 아님)**
- 공통: BGM 음량 균형·루프 이음매, 설정 패널 6줄(언어 전환 실시간), 디버그 오버레이, 두 Volume 프로파일 톤 일치(PC/Mobile)
