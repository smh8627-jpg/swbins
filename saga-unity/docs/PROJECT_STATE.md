# PROJECT_STATE — saga-unity (상태만, ≤15KB, 덮어쓴다)

**규칙**(`../../SAGA-DESIGN.md` §9 상태 파일): 여기엔 **지금 상태만** 적고 세션이 끝나면 **덮어쓴다**. 날짜별 경위·판단 이유·대화 인용은 `docs/HISTORY.md` 에 append 한다(2026-09-16 재편 전 본문 5,532줄은 그쪽 첫 절에 그대로 있다). 넘치면 `tools/precheck.sh` 가 막는다.
마지막 갱신: 2026-09-19 (이어서 **REALM 51장 24차 확장** — 전충→비경·신독→건타라, 16~23차는 같은 날짜대). **Maria/Abe/Brute Mixamo 실자산 확보 + GUI 육안 확인**은 그 앞 세션. **PLAN 101-3 C·F·G — 다섯 판 전부 적용 완료**(이전 세션).

## 캐릭터 자산 — 이 PC 기준 (2026-09-19)

`Assets/Art/CharactersRealistic/`(`.gitignore`, 로컬 전용이라 **PC마다 새로 받아야 함**)가 이 PC엔 비어 있었다 — Maria(플레이어)·Abe(잡졸)·Brute(두목) 전부 mixamo.com에서 새로 받았다(로그인은 사람이, 검색·다운로드는 CDP 자동화 — 회사 관리 PC라 새 크롬 프로필을 띄우면 확장 프로그램·계정 인증이 끼어들어 `--disable-extensions --disable-sync`로 우회함). 셋 다 `SetupXxxCharacterImport.Setup()` 리깅 성공(에러 0). 씬 재빌드로 반영, GUI 스크린샷 육안 확인:
- Maria(idle/run/attack) — 갑옷·헤어 색 정상 렌더링. **다만 파판(FF16)급과는 거리가 멀다** — 범용 Mixamo 스톡 캐릭터+맨 조명 테스트 씬 수준(66-2장 "현실적 기대치" 표가 이미 경고한 그대로).
- Abe/Brute — Dungeon 씬에 배치 확인(Missing Prefab 없음), 실제 조명 아래 렌더링 확인(카메라 각도 문제로 전신 구도는 못 얻었으나 파편적으로 정상 표시 확인).
- 새 GUI 확인 도구 `Assets/Editor/PlaytestDungeonEnemiesGui.cs` 추가(Boss/Escort 근처로 플레이어 텔레포트 — 아래 "함정" 절 두 건 참고).

## 완료 요약 — 다섯 게임 × 진척

| 게임 | 씬 | Vertical Slice(Phase 1~8) | 51장 콘텐츠 확장 | 44장 에셋 교체 | 공통(66-2 라이팅·67~69 사운드/설정/Localization) |
|---|---|---|---|---|---|
| GO | `TestVillage` | 완료 — 도적의 습격(이동·촌장·상인·나그네·조우·전투·등용·EXP·장비·루트·저장 v5+) | 동물 Group·나그네·은닉 보물·산신당·행운 돌탑·동굴 유물·채집·오버월드 지도 | Player·주요 Enemy·Environment·Building·Props 전부 GLB/PBR | 전부 붙음. **목표판/세션카드(101-2 A·B)**. **101-3 C·F·G 전부 완료(2026-09-17)** |
| DUNGEON | `TestDungeon` | 완료 — 첫 방→무리·엘리트/보스·방 종류(우물·상자·성소·행상)·회피·강공격·필드(방 2+복도)·동행 | 마을 넷·층 진행·매복·구출·수수께끼·은닉 창고·빌드(회전베기)·도감·보석/영웅 상태 | Player·잡졸(황건적)·미니보스/두목·Environment·Building | 전부 붙음(SFX 실클립 통일). **목표판/세션카드(101-2 A·B)**. **101-3 C·F·G 전부 완료(2026-09-17)** |
| FOREST | `TestVillageForest` | 완료(이동 전용 컨트롤러) — 마을·집·주민 | 벽지/장판·가구 자유 배치(1m 격자)·생물(Flee/Group)·과일나무·채집·좌판·밀어내기 전투 | Environment 완료 | 전부 붙음. **목표판/세션카드(101-2 A·B)**. 101-3 해당 없음(실시간 근접 전투 없음) |
| STORY | `TestField` | 완료 — 2.5D 횡스크롤(Z 고정)·잡졸 10·두목·사명 2·볼트·로프 | 척후병 NPC·사건·관계·선택(51장 완결)·전직(Lv.10, 무사/궁수/협객/방사, `StoryJobChoiceUi` 팝업까지 실제 검증) | 척후병 실제 모델 | 전부 붙음. **목표판/세션카드(101-2 A·B)**. **101-3 C·F·G 전부 완료(2026-09-18)** — C(hitstop/shake, 2026-09-17) + F 죽음(`StoryLootMarker`) + G 지형 반응(`StoryGroundDecal`, 발자국+타격 흔적) + G 성장 연출(`StoryCameraFollow.PlayLevelUpCut()`, ZDistance 가변화) + G 장비 가시화(`StoryWeaponVisual`, "직업별 무기": 무사→검·궁수→활·협객→표창·방사→지팡이) |
| REALM | `TestCity` | 완료(경영형, 캐릭터 없음) — 명령·계략(유언비어·화계)·문답 36·서고·월드맵·전투·함락 편입 | **적국 43, 성 46**(51장 24차 — 교주 사슬 남해→{창오→울림→교지→구진→일남→상림→전충→비경, 합포}, 남중 사슬 주제→건녕→{월수,장가,운남→영창→신독→건타라}(건녕 목표 셋 — 형제 가지가 셋으로 늘어난 첫 사례)) | 도시 Environment/Building | 전부 붙음. **목표판/세션카드(101-2 A·B — "월간 요약 카드"로 변형)**. 101-3 해당 없음(캐릭터·실시간 전투 없음) |

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

STORY 세부: `StoryJobState.JobChosen` 이벤트 신설(전직·세이브 로드 둘 다 배선) — `Restore()`도 이 이벤트를 쏘도록 고쳐야 했다(안 그러면 세션 중 상태 리셋 뒤 손의 무기가 새 Job과 안 맞고 그대로 남는 버그를 헤드리스 검증에서 실제로 잡았다). `StoryWeaponVisual`은 무기 메시 자산이 없어 DUNGEON/GO `WeaponVisual`과 같은 결로 primitive를 코드로 짓는다(검=자루+칼날, 활=활대+시위, 표창=회전한 사각판, 지팡이=샤프트+구슬).

## REALM 51장 16~24차 — 국경 확장 (2026-09-18~19, 완료·요약만)

"성 하나당 목표 하나" 제약을 풀고(`RealmEnemyCity.TargetsFrom()` 복수 반환, `RealmCommandUi` 공격·계략 고르기 패널) 교주·남중 두 사슬을 남해/주제에서 각각 비경·건타라까지 뻗었다(적국 43·성 46, 위 표 참고). 24차: 전충→비경(다른 이웃 서권·구속은 잎사귀), 신독→건타라(계빈으로 더 뻗을 여지 남음). 경위는 `docs/HISTORY.md` 2026-09-18~19 grep. 남은 후보: 노용(잎사귀)·건타라→계빈·신독의 다른 이웃 대하/마게타/사위.

## 다음 작업 (우선순위, 상세는 PLAN 해당 장 · 경위는 HISTORY 날짜 grep)

1. **실기 GUI 확인 몰아서** — "실기 확인 대기" 전부(아래 목록, STORY·REALM 신규 항목 포함, REALM엔 계략 고르기 패널·17~24차 신규 성 열여덟도 포함). 사용자 몫.
   - **다른 PC로 이어받으면** `CharactersRealistic/`가 비어 있음 — mixamo.com에서 새로 받을 것(로그인은 사람 몫). 목록은 `SetupXxxCharacterImport.cs`의 `AnimMap`/`BodyFileName`.
   - Dungeon Abe/Brute **전신 구도 스크린샷은 아직 못 얻음**(카메라 클로즈업, 파편만 확인) — `PlaytestDungeonEnemiesGui.cs`의 `TeleportPos`/줌 더 조정하면 재시도 가능.
2. **PLAN 104-1 ⑤·102-4** — `Assets/Art/*_candidates` 정리, 105 Q1 결정 대기.
3. **REALM 25차 후보** — 위 "51장 16~24차" 절의 "남은 후보" 그대로(노용·계빈·신독 잔여 갈래). 사용자와 방향 상의.
4. **PLAN 105 열린 질문(Q1·Q3′·Q4·Q-U3·Q-U4)** — 전부 사용자 결정 대기(Q-U2는 2026-09-18 해결·삭제됨).

REALM 계략(Plot) 고르기 UI(2026-09-18)·51장 17~24차 확장(2026-09-18~19) 모두 완료됐다 — 다음 세션이 새로 이어받을 잔여 작업 없음.

101-3(C·F·G)은 다섯 판 중 해당하는 GO·DUNGEON·STORY 셋 다 완전히 닫혔다 — 다음 세션이 새로 이어받을 101-3 잔여 작업은 없다.

## 알려진 오류

- 없음(컴파일·헤드리스 기준, 2026-09-18 STORY 101-3 F·G 확장 뒤 재확인).
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

## 테스트 상태 (2026-09-19 기준, 전부 배치 모드, 이 PC Unity 6000.3.24f1로 실제 실행)

| 검증 | 결과 |
|---|---|
| `-batchmode -nographics -quit` 컴파일(`tools/unity-batch.sh` 경유) | exit 0, 오류 0(REALM 24차 확장 뒤 재확인) |
| `PlaytestHeadless`(GO) | 이전 세션(2026-09-17) 기준 3연속 OK, 이번 세션 미변경 |
| `PlaytestDungeonHeadless` | **재검증 OK**(2026-09-19, Abe/Brute 실자산으로 씬 재빌드 뒤 — 10 frames, no errors) |
| `PlaytestDungeonFloorProgression` | **재검증 OK**(2026-09-19, 같은 이유 — 12 room advances, floor 4, no errors, 런타임 스폰 경로 포함) |
| `PlaytestForestHeadless` | 이전 세션 기준 3연속 OK, 이번 세션 미변경 |
| `PlaytestOverworldMap`(GO) | 이전 세션 기준 1회 재검증 OK, 이번 세션 미변경 |
| `PlaytestStorySlice` | **3연속 OK**(2026-09-18, 101-3 F·G·장비가시화 확장 뒤 — 죽음 표식/지형 데칼/레벨업 줌/직업별 무기 전부 새 검증 포함) |
| `PlaytestRealmSlice` | **3연속 OK**(2026-09-19, 51장 16~24차 확장 + 계략 고르기 UI 뒤 — 장안·건녕(목표 3)·남해 다중 목표 공격·계략 고르기 패널·잘못된 목표 거절·18개 신규 성(비경·건타라 포함) 함락 전부 새 검증 포함) |
| GUI 실제 Play 확인 | GO 라이팅 톤·`TestCharacterRealistic`(Maria idle/run/attack)·**Dungeon Abe/Brute(2026-09-19, `PlaytestDungeonEnemiesGui.cs` 신규, 파편적 확인)**. 나머지 미확인(STORY 신규 101-3 F·G도 포함) |

## 실기 확인 대기 (항목명만 — 경위는 HISTORY grep)

- GO: 조우·전투·등용 손맛, 상점·퀘스트 대사 3단계, 은닉 보물·산신당·돌탑·유물, 채집, 목표판/세션카드, hitstop 체감, 유품 마커·무기 소켓·지형 데칼 실제로 보이는지(101-3 F·G)
- DUNGEON: 카메라 각도, 아홉 슬라이스 전부, 목표판/세션카드, hitstop·타격 VFX·유품 마커·레벨업 줌·무기 소켓·지형 데칼 체감(101-3 전체)
- FOREST: 벽지/장판, 가구 자유 배치, 생물·과일나무·좌판, 목표판/세션카드
- STORY: 두목 크기·타격감, 사건·관계·선택 흐름, 전직 팝업, 목표판/세션카드, hitstop/shake/flash/popup/타격 VFX 체감, **유품 마커·지형 데칼(발자국/타격 흔적)·레벨업 줌·직업별 무기(검/활/표창/지팡이) 실제로 보이는지(101-3 F·G, 2026-09-18 신규 — 이게 첫 실기 확인)**
- REALM: 월드맵, 적국 사슬 진행 체감, 패널 여덟 실제 조작, 목표판/세션카드, **공격·계략 고르기 패널(장안·남해·건녕(목표 3개) 등) 실제 조작감(51장 16~24차 + 계략 고르기 UI, 2026-09-18~19 신규 — 이게 첫 실기 확인)**
- 공통: BGM 음량 균형, 설정 패널 6줄, 두 Volume 프로파일 톤 일치, SessionCard DoF 체감
