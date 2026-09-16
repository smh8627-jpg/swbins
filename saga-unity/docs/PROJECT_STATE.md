# PROJECT_STATE — saga-unity (상태만, ≤15KB, 덮어쓴다)

**규칙**(`../../SAGA-DESIGN.md` §9 상태 파일): 여기엔 **지금 상태만** 적고 세션이 끝나면 **덮어쓴다**. 날짜별 경위·판단 이유·대화 인용은 `docs/HISTORY.md` 에 append 한다(2026-09-16 재편 전 본문 5,532줄은 그쪽 첫 절에 그대로 있다). 넘치면 `tools/precheck.sh` 가 막는다.
마지막 갱신: 2026-09-17 (REALM 51장 15차 + Localization 잔여 항목 감사(전부 완료 확인) + DUNGEON GoalBoard/SessionCard 이식 — 이 PC 에 Unity 없어 컴파일 미검증).

## 완료 요약 — 다섯 게임 × 진척

| 게임 | 씬 | Vertical Slice(Phase 1~8) | 51장 콘텐츠 확장 | 44장 에셋 교체 | 공통(66-2 라이팅·67~69 사운드/설정/Localization) |
|---|---|---|---|---|---|
| GO | `TestVillage` | 완료 — 도적의 습격(이동·촌장·상인·나그네·조우·전투·등용·EXP·장비·루트·저장 v5+) | 동물 Group·나그네·은닉 보물·산신당·행운 돌탑·동굴 유물·채집·오버월드 지도 | Player·주요 Enemy·Environment·Building·Props 전부 GLB/PBR | 전부 붙음. 디버그 오버레이·저장 버튼·**목표판/세션카드(101-2 A·B, 뼈대)** |
| DUNGEON | `TestDungeon` | 완료 — 첫 방→무리·엘리트/보스·방 종류(우물·상자·성소·행상)·회피·강공격·필드(방 2+복도)·동행 | 마을 넷·층 진행·매복·구출·수수께끼·은닉 창고·빌드(회전베기)·도감·보석/영웅 상태 | Player·잡졸(황건적)·미니보스/두목·Environment·Building | 전부 붙음(SFX 실클립 통일). **목표판/세션카드(101-2 A·B, 뼈대, 이번 세션 이식)** |
| FOREST | `TestVillageForest` | 완료(이동 전용 컨트롤러) — 마을·집·주민 | 벽지/장판·가구 자유 배치(1m 격자)·생물(Flee/Group)·과일나무·채집·좌판·밀어내기 전투 | Environment 완료 | 전부 붙음(데이터 콘텐츠 en 번역도 2026-09-17 감사로 완료 확인) |
| STORY | `TestField` | 완료 — 2.5D 횡스크롤(Z 고정)·잡졸 10·두목·사명 2·볼트·로프 | 척후병 NPC·사건·관계·선택(51장 완결)·전직(Lv.10, 무사/궁수/협객/방사) | 척후병 실제 모델 | 전부 붙음 |
| REALM | `TestCity` | 완료(경영형, 캐릭터 없음) — 명령·계략(유언비어·화계)·문답 36·서고·월드맵·전투·함락 편입 | **적국 24, 성 27**(51장 15차, 세 사슬 전부 막다른 끝: 허창→소패→하비→수춘→여남→강하→양양→강릉→장사→시상→건업→회계 / 복양→정도→업→진양→운중→상군→삭방→오원 / 진류→낙양→장안→한중→성도→강주→영안) | 도시 Environment/Building | 전부 붙음. `RealmCommandUi` 직렬화 버그(2026-09-15) 수정·저장 버튼 신설 |

렌더러: 66-1장 PC(Forward+, MSAA 4)/Mobile(Forward, MSAA 2) 이중 프로파일 + `FF16Volume_PC/Mobile.asset`(ACES·Bloom 0.35·Vignette 0.25·PC 만 Grain/CA). 아트 방향은 **사실적 PBR(FF16 톤)** — 66-2장·102장.
캐릭터 파이프라인: Mixamo(Maria·Abe·Brute) → `MixamoRigUtil.RigCharacter()`(Humanoid+`ExtractTextures`) → Animator 8클립. 헤어카드·SSS 는 Shader Graph 배선 대기(사람 몫).

## 현재 작업

- 이 PC 에도 Unity 에디터가 없어(Unity Hub 만 설치, `Editor/<버전>` 폴더 없음, CLAUDE.md 절차대로 먼저 확인함) 이번 세션도 소스 편집만 하고 컴파일·실행은 못 했다.
- (이전 세션 완료, 컴파일 미검증 그대로) PLAN 104-1 Phase 0 ①②③, PLAN 101-2 "공통 선행" A·B GO 첫 이식(`Assets/SagaCore/IGoalSource`·`GoalBoard`·`SessionCard` + `Assets/Games/SagaGo/UI/GoSessionTracker.cs`) — 경위는 HISTORY 2026-09-16 grep.
- **REALM 51장 12~15차 확장 — 복양 사슬 마무리, 세 사슬 전부 막다른 끝** — 진양→운중→상군→삭방→오원(원작 LINKS: jinyang-yunzhong-shangjun-shuofang-wuyuan, "막북"). **jinyang은 4차 확장 때 판정이 틀렸었다**: 화북 본토 LINKS만 보고 놓쳤던 `['jinyang', 'yunzhong']`(542행, "막북" 창작 확장 구역)을 찾아 이었다. `RealmCityData.cs`·`RealmEnemyCity.cs`·`PlaytestRealmSlice.cs` 3파일, 적국 20→24, 성 23→27. **이제 세 사슬(허창·복양·진류) 전부 확정된 막다른 끝** — 더 늘리려면 새 시작 성이나 "정복·외교 제외" 결정 재검토가 필요해 사용자 상의 대상(아래 6번).
- **Localization 잔여 항목 감사 — 이미 완료 확인** — PROJECT_STATE에 "미착수"로 남아 있던 FOREST 데이터 콘텐츠·REALM 문답 36/서고/전투 서술·GO HiddenTreasure·DUNGEON 행상/구출을 node 스크립트로 다섯 게임 `*_ko.json`↔`*_en.json` key-by-key 비교(missing/extra/identical-to-ko 세 기준) — **전부 0/0/0**, 실제 영어 문장인지도 샘플로 직접 확인(단순 복사 아님). 스테일 항목이었다 — HISTORY grep으로도 완료 시점을 못 찾았다. "en 사람 검수"는 LLM이 대신할 수 없어 그 표현만 남긴다.
- **PLAN 101-2 A·B 두 번째 이식(DUNGEON)** — `Assets/Games/SagaDungeon/UI/DungeonSessionTracker.cs` 신규(GO `GoSessionTracker.cs` 그대로 본뜸, "지금" 줄만 다름 — GO는 `HiddenTreasure`, DUNGEON은 `DungeonEnemy.FindNearest()`로 가장 가까운 살아있는 적). `BuildTestDungeonScene.cs`에 `BuildGoalBoardUi()`(GO와 같은 이름·위치: `BuildSettingsUi()` 뒤) 추가, `PlaytestDungeonHeadless.cs`에 `CheckGoalBoardAndSessionCard()`(GO 버전 그대로 복사, 클래스명만 교체) 추가. SagaCore(GoalBoard/SessionCard/IGoalSource)는 안 고쳤다 — GO 이식 때 짠 공용 컴포넌트 재사용. 새 `.cs.meta`는 GO 넷(`GoalBoard`·`SessionCard`·`IGoalSource`·`GoSessionTracker`)도 없던 전례를 따라 안 만듦(Unity가 다음에 열릴 때 자동 생성). FOREST·STORY 이식과 REALM 검토는 다음 차례.
- **테스트 상태 표(아래)는 전부 이번 세션 편집 이전 결과다.** 이번 세션에 고친 파일(REALM 12~15차 3개 + DUNGEON GoalBoard 3개 + 이전 세션 미검증분) 전부 재검증 전.

## 다음 작업 (우선순위, 상세는 PLAN 해당 장 · 경위는 HISTORY 날짜 grep)

1. **컴파일·재검증(최우선)** — 누적 미검증분(104-1 9개 + 101-2 GO 5개 + DUNGEON 3개 + REALM 51장 10~15차 10개) 전부. Unity 에디터 있는 세션에서: 배치 컴파일 → `BuildTestXxxScene`(GO/DUNGEON/FOREST/STORY) + `BuildTestCityScene`(REALM) 재생성 → `PlaytestHeadless`·`PlaytestDungeonHeadless`·`PlaytestForestHeadless`·`PlaytestStorySlice`·`PlaytestRealmSlice` 3연속. 씬을 안 다시 지으면 [SerializeField] 승격·GoalBoard 배선(GO·DUNGEON 둘 다)·건업·회계·운중·상군·삭방·오원 사슬 전부 실제로 검증되는 게 없다.
2. **실기 GUI 확인 몰아서** — 아래 "실기 확인 대기" 전부(다섯 SettingsPanel + GO·DUNGEON 목표판/세션카드 포함). 사용자가 직접 하거나 명시 요청 시(폴더 CLAUDE.md).
3. **PLAN 101-2 A·B 나머지 3판** — DUNGEON까지 이식됨(이번 세션). FOREST/STORY 에도 같은 `IGoalSource` 구현체만 추가(GoalBoard/SessionCard 는 SagaCore 그대로 재사용). REALM 은 "일과" 개념이 다른 넷과 안 맞을 수 있어(경영형) 먼저 검토.
4. ~~Localization 잔여~~ — 2026-09-17 감사로 다섯 게임 전부 완료 확인됨(위 "현재 작업" 참고). 사람이 어감까지 검수하고 싶다면 그건 남아 있음.
5. **PLAN 104장 Phase 0 나머지** — `Assets/Art/*_candidates` 정리 판정만 남음(102-4 표는 있으나 105장 Q1 완성판 트랙 결정 뒤로 미룸 — 사용자 결정 대기, 손대지 않음).
6. **REALM 51장 더 늘리기(범위 재검토 필요, 사용자 상의)** — **세 사슬(허창·복양·진류) 전부 확정된 막다른 끝에 닿았다**(15차, 2026-09-17). 계속 늘리려면: (a) 새 시작 성/사슬을 아예 새로 여는 방법(원작 시나리오 194 조조군 성 셋 밖), 또는 (b) `RealmCityData.cs` 클래스 주석의 "정복·외교는 안 들인다(제외)" 결정을 재검토하는 방법 중 사용자와 상의해서 골라야 한다 — 감으로 먼저 코드를 고치지 말 것.

## 알려진 오류

- 없음(컴파일·헤드리스 기준).
- **함정(오류 아님)**: 이 PC Unity 6000.3.24f1 > 프로젝트 6000.3.23f1 → 배치 모드가 `ProjectSettings/ProjectVersion.txt`·`EditorSettings.asset`·`Packages/manifest.json`·`packages-lock.json` 을 조용히 고친다. 커밋 전 `git checkout -- ProjectSettings/ Packages/`.
- `PlaytestHeadless.Run()` 은 `-quit` 없이 부른다(Run 이 스스로 Exit). Play 진입 시 도메인 리로드 비활성 설정을 걸고 끝에 원복한다.
- 씬 `Build()` 는 GameObject 구성이 바뀔 때만 다시 돈다(안 그러면 fileID churn 14000줄).
- 에디터 빌드 스크립트가 한 번만 채우는 컴포넌트의 참조 필드는 반드시 `[SerializeField]`(plain private 는 재로드 후 null — REALM·LocalizedButtonLabel 두 번 밟음).

## 테스트 상태 (2026-09-16 기준, 전부 배치 모드)

| 검증 | 결과 |
|---|---|
| `-batchmode -nographics -quit` 컴파일 | exit 0, 오류 0(라이선스 토큰 경고만) |
| `PlaytestHeadless`(GO) · `PlaytestOverworldMap` | 3연속 OK |
| `PlaytestDungeonHeadless` · `FloorProgression` · `FieldAmbush` · `Shortcut` · `Town2` · `Towns34` · `SimulateDungeonFloors` | 3연속 OK |
| `PlaytestForestHeadless` · `Creatures` · `Finish` · `Furniture` · `HouseTransition` | 3연속 OK |
| `PlaytestStorySlice`(전직·언어 전환·save/load 포함) | 3연속 OK |
| `PlaytestRealmSlice`(적국 18 함락·편입·패널 실제 토글·저장 버튼·save/load) | 3연속 OK |
| GUI 실제 Play 확인 | GO 라이팅 톤·`TestCharacterRealistic`(Maria idle/run/attack) 만. 나머지 아래 |

## 실기 확인 대기 (항목명만 — 경위는 HISTORY grep)

- GO: 조우·전투·등용 손맛, 상점·퀘스트 대사 3단계, 은닉 보물·산신당·돌탑·유물, 동물 Group 발동 장면, 채집, 드로우콜 Before/After(Stats 창), **목표판 3줄 화면 배치(대화창과 안 겹치는지)·세션카드 실제 등장(무입력 5분 체감)**
- DUNGEON: 카메라 각도·공격 버튼 vs CameraRig 드래그 겹침, 아홉 슬라이스 전부(무리·엘리트/보스·방 종류·회피·필드·강공격·행상·동행·GLB), 마을 넷·층 진행·매복·구출·수수께끼·회전베기, 사실적 Player/Enemy/Boss 톤, 무드 유지 판단, **목표판 3줄 화면 배치(미니맵과 안 겹치는지)·세션카드 실제 등장**
- FOREST: 벽지/장판, 가구 자유 배치 18칸, 생물·과일나무·좌판, 밀어내기 전투, 팔레트 데움 정도
- STORY: 두목 크기·타격감(반격 없음이 샌드백처럼 느껴지는지), 사건·관계·선택 흐름, 전직 팝업, 척후병 모델
- REALM: 월드맵, 적국 사슬 진행 체감, 패널 여덟 실제 조작, 저장 토스트
- 공통: BGM 음량 균형·루프 이음매, 설정 패널 6줄(언어 전환 실시간), 디버그 오버레이, 두 Volume 프로파일 톤 일치(PC/Mobile)
