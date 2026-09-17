# PROJECT_STATE — saga-unity (상태만, ≤15KB, 덮어쓴다)

**규칙**(`../../SAGA-DESIGN.md` §9 상태 파일): 여기엔 **지금 상태만** 적고 세션이 끝나면 **덮어쓴다**. 날짜별 경위·판단 이유·대화 인용은 `docs/HISTORY.md` 에 append 한다(2026-09-16 재편 전 본문 5,532줄은 그쪽 첫 절에 그대로 있다). 넘치면 `tools/precheck.sh` 가 막는다.
마지막 갱신: 2026-09-17 (PLAN 101-2 A·B **다섯 판 전부 이식 완료** + **105 Q-U5 DoF 토글** + **101-3 C 전부(hitstop/shake/flash/popup/타격 VFX) GO·DUNGEON·STORY 완료** + **101-3 F 죽음(`LootMarker`)·G 성장 연출(`CameraRig.PlayLevelUpCut`) DUNGEON 구현 완료** + 다섯 게임 컴파일·씬 재생성·헤드리스 3연속 검증 완료).

## 완료 요약 — 다섯 게임 × 진척

| 게임 | 씬 | Vertical Slice(Phase 1~8) | 51장 콘텐츠 확장 | 44장 에셋 교체 | 공통(66-2 라이팅·67~69 사운드/설정/Localization) |
|---|---|---|---|---|---|
| GO | `TestVillage` | 완료 — 도적의 습격(이동·촌장·상인·나그네·조우·전투·등용·EXP·장비·루트·저장 v5+) | 동물 Group·나그네·은닉 보물·산신당·행운 돌탑·동굴 유물·채집·오버월드 지도 | Player·주요 Enemy·Environment·Building·Props 전부 GLB/PBR | 전부 붙음. 디버그 오버레이·저장 버튼·**목표판/세션카드(101-2 A·B, 2026-09-17 컴파일·헤드리스 3연속 검증 완료)**. **hitstop(101-3 C, 2026-09-17)** |
| DUNGEON | `TestDungeon` | 완료 — 첫 방→무리·엘리트/보스·방 종류(우물·상자·성소·행상)·회피·강공격·필드(방 2+복도)·동행 | 마을 넷·층 진행·매복·구출·수수께끼·은닉 창고·빌드(회전베기)·도감·보석/영웅 상태 | Player·잡졸(황건적)·미니보스/두목·Environment·Building | 전부 붙음(SFX 실클립 통일). **목표판/세션카드(101-2 A·B, 2026-09-17 검증 완료)**. **hitstop·타격 VFX·죽음 표식·성장 연출(101-3 C·F·G, 2026-09-17)** |
| FOREST | `TestVillageForest` | 완료(이동 전용 컨트롤러) — 마을·집·주민 | 벽지/장판·가구 자유 배치(1m 격자)·생물(Flee/Group)·과일나무·채집·좌판·밀어내기 전투 | Environment 완료 | 전부 붙음(데이터 콘텐츠 en 번역도 2026-09-17 감사로 완료 확인). **목표판/세션카드(101-2 A·B, 2026-09-17 검증 완료)** |
| STORY | `TestField` | 완료 — 2.5D 횡스크롤(Z 고정)·잡졸 10·두목·사명 2·볼트·로프 | 척후병 NPC·사건·관계·선택(51장 완결)·전직(Lv.10, 무사/궁수/협객/방사) | 척후병 실제 모델 | 전부 붙음. **목표판/세션카드(101-2 A·B)**. **hitstop/shake/flash/popup/타격 VFX(101-3 C "손맛 표준", 2026-09-17)** — 크리티컬 전역 슬로모(웹판 원문)는 그대로 유지. `PlayAttackAnim()` animator? 버그 수정 |
| REALM | `TestCity` | 완료(경영형, 캐릭터 없음) — 명령·계략(유언비어·화계)·문답 36·서고·월드맵·전투·함락 편입 | **적국 24, 성 27**(51장 15차, 세 사슬 전부 막다른 끝: 허창→소패→하비→수춘→여남→강하→양양→강릉→장사→시상→건업→회계 / 복양→정도→업→진양→운중→상군→삭방→오원 / 진류→낙양→장안→한중→성도→강주→영안) | 도시 Environment/Building | 전부 붙음. `RealmCommandUi` 직렬화 버그(2026-09-15) 수정·저장 버튼 신설. **목표판/세션카드(101-2 A·B, 2026-09-17 컴파일·헤드리스 3연속 검증 완료 — "월간 요약 카드"로 변형, 트리거는 무입력 대신 다음 달)** |

렌더러: 66-1장 PC(Forward+, MSAA 4)/Mobile(Forward, MSAA 2) 이중 프로파일 + `FF16Volume_PC/Mobile.asset`(ACES·Bloom 0.35·Vignette 0.25·PC 만 Grain/CA/DoF). 아트 방향은 **사실적 PBR(FF16 톤)** — 66-2장·102장.
DoF(105 Q-U5, 2026-09-17): PC 프로파일에만 `DepthOfField` 오버라이드(기본 Off) — `SessionCard.Show()`/`Hide()`가 Gaussian↔Off 로 토글. Mobile 프로파일엔 컴포넌트 자체가 없어 `SessionCard.SetDepthOfField()`가 TryGet 실패로 조용히 넘어감.
캐릭터 파이프라인: Mixamo(Maria·Abe·Brute) → `MixamoRigUtil.RigCharacter()`(Humanoid+`ExtractTextures`) → Animator 8클립. 헤어카드·SSS 는 Shader Graph 배선 대기(사람 몫).

## 현재 작업

- 이 PC엔 Unity 6000.3.24f1 실제로 설치돼 있음(다음 세션은 `find "/c/Program Files/Unity/Hub/Editor" -maxdepth 1` 로 매번 새로 확인 — 과신 금지). 다섯 게임 전부 컴파일·씬 재생성·헤드리스 3연속 검증 완료.
- **101-3 C 전부(hitstop/shake/flash/popup/타격 VFX) GO·DUNGEON·STORY 완료** — hitstop은 Animator.speed=0(가해자+피해자, 웹판 원문 크리티컬 전역 슬로모와 별개 공존), VFX는 `HitSpark`(PC도 Shuriken 재사용, VFX Graph는 에디터 그래프라 안 씀), GO는 초당 판정(`DuelRules.Step`)이라 hitstop만(`BanditEncounter`/`RareWolfEncounter`). 이 PC는 GO player Animator가 null(Maria FBX 없음)이라 foe(Abe)만 값으로 확인.
- **101-3 F 죽음(`LootMarker`) DUNGEON 구현 완료** — `DungeonEnemy.Die()`가 기존 즉시 보상(경험치·돈·장비·보석) 뒤에 호출, 회수 반경 2m(표 그대로)·주워도 추가 보상 없음(이미 준 보상의 시각적 잔향)·12초 안 주우면 소멸. STORY는 적 쪽에 Animator가 없어 범위 밖.
- **101-3 G 성장 연출 DUNGEON 구현 완료** — `CameraRig.PlayLevelUpCut()`(줌을 MinZoom까지 당겼다 되돌리는 코루틴, 합계 1.2s). 표는 Timeline+Cinemachine을 권하지만 이 프로젝트는 Cinemachine 패키지 자체가 없고(G 흔들림도 수동 `Shake()`) Timeline 전례도 없어 같은 결로 대신함. `HeroState.LeveledUp` → `GameBootstrap.OnLeveledUp()`이 호출, 아무 키나 누르면 그 프레임에 원래 줌 복귀("스킵"). 남은 101-3: **G 장비 소켓·G 데칼** 둘뿐.
- **105 Q-U5 DoF 토글**·**PLAN 101-2 A·B(GoalBoard·SessionCard) 다섯 판 전부** 완료 — REALM은 "월간 요약 카드"로 변형(캐릭터·이동이 없어 무입력 트리거가 안 맞음). 경위는 HISTORY 2026-09-16·17 grep.

## 다음 작업 (우선순위, 상세는 PLAN 해당 장 · 경위는 HISTORY 날짜 grep)

1. ~~컴파일·재검증~~ — 2026-09-17 이 PC에서 완료(다섯 게임 컴파일·씬 재생성·헤드리스 3연속 전부 OK, STORY 버그 1건 수정). 앞으로 새 소스 변경분만 그때그때 검증하면 된다(전부 다시 쌓아 둘 필요 없음).
2. ~~PLAN 101-2 A·B~~ — REALM 까지 포함해 **다섯 판 전부 완료**(2026-09-17, 위 "현재 작업" 참고).
3. ~~PLAN 101-3 C·F·G 성장 연출~~ — hitstop·shake·flash·popup·타격 VFX(GO·DUNGEON·STORY)·유품 마커·성장 연출(DUNGEON) 전부 완료(2026-09-17). 남은 101-3은 **G 장비 가시화(소켓, 지금 DUNGEON엔 무기 슬롯 하나뿐이라 등급 3단은 새 데이터 필요)·G 지형 반응(데칼, URP Decal Renderer Feature+전용 셰이더 새로 배선해야 함)** 둘뿐 — 사용자와 방향 먼저 확인.
4. **실기 GUI 확인 몰아서** — 아래 "실기 확인 대기" 전부(다섯 SettingsPanel + 다섯 판 목표판/세션카드 + 타격 VFX 포함). 사용자가 직접 하거나 명시 요청 시(폴더 CLAUDE.md).
5. **PLAN 104장 Phase 0 나머지** — `Assets/Art/*_candidates` 정리 판정만 남음(102-4 표는 있으나 105장 Q1 완성판 트랙 결정 뒤로 미룸 — 사용자 결정 대기, 손대지 않음).
6. **REALM 51장 더 늘리기(범위 재검토 필요, 사용자 상의)** — **세 사슬(허창·복양·진류) 전부 확정된 막다른 끝에 닿았다**(15차, 2026-09-17). 계속 늘리려면: (a) 새 시작 성/사슬을 아예 새로 여는 방법(원작 시나리오 194 조조군 성 셋 밖), 또는 (b) `RealmCityData.cs` 클래스 주석의 "정복·외교는 안 들인다(제외)" 결정을 재검토하는 방법 중 사용자와 상의해서 골라야 한다 — 감으로 먼저 코드를 고치지 말 것.

## 알려진 오류

- 없음(컴파일·헤드리스 기준, 2026-09-17 다섯 게임 전부 재확인).
- **함정(오류 아님)**: 이 PC Unity 6000.3.24f1 > 프로젝트 6000.3.23f1 → 배치 모드가 `ProjectSettings/ProjectVersion.txt`·`EditorSettings.asset`·`Packages/manifest.json`·`packages-lock.json` 을 조용히 고친다. 커밋 전 `git checkout -- ProjectSettings/ Packages/`.
- `PlaytestHeadless.Run()` 은 `-quit` 없이 부른다(Run 이 스스로 Exit). Play 진입 시 도메인 리로드 비활성 설정을 걸고 끝에 원복한다.
- 씬 `Build()` 는 GameObject 구성이 바뀔 때만 다시 돈다(안 그러면 fileID churn 14000줄).
- 에디터 빌드 스크립트가 한 번만 채우는 컴포넌트의 참조 필드는 반드시 `[SerializeField]`(plain private 는 재로드 후 null — REALM·LocalizedButtonLabel 두 번 밟음).
- **`animator?.SetTrigger(...)`(null-조건 연산자) 쓰지 말 것** — 애셋 폴백으로 "직렬화 때 한 번도 안 채워진" `UnityEngine.Object`는 진짜 C# null이 아니라 `?.`가 못 거르고 `UnassignedReferenceException`을 던진다. `if (animator != null)`로 명시적으로 막을 것(2026-09-17 STORY `PlayAttackAnim()`에서 실제로 겪음 — DUNGEON에도 같은 패턴이 남아 있으나 거긴 안 터져서 안 건드림, 터지면 같은 식으로 고칠 것).

## 테스트 상태 (2026-09-17 기준, 전부 배치 모드, 이 PC Unity 6000.3.24f1로 실제 실행)

| 검증 | 결과 |
|---|---|
| `-batchmode -nographics -quit` 컴파일 | exit 0, 오류 0(라이선스 토큰 경고만, PlayLevelUpCut 추가 뒤 재확인) |
| `BuildFF16VolumeProfiles.Build()`(DoF 오버라이드 추가) → 다섯 씬 재생성 | 전부 exit 0(자산 GUID 가 바뀌어 씬 재생성 필수였음) |
| `PlaytestHeadless`(GO, hitstop `CheckBanditHitstop` 포함) | 3연속 OK(hitstop 추가 뒤 재검증) |
| `PlaytestDungeonHeadless`(hitstop·타격 VFX·유품 마커·`CheckLevelUpCut`(레벨업 직후 카메라 줌 변화) 실제 검증 포함) | 3연속 OK(PlayLevelUpCut 추가 뒤 재검증). 하위 슬라이스(`FloorProgression`·`FieldAmbush`·`Shortcut`·`Town2`·`Towns34`) 는 DoF 반영 시점에 1회씩 재검증 — 회귀 없음(이후 추가된 HitSpark/LootMarker/PlayLevelUpCut은 아직 재확인 안 함, 기존 경로만 공유해 위험 낮다고 판단) |
| `PlaytestForestHeadless` | 3연속 OK(DoF 반영 뒤 재검증). 하위 슬라이스(`Creatures`·`Finish`·`Furniture`·`HouseTransition`) 도 DoF 반영 시점에 1회씩 재검증 — 전부 OK, 회귀 없음 |
| `PlaytestOverworldMap`(GO) | 1회 재검증 — OK, 회귀 없음 |
| `PlaytestStorySlice`(전직·언어 전환·save/load, hit feedback(shake+hitstop)·타격 VFX(HitSpark.SpawnCount) 검증 포함) | 첫 3연속 전부 실패(animator 버그) → 수정 후 3연속 OK, DoF·hit-feel 반영 뒤도 3연속 OK, HitSpark 추가 뒤도 3연속 OK(이 씬 player Animator는 null이라 hitstop 자체 검증은 스킵, shake·VFX는 확인됨) |
| `PlaytestRealmSlice`(적국 24 함락·편입·패널 실제 토글·저장 버튼·save/load, 51장 12~15차 사슬, GoalBoard 구조+월간 트리거 실제 확인 포함) | 3연속 OK, DoF 반영 뒤 3연속 재검증도 OK |
| GUI 실제 Play 확인 | GO 라이팅 톤·`TestCharacterRealistic`(Maria idle/run/attack) 만. 나머지 아래(여전히 미확인 — 헤드리스와 별개) |

## 실기 확인 대기 (항목명만 — 경위는 HISTORY grep)

- GO: 조우·전투·등용 손맛, 상점·퀘스트 대사 3단계, 은닉 보물·산신당·돌탑·유물, 동물 Group 발동 장면, 채집, 드로우콜 Before/After(Stats 창), **목표판 3줄 화면 배치(대화창과 안 겹치는지)·세션카드 실제 등장(무입력 5분 체감)**, **hitstop 체감(도적·늑대 둘 다, UI 버튼 전투라 DUNGEON/STORY보다 어색하게 느껴질 수 있음 — 101-3 C)**
- DUNGEON: 카메라 각도·공격 버튼 vs CameraRig 드래그 겹침, 아홉 슬라이스 전부(무리·엘리트/보스·방 종류·회피·필드·강공격·행상·동행·GLB), 마을 넷·층 진행·매복·구출·수수께끼·회전베기, 사실적 Player/Enemy/Boss 톤, 무드 유지 판단, **목표판 3줄 화면 배치(미니맵과 안 겹치는지)·세션카드 실제 등장**, **hitstop 체감(70/120ms, 과하지 않은지 — 101-3 C)**, **타격 VFX·유품 마커 색·크기 체감(둘 다 `Sprites/Default`·기본 Lit 이라 텍스처 없이 밋밋해 보일 수 있음 — 101-3 C·F)**, **레벨업 줌 펀치인 체감(1.2s, 과하거나 어지럽지 않은지 — 101-3 G)**
- FOREST: 벽지/장판, 가구 자유 배치 18칸, 생물·과일나무·좌판, 밀어내기 전투, 팔레트 데움 정도, **목표판 3줄 화면 배치·세션카드 실제 등장**
- STORY: 두목 크기·타격감(반격 없음이 샌드백처럼 느껴지는지), 사건·관계·선택 흐름, 전직 팝업, 척후병 모델, **목표판 3줄 화면 배치·세션카드 실제 등장**, **hitstop/shake/flash/popup/타격 VFX 체감(크리티컬 슬로모와 안 겹치는지 — 101-3 C)**
- REALM: 월드맵, 적국 사슬 진행 체감, 패널 여덟 실제 조작, 저장 토스트, **목표판 3줄 화면 배치(다섯 버튼 행과 안 겹치는지)·세션카드 실제 등장("다음 달" 클릭 체감, 무입력 아님)**
- 공통: BGM 음량 균형·루프 이음매, 설정 패널 6줄(언어 전환 실시간), 디버그 오버레이, 두 Volume 프로파일 톤 일치(PC/Mobile), **SessionCard 뜰 때 DoF 켜짐 체감(PC, 과하지 않은지 — 105 Q-U5)**
