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

- 없음 — 사용자가 "새로운 세션에서 하자"로 여기서 끊음.

## 다음 작업 (다음 세션이 이어갈 것)

- **미완: Player 런타임(Play Mode) 검증.** 배치 모드 컴파일(exit 0)과
  씬 저장(exit 0, groundVerts=3136)까지는 확인했지만, `Assets/Editor/
  PlaytestHeadless.cs`(Play 모드로 실제로 몇 프레임 돌려 런타임 예외를
  잡는 도구, 이번에 같이 만듦)를 돌린 실행이 **에디터 시작 단계(에셋
  인덱싱)에서 멈춘 듯 오래 걸려 결론을 못 냄** — 타임아웃 후 프로세스를
  강제 종료했다(다른 세션 작업으로 넘어가라는 사용자 지시 때문). **이
  검증은 아직 통과도 실패도 아니고 그냥 안 끝난 상태다** — 다음 세션이
  다시 실행해 볼 것:
  ```
  Unity.exe -batchmode -nographics -projectPath <경로>
    -executeMethod Saga.EditorTools.PlaytestHeadless.Run
    -logFile <경로>
  ```
  (`-quit`을 같이 주면 안 된다 — 스크립트 자신이 EditorApplication.Exit로
  끝낸다). 오래 걸리면 첫 실행의 "Start Indexing on Editor startup"
  단계(Unity Search 색인, 이 프로젝트 코드와 무관한 에디터 내부 동작)가
  원인일 수 있다 — 그 로그에 있던 `ArgumentOutOfRangeException`도 같은
  Unity Search 쪽 예외로 보이고 내가 만든 스크립트 오류는 아닌 것 같지만
  **확인된 사실은 아니다**(끝까지 못 지켜봤다).
- Phase 3 나머지: 초목/바위 산포(VegetationBuilder), 랜드마크(굴 입구·
  마을집·폐허·다리 — primitive로, PLAN.md 8장), Sky/Fog(URP Volume)
- NPC 최소 구현(주민 1~2명, 대화만) — saga-godot이 "대화가 전투보다
  먼저"로 순서를 정정했던 교훈 그대로 반영해 Combat보다 먼저 할 것
- 위 항목들이 어느 정도 쌓이면(플레이어가 실제로 걸어 다닐 수 있게
  되면) 그때 한 번 GUI로 몰아서 확인 — 매 조각마다 스크린샷 찍지 않는다.
  **CameraRig의 드래그 방향이 실제로 자연스러운지는 그때 반드시 볼 것**
  (위 완료 단계 주석 참고 — 부호를 새로 판단해 정한 자리라 확신이 낮다)

## 알려진 오류

- 없음(런타임 검증이 안 끝나서 "없다"고 확정할 수 없다 — 위 다음 작업
  참고).

## 테스트 상태

- `Unity.exe -batchmode -nographics -projectPath saga-unity -quit` →
  재임포트·컴파일 exit 0, 오류 없음(라이선싱 access token 경고만, 무관).
  Player/CameraRig/VirtualJoystick 추가 후에도 동일(SagaGo.asmdef에
  `Unity.InputSystem` 참조 추가로 첫 컴파일 오류 고침).
- `-executeMethod Saga.EditorTools.BuildTestVillageScene.Build -quit`
  → exit 0, `TestVillage.unity` 저장 성공(groundVerts=3136,
  49칸×4×4서브쿼드×4정점과 정확히 일치).
- `-executeMethod Saga.EditorTools.PlaytestHeadless.Run`(Play 모드
  실제 실행) → **미완, 다음 세션이 이어서 확인**.
- 실제 GUI 렌더링(그래픽 화면 확인)은 아직 안 함.
