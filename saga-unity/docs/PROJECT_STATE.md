# PROJECT_STATE

PLAN.md 규칙(33장 토큰 절약 규칙 10)에 따라 여기에는 완료 단계 / 현재 작업 /
다음 작업 / 알려진 오류 / 테스트 상태만 짧게 적는다. 긴 설명은 남기지 않는다.

## 완료 단계

- `PLAN.md`·`CLAUDE.md` 작성 완료 — `saga-godot/PLAN.md` 기반, Unity(C#,
  URP, ScriptableObject 등)에 맞게 다시 씀. 레거시 감사는 새로 안 하고
  `saga-godot/docs/LEGACY_FEATURE_AUDIT.md` 참고.
- **Phase 1(01~09단계) 완료.** Unity 6000.3.23f1 배치 모드로 "3D
  Cross-Platform"(URP) 템플릿 프로젝트 생성. `productName`="SAGA".
  `SagaCore.asmdef`·`SagaGo.asmdef`(SagaGo→SagaCore 참조). `.gitignore`
  작성. 66-1장(렌더러 이중 프로파일)은 템플릿이 이미
  `PC_RPAsset`(ForwardPlus)/`Mobile_RPAsset`(Forward)+Quality 자동분기를
  갖추고 있어 확인만 함.
- **Phase 2(11~13단계) 완료.** `docs/VERTICAL_SLICE.md` 작성 — 범위는
  `saga-godot`과 동일(사가고 "도적의 습격"), 같은 7×7 테스트 지도 재사용
  결정, saga-godot이 겪은 "칸 경계 바둑판" 함정을 Unity 쪽은 처음부터
  피하기로 미리 적어 둠.
- **Phase 3(21~35단계) 첫 조각 — TestVillage.unity 생성.**
  - `Assets/Games/SagaGo/Data/TestMapData.cs` — saga-godot의
    `test_map.gd`와 같은 7×7 글자 지도·LEGEND(지형별 색·높이)를 C#으로
    옮김(기계적 번역이 아니라 값만 맞춰 새로 짬, PLAN.md 2장)
  - `Assets/Games/SagaGo/World/TerrainBuilder.cs` — 칸을 4×4 서브쿼드로
    쪼개 정점 색 블렌딩(칸 중심 68%는 제 색, 가장자리만 이웃과 섞임)으로
    땅을 짓는다. **바둑판 문제를 saga-godot처럼 나중에 고치지 않고
    처음부터 피함**(VERTICAL_SLICE.md에 미리 적어 둔 대로). 강/다리
    위에 반투명 수면, 타일마다 BoxCollider(산·강은 벽, 다리는 널판
    높이)도 같이 만듦 — saga-godot의 `_build_collision()`과 같은 규칙
  - `Assets/Games/SagaGo/World/VertexColorLit.shader`,
    `WaterUnlit.shader` — URP용 최소 커스텀 셰이더(정점 색을 그대로
    알베도로 쓰는 셰이더가 URP엔 기본으로 없어 새로 씀). `Cull Off`로
    방어(감김 방향 계산이 틀려도 안 뚫리게, 실제로는 노멀을 명시로
    줘서 감김 방향과 무관하게 만듦 — Godot 쪽에서 겪은 외적 부호 계산
    문제를 여기선 처음부터 피함)
  - `Assets/Editor/BuildTestVillageScene.cs` — 씬을 손으로 안 쓰고
    코드로 조립해 저장하는 에디터 스크립트(`-executeMethod`로 배치
    모드에서 실행). `Assets/Scenes/TestVillage.unity`로 저장,
    `EditorBuildSettings`의 시작 씬으로 지정
  - 검증: 배치 모드 컴파일 exit 0(첫 시도에서 VertexColorLit.shader의
    `FallbackError` 문법 오류 하나 잡아 고침 — `Fallback`이 아니라
    존재하지 않는 키워드였다). 씬 빌드 실행 로그에
    `verts=3136`(=49칸×4×4서브쿼드×4정점, 계산과 정확히 일치) 확인,
    재임포트도 exit 0 깨끗함
  - **실제 화면(GUI)은 아직 안 봤다** — CLAUDE.md 원칙대로 기능이 다
    갖춰지기 전엔 습관적으로 스크린샷을 안 찍는다. Player가 들어와야
    비로소 "걷다가 보이는" 실제 모습을 판단할 수 있다

## 현재 작업

- 없음 — Phase 3 첫 조각(땅) 끝, 다음 조각(초목/랜드마크) 또는 Phase 4
  착수 전.

## 다음 작업

- Phase 3 나머지: 초목/바위 산포(VegetationBuilder), 랜드마크(굴 입구·
  마을집·폐허·다리 — primitive로, PLAN.md 8장 "primitive는 프로토타입
  전용"), Sky/Fog(URP Volume)
- Phase 4: Player(CharacterController 이동, Cinemachine 카메라, 모바일
  가상 조이스틱)
- NPC 최소 구현(주민 1~2명, 대화만) — saga-godot이 "대화가 전투보다
  먼저"로 순서를 정정했던 교훈 그대로 반영해 Combat보다 먼저 할 것
- 이 단계들이 어느 정도 쌓이면(플레이어가 실제로 걸어 다닐 수 있게
  되면) 그때 한 번 GUI로 몰아서 확인 — 매 조각마다 스크린샷 찍지 않는다

## 알려진 오류

- 없음.

## 테스트 상태

- `Unity.exe -batchmode -nographics -projectPath saga-unity -quit` →
  재임포트·컴파일 exit 0, 오류 없음(라이선싱 access token 경고만,
  무관)
- `Unity.exe -batchmode -nographics -projectPath saga-unity
  -executeMethod Saga.EditorTools.BuildTestVillageScene.Build -quit` →
  exit 0, `TestVillage.unity` 저장 성공(verts=3136 로그로 확인)
- 실제 GUI 렌더링(그래픽 화면 확인)은 아직 안 함 — Player가 들어온
  뒤 몰아서 할 예정
