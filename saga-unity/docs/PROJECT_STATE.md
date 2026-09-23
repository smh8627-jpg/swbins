# PROJECT_STATE — saga-unity (상태만, ≤15KB, 덮어쓴다)

**규칙**(`../../SAGA-DESIGN.md` §9 상태 파일): 여기엔 **지금 상태만** 적고 세션이 끝나면 **덮어쓴다**. 날짜별 경위·판단 이유·대화 인용은 `docs/HISTORY.md` 에 append 한다(2026-09-16 재편 전 본문 5,532줄은 그쪽 첫 절에 그대로 있다). 넘치면 `tools/precheck.sh` 가 막는다.
마지막 갱신: 2026-09-23 (스물여덟 세션째 — **STORY 5-2 3단계 완료: 3·4차 전직(Lv.20/25)+무예 44+무예 칸 고정·차수 탭** — 이로써 5-2 전부 완료). 같은 날 앞 세션: 5-2 2단계(2차 전직 Lv.15·유파 세트), 모바일 버튼 먹통 다섯 판 수정(`SagaCore/ButtonWiring.cs`), 5-2 1단계, GUI hang 해소, SSS Intensity 15(경위 HISTORY grep).

## 캐릭터 자산 — 이 PC 기준 (2026-09-19)

Maria(플레이어)·Abe(잡졸)·Brute(두목) 셋만 mixamo.com 실자산 확보(`Assets/Art/CharactersRealistic/`, gitignore — **PC마다 새로 받아야 함**, 목록은 `SetupXxxCharacterImport.cs`). GUI 확인: Maria idle/run/attack/얼굴 클로즈업 정상, Abe 근접 구도. Brute 전신 구도는 아직.

## 완료 요약 — 다섯 게임 × 진척

| 게임 | 씬 | Vertical Slice(Phase 1~8) | 51장 콘텐츠 확장 | 44장 에셋 교체 | 공통(66-2 라이팅·67~69 사운드/설정/Localization) |
|---|---|---|---|---|---|
| GO | `TestVillage` | 완료 — 도적의 습격(이동·촌장·상인·나그네·조우·전투·등용·EXP·장비·루트·저장 v13) | 동물 Group·나그네·은닉 보물·산신당·행운 돌탑·동굴 유물·채집 · 101-2 ④⑦③: 일과판·승급 3택·75초 토벌 · ①⑥⑧: 봉수대·인연·패배 비용·회수 · ②: 사당 시련(파도 3·인장 조각) | Player·주요 Enemy·Environment·Building 전부 GLB/PBR, Props는 fence·fenceGate만(lantern·stall 보류), Rocks/Vegetation은 procgen 트라이플레이너(102-4) | 전부 붙음. 목표판/세션카드(A·B). 101-3 C·F·G 전부 완료 |
| DUNGEON | `TestDungeon` | 완료 — 첫 방→무리·엘리트/보스·방 종류·회피·강공격·필드·동행 | 마을 넷·층 진행·매복·구출·수수께끼·은닉 창고·빌드·도감·보석/영웅 상태 · **101-2 전부 완료** | Player·잡졸·미니보스/두목·Environment·Building · 103-1 방 셸 마모 3단 | 전부 붙음. 목표판/세션카드. 101-3 C·F·G 전부 완료 |
| FOREST | `TestVillageForest` | 완료(이동 전용) — 마을·집·주민 | 벽지/장판·가구 배치·생물·과일나무·채집·좌판·밀어내기 전투 · **101-2 전부 완료**(번들·채집 손맛·평가·택배 사슬·축제) | Environment 완료, 과일나무 procgen(102-4) | 전부 붙음. 목표판/세션카드. 101-3 해당 없음 |
| STORY | `TestField` | 완료 — 2.5D 횡스크롤(Z 고정)·잡졸 10·두목·사명 2·볼트·로프 | 척후병 NPC·사건·관계·선택·전직(Lv.10) · 관문 대장(5-4) · 비경(5-3) · 동료 교대(5-8) · **5-2 1단계(2026-09-23)**: 1차 직업 무예 22(`StorySkillData`, 웹 24 중 heal 둘 제외)·SP 레벨당 2(`StorySkillState`, 파생값)·무예 패널(`StorySkillPanelUi`, K)·무예 칸 4 자동 배치(`StorySkillSlotButton`, 5~8)·세이브 두 배열(버전 안 올림) · **5-2 2단계(2026-09-23)**: 2차 전직 넷(Lv.15+1차 무예 5, `StoryJobState.Promote`·전직관 `ShowPromote`)·2차 무예 19(rain 신설)·유파 세트 24행(`BonusOf`, 칸 자동 배치는 같은 유파 짝 먼저)·비경 적 경험치 레벨 비례/체력은 공격력 비율 · **5-2 3단계(2026-09-23)**: 3·4차 전직(Lv.20+2차 무예 8 / Lv.25+3차 무예 10, 웹 45/70을 판수로 맞춤, `StoryCombat.JobsTier3/4`·`PromoteLevelFor`)·3·4차 무예 44(회복 넷 제외)·**칸 고정**(`StorySkillState.TogglePin`, 고정 순서대로 앞 칸+남은 칸 자동, 세이브 `skillPins`)·무예 패널 **차수 탭**(런타임 생성)·4세트 가능 | 척후병 실제 모델 | 전부 붙음. 목표판/세션카드. 101-3 C·F·G 전부 완료 |
| REALM | `TestCity` | 완료(경영형) — 명령·계략·문답 36·서고·월드맵·전투·함락 편입 | 적국 55·성 58 · 5-1·5-6·5-2·5-8·5-3·5-5 — **101-2 REALM 전부 완료**(5-4 제외 확정) | 도시 Environment/Building · 103-1 성벽 3단 | 전부 붙음. 목표판/세션카드. 101-3 해당 없음 |

렌더러: 66-1장 PC(Forward+, MSAA 4)/Mobile(Forward, MSAA 2) 이중 프로파일 + `FF16Volume_PC/Mobile.asset` + `DecalRendererFeature`. 아트 방향 **사실적 PBR(FF16 톤)** — 66-2장·102장. DoF(105 Q-U5)는 PC 프로파일만, `SessionCard`가 토글. 캐릭터: Mixamo → `MixamoRigUtil.RigCharacter()` → Animator 8클립. Maria 피부 SSS는 `BuildMariaSssShaderGraph.cs`(Intensity=15).

## 다음 작업 (우선순위, 상세는 PLAN 해당 장 · 경위는 HISTORY 날짜 grep)

1. **STORY 101-2 전부 완료** — 남은 건 실기 확인(아래 대기 목록). 판수 체감(Lv.15→20 약 11판, 20→25 약 28판)이 무거우면 `StoryCombat.JobPromoteLevel3/4`만 고치면 된다.
2. **101-2·104-1 잔여(보류)** — GO⑤(모바일 빌드 뒤)·`Props/` lantern·stall-red·`Characters/` Kenney(실사용 중). 헤어카드는 분리 헤어 메시 생기면.

`ShotDir`(두 `Playtest*Gui.cs`)는 세션 scratchpad 경로라 GUI 스크린샷 때마다 고쳐야 함. 다른 PC는 `CharactersRealistic/`·`Generated/` gitignore라 `SetupXxxCharacterImport.cs`→SSS Build 재실행 필요.

닫힌 백로그: 모바일 버튼 먹통(다섯 판), 101-3, 103-1 변형 배가, 67~69 en 번역, 105 Q-U1·Q-U3, 102-5, 던전 카메라 회전, GUI hang.

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
- 헤드리스 진단이 **진짜 버튼·공격을 누를 땐 적에게서 떨어져서** — `CheckButtonWiring()`이 시작 자리 옆 잡졸을 베어 "잡졸 10" 전제를 깬 적 있음.
- REALM 새 성은 `RealmEnemyCity.cs`·`RealmCityData.cs` 둘 다. DUNGEON 확인용 텔레포트는 `floorRunner.enabled=false` 먼저, `CameraRig` 확인용은 `_zoom`≤3·`_pitchDeg`≤30.
- 헤드리스가 `SaveState.Save()`를 부르면 실제 파일이 남는다 — try/finally로 원본 복원(GO·STORY 패턴).
- Shader Graph internal API는 리플렉션 우회 가능(`BuildMariaSssShaderGraph.cs`) — 매번 `ShaderUtil.ShaderHasError`. 그래프를 막 재빌드한 직후엔 GUI idle 대기 300프레임으로 부족(네온 시안) — 그때만 900. 은은한 값이 "안 보임"이면 극단값으로 배선 생사부터.
- `ScreenCapture.CaptureScreenshot()`는 프레임 렌더 후 찍힌다 — 세팅과 캡처를 다른 tick으로.

## 테스트 상태 (배치 모드, Unity 6000.3.24f1)

| 검증 | 결과 |
|---|---|
| `-batchmode -nographics -quit` 컴파일 | exit 0, 오류 0(2026-09-23, 네 판 버튼 배선 수정 뒤) |
| 씬 넷 재빌드(Village·Dungeon·VillageForest·City) | exit 0, 영속 리스너 0 → 32·17·10·39(= onClick 전부, 2026-09-23) |
| `BuildTestStoryScene` 재빌드 | exit 0, TestField 영속 리스너 0 → 14(2026-09-23) |
| `PlaytestStorySlice` | **3연속 OK(2026-09-23, 5-2 3단계 뒤)** — 새 `CheckUpperTiersAndPins`(3·4차 진짜 버튼·막힘 사유·자동 칸 세트 0·칸 고정 거절/당김/자동 짝·정 4세트·보 4세트 급소 확정·차수 탭·칸 고정 세이브 왕복). 앞 세션분: `CheckPromotionAndSchools`(2차 전직 진짜 버튼·선행·칸 배치·세트 5종·전우·패널·비경 식) 포함. 앞 세션분: 새 `CheckButtonWiring`(진짜 onClick)·`CheckJobSkills`·무예 세이브 왕복·옛 형식 로드 포함. 고치기 전 씬에선 `CheckButtonWiring`이 실패함을 먼저 확인 |
| GO·DUNGEON·FOREST·REALM 헤드리스 | **4연속 OK(2026-09-23)** — 새 `CheckButtonWiring`(`ButtonWiringCheck`: 죽은 버튼·없는 메서드 + 진짜 onClick 설정/명령). 고치기 전 씬에선 GO 32/51 먹통으로 실패 확인. STORY는 비경 지도 수정 뒤 3연속 OK |
| GUI 실제 Play | GO 라이팅 톤·Maria idle/run/attack·Dungeon 카메라(뒷모습·yaw=180)·SSS 코·턱선 하이라이트(Intensity=15) |
| `BuildMariaSssShaderGraph.Build`+`Verify` | exit 0, `ShaderHasError=False`(2026-09-23) |

## 실기 확인 대기 (항목명만 — 경위는 HISTORY grep)

- GO: 조우·전투·등용 손맛, 상점·퀘스트 대사, 은닉 보물·산신당·돌탑·유물, 채집, 목표판/세션카드, hitstop, 유품 마커·무기 소켓·지형 데칼, 일과판·승급 3택, 75초 토벌, 봉수대·인연·짐 드롭/회수, 사당 시련, 울타리 목재 톤, 나무·바위 트라이플레이너 톤, 마을집 실루엣, 카메라 벽 pull-in, **폰에서 설정·승급 3택·저장 버튼이 눌리는지(2026-09-23 고침)**
- DUNGEON: 카메라 손맛, 아홉 슬라이스, 목표판/세션카드, 101-3 전체 체감, 축복·유품·부적 던전·월드 보스·난입, 전자창/동력장갑·기계화 정찰병, 일일 풀·도장·주간 보상, 방 셸 마모 3단, 카메라 벽 pull-in, **폰에서 공격·강공격·회전베기·회피·저장·설정·축복 버튼(2026-09-23 고침)**
- FOREST: 벽지/장판, 가구 배치, 생물·과일나무·좌판, 목표판/세션카드, 번들, 채집 손맛, 평가 별점, 택배 사슬, 축제(달력 1·8·15일), 과일나무·바크 톤, 잔디 디테일 톤, **폰에서 저장·설정·밀어내기 버튼(2026-09-23 고침)**
- STORY: 두목 크기·타격감, 사건·관계·선택, 전직 팝업, 목표판/세션카드, 타격 체감, 유품·데칼·레벨업 줌·직업별 무기, 관문 대장, 비경 지도·축복·아레나, 교대 버튼·서명, **무예 패널(K·"무예" 버튼·전직관)·무예 칸 넷·직업 무예 22 손맛(돌진·퇴보사 이동 거리, 연사 발 간격, 부적 기력 회복)·모바일 버튼 전체가 실제로 눌리는지(2026-09-23 고침)·비경 노드 버튼 연속 탭**, **2차 전직(Lv.15, 전직관 2택)·2차 무예 19 손맛·유파 세트 체감(패널 "[유파·2세트]")·전우/천뢰 범위·Lv.10→15 비경 약 4판이 적당한지**, **3·4차 전직(Lv.20/25)·3·4차 무예 44 손맛(팔도 8연타·십이시 발 간격)·무예 패널 차수 탭·"칸" 고정 조작·4세트 체감·15→20/20→25 판수**
- REALM: 월드맵, 적국 사슬, 패널 여덟, 목표판/세션카드, 공격·계략, 특성·야망, 전술 토글, 서사 카드, 계승 토글, 일기토·설전, 승리 결과 카드, 성벽 실루엣, 오빗 카메라 pull-in, **폰에서 버튼 전부(명령·성·계략·공격·다음달·패널 닫기, 2026-09-23 고침)**
- 공통: BGM 음량, 설정 패널 6줄, SessionCard DoF, 접지 blob 그림자(Mobile 품질), LUT 톤 5장, Screen Space Shadows, Maria 피부 SSS
