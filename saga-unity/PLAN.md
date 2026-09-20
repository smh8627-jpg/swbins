# SAGA 프로젝트 — Unity 6 3D 신규 구축 최종 작업지시서
## saga-godot과 나란히 가는 두 번째 엔진 트랙 / Vertical Slice 우선 / Mobile 3D RPG

## 0장 — 읽는 법 (2026-09-16 재편)

- **이 파일은 정본이지만 통째로 읽지 않는다**(≈75KB). `grep -n "^# \|^## "` 로 장 목차를 뽑고 필요한 장만 `sed -n` 으로 읽는다. 장 번호(1~100·66-1·66-2·101~105)는 `docs/`·코드 주석이 가리키므로 **바꾸지 않는다**.
- **상태**는 `docs/PROJECT_STATE.md`(≤15KB, 세션 끝에 덮어쓴다). **이력**은 `docs/HISTORY.md`(append-only, 날짜·게임명으로 grep). 이 PLAN 에는 날짜 달린 세션 기록을 쓰지 않는다 — 결정이 바뀔 때만 고친다(`../SAGA-DESIGN.md` §9 문서 3층).
- 공통 개편 설계(재미 표준 8·참고 게임·그래픽·에셋·버그)는 `../SAGA-DESIGN.md`. 이 트랙 적용분은 **101~105장**(끝). 다섯 웹 판의 게임성 후보는 `../saga-web/<판>/PLAN.md` §5 — 3D 는 거기서 검증된 것을 옮긴다(101장).
- 규칙(엔진 확인·배치 모드 부작용·GUI 금지·gitignore)은 이 폴더 `CLAUDE.md` 가 정본이고 여기서 반복하지 않는다.

---

# 0. 이 문서의 위치

**이 폴더(`saga-unity/`)의 정본은 이 `PLAN.md`다.** 기존 다섯 웹 판
(saga-go·saga-dungeon·saga-forest·saga-story·saga-realm)은 이 문서를 보지
않는다 — 각자 폴더의 `PLAN.md`가 그대로 정본이다.

**`saga-godot/`과의 관계 — 경쟁이 아니라 병행.** `saga-godot/`은
2026-08-31부터 진행 중인 Godot 4.x 3D 재구축이고, 그 프로젝트의
`PLAN.md` 66-1장은 "Godot을 유지한다, Unity·Unreal로 갈아타지 않는다"를
**이미 결정하고 닫아 뒀다.** 이 문서는 그 결정을 뒤집는 게 아니다 —
**2026-09-11, 사용자가 "유니티로 전환을 추가한다, 다른 곳(다른 세션)은
Godot 작업 중이니"로 명시적으로 요청한 두 번째, 병행 트랙**이다.
- `saga-godot/`은 계속 간다. 이 폴더가 그걸 대체하지 않는다.
- 두 트랙은 **같은 기획(이 문서 5장, 다섯 게임의 정체성)을 공유**하되
  엔진·구현은 완전히 별개다. 한쪽 코드를 다른 쪽에 기계적으로 옮기지 않는다
  (Godot의 GDScript를 그대로 C#으로 번역하지 않는다 — 각 엔진의 관용구를 쓴다).
- **레거시 감사는 다시 하지 않는다.** `saga-godot/docs/LEGACY_FEATURE_AUDIT.md`가
  다섯 웹 판의 KEEP/REWORK/MERGE/DROP 분류를 이미 끝내 뒀다 — 그 결과를
  그대로 참고한다(33장 토큰 절약 규칙 3 "이미 완료된 시스템을 다시
  분석하지 않는다"). 엔진이 다르다고 기획 분석까지 다시 할 이유는 없다.
- **왜 두 엔진인가**는 이 문서가 판단할 일이 아니다 — 사용자가 직접 비교해
  보고 정하려는 목적으로 이해한다. 이 문서는 "Unity 쪽을 잘 만드는 법"만
  다룬다. Unity가 Godot보다 낫다/못하다를 여기서 논하지 않는다.

기존 프로젝트와 기존 1~80번 작업지시서는 폐기하는 것이 아니라,

> 기존 구현을 그대로 유지하는 것이 아니라
> 기존 기획/콘텐츠/게임성 중 가치 있는 부분만 추출하여
> 신규 Unity 구조에 재설계하여 통합한다.

기존 코드의 구조적 한계를 신규 프로젝트에 그대로 가져오지 않는다.

---

# 1. 최우선 우선순위

모든 작업은 다음 우선순위를 따른다.

1. **게임이 실제로 재미있어야 한다.**
2. **3D 그래픽 품질**
3. **넓고 풍부한 월드**
4. **전투 / 성장 / 탐험**
5. **모바일 UX**
6. **확장 가능한 구조**
7. **Claude Code 토큰 절약**

기능 개수만 늘리는 것을 목표로 하지 않는다.

각 기능은 반드시:

- 왜 필요한가?
- 플레이어가 무엇을 재미있어 하는가?
- 반복 플레이에 어떤 영향을 주는가?
- 다른 시스템과 어떻게 연결되는가?

를 기준으로 판단한다.

---

# 2. 절대 금지사항

다음 작업을 하지 않는다.

- 기존 JS 코드를 C#으로 기계적으로 변환
- **`saga-godot/`의 GDScript를 C#으로 기계적으로 번역** (두 트랙이 같은
  기획을 공유하되 각자 엔진에 맞게 새로 설계한다 — 0장 참고)
- 기존 HTML/CSS/JS 구조를 Unity에 억지로 재현
- 기존 파일을 무조건 유지
- 처음부터 거대한 오픈월드 제작
- 테스트되지 않은 시스템을 대량 생성
- 임시 Placeholder만으로 최종 그래픽을 구성
- 기능만 많고 재미없는 게임 제작
- 모든 시스템을 한 번에 구현
- 동일한 시스템을 5개 게임에 각각 중복 구현
- Claude Code가 불필요하게 전체 프로젝트를 반복 분석
- 이미 완료된 파일을 매번 전체 재작성
- 사용하지 않는 에셋/스크립트 대량 생성
- **`saga-godot/`이 쓰는 파일을 이 트랙 작업 중에 건드리기** (완전히 별개
  프로젝트 — 그쪽 세션의 진행을 깨뜨린다)

---

# 3. 개발 핵심 원칙

## 3.1 Vertical Slice First

처음부터 완성 게임을 만들지 않는다.

먼저 다음이 모두 들어간 **작은 플레이 가능한 Vertical Slice**를 완성한다.

플레이어 → 월드 이동 → 탐험 → NPC → 퀘스트 → 몬스터 → 실시간 전투 →
스킬 → 보상 → 장비 → 성장 → 다음 지역 이동 → 저장/로드

까지 하나의 재미있는 게임 루프를 완성한다.

Vertical Slice가 재미있지 않으면 콘텐츠를 늘리지 않는다.

**첫 슬라이스는 saga-godot과 같은 범위로 잡는다** — 사가고(GO)의
"도적의 습격" 하나. `saga-godot/docs/VERTICAL_SLICE.md`가 이미 이 범위를
검토해 뒀다(걷기 → 주민 대화 → 사건 조우 → 전투 → 승리 → 등용 → 저장,
보스·퀘스트·던전·장비는 의도적으로 제외). 같은 범위를 쓰면 두 트랙의
결과물을 나중에 공정하게 비교할 수 있다 — 이 문서가 범위를 다시 고민하지
않는다.

---

# 4. 기존 1~80번·레거시 자료 통합 규칙

**`saga-godot/docs/LEGACY_FEATURE_AUDIT.md`를 그대로 재사용한다.** 다섯 웹
판의 PLAN/PLAN1/PLAN2·README를 다시 읽고 KEEP/REWORK/MERGE/DROP을 다시
분류하지 않는다 — 이미 끝나 있다. 이 문서에서 게임 디자인(5장)·데이터
구조(7장) 논의는 그 감사 결과와 일관되게 맞춘다.

다만 **Unity 고유의 REWORK 여지**가 있으면 여기 별도로 적는다:

### Unity에서 REWORK 후보

- (착수 전 — Phase 2에서 실제로 Unity 프로젝트를 만들며 채운다)

---

# 5. 5개 게임의 역할 재정의

**`saga-godot/PLAN.md` 5장과 완전히 동일하다** — 게임 디자인은 엔진과
무관하다. 요약만 옮긴다(자세한 것은 그 문서 참고, 다시 쓰지 않는다):

| 게임 | 핵심 | 게임 감각 |
|---|---|---|
| SAGA GO | 탐험·이동·지역 발견·수집·몬스터·이벤트·지도 콘텐츠·성장 | "계속 돌아다니고 발견하고 싶다." |
| SAGA DUNGEON | 던전 탐험·실시간 전투·몬스터·엘리트·보스·장비·스킬·랜덤 이벤트·보상 | "한 판 더 돌고 더 좋은 장비를 얻고 싶다." |
| SAGA FOREST | 넓은 자연환경·동물·채집·탐험·생활 콘텐츠·NPC·마을·자연 이벤트·숨겨진 장소 | "그냥 돌아다녀도 재미있다." |
| SAGA STORY | 스토리·NPC·대화·퀘스트·선택·지역 사건·캐릭터 관계·메인/서브 스토리 | "다음 이야기가 궁금하다." |
| SAGA REALM | 넓은 세계·지역·세력·도시·영지·전쟁/분쟁·영웅·성장·전략적 콘텐츠 | "내가 이 세계를 성장시키고 있다는 느낌." |

주의: 예전에 한 세션이 이 5장을 "제네릭 판타지 몬스터 RPG"로 잘못
재정의했던 사고가 있었다(`saga-godot` 감사 기록 참고) — **다섯 게임 모두
"역사 인물로 노는" 정체성**을 유지한다. 인물·장수 이름은 실명이 아니라
가명(루트 `CLAUDE.md`의 이름 정책, 이 트랙에도 그대로 적용).

---

# 6. 공통 SAGA Core Architecture

5개 프로젝트가 공유할 수 있도록 다음 시스템을 공통화한다. Unity에서는
**Assembly Definition(`.asmdef`)으로 계층을 나눠**, 게임별 코드가
Core 내부 세부사항에 의존하지 않게 한다(49장).

```text
SagaCore (Assets/SagaCore/, SagaCore.asmdef)
├── Player
├── Character
├── Combat
├── Skill
├── Enemy
├── Boss
├── Quest
├── Dialogue
├── Inventory
├── Equipment
├── Item
├── Stats
├── Progression
├── Save
├── World
├── NPC
├── Event
├── Audio
├── Camera
├── MobileInput
├── UI
├── Localization
├── Data
└── Performance
```

게임별 콘텐츠만 별도 모듈로 만든다.

---

# 7. 데이터 기반 설계

게임 데이터를 코드에 하드코딩하지 않는다.

Unity에서는:

- **ScriptableObject** — Godot Resource의 직접적 대응. 데이터 애셋
  (`EnemyData`, `ItemData`, `QuestData` 등)은 전부 ScriptableObject로 정의한다
- JSON (세이브 데이터, 외부에서 가져오는 밸런스 표)
- CSV (표 형태 밸런스 데이터, 필요하면)

를 활용한다.

```text
Assets/Data/
├── Characters/     (ScriptableObject: CharacterData)
├── Enemies/        (ScriptableObject: EnemyData)
├── Bosses/
├── Items/
├── Equipment/
├── Skills/
├── Quests/
├── Dialogue/
├── Maps/
├── Events/
└── Balance/
```

예:

```csharp
[CreateAssetMenu(menuName = "Saga/EnemyData")]
public class EnemyData : ScriptableObject {
    public string id;
    public string displayName;
    public int level;
    public int hp;
    public int attack;
    public int defense;
    public float moveSpeed;
    public float attackRange;
    public SkillData[] skills;
    public DropTableData dropTable;
    public AiType aiType;
}
```

콘텐츠 추가를 위해 핵심 코드를 수정하지 않아도 되도록 한다.

---

# 8. 실제 3D 에셋 구조

최종 게임은 실제 3D 에셋 기반으로 구성한다.

지원(Unity 기본 임포터가 다 받는다):

- FBX, GLB/GLTF (Unity 임포터가 직접 지원)
- PNG, JPG, WebP
- Texture, Animation(Animator/Animation Clip), Material(URP Lit/Simple Lit)

권장 구조:

```text
Assets/Art/
├── Characters/
├── Enemies/
├── Bosses/
├── Animals/
├── Buildings/
├── Environment/
├── Vegetation/
├── Rocks/
├── Props/
├── Weapons/
├── Armor/
├── Effects/
├── UI/
└── Audio/
```

Placeholder(Unity 기본 Primitive: Cube/Capsule/Cylinder)는 개발 초기
테스트용으로만 사용한다. 최종 게임의 주요 화면에는 실제 에셋을 사용한다.
`saga-godot`이 쓰는 CC0 에셋 소스(Kenney·Quaternius·ambientCG·Mixamo 등)를
이쪽도 그대로 재사용할 수 있다 — 라이선스가 같으니 새로 찾을 필요 없다.

---

# 9. 월드 품질 목표 · 10. 월드 디자인 원칙

**`saga-godot/PLAN.md` 9·10장과 동일**(엔진 무관 — 다시 쓰지 않는다):
각 지역에 Terrain·Landmark·Buildings·Vegetation·Rocks·Props·NPC·Animals·
Enemies·Hidden Area·Resource Area·Event Area·Dungeon/POI가 최소한씩
있어야 하고, "여기는 아무것도 없다"는 느낌을 최대한 피한다. 크기보다
밀도와 발견의 재미를 우선한다.

---

# 11~30. 전투·성장·장비·퀘스트·NPC·동물·이벤트·던전 설계

**`saga-godot/PLAN.md` 11~30장과 동일한 설계 원칙을 따른다** — 이 부분은
게임 디자인이라 엔진과 무관하다. 요점만:

- 전투: Move→Target→Attack→Skill→Dodge/Defense→Enemy Reaction→Reward 구조.
  기본 공격·강공격/콤보·스킬·회피·피격 반응·쿨다운·자원·적 AI·거리·공격
  범위·보스 패턴을 갖춘다. 적 유형(근접/원거리/돌진/방어/마법/소환/광역/
  암살/엘리트/보스)마다 대응법이 달라야 한다.
- 보스: HP만 높은 몬스터가 아니라 단계 변화·공격 패턴·광역 공격·약점·
  회피 요구·소환·환경 활용·페이즈 변화·보상을 갖춘다.
- 성장: Level→Stats→Equipment→Skill→Build. Vertical Slice에서는
  **무기 + 장비 + 기본 옵션**까지만.
- 퀘스트: 이동·대화·수집·사냥·탐험·던전·보스·NPC 이벤트 유형, 데이터 기반
  (`QuestData` ScriptableObject: ID/Type/Conditions/Objectives/Rewards/
  Dialogue/NextQuest).
- 반복 플레이 루프: 탐험→발견→전투→보상→성장→새로운 지역/콘텐츠→더 강한
  적→더 좋은 보상→다시 탐험. 여기에 퀘스트·이벤트·수집·던전·보스·NPC·
  스토리를 연결한다.
- "계속 플레이할 이유": 다음 지역·다음 장비·레벨업·새 스킬·보스·숨겨진
  장소·NPC 이야기·새 동물·새 던전 중 항상 하나는 느끼게 한다.

---

# 19~21. 모바일 UX · 조작 · 카메라

세로/가로 모두 지원한다(Unity: `Screen.orientation` + Canvas Scaler
`Scale With Screen Size`). 화면 방향이 변경되어도 게임 상태가 유지되어야
한다.

기본 조작:

```text
Virtual Joystick + Attack + Skill Buttons + Dodge + Interact
```

Unity의 새 Input System(`com.unity.inputsystem`) On-Screen Controls로
가상 조이스틱·버튼을 구성한다(Godot 트랙의 `virtual_joystick.gd`와 같은
역할). 상황(탐험/전투)에 따라 UI를 자동 전환한다.

카메라: 3인칭 추적 카메라 — 줌·회전·거리 제한·지형 충돌(Cinemachine의
`CinemachineThirdPersonFollow` + `CinemachineDeoccluder` 사용을 권장,
직접 스크립트도 가능)·전투 시 시야 보정·건물/오브젝트 가림 처리.

---

# 22~23. 그래픽 품질 · 애니메이션

PBR Material(URP Lit)·Lighting·Shadow·Ambient Lighting·Fog·Sky·
Environment·Particle(VFX Graph 또는 Shuriken)·Post Processing(URP
Volume)을 고려하되, 모바일 성능을 우선해 효과를 선택적으로 적용한다.

캐릭터 애니메이션: Idle/Walk/Run/Attack/Hit/Death/Dodge/Skill.
**Animator Controller + Animation State Machine**을 쓴다(Godot의
AnimationTree/State Machine과 같은 역할). 몬스터도 최소한의 상태별
애니메이션을 갖는다.

---

# 24~27. NPC · 동물 · 이벤트 · 던전

**`saga-godot/PLAN.md` 24~27장과 동일한 설계**(엔진 무관, 요약만):
NPC는 이름·위치·대화·퀘스트·상점·이벤트·관계를 가진다. 동물은
Idle/Wander/Flee/Group/Interaction을 지원해 월드에 생명감을 준다.
월드 이벤트(몬스터 출현·보물 발견·NPC 이벤트·희귀 몬스터·지역/시간/랜덤
이벤트)는 데이터 기반으로 확장한다. 던전은 Entrance/Rooms/Enemies/
Elite/Event/Treasure/Boss/Reward 구조, 초기엔 수동 제작부터.

---

# 28. 세이브 시스템

저장: 플레이어 위치·레벨·경험치·장비·인벤토리·퀘스트·이벤트 상태·월드
상태. **Version 필드를 포함한다**(향후 데이터 구조 변경 대비).

Unity 구현: `JsonUtility` 또는 `System.Text.Json`으로 직렬화한
`SaveData` 클래스를 `Application.persistentDataPath`에 저장. 세이브
스키마는 `saga-godot`의 세이브 스키마·다섯 웹 판의 세이브 키 관례
(루트 `CLAUDE.md` — 세이브 키는 폴더 이름과 무관하게 고정)와 **개념은
맞추되 파일 포맷을 억지로 통일하지 않는다** — 트랙마다 자기 엔진에
자연스러운 포맷을 쓴다.

---

# 29~30. 성능 최적화 · AI 최적화

모바일을 처음부터 고려한다. 필수 검토: LOD Group, Occlusion Culling
(Unity 내장), Frustum Culling(자동), Object Pooling, Texture 압축
(ASTC 권장, 모바일 빌드), Mesh 최적화, Draw Call 감소(GPU Instancing/
SRP Batcher), Shadow 최적화(Cascade 수 축소, 모바일은 Shadow 거리 축소),
Particle 제한, AI 업데이트 주기, 물리 처리 최적화(Fixed Timestep 조정).

AI 최적화: 거리 기반 업데이트 빈도 — Near Player(High Frequency) /
Medium Distance(Reduced) / Far Distance(Low/Sleep). 월드 규모가 커져도
모바일에서 유지되도록 한다.

---

# 31. 공통 모듈 구조 (Unity 프로젝트 레이아웃)

```text
saga-unity/
├── Assets/
│   ├── SagaCore/          (SagaCore.asmdef — 공통 시스템)
│   │   ├── Combat/
│   │   ├── Character/
│   │   ├── Player/
│   │   ├── Enemy/
│   │   ├── Quest/
│   │   ├── Dialogue/
│   │   ├── Inventory/
│   │   ├── Equipment/
│   │   ├── Item/
│   │   ├── Skill/
│   │   ├── Save/
│   │   ├── World/
│   │   ├── Event/
│   │   ├── UI/
│   │   ├── Mobile/
│   │   └── Utilities/
│   ├── Games/
│   │   ├── SagaGo/        (SagaGo.asmdef — SagaCore 참조)
│   │   ├── SagaDungeon/
│   │   ├── SagaForest/
│   │   ├── SagaStory/
│   │   └── SagaRealm/
│   ├── Data/               (7장 — ScriptableObject 데이터)
│   ├── Art/                (8장 — 3D 에셋)
│   ├── Scenes/
│   └── Settings/           (URP Asset, Quality 등)
├── docs/
│   ├── PROJECT_STATE.md
│   ├── VERTICAL_SLICE.md
│   ├── PERFORMANCE.md
│   ├── ASSET_GUIDE.md
│   └── CHANGELOG.md
├── ProjectSettings/         (Unity 표준)
├── Packages/                (Unity 표준, manifest.json)
└── PLAN.md                  (이 문서)
```

게임별 asmdef는 SagaCore를 참조하되, SagaCore는 게임별 asmdef를 참조하지
않는다(단방향 의존 — 49장).

---

# 32~33. 개발 방식 · 토큰 절약 규칙

**`saga-godot/PLAN.md` 32·33장과 동일한 규칙**을 따른다(그대로 인용):

각 단계마다: 현재 상태 확인 → 필요한 파일만 읽기 → 최소 변경 → 구현 →
실행/검증 → 오류 수정 → 결과 기록.

- 프로젝트 전체 파일을 매번 읽지 않는다
- 변경 대상 파일만 읽는다
- 이미 완료된 시스템을 다시 분석하지 않는다(4장 — 레거시 감사도 포함)
- 작업 전: 현재 상태/변경 파일/목표/검증 방법만 먼저 확인한다
- 큰 파일을 불필요하게 전체 출력하지 않는다
- 동일한 코드를 복사하지 않는다, 공통 시스템을 재사용한다
- 한 단계가 끝나면 다음 단계로 넘어가기 전에 검증한다
- 기존 구현을 무조건 재작성하지 않는다
- 작업 로그를 남겨 다음 실행에서 불필요한 재분석을 방지한다

**규칙 10 — 상태·이력 분리(2026-09-16 재편으로 대체).** `docs/PROJECT_STATE.md` 는 상태만 ≤15KB 로 **덮어쓰고**, 날짜별 경위는 `docs/HISTORY.md` 에 append 한다. 이 PLAN 에는 세션 기록을 쓰지 않는다(0장·`../SAGA-DESIGN.md` §9). 2026-09-16 이전에 쌓인 장문 기록은 HISTORY.md 첫 절에 그대로 있다.

---

# 34. Claude Code 작업 상태 파일

```text
docs/
├── PROJECT_STATE.md   (상태만 ≤15KB, 덮어쓴다 — 0장)
├── HISTORY.md         (세션 이력 append-only, grep 으로만)
├── VERTICAL_SLICE.md
├── PERFORMANCE.md
├── ASSET_GUIDE.md
└── CHANGELOG.md
```

`ARCHITECTURE.md`·`LEGACY_FEATURE_AUDIT.md`는 새로 안 만든다 —
`saga-godot/docs/`의 것을 참고로 링크만 건다(0·4장).

---

# 35. 1~100 최종 작업 단계

## Phase 1 — 프로젝트 기반

### 01
Unity 프로젝트 생성. **버전은 이미 설치된 Unity 6000.3.23f1을 쓴다**
(Unity Hub로 새로 받지 않는다 — 이미 있다). 템플릿은 **3D (URP)**.

### 02
프로젝트 이름 및 기본 설정("SAGA" — saga-godot과 이름 통일).

### 03
모바일 해상도/화면 설정(Player Settings → Resolution and Presentation).

### 04
Portrait/Landscape 지원 구조(Player Settings → Allowed Orientations).

### 05
기본 폴더 구조 생성(31장 레이아웃).

### 06
SagaCore asmdef 생성.

### 07
게임별 asmdef 생성(SagaGo만 먼저 — 3장 Vertical Slice 범위).

### 08
Git/버전 관리 구조 확인 — **이 폴더도 저장소(swbins) 안이다.** Unity가
생성하는 `Library/`·`Temp/`·`Obj/`·`Build/`·`Logs/`·`UserSettings/`는
반드시 `.gitignore`에 추가한다(용량이 크고 로컬 캐시라 커밋하면 안 됨 —
`saga-go/server/certs/`를 안 커밋하는 것과 같은 이유로 중요).

### 09
PROJECT_STATE.md 작성.

### 10
(ARCHITECTURE.md는 34장에 따라 생략 — saga-godot 것을 참고로 링크)

---

## Phase 2 — Vertical Slice 설계

**레거시 분석(saga-godot의 옛 Phase 2)은 생략한다 — 4장, 이미 끝나 있다.**
바로 Vertical Slice 설계로 간다.

### 11
Vertical Slice 범위 확정 — **saga-godot과 동일**(3장): 사가고, "도적의
습격" 사건 하나.

### 12
`docs/VERTICAL_SLICE.md` 작성 — `saga-godot/docs/VERTICAL_SLICE.md`를
참고하되 Unity 구현 방식(씬 구조, 프리팹 이름 등)으로 다시 적는다.

### 13~20
(saga-godot Phase 3의 26~35절과 같은 항목 — 첫 지역/적/보스/퀘스트/던전/
장비/스킬/보상 루프 설계. Vertical Slice 문서 안에 같이 적는다.)

---

## Phase 3 — 3D World Foundation

### 21
3D World 기본 Scene 생성(`Assets/Scenes/TestVillage.unity`).

### 22
Terrain 구현 — saga-go 웹판의 7×7 글자 지도(`test_map`)를 그대로
가져와 쓴다(saga-godot의 `test_map.gd`와 같은 데이터, Unity에선
`TestMapData.cs` 또는 ScriptableObject로).

### 23
Lighting 구현(Directional Light + URP Global Volume).

### 24
Sky/Environment 구현(URP Volume Profile — Physically Based Sky 또는
Skybox Material).

### 25
Fog/Atmosphere 구현(URP Volume — Fog 오버라이드).

### 26
실제 GLB/FBX 에셋 import 구조 확인(Unity는 기본 지원 — 별도 플러그인
불필요).

### 27
Material 구조(URP Lit 기반 공통 머티리얼).

### 28~31
Vegetation·Rock/Prop·Building·Landmark 배치(GPU Instancing 또는
개별 프리팹 — draw call 고려, 29장).

### 32
Path/Road 구성.

### 33
Water 구성(URP 기본 셰이더 또는 간단 커스텀 셰이더).

### 34
높낮이가 있는 지형 구성. **saga-godot이 2026-09-11에 겪은 "칸 경계가
바둑판처럼 갈라져 보이는" 문제를 참고**(`saga-godot/games/saga_go/world/
terrain_builder.gd`의 정점 색 블렌딩 해법) — Unity에서 똑같은 함정을
밟을 수 있다(타일마다 별도 메시로 땅을 채우면 하드 엣지가 생긴다).
처음부터 이어붙인 단일 메시(Mesh 클래스로 직접 정점 배열 구성, 또는
Unity Terrain 시스템의 텍스처 블렌딩 레이어)를 검토한다.

### 35
첫 번째 플레이 가능 지역 완성.

---

## Phase 4 — Player

### 36
Player 3D 모델 연결(Placeholder: Capsule → 나중에 실제 리그드 모델).

### 37
Idle/Walk/Run 구현(Animator Controller).

### 38
3D 이동 구현(CharacterController 또는 Rigidbody 기반 — 모바일이라
CharacterController 권장).

### 39
중력/충돌 구현.

### 40
Camera Follow 구현(Cinemachine 권장).

### 41
Camera Rotation 구현.

### 42
Camera Zoom 구현.

### 43
모바일 Virtual Joystick 구현(Input System On-Screen Controls).

### 44
Portrait UI 구현.

### 45
Landscape UI 구현.

---

## Phase 5 — Combat

### 46
Combat Core 구현.

### 47
Basic Attack 구현.

### 48
Target 시스템.

### 49
Damage 시스템.

### 50
HP/Death 시스템.

### 51
Hit Reaction.

### 52
Enemy AI.

### 53
Enemy Attack.

### 54
Skill 시스템.

### 55
Cooldown/Resource 시스템.

### 56
Dodge 시스템.

### 57
(엘리트/보스는 Vertical Slice 범위 밖 — saga-godot과 동일하게 스킵)

### 58
전투 재미 검증(37장 체크리스트로).

---

## Phase 6 — RPG Systems

### 59
Stats 시스템.

### 60
EXP 시스템.

### 61
Level Up.

### 62
Item 시스템.

### 63
Inventory.

### 64
Equipment.

### 65
Equipment Stats.

### 66
Reward 시스템.

### 67
Loot Table.

---

## Phase 7 — World Gameplay

### 68
NPC 시스템.

### 69
Dialogue 시스템.

### 70
Quest 시스템.

### 71
Quest Objective/Reward.

### 72
World Event.

### 73
Hidden Area.

---

## Phase 8 — Persistence / Quality

### 74
Save/Load.

### 75
Data Versioning.

### 76
Mobile Performance Pass.

### 77
Vertical Slice 전체 플레이 테스트.

### 78
**최종 재미/품질 평가 후 다음 콘텐츠 확장 여부 결정** — 이 시점에
`saga-godot`의 같은 슬라이스와 나란히 놓고 비교할 수 있다(0장의 병행
목적).

---

# 36~38. Vertical Slice 완료 조건 · 재미 평가 · 실패 시 처리

**`saga-godot/PLAN.md` 36~38장과 동일한 기준**을 쓴다(다시 쓰지 않음) —
플레이어가 게임을 실행 → 3D 월드 진입 → 이동 → 탐험 → NPC 발견 → 퀘스트
수령 → 몬스터 조우 → 실시간 전투 → 스킬 사용 → 처치 → 아이템 획득 →
장비 → 성장 → 새 지역/던전 → 엘리트/보스 → 보상 → 저장 → 재플레이,
이 과정이 **재미있어야 한다.** 재미가 부족하면 콘텐츠 추가 전에 이동감·
카메라·타격감·적 AI·스킬·보상·탐험 밀도·UI·진행 속도부터 고친다.

---

# 39~43. 확장 전략 · 차별화 · 최종 품질 목표

**`saga-godot/PLAN.md` 39~43장과 동일**(엔진 무관, 요약): 공통 Core
안정화 후 GO→DUNGEON→FOREST→STORY→REALM 순으로 확장. 게임별 느낌은
확실히 다르게(GO=탐험, DUNGEON=전투/파밍, FOREST=자연/생활, STORY=스토리/
NPC/사건, REALM=세계/세력/성장). 목표는 "기존 웹게임을 Unity로 옮긴 게임"이
아니라 "SAGA 아이디어 기반의 새 모바일 3D RPG".

---

# 44~49. 에셋 사용 원칙 · 모바일 성능 목표 · 디버그 시스템

**`saga-godot/PLAN.md` 44~49장과 동일한 원칙**: 에셋 우선순위
(Player→주요 Enemy→Boss→Environment→Building→Vegetation→Props→Animals→
VFX). 모바일 성능(과도한 NPC/그림자/Particle/투명 재질/고해상도 텍스처
금지, AI 매 프레임 처리 금지). 디버그 화면(FPS/Draw Calls/Visible
Objects/Enemy Count/NPC Count/Memory/Player Position/Current Quest/
Player Level/Current Zone) — Unity는 `Debug.Log` + 온스크린 커스텀
UI 또는 Unity Profiler 연동. **saga-godot의 디버그 라벨(현재
rendering_method 표시, 66-1장)과 같은 정신으로, 현재 Render Pipeline
Asset 이름을 표시한다.**

---

# 50. 최종적으로 만들어야 하는 것

```text
SAGA
│
├── SAGA CORE (saga-godot 트랙과 saga-unity 트랙, 각자 독립)
│
├── GO
├── DUNGEON
├── FOREST
├── STORY
└── REALM
```

Core는 트랙 안에서 공유. 콘텐츠는 게임별로 분리. **두 트랙(Godot/Unity)
사이에는 코드를 공유하지 않는다** — 기획만 공유한다(0장).

---

# 51~65. 확장 계획 · 게임별 차별화

**`saga-godot/PLAN.md` 51·65장과 동일**(다시 쓰지 않음) — Vertical
Slice 이후 GO(월드 확장→탐험/지역/이벤트/수집/희귀 몬스터)→
DUNGEON(던전 증가→엘리트/보스/장비/빌드)→FOREST(생태계→동물/채집/마을/
생활)→STORY(스토리 챕터→NPC/선택/사건/관계)→REALM(지역→세력/도시/영지/
대규모 콘텐츠) 순.

---

# 66-1. 렌더러 프로파일 — URP PC / Mobile 이중 구성

## 결정 (2026-09-11)

**Unity 6 + URP(Universal Render Pipeline)를 쓴다.** HDRP는 쓰지
않는다 — HDRP는 모바일을 지원하지 않는다(45장 모바일 목표와 정면 충돌).

`saga-godot`의 66-1장(Forward+ / Mobile 이중 구성)과 같은 이유로,
플랫폼별로 다른 **URP Asset(Renderer 설정)**을 쓴다:

| 프로파일 | 대상 | Rendering Path | 켜는 것 |
|---|---|---|---|
| **PC** | Windows/macOS/Linux 빌드, 에디터 | **Forward+**(Unity 6 URP 신규 지원) | SSAO, Screen Space Reflection, Volumetric Fog, HDR Bloom, 고품질 그림자(Cascade 4단), MSAA/TAA |
| **Mobile** | Android/iOS 빌드 | Forward(전통 경로) | Bloom만, 그림자 저해상도·Cascade 1~2단, MSAA 2x, SSAO·SSR·Volumetric 전부 끔 |

## 설정 방식 — **Unity 공식 "3D (URP) Cross-Platform" 템플릿이 이미 그대로 갖고 있다**

2026-09-11 Phase 1에서 프로젝트를 `com.unity.template.3d-cross-platform`
템플릿으로 만들어 보니, 이 절이 하려던 일을 템플릿이 **이미 다 해 뒀다**
(직접 만들 필요 없음 — 확인만 했다):

```text
Assets/Settings/
├── PC_RPAsset.asset       (renderingMode=ForwardPlus)  + PC_Renderer.asset
└── Mobile_RPAsset.asset   (renderingMode=Forward)      + Mobile_Renderer.asset
```

`ProjectSettings/QualitySettings.asset`에 Quality 레벨이 이미 둘
(`Mobile`·`PC`)이고, 각 레벨의 `customRenderPipeline`이 각각
`Mobile_RPAsset`·`PC_RPAsset`을 가리킨다. `Mobile` 레벨엔
`excludedTargetPlatforms: [Standalone]`이 걸려 있어 PC 빌드에서는
자동으로 `PC` 레벨(=Forward+)이 골라진다 — **플랫폼 분기 스크립트를
따로 안 짜도 된다.** 66-1장이 원래 요구하던 "씬 안에서 안 갈라짐"·
"빌드 타깃에 따라 자동 전환" 둘 다 템플릿 기본값으로 충족된다.

**할 일은 확인·튜닝뿐이다** — 두 RPAsset의 그림자·AA·후처리 오버라이드
값이 아래 표(PC=고품질/Mobile=저사양)와 실제로 맞는지 Phase 3~4에서
콘텐츠가 늘 때 다시 점검한다. 지금(Phase 1) 단계에서 값을 미리 튜닝하지
않는다 — 아직 비교할 실제 씬이 없다(32장 "최소 변경" 원칙).

- **씬/프리팹 안에서 렌더러를 분기하지 않는다** — Quality Settings +
  URP Asset 스위칭으로만 한다(saga-godot의 "이 세 줄로만 한다"와 같은 원칙).
- 색 톤(Tonemapping·노출·색보정)은 **두 URP Asset의 Volume Profile에서
  같게** 유지한다.
- 메시·머티리얼·텍스처·애니메이션은 한 벌이다. 플랫폼별 에셋을 따로
  안 둔다. 텍스처 해상도·압축은 Platform-specific Texture Import
  Override로만 조절한다.

## 하지 말 것

- HDRP로 갈아타기(모바일 미지원)
- 프로파일을 셋 이상으로 늘리기
- Mobile 프로파일에서 SSAO·SSR·Volumetric Fog를 켜 보는 것(45장 위반)
- Forward+ 미지원을 이유로 오래된 Unity 버전을 쓰기 — 이미 설치된
  6000.3.23f1(Unity 6)이 Forward+를 지원하는 최초 세대다, 굳이 낮출 이유 없다

## 검증

- 46장 디버그 화면에 현재 URP Asset/Rendering Path 이름을 표시한다.
- PC 프로파일 FPS·Draw Call은 에디터에서, Mobile 프로파일은 71장 테스트
  기기에서 확인한다.
- 실기 확인은 매 단계마다 하지 않고 **마지막에 몰아서** 한다(루트
  `CLAUDE.md`의 실기 확인 방침, saga-godot 트랙과 동일).

---

# 66-2. 아트 방향 — 사실적(포토리얼) PBR, 파이널 판타지 최신작 기준 (2026-09-13, 재정정)

## 결정 — saga-godot과 다른 방향으로 갈라섬 + 구체적 레퍼런스 확정

**처음엔 "saga-godot과 같은 결정(원신류 애니메이션 셀셰이딩)"이라고
적었으나, 같은 날 사용자가 "saga-unity는 원신 스타일이 아니라 사실적인
걸로 변경할게, 엔진마다 다른 점이 필요해"로 뒤집었다.** 두 3D 트랙의
그래픽 목표가 이제 의도적으로 다르다:

| 트랙 | 목표 그래픽 |
|---|---|
| `saga-godot` | 원신(Genshin Impact)류 카툰/셀셰이딩(그 프로젝트 PLAN.md 66-2장) |
| `saga-unity` | **사실적(포토리얼) PBR, 파이널 판타지 최신작(스퀘어에닉스) 기준** — 이 장 |

**추가 지시(같은 날 다시) — "파이널 판타지 그래픽처럼 하고 싶어, 최신작
기준임".** "사실적 PBR"이라는 방향만으로는 톤이 안 잡혀(사실적 PBR도
언리얼 엔진 데모부터 배틀필드까지 폭이 넓다) 구체적 레퍼런스를 못박는다
— **파이널 판타지 16(2023)·파이널 판타지 7 리버스(2024) 같은, 이 결정
시점 기준 가장 최근 스퀘어에닉스 넘버링작/리메이크의 그래픽 톤**이
기준이다. 더 최신 넘버링작·리메이크가 나오면 그쪽을 기준으로 갱신하되,
아래 스펙(사실적 인체 비율·무드 있는 시네마틱 라이팅·디테일한 재질)
자체는 유지된다.

루트 CLAUDE.md의 "기획만 같이 본다"는 원칙은 여전히 유효하지만(공통
게임 디자인·데이터 구조 등), **그래픽 아트 방향은 이 지점부터 공유
대상이 아니다** — 앞으로 saga-godot의 66-2장(카툰/셀셰이딩 스펙)을
이 프로젝트에 옮기지 않는다.

## 무엇을 뜻하는가 (파이널 판타지 최신작 기준 구체 스펙)

- 66-1장이 이미 잡아 둔 **PC 프로파일(Forward+ 상당, SSAO·SSR·
  Volumetric Fog·HDR Bloom·고품질 그림자)**이 그대로 목표에 맞는다 —
  포토리얼 방향이라 오히려 66-1장을 고칠 필요가 없다(66-1장은 렌더러
  파이프라인 층, 이 장은 그 위의 "무엇을 사실적으로 그릴 것인가" 층).
- **캐릭터**: 실사에 가까운 인체 비율(원신류 애니메이션풍 비율이 아님).
  표준 URP Lit(PBR: 알베도·메탈릭·러프니스·노멀맵) 기반이되, 피부는
  **Subsurface Scattering(URP `Skin` 근사 — SSS 노멀·틱니스맵 활용)**을
  얹어 밀랍 같은 느낌을 피한다. 머리카락은 처음부터 스트랜드 단위
  렌더링(Alembic/그루밍 파이프라인)까지 가지 않고 **다중 레이어 헤어카드
  + 이방성(anisotropic) 하이라이트**로 시작(성능·제작비 대비 FF 최신작
  헤어의 결을 가장 싸게 근사하는 방식 — 44장 "최소 변경" 원칙).
  갑옷/의상은 금속·가죽·천 각각 다른 러프니스·노멀 디테일로 구분한다.
- **라이팅/무드**: 평면적인 균일 조명이 아니라 **극적인 명암 대비**
  (강한 키라이트+짙은 그림자, 역광·림라이트로 실루엣 강조), Volumetric
  Fog/God Ray로 공간감. 색보정은 **필름틱 LUT**(살짝 desaturate,
  하이라이트는 따뜻하게·그림자는 차갑게 — 전형적 시네마틱 톤).
- **Post Processing(URP Volume)**: HDR Bloom(66-1장 이미 있음)에 더해
  **얕은 피사계심도**(대화·연출 장면에서, 평소 플레이 중엔 과하게 걸지
  않음 — 모바일에서 상시 DoF는 비용 크다), 미세한 Film Grain, 약한
  Chromatic Aberration, Motion Blur(카메라 회전 시만 약하게). 전부
  **PC 프로파일 위주**로 걸고 Mobile 프로파일에서는 66-1장 표대로
  대거 줄인다(DoF·Film Grain·Motion Blur는 Mobile에서 끔 — 45장).
- **환경**: 밀도 높은 식생·먼지/불티 파티클로 공간을 채운다(Unity 6
  URP의 Adaptive Probe Volumes로 정적 GI 보강 검토 — Enlighten
  없이도 반사광이 자연스럽게 스미는 게 FF 최신작 실내·던전 톤의 핵심).
  물은 굴절+SSR 반사를 그대로 쓴다(66-1장 PC 프로파일 SSR 활용 —
  saga-godot과 정반대로 여기서는 물도 포토리얼 방향).
- 텍스처·모델 디테일(고해상도 노멀맵, PBR 재질값 등)이 실제 화질을
  좌우한다(66-1장 8행이 이미 짚어 둔 원칙 — "에셋 품질이 엔진보다
  중요"). 다만 모바일 목표(45장)는 그대로라 텍스처 해상도·폴리곤 수·
  위 이펙트 전부 모바일 프로파일에서 축소 대상.

## 현실적 기대치 — "얼마나 비슷해질 수 있나"

**사용자 질문 "파이널판타지16 정도 가능할까?" → "비슷한 정도까지만
이라도"로 스스로 눈높이를 낮춰 답함(2026-09-13).** 정직하게 적어 둔다
— FF16은 스퀘어에닉스가 수백 명 규모로 수년간, PS5 전용(모바일 타협
없이) 만든 게임이다. 이 프로젝트는 혼자(세션이 코드를 짬)·CC0/무료
또는 저가 에셋 위주·모바일까지 겸하는 프로젝트(45장)라 **동일한 밀도는
애초에 목표가 아니다.** 항목별 현실적 격차:

| 요소 | 근접 가능성 | 이유 |
|---|---|---|
| 라이팅 무드·색보정·후처리(LUT·Bloom·Volumetric Fog) | **높음** | 셋업 문제라 엔진·시간 문제, 에셋 구매 불필요 |
| 환경(지형·식생·던전 재질) | **중간~높음** | PBR 텍스처 킷(Quixel Megascans류)을 구하면 재질 자체는 실제로 AAA급 — 배치 밀도·규모만 줄어듦 |
| 캐릭터 얼굴·피부·헤어 | **낮음** | 포토그래메트리 스캔·커스텀 페이셜 리그·스트랜드 헤어는 팀·예산이 드는 영역 — 헤어카드·SSS 근사로 "방향"만 흉내 |
| 천/갑옷 시뮬레이션(옷감 물리) | **낮음** | 실시간 클로스 시뮬은 비용이 커 모바일과 상충(45장) — 정적 노멀맵으로 흉내 |

**목표를 다시 말하면**: FF16과 나란히 비교해 이길 수 없다는 걸 알고
가는 것 — "그 게임이 주는 무드·색감·조명의 방향"을 참고해 이 프로젝트가
낼 수 있는 최고치를 뽑는 것이지, 초근접 재현이 목표가 아니다. 다음에
실제 캐릭터/환경 에셋을 조사하는 세션은 이 표를 보고 **라이팅·환경부터
먼저 투자하고(체감 대비 비용이 싸다), 캐릭터 디테일은 기대치를 낮게
잡을 것.**

## 절대 하지 않는 것 — 실제 스퀘어에닉스 자산 사용

**파이널 판타지는 스타일 레퍼런스(오마주)일 뿐이다.** 스퀘어에닉스의
실제 게임 리소스(모델·텍스처·셰이더 코드)·데이터마이닝된 에셋을 가져다
쓰지 않는다 — 루트 CLAUDE.md "원작사의 실제 에셋 가져다 넣기 금지"
원칙이 그대로 적용된다(saga-godot 66-2장이 원신에 대해 같은 원칙을
적은 것과 동일). 그림은 CC0/라이선스 확인된 에셋이나 코드가 그린다,
캐릭터 조형·라이팅 셋업만 톤을 참고한다.

## 지금까지의 Kenney/VRoid 에셋은 어떻게 되나

- **Kenney CC0 로우폴리 킷**(`Assets/Art/`, `docs/ASSET_GUIDE.md`)은
  카툰 방향에서도 이미 교체 대상이었고, 사실적 방향에서도 마찬가지로
  최종 그래픽엔 안 맞는다(로우폴리·단순 색 텍스처라 어느 방향이든
  플레이스홀더에 가깝다) — 교체가 필요하다는 결론 자체는 안 바뀐다.
- **VRoid Studio 샘플 아바타**(`Assets/Art/CharactersVroid/
  AvatarSample_A.vrm`+`.glb`, saga-godot과 같은 파일을 미러링해 옴)는
  애니메이션풍 캐릭터라 사실적 방향과는 안 맞지만, **지우지 않고 그대로
  둔다** — gltFast로 `.glb`가 오류 없이 임포트된다는 기술 검증 결과
  (엔진 메커니즘 사실)는 그래픽 스타일과 무관하게 여전히 유효하다.
  실제 최종 캐릭터 에셋 소스(사실적 방향에 맞는 것)는 아래 "다음에 할
  일"로 미룬다.
- 새 에셋 소스(사실적 방향에 맞는 것 — 예: 사실적 인체 스캔/사진측량
  기반 캐릭터, PBR 텍스처가 갖춰진 환경 킷 등)는 **아직 정하지 않았다**
  — 사용자가 "플랜만 수정"이라고 범위를 한정해, 이번엔 방향만 문서화
  하고 실제 소스 조사는 다음으로 미룬다.

## 하지 말 것

- saga-godot의 66-2장(카툰/셀셰이딩 스펙·VRoid/Quaternius/KayKit 에셋
  소스·셰이더 참고 구현)을 그대로 옮겨오기 — 이 트랙은 이제 다른 목표다.
- 두 트랙의 그래픽이 원래 같아야 한다고 재논의하기 — 사용자가 명시적으로
  갈라 달라고 지시했다(이 절 "결정" 참고).
- 이 정정을 이유로 66-1장(렌더러 프로파일)을 다시 논의하기 — 오히려
  66-1장이 이미 사실적 방향에 맞게 잡혀 있어 그대로 쓴다.

## ①~⑪ 캐릭터·환경 파이프라인 — 전부 완료 (2026-09-13), 기록은 `docs/HISTORY.md`

라이팅/후처리 셋업(`BuildFF16VolumeProfiles.cs`) · Poly Haven PBR 5벌(채널 팩킹은 `BuildMetallicSmoothnessMap()` 으로 표준 URP Lit 유지) · 캐릭터 셰이더 3벌 반입(MIT·MIT·CC0, `CharacterShaders_candidates/`) · Mixamo Maria 반입+Humanoid 리깅(`MixamoRigUtil.RigCharacter()` 가 `ExtractTextures()` 포함) · Animator 8클립 · 피부 서브메시 분리 근사(`BuildMariaSkinSplit.cs`).
**남은 결정 사항**: 헤어카드·진짜 SSS 는 Shader Graph 노드 배선이 코드로 불가 → 사람 GUI 몫. DoF 는 대화 연출 토글이 생긴 뒤에만. Mixamo 산출물은 `Assets/Art/CharactersRealistic/`(gitignore) 밖으로 내지 않는다. 자세한 경위는 `docs/HISTORY.md` "PLAN.md 66-2장" 절.

---

# 67~69. 사운드 · Localization · 접근성

**`saga-godot/PLAN.md` 67~69장과 동일한 목표**: BGM/SFX/Attack/Hit/
Skill/UI/Environment 사운드 구조(Unity AudioSource + AudioMixer로
카테고리별 볼륨 분리). 텍스트는 코드에 안 박는다(Unity Localization
패키지 또는 간단 JSON 사전, 한국어/영어/일본어 확장 가능). UI 크기·
진동·효과음·BGM On/Off·그래픽 품질 설정 가능하게.

**진행 요약(2026-09-14~15, 경위는 `docs/HISTORY.md` "67~69장" 절)** — SFX·BGM·접근성 설정·Localization 인프라가 다섯 판 전부에 붙었다. 유지할 결정만 적는다:
- SFX 는 코드로 Master/SFX/BGM 볼륨을 곱하는 `XxxAudio.cs`(다섯 벌). AudioMixer 에셋은 사람이 GUI 로 노드를 이어야 해 배치 모드로 못 만든다 — 만들지 않는다.
- BGM 은 판마다 CC0 상시 루프 1곡(`Assets/Art/Audio/CC0_BGM/`). 승리/패배처럼 들어야 갈리는 선곡은 사람 몫 — 먼저 묻지 않고 시작하지 않는다.
- Localization: `XxxLocalization.T(key[, fallback])` + `Resources/Localization/xxx_<lang>.json`(ko·en, ja 없음). 키 누락은 키 자체를 돌려준다(빈 화면 대신 보이게). `settings.*` 공유 키는 다섯 벌 md5 일치, 게임별 키는 불일치 허용. **내부 식별자(문자열 값으로 매칭되는 상수)는 번역하지 않는다.** 씬에 구워 넣는 버튼은 `LocalizedButtonLabel`(폴링) 로만 언어 전환. en 은 세션 번역이라 사람 검수 전.
- 미착수: FOREST 데이터 콘텐츠 번역, REALM 문답 36·서고·전투 서술, GO HiddenTreasure, DUNGEON 행상/구출 대사.

---

# 70~80. 품질 검증 · 테스트 기기 · 최적화 시점 · 씬 관리 · 개발 로그

**`saga-godot/PLAN.md` 70~80장과 동일한 원칙**: 각 Phase마다 Functional/
Visual/Mobile/Performance Test. 저사양/중급/고성능 모바일 최소 셋 고려.
최적화는 마지막 한 번이 아니라 Vertical Slice부터 지속 측정. 하나의
거대한 Scene에 다 넣지 않는다(World/Terrain/Environment/NPC/Animals/
Enemies/Events/POI 분리). Prefab을 재사용 단위로 쓴다(`EnemyBase.prefab`,
`NPCBase.prefab`, `Tree.prefab` 등). 새 몬스터는 기존 Combat/AI를
복사하지 않고 Data(ScriptableObject)만 추가해서 만든다. 수치는
`Assets/Data/Balance/`에서 관리. 중요 변경은 `docs/CHANGELOG.md`에
짧게. 실패한 단계는 중단→원인 파악→최소 수정→재검증→완료, 실패 상태에서
계속 쌓지 않는다.

---

# 81~100. Vertical Slice 확장 검증 · 최종 Gate

**`saga-godot/PLAN.md` 81~100장과 동일한 체크리스트**를 쓴다: 이동감·
카메라 감각·월드 시각 품질·전투 타격감·적 AI 재미·스킬 재미·보상 재미·
성장 체감·탐험 동기·30분 플레이 테스트, 이어서 모바일 Portrait/Landscape
테스트·저사양 성능 테스트·메모리 테스트·세이브/로드 테스트·버그 수정·
불필요한 기능 제거·그래픽 품질 최종 개선·게임 루프 최종 검증·**Vertical
Slice 승인/재설계 결정.** 100단계에서 무조건 다음 콘텐츠로 안 넘어간다 —
재미없으면 Phase를 되돌려 개선한다.

---

# 101. 재미 진단·게임성 이식 (SAGA-DESIGN §1~§5 적용, 2026-09-16)

## 101-1. 표준 8 — 이 트랙 현재 상태

| # | 표준(§3) | 상태 | 근거(씬·스크립트) |
|---|---|---|---|
| A 목표판 | 지금/세션/주간 3줄 | **×** | `PlayerHud`·`StoryHud`·`RealmHud` 는 HP·골드·퀘스트 진척 상태줄만. "다음에 할 것" 을 계산하는 곳이 없다 |
| B 마무리 카드 | 종료·귀환 시 카드 | **×** | 저장 버튼 토스트(`command.save_ok`)가 유일한 "마무리". 얻은 것·다음 할 것 요약 없음 |
| C 손맛 | 5요소(hitstop·흔들림·플래시·팝·소리) | **△** | DUNGEON `DamagePopup`·SFX 라운드로빈은 있음. hitstop·카메라 임펄스·피격 플래시 없음. GO 전투는 선택지 UI(`EncounterUiKit`)라 타격 자체가 없다 |
| D 선택 3택 | 서로 다른 축 3택 | **△** | STORY 전직 4택 1회(`StoryJobChoiceUi`)·STORY 선택(`StoryChoiceUi`, 2택)·DUNGEON 빌드 1(회전베기). 반복되는 성장 3택 없음 |
| E 발견 밀도 | 60m 격자 빈칸 ≤10% | **△** | GO 은닉 보물·돌탑·유물·채집·산신당은 있으나 7×7 지도에 손배치, 밀도 규칙·재배치 없음. DUNGEON 방 종류 6 은 규칙적 |
| F 실패·회복 | 비용 10~20%·회복 ≤2분 | **×** | 죽음 처리(`death` 클립)만. 비용·회수·"죽어도 남는 것" 없음. REALM 패전 비용도 병력 감소뿐 |
| G 성장 가시화 | 단계마다 보이는 변화 1 | **△** | 장비 스탯은 오르지만 외형 불변(`CharacterVisual` 은 종류별 GLB 1). STORY 두목 1.4배는 예외 |
| H 돌아올 이유 | 일일·주간 | **×** | 실시간 시계 없음. 세이브 타임스탬프만 |

**가장 큰 구멍 3**: ① A·B 부재 — 다섯 씬 모두 "다음에 뭘 하나" 를 사람이 PROJECT_STATE 를 읽어야 안다. ② C — 사실적 아트로 갈수록 타격 반응 부재가 더 티 난다(66-2 톤에서 피격 플래시 없는 적은 마네킹). ③ F·H — 한 번 본 씬을 다시 열 이유가 없다.

## 101-2. 다섯 게임 × 웹 PLAN §5 후보 — 3D 이식 표

웹 판 §5 는 2026-09-16 설계본이고 **전부 웹 미검증**이다. 3D 는 "웹에서 통한 것부터" 옮기되(§5 원칙), A·B·C 처럼 웹 검증이 필요 없는 UI·감각 표준은 병행한다.

**결정(2026-09-19, 사용자)**: 위 "웹에서 통한 것부터" 게이트를 **saga-godot 트랙의 실기 승인으로도 충족된 것으로 인정한다.** saga-godot 은 saga-web 과 별개로 이미 이 표의 여러 후보를 3D 로 구현해 사용자 실기 테스트로 "재미있다" 승인을 받았다(GO·DUNGEON·FOREST 는 VS 승인 자체가 실기 확인, STORY·REALM 도 101-2 항목 다수 완료 — `saga-godot/docs/PROJECT_STATE.md` "완료 요약" 표 참고). saga-web 쪽 문서에 검증 도장이 안 찍혔다는 이유만으로 saga-unity 착수를 더 미루지 않는다 — **다만 UI·조작·수치는 saga-godot 구현을 그대로 베끼지 않고 이 트랙 자체 컴포넌트로 재해석한다**(루트 CLAUDE.md·이 문서 서두 "코드 공유 없음" 원칙 그대로, 참고하는 것은 "이 설계가 재미있다"는 사실뿐).

| 게임 | 웹 §5 후보(우선순위 순, 제목만) | 3D 첫 이식 | 이 트랙 대응 파일 |
|---|---|---|---|
| GO | ① 봉수대(탑→지도 해제) ② 사당 시련 3분 방 ③ 75초 토벌·부위·저스트 회피 ④ 일과판+마무리 카드 ⑤ 비석 순례(GPS) ⑥ 인연(동행 관계) ⑦ 승급 3택 ⑧ 패배 비용·회수 | **④ → ⑦ → ③**(2026-09-19) → **① → ⑥ → ⑧**(2026-09-20) → **②**(2026-09-20, 이어서) — 남은 건 ⑤(GPS, Unity 모바일 빌드 뒤)뿐. ③은 "야생 조우"(`BanditEncounter`)가 아니라 이미 "토벌" 결인 `RareWolfEncounter`에 얹었다(`DuelRules.Raid`). **①**은 TestVillage가 GPS 오버월드가 아니라 9×11 고정 격자 하나뿐이라 "27개 권역·GPS 반경 1.5km 노출"을 그대로 못 옮긴다 — 봉수대를 마을에 하나만 두고(격자 4,4), 미니맵이 없는 이 트랙에서는 "지도 해제" 대신 목표판(`GoSessionTracker.GoalLineNow()`)이 불 켜기 전엔 봉수대 자신을, 켠 뒤엔 남은 발견형 랜드마크(숨은 보물·산신당·동쪽 숲 유적) 전부를 최근접 후보로 받아들이는 쪽으로 재해석했다(새 `BeaconTower`). **⑥**은 이 슬라이스의 등용 대상이 "산적" 하나뿐이라(늑대는 등용 안 됨) faction/era 결(궁합) 축이 성립하지 않아 스코프 밖으로 뺐다 — 남은 "함께 걸은 거리·함께 이긴 토벌로 인연 0~3, +2%/등급"만 수치 그대로 옮겼다(새 `BondState`, `PartyState.Recruit`가 자동 등록). **⑧**은 원문(15%·상한300·10분·동시3개)을 그대로 옮겼다 — 10분 창은 `Time.time`(앱 재시작 시 0으로 리셋)이 아니라 `DateTime.Now.Ticks`로 재 앱을 완전히 껐다 켜도 창이 흐르게 했다(새 `DropState`/`DropMarker`, `GameBootstrap.Start()`가 로드 직후 만료분을 거르고 남은 것만 마커로 되살린다). **②**는 27권역·105명 인물 풀이 없어 입구 하나(산신당 옆 격자 4,1)로 좁히고, 파도 3(웹판 wolfpack 90→bandit 120→scout 170 재해석)을 하나의 공유 타이머(180초)로 이어(`DuelRules.Left`를 다음 파도 timeSec로 그대로 넘김), 보상도 "그 권역 인물 조우" 대신 "인장 조각" 수집(3개=인장 1, 이정표 보상)으로 재해석했다 — 하루 3회·실패 시 10분 재입장 잠금은 원문 그대로(새 `ShrineTrialState`/`ShrineTrialEncounter`). 경위는 `docs/HISTORY.md` 2026-09-20 grep | `PlayerHud`·`QuestState`·`BanditEncounter`·`RareWolfEncounter`·`PartyState`·`LandmarksBuilder`·`BeaconTower`·`BondState`·`DropState`·`DropMarker`·`GoSessionTracker`·`ShrineTrialState`·`ShrineTrialEncounter` |
| DUNGEON | 5.1 축복 3택 5.2 유품(죽음 비용·회수) 5.3 부적 던전 티어 5.4 월드 보스 75초 5.5 난입 파도 5.6 목표판·카드 5.7 시대 퓨전 5.8 손맛 2차·가시화 | **5.8 → 5.1 → 5.2 → 5.3 → 5.4 → 5.5 전부 완료(2026-09-20)** — 다음은 5.7(시대 퓨전, 웹 선행 결과 뒤). 5.5 "난입"도 위 넷과 같은 재해석 — 웹판 "모루골 결사비 옆 표식"은 Room1(이 트랙의 실제 중심 마을)에 세우지만, "방 하나에서 파도"는 이미 콘텐츠가 있는 Room1을 못 써서 완전히 격리된 고정 방(`HordeArena`)으로 텔레포트하는 쪽으로 좁혔다. 레벨업 3택은 새 시스템 없이 5.1 `BlessingState`를 그대로 재사용(난입 시작 시 `SnapshotIds()`로 회차 축복을 비우고, 종료 시 `Restore()`로 되돌린다 — "난입 한정"의 뜻). 웹판 "10분 이상 부적 1"은 부적 인벤토리가 없어(5.3과 같은 이유) 금 보너스로 대체. 5.8 중 hitstop·타격 VFX·죽음 표식 은 2026-09-17 완료 — 101-3 C·F 표 참고, **`LootMarker`(101-3 F, 적 사망 시각 잔향뿐)는 5.2(플레이어 죽음 비용·회수, 실제 골드 반환)와 다른 것 — 혼동 주의**. 5.1 은 웹판의 무예 4칸·서명 무예·7원소 시너지(36개 표)를 그대로 옮기지 않았다 — 대신 이 트랙 고유의 "하나를 크게(강공격) 대 여럿을 조금씩(회전베기)" 빌드(51장)를 직접 강화하는 공(攻)/수(守)/선(旋) 3축으로 재해석했다(새 `BlessingState`). 5.2 도 웹판의 "런 리셋 뒤 재방문 회수" 전제를 그대로 옮기지 않았다 — 이 트랙은 편도 진행이라 "회수 전에 방을 뜨면 잃는다"로 좁혔다(사망 시 골드 전부를 `GraveMarker`로, `SessionCard`로 요약). 5.3 도 웹판의 "굴혈 앞 티어 선택 + 부적 인벤토리"를 그대로 옮기지 않았다 — 허브가 없어 "층 10 이후 보스층마다 자동으로 걸리는 변형자"(`SigilState`, 정예 폭증 hp×2 / 유리대포 피해×1.5, 결정적)로 좁혔다. **5.4 도 웹판의 "15분 실시간 슬롯 + 마을 필드 스폰"(재방문 가능한 지속 마을 전제)을 그대로 옮기지 않았다** — 이 트랙엔 그런 마을이 없어(편도 절차적 진행), 대신 이미 있는 "층 끝 두목"(`SpawnSolo` withEscorts, 고정 배치 `BuildBoss()` 둘 다) 자체를 75초 제한 전투로 승격시켰다: `DungeonEnemy`에 `isWorldBoss` 플래그를 추가해 아그로 순간부터 75초 카운트다운(`PlayerHud`에 표시)이 시작되고, 시간 안에 못 잡으면 도망(보상 30%, 웹판 그대로) — GO 101-2 ③ "75초 토벌"의 75/50/25% 부위 파괴 문턱 관례를 그대로 재사용해 부위 3(투구/갑주/무기, 사람형이라 GO의 다리/몸통/급소 대신)이 파괴될 때마다 보너스 골드+완파 보너스를 준다. 저스트 회피(공격 예고 타이밍)는 이 트랙 실시간 전투에 적 공격 예고(윈드업) 상태 자체가 없어 이번엔 스코프에서 뺐다(기존 회피 무적시간이 이미 "제때 피하면 안 맞는다"는 같은 결의 보상을 준다) | `PlayerCombat`·`DungeonEnemy`·`DungeonFloorRunner`·`HeroState`·`DamagePopup`·`HitSpark`·`LootMarker`·`GraveMarker`·`PlayerHud`·`CameraRig`·`BlessingState`·`BlessingChoiceUi`·`SigilState`·`HordeRunner`·`HordeGate`·`HordeState` |
| FOREST | 5.1 일과판 5.2 마무리 카드 5.3 마을 번들 5.4 관계 하트 5.5 발견 격자+정령 60 5.6 축제 5.7 택배 사슬 5.8 채집 손맛 | **5.1+5.2 → 5.4 → 5.5 → 5.3 완료(2026-09-20)** — 웹판 곤충·물고기·화석·조개 4갈래는 사고(박물관) 건물·가방을 전제하지만 이 트랙엔 둘 다 없고(`ForestState.cs` 클래스 주석) 호수·강도 없어(`ForestGroundBuilder` "판정은 항상 평면 좌표로") 물고기·조개 갈래를 옮길 대상이 없다 — 대신 이미 있는 네 바이옴 존(`ForestBiomeData.Zones`)에 하나씩 어울리는 갈래로 재해석했다: 어둑숲→곤충, 버섯숲→버섯, 바위 지대→화석, 꽃밭→화초. "채집=기증"으로 합쳤다(가방이 없어 발견 즉시 도감에 기록, DUNGEON `BestiaryState`와 같은 결). 새 `ForestMuseumState`(도감 상태)·`ForestCollectSpot`(존별 채집 자리 4)·`ForestMuseumDecorator`(갈래 완성 시 시설 하나, 네 갈래 다 채우면 깃발). **5.8① 채집 손맛도 완료(2026-09-20)** — 웹판 "아이템 팝→가방"은 가방이 없어 `DamagePopup` 결의 텍스트 팝으로, "효과음 20종"은 기존 Kenney 3종 라운드로빈으로, "연속 채집 리듬 보너스"는 낚시가 없어 채집 성사 자체를 8초 창으로 세는 쪽으로 재해석했다(새 `ForestGatherFeel`·`ForestGatherPopup`·`ForestGatherBump`·`ForestGatherStreak`, 경위는 HISTORY 2026-09-20 grep). **5.8② 마을 평가도 완료(2026-09-20)** — 웹판 잡초·꽃·심은 나무·집 꾸미기·사고 기증 다섯 축 중 이 트랙엔 잡초·꽃·나무 심기 자체가 없어(자라는 식생 없음) 실제로 값이 있는 둘(집 꾸미기 `ForestHomeState.Score()`, 박물관 기증 `ForestMuseumState`)만 합쳐 별 5개로 환산했다. 등급 경계는 웹판 `town.js BEAUTY_GRADES`(0/60/100/150/200)를 그대로 재사용. "별이 떨어질 조건" 경고는 안 옮겼다 — 이 트랙 두 축 다 늘기만 해 내려갈 일이 없다. 5.8③(자동 순행은 손맛 건너뜀)은 이 트랙에 자동 순행 시스템 자체가 없어 해당 없음. 새 `ForestTownScore`(점수·별·조건 2줄)·`ForestTownScoreBoard`(마을 중심 깃대, 다가가면 토스트) | `ForestState`·`ForestVillager`·`ForestHomeState`·`ForestGroundBuilder`·`ForestMuseumState`·`ForestCollectSpot`·`ForestMuseumDecorator`·`ForestGatherFeel`·`ForestTownScore`·`ForestTownScoreBoard` |
| STORY | 5-1 직업 정체성(고유 조작) 5-2 무예 유파 재해석 5-3 비경 미니던전 5-4 관문 대장 주간 보스 5-5 이동 손맛 5-6 목표판·카드 5-7 손맛 표준 5-8 동료 교대 | **5-5 → 5-7 → 5-1 → 5-4 전부 완료(2026-09-20)** — 남은 건 5-2(웹·godot 둘 다 미확정이라 보류)·5-3(비경, 다음 유력 후보)·5-8(동료 교대, 이 트랙엔 파티 시스템 자체가 없어 선행 검토 필요)뿐. **5-4(2026-09-20)**: godot STORY(`story_boss_spawner.gd`/`story_enemy.gd`, HISTORY 2026-09-17 실기 승인)의 재해석 — godot은 자동 리스폰하는 필드 넷을 매주 강화판으로 재활용하지만, 이 트랙은 두목이 하나뿐이고 상시 그 자리에 서 있는 편도 필드다(반격도 없다 — `StoryEnemy.cs` 클래스 주석 "재해석" 참고). "이번 주 미도전이면 그 두목이 챔피언으로 승격"으로 좁히고, godot의 "3분 초과 시 광폭화"(공격력 배율 — 이 두목은 애초에 반격을 안 해 적용할 축이 없다)는 "시간 안에 못 잡으면 태세를 정비한다"(체력 회복+무제한 재도전, 재방문 없는 필드라 도망 대신 재해석)로 바꿨다. HP×2.5·방패 파괴(누적 피해 30%→10초 피해 ×1.5)·처치 시 경험치×2(이 트랙엔 금·고유장비가 없어 경험치만)는 godot 수치 그대로. 새 `StorySaveState.ChampionAvailable()/ClaimChampion()`(주 index, SAVE_VERSION 안 올림), `StoryEnemy.TryBecomeChampion()`(GameBootstrap.Start()가 TryLoad() 뒤 명시적으로 호출 — Awake() 시점엔 세이브가 아직 안 실렸을 수 있다), `StoryHud`에 챔피언전 타이머 줄. | `StoryPlayerController`·`StoryCombat`·`StoryJobState`·`StoryEnemy`·`StorySaveState`·`StoryHud`·`GameBootstrap` |
| REALM | 5-1 인물 특성·야망 5-2 관계 이벤트 체인 5-3 일기토·설전 5-4 시작 시나리오·이정표 5-5 승리 조건·결과 카드 5-6 지형·진형 개입 5-7 월간 요약 카드 5-8 계승 | **5-7 → 5-1 → 5-6 → 5-2 → 5-8 → 5-3 → 5-5 전부 완료(2026-09-20)** — 남은 건 5-4(제외 확정, 아래)뿐, 101-2 REALM 은 이제 다 닫혔다. **5-5(2026-09-20)**: godot REALM(`realm_save_state.gd` `check_result()`, 2026-09-17 실기 승인)의 재해석 — 이 트랙엔 세력·화친 시스템 자체가 없어(REALM 은 무주공산 성만 있다) 웹판·godot 의 패권·외교·생존 셋은 그 개념 자체가 없어 보류하고, **정복**(전 적국 함락, 이번에 판정 신설)과 **문화**(문답 정답 30 — godot 은 문답 은행 260개 기준 200이지만 이 트랙 은행은 36개뿐이라 "학문" 야망 목표(15)의 두 배로 좁힘) 둘만 남겼다. godot과 같은 "닫힌 판"(먼저 채운 조건 하나로 끝) — 새 `RealmVictoryState`(순수 정적 클래스), 달성 시 `SessionCard`로 결과 카드(연월·함락 성·로스터 3줄), 목표판 셋째 줄이 "가장 가까운 승리 조건 + 진척 %"로 바뀐다(`RealmSessionTracker.GoalLineWeek()`). `RealmCommandUi.ExecuteNextMonth()`만 godot처럼 판이 끝난 뒤를 막는다("공격"·"명령"은 안 막음 — 계속해도 무해). (공통 선행 A·B 는 2026-09-17 `RealmSessionTracker` 로 이식 완료 — 5-7 아이디어를 그대로 써 "월간" 트리거로 변형. **Q-U2(사슬 계속 vs 5-4 전환)는 2026-09-18 "사슬 계속"으로 결정 — 웹 미검증인 5-4(새 시나리오 6종)는 이 트랙에 안 옮긴다.** 세 사슬 끝(회계·영안·오원)이 원작 LINKS상 진짜 막다른 끝이라 "성 하나당 목표 하나" 제약을 풀고 16차 확장(장안→천수·장사→남해·강주→주제)으로 계속 늘림 — `RealmEnemyCity.TargetsFrom()`·`RealmCommandUi` 공격 고르기 패널 신설, 자세한 경위는 `docs/HISTORY.md` 2026-09-18. **5-1(2026-09-20)**: 무장 3명뿐이고 치안·태수·이간·명성 축이 없어 웹판 특성 12·야망 6종 대신 실제 계수 자리 셋(계략 성공률·출진 전투력·문답 보상)에 물리는 특성 3종(용맹·교활·현명)·값 판정 가능한 야망 3종(부귀·숙적·학문)으로 좁혔다. 새 `RealmOfficerTraits`(id 해시 결정적, 세이브는 야망 달성 여부만). **5-6(2026-09-20)**: 성 지형이 `RealmLand` 둘(Plain/River)뿐이라 웹판 지형 4종·전술 4개 대신 평야=기병 돌격(무력80+, 첫 합 ×1.25)·강=화공(지력60+, 전투 내내 상대 전투력 ×0.85) 둘로 좁혔다. "진형 수동 선택"은 이 트랙에 진형 시스템 자체가 없어(`RealmArmy`에 그런 필드 없음) 스코프 밖. `RealmWar.Fight/StepRound`에 `firstRoundPowerMul`·`defPowerMul` 두 배율 자리를 새로 열고 `RealmWarState.ResolveTactic()`이 지형·로스터 능력치로 계산, `RealmCommandUi`에 켜고 끄는 토글 버튼(현재 성 기준 지형 힌트 문구 포함) · **5-2(2026-09-20)**: 무장 관계(의형제·원수 등 20~30쌍)·세력 간 이벤트 대신 saga-godot 승인분과 같은 결로 "특성·야망(5-1) 조건의 1인 서사 카드"로 재해석 — 카드 7종(특성 3+야망 3+체인 후속 1 "논공행상"), 매달 18%, 효과는 금만(전투력·계략 배율은 5-1·5-6과 겹쳐 안 건드림), 세이브 없음(문답류와 같은 결). 새 `RealmEventState`, `RealmCommandUi`에 자동 팝업 패널(다른 아홉 패널과 달리 `CloseAllPanels()`가 안 건드림). **5-8(2026-09-20, 사용자와 두 차례 상의 뒤 재해석 확정 — 경위는 HISTORY 2026-09-20 grep)**: 무장 풀이 3명 고정(`RealmOfficerPool.Catalog`)이라 원작처럼 무장이 죽으면 로스터가 영구히 줄기만 하고, 반대로 "일시 정지"로 죽음을 빼면 후계자가 자리를 잇는다는 계승의 알맹이가 사라진다 — 그래서 아무도 안 죽되 **허창(본거지) 배치 자리 자체가 실제로 넘어가는** 쪽으로 좁혔다: 매달 낮은 확률로 허창 주재 무장이 물러나면 로스터의 다른 무장 중 통솔(Command) 최고가 허창을 잇고(`RealmCityState.SwapOfficerCities`, 기존 배치 딕셔너리를 맞바꿀 뿐이라 세이브 스키마 변경 없음), 대가로 허창 치안이 절반으로 깎인다(성 함락 뒤처리와 같은 기존 규칙 재사용). 웹판·saga-godot과 같은 "위험이 크므로 손잡이 뒤에" 원칙대로 `RealmSettingsState.SuccessionOn` 기본 꺼짐. 새 `RealmSuccessionState`. **5-3(2026-09-20, 이전 세션이 "실제로 만든 적이 없는 오기"라 바로잡은 뒤 이 세션이 구현)**: godot REALM(`realm_war.gd`·`realm_save_state.gd`)이 이미 실기 승인받은 재해석 그대로 옮겼다 — **일기토**는 "무력 차 보정" 없이 순수 3택 가위바위보(베기>막기>막기>찌르기>찌르기>베기)로 좁히고, 이 슬라이스의 `Fight()`가 10합 집계식이라 "합마다"가 아니라 3합 결과를 평균 배율(승1.3·무1.0·패0.8) 하나로 뭉쳐 `RealmWar.Fight`의 새 `duelPowerMul` 자리(매 합 atk 쪽, `firstRoundPowerMul`·`defPowerMul`과 안 겹치는 축)에 얹는다 — `RealmCommandUi`에 전술과 독립된 토글(둘 다 켜면 배율이 같이 곱해진다). **설전**은 동맹/화친(다른 세력) 자체가 없는 이 트랙엔 유일한 적용처인 "등용"(hire)에만 걸고, 사자 지력으로 난도 상한(70+→3등급·40+→2등급·그 밖 1등급)을 정해 문답 은행(`RealmQuizData.Bank`, 학당과 별도 추첨 — `RealmQuizState`의 익힘/오답/연속 상태는 안 건드림)에서 3문 뽑아 정답 수(0~3)→배율(0.8/0.95/1.1/1.3)을 등용 성공률에 곱한다(같은 0.05~0.9 구간으로 다시 클램프, 새 `RealmCityState.HireChance()` 순수 함수). 새 `RealmDuelState`·`RealmDebateState`) | `RealmCommandUi`·`RealmWarState`·`RealmWar`·`RealmOfficer`·`RealmOfficerTraits`·`RealmEventState`·`RealmSuccessionState`·`RealmQuizState`·`RealmSessionTracker`·`RealmEnemyCity`·`RealmDuelState`·`RealmDebateState`·`RealmVictoryState` |

**공통 선행(다섯 판 동시, SagaCore 에 1벌)**: `GoalBoard`(A, 3줄 위젯 — 게임별 공급자 인터페이스 `IGoalSource` 를 각 asmdef 가 구현) · `SessionCard`(B, Timeline 5초 카드) · `HitFeedback`(C — 아래) · `Cadence`(H, 로컬 시계 기반 일일/주간 키). SagaCore→게임 단방향 의존(49장)은 그대로.

## 101-3. 엔진 장점으로 C·G 를 한 단 올리기(웹이 못 하는 것)

| 표준 | Unity 수단 | 기본값 |
|---|---|---|
| C hitstop | `Time.timeScale` 대신 **피격자·가해자 Animator.speed=0** + 나머지 정상(전역 정지는 모바일 입력 지연) | 70ms, 치명 120ms — **다섯 판 중 실시간 전투가 있는 GO·DUNGEON·STORY 전부 구현 완료(2026-09-17)**. STORY는 `StoryCombat.ApplyHitFreeze()`(가해자만, 이 판은 적 쪽 Animator가 아예 없다)로, 웹판 원문 그대로인 크리티컬 전역 슬로모(`TriggerHitstop`/`Time.timeScale`)와는 별개 기능. GO는 `BanditEncounter`/`RareWolfEncounter.ApplyHitstop()` — 프레임 단위 공격이 아니라 초당 판정(`DuelRules.Step`)이라 "hit"/"heavy(안 피함)" 이벤트마다 player·foe(있으면) 둘 다 멎는다(늑대는 Animator 없는 primitive라 player만 실제로 걸림). GO 헤드리스 검증은 이 PC 기준 **player Animator가 null**(Maria FBX 미보유 — foe Abe는 예전에 구운 그대로라 있음)이라 foe 쪽 speed==0만 실제로 확인 |
| C 흔들림 | **Cinemachine Impulse Source/Listener**(이미 Cinemachine 권장, 40장) | 진폭 0.15m·120ms·감쇠 지수 |
| C 플래시 | `MaterialPropertyBlock` 로 `_EmissionColor` 80ms(머티리얼 복제 없음, SRP Batcher 유지) | 흰색 0.6 |
| C 팝·소리 | `DamagePopup`(DUNGEON·STORY 2026-09-17 기준 2벌 — GO/FOREST/REALM은 실시간 근접 전투가 없거나 범위 밖) + `SfxPlayer` 라운드로빈 3음 | 0.6s 상승·페이드 |
| C 타격 VFX | Mobile: Shuriken 스파크 8입자 / PC: VFX Graph 동일 이름 | **DUNGEON·STORY 구현 완료(2026-09-17)** — `HitSpark`(두 판 각각 사본, `DamagePopup`과 같은 파일 위치). VFX Graph는 에디터 노드 그래프라 이 프로젝트의 "빌드 스크립트가 코드로 짓는다" 방식과 안 맞아 **PC도 같은 Shuriken 재사용**으로 단순화(강공격/크리티컬은 입자 수 8→14·속도로만 구분). 표의 "풀링 16"도 `DamagePopup`과 같은 이유(도메인 리로드 끈 헤드리스 연속 실행에서 static 배열이 파괴된 오브젝트를 계속 든다)로 안 쓰고 즉시 Destroy — 수명 0.25s로 짧아 안전. 헤드리스 검증은 `HitSpark.SpawnCount`(테스트 전용 카운터)로 확인 |
| G 장비 가시화 | `CharacterVisual` 에 슬롯 소켓(무기·어깨·망토) — Mixamo Humanoid 본 이름 고정이라 소켓 공용 | 등급별 이미시브 림 3단 — **무기 소켓 DUNGEON·GO 구현 완료(2026-09-17)**. `CharacterVisual.FindOrCreateWeaponSocket()`(오른손 `HumanBodyBones.RightHand`, Humanoid 아니면 시각 루트 밑 고정 오프셋 폴백) + `WeaponVisual`(자루+칼날을 코드로 짓는다, 무기 메시 자산이 없어서 — 원작 자산 금지). `ItemData.Grade`(0~2)를 무기 서열에 맞춰 새로 매겼다(DUNGEON: wp_start·wp_axe=0, wp_saber=1, wp_glaive·wp_greatblade=2 / GO: wp_wood=0, wp_iron=1, wp_relic=2) — 등급이 높을수록 칼날이 조금 더 크고 이미시브 림이 강해진다(0=무광·1=옅은 청록·2=강한 금색). GO는 `HeroState.EquipmentChanged` 대신 `Inventory.ItemGained`(무기 슬롯만 필터링, "주웠다" 이벤트라 재장착 개념 자체가 없음 — 시작 무기도 없어 "닫힌 빈 손"이 0등급으로 표시됨). 어깨·망토 소켓은 그런 장비 데이터 자체가 아직 없어 범위 밖(105장 결정 전까지 손 안 댐). STORY는 아이템/등급 시스템 자체가 없어(순수 job 스탯) 이 방식 그대로 포트 불가하나, 사용자가 "직업별 무기 소켓"으로 재해석 지시(2026-09-18) — **완료**: `StoryWeaponVisual`(무사→검·궁수→활·협객→표창·방사→지팡이, 전부 primitive 조합), `StoryJobState.JobChosen` 이벤트(전직·세이브 로드 둘 다 배선 — `Restore()`도 쏘게 고침, 안 그러면 세션 중 리셋 뒤 손의 무기가 새 Job과 안 맞는다) |
| G 지형 반응 | **URP Decal Projector** 로 발자국·타격 흔적(웹 불가) | 수명 8s·최대 32 — **DUNGEON·GO 구현 완료(2026-09-17)**. `BuildDecalRendererFeature.cs`(멱등)가 `PC_Renderer.asset`·`Mobile_Renderer.asset` 둘 다에 `DecalRendererFeature`를 배선(기본값 Automatic 기법 — DBuffer/ScreenSpace 자동 선택, 데칼 레이어 끔이라 아무 표면이나 다 받음, **프로젝트 공통 자산이라 DUNGEON 때 한 번 배선한 걸로 다섯 판 전부 적용됨**). `GroundDecal`(판별 사본)이 발자국(이동 중 0.35s 간격)·타격 흔적(피격마다)을 스폰 — 텍스처 자산이 없어(원작 자산 금지) 패키지 내장 `Shader Graphs/Decal`에 단색만 입힌 사각 패치일 뿐 실제 발자국·타격 자국 "모양"은 아니다(실기 확인 대기). 캡 초과 시 가장 오래된 것부터 즉시 제거. GO는 실시간 프레임 히트 판정이 없어(`DuelRules.Step` 초당 판정) 타격 흔적은 `BanditEncounter`/`RareWolfEncounter.OnDuelEvent()`의 "hit"/"heavy(안 피함)" 케이스에 건다(101-3 C hitstop과 같은 훅). `SagaDungeon.asmdef`·`SagaGo.asmdef` 둘 다 `Unity.RenderPipelines.Universal.Runtime` 참조 추가 필요했음(`DecalProjector`가 URP 전용 어셈블리) — STORY는 asmdef 자체가 없어(전역 어셈블리) 이 문제가 없다. **STORY도 완료(2026-09-18)** — `StoryGroundDecal`(사본), 발자국은 `StoryPlayerController.Walk()`, 타격 흔적은 `StoryEnemy.TakeDamage()` |
| G 성장 연출 | Timeline + Cinemachine 컷(레벨업 1.2s) | **DUNGEON·GO 구현 완료(2026-09-17)** — `CameraRig.PlayLevelUpCut()`. Cinemachine 패키지를 이 프로젝트가 안 받았고(G 흔들림도 Impulse 대신 수동 `Shake()`) Timeline 애셋 전례도 없어 같은 결로 "줌을 MinZoom까지 당겼다 되돌리는" 수동 코루틴으로 대신했다(합계 1.2s 그대로). DUNGEON은 `HeroState.LeveledUp`, GO는 `PlayerStats.LeveledUp` → 각 `GameBootstrap.OnLeveledUp()`이 호출(GO는 그동안 구독자가 0명이었다 — 이번에 처음 연결). 스킵 가능 그대로 — 아무 키나 누르면 그 프레임에 원래 줌으로 복귀. STORY는 카메라가 오빗이 아니라 X/Y 고정 추적 원근 카메라(줌 개념 자체가 없음) — **완료(2026-09-18)**, `ZDistance`를 가변 필드로 바꿔 같은 결의 카메라 펀치인으로 재해석(`StoryCameraFollow.PlayLevelUpCut()`), `StoryJobState.LeveledUp` → `GameBootstrap.OnLeveledUp()` |
| F 죽음 | 리깅 유지한 채 `Animator` death → 유품 마커 프리팹 드롭 | **DUNGEON·GO 구현 완료(2026-09-17)** — `LootMarker`(`DungeonEnemy.Die()`가 기존 즉시 보상 뒤 호출). 회수 반경 2m(표 그대로), 주워도 추가 보상은 없다 — 이미 준 보상의 시각적 잔향일 뿐(즉시-보상 흐름은 세이브·베스티어리·퀘스트 완료가 얽혀 있어 안 건드림). 12초 안 주우면 스스로 사라짐. GO는 각자 사본 `World/LootMarker.cs`(SagaDungeon 참조 불가라 새로 짬) — `BanditEncounter`/`RareWolfEncounter.FinishFight()`의 승리 분기, 기존 보상(등용·경험치·돈·전리품) 뒤·`Destroy(gameObject)` 전에 호출. 헤드리스 검증은 Bandit만(RareWolf는 같은 스폰 함수 재사용이라 위험 낮다고 판단, 안 건드림). STORY도 **완료(2026-09-18)** — `StoryLootMarker`(사본, `StoryEnemy.Die()`가 Destroy 전에 호출), Animator 유무와 무관해 그대로 포트됨 |

전부 **기존 씬 구성을 안 바꾸는** 컴포넌트 추가라 `Build()` 재실행이 필요한 것은 위젯 캔버스 추가(A·B) 둘뿐이다.

---

# 102. 그래픽 개편 — 사실적 PBR(66-2 유지) 위에 SAGA-DESIGN §6 적용

**전제**: SAGA-DESIGN §6.0-1 "한 스타일 = 툰" 과 §6.3 "Shader Graph 툰" 은 이 트랙엔 적용하지 않는다 — 66-2장(사용자 지시 2026-09-13, 사실적 PBR·FF16 톤)이 우선한다. §6.0 의 **나머지 원칙**(팔레트→톤, 스케일, 빛 방향, 카메라, 실루엣)과 §6.4 "허접 10가지" 는 그대로 적용한다. 트랙 간 스타일 불일치 자체는 105장 Q3′.

## 102-1. 아트 바이블(이 트랙 판)
1. 한 스타일: **사실적 PBR + 필름틱 LUT**. Kenney 로우폴리·VRoid 애니풍과 한 화면에 섞지 않는다(44장 교체가 끝난 판부터 강제).
2. 톤: 팔레트 스냅 대신 **판별 색보정 LUT 1장**(`Assets/Settings/LUT_<game>.png`, 32³) — 마을=따뜻/그림자 차갑게, 굴혈=청록, 들판=황금시각, 필드(STORY)=고대비, 성(REALM)=저채도.
3. 스케일: 사람 1.7m(Mixamo 기본 1.75 → `MixamoRigUtil` 에서 0.97), 문 2.2m, 층 3m. 임포트 `Preset` 으로 강제(103-2).
4. 빛: 키 라이트 방향 고정(회전 X 55°·Y -45°), 림 라이트 1(반대편 약 0.3), 앰비언트 = 스카이 그라디언트. `SkyFogBuilder`(GO) 값을 다섯 판 공통 프리팹으로.
5. 카메라: 판별 1개(FOV 40·거리 6·기울기 25°, STORY 는 정사영 12), 줌 2단. 흔들림은 101-3 Impulse 만.
6. 실루엣: 캐릭터·적은 128px 축소 스냅으로 구별 확인(`PlaytestXxx` 에 스크린샷 다운스케일 단계 추가 — GUI 필요라 사람 확인 몫).

## 102-2. Volume 프로파일 — 현재값과 추가값

| 오버라이드 | 현재(`FF16Volume_PC/Mobile`) | 추가·변경 | PC | Mobile |
|---|---|---|---|---|
| Tonemapping | ACES | 유지 | ○ | ○ |
| Bloom | 임계 0.9·강도 0.35·scatter 0.6·tint 따뜻 | 강도 0.5(§6.3) | ○ | ○(0.3) |
| Color Adjustments | 노출 +0.1·대비 12·채도 -8·필터 따뜻 | 대비 5·채도 -5 로 완화 + **LUT**(Color Lookup, 102-1-2) | ○ | ○ |
| Vignette | 0.25·smooth 0.6 | 유지 | ○ | ○ |
| Film Grain / CA | 0.15 / 0.08 (PC 만) | 유지 | ○ | × |
| **SSAO**(Renderer Feature) | 템플릿 기본(PC) | 반경 0.5·강도 1.5·다운샘플 | ○ | × |
| **Screen Space Shadows** | 없음 | Renderer Feature 추가 | ○ | × |
| **Fog** | `SkyFogBuilder`(GO 만) | 다섯 판 공통, 색=하늘 지평선, 지수 0.012 | ○ | ○(0.008) |
| Shadows | Cascade 4/1, 2048/1024, MSAA 4/2 | 유지 + **접지 blob 그림자** 프리팹(모바일 캐릭터) | ○ | blob |
| Depth of Field | **대화·카드 연출 토글 시만**(`SessionCard` 가 켠다, 105 Q-U5 2026-09-17 확정·구현 완료) | 유지 | ○ | × |
| Motion Blur | 없음 | 넣지 않는다 | × | × |
| Adaptive Probe Volumes | 없음 | 정적 씬 5개에 APV 1 + Reflection Probe 1 | ○ | 라이트맵 |

전부 `BuildFF16VolumeProfiles.cs` 확장 + `PC_Renderer.asset` Feature 추가로 코드에서 짓는다(Shader Graph 배선과 달리 코드 가능).

## 102-3. 캐릭터·재질 파이프라인
- 캐릭터: **Mixamo Humanoid(FBX)** 표준 유지, `MixamoRigUtil` 1벌. 피부는 `BuildMariaSkinSplit` 근사 → Shader Graph SSS 배선(사람 몫) 뒤 교체. 헤어카드 이방성(`AnisoHair_cathyhlshih`, MIT) 은 헤어 메시가 분리된 캐릭터에만.
- 환경: Poly Haven CC0 PBR(`EnvironmentPBR_candidates` 5벌 → 승격) + `BuildMetallicSmoothnessMap()` 채널 팩킹 유지. **트라이플레이너 셰이더 1개**(heightmap 메시용, Shader Graph 없이 HLSL — `VertexColorLit.shader` 옆) 로 잔디·흙·돌 3타일 블렌드.
- heightmap 메시: `TerrainBuilder`(GO) 의 4×4 서브쿼드 정점 블렌딩 유지. 높이 데이터 규격(`float[w*h]` + 셀 크기)은 saga-godot 과 **파일 포맷만 공유**, 코드는 공유하지 않는다.
- VRoid: `UniVRM + MToon10` 은 애니풍 셰이더라 66-2 와 상충 — 이 트랙에선 초상·컷신에도 쓰지 않는다(105장 Q3′ 결정 전까지 파일만 보존).

## 102-4. `Assets/Art` 판정 표(삭제는 105장 결정 뒤 — 지금은 표만)

| 폴더 | 내용 | 판정 | 이유 |
|---|---|---|---|
| `CharacterShaders_candidates/` SSS·AnisoHair·HairCards | MIT·MIT·CC0 | **남김→`Art/Shaders/Character/` 로 승격** | 사실적 방향의 핵심. Shader Graph 배선만 남음 |
| `EnvironmentPBR_candidates/` Poly Haven 5벌 + .mat | CC0 | **남김→`Art/Environment/PBR/` 승격** | 이미 44장 교체에 쓰임 |
| `CharactersRealistic/` (gitignore) | Mixamo Maria·Abe·Brute | 남김(로컬 전용) | ToS 상 재배포 금지, 커밋 안 함 |
| `CharactersVroid/` AvatarSample_A | 애니풍 | **보류→뺄 것** | 임포트 검증 끝, 66-2 와 불일치 |
| `Characters/` Kenney blocky 4종 | CC0 로우폴리 | **뺄 것**(44장 Player·Enemy 교체 완료 확인 후) | 플레이스홀더 |
| `Buildings/`·`Dungeon/`·`Props/`·`Rocks/`·`Shrine/`·`Vegetation/` Kenney | CC0 | **단계 교체** — 씬에 남은 참조 grep 후 PBR 재질 모듈로 | 44장 Environment/Building 완료분과 겹치는 것부터 |
| `Audio/` Kenney·CC0_BGM | CC0 | 남김 | |

## 102-5. §6.4 "허접 10가지" 해당 여부
스타일 혼재 **해당**(Kenney 잔존·VRoid) · 후처리 **일부**(LUT·SSAO·SSS 없음) · 그림자 계단 **해당**(Mobile Cascade 1, blob 없음) · 바닥 한 색 **해당**(`VertexColorLit` 정점색 지형) · 하늘·안개 **GO 외 해당** · 스케일 **해당**(Kenney 1.0 vs Mixamo 1.75 혼재) · 애니 끊김 **해당**(Animator 전이 exitTime 0.9, 블렌드 없음) · 타격 반응 **해당**(101-1 C) · UI 폰트·패널 **일부**(`RealmUiKit`·`EncounterUiKit` 둘, 통일 안 됨) · 카메라 클리핑 **해당**(`CameraRig` 충돌 당김 없음 — `CinemachineDeoccluder` 로).

---

# 103. 에셋 창조 파이프라인 (SAGA-DESIGN §7 적용)

## 103-1. 이 트랙이 받는 것
- `tools/asset-forge/`(저장소 루트, 제안 상태) 산출물은 **`Assets/Art/Generated/<game>/`** 로 받는다. 원본 팩·Poly Haven 과 섞지 않는다. 씨앗·팔레트 JSON 은 `Assets/Art/Generated/_seed/` 에 같이 둔다(재생성 가능).
- 이 트랙은 팔레트 스냅(§7.2-1) 대신 **LUT 톤**(102-1-2)이라 `palette.py` 는 정점색 플레이스홀더 메시에만 쓴다. 주력은 `procgen.py`(바위·나무·울타리·돌담·비석, 사실적 방향은 노이즈 변형 + PBR 트라이플레이너)·`kitbash.py`(Poly Haven 텍스처가 입힌 모듈로 건물 변형)·`tilegen.py`(트라이플레이너 3타일 세트, 판별 5)·`sfxgen.py`.
- 변형 배가 대상: 나무(오크 1종 → 바이옴 5×3 형태) · 바위(2 → 12) · 건물 모듈(Kenney 4 → PBR 모듈 8 × 배치 조합) · DUNGEON 방 셸(4 → 티어별 마모 3단) · REALM 성벽 3단.

## 103-2. 임포트 프리셋 규칙(`Assets/Settings/Presets/`, 코드로 적용)
| 대상 | Preset | 값 |
|---|---|---|
| 텍스처 albedo/normal/ORM | `Tex_PBR` | 최대 2048(PC)·1024(Mobile override, ASTC 6×6), sRGB albedo 만, 노멀 타입 지정 |
| 메시 GLB/FBX 정적 | `Mesh_Static` | Read/Write 끔, 스케일 1.0(§6.0-3 자동 리스케일은 빌더에서), 라이트맵 UV 생성 |
| 캐릭터 FBX | `Mesh_Humanoid` | `MixamoRigUtil` 이 처리(Humanoid·ExtractTextures) |
| 오디오 | `Audio_SFX`/`Audio_BGM` | SFX 압축 ADPCM·BGM Vorbis 0.5·스트리밍 |

## 103-3. 사람이 여는 도구(§7.3) — 이 트랙 조건
- **Mixamo**: 표준. 새 캐릭터는 body FBX(For Unity) + 필요한 클립. 재배포 금지라 `CharactersRealistic/` 로컬 전용, 분리 메시 산출물도 그 안 `Generated/`.
- **Blender**(미설치): 설치되면 헤어 마스크·리토폴로지·헤어카드 분리(⑪이 막힌 지점)·데시메이트를 `blender -b -P` 배치로 세션이 자동화 가능.
- **VRoid**: 이 트랙에선 쓰지 않는다(102-3).
- AI 3D(§7.4)로 만든 소품은 Blender 데시메이트 + 102-2 Preset 을 거친 뒤에만 `Generated/` 로.

## 103-4. 44장 교체 결정과의 관계
44장(Player→Enemy→Boss→Environment→Building) 교체는 다섯 판 완료다. 103 은 그 **다음 층** — 종류를 늘리는 것이 아니라 E(발견 밀도) 를 채울 **변형 밀도** 를 만든다. 새 종류 추가는 101-2 후보가 요구할 때만.

---

# 104. 안정화·검증 (SAGA-DESIGN §8 적용, Phase 0)

## 104-1. Phase 0 목록(101 착수 전에 끝낸다)
1. ~~배치 모드 뒤 4파일 원복을 `tools/unity-batch.sh` 한 줄로~~ — **완료**(`tools/unity-batch.sh`, 2026-09-16).
2. ~~**Playtest 원칙 교체**~~ — **완료**(2026-09-16, GO·DUNGEON·FOREST·STORY `CheckSettingsPanel()` 전부 실제 호출 검증으로 교체). 남았던 구멍 `StoryJobChoiceUi`(전직 팝업, 테스트 자체가 없던 것)도 **2026-09-17에 메움**(`PlaytestStorySlice.cs` — Show()로 뜨는지·버튼 클릭(Choose)으로 콜백+닫힘까지 확인).
3. ~~`[SerializeField]` 누락 감사~~ — **완료**(2026-09-16, `UI/`·`World/`·`Player/` 폴더 전부 grep, 버그 없음 확인).
4. 실기 확인 대기(`PROJECT_STATE.md`) 를 사용자가 몰아서 1회 — 결과로 닫히는 항목만 지운다.
5. `Assets/Art/*_candidates` 승격·삭제(102-4, 105장 결정 뒤).
6. 문서 상한: `PROJECT_STATE.md` ≤15KB·PLAN ≤110KB — `tools/precheck.sh` 가 검사한다.

## 104-2. 검증 절차(중복 금지 — 정본은 폴더 `CLAUDE.md`)
배치 컴파일 → 씬 `Build()`(GameObject 구성이 바뀔 때만) → 해당 `Playtest*` 3연속 → 4파일 원복 → `git diff --stat` 확인 → 커밋. GUI 는 사용자 요청 시만. Play 진입 테스트는 `-quit` 없이.

## 104-3. 세이브 스키마
게임별 `XxxSaveState` 버전 필드 유지(GO v5+, FOREST v4, STORY v6 …). 101 후보가 필드를 더할 때 **구버전 로드 단계**를 해당 `Playtest*` 에 반드시 추가(웹 §8-3 과 같은 규칙). 마이그레이션 경로 없이 필드를 잃는 변경(FOREST v3→v4 가구 배치 소실 같은 것)은 이제 하지 않는다.

---

# 105. 열린 질문 (사용자 결정, 답이 나오면 해당 장으로 내리고 여기서 지운다)

- **Q1(§10-Q1) 완성판 트랙**: godot·unity 병행은 유지하되 그래픽·에셋 투자를 먼저 집중할 트랙을 고를 것인가. 이 트랙 관점 근거: URP Volume·APV·Cinemachine·Mixamo 직접 임포트가 이미 돌고 있어 **사실적 방향의 완성판**으로는 준비가 앞서 있다. 대신 모바일 빌드 크기·빌드 시간은 Godot 보다 불리하다.
- **Q3′ 스타일 불일치**: SAGA-DESIGN §6.0-1 은 "한 스타일(툰)" 인데 이 트랙은 66-2 로 사실적이다. **트랙 간 불일치를 허용**(웹·godot=툰, unity=사실)할지, 공통 문서를 "트랙마다 한 스타일" 로 고칠지. 이 PLAN 은 허용을 전제로 썼다.
- **Q4(§10-Q4) 생성 에셋 커밋**: `Assets/Art/Generated/` 산출물을 커밋할지, 스크립트+씨앗만 두고 세션 시작 시 재생성할지(Unity 는 .meta 가 따라붙어 재생성 시 GUID 가 바뀌면 씬 참조가 깨진다 — **커밋 쪽을 권장**, 크기 상한 판별 20MB).
- **Q-U1 101 착수 순서**: 공통 선행(GoalBoard·SessionCard·HitFeedback·Cadence)을 먼저 다섯 판에 깔지, 한 판(GO)에서 A~C 를 끝까지 보여 준 뒤 확장할지. (권장: GO 한 판 끝까지 → 사용자 GUI 확인 → 확장)
- **Q-U3 Shader Graph 배선 일정**: SSS·헤어카드 노드 연결(사람 GUI) 을 언제 할지. 그때까지 피부는 근사 유지.
- **Q-U4 Mixamo 캐릭터 추가**: 인물 105 를 이 트랙에서 몇 명까지 실제 모델로 갈지(현재 3). 나머지는 Maria/Abe/Brute 3 베이스 + 장비 소켓(101-3 G) 변형으로 갈지.

---

# FINAL RULE

Claude Code는 이 문서를 한 번에 1~100까지 실행하지 않는다.

```text
현재 Step 확인 → 해당 Step만 실행 → 검증 → 상태 기록 → 다음 Step
```

특히 최초에는:

```text
(레거시 감사는 saga-godot 것 재사용 — 4장)
→ Vertical Slice 설계(Phase 2)
→ Project Foundation(Phase 1)
```

순서로, 둘 다 마친 뒤 Phase 3(3D World)부터 실제 구현에 들어간다.

**완성 게임을 한 번에 만들지 않는다.** 먼저:

> "작지만 그래픽이 좋고, 이동이 좋고, 전투가 재미있고, 탐험하고 싶고,
> 보상을 얻고 다시 플레이하고 싶은 3D 모바일 게임"

을 Unity로 만든다. `saga-godot` 트랙이 같은 목표를 향해 따로 가고 있다는
것을 항상 기억한다 — 서로 코드를 베끼지 않되, 어느 한쪽이 먼저 좋은
해법(예: 땅 경계 블렌딩, 렌더러 이중 프로파일)을 찾으면 **개념만**
참고한다.
