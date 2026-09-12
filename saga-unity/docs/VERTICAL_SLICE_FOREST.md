# VERTICAL_SLICE_FOREST (Unity)

PLAN.md 51~65장 확장 순서(GO → DUNGEON → **FOREST** → STORY → REALM)의
세 번째 칸. **설계 자체는 이 문서가 새로 하지 않는다** — `saga-godot/docs/
VERTICAL_SLICE_FOREST.md`가 2026-09-12에 이미 다섯 절(구면 투영·월드
스케일·카메라·첫 콘텐츠 루프·몬스터·퓨전 자유)을 전부 결정해 뒀다.
PLAN.md 0장 "같은 기획을 공유하되 엔진은 별개"에 따라 그 결정을 그대로
따르고, 여기는 **Unity 구현에서 실제로 어떻게 옮겼는지**만 적는다.

## 원본 설계 요약 (saga-godot 문서 참고)

- **구면 투영** — 진짜 휜 지오메트리가 아니라 정점 셰이더 트릭. 세계
  좌표·걷기·판정은 항상 평면. 중심은 플레이어 위치(전역 파라미터로
  매 프레임 갱신). `curve_amount=0.004`(10m→0.4m, 20m→1.6m 가라앉음).
  실내는 이 효과를 아예 안 물리는 머티리얼로 표현.
- **월드 스케일** — 1타일=3.0m, 30×20칸=90×60m. `REACH≈3.45m`(이 슬라이스는
  안 씀 — 채집/대화 반경을 POI마다 따로 잡음).
- **카메라** — 원작이 이미 고정 카메라(회전·줌 입력 없음). pitch=62°,
  spring_length=14m. Player 루트는 회전하지 않고 Visual 자식만 돈다.
- **첫 콘텐츠 루프** — 마을 지형 하나(잔디만) + 이동 + 채집 동사 하나
  (나무 흔들기, 무제한) + 주민 1명(대사만) + 집 하나(들어가기/나가기로
  곡률 꺼짐/켜짐 증명) + 저장/불러오기.
- **완료 조건** — 걷는다 → 나무를 흔들어 과일을 줍는다 → 주민에게
  말을 건다 → 집 안으로 들어간다(평평해짐 확인) → 다시 나온다(다시
  휘어짐 확인) → 저장한다 → 다시 켜서 이어진다.

## Unity 구현 (2026-09-12, saga-unity 아홉 번째 세션 이어서)

새 폴더 `Assets/Games/SagaForest/`(`SagaForest.asmdef`, `Saga.Forest`
루트 네임스페이스) — SagaGo·SagaDungeon 코드를 참조하지 않는다(루트
CLAUDE.md "다섯 판은 다섯 벌 복사" 원칙).

- **곡률 셰이더**(`Shaders/ForestWorldCurve.shader`) — godot의
  `world_curve.gdshaderinc`와 같은 공식(`offset = dot(diff,diff) *
  curveAmount`, Y에서 뺀다)을 URP HLSL로 새로 짰다. SagaGo가 이미
  검증해 둔 `VertexColorLit.shader`(URP 최소 라이트 셰이더 구조)를
  뼈대로 재사용 — 정점 색 대신 단색 `_BaseColor`, 곡률 오프셋만 추가.
  `_SagaWorldCurveCenter`는 전역 셰이더 파라미터(`Shader.SetGlobalVector`,
  Unity는 godot의 `RenderingServer.global_shader_parameter_*`에 대응하는
  이 방식이 에디터/헤드리스 구분 없이 항상 먹혀 godot 문서가 겪은
  "헤드리스에서 global uniform 왕복 확인 불가" 문제 자체가 없다).
  `World/ForestWorldCurveDriver.cs`가 매 프레임 플레이어 위치로 갱신.
- **월드 스케일** — `World/ForestGroundBuilder.cs`가 90×60m 단일 색
  평면을 1.5m 해상도로 쪼개 곡률이 매끈히 보이게 한다(GO
  `TerrainBuilder.cs`처럼 칸별 데이터가 없어 훨씬 단순). **콜라이더는
  평평한 원본 메시 그대로** — 곡률은 순수 시각 효과라 판정에 안 걸린다.
- **카메라** — `Player/CameraRig.cs`를 DUNGEON의 자유 오빗 버전과 완전히
  다르게 새로 짰다(Update() 자체가 없다, Awake 한 번으로 각도·거리
  고정) — godot가 DUNGEON의 `dungeon_camera_rig.gd`를 그대로 재사용한
  것과 달리 Unity DUNGEON `CameraRig.cs`는 드래그 오빗이 있어 그대로
  못 썼다.
- **플레이어 이동** — `Player/PlayerController.cs`는 GO판(회피 없음)을
  그대로 복사 — DUNGEON판이 아니라 GO판을 골랐다(이 슬라이스에 전투가
  없어 GO 쪽이 더 가까운 대응, godot 문서도 `saga_go/player/player.gd`
  재사용을 명시).
- **첫 콘텐츠**
  - `World/ForestFruitTree.cs` — GO `VegetationBuilder.cs`가 검증해 둔
    tree_oak.glb ×4.5 스케일 재사용. 다가가면 과일(산딸기) 획득,
    "무제한"(하루 리셋 없음)이지만 매 프레임 스팸을 막는 2초 쿨다운만
    새로 얹음(문서에 없는 세부 — DUNGEON `DungeonAmbush.cs`의 쿨다운
    관례를 가져옴).
  - `World/ForestVillager.cs` — `js/data-village.js`의 `NPCS.keeper`
    (숲지기)를 이름·대사 그대로. 역할 이름이라 루트 CLAUDE.md 이름
    정책과 무관(그 문서 4절 "참고" 항목과 같은 근거).
  - `World/ForestHouse.cs` — 별도 씬 전환 없이 **"포켓 공간"**(마을
    좌표에서 +500m 떨어진 곳에 실내 방을 미리 지어 두고, 문 앞에서
    플레이어 좌표만 옮긴다)으로 곡률 꺼짐/켜짐을 증명한다. 실내 벽·
    바닥은 `Saga/ForestWorldCurve`가 아니라 평범한 URP Lit — 셰이더를
    안 물리는 것 자체가 "꺼짐"이라 별도 on/off 스위치 코드가 없다.
    건물 자체는 GLB가 아직 없어 primitive 임시 형태(PLAN.md 8장).
  - `Data/ForestState.cs`(과일 개수) + `Data/ForestSaveState.cs`
    (`save_forest.json` — 다른 네 판과 안 겹치는 파일명).
- **에디터 도구** — `Editor/BuildTestVillageForestScene.cs`(신규,
  `BuildTestDungeonScene.cs`와 같은 결) + `Editor/PlaytestForestHeadless.cs`
  (신규, `PlaytestDungeonHeadless.cs`와 같은 결 — 씬 경로만 다름).

## 제외 (다음 슬라이스로 미룸, godot 문서 4절과 동일)

소나무/바위/꽃 등 나무 이외 채집 대상, 하루 1회 리셋(day 시스템), 낚시,
주민 5명 전체 + 부탁·선물·편지, 곤충/화석/조개 채집도감·박물관, 순무
시세, 벽지/장판, 꽃 교배, 계절행사 8일, 옷, 바이옴 지형 다양성,
몬스터·퓨전 콘텐츠(자유는 있으나 이번엔 안 넣음).

## 검증 (2026-09-12)

- 컴파일(`-batchmode -nographics -quit`, 오류 없음 — 신규 커스텀 셰이더
  `ForestWorldCurve.shader`도 임포트 시 셰이더 컴파일러가 정상 통과함을
  로그로 확인).
- 씬 저장(`BuildTestVillageForestScene.Build`, `Assets/Scenes/
  TestVillageForest.unity`, tree_oak.glb·character-a/b.glb 전부 못 찾음
  경고 없이 로드됨).
- `PlaytestForestHeadless.Run`(Play 모드 10프레임) — `OK - 10 frames,
  no errors`.
- **GUI 실기 확인은 아직 안 함** — 이게 이 프로젝트의 첫 커스텀 정점
  셰이더라 특히 중요: 실제로 땅이 그릇처럼 휘어 보이는지, 플레이어
  주변은 안 휘고 멀어질수록 휘는지, 나무·주민도 땅과 같은 굽음을
  따라가는지(안 그러면 공중에 뜬 것처럼 보임 — 클래스 주석 참고),
  `curve_amount=0.004`가 90×60m 규모에 적당한지. 집 안 들어가기(곡률
  꺼짐)·나오기(켜짐)·나무 채집·주민 대화·저장/재시작도 전부 사람이
  직접 봐야 확인됨.

## 집 꾸미기(가구) 슬라이스 (2026-09-12, 열한 번째 세션)

`docs/PROJECT_STATE.md` "완료 단계"에 자세한 내용 — 요약만.

- 웹판 `js/data-village.js`(FURNITURE 14종·4계열)·`js/home.js`(score
  공식)를 그대로 옮기되, **금 경제 없음 → 과일(`ForestState.FruitCount`)을
  구매 통화로 재해석**, **자유 배치 없음 → 고정 자리 여섯**(이 트랙에
  "놓기" 입력 자체가 없어서), **날짜별 진열 없음 → 상시 룰렛**(day 시스템이
  없어서)으로 세 군데 단순화했다 — 벽지/장판·집 증축(HOME_TIERS)은 이번에도
  범위 밖(godot도 같은 결정).
- `Data/ForestHomeData.cs`(카탈로그·등급표)·`Data/ForestHomeState.cs`
  (창고·자리·점수)·`World/ForestFurnitureStall.cs`(구매)·`World/
  ForestFurnitureAnchor.cs`(놓기/거두기). `ForestSaveState` v1→v2.
- `ForestHouse.Build()`를 공개 메서드로 뺐다 — Awake()는 edit-time
  씬 조립에서 안 불린다는 걸 이번에 처음 발견(DUNGEON류는 처음부터
  공개 Build()를 쓰는 관례였다).
- 검증: 컴파일·씬 재빌드·`PlaytestForestFurniture.cs`(신규, 구매→배치→
  점수→쿨다운 후 거두기까지 실제 Play로 확인) + 회귀
  `PlaytestForestHeadless`·`PlaytestForestHouseTransition` 전부 `OK`.
- **GUI 실기 확인 아직 안 함** — 고정 자리 여섯이 방 안에서 안 겹쳐
  보이는지, 가구 primitive가 놓였을 때 그럴듯한지.

## 몬스터·퓨전 콘텐츠 슬라이스 (2026-09-12, 열한 번째 세션)

`docs/PROJECT_STATE.md` "완료 단계"에 자세한 내용 — 요약만.

- saga-godot FOREST 5절 "몬스터·퓨전 자유" 결정을 그대로 적용 — 코드는
  안 베끼고 개념만(숲도깨비·바위도깨비·버섯정령·꽃정령 네 종, 각기 다른
  primitive 조합·속도·경계심) 참고해 `World/ForestCreature.cs`(Idle→
  Wander→Flee, Group 없음)·`World/ForestCreatureBuilder.cs`로 새로 짰다.
  전투·포획·HP 없음(이 판의 핵심은 "돌아다니면 재미있다").
  바이옴이 없어 마을 네 귀퉁이에 하나씩 흩어 뒀다.
- 검증: 컴파일·씬 재빌드·`PlaytestForestCreatures.cs`(신규, 배회·도주를
  실제 Play로 확인) + 회귀 전부 `OK`.
- **GUI 실기 확인 — 2026-09-12(열두 번째 세션) "문제 없어 보여"로 완료.**

## 바이옴 지형 다양성 슬라이스 (2026-09-12, 열두 번째 세션)

`docs/PROJECT_STATE.md` "완료 단계"에 자세한 내용 — 요약만.

- godot 문서 4절 "결정 — 제외"의 "바이옴 지형 다양성(꽃밭·어둑숲·버섯숲·
  바위 지대)"을 채웠다. 위 몬스터·퓨전 슬라이스가 이미 창조물 넷을
  "바이옴을 흉내낸 마을 네 귀퉁이"에 심어 뒀던 걸 그대로 실제 바이옴
  존으로 승격 — den 좌표는 안 옮기고 그 자리를 존 중심으로 재사용했다.
- 신규 `Data/ForestBiomeData.cs`(존 4개: 중심·반경·안쪽 반경·정점색
  틴트, `SampleTint(wx,wz)`로 임의 좌표 배율 반환). `Shaders/
  ForestWorldCurve.shader`에 `COLOR` 정점 입력 추가(`_BaseColor`에 곱함,
  정점색 없는 메시는 Unity가 흰색 기본값을 채워 기존 결과와 동일).
  `World/ForestGroundBuilder.cs`가 땅 메시를 구울 때 정점마다
  `SampleTint()`를 평가.
- **타일 격자가 없는 연속 메시라 GO `TerrainBuilder.cs`가 겪은 "칸 경계가
  바둑판처럼 갈라져 보이는" 문제 자체가 원천적으로 없다** — 정점마다
  세계 좌표 연속 함수를 그대로 평가하면 경계가 저절로 매끈하다.
- 순수 시각 다양성 — 걷기 판정·콜라이더는 여전히 단일 평면, 바이옴이
  이동 속도·채집 가능 여부 등 게임플레이 규칙을 바꾸지 않는다(godot
  문서도 이 항목을 "지형 다양성"으로만 분류했지 규칙으로 분류하지 않음).
- 검증: 컴파일(신규 COLOR 시맨틱 포함 오류 없음)·회귀
  `PlaytestForestHeadless`·`PlaytestForestCreatures`(den 좌표 무변경이라
  배회/도주 수치 그대로)·`PlaytestForestHouseTransition`·
  `PlaytestForestFurniture`·`PlaytestDungeonHeadless`(다른 트랙 무관
  확인) 전부 `OK`.
- **GUI 실기 확인 아직 안 함** — 네 바이옴 색이 실제로 구별되어 보이는지,
  존 경계가 매끈한지, 창조물 넷이 각자 바이옴 안에서 자연스러운지,
  기존 콘텐츠(나무·주민·집·가구 좌판)가 바이옴 색과 안 부딪히는지.
