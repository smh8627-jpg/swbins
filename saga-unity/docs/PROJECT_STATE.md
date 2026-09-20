# PROJECT_STATE — saga-unity (상태만, ≤15KB, 덮어쓴다)

**규칙**(`../../SAGA-DESIGN.md` §9 상태 파일): 여기엔 **지금 상태만** 적고 세션이 끝나면 **덮어쓴다**. 날짜별 경위·판단 이유·대화 인용은 `docs/HISTORY.md` 에 append 한다(2026-09-16 재편 전 본문 5,532줄은 그쪽 첫 절에 그대로 있다). 넘치면 `tools/precheck.sh` 가 막는다.
마지막 갱신: 2026-09-21 (여섯 세션째, 이어서 — DUNGEON 5.6 → FOREST 5.6 → **STORY 5-8 "동료 교대"** 구현, 셋 다 101-2 전부 닫힘) — DUNGEON·FOREST 경위는 아래 표·HISTORY grep. STORY 5-8: 이 트랙엔 인물 로스터도, 플레이어가 맞는 판정 자체도 없어(`StoryCombat.StartHp` 주석) 웹판의 "인물 셋 편성+개별 체력"을 **항상 갖춘 고정 역할 셋**(선봉·유격·호법, 공격 배율만 다름)으로, "서명 1발"을 그 역할의 기존 무예(횡소/기탄/기합)를 MP 없이 즉시 발동으로 좁혔다. 새 `StoryPartyState`(교대 쿨 4초). 헤드리스 전부 재확인.

## 캐릭터 자산 — 이 PC 기준 (2026-09-19)

Maria(플레이어)·Abe(잡졸)·Brute(두목) 셋만 mixamo.com 실자산 확보(`Assets/Art/CharactersRealistic/`, `.gitignore`로 로컬 전용 — **PC마다 새로 받아야 함**, 목록은 `SetupXxxCharacterImport.cs`). GUI 육안 확인: Maria idle/run/attack 정상. Abe/Brute는 Dungeon 배치 확인, **전신 구도 스크린샷은 아직 못 얻음**(`PlaytestDungeonEnemiesGui.cs`). 경위는 HISTORY.md grep.

## 완료 요약 — 다섯 게임 × 진척

| 게임 | 씬 | Vertical Slice(Phase 1~8) | 51장 콘텐츠 확장 | 44장 에셋 교체 | 공통(66-2 라이팅·67~69 사운드/설정/Localization) |
|---|---|---|---|---|---|
| GO | `TestVillage` | 완료 — 도적의 습격(이동·촌장·상인·나그네·조우·전투·등용·EXP·장비·루트·저장 v13) | 동물 Group·나그네·은닉 보물·산신당·행운 돌탑·동굴 유물·채집 · **101-2 ④⑦③(2026-09-19)**: 일과판·승급 3택·75초 토벌 · **101-2 ①⑥⑧(2026-09-20)**: 봉수대(`BeaconTower`)·인연(`BondState`)·패배 비용·회수(`DropState`/`DropMarker`) · **101-2 ②(2026-09-20)**: 사당 시련(`ShrineTrialState`/`ShrineTrialEncounter`, 파도 3·인장 조각) | Player·주요 Enemy·Environment·Building·Props 전부 GLB/PBR | 전부 붙음. **목표판/세션카드(101-2 A·B)**. **101-3 C·F·G 전부 완료(2026-09-17)** |
| DUNGEON | `TestDungeon` | 완료 — 첫 방→무리·엘리트/보스·방 종류(우물·상자·성소·행상)·회피·강공격·필드(방 2+복도)·동행 | 마을 넷·층 진행·매복·구출·수수께끼·은닉 창고·빌드(회전베기)·도감·보석/영웅 상태 · **101-2 전부 완료(5.6, 2026-09-21로 마감)** | Player·잡졸(황건적)·미니보스/두목·Environment·Building | 전부 붙음(SFX 실클립 통일). **목표판/세션카드(101-2 A·B, 5.6에서 일일/주간 실값 배선)**. **101-3 C·F·G 전부 완료(2026-09-17)** |
| FOREST | `TestVillageForest` | 완료(이동 전용 컨트롤러) — 마을·집·주민 | 벽지/장판·가구 자유 배치(1m 격자)·생물(Flee/Group)·과일나무·채집·좌판·밀어내기 전투 · **101-2 전부 완료(5.6, 2026-09-21로 마감)**: 마을 번들·채집 손맛·마을 평가·택배 사슬·축제(`ForestFestivalState`, 세배·꽃놀이·소원) | Environment 완료 | 전부 붙음. **목표판/세션카드(A·B)**. 101-3 해당 없음 |
| STORY | `TestField` | 완료 — 2.5D 횡스크롤(Z 고정)·잡졸 10·두목·사명 2·볼트·로프 | 척후병 NPC·사건·관계·선택(51장 완결)·전직(Lv.10, 무사/궁수/협객/방사) · 관문 대장(5-4, 주간 챔피언) · 비경(5-3, 노드 지도 5층) · **5-8(2026-09-21)** 동료 교대(`StoryPartyState`, 선봉/유격/호법 — MP 없는 서명 발동) — **101-2 STORY는 5-2(보류)만 남고 전부 소진** | 척후병 실제 모델 | 전부 붙음. **목표판/세션카드(101-2 A·B)**. **101-3 C·F·G 전부 완료(2026-09-18)** |
| REALM | `TestCity` | 완료(경영형, 캐릭터 없음) — 명령·계략(유언비어·화계)·문답 36·서고·월드맵·전투·함락 편입 | **적국 55, 성 58**(세 사슬 닫힘) · 5-1 특성·야망 · 5-6 지형 전술 · 5-2 이벤트 체인 · 5-8 계승(허창 배치 승계+치안 하락, 기본 꺼짐) · 5-3 일기토·설전 · **5-5(2026-09-20)** 승리 조건·결과 카드(`RealmVictoryState` — 101-2 REALM 전부 완료, 5-4만 제외) | 도시 Environment/Building | 전부 붙음. **목표판/세션카드(A·B)**. 101-3 해당 없음 |

렌더러: 66-1장 PC(Forward+, MSAA 4)/Mobile(Forward, MSAA 2) 이중 프로파일 + `FF16Volume_PC/Mobile.asset` + `DecalRendererFeature`(다섯 판 전부 적용). 아트 방향은 **사실적 PBR(FF16 톤)** — 66-2장·102장.
DoF(105 Q-U5): PC 프로파일에만 `DepthOfField` 오버라이드 — `SessionCard.Show()`/`Hide()`가 토글.
캐릭터 파이프라인: Mixamo(Maria·Abe·Brute) → `MixamoRigUtil.RigCharacter()` → Animator 8클립.

## PLAN 101-3 — 다섯 판 적용 현황 (2026-09-18 기준, 이제 전부 닫힘)

| 항목 | GO | DUNGEON | STORY | FOREST/REALM |
|---|---|---|---|---|
| C hitstop·shake·flash·팝·VFX | 완료 | 완료 | 완료 | 해당 없음 |
| F 죽음(유품 마커) | 완료 | 완료 | **완료(2026-09-18, `StoryLootMarker`)** | 해당 없음 |
| G 지형 반응(데칼) | 완료 | 완료 | **완료(2026-09-18, `StoryGroundDecal`)** | 해당 없음 |
| G 성장 연출(레벨업 컷) | 완료 | 완료 | **완료(2026-09-18)** — `StoryCameraFollow.ZDistance` 상수→가변 필드, `PlayLevelUpCut()` | 해당 없음 |
| G 장비 가시화 | 완료(등급 3단) | 완료(등급 3단) | **완료(2026-09-18)** — 등급 대신 "직업별 무기"(재해석, 사용자 확정) | 해당 없음 |

STORY 세부(경위는 HISTORY grep): `StoryJobState.JobChosen` 이벤트로 `Restore()`도 무기 시각 갱신 배선, `StoryWeaponVisual`은 primitive 조합(검/활/표창/지팡이).

## 다음 작업 (우선순위, 상세는 PLAN 해당 장 · 경위는 HISTORY 날짜 grep)

1. **PLAN 101-2 이어서** — GO①②④⑥⑦⑧·**DUNGEON·FOREST·REALM 전부**·**STORY 5-1,5-3,5-4,5-5,5-7,5-8** 완료. **2026-09-20 결정으로 게이트 무시 진행 허용**(101-2 서두) — 남은 건 GO⑤(모바일 빌드 뒤)·STORY5-2(웹·godot 둘 다 미확정, 보류)뿐. 다섯 판 101-2는 사실상 다 닫혔다 — 다음 세션은 실기 확인이나 104-1/105 열린 질문 쪽으로 넘어갈 것.
2. **실기 GUI 확인 몰아서** — "실기 확인 대기" 전부(아래 목록, GO 일과판 신규 포함). 사용자 몫.
   - **다른 PC로 이어받으면** `CharactersRealistic/`가 비어 있음 — mixamo.com에서 새로 받을 것(로그인은 사람 몫). 목록은 `SetupXxxCharacterImport.cs`의 `AnimMap`/`BodyFileName`.
   - Dungeon Abe/Brute **전신 구도 스크린샷은 아직 못 얻음**(카메라 클로즈업, 파편만 확인) — `PlaytestDungeonEnemiesGui.cs`의 `TeleportPos`/줌 더 조정하면 재시도 가능.
3. **PLAN 104-1 ⑤·102-4** — `Assets/Art/*_candidates` 정리, 105 Q1 결정 대기.
4. **PLAN 105 열린 질문(Q3′·Q4·Q-U3·Q-U4)** — 전부 사용자 결정 대기(Q1은 2026-09-19 "당분간 병행, godot 검증을 unity 착수 신호로 인정"으로 사실상 처리 — 101-2 서두 참고. Q-U2는 2026-09-18 해결·삭제됨).

101-3(C·F·G)은 다섯 판 중 해당하는 GO·DUNGEON·STORY 셋 다 완전히 닫혔다 — 다음 세션이 새로 이어받을 101-3 잔여 작업은 없다.

## 알려진 오류

- 없음(컴파일·헤드리스 기준, 2026-09-20 재확인) — 아래 둘은 이미 고침.
- **자기 UI를 스스로 짓는 싱글턴은 `Instance`를 `Build()`(에디터 전용)뿐 아니라 `Awake()`에도 채울 것** — `StoryLabyrinthMapUi`가 `StoryJobChoiceUi`와 같은 함정(도메인 리로드 후 null)을 반복할 뻔함. `Awake() => Instance = this;` 잊지 말 것.
- **`Destroy()`로 자식을 지우고 같은 프레임에 다시 그리면 안 지워진 채 쌓인다** — `StoryLabyrinthMapUi.ClearChildren()`(`DestroyImmediate`로 고침), `StoryEnemy.IsDead`와 같은 결.
- **함정(오류 아님)**: Unity 6000.3.24f1 > 프로젝트 6000.3.23f1 → 배치 모드가 ProjectSettings/Packages 4파일을 조용히 고친다. `tools/unity-batch.sh --`로 부르면 자동 원복.
- `Animator.GetBoneTransform()`은 `isHuman`으로 먼저 거를 것(Humanoid 아니면 예외) — `CharacterVisual.FindOrCreateWeaponSocket()`이 가드.
- 정적 상태의 `Restore()`가 관련 이벤트(예: `JobChosen`·`EquipmentChanged`)를 안 쏘면 다른 컴포넌트가 낡은 시각 상태를 계속 든다(2026-09-18 `StoryWeaponVisual`, 2026-09-20 DUNGEON `HeroState.Restore()`도 같은 함정이라 고침) — 새 "상태 보고 시각 짓는" 컴포넌트는 그 상태의 Restore/로드 경로도 같은 이벤트를 쏘는지 확인.
- URP 런타임 타입(`DecalProjector` 등)엔 asmdef에 `Unity.RenderPipelines.Universal.Runtime` 필요(SagaDungeon/SagaGo). SagaStory는 asmdef 자체가 없어 무관.
- 레벨업 카메라 컷 헤드리스 체크는 "그 세션의 첫 레벨업"이어야 함(자연 발생 레벨업과 겹치면 zoomBefore==zoomAfter로 간헐 실패) — GO·DUNGEON·STORY 다 첫 레벨업으로 앞세움.
- `GroundDecal` 카운터 검증은 "캡 테스트"를 델타 비교 루프 밖 별도 시점에(캡 40개 스폰을 루프 중간에 끼우면 이후 델타가 캡에 눌어붙어 실패).
- `PlaytestXxx`류는 `-quit` 없이 부른다(스스로 Exit). 씬 `Build()`는 구성이 바뀔 때만. 에디터 빌드가 채우는 참조는 `[SerializeField]` 필수. `animator?.SetTrigger` 대신 `if (animator != null)`.
- REALM 새 성은 `RealmEnemyCity.cs`·`RealmCityData.cs` 둘 다(후자 누락 시 `AbsorbCity()` 조용히 실패).
- DUNGEON `DungeonFloorRunner`는 문 근접 시 `RepositionPlayerToEntry()`로 되돌린다 — 확인용 텔레포트는 `floorRunner.enabled=false` 먼저. `CameraRig` 기본값(zoom=6·pitch=55°)은 벽(4m) 위로 뜸 — 확인용은 `_zoom`≤3·`_pitchDeg`≤30.
- 헤드리스가 `SaveState.Save()`를 부르면 `persistentDataPath` 파일이 실제로 남는다 — `GameBootstrap.Start()`가 매번 `TryLoad()`하므로 원본 상태로 안 되돌리면 다음 실행이 오염된다(2026-09-19 GO).

## 테스트 상태 (2026-09-21, 배치 모드, Unity 6000.3.24f1)

| 검증 | 결과 |
|---|---|
| `-batchmode -nographics -quit` 컴파일 | exit 0, 오류 0(DUNGEON `DungeonDailyTaskState`·FOREST `ForestFestivalState`/`ForestWishStone` 추가 뒤 재확인) |
| `PlaytestHeadless`(GO) | 이전 세션(2026-09-20) 3연속 OK, 이번 세션엔 안 건드림 |
| `PlaytestDungeonHeadless`·`FloorProgression`·`FieldAmbush`·`Shortcut`·`Town2`·`Towns34` | **전부 재검증 OK**(2026-09-21, 5.6 뒤 — goal board 세 줄 체크 그대로 통과, 공유 경로(`Die()`·`Descend()`·`EndRun()`) 변경이라 하위까지 확인) |
| `PlaytestForestHeadless`·`Creatures`·`Finish`·`Furniture`·`HouseTransition` | **전부 재검증 OK**(2026-09-21, 5.6 뒤 — 신규 `CheckFestival()`이 `ForceDayForTest()`로 세배·꽃놀이·소원·D-day 문구까지 확인, 씬 재빌드 뒤 하위도 회귀 없음) |
| `PlaytestOverworldMap`(GO) | 이전 세션 1회 재검증 OK, 미변경 |
| `PlaytestStorySlice` | **OK**(2026-09-21, 5-8 뒤 — 신규 `PartySwapTest`/`PartySwapWait`가 MP-free 서명 발동·4초 쿨다운 거절/해제·세이브 round-trip까지 확인, 기존 sweep/bolt/brace/비경 전부 회귀 없음) |
| `PlaytestRealmSlice` | **3연속 OK**(2026-09-20, 5-5 뒤 — 전 적국 함락 시 정복 승리 확정+세이브 round-trip 신규 검증(SaveLoad 단계 편입). 문화 승리·"다음 달" 게이트는 임시 자가진단으로 한 번만 확인 뒤 지움, godot `_diag_victory.gd`와 같은 결) |
| GUI 실제 Play 확인 | GO 라이팅 톤·Maria idle/run/attack·**Dungeon Abe/Brute(`PlaytestDungeonEnemiesGui.cs`, 파편적 확인)**. 나머지 미확인 |

## 실기 확인 대기 (항목명만 — 경위는 HISTORY grep)

- GO: 조우·전투·등용 손맛, 상점·퀘스트 대사 3단계, 은닉 보물·산신당·돌탑·유물, 채집, 목표판/세션카드, hitstop 체감, 유품 마커·무기 소켓·지형 데칼(101-3 F·G), 일과판·승급 3택 UI, 75초 토벌 손맛(101-2 ③), 봉수대 점등·목표판 전환·인연 등급 토스트·패배 시 짐 드롭/회수(101-2 ①⑥⑧), **사당 시련 입구·파도 3 전투감·인장 조각/이정표 보상·실패 잠금(101-2 ②, 2026-09-20 신규, 첫 실기 확인)**
- DUNGEON: 카메라 각도, 아홉 슬라이스, 목표판/세션카드, hitstop·타격VFX·레벨업줌·무기소켓·지형데칼 체감(101-3 전체), 축복·유품·부적 던전·월드 보스·난입 체감(101-2 5.1~5.5), 전자창/동력장갑 모양·기계화 정찰병(5층부터) 체감(5.7), **일일 풀 3택·도장·주간 보상 토스트(5.6, 신규)**
- FOREST: 벽지/장판, 가구 배치, 생물·과일나무·좌판, 목표판/세션카드, 마을 번들(5.3), 채집 손맛(5.8①), 마을 평가판 별점(5.8②), 접수대·우체통 4·소포 3종·사슬 보너스 체감(5.7), **세배·꽃놀이·소원돌·목표판 D-day 문구 체감(5.6, 신규 — 실제 달력이 1·8·15일이어야 그날 행사를 볼 수 있다)**
- STORY: 두목 크기·타격감, 사건·관계·선택 흐름, 전직 팝업, 목표판/세션카드, hitstop/shake/flash/popup/타격 VFX 체감, 유품 마커·지형 데칼·레벨업 줌·직업별 무기(101-3 F·G), 관문 대장 승격 연출·방패 파괴 체감(5-4), 비경 노드 지도·축복 카드·아레나 순간이동(5-3), **선봉/유격/호법 교대 버튼·서명 손맛·HUD 교대 쿨다운 줄(5-8, 신규, 첫 실기 확인)**
- REALM: 월드맵, 적국 사슬 체감, 패널 여덟 조작, 목표판/세션카드, 공격·계략 고르기, 특성·야망(5-1), 전술 토글(5-6), 서사 카드 7종(5-2), 계승 토글(5-8, 기본 꺼짐), 일기토·설전(5-3), **승리 결과 카드·목표판 셋째 줄·"다음 달" 게이트(5-5, 2026-09-20 신규, 첫 확인 — 정복 55성/문화 정답 30)**
- 공통: BGM 음량, 설정 패널 6줄, Volume 프로파일 톤 일치, SessionCard DoF 체감
