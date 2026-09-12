# PROJECT_STATE

PLAN.md 규칙(33장 토큰 절약 규칙 10)에 따라 여기에는 완료 단계 / 현재 작업 /
다음 작업 / 알려진 오류 / 테스트 상태만 짧게 적는다. 긴 설명은 남기지 않는다.

## 완료 단계

- **DUNGEON — 위성↔위성 지름길: Town3↔Town2 (2026-09-12, 열다섯 번째
  세션 이어서, "1,2 다해줘"의 (2)).** saga-dungeon 웹판 PLAN.md §28-3
  "위성↔위성 통로"를 개념만 참고했다(코드 없음 — 웹판은 화면이 서로
  분리된 2D 포털이라 "출구 방향"이 실제 기하학적 방향과 안 맞아도
  됐지만, saga-unity DUNGEON은 처음부터 하나의 연속 좌표계라 그 트릭
  자체가 필요 없다). §28-3이 "인접 사분면끼리만 잇는다, 정반대(N-S)는
  뺀다"고 정한 논리를 그대로 따라 — Town3(서)·Town4(동)는 정반대라
  빼고, **인접한 Town2(남)↔Town3(서)** 하나만 첫 지름길로 잇는다
  (Town2↔Town4는 후속 후보, §28-3도 두 번째 쌍을 후속으로 미뤄 뒀던
  것과 같은 절제).
  - Town3 남쪽 문(신규)→복도(회전 없음, N-S)→**Crossroads**(신규,
  (-30,0,-30), 문 둘만 — 새 콘텐츠 없는 순수 경유지)→복도(Y축 90도
  회전, E-W)→Town2 서쪽 문(신규)으로 이었다. 기존 인프라(OpenNorthDoor/
  OpenSouthDoor/OpenEastDoor/OpenWestDoor, 회전으로 축 바꾸는 복도
  트릭)를 그대로 재사용 — 새 제네릭화 없음.
  - **정직하게 기록 — 거리 자체는 안 줄어든다.** Town3→Crossroads(30)+
  Crossroads→Town2(30)=60, Room1을 거치는 것(Town3→Room1 30+Room1→
  Town2 30=60)과 정확히 같다 — 이 던전이 사방 30 단위 격자라 축 정렬
  통로로는 원래 어느 경로를 골라도 모루골이 이미 기하학적 최단
  경유지다(대각선 직선이 아니면 더 짧게 만들 방법이 없다). 그래도
  §28-3 원문 취지("모루골을 안 거치고 옆 사분면으로 바로 질러간다")
  그대로 **Room1 내부(적·POI)를 다시 안 지나도 되는 우회로**로서
  가치가 있다고 보고 넣었다 — "지름길"이라기보다 "우회로"에 가깝다는
  걸 다음 세션이 헷갈리지 않게 여기 명시해 둔다.
  - Crossroads에 등불 하나만(BuildTownLantern 재사용) — 마을 황금빛도
  야생 바이옴색도 아닌 회색 미니맵 점으로 "그냥 갈림길"임을 표시.
  - 신규 `Editor/PlaytestDungeonShortcut.cs` — Crossroads·Town2(지름길
  경유)에 실제로 서도 예외 없는지 확인. 컴파일(오류 없음)·씬 재빌드
  (`room childCount=20` 그대로, 문 폭·GLB 경고 없음)·`PlaytestDungeonShortcut`
  (`OK`, 신규)·회귀 `PlaytestDungeonHeadless`·`PlaytestDungeonTown2`·
  `PlaytestDungeonTowns34`·`PlaytestDungeonFieldAmbush`·
  `PlaytestOverworldMap`·`PlaytestDungeonFloorProgression`(`OK - 12
  room advances, floor reached 4` — Town2·Town3에 문이 하나씩 더
  늘어도 기존 층 진행에 영향 없음 재확인)·`PlaytestForestHeadless`
  (다른 트랙 무관 확인) 전부 통과.
  - **사람의 GUI 확인 필요**(아직 안 됨) — Crossroads를 실제로 걸어서
  지나 봤을 때 "그냥 갈림길"로 자연스럽게 읽히는지(방이 통째로 텅
  비어 보일 수 있음 — 등불 하나로 충분한지), 두 복도의 방향 전환(N-S→
  E-W)이 시각적으로 어색하지 않은지.
- **STORY 착수 — 버티컬 슬라이스 첫 구현 (2026-09-12, 열다섯 번째 세션,
  "다음은 어느 쪽으로 갈까요?" 질문에 사용자가 "1,2 다해줘"로 (1) STORY
  착수를 확정해 착수).** DUNGEON이 마을 넷(모루골+위성3)으로 원작 규모를
  채운 뒤 PLAN.md 51~65장 확장 순서(GO→DUNGEON→FOREST→STORY→REALM)의
  다음 칸. **레거시 설계를 새로 하지 않았다** — `saga-godot/docs/
  VERTICAL_SLICE_STORY.md`가 이미 설계·구현·헤드리스 검증까지 끝내
  둔 걸 개념만 참고해(코드 기계적 번역 금지, 루트 CLAUDE.md 2장) Unity
  관용구로 새로 지었다.
  - **범위** — 허창 들판 하나, 2.5D 플랫포머(가로 X·높이 Y만 움직임,
    깊이 Z는 이번 슬라이스에서 고정), 달리기+점프+로프 오르내리기 하나,
    무명(초기 직업) 연참(기본 평타) 하나, **급소(crit 15%)+경직(히트스톱
    0.055초)** — 다섯 판 중 이 판만의 손맛이라 **`Time.timeScale`을
    프로젝트 최초로 씀**. 잡졸(황건적) 고정 셋, "첫 사냥"(kill 10) 사명
    (3마리뿐이라 3/10에서 멈춤 — 다음 확장 몫), 저장/불러오기.
  - 신규 — `Data/{StoryCombat,FieldMapData,StoryQuestState,
    StorySaveState}.cs`·`World/{CharacterVisual,StoryRope,StoryEnemy,
    StoryTerrainBuilder,StoryEnemySpawner,StoryCameraFollow,
    GameBootstrap}.cs`·`Player/StoryPlayerController.cs`·
    `UI/{HoldButton,StoryHud}.cs`·`Editor/BuildTestStoryScene.cs`·
    `Editor/PlaytestStorySlice.cs`. 웹판 `data-side.js` 필드 좌표(플랫폼·
    로프·잡졸 자리)는 saga-godot `field_map.gd`가 이미 옮겨 둔 미터값을
    그대로 재사용(다시 역산 안 함).
  - **재해석** — 이 판은 가로 1축 플랫포머라 다른 네 판의 2축
    `VirtualJoystick.cs`를 안 베끼고 좌/우·오르내리기 hold 버튼 넷(신규
    `HoldButton.cs`) + 점프/공격 버튼 둘로 새로 짰다. `DialogueLabel.cs`도
    이 슬라이스엔 상점·대화가 없어 안 만들었다(안 쓸 파일을 다섯 벌째
    복사하지 않음).
  - **자동 검증 중 실제 결함 둘을 잡았다**(사람이 밟기 전에):
    (1) `StoryPlayerController`의 Z고정 로직이 `p.z != 0f`(부동소수점
    정확 비교)였는데, `Move()`의 충돌 슬라이딩이 남기는 1e-6 수준 잔차도
    항상 걸려 **매 프레임 CharacterController를 껐다 켰다** 했다 — 그
    부작용으로 로프 트리거가 Enter 직후 바로 Exit해 버려(로프 위에
    서 있어도 오르기가 아예 안 켜짐) 실기에서도 실제로 겪었을 결함.
    문턱값(0.01) 비교로 고침. (2) 로프(X=6.8m)가 하필 Platform[0]
    (X 3.8~9.0, Y 2.2~2.6) 바로 아래를 지난다 — 로프 위쪽 절반(Y 2.2
    이상)을 오르면 머리가 발판 밑면과 부딪힐 수 있다(원작 2D 웹판엔
    없던 문제 — 평면 사이드스크롤엔 "밑을 지나는 발판"이라는 개념
    자체가 없어서 3D로 옮기며 새로 생겼다). **아직 안 고침** — 아래
    GUI 확인 목록에 추가.
  - **프로젝트 전체에 적용되는 발견** — Unity는 "**트리거와 겹친
    콜라이더를 disable하는 순간 OnTriggerExit를 안 보낸다**"(문서화된
    엔진 동작). 이 저장소의 여러 Playtest가 쓰는 `TeleportPlayer()`류
    헬퍼(`CharacterController.enabled`를 껐다 대입하고 다시 켜는 순간이동)
    로는 트리거 **Enter는 잘 잡히는데 Exit는 안 잡힌다**(disable하는
    순간 이미 "겹침 해제"가 조용히 사라져서) — `PlaytestStorySlice.cs`
    에서 실제로 겪고, Exit 확인만 `CharacterController.Move()`로 실제
    스윕을 굴리는 방식으로 바꿔 고쳤다. DUNGEON이 애초에 트리거 콜백
    대신 Update() 폴링 거리 판정을 쓰는 관례(클래스 주석에 이미 명시돼
    있던 이유)가 바로 이 함정을 피하기 위해서였다는 게 이번에 실제로
    확인됐다 — **트리거 Exit을 순간이동 테스트로 확인해야 하면 이 함정을
    기억할 것.**
  - 검증 — 컴파일(오류 없음)·씬 재빌드(`BuildTestStoryScene`, character-
    {a,d}.glb 정상 로드, GLB 못 찾음 경고 없음)·`PlaytestStorySlice`
    (`OK - killed 3 grunts, jump/rope/save-load all verified, no
    errors`)·회귀 GO `PlaytestHeadless`·DUNGEON `PlaytestDungeonHeadless`·
    FOREST `PlaytestForestHeadless`(다른 트랙 무관 확인) 전부 통과.
  - **사람의 GUI 확인 필요**(아직 안 됨) — 이동감·점프 궤적·로프 W/S
    오르내리기가 실제로 자연스러운지, 로프 위쪽 절반이 Platform[0]과
    실제로 부딪히는지(위 "아직 안 고침" 항목, 부딪히면 로프 길이를
    줄이거나 발판을 옮기는 후속 조치 필요), 급소 히트스톱이 실제로
    느껴지는지, 잡졸 셋을 실기로 잡아 "첫 사냥" 카운트가 오르는지,
    모바일 hold 버튼 넷+점프/공격 버튼이 화면에서 안 겹치는지.
- **DUNGEON — 오픈월드 확장 네 후보 전부(2026-09-12, 열네 번째 세션,
  "1,2,3,4 다해줘"로 착수).** 열세 번째 세션이 남긴 네 후보(마을
  셋째·넷째 추가 / Town2 장식 보강 / 오버월드 지도 UI / 마을 간 필드
  조우)를 순서대로 전부 끝냈다. Room1↔Town2 슬라이스는 여전히 사람이
  실기 확인 전이었지만("아직 안 봤다, 코드로 계속 진행"으로 확인) 그대로
  이어감.
  - **(1) 마을 셋째·넷째** — saga-dungeon 웹판 PLAN.md 28-1절의 별형
    구조(위성 마을은 서로 안 잇고 전부 모루골에만 통한다)를 그대로 따라,
    Room1의 나머지 두 벽(동/서, 지금까지 안 쓰던)을 열어 Town3(서)·
    Town4(동)로 이었다. `DungeonRoomBuilder.cs`에 `OpenEastDoor()`/
    `OpenWestDoor()` 신규(기존 `OpenNorthDoor`/`OpenSouthDoor`와 같은
    `OpenDoorOnWall()`을 축 매개변수로 일반화, 아치도 동/서는 Y축 90도
    회전 필요). 복도는 `DungeonCorridorBuilder`가 늘 로컬 Z를 긴 축으로
    짓는 걸 그대로 두고 **GameObject를 Y축 90도 돌려 세우는 것만으로**
    X축 복도를 만들었다(그 클래스 자체 코드 변경 없음 — 대칭 도형이라
    회전 방향은 안 따진다). Town3 행상은 gem_jade(4, 지금까지 광맥
    확정 드랍 말고는 아무도 안 팔던 재고, 15냥) — Town4 행상은
    wp_glaive(26, 90냥)를 판다(원래 Room10 재고였는데 "절차적 층 진행"
    전환으로 Room10 자체가 없어져 살 자리가 사라졌던 것을 새 마을에서
    되살림 — "층1 두목을 못 잡아도 중간 이상 티어를 살 수 있게"라는
    원래 취지 그대로).
  - **(2) Town2 장식 보강** — 마을 셋(Town2·3·4) 전부에 등롱 둘(점광
    포함)·궤짝 하나·정주 촌민 하나(character-b 모델, Ally와 다른 베이지
    톤, 전투·대화 없는 순수 시각)를 채웠다. 신규 헬퍼는 전투원과 안
    겹치게 마을마다 문·행상 위치에 맞는 오프셋을 따로 받는다.
  - **(3) 오버월드 지도 UI** — saga-dungeon 웹판 PLAN.md 28-1절 "디아블로
    M키 방식"을 옮겼다. 신규 `UI/OverworldMapUI.cs` — M키(`Keyboard
    .current.mKey`, PlayerCombat.cs가 이미 쓰는 것과 같은 직접 읽기
    패턴)로 화면 중앙에 나침반형 5칸(중심=모루골/Room1, 남/서/동=마을
    셋, 북=던전 굴혈)을 펼친다. **텔레포트 없음 — 보기만 하는 창**(웹판과
    같은 결, 미니맵과 목적이 다름을 `Minimap.cs` 클래스 주석에도 명시).
    현재 위치 칸만 플레이어 좌표 문턱(±15)으로 매 프레임(패널이 열려
    있을 때만) 강조.
  - **(4) 마을 간 필드 조우** — 원작(28-1절)은 필드에 로밍 몬스터가
    있었는데 첫 마을 슬라이스(Room1↔Town2)는 통로를 전투 없이 단순화해
    뒀던 것을, 새 시스템 없이 기존 `DungeonAmbush.cs`(랜덤 이벤트
    슬라이스, 25초 쿨다운 룰렛 — 55% 고요·30% 매복·15% 돈주머니)를 들길
    셋(남/서/동) 한가운데 그대로 재사용해 채웠다. roomId를 "field_남/
    서/동"으로 따로 둬 마을 행상의 "방을 다 잡아야 연다" 조건과 안
    엮이게 했다.
  - `UI/Minimap.cs` — Town3(x=-30)·Town4(x=+30)가 동서로 생기며
    `WorldXMin/Max`를 -12/12 → -42/42로 넓혔다(Town2 남쪽 확장 때 Z축을
    넓힌 것과 같은 이유).
  - 신규 검증 도구 셋 — `PlaytestDungeonTowns34.cs`(Town3=gem_jade 세공·
    Town4=wp_glaive 장착 실제 구매까지, `PlaytestDungeonTown2.cs`와 같은
    결)·`PlaytestDungeonFieldAmbush.cs`(들길 셋 방문, 무작위 롤이라
    결과는 안 따지고 예외만 확인)·`PlaytestOverworldMap.cs`(리플렉션으로
    `UpdateHighlight()`를 직접 불러 다섯 좌표→다섯 칸 매핑을 전수
    검증 — M키 입력 자체는 이 프로젝트가 이미 스페이스바·왼쪽 Alt에서
    검증 없이 써 온 표준 패턴이라 새로 안 흉내 냄).
  - 컴파일(오류 없음)·씬 재빌드(`room childCount=14→20`, 문 폭 경고·GLB
    못 찾음 경고 없음)·`PlaytestDungeonTowns34`(`OK`, 신규)·
    `PlaytestDungeonFieldAmbush`(`OK`, 신규)·`PlaytestOverworldMap`(`OK`,
    신규)·회귀 `PlaytestDungeonTown2`(`OK`)·`PlaytestDungeonFloorProgression`
    (`OK - 12 room advances, floor reached 4` — Room1 문 구성이 또 늘어도
    기존 북쪽 진행에 영향 없음 재확인)·`PlaytestDungeonHeadless`·
    `PlaytestForestHeadless`(다른 트랙 무관 확인) 전부 통과.
  - **사람의 GUI 확인 필요**(아직 안 됨) — Town3·Town4로 가는 동/서
    복도·문턱이 실제로 자연스러운지(특히 Y축 90도 회전 복도가 처음이라
    시각적으로 안 어색한지), 마을 셋의 장식(등롱·궤짝·촌민)이 휑함을
    실제로 줄였는지, 오버월드 지도(M키)가 화면에 잘 뜨고 강조가 잘
    보이는지, 들길에서 매복이 실제로 튀어나올 때 위협적으로 느껴지는지.
- **DUNGEON — 오픈월드 확장, 첫 슬라이스: 마을 둘을 걸어서 잇는 진짜
  오픈월드 (2026-09-12, 열세 번째 세션, "DUNGEON 오픈월드 확장으로
  넘어가줘"로 착수).** 착수 전 `js/dungeon.js`·saga-dungeon PLAN.md
  28장을 훑어보니 "오픈월드"가 두 다른 뜻으로 쓰인다는 걸 발견해 먼저
  사용자에게 확인 질문 — (1) 던전 층 하나를 클리어마다 갈아치우는
  로그라이크식 진행(이미 `DungeonFloorRunner`로 구현·100층 검증
  완료) vs (2) **마을이 여럿이고 마을 밖 들판을 걸어서 다른 마을로
  건너가는 구조**(28-1~28-8절, 원작은 마을마다 좌표계가 독립이라
  "위장된 전환"까지 만들어야 했다). 사용자가 (2) "마을 여러 개 —
  걸어서 이어지는 진짜 오픈월드(권장)"로 확정.
  - **핵심 발견 — 이 프로젝트는 원작의 근본 문제 자체가 없다.** 원작이
    28-2절에서 "위장된 전환"(A안 단일 연속 좌표계 대신 B안 통로 트릭)을
    택한 이유는 네 마을이 각자 독립 좌표계라서였다. saga-unity DUNGEON은
    Room1~ProcRoom이 처음부터 **하나의 연속 좌표계**다 — 그래서 "마을
    두 개를 걸어서 잇는다"는 그냥 방 하나 더 짓고 복도로 잇는 것과
    완전히 같다. 새 이동/전환 시스템이 전혀 필요 없다. 세이브도
    `SaveState.cs`가 이미 `playerPos` 세 값을 그대로 저장/복원해
    Town2에서 저장해도 "현재 마을" 같은 새 필드가 필요 없다(둘 다
    검증됨 — 아래).
  - **첫 슬라이스 범위 — 마을 2개**(원작 4개, Vertical Slice First).
    오버월드 지도 UI·마을 3개 이상·마을 간 필드 조우는 범위 밖, 다음
    슬라이스 후보로 남김.
  - Room1의 **남쪽 문**(지금까지 안 쓰던 벽 — 북쪽은 이미 Room2행
    진행에 씀)을 새로 열어 `TownCorridor`(전투 없음, 폐허 톤 대신
    `SagaBiome.None` 중립색으로 "던전이 아니라 들길"임을 구분)를 지나
    **Town2**(첫 위성 마을)로 잇는다. 좌표는 북쪽 진행과 정확히
    대칭(부호만 반대) — 복도 중심 z=-15, Town2 중심 z=-30.
  - Town2도 `biome=None` — 다섯 바이옴(숲·늪·산·사당·폐허)은 전부 이
    던전의 "야생" 정체성이라, 마을(문명)은 일부러 그 다섯에 안 낀다.
    막다른 마을(북쪽 문 하나뿐, 이번 슬라이스엔 더 이상 분기 없음).
  - 신규 `TownMerchant`(`DungeonMerchant.cs` 그대로 재사용) — 지금까지
    어떤 행상도 안 팔던 `wp_axe`(atk12, 이전 최저가 wp_saber18보다
    낮은 티어)를 20냥에 판다. Room1 남쪽 문 바로 너머라 전투 없이도
    닿을 수 있는 자리라, 시작 골드(0)에서도 Room1 안 몇 마리만 잡으면
    살 만한 낮은 가격으로 잡았다. `roomId="town2"`로 등록된 적이 아예
    없어 `DungeonEnemy.CountAliveInRoom("town2")`가 항상 0을 반환하고,
    "방을 다 잡아야 연다" 조건이 평화로운 마을엔 자연히 안 걸린다.
  - 미니맵에 Town2 점 추가(황금빛, 다섯 바이옴 색과 구분되는 "문명"
    색). `Minimap.cs`의 `WorldZMin`도 -15→-45로 넓혀 Town2가 가장자리에
    눌리지 않고 정확한 위치에 찍히게 했다.
  - 신규 `Editor/PlaytestDungeonTown2.cs` — Play 모드에서 Town2·
    TownMerchant 좌표로 순간이동해 실제로 구매(골드 차감·`wp_axe` 장착)
    까지 되는지 확인(문 자체는 스크립트 트리거가 없는 순수 지오메트리라
    — 씬 재빌드 로그에 `DungeonRoomBuilder.OpenDoorOnWall()`의 "문
    폭이 벽 길이보다 넓다" 경고가 없음으로 이미 확인됨 — 별도 검증
    불필요, 진짜 새로 확인이 필요했던 건 "적이 하나도 없는 방에서도
    행상이 예전과 같이 동작하는가"였다). `OK - walked to Town2, bought
    from TownMerchant, no errors`(gold 50→30, wp_axe 장착 확인).
  - **씬 재빌드 중 배치 프로세스가 두 번 안 끝나는 것처럼 보였다** —
    원인은 `-quit` 플래그를 안 줘서였다(`BuildTestDungeonScene.Build()`는
    Playtest류와 달리 자체적으로 `EditorApplication.Exit()`을 안 부른다
    — 저장은 이미 끝났는데 배치 모드가 계속 떠 있던 것뿐, 실제 행 없음).
    로그에 "saved to ... room childCount=16"이 이미 찍혀 있는 걸 확인하고
    PID로 정확히 종료(`taskkill //F //PID`, 이름으로 뭉뚱그리지 않음 —
    다른 세션의 Unity 프로세스를 잘못 건드리지 않기 위해서도 중요). 다음
    세션 참고 — `Build()`류(자체 종료 없음) 백그라운드 호출은 로그의
    "saved to" 줄로 완료를 판단하고 PID로 정리할 것, 무한정 기다리지
    말 것.
  - 컴파일(오류 없음)·씬 재빌드(`room childCount=14→16`, Room1에
    남쪽 문 벽 조각+아치 추가)·`PlaytestDungeonTown2`(`OK`, 신규)·
    `PlaytestDungeonFloorProgression`(회귀, `OK - 12 room advances,
    floor reached 4` — Room1 문 구성 변경이 기존 북쪽 진행에 영향 없음
    확인)·`PlaytestDungeonHeadless`·`PlaytestForestHeadless`(다른 트랙
    무관 확인) 전부 통과.
  - **사람의 GUI 확인 필요**(아직 안 됨) — Room1 남쪽 문·들길·Town2가
    실제로 자연스럽게 이어져 보이는지(문턱 단차 포함, 기존 복도들과
    같은 트레이드오프), Town2가 "마을"답게 느껴지는지(지금은 방 셸+
    행상 하나뿐이라 휑할 수 있음 — 다음 슬라이스 후보로 장식/NPC 추가
    검토), 행상 가격·구매 흐름이 실제로 자연스러운지, 미니맵에서 Town2
    위치가 실제 방향과 맞게 보이는지.
- **FOREST — 창조물 종 늘리기 둘째: 무쇠도깨비·나비정령 (2026-09-12,
  열두 번째 세션 이어서, "바위 지대·꽃밭도 두 종씩 채워줘"로 착수).**
  바로 앞 슬라이스가 채운 버섯숲·어둑숲과 같은 패턴으로 나머지 두
  바이옴도 채웠다 — 이제 `ForestBiomeData.Zones` 넷 전부 종 둘씩,
  여덟 종.
  - **무쇠도깨비** — 바위 지대(bawi와 공유, den을 zone 중심에서
    약 7.2m 비껴 둠). 납작하게 웅크린 몸통(무쇠빛 청회색)+눈 혹 둘로
    bawi(상자+상자 혹, 돌빛 회갈)와 실루엣·색조 둘 다 갈랐다. 여덟 종
    중 가장 느리게 튄다(fleeSpeed 1.8 — 새 초과, 이전엔 이 축(fleeSpeed)
    에 기록이 없었다 — moveSpeed·fleeRadius·wanderRadius 세 축은 이미
    앞선 슬라이스들이 최댓값/최솟값을 다 가져가 있어서 이번에 남은
    유일한 빈 축을 찾아 썼다).
  - **나비정령** — 꽃밭(kkot과 공유, 마찬가지로 약 7.2m 비껴 둠). 작은
    구 몸통 + 납작구 날개 둘(파스텔 보라/청보라)로 kkot(구+화관, 크림/
    분홍)과 갈랐다. 여덟 종 중 가장 급하게 튄다(fleeSpeed 4.8 —
    musoetokkebi와 같은 축의 반대쪽 새 초과).
  - **기존 여섯 종의 "가장 ~함" 주장과 충돌 안 함을 다시 확인** —
    moveSpeed 최댓값(beoseot 2.0)·최솟값(bawi 0.9), fleeRadius
    최댓값(angaeyuryeong 7.5)·최솟값(beoseot 3.0), wanderRadius
    최댓값(kkot 5.0)·최솟값(pojagoemul 1.8) 전부 새 두 종(모두 그 범위
    안쪽 값)에도 그대로 성립. fleeSpeed 축만 이번에 처음 초과값이
    생겼다(1.8/4.8).
  - `ForestCreatureBuilder`에 두 정의 추가(den만, 기존 여섯 무변경).
    `PlaytestForestCreatures.cs`의 `Kinds` 배열에 두 종 추가해 검증
    범위를 여덟으로 넓혔다(성공 로그 "여섯" → "여덟").
  - 검증: 컴파일(오류 없음)·`PlaytestForestCreatures`(`OK - all eight
    creatures wandered and fled correctly, no errors` — 여덟 종 전부
    배회 이동량 0.33~4.51m로 통과, musoetokkebi가 0.33m로 가장 아슬아슬
    했지만 통과 기준(0.2m) 위 — 좁은 wanderRadius를 가진 종일수록
    낮게 나올 확률이 있다는 걸 이번에 실측으로 확인, 기존에도 있던
    시드 없는 무작위 테스트의 성질이라 새로 손대지 않음)·dokkaebi
    도주 재확인·회귀 `PlaytestForestHeadless`·
    `PlaytestForestHouseTransition`·`PlaytestForestFurniture`·
    `PlaytestDungeonHeadless`(다른 트랙 무관 확인) 전부 `OK`.
  - **사람의 GUI 확인 필요**(아직 안 됨) — 무쇠도깨비·나비정령이 실제로
    화면에서 잘 보이는지, 같은 바이옴 안에서 두 종씩(넷 다) 서로 안
    겹쳐 보이는지, 여덟 종 전체를 몰아 봤을 때 마을이 붐벼 보이지는
    않는지.
- **FOREST — 창조물 종 늘리기: 포자괴물·안개유령 (2026-09-12, 열두 번째
  세션 이어서, "창조물 종 더 늘리기부터 이어가줘"로 착수).** 다섯째·
  여섯째 종 추가 — saga-godot에 대응하는 원본이 없어(그쪽은 네 바이옴을
  넷으로 딱 채우고 끝났다) 이번엔 saga-forest 웹판 `data-village.js`
  (`ANIMALS.mushnub`, "포자괴물" — 버섯숲 한정 몬스터)와 한국 설화
  모티프(도깨비불)만 참고해 saga-unity가 처음 설계했다.
  - **포자괴물** — 버섯숲(beoseot과 같은 바이옴, den을 beoseot 자리에서
    약 7.8m 비껴 둠) 몬스터. 찌그러진 몸통(황록) + 삐죽한 포자 혹 셋(암록,
    120°씩 배치)으로 버섯정령(줄기+갓, 청록)과 실루엣을 갈랐다. 넷 중
    가장 좁게 돈다(wanderRadius 1.8 — 새 최솟값, 기존 넷의 "가장 ~함"
    주장과 안 겹치는 축을 새로 잡았다).
  - **안개유령** — 어둑숲(dokkaebi와 같은 바이옴, 마찬가지로 약 8.5m
    비껴 둠) 몬스터, 도깨비불 모티프. **땅에 안 붙어 사는 유일한 종** —
    Den의 y를 1.0으로 줘서 배회 내내 그 높이를 유지한다(`MoveToward`가
    XZ만 바꾸고 y는 그대로 둔다는 걸 이용, 새 코드 추가 없이 기존 이동
    로직 그대로 재사용). 창백한 겉불꽃 구 + 밝은 속불꽃 작은 구로
    "빛이 흔들린다"는 인상만 정적으로 흉내(애니메이션은 범위 밖). 넷 중
    가장 쉽게 놀란다(fleeRadius 7.5 — 새 최댓값).
  - **기존 네 종의 "가장 ~함" 주장과 충돌 안 함을 직접 확인** — bawi(가장
    느림 0.9/가장 안 겁냄 중 최소 fleeRadius는 아님, 4.0)·beoseot(가장
    빠름 2.0, 최소 fleeRadius 3.0 그대로 유지)·kkot(가장 넓은 wander 5.0,
    angaeyuryeong의 4.2보다 여전히 큼) 전부 새 두 종 추가 후에도 그대로
    성립.
  - `ForestCreatureBuilder`에 두 정의만 추가(den 좌표, 기존 넷은 무변경).
    `PlaytestForestCreatures.cs`의 `Kinds` 배열에 두 종 추가해 배회 검증
    범위를 여섯으로 넓혔다(성공 로그 문구도 "네" → "여섯"으로 수정).
  - 검증: 컴파일(오류 없음)·`PlaytestForestCreatures`(`OK - all six
    creatures wandered and fled correctly, no errors` — 여섯 종 전부
    배회 이동량 0.83~3.91m로 통과, dokkaebi 도주 재확인)·회귀
    `PlaytestForestHeadless`·`PlaytestForestHouseTransition`·
    `PlaytestForestFurniture`·`PlaytestDungeonHeadless`(다른 트랙 무관
    확인) 전부 `OK`.
  - **사람의 GUI 확인 필요**(아직 안 됨) — 포자괴물·안개유령이 실제로
    화면에서 잘 보이는지(특히 안개유령이 땅 위 1m에 떠 있는 게 자연
    스러운지, 순간이동한 것처럼 안 보이는지), 같은 바이옴 안에서 두 종이
    서로 겹쳐 보이지 않는지.
- **FOREST — 바이옴 지형 다양성 슬라이스 (2026-09-12, 열두 번째 세션,
  "1,2 순서대로 진행"의 (1) — FOREST 단순화 부분 채우기부터).**
  `VERTICAL_SLICE_FOREST.md`(saga-godot·saga-unity 둘 다)가 "다음
  슬라이스로 미룸"에 남겨 뒀던 "바이옴 지형 다양성(꽃밭·어둑숲·버섯숲·
  바위 지대)"을 채웠다 — `ForestCreatureBuilder`가 이미 네 창조물을
  "바이옴을 흉내낸 구석"이라며 마을 네 귀퉁이에 흩어 둔 자리(주석에
  명시)를 그대로 재사용해, 그 den 좌표를 실제 바이옴 존 중심으로
  승격시켰다 — 창조물 좌표는 하나도 안 옮김.
  - 신규 `Data/ForestBiomeData.cs` — 존 4개(중심·반경·안쪽 반경·정점색
    틴트), `SampleTint(wx,wz)`로 임의 좌표의 배율을 반환(각 존 영향을
    부드럽게 lerp, 겹칠 일 없음 — 대각선으로 가장 가까운 두 존도
    64m 이상 떨어져 있고 반경은 17m).
  - `Shaders/ForestWorldCurve.shader`에 `COLOR` 정점 입력 추가 —
    `_BaseColor`에 곱한다. **정점색이 없는 메시(창조물 primitive 등)는
    Unity가 기본값 (1,1,1,1)을 채워 기존 결과와 완전히 동일** — 실제로
    검증(아래)에서 창조물 넷 다 배회·도주가 그대로 통과했다.
  - `World/ForestGroundBuilder.cs` — 땅 메시를 구울 때 정점마다
    `ForestBiomeData.SampleTint()`를 평가해 정점색으로 얹는다. GO
    `TerrainBuilder.cs`가 겪은 "칸 경계가 바둑판처럼 갈라져 보이는"
    문제와 원인 자체가 다르다 — FOREST 땅은 애초에 타일 격자가 없는
    연속 메시라 정점마다 세계 좌표 연속 함수를 그대로 평가하면 경계가
    저절로 매끈하다(칸별 보간·블렌딩 마진 같은 별도 장치 불필요).
  - **재해석 하나, 문서화됨** — 이 존은 순수 시각 다양성이다. 걷기 판정·
    콜라이더는 여전히 단일 평면(`ForestGroundBuilder` 클래스 주석
    "판정은 항상 평면 좌표로" 원칙 그대로) — 바이옴이 이동 속도·채집
    가능 여부 등 게임플레이 규칙을 바꾸지 않는다(godot 문서도 이 항목을
    "지형 다양성"으로만 분류해 뒀지 규칙으로 분류하지 않았다).
  - 컴파일(신규 셰이더 COLOR 시맨틱 포함 오류 없음)·회귀
    `PlaytestForestHeadless`(`OK - 10 frames, no errors`)·
    `PlaytestForestCreatures`(`OK - all four creatures wandered and
    fled correctly` — den 좌표 무변경이라 배회/도주 수치 그대로)·
    `PlaytestForestHouseTransition`·`PlaytestForestFurniture`·
    `PlaytestDungeonHeadless`(다른 트랙 무관 확인) 전부 `OK`.
  - **사람의 GUI 확인 필요**(아직 안 됨) — 네 바이옴 색이 실제로
    구별되어 보이는지, 존 경계가 매끈한지(이론상 연속 함수라 매끈해야
    하지만 눈으로 확인된 적 없음), 창조물 넷이 각자 바이옴 안에서
    자연스러워 보이는지, 기존 콘텐츠(나무·주민·집·가구 좌판)가 바이옴
    색과 안 부딪히는지.
- **FOREST — 실기 확인 완료, "문제 없어 보여" (2026-09-12, 열두 번째
  세션).** 지난 세션이 "실기 확인부터 할게, 새로운 세션에서 하자"로
  넘긴 것을 사용자가 유니티 에디터로 직접 플레이해 확인 — 구면 투영·
  집 들어가기/나가기·가구 여섯 자리·네 창조물(숲도깨비·바위도깨비·
  버섯정령·꽃정령)의 배회/도주 전부 이상 없음. 아래 "완료 단계"의
  관련 GUI 확인 항목 세 개(몬스터·퓨전 슬라이스, 가구 슬라이스, 구면
  투영/집 곡률)를 지웠다.
- **FOREST — 몬스터·퓨전 콘텐츠 슬라이스 (2026-09-12, 열한 번째 세션
  이어서, "몬스터·퓨전 콘텐츠부터 이어가줘"로 착수).** saga-godot FOREST
  트랙이 `VERTICAL_SLICE_FOREST.md` 5절("몬스터·퓨전 자유" — FOREST 주민은
  애초에 역사 인물이 아니라 역할 이름이라 PLAN.md 5장과 안 충돌한다는 결정)
  에 따라 이미 검증해 둔 네 종(숲도깨비·바위도깨비·버섯정령·꽃정령)을
  개념만 참고해 Unity로 새로 짰다(코드는 안 베낌).
  - 신규 `World/ForestCreature.cs` — Idle→Wander→Flee 상태기계(GO
    `WanderingAnimal.cs`와 같은 구조지만 **Group(무리 전파)는 뺐다** —
    godot 원본 설계에 없던 걸 새로 안 얹음). 전투·포획·HP 없음(이 판의
    핵심은 "돌아다니면 재미있다" — `LEGACY_FEATURE_AUDIT.md` 원칙 그대로).
    FOREST엔 GO의 타일 맵 같은 보행 판정 데이터가 없어(단일 평면) 걸을 수
    있는 자리 검사는 생략.
  - **종별 시각 — 전부 primitive 조합**(GLB 없음) — 숲도깨비(구+원기둥
    뿔)·바위도깨비(상자+상자 혹)·버섯정령(원기둥 줄기+구 갓)·꽃정령(구+
    납작구 화관). Unity 기본 도형에 원뿔·토러스가 없어(DUNGEON 바이옴
    소품이 나무를 원기둥+구로 대신한 것과 같은 이유) 뿔은 기울인 원기둥,
    화관은 Y로 누른 구로 대신했다 — 문서화된 재해석. `Saga/ForestWorldCurve`
    셰이더 머티리얼을 물려 땅과 같이 휘게 했다(셰이더 클래스 주석이 "땅·
    나무·NPC 등" 전부 이걸 써야 한다고 명시하는데, 기존 나무·캐릭터
    폴백은 실제로는 평범한 URP Lit라 안 휠 수 있다는 걸 코드 검토 중
    발견 — 기존 결함은 이번 범위 밖이라 안 건드리고 그대로 둠, 이미
    "나무·주민이 공중에 뜨는지" GUI 확인 항목으로 대기 중이던 것과
    같은 사안이라 새 항목을 안 늘림).
  - **종별 능력치를 갈라 체감을 다르게 잡았다**(godot 수치 그대로 재사용) —
    숲도깨비(속도1.5·도주3.5·경계6.0·배회4.0, 기본값)·바위도깨비(0.9·2.2·
    4.0·2.5, 가장 느리고 덜 겁냄)·버섯정령(2.0·4.2·3.0·3.5, 가장 빠르고
    가장 안 겁냄)·꽃정령(1.2·3.0·5.0·5.0, 가장 넓게 배회).
  - 신규 `World/ForestCreatureBuilder.cs`(GO `AnimalBuilder.cs`와 같은
    "정의 배열+Awake 스폰" 패턴) — 바이옴이 없어 대신 마을 네 귀퉁이
    (기존 콘텐츠와 안 겹치는 자리)에 하나씩. `BuildTestVillageForestScene
    .cs`에 `BuildCreatures()` 추가(명시적 Build() 호출 없음 — 이 컴포넌트는
    edit-time에 그 자식을 즉시 찾을 일이 없어 GO AnimalBuilder와 같은
    패턴으로 충분, `ForestHouse`가 겪은 문제와는 다른 경우).
  - 신규 `Editor/PlaytestForestCreatures.cs` — Play 모드에서 네 종 전부
    배회(Idle→Wander) 실제 이동을 관찰하고, 플레이어를 숲도깨비 옆으로
    순간이동시켜 도주(멀어짐)까지 확인. `OK - all four creatures wandered
    and fled correctly, no errors`(dokkaebi 이동 3.32m·bawi 0.56m·
    beoseot 2.68m·kkot 3.71m, flee 거리 1.00→4.50).
  - 회귀 `PlaytestForestHeadless`·`PlaytestForestHouseTransition`·
    `PlaytestForestFurniture`·`PlaytestDungeonHeadless`·
    `PlaytestDungeonFloorProgression` 전부 재확인.
  - **사람의 GUI 확인 — 2026-09-12(열두 번째 세션) "문제 없어 보여"로 완료.**
- **FOREST — 집 꾸미기(가구) 슬라이스 (2026-09-12, 열한 번째 세션 이어서,
  "가구부터 진행해줘"로 착수).** saga-godot FOREST 트랙이 이미 검증해 둔
  다음 콘텐츠 순서(가구 → 몬스터·퓨전)를 참고해 시작 — 코드는 안 베끼고
  saga-forest 웹판 `js/data-village.js`(FURNITURE 14종·FURN_SETS 4계열·
  HOME_GRADES 6단)·`js/home.js`(score 공식)를 원본 삼아 Unity로 새로 짰다.
  - **재해석 둘, 문서화됨** — (1) FOREST엔 아직 금 경제가 없어(HeroState.Gold
    대응 없음) 채집한 과일(`ForestState.FruitCount`)을 구매 통화로 재해석
    (`ForestState.SpendFruit()` 신규). 집 평가 점수 계산은 웹판 '냥' 값
    그대로 써서 `HOME_GRADES` 문턱이 원작과 그대로 맞아떨어진다(`FurnitureItem
    .Value` vs `.FruitCost` 분리). (2) 원작의 "날짜 해시로 매일 4점만 진열"은
    day/시간 시스템 자체가 없어 GO `LuckyCairn.cs` 패턴(상시 룰렛+쿨다운)으로
    대신했다.
  - **자유 배치 대신 고정 자리 여섯** — 원작은 "선 자리에 놓는다"(임의 좌표)
    지만 FOREST 트랙엔 아직 "놓기" 같은 상호작용 입력 자체가 없어(이동뿐인
    GO판 컨트롤러 재사용), 이 트랙 기존 관례(나무·주민·집 문처럼 "다가가면
    반응")를 그대로 따라 여섯 개 고정 자리로 단순화(`ForestFurnitureAnchor.cs`
    신규) — 비면 창고에서 가장 값진 것을 놓고, 있으면 되거둔다.
  - 신규 `Data/ForestHomeData.cs`(카탈로그·등급표)·`Data/ForestHomeState.cs`
    (창고·자리·점수, `BestiaryState`류와 같은 정적 상태 클래스 결)·
    `World/ForestFurnitureStall.cs`(구매)·`World/ForestFurnitureAnchor.cs`
    (놓기/거두기). `ForestSaveState` v1→v2(`homeStockKeys/Counts`·
    `homeAnchors`).
  - **세이브 로드 시점 문제를 미리 피함** — `ForestFurnitureAnchor`의 자식
    Awake가 `GameBootstrap.Start()`의 `ForestSaveState.TryLoad()`보다 먼저
    돌아 시각화가 로드 전 상태로 굳을 뻔한 걸(saga-godot `forest_house.gd`가
    이미 겪은 것과 같은 순서 문제) 코드 작성 중에 미리 알아채, 첫 `Update()`
    프레임에 한 번만 동기화하는 `_synced` 플래그로 고쳤다(godot의 해법과
    같은 결).
  - **에디터 스크립트 쪽 실제 버그 하나 발견·수정** — `BuildTestVillageForestScene
    .cs`가 방금 지은 `IndoorRoom`을 찾으려다 못 찾는 실제 오류가 났다.
    원인: `ForestHouse`가 지금까지 `Awake()`에서만 실내를 지었는데, **Awake()는
    Play 모드에서만 저절로 불리고 에디터가 씬을 조립하는 edit-time에는
    안 불린다**(DUNGEON류 빌더가 진작부터 공개 `Build()`를 명시로 부르는
    것과 다른 패턴이었다 — `ForestGroundBuilder`도 같은 잠재 결함을 안고
    있었지만 이번엔 안 건드림). `ForestHouse.Build()`를 공개 메서드로
    빼 에디터 스크립트가 명시로 부르도록 고쳤다 — 이 결함이 있었어도
    지금까지의 헤드리스 테스트(Play 모드로 씬을 다시 여는 방식)는 우연히
    다 통과해 왔다(edit-time 조립 직후 상태를 검사한 적이 없어서).
  - 신규 `Editor/PlaytestForestFurniture.cs` — Play 모드에서 과일을 채우고
    좌판·자리를 실제로 오가며 구매→배치→점수→쿨다운 후 거두기까지
    GameObject 경로로 검증. 처음엔 거두기 검증이 실패했는데(프레임 2장만
    기다림), 배치 모드가 실시간보다 훨씬 빠르게(약 초당 5700프레임) 도는
    걸 알아채고 `Time.time` 기준 대기로 고침(프레임 수 기준 대기가 실제
    쿨다운 경과와 다르다는 걸 이번에 처음 확인) — `OK - bought, placed and
    picked up furniture, score changed as expected, no errors`.
  - 회귀 `PlaytestForestHeadless`·`PlaytestForestHouseTransition`·
    `PlaytestDungeonHeadless`·`PlaytestDungeonFloorProgression` 전부 재확인
    (`OK`, 다른 트랙 무관 확인).
  - **사람의 GUI 확인 — 2026-09-12(열두 번째 세션) "문제 없어 보여"로 완료.**
- **FOREST — 집 들어가기/나가기 CharacterController 순간이동 결함 수정 +
  자동 검증 도구 (2026-09-12, 열한 번째 세션, DUNGEON 실기 확인 "문제
  없어 보여" 이후 "더 진행해줘"로 계속).** 사용자가 다음 방향을 물어
  FOREST 실기 확인(첫 커스텀 셰이더라 리스크 큼)을 추천했으나 사용자가
  "더 진행해줘"로 답해, 그 실기 확인은 사용자 몫으로 남겨두고 코드
  검토를 이어갔다 — 바로 위 DUNGEON 세션에서 배운 패턴(`CharacterController`
  가 켜진 채 `transform.position`을 그냥 대입하면 Unity가 다음 프레임에
  조용히 되돌린다)을 다른 트랙에도 있는지 훑어보니, **`ForestHouse.cs`가
  집 들어가기/나가기 때 똑같은 방식으로 플레이어를 옮기고 있었다** —
  아직 사람이 실기로 확인 안 한 코드라 아무도 못 밟았을 실제 결함
  (문에 다가가도 안 들어가지거나, 들어간 것처럼 보였다가 바로 튕겨
  나오는 것처럼 보일 뻔했다). `SaveState.cs`류(GO/DUNGEON/FOREST 전부)의
  위치 복원은 `Start()` 이전(첫 물리 스텝 전)이라 이 문제를 안 밟는다는
  것도 다시 확인 — 셋 다 그대로 둠.
  - `ForestHouse.TeleportPlayer()` 신규 — 대입 전후로
    `CharacterController.enabled`를 껐다 켠다. 들어가기·나가기 두 호출부
    모두 이걸로 교체.
  - 신규 `Editor/PlaytestForestHouseTransition.cs` — `PlaytestDungeonFloorProgression
    .cs`와 같은 결. Play 모드에서 플레이어를 문 앞/실내 출구 앞으로
    순간이동시켜(테스트 하니스 쪽도 같은 CC 토글 필요) `_isInside` 플래그가
    실제로 뒤집히는지, 착지 위치가 몇 프레임이 지나도 안 되돌아가는지까지
    확인한다.
  - 재검증 — `[PlaytestForestHouseTransition] OK - entered and exited the
    house, position held across frames, no errors`. 회귀로
    `PlaytestForestHeadless`(`OK - 10 frames, no errors`)도 재확인.
  - **부수 확인** — Play 모드 진입/종료 중 Unity가 `TestVillageForest.unity`를
    내용 변경 없이 fileID만 재배정해 다시 저장하는 걸 발견(오브젝트 28개·
    이름 전부 diff 0) — 의도한 변경이 아니라 커밋 전 `git checkout`으로
    되돌림(루트 CLAUDE.md급 습관, saga-godot CLAUDE.md의 "에디터가 project.godot을
    조용히 고쳐 쓴다"와 같은 종류의 부작용).
  - **구면 투영·집 안 곡률 포함 — 2026-09-12(열두 번째 세션) "문제 없어
    보여"로 확인 완료.**
- **DUNGEON — 절차적 층 진행 실제 GameObject 경로 자동 검증 + 발견한
  진짜 결함 수정 (2026-09-12, 열한 번째 세션).** 지난 세션이 "다음
  세션이 가장 먼저 할 만한 일"로 남긴 빈틈 — `PlaytestDungeonHeadless`
  (10프레임, 플레이어 안 움직임)는 ProcRoom 첫 방 스폰까지만 확인하고
  문 선택 트리거·`AdvanceRoom`·`Descend`는 이 프로젝트의 어떤 자동
  검증도 안 거쳤던 것 — 를 메웠다. 신규 `Editor/PlaytestDungeonFloorProgression
  .cs` — Play 모드에서 ProcRoom 몬스터를 `DungeonEnemy.TakeDamage(9999
  99f)`로 강제로 죽이고, `DungeonFloorRunner`의 private `_doorPods`를
  리플렉션으로 읽어 첫 문 표지 위치로 플레이어를 순간이동시키는 걸
  반복해 실제 문 트리거·방 전환·층 하강이 GameObject 수준(TextMesh
  라벨·머티리얼·`DoorLabelBillboard` 포함)에서 진짜로 도는지 12회
  왕복 확인한다.
  - **첫 실행에서 실제 버그 둘을 잡았다.**
    (1) 테스트 하니스 쪽 — `CharacterController`가 켜진 채 `transform
    .position`을 그냥 대입하면 다음 프레임에 조용히 원래 자리로
    되돌아간다(Unity 표준 동작, `SaveState.cs`의 위치 복원이 이 문제를
    안 밟은 이유는 `Start()` 이전이라 CC가 아직 한 번도 안 움직인
    시점이라서). 대입 전후로 `controller.enabled`를 잠깐 껐다 켜서 고침.
    (2) **진짜 게임 결함** — `DungeonFloorRunner`가 방을 갈아치운 뒤에도
    플레이어를 문 표지 자리(z=8~9)에 그대로 뒀다. 다음 방이 무전투
    종류(POI, 가중치상 약 49%)면 그 자리에 새로 선 문이 `DoorTriggerRadius`
    (1.8) 안에서 곧바로 다시 트리거돼, 사람이 한 발짝도 안 걸었는데
    방 여러 개(때로는 층 하나 전체)를 순식간에 건너뛰어 버리는 결함이었다
    (자동 검증 전엔 아무도 못 볼 뻔했다 — 실기 플레이어는 문에 닿자마자
    반사적으로 몇 걸음 더 걷지만, 가만히 서 있으면 재현된다). `DungeonFloorRunner
    .RepositionPlayerToEntry()` 신규 — `AdvanceRoom()`/`Descend()`가
    `BuildRoomContent()` 직후 플레이어를 문 구역과 충분히 떨어진 남쪽
    진입 지점(`PlayerEntryOffset`, 로컬 (0,0,-6))으로 되돌려 세운다(다른
    물리적 방들이 복도를 지나야 닿는 것과 같은 느낌으로 통일). 여기도
    CharacterController를 껐다 켜는 같은 패턴 필요.
  - 고친 뒤 재검증 — `[PlaytestDungeonFloorProgression] OK - 12 room
    advances, floor reached 4, no errors`(roomIndex가 매번 정확히 1씩
    증가, floor 2→3→4, cave·fight·well·forage·stair 등 여러 방 종류를
    실제로 거침). `PlaytestDungeonHeadless`(회귀, `OK - 10 frames, no
    errors`)·전체 재컴파일도 통과.
  - **문 선택 트리거·`AdvanceRoom`·`Descend`가 실제 GameObject 경로에서
    도는 것 자체는 이제 자동 검증됐다** — 다만 문 표지 라벨이 실제로
    잘 읽히는지, 남쪽 재배치가 사람이 보기에 자연스러운지(순간이동
    연출 없음 — 시각 효과가 필요할 수도)는 여전히 사람이 GUI로 봐야
    한다(아래 목록에 추가).
- **DUNGEON — 층 깊이 공격력 체감 보정 추가 (2026-09-12, 열 번째
  세션 이어서).** "무기 진행도(atk)도 floor에 따라 오르게" 후보를
  실제로 검토해 보니, 레벨(선형 성장)과 몬스터 hp(1.26^floor 지수
  성장)의 성장 속도 차이가 근본이라 어떤 작은 보정을 얹어도 "100층이
  실제로 클리어 가능해진다"는 뜻은 아니라는 걸 사용자에게 먼저
  설명하고 확인받은 뒤(질문·답변: "그래도 작은 보정을 추가한다(체감용,
  근본 해결 아님)") 진행. `HeroState.Atk`에 `DepthAtkBonus`(층당 +2,
  `DungeonFloorRunner.Instance?.CurrentFloor ?? 1` 기준) 추가 — 새
  세이브 필드 없이 이미 저장되는 층 값에서 매번 다시 계산(파생값).
  `HeroState.cs`가 지금까지 UnityEngine을 안 끌어오는 순수 데이터
  클래스였는데 `Saga.Dungeon.World`(MonoBehaviour가 있는 네임스페이스)
  참조가 처음 생겼다 — `SaveState.cs`가 이미 같은 세션에서 만든
  선례(Data→World 참조)를 그대로 따름. 컴파일·PlaytestDungeonHeadless
  (`OK - 10 frames, no errors`) 통과.
- **DUNGEON — HUD에 던전 층수 표시 추가 (2026-09-12, 열 번째 세션
  이어서, "DUNGEON 더 다듬기" 방향으로 계속).** `PlayerHud.cs`를 보니
  이번 세션에 층 개념(`DungeonFloorRunner`)을 처음 도입했는데 정작
  화면 어디에도 몇 층인지 안 뜨고 있었다(레벨·체력·경험치·돈·무기·
  퀘스트 목표만 있었음) — 사람이 발견하기 전에 코드 검토로 잡음.
  `🕳️ 지하 N층`을 무기·공격력 줄에 추가(`DungeonFloorRunner.Instance
  ?.CurrentFloor ?? 1` — ProcRoom에 아직 안 닿았으면(Room1~4) 1로
  대신 표시). 컴파일·PlaytestDungeonHeadless(`OK - 10 frames, no
  errors`, HUD GameObject 변화 없어 씬 재빌드 생략) 통과.
- **DUNGEON — 절차적 층 진행이 저장/로드에서 사라지던 결함 수정
  (2026-09-12, 열 번째 세션 이어서, "이어해"로 계속 진행 중 코드
  검토로 발견).** `DungeonFloorRunner`를 만들 때 `SaveState.cs`(v4)에
  층 번호를 저장하는 걸 빠뜨렸다 — 지금까진 던전이 방 넷뿐이라 저장할
  "층" 개념 자체가 없었는데, 이 시스템이 층 개념을 실제로 도입하면서
  저장/로드할 때마다 진행이 항상 층2로 리셋되는 실제 결함이 생겨
  있었다(사람이 발견하기 전에 코드 검토로 미리 잡음). `SaveState` v4→v5
  (`dungeonFloor` 필드) — `DungeonFloorRunner.Instance`(신규 정적
  접근점)·`CurrentFloor`·`JumpToFloor(floor)` 추가. **정확한 방
  인덱스·종류까지는 안 남긴다** — 층 하나를 "의미 있는 진행 단위"로
  보고(원작도 `dstate().best`로 최고 층만 추적) 저장된 층의 첫 방
  (전투)부터 다시 시작하게 단순화했다. 컴파일·PlaytestDungeonHeadless
  (`OK - 10 frames, no errors`, 씬 GameObject 구성 변화 없어 재빌드
  생략) 통과.
- **DUNGEON — 오픈월드 확장을 절차적 층 진행 시스템으로 전환, 100층
  검증 (2026-09-12, 열 번째 세션 이어서).** 사용자가 "100층까지
  진행해줘"로 요청 — Room5~11처럼 방을 편집기 스크립트로 손으로 이어
  붙이는 물리적 확장은 100층 규모(방 수백~수천 개)에서 불가능해,
  saga-dungeon 웹판의 실제 방식(방 하나를 클리어마다 갈아치우며 문
  2~3개 중 다음 종류를 고르는 로그라이크식 진행)으로 전환할지 사용자
  에게 먼저 확인받고 착수. **Room5~11은 이제 물리적으로 존재하지
  않는다** — Room4→복도4→**ProcRoom**(방 하나) 구조로 줄었고,
  `World/DungeonFloorRunner.cs`(신규)가 이 방 하나를 층2부터 100층
  까지 계속 갈아치운다.
  - 신규 `Data/DungeonFormulas.cs` — UnityEngine 의존 없는 순수 C#으로
    `enemyHp`/`enemyDmg`/`roomsFor`/`isBossFloor`(js/dungeon.js 실제
    공식)를 그대로 옮기고, 문 종류 가중치 룰렛(`ROOMS`, data-dungeon.js)
    ·문 2~3개 선택(`makeDoors`)도 포팅. UnityEngine 비의존 덕에 씬
    없이도 계산만으로 100층까지 미리 검증 가능.
  - 문 선택은 화면 UI 버튼 대신 이 프로젝트 기존 관례(우물·사당·퍼즐
    제단처럼 "걸어서 가까이 가면 반응")를 그대로 따름 — 방이 갱신될
    때마다 문 자리에 원기둥+월드 공간 라벨(`DamagePopup.cs` billboard
    패턴 재사용)을 세우고, 걸어가면 그 종류로 다음 방이 열린다. 새
    Canvas/EventSystem 배선 없음.
  - 런타임에 즉석으로 만드는 POI에 값을 채우는 정식 API를 각 컴포넌트에
    추가(`DungeonEnemy.SetSpawnContext()`가 이미 쓰던 패턴의 연장) —
    `DungeonEnemy.ConfigureCombat()`, `DungeonMerchant.Configure()`,
    `DungeonTrove`/`DungeonShrine`/`DungeonVein`/`DungeonCaptive`/
    `DungeonForage.SetRoomId()`.
  - **`SimulateDungeonFloors.cs`(신규 에디터 도구)로 2~100층 전부
    검증** — 실제로 100층을 사람이 걸어서 확인하는 건 비현실적이라
    공식만 씬 없이 돌려 예외·NaN·오버플로 없음을 확인. **첫 실행에서
    실제 버그를 하나 잡았다** — 78층 근처에서 보상 exp/gold가 `int`
    캐스트 오버플로로 음수가 됐다(층별 1.25배 복리 성장이 int.MaxValue를
    넘음). `DungeonFormulas.ClampToInt()`로 int.MaxValue에서 눌러 고침
    (HeroState.AddExp/AddGold가 `int`를 받아 long으로 통째로 바꾸면
    SaveState·PlayerHud까지 건드리는 큰 손질이라 이 계산 단계에서
    캡). 고친 뒤 100층까지 방 856개, 예외 없이 통과(`OK - 2층~100층
    전부 통과`) — 100층 hp는 두목 기준 약 1.45조로 사실상 의미 없는
    숫자지만, "공식이 100층까지 안 깨진다"는 것 자체가 이번 요청의
    핵심이라 그대로 둠(밸런스 손질 요청 아님).
  - 컴파일·씬 재빌드(`room childCount=14` 그대로, GLB 못 찾음 경고
    없음)·PlaytestDungeonHeadless(`OK - 10 frames, no errors`, ProcRoom
    첫 방(fight) 스폰까지 실제 Play로 확인) 전부 통과 — **문 선택
    트리거·방 갈아치우기가 실제로 자연스러운지, 라벨이 잘 보이는지는
    사람이 직접 가 봐야 확인됨**(아래 GUI 확인 목록에 추가).
- **DUNGEON — 오픈월드 확장 네 번째 조각: Room10(층2 행상)
  (2026-09-12, 열 번째 세션 이어서).** "층2 방 종류 계속 추가" 방향을
  그대로 이어감 — Room9(퍼즐방, 예전엔 막다른 방) 북쪽에 문을 새로
  뚫어 복도9→**Room10**(층2 행상, 새 막다른 방)으로 이었다(좌표 공식
  그대로 연장: 255/270). `DungeonMerchant.cs`를 그대로 재사용하되
  재고를 새로 배정 — **기존 `wp_glaive`(층1 두목 확정 드랍)를 90냥에
  판다**(Room2 행상 wp_saber 45냥의 2배, 새 아이템 없이 기존 카탈로그만
  재사용) — 층1 두목을 못 잡은 플레이어도 이 깊이에서 중간 이상 티어
  무기를 살 수 있게 하는 게 목적. 미니맵에 Room10 점 추가. 컴파일·씬
  재빌드(`room childCount=14` 그대로, GLB 못 찾음 경고 없음)·
  PlaytestDungeonHeadless(`OK - 10 frames, no errors`) 전부 통과 —
  **Room9→Room10 연결·행상 가격·구매 흐름이 실제로 되는지는 사람이
  직접 가 봐야 확인됨**(아래 GUI 확인 목록에 추가).
- **DUNGEON — 오픈월드 확장 세 번째 조각: Room9(층2 퍼즐방)
  (2026-09-12, 열 번째 세션 이어서).** "층2 방 종류 계속 추가" 방향을
  그대로 이어감 — Room8(채광방, 예전엔 막다른 방) 북쪽에 문을 새로
  뚫어 복도8→**Room9**(층2 퍼즐방, 새 막다른 방)으로 이었다(좌표 공식
  그대로 연장: 225/240). `DungeonPuzzle.cs`를 그대로 재사용(제단 셋·
  순서 판정 로직 무변경 — 이 POI는 몬스터와 무관해 `roomId` 자체가
  없고 보상도 상수라 새 코드 없이 인스턴스 하나만 더 배치). 미니맵에
  Room9 점 추가. 컴파일·씬 재빌드(`room childCount=14` 그대로, GLB
  못 찾음 경고 없음)·PlaytestDungeonHeadless(`OK - 10 frames, no
  errors`) 전부 통과 — **Room8→Room9 연결·퍼즐 순서 판정이 실제로
  되는지는 사람이 직접 가 봐야 확인됨**(아래 GUI 확인 목록에 추가).
- **DUNGEON — 오픈월드 확장 두 번째 조각: Room7·Room8(층2 방 종류
  추가) (2026-09-12, 열 번째 세션 이어서).** 첫 조각(아래 항목) 뒤
  "층을 하나 더(층3)" vs "같은 층 안에 방 종류 더 채우기" 중 사용자가
  후자로 방향을 정함 — floor=2 개념은 그대로 두고 Room1~4가 방 종류를
  다양화했던 패턴을 층2에도 반복. Room6(층2 두목, 예전엔 막다른 방)
  북쪽에 문을 새로 뚫어 복도6→**Room7**(층2 정예 소굴)→복도7→
  **Room8**(층2 채광방, 새 막다른 방)으로 이었다(좌표 공식 그대로 연장:
  165/180/195/210). 정예는 Room3 정예 공식(ELITES 'fierce' hp×1.35·
  dmg×1.9)을 층2 잡졸 기준값(hp30·dmg6)에 그대로 적용(hp=41·dmg=11),
  보상도 hp 성장률(1.25배)로 반올림(exp 30→38·gold 16→20), 확정 드랍은
  기존 `wp_saber` 재사용(새 아이템 없음). 색은 Room3 정예(붉은 분홍)와
  구별되는 녹슨 주황. 채광방은 `DungeonVein.cs`를 그대로 재사용(보상이
  상수라 층별로 안 바뀜 — 새 컴포넌트·값 없이 `roomId="room8"` 인스턴스만
  하나 더). 미니맵에 Room7·Room8 점 추가. 컴파일·씬 재빌드(`room
  childCount=14` 그대로, GLB 못 찾음 경고 없음)·PlaytestDungeonHeadless
  (`OK - 10 frames, no errors`) 전부 통과 — **Room6→Room7→Room8 연결·
  층2 정예의 위협감이 실제로 자연스러운지는 사람이 직접 가 봐야
  확인됨**(아래 GUI 확인 목록에 추가, 사용자가 "실기는 마지막"으로
  정해 둬서 계속 코드로 이어갈 수 있다).
- **DUNGEON — 오픈월드 확장 첫 조각: Room5·Room6(층2 진입) (2026-09-12,
  열 번째 세션).** "다음 작업"이 지시한 (2) 착수 전에 saga-dungeon
  웹판 `js/dungeon.js`를 먼저 훑어 범위를 정했다 — **원작의 "오픈월드"는
  방을 물리적으로 여럿 잇는 게 아니라, 방 하나(`run.room`)를 클리어마다
  갈아치우며 문 2~3개(`makeDoors()`) 중 다음 방 종류를 플레이어가
  고르는 로그라이크식 분기다**(층 끝은 보스방, 클리어하면 `descend()`로
  다음 층 전체가 다시 절차 생성). 이 발견을 사용자에게 보고하고 두
  방향(물리적 확장 계속 vs 원작 로직 전환) 중 선택을 물어 **"물리적
  확장 계속(Room5,6...)"**으로 확정 — 지금 있는 좌표·구조를 안 건드리는
  쪽. Room4(막다른 방)에 북쪽 문을 새로 뚫어 복도4→**Room5**(층2 필드
  잡졸)→복도5→**Room6**(층2 두목, 새 막다른 방)으로 이었다(좌표는 기존
  공식 그대로 연장: Room4Center 90 기준 +30씩 — 105/120/135/150).
  **이 프로젝트가 처음으로 `floor`(층) 개념을 실제로 씀** — 웹판
  `enemyHp`/`enemyDmg` 공식(hp×1.26^(floor-1), dmg×1.20^(floor-1))을
  floor=2로 계산해 그대로 옮김(잡졸 hp=30·dmg=6, 두목 hp=212·dmg=13).
  보상 exp/gold도 hp 성장률(1.26)에 맞춰 반올림(잡졸 20→25, 8→10)하고
  두목은 기존 "잡졸의 5배" 규칙 재사용(125/50). 두목 확정 드랍 신규
  `wp_greatblade`("흑철중검", atk 31 — 층1 두목 아이템 wp_glaive(26)에
  두목 dmg 성장률(11→13)을 그대로 곱한 값). Room5·Room6은 Ruins
  바이옴을 **방에도 처음** 써서 "복도 폐허가 방까지 삼켰다"는 인상,
  층2 두목은 기존 두목(3.2m 적갈)·미니보스(3.6m 자보라)보다 더 크게
  (4.0m)·새 색조(짙은 남색)로 "더 깊이 들어갈수록 더 위협적" 흐름을
  이어감. 미니맵에 Room5·Room6 점 추가. 컴파일·씬 재빌드(`room
  childCount=14` 그대로 — Room1 자식 수라 안 바뀜, GLB 못 찾음 경고
  없음)·PlaytestDungeonHeadless(`OK - 10 frames, no errors`) 전부 통과 —
  **Room4→Room5→Room6 연결·층2 두목의 위협감·아이템 드랍이 실제로
  자연스러운지는 사람이 직접 가 봐야 확인됨**(아래 GUI 확인 목록에
  추가, 사용자가 "실기는 마지막에, 다른 작업이 우선"이라고 정해 둬서
  이번 세션은 계속 코드로 다음 조각을 이어갈 수 있다).
- **PLAN.md 51~65장 확장 순서 — FOREST 착수, 첫 버티컬 슬라이스
  (2026-09-12, 아홉 번째 세션 이어서).** DUNGEON 작은 폴리싱을 다 끝낸
  뒤 "다음 방향" 질문에 사용자가 "1,2 순서대로"(FOREST 착수 → DUNGEON
  진짜 오픈월드 확장)로 답해 착수. **설계는 이미 saga-godot 쪽에
  끝나 있었다** — `saga-godot/docs/VERTICAL_SLICE_FOREST.md`가 구면
  투영·월드 스케일(3m/칸, 90×60m)·카메라(고정, pitch 62°)·첫 콘텐츠
  루프(걷기→채집→대화→집 들어가기→저장)까지 다 결정해 둔 걸 그대로
  참고해 Unity로 옮겼다(자세한 내용·설계 근거는 saga-unity
  `docs/VERTICAL_SLICE_FOREST.md` 참고, 여기는 요약만).
  - **새 폴더 `Assets/Games/SagaForest/`**(`SagaForest.asmdef`) —
    SagaGo·SagaDungeon 코드 참조 없음(다섯 벌 복사 원칙).
  - **이 프로젝트 첫 커스텀 정점 셰이더** — `Shaders/ForestWorldCurve
    .shader`(URP HLSL, godot의 곡률 공식을 그대로 옮김: 플레이어
    위치에서 멀수록 `dot(diff,diff)*curveAmount`만큼 Y를 낮춘다).
    SagaGo `VertexColorLit.shader`를 뼈대로 재사용해 리스크를 줄였다.
    전역 파라미터(`Shader.SetGlobalVector`)라 godot이 헤드리스에서
    확인 못 했던 문제 자체가 Unity엔 없다.
  - **월드**: `ForestGroundBuilder.cs`(90×60m 단일 색 평면, 1.5m
    해상도, 콜라이더는 평평한 원본 — 곡률은 순수 시각 효과).
  - **카메라**: `Player/CameraRig.cs` — DUNGEON의 자유 오빗과 달리
    입력 처리가 아예 없는 완전 고정 카메라로 새로 짬(pitch 62°·거리
    14m). **이동**: `Player/PlayerController.cs` — DUNGEON판(회피
    포함) 대신 GO판(회피 없음)을 복사(이 슬라이스에 전투 없음).
  - **콘텐츠**: `ForestFruitTree.cs`(tree_oak.glb ×4.5, 무제한 채집+
    2초 쿨다운)·`ForestVillager.cs`(NPCS.keeper "숲지기", 대사 그대로)·
    `ForestHouse.cs`(별도 씬 없이 +500m "포켓 공간"으로 곡률 꺼짐/켜짐
    증명, 건물은 아직 primitive) + `Data/ForestState.cs`(과일 개수)·
    `Data/ForestSaveState.cs`(`save_forest.json`).
  - 컴파일(신규 셰이더 임포트 포함 오류 없음)·씬 저장(`Assets/Scenes/
    TestVillageForest.unity`, tree_oak.glb·character-a/b.glb 전부
    로드됨)·`PlaytestForestHeadless.Run`(`OK - 10 frames, no errors`,
    신규 `Editor/PlaytestForestHeadless.cs`) 전부 통과 — **이 프로젝트
    첫 커스텀 셰이더라 GUI 실기 확인이 특히 중요한데 아직 하나도
    안 됨**(땅이 실제로 그릇처럼 휘어 보이는지, 나무·주민이 땅과 같이
    굽어 공중에 안 뜨는지, 집 들어가기/나가기가 실제로 꺼짐/켜짐을
    보여 주는지 — 아래 GUI 확인 목록에 추가).
- **DUNGEON — 미니보스 덩치·색 강화, 사람이 실기로 재확인 완료
  (2026-09-12).** "이제 훨씬 세 보여"로 확인 — 커밋 `66b5f25`(1.8배·
  3.6m·짙은 자보라)가 실제로 효과 있었다. 아래 GUI 확인 목록의 관련
  항목은 지웠다.
- **DUNGEON — Secret Area 전용 POI (2026-09-12, 아홉 번째 세션 이어서,
  사용자가 실기 확인 중 "다른거 진행해"로 지시).** 35장 랜덤 이벤트의
  "Secret Area"를 DungeonAmbush 룰렛 결과 하나로만 얇게 대신했던 걸,
  진짜 탐험해서 찾는 전용 자리로 뺐다 — 신규 `World/DungeonSecretStash
  .cs`(GO `HiddenTreasure.cs`의 발광 구슬 재사용, DUNGEON 관례대로
  Update() 폴링), Room4 SE 빈 구석(경험치+40·돈+30, 성소보다 후하게).
  `SfxPlayer.PlayDiscovery()` 신규(레벨업 톤 재사용 시 착각할 수 있어
  분리). 컴파일·씬 재빌드(room childCount=14 그대로)·
  PlaytestDungeonHeadless 통과, 커밋 `7670c6f`.
- **DUNGEON — 실기 제보 둘 처리 (2026-09-12, 아홉 번째 세션 이어서).**
  사용자가 유니티 에디터로 직접 플레이해 본 결과 둘을 그때그때 반영.
  (1) "미니보스가 두목보다 안 세 보여" — 웹판 `spawnEnemy(floor, true)`
  공식은 원래 두목·미니보스가 완전 동급(HP·공격력 동일)이라 수치는
  안 건드리고, Unity 쪽 연출(두목 1.6배·3.2m·짙은 적갈 vs 미니보스
  1.3배·2.6m·옅은 자보라)만 문제였다 — 미니보스를 두목보다 **더
  크게(1.8배·3.6m)**·더 짙고 채도 높은 자보라로 올려 "더 깊이
  들어갈수록 더 위협적"으로 보이게 함(커밋 `66b5f25`). (2) 퀘스트
  진행이 순서를 벗어나면 조용히 안 인정되던 결함을 사람 확인을
  기다리지 않고 코드 검토로 미리 찾아 고침(아래 참고, 커밋
  `57b69a6`) — 세 목표를 독립 플래그로 재설계, `SaveState` v3→v4.
  둘 다 컴파일·(미니보스는 씬 재빌드도)·PlaytestDungeonHeadless 통과.
- **DUNGEON — PLAN.md(saga-dungeon 웹판) 챕터 순 심화, 나머지 세 조각
  (2026-09-12, 같은 아홉 번째 세션 이어서).** 사용자가 "계속 이어해" →
  "할수 있는 것들은 끝까지 해봐"로 계속을 지시해, 새 아트·오디오 에셋이나
  큰 구조 변경 없이 지금 구조로 갈 수 있는 나머지 챕터를 마저 옮겼다.
  - **35장 랜덤 이벤트**(신규 `World/DungeonAmbush.cs`) — Merchant·
    Treasure·NPC Rescue·Elite Monster·Shrine·Mini Boss는 이미 고정
    콘텐츠로 있어, 남은 Monster Ambush·Secret Area 두 종류만 GO
    `LuckyCairn.cs` 방식의 가중치 룰렛 한 자리(Room2 빈 구석, 25초
    쿨다운, 몇 번이고 반복 가능)로 합쳤다 — 55% 고요·30% 매복(그 자리에
    잡졸 하나가 즉석 스폰)·15% 숨겨진 주머니(돈+12). 매복 스폰을 위해
    `DungeonEnemy.SetSpawnContext()` 신규(편집기 리플렉션과 달리 Play
    중에도 되는 정식 API, GameObject를 비활성으로 만들어 값을 채운 뒤
    활성화해 `Awake()`가 올바른 모델을 보게 함). 기원 비용은 안 받는다
    (대부분 무해하거나 전투 하나를 더 던지는 정도라 경제 위협 안 됨).
  - **26장 HUD 개선**(`PlayerHud.cs`) — 텍스트뿐이던 체력 표시에
    `Image.Type.Filled` 게이지 추가, 텍스트 줄 바로 아래.
  - **37장 사운드**(신규 `Audio/SfxPlayer.cs`) — saga-unity 전체(GO
    포함)를 훑어도 AudioSource/AudioClip을 쓰는 코드가 하나도 없었다.
    CC0 SFX를 새로 구하는 정공법은 이 세션엔 방법이 없어 "그림은 코드가
    그린다"(루트 CLAUDE.md) 원칙을 소리에도 적용 — 사인파+선형 감쇠
    봉투로 짧은 톤을 절차적으로 합성(첫 재생 시 캐시). 평타(PlayHit)·
    강공격(PlayHeavyHit, 크리티컬 대용)·적 처치(PlayEnemyDeath, 하강
    피치)·레벨업(PlayLevelUp, 상승 피치, `HeroState.LeveledUp` 구독)만
    다뤘다 — 환경별 ambience(Forest/Ruins/Swamp)는 루프 음원이 필요해
    순수 합성으로는 부자연스러워 범위 밖.
  - 세 조각 전부 컴파일(오류 없음)·PlaytestDungeonHeadless(`OK - 10
    frames, no errors`) 통과, 랜덤 이벤트·HUD는 씬 GameObject가 늘어
    `BuildTestDungeonScene.Build()` 재실행(`room childCount=14` 그대로
    — Ambush는 Room의 자식이 아니라 씬 루트라 그 카운트는 안 바뀜),
    사운드는 씬을 안 건드려 재빌드 생략. 커밋 둘(`57b35f4` 랜덤이벤트+
    HUD, `327daa6` 사운드)로 나눠 그때그때 푸시 — **셋 다 사람이 GUI로
    아직 확인 안 함**(아래 GUI 확인 목록에 추가).
  - **이걸로 이 던전 규모(방 넷짜리 선형 통로, 새 에셋 없음)에서 코드만
    으로 갈 수 있는 PLAN.md(웹판) 챕터는 사실상 다 옮겼다.** 남은
    28장(오버월드/월드맵)은 방을 여러 개 더 짓고 좌표를 다시 잡아야
    하는 큰 구조 변경(범위를 벗어남, 방 종류 마지막 슬라이스가 이미
    "막다른 방 넷"으로 이 통로를 완결 지었다), 39장(로딩 구조·lazy
    load)은 씬 하나짜리 테스트 규모에선 아직 의미가 없고, 41장(최종
    UX 목표)은 새 코드가 아니라 지금까지 쌓인 것에 대한 평가 게이트다
    — 다음은 코드보다 **사람의 GUI 확인**(아래 목록)이 먼저일 차례.
- **DUNGEON — PLAN.md(saga-dungeon 웹판) 챕터 순 심화, 첫 세 조각
  (2026-09-12, 아홉 번째 세션).** "다음 슬라이스 후보" 목록을 다 끝낸 뒤
  사용자가 "DUNGEON 더 깊이(웹판 PLAN 챕터 순)"으로 방향을 고르고
  "다해줘"로 이어서 진행 — 웹판 PLAN.md 36장(퀘스트)·27장(미니맵)·38장
  (시각 효과) 중 이 판 규모에 맞는 최소 단위만 세 조각 옮겼다.
  - **36장 퀘스트 시스템**(신규 `Data/QuestState.cs`) — 메인 퀘스트
    한 줄만(지역·랜덤·이벤트 퀘스트는 다음 슬라이스, NPC 발주자 자체가
    없다). 두목 처치→미니보스 처치→구출 3단계, 두목·미니보스는 기존
    `BestiaryState`(도감 슬라이스가 이미 처치 시 이름을 기록해 둔다)를
    그대로 재사용해 판정(`DungeonEnemy.cs`를 안 건드리고 완료 감지) —
    구출은 몬스터가 아니라 폴링으로 못 잡아 `DungeonCaptive.cs`가
    `QuestState.MarkCaptiveFreed()`를 직접 부르게 한 줄 추가. 완료마다
    토스트(경험치+25·돈+10)·`PlayerHud`에 현재 목표 상시 표시·
    `SaveState` v3(`questStage`). **처음엔 순서를 벗어나 끝내면
    (예: 미니보스보다 구출을 먼저) 그 완료가 조용히 무시되는 결함이
    있었는데, 같은 세션 안에서 바로 재설계로 고쳤다** — 세 목표를
    독립 플래그(`bossDead`/`minibossDead`/`captiveFreed`)로 바꿔 순서
    무관하게 즉시 인정되게 했다(`SaveState` v3→v4, 커밋 `57b69a6`).
  - **27장 미니맵**(신규 `UI/Minimap.cs`) — 던전이 Room1→Corridor→
    Room2→...→Room4로 이어지는 한 줄짜리 통로뿐이라(오픈월드/필드·방
    종류 마지막 슬라이스 참고, PLAN.md 28장급 오버월드 지도는 범위
    밖) 렌더텍스처용 카메라를 새로 두지 않고 **좌표를 UI 사각형에 직접
    투영하는 개략도**로 가장 작게 만들었다(모바일 성능 우선, PLAN.md
    18장). 방 넷 중심을 정적 점(바이옴과 같은 색조)으로, 플레이어
    위치만 매 프레임 갱신. `SaveButton`(top-right) 바로 아래 배치.
  - **38장 시각 효과 — damage popup·enemy flash·camera shake**(신규
    `World/DamagePopup.cs`) — slash trail·hit spark·ground effect·
    skill particles는 파티클/셰이더 에셋이 새로 필요해 범위 밖.
    damage popup은 Canvas 없이 `TextMesh`(월드 공간, 카메라를 바라보게
    매 프레임 회전)로 가장 가볍게, 0.6초 상승+페이드 후 자동 소멸(풀링
    없음 — 히트 빈도·수명이 짧아 이 규모에선 부담 적다고 판단, PLAN.md
    38장 "quality scaling" 요구는 팝업이 늘면 재검토). `DungeonEnemy
    .TakeDamage()`에 `heavy` 플래그(기본값 false로 기존 호출부 안
    깨짐) 추가 — 맞을 때마다 팝업 + `CharacterVisual.Tint()`로 흰 섬광
    0.08초 후 원래 `bodyColor`로 복귀(`ClearTint()`가 아니라 — 두목·
    정예처럼 원래 색이 있는 개체는 `ClearTint()`가 그 색까지 지운다,
    한 번 밟을 뻔한 함정을 코드 작성 중에 미리 피함). `CameraRig
    .Shake(magnitude, duration)` 신규 — `PlayerCombat`이 평타(0.05m/
    0.08초)·강공격(0.12m/0.15초, 강공격 팝업과 같은 주황으로 구분)
    적중마다 부른다.
  - 세 조각 전부 컴파일(오류 없음)·씬 재빌드(`room childCount=14`
    그대로 — 셋 다 GameObject 계층을 새로 늘리는 변경이 아니라 기존
    오브젝트에 컴포넌트·필드만 추가)·PlaytestDungeonHeadless(`OK - 10
    frames, no errors`) 통과, 커밋 둘로 나눠 그때그때 푸시(`23462e0`
    퀘스트+미니맵, `3d49468` 타격감) — **셋 다 사람이 GUI로 아직 확인
    안 함**(퀘스트 목표 문구 전환·미니맵 점 이동·섬광/팝업/흔들림 자연
    스러움 전부 헤드리스 검증 밖, 아래 GUI 확인 목록에 추가).
- **DUNGEON 다음 슬라이스 후보 — 방 셸 GLB (2026-09-12, 여덟 번째
  세션).** 회피 애니메이션·이펙트 다음으로 이어서 — "환경/건물 GLB"
  슬라이스가 "비율이 안 맞아 이번엔 보류"로 미뤄 뒀던 room-small.glb
  (방 셸, 실측 12×4.4×12)를 마저 썼다. **핵심 아이디어 — 비균등 스케일
  대신 "방을 셸 원본의 정사각(12×12) 비율에 맞추는 균일 스케일"로
  풀었다.** 기존 폭(RoomWidth=20)을 그대로 지키려는 배율은 20/12=5/3인데,
  셸이 정사각이라 같은 배율을 깊이에도 그대로 적용하면 왜곡 없이 20이
  나온다 — `DungeonRoomBuilder.RoomDepth`를 14→20으로 올린 이유(폭은
  안 바뀜, 기존 스폰 좌표는 전부 X 기준이라 **단 하나도 안 옮겼다** —
  깊이만 넉넉해졌다).
  - `gate.glb`도 같은 배율(5/3)로 맞춰 문 폭이 4.4×5/3≈7.33으로
    넓어졌다 — 예전엔 X만 좁히는 비균등 스케일이었는데 셸과 짝을
    맞추며 균일 스케일로 개선됨(부작용, 원래 목표는 아니었음).
  - `corridor.glb`는 반대로 **`DungeonCorridorBuilder.DoorWidth`를
    3→4.0(corridor.glb 실측 폭)으로 올려 스케일을 아예 없앴다**(1,1,1)
    — 이제 프로젝트 안 GLB 셋(캐릭터·복도·방 셸) 중 유일하게 완전
    무왜곡. 문 폭(7.33)이 복도 폭(4.0)보다 넓어 문턱에 살짝 좁아지는
    단이 생기는데, saga-godot도 `gate.glb`(4.4)·`corridor.glb`(4.0)
    사이에 같은 종류 차이를 두고 문서화해 둔 트레이드오프라 그대로
    받아들임.
  - Room2/3/4/복도 중심 z좌표를 새 halfD(10, 예전 7)에 맞춰 다시
    계산(`BuildTestDungeonScene.cs` 주석 참고) — CorridorCenter 12→15,
    Room2Center 24→30, Corridor2Center 36→45, Room3Center 48→60,
    Corridor3Center 60→75, Room4Center 72→90. 각 방 안의 개별 콘텐츠
    (적·상자·행상·소품 등)는 전부 `RoomXCenter + 오프셋` 형태라 **좌표를
    하나도 손대지 않고 자동으로 따라감**.
  - `DungeonRoomBuilder.cs`에 `roomModel`/`RoomScale` 추가 — 채워져
    있으면 셸을 세우고 기존 primitive Floor/Wall(문 갈라진 뒤 조각
    포함)은 렌더러만 꺼서 안 보이는 충돌체로 남김(`corridorModel`과
    같은 결). 색은 `CharacterVisual.Tint()` 재사용, 바이옴 톤 그대로.
  - **한 번 밟은 실수** — `RoomGlbPath` 상수·`SetPrivateField` 배선은
    다 해 놓고 정작 `room-small.glb` 파일 자체를 saga-godot에서 복사해
    오는 걸 깜빡했다(corridor.glb·gate.glb는 지난 슬라이스에서 이미
    복사해 뒀던 걸 착각). 씬 재빌드 로그의 "corridor.glb/gate.glb/
    room-small.glb 중 일부를 못 찾음" 경고로 바로 잡음 — 파일 복사 후
    재임포트·재빌드로 해결.
  - **확인 안 된 가정** — room-small.glb의 실제 문 구멍 폭이 gate.glb
    (4.4)와 같다는 것은 메시를 직접 열어 본 게 아니라 saga-godot
    `test_room.gd`의 `GATE_HALF_WIDTH` 계산 구조에서 역으로 추론한
    값이다. 셸의 시각적 문 구멍과 콜라이더 문 폭이 실제로 겹치는지는
    사람이 직접 걸어서 확인해야 함.
  - 컴파일(오류 없음)·씬 재빌드(`room childCount` 13→14, Room1에
    Shell 하나 추가)·PlaytestDungeonHeadless(`OK - 10 frames, no
    errors`) 전부 통과 — **방 넷이 실제로 돌 벽으로 보이는지, 문
    구멍이 콜라이더 문 폭과 시각적으로 맞는지(위 "확인 안 된 가정"),
    깊어진 방이 휑해 보이지 않는지, 문턱의 폭 차이(7.33→4.0)가 자연
    스러운지는 사람이 직접 봐야 확인됨** — 아래 GUI 확인 목록에 추가.
- **DUNGEON 다음 슬라이스 후보 — 회피 애니메이션·이펙트 (2026-09-12,
  일곱 번째 세션).** 환경/건물 GLB 다음으로 이어서 — 이 프로젝트엔
  Animator/스켈레톤 애니메이션 재생 파이프라인이 아직 전혀 없어서
  (saga-godot `assets/characters/*`엔 AnimationPlayer가 딸려 있어도
  Unity 쪽은 `CharacterVisual.Spawn()`으로 정적으로 세울 뿐 재생 안 함,
  그 파이프라인을 새로 놓는 건 이 조각 하나 몫을 훨씬 넘는 일) —
  `BanditEncounter.cs`가 이미 쓰는 절차적 연출(Tint·Coroutine 스케일
  펄스)과 같은 결로 `Player/PlayerController.cs`에 세 가지를 코드로
  직접 만들었다.
  - **회전 애니메이션** — 회피 대시(0.16초) 동안 `visual`을 회피 방향
    으로 향하게 한 뒤 로컬 X축으로 정확히 360도 굴린다(구르는 동작).
    한 바퀴 그대로라 대시가 끝나면(progress=1→각도 360도=0도) **별도
    복구 코드 없이 저절로 다시 똑바로 선다** — 우연이 아니라 그래서
    360도를 고른 것.
  - **잔상 이펙트** — `TrailRenderer`를 플레이어 루트(`transform`,
    구르는 `visual`이 아니라 — 안 그러면 회전에 잔상 폭이 같이 뒤틀림)
    에 붙여 대시 중에만 `emitting=true`. 새 셰이더 없이 어디서나 되는
    `Sprites/Default`(alpha-blended unlit)를 재사용, 대시(0.16초)보다
    살짝 긴 페이드(0.25초)로 잔상이 자연스럽게 흐려짐.
  - **무적 틴트** — `CharacterVisual.Tint()`(캐릭터 GLB 슬라이스가 만든
    `_BaseColor` MaterialPropertyBlock 유틸, 새 유틸 없이 재사용)로
    무적 시간(0.22초, 대시 0.16초보다 김) 내내 옅은 하늘색으로 덮어써
    "지금 안 맞는다"를 눈으로 알 수 있게 함, 무적이 끝나면 `ClearTint()`
    로 원래 텍스처 복구.
  - 컴파일(오류 없음)·씬 재빌드(`room childCount=13` 그대로 — GameObject
    구성을 하나도 안 건드린 변경, `PlayerController.cs`에 컴포넌트
    로직만 추가)·PlaytestDungeonHeadless(`OK - 10 frames, no errors`,
    다만 **플레이어가 안 움직여 회피 자체가 이번에도 발동 안 함** —
    컴파일·정적 로드까지만 확인됨) 전부 통과 — **회피가 실제로 도는지
    (구르는 회전이 자연스러운지, 잔상이 방향에 맞게 남는지, 무적 색이
    과하거나 밋밋하지 않은지, 대시 끝나고 똑바로 서는지)는 사람이 직접
    가 봐야 확인됨** — 아래 GUI 확인 목록에 추가.
- **DUNGEON 다음 슬라이스 후보 — 환경/건물 GLB (2026-09-12, 여섯 번째
  세션).** 바이옴 5종 다음으로 이어서 — SagaGo가 이미 쓰는 CC0 Kenney
  Modular Cave Kit(`gate-rock.glb`와 같은 킷)에서 `corridor.glb`·
  `gate.glb`만 마저 뽑아 `saga-godot/assets/dungeon/`에서 복사(새
  다운로드 없음, 자세한 실측·스케일 근거는 `docs/ASSET_GUIDE.md` "DUNGEON
  환경/건물 GLB" 절 참고).
  - **복도 셋**(Corridor·Corridor2·Corridor3) — `corridor.glb`(실측
    4.0×4.05×4.0) 두 장을 이어 붙인다. `Length`(8)가 타일 깊이(4.0)의
    정확히 2배라 **Z축은 전혀 안 늘어난다** — X만 DoorWidth(3)/4.0=0.75로
    살짝 좁힘. 색은 새 유틸 없이 `CharacterVisual.Tint()`(캐릭터 GLB
    슬라이스가 만든 `_BaseColor` MaterialPropertyBlock)를 재사용해
    폐허 톤으로 물들임.
  - **방 넷의 문 6곳**(Room1 북 1 + Room2 남북 2 + Room3 남북 2 + Room4
    남 1) — `gate.glb`(실측 4.4×4.4×1.4) 아치를 문 폭(3m)에 맞춰
    X만 0.682로 줄여 세움("아치는 앞뒤 대칭"이라 방향 안 따짐, saga-godot
    `test_room.gd` 주석과 같은 근거). 실제로 지나다니는 자리라 콜라이더
    없음.
  - **room-small.glb(방 셸, 12×4.4×12)는 이번 슬라이스에서 안 씀** —
    DUNGEON 방 치수(20×14×4)와 비율이 많이 달라(X 1.667배·Z 1.167배·
    Y 0.909배로 축마다 제각각) 비균등 스케일 시 벽 질감이 뚜렷하게
    뒤틀릴 걸로 보임. saga-godot `test_room.gd`는 방 치수를 GLB 원본
    (12×12, 스케일 없음)에 맞추는 쪽으로 풀었는데, Unity 쪽은 이미 있는
    방 넷의 모든 스폰 좌표(적·상자·행상·소품 등)를 전부 다시 잡아야 하는
    파급 큰 재설계라 다음 슬라이스로 미룸.
  - GLB 자체엔 콜라이더가 없어(saga-godot `test_room.gd` 주석과 같은
    이유) 기존 primitive Floor/Wall은 그대로 두고 `MeshRenderer.enabled
    = false`로 안 보이는 충돌체로만 남김(에셋이 없는 PC에서는 예전처럼
    보이는 색상 그대로 — 씬이 안 깨짐).
  - **한 번 밟은 버그 없음** — 바이옴 슬라이스에서 이미 `DestroyImmediate`
    교훈을 얻어 이번엔 처음부터 안 밟음(콜라이더를 아예 안 지우고
    렌더러만 끄는 방식이라 애초에 Destroy 호출 자체가 없음).
  - 컴파일(오류 없음)·씬 재빌드(`BuildTestDungeonScene.Build`, **`room
    childCount`가 12→13**으로 늘었다 — Room1 북쪽 문에 gate 아치 하나가
    새로 생겨서, GLB 못 찾음 경고 없이 두 파일 다 로드됨 확인)·
    PlaytestDungeonHeadless(`OK - 10 frames, no errors`) 전부 통과 —
    **복도 타일이 실제로 이어져 보이는지(이음매), 문 아치가 문 폭에
    자연스럽게 맞는지, 폐허 톤 틴트가 과하거나 밋밋하지 않은지는 사람이
    직접 봐야 확인됨** — 아래 GUI 확인 목록에 추가.
- **DUNGEON 다음 슬라이스 후보 — 바이옴 5종 (2026-09-12, 다섯 번째
  세션).** 세공·행상 재고 굴리기·도감 다음으로 이어서 — saga-dungeon
  웹판 `js/field3d.js`의 `THEME_BIAS`(다섯 성격: `town:forest`·
  `town:ruins`·`town:swamp`·`town:mountain`·`town:shrine`)를 옮겼다.
  그 표는 절차 생성 마을의 **소품 배치 가중치**일 뿐 색 수치가 따로
  없어(웹판은 이미 있는 3D 타일셋 재사용) 이 다섯 성격을 구분하는 바닥/
  벽 색과 방 구석 소품은 새로 잡았다(신규 `World/SagaBiome.cs` enum).
  - `DungeonRoomBuilder.cs`에 `biome`/`decorOffset` 필드 추가 —
    `SagaBiome.None`(기본값)이면 예전 색 그대로(회귀 없음). `BuildDecor()`
    가 방 구석에 성격을 드러내는 소품 클러스터를 놓는다(primitive뿐 —
    Unity 기본 도형엔 원뿔이 없어 나무는 원기둥(줄기)+구(수관)로 대신).
    `DungeonCorridorBuilder.cs`는 바닥/벽 색만(좁은 통로엔 소품 안 둠 —
    길 막힘 방지).
  - 방 안 콘텐츠와 어울리게 배정: **Room1**(황건적 소굴)=숲(웹판
    THEME_BIAS `산채(山寨)`가 forest 1.8 가중치인 것과 같은 결) — 나무
    셋, **Room2**(오픈월드/필드)=늪 — 물웅덩이+갈대 셋, **Room3**(정예·
    미니보스·채광방)=산 — 바위 셋, **Room4**(퍼즐 제단·구출, 막다른 방)=
    사당 — 석등(단청 붉은 지붕+따뜻한 점광원). **복도 셋 전부**=폐허
    (다섯 성격 중 방 넷에 못 들어간 나머지 하나, 색만). 소품 위치는
    각 방의 기존 콘텐츠(적·상자·행상·광맥 등)와 안 겹치는 빈 구석을
    방마다 좌표로 확인해 잡음(`BuildTestDungeonScene.cs` 주석에 근거).
  - **한 번 밟은 버그** — `BuildDecor()`가 소품 콜라이더를 `Object.
    Destroy()`로 지웠더니 "Destroy may not be called from edit mode!"
    (씬 조립이 에디터 스크립트에서 도는 edit mode라, `DungeonTrove.cs`
    등 기존 코드는 **런타임**(Awake, Play 모드)에서 지워서 문제가 없었던
    것과 다름) — `Object.DestroyImmediate()`로 고침(`OpenDoorOnWall()`이
    이미 쓰던 것과 같은 패턴, 처음부터 그렇게 짰어야 했다).
  - 컴파일(오류 없음)·씬 재빌드(`BuildTestDungeonScene.Build`, **`room
    childCount`가 6→12로 늘었다** — Room1에 소품(나무 셋×2메시=6개)이
    새로 생겨서, 앞으로 이 값이 기준선)·PlaytestDungeonHeadless(`OK -
    10 frames, no errors`) 전부 통과 — **다섯 구역이 실제로 색조로
    구별되는지, 소품이 기존 콘텐츠를 가리거나 겹치지 않는지, 사당의
    점광원이 과하거나 부족하지 않은지는 사람이 직접 봐야 확인됨** —
    아래 GUI 확인 목록에 추가.
- **DUNGEON 다음 슬라이스 후보 — 세공·행상 재고 굴리기·도감 (2026-09-12,
  네 번째 세션, 토큰 소진으로 중단됐다 이어서 마무리).** 방 종류 마지막
  다음으로 이어서 — 남은 후보 중 이 한 묶음을 골라 세 조각을 함께
  끝냈다.
  - **세공**(신규 `Data/GemData.cs`) — `js/data-gem.js`의 절차적 세공
    (구멍 수·등급별 옵션 룰렛)은 범위 밖이라 `ItemData.cs`와 같은 결로
    고정 3종만: 벽옥(gem_jade, atk+4, 광맥 확정 드랍)·남주(gem_sapphire,
    atk+8, 신규 Room3 행상 판매)·홍옥(gem_ruby, atk+14, 미니보스 확정
    드랍). 무기 소켓 하나뿐(둘째 소켓·세트 효과 없음) —
    `HeroState.SocketedGemId`+`SocketIfBetter()`(`EquipIfBetter()`와
    같은 "더 센 것만" 규칙)로 `Atk` 계산에 더해진다. `DungeonVein.cs`가
    원래 세공 시스템 부재로 돈 지급으로 단순화했던 걸 **원래 의도(보석
    지급)로 되돌렸다**, `DungeonEnemy.Die()`도 `rewardGemId`가 채워진
    적(미니보스)만 보석을 준다.
  - **행상 재고 굴리기**(`World/DungeonMerchant.cs` 확장 + `Editor/
    BuildTestDungeonScene.cs`의 `BuildGemMerchant()` 신규) —
    `rollMerchantStock()`의 절차적 티어 룰렛은 여전히 범위 밖(이 프로젝트
    "테스트 씬은 전부 고정 좌표" 결정성 원칙과 `Math.random()`이
    상충한다)이라, **"행상마다 파는 게 다르다"는 핵심만** 인스턴스별
    고정값으로 살렸다 — 기존 `SellItemId`/`Price` const를
    `[SerializeField]` 필드(`sellItemId`/`price`/신규 `sellGemId`)로
    바꿔 Room2 행상(무기, 기존 동작 그대로)과 새 Room3 행상(보석
    남주, 50냥 — wp_saber(45)보다 비싸게, 무기를 대체 안 하고 위에
    더해지는 값이라서)이 서로 다른 재고를 팔게 했다.
  - **도감**(신규 `Data/BestiaryState.cs`) — 웹판 PLAN 34절의 완전한
    포획·펫 장착 시스템(saga-go와 공유하는 PD 도감)은 범위 밖(DUNGEON엔
    아직 펫 장착 자체가 없음)이라 "만난 몬스터 종류를 기록한다"는 핵심만
    — `DungeonEnemy.Die()`가 처치마다 `displayName`을 기록하고, 처음
    보는 이름이면 토스트에 "📖 도감에 처음 기록됨"을 덧붙인다(새 UI
    화면 없음 — `DungeonTrove.cs`·`DungeonShrine.cs`가 이미 쓴 "화면
    대신 토스트" 원칙과 같은 결).
  - `SaveState.cs` v1→v2 — `gemId`·`discovered`(도감 스냅샷) 필드 추가,
    구 v1 세이브는 JsonUtility가 그냥 기본값(null/빈 배열)으로 채워
    그대로 로드된다(PLAN.md 75장 Data Versioning).
  - 컴파일(`-batchmode -nographics -quit`, 오류 없음)·씬 재빌드
    (`BuildTestDungeonScene.Build`, `room childCount=6` 그대로 — Room3에
    GameObject가 늘었지만 그 카운트는 Room1 것이라 안 바뀜)·
    PlaytestDungeonHeadless(`OK - 10 frames, no errors`) 전부 통과 —
    **Room3 신규 행상이 실제로 남주를 파는지, 미니보스가 홍옥을 떨구는지,
    광맥이 벽옥을 주는지, 도감 토스트가 실제로 뜨는지는 사람이 직접
    가 봐야 확인됨** — 아래 GUI 확인 목록에 추가.
- **DUNGEON 다음 슬라이스 후보 — 방 종류 마지막 (2026-09-12, 세 번째
  세션 "1,2 순서대로" 중 첫 조각).** GLB 자산 도입 다음으로 이어서(새
  세션, "이어해") — saga-dungeon 웹판의 남은 room kind 여섯 종
  (elite·miniboss·cave·puzzle·event·forage, js/dungeon.js:318 목록)을
  전부 옮겼다. Room2 북쪽에 복도로 **Room3**(정예 소굴+미니보스+
  채광방), 그 북쪽에 다시 복도로 **Room4**(구출+퍼즐+채집, 막다른 방)를
  이었다 — 좌표는 "오픈월드/필드" 슬라이스가 쓴 것과 같은 공식(halfD=7·
  벽두께=1·복도길이=8)을 그대로 이어감.
  - **정예 소굴**(js/dungeon.js:342-347) — 정예 하나(ELITES 표의
    'fierce' 배율 hp×1.35·dmg×1.9만 고정으로 적용, 나머지 7종 접사·
    절차적 룰렛은 범위 밖) + 잡졸 둘. 새 스크립트 없이 `DungeonEnemy`의
    기존 [SerializeField]만 재구성(두목 때와 같은 패턴) — HP=32·
    공격력=10·확정 드랍 "환도"(wp_saber, 행상이 파는 것과 같은 아이템
    재사용), 색은 ELITES 'fierce'의 실제 헥스(#e06565)를 그대로 옮김.
  - **미니보스**(js/dungeon.js:348-352) — 부하 없이 혼자, 두목과 같은
    노획 흐름(`isBoss=true`)을 그대로 재사용(웹판도 `kill()`이 `e.boss`
    만 보고 이미 보스급 노획을 준다 — 미니보스도 동률). 덩치(1.3배,
    2.6m)·색(자보라)만 두목(1.6배·짙은 적갈)과 다르게 잡아 구분.
  - **채광방**(js/dungeon.js:353-358, 신규 `World/DungeonVein.cs`) —
    세공 재료 확정 2개(웹판)가 세공 시스템 자체 부재로 범위 밖이라
    `DungeonShrine.cs`와 같은 단순화(경험치+돈)로 대신함, 웹판 주석
    "우물 회복량 40%만큼 후하게"를 따라 트로브(24골드)보다 후한 36골드로
    잡음. `DungeonTrove.cs`처럼 `CountAliveInRoom(roomId)==0`으로 방
    클리어를 판정.
  - **퍼즐방**(js/dungeon.js:366-382, `touchPuzzlePod()` js/dungeon.js:
    820-840, 신규 `World/DungeonPuzzle.cs`) — 제단 셋을 맞는 순서로
    밟는다, 틀리면 처음부터. 웹판은 방마다 순서를 무작위로 섞는데, 이
    프로젝트 테스트 씬은 전부 고정 좌표라(루트 CLAUDE.md "검증 습관")
    순서를 결정적으로 고정(`Order = {1,2,0}`). 유일하게 `room.cleared`를
    안 보는 POI(웹판도 안 봄 — 몸이 아니라 머리로 푸는 방). 다 풀면
    돈+20·"환도" 확정 지급.
  - **이벤트방(구출)**(js/dungeon.js:383-393, 2203-2221, 신규
    `World/DungeonCaptive.cs`) — 지키는 잡졸 둘을 다 잡아야 풀려난다.
    웹판은 은사(boon)를 고르지 않고 바로 하나 얹는데, 은사 시스템 자체가
    범위 밖(`DungeonShrine.cs`가 이미 같은 이유로 뺐다)이라 그 자리를
    경험치 지급으로 대신(성소 30보다 가볍게 15로 잡음 — "받은 은혜"가
    정식 가호보다 가볍다는 뜻), 노획물(dropItem·dropGold quality 16/2)은
    돈 16으로 환산(잡졸 보상 8 × quality 2배율, 트로브·성소가 이미 쓴
    환산과 같은 결).
  - **채집·낚시방**(js/dungeon.js:394-412, 2223-2243, 신규
    `World/DungeonForage.cs`) — 약초 셋(방 안 치워도 닿으면, 항아리와
    같은 손짓)은 웹판이 인벤 아이템(단약)을 주는 대신 인벤토리 시스템이
    없어 `DungeonWell.cs`와 같은 결로 체력 소량 회복(+6, 셋 다 캐면
    +18)으로 대신. 못(방 다 치운 뒤 한 번, 우물·사당과 같은 손짓)은
    웹판의 확률 노획(금/재료/아이템)도 인벤 없이는 못 옮겨
    `DungeonVein.cs`와 같은 단순화(확정 경험치+돈)로 갈람.
  - 새 Room3·Room4는 각각 `DungeonRoomBuilder.OpenSouthDoor`+
    `OpenNorthDoor`(Room3, 양쪽 다 문)·`OpenSouthDoor`만(Room4, 막다른
    방)으로 뚫었다 — 기존 문 API를 그대로 재사용, 새 빌더 로직 없음.
  - 컴파일(`Unity.exe -batchmode -nographics -quit`, 오류 없음)·씬
    재빌드(`Saga.EditorTools.BuildTestDungeonScene.Build`, `room
    childCount=6` 그대로 — Room1은 안 바뀜)·PlaytestDungeonHeadless
    (`OK - 10 frames, no errors`, **주의 — `-executeMethod`로 이 메서드를
    부를 땐 `-quit`을 같이 주면 안 된다**, 파일 자체 주석에 있던 걸
    이번에 실제로 한 번 잘못 줘서 재확인함) 전부 통과 — **Room3·Room4가
    실제로 복도를 따라 걸어서 닿는지, 정예·미니보스가 실제로 위협적으로
    보이는지, 채광방/퍼즐방/구출/채집이 각각 의도대로 반응하는지는
    사람이 직접 가 봐야 확인됨** — 아래 GUI 확인 목록에 추가.
- **DUNGEON 다음 슬라이스 후보 — GLB 자산 도입 (2026-09-12, 두 번째
  "1,2,3,4" 네 후보 중 마지막).** 부대 시스템 다음으로 이어서(같은
  세션) — 지금까지 플레이어·잡졸·두목·동행이 전부 primitive capsule
  이었던 걸 실제 3D 모델로 바꿨다. **새 GLB를 안 받고 SagaGo가 이미
  쓰는 Kenney "Blocky Characters"(`Assets/Art/Characters/
  character-{a,b,c,d}.glb`)를 그대로 재사용** — PLAN.md 0장·8장이
  이미 트랙 간(saga-godot↔saga-unity) 자산 재사용을 허용해 뒀고, 같은
  saga-unity 안에서 GO↔DUNGEON이 코드가 아니라 에셋 파일만 공유하는
  것도 같은 원칙의 연장(SagaDungeon.asmdef는 여전히 SagaGo를 코드로
  참조하지 않는다 — 에디터 스크립트가 경로로 GLB를 로드해 두 트랙 다
  같은 파일을 각자 인스턴스화할 뿐).
  - 신규 `World/CharacterVisual.cs` — SagaGo `World/CharacterVisual.cs`
    를 그대로 복사(네임스페이스만 변경, 루트 CLAUDE.md "다섯 벌 복사"
    원칙). `SpawnFallbackCapsule()`만 GO 버전과 달리 `targetHeight`를
    인자로 받게 고쳤다 — DUNGEON은 잡졸(2m)·두목(3.2m)·동행(1.7m)처럼
    배역마다 목표 높이가 갈려서다.
  - 배역 배정(모델 4종에 배역 4개, 정확히 나뉨): **a=플레이어**(무색,
    1.8m — CharacterController.height와 맞춤), **b=동행**(청색,
    1.7m), **c=두목**(짙은 적갈, 3.2m — 잡졸과 실루엣도 구분되게 다른
    모델), **d=잡졸+부하+필드 잡졸**(황건색, 2m).
  - `DungeonEnemy.cs`·`AllyFighter.cs`에 `[SerializeField] GameObject
    modelPrefab` 신규 — Awake()가 실제 Play 때도 도는 런타임 코드라
    AssetDatabase를 못 써서(에디터 전용 API), SagaGo NpcBuilder.cs가
    이미 쓴 패턴대로 `BuildTestDungeonScene.cs`가 씬 빌드 시점에 값을
    채워 직렬화해 둔다. null이면(다른 PC에 GLB가 아직 없는 경우 등)
    `CharacterVisual.SpawnFallbackCapsule()`로 자동 대체 — 씬 빌드
    자체는 안 깨짐.
  - 기존 primitive capsule엔 안 쓰이던 `CapsuleCollider`가 달려
    있었는데(DUNGEON 코드 전체를 훑어 물리 충돌·트리거를 하나도 안
    쓰는 걸 확인) GLB엔 콜라이더가 없어 그냥 없앴다 — 실제 동작에
    영향 없음(확인된 단순화).
  - 컴파일·씬 재빌드(`room childCount=6` 그대로, 캐릭터는 Room의
    자식이 아니라 안 바뀜)·PlaytestDungeonHeadless(`OK - 10 frames,
    no errors`, character-{a,b,c,d}.glb 넷 다 못 찾음 경고 없이 로드됨)
    전부 통과 — **실제로 캐릭터가 화면에 제대로 보이는지(텍스처·비율),
    두목의 3.2m 스케일이 과하게 크지 않은지, 네 배역이 색조로
    구별되는지는 사람이 직접 봐야 확인됨** — GO 세션이 이미 남긴
    주의사항과 같음("GLB 모델의 정면이 Unity +Z와 맞는지 확신 없음").
- **DUNGEON 다음 슬라이스 후보 — 부대(다중 영웅) 시스템 최소 단위
  (2026-09-12, 두 번째 "1,2,3,4" 네 후보 중 세 번째).** 방 종류
  나머지 다음으로 이어서(같은 세션) — 웹판 `js/hero.js`의
  `partyPower()`(동행 전원의 might*0.7+wisdom*0.3=atk 합산)는 등용·
  성장·장비까지 갖춘 완전한 부대 시스템을 요구해 이번 슬라이스 범위
  밖(VERTICAL_SLICE_DUNGEON.md "제외", `HeroState.cs`도 같은 이유로
  단일 캐릭터로 남아 있음)이라 **"혼자가 아니라 여럿이 함께 싸운다"는
  핵심 가치만** 가장 작은 단위로 보여줬다. 신규 `World/AllyFighter.cs` —
  등용 절차 없이 처음부터 플레이어 옆(스폰+1.5m)에 있는 동행 하나가
  스스로 근처(8m 안) 몬스터를 찾아 다가가 싸운다(공식은 `partyPower()`
  그대로: might=24·wisdom=12·command=18인 가상의 "동행 무사" 기준
  atk=24×0.7+12×0.3=20.4, 한 타 피해는 기존 `atkOf()` 공식 재사용).
  **체력·죽음 처리는 없다**(안 죽는다) — 이번 슬라이스는 화력이
  늘어난다는 것만 증명하고, 동행의 생존·이탈·재등용은 다음 슬라이스
  몫. `DungeonEnemy.Die()`는 누가 마지막 타격을 넣었는지 안 가려
  플레이어(`HeroState`)가 그대로 경험치·돈·아이템을 받는다(바꾸지
  않음). 컴파일·씬 재빌드(`room childCount=6` 그대로)·
  PlaytestDungeonHeadless(`OK - 10 frames, no errors`) 전부 통과 —
  **동행이 실제로 플레이어를 따라다니는지, 몬스터를 발견하면 알아서
  다가가 싸우는지, 여럿에게 둘러싸였을 때 화력 증가가 체감되는지는
  사람이 직접 봐야 확인됨**(헤드리스는 플레이어가 안 움직여 동행이
  몬스터를 발견하는 상황 자체가 검증 밖).
- **DUNGEON 다음 슬라이스 후보 — 방 종류 나머지(행상) (2026-09-12,
  두 번째 "1,2,3,4" 네 후보 중 두 번째).** 스킬 다양화 다음으로
  이어서(같은 세션) — 웹판 `room.merchant`(dungeon.js:359-365,
  2173-2178)를 옮겼다. 절차적 재고 굴리기(`rollMerchantStock`)는
  범위 밖이라 GO `Data/ShopState.cs`의 단순화("고정 물건 하나를 돈이
  있으면 산다")를 재사용 — 신규 `World/DungeonMerchant.cs`, Room2에서
  잡졸 둘을 잡아야 열리고 45냥에 신규 `ItemData` "환도"(AtkBonus 18,
  wp_axe 12와 wp_glaive 26 사이 중간 티어)를 판다. GO와 달리 **돈이
  모자라면 "다 팔았다" 처리 없이 다시 시도 가능**하게 뒀다(웹판도
  `room.merchant.used`만 보고 돈은 안 깎지만, 이 슬라이스는 GoldState가
  있어 "돈 있어야 산다" 규칙을 넣음) — 대신 거절마다 매 프레임 토스트가
  안 뜨게 3초 쿨다운을 넣었다.
  - **곁다리로 실제 버그를 하나 고쳤다** — Room2가 생기며 `DungeonTrove
    .cs`/`DungeonShrine.cs`가 "방 클리어"를 판정할 때 쓰던
    `DungeonEnemy.Active.Count`가 **씬 전체 몬스터를 합친 값**이라,
    Room2 잡졸이 살아 있는 동안엔 Room1의 상자·성소가 절대 안 열리는
    잠재 버그가 있었다(오픈월드/필드 슬라이스가 만든 회귀, 아직 사람이
    발견하기 전에 이번에 코드 검토로 잡음). `DungeonEnemy.cs`에
    `roomId`([SerializeField], 기본값 "room1") + `CountAliveInRoom
    (roomId)` 정적 헬퍼를 추가해 상자·성소·행상이 자기 방 몬스터만
    보게 갈랐다 — Room1 스폰은 기본값 그대로 안 건드리고 Room2 스폰
    (필드 잡졸 둘)만 `roomId="room2"`로 덮어씀.
  - 컴파일·씬 재빌드(`room childCount=6` 그대로)·PlaytestDungeonHeadless
    (`OK - 10 frames, no errors`) 전부 통과 — **행상 좌판이 실제로
    구분돼 보이는지, Room2 잡졸을 잡아야만 반응하는지, 돈이 부족할 때
    거절 문구가 스팸 안 되는지, 방금 고친 상자/성소 버그가 실제로도
    풀렸는지(Room2를 안 건드리고 Room1 상자만 먼저 열어도 되는지)는
    사람이 직접 가 봐야 확인됨.**
- **DUNGEON 다음 슬라이스 후보 — 스킬 다양화(강공격) (2026-09-12,
  사용자가 지시한 두 번째 "1,2,3,4" 네 후보 중 첫 번째).** 오픈월드/
  필드 다음으로 이어서(같은 세션) — 웹판 `js/dungeon.js:2509`
  `heavyAttack()`의 실제 상수를 그대로 옮겼다: 쿨다운 1.3초·피해 배율
  2.6배·사거리 1.15배, 회피 중엔(`p.dash || p.dodge`) 못 씀. 넉백
  (HEAVY_KB=26)은 이 슬라이스에 밀치기 물리가 없어 뺐다. `PlayerCombat
  .cs`에 `TryHeavyAttack()` 추가(기존 `TryAttack()`과 같은 결, 쿨다운·
  사거리만 다름) — 회피 중 확인을 위해 `PlayerController.cs`에
  `IsDodging` 프로퍼티 신규 노출. 데스크톱은 Left Alt 직접 읽기(공격의
  Space·회피의 Left Ctrl과 같은 관례), 모바일은 공격 버튼 바로 위에
  새 "강공격" 버튼(주황). 컴파일·씬 재빌드(`room childCount=6` 그대로)·
  PlaytestDungeonHeadless(`OK - 10 frames, no errors`) 전부 통과 —
  **강공격이 실제로 평타보다 훨씬 세게 느껴지는지, 쿨다운 1.3초 동안
  못 쓰는 게 자연스러운지, 회피 중엔 실제로 안 나가는지는 사람이
  직접 눌러 봐야 확인됨.**
- **DUNGEON 다음 슬라이스 후보 — 오픈월드/필드 (2026-09-12, 사용자가
  지시한 "1,2,3,4" 네 후보 중 마지막).** 회피 다음으로 이어서(같은
  세션) — 방 하나짜리 구조를 벗어나는 **가장 작은 단위**만 짰다(웹판
  전체 필드/바이옴 5종을 옮기는 건 파급이 큰 작업이라 범위 밖 유지,
  VERTICAL_SLICE_DUNGEON.md "다음 슬라이스 후보" 참고). `DungeonRoomBuilder
  .cs`에 `OpenNorthDoor()`/`OpenSouthDoor()` 신규 — `Build()`가 지은
  완전히 막힌 벽 하나를 문 폭(3m)만큼 갈라 둘로 나눈다(기존 호출부는
  손 안 대 그대로 막힌 방을 받음, 새 메서드를 따로 불러야만 문이
  뚫림). 신규 `World/DungeonCorridorBuilder.cs`(`DungeonRoomBuilder.cs`와
  같은 결 — primitive, Awake 방어, MarkStatic)로 두 방을 8m 복도로
  이었다. 좌표는 기하로 산출(Room1 북쪽 벽 바깥면 z=8 → 복도 8m →
  Room2 남쪽 벽 바깥면 z=16 → Room2 중심 z=24, 복도 중심 z=12) —
  기존 Room1의 몬스터·POI 좌표는 전혀 안 건드림(문은 북쪽에만 뚫려
  기존 동쪽 몬스터 무리·서쪽 POI와 안 겹침). Room2엔 잡졸 둘(기본값
  그대로, "다음 구역에도 콘텐츠가 있다"를 보여주는 최소 단위 — 새
  콘텐츠 종류는 안 늘림, 바이옴·방 kind 다양화는 여전히 범위 밖).
  컴파일·씬 재빌드(`room childCount=5→6`, 북쪽 벽이 둘로 갈라진 만큼
  정확히 +1)·PlaytestDungeonHeadless(`OK - 10 frames, no errors`) 전부
  통과 — **문이 실제로 통과 가능한 폭인지, 복도를 걸어 Room2까지 실제로
  갈 수 있는지, Room2의 잡졸 둘이 정상 동작하는지는 사람이 직접
  걸어가 봐야 확인됨**(헤드리스 플레이어는 안 움직여 문 통과 자체가
  검증 밖).
- **DUNGEON 다음 슬라이스 후보 — 회피(구르기) (2026-09-12).** 방 종류
  다양화 다음으로 이어서(같은 세션, "1,2,3,4 순서대로 다해" 중 3번) —
  웹판 `js/dungeon.js:2510` `doDodge()`의 실제 상수(`DODGE_CD=0.9`·
  `DODGE_SEC=0.16`·`DODGE_INVULN=0.22`, 전부 시간 단위라 변환 없이
  그대로)를 옮겼다. **`DODGE_SPD=520`(px/초)만 물리 거리라** 이미
  `DungeonRoomBuilder.cs`가 쓴 px→m 환산(ROOM_W 560px=20m, 28px/m)을
  그대로 적용해 이동 거리 ≈2.97m→3m으로 잡고, 속도는 `거리÷지속시간`
  으로 역산(≈18.75m/s). `Player/PlayerController.cs`(GO에서 그대로
  복사해 온 파일)에 **DUNGEON 고유 로직으로 처음** 손을 댔다 — 회피 중엔
  일반 이동·회전을 건너뛰고 저장해 둔 방향으로 CharacterController를
  직접 미는 분기 추가, 방향은 현재 입력 방향(없으면 마지막 바라보는
  방향)을 씀(웹판 `p.dirX||p.facing`과 같은 우선순위). 무적은
  `HeroState.Invulnerable`(신규 정적 플래그)로 노출해 `TakeDamage`
  맨 앞에서 막는다 — `DungeonEnemy.cs`는 이 플래그를 몰라도 된다(정적
  클래스 하나만 보면 됨). 데스크톱은 Left Ctrl 직접 읽기(PlayerCombat.cs
  가 이미 쓴 "Attack 액션 대신 Keyboard.current 직접 읽기" 관례를
  그대로 따름 — Move/Sprint 액션과 안 겹치게), 모바일은 공격 버튼
  왼쪽에 새 "회피" 버튼(`BuildDodgeButton`, `BuildAttackButton`과 같은
  결). 컴파일·씬 재빌드(`room childCount=5` 그대로)·
  PlaytestDungeonHeadless(`OK - 10 frames, no errors`) 전부 통과 —
  **회피 중 실제로 3m가량 미끄러지는 느낌인지, 그동안 몬스터 공격이
  실제로 안 박히는지, 쿨다운 0.9초가 손에 잡히는 리듬인지는 사람이
  직접 눌러 봐야 확인됨**(헤드리스는 키 입력을 안 보내 회피 발동 자체가
  검증 밖).
- **DUNGEON 다음 슬라이스 후보 — 방 종류 다양화 (2026-09-12).** 엘리트/
  보스 다음으로 이어서(같은 세션, "1,2,3,4 순서대로 다해" 중 2번) —
  웹판 `room.well`/`room.chest`/`room.shrine`(dungeon.js:336-341,
  2141-2162)을 옮겼다. 웹판은 각각 다른 kind의 방인데 이 슬라이스는
  방이 하나뿐이라 **세 POI를 한 방 안에 같이** 뒀다(몬스터 무리·보스는
  동쪽 x=3~9, 세 POI는 서쪽 플레이어 스폰 주변에 흩어 안 겹침). 신규
  `World/DungeonWell.cs`(체력 40% 회복, 웹판처럼 방 클리어 불문 — 원통
  primitive, 청록)·`DungeonTrove.cs`(돈 +24 = 잡졸 보상 8 × 웹판
  dropGold 배율 3 — 정육면체, 갈색)·`DungeonShrine.cs`(경험치+30·돈+20 —
  웹판의 `shrineBoon()` 선택 UI 대신 GO `MountainShrine.cs`가 이미 쓴
  단순화를 재사용, 고를 은사가 하나뿐이라 화면 불필요 — 원통, 보라).
  트로브·성소는 웹판 `room.cleared`를 `DungeonEnemy.Active.Count == 0`
  (씬에 살아있는 몬스터가 하나도 없음)으로 대체 — 방이 하나라 이 둘이
  동치. `HeroState.cs`에 `HealBy(int)` 신규(기존엔 `FullHeal()`만 있어
  일부 회복 API가 없었음). 절차적 아이템 드랍(웹판 트로브의 quality 22)·
  광맥·행상·퍼즐 등 나머지 room kind는 이번엔 안 함(세공·희귀도·행상
  재고 굴리기 등 더 큰 시스템이 필요해 VERTICAL_SLICE_DUNGEON.md
  "제외" 범위 유지). 세 POI 다 SaveState에 진행 상태를 안 남긴다 —
  몬스터와 같은 결(이 슬라이스의 세이브는 플레이어 스탯·위치만 다룸,
  다시 켜면 셋 다 새로 씀). 컴파일·씬 재빌드(`room childCount=5`
  그대로)·PlaytestDungeonHeadless(`OK - 10 frames, no errors`) 전부
  통과 — **세 표지가 실제로 구분돼 보이는지, 우물 회복량·상자/성소가
  몬스터를 다 잡아야만 열리는지는 사람이 직접 가 봐야 확인됨.**
- **DUNGEON 다음 슬라이스 후보 — 엘리트/보스 (2026-09-12).** 몬스터 무리
  다음으로 이어서(같은 세션, 사용자가 남은 네 후보 "1,2,3,4 순서대로
  다해"로 한 번에 지시 — 엘리트/보스→방 종류 다양화→회피→오픈월드/
  필드 순). 웹판 `makeRoom('boss', ...)`(dungeon.js:327-330) 구성을
  그대로 옮겼다 — 두목 1 + 부하 2(floor=1 공식 `min(6, 2+floor(1/5))`
  =2명). **`DungeonEnemy.cs`의 상수(hp·dmg·보상·색상 등)를 전부
  `[SerializeField]`로 바꿔** 두목 변형을 새 클래스 없이 한 컴포넌트로
  같이 받게 했다(GO `Gatherable.cs`와 같은 이유 — 자리마다 값이 다른
  재사용 컴포넌트는 상수로 못 박지 못한다). 두목 수치는 잡졸과 같은
  공식의 boss 배율을 그대로 적용: HP=168(24×7), 공격력=11(round(5×2.2)),
  보상은 dungeon.js의 dropGold boss 배율(5배)을 exp·gold에 재사용해
  경험치 100·돈 40냥, 확정 드랍은 신규 `ItemData` "귀두도"(AtkBonus
  26 — wp_axe(12)에 같은 boss dmg 배율 2.2배를 재사용해 정함, 웹판의
  실제 절차적 보스 희귀도 시스템은 이번 슬라이스 범위 밖). 두목은
  덩치(1.6배 스케일)·색(짙은 적갈, 잡졸의 누런 두건과 구분)으로만
  구별 — AI·사거리·공격 간격은 잡졸과 동일(과설계 방지, 이번 증분의
  본질은 "체력·보상이 큰 정점 하나"). 잡졸 무리(기존 4마리)보다 방
  안쪽(동쪽 벽 가까이, 격자 x=8~9)에 둬 방을 가로질러야 만나는 자리로
  삼음 — 부하 2명은 잡졸과 완전히 같은 기본값(웹판도 boss room 부하는
  일반 spawnEnemy). 컴파일·씬 재빌드(`room childCount=5` 그대로)·
  PlaytestDungeonHeadless(`OK - 10 frames, no errors`) 전부 통과 —
  **두목의 덩치·색이 실제로 위협적으로 보이는지, 168 HP를 실제로 다
  깎는 데 걸리는 시간이 지루하지 않은지는 사람이 직접 싸워 봐야
  확인됨.**
- **DUNGEON 다음 슬라이스 후보 — 몬스터 무리 (2026-09-12).** 지난 세션이
  사람이 TestDungeon을 직접 플레이해 "특별한 문제 없음"으로 확인해 준
  뒤(이번 세션 "이어해"에서 먼저 확인), `docs/VERTICAL_SLICE_DUNGEON.md`
  "다음 슬라이스 후보" 중 사용자가 "몬스터 무리"를 골라 진행. 지금까지
  방 하나에 황건적 한 마리뿐이었는데(웹판은 방 하나에 4~12마리, 첫
  슬라이스가 GO처럼 가장 작은 단위로 시작해 1마리로 줄여 뒀던 것), 웹판
  `js/dungeon.js:333`의 실제 방 생성 공식(`makeRoom('fight', ...)`,
  floor=1 기준 `min(12, 4 + rand(0~3))` = 4~7마리)에서 **무작위 롤 없이
  최소값 4마리를 결정적으로** 써서 늘렸다 — 이 프로젝트 테스트 씬은
  전부 고정 좌표라 무작위를 새로 안 들인다는 기존 관례를 그대로 따름.
  `DungeonEnemy.cs`는 이미 인스턴스 하나가 몬스터 한 마리라 개수 확장에
  로직 변경이 필요 없었다(정적 `Active` 리스트가 이미 여러 마리를
  다룰 수 있게 짜여 있었음) — 주석만 갱신. `BuildTestDungeonScene.cs`의
  `EnemySpawn`(단일 Vector3)을 `EnemySpawns`(배열 4개)로 바꾸고
  `BuildEnemy()`를 루프로 바꿨다 — 방(20m×14m) 안에서 플레이어 스폰
  (-6,0,0) 반대편에 부채꼴로 흩어 서로 안 겹치게 배치. 죽음 페널티가
  이미 없는 슬라이스라(전멸돼도 바로 회복) 몰이 전투 난이도를 따로
  손보지 않았다 — 4마리가 한꺼번에 붙어도 그냥 다시 서면 된다는 기존
  설계를 그대로 신뢰. 컴파일·씬 재빌드(`room childCount=5` 그대로 —
  방 자체는 안 바뀜, 몬스터는 Room의 자식이 아니라 씬 루트)·
  PlaytestDungeonHeadless(`OK - 10 frames, no errors`) 전부 통과 —
  **4마리가 동시에 쫓아와도 실제로 카메라·조작이 안 밀리는지, 여럿에게
  둘러싸였을 때 손맛이 괜찮은지는 사람이 직접 싸워 봐야 확인됨**
  (헤드리스 플레이어는 안 움직여 Chase 전이 자체가 이번에도 검증 밖).
- **PLAN.md 51~65장 "확장 순서" — DUNGEON 착수, 첫 버티컬 슬라이스
  (2026-09-12).** Props 도입 다음으로 이어서(같은 세션, 사용자가 "남은
  후보 진행해줘"에 "1,2번 진행해"로 답해 기획 문서부터 쓰고 곧바로
  구현까지 진행) — GO 다음 게임(사가블로) 착수. saga-godot도 아직 손
  안 댄 첫 시도라 `docs/VERTICAL_SLICE_DUNGEON.md`(신규)를 먼저 써서
  범위를 정했다: **웹판 `saga-dungeon`(오픈월드·바이옴·엘리트/보스·
  세공·행상까지 갖춘 이미 아주 깊은 게임)를 통째로 옮기지 않고, GO의
  첫 슬라이스와 같은 크기로 "방 하나·몬스터 한 마리·실시간 전투·장비
  보상 하나"만 재현했다.** 몬스터 체력·피해량은 웹판 `js/dungeon.js`의
  실제 공식(`enemyHp`/`enemyDmg`, 1층·잡졸·평 난이도)에서 그대로 가져옴
  — HP=24, 공격력=5. **GO의 턴제 선택지 화면과 다르게 실제 이동+거리
  판정 실시간 전투로 짰다** — DUNGEON 정체성 자체가 실시간 액션이라
  GO의 DuelRules.cs 방식을 안 베꼈다(문서의 "왜 GO와 다르게 설계하는가"
  참고). 상세 범위·수치 근거·재사용 표는 그 문서 참고, 여기는 요약만.
  - **새 폴더 `Assets/Games/SagaDungeon/`**(`SagaDungeon.asmdef`,
    `Saga.Dungeon` 루트 네임스페이스) — **SagaGo 코드를 참조하지
    않는다**(루트 CLAUDE.md "다섯 판은 다섯 벌 복사" 원칙을 이 Unity
    트랙에도 적용, SagaCore가 아직 비어 있어 공유할 기반도 없다).
    엔진 무관 로직(`PlayerController.cs`·`CameraRig.cs`·
    `VirtualJoystick.cs`·`DialogueLabel.cs`)은 SagaGo에서 그대로
    복사(네임스페이스만 변경) — `CameraRig`만 기본 피치·줌을 더
    내려다보게 튜닝(GO 35°→DUNGEON 55°, "디아블로 감각").
  - **새로 짠 것**: `Data/HeroState.cs`(단일 캐릭터 체력·레벨·경험치·
    돈·장비 — GO처럼 PartyState/PlayerStats/Inventory로 안 쪼갬,
    DUNGEON엔 부대가 없다) + `Data/ItemData.cs`(무기 2종) +
    `Data/SaveState.cs`(별도 파일 `save_dungeon.json` — GO의
    `save.json`과 안 겹침) + `World/DungeonRoomBuilder.cs`(20×14m
    방 하나, primitive) + `World/DungeonEnemy.cs`(Idle→Chase→Attack
    실시간 AI, 죽으면 경험치·돈·무기 확정 드랍) +
    `Player/PlayerCombat.cs`(스페이스바 또는 화면 "공격" 버튼).
  - **`PlayerCombat.cs`는 프로젝트 기본 InputActions의 "Attack"
    액션을 일부러 안 썼다** — 그 액션이 마우스 왼쪽 버튼에도 물려
    있어 `CameraRig.cs`의 드래그 판정(마우스 왼쪽 버튼을 직접 읽음)과
    같은 프레임에 겹칠 수 있어서다. 대신 `Keyboard.current`로 스페이스
    바를 직접 읽고, 모바일은 화면 버튼이 `TriggerAttack()`을 직접
    부른다. **이 우회가 실제로 카메라 조작과 안 겹치는지는 사람이
    확인 전이다**(아래 GUI 확인 목록 참고).
  - `Editor/BuildTestDungeonScene.cs`(신규, `BuildTestVillageScene.cs`
    와 같은 결이지만 훨씬 짧다) + `Editor/PlaytestDungeonHeadless.cs`
    (신규, `PlaytestHeadless.cs`와 같은 결 — 씬 경로만 다름).
  - 컴파일(`SagaDungeon.dll` 정상 생성)·씬 저장(`Assets/Scenes/
    TestDungeon.unity`, room childCount=5 — 바닥+벽 4개와 정확히
    일치)·PlaytestDungeonHeadless(`OK - 10 frames, no errors`) 전부
    통과. **플레이어가 안 움직이는 헤드리스라 몬스터의 Chase/Attack
    상태(AggroRadius=8m, 스폰 거리 11m라 우연히 밖)는 이 검증으론 실제로
    안 도는 걸 확인 못했다** — 사람이 직접 다가가 싸워 봐야
    Idle→Chase→Attack 전이·플레이어 공격·보상까지 전부 확인된다.
- **PLAN.md 8장 "실제 3D 에셋" — Props 도입 (2026-09-12).** 산신당
  재설계 다음으로 이어서(같은 세션, 사용자가 "남은 후보 진행해줘"에
  "2,3,1번 순으로"로 답해 동물 GLB 조사(2번)·Props 대상 정하기(3번)·
  DUNGEON 착수(1번) 순으로 진행 중) — 새 킷을 찾지 않고 이미 쓰는
  Fantasy Town Kit에서 안 받았던 파일 세 개(가로등·시장 좌판·울타리+문)
  만 추가로 받아 기존 콘텐츠 옆에 붙였다: 가로등 2개(마을집 두 채
  사이), 시장 좌판 1개(떠돌이 상인 옆), 울타리 3칸+문 1칸(논밭 소 옆,
  실제로 가두지는 않는 장식). `PropsBuilder.cs`(신규, LandmarksBuilder.cs
  와 같은 결) + `BuildTestVillageScene.cs`에 `BuildProps()` 훅. 자세한
  실측·스케일·좌표 근거는 `docs/ASSET_GUIDE.md` "Props 도입" 절 참고.
  컴파일·씬 재빌드(`groundVerts=6336` 그대로)·PlaytestHeadless(`OK - 10
  frames, no errors`) 전부 통과 — 실제로 세 소품이 자연스러워 보이는지는
  사람이 직접 봐야 확인됨.
  - **덤으로 동물 GLB(사슴·소·흰 늑대)도 조사했지만 도입은 못 했다** —
    Kenney엔 맞는 3D 킷이 없고, Quaternius의 CC0 "Animated Animal Pack"
    (poly.pizza)이 정확히 Cow·Deer·Wolf를 갖췄지만 poly.pizza 계정이나
    Quaternius Discord/Patreon 클레임이 있어야 받을 수 있어(로그인·계정
    생성은 대신 못 함) 자동으로 못 받아 왔다. 로그인 없이 바로 받아지는
    대안 팩은 Cow만 있고 Deer·Wolf가 빠져 있다. 자세한 내용은
    `docs/ASSET_GUIDE.md` "동물 GLB — 조사 결과" 절 참고 — **사용자가
    직접 받아 어딘가에 놔두면 다음 세션이 이어받을 수 있다.**
- **PLAN.md 8장 "실제 3D 에셋" — 산신당 재설계 (2026-09-12).** Awake()
  중복 생성 정리 다음으로 이어서(같은 세션, 사용자가 "산신당 재설계부터
  진행해"로 지목) — 환경/건물 GLB 조각이 "형태가 많이 달라 다음 조각으로
  미룬다"고 남겨 둔 항목을 처리했다. 예전 구조(받침대 박스 5×0.6×5 +
  `pillar-stone.glb` 기둥 4개)를 통째로 걷어내고, saga-godot
  `landmarks_builder.gd`의 `SHRINE_SIZE`(1.04×0.49×0.65)·
  `SHRINE_SCALE`(2.5, 균일)을 그대로 옮겨 **`shrine/altar-stone.glb`
  제단 하나**로 바꿨다(saga-godot도 옛 사당을 이 파일 하나로만 지음 —
  같은 이유로 균일 스케일만 씀, 실제 돌 표면 굴곡이 있는 조각).
  `shrine/altar-stone.glb` + `shrine/Textures/colormap.png`를
  saga-godot에서 그대로 복사해 `Assets/Art/Shrine/`에 신규 도입(다른
  GLB들과 같은 재사용 원칙, PLAN.md 0장). `LandmarksBuilder.cs`에
  `shrineModel` 필드 추가로 `Init()` 시그니처가 5개→6개 인자로 늘어
  `BuildTestVillageScene.cs` 호출부도 같이 고쳤다. GLB가 없을 때의
  폴백도 예전 받침대+기둥 구조 대신 최종 크기(약 2.6×1.23×1.63m) 그대로의
  단일 박스로 바꿨다. 덤으로 `SpawnPillar()`의 `addToRoot` 매개변수가
  (산신당 기둥 호출이 없어지며) 완전히 죽은 코드가 돼 같이 지웠다.
  `MountainShrine.cs`(트리거·보상 로직)는 안 건드림 — 순전히
  `LandmarksBuilder.cs`의 시각 담당 쪽 변경. 컴파일·씬 재빌드
  (`groundVerts=6336` 그대로 — 땅은 안 바뀜)·PlaytestHeadless(`OK - 10
  frames, no errors`) 전부 통과 — **실제로 제단이 자연스러워 보이는지
  (텍스처 이음새, 예전보다 훨씬 작아진 크기감, 숲 사이에서 눈에 띄는지)는
  사람이 직접 봐야 확인됨.**
- **기술부채 정리 — Awake() 중복 생성 방어를 나머지 6곳에 적용
  (2026-09-12).** 캐릭터/환경 GLB 세션이 "다음 작업"에 남겨 둔 항목 —
  `AnimalBuilder.cs`·`HiddenTreasure.cs`·`EastGroveRelic.cs`·
  `LuckyCairn.cs`·`MountainShrine.cs`·`RareWolfEncounter.cs` 여섯 곳을
  훑었다.
  - `AnimalBuilder`·`HiddenTreasure`·`EastGroveRelic`·`LuckyCairn`은
    NpcBuilder.cs와 같은 `if (transform.childCount > 0) return;` 한
    줄로 충분(자식 생성 뒤 별도로 기억해 둬야 할 필드가 없다).
  - `MountainShrine`은 살펴보니 애초에 자식 GameObject를 하나도 안
    만든다(transform·collider 설정만) — Build()가 몇 번 다시 돌아도
    그대로 덮어써질 뿐이라 방어가 필요 없다는 걸 확인하고 주석만 남김
    (방어를 "빠뜨린" 게 아니라 원래 안 필요했던 경우).
  - **`RareWolfEncounter.cs`를 고치다가 `BanditEncounter.cs`에도 같은
    미완결 버그가 있는 걸 발견했다.** 두 컴포넌트 다 이전 세션이
    "Visual 자식이 있으면 Build() 건너뛰고 PulseVisual()이 쓸
    `_visual`/`_visualBaseScale`만 복원"으로 고쳤다고 기록했는데,
    Update()가 실제로 쓰는 `_promptRoot`/`_combatRoot`/`_hpFill` 등
    나머지 UI 필드는 그 복원 목록에 없었다 — 즉 세이브 로드 후 진짜
    Play가 시작될 때(이 프로젝트 구조상 Awake는 그 한 번만 불린다)
    저 필드들은 세션 내내 null로 남고, 도적/흰 늑대에게 실제로 다가가
    Update()의 Idle 분기가 `_promptRoot.SetActive(true)`를 부르는 순간
    NullReferenceException이 났을 것이다(아직 사람이 실제로 걸어가 본
    적이 없어 안 걸렸던 잠재 버그). 두 파일 다 "Visual 자식이 있으면
    복원"이 아니라 **기존 자식을 전부 지우고 Build()를 처음부터 다시
    돌리는 방식**으로 바꿔 모든 필드가 항상 새로 채워지게 했다. 단,
    `EncounterUiKit.NewCanvas()`가 만드는 UI 캔버스는 씬 루트에 생겨(이
    컴포넌트의 자식이 아니다) 이 방식으로는 못 지운다 — 편집기 빌드가
    만들어 둔 옛 캔버스 두 개(비활성 상태)가 고아로 남지만, 새로 만든
    캔버스가 실제 동작을 맡으니 기능엔 지장 없다(감수한 트레이드오프,
    각 파일 Awake() 주석에 남겨 둠).
  - 컴파일·씬 재빌드(`groundVerts=6336` 그대로 — 땅은 안 바뀜)·
    PlaytestHeadless(`OK - 10 frames, no errors`) 전부 통과. **주의—
    헤드리스 플레이어는 안 움직여 도적/늑대 트리거 반경에 실제로 안
    들어간다**, 그래서 이번에 고친 NRE 경로 자체(Update의 Idle 분기)는
    이 자동 검증으로는 직접 재현 못 한다 — 코드 검토로 원인을 확인하고
    고친 것이고, 실제로 다가가도 더 이상 죽지 않는지는 사람이 GUI로
    확인해야 완전히 닫힌다(아래 "다음 작업" GUI 확인 목록에 추가).
- **PLAN.md 8장 "실제 3D 에셋" 둘째 조각 — 환경/건물 GLB 도입 (2026-09-12).**
  캐릭터 GLB 다음으로 이어서(같은 세션, 사용자 "이어서 환경/건물 GLB도
  진행해") — 44~49장 자산 우선순위(Player→주요 Enemy→Boss→Environment→
  Building→...)대로 다음 칸을 채웠다. 자세한 표는 `docs/ASSET_GUIDE.md`
  참고, 여기는 요약만.
  - saga-godot이 이미 받아 둔 Kenney Nature Kit(나무·바위)·Fantasy Town
    Kit(마을집 벽/지붕·폐허 기둥·다리)·Modular Cave Kit(굴 입구)를 그대로
    재사용. saga-godot의 실측표를 신뢰해 재실측 없이 스케일을 그대로
    가져다 썼다(같은 TileSize=48이라 유효) — 도입 후 한 번 재확인만 함
    (100% 일치).
  - `VegetationBuilder.cs` — 예전엔 나무·바위를 정점 단위로 직접 베이크해
    하나의 결합 메시로 묶었는데(draw call 절약 목적), 이번에 진짜 GLB
    개체를 하나씩 인스턴스화하는 방식으로 바꿨다 — 이미 있는
    `GameBootstrap.CombineStaticBatches()`(PLAN.md 76장, static 오브젝트를
    같은 머티리얼끼리 자동으로 묶는 Unity 표준 기능)가 그대로 이 역할을
    대신해 줘서, 손으로 정점을 합칠 필요가 없어졌다(UV·텍스처도 그대로
    산다는 덤). GLB를 못 찾으면 예전 결합 메시 방식 그대로 폴백 —
    두 경로 다 같은 파일 안에 남겨 뒀다.
  - `LandmarksBuilder.cs` — 굴 입구(gate-rock)·마을집 벽(wall-block)·
    지붕(roof-gable)·폐허 기둥 3개(pillar-stone)·다리 널판 44개(planks)
    교체. **산신당('S' 타일)은 이번엔 안 바꿨다** — 기둥 4개만
    pillar-stone으로 바꾸고 받침대는 primitive로 남김(altar-stone.glb는
    지금 구조와 형태가 많이 달라 다시 설계해야 함, ASSET_GUIDE.md 참고).
  - **GLB엔 물리 콜라이더가 없어서**(glTF 포맷 자체가 안 담음) 굴 입구·
    마을집 벽·기둥류는 실측 로컬 AABB 그대로 BoxCollider/CapsuleCollider를
    코드로 직접 얹었다.
  - 두 파일 다 어차피 다시 쓰는 김에 `transform.childCount > 0`이면
    건너뛰는 Awake 중복 생성 방어(캐릭터 GLB 때 발견한 것과 같은 패턴)를
    추가했다.
  - **검증** — 씬 재빌드 후 오브젝트 개수를 지도 데이터에서 직접 셈해
    맞춰 봤다: 숲 'T' 타일 15개×3그루=나무 45그루, 산 '^' 타일 48개×1=
    바위 48개, 다리 44m/1m=널판 44개, 굴 입구 1개·벽 2채·지붕 2채·폐허
    기둥 3개·산신당 기둥 4개 — 전부 씬 파일에서 정확히 일치 확인(추측이
    아니라 실제로 셈). 컴파일·씬 재빌드(`groundVerts=6336` 그대로 — 땅은
    안 바뀜)·PlaytestHeadless(`OK - 10 frames, no errors`, static 배칭
    호출도 에러 없이 통과) 전부 통과. **실제로 화면에서 자연스러워
    보이는지(텍스처 이음새, 다리 널판 사이 틈, 지붕 비례, 바위 크기감)는
    사람이 직접 봐야 확인됨.**
- **PLAN.md 8장 "실제 3D 에셋" 첫 조각 — 캐릭터 GLB 도입 (2026-09-12).**
  소(cow) 다음으로 이어서(같은 세션, 사용자가 "캐릭터 디자인은 아직이지?"
  로 확인 후 "플랜 순서대로 다 진행해"로 지시) — 지금까지 플레이어·NPC·
  산적이 전부 primitive capsule이었던 걸 실제 3D 모델로 바꾼 첫 조각.
  자세한 내용은 신규 `docs/ASSET_GUIDE.md` 참고, 여기는 요약만.
  - Unity 6000.3.23f1엔 GLB 임포터가 기본으로 없다(PLAN.md 8장의 전제가
    틀렸다 — URP Sky/Fog 오판과 같은 종류) — `com.unity.cloud.gltfast`
    패키지를 `manifest.json`에 추가해 해결.
  - saga-godot이 이미 받아 둔 Kenney "Blocky Characters"(CC0)
    character-{a,b,c,d}.glb + 텍스처를 그대로 복사해
    `Assets/Art/Characters/`에 도입(PLAN.md 8장·0장이 트랙 간 재사용을
    이미 허용해 둠). 실측(1.6×2.7×0.8, 바닥 피벗) 후 삭제하는 일회성
    도구 `MeasureCharacterGlb.cs`로 확인.
  - `World/CharacterVisual.cs`(신규, 공용 로직) — 목표 높이에 맞춘 균일
    스케일 + `MaterialPropertyBlock`으로 `_BaseColor` 색조 입히기(공유
    머티리얼은 안 건드림) + GLB를 못 찾을 때의 primitive capsule 폴백.
  - 플레이어=character-a(색조 없음), 촌장=character-b(파랑),
    상인=character-c(갈색), 나그네=character-c 재사용(회색, 킷을 4종만
    받아서 5번째 배역은 모델 재사용), 산적=character-d(어두운 빨강,
    전투 텔레그래프 때 주황으로 덮어씀 — 기존 단일 머티리얼 방식을
    `CharacterVisual.Tint()`로 다중 Renderer 대응으로 바꿈).
  - **런타임 AssetDatabase 제약 발견** — `NpcBuilder.cs`·
    `BanditEncounter.cs`의 `Awake()`는 실제 Play 때도 도는 진짜 런타임
    코드라 `AssetDatabase.LoadAssetAtPath`를 못 쓴다(에디터 전용 API).
    `Gatherable.cs`가 이미 쓰던 패턴대로 `[SerializeField] GameObject`
    필드 + `Init()`을 추가해 편집기 빌드 스크립트가 값을 채워 씬에
    직렬화해 두는 방식으로 풀었다.
  - **덤으로 발견해 같이 고친 버그** — `NpcBuilder`·`BanditEncounter`
    둘 다 `Awake()`가 조건 없이 `Build()`를 다시 불러서, 이미 저장된
    씬을 실제 Play로 열면 시각·UI가 두 벌씩 겹쳐 생기는 잠재 버그였다.
    `transform.Find("Visual") != null`이면 다시 안 짓게 방어 추가(단,
    `BanditEncounter`는 `_visual`/`_visualBaseScale`을 그 경로에서도
    다시 채워야 `PulseVisual()`이 안 깨진다 — 완전히 건너뛰지 않고
    기존 자식을 찾아 필드만 복원). **같은 패턴(무조건 `Build()`)이
    `AnimalBuilder.cs`·`RareWolfEncounter.cs`·`HiddenTreasure.cs`·
    `MountainShrine.cs`·`EastGroveRelic.cs`·`LuckyCairn.cs`에도 있어
    이론상 같은 버그가 있을 수 있다 — 이번엔 GLB 교체 범위 밖이라 손
    안 댐, 아래 "다음 작업" 참고.**
  - `BanditEncounter.PulseVisual()`의 강타 스케일 애니메이션이 예전
    capsule 스케일(1.8,1.7,1.8)을 상수로 박아 뒀던 걸, 실제 스폰 시점의
    스케일(`_visualBaseScale`, GLB 기준 ≈1.259 균일)을 쓰도록 고쳤다 —
    안 고쳤으면 강타 연출 때 캐릭터가 잘못된 비율로 찌그러졌을 것.
  - 컴파일·씬 재빌드(`groundVerts=6336` 그대로 — 땅은 안 바뀜)·
    PlaytestHeadless(`OK - 10 frames, no errors`, Awake 중복 방지
    분기도 이 경로로 실제로 한 번 지나갔다) 전부 통과. **실제로 캐릭터가
    화면에 제대로 보이는지(텍스처·비율·정면 방향), 산적 텔레그래프
    색조가 실제로 도는지는 사람이 직접 봐야 확인됨** — 특히 GLB
    모델의 "정면"이 Unity +Z와 맞는지는 확신 없음(CameraRig 드래그
    방향처럼 실측이 아니라 관례로 가정한 부분).
- **PLAN.md 24~27장 "동물" 셋째 조각 — 첫 farmland 종, 소 (2026-09-12).**
  성황당 돌무더기 다음으로 이어서(같은 세션, 사용자 "응 계속 진행해") —
  지금까지 사슴 세 마리뿐이던 동물이 전부 숲/들판(forest/plains) 출신이고,
  2026-09-12 남쪽 확장으로 처음 생긴 논밭('F') 타일(row9)엔 아직 아무
  생물도 없었다. `AnimalBuilder.cs`의 `AnimalDef`에 `Species`/`Scale`/
  `Color` 필드를 넣어(이전엔 전부 "Deer" 하드코딩) 종별로 다르게 꾸밀 수
  있게 일반화하고, 그 첫 사용으로 `cow_1`(격자 (3,9), 논밭 타일 정중앙)을
  추가 — 사슴보다 크고(1.0/0.75/1.0 스케일) 옅은 크림색, 혼자 배회(무리
  자리 아님). `WanderingAnimal.cs`는 애초에 종 이름을 몰라도 되게 짜여
  있어(자막도 "동물이 놀라 달아난다"로 이미 종 불문) **한 줄도 안 고쳤다**
  — Idle/Wander/Flee/Group/Interaction 전부 그대로 상속. 씬에 GameObject가
  늘어 `BuildTestVillageScene.Build()` 재실행(`groundVerts=6336` 그대로 —
  땅은 안 바뀜). 컴파일·씬 재빌드·PlaytestHeadless 전부 통과 — 논밭 위에
  실제로 소가 서 있는지·크기가 사슴과 구별되는지는 사람이 직접 봐야 확인됨.
- **PLAN.md 24~27장 "랜덤 이벤트" 첫 콘텐츠 — 성황당 돌무더기 (2026-09-12).**
  나그네 NPC 다음으로 이어서(새 세션, "이어해") — "다음 작업"이 콕 집어 둔
  빈자리("지역/시간/랜덤 이벤트"는 아직 하나도 없다)를 채웠다.
  `World/LuckyCairn.cs`(신규, 격자 (4,7) — herb_4(3,7) 바로 옆 빈 들판) —
  지금까지 발견형 콘텐츠(HiddenTreasure·EastGroveRelic·MountainShrine 등)는
  전부 `WorldEventState`로 "한 번뿐"이었는데, 이건 반대로 **몇 번이고 다시
  들를 수 있는 자리**(20초 쿨다운만 있고 WorldEventState 없음)에서 매번
  결과가 갈리는 첫 콘텐츠 — 3냥을 내고 기원하면 가중치 룰렛(꽝 50%·소소한
  행운 32%·제법 큰 행운 14%·경험치까지 겹치는 큰 행운 4%)으로 결과가
  갈린다. 공짜로 하면 "반복 방문=순이익"이라 GoldState 경제가 무너져서
  비용을 넣었다(돈이 모자라면 굴리지 않고 대사만 뜬다). `LootTable.cs`의
  가중치 룰렛과 같은 원리지만 굳이 공유 구조로 안 뽑았다 — 이 자리
  하나뿐이라 LootTable 자신의 원칙("사건이 하나뿐이라 테이블도 하나뿐")과
  같은 이유. `BuildTestVillageScene.cs`에 `BuildLuckyCairn()` 훅 추가 —
  GameObject가 늘어 씬 재빌드(`groundVerts=6336` 그대로 — 땅은 안 바뀜).
  SaveState 변경 없음(쿨다운은 세션 안 메모리 값이라 저장할 상태가 없다,
  VillagerTalk.cs와 같은 결). 컴파일·씬 재빌드·PlaytestHeadless 전부
  통과 — 실제로 자리에 다가가면 돈이 빠지고 결과 문구·보상이 뜨는지,
  20초 안엔 재도전이 막히는지는 역시 사람이 직접 가 봐야 확인됨.
- **GO 콘텐츠 다양화 (2026-09-12) — 지도 확장을 멈추고 방향 전환.**
  같은 "산 벽 열고 공터+채집" 패턴을 세 번 반복한 뒤 사용자가 "다른
  방법 확인해줘"로 방향을 물어, "GO 콘텐츠 다양화"를 골라 지도는 9×11
  그대로 두고 안에 콘텐츠만 더 채우는 쪽으로 바꿨다. 두 조각:
  1. **동물 Group이 실제로 보이게 재배치.** `WanderingAnimal.cs`의
     Group 전파(2026-09-12 오전에 추가)가 칸 크기(48유닛)가 무리 알림
     반경(`GroupAlertRadius=40`)보다 넓어서 서로 다른 칸에 심은 동물
     끼리는 절대 안 겹치는 구조적 문제를 뒤늦게 알아챘다 — `AnimalBuilder
     .cs`에 `AnimalDef.Offset`(같은 칸 안에서 월드 단위로 비켜 두는
     자리)을 추가해 사슴 세 번째 마리를 (4,4) 칸 안에서 기존 사슴과
     17유닛 떨어뜨려 심었다(deer_1은 그대로 혼자). 이제 한쪽이 플레이어
     를 보고 놀라면 다른 한쪽도 같이 달아나는 게 실제로 보일 수 있다.
  2. **나그네 NPC — 첫 "NPC 이벤트".** PLAN.md 24~27장이 나열한 이벤트
     종류(몬스터 출현·보물 발견·NPC 이벤트·희귀 몬스터·랜덤 이벤트) 중
     "NPC 이벤트"가 지금까지 빠져 있었다. `NpcBuilder.cs`에 세 번째
     주민 `npc_traveler`(격자 (4,9), 둘째 남쪽 공터) 추가 — 촌장(3단계
     퀘스트)·상인(거래) 같은 진행 상태 없이 **말을 걸면 한 번뿐인
     보상+정보, 그다음엔 인사말만**인 제일 가벼운 형태로 갈랐다.
     `WorldEventState`(id `"traveler_met"`)를 그대로 재사용 — 일반화
     이후 세 번째 재사용. 씬에 GameObject가 늘어(사슴 한 마리·NPC 한
     명) `BuildTestVillageScene.Build()` 재실행(`groundVerts=6336`
     그대로 — 땅은 안 바뀜). 컴파일·씬 재빌드·PlaytestHeadless 전부
     통과 — 둘 다 실제로 그렇게 보이는지는 사람이 직접 봐야 확인됨.
- **지도 크기 확장 셋째 조각 — 남쪽 더 (2026-09-12) + 채집 자리 5호.**
  동쪽 공터 콘텐츠 다음으로 이어서(같은 세션) — row8의 산 벽을 열어
  (row6과 같은 모양 "^^^=^^^^^") 더 남쪽으로 2줄(row9~10) 늘렸다.
  9×9 → 9×11(432m×528m). row9엔 **`Legend`엔 있었지만 `Rows`엔 한 번도
  안 쓰이던 `'F'`(논밭) 타일을 처음 심었다**(산신당 `'S'` 때와 같은
  결) — "^T.F.T^^^". row10은 새 산 경계로 닫아 다음 확장 여지를 남김.
  같이 채집 자리 herb_5(2,9)도 심었다 — 'F' 옆 '.' 타일에(밭 자체는
  Gatherable의 "산나물을 캤다" 문구와 결이 안 맞아 피함). 기존 콘텐츠
  좌표는 전혀 안 건드림. 컴파일·씬 재빌드(`groundVerts=5184→6336`,
  9×11×4×4서브쿼드×4정점과 정확히 일치)·PlaytestHeadless 전부 통과.
- **동쪽 숲 공터(col7)에 첫 콘텐츠 — 낡은 돌기둥 발견 (2026-09-12).**
  WorldEventState 일반화 다음으로 이어서(같은 세션) — 방금 합친
  `WorldEventState`를 실제로 바로 재사용해 봤다. `World/
  EastGroveRelic.cs`(격자 (7,3), HiddenTreasure.cs와 같은 결 — 트리거
  한 번, 작은 마커, 발견 보상) 신규. 굴 보물처럼 무기를 주는 대신
  경험치+20·돈+15만 주는 가벼운 발견이라 새 `ItemData` 없음 — 이벤트
  id `"east_grove_relic"`이 일반화 이후 처음 생긴 네 번째 id. 마커는
  HiddenTreasure의 발광 구슬과 다르게 살짝 기울어진 낡은 돌기둥
  (primitive Cylinder)으로 구분. `BuildTestVillageScene.cs`에
  `BuildEastGroveRelic()` 훅 추가 — GameObject가 늘어 씬 재빌드
  (`groundVerts=5184` 그대로). 컴파일·씬 재빌드·PlaytestHeadless 전부
  통과 — 실제로 눈에 띄는지·트리거가 발동하는지는 역시 사람이 직접
  가 봐야 확인됨.
- **기술부채 정리 — WorldEventState를 id 집합으로 일반화 (2026-09-12).**
  동쪽 지도 확장 다음으로 이어서(같은 세션) — `ShrineState.cs`가
  스스로 남겨 둔 예고("세 번째 '자리 하나' 월드 이벤트가 생기면
  GatherState.cs처럼 id 집합으로 합칠 것")가, `RareWolfState.cs`가
  생기며 이미 세 번째를 넘긴 채 안 지켜지고 있던 걸 발견해 정리했다.
  `WorldEventState.cs`를 `GatherState.cs`와 같은 모양(HashSet<string>
  기반 `IsTriggered`/`TryTrigger`/`TriggeredIds`/`Restore`)으로 다시
  썼다 — 굴 보물은 `"cave_treasure"`, 산신당은 `"shrine_blessing"`,
  희귀 몬스터는 `"rare_wolf"` id를 쓴다. `ShrineState.cs`·
  `RareWolfState.cs`는 삭제, `HiddenTreasure.cs`·`MountainShrine.cs`·
  `RareWolfEncounter.cs` 세 호출부를 새 API로 바꿨다(안 쓰이던
  `TreasureFound`/`Blessing` 이벤트도 같이 정리됨 — 구독하는 곳이
  코드베이스 어디에도 없었음). `SaveState.cs` v8→v9 — 예전 세 bool
  필드(`caveTreasureFound`/`shrineBlessed`/`rareWolfDefeated`)를 하나의
  `worldFlags` 문자열 목록으로 접었다(`MigrateStep(8,...)`가 세 bool을
  보고 목록을 채워 넣어 진행 손실 없이 옮김 — 옛 필드는 마이그레이션
  전용으로 클래스에 그대로 남겨 둠). 씬 GameObject 구성은 안 바뀐
  변경이라 씬 재빌드는 생략, 컴파일·PlaytestHeadless 전부 통과.
- **지도 크기 확장 둘째 조각 — 동쪽 2칸 (2026-09-12).** 채집 자리 4호
  다음으로 이어서(같은 세션) — 남쪽 확장 때 세운 "행/열 끝에만 보태면
  기존 좌표 안 밀림" 원칙을 동쪽(열)에도 실제로 적용해 검증했다. 9×7 →
  9×9칸(432m×432m). 마을 행(row2~4)의 동쪽 벽이 원래 숲(walkable)이라
  남쪽처럼 따로 "문"을 뚫을 필요가 없었다 — col7에 숲 버퍼(row3만
  들판), col8에 새 산 경계를 둬 자연스럽게 작은 동쪽 숲 공터가 생겼다
  (아직 콘텐츠는 안 심음 — 다음 후보). 기존 콘텐츠 좌표(도적·NPC·채집
  4곳·산신당·흰늑대·사슴)는 전혀 안 건드림. 이번엔 halfW(가로 중심)도
  같이 바뀌어(halfH만 바뀌었던 남쪽 확장과 달리) `PlayerSpawn`의
  `WorldPos()` 수정이 처음으로 x축 밀림까지 실전에서 검증됐다. 컴파일·
  씬 재빌드(`groundVerts=4032→5184`, 9×9×4×4서브쿼드×4정점과 정확히
  일치)·PlaytestHeadless 전부 통과.
- **지도 확장 남쪽 공터(row7)에 첫 콘텐츠 — 채집 자리 4호 (2026-09-12).**
  동물 Flee/Group/Interaction 다음으로 이어서(같은 세션) — 지도 크기
  확장 때 "터레인만 깔고 콘텐츠는 다음"으로 남겨 뒀던 자리를 채웠다.
  새 시스템 없이 기존 `Gatherable`/`GatherState`(id 문자열 집합이라
  이미 임의 개수를 받게 짜여 있음)에 `herb_4(3,7)` 한 줄만 추가 —
  `BuildTestVillageScene.GatherSpots` 배열에 등록. `SaveState` 스키마
  변경도 필요 없다(GatherState가 id를 그대로 문자열 집합에 넣고 빼는
  구조라 새 id를 몰라도 저장/복원이 자동으로 됨). 씬에 GameObject가
  늘어 `BuildTestVillageScene.Build()`를 다시 돌렸다(groundVerts=4032
  그대로 — 땅은 안 바뀜). 컴파일·씬 재빌드·PlaytestHeadless 전부 통과 —
  남쪽 문을 지나 처음 만나는 콘텐츠라 실제로 눈에 띄는지·캐지는지는
  역시 사람이 직접 가 봐야 확인됨.
- **PLAN.md 24~27장 "동물" 둘째 조각 — Flee/Group/Interaction (2026-09-12).**
  지도 크기 확장 다음으로 이어서(같은 세션). 첫 조각(사슴 두 마리
  Idle/Wander)이 "Flee/Group/Interaction은 다음에"로 남겨 뒀던 부분 —
  `WanderingAnimal.cs`에 `State{Idle,Wander,Flee}`를 추가했다.
  **Flee**: `Player` 태그 오브젝트와의 평면 거리(y 무시)가 16유닛 안으로
  들어오면 즉시 도망 상태로 바뀌고(4.6유닛/초, 기존 배회 2.2보다 빠름)
  플레이어 반대 방향으로 몇 걸음씩(`FleeStepRadius=18`) 걸을 수 있는
  칸을 골라 이어 달아난다 — 30유닛 밖으로 멀어져야 진정한다(붙었다
  뗐다 방지용 히스테리시스, 16/30 두 문턱). **Group**: 정적 리스트
  `Active`에 씬의 모든 `WanderingAnimal`을 등록해 두고, 플레이어를 직접
  보고 놀란 개체가 반경 40유닛 안의 다른 동물도 같이 `StartFlee`시킨다
  — **다만 지금 스폰된 사슴 두 자리(2,2)·(4,4)는 실제 거리가 약
  136유닛이라 서로 이 반경 밖이라 지금은 실제로 안 겹친다**(메커니즘은
  맞게 짰지만 지금 콘텐츠로는 발동 장면을 볼 수 없다 — 동물이 늘거나
  더 가까이 배치되면 그때 실제로 보임, 기존 스폰 좌표는 이번에 안
  건드렸다). **Interaction**: 플레이어를 직접 보고 놀란 경우에만(무리
  전파로 놀란 경우는 조용히) `DialogueLabel`로 "동물이 놀라 달아난다."
  자막을 2초 띄운다 — NPC의 `_say()`와 같은 자기등록 싱글턴 재사용,
  새 UI 없음. 씬 구조(GameObject 구성)는 하나도 안 바뀐 변경이라
  `BuildTestVillageScene.Build()`는 다시 안 돌렸다(기존 관례). 컴파일·
  PlaytestHeadless 전부 통과 — **플레이어가 안 움직이는 헤드리스에서는
  Flee가 실제로 발동 안 함**(스폰 지점 사이 거리가 이미 알림 반경
  밖이라 우연히도 안전) — 실제로 다가가면 놀라 달아나는지·자막이
  뜨는지·30유닛 밖에서 다시 진정하는지는 사람이 직접 봐야 확인됨.
- **PLAN.md 51장 "GO 월드 확장 — 지도 크기" 첫 조각 (2026-09-12).** 여러
  세션 동안 "파급이 큰 작업"이라 미뤄 뒀던 항목 — 사용자가 "지도크기
  작업부터"로 이번 세션 첫 과제로 지목. `TestMapData.Rows`를 **남쪽으로만
  2줄** 늘렸다(7×7 → 7×9칸, 336m→336m×432m) — 동서남북 모두 늘리면 기존
  칸들의 (gx,gy)가 통째로 밀려 BanditEncounter·HiddenTreasure·
  Gatherable·MountainShrine·RareWolfEncounter·NpcBuilder·WanderingAnimal
  의 상수 좌표를 전부 다시 맞춰야 했겠지만, **행 끝에만 새 줄을 보태면
  기존 (gx,gy)의 내용이 하나도 안 바뀐다**(새 행은 index가 더 큰 gy로만
  추가) — 그래서 기존 콘텐츠 좌표는 전혀 손 안 댐. 다리(row5)→남쪽 성벽의
  좁은 문(row6, col3만 길)을 지나면 새로 늘어난 작은 숲 공터(row7)가
  나오고 그 너머는 다시 산으로 막았다(row8, 다음 확장 때 열 자리) —
  이번엔 터레인만 늘렸고 **새 공터에 콘텐츠(이벤트·NPC 등)는 아직 안
  심었다**(다음 후보). 그 과정에서 **`BuildTestVillageScene.cs`의
  `PlayerSpawn`이 `WorldPos()`를 안 거치고 계산 결과를 상수
  `(-48,0.1,-24)`로 박아 둔 버그를 찾았다** — 칸 수가 바뀌면
  `WorldPos()`의 halfW/halfH가 바뀌어 기존 모든 좌표가 월드 공간에서
  다 같이 밀리는데(개별 좌표 사이 관계는 그대로라 안전), 이 상수만은 안
  따라가 마을 밖으로 스폰될 뻔했다 — `TestMapData.WorldPos(2.5f, 3f)`를
  직접 부르는 계산 프로퍼티로 고쳤다. 컴파일·씬 재빌드
  (`groundVerts=3136→4032`, 7×9×4×4서브쿼드×4정점과 정확히 일치)·
  PlaytestHeadless 전부 통과. **커밋 직후 push가 origin에 선점당해**
  (다른 PC 세션이 먼저 올린 `BuildSkyAndFog` 병합 정리 커밋과 충돌) 다시
  `git merge`로 받아 `BuildTestVillageScene.cs`·`PROJECT_STATE.md` 충돌을
  풀었다 — 안개는 이제 그 병합으로 들어온 `SkyFogBuilder`(Trilight
  앰비언트 + ExponentialSquared 밀도)가 맡는다(아래 "다음 작업"의 병합
  정리 항목 참고), 이번 지도 확장 자체는 그 병합과 무관하게 그대로
  유효. saga-godot은 아직 7×7 그대로 — 두 트랙이 지도 크기까지 반드시
  같을 필요는 없다(PLAN 0장 "기획만 같이 본다").
- **PLAN.md 51장 "희귀 몬스터" + BanditEncounter 리팩터·버그 고침.**
  동물(사슴) 다음으로 이어서(같은 세션, 2026-09-11, 사용자가 "완성도를
  올려줘, 최대한 다 만들어줘"로 확인). 두 번째 실시간 전투 사건이
  생기며 `BanditEncounter.cs`의 UI 조립 코드(~150줄)를 그대로 복붙하면
  중복이 커서 **`UI/EncounterUiKit.cs`로 먼저 뽑아냈다**(캔버스/패널/
  텍스트/버튼/막대 다섯 함수, 동작은 그대로 — N=1일 땐 안 뽑다가
  N=2가 되고서야 뽑음, GatherState.cs 때 세운 원칙 그대로). 이 참에
  **BanditEncounter의 숨어 있던 버그도 고쳤다** — `Awake()`가 이미
  등용된 도적인지(`PartyState.MemberIds`) 확인을 안 해서, 세이브를
  불러온 씬을 다시 열면 이미 이긴 도적이 또 나오고 다시 이기면
  부대원 목록에 "산적"이 중복으로 쌓이는 문제가 있었다(HiddenTreasure·
  MountainShrine·Gatherable은 전부 이 확인을 갖고 있는데 제일 먼저
  만든 BanditEncounter만 빠져 있었음). 그 뒤 `World/RareWolfEncounter.cs`
  (흰 늑대, 격자 (0,3)) — BanditEncounter와 판정(DuelRules)·UI 조립
  (EncounterUiKit)은 같이 쓰지만 **"값을 치른다"가 없다**(짐승이라
  돈으로 못 무름, 선택지가 "맞선다"/"피한다" 둘뿐)·**등용이 아니라
  확정 보상**(경험치 150·돈 50냥·전용 방어구 "늑대 가죽 갑주" 방어+24,
  지금까지 최고 방어구, 도적 전리품엔 안 나옴)·**PartyState 대신
  `Data/RareWolfState.cs`로 처치 여부를 기억**(등용 대상이 아니라
  부대원 목록으로는 못 가림 — WorldEventState·ShrineState와 같은 결).
  `Data/ItemData.cs`에 `ar_wolf` 추가. `SaveState.cs` v7→v8로 처치
  여부도 저장. 컴파일·씬 재빌드(groundVerts=3136 그대로)·PlaytestHeadless
  전부 통과 — 늑대 조우·전투·보상이 실제로 도는지는 역시 사람이 직접
  싸워 봐야 확인됨.
- **PLAN.md 24~27장 "동물" 첫 조각 — 배회하는 사슴 두 마리.** 산신당
  다음으로 이어서(같은 세션, 2026-09-11). 지금까지 이 슬라이스엔 동물이
  하나도 없었다(9~10장 "여기는 아무것도 없다는 느낌을 최대한 피한다"가
  요구하는 항목이 빠져 있었음). `World/WanderingAnimal.cs`(스폰 자리
  중심 반경 24유닛 안에서 걷기↔멈춤 반복, 목표 지점이 걸을 수 있는
  칸인지 `TestMapData.WorldToGrid()`로 확인 — Idle/Wander만, Flee/
  Group/Interaction은 다음 조각) + `World/AnimalBuilder.cs`(작은
  primitive capsule 두 마리, 사람 크기 capsule과 비율로 구분, 안
  움직이는 게 아니라 `MarkStatic()` 대상 아님). `TestMapData.cs`에
  `WorldToGrid()`(`WorldPos()`의 역함수) 추가. 마을·NPC·도적·채집·
  산신당과 안 겹치는 들판 (2,2)/(4,4)에 배치. `BuildTestVillageScene
  .cs`에 `BuildAnimals()` 훅. **이 조각은 PlaytestHeadless의 10프레임
  동안 `WanderingAnimal.Update()`가 실제로 여러 번 돈다** — 지금까지
  조각들과 달리 정적 배치만이 아니라 매 프레임 로직이 실제로 오류 없이
  도는지까지 헤드리스로 확인된 셈(그래도 눈으로 자연스럽게 걷는지는
  못 봄). 컴파일·씬 재빌드(groundVerts=3136 그대로)·PlaytestHeadless
  전부 통과.
- **PLAN.md 51장 GO 월드 확장 — 산신당(둘째 조각, 같은 세션 이어서).**
  지도 자체를 키우는 건 여전히 안 함 — `WorldPos()`가 격자 전체 크기
  기준 중심 좌표라 칸 수를 바꾸면 지금까지 심어 둔 모든 좌표(마을·
  도적·굴·채집)가 통째로 밀린다(헤드리스로 못 잡는 리스크라 이번에도
  피함). 대신 **`TestMapData.Rows`의 격자 수는 그대로 두고 칸 하나의
  종류만 바꿨다** — `Legend`엔 원래부터 있었지만 `Rows`엔 한 번도 안
  쓰인 `'S'`(사당) 타일을 격자 (5,1)(원래 숲 `T`)에 심음. 칸 하나만
  바뀌어 나머지 좌표는 전혀 안 밀린다(groundVerts=3136 그대로로 확인).
  `LandmarksBuilder.BuildShrine()`(받침대+기둥 4개, primitive) +
  `Data/ShrineState.cs`(WorldEventState.cs와 같은 결 — 자리 하나짜리
  전용 상태 클래스, **세 번째 "자리 하나" 월드 이벤트가 생기면 그때
  GatherState.cs처럼 id 집합으로 둘을 합칠 것**) + `World/
  MountainShrine.cs`(HiddenTreasure와 달리 사당 자체가 이미 눈에 띄는
  표지라 반짝이는 마커 없이 트리거만 — 다가가면 경험치+돈). `SaveState
  .cs` v6→v7로 가호 여부도 저장. 컴파일·씬 재빌드(groundVerts 불변
  확인)·PlaytestHeadless 전부 통과 — 사당이 실제로 눈에 띄는지·트리거가
  발동하는지는 역시 사람이 직접 봐야 확인됨.
- **PLAN.md 51장 GO 월드 확장 — "수집" 콘텐츠 첫 조각.** 기술부채
  정리 다음으로 이어서(같은 세션, 2026-09-11) — 지도 크기를 키우는
  대신(TerrainBuilder·LandmarksBuilder·모든 격자 좌표를 건드리는 가장
  파급이 큰 손질이라 이번엔 피함, 32장 "최소 변경") 기존 7x7 지도의
  빈 들판 세 자리에 산나물 채집 지점을 심었다. `Data/GatherState.cs`
  (id 집합 — 도적·보물은 자리가 하나뿐이라 전용 상태 클래스를 뒀지만
  채집은 처음부터 여러 자리라 문자열 id로 구분, 사전에 일반화한 게
  아니라 이 콘텐츠 자체가 N개라 구조가 다름) + `World/Gatherable.cs`
  (HiddenTreasure.cs와 같은 결 — 트리거 한 번, 작은 발광 구슬, 캐면
  돈 +8냥). **자리마다 격자 좌표·id가 다른 첫 재사용 가능 컴포넌트라**
  BanditEncounter·HiddenTreasure처럼 상수로 못 박지 못하고
  `[SerializeField]`로 받는다 — 안 그러면 씬 저장 뒤 실제 Play 때
  Awake()가 기본값(0,0,null)으로 돈다(주석에 이유 남김). **Awake()가
  이미 "Visual" 자식이 있으면 다시 안 만들게 방어 코드를 넣었다** —
  이 프로젝트의 배치 모드 편집기 스크립트(`-executeMethod`)는 Awake를
  안 부르는 것으로 보이지만(그래서 각 Builder가 AddComponent 뒤에
  `.Build()`를 직접 또 부른다) 확신이 낮아 이중 생성에 안전하게
  만들어 둠 — **다음에 비슷한 컴포넌트를 새로 짤 때도 이 방어를
  기본으로 넣을 것.** 촌장(1,3)·상인(4,3)·도적(5,3) 말 걸기/조우
  반경과 안 겹치는 들판(1,2)/(5,2)/(2,4) 세 자리. `BuildTestVillageScene
  .cs`에 `BuildGatherables()` 훅 추가 — GameObject가 늘어 씬 재빌드
  (groundVerts=3136 그대로). `SaveState.cs` v5→v6로 캔 자리 목록도
  저장/로드. 컴파일·씬 재저장·PlaytestHeadless 전부 통과 — 발광
  구슬이 실제로 보이는지·캐지는지는 역시 사람이 직접 봐야 확인됨.

- **미뤄 둔 기술부채 — 골드 경제 + 상인 거래 + 상시 HUD.** Phase 6·7
  (59~73장)을 다 채운 뒤 사용자가 "다 하면 안 될까, 안 묻고 최대한
  계속해줘"로 판단을 맡겨(2026-09-11) 이전에 미뤄 뒀던 항목부터 정리.
  `Data/GoldState.cs`(시작 소지금 50냥 — 도적이 유일한 돈줄인데 그
  조우가 슬라이스에서 한 번뿐이라 사전에 돈이 없으면 "값을 치른다"가
  죽은 선택지가 된다, 그래서 시작부터 쥐여 줌) + `Data/ShopState.cs`
  (떠돌이 상인이 "베옷 갑주"를 25냥에 딱 한 번 판다 — Inventory.cs의
  "자동 장착"과 같은 결로 새 상점 화면 없이 말을 거는 순간 거래가
  끝난다). `BanditEncounter.ChoosePay()`가 이제 실제로 40냥을 쓰고
  (없으면 거절당해 도적이 다시 막아선다), 승리 보상에 돈 +30냥,
  `HiddenTreasure`도 +20냥을 얹는다. `NpcBuilder.cs`의 상인 대사를
  `ElderLine()`과 같은 패턴(`MerchantLine()`)으로 상태 분기(아직 못
  삼/방금 삼/이미 삼)하게 바꿈. **`UI/PlayerHud.cs`** — 새 인벤토리·
  장비창 화면을 만드는 대신(범위 밖으로 계속 미룸) 화면 왼쪽 위
  DebugUI 바로 아래에 "Lv.N (경험치 x/y) 돈 z냥 / 무기·방어구" 한
  줄을 릴리즈 빌드에서도 항상 띄운다(0.5초마다 갱신, DebugHud.cs의
  FPS 갱신과 같은 방식). `BuildTestVillageScene.cs`에 `BuildPlayerHud()`
  훅 추가 — GameObject가 늘어 씬 재빌드(`groundVerts=3136` 그대로).
  `SaveState.cs` v4→v5로 돈·상인 거래 여부도 저장/로드. 컴파일·씬
  재저장·PlaytestHeadless 전부 통과 — 상인 거래·길세 거절 문구·HUD
  갱신은 역시 사람이 직접 봐야 확인됨. **사전 구조로 사건/퀘스트/상점을
  일반화하는 건 여전히 안 함**(콘텐츠가 이 하나뿐이라 2장 "테스트되지
  않은 시스템을 대량 생성" 위반 — 두 번째 사건이 생길 때 할 일).
- **Phase 7(72~73단계) — World Event / Hidden Area.** Quest(70~71) 다음
  순서로 이어서(2026-09-11, 같은 세션). `Data/WorldEventState.cs`(사건
  하나뿐 — 굴 옆 보물을 찾았는지만 기억, PartyState.cs와 같은 자리) +
  `World/HiddenTreasure.cs` — 굴 입구(LandmarksBuilder가 격자 (3,0)에
  세운 상자, 크기 10x6x4)를 안 가리게 +7 비켜 둔 자리에 발광 구슬 하나.
  BanditEncounter처럼 선택지 UI를 안 두고 VillagerTalk 수준의 단순
  트리거로 줄였다 — 들어서는 순간 바로 발견 처리. **보상은 `ItemData.cs`
  에 새로 추가한 "유물 검"(공격+30, 기존 최고인 쇠칼 +22보다 셈)** —
  도적 전리품 테이블엔 안 넣어서 이 굴을 찾아야만 얻을 수 있는 탐험
  전용 보상으로 갈랐다(PLAN.md 51장 "계속 플레이할 이유"의 "숨겨진
  장소"를 실제로 다른 보상으로 갚음). 한 번 찾으면 `WorldEventState`가
  기억해 다음 씬 로드(세이브 불러오기)에서 `HiddenTreasure.Awake()`가
  스스로 지운다. `SaveState.cs` v3→v4로 이 플래그도 저장/로드.
  `BuildTestVillageScene.cs`에 `BuildHiddenTreasure()` 훅 추가 — **이번엔
  씬 하이어라키에 GameObject가 실제로 늘어 `BuildTestVillageScene.Build()`
  를 다시 돌렸다**(Phase 6·7 Quest 때와 달리 재실행이 필요한 경우,
  groundVerts=3136 그대로 — 땅은 안 바뀜). 컴파일·씬 재저장·
  PlaytestHeadless 전부 통과 — 역시 트리거가 실제로 발동해 발광 구슬이
  눈에 보이고 문구가 뜨는지는 사람이 직접 걸어가서 봐야 확인된다.
- **Phase 7(70~71단계) — Quest 시스템 / Quest Objective·Reward.** Phase 6
  다음 순서로 이어서(2026-09-11, 같은 세션). `Data/QuestState.cs`(퀘스트
  하나뿐 — NotStarted/Active/Completed 3단계, PartyState.cs와 같은 자리)
  + `VillagerTalk.cs`를 고정 문자열 대신 `Func<string>`도 받게 넓혀
  (기존 `Init(name, string)`는 그대로 유지, 내부에서 람다로 감싸 호출)
  `NpcBuilder.cs`의 마을 촌장에게 퀘스트 상태별 대사(`ElderLine()`)를
  줬다 — **말을 거는 순간이 곧 수락**이라 그 함수 안에서
  `QuestState.StartBanditQuest()`를 직접 부른다(VillagerTalk는 그 결과
  문장을 보여주기만 하는 화면 층, 부수효과는 NpcBuilder 쪽에 둠).
  `BanditEncounter.FinishFight()`가 승리 시 `QuestState
  .CompleteBanditQuest()`를 불러(퀘스트가 Active일 때만 true — 촌장을
  안 만났으면 조용히 건너뜀, 이미 끝났으면 중복 방지) 완료 시
  경험치 +50을 추가로 주고 토스트에 "퀘스트 완료" 줄을 얹는다. **"값을
  치른다"/"달아난다"를 골라도 도적은 안 사라지므로(기존 동작) 나중에
  다시 "맞선다"로 퀘스트를 끝낼 수 있다** — 퀘스트 진행이 그 선택 때문에
  막히지 않는다. `SaveState.cs`를 v2→v3로 올려 퀘스트 단계도 저장/
  로드(`MigrateStep(2, ...)`로 예전 세이브는 NotStarted로 채움). 컴파일·
  PlaytestHeadless 전부 통과 — **역시 헤드리스로는 촌장과의 대화도
  퀘스트 완료도 실제로 안 일어나 확인 못함**(플레이어가 안 움직임).
- **Phase 6(59~67단계) — Stats/EXP/Level Up/Item/Inventory/Equipment/
  Reward/Loot Table.** 버티컬 슬라이스 코드가 다 끝난 뒤(77~78단계는
  사람의 플레이 평가가 필요해 못 넘어감) 2026-09-11 사용자가 "게이트를
  건너뛰고 계속 진행"을 명시로 골라 착수. `Data/PlayerStats.cs`(레벨·
  경험치, static — PartyState.cs와 같은 자리, UnityEngine 안 끌어옴)
  + `Data/ItemData.cs`(무기/방어구 카탈로그 4종, plain C# — TestMapData.cs
  처럼 이 슬라이스는 ScriptableObject 대신 코드 카탈로그로 통일) +
  `Data/Inventory.cs`(소지 목록 + 장비 슬롯, "더 센 장비를 주우면 자동
  장착" — 장비창 UI를 새로 만들지 않고 이게 유일한 조작 경로) +
  `Data/LootTable.cs`(가중치 룰렛, 도적 전용 테이블 하나뿐 — 사건이
  하나뿐이라 (id→테이블) 사전 구조는 아직 안 만듦). `World/
  BanditEncounter.cs`의 `StartFight()`가 `PartyState.Atk/Def`에
  `PlayerStats`·`Inventory` 보너스를 더해 실전투력을 만들고,
  `FinishFight()`의 승리 분기가 경험치(+100, 1레벨 임계치 80이라 첫
  승리에 바로 레벨업하도록 일부러 맞춤)·루트 굴림·자동장착까지 한
  토스트 메시지로 모아 보여준다. **도적은 슬라이스 안에서 한 번만
  나고 다시 안 나서(기존 설계) 이 보상 루프도 실질적으로 한 판만
  체감된다** — 재도전으로 파밍하는 느낌은 이번 조각 밖. "값을
  치른다"/"달아난다"는 여전히 대사만(골드 경제는 Phase 6 목록에 없어
  이번에도 안 건드림). `Data/SaveState.cs`를 v1→v2로 올려 레벨·경험치·
  인벤토리·장비도 저장/로드하게 하고, `MigrateStep(1, ...)`에 실제
  내용을 처음 채웠다(전엔 자리만 파 둔 빈 경로였다 — PLAN.md 75장
  "Data Versioning"의 첫 실사용례). 컴파일·PlaytestHeadless 전부 통과
  (헤드리스 플레이는 플레이어가 안 움직여 조우 자체가 안 일어나므로
  새 로직의 실제 동작은 검증 못함 — 사람이 직접 싸워 확인해야 함).
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
- **Mobile Performance Pass 둘째 조각 — 실제 배칭 호출 (PLAN.md 76장,
  위 "첫 조각"에서 멈춘 자리를 이어서).** `isStatic` 플래그만으론 드로우콜이
  안 준다는 문제를 `GameBootstrap.cs`에 `CombineStaticBatches()`를 추가해
  풀었다 — `Start()`(씬의 모든 Awake가 끝난 뒤 보장)에서 `Terrain`·
  `Vegetation`·`Landmarks` 세 루트 각각에 `StaticBatchingUtility.Combine
  (root)`를 부른다. 세 루트가 공통 부모를 안 나누고 있어(BuildTestVillageScene
  .cs가 셋을 씬 최상위에 따로 만든다) 배칭도 세 그룹으로 따로 묶인다 —
  Terrain↔Vegetation↔Landmarks 사이 교차 배칭은 없다(더 줄이려면 셋을 공통
  부모 밑에 넣고 그 부모 하나로 Combine을 바꿔야 하는데, 이번 조각에서는
  안 함). 컴파일·PlaytestHeadless 전부 통과(`OK - 10 frames, no errors`) —
  **드로우콜이 실제로 줄었는지 수치 확인은 아직 안 함**(Stats 창은 GUI
  에디터라야 보여 헤드리스로는 못 본다 — 다음에 사람이 GUI로 확인할 때
  Game 뷰 Stats로 Before/After 드로우콜을 같이 봐 둘 것).
- **PLAN.md 66-1장(PC/Mobile 렌더러 이중 프로파일) 재점검·MSAA 튠.**
  Phase 1에서 "콘텐츠가 늘면 다시 점검한다"고 미뤄 뒀던 지점 — 버티컬
  슬라이스 콘텐츠가 다 들어간 지금 다시 봤다. **SSAO·그림자 Cascade
  수(PC 4/Mobile 1)·그림자 해상도(PC 2048/Mobile 1024)·Depth/Opaque
  텍스처 요구(PC만 켜짐, SSR 등에 필요)는 이미 템플릿 기본값이 66-1장
  표와 정확히 맞아 있었다** — 손 안 댐. **MSAA만 PC·Mobile 둘 다
  꺼진 채(`m_MSAA: 1`=Disabled) 방치돼 있어서** `Mobile_RPAsset.asset`
  →2(2x), `PC_RPAsset.asset`→4(4x)로 바꿨다(표의 "PC: MSAA/TAA"를
  TAA 대신 MSAA 쪽으로 택함 — TAA는 카메라별 AdditionalCameraData·
  Motion Vector 설정이 더 필요해 지금 콘텐츠 규모에는 과함, 32장 "최소
  변경" 원칙). **Screen Space Reflection·Volumetric Fog는 일부러 안
  넣었다** — 표에 PC 항목으로 적혀 있지만 지금 씬엔 그 효과가 붙을
  반사면/안개 콘텐츠가 없어 검증 없이 넣으면 2장 "테스트되지 않은
  시스템을 대량 생성" 위반이다 — 반사 재질이나 짙은 안개가 들어갈 때
  같이 넣을 것. 두 URP Asset의 Volume Profile을 공유(`SampleSceneProfile`
  guid `10fc4df2...`)하는 것도 **의도된 상태**(표 아래 "색 톤은 두 Asset에서
  같게 유지" 요구사항 — 버그 아님, 갈라놓지 않는다). 컴파일·PlaytestHeadless
  전부 통과.
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

## 완료 단계 (추가, 2026-09-11)

- **Phase 3(32장) 첫 조각 — Sky/Fog.** `Assets/Games/SagaGo/World/
  SkyFogBuilder.cs`(신규) — saga-godot의 `env_pc.tres`(ProceduralSkyMaterial
  + Environment fog) 수치를 그대로 옮겼다. 스카이박스 셰이더 자산을 새로
  만들지 않고 URP/RenderSettings API만으로 채웠다: Trilight 앰비언트
  (하늘/수평선/땅 3색)가 Godot의 sky_top/horizon·ground_bottom/horizon
  색과 같은 역할, `RenderSettings.fog`(ExponentialSquared, density=0.006 —
  env_pc.tres와 같은 값, 두 판이 같은 세계 축척 TileSize=48m을 쓰기로
  한 결정을 따름)가 fog_enabled/density/light_color와 같은 역할. 카메라
  (PlayerCamera·ReviewCamera 둘 다) `clearFlags=SolidColor` +
  `backgroundColor=HorizonColor`로 스카이박스 자산 없이도 하늘이 파랗게
  보이게 함. `BuildTestVillageScene.cs`에 `BuildSkyAndFog()` 훅 추가
  (조명 다음, 지형 전).
  - **이번 세션은 이 PC에 Unity가 설치돼 있지 않아(`CLAUDE.md`의 "PC마다
    다르다" 그대로) 배치 모드 컴파일·PlaytestHeadless 검증을 못 했다.**
    코드는 기존 파일(LandmarksBuilder.cs 등)과 같은 네임스페이스·스타일
    관례를 그대로 따랐고 API(`AmbientMode`·`FogMode`·`CameraClearFlags`
    등)도 안정적인 표준 Unity API라 컴파일이 될 것으로 보이지만, **다음
    세션이 Unity 있는 PC에서 열면 `-batchmode -nographics -quit`
    컴파일 확인과 `PlaytestHeadless.Run` 둘 다 가장 먼저 돌려 볼 것**
    (아래 "다음 작업" 맨 앞에 넣어 둠).

## 다음 작업 (다음 세션이 이어갈 것)

- **열다섯 번째 세션(2026-09-12) — "다음은 어느 쪽?" 질문에 사용자가
  "1,2 다해줘"로 (1) STORY 착수 → (2) DUNGEON 위성↔위성 지름길 둘 다
  확정, 이 세션이 둘 다 끝냈다(위 "완료 단계" 맨 위 두 항목 참고).**
  사람이 아직 DUNGEON 마을 넷 전체(Town2·3·4·장식·M키 지도·들길 매복·
  Crossroads 지름길)와 STORY 첫 슬라이스를 실기로 안 봄 — **다음
  세션이 볼 것**: (1) 사람이 실기로 확인한 피드백이 있으면(어느 쪽이든)
  그것부터. (2) 없으면 saga-dungeon PLAN.md·`VERTICAL_SLICE_DUNGEON.md`·
  saga-godot STORY 확장 기록(`docs/PROJECT_STATE.md` STORY 이후 행보)을
  참고해 다음 방향(STORY 콘텐츠 확장 vs DUNGEON Town2↔Town4 지름길
  후속 vs 다른 게임 REALM 착수 등)을 사용자와 상의할 것 — 방향 결정이라
  세션이 임의로 고르지 않는다.
- **(과거) 열네 번째 세션(2026-09-12)이 지난 세션의 네 후보(마을 셋째·넷째·
  Town2 장식·오버월드 지도·필드 조우)를 전부 끝냈다(위 "완료 단계" 참고).**
  아래는 그 결정이 나오기 전까지 남아 있던 옛 기록(참고용, 위 최신 항목이
  우선) — saga-dungeon PLAN.md·`VERTICAL_SLICE_DUNGEON.md`를 다시 훑어
  다음 콘텐츠 방향(예: 마을 간 지름길, 위성↔위성 통로 §28-3, 다른 게임
  STORY 착수 등)을 사용자와 상의할 것 — 이건 코드
  판단이 아니라 방향 결정이라 세션이 임의로 고르지 않는다.
- **(과거, 이제 완료) DUNGEON 오픈월드 확장 — 마을 두 개(Room1↔Town2)를
  걸어서 잇는 첫 슬라이스는 열세 번째 세션(2026-09-12)이 끝냈다.** 그
  세션이 남긴 네 후보는 열네 번째 세션이 전부 처리했다(위 참고).
- **(과거) 사용자가 "1,2 순서대로 진행"으로 확정 (2026-09-12, 열두
  번째 세션) — (1) FOREST가 문제없다는 실기 확인 뒤 단순화해 둔 부분
  채우기 → (2) DUNGEON 진짜 오픈월드 확장.** (1)의 세 조각(바이옴
  지형 다양성, 창조물 종 늘리기 두 번 — 포자괴물·안개유령 → 무쇠도깨비·
  나비정령)과 (2)의 첫 슬라이스까지 전부 끝났다(위 "완료 단계" 참고).
  **네 바이옴 전부 종 둘씩, 총 여덟 종**으로 "창조물 종 늘리기" 축은
  당분간 충분히 채워졌다고 볼 수 있다 — 더 늘릴지는 다음 방향 결정에서
  판단. 아래는 그 결정이 나오기 전까지 남아 있던 옛 "다음 세션이 볼
  것" 기록(참고용, 위 최신 항목이 우선):
  - 사람이 이번 세 슬라이스(바이옴·신규 종 넷)를 실기로 확인한 피드백이
    있으면 그것부터.
  - 없으면 (1)의 나머지 후보 — **가구 자유 배치**(지금은 고정 자리
    여섯, `ForestFurnitureAnchor.cs` — "다가가서 상호작용" 대신 실제
    좌표에 놓으려면 새 입력 동사가 필요해 파급이 큼) 또는 **벽지/장판**
    (`ForestHomeData.cs`에 카테고리 추가 필요, godot도 같은 이유로
    범위 밖에 둬 왔다) — 중 하나를 채우거나, 이 정도면 (1)을 충분히
    채웠다고 보고 (2) DUNGEON 오픈월드 확장으로 넘어간다(아래 항목 —
    saga-dungeon 웹판의 실제 방 배치/복도 연결 알고리즘부터 훑어 범위를
    정할 것). 어느 쪽이든 방향 결정이라 세션이 임의로 고르지 않는다.
- **DUNGEON 오픈월드 확장 — 물리적 확장(Room5~11) 네 조각 끝난 뒤
  사용자가 "100층까지 진행해줘"로 요청, 절차적 층 진행 시스템으로
  전환해 100층 검증까지 끝냈다(위 "완료 단계" 참고) — 이어서 "DUNGEON
  더 다듬기" 세 개(세이브 층 유지·HUD 층수 표시·깊이 공격력 체감
  보정)도 끝냈다.** Room5~11은 이제 존재하지 않는다 — ProcRoom 하나 +
  `DungeonFloorRunner`가 층2~100까지 다 맡는다.
  - **위 빈틈은 열한 번째 세션(2026-09-12)이 메웠다** — `PlaytestDungeonFloorProgression
    .cs`(신규)로 문 선택 트리거·`AdvanceRoom`·`Descend`가 실제 GameObject
    경로에서 도는 것까지 자동 검증했고, 그 과정에서 실제 게임 결함
    (문 자리에 서 있으면 무전투 방이 연쫓아 자동으로 건너뛰어지던 것)을
    찾아 고쳤다(자세한 내용은 위 "완료 단계" 맨 위 항목 참고).
  - **다음 세션이 볼 것** — (1) 사람이 실기로 ProcRoom(특히 이번에
    고친 "방 전환 후 남쪽 재배치"가 순간이동처럼 뚝뚝 끊겨 보이지 않는지,
    문 표지 라벨이 잘 읽히는지)을 확인한 피드백이 있으면 그것부터,
    (2) 없으면 door UI를 더 다듬을지/100층 이후로 늘릴지/다른 게임
    (STORY 등, 51~65장 확장 순서)으로 넘어갈지 사용자와 상의 — 이건
    코드 판단이 아니라 방향 결정이라 세션이 임의로 고르지 않는다.
- **사용자가 DUNGEON을 유니티 에디터로 직접 실기 확인 — "문제 없어
  보여"로 답함(2026-09-12, 열한 번째 세션 이어서).** 다음 방향을
  묻길래 "FOREST 실기 확인부터(첫 커스텀 셰이더라 리스크 큼)"를
  추천했는데, 사용자가 "더 진행해줘"로 답해 — FOREST 실기 확인은
  사용자 몫으로 남겨 두고, DUNGEON에서 배운 CharacterController 순간
  이동 패턴이 다른 트랙에도 있는지 코드로 훑어 `ForestHouse.cs`에서
  같은 결함을 찾아 고쳤다(위 "완료 단계" 맨 위 항목 참고).
  - **가구 슬라이스는 이 세션이 끝냈다**(사용자가 "가구부터 진행해줘"로
    확정, 위 "완료 단계" 참고). **이어서 "몬스터·퓨전 콘텐츠부터
    이어가줘"로 그 슬라이스도 끝냈다**(숲도깨비·바위도깨비·버섯정령·
    꽃정령 네 종, 위 "완료 단계" 맨 위 항목 참고).
  - **다음 세션이 볼 것** — (1) 사람이 FOREST를 실기로 확인한 피드백
    (구면 투영·집 들어가기/나가기·가구 여섯 자리·네 창조물의 배회/도주가
    실제로 자연스러운지)이 있으면 그것부터, (2) 없으면 이번에 단순화해
    둔 것들(가구 자유 배치·벽지/장판, 창조물 종 더 늘리기·바이옴 구분
    도입) 중 하나를 채우거나, (3) DUNGEON/다른 게임 착수 — 방향 결정은
    사용자와 상의할 것.
  - **이 세션은 여기서 멈췄다** — 사용자가 "실기 확인부터 할게, 새로운
    세션에서 하자"로 끊음(2026-09-12, 열한 번째 세션 끝). 작업 트리
    깨끗함(커밋되지 않은 변경 없음), 이 세션에서 나간 커밋:
    `53691d3`·`16a84d0`·`c7a8e27`·`8fb953f`(그 사이 다른 세션의
    saga-godot 병합 커밋 여러 개 포함) — 전부 컴파일·헤드리스 플레이
    테스트 통과 확인 후 그때그때 커밋·푸시해 뒀다. **다음 세션은 사람이
    유니티 에디터로 FOREST(구면 투영·집·가구·창조물)를 직접 플레이해 본
    소감/버그 리포트부터 받을 것** — 있으면 그것부터 처리, 위 "다음
    세션이 볼 것" (2)·(3)은 그다음.
- **사용자가 "1,2 순서대로"로 두 방향을 확정했다 — (1) FOREST 착수
  (완료, 위 "완료 단계" 참고) → (2) DUNGEON을 진짜 오픈월드로 확장
  (아직 착수 전).** 다음 세션은 (2)부터 시작한다 — 방 넷짜리 선형
  통로를 넘어 실제 복수의 방·바이옥·분기가 있는 구조로 좌표 체계를
  다시 잡는 큰 작업(파급이 커서 이전 세션들이 "범위 밖"으로 미뤄
  뒀던 것). 착수 전에 saga-dungeon 웹판의 실제 오픈월드 생성 로직
  (`js/dungeon.js`의 방 배치·복도 연결 알고리즘)을 먼저 훑어 범위를
  정할 것 — 이 프로젝트의 "테스트 씬은 전부 고정 좌표" 원칙과 절차적
  생성이 어떻게 절충되는지가 핵심 설계 질문(방 개수·연결 구조까지
  고정할지, 그 안의 콘텐츠 배치만 고정할지 등). FOREST 쪽은 아직
  GUI 실기 확인이 하나도 안 됐다는 것도 같이 기억할 것(아래 목록).
  **사용자가 "새로운 세션에서 이어 하자"로 여기서 끊었다(2026-09-12,
  아홉 번째 세션 끝)** — 이 세션 안에서 나간 커밋: `23462e0`·
  `3d49468`·`ce90f1b`·`57b35f4`·`327daa6`·`66b5f25`·`57b69a6`·
  `7670c6f`·`e4d171f`·`3e0dcfc`·`02002a7`. 전부 컴파일·헤드리스
  플레이테스트 통과 확인 후 그때그때 커밋·푸시해 뒀다.
- **DUNGEON PLAN 챕터 순 심화 — 2026-09-12 아홉 번째 세션에서 여섯
  조각을 끝내고 멈췄다**(퀘스트 36장·미니맵 27장·타격감 일부 38장 +
  랜덤 이벤트 35장·HUD 체력 게이지 26장·절차적 SFX 37장, 위 "완료
  단계" 참고, 커밋 `23462e0`·`3d49468`·`ce90f1b`·`57b35f4`·`327daa6`).
  **이 던전 규모(방 넷짜리 선형 통로, 새 아트/오디오 에셋 없이)에서
  코드만으로 갈 수 있는 챕터는 이걸로 사실상 다 옮겼다** — 남은
  28장(오버월드/월드맵 — 방을 더 짓고 좌표를 다시 잡는 큰 구조 변경,
  범위 밖)·39장(로딩 구조 — 씬 하나짜리 규모엔 아직 의미 없음)·41장
  (최종 UX 목표 — 새 코드가 아니라 평가 게이트)은 지금 손대지 않는
  편이 맞다고 판단. **다음 세션이 볼 것 — 코드보다 사람의 GUI 확인이
  먼저다**: 이번 세션 여섯 조각(퀘스트 진행·미니맵·타격감·필드 사건·
  체력 게이지·SFX 넷) 전부 아직 헤드리스 검증만 통과했지 사람이 실제로
  본 적이 없다(아래 GUI 확인 목록 맨 위 항목들). 사람이 플레이해 소감/
  버그를 남기면 그것부터, 없으면 saga-dungeon/PLAN.md·이 문서를 다시
  훑어 다음 결정(예: 진짜 오버월드로 확장할지, GO처럼 다음 게임
  FOREST로 넘어갈지)을 사용자와 상의할 것 — 이건 코드 판단이 아니라
  방향 결정이라 세션이 임의로 고르지 않는다.
- **DUNGEON 다음 슬라이스 후보** (`docs/VERTICAL_SLICE_DUNGEON.md`
  "다음 슬라이스 후보" 절 참고) — 2026-09-12 여덟 세션에 걸쳐 열다섯
  조각을 끝냈다: 몬스터 무리·엘리트/보스·방 종류 다양화(우물·상자·성소)·
  회피(구르기)·오픈월드/필드(방 두 개+복도) + 스킬 다양화(강공격)·방
  종류 나머지(행상)·부대(다중 영웅) 최소 단위(동행)·GLB 자산 도입
  (캐릭터, Kenney Blocky Characters 재사용) + 방 종류 마지막(정예
  소굴·미니보스·채광방·퍼즐방·구출·채집) + 세공·행상 재고 굴리기·도감 +
  바이옴 5종(숲·늪·산·사당·폐허) + 환경/건물 GLB(복도 타일·문 아치) +
  회피 애니메이션·이펙트(구르기 회전·잔상·무적 틴트) +
  **방 셸 GLB(room-small.glb, 균일 스케일로 20×20 정사각, 위 "완료
  단계" 참고)**.
  사용자가 "1,2,3,4 순서대로 다해"/"1,2 순서대로"로 그때그때 지시(위
  "완료 단계" 각 항목 참고). **아직 사람이 GUI로 하나도 확인 안 함** —
  매 조각마다 컴파일·씬 재빌드·PlaytestDungeonHeadless만 통과시키고
  바로 다음 조각으로 넘어갔다(아래 GUI 확인 목록에 계속 쌓인다).
  **이걸로 `VERTICAL_SLICE_DUNGEON.md`의 원래 "다음 슬라이스 후보"
  목록을 전부 끝냈다** — 더 진행하려면 saga-dungeon 웹판 PLAN.md
  챕터 순서(오픈월드 확장 등 더 큰 콘텐츠 확장)를 참고하거나, 지금까지
  쌓인 GUI 확인 목록(아래)을 사람이 먼저 실기로 훑어 재미·정렬 문제부터
  잡는 쪽을 사용자가 고를 것.
- **지도 크기는 9×11에서 일단 멈췄다** — 남쪽 4줄+동쪽 2칸을 늘리고
  각 공터에 콘텐츠도 심은 뒤, 같은 확장 패턴이 세 번 반복되자 사용자가
  "GO 콘텐츠 다양화"로 방향을 정했다(위 "완료 단계" 참고 — 동물 Group
  재배치·나그네 NPC). **더 키우려면**: (1) row10의 산을 또 열어 계속
  남쪽으로, (2) 북쪽·서쪽으로 늘리는 것(이번엔 "끝에 보태기"라
  안전했지만, **앞쪽에 끼워 넣는 방향은 기존 좌표가 실제로 밀리므로**
  시도한다면 기존 콘텐츠 좌표를 전부 다시 맞추는 별도 작업이 필요).
  안개는 이제 SkyFogBuilder의
  ExponentialSquared 밀도 방식이라(아래 병합 정리 항목 참고) "거리"
  숫자가 아니라 밀도가 새 지도 크기에 맞는지를 사람이 GUI 확인할 때
  같이 볼 것.
- **Awake() 중복 생성 의심 — 나머지 6곳 (2026-09-12에 해결됨, 위 "완료
  단계" 참고).** `AnimalBuilder`·`HiddenTreasure`·`EastGroveRelic`·
  `LuckyCairn`엔 방어를 추가, `MountainShrine`은 원래 방어가 필요 없음을
  확인, `RareWolfEncounter`·`BanditEncounter` 둘은 더 깊은 버그(UI 필드
  미복원으로 인한 잠재 NRE)를 찾아 "기존 자식 삭제 후 Build() 재실행"
  방식으로 고쳤다. **사람이 GUI로 확인할 것**: 도적/흰 늑대에게 세이브를
  불러온 상태에서 실제로 다가가도 더 이상 죽지 않는지(고친 NRE 경로
  자체는 헤드리스로 재현 못 함), 그리고 동물·보물·산신당 등이 여전히
  한 벌로만 보이는지.
- **PLAN.md 8장 에셋 도입 다음 후보(우선순위 44~49장: Player→주요
  Enemy→Boss→Environment→Building→Vegetation→Props→Animals→VFX).**
  캐릭터(완료)·Environment/Building(완료, 위 "완료 단계" 참고) 다음은
  Animals(사슴·소·흰 늑대, 지금 전부 primitive) — 다만 saga-godot도
  어울리는 동물 GLB가 없어 동물류는 전부 primitive로 남겨 뒀다
  (`saga-godot/docs/ASSET_GUIDE.md` "이번에 안 바꾼 것" 참고, CC0 동물
  킷을 새로 받아야 함 — 2026-09-12에 Quaternius 후보를 찾았지만 계정
  없이 못 받아 옴, 위 "완료 단계"·`docs/ASSET_GUIDE.md` 참고). **산신당
  재설계·Props는 2026-09-12에 끝냈다**(위 "완료 단계" 참고). 남은 것은
  VFX(아직 대상 없음)뿐.
- **GO 콘텐츠 다양화 다음 후보.** PLAN.md 24~27장 이벤트 종류 중 "랜덤
  이벤트"는 성황당 돌무더기(LuckyCairn, 위 "완료 단계")로 채웠다 —
  **"시간" 이벤트(특정 시간대에만 나오는 것)는 아직 없다**(하루 일과·
  낮밤 자체가 이 슬라이스에 없어서, 새로 넣으려면 day/night 시스템부터
  필요 — 파급이 커서 이번엔 안 건드림). 그 외엔 사건/퀘스트/상점을 사전 구조로
  일반화하는 것(콘텐츠가 늘면서 슬슬 가치가 생기기 시작했을 수 있음 —
  WorldEventState가 이미 그 첫걸음이었다), 51~65장이 적어 둔 확장 순서
  (GO → DUNGEON → FOREST → STORY → REALM)의 다음 게임 착수.
- **(2026-09-12) 병합 충돌 정리 — `BuildTestVillageScene.cs`의
  `BuildSkyAndFog` 호출부가 로컬(HEAD)과 원격(이 branch)에서 각자 다른
  방향으로 진화해 있었다.** 로컬 쪽은 `var sun = BuildLighting();
  BuildSkyAndFog(sun);`(Skybox 머티리얼 생성 + `RenderSettings.sun`
  방식)로 남아 있었는데, `BuildPlayerCamera`/`BuildReviewCamera`가 이미
  `clearFlags = SolidColor` + `backgroundColor = SkyFogBuilder
  .HorizonColor`로 스카이박스 없는 단색 배경을 쓰도록 짜여 있어서 그
  방식은 실제로는 화면에 하나도 안 보이는 죽은 코드였다. 무인자
  `BuildSkyAndFog()`(SkyFogBuilder 위임, Trilight 앰비언트 +
  ExponentialSquared 안개)가 실제로 카메라 설정과 맞물려 쓰이는 쪽이라
  그걸로 통일하고, Skybox 방식 메서드·`SkyMaterialPath` 상수·안 쓰는
  `Sky.mat` 자산은 지웠다. `docs/PROJECT_STATE.md`(이 파일)의 "다음
  작업" 절도 병합 때 두 세션이 각자 다른 시점에 적어 둬 갈라졌던 것을
  이 branch(더 나중 시점, Phase 6·7·경제·채집·산신당·동물까지 반영된
  쪽)를 기준으로 정리했다 — 아래 "Sky/Fog가 자연스러운지" 항목도 그때
  기준으로 고침(Skybox 색·거리 숫자 → Trilight 앰비언트·안개 밀도).
- Path/Road 구성(PLAN.md 32장)은 saga-godot도 색 구분 외엔 따로 안
  한 항목이라(terrain_builder.gd의 '=' LEGEND에 특별한 처리 없음)
  이번 손질에서 건너뜀 — TerrainBuilder의 지형 색 구분으로 이미 충족.
- 플레이어가 실제로 걸어 다닐 수 있는 수준까지 쌓였다 — **이제 한 번
  GUI로 몰아서 확인할 때가 됐다**(사람이 직접, 헤드리스로는 못 봄):
  - **CameraRig의 드래그 방향이 실제로 자연스러운지**(부호를 새로
    판단해 정한 자리라 확신이 낮다)
  - **Sky/Fog가 자연스러운지**(SkyFogBuilder의 Trilight 앰비언트 색·
    ExponentialSquared 안개 밀도 0.006은 env_pc.tres 수치를 그대로
    옮긴 것 — 실제 화면에서 Godot 쪽과 비슷한 느낌인지 눈으로 볼 것.
    위 병합 정리로 이제 이 경로 하나만 실제로 쓰인다)
  - **NPC 말 걸기가 실제로 되는지**(TalkArea 트리거 판정·화면 상단
    자막 표시 — 헤드리스로는 트리거가 실제로 발동하는지 확인 불가)
  - **도적의 습격이 실제로 되는지**(조우 트리거 → 선택지 → 전투 →
    등용까지 12단계 루프 전체가 헤드리스 검증 밖 — 사람이 직접
    "맞선다"를 눌러 승리까지 가 봐야 한다). **특히 세이브를 불러온 채로
    다가갈 때 더는 안 죽는지**(2026-09-12에 고친 잠재 NRE 경로 — 위
    "완료 단계" 참고, 코드 검토로만 확인했고 실제 재현·회귀 확인은
    아직 안 됨)
  - **저장·재시작이 실제로 되는지**(저장 버튼 → 에디터에서 Play를
    끄고 다시 켬 → 위치·부대가 돌아오는지)
  - **정적 배칭이 실제로 드로우콜을 줄였는지**(Game 뷰 Stats 창,
    Combine() 넣기 전/후 비교 — 헤드리스로는 확인 불가)
  - **MSAA를 켠 뒤 가장자리 계단 현상이 실제로 줄었는지**(PC 4x/Mobile
    2x로 숫자만 넣었다 — Quality 레벨을 PC/Mobile로 오가며 눈으로 볼 것)
  - **경험치·레벨업·루트·자동장착이 실제로 도는지**(도적을 이기면
    토스트에 "경험치 +100 — 레벨업! (1 → 2)"·주운 장비 문구가 뜨는지,
    수치만으로 정한 자리라 실제 UX로 한 번 봐야 함 — 도적은 한 번
    이기면 다시 안 나니 **세이브 파일을 지우고 처음부터** 봐야 재현됨)
  - **촌장 퀘스트 대사·완료 처리가 실제로 도는지**(처음 말 걸면
    수락 대사, 다시 걸면 재촉 대사, 도적을 이긴 뒤 다시 걸면 사례
    대사로 바뀌는지 — 3단계 다 순서대로 봐야 함, 역시 세이브 지우고
    새로 시작해야 재현됨)
  - **굴 옆 숨겨진 보물이 실제로 보이고 주워지는지**(발광 구슬이 굴
    입구 상자에 안 가려 보이는지, 다가가면 "유물 검"을 얻는지 —
    한 번 주우면 다시 안 나니 역시 세이브 지우고 새로 시작해야 재현됨)
  - **골드 경제·상인 거래·PlayerHud가 실제로 도는지**(길세 40냥을
    실제로 낼 수 있는지/모자라면 거절당하는지, 상인에게 처음/두 번째
    말 걸 때 문구가 바뀌는지, 화면 왼쪽 위 HUD 줄이 DebugUI와 안
    겹치고 값이 실제로 갱신되는지)
  - **산나물 채집 세 자리가 실제로 보이고 캐지는지**((1,2)/(5,2)/(2,4)
    들판에 작은 초록 구슬이 보이는지, 밟으면 돈 +8냥이 들어오는지)
  - **산신당이 실제로 자리 잡고 가호가 도는지**(격자 (5,1)에 받침대+
    기둥 4개가 숲 사이로 눈에 띄는지, 다가가면 경험치+돈을 받는지)
  - **사슴 두 마리가 실제로 자연스럽게 걷는지**((2,2)/(4,4) 들판 근처를
    돌아다니는지, 산·강으로 걸어 들어가지 않는지, 멈췄다 걷는 리듬이
    부자연스럽지 않은지 — 수치(반경 24·속도 2.2)만으로 정한 자리)
  - **사슴이 실제로 놀라 달아나는지**(16유닛 안으로 다가가면 바로 도망
    상태로 바뀌어 반대 방향으로 뛰는지, "동물이 놀라 달아난다." 자막이
    뜨는지, 30유닛 밖으로 물러나면 다시 진정해 배회로 돌아오는지 —
    Group 전파는 지금 스폰 좌표로는 두 마리가 서로 멀어 볼 수 없음)
  - **흰 늑대(희귀 몬스터)가 실제로 도는지**(격자 (0,3) 숲에서 조우
    프롬프트가 뜨는지, "맞선다"/"피한다" 둘뿐인지, 이겼을 때 경험치
    150·돈 50냥·"늑대 가죽 갑주"를 확정으로 받는지, 다시 그 자리를
    지나도 재등장 안 하는지). **세이브를 불러온 채로 다가갈 때 더는
    안 죽는지도 같이**(2026-09-12에 고친 잠재 NRE 경로, 도적과 같은 결)
  - **도적을 이긴 뒤 저장→재시작해도 다시 안 나오는지**(이번에 고친
    버그 — `Awake()`가 `PartyState.MemberIds`를 확인하게 바꿨다,
    재현하려면 도적을 이기고 저장한 뒤 Play를 끄고 다시 켜서 확인)
  - **지도가 남쪽으로 실제로 늘어났는지**(다리 건너 남쪽 성벽 문(격자
    (3,6))을 지나면 새 숲 공터(row7)가 나오고 그 너머는 산으로 막혀
    있는지 — 플레이어 스폰이 여전히 마을 두 집 사이인지도 같이 확인)
  - **새 공터의 채집 자리(herb_4, 격자 (3,7))가 실제로 보이고 캐지는지**
    (남쪽 문을 지나자마자 발광 구슬이 눈에 띄는지, 밟으면 돈 +8냥이
    들어오는지 — 기존 세 자리와 같은 컴포넌트라 동작은 검증됐지만 이
    자리 자체는 처음 확인)
  - **지도가 동쪽으로 실제로 늘어났는지**(마을에서 동쪽 숲을 계속
    걸으면 col7~8의 새 공터가 나오고 그 너머는 산으로 막혀 있는지 —
    남쪽과 달리 문 없이 자연스럽게 이어지는지도 같이 확인)
  - **낡은 돌기둥(EastGroveRelic, 격자 (7,3))이 실제로 눈에 띄고
    발견되는지**(숲 사이에서 발광 없이도 구분되는지, 다가가면 경험치
    +20·돈 +15 토스트가 뜨는지)
  - **둘째 남쪽 공터(row9)까지 실제로 갈 수 있는지**(row8의 새 문을
    지나면 논밭 타일이 보이는지, herb_5(2,9)가 실제로 보이고 캐지는지,
    row10 산으로 다시 막혀 있는지)
  - **사슴 무리(deer_2·deer_3, 격자 (4,4) 근처)가 실제로 같이 달아나는지**
    (한쪽에 다가가 놀라게 하면 17유닛 떨어진 다른 한쪽도 같이 도망
    상태로 바뀌는지 — Group 전파가 실제로 눈에 보이는 첫 사례)
  - **나그네(npc_traveler, 격자 (4,9))가 실제로 도는지**(처음 말 걸면
    경험치+15·돈+10과 함께 정보성 대사가 뜨는지, 다시 말 걸면 인사말
    뿐인 짧은 대사로 바뀌는지)
  - **성황당 돌무더기(LuckyCairn, 격자 (4,7))가 실제로 도는지**(herb_4
    바로 옆에 작은 돌탑이 보이는지, 다가가면 3냥이 빠지고 결과 문구가
    뜨는지, 돈이 3냥 미만이면 안 빠지고 거절 문구만 뜨는지, 20초 안에
    다시 들어가면 아무 반응이 없는지, 20초 뒤엔 다시 굴려지는지 —
    가중치 룰렛이라 결과가 매번 다를 수 있음을 감안하고 여러 번 볼 것)
  - **소(cow_1, 격자 (3,9) 논밭)가 실제로 보이고 자연스러운지**(사슴보다
    크고 옅은 색으로 구별되는지, 논밭 타일 위에서 배회하는지, 다가가면
    사슴과 똑같이 놀라 달아나는지)
  - **캐릭터 GLB(플레이어·촌장·상인·나그네·산적)가 실제로 제대로
    보이는지** — 텍스처가 깨지지 않았는지, 걸을 때 이동 방향으로 실제로
    정면을 향하는지(글TF "정면"이 Unity +Z와 맞는지 확신 없음), 다섯
    배역이 색조로 구별되는지(상인·나그네는 같은 모델이라 색만 다름),
    산적 강타 텔레그래프 때 주황으로 물들었다 원래 색으로 돌아오는지,
    강타 스케일 연출 때 비율이 안 찌그러지는지
  - **환경/건물 GLB(나무·바위·굴 입구·마을집·폐허 기둥·다리)가 실제로
    자연스러운지** — 나무·바위가 텍스처와 함께 제대로 보이는지(폴백
    단색 primitive가 아니라 실제 GLB로 나온다는 뜻), 마을집 벽·지붕
    비례가 어색하지 않은지(지붕이 균일 ×10이라 뾰족하게 커 보일 수
    있음 — 실제로 봤을 때 너무 크면 스케일 조정 필요), 다리 널판
    44개가 이음새 없이 이어져 보이는지, 폐허 기둥이 가늘어 보이지
    않는지(pillar-stone은 원래 얇은 기둥이라 의도된 모습일 수 있음).
    **산신당은 2026-09-12 재설계로 기둥이 없어졌다** — 아래 별도 항목 참고
  - **산신당 제단(altar-stone.glb, 격자 5,1)이 자연스러운지**(2026-09-12
    재설계) — 예전 받침대+기둥 4개보다 훨씬 작아진 크기감(약
    2.6×1.23×1.63m)이 숲 사이에서 눈에 띄는지, 텍스처 이음새가 안 보이는지
  - **Props 셋(가로등·시장 좌판·울타리+문, 2026-09-12 도입)이 자연스러운지**
    — 마을집 두 채 사이 가로등 2개가 서로 마주 보고 서 있는지, 떠돌이
    상인 옆 시장 좌판이 거래 자리처럼 보이는지, 논밭 소 옆 울타리 3칸+
    문 1칸이 "목장 한구석" 느낌을 주는지(소를 실제로 가두진 않아 소가
    울타리를 넘나들어도 정상 동작임)
  - **DUNGEON 첫 슬라이스(`TestDungeon.unity`, 2026-09-12 신규, 사람이
    이미 한 번 플레이해 "특별한 문제 없음"으로 확인함)가 실제로
    도는지** — `Saga/Build TestDungeon Scene` 메뉴로 씬을 열어 Play:
    카메라가 GO보다 더 내려다보는 각도(디아블로 감각)로 시작하는지,
    이동·오빗 카메라가 자연스러운지, 몬스터(황건적)에게 다가가면
    Idle→Chase로 바뀌어 쫓아오는지, 사거리 안에서 스페이스바(또는 화면
    오른쪽 아래 "공격" 버튼)로 때리면 몬스터 체력이 줄고 몬스터도
    반격하는지, **화면 "공격" 버튼을 눌렀을 때 `CameraRig`의 마우스
    왼쪽 버튼 드래그 판정과 안 겹치는지**(코드는 안 겹치게 짰지만
    실제 클릭 동작으로 확인 안 됨), 몬스터를 처치하면 경험치·돈·
    "쇠도끼"를 얻고 왼쪽 위 HUD의 공격력 숫자가 오르는지, 저장 버튼→
    Play 재시작으로 위치·레벨·장비가 이어지는지, 체력이 0이 되면
    바로 회복되고 토스트가 뜨는지(이번 슬라이스는 죽음 페널티 없음,
    의도된 동작)
  - **몬스터 무리(2026-09-12, 4마리로 늘림)가 실제로 자연스러운지** —
    방에 들어서면 황건적 4마리가 눈에 보이는지(1마리일 때와 달리 무리
    느낌이 나는지), 가까이 가면 여럿이 동시에 Chase로 바뀌어 몰려오는지,
    몰려온 채로 둘러싸여도 조작이 안 밀리고 한 마리씩 처치할 수 있는지,
    한꺼번에 맞아 체력이 빠르게 줄 때의 손맛이 괜찮은지(죽음 페널티가
    없어 전멸돼도 바로 회복되긴 하지만, 그 전에 "위험하다"는 긴장감이
    드는지)
  - **황건적 두목(2026-09-12, 엘리트/보스)이 실제로 위협적으로
    보이는지** — 잡졸 무리보다 방 안쪽(동쪽 벽 가까이)에서 덩치(1.6배)·
    색(짙은 적갈)으로 구분되는지, 부하 둘과 함께 나오는지, HP 168을 다
    깎는 데 걸리는 시간이 지루하지 않은지, 쓰러뜨리면 "귀두도"를 확정
    으로 얻고 공격력이 크게 오르는지(쇠도끼 12→귀두도 26)
  - **우물·보물상자·성소(2026-09-12, 방 종류 다양화)가 실제로 구분돼
    보이고 도는지** — 서쪽 플레이어 스폰 주변에서 세 표지(청록 원통·
    갈색 상자·보라 원통)가 눈에 띄는지, 우물은 몬스터를 안 잡고도 바로
    체력 40%를 회복해 주는지, 상자·성소는 방의 몬스터(잡졸 4+두목+부하
    2)를 **다 잡아야만** 반응하는지(그 전엔 다가가도 아무 일 없어야
    정상), 셋 다 한 번 쓰면 다시 안 되는지
  - **회피(2026-09-12)가 실제로 손에 잡히는지** — 데스크톱은 Left
    Ctrl, 모바일은 공격 버튼 왼쪽의 새 "회피" 버튼을 눌렀을 때 이동
    입력 방향(가만히 있으면 마지막 바라보는 방향)으로 짧게(약 3m)
    미끄러지는지, 그동안 몬스터 공격이 실제로 안 박히는지(무적),
    쿨다운 0.9초가 남발을 막을 만큼 적당한지, 회피 버튼이 화면에서
    공격 버튼과 안 겹치는지
  - **복도+Room2(2026-09-12, 오픈월드/필드)가 실제로 이어지는지** —
    Room(방1)의 몬스터 무리를 넘어 북쪽 벽에 문(3m 폭)이 뚫려 있는지,
    복도를 따라 걸으면 막히지 않고 Room2까지 닿는지, Room2에 잡졸
    둘이 있고 정상적으로 Idle→Chase→전투가 도는지, 문 폭이 실제로
    걸어서 통과하기에 좁지 않은지
  - **강공격(2026-09-12, 스킬 다양화)이 실제로 손에 잡히는지** —
    데스크톱 Left Alt·모바일 공격 버튼 위 "강공격" 버튼을 눌렀을 때
    평타보다 훨씬 세게 들어가는지(피해 2.6배), 쿨다운 1.3초가 남발을
    막는지, 회피 중엔 실제로 안 나가는지, 사거리가 평타보다 살짝
    넓어(1.15배) 아슬아슬하게 닿는 적도 맞는지
  - **행상(2026-09-12, 방 종류 나머지)이 실제로 도는지** — Room2
    잡졸 둘을 잡기 전엔 반응 없다가 잡으면 좌판(녹색)이 반응하는지,
    45냥이 있으면 "환도"를 사고 자동 장착되는지, 돈이 모자라면 거절
    문구가 뜨고 3초 안엔 또 안 뜨는지, **곁다리로 고친 버그**(Room1
    상자·성소가 이제 Room2 잡졸과 무관하게 Room1만 클리어하면 열리는지)
    도 같이 확인
  - **동행(2026-09-12, 부대 최소 단위)이 실제로 함께 싸우는지** —
    스폰 직후 플레이어 옆(청색 인물)에 있는지, 플레이어가 움직이면
    따라오는지, 8m 안에 몬스터가 있으면 알아서 다가가 공격하는지,
    안 죽는지(맞아도 쓰러지지 않아야 정상), 있을 때 전투가 확실히
    더 빨리 끝나는지(체감상 화력 증가)
  - **캐릭터 GLB(2026-09-12, GLB 자산 도입)가 실제로 제대로 보이는지**
    — 플레이어·잡졸·두목·동행이 더는 캡슐이 아니라 실제 인물 모델로
    보이는지, 네 배역이 색조(무색·황건색·적갈·청색)로 구별되는지,
    두목(3.2m)이 잡졸(2m)보다 확실히 커 보이면서도 과하게 부담스럽지
    않은지, 걸을 때 이동 방향으로 정면을 향하는지(GLB "정면"이 Unity
    +Z와 맞는지 확신 없음 — GO 세션과 같은 주의사항), 텍스처가 깨지지
    않았는지
  - **Room3·Room4(2026-09-12, 방 종류 마지막)가 실제로 이어지는지** —
    Room2 북쪽 문에서 복도2를 지나 Room3에 닿는지, Room3 정예(붉은빛,
    잡졸 둘과 함께)와 미니보스(자보라, 2.6m)가 잡졸·두목과 확실히
    구별되는지, 채광방(서쪽 잿빛 광맥)이 정예·미니보스를 다 잡아야만
    반응하는지, Room3 북쪽 문에서 복도3을 지나 Room4(막다른 방)에
    닿는지, 퍼즐방(제단 셋, 순서 {1,2,0})이 방을 안 치워도 바로
    반응하고 틀리면 처음부터 리셋되는지, 구출(지친 인영)이 지키는
    잡졸 둘을 잡아야만 풀려나는지, 채집(약초 셋+못)이 약초는 방 안
    치워도 캐지고 못은 방을 다 치운 뒤에만 반응하는지
  - **세공·행상 재고 굴리기·도감(2026-09-12)이 실제로 도는지** — 채광방을
    캐면 벽옥이 바로 세공되는지, 미니보스를 잡으면 홍옥이 벽옥보다
    세서 자동 교체되는지(반대 순서로 얻으면 안 바뀌는 것도 정상), Room3
    신규 행상(Room2 행상과 다른 자리)이 50냥에 남주를 파는지, 몬스터를
    처음 잡을 때만 "📖 도감에 처음 기록됨" 토스트가 뜨고 같은 종류를 또
    잡으면 안 뜨는지, 저장 후 다시 켰을 때 세공한 보석·도감 기록이
    그대로 남아 있는지
  - **바이옴 5종(2026-09-12)이 실제로 도는지** — Room1(숲)·Room2(늪)·
    Room3(산)·Room4(사당)가 바닥/벽 색으로 뚜렷이 구별되는지, 구석 소품
    (나무 셋·물웅덩이+갈대·바위 셋·석등)이 기존 콘텐츠(적·상자·행상 등)를
    가리거나 겹치지 않는지, 사당 석등의 따뜻한 점광원이 과하거나
    부족하지 않은지, 복도 셋이 폐허 톤으로 방과 다르게 보이는지
  - **환경/건물 GLB(2026-09-12, 복도 타일·문 아치)가 실제로 자연스러운지**
    — 복도 셋의 corridor.glb 타일 두 장이 이음매 없이 이어져 보이는지,
    폐허 톤 틴트가 과하거나 밋밋하지 않은지, 방 넷의 문 6곳에 선 gate.glb
    아치가 문 폭(3m)에 맞게 자연스러워 보이는지(X만 0.682로 줄여 살짝
    좁아 보일 수 있음), 아치를 실제로 걸어서 통과할 때 걸리는 느낌이
    없는지(콜라이더 없음 — 걸리면 다른 원인)
  - **회피 애니메이션·이펙트(2026-09-12)가 실제로 손에 잡히는지** —
    Left Ctrl(또는 모바일 "회피" 버튼)을 눌렀을 때 캐릭터가 회피 방향
    으로 실제로 한 바퀴 굴러 보이는지(360도 구르는 속도가 너무 빠르거나
    어색한 블러로 안 보이는지), 하늘색 잔상이 방향에 맞게 자연스럽게
    남았다 흐려지는지, 무적 시간(0.22초) 동안 캐릭터가 하늘색으로
    또렷이 보이는지(너무 흐리거나 안 보이면 색 재조정 필요), 대시가
    끝난 뒤 캐릭터가 어색한 각도 없이 바로 똑바로 서는지, 회피 직후
    이동 입력이 바로 다시 먹는지
  - **방 셸 GLB(2026-09-12)가 실제로 자연스러운지 — 이번 GUI 확인 목록
    중 우선순위 가장 높음(방 넷 전체 인상이 걸림)** — 방 넷이 이제
    회색 primitive 상자가 아니라 실제 돌 셸(room-small.glb)로 보이는지,
    깊어진 방(14→20)이 콘텐츠에 비해 휑해 보이지 않는지, **문 구멍의
    시각적 위치·폭이 실제로 걸어서 지나갈 수 있는 콜라이더 문 폭
    (≈7.33m)과 맞아떨어지는지**(안 맞으면 보이는 문과 실제로 막히는
    자리가 어긋나는 심각한 문제 — `docs/ASSET_GUIDE.md` "확인 안 된
    가정" 참고, 이번 슬라이스에서 메시를 직접 열어 보지 않고 추론만
    했다), 문턱에서 복도(4.0m)로 좁아지는 단이 거슬리는 수준인지, 넷
    다 같은 셸인데 바이옴 색 틴트(숲·늪·산·사당)로 충분히 구별되는지 + Phase 6(59~67단계 Stats/
  EXP/Item/Inventory/Equipment/Reward/Loot) + Phase 7(70~73단계 Quest/
  World Event/Hidden Area) + 골드 경제/상인 거래/PlayerHud + PLAN.md
  51장 채집·산신당·희귀 몬스터(흰 늑대) + PLAN.md 24~27장 동물(사슴)
  까지 코드상으로는 전부 채워졌다.** **위 GUI 확인에서 실제로 도는 게
  확인되면 PLAN.md 77~78단계(전체 플레이 테스트 → 재미 평가)로 넘어갈
  수 있다** — 이번 세션은 그 게이트를 사용자가 명시로 건너뛰라고("다
  하면 안 될까, 안 묻고 최대한 계속해줘") 골라 여기까지 끝냈다
  (2026-09-11). **지도 자체를 키우는 건(칸 수 확장) 2026-09-12에 첫
  조각을 냈다** — 남쪽으로만 2줄(7×7→7×9)로, "행 끝에만 보태면 기존
  좌표 안 밀림" 전략으로 기존 콘텐츠 좌표를 안 건드리고 해냈다(위
  "완료 단계" 참고). 더 늘리거나(동쪽 Cols·남쪽 더) 새 공터에 콘텐츠를
  심는 건 다음 조각. 동물의 Flee/Group/Interaction도 2026-09-12에 이어서
  냈다(위 "완료 단계" 참고 — Group은 메커니즘만 맞고 지금 스폰 두 자리는
  서로 멀어 실제 발동 장면은 아직 없음). 다음 후보는 51~65장이 적어 둔
  확장 순서(GO → DUNGEON → FOREST → STORY → REALM) — 사건/퀘스트/상점을
  사전 구조로 일반화하는 건 콘텐츠가 각각 하나~둘뿐이라(채집만 예외)
  여전히 미룸. 세션 시작 시 PLAN.md를 다시 훑어 고를 것.
- **이번 세션은 여기서 멈췄다** — 사용자가 "새로운 세션에서 다시
  하자"로 끊음(2026-09-11 끝, 2026-09-12로 날짜 넘어감). 이 세션 하나
  안에서 10개 커밋(`5965798`~`34fc937`)이 나갔다 — 전부 컴파일·
  PlaytestHeadless 통과 확인 후 그때그때 커밋·푸시해 뒀다. 다음
  세션은 위 "다음 작업" 문단(지도 확장/동물 Flee·Group/다음 게임 착수)
  중 사용자가 고르는 대로 이어가거나, 여기까지 쌓인 걸 사람이 먼저
  직접 플레이해 GUI 확인 목록을 하나씩 지워 나갈 수도 있다 — 둘 다
  유효한 다음 수, PLAN.md를 다시 훑어 정할 것.
- **2026-09-12 후속 세션(같은 날, 사용자가 "이어해"로 계속) — 여기서
  멈췄다.** 위 항목 이후로 GO 콘텐츠 다양화(동물 Group 재배치·나그네
  NPC)까지 마친 다른 세션 뒤를 이어, 이번 세션은 캐릭터 디자인 여부를
  사용자가 물어본 걸 계기로 **PLAN.md 8장 "실제 3D 에셋" 도입**을
  시작했다 — 캐릭터 GLB(플레이어·촌장·상인·나그네·산적) + 환경/건물
  GLB(나무·바위·굴 입구·마을집·폐허·다리)까지 두 조각을 끝냈다(위
  "완료 단계" 참고). 사용자가 "완료하면 새 세션에서 이어하자"로 끊어
  여기서 멈춘다. **다음 세션이 볼 것**: (1) 이번에 쌓인 GUI 확인
  목록(캐릭터·환경/건물 항목이 새로 늘었다, 위 체크리스트 참고) —
  사람이 직접 플레이해 눈으로 확인하는 게 제일 먼저 할 만한 일,
  (2) Awake() 중복 생성 의심 나머지 4곳 정리(위 "다음 작업" 참고),
  (3) 산신당 재설계(altar-stone.glb), (4) 남은 자산 우선순위(Animals·
  Props·VFX) 또는 51~65장 다음 게임(DUNGEON) 착수 — PLAN.md를 다시
  훑어 정할 것.
- **2026-09-12 세 번째 후속 세션(같은 날, 사용자가 "이어해"로 계속) —
  여기서 멈췄다.** 위 항목이 남긴 네 후보 중 (1) Awake() 중복 생성
  나머지 6곳, (3) 산신당 재설계, (4) Props 도입·DUNGEON 착수를 전부
  순서대로 끝냈다(사용자가 "세 후보 중 어느 것부터?" 질문에 "2,3,1번
  순으로"로 답해 동물 GLB 조사→Props→DUNGEON 착수 순, DUNGEON은 범위
  확인 질문에 "1,2번"으로 답해 기획 문서+실제 구현까지 진행). 자세한
  내용은 위 "완료 단계"의 각 항목·`docs/ASSET_GUIDE.md`·`docs/
  VERTICAL_SLICE_DUNGEON.md` 참고, 여기는 커밋만 나열한다 — 이번
  세션에서 나간 커밋: `a3d783e`(Awake 6곳 정리)·`e5bc9ef`(산신당
  재설계)·`1123711`(Props 도입)·`f6ff059`(DUNGEON 첫 슬라이스). 전부
  컴파일·씬 재빌드·PlaytestHeadless 통과 확인 후 그때그때 커밋·푸시.
  **사용자가 "유니티 에디터 열어서 직접 플레이해볼게"로 TestDungeon을
  직접 확인하러 간 뒤 "새로운 세션에서 다음꺼 이어 하자"로 끊어 여기서
  멈춘다.** **다음 세션이 볼 것**: (1) 이번 세션에 사람이 TestDungeon을
  직접 플레이해 본 소감/버그 리포트(카메라 각도·공격 버튼과 CameraRig
  드래그 판정이 실제로 안 겹치는지가 특히 코드 검토로만 확인하고 실제
  클릭 동작으로는 아직 확인 안 된 부분, 위 GUI 확인 목록 "DUNGEON 첫
  슬라이스" 항목 참고) — 있으면 그것부터, (2) 없으면 `docs/
  VERTICAL_SLICE_DUNGEON.md` "다음 슬라이스 후보" 절(오픈월드/바이옴·
  방 종류 다양화·엘리트/보스·부대 시스템 등) 중 다음 조각 — PLAN.md를
  다시 훑어 정할 것.
- **2026-09-12 네 번째 후속 세션(같은 날, "이어해"로 계속) — 여기서
  멈춘다.** 위 항목의 (1)을 먼저 확인(사람이 TestDungeon을 플레이해
  "특별한 문제 없음"으로 답함)한 뒤, (2) "다음 슬라이스 후보" 중
  어느 걸 먼저 할지 매번 물어(AskUserQuestion) 사용자가 그때그때
  "1,2,3,4 순서대로 다해"로 답한 대로 **두 차례에 걸쳐 아홉 슬라이스를
  전부 끝냈다**: 몬스터 무리→엘리트/보스→방 종류 다양화(우물·상자·
  성소)→회피(구르기)→오픈월드/필드(방 두 개+복도) → 스킬 다양화
  (강공격)→방 종류 나머지(행상, 곁다리로 Room1 상자/성소가 Room2
  몬스터 때문에 안 열리던 버그도 고침)→부대(다중 영웅) 최소 단위
  (동행 하나)→GLB 자산 도입(캐릭터, SagaGo의 Kenney Blocky Characters
  재사용). 자세한 내용은 위 "완료 단계"의 각 항목 참고, 여기는 커밋만
  나열: `b853f2e`·`b60e37e`·`7e48db3`·`1792a6e`·`50e6a63`(첫
  다섯)·`fecb240`·`a340aad`·`acf8467`·`c03fd5b`(나중 넷) — 전부
  컴파일·씬 재빌드·PlaytestDungeonHeadless 통과 확인 후 그때그때
  커밋·푸시(중간에 다른 세션의 saga-godot DUNGEON 작업과 두 번 병합,
  충돌 없음). **세션 중간에 사용자가 "한국어로 항상 진행사항 번역
  해줘 저장해서"로 재차 요청해 `feedback_always_respond_korean.md`
  메모리에 "도구 호출 description 필드도 한국어로" 항목을 명시적으로
  추가했다** — 이 요청이 반복된 원인으로 보였던 지점.
  **아홉 슬라이스 전부 사람이 GUI로 하나도 확인 안 했다** — 매
  조각마다 헤드리스 검증만 통과시키고 바로 다음으로 넘어갔다(위 GUI
  확인 목록에 아홉 항목이 새로 쌓임). 사용자가 "새로운 세션에서
  이어하자"로 끊어 여기서 멈춘다. **다음 세션이 볼 것**: (1) 이번
  세션 쌓인 아홉 슬라이스에 대한 사람의 플레이 소감/버그 리포트 —
  있으면 그것부터, (2) 없으면 남은 후보(바이옴 5종, 방 종류 마지막
  몇 종, 세공·행상 재고 굴리기·도감, 환경/건물 GLB — saga-godot이
  이미 받아 둔 `dungeon/{room-small,gate,corridor}.glb`가 12×12m
  방 기준이라 Unity 20×14m 방과 치수가 안 맞아 그대로 못 씀, 방 치수
  조정이나 GLB 재스케일이 먼저 필요) 중 사용자가 고르는 대로 —
  PLAN.md를 다시 훑어 정할 것.

## 알려진 오류

- 없음(SkyFogBuilder 추가분은 컴파일 자체가 미검증 — 위 참고).

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
- 2026-09-11 재확인 — `PlaytestHeadless.Run`을 `-executeMethod`로 부를 때
  `-quit`을 같이 주면 Run()이 반환하자마자(Play 모드 시작 전) 종료돼 OK/FAIL
  로그가 안 찍힌다(스크립트 주석에 이미 적혀 있던 주의사항, 실제로 한 번
  더 밟음) — `-quit` 없이 불러야 한다(Run() 자신이 EditorApplication.Exit로
  끝낸다). `CombineStaticBatches()` 추가 후에도 컴파일·PlaytestHeadless
  전부 통과.
- Phase 6(PlayerStats/ItemData/Inventory/LootTable + BanditEncounter·
  SaveState 통합) 추가 후 컴파일·PlaytestHeadless 재확인, 둘 다 통과.
  **`BuildTestVillageScene.Build()`는 이번엔 다시 안 돌렸다** — 씬
  하이어라키·GameObject 구성을 하나도 안 건드린 변경(Data 계층 로직만)
  이라 기존 커밋된 `TestVillage.unity`가 그대로 유효하다. (한 번 다시
  돌려 봤다가 이 씬 파일이 재실행마다 통째로 다시 짜여 fileID가 매번
  바뀌면서 14000줄대 순수 churn diff가 나는 걸 확인하고 되돌렸다 — 앞으로도
  씬 GameObject 구성 자체를 바꾸지 않는 변경에는 Build()를 다시 안 돌린다.)
  PlaytestHeadless는 플레이어가 안 움직여 도적 조우 자체가 안 일어나므로
  **경험치/레벨업/루트/자동장착의 실제 동작은 여전히 검증 못함**(컴파일
  통과 + 정적 씬 로드까지만 확인) — 사람이 직접 싸워 봐야 하는 부분.
- Phase 7 Quest(QuestState + VillagerTalk의 `Func<string>` 확장 +
  NpcBuilder 촌장 대사 + BanditEncounter 완료 처리 + SaveState v3) 추가
  후 첫 컴파일에서 `NpcBuilder.cs(89,13): error CS0104` — `Func` 쓰려고
  넣은 `using System;`이 기존 `Object.DestroyImmediate(...)`(암묵적으로
  `UnityEngine.Object`를 가리키던 것)와 `System.Object`를 놓고 충돌을
  일으켰다. `UnityEngine.Object.DestroyImmediate(...)`로 완전한 이름을
  써서 고침 — **`using System;`을 새로 추가하는 파일에 `Object.`로
  짧게 쓴 UnityEngine 호출이 있으면 항상 이 충돌을 의심할 것.** 고친
  뒤 컴파일·PlaytestHeadless(씬 재사용, Build() 다시 안 돌림) 둘 다
  통과. 촌장 대사 3단계 전환·퀘스트 완료도 역시 헤드리스로는 확인 못함.
- Phase 7 World Event/Hidden Area(WorldEventState + HiddenTreasure +
  BuildTestVillageScene 훅 + SaveState v4) 추가 후 컴파일 통과, 이번엔
  씬에 GameObject가 실제로 늘어(HiddenTreasure) `BuildTestVillageScene
  .Build()`를 다시 돌림 — `groundVerts=3136` 그대로(땅은 안 바뀜),
  PlaytestHeadless도 재저장된 씬으로 통과.
- 골드 경제/상인 거래/PlayerHud(GoldState/ShopState/PlayerHud +
  BanditEncounter·NpcBuilder·SaveState v5 통합) 추가 후 컴파일 통과,
  PlayerHud가 씬에 새 GameObject라 `BuildTestVillageScene.Build()` 재실행
  (groundVerts=3136 그대로), PlaytestHeadless도 통과.
- 채집(GatherState/Gatherable + BuildGatherables 훅 + SaveState v6) 추가
  후 컴파일 통과, 씬 재빌드(groundVerts=3136 그대로) 후 PlaytestHeadless
  통과.
- 산신당(TestMapData 'S' 타일 + LandmarksBuilder.BuildShrine +
  ShrineState/MountainShrine + SaveState v7) 추가 후 컴파일 통과, 씬
  재빌드에서 groundVerts=3136 그대로임을 확인(칸 하나 종류만 바뀌고
  격자 크기는 안 바뀌었다는 뜻) 후 PlaytestHeadless 통과.
- 동물(WanderingAnimal/AnimalBuilder + TestMapData.WorldToGrid + Build
  TestVillageScene.BuildAnimals) 추가 후 컴파일 통과, 씬 재빌드
  (groundVerts=3136 그대로) 후 PlaytestHeadless 통과 — 이번엔 Update()가
  매 프레임 도는 컴포넌트라 10프레임 동안 실제로 몇 번 실행돼 그 경로도
  오류 없음까지 확인됨(다른 조각들과 달리 정적 배치만이 아님).
- BanditEncounter를 EncounterUiKit로 리팩터(UI 조립 코드 이동, 동작
  동일) + Awake() 재등장 버그 고침 + RareWolfEncounter/RareWolfState/
  EncounterUiKit/ar_wolf 신규 + SaveState v8 추가 후 컴파일 통과, 씬
  재빌드(groundVerts=3136 그대로, BanditEncounter 리팩터가 UI 생성
  결과를 안 바꿨다는 뜻) 후 PlaytestHeadless 통과.
- 지도 크기 확장(TestMapData.Rows 남쪽 2줄 + BuildTestVillageScene의
  PlayerSpawn을 WorldPos() 계산식으로 교체) 추가 후 컴파일 통과, 씬
  재빌드에서 `groundVerts=3136→4032`로 정확히 7×9×4×4서브쿼드×4정점과
  일치함을 확인, PlaytestHeadless(`OK - 10 frames, no errors`)도 통과.
  이어서 origin에 먼저 올라온 saga-godot 지도 확장·saga-unity Sky/Fog
  병합 정리 커밋과 겹쳐 push가 거절돼 `git merge`로 `BuildTestVillageScene
  .cs`·`docs/PROJECT_STATE.md` 충돌을 손으로 풀고, 병합된 코드로 컴파일·
  씬 재빌드(`groundVerts=4032` 그대로)·PlaytestHeadless를 한 번 더 통과
  시킨 뒤 병합 커밋으로 push 완료.
- 동물 Flee/Group/Interaction(WanderingAnimal.cs State 확장, DialogueLabel
  자막 재사용) 추가 후 컴파일 통과 — 씬 GameObject 구성을 하나도 안
  건드린 변경이라 BuildTestVillageScene.Build()는 다시 안 돌림(기존
  TestVillage.unity 그대로 유효). PlaytestHeadless(`OK - 10 frames, no
  errors`) 통과 — 플레이어가 스폰 지점에서 안 움직여 사슴과의 거리가
  이미 FleeAlertRadius(16) 밖이라 이번 10프레임 동안 Flee 경로 자체는
  실행 안 됨(정상 — 실제 발동은 사람이 다가가 봐야 확인).
- 채집 자리 4호(herb_4, GatherSpots 배열에 한 줄 추가) 추가 후 컴파일
  통과, 씬에 GameObject가 늘어 `BuildTestVillageScene.Build()` 재실행
  (`groundVerts=4032` 그대로 — 땅은 안 바뀜), PlaytestHeadless(`OK - 10
  frames, no errors`)도 통과.
- 지도 크기 확장 동쪽 2칸(TestMapData.Rows 각 행 끝에 2글자씩 추가,
  9×7→9×9) 추가 후 컴파일 통과, 씬 재빌드에서 `groundVerts=4032→5184`로
  정확히 9×9×4×4서브쿼드×4정점과 일치함을 확인, PlaytestHeadless
  (`OK - 10 frames, no errors`)도 통과.
- WorldEventState 일반화(ShrineState·RareWolfState 삭제, SaveState v9)
  추가 후 컴파일 통과 — 씬 GameObject 구성을 하나도 안 건드린 변경이라
  BuildTestVillageScene.Build()는 다시 안 돌림. PlaytestHeadless
  (`OK - 10 frames, no errors`) 통과 — v8 세이브 파일을 실제로 로드해
  MigrateStep(8,...)이 세 bool을 worldFlags로 올바르게 접는지는 사람이
  구버전 세이브로 직접 확인해야 함(헤드리스 플레이는 새 게임 취급이라
  이 경로를 안 지나감).
- EastGroveRelic(신규, WorldEventState 일반화 이후 첫 재사용) 추가 후
  컴파일 통과, 씬에 GameObject가 늘어 `BuildTestVillageScene.Build()`
  재실행(`groundVerts=5184` 그대로 — 땅은 안 바뀜), PlaytestHeadless
  (`OK - 10 frames, no errors`)도 통과.
- 지도 크기 확장 셋째 조각(row8 문 개방 + row9~10 신규, 'F' 논밭 타일
  첫 사용) + 채집 자리 5호(herb_5) 추가 후 컴파일 통과, 씬 재빌드에서
  `groundVerts=5184→6336`으로 정확히 9×11×4×4서브쿼드×4정점과 일치함을
  확인, PlaytestHeadless(`OK - 10 frames, no errors`)도 통과.
- 동물 Group 재배치(AnimalDef.Offset, 사슴 세 번째 마리) + 나그네 NPC
  (WorldEventState 세 번째 재사용) 추가 후 컴파일 통과, 씬에 GameObject가
  늘어 `BuildTestVillageScene.Build()` 재실행(`groundVerts=6336` 그대로
  — 땅은 안 바뀜), PlaytestHeadless(`OK - 10 frames, no errors`)도 통과.
- 성황당 돌무더기(LuckyCairn 신규, WorldEventState 없이 쿨다운+가중치
  룰렛만) 추가 후 컴파일 통과, 씬에 GameObject가 늘어
  `BuildTestVillageScene.Build()` 재실행(`groundVerts=6336` 그대로 — 땅은
  안 바뀜), PlaytestHeadless(`OK - 10 frames, no errors`)도 통과.
- 소(AnimalDef를 Species/Scale/Color로 일반화 + cow_1 추가, WanderingAnimal.cs
  무변경) 추가 후 컴파일 통과, 씬에 GameObject가 늘어
  `BuildTestVillageScene.Build()` 재실행(`groundVerts=6336` 그대로 — 땅은
  안 바뀜), PlaytestHeadless(`OK - 10 frames, no errors`)도 통과.
- 캐릭터 GLB 도입(com.unity.cloud.gltfast 패키지 추가 + CharacterVisual.cs
  신규 + Player/NpcBuilder/BanditEncounter를 capsule→GLB로 교체 + Awake
  중복 생성 방어 추가) 후 컴파일 통과, 씬에 실제 3D 모델이 들어가
  `BuildTestVillageScene.Build()` 재실행(`groundVerts=6336` 그대로 — 땅은
  안 바뀜), PlaytestHeadless(`OK - 10 frames, no errors`)도 통과 — 이번엔
  Awake 가드 분기(`transform.Find("Visual") != null`)가 실제 Play
  진입으로 한 번 지나가는 것까지 확인됨.
- 환경/건물 GLB 도입(VegetationBuilder.cs를 결합 메시 베이크→GLB
  인스턴스화로 재작성 + LandmarksBuilder.cs의 굴 입구/벽/지붕/폐허 기둥/
  다리 교체 + 콜라이더 수동 추가 + Awake 중복 생성 방어) 후 컴파일 통과,
  씬 재빌드(`groundVerts=6336` 그대로 — 땅은 안 바뀜)에서 나무 45·바위
  48·다리 널판 44·굴 입구 1·벽 2·지붕 2·폐허 기둥 3·산신당 기둥 4를
  지도 데이터에서 직접 셈한 값과 정확히 대조해 확인, PlaytestHeadless
  (`OK - 10 frames, no errors`, static 배칭 호출도 에러 없음)도 통과.
- DUNGEON 오픈월드 확장 첫 조각(Room5·Room6, Corridor4·5, 층2 두목
  `wp_greatblade` 추가) 후 컴파일 통과(`error CS` 0건), 씬 재빌드
  (`room childCount=14` 그대로 — Room1 자식 수라 안 바뀜, GLB 못 찾음
  경고 0건), PlaytestDungeonHeadless(`OK - 10 frames, no errors`)도 통과.
- DUNGEON 오픈월드 확장 두 번째 조각(Room7·Room8, Corridor6·7, 층2
  정예 — 새 아이템 없이 기존 `wp_saber`·`DungeonVein.cs` 재사용) 후
  컴파일 통과(`error CS` 0건), 씬 재빌드(`room childCount=14` 그대로,
  GLB 못 찾음 경고 0건), PlaytestDungeonHeadless(`OK - 10 frames, no
  errors`)도 통과.
- DUNGEON 오픈월드 확장 세 번째 조각(Room9, Corridor8, `DungeonPuzzle.cs`
  재사용) 후 컴파일 통과(`error CS` 0건), 씬 재빌드(`room childCount=14`
  그대로, GLB 못 찾음 경고 0건), PlaytestDungeonHeadless(`OK - 10
  frames, no errors`)도 통과.
- DUNGEON 절차적 층 진행 전환(Room5~11 제거 → ProcRoom +
  `DungeonFloorRunner`, `DungeonFormulas.cs` 신규) 후 컴파일 통과,
  씬 재빌드(`room childCount=14` 그대로, GLB 못 찾음 경고 0건),
  PlaytestDungeonHeadless(`OK - 10 frames, no errors`) 통과.
  `SimulateDungeonFloors.cs`(신규, 씬 불필요) 첫 실행에서 78층 근처
  보상 int 오버플로(exp/gold가 음수로 뒤집힘) 발견 → `ClampToInt()`로
  고침 → 재실행 결과 `OK - 2층~100층 전부 통과, 방 856개 방문, 예외·
  NaN 없음`.
- `PlaytestDungeonFloorProgression.cs`(신규, 열한 번째 세션) 첫 실행에서
  `CharacterController` 순간이동 미반영(테스트 하니스 버그) + 문 자리에
  서 있으면 무전투 방이 자동 연쇄 진행되는 실제 게임 결함을 발견 →
  각각 고침 → 재실행 결과 `OK - 12 room advances, floor reached 4, no
  errors`(roomIndex 매번 정확히 1씩 증가, floor 2→3→4, cave·fight·
  well·forage·stair 등 실제 GameObject 경로로 확인). 회귀로
  `PlaytestDungeonHeadless`(`OK - 10 frames, no errors`)도 재확인.
- `PlaytestForestHouseTransition.cs`(신규, 열한 번째 세션) — `ForestHouse
  .cs`의 CharacterController 순간이동 결함 수정 뒤 `OK - entered and
  exited the house, position held across frames, no errors`. 회귀로
  `PlaytestForestHeadless`(`OK - 10 frames, no errors`)도 재확인.
- `PlaytestForestFurniture.cs`(신규, 열한 번째 세션, 가구 슬라이스) —
  과일을 채우고 좌판→자리를 오가며 구매→배치→점수→쿨다운 후 거두기까지
  확인, 처음엔 거두기 검증이 프레임 수 기반 대기라 실패(배치 모드가
  초당 약 5700프레임으로 실시간보다 훨씬 빠르게 돎을 확인) →
  `Time.time` 기준 대기로 고쳐 `OK - bought, placed and picked up
  furniture, score changed as expected, no errors`. 회귀로
  `PlaytestForestHeadless`·`PlaytestForestHouseTransition`·
  `PlaytestDungeonHeadless`·`PlaytestDungeonFloorProgression` 전부
  재확인.
- `PlaytestForestCreatures.cs`(신규, 열한 번째 세션, 몬스터·퓨전 슬라이스) —
  네 종 전부 배회 이동 확인(dokkaebi 3.32m·bawi 0.56m·beoseot 2.68m·
  kkot 3.71m) + 플레이어 접근 시 도주 확인(거리 1.00→4.50) →
  `OK - all four creatures wandered and fled correctly, no errors`.
  회귀로 `PlaytestForestHeadless`·`PlaytestForestHouseTransition`·
  `PlaytestForestFurniture`·`PlaytestDungeonHeadless`·
  `PlaytestDungeonFloorProgression` 전부 재확인.
