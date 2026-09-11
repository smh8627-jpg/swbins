# PROJECT_STATE

PLAN.md 규칙(33장 토큰 절약 규칙 10)에 따라 여기에는 완료 단계 / 현재 작업 /
다음 작업 / 알려진 오류 / 테스트 상태만 짧게 적는다. 긴 설명은 남기지 않는다.

## 완료 단계

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

- **지도 크기 다음 조각.** 남쪽으로 2줄(row7~8) 늘리고 row7 공터엔
  채집 자리(herb_4)를 심었다 — 남은 후보는 (1) row8의 산을 열어 더
  남쪽으로 계속 늘리는 것, (2) 동쪽(Cols)으로도 늘려 보는 것(이번에
  검증한 "행 끝에만 보태면 기존 좌표 안 밀림" 원칙이 열 끝에 보태는
  것에도 그대로 적용될 것으로 보임 — 아직 실제로는 안 해 봄). 안개는
  이제 SkyFogBuilder의
  ExponentialSquared 밀도 방식이라(아래 병합 정리 항목 참고) "거리"
  숫자가 아니라 밀도가 새 지도 크기에 맞는지를 사람이 GUI 확인할 때
  같이 볼 것.
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
    "맞선다"를 눌러 승리까지 가 봐야 한다)
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
    지나도 재등장 안 하는지)
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
