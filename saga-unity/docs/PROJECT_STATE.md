# PROJECT_STATE — saga-unity (상태만, ≤15KB, 덮어쓴다)

**규칙**(`../../SAGA-DESIGN.md` §9 상태 파일): 여기엔 **지금 상태만** 적고 세션이 끝나면 **덮어쓴다**. 날짜별 경위·판단 이유·대화 인용은 `docs/HISTORY.md` 에 append 한다(2026-09-16 재편 전 본문 5,532줄은 그쪽 첫 절에 그대로 있다). 넘치면 `tools/precheck.sh` 가 막는다.
마지막 갱신: 2026-09-17 (REALM 51장 13차, 운중→상군 — 이 PC 에 Unity 없어 컴파일 미검증).

## 완료 요약 — 다섯 게임 × 진척

| 게임 | 씬 | Vertical Slice(Phase 1~8) | 51장 콘텐츠 확장 | 44장 에셋 교체 | 공통(66-2 라이팅·67~69 사운드/설정/Localization) |
|---|---|---|---|---|---|
| GO | `TestVillage` | 완료 — 도적의 습격(이동·촌장·상인·나그네·조우·전투·등용·EXP·장비·루트·저장 v5+) | 동물 Group·나그네·은닉 보물·산신당·행운 돌탑·동굴 유물·채집·오버월드 지도 | Player·주요 Enemy·Environment·Building·Props 전부 GLB/PBR | 전부 붙음. 디버그 오버레이·저장 버튼·**목표판/세션카드(101-2 A·B, 뼈대)** |
| DUNGEON | `TestDungeon` | 완료 — 첫 방→무리·엘리트/보스·방 종류(우물·상자·성소·행상)·회피·강공격·필드(방 2+복도)·동행 | 마을 넷·층 진행·매복·구출·수수께끼·은닉 창고·빌드(회전베기)·도감·보석/영웅 상태 | Player·잡졸(황건적)·미니보스/두목·Environment·Building | 전부 붙음(SFX 실클립 통일) |
| FOREST | `TestVillageForest` | 완료(이동 전용 컨트롤러) — 마을·집·주민 | 벽지/장판·가구 자유 배치(1m 격자)·생물(Flee/Group)·과일나무·채집·좌판·밀어내기 전투 | Environment 완료 | 전부 붙음. 데이터 콘텐츠 번역은 미착수 |
| STORY | `TestField` | 완료 — 2.5D 횡스크롤(Z 고정)·잡졸 10·두목·사명 2·볼트·로프 | 척후병 NPC·사건·관계·선택(51장 완결)·전직(Lv.10, 무사/궁수/협객/방사) | 척후병 실제 모델 | 전부 붙음 |
| REALM | `TestCity` | 완료(경영형, 캐릭터 없음) — 명령·계략(유언비어·화계)·문답 36·서고·월드맵·전투·함락 편입 | **적국 22, 성 25**(51장 13차, 사슬: 허창→소패→하비→수춘→여남→강하→양양→강릉→장사→시상→건업→회계(막다른 끝) / 복양→정도→업→진양→운중→상군(막북 안쪽, 계속 뻗을 수 있음) / 진류→낙양→장안→한중→성도→강주→영안(막다른 끝)) | 도시 Environment/Building | 전부 붙음. `RealmCommandUi` 직렬화 버그(2026-09-15) 수정·저장 버튼 신설 |

렌더러: 66-1장 PC(Forward+, MSAA 4)/Mobile(Forward, MSAA 2) 이중 프로파일 + `FF16Volume_PC/Mobile.asset`(ACES·Bloom 0.35·Vignette 0.25·PC 만 Grain/CA). 아트 방향은 **사실적 PBR(FF16 톤)** — 66-2장·102장.
캐릭터 파이프라인: Mixamo(Maria·Abe·Brute) → `MixamoRigUtil.RigCharacter()`(Humanoid+`ExtractTextures`) → Animator 8클립. 헤어카드·SSS 는 Shader Graph 배선 대기(사람 몫).

## 현재 작업

- 이 PC 에도 Unity 에디터가 없어(Unity Hub 만 설치, `Editor/<버전>` 폴더 없음, CLAUDE.md 절차대로 먼저 확인함) 이번 세션도 소스 편집만 하고 컴파일·실행은 못 했다.
- (이전 세션 완료, 컴파일 미검증 그대로) **PLAN 104-1 Phase 0 ①②③ 완료** — ① `tools/unity-batch.sh`(배치 실행→4파일 원복→git status 한 줄) · ② `Assets/Editor/Playtest*.cs` 의 `GameObject.Find` "존재 확인만" 패턴(GO/DUNGEON/FOREST/STORY `CheckSettingsPanel()` 4건)을 `TogglePanel()`·`ChooseSfx()` 실제 리플렉션 호출 + 화면 Text 확인으로 교체(REALM `CheckCommandUiPanelsWork()` 와 같은 결) · ③ `[SerializeField]` 누락 감사를 `UI/`·`World/`·`Player/` 전 폴더로 완료 — UI 폴더 5개 컴포넌트(DungeonSettingsPanel·GoSettingsPanel·ForestSettingsPanel·StorySettingsPanel·StoryJobChoiceUi) 승격, World/Player 는 전부 정상(Awake 재탐색) 확인. 남은 ⑤(Art candidates 정리)는 105장 Q1 결정 대기.
- (이전 세션 완료, 컴파일 미검증 그대로) **PLAN 101-2 "공통 선행" A·B GO 첫 이식(신규 기능)** — `Assets/SagaCore/`에 `IGoalSource`(인터페이스)·`GoalBoard`(목표판 3줄 위젯)·`SessionCard`(5초 자동 닫힘 세션 요약 카드) 신설. `Assets/Games/SagaGo/UI/GoSessionTracker.cs` 가 `IGoalSource` 구현 + 걸은 거리·번 금 추적 + 무입력 5분/백그라운드 전환 시 `SessionCard.Show()` 호출을 맡는다. "지금" 줄=가장 가까운 미수집 `HiddenTreasure`, "이번 세션"=이동거리·금 증감(실측), "이번 주"=⑦ 승급 3택 미이식이라 자리만 잡은 플레이스홀더 문구. `GoalBoard`/`SessionCard` 둘 다 Awake()가 자기 UI를 다시 짓고 `IGoalSource`/`SessionCard` 참조도 씬에서 스스로 재탐색하도록 짜서 — 이번 세션 ③에서 고친 것과 같은 [SerializeField] 누락 함정을 새 코드에서 되풀이하지 않았다. `BuildTestVillageScene.cs`에 `BuildGoalBoardUi()` 추가(BuildPlayer() 뒤, BuildSettingsUi() 다음). `PlaytestHeadless.cs`에 `CheckGoalBoardAndSessionCard()` 추가 — 존재 확인이 아니라 세 줄 실제 내용·소스 자동 재탐색·카드 Show/자동 닫힘까지 검증(②와 같은 기준).
- **REALM 51장 12·13차 확장(이번 세션)** — 진양→운중→상군(원작 LINKS: jinyang-yunzhong, yunzhong-shangjun). `data-city.js`를 jinyang·yongan으로 전체 grep해 재확인 — yongan은 진짜 막다른 가지(이웃 둘 다 이미 우리 성) 그대로였지만, **jinyang은 4차 확장 때 판정이 틀렸었다**: 화북 본토 LINKS 구역만 보고 놓쳤던 `['jinyang', 'yunzhong']`(542행, "막북" 창작 확장 구역)이 따로 있었다. 운중의 이웃 셋(안문·정양·상군) 중 안문·정양은 잎사귀(다른 LINKS 없음)라 계속 뻗을 수 있는 상군을 골랐다. `RealmCityData.cs`·`RealmEnemyCity.cs`(`YunzhongId`·`ShangjunId` 상수·`AllIds`·`Catalog` 항목 — wall/agri/comm/pop 원본 그대로, troops=wall×0.23 반올림, train=+15씩 90·105)·`PlaytestRealmSlice.cs`(`Phase.AttackYunzhong`·`AttackShangjun` 신설, `AttackChainStep` 체인 연결)만 고쳤다 — 지난 확장들과 같은 3파일 범위. 적국 20→22, 성 23→25. 상군 자신도 북지·삭방(그 뒤 오원)으로 더 뻗을 수 있어 다음 확장 후보로 남는다. `RealmWorldMap`·`RealmCityState` 등은 `AllIds` 순회라 자동 반영 확인함.
- **테스트 상태 표(아래)는 전부 이번 세션 편집 이전 결과다.** 이번 세션에 고친 파일(12·13차 3개 + 이전 세션 미검증분) 전부 재검증 전.

## 다음 작업 (우선순위, 상세는 PLAN 해당 장 · 경위는 HISTORY 날짜 grep)

1. **컴파일·재검증(최우선)** — 누적 미검증분(104-1 9개 + 101-2 신규 5개 + REALM 51장 10~13차 8개) 전부. Unity 에디터 있는 세션에서: 배치 컴파일 → `BuildTestXxxScene`(GO/DUNGEON/FOREST/STORY) + `BuildTestCityScene`(REALM) 재생성 → `PlaytestHeadless`·`PlaytestDungeonHeadless`·`PlaytestForestHeadless`·`PlaytestStorySlice`·`PlaytestRealmSlice` 3연속. 씬을 안 다시 지으면 [SerializeField] 승격·GoalBoard 배선·건업·회계·운중·상군 사슬 전부 실제로 검증되는 게 없다.
2. **실기 GUI 확인 몰아서** — 아래 "실기 확인 대기" 전부(다섯 SettingsPanel + GO 목표판/세션카드 포함). 사용자가 직접 하거나 명시 요청 시(폴더 CLAUDE.md).
3. **PLAN 101-2 A·B 나머지 4판** — GO 이식이 컴파일·실기로 검증되면 DUNGEON/FOREST/STORY/REALM 에도 같은 `IGoalSource` 구현체만 추가(GoalBoard/SessionCard 는 SagaCore 그대로 재사용). REALM 은 "일과" 개념이 다른 넷과 안 맞을 수 있어(경영형) 먼저 검토.
4. **Localization 잔여** — FOREST 데이터 콘텐츠, REALM 문답 36·서고·전투 서술, GO HiddenTreasure, DUNGEON 행상/구출. en 사람 검수.
5. **PLAN 104장 Phase 0 나머지** — `Assets/Art/*_candidates` 정리 판정만 남음(102-4 표는 있으나 105장 Q1 완성판 트랙 결정 뒤로 미룸 — 사용자 결정 대기, 손대지 않음).
6. **REALM 51장 다음 확장** — 세 사슬 중 허창(→회계)·진류(→영안)는 확정된 막다른 끝. 복양 사슬만 상군(shangjun)에서 계속 열려 있다 — `data-city.js` LINKS: `shangjun-beidi`(북지, 잎사귀)·`shangjun-shuofang`(삭방, 그 뒤 `shuofang-wuyuan`(오원)까지 한 단계 더 이어짐) 둘 중 하나. 안문·정양(운중의 나머지 이웃)은 잎사귀라 이미 보류. 성을 "막다른 가지"로 적기 전엔 반드시 파일 전체를 그 id로 grep해 뒤쪽 확장 구역(한국·일본·교주·서역·남중·천축·막북·균열·폐허·묘역) LINKS까지 다 봤는지 확인할 것 — 4차 확장 때 jinyang을 앞쪽(462~490행) 본토 구역만 보고 오판한 전례가 있다.

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
- DUNGEON: 카메라 각도·공격 버튼 vs CameraRig 드래그 겹침, 아홉 슬라이스 전부(무리·엘리트/보스·방 종류·회피·필드·강공격·행상·동행·GLB), 마을 넷·층 진행·매복·구출·수수께끼·회전베기, 사실적 Player/Enemy/Boss 톤, 무드 유지 판단
- FOREST: 벽지/장판, 가구 자유 배치 18칸, 생물·과일나무·좌판, 밀어내기 전투, 팔레트 데움 정도
- STORY: 두목 크기·타격감(반격 없음이 샌드백처럼 느껴지는지), 사건·관계·선택 흐름, 전직 팝업, 척후병 모델
- REALM: 월드맵, 적국 사슬 진행 체감, 패널 여덟 실제 조작, 저장 토스트
- 공통: BGM 음량 균형·루프 이음매, 설정 패널 6줄(언어 전환 실시간), 디버그 오버레이, 두 Volume 프로파일 톤 일치(PC/Mobile)
