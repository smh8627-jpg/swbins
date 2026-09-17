# PROJECT_STATE — saga-unity (상태만, ≤15KB, 덮어쓴다)

**규칙**(`../../SAGA-DESIGN.md` §9 상태 파일): 여기엔 **지금 상태만** 적고 세션이 끝나면 **덮어쓴다**. 날짜별 경위·판단 이유·대화 인용은 `docs/HISTORY.md` 에 append 한다(2026-09-16 재편 전 본문 5,532줄은 그쪽 첫 절에 그대로 있다). 넘치면 `tools/precheck.sh` 가 막는다.
마지막 갱신: 2026-09-17 (PLAN 101-2 A·B **다섯 판 전부 이식 완료** + **105 Q-U5 DoF 토글** + **PLAN 101-3 표 — DUNGEON 완결 + GO로 F·G 확장** + **PLAN 104-1 Phase 0 완료(④⑤ 제외)** — 다섯 게임 컴파일·씬 재생성·헤드리스 검증 완료).

## 완료 요약 — 다섯 게임 × 진척

| 게임 | 씬 | Vertical Slice(Phase 1~8) | 51장 콘텐츠 확장 | 44장 에셋 교체 | 공통(66-2 라이팅·67~69 사운드/설정/Localization) |
|---|---|---|---|---|---|
| GO | `TestVillage` | 완료 — 도적의 습격(이동·촌장·상인·나그네·조우·전투·등용·EXP·장비·루트·저장 v5+) | 동물 Group·나그네·은닉 보물·산신당·행운 돌탑·동굴 유물·채집·오버월드 지도 | Player·주요 Enemy·Environment·Building·Props 전부 GLB/PBR | 전부 붙음. **목표판/세션카드(101-2 A·B)**. **101-3 C·F·G 전부(hitstop·죽음 표식·성장 연출·무기 소켓·지형 반응 데칼, 2026-09-17 완료)** |
| DUNGEON | `TestDungeon` | 완료 — 첫 방→무리·엘리트/보스·방 종류(우물·상자·성소·행상)·회피·강공격·필드(방 2+복도)·동행 | 마을 넷·층 진행·매복·구출·수수께끼·은닉 창고·빌드(회전베기)·도감·보석/영웅 상태 | Player·잡졸(황건적)·미니보스/두목·Environment·Building | 전부 붙음(SFX 실클립 통일). **목표판/세션카드(101-2 A·B)**. **101-3 C·F·G 전부(hitstop·타격 VFX·죽음 표식·성장 연출·무기 소켓·지형 반응 데칼, 2026-09-17 완결)** |
| FOREST | `TestVillageForest` | 완료(이동 전용 컨트롤러) — 마을·집·주민 | 벽지/장판·가구 자유 배치(1m 격자)·생물(Flee/Group)·과일나무·채집·좌판·밀어내기 전투 | Environment 완료 | 전부 붙음. **목표판/세션카드(101-2 A·B)**. 101-3 해당 없음(실시간 근접 전투 없음) |
| STORY | `TestField` | 완료 — 2.5D 횡스크롤(Z 고정)·잡졸 10·두목·사명 2·볼트·로프 | 척후병 NPC·사건·관계·선택(51장 완결)·전직(Lv.10, 무사/궁수/협객/방사, `StoryJobChoiceUi` 팝업까지 실제 검증) | 척후병 실제 모델 | 전부 붙음. **목표판/세션카드(101-2 A·B)**. **hitstop/shake/flash/popup/타격 VFX(101-3 C)** — F·G는 **다음 세션 착수 예정**(아래 참고) |
| REALM | `TestCity` | 완료(경영형, 캐릭터 없음) — 명령·계략(유언비어·화계)·문답 36·서고·월드맵·전투·함락 편입 | **적국 24, 성 27**(51장 15차, 세 사슬 전부 막다른 끝) | 도시 Environment/Building | 전부 붙음. **목표판/세션카드(101-2 A·B — "월간 요약 카드"로 변형)**. 101-3 해당 없음(캐릭터·실시간 전투 없음) |

렌더러: 66-1장 PC(Forward+, MSAA 4)/Mobile(Forward, MSAA 2) 이중 프로파일 + `FF16Volume_PC/Mobile.asset` + `DecalRendererFeature`(2026-09-17, PC·Mobile 둘 다 — 프로젝트 공통 자산이라 다섯 판 전부 적용됨). 아트 방향은 **사실적 PBR(FF16 톤)** — 66-2장·102장.
DoF(105 Q-U5): PC 프로파일에만 `DepthOfField` 오버라이드 — `SessionCard.Show()`/`Hide()`가 토글.
캐릭터 파이프라인: Mixamo(Maria·Abe·Brute) → `MixamoRigUtil.RigCharacter()` → Animator 8클립.

## 현재 작업 — **다음 세션은 여기부터: STORY로 101-3 F·G 이식**

사용자가 "101-3 C·F·G를 GO·STORY로 확장"을 선택(2026-09-17). GO는 이번
세션에 F·G(성장 연출·장비 가시화·지형 반응) 전부 완료. **STORY는 다음
세션 몫** — Explore 조사(2026-09-17)로 이미 다음이 확인돼 있다(그대로
믿고 바로 착수, 재조사 불필요):

- **F 죽음** — straightforward. `Assets/Games/SagaStory/World/StoryEnemy.cs`
  `Die()`(~151-160행)가 지금은 순수 사운드 큐뿐. `transform.position`이
  `Destroy` 전까지 유효 — `StoryLootMarker.cs`(신규, DUNGEON/GO 사본) 만들어
  `Die()`에서 호출.
- **G 성장 연출** — 재해석 필요. `StoryJobState.LeveledUp` 이벤트는 이미
  있는데 구독자 0명. 카메라(`Assets/Games/SagaStory/World/
  StoryCameraFollow.cs`)는 오빗이 아니라 X/Y만 따라가는 고정 원근 카메라 —
  `ZDistance`(상수 16f)를 가변 필드로 바꾸고 `PlayLevelUpCut()`(그 필드를
  당겼다 되돌리는 코루틴, 피치/회전 없이 줌만)을 추가한 뒤 `GameBootstrap.cs`
  (지금은 save/설정/BGM만 로드)에 구독 배선.
- **G 지형 반응** — straightforward, **asmdef 문제 없음**(`SagaStory.asmdef`
  자체가 없어 전역 어셈블리로 컴파일되고 URP Runtime이 이미 잡힘). 플레이어
  (`StoryPlayerController.cs`)는 실제 `CharacterController`로 Z만 고정
  클램프하는 진짜 3D 이동, 바닥도 실제 박스 콜라이더(`StoryTerrainBuilder.cs`)
  라 데칼 투영 가능. 타격 흔적은 `StoryEnemy.TakeDamage()`에 걸면 됨(이미
  `popupPos` 계산 중). `StoryGroundDecal.cs`(신규, DUNGEON/GO 사본) 만들 것.
- **G 장비 가시화 — 여기만 사용자 결정 필요, 감으로 먼저 만들지 말 것.**
  STORY엔 `ItemData`/장비 시스템 자체가 없다(순수 job 스탯,
  `StoryJobState.Job`+`StoryCombat.JobsTier1`). 플레이어는 DUNGEON과 같은
  Humanoid Maria+Animator라 손 소켓 자체는 가능하지만, "무기 등급"이 아니라
  "직업별 다른 무기"(무사→검, 궁수→활, 협객→표창, 방사→지팡이 식)로
  재해석해야 한다 — 이걸 원하는지, 아니면 STORY는 G 장비 가시화를 아예
  건너뛸지 사용자에게 먼저 물어볼 것.

GO 구현 세부(완료, 참고용): `ItemData.Grade`(wp_wood=0/wp_iron=1/wp_relic=2),
`CharacterVisual.FindOrCreateWeaponSocket()`, `WeaponVisual`(DUNGEON과 달리
`Inventory.ItemGained` 구독 — "재장착"이 아니라 "주웠다" 이벤트라 무기
슬롯만 필터링), `CameraRig.PlayLevelUpCut()`, `GameBootstrap`이
`PlayerStats.LeveledUp` 구독(그동안 구독자 0명이었음), `LootMarker.cs`·
`GroundDecal.cs`(둘 다 신규 사본), 타격 흔적은 `BanditEncounter`/
`RareWolfEncounter.OnDuelEvent()`의 "hit"/"heavy" 케이스에 걸었다(GO는
프레임 단위 공격이 없어 `DuelRules.Step` 초당 판정 이벤트가 유일한 훅).
`SagaGo.asmdef`에 `Unity.RenderPipelines.Universal.Runtime` 추가 필요했음.

## 다음 작업 (우선순위, 상세는 PLAN 해당 장 · 경위는 HISTORY 날짜 grep)

1. **STORY로 101-3 F·G 이식** — 위 "현재 작업" 그대로. G-장비 가시화만
   먼저 사용자에게 방향 확인.
2. **실기 GUI 확인 몰아서** — "실기 확인 대기" 전부. 사용자 몫.
3. **PLAN 104-1 ⑤·102-4** — `Assets/Art/*_candidates` 정리, 105 Q1 결정 대기.
4. **REALM 51장 더 늘리기** — 세 사슬 전부 막다른 끝. 사용자와 방향 상의 필요.
5. **PLAN 105 열린 질문(Q1·Q3′·Q4·Q-U2·Q-U3·Q-U4)** — 전부 사용자 결정 대기.

## 알려진 오류

- 없음(컴파일·헤드리스 기준, 2026-09-17 GO 101-3 확장 뒤 재확인).
- **함정(오류 아님)**: 이 PC Unity 6000.3.24f1 > 프로젝트 6000.3.23f1 → 배치 모드가 `ProjectSettings/ProjectVersion.txt`·`EditorSettings.asset`·`Packages/manifest.json`·`packages-lock.json` 을 조용히 고친다. **`tools/unity-batch.sh -- <Unity 인자...>`로 부르면 자동 원복** — 매번 손으로 `git checkout` 안 해도 됨(2026-09-16 신설, 이번 세션부터 실제 사용 시작).
- **`Animator.GetBoneTransform()`은 `isHuman`으로 먼저 거를 것** — Animator가 있어도 Avatar가 없거나 Humanoid가 아니면 `InvalidOperationException: Avatar is null`을 던진다. `CharacterVisual.FindOrCreateWeaponSocket()`(DUNGEON·GO 둘 다)이 `animator.isHuman` 가드로 고쳐 둠.
- **URP 전용 런타임 타입(`DecalProjector` 등)을 쓰려면 asmdef 확인** — `SagaDungeon.asmdef`·`SagaGo.asmdef` 둘 다 `Unity.RenderPipelines.Universal.Runtime`을 추가로 넣어야 했다(원래 Volume용 `Core.Runtime`만 참조). `SagaStory`는 asmdef 자체가 없어(전역 어셈블리) 이 문제가 없음 — STORY 착수 시 헷갈리지 말 것.
- **레벨업 카메라 컷 헤드리스 체크는 "그 세션의 첫 레벨업"이어야 함** — 더미/적 처치 보상이 우연히 레벨 임계값과 맞아떨어지면(DUNGEON에서 실제로 겪음) 배치 모드 프레임 시간 편차로 두 레벨업 컷이 겹쳐 zoomBefore==zoomAfter로 간헐적 실패한다. DUNGEON(`CheckLevelUpCut`을 `CheckLootMarker`보다 앞으로)·GO(`CheckLevelUpCut`을 `CheckBanditLootMarker`보다 앞으로) 둘 다 이미 고쳐 뒀다 — STORY에 새로 넣을 때도 같은 순서 원칙 지킬 것(레벨업을 유발하는 다른 체크보다 반드시 먼저).
- `PlaytestHeadless`류는 `-quit` 없이 부른다(스스로 Exit). Play 진입 시 도메인 리로드 비활성화 후 끝에 원복.
- 씬 `Build()`는 GameObject 구성이 바뀔 때만 다시 돈다.
- 에디터 빌드 스크립트가 채우는 참조 필드는 반드시 `[SerializeField]`.
- **`animator?.SetTrigger(...)` 쓰지 말 것** — `if (animator != null)`로 명시.

## 테스트 상태 (2026-09-17 기준, 전부 배치 모드, 이 PC Unity 6000.3.24f1로 실제 실행)

| 검증 | 결과 |
|---|---|
| `-batchmode -nographics -quit` 컴파일(`tools/unity-batch.sh` 경유) | exit 0, 오류 0(GO 101-3 확장 뒤 재확인) |
| `PlaytestHeadless`(GO — hitstop·`CheckGroundDecal`·`CheckLevelUpCut`·`CheckBanditLootMarker`·`CheckWeaponVisual` 전부 포함) | **3연속 OK**(2026-09-17 GO 101-3 F·G 확장 뒤) |
| `PlaytestDungeonHeadless` | 5연속 OK(101-3 지형 반응 데칼 추가 뒤) |
| `PlaytestForestHeadless` | 3연속 OK |
| `PlaytestOverworldMap`(GO) | 1회 재검증 — OK |
| `PlaytestStorySlice` | 3연속 OK(101-3 F·G 확장 전 마지막 상태 — `StoryJobChoiceUi` 위젯 검증까지 포함) |
| `PlaytestRealmSlice` | 3연속 OK |
| GUI 실제 Play 확인 | GO 라이팅 톤·`TestCharacterRealistic`(Maria idle/run/attack) 만. 나머지 미확인 |

## 실기 확인 대기 (항목명만 — 경위는 HISTORY grep)

- GO: 조우·전투·등용 손맛, 상점·퀘스트 대사 3단계, 은닉 보물·산신당·돌탑·유물, 채집, **목표판/세션카드**, **hitstop 체감**, **유품 마커·무기 소켓·지형 데칼 실제로 보이는지(101-3 F·G, 2026-09-17 신규 — 이게 첫 실기 확인)**
- DUNGEON: 카메라 각도, 아홉 슬라이스 전부, **목표판/세션카드**, **hitstop·타격 VFX·유품 마커·레벨업 줌·무기 소켓·지형 데칼 체감(101-3 전체)**
- FOREST: 벽지/장판, 가구 자유 배치, 생물·과일나무·좌판, **목표판/세션카드**
- STORY: 두목 크기·타격감, 사건·관계·선택 흐름, 전직 팝업, **목표판/세션카드**, **hitstop/shake/flash/popup/타격 VFX 체감**
- REALM: 월드맵, 적국 사슬 진행 체감, 패널 여덟 실제 조작, **목표판/세션카드**
- 공통: BGM 음량 균형, 설정 패널 6줄, 두 Volume 프로파일 톤 일치, **SessionCard DoF 체감**
