# PROJECT_STATE — saga-unity (상태만, ≤15KB, 덮어쓴다)

**규칙**(`../../SAGA-DESIGN.md` §9 상태 파일): 여기엔 **지금 상태만** 적고 세션이 끝나면 **덮어쓴다**. 날짜별 경위·판단 이유·대화 인용은 `docs/HISTORY.md` 에 append 한다(2026-09-16 재편 전 본문 5,532줄은 그쪽 첫 절에 그대로 있다). 넘치면 `tools/precheck.sh` 가 막는다.
마지막 갱신: 2026-09-18 (**PLAN 101-3 C·F·G — 다섯 판 전부 적용 완료**. STORY로 F 죽음·G 지형 반응·G 성장 연출 이식 + G 장비 가시화를 "직업별 무기 소켓"으로 재해석해 구현. 이어서 **REALM Q-U2 결정 — 51장 사슬 16차 확장**: "성 하나당 목표 하나" 제약을 풀고 국경 성 3곳(장안·장사·강주)에 둘째 목표를 열었다(`RealmEnemyCity.TargetsFrom()`, `RealmCommandUi` 공격 고르기 패널 신설). 둘 다 헤드리스 검증 3연속 OK).

## 완료 요약 — 다섯 게임 × 진척

| 게임 | 씬 | Vertical Slice(Phase 1~8) | 51장 콘텐츠 확장 | 44장 에셋 교체 | 공통(66-2 라이팅·67~69 사운드/설정/Localization) |
|---|---|---|---|---|---|
| GO | `TestVillage` | 완료 — 도적의 습격(이동·촌장·상인·나그네·조우·전투·등용·EXP·장비·루트·저장 v5+) | 동물 Group·나그네·은닉 보물·산신당·행운 돌탑·동굴 유물·채집·오버월드 지도 | Player·주요 Enemy·Environment·Building·Props 전부 GLB/PBR | 전부 붙음. **목표판/세션카드(101-2 A·B)**. **101-3 C·F·G 전부 완료(2026-09-17)** |
| DUNGEON | `TestDungeon` | 완료 — 첫 방→무리·엘리트/보스·방 종류(우물·상자·성소·행상)·회피·강공격·필드(방 2+복도)·동행 | 마을 넷·층 진행·매복·구출·수수께끼·은닉 창고·빌드(회전베기)·도감·보석/영웅 상태 | Player·잡졸(황건적)·미니보스/두목·Environment·Building | 전부 붙음(SFX 실클립 통일). **목표판/세션카드(101-2 A·B)**. **101-3 C·F·G 전부 완료(2026-09-17)** |
| FOREST | `TestVillageForest` | 완료(이동 전용 컨트롤러) — 마을·집·주민 | 벽지/장판·가구 자유 배치(1m 격자)·생물(Flee/Group)·과일나무·채집·좌판·밀어내기 전투 | Environment 완료 | 전부 붙음. **목표판/세션카드(101-2 A·B)**. 101-3 해당 없음(실시간 근접 전투 없음) |
| STORY | `TestField` | 완료 — 2.5D 횡스크롤(Z 고정)·잡졸 10·두목·사명 2·볼트·로프 | 척후병 NPC·사건·관계·선택(51장 완결)·전직(Lv.10, 무사/궁수/협객/방사, `StoryJobChoiceUi` 팝업까지 실제 검증) | 척후병 실제 모델 | 전부 붙음. **목표판/세션카드(101-2 A·B)**. **101-3 C·F·G 전부 완료(2026-09-18)** — C(hitstop/shake, 2026-09-17) + F 죽음(`StoryLootMarker`) + G 지형 반응(`StoryGroundDecal`, 발자국+타격 흔적) + G 성장 연출(`StoryCameraFollow.PlayLevelUpCut()`, ZDistance 가변화) + G 장비 가시화(`StoryWeaponVisual`, "직업별 무기": 무사→검·궁수→활·협객→표창·방사→지팡이) |
| REALM | `TestCity` | 완료(경영형, 캐릭터 없음) — 명령·계략(유언비어·화계)·문답 36·서고·월드맵·전투·함락 편입 | **적국 27, 성 30**(51장 16차 — 세 사슬 원본 끝 확인 후 "성 하나당 목표 하나" 제약을 풀고 장안→천수·장사→남해·강주→주제 3곳 추가) | 도시 Environment/Building | 전부 붙음. **목표판/세션카드(101-2 A·B — "월간 요약 카드"로 변형)**. 101-3 해당 없음(캐릭터·실시간 전투 없음) |

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

## REALM 51장 16차 — "성 하나당 목표 하나" 제약 해제 (2026-09-18, Q-U2 결정)

세 사슬 끝(회계·영안·오원)은 원작 LINKS(교주·서역·남중·막북·균열·임읍·묘역 전부 포함)를 다 뒤져도 진짜 더 뻗을 링크가 없다 — 확인 완료. 대신 **국경 성이 목표를 둘 이상 가질 수 있게** 제약을 풀었다:
- `RealmEnemyCity.TargetsFrom(cityId)`(복수 반환)가 옛 `TargetFrom`(첫째만)을 대체 — `TargetFrom`은 호환용으로 남김.
- `RealmWarState.Attack()`/`Plot()`이 `enemyId` 선택 인자를 받는다(생략하면 옛 동작).
- `RealmCommandUi`에 "공격" 고르기 패널(`_attackPanel`) 신설 — 목표가 둘 이상이면 이 패널이 뜨고, 하나뿐이면 옛날처럼 바로 공격(기존 UX 그대로 유지).
- 이번 라운드 3곳: 장안→천수, 장사→남해(교주 관문), 강주→주제(남중 관문). 교주·남중 안쪽(창오·건녕 등)은 더 깊이 뻗을 수 있어 다음 확장 후보로 남김.
- **알려진 틈**: `Plot()`(계략)은 아직 고르기 UI가 없다 — 목표가 둘인 성에서 계략을 걸면 `TargetFrom`이 그중 하나(카탈로그 첫째)에만 걸린다. 계략 자체가 부수 기능이라 이번엔 범위 밖으로 남김, 다음에 손볼 것.

## 다음 작업 (우선순위, 상세는 PLAN 해당 장 · 경위는 HISTORY 날짜 grep)

1. **실기 GUI 확인 몰아서** — "실기 확인 대기" 전부(아래 목록, STORY·REALM 신규 항목 포함). 사용자 몫.
2. **PLAN 104-1 ⑤·102-4** — `Assets/Art/*_candidates` 정리, 105 Q1 결정 대기.
3. **REALM 계략(Plot) 고르기 UI** — 위 "알려진 틈" 참고, 목표 둘인 성에서 계략도 고를 수 있게.
4. **REALM 교주·남중 더 뻗기** — 남해→창오/합포, 주제→건녕. 사용자와 방향 상의(또는 그대로 "계속 확장" 기조 유지).
5. **PLAN 105 열린 질문(Q1·Q3′·Q4·Q-U3·Q-U4)** — 전부 사용자 결정 대기(Q-U2는 2026-09-18 해결·삭제됨).

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

## 테스트 상태 (2026-09-18 기준, 전부 배치 모드, 이 PC Unity 6000.3.24f1로 실제 실행)

| 검증 | 결과 |
|---|---|
| `-batchmode -nographics -quit` 컴파일(`tools/unity-batch.sh` 경유) | exit 0, 오류 0(STORY 101-3 F·G 확장 뒤 재확인) |
| `PlaytestHeadless`(GO) | 이전 세션(2026-09-17) 기준 3연속 OK, 이번 세션 미변경 |
| `PlaytestDungeonHeadless` | 이전 세션 기준 5연속 OK, 이번 세션 미변경 |
| `PlaytestForestHeadless` | 이전 세션 기준 3연속 OK, 이번 세션 미변경 |
| `PlaytestOverworldMap`(GO) | 이전 세션 기준 1회 재검증 OK, 이번 세션 미변경 |
| `PlaytestStorySlice` | **3연속 OK**(2026-09-18, 101-3 F·G·장비가시화 확장 뒤 — 죽음 표식/지형 데칼/레벨업 줌/직업별 무기 전부 새 검증 포함) |
| `PlaytestRealmSlice` | **3연속 OK**(2026-09-18, 51장 16차 확장 뒤 — 장안 다중 목표(2개) 고르기 패널·잘못된 목표 거절·천수/남해/주제 함락 전부 새 검증 포함) |
| GUI 실제 Play 확인 | GO 라이팅 톤·`TestCharacterRealistic`(Maria idle/run/attack) 만. 나머지 미확인(STORY 신규 101-3 F·G도 포함) |

## 실기 확인 대기 (항목명만 — 경위는 HISTORY grep)

- GO: 조우·전투·등용 손맛, 상점·퀘스트 대사 3단계, 은닉 보물·산신당·돌탑·유물, 채집, 목표판/세션카드, hitstop 체감, 유품 마커·무기 소켓·지형 데칼 실제로 보이는지(101-3 F·G)
- DUNGEON: 카메라 각도, 아홉 슬라이스 전부, 목표판/세션카드, hitstop·타격 VFX·유품 마커·레벨업 줌·무기 소켓·지형 데칼 체감(101-3 전체)
- FOREST: 벽지/장판, 가구 자유 배치, 생물·과일나무·좌판, 목표판/세션카드
- STORY: 두목 크기·타격감, 사건·관계·선택 흐름, 전직 팝업, 목표판/세션카드, hitstop/shake/flash/popup/타격 VFX 체감, **유품 마커·지형 데칼(발자국/타격 흔적)·레벨업 줌·직업별 무기(검/활/표창/지팡이) 실제로 보이는지(101-3 F·G, 2026-09-18 신규 — 이게 첫 실기 확인)**
- REALM: 월드맵, 적국 사슬 진행 체감, 패널 여덟 실제 조작, 목표판/세션카드, **공격 고르기 패널(장안 등 목표 둘인 성) 실제 조작감(51장 16차, 2026-09-18 신규 — 이게 첫 실기 확인)**
- 공통: BGM 음량 균형, 설정 패널 6줄, 두 Volume 프로파일 톤 일치, SessionCard DoF 체감
