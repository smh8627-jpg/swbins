# PROJECT_STATE — saga-unity (상태만, ≤15KB, 덮어쓴다)

**규칙**(`../../SAGA-DESIGN.md` §9 상태 파일): 여기엔 **지금 상태만** 적고 세션이 끝나면 **덮어쓴다**. 날짜별 경위·판단 이유·대화 인용은 `docs/HISTORY.md` 에 append 한다(2026-09-16 재편 전 본문 5,532줄은 그쪽 첫 절에 그대로 있다). 넘치면 `tools/precheck.sh` 가 막는다.
마지막 갱신: 2026-09-23 (스물네 세션째 — 재부팅 뒤 **GUI hang 완전 해소**(7연속 hang은 GUI 모드 노후 상태였을 뿐, 재부팅 후 두 GUI 런치 다 한 번에 성공), **던전 얼굴(yaw=180) 확인 완료**(`10_dungeon_bossgroup.png`, Maria 정면+Abe·Brute), **SSS 글로우(105 Q-U3) 파이프라인·튜닝 직접 확정**(경위는 HISTORY grep — 극단 디버그값으로 배선 생사 확인 후 Intensity 0.6→15, 코·턱선 하이라이트 육안 재확인). 102-5·102-4·103-1·67~69 잔여는 닫힘(Kenney `Characters/`만 실사용 중이라 못 뺌). `ShotDir`(두 `Playtest*Gui.cs`)는 이번 세션 scratchpad 경로로 갱신 커밋(다음 세션도 매번 갱신 필요).

## 캐릭터 자산 — 이 PC 기준 (2026-09-19)

Maria(플레이어)·Abe(잡졸)·Brute(두목) 셋만 mixamo.com 실자산 확보(`Assets/Art/CharactersRealistic/`, gitignore — **PC마다 새로 받아야 함**, 목록은 `SetupXxxCharacterImport.cs`). GUI 확인: Maria idle/run/attack/얼굴 클로즈업 정상, Abe 근접 구도. Brute 전신 구도는 아직. 경위는 HISTORY.md grep.

## 완료 요약 — 다섯 게임 × 진척

| 게임 | 씬 | Vertical Slice(Phase 1~8) | 51장 콘텐츠 확장 | 44장 에셋 교체 | 공통(66-2 라이팅·67~69 사운드/설정/Localization) |
|---|---|---|---|---|---|
| GO | `TestVillage` | 완료 — 도적의 습격(이동·촌장·상인·나그네·조우·전투·등용·EXP·장비·루트·저장 v13) | 동물 Group·나그네·은닉 보물·산신당·행운 돌탑·동굴 유물·채집 · 101-2 ④⑦③: 일과판·승급 3택·75초 토벌 · 101-2 ①⑥⑧: 봉수대(`BeaconTower`)·인연(`BondState`)·패배 비용·회수(`DropState`/`DropMarker`) · 101-2 ②: 사당 시련(`ShrineTrialState`/`ShrineTrialEncounter`, 파도 3·인장 조각) | Player·주요 Enemy·Environment·Building 전부 GLB/PBR, Props는 fence·fenceGate만(lantern·stall 보류), Rocks/Vegetation은 procgen 12+10벌 트라이플레이너로 교체(102-4) | 전부 붙음. **목표판/세션카드(101-2 A·B)**. **101-3 C·F·G 전부 완료** |
| DUNGEON | `TestDungeon` | 완료 — 첫 방→무리·엘리트/보스·방 종류(우물·상자·성소·행상)·회피·강공격·필드(방 2+복도)·동행 | 마을 넷·층 진행·매복·구출·수수께끼·은닉 창고·빌드(회전베기)·도감·보석/영웅 상태 · **101-2 전부 완료(5.6, 2026-09-21로 마감)** | Player·잡졸(황건적)·미니보스/두목·Environment·Building · **103-1 방 셸 마모 3단(ProcRoom 층 깊이 자동)** | 전부 붙음(SFX 실클립 통일). **목표판/세션카드(101-2 A·B, 5.6에서 일일/주간 실값 배선)**. **101-3 C·F·G 전부 완료(2026-09-17)** |
| FOREST | `TestVillageForest` | 완료(이동 전용 컨트롤러) — 마을·집·주민 | 벽지/장판·가구 자유 배치(1m 격자)·생물(Flee/Group)·과일나무·채집·좌판·밀어내기 전투 · **101-2 전부 완료(5.6, 2026-09-21로 마감)**: 마을 번들·채집 손맛·마을 평가·택배 사슬·축제(`ForestFestivalState`, 세배·꽃놀이·소원) | Environment 완료, 과일나무는 procgen 고정 씨앗(102-4) | 전부 붙음. **목표판/세션카드(A·B)**. 101-3 해당 없음. **바이옴 4곳 en 번역(2026-09-22)** |
| STORY | `TestField` | 완료 — 2.5D 횡스크롤(Z 고정)·잡졸 10·두목·사명 2·볼트·로프 | 척후병 NPC·사건·관계·선택(51장 완결)·전직(Lv.10, 무사/궁수/협객/방사) · 관문 대장(5-4, 주간 챔피언) · 비경(5-3, 노드 지도 5층) · **5-8(2026-09-21)** 동료 교대(`StoryPartyState`, 선봉/유격/호법 — MP 없는 서명 발동) — **101-2 STORY는 5-2(보류)만 남고 전부 소진** | 척후병 실제 모델 | 전부 붙음. **목표판/세션카드(101-2 A·B)**. **101-3 C·F·G 전부 완료(2026-09-18)** |
| REALM | `TestCity` | 완료(경영형, 캐릭터 없음) — 명령·계략(유언비어·화계)·문답 36·서고·월드맵·전투·함락 편입 | **적국 55, 성 58**(세 사슬 닫힘) · 5-1 특성·야망 · 5-6 지형 전술 · 5-2 이벤트 체인 · 5-8 계승(허창 배치 승계+치안 하락, 기본 꺼짐) · 5-3 일기토·설전 · **5-5(2026-09-20)** 승리 조건·결과 카드(`RealmVictoryState` — 101-2 REALM 전부 완료, 5-4만 제외) | 도시 Environment/Building · **103-1 성벽 3단(`record.Wall` 투자치로 자동)** | 전부 붙음. **목표판/세션카드(A·B)**. 101-3 해당 없음. **전투 서술 92키 en 번역(2026-09-22)** |

렌더러: 66-1장 PC(Forward+, MSAA 4)/Mobile(Forward, MSAA 2) 이중 프로파일 + `FF16Volume_PC/Mobile.asset` + `DecalRendererFeature`(다섯 판 전부 적용). 아트 방향은 **사실적 PBR(FF16 톤)** — 66-2장·102장.
DoF(105 Q-U5): PC 프로파일에만 `DepthOfField` 오버라이드 — `SessionCard.Show()`/`Hide()`가 토글.
캐릭터 파이프라인: Mixamo(Maria·Abe·Brute) → `MixamoRigUtil.RigCharacter()` → Animator 8클립.

PLAN 101-3(C hitstop류·F 유품 마커·G 데칼/레벨업 컷/장비 가시화)은 GO·DUNGEON·STORY 전부 2026-09-18 기준 완료, FOREST/REALM은 해당 없음 — 경위는 HISTORY grep.

## 다음 작업 (우선순위, 상세는 PLAN 해당 장 · 경위는 HISTORY 날짜 grep)

1. **101-2·104-1 잔여(보류)** — GO⑤(모바일 빌드 뒤)·STORY5-2·`Props/` lantern·stall-red·`Characters/` Kenney(실사용 중).
2. 헤어카드 — 분리 헤어 메시 생기면 같은 기법 재사용 가능, 그 전엔 대상 없음.

`ShotDir`(두 `Playtest*Gui.cs`)는 세션 scratchpad 경로라 새 세션마다 고쳐야 함. 다른 PC는 `CharactersRealistic/`·`Generated/` gitignore라 `SetupXxxCharacterImport.cs`→SSS Build 재실행 필요.

닫힌 백로그: 101-3, 103-1 변형 배가, 67~69 en 번역, 105 Q-U1·**Q-U3(2026-09-23 Intensity=15로 최종 확정)**, **102-5**, **던전 카메라 회전(yaw=180 포함)**, **GUI hang.**

## 알려진 오류

- `PlaytestStorySlice` SaveLoad phase가 세이브 왕복 검증 중 `save_story.json`을 덮어쓰고 원상복구 안 하던 버그는 GO `PlaytestHeadless.cs`의 try/finally 패턴으로 고침(2026-09-21, 3연속 OK 확인). 아래는 그 외 컴파일·헤드리스 함정, 이미 고침.
- **자기 UI를 스스로 짓는 싱글턴은 `Instance`를 `Build()`(에디터 전용)뿐 아니라 `Awake()`에도 채울 것** — `StoryLabyrinthMapUi`가 `StoryJobChoiceUi`와 같은 함정(도메인 리로드 후 null)을 반복할 뻔함. `Awake() => Instance = this;` 잊지 말 것.
- **`Destroy()`로 자식을 지우고 같은 프레임에 다시 그리면 안 지워진 채 쌓인다** — `StoryLabyrinthMapUi.ClearChildren()`(`DestroyImmediate`로 고침), `StoryEnemy.IsDead`와 같은 결.
- **함정(오류 아님)**: Unity 6000.3.24f1 > 프로젝트 6000.3.23f1 → 배치 모드가 ProjectSettings/Packages 4파일을 조용히 고친다. `tools/unity-batch.sh --`로 부르면 자동 원복.
- `Animator.GetBoneTransform()`은 `isHuman`으로 먼저 거를 것(Humanoid 아니면 예외) — `CharacterVisual.FindOrCreateWeaponSocket()`이 가드.
- 정적 상태의 `Restore()`가 관련 이벤트(예: `JobChosen`·`EquipmentChanged`)를 안 쏘면 다른 컴포넌트가 낡은 시각 상태를 계속 든다(2026-09-18 `StoryWeaponVisual`, 2026-09-20 DUNGEON `HeroState.Restore()`도 같은 함정이라 고침) — 새 "상태 보고 시각 짓는" 컴포넌트는 그 상태의 Restore/로드 경로도 같은 이벤트를 쏘는지 확인.
- URP 런타임 타입(`DecalProjector` 등)엔 asmdef에 `Unity.RenderPipelines.Universal.Runtime` 필요(SagaDungeon/SagaGo). SagaStory는 asmdef 자체가 없어 무관.
- 레벨업 카메라 컷 헤드리스 체크는 "그 세션의 첫 레벨업"이어야 함(자연 발생 레벨업과 겹치면 zoomBefore==zoomAfter로 간헐 실패) — GO·DUNGEON·STORY 다 첫 레벨업으로 앞세움.
- `GroundDecal` 카운터 검증은 "캡 테스트"를 델타 비교 루프 밖 별도 시점에(캡 40개 스폰을 루프 중간에 끼우면 이후 델타가 캡에 눌어붙어 실패).
- `PlaytestXxx`류는 `-quit` 없이 부른다(스스로 Exit). 씬 `Build()`는 구성이 바뀔 때만. 에디터 빌드가 채우는 참조는 `[SerializeField]` 필수. `animator?.SetTrigger` 대신 `if (animator != null)`.
- REALM 새 성은 `RealmEnemyCity.cs`·`RealmCityData.cs` 둘 다(후자 누락 시 `AbsorbCity()` 조용히 실패).
- DUNGEON `DungeonFloorRunner`는 문 근접 시 `RepositionPlayerToEntry()`로 되돌린다 — 확인용 텔레포트는 `floorRunner.enabled=false` 먼저. `CameraRig` 기본값(zoom=6·pitch=55°)은 벽(4m) 위로 뜸 — 확인용은 `_zoom`≤3·`_pitchDeg`≤30.
- 헤드리스가 `SaveState.Save()`를 부르면 `persistentDataPath` 파일이 실제로 남는다 — `GameBootstrap.Start()`가 매번 `TryLoad()`하므로 원본 상태로 안 되돌리면 다음 실행이 오염된다(2026-09-19 GO).
- Shader Graph internal API는 리플렉션으로 우회 가능(2026-09-22, 패턴은 `BuildMariaSssShaderGraph.cs`) — 매번 `ShaderUtil.ShaderHasError`로 검증 필수.
- **`ScreenCapture.CaptureScreenshot()`는 호출 시점이 아니라 프레임 렌더 후 찍힘**(2026-09-23) — 같은 tick에서 캡처 다음에 카메라/조명을 바꾸면 그 나중 상태가 찍힌다. `Playtest*Gui.cs`는 "세팅"과 "캡처"를 별도 tick으로 분리할 것.
- **`BuildMariaSssShaderGraph.Build()`로 그래프를 방금 재빌드한 직후엔 셰이더 변형 컴파일이 평소보다 오래 걸려 `PlaytestCharacterRealisticGui`의 idle 정착 대기 300프레임으로도 네온 시안(미컴파일 색)이 찍힌다**(2026-09-23) — 그래프를 안 건드린 일반 실행은 300으로 충분(캐시됨). 그래프를 막 바꾼 직후에만 임시로 늘려서(900 정도) 한 번 확인.
- **Shader Graph 값 튜닝은 "안 보임"과 "배선이 죽음"을 구분해야 한다**(2026-09-23) — `Colour`/`Intensity`처럼 은은한 프로덕션 값은 정상 작동 중이어도 육안으로 거의 안 보일 수 있다. 판단이 안 서면 값을 극단으로(예: 순색+고배율) 잠깐 올려 배선 자체의 생사부터 확인한 뒤, 확인되면 프로덕션 색 세기에 비례해 실제 값을 역산한다(디버그 순빨강 채널 5.0 대비 프로덕션 웜톤 채널 1.0이면 Intensity도 그 비율만큼 다시 올려야 같은 임팩트가 남).

## 테스트 상태 (2026-09-22, 배치 모드, Unity 6000.3.24f1)

| 검증 | 결과 |
|---|---|
| `-batchmode -nographics -quit` 컴파일 | exit 0, 오류 0(102-5 전 항목 반영 뒤 재확인 — FOREST 디테일·SSS feature·BlobShadow 배선·RealmOrbitCamera) |
| `BuildTestVillageForestScene` 재빌드 | exit 0, 디테일 텍스처 로드 경고 없음 |
| `PlaytestHeadless`(GO)·`PlaytestDungeonHeadless`·`PlaytestForestHeadless`·`PlaytestStorySlice`·`PlaytestRealmSlice` | **다섯 판 전부 3연속 OK(2026-09-22, 102-5 전 항목 반영 뒤 재확인, 두 차례)** |
| `PlaytestForestCreatures`·`Finish`·`Furniture`·`HouseTransition` | 미변경 |
| `PlaytestOverworldMap`(GO) | 이전 세션 1회 재검증 OK, 미변경 |
| GUI 실제 Play 확인 | GO 라이팅 톤·Maria idle/run/attack·Dungeon 카메라 회전 고침(뒷모습·yaw=180 정면 둘 다 확인). **SSS 글로우 코·턱선 하이라이트 육안 확인 완료(2026-09-23, Intensity=15)** |
| `BuildMariaSssShaderGraph.Build`+`Verify` | exit 0, `ShaderHasError=False`(2026-09-23, Intensity=15 최종값 기준 재확인) |

## 실기 확인 대기 (항목명만 — 경위는 HISTORY grep)

- GO: 조우·전투·등용 손맛, 상점·퀘스트 대사 3단계, 은닉 보물·산신당·돌탑·유물, 채집, 목표판/세션카드, hitstop 체감, 유품 마커·무기 소켓·지형 데칼(101-3 F·G), 일과판·승급 3택 UI, 75초 토벌 손맛(101-2 ③), 봉수대 점등·목표판 전환·인연 등급 토스트·패배 시 짐 드롭/회수(101-2 ①⑥⑧), 사당 시련 입구·파도 3 전투감·인장 조각/이정표 보상·실패 잠금(101-2 ②), 논밭 울타리 목재 PBR 톤(fence.glb), 나무·바위 트라이플레이너 톤(procgen 12+10벌), 마을집 곁채·굴뚝 실루엣(103-1), 카메라 벽 클리핑 pull-in 체감(102-5)
- DUNGEON: 카메라 손맛, 아홉 슬라이스, 목표판/세션카드, hitstop·타격VFX·레벨업줌·무기소켓·지형데칼 체감(101-3 전체), 축복·유품·부적 던전·월드 보스·난입 체감(101-2 5.1~5.5), 전자창/동력장갑 모양·기계화 정찰병(5층부터) 체감(5.7), 일일 풀 3택·도장·주간 보상 토스트(5.6), ProcRoom 방 셸 마모 톤 3단(103-1, 34층·67층 문턱), 카메라 벽 클리핑 pull-in 체감(102-5)
- FOREST: 벽지/장판, 가구 배치, 생물·과일나무·좌판, 목표판/세션카드, 마을 번들(5.3), 채집 손맛(5.8①), 마을 평가판 별점(5.8②), 접수대·우체통 4·소포 3종·사슬 보너스 체감(5.7), 세배·꽃놀이·소원돌·목표판 D-day 문구 체감(5.6, 실제 달력 1·8·15일에만), 과일나무 모양·바크 트라이플레이너 톤(102-4), 마을 잔디 디테일 톤(102-5, 2026-09-22 신규)
- STORY: 두목 크기·타격감, 사건·관계·선택 흐름, 전직 팝업, 목표판/세션카드, hitstop/shake/flash/popup/타격 VFX 체감, 유품 마커·지형 데칼·레벨업 줌·직업별 무기(101-3 F·G), 관문 대장 승격 연출·방패 파괴 체감(5-4), 비경 노드 지도·축복 카드·아레나 순간이동(5-3), 선봉/유격/호법 교대 버튼·서명 손맛·HUD 교대 쿨다운 줄(5-8)
- REALM: 월드맵, 적국 사슬 체감, 패널 여덟 조작, 목표판/세션카드, 공격·계략 고르기, 특성·야망(5-1), 전술 토글(5-6), 서사 카드 7종(5-2), 계승 토글(5-8, 기본 꺼짐), 일기토·설전(5-3), 승리 결과 카드·목표판 셋째 줄·"다음 달" 게이트(5-5, 정복 55성/문화 정답 30), 성벽 단계별 실루엣(103-1, 축성 명령 여러 달 반복해 2·3단 넘겨야 확인), 오빗 카메라 건물 클리핑 pull-in 체감(102-5, 2026-09-22 신규)
- 공통: BGM 음량, 설정 패널 6줄, SessionCard DoF 체감, 접지 blob 그림자(102-2, `QualitySettings`="Mobile"이어야 보임, **2026-09-22부터 적·NPC도 포함**), 게임별 LUT 톤 5장 체감(102-1-2, 수치만으로 짠 거라 실제 눈으로 판단 필요), Screen Space Shadows 체감(102-5, PC 프로파일만)
