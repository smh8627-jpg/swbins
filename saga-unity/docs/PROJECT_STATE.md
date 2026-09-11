# PROJECT_STATE

PLAN.md 규칙(33장 토큰 절약 규칙 10)에 따라 여기에는 완료 단계 / 현재 작업 /
다음 작업 / 알려진 오류 / 테스트 상태만 짧게 적는다. 긴 설명은 남기지 않는다.

## 완료 단계

- `PLAN.md`·`CLAUDE.md` 작성 완료 — `saga-godot/PLAN.md` 기반, Unity(C#,
  URP, ScriptableObject 등)에 맞게 다시 씀. 레거시 감사는 새로 안 하고
  `saga-godot/docs/LEGACY_FEATURE_AUDIT.md` 참고.
- **Phase 1(01~09단계) 완료.** Unity 6000.3.23f1 배치 모드로 "3D
  Cross-Platform"(URP) 템플릿 프로젝트 생성. `productName`="SAGA".
  `SagaCore.asmdef`·`SagaGo.asmdef`(SagaGo→SagaCore, Unity.InputSystem
  참조). `.gitignore` 작성. 66-1장(렌더러 이중 프로파일)은 템플릿이 이미
  `PC_RPAsset`(ForwardPlus)/`Mobile_RPAsset`(Forward)+Quality 자동분기를
  갖추고 있어 확인만 함.
- **Phase 2(11~13단계) 완료.** `docs/VERTICAL_SLICE.md` 작성 — 범위는
  `saga-godot`과 동일(사가고 "도적의 습격"), 같은 7×7 테스트 지도 재사용
  결정.
- **Phase 3(28~31단계) 첫 조각 — 초목/바위.** `Assets/Games/SagaGo/World/
  VegetationBuilder.cs` — saga-godot의 vegetation_builder.gd와 같은
  결정적 해시 배치(숲 타일당 나무 3그루, 산 타일당 바위 1개). 아직 GLB
  전이라 TerrainBuilder와 같은 방식(결합 메시+정점 색+VertexColorLit)으로
  씀. 나무 줄기만 CapsuleCollider로 막음(잎은 안 막음), 바위는 산 타일
  자체가 이미 막혀 있어 추가 충돌 없음. `BuildTestVillageScene.cs`에
  `BuildVegetation()` 훅 추가(땅 다음, 플레이어 전). 씬 재저장·
  PlaytestHeadless(Play 모드 실행)까지 전부 통과 확인됨.
- **Phase 3(28~31단계) 둘째 조각 — 랜드마크.** `Assets/Games/SagaGo/
  World/LandmarksBuilder.cs` — saga-godot의 landmarks_builder.gd와
  같은 자리·크기(굴 입구·마을집 2채·폐허 기둥 3개·다리 1개). 개수가
  적어 VegetationBuilder처럼 결합 메시로 안 묶고 Unity 기본
  Cube/Cylinder primitive + URP/Lit 단색 머티리얼을 그대로 씀. 다리
  덱은 시각만(충돌은 TerrainBuilder가 'B' 타일에 이미 만들어 둠, 두
  곳이 각자 만들면 겹친다 — saga-godot과 같은 결정). `BuildTestVillageScene
  .cs`에 `BuildLandmarks()` 훅 추가(초목 다음, 플레이어 전). 씬 재저장·
  PlaytestHeadless까지 전부 통과 확인됨.
- **Phase 3(23~25단계) 넷째 조각 — Sky/Fog.** PLAN.md에 적혀 있던
  "URP Volume — Physically Based Sky/Fog 오버라이드"는 실제론 HDRP
  전용 기능이라 URP엔 없다는 걸 확인(Library/PackageCache의 URP
  Volume 컴포넌트 목록에 Fog·Sky류 없음, Bloom/Vignette 등 포스트
  프로세싱만 있음) — 대신 URP가 쓰는 고전 방식(`RenderSettings`)으로
  짰다. `BuildTestVillageScene.cs`의 `BuildSkyAndFog()` — 절차적
  Skybox 머티리얼 에셋(`Assets/Games/SagaGo/World/Sky.mat`, saga-godot
  `env_pc.tres` 색 참고) 생성/재사용 + `RenderSettings.fog`(Linear,
  150~430m — 336m 사방 지도 기준). **주의 — 이 안개는 URP/Lit 셰이더만
  자동으로 받는다.** `VertexColorLit.shader`·`WaterUnlit.shader`(땅·
  나무·바위·강 전부 이 둘을 씀)는 직접 짠 커스텀 셰이더라 URP 표준
  안개 믹싱(`multi_compile_fog`+`ComputeFogFactor`+`MixFog`)을 손으로
  넣어야 했다 — 넣기 전엔 랜드마크만 안개 지고 나머지 세계는 안 지는
  상태였을 것(직접 눈으로 확인은 안 함, 셰이더 임포트 에러 없음+
  PlaytestHeadless 통과까지만 확인). 실제로 안개가 자연스러워 보이는지는
  다음에 GUI로 몰아서 확인할 때 볼 것.
- **Phase 8 최소 조각 — NPC·Dialogue.** VERTICAL_SLICE.md 26절 범위로
  좁힌 saga-godot npc_builder.gd와 같은 것: 주민 2명(마을 촌장·떠돌이
  상인), 하루 일과·날씨·LOD는 범위 밖, 등용 대상 아님. saga-godot이
  "대화가 전투보다 먼저"로 순서를 정정했던 교훈 그대로 Combat보다
  먼저 넣었다. `NpcBuilder.cs`(자리·모양 — Player와 같은 크기 primitive
  capsule, 옷 색만 다르게) + `VillagerTalk.cs`(SphereCollider 트리거,
  반지름 14, 쿨다운 45초) + `Assets/Games/SagaGo/UI/DialogueLabel.cs`
  (화면 상단 자막, 4초 표시 — 그룹 대신 자기등록 싱글턴으로 Godot의
  "dialogue_label" 그룹 흉내). `BuildTestVillageScene.cs`에
  `BuildNpcs()`·`BuildDialogueUi()` 훅 추가. 씬 재저장·PlaytestHeadless
  까지 통과 확인됨 — **말 걸기가 실제로 되는지(트리거 판정·자막 표시)는
  헤드리스로 못 본다, 사람이 직접 플레이해서 확인해야 하는 부분.**
- **Phase 6(61~71단계) — Combat "도적의 습격".** 72~74 엘리트/보스는
  이번 슬라이스에서 스킵(saga-godot과 같은 범위). saga-godot의
  duel_rules.gd(원본 js/duel.js)를 상수 하나 안 바꾸고 그대로 옮긴
  `Assets/Games/SagaGo/Data/DuelRules.cs`(판정 층, 엔진 비의존 순수
  클래스) + `PartyState.cs`(등용 인원 수 → 공격력/방어력, Godot의
  autoload 싱글턴을 static 클래스로 대신함 — Unity엔 오토로드가 없다)
  + `World/BanditEncounter.cs`(화면 층 — 조우 트리거 → 사건 선택지
  3지(맞선다/값을 치른다/달아난다) → 실시간 전투 UI, 기세·사기·기
  세 막대는 `Image.fillAmount`로, 속공/필살/회피/물러난다 4버튼).
  "값을 치른다"·"달아난다"는 골드·소지품 시스템이 없어(Phase 9 몫)
  대사만 보여주고 끝 — 새 경제 시스템 안 만듦. 승리 시 `PartyState
  .Recruit()`로 등용, 도적은 `Destroy(gameObject)`로 사라짐(이번
  슬라이스에서는 다시 안 남). 컴파일·씬 재저장·PlaytestHeadless
  전부 통과. **전투가 실제로 손맛 있게 도는지(트리거 진입·버튼
  반응·막대 움직임·화면 플래시)는 헤드리스로 못 본다 — 사람이 직접
  플레이해서 확인해야 하는 부분.** 키보드 단축키(J/K/L)는 이번엔
  안 넣었다 — 화면 버튼만으로 조작(모바일 우선 설계와 같은 결).
- **Save/Load 최소 구현 (12단계 완료 조건의 마지막 "저장한다 → 다시
  켜서 이어진다").** saga-godot의 save_state.gd와 같은 구조 —
  `Assets/Games/SagaGo/Data/SaveState.cs`가 `Application
  .persistentDataPath/save.json`에 버전 필드 포함 JSON으로 저장(지금
  실제로 있는 상태는 플레이어 위치·부대뿐이라 그것만 — PLAN.md
  28장이 요구하는 레벨/장비/인벤토리/퀘스트는 이 슬라이스에 아직
  없어서 저장 안 함). `MigrateStep()` 자리는 미리 파 뒀다(지금은
  버전 1뿐이라 빈 경로, 스키마 바뀔 때 여기 채움 — PLAN.md Phase 9
  "Data Versioning" 선반영). 화면 오른쪽 위 저장 버튼(누르면
  `DialogueLabel`로 토스트) + `GameBootstrap.cs`(씬 시작 시
  `SaveState.TryLoad()`, saga-godot test_village.gd `_ready()`와
  같은 역할 — Awake 대신 Start를 써서 Player가 이미 자리 잡은 뒤임을
  보장). `PartyState.cs`에 `MemberIds`(읽기 전용) 추가해 SaveState가
  등용 목록을 읽게 함. 컴파일·씬 재저장·PlaytestHeadless 전부 통과.
  **저장→재시작→위치/부대가 실제로 돌아오는지는 헤드리스로 못 본다.**
- **디버그 오버레이 (PLAN.md 46장·66-1장).** `Assets/Games/SagaGo/
  UI/DebugHud.cs`(원래 이름 DebugOverlay였는데 `UnityEngine.Rendering
  .DebugOverlay`와 겹쳐 CS0104 컴파일 에러 — DebugHud로 고침, 다음에
  또 "DebugOverlay"라는 이름을 쓰지 않는다) — 디버그 빌드에서만 화면
  왼쪽 위에 현재 Render Pipeline Asset 이름 + FPS. saga-godot의
  renderer_debug_label.gd와 같은 최소 범위 — PLAN.md 44~49장이 나열한
  전체 목록(Draw Calls/Enemy Count/Current Quest 등)은 그 시스템
  자체가 없어서 안 만듦(saga-godot도 실제로는 렌더러 이름만 보여줌).
  컴파일·씬 재저장·PlaytestHeadless 전부 통과.
- **Mobile Performance Pass 첫 조각 (PLAN.md 76장).** TerrainBuilder·
  VegetationBuilder·LandmarksBuilder가 만드는 것들(땅·물·충돌·나무·
  바위·굴 입구·마을집·폐허·다리)은 전부 절대 안 움직이는 지오메트리라
  `Build()` 끝에 `MarkStatic()`(자식 트리 전체를 훑어 `isStatic=true`)
  을 걸었다 — 정적 배칭·오클루전 컬링 대상이 된다. **NPC·플레이어·
  도적은 일부러 안 건드렸다** — 도적은 `PulseVisual()`로 강타 때
  scale이 실제로 바뀌고, static 오브젝트를 런타임에 옮기면 Unity가
  경고를 내고 제대로 안 움직인다(NPC는 지금 안 움직이지만 "하루 일과"
  로 나중에 움직일 계획이 있어 미리 막지 않음). 씬 YAML에
  `m_StaticEditorFlags: 2147483647`로 정확히 그 오브젝트들만 찍힌
  것 확인함(Player·NPC·Bandit·UI는 0). **주의 — `isStatic=true`만으로는
  런타임에 생성된 메시가 자동으로 정적 배칭까지 되는 건 아니다**
  (에디터에서 손으로 만든 오브젝트와 달리, 우리 건 전부 Awake() 때
  코드로 만든다 — 실제 드로우콜 감소를 보려면 `StaticBatchingUtility
  .Combine()`을 명시로 불러야 한다, 이번엔 안 함). 이번 조각은 플래그만
  — 오클루전 컬링·라이트매핑 자격 부여 정도의 효과는 있지만 드로우콜
  감소 효과는 아직 없다. 컴파일·씬 재저장·PlaytestHeadless 전부 통과.
- **Phase 3(21~35단계) 첫 조각 — 땅.** `Assets/Games/SagaGo/Data/
  TestMapData.cs`(지도·LEGEND, C#으로 새로 짬) + `World/TerrainBuilder.cs`
  (칸을 4×4 서브쿼드로 쪼개 정점 색 블렌딩 — saga-godot이 겪은 "칸 경계
  바둑판" 문제를 처음부터 피함, 강/다리 수면·타일별 BoxCollider도 같이
  만듦) + `VertexColorLit.shader`·`WaterUnlit.shader`(URP엔 기본으로
  없는 "정점 색=알베도" 셰이더를 새로 씀).
- **Phase 4(36~45단계) 첫 조각 — Player.** `Assets/Games/SagaGo/Player/
  PlayerController.cs`(이동·중력·달리기·회전, saga-godot player.gd
  수치 그대로) + `CameraRig.cs`(추적·드래그 회전·줌, camera_rig.gd 수치
  그대로 — 단 Godot↔Unity 좌표 핸디니스 차이로 드래그 방향 부호는 "일반
  적인 오빗 카메라" 감각으로 다시 판단해 정함, 실제로 saga-godot과 같은
  느낌인지는 미확인) + `Assets/Games/SagaGo/UI/VirtualJoystick.cs`
  (Unity UI EventSystem 인터페이스 사용, Godot의 터치 index 수동 추적
  불필요). `Assets/Editor/BuildTestVillageScene.cs`를 확장해 Player·
  CameraRig·PlayerCamera·ReviewCamera(비활성)·EventSystem(새 Input
  System용 InputSystemUIInputModule)·MobileHUD(조이스틱 Canvas)까지
  전부 코드로 조립하도록 늘림.

## 현재 작업

- 없음.

## 다음 작업 (다음 세션이 이어갈 것)

- Path/Road 구성(PLAN.md 32장)은 saga-godot도 색 구분 외엔 따로 안
  한 항목이라(terrain_builder.gd의 '=' LEGEND에 특별한 처리 없음)
  이번 손질에서 건너뜀 — TerrainBuilder의 지형 색 구분으로 이미 충족.
- 플레이어가 실제로 걸어 다닐 수 있는 수준까지 쌓였다 — **이제 한 번
  GUI로 몰아서 확인할 때가 됐다**(사람이 직접, 헤드리스로는 못 봄):
  - **CameraRig의 드래그 방향이 실제로 자연스러운지**(부호를 새로
    판단해 정한 자리라 확신이 낮다)
  - **Sky/Fog가 자연스러운지**(Skybox 색·안개 거리 150~430m는 숫자만
    으로 정함)
  - **NPC 말 걸기가 실제로 되는지**(TalkArea 트리거 판정·화면 상단
    자막 표시 — 헤드리스로는 트리거가 실제로 발동하는지 확인 불가)
  - **도적의 습격이 실제로 되는지**(조우 트리거 → 선택지 → 전투 →
    등용까지 12단계 루프 전체가 헤드리스 검증 밖 — 사람이 직접
    "맞선다"를 눌러 승리까지 가 봐야 한다)
  - **저장·재시작이 실제로 되는지**(저장 버튼 → 에디터에서 Play를
    끄고 다시 켬 → 위치·부대가 돌아오는지)
- **VERTICAL_SLICE.md 완료 조건(12단계 루프)이 코드상으로는 전부
  채워졌다** — 게임 실행→마을 진입→걷기→NPC 대화→도적 조우→맞선다→
  실시간 전투→승리→등용→전투력 상승 확인→저장→재시작 이어짐, 이
  열두 단계 전부 구현은 끝났다. **위 GUI 확인에서 실제로 도는 게
  확인되면 Vertical Slice 자체가 마무리 단계다.** 그 다음은 PLAN.md의
  나머지 Phase(Stats/Item/Inventory/Equipment 등 Phase 9, 나머지 네
  판 이식)로 넘어가는 큰 전환점 — 여기서부터는 세션 시작 시 PLAN.md를
  다시 훑어 순서를 다시 잡을 것.

## 알려진 오류

- 없음.

## 테스트 상태

- `Unity.exe -batchmode -nographics -projectPath saga-unity -quit` →
  재임포트·컴파일 exit 0, 오류 없음(라이선싱 access token 경고만, 무관).
  Player/CameraRig/VirtualJoystick, VegetationBuilder.cs 추가 후에도
  동일(SagaGo.asmdef에 `Unity.InputSystem` 참조 추가로 첫 컴파일 오류
  고침).
- `-executeMethod Saga.EditorTools.BuildTestVillageScene.Build -quit`
  → exit 0, `TestVillage.unity` 저장 성공(groundVerts=3136,
  49칸×4×4서브쿼드×4정점과 정확히 일치).
- **`-executeMethod Saga.EditorTools.PlaytestHeadless.Run`(Play 모드
  실제 실행) — 2026-09-11 드디어 통과.** `[PlaytestHeadless] OK - 10
  frames, no errors`. 여러 차례 같은 자리(Play 모드 진입 직후)에서
  멈춰 강제 종료해야 했던 원인을 찾았다: **이 PC의 Unity
  6000.3.23f1 `-batchmode`는 Play 모드 진입 시 기본 동작인 "도메인
  리로드"(어셈블리 리로드)에서 멈춘다**(빈 씬으로도 재현 — TestVillage
  씬 내용물이나 Input System과 무관함을 확인, `-nographics` 유무와도
  무관함을 확인). `PlaytestHeadless.Run()` 시작에 `EditorSettings
  .enterPlayModeOptionsEnabled = true` +
  `enterPlayModeOptions = DisableDomainReload | DisableSceneReload`를
  걸어 우회했다. **주의 — 이 값은 실제로 ProjectSettings/
  EditorSettings.asset에 저장된다**(처음엔 "Exit()로 바로 끝나면
  저장 안 된다"고 적었는데, 그건 프로젝트 충돌로 실행 자체가 안 된
  케이스를 보고 낸 오판이었다 — 실제 Play 모드 진입에 성공하면 그대로
  저장돼 사람이 여는 평소 에디터의 Play 버튼 동작까지 바꿔 버린다).
  그래서 `Run()`이 원래 값을 저장해 뒀다가 끝나기 직전에 반드시
  되돌리도록 고쳤다 — 재확인 결과 `EditorSettings.asset`엔 실질적
  diff가 안 남는다(CRLF 정규화 경고만 뜨고 내용은 그대로).
  덤으로 발견한 것 — Unity Search의 `SearchInit.IndexationOnStartup()`
  `ArgumentOutOfRangeException`(이 프로젝트에 SearchDatabase 인덱스
  에셋이 하나도 없어서 터지는 엔진 내부 버그, 우리 코드와 무관 —
  `-quit`만 준 순수 컴파일에서도 똑같이 뜬다)이 Play 모드 진입
  타이밍과 겹쳐 찍혀서 `OnLog`가 매번 FAIL로 오판했었다 — `OnLog`에서
  이 스택트레이스만 걸러내도록 고쳤다.
- 실제 GUI 렌더링(그래픽 화면 확인)은 아직 안 함.
