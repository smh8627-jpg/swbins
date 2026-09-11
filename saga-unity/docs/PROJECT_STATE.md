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

- Phase 3 나머지: Path/Road 구성(32장 — 지금은 '=' 타일이 그냥 색만
  다른 평지, 실제 길처럼 보이는 건 아님)
- NPC 최소 구현(주민 1~2명, 대화만) — saga-godot이 "대화가 전투보다
  먼저"로 순서를 정정했던 교훈 그대로 반영해 Combat보다 먼저 할 것
- 위 항목들이 어느 정도 쌓이면(플레이어가 실제로 걸어 다닐 수 있게
  되면) 그때 한 번 GUI로 몰아서 확인 — 매 조각마다 스크린샷 찍지 않는다.
  **CameraRig의 드래그 방향이 실제로 자연스러운지는 그때 반드시 볼 것**
  (위 완료 단계 주석 참고 — 부호를 새로 판단해 정한 자리라 확신이 낮다).
  **Sky/Fog가 실제로 자연스러운지도 그때 같이 볼 것** — Skybox 색·안개
  거리(150~430m)는 눈으로 본 적 없이 숫자만으로 정한 값이다.

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
