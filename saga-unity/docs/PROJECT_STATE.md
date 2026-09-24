# PROJECT_STATE — saga-unity (상태만, ≤15KB, 덮어쓴다)

**규칙**(`../../SAGA-DESIGN.md` §9 상태 파일): 여기엔 **지금 상태만** 적고 세션이 끝나면 **덮어쓴다**. 날짜별 경위·판단 이유·대화 인용은 `docs/HISTORY.md` 에 append 한다(2026-09-16 재편 전 본문 5,532줄은 그쪽 첫 절에 그대로 있다). 넘치면 `tools/precheck.sh` 가 막는다.
마지막 갱신: 2026-09-24 (쉰네 세션째 — PLAN 106·107·**108** 전부. 헤드리스 통과, 실기 확인 전. 경위는 HISTORY 날짜 grep).

## 캐릭터 자산 — 이 PC 기준 (2026-09-19)

Maria(플레이어)·Abe(잡졸)·Brute(두목) + **2026-09-24 Skeleton·Paladin·PeasantMan·PeasantGirl**(`Assets/Art/CharactersRealistic/`, gitignore — **PC마다 새로 받아야 함**: 앞 셋은 `SetupXxxCharacterImport.cs`, 뒤 넷은 도구 README 레시피 + `Saga/Setup NPC Character Imports`). GUI 확인: Maria idle/run/attack/얼굴 클로즈업 정상, Abe 근접 구도. Brute 전신 구도·새 넷은 아직.

## 완료 요약 — 다섯 게임 × 진척

| 게임 | 씬 | Vertical Slice(Phase 1~8) | 51장 콘텐츠 확장 | 44장 에셋 교체 | 공통(66-2 라이팅·67~69 사운드/설정/Localization) |
|---|---|---|---|---|---|
| GO | `TestVillage` | 완료 — 도적의 습격(이동·촌장·상인·나그네·조우·전투·등용·EXP·장비·루트·저장 v13) | 동물 Group·나그네·은닉 보물·산신당·행운 돌탑·동굴 유물·채집 · 101-2 ④⑦③: 일과판·승급 3택·75초 토벌 · ①⑥⑧: 봉수대·인연·패배 비용·회수 · ②: 사당 시련(파도 3·인장 조각) · **107 ①~⑥ (2026-09-24)** 들판 전투 + 이동 + 지역 지도(세이브 v14) + 보물 상자 16 + 원소 쓰는 적 8 + 동료 몸 교체 · **107-7** 망루 수호장(v15)·106-9 등장 컷 · **107-8** 지역 사명 사슬(v16) · **108 ①** 지역 한자·사연·위험 1~3(적 ×1.0/1.15/1.3)·몬스터 명단 | Player·주요 Enemy·Environment·Building 전부 GLB/PBR, Props는 fence·fenceGate만(lantern·stall 보류), Rocks/Vegetation은 procgen 트라이플레이너(102-4) | 전부 붙음. 목표판/세션카드(A·B). 101-3 C·F·G 전부 완료 |
| DUNGEON | `TestDungeon` | 완료 — 첫 방→무리·엘리트/보스·방 종류·회피·강공격·필드·동행 | 마을 넷·층 진행·매복·구출·수수께끼·은닉 창고·빌드·도감·보석/영웅 상태 · **101-2 전부 완료** · **106-5 탐험** 점프 F·담쟁이 등반·옛 감시탑 뜰 · **106-6** 무사·술사 파티, 명령 1·2, 소환 V · **106-7** 층 두목 등장 컷 · **108 ③** 명소 층 여섯(5~30층 고정 방 다섯·층 주인·첫 토벌 무기, v10) | Player·잡졸·미니보스/두목·Environment·Building · 103-1 방 셸 마모 3단 | 전부 붙음. 목표판/세션카드. 101-3 C·F·G 전부 완료 |
| FOREST | `TestVillageForest` | 완료(이동 전용) — 마을·집·주민 | 벽지/장판·가구 배치·생물·과일나무·채집·좌판·밀어내기 전투 · **101-2 전부 완료**(번들·채집 손맛·평가·택배 사슬·축제) · **108 ②** 존 한자·사연·짐승 명단·명소 넷(GLB)·존 자막 | Environment 완료, 과일나무 procgen(102-4) | 전부 붙음. 목표판/세션카드. 101-3 해당 없음 |
| STORY | `TestField` | 완료 — 2.5D 횡스크롤(Z 고정)·잡졸 10·두목·사명 2·볼트·로프 | 척후병 NPC·사건·관계·선택·전직 · 관문 대장(5-4)·비경(5-3)·동료 교대(5-8) · **106-8 두목 등장 컷(2026-09-24)** · **5-2 전부**: 무예 1~4차(`StorySkillData`·`StorySkillState`·패널 K·칸 4 자동/고정)·전직 1~4차(Lv.10/15/20/25)·유파 세트·옷 빛깔(차수×12%) | 척후병 실제 모델 | 전부 붙음. 목표판/세션카드. 101-3 C·F·G 전부 완료 |
| REALM | `TestCity` | 완료(경영형) — 명령·계략·문답 36·서고·월드맵·전투·함락 편입 | 적국 55·성 58 · 5-1·5-6·5-2·5-8·5-3·5-5 — **101-2 REALM 전부 완료**(5-4 제외 확정) | 도시 Environment/Building · 103-1 성벽 3단 | 전부 붙음. 목표판/세션카드. 101-3 해당 없음 |

렌더러: 66-1장 PC(Forward+, MSAA 4)/Mobile(Forward, MSAA 2) 이중 프로파일 + `FF16Volume_PC/Mobile.asset` + `DecalRendererFeature`. 아트 방향 **사실적 PBR(FF16 톤)** — 66-2장·102장. DoF(105 Q-U5)는 PC 프로파일만, `SessionCard`가 토글. 캐릭터: Mixamo → `MixamoRigUtil.RigCharacter()` → Animator 8클립. Maria 피부 SSS는 `BuildMariaSssShaderGraph.cs`(Intensity=15). DUNGEON 카메라는 `CameraRig`→가상 카메라 `PlayerView`→`CinemachineBrain`(106-3), 컷은 `Cinematics/Timelines/Temple_*.playable`.

## 다음 작업 (우선순위, 상세는 PLAN 해당 장 · 경위는 HISTORY 날짜 grep)

0. **PLAN 106·107·108 전부 완료**. 다음 후보: STORY 파티·소환(5-8 교대와 결이 달라 사용자와) · 소환수 모델 · 108 지역 소품(에셋 먼저).
0-1. **남은 것**: en 번역은 사람 검수 전. GO 동료 몸은 Maria.controller 리타깃, 무기는 주인공 손에만, 넘어오르기는 0.45s 코드 이동. 다른 PC 는 Mixamo README 레시피(Maria 이동 5·DUNGEON 동료 8)를 받고 `Saga/Build Maria Traversal`·`Saga/Setup NPC Character Imports`.
1. **STORY 101-2 전부 완료** — 남은 건 실기 확인(아래 대기 목록). 판수 체감(Lv.15→20 약 11판, 20→25 약 28판)이 무거우면 `StoryCombat.JobPromoteLevel3/4`만 고치면 된다.
2. **101-2·104-1 잔여(보류)** — GO⑤(모바일 빌드 뒤)·`Characters/` Kenney(실사용 중). 헤어카드는 분리 헤어 메시 생기면. (`Props/` lantern·stall-red는 2026-09-23 완료 — 아래 표에서 뺌)

`ShotDir`(두 `Playtest*Gui.cs`)는 scratchpad 경로라 GUI 스크린샷 때마다 고친다. 닫힌 백로그는 HISTORY.

## 알려진 오류

- **씬 빌더(에디터)에서 건 `onClick.AddListener`는 저장 안 된다** — 새 버튼은 `Saga.Core.ButtonWiring.Wire(button, 메서드)`(에디터면 영속·Play면 런타임, 인자 하나는 string/int 오버로드). 람다 불가(경고 남김) → 이름 있는 메서드로. 정적 메서드는 대상 컴포넌트 하나(`XxxSaveButton`). STORY는 `[SerializeField]`+`Awake()` 방식(둘 다 유효). 진단은 `Editor/ButtonWiringCheck.cs`(씬 전체 죽은 버튼 + 진짜 onClick).
- 영속 리스너 메서드 이름을 바꾸면 **씬 재빌드** 필요 — 안 하면 먹통(`ButtonWiringCheck`가 대상 메서드 존재까지 보니 진단이 잡는다).
- **`Destroy()`로 자식을 지우고 같은 프레임에 다시 그리면 쌓인다** — onClick 중이면 `DestroyImmediate` 말고 떼어 내고(`SetParent(null)`)·끄고 `Destroy`(`StoryLabyrinthMapUi.ClearChildren`).
- **함정**: Unity 6000.3.24f1 > 프로젝트 6000.3.23f1 → 배치/GUI 실행이 ProjectSettings/Packages를 조용히 고친다. `tools/unity-batch.sh --`로 부르면 자동 원복(GUI 실행은 수동 `git checkout`).
- `Animator.GetBoneTransform()`은 `isHuman`으로 먼저 거를 것.
- 정적 상태의 `Restore()`가 관련 이벤트(`JobChosen`·`EquipmentChanged`·`StorySkillState.Changed`)를 쏴야 시각·UI가 안 낡는다.
- URP 런타임 타입엔 asmdef에 `Unity.RenderPipelines.Universal.Runtime` 필요(SagaDungeon/SagaGo). SagaStory는 asmdef 없음.
- 레벨업 카메라 컷 체크는 그 세션의 첫 레벨업이어야 함. `GroundDecal` 캡 테스트는 델타 루프 밖에서.
- `PlaytestXxx`류는 `-quit` 없이 부른다. 에디터 빌드가 채우는 참조는 `[SerializeField]` 필수. `animator?.` 대신 `if (animator != null)`.
- 헤드리스 진단이 진짜 버튼·공격을 누를 땐 적에게서 떨어져서(잡졸 수 전제가 깨진 적 있음). 두목 등장 컷은 진단 앞쪽에서 한 번 틀어 둔다(뒤 단계가 멈춘다).
- REALM 새 성은 `RealmEnemyCity.cs`·`RealmCityData.cs` 둘 다. DUNGEON 확인용 텔레포트는 `floorRunner.enabled=false` 먼저, `CameraRig` 확인용은 `_zoom`≤3·`_pitchDeg`≤30.
- 헤드리스가 `SaveState.Save()`를 부르면 실제 파일이 남는다 — try/finally로 원본 복원(GO·STORY 패턴).
- Shader Graph internal API는 리플렉션 우회(`BuildMariaSssShaderGraph.cs`) — 매번 `ShaderHasError`. 재빌드 직후 GUI idle 900프레임. 은은한 값이 안 보이면 극단값으로 배선부터.
- 배치 실행이 가끔 시작 단계에서 `Failed to resolve packages: operation cancelled`로 exit 1 — 진단 전 실패, 재실행.
- `ScreenCapture.CaptureScreenshot()`는 프레임 렌더 후 찍힌다 — 세팅과 캡처를 다른 tick으로.

## 테스트 상태 (배치 모드, Unity 6000.3.24f1)

| 검증 | 결과 |
|---|---|
| 컴파일·씬 다섯 재빌드 | exit 0(최근 FOREST 2026-09-24), 영속 리스너 32·17·10·39(2026-09-23) |
| `PlaytestStorySlice` | **3연속 OK(2026-09-24, 106-8 뒤)** — `PlaytestStoryBossIntro`·`CheckOutfitTint`·`CheckUpperTiersAndPins`·`CheckPromotionAndSchools`·`CheckButtonWiring`(진짜 onClick)·`CheckJobSkills`·무예 세이브 왕복·옛 형식 로드 |
| `PlaytestDungeonHeadless` | **3연속 OK(2026-09-24, 108 ③ 뒤)** — Landmarks·BossIntro·Party·Explore·NpcModels·Temple(+컷)·LockOn·EnemyTelegraph. 같은 씬 `FloorProgression` OK |
| GO `PlaytestHeadless` | **3연속 OK(2026-09-24, 108 ① 뒤)** — `PlaytestGo` RegionTraits·RegionMission(v16/v15)·Guardian·SlopesBiome·PartyBodies·ElementalFoe·Treasure·WorldMap(v16/v13)·Traversal·FieldCombat (항목은 각 파일 요약 주석) |
| `PlaytestForestHeadless` | **3연속 OK(2026-09-24, 108 ② 뒤)** — `PlaytestForestZones` + Creatures·Finish·Furniture·HouseTransition OK |
| REALM 헤드리스 | **4연속 OK(2026-09-23)** — `CheckButtonWiring`(네 판 공통) |
| GUI 실제 Play | GO 라이팅 톤·Maria idle/run/attack·Dungeon 카메라(뒷모습·yaw=180)·SSS 코·턱선 하이라이트(Intensity=15) |
| `BuildMariaSssShaderGraph.Build`+`Verify` | exit 0, `ShaderHasError=False`(2026-09-23) |

## 실기 확인 대기 (항목명만 — 경위는 HISTORY grep)

- GO: **특색 지역(108 ①) — 자막 세 줄 길이·지도 위 두 줄 겹침·위험 3 난이도** · **식생 바이옴(107-3) — 동쪽 숲 호박빛 세기·산기슭 침엽수 반복감·풀 키·강가 갈대 자리·폰 프레임** · **지역 사명(107-8) — 위쪽 한 줄이 목표판·자막·지도 버튼과 안 겹치는지·보상 크기(평정 금 200×등급)·셋째 단 상자 찾기가 막막하지 않은지** · **망루 수호장(107-7·106-9) — 5.4m 크기·탑과 겹치는지·겉→속 교체 알림이 읽히는지·난이도·등장 컷이 고원 절벽에 안 박히는지** · **경사·바이옴(107-3) — 비탈 28° 가 걷기 좋은지·돌 쐐기 모양, 고개 넘는 맛, 내리막이 안 튀는지, 지역 안개·햇빛 차이(강 물안개가 너무 짙지 않은지)** · **동료 모델(107 ⑥) — 산적(Abe) 몸이 Maria 동작을 리타깃해도 어색하지 않은지(등반·활공·수영 포함), 교체 순간 튀지 않는지, 날개 자리** · **원소 쓰는 적(107 ⑤) — 원소 빛 해골이 괴물로 읽히는지(빛깔·방패 거품·도는 구슬), 방패 막대, "면역·상성!·방패 깨짐!" 글자, 2초 비틀 손맛, 화상·젖음·감전 체감, 불도깨비를 산적으로 바꿔 치는 흐름** · **보물 상자(107 ④) — 크기·등급 빛 구분, 사슬, 석등 빛깔·20초, 무리 "한꺼번에", 높은 곳 상자, 보상량** · **지역 지도(107 ③) — 역참 빛, 망루가 보이는지·오르는 맛, 봉우리, M 지도 가독성, 지역 이름 빈도** · **이동(107 ②) — 절벽 고원, 등반 클립이 벽에 붙는지·넘어오르기 0.45s, 활공 날개, 수영 높이, 다리 7m 폭, 스태미나 체감, 카메라가 절벽에 끼는지** · **들판 전투(107 ①) — 3타 간격·예고 0.6s·적 체력·HUD 자리**, 옛 VS 항목(목록은 HISTORY), **폰에서 설정·승급 3택·저장 버튼이 눌리는지**
- DUNGEON: **명소 층(108 ③) — 5층 주인 세기·방 다섯 길이·첫 토벌 무기 체감** · **층 두목 컷(106-7) — 3.8초 길이·어깨 너머 샷·올려다보는 샷이 벽에 안 박히는지·이름표** · **파티·소환(106-6) — 전용 클립(무사 방패 들기·방패로 받기·쓰러짐, 술사 시전 둘·걷기) 어색함, 게이지 속도(8타·34타), 도발·치유 체감, 파티 줄 가독성, 소환 컷 길이·거신 크기·한 방 세기** · **탐험(106-5) — 점프 손맛, 담쟁이 등반·넘어오르기, 돌·틈 난이도, 탑 불빛, 막이** · **사실 모델 NPC(동행 기사 걷기↔달리기 발 미끄럼·마을 사람·포로 무릎→기쁨·행상 서는 자리·해골 파수꾼 크기/칠)**, **컷 셋(능묘 도착 4.5s·상자 2.6s·능묘지기 등장 5.2s) 길이·레터박스·"아무 키로 넘김"·상자 카메라가 벽에 안 박히는지·손떨림 세기**, **잊힌 능묘 한 바퀴(블록·벽력탄 심지·능묘지기 사이클·열쇠 줄)**, **락온(카메라 추적·예고 0.5s·완벽 회피 반격·옆걸음 발 미끄럼)**, 옛 VS·101 항목(목록은 HISTORY), **폰에서 공격·강공격·회전베기·회피·저장·설정·축복 버튼**
- FOREST: **특색 존(108 ②) — 명소 크기·휨 따라 내림이 가까이서 튀는지·점광 세기·자막 세 줄**, 벽지/장판, 가구 배치, 생물·과일나무·좌판, 목표판/세션카드, 번들, 채집 손맛, 평가 별점, 택배 사슬, 축제(달력 1·8·15일), 과일나무·바크 톤, 잔디 디테일 톤, **폰에서 저장·설정·밀어내기 버튼**
- STORY: **두목 등장 컷(106-8) — 2.5D 에서 3/4 로 도는 게 어색하지 않은지·4.2초·이름표·되돌아오는 블렌드** · 두목 크기·타격감, 사건·관계·선택, 전직 팝업, 목표판/세션카드, 타격 체감, 유품·데칼·레벨업 줌·직업별 무기, 관문 대장, 비경 지도·축복·아레나, 교대 버튼·서명, **무예 패널(K·"무예" 버튼·전직관)·무예 칸 넷·직업 무예 22 손맛·모바일 버튼 전체가 실제로 눌리는지·비경 노드 버튼 연속 탭**, **2차 전직(Lv.15, 전직관 2택)·2차 무예 19 손맛·유파 세트 체감(패널 "[유파·2세트]")·전우/천뢰 범위·Lv.10→15 비경 약 4판이 적당한지**, **3·4차 전직(Lv.20/25)·3·4차 무예 44 손맛·무예 패널 차수 탭·"칸" 고정 조작·4세트 체감·15→20/20→25 판수·전직 차수 옷 빛깔(4차 48%가 과하거나 약하지 않은지)**
- REALM: 월드맵, 적국 사슬, 패널 여덟, 목표판/세션카드, 공격·계략, 특성·야망, 전술 토글, 서사 카드, 계승 토글, 일기토·설전, 승리 결과 카드, 성벽 실루엣, 오빗 카메라 pull-in, **폰에서 버튼 전부(명령·성·계략·공격·다음달·패널 닫기, 2026-09-23 고침)**
- 공통: BGM 음량, 설정 패널 6줄, SessionCard DoF, 접지 blob 그림자(Mobile 품질), LUT 톤 5장, Screen Space Shadows, Maria 피부 SSS
