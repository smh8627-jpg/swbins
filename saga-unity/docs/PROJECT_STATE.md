# PROJECT_STATE

PLAN.md 규칙(33장 토큰 절약 규칙 10)에 따라 여기에는 완료 단계 / 현재 작업 /
다음 작업 / 알려진 오류 / 테스트 상태만 짧게 적는다. 긴 설명은 남기지 않는다.

## 완료 단계

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

- **DUNGEON 다음 슬라이스 후보** (`docs/VERTICAL_SLICE_DUNGEON.md`
  "다음 슬라이스 후보" 절 참고) — 몬스터 무리(4마리)는 2026-09-12에
  끝냈다(위 "완료 단계" 참고). saga-dungeon 웹판 PLAN.md 챕터 순서
  (14~34장)를 참고해 남은 후보: 오픈월드/필드, 바이옴 5종, 방 종류
  다양화(보물·성소·정예방 등), 엘리트/보스, 부대(다중 영웅) 시스템,
  세공·행상·도감, 회피(구르기), GLB 자산(Modular Dungeon Kit 후보) 중
  사용자가 고르는 대로.
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
- **VERTICAL_SLICE.md 완료 조건(12단계 루프) + Phase 6(59~67단계 Stats/
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
