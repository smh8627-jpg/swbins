# PROJECT_STATE — saga-unity (상태만, ≤15KB, 덮어쓴다)

**규칙**(`../../SAGA-DESIGN.md` §9 상태 파일): 여기엔 **지금 상태만** 적고 세션이 끝나면 **덮어쓴다**. 날짜별 경위·판단 이유·대화 인용은 `docs/HISTORY.md` 에 append 한다(2026-09-16 재편 전 본문 5,532줄은 그쪽 첫 절에 그대로 있다). 넘치면 `tools/precheck.sh` 가 막는다.
마지막 갱신: 2026-09-19 (이어서 **PLAN 101-2 ③ GO 75초 토벌** — `RareWolfEncounter`에 raid 모드(`DuelRules.Raid`): 75s 고정·저스트 회피(0.25s=완전 회피+기 30%, 밖은 절반만)·부위 3(다리/몸통/급소, 75/50/25% 문턱)·완파 보너스. GO 101-2 첫 세 항목(④⑦③) 전부 완료). 그 앞: ⑦승급 3택·④일과판. 그 앞: REALM 51장 16~35차 확장. Maria/Abe/Brute 실자산 확보·101-3 C·F·G 전부 적용은 그 앞 세션들.

## 캐릭터 자산 — 이 PC 기준 (2026-09-19)

Maria(플레이어)·Abe(잡졸)·Brute(두목) 셋만 mixamo.com 실자산 확보(`Assets/Art/CharactersRealistic/`, `.gitignore`로 로컬 전용 — **PC마다 새로 받아야 함**, 목록은 `SetupXxxCharacterImport.cs`). GUI 육안 확인: Maria idle/run/attack 정상(범용 Mixamo 스톡 수준). Abe/Brute는 Dungeon 배치 확인, **전신 구도 스크린샷은 아직 못 얻음**(`PlaytestDungeonEnemiesGui.cs`). 경위는 HISTORY.md grep.

## 완료 요약 — 다섯 게임 × 진척

| 게임 | 씬 | Vertical Slice(Phase 1~8) | 51장 콘텐츠 확장 | 44장 에셋 교체 | 공통(66-2 라이팅·67~69 사운드/설정/Localization) |
|---|---|---|---|---|---|
| GO | `TestVillage` | 완료 — 도적의 습격(이동·촌장·상인·나그네·조우·전투·등용·EXP·장비·루트·저장 v11) | 동물 Group·나그네·은닉 보물·산신당·행운 돌탑·동굴 유물·채집·오버월드 지도 · **101-2 ④⑦③ 전부 완료(2026-09-19)**: 일과판·승급 3택(`PerkState`)·75초 토벌(`RareWolfEncounter`+`DuelRules.Raid`) | Player·주요 Enemy·Environment·Building·Props 전부 GLB/PBR | 전부 붙음. **목표판/세션카드(101-2 A·B)**. **101-3 C·F·G 전부 완료(2026-09-17)** |
| DUNGEON | `TestDungeon` | 완료 — 첫 방→무리·엘리트/보스·방 종류(우물·상자·성소·행상)·회피·강공격·필드(방 2+복도)·동행 | 마을 넷·층 진행·매복·구출·수수께끼·은닉 창고·빌드(회전베기)·도감·보석/영웅 상태 | Player·잡졸(황건적)·미니보스/두목·Environment·Building | 전부 붙음(SFX 실클립 통일). **목표판/세션카드(101-2 A·B)**. **101-3 C·F·G 전부 완료(2026-09-17)** |
| FOREST | `TestVillageForest` | 완료(이동 전용 컨트롤러) — 마을·집·주민 | 벽지/장판·가구 자유 배치(1m 격자)·생물(Flee/Group)·과일나무·채집·좌판·밀어내기 전투 | Environment 완료 | 전부 붙음. **목표판/세션카드(101-2 A·B)**. 101-3 해당 없음(실시간 근접 전투 없음) |
| STORY | `TestField` | 완료 — 2.5D 횡스크롤(Z 고정)·잡졸 10·두목·사명 2·볼트·로프 | 척후병 NPC·사건·관계·선택(51장 완결)·전직(Lv.10, 무사/궁수/협객/방사, `StoryJobChoiceUi` 팝업까지 실제 검증) | 척후병 실제 모델 | 전부 붙음. **목표판/세션카드(101-2 A·B)**. **101-3 C·F·G 전부 완료(2026-09-18)** — C(hitstop/shake, 2026-09-17) + F 죽음(`StoryLootMarker`) + G 지형 반응(`StoryGroundDecal`, 발자국+타격 흔적) + G 성장 연출(`StoryCameraFollow.PlayLevelUpCut()`, ZDistance 가변화) + G 장비 가시화(`StoryWeaponVisual`, "직업별 무기": 무사→검·궁수→활·협객→표창·방사→지팡이) |
| REALM | `TestCity` | 완료(경영형, 캐릭터 없음) — 명령·계략(유언비어·화계)·문답 36·서고·월드맵·전투·함락 편입 | **적국 55, 성 58**(51장 35차 — **교주·남중·복양(막북) 세 사슬 전부 완전히 닫힘**, 트리 상세는 HISTORY 2026-09-18~19 grep) | 도시 Environment/Building | 전부 붙음. **목표판/세션카드(101-2 A·B — "월간 요약 카드"로 변형)**. 101-3 해당 없음(캐릭터·실시간 전투 없음) |

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

## REALM 51장 16~35차 — 국경 확장, 교주·남중·복양(막북) 세 사슬 전부 완전히 닫힘 (2026-09-18~19, 완료·요약만)

"성 하나당 목표 하나" 제약을 풀고(`RealmEnemyCity.TargetsFrom()`·공격/계략 고르기 패널) 신독 목표 넷(남중 사슬 닫힘, 29차)·노용→주오·전충→{서권,구속}(교주 사슬 닫힘, 30~32차)·막북 상군→북지·운중→{안문,정양}(복양 사슬 닫힘, 33~35차)까지 채웠다(적국 55·성 58). 경위는 `docs/HISTORY.md` 2026-09-18~19 grep. **남은 후보 없음** — 더 늘리려면 새 지역/축이 필요, 사용자 결정 대기.

## 다음 작업 (우선순위, 상세는 PLAN 해당 장 · 경위는 HISTORY 날짜 grep)

1. **PLAN 101-2 이어서** — GO 첫 세 항목(④⑦③) 전부 완료, 다음은 ①봉수대·②사당 시련·⑥인연·⑧패배 비용 중 사용자 결정 대기(⑤ GPS는 모바일 빌드 뒤). 다른 네 판의 101-2 둘째·셋째 항목(축복 3택·유품·관계 하트·직업 정체성·일기토 등, 101-2 표 참고)도 착수 가능.
2. **실기 GUI 확인 몰아서** — "실기 확인 대기" 전부(아래 목록, GO 일과판 신규 포함). 사용자 몫.
   - **다른 PC로 이어받으면** `CharactersRealistic/`가 비어 있음 — mixamo.com에서 새로 받을 것(로그인은 사람 몫). 목록은 `SetupXxxCharacterImport.cs`의 `AnimMap`/`BodyFileName`.
   - Dungeon Abe/Brute **전신 구도 스크린샷은 아직 못 얻음**(카메라 클로즈업, 파편만 확인) — `PlaytestDungeonEnemiesGui.cs`의 `TeleportPos`/줌 더 조정하면 재시도 가능.
3. **PLAN 104-1 ⑤·102-4** — `Assets/Art/*_candidates` 정리, 105 Q1 결정 대기.
4. **PLAN 105 열린 질문(Q3′·Q4·Q-U3·Q-U4)** — 전부 사용자 결정 대기(Q1은 2026-09-19 "당분간 병행, godot 검증을 unity 착수 신호로 인정"으로 사실상 처리 — 101-2 서두 참고. Q-U2는 2026-09-18 해결·삭제됨).

REALM 계략(Plot) 고르기 UI·51장 16~35차 확장(교주·남중·복양 세 사슬 완전히 닫힘, 새 후보 없음 — 더 늘리려면 새 지역/축 필요) 모두 완료됐다.

101-3(C·F·G)은 다섯 판 중 해당하는 GO·DUNGEON·STORY 셋 다 완전히 닫혔다 — 다음 세션이 새로 이어받을 101-3 잔여 작업은 없다.

## 알려진 오류

- 없음(컴파일·헤드리스 기준, 2026-09-19 재확인).
- **함정(오류 아님)**: 이 PC Unity 6000.3.24f1 > 프로젝트 6000.3.23f1 → 배치 모드가 `ProjectSettings/ProjectVersion.txt`·`EditorSettings.asset`·`Packages/manifest.json`·`packages-lock.json` 을 조용히 고친다. **`tools/unity-batch.sh -- <Unity 인자...>`로 부르면 자동 원복** — 매번 손으로 `git checkout` 안 해도 됨.
- **`Animator.GetBoneTransform()`은 `isHuman`으로 먼저 거를 것** — Animator가 있어도 Avatar가 없거나 Humanoid가 아니면 `InvalidOperationException: Avatar is null`을 던진다. `CharacterVisual.FindOrCreateWeaponSocket()`(DUNGEON·GO·STORY 셋 다)이 `animator.isHuman` 가드로 고쳐 둠.
- **정적 상태의 `Restore()`가 관련 이벤트를 안 쏘면 다른 컴포넌트가 낡은 시각 상태를 계속 든다** — 2026-09-18 STORY `StoryWeaponVisual` 개발 중 실제로 겪음: `StoryJobState.Restore()`가 `JobChosen`을 안 쏘던 시절엔, 세션 중간에 상태를 초기화해도(테스트가 하듯) 이미 지어진 무기 모델이 안 사라졌다. 앞으로 "장착/보유 상태를 보고 시각을 짓는" 컴포넌트를 새로 달 땐 그 상태의 `Restore()`/로드 경로도 같은 이벤트를 쏘는지 확인할 것.
- URP 전용 런타임 타입(`DecalProjector` 등)을 쓰려면 asmdef 확인 — `SagaDungeon.asmdef`·`SagaGo.asmdef` 둘 다 `Unity.RenderPipelines.Universal.Runtime`을 추가로 넣어야 했다. `SagaStory`는 asmdef 자체가 없어(전역 어셈블리) 이 문제가 없음.
- **레벨업 카메라 컷 헤드리스 체크는 "그 세션의 첫 레벨업"이어야 함** — 자연 발생 레벨업(예: 잡졸을 죽여 얻는 exp)과 순서가 겹치면 이미 진행 중인 컷을 보게 돼 zoomBefore==zoomAfter로 간헐 실패한다. GO·DUNGEON·STORY 셋 다 명시적으로 세션의 첫 레벨업으로 체크를 앞세워 두었다(STORY는 `PlaytestStorySlice.CheckLevelUpCut()`을 Phase.Init에서, 잡졸을 죽이기 시작하기 전에 부른다) — 새 판에 옮길 때도 같은 순서 원칙 지킬 것.
- **`GroundDecal`류 카운터 검증은 "캡 테스트"를 별도 시점에 돌릴 것** — per-hit ActiveCount 델타 비교 루프 중간에 캡(32)을 채우는 스폰 40개를 끼워 넣으면, 그 뒤 델타 비교가 캡에 눌어붙은 값(항상 32)과 비교하게 돼 실패한다(STORY 헤드리스 검증에서 실제로 겪음, `CheckGroundDecalCap()`을 루프 밖으로 뺐다).
- `PlaytestXxx`류는 `-quit` 없이 부른다(스스로 Exit). Play 진입 시 도메인 리로드 비활성화 후 끝에 원복.
- 씬 `Build()`는 GameObject 구성이 바뀔 때만 다시 돈다.
- 에디터 빌드 스크립트가 채우는 참조 필드는 반드시 `[SerializeField]`.
- **`animator?.SetTrigger(...)` 쓰지 말 것** — `if (animator != null)`로 명시.
- **REALM 새 성은 `RealmEnemyCity.cs`·`RealmCityData.cs` 둘 다 고칠 것** — `RealmCityState.AbsorbCity()`가 후자에 정의가 없으면 조용히 실패한다(에러 없음, 위 51장 17차 절 참고).
- **DUNGEON `DungeonFloorRunner`는 문 표지 구역 근접 시 `RepositionPlayerToEntry()`로 위치를 되돌린다** — 확인용 수동 텔레포트가 이 반경에 걸리면 조용히 스폰으로 복귀한다(2026-09-19 실제로 겪음). 확인 동안만 `floorRunner.enabled = false`.
- **DUNGEON `CameraRig` 기본값(zoom=6·pitch=55°)은 `DungeonRoomBuilder.WallHeight`(4m) 천장 위로 뜬다** — 벽지 텍스처만 꽉 찬 클로즈업이 찍힌다(2026-09-19 실제로 겪음). 확인용은 리플렉션으로 `_zoom`≤3·`_pitchDeg`≤30.
- **헤드리스 검증이 `SaveState.Save()`를 부르면 `persistentDataPath/save.json`이 진짜로 남는다** — `GameBootstrap.Start()`가 부팅마다 `TryLoad()`를 불러, 원본을(Save() 부르기 **전** 시점 기준으로, 없었으면 삭제까지) 안 되돌리면 다음 헤드리스 실행이 이 상태를 이어받아 다른 체크가 간헐적으로 깨진다(2026-09-19 GO `CheckDailyTasks` 개발 중 실제 발생).

## 테스트 상태 (2026-09-19 기준, 전부 배치 모드, 이 PC Unity 6000.3.24f1로 실제 실행)

| 검증 | 결과 |
|---|---|
| `-batchmode -nographics -quit` 컴파일 | exit 0, 오류 0(GO 75초 토벌 추가 뒤 재확인) |
| `PlaytestHeadless`(GO) | **3연속 OK**(2026-09-19, 75초 토벌 추가 뒤 — raid 모드·저스트 회피·수동 mitigation·부위 3 파괴+완파 보너스 새 검증 포함) |
| `PlaytestDungeonHeadless` | **재검증 OK**(2026-09-19, Abe/Brute 실자산으로 씬 재빌드 뒤 — 10 frames, no errors) |
| `PlaytestDungeonFloorProgression` | **재검증 OK**(2026-09-19, 같은 이유 — 12 room advances, floor 4, no errors, 런타임 스폰 경로 포함) |
| `PlaytestForestHeadless` | 이전 세션 기준 3연속 OK, 이번 세션 미변경 |
| `PlaytestOverworldMap`(GO) | 이전 세션 기준 1회 재검증 OK, 이번 세션 미변경 |
| `PlaytestStorySlice` | **3연속 OK**(2026-09-18, 101-3 F·G·장비가시화 확장 뒤 — 죽음 표식/지형 데칼/레벨업 줌/직업별 무기 전부 새 검증 포함) |
| `PlaytestRealmSlice` | **3연속 OK**(2026-09-19, 51장 16~35차 확장(교주·남중·복양 세 사슬 완전히 닫힘) 뒤 — 다중 목표 공격(전충·운중 목표 3, 최다 동률)·계략 고르기·잘못된 목표 거절·신규 성 30개 함락 전부 새 검증 포함) |
| GUI 실제 Play 확인 | GO 라이팅 톤·`TestCharacterRealistic`(Maria idle/run/attack)·**Dungeon Abe/Brute(2026-09-19, `PlaytestDungeonEnemiesGui.cs` 신규, 파편적 확인)**. 나머지 미확인(STORY 신규 101-3 F·G도 포함) |

## 실기 확인 대기 (항목명만 — 경위는 HISTORY grep)

- GO: 조우·전투·등용 손맛, 상점·퀘스트 대사 3단계, 은닉 보물·산신당·돌탑·유물, 채집, 목표판/세션카드, hitstop 체감, 유품 마커·무기 소켓·지형 데칼(101-3 F·G), 일과판·승급 3택 UI, **75초 토벌 손맛(저스트 회피 타이밍·부위 게이지·완파 보너스, 101-2 ③, 2026-09-19 신규 — 이게 첫 실기 확인)**
- DUNGEON: 카메라 각도, 아홉 슬라이스, 목표판/세션카드, hitstop·타격VFX·유품마커·레벨업줌·무기소켓·지형데칼 체감(101-3 전체)
- FOREST: 벽지/장판, 가구 배치, 생물·과일나무·좌판, 목표판/세션카드
- STORY: 두목 크기·타격감, 사건·관계·선택 흐름, 전직 팝업, 목표판/세션카드, hitstop/shake/flash/popup/타격 VFX 체감, **유품 마커·지형 데칼(발자국/타격 흔적)·레벨업 줌·직업별 무기(검/활/표창/지팡이) 실제로 보이는지(101-3 F·G, 2026-09-18 신규 — 이게 첫 실기 확인)**
- REALM: 월드맵, 적국 사슬 진행 체감, 패널 여덟 실제 조작, 목표판/세션카드, **공격·계략 고르기 패널(신독·전충·운중 등 다중 목표 성) 실제 조작감(51장 16~35차, 2026-09-18~19 신규 — 이게 첫 실기 확인)**
- 공통: BGM 음량, 설정 패널 6줄, Volume 프로파일 톤 일치, SessionCard DoF 체감
