# PROJECT_STATE — saga-unity (상태만, ≤15KB, 덮어쓴다)

**규칙**(`../../SAGA-DESIGN.md` §9 상태 파일): 여기엔 **지금 상태만** 적고 세션이 끝나면 **덮어쓴다**. 날짜별 경위·판단 이유·대화 인용은 `docs/HISTORY.md` 에 append 한다(2026-09-16 재편 전 본문 5,532줄은 그쪽 첫 절에 그대로 있다). 넘치면 `tools/precheck.sh` 가 막는다.
마지막 갱신: 2026-09-17 (PLAN 101-2 A·B **다섯 판 전부 이식 완료** + **105 Q-U5 DoF 토글** + **PLAN 101-3 표 전체(A·B 공통 선행·C·F·G) DUNGEON 기준 완결** + **PLAN 104-1 Phase 0 완료(④⑤ 제외)** — hitstop/shake/flash/popup/타격 VFX·죽음·성장 연출·무기 소켓·지형 반응(데칼) 전부 구현, `StoryJobChoiceUi`(전직 팝업) 테스트 구멍도 메움 + 다섯 게임 컴파일·씬 재생성·헤드리스 검증 완료).

## 완료 요약 — 다섯 게임 × 진척

| 게임 | 씬 | Vertical Slice(Phase 1~8) | 51장 콘텐츠 확장 | 44장 에셋 교체 | 공통(66-2 라이팅·67~69 사운드/설정/Localization) |
|---|---|---|---|---|---|
| GO | `TestVillage` | 완료 — 도적의 습격(이동·촌장·상인·나그네·조우·전투·등용·EXP·장비·루트·저장 v5+) | 동물 Group·나그네·은닉 보물·산신당·행운 돌탑·동굴 유물·채집·오버월드 지도 | Player·주요 Enemy·Environment·Building·Props 전부 GLB/PBR | 전부 붙음. 디버그 오버레이·저장 버튼·**목표판/세션카드(101-2 A·B)**. **hitstop(101-3 C)** |
| DUNGEON | `TestDungeon` | 완료 — 첫 방→무리·엘리트/보스·방 종류(우물·상자·성소·행상)·회피·강공격·필드(방 2+복도)·동행 | 마을 넷·층 진행·매복·구출·수수께끼·은닉 창고·빌드(회전베기)·도감·보석/영웅 상태 | Player·잡졸(황건적)·미니보스/두목·Environment·Building | 전부 붙음(SFX 실클립 통일). **목표판/세션카드(101-2 A·B)**. **101-3 C·F·G 전부(hitstop·타격 VFX·죽음 표식·성장 연출·무기 소켓·지형 반응 데칼, 2026-09-17 완결)** |
| FOREST | `TestVillageForest` | 완료(이동 전용 컨트롤러) — 마을·집·주민 | 벽지/장판·가구 자유 배치(1m 격자)·생물(Flee/Group)·과일나무·채집·좌판·밀어내기 전투 | Environment 완료 | 전부 붙음(데이터 콘텐츠 en 번역도 2026-09-17 감사로 완료 확인). **목표판/세션카드(101-2 A·B)** |
| STORY | `TestField` | 완료 — 2.5D 횡스크롤(Z 고정)·잡졸 10·두목·사명 2·볼트·로프 | 척후병 NPC·사건·관계·선택(51장 완결)·전직(Lv.10, 무사/궁수/협객/방사, `StoryJobChoiceUi` 팝업까지 2026-09-17 실제 검증) | 척후병 실제 모델 | 전부 붙음. **목표판/세션카드(101-2 A·B)**. **hitstop/shake/flash/popup/타격 VFX(101-3 C "손맛 표준")** — 크리티컬 전역 슬로모(웹판 원문)는 그대로 유지 |
| REALM | `TestCity` | 완료(경영형, 캐릭터 없음) — 명령·계략(유언비어·화계)·문답 36·서고·월드맵·전투·함락 편입 | **적국 24, 성 27**(51장 15차, 세 사슬 전부 막다른 끝: 허창→소패→하비→수춘→여남→강하→양양→강릉→장사→시상→건업→회계 / 복양→정도→업→진양→운중→상군→삭방→오원 / 진류→낙양→장안→한중→성도→강주→영안) | 도시 Environment/Building | 전부 붙음. **목표판/세션카드(101-2 A·B — "월간 요약 카드"로 변형, 트리거는 무입력 대신 다음 달)** |

렌더러: 66-1장 PC(Forward+, MSAA 4)/Mobile(Forward, MSAA 2) 이중 프로파일 + `FF16Volume_PC/Mobile.asset`(ACES·Bloom 0.35·Vignette 0.25·PC 만 Grain/CA/DoF) + `DecalRendererFeature`(2026-09-17, PC·Mobile 둘 다). 아트 방향은 **사실적 PBR(FF16 톤)** — 66-2장·102장.
DoF(105 Q-U5): PC 프로파일에만 `DepthOfField` 오버라이드(기본 Off) — `SessionCard.Show()`/`Hide()`가 Gaussian↔Off 로 토글. Mobile 프로파일엔 컴포넌트 자체가 없어 `SessionCard.SetDepthOfField()`가 TryGet 실패로 조용히 넘어감.
캐릭터 파이프라인: Mixamo(Maria·Abe·Brute) → `MixamoRigUtil.RigCharacter()`(Humanoid+`ExtractTextures`) → Animator 8클립. 헤어카드·SSS 는 Shader Graph 배선 대기(사람 몫).

## 현재 작업

- 이 PC엔 Unity 6000.3.24f1 실제로 설치돼 있음(다음 세션은 `find "/c/Program Files/Unity/Hub/Editor" -maxdepth 1` 로 매번 새로 확인 — 과신 금지).
- **PLAN 101-3 표 전체(DUNGEON 기준) 완결(2026-09-17)** — 공통 선행 A·B(GoalBoard·SessionCard)는 이미 다섯 판 완료. C(hitstop·shake·flash·popup·타격 VFX)는 GO·DUNGEON·STORY. F(죽음, LootMarker)·G(성장 연출·장비 가시화·지형 반응)는 DUNGEON만.
  - **G 장비 가시화(무기 소켓)** — `CharacterVisual.FindOrCreateWeaponSocket()`(Humanoid `HumanBodyBones.RightHand`, 폴백은 시각 루트 밑 고정 오프셋. **`animator.isHuman`으로 먼저 거를 것** — Animator가 있어도 Avatar 미설정/비휴머노이드면 `GetBoneTransform`이 예외를 던진다) + `WeaponVisual`(자루+칼날 프리미티브). `ItemData.Grade`(0~2)로 칼날 길이·이미시브 림 3단.
  - **G 지형 반응(데칼)** — `BuildDecalRendererFeature.cs`(멱등)가 `PC_Renderer.asset`·`Mobile_Renderer.asset`에 `DecalRendererFeature` 배선. `GroundDecal`이 발자국(이동 중 0.35s 간격)·타격 흔적(`DungeonEnemy.TakeDamage` 매번)을 스폰, 수명 8s·최대 32(캡 초과 시 최고참 즉시 제거). 텍스처가 없어(원작 자산 금지) 패키지 내장 `Shader Graphs/Decal`에 단색만 입힌 사각 패치일 뿐 — 실제 발자국·타격 모양은 아님(실기 확인 대기). `SagaDungeon.asmdef`에 `Unity.RenderPipelines.Universal.Runtime` 참조 추가 필요했음(`DecalProjector`가 URP 전용 어셈블리 — Volume만 쓰던 `Unity.RenderPipelines.Core.Runtime`엔 없음).
  - 다른 네 판은 각자 손맛 표준(웹판 §5-8 계열) 진행 상황에 맞춰 범위 밖으로 남겨 둠 — 강제로 옮기지 않음.
- **105 Q-U5 DoF 토글**·**PLAN 101-2 A·B(GoalBoard·SessionCard) 다섯 판 전부** 완료 — REALM은 "월간 요약 카드"로 변형. 경위는 HISTORY 2026-09-16·17 grep.
- **PLAN 104-1 Phase 0 완료(2026-09-17, ④⑤ 제외)** — ①(`tools/unity-batch.sh`)·②(Playtest 원칙 교체)·③([SerializeField] 감사)는 2026-09-16에 이미 끝나 있었으나 PLAN 표에 표시가 안 돼 있던 것을 이번에 정리. ②가 명시적으로 남겨뒀던 구멍(`StoryJobChoiceUi` 전직 팝업 — 테스트 자체가 없었음)을 `PlaytestStorySlice.cs`에 메웠다: `Show()`로 뜨는지, private `Choose()`(버튼 클릭과 같은 경로)로 콜백+닫힘까지 확인. 남은 건 ④(실기 확인, 사용자 몫)·⑤(Art candidates, 105 Q1 결정 대기)뿐.

## 다음 작업 (우선순위, 상세는 PLAN 해당 장 · 경위는 HISTORY 날짜 grep)

1. ~~컴파일·재검증~~·~~PLAN 101-2 A·B~~·~~PLAN 101-3 표 전체(C·F·G, DUNGEON)~~·~~PLAN 104-1 Phase 0(④⑤ 제외)~~ — 전부 완료(2026-09-17).
2. **실기 GUI 확인 몰아서** — 아래 "실기 확인 대기" 전부(다섯 SettingsPanel + 다섯 판 목표판/세션카드 + 타격 VFX + 무기 소켓 + 지형 데칼 포함). 사용자가 직접 하거나 명시 요청 시(폴더 CLAUDE.md).
3. **PLAN 104-1 ⑤·102-4** — `Assets/Art/*_candidates` 정리 판정만 남음(102-4 표는 있으나 105장 Q1 완성판 트랙 결정 뒤로 미룸 — 사용자 결정 대기, 손대지 않음).
4. **REALM 51장 더 늘리기(범위 재검토 필요, 사용자 상의)** — **세 사슬 전부 확정된 막다른 끝에 닿았다**(15차, 2026-09-17). 계속 늘리려면: (a) 새 시작 성/사슬을 아예 새로 여는 방법(원작 시나리오 194 조조군 성 셋 밖), 또는 (b) `RealmCityData.cs` 클래스 주석의 "정복·외교는 안 들인다(제외)" 결정을 재검토하는 방법 중 사용자와 상의해서 골라야 한다 — 감으로 먼저 코드를 고치지 말 것.
5. **101-3 C·F·G를 다른 네 판으로 확장할지** — 지금은 GO·STORY만 C(hitstop 계열) 있고 F·G는 DUNGEON 전용이다. FOREST·REALM은 실시간 근접 전투 자체가 없어(범위 밖 확정, 101-3 표 각주 참고) 해당 없음. GO·STORY에 F(죽음 표식)·G(성장 연출·장비 소켓·지형 반응)를 넣을지는 아직 미정 — 사용자와 상의.
6. **PLAN 105 열린 질문(Q1·Q3′·Q4·Q-U2·Q-U3·Q-U4)** — 전부 사용자 결정 대기. 다음 세션이 "이어해"만 받으면 위 2~5도 전부 막혀 있으니, 먼저 이 중 어느 쪽으로 갈지 사용자에게 물어볼 것 — 감으로 먼저 고르지 않는다.

## 알려진 오류

- 없음(컴파일·헤드리스 기준, 2026-09-17 다섯 게임 전부 재확인 + 지형 데칼 추가 뒤 DUNGEON 5연속 재확인).
- **함정(오류 아님)**: 이 PC Unity 6000.3.24f1 > 프로젝트 6000.3.23f1 → 배치 모드가 `ProjectSettings/ProjectVersion.txt`·`EditorSettings.asset`·`Packages/manifest.json`·`packages-lock.json` 을 조용히 고친다. 커밋 전 `git checkout -- ProjectSettings/ Packages/`.
- **`Animator.GetBoneTransform()`은 `isHuman`으로 먼저 거를 것** — Animator 컴포넌트가 있어도 Avatar가 비어 있거나 Humanoid가 아니면 `InvalidOperationException: Avatar is null`을 던진다(2026-09-17 `WeaponVisual` 작업 중 실제로 겪음 — `CharacterVisual.FindOrCreateWeaponSocket()`이 `animator.isHuman` 가드로 고쳐 둠).
- **URP 전용 런타임 타입(`DecalProjector` 등)을 쓰려면 asmdef 확인** — `SagaDungeon.asmdef`는 원래 `Unity.RenderPipelines.Core.Runtime`(Volume용)만 참조했다. `Unity.RenderPipelines.Universal.Runtime`을 추가로 넣어야 컴파일된다(2026-09-17 `GroundDecal` 작업 중 CS0246으로 겪음). 다른 네 판 asmdef도 같은 URP 전용 타입을 쓰려면 같은 참조 필요.
- **`PlaytestDungeonHeadless`의 `CheckLevelUpCut`은 `CheckLootMarker`보다 먼저 돌아야 함** — `CheckLootMarker` 더미의 기본 보상(rewardExp=20)이 레벨 1의 ExpToNext(20)와 정확히 같아 그 자리에서 레벨업을 하나 먼저 유발한다. 이 상태로 `CheckLevelUpCut`이 나중에 돌면 그 프레임의 `Time.deltaTime`이 크게 잡히는 경우(배치 모드 실행 편차) 두 레벨업 컷이 모두 `_zoom`을 `MinZoom`으로 클램프해 zoomBefore==zoomAfter로 간헐적 실패한다(2026-09-17 지형 데칼 검증 중 5회 중 1회 실제로 겪음). 지금은 순서를 바꿔 고쳐 뒀다 — 이 두 체크 순서를 다시 바꾸지 말 것.
- `PlaytestHeadless.Run()` 은 `-quit` 없이 부른다(Run 이 스스로 Exit). Play 진입 시 도메인 리로드 비활성 설정을 걸고 끝에 원복한다.
- 씬 `Build()` 는 GameObject 구성이 바뀔 때만 다시 돈다(안 그러면 fileID churn 14000줄).
- 에디터 빌드 스크립트가 한 번만 채우는 컴포넌트의 참조 필드는 반드시 `[SerializeField]`(plain private 는 재로드 후 null — REALM·LocalizedButtonLabel 두 번 밟음).
- **`animator?.SetTrigger(...)`(null-조건 연산자) 쓰지 말 것** — `if (animator != null)`로 명시적으로 막을 것(2026-09-17 STORY `PlayAttackAnim()`에서 실제로 겪음).

## 테스트 상태 (2026-09-17 기준, 전부 배치 모드, 이 PC Unity 6000.3.24f1로 실제 실행)

| 검증 | 결과 |
|---|---|
| `-batchmode -nographics -quit` 컴파일 | exit 0, 오류 0(라이선스 토큰 경고만, `GroundDecal`·asmdef 참조 추가 뒤 재확인) |
| `BuildDecalRendererFeature.Build()` | exit 0, `PC_Renderer.asset`·`Mobile_Renderer.asset` 둘 다 `DecalRendererFeature` 배선 확인(멱등 — 재실행해도 중복 안 됨, 미확인) |
| `PlaytestHeadless`(GO, hitstop `CheckBanditHitstop` 포함) | 3연속 OK |
| `PlaytestDungeonHeadless`(hitstop·타격 VFX·유품 마커·`CheckLevelUpCut`·`CheckWeaponVisual`·`CheckGroundDecal`(타격마다 생성 + 40개 몰아 스폰해 32 캡 확인) 전부 포함) | **5연속 OK**(`GroundDecal` 추가 뒤 재검증 — 첫 3연속 중 1회 `CheckLevelUpCut` 무관한 간헐적 실패 발견·순서 수정 후 5연속 통과, 위 "알려진 오류" 참고). 하위 슬라이스(`FloorProgression`·`FieldAmbush`·`Shortcut`·`Town2`·`Towns34`)는 아직 재확인 안 함(기존 경로만 공유해 위험 낮다고 판단) |
| `PlaytestForestHeadless` | 3연속 OK. 하위 슬라이스도 확인 — 전부 OK, 회귀 없음 |
| `PlaytestOverworldMap`(GO) | 1회 재검증 — OK, 회귀 없음 |
| `PlaytestStorySlice`(전직·`StoryJobChoiceUi` 위젯(Show/버튼 클릭/콜백)·언어 전환·save/load, hit feedback·타격 VFX 검증 포함) | 3연속 OK(이 씬 player Animator는 null이라 hitstop 자체 검증은 스킵, shake·VFX는 확인됨) |
| `PlaytestRealmSlice`(적국 24 함락·편입·패널 실제 토글·저장 버튼·save/load, GoalBoard+월간 트리거 포함) | 3연속 OK |
| GUI 실제 Play 확인 | GO 라이팅 톤·`TestCharacterRealistic`(Maria idle/run/attack) 만. 나머지 아래(여전히 미확인 — 헤드리스와 별개) |

## 실기 확인 대기 (항목명만 — 경위는 HISTORY grep)

- GO: 조우·전투·등용 손맛, 상점·퀘스트 대사 3단계, 은닉 보물·산신당·돌탑·유물, 동물 Group 발동 장면, 채집, 드로우콜 Before/After(Stats 창), **목표판 3줄 화면 배치·세션카드 실제 등장**, **hitstop 체감(도적·늑대 둘 다 — 101-3 C)**
- DUNGEON: 카메라 각도·공격 버튼 vs CameraRig 드래그 겹침, 아홉 슬라이스 전부, 마을 넷·층 진행·매복·구출·수수께끼·회전베기, 사실적 Player/Enemy/Boss 톤, **목표판/세션카드**, **hitstop 체감(70/120ms)**, **타격 VFX·유품 마커 색·크기 체감**, **레벨업 줌 펀치인 체감(1.2s)**, **무기 소켓 실제 손 위치·각도 체감(리깅된 "쥔" 포즈가 아니라 손 본 자리에 얹은 근사치)**, **발자국·타격 지형 데칼 실제로 보이는지(단색 사각 패치일 뿐 모양은 없음, 렌더러 기능 배선이 실제로 먹는지도 이게 첫 확인 — 101-3 G)**
- FOREST: 벽지/장판, 가구 자유 배치 18칸, 생물·과일나무·좌판, 밀어내기 전투, 팔레트 데움 정도, **목표판/세션카드**
- STORY: 두목 크기·타격감, 사건·관계·선택 흐름, 전직 팝업, 척후병 모델, **목표판/세션카드**, **hitstop/shake/flash/popup/타격 VFX 체감**
- REALM: 월드맵, 적국 사슬 진행 체감, 패널 여덟 실제 조작, 저장 토스트, **목표판/세션카드("다음 달" 클릭 체감)**
- 공통: BGM 음량 균형·루프 이음매, 설정 패널 6줄, 디버그 오버레이, 두 Volume 프로파일 톤 일치, **SessionCard 뜰 때 DoF 켜짐 체감(105 Q-U5)**
