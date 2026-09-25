# PROJECT_STATE — saga-unity (상태만, ≤15KB, 덮어쓴다)

**규칙**(`../../SAGA-DESIGN.md` §9 상태 파일): 여기엔 **지금 상태만** 적고 세션이 끝나면 **덮어쓴다**. 날짜별 경위·판단 이유·대화 인용은 `docs/HISTORY.md` 에 append 한다(2026-09-16 재편 전 본문 5,532줄은 그쪽 첫 절에 그대로 있다). 넘치면 `tools/precheck.sh` 가 막는다.
마지막 갱신: 2026-09-25 (109-1 GO 세 시대 사람·적·소품 끝. 헤드리스 3연속, 실기 확인 전).

## 캐릭터 자산 — 이 PC 기준 (2026-09-19)

Maria·Abe·Brute + Skeleton·Paladin·PeasantMan·PeasantGirl·Archer·두목 Maw·Ganfaul·Ninja·Demon·AlienSoldier·Morak + FOREST 몸 여섯(Goblin·Hulk·Warrok·Parasite·Nightshade·Jolleen) + GO 세 시대 아홉(GasMask·Copzombie·ExoRed·Remy·Megan·SwatGuy·ExoGray·Vanguard·Crypto, `SetupEraBodies`) — `Assets/Art/CharactersRealistic/`, gitignore라 **PC마다 받는다**(앞 셋 `SetupXxxCharacterImport.cs`, 나머지 도구 README 레시피 → `Saga/Setup NPC Character Imports`·`Saga/Setup Forest Creature Models` → 씬 재빌드, 없으면 Kenney·도형 폴백). GUI 확인: Maria·Abe 만.

## 완료 요약 — 다섯 게임 × 진척

| 게임 | 씬 | Vertical Slice(Phase 1~8) | 51장 콘텐츠 확장 | 44장 에셋 교체 | 공통(66-2 라이팅·67~69 사운드/설정/Localization) |
|---|---|---|---|---|---|
| GO | `TestVillage` | 완료 — 도적의 습격(이동·촌장·상인·나그네·조우·전투·등용·EXP·장비·루트·저장 v13) | 동물 Group·나그네·은닉 보물·산신당·행운 돌탑·동굴 유물·채집 · 101-2 ④⑦③: 일과판·승급 3택·75초 토벌 · ①⑥⑧: 봉수대·인연·패배 비용·회수 · ②: 사당 시련(파도 3·인장 조각) · **107 ①~⑥ (2026-09-24)** 들판 전투 + 이동 + 지역 지도(세이브 v14) + 보물 상자 16 + 원소 쓰는 적 8 + 동료 몸 교체 · **107-7** 망루 수호장(v15)·106-9 등장 컷 · **107-8** 지역 사명 사슬(v16) · **108 ①** 지역 한자·사연·위험 1~3·몬스터 명단 + **지역 소품 무더기 9**(Poly Haven) · **109-1** 세 시대 적(무리 4/9)·역참 사람 15·소품 현대 13·시간 틈 잔해 9 | Player·주요 Enemy·Environment·Building 전부 GLB/PBR, Props Kenney 넷 + Poly Haven 스캔 열 벌(108 ①), Rocks/Vegetation은 procgen 트라이플레이너(102-4) | 전부 붙음. 목표판/세션카드(A·B). 101-3 C·F·G 전부 완료 |
| DUNGEON | `TestDungeon` | 완료 — 첫 방→무리·엘리트/보스·방 종류·회피·강공격·필드·동행 | 마을 넷·층 진행·매복·구출·수수께끼·은닉 창고·빌드·도감·보석/영웅 상태 · **101-2 전부 완료** · **106-5 탐험** 점프 F·담쟁이 등반·옛 감시탑 뜰 · **106-6** 무사·술사 파티, 명령 1·2, 소환 V · **106-7** 층 두목 등장 컷 · **108 ③** 명소 층 여섯(5~30층 고정 방 다섯·층 주인·첫 토벌 무기, v10) | Player·잡졸·미니보스/두목·Environment·Building · 103-1 방 셸 마모 3단 | 전부 붙음. 목표판/세션카드. 101-3 C·F·G 전부 완료 |
| FOREST | `TestVillageForest` | 완료(이동 전용) — 마을·집·주민 | 벽지/장판·가구 배치·생물·과일나무·채집·좌판·밀어내기 전투 · **101-2 전부 완료**(번들·채집 손맛·평가·택배 사슬·축제) · **108 ②** 존 한자·사연·짐승 명단·명소 넷·존 자막·존 소품 무더기 8 · **짐승 여덟 사실 모델**(Mixamo 몸 + 빛깔·꾸밈) | Environment 완료, 과일나무 procgen(102-4) | 전부 붙음. 목표판/세션카드. 101-3 해당 없음 |
| STORY | `TestField` | 완료 — 2.5D 횡스크롤(Z 고정)·잡졸 10·두목·사명 2·볼트·로프 | 척후병 NPC·사건·관계·선택·전직 · 관문 대장(5-4)·비경(5-3)·동료 교대(5-8) · **106-8 두목 등장 컷** · **106-10 교대 셋이 곁에서 싸움**(Paladin·Archer·Peasant Girl) + 소환 우레뿔 거수(V) · **5-2 전부**: 무예 1~4차(`StorySkillData`·`StorySkillState`·패널 K·칸 4 자동/고정)·전직 1~4차(Lv.10/15/20/25)·유파 세트·옷 빛깔(차수×12%) | 척후병·전직관·마을 사람·숲지기 Mixamo(106-4) | 전부 붙음. 목표판/세션카드. 101-3 C·F·G 전부 완료 |
| REALM | `TestCity` | 완료(경영형) — 명령·계략·문답 36·서고·월드맵·전투·함락 편입 | 적국 55·성 58 · 5-1·5-6·5-2·5-8·5-3·5-5 — **101-2 REALM 전부 완료**(5-4 제외 확정) | 도시 Environment/Building · 103-1 성벽 3단 | 전부 붙음. 목표판/세션카드. 101-3 해당 없음 |

렌더러: 66-1장 PC(Forward+·MSAA 4)/Mobile(Forward·MSAA 2) + `FF16Volume_*` + 데칼. 아트 방향 **사실적 PBR(FF16 톤)** — 66-2장·102장. Maria 피부 SSS는 `BuildMariaSssShaderGraph.cs`(Intensity=15). DUNGEON 카메라는 `CameraRig`→가상 카메라 `PlayerView`→`CinemachineBrain`(106-3), 컷은 `Cinematics/Timelines/Temple_*.playable`.

## 다음 작업 (우선순위, 상세는 PLAN 해당 장)

0. **다음 = PLAN 109장 2번(DUNGEON 세 시대)**, 그 뒤 표 순서대로(건너뛰기 금지).
0-1. **남은 것**: en 번역 사람 검수 전. GO 동료 몸 Maria.controller 리타깃·무기는 주인공 손에만. 다른 PC 는 Mixamo README 레시피를 받고 `Saga/Build Maria Traversal`·`Saga/Setup NPC Character Imports`.
1. STORY 판수(15→20 약 11판, 20→25 약 28판)가 무거우면 `StoryCombat.JobPromoteLevel3/4`만.
2. **101-2·104-1 잔여(보류)** — GO⑤(모바일 빌드 뒤)·`Characters/` Kenney(폴백 전용). 헤어카드는 분리 헤어 메시 생기면.

`ShotDir`(`Playtest*Gui.cs`)는 GUI 캡처 때마다 고친다.

## 알려진 오류

- **씬 빌더(에디터)에서 건 `onClick.AddListener`는 저장 안 된다** — 새 버튼은 `Saga.Core.ButtonWiring.Wire(button, 메서드)`(에디터면 영속·Play면 런타임, 인자 하나는 string/int 오버로드). 람다 불가(경고 남김) → 이름 있는 메서드로. 정적 메서드는 대상 컴포넌트 하나(`XxxSaveButton`). STORY는 `[SerializeField]`+`Awake()` 방식(둘 다 유효). 진단은 `Editor/ButtonWiringCheck.cs`(씬 전체 죽은 버튼 + 진짜 onClick).
- 영속 리스너 메서드 이름을 바꾸면 **씬 재빌드** 필요 — 안 하면 먹통(`ButtonWiringCheck`가 대상 메서드 존재까지 보니 진단이 잡는다).
- **`Destroy()`로 자식을 지우고 같은 프레임에 다시 그리면 쌓인다** — onClick 중이면 `DestroyImmediate` 말고 떼어 내고(`SetParent(null)`)·끄고 `Destroy`(`StoryLabyrinthMapUi.ClearChildren`).
- **함정**: Unity 6000.3.24f1 > 프로젝트 6000.3.23f1 → 배치/GUI 실행이 ProjectSettings/Packages를 조용히 고친다. `tools/unity-batch.sh --`로 부르면 자동 원복(`*_RPAsset` v13·GUI 실행은 수동 checkout).
- `Animator.GetBoneTransform()`은 `isHuman`으로 먼저 거를 것.
- 정적 상태의 `Restore()`가 관련 이벤트(`JobChosen`·`EquipmentChanged`·`StorySkillState.Changed`)를 쏴야 시각·UI가 안 낡는다.
- URP 런타임 타입엔 asmdef에 `Unity.RenderPipelines.Universal.Runtime` 필요(SagaDungeon/SagaGo). SagaStory는 asmdef 없음.
- 레벨업 컷 체크는 세션 첫 레벨업이어야. `GroundDecal` 캡 테스트는 델타 루프 밖.
- `PlaytestXxx`류는 `-quit` 없이 부른다. 에디터 빌드가 채우는 참조는 `[SerializeField]` 필수. `animator?.` 대신 `if (animator != null)`.
- 헤드리스가 진짜 버튼·공격을 누를 땐 적에게서 떨어져서. 두목 등장 컷은 진단 앞쪽에서 한 번 틀어 둔다.
- REALM 새 성은 `RealmEnemyCity.cs`·`RealmCityData.cs` 둘 다. DUNGEON 확인용 텔레포트는 `floorRunner.enabled=false` 먼저, `CameraRig` 확인용은 `_zoom`≤3·`_pitchDeg`≤30.
- 헤드리스가 `SaveState.Save()`를 부르면 실제 파일이 남는다 — try/finally로 원본 복원(GO·STORY 패턴).
- Shader Graph internal API는 리플렉션 우회(`BuildMariaSssShaderGraph.cs`) — 매번 `ShaderHasError`, 재빌드 뒤 GUI idle 900프레임.
- `PlaytestStorySlice` 가 가끔 `PartySwapWait` "더미가 안 죽음"(투사체 대기) — 재실행하면 통과.
- 배치가 가끔 시작 때 `Failed to resolve packages`로 exit 1 — 재실행.
- `CaptureScreenshot()`은 렌더 후 찍힌다 — 세팅·캡처를 다른 tick에.

## 테스트 상태 (배치 모드, Unity 6000.3.24f1)

| 검증 | 결과 |
|---|---|
| 컴파일·씬 다섯 재빌드 | exit 0(최근 FOREST 2026-09-24), 영속 리스너 32·17·10·39(2026-09-23) |
| `PlaytestStorySlice` | **3연속 OK(2026-09-25, 두목 Morak 뒤)** — `PlaytestStoryCompanions`·`PlaytestStorySummon`·`PlaytestStoryBossIntro`·`CheckOutfitTint`·`CheckUpperTiersAndPins`·`CheckPromotionAndSchools`·`CheckButtonWiring`(진짜 onClick)·`CheckJobSkills`·무예 세이브 왕복·옛 형식 로드 |
| `PlaytestDungeonHeadless` | **3연속 OK(2026-09-25, 두목 몸 셋 뒤)** — Landmarks·BossIntro·Party·Explore·NpcModels·Temple(+컷)·LockOn·EnemyTelegraph. 같은 씬 `FloorProgression` OK |
| GO `PlaytestHeadless` | **3연속 OK(2026-09-25, 세 시대 뒤)** — `PlaytestGo` Eras·RegionProps·RegionTraits·RegionMission(v16/v15)·Guardian·SlopesBiome·PartyBodies·ElementalFoe·Treasure·WorldMap(v16/v13)·Traversal·FieldCombat (항목은 각 파일 요약 주석) |
| `PlaytestForestHeadless` | **3연속 OK(2026-09-24, 존 소품 뒤)** — `PlaytestForestZones`·`ZoneProps` 포함 · `PlaytestForestCreatures` 3연속(models 8/8, 씨앗 고정) · Finish·Furniture·HouseTransition OK |
| REALM 헤드리스 | **4연속 OK(2026-09-23)** — `CheckButtonWiring`(네 판 공통) |
| GUI 실제 Play | GO 라이팅 톤·Maria idle/run/attack·Dungeon 카메라(뒷모습·yaw=180)·SSS 코·턱선 하이라이트(Intensity=15) |
| `BuildMariaSssShaderGraph.Build`+`Verify` | exit 0, `ShaderHasError=False`(2026-09-23) |

## 실기 확인 대기 (항목명만 — 경위는 HISTORY grep)

- GO: **세 시대(109-1) — 현대·미래 적 몸·발 미끄럼, 역참 사람 오가기·자리, 위험 줄 길이, 잔해 크기·청록 세기·차 크기** · **수호장 Maw 몸 — 걷기·발톱 공격 박자·원소 빛** · **마을 사람 셋 모델(106-4) — 3.4m 키·바라보는 쪽** · **지역 소품(108 ①) — 1.9배 크기·그을린 빛·번쩍임·모닥불 빛·여울 바위가 헤엄길 막는지·LOD** · **특색 지역(108 ①) — 자막 세 줄·지도 두 줄 겹침·위험 3 난이도** · **식생 바이옴(107-3) — 호박빛 세기·침엽수 반복감·풀 키·갈대·폰 프레임** · **지역 사명(107-8) — 위쪽 줄 겹침·보상 크기·셋째 단 상자 찾기** · **망루 수호장(107-7·106-9) — 5.4m 크기·탑 겹침·겉→속 알림·난이도·컷이 절벽에 박히는지** · **경사·바이옴(107-3) — 비탈 28°·돌 쐐기·내리막·지역 안개/햇빛(강 물안개 세기)** · **동료 모델(107 ⑥) — Abe 몸의 Maria 리타깃(등반·활공·수영)·교체 순간·날개 자리** · **원소 쓰는 적(107 ⑤) — 원소 빛 해골이 괴물로 읽히는지·방패 막대·상성 글자·2초 비틀·화상/젖음/감전 체감** · **보물 상자(107 ④)** · **지역 지도(107 ③) — 망루·M 지도 가독성** · **이동(107 ②) — 등반 클립이 벽에 붙는지·넘어오르기 0.45s·활공·수영 높이·스태미나·카메라 끼임** · **들판 전투(107 ①) — 3타 간격·예고 0.6s·적 체력·HUD 자리**, 옛 VS 항목, **폰에서 설정·승급 3택·저장 버튼**
- DUNGEON: **살수 Ninja(4.4m·옆차기)·층 주인 Demon(명소 빛 35%·뛰어 내려찍기 박자)·기계화 정찰병 Alien Soldier** · **능묘지기 Ganfaul 몸 — 3.5m·등장 컷 포효(공격 클립)** · **바위 거신 실루엣·발광** · **명소 층(108 ③) — 5층 주인 세기·방 다섯 길이·첫 토벌 무기 체감** · **층 두목 컷(106-7) — 3.8초 길이·어깨 너머 샷·올려다보는 샷이 벽에 안 박히는지·이름표** · **파티·소환(106-6) — 전용 클립(무사 방패 들기·방패로 받기·쓰러짐, 술사 시전 둘·걷기) 어색함, 게이지 속도(8타·34타), 도발·치유 체감, 파티 줄 가독성, 소환 컷 길이·거신 크기·한 방 세기** · **탐험(106-5) — 점프 손맛, 담쟁이 등반·넘어오르기, 돌·틈 난이도, 탑 불빛, 막이** · **사실 모델 NPC(동행 기사 걷기↔달리기 발 미끄럼·마을 사람·포로 무릎→기쁨·행상 서는 자리·해골 파수꾼 크기/칠)**, **컷 셋(능묘 도착 4.5s·상자 2.6s·능묘지기 등장 5.2s) 길이·레터박스·"아무 키로 넘김"·상자 카메라가 벽에 안 박히는지·손떨림 세기**, **잊힌 능묘 한 바퀴(블록·벽력탄 심지·능묘지기 사이클·열쇠 줄)**, **락온(카메라 추적·예고 0.5s·완벽 회피 반격·옆걸음 발 미끄럼)**, 옛 VS·101 항목(목록은 HISTORY), **폰에서 공격·강공격·회전베기·회피·저장·설정·축복 버튼**
- FOREST: **숲지기 모델** · **존 소품 — 실측 크기·휨 따라 내림·걸림** · **짐승 여덟 모델 — 키·꾸밈 자리·안개유령 투명도·숲 톤** · **특색 존(108 ②) — 명소 크기·휨 따라 내림이 가까이서 튀는지·점광 세기·자막 세 줄**, 벽지/장판, 가구 배치, 생물·과일나무·좌판, 목표판/세션카드, 번들, 채집 손맛, 평가 별점, 택배 사슬, 축제(달력 1·8·15일), 과일나무·바크 톤, 잔디 디테일 톤, **폰에서 저장·설정·밀어내기 버튼**
- STORY: **황건 두목 Morak(2.24m·훅 박자)** · **척후병·전직관 모델(106-4)** · **곁의 동료·소환(106-10) — 자리·겹침·화살·판수 · 거수 강림·내려찍기 박자·게이지** · **두목 등장 컷(106-8) — 3/4 로 도는 것·4.2초·블렌드** · 두목 크기·타격감, 사건·관계·선택, 전직 팝업, 목표판/세션카드, 타격 체감, 유품·데칼·레벨업 줌·직업별 무기, 관문 대장, 비경 지도·축복·아레나, 교대 버튼·서명, **무예 패널(K·"무예" 버튼·전직관)·무예 칸 넷·직업 무예 22 손맛·모바일 버튼·비경 노드 연속 탭**, **2차 전직(Lv.15, 전직관 2택)·2차 무예 19 손맛·유파 세트 체감·전우/천뢰 범위·Lv.10→15 비경 약 4판이 적당한지**, **3·4차 전직(Lv.20/25)·3·4차 무예 44 손맛·무예 패널 차수 탭·"칸" 고정 조작·4세트 체감·15→20/20→25 판수·전직 차수 옷 빛깔(4차 48%가 과하거나 약하지 않은지)**
- REALM: 월드맵, 적국 사슬, 패널 여덟, 목표판/세션카드, 공격·계략, 특성·야망, 전술 토글, 서사 카드, 계승 토글, 일기토·설전, 승리 결과 카드, 성벽 실루엣, 오빗 카메라 pull-in, **폰에서 버튼 전부**
- 공통: 폰 발열(30fps·"저" 버튼), BGM 음량, 설정 패널 6줄, SessionCard DoF, 접지 blob 그림자(Mobile 품질), LUT 톤 5장, Screen Space Shadows, Maria 피부 SSS
