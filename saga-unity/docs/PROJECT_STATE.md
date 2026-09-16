# PROJECT_STATE — saga-unity (상태만, ≤15KB, 덮어쓴다)

**규칙**(`../../SAGA-DESIGN.md` §9 상태 파일): 여기엔 **지금 상태만** 적고 세션이 끝나면 **덮어쓴다**. 날짜별 경위·판단 이유·대화 인용은 `docs/HISTORY.md` 에 append 한다(2026-09-16 재편 전 본문 5,532줄은 그쪽 첫 절에 그대로 있다). 넘치면 `tools/precheck.sh` 가 막는다.
마지막 갱신: 2026-09-16 (PLAN 104-1 Phase 0 안정화 ①·②·③ — 이 PC 에 Unity 없어 전부 컴파일 미검증).

## 완료 요약 — 다섯 게임 × 진척

| 게임 | 씬 | Vertical Slice(Phase 1~8) | 51장 콘텐츠 확장 | 44장 에셋 교체 | 공통(66-2 라이팅·67~69 사운드/설정/Localization) |
|---|---|---|---|---|---|
| GO | `TestVillage` | 완료 — 도적의 습격(이동·촌장·상인·나그네·조우·전투·등용·EXP·장비·루트·저장 v5+) | 동물 Group·나그네·은닉 보물·산신당·행운 돌탑·동굴 유물·채집·오버월드 지도 | Player·주요 Enemy·Environment·Building·Props 전부 GLB/PBR | 전부 붙음. 디버그 오버레이·저장 버튼 |
| DUNGEON | `TestDungeon` | 완료 — 첫 방→무리·엘리트/보스·방 종류(우물·상자·성소·행상)·회피·강공격·필드(방 2+복도)·동행 | 마을 넷·층 진행·매복·구출·수수께끼·은닉 창고·빌드(회전베기)·도감·보석/영웅 상태 | Player·잡졸(황건적)·미니보스/두목·Environment·Building | 전부 붙음(SFX 실클립 통일) |
| FOREST | `TestVillageForest` | 완료(이동 전용 컨트롤러) — 마을·집·주민 | 벽지/장판·가구 자유 배치(1m 격자)·생물(Flee/Group)·과일나무·채집·좌판·밀어내기 전투 | Environment 완료 | 전부 붙음. 데이터 콘텐츠 번역은 미착수 |
| STORY | `TestField` | 완료 — 2.5D 횡스크롤(Z 고정)·잡졸 10·두목·사명 2·볼트·로프 | 척후병 NPC·사건·관계·선택(51장 완결)·전직(Lv.10, 무사/궁수/협객/방사) | 척후병 실제 모델 | 전부 붙음 |
| REALM | `TestCity` | 완료(경영형, 캐릭터 없음) — 명령·계략(유언비어·화계)·문답 36·서고·월드맵·전투·함락 편입 | **적국 18, 성 21**(51장 9차, 사슬: 허창→소패→하비→수춘→여남→강하→양양→강릉→장사→시상 / 복양→정도→업→진양 / 진류→낙양→장안→한중→성도→강주→영안) | 도시 Environment/Building | 전부 붙음. `RealmCommandUi` 직렬화 버그(2026-09-15) 수정·저장 버튼 신설 |

렌더러: 66-1장 PC(Forward+, MSAA 4)/Mobile(Forward, MSAA 2) 이중 프로파일 + `FF16Volume_PC/Mobile.asset`(ACES·Bloom 0.35·Vignette 0.25·PC 만 Grain/CA). 아트 방향은 **사실적 PBR(FF16 톤)** — 66-2장·102장.
캐릭터 파이프라인: Mixamo(Maria·Abe·Brute) → `MixamoRigUtil.RigCharacter()`(Humanoid+`ExtractTextures`) → Animator 8클립. 헤어카드·SSS 는 Shader Graph 배선 대기(사람 몫).

## 현재 작업

- PLAN 104-1 Phase 0 진행 중, 이 PC 에 Unity 에디터가 없어(Unity Hub 만 설치, `Editor/<버전>` 폴더 없음, CLAUDE.md 절차대로 먼저 확인함) 전부 소스 편집만 하고 컴파일·실행은 못 했다.
- **①** `tools/unity-batch.sh` 신설 — 배치 실행→4파일 원복→`git status` 한 줄.
- **③** `[SerializeField]` 누락 감사 완료 — `Assets/Games/**/UI/*.cs` 전수 grep. 에디터 스크립트가 `Build()`를 한 번만 부르고 런타임 재호출이 없는 컴포넌트 5개(DungeonSettingsPanel·GoSettingsPanel·ForestSettingsPanel·StorySettingsPanel·StoryJobChoiceUi)의 참조 필드를 `RealmCommandUi`·`LocalizedButtonLabel` 과 같은 결로 승격. DebugHud·Minimap·OverworldMapUI·VirtualJoystick 은 이미 Awake() 런타임 재탐색이라 대상 아님(확인만 함).
- **②** `GameObject.Find` "존재 확인만" Playtest 교체 — `Assets/Editor/Playtest*.cs` 의 `GameObject.Find(` 46건을 전수 분류: 약 40건은 씬 마커·NPC 를 찾아 실제로 이동·전투·상태 확인에 쓰는 정상 패턴(대상 아님). 나머지 4건(GO/DUNGEON/FOREST/STORY 의 `CheckSettingsPanel()`)이 정확히 문제 패턴이었다 — 패널 GameObject "존재"만 보고 그 뒤로는 `GoSettingsState` 등 정적 API 만 검증해, `_sfxValueLabel` 등이 null이어도(=[SerializeField] 없던 이전 상태) 통과해 버렸다(REALM `RealmCommandUi` 가 이미 이 구멍으로 죽었었다). 네 파일 모두 `Object.FindFirstObjectByType<XxxSettingsPanel>()` 로 컴포넌트를 얻고, 리플렉션으로 `TogglePanel()`(패널이 실제로 열리고 닫히는지) · `ChooseSfx()`(상태가 바뀌고 **화면 Text.text 도 실제로** 바뀌는지) 를 직접 호출하도록 고쳤다(REALM `CheckCommandUiPanelsWork()` 와 같은 결).
- REALM `Btn_설정`(103행)은 그대로 둠 — 바로 뒤에 이미 `CheckCommandUiPanelsWork()`(진짜 검증)가 붙어 있어 대상 아님을 확인.
- `StoryJobChoiceUi`(전직 팝업)는 애초에 어떤 Playtest 도 안 건드리고 있다(존재 확인조차 없음) — ②의 "교체 대상"은 아니지만 커버리지 공백으로 남겨둠. 다음 우선순위 참고.
- **`[SerializeField]` 감사를 `World/`·`Player/` 폴더까지 확장(추가 확인, 버그 없음)** — 51건 grep, 전부 `Awake()`가 매 Play 세션 `GetComponent`/`GameObject.FindWithTag` 로 다시 채우는 정상 패턴(UI 폴더의 DebugHud 등과 같은 결). `BanditEncounter`/`RareWolfEncounter`(GO)는 애초에 [SerializeField] 대신 "Awake 때 자식 전부 지우고 Build() 재실행" 방식으로 2026-09-12 에 이미 이 버그 클래스를 막아 뒀다(클래스 내 주석 참고). 에디터 스크립트가 `SetPrivateField`로 이 폴더 필드를 채우는 사례도 0건. **104-1 ③은 이걸로 완료.**
- **테스트 상태 표(아래)는 전부 이번 세션 편집 이전 결과다.** 이 세션에서 고친 5개 SettingsPanel + 4개 Playtest 파일은 재검증 전.

## 다음 작업 (우선순위, 상세는 PLAN 해당 장 · 경위는 HISTORY 날짜 grep)

1. **컴파일·재검증** — 이번 세션에서 고친 9개 파일(SettingsPanel 5 + Playtest 4) 전부 미검증. Unity 에디터 있는 세션에서 `bash tools/unity-batch.sh -- -batchmode -nographics -quit -projectPath . -logFile <경로>` 로 컴파일 확인 → `BuildTestXxxScene`(4종)로 씬 재생성(승격된 [SerializeField] 가 실제로 직렬화되게) → `PlaytestHeadless`·`PlaytestDungeonHeadless`·`PlaytestForestHeadless`·`PlaytestStorySlice` 3연속 재확인. 씬을 안 다시 지으면 예전 씬 파일엔 새 [SerializeField] 값이 없어 테스트가 무의미하다.
2. **실기 GUI 확인 몰아서** — 아래 "실기 확인 대기" 전부(다섯 SettingsPanel 의 씬 재로드 후 동작 포함). 사용자가 직접 하거나 명시 요청 시(폴더 CLAUDE.md).
3. **PLAN 104장 Phase 0 나머지** — `Assets/Art/*_candidates` 정리 판정만 남음(102-4 에 표는 이미 있으나 105장 Q1 완성판 트랙 결정 뒤로 미룸 — 사용자 결정 대기, 손대지 않음).
4. **PLAN 101장 재미 표준 A·B 첫 이식** — 목표판 3줄 + 세션 마무리 카드를 GO 에 먼저(웹 사가고 PLAN §5 ④ 검증 결과 기다리지 않고 UI 뼈대만). **주의**: `SagaCore`(다섯 판 공용) 새 asmdef·`IGoalSource` 인터페이스·`GoalBoard`/`SessionCard` 위젯 등 여러 파일에 걸친 신규 기능이라, 이 PC 에 Unity 없이 컴파일 확인 없이 진행하면 리스크가 큼 — 사용자에게 진행 여부 확인 필요.
5. **REALM 51장 10차** — 시상→건업(`chaisang-jianye`). `AttackChainStep(출진, 함락, 다음)` 인자 순서 확인. wan 은 목표로 쓰지 않는다.
6. **Localization 잔여** — FOREST 데이터 콘텐츠, REALM 문답 36·서고·전투 서술, GO HiddenTreasure, DUNGEON 행상/구출. en 사람 검수.

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

- GO: 조우·전투·등용 손맛, 상점·퀘스트 대사 3단계, 은닉 보물·산신당·돌탑·유물, 동물 Group 발동 장면, 채집, 드로우콜 Before/After(Stats 창)
- DUNGEON: 카메라 각도·공격 버튼 vs CameraRig 드래그 겹침, 아홉 슬라이스 전부(무리·엘리트/보스·방 종류·회피·필드·강공격·행상·동행·GLB), 마을 넷·층 진행·매복·구출·수수께끼·회전베기, 사실적 Player/Enemy/Boss 톤, 무드 유지 판단
- FOREST: 벽지/장판, 가구 자유 배치 18칸, 생물·과일나무·좌판, 밀어내기 전투, 팔레트 데움 정도
- STORY: 두목 크기·타격감(반격 없음이 샌드백처럼 느껴지는지), 사건·관계·선택 흐름, 전직 팝업, 척후병 모델
- REALM: 월드맵, 적국 사슬 진행 체감, 패널 여덟 실제 조작, 저장 토스트
- 공통: BGM 음량 균형·루프 이음매, 설정 패널 6줄(언어 전환 실시간), 디버그 오버레이, 두 Volume 프로파일 톤 일치(PC/Mobile)
