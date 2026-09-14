# SAGA 프로젝트 — Unity 6 3D 신규 구축 최종 작업지시서
## saga-godot과 나란히 가는 두 번째 엔진 트랙 / Vertical Slice 우선 / Mobile 3D RPG

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

---

# 34. Claude Code 작업 상태 파일

```text
docs/
├── PROJECT_STATE.md   (완료 단계/현재 작업/다음 작업/알려진 오류/테스트 상태만)
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

## ① 라이팅/색보정/후처리 셋업 — 완료 (2026-09-13)

**"이어해" 요청으로 다섯 판 전부에 구현·검증까지 끝났다.** 자세한 내용은
`docs/PROJECT_STATE.md` "66-2장 '다음에 할 일' ① 라이팅/색보정/후처리
셋업" 항목 참고 — 여기서 반복하지 않는다. 요약만: `BuildFF16VolumeProfiles.cs`
가 공유 VolumeProfile 둘(`FF16Volume_PC/Mobile.asset`)을 짓고, 다섯
`BuildXxxScene.cs`가 GlobalVolume+`PlatformVolumeProfile`로 꽂는다.
실제 화면(GUI) 톤 확인은 아직 — 사람이 볼 차례.

## ② 환경 PBR 텍스처 킷 조사 — 샘플 다운로드·URP 파이핑 검증 (2026-09-13, 이어서)

- **Poly Haven**(CC0, Quixel Megascans급 포토스캔 재질 — 공개 API로
  로그인 없이 정적 URL 다운로드 가능, saga-godot 세션이 Quaternius에서
  겪은 "itch.io가 JS라 자동 다운로드 불가" 문제가 없다)에서 두 재질을
  받았다: **`cobblestone_floor_01`**(마을 바닥, 현재 Kenney Fantasy
  Town Kit 대체 후보)·**`castle_wall_slates`**(성벽/건물 벽, 현재
  Kenney 대체 후보). 둘 다 CC0, 1k JPG로 diffuse·normal(OpenGL)·
  roughness·AO 네 맵 전부. `Assets/Art/EnvironmentPBR_candidates/`에
  두고 `LICENSE.txt`(출처 URL) 동봉 — **아직 후보일 뿐, 어느 씬에도
  안 물렸다**(saga-godot의 `_candidates_66-2` 폴더와 같은 자리 표시자
  성격).
- `BuildEnvironmentPbrSample.cs`(신규, `Saga/Build Environment PBR
  Sample Materials` 메뉴) — 두 재질을 URP `Lit` 셰이더 머티리얼로
  코드로 지어 실제로 파이프라인이 도는지 검증(diffuse→BaseMap,
  normal→BumpMap+`_NORMALMAP` 키워드, AO→OcclusionMap+`_OCCLUSIONMAP`
  키워드). 배치 모드(`-executeMethod`)로 실행, 컴파일 오류 0건·머티리얼
  2개 생성 확인.
- **채널 팩킹 문제 발견, 지금은 근사만 해 뒀다** — Poly Haven의
  Roughness는 별도 텍스처인데 URP Lit의 Metallic 워크플로는 Smoothness를
  Metallic맵의 알파 채널로만 받는다(별도 Roughness 슬롯이 없다). 지금은
  Smoothness를 상수(0.3~0.35, 러프니스 실측 평균의 반전 근사)로만
  뒀다 — **실제 교체 때는 커스텀 Shader Graph로 Poly Haven의 `arm`
  (Occlusion-Roughness-Metalness 팩) 텍스처를 풀어 쓰거나, Roughness→
  Smoothness 반전 텍스처를 미리 구워야 한다.** 다음에 이 재질을 실제
  지형/벽에 쓸 세션이 참고할 것.
- 헤드리스 임포트(`-batchmode -nographics -quit`) 후 `ProjectSettings/`·
  `Packages/` 배치 모드 부작용(이 PC의 Unity 6000.3.24f1이 프로젝트
  고정 버전 6000.3.23f1보다 최신이라 자동 버전업) 재확인 → `git
  checkout`으로 되돌림(CLAUDE.md에 이미 기록된 함정, 두 번째 발생분).
- **현실적 기대치 표 갱신 근거** — "환경(지형·식생·던전 재질) 근접
  가능성: 중간~높음"이라던 앞선 판단이 실제로 확인됐다. Poly Haven
  재질 자체 화질은 실제로 AAA급이고 CC0라 비용도 없다 — 남은 건
  채널 팩킹(위)과 실제 지형 메시에 UV 스케일 맞춰 붙이는 작업뿐.

## ③ 캐릭터 에셋 조사 — Mixamo가 이 저장소의 기존 선례다 (2026-09-13, 이어서)

- **레거시 감사 결과 재확인(4장 원칙 — 새로 안 하고 웹 판 기록을 그대로
  가져다 씀)**: 웹 판 **사가의숲**이 2026-09-02에 이미 "사실적 사람"
  문제를 풀어 봤다(`saga-web/saga-forest/assets/ASSET_LICENSES.md`
  "Mixamo (Adobe)" 절). 결론과 제약이 이 프로젝트에도 그대로 적용된다:
  - **Mixamo(mixamo.com, 무료 Adobe 계정)가 실사 인체·리깅·애니메이션
    소스로는 최선이다** — 포토그래메트리는 아니지만 실사 비율 스캔
    기반 캐릭터+수백 종 애니메이션을 무료로 제공한다.
  - **자동화 불가** — mixamo.com은 공개 API가 없고 캐릭터 선택·
    포맷·다운로드가 전부 로그인 후 GUI 조작이다(VRoid Studio와 같은
    종류의 "사람이 직접 열어야 하는" 지점).
  - **약관상 재배포 금지 — 변환 결과물을 이 공개 저장소에 커밋하지
    않는다.** "원본 캐릭터·애니메이션을 독립 에셋으로 재배포"가
    금지라(Adobe 커뮤니티 공지 다수가 일관되게 확인), 사가의숲도 받은
    걸 `.gitignore`로 막고 로컬에만 뒀다. 이 프로젝트도 같은 원칙 —
    **`.gitignore`에 `Assets/Art/CharactersRealistic/`을 미리 추가해
    뒀다**(아직 폴더 자체는 없음, 받을 때를 대비한 선점).
  - saga-go 세션이 별도로 "자동화까지 하고 싶다"며 시도했던 대안들
    (Vitruvian Project 등)은 전부 막다른 길로 확정됐던 것도 그대로
    유효 — 다시 조사하지 않는다.
- **Unity는 웹 판보다 오히려 쉽다.** 웹(three.js)은 Mixamo FBX를
  `FBX2glTF`+`gltf-transform`으로 glTF로 변환하는 파이프라인이
  따로 필요했는데, **Unity는 FBX를 기본 임포터로 직접 읽는다**(glTF
  변환 불필요, Mixamo 표준 휴머노이드 리그도 Unity의 Humanoid
  Avatar로 바로 매핑된다) — 웹 판의 `tools/mixamo/slim_anim.js` 류
  후처리 스크립트도 필요 없다.
- **사람이 할 일(다음 세션 또는 사용자가 직접)** — 사가의숲 레시피를
  Unity용으로 옮기면:
  1. mixamo.com에서 캐릭터 하나 고르기(사가의숲처럼 아예 처음부터
     하려면 **Maria** 재사용도 가능 — 이미 라이선스·평판 확인된 선택)
     → Download, Format **FBX for Unity(Skin)** 로 몸 1회
  2. 필요한 애니메이션(이동·전투 등, PLAN.md 게임별 요구 액션에 맞춰
     선정 — 사가의숲의 여덟 개 목록을 참고 출발점으로 삼되 이 프로젝트
     액션에 맞게 조정) 각각 Format FBX(Without Skin)로 받기
  3. `Assets/Art/CharactersRealistic/`(신규, `.gitignore` 대상)에
     그대로 넣기만 하면 Unity가 FBX를 직접 임포트 — 웹 판 같은 변환
     스크립트 불필요
  4. Rig 탭에서 Animation Type을 **Humanoid**로, Avatar Definition을
     "Create From This Model"로 지정 — 이후 다른 Mixamo 애니메이션도
     같은 Avatar를 공유해 재사용 가능(Unity Humanoid 리타게팅)
- **헤어카드·URP SSS 스킨 셰이더 — 조사 결과(2026-09-13)**. Mixamo
  캐릭터는 헤어가 보통 메시에 통합돼 있어 "여러 겹 헤어카드"까지는
  기본 제공이 아니고, URP는 HDRP와 달리 전용 Skin/Hair 마스터 노드가
  없다(HDRP의 Hair 마스터 노드·`com.unity.demoteam.digital-human`
  둘 다 HDRP 전용, URP로 그대로 못 옮긴다). 다만 **"직접 처음부터
  짜야 한다"는 아니다** — 공개(GitHub) URP 전용 Shader Graph 구현이
  이미 있다:
  - **스킨(SSS 근사)**: `CiaranSimpson/Subsurface-Scattering-for-
    Unity-URP`(모바일 지향 wrap-lighting 근사, 즉시 쓸 수 있는 수준) —
    더 사실적으로 가려면 Eric Penner의 pre-integrated skin(곡률 기반
    diffuse lookup + thickness map, HDRP·유료 에셋들이 실제로 쓰는
    기법)을 Custom Function 노드로 직접 옮겨야 한다(URP Shader Graph에
    로우레벨 라이팅 데이터를 노출하는 내장 노드가 없어서 이 부분만은
    피할 수 없다).
  - **헤어카드(이방성 하이라이트)**: `cathyhlshih/
    UnityURPAnisoHighlightHairShader`·`itsFulcrum/Unity-URP-Hair-
    Shader`(둘 다 URP Shader Graph, Kajiya-Kay류 이방성 + 알파클립
    카드 처리) — Unity 공식 `Unity-Technologies/URP-Defender-
    Character-Demo` 레포에도 참고용 이방성 헤어 Shader Graph가 있다.
  - **결론**: 완전히 무료·즉시 쓸 수 있는 뼈대가 다 있다 — 다음에
    실제로 캐릭터에 붙일 세션은 "새로 설계"가 아니라 "위 공개 구현을
    가져와 이 프로젝트 텍스처·머티리얼 슬롯에 맞게 손보는" 일이 된다.
    단, 그 GitHub 저장소들 각각의 라이선스(MIT/CC 등)를 가져다 쓰기
    전에 한 번 확인할 것 — 아직 안 함(이번엔 존재 확인까지만).
- 이번 세션은 **문서 조사만** — 실제로 mixamo.com에서 캐릭터를 받는
  것도, `Assets/Art/CharactersRealistic/` 폴더를 실제로 만드는 것도,
  위 GitHub 셰이더를 실제로 받아 붙이는 것도 아직 안 함(66-1/66-2장이
  이미 여러 번 짚은 "GUI 전용 자동화 불가" 지점과 같은 종류거나, 다음
  단계에서 실제 코드로 옮길 일).

## ④ 캐릭터 셰이더 라이선스 확인 + ②의 채널 팩킹 실제 해결 (2026-09-13, 이어서)

- **③이 조사만 해 둔 GitHub 셰이더 세 곳의 라이선스를 실제로 확인했다**
  (GitHub API로 `license.spdx_id` 조회) — 전부 문제없이 쓸 수 있다:
  - `CiaranSimpson/Subsurface-Scattering-for-Unity-URP` → **MIT**
  - `cathyhlshih/UnityURPAnisoHighlightHairShader` → **MIT**
  - `itsFulcrum/Unity-URP-Hair-Shader` → **CC0-1.0**
  - 참고로만 언급했던 `Unity-Technologies/URP-Defender-Character-Demo`는
    **저장소를 찾지 못함(404, 검색해도 없음)** — 이름이 바뀌었거나
    비공개/삭제된 것으로 보인다. 실사용 대상이 아니었으니 그냥 목록에서
    뺀다, 다시 찾으려 하지 않는다.
- **②에서 미뤄 뒀던 채널 팩킹 문제를 실제로 풀었다** — 처음 계획은
  "커스텀 Shader Graph로 ORM 언팩"이었지만, 더 간단한 방법으로 갔다:
  `BuildEnvironmentPbrSample.cs`에 `BuildMetallicSmoothnessMap()`을
  추가해 Poly Haven의 Roughness 원본(`_rough_1k.jpg`)을 에디터에서
  픽셀 단위로 읽어(`GetPixels32`) RGB=0(비금속)·A=255-Roughness로 다시
  구운 `_metallicsmoothness_1k.png`를 만들고, 머티리얼의
  `_MetallicGlossMap`에 물려 `_METALLICSPECGLOSSMAP` 키워드를 켠다
  (`_Smoothness`는 1로 둬 알파값이 그대로 통과하게). 결과는 표준 URP
  Lit Metallic 워크플로 그대로라 커스텀 셰이더가 아예 필요 없다 — 왜
  Shader Graph보다 이쪽이 나은지: 텍스트로 손으로 짤 수 없는
  `.shadergraph` JSON 자산을 새로 안 만들어도 되고, 결과 머티리얼이
  표준 URP Lit이라 향후 유지보수·다른 재질과의 호환이 더 쉽다.
  - 배치 모드(`-executeMethod
    Saga.EditorTools.BuildEnvironmentPbrSample.Build`)로 실행,
    컴파일 오류 0건·`cobblestone_floor_01`·`castle_wall_slates`
    양쪽 다 `_metallicsmoothness_1k.png`+`.mat` 정상 생성 확인.
  - 배치 모드 부작용(`ProjectSettings/`·`Packages/` 버전 자동 변경)도
    이번엔 재확인 결과 없었음(`git diff -- ProjectSettings/
    Packages/`로 확인) — CLAUDE.md의 함정이 매번 발생하는 건 아니고
    프로젝트 고정 버전과 로컬 Unity 버전이 이미 일치하면 안 일어난다.
  - 부작용으로 `_rough_1k.jpg` 원본 두 장의 텍스처 임포터 설정이
    `isReadable=true`·`Uncompressed`로 바뀌었다(픽셀을 읽으려면
    필요) — 이 원본은 어느 씬·머티리얼도 참조하지 않아(구운 PNG만
    참조됨) 빌드에는 포함되지 않으니 문제없다.

## ⑤ 캐릭터 셰이더 세 벌 실제 반입 (2026-09-13, 이어서)

- **④에서 라이선스 확인까지 끝난 세 저장소를 `git clone`으로 실제
  받아 `Assets/Art/CharacterShaders_candidates/`에 넣었다** — 아직
  캐릭터가 없어(Mixamo 반입 전) 어느 머티리얼/씬에도 안 물렸다, 순수
  후보 반입.
  - `SSS_CiaranSimpson/` — `FakeSSS.shadersubgraph`만 가져옴.
    **원본 저장소의 데모용 "Subsurface Shader.shadergraph"는 이
    프로젝트의 Unity 6000.3 Shader Graph 패키지로 임포트하면
    `NullReferenceException`으로 깨져서 뺐다**(원본이 더 오래된
    Shader Graph 버전으로 저장된 그래프로 보임 — 재사용 대상인
    서브그래프 노드 자체는 정상 임포트됨, 다음에 우리 캐릭터 셰이더
    그래프 안에 이 노드를 직접 넣어 쓰면 된다).
  - `AnisoHair_cathyhlshih/` — `UnityURPAnisoHighlightHair/` 전체
    (셰이더 그래프+서브그래프+예시 머티리얼) 그대로, README 데모
    이미지(`Images/`)만 제외.
  - `HairCards_itsFulcrum/` — `FulcrumHairShader/`(HLSL 커스텀 URP
    셰이더)+`Textures/` 그대로.
  - 각 폴더에 원본 `LICENSE` 파일 동봉 + 상위에 출처·제외 이유 정리한
    `LICENSE.txt`(Poly Haven 후보 폴더와 같은 관례).
- 배치 모드(`-batchmode -nographics -quit`, `-executeMethod` 없이
  순수 임포트)로 두 번 실행해 컴파일 오류 0건·깨진 셰이더그래프 제거
  후 재확인, `ProjectSettings/`·`Packages/` 배치 모드 부작용 없음
  확인.

## ⑥ Poly Haven 재질 추가 조사 — 흙길·초목·목재 세 벌 (2026-09-13, 이어서)

- ②가 대표 둘(바닥·벽)만 확인했던 것에 이어 **44장 우선순위대로 셋을
  더 받았다** — 전부 CC0, Poly Haven 공개 API로:
  - **`grass_path_2`**(흙길) — `Assets/Art/EnvironmentPBR_candidates/
    PolyHaven_GrassPath2/`
  - **`leafy_grass`**(초목 바닥) — `.../PolyHaven_LeafyGrass/`
  - **`dark_wooden_planks`**(목재) — `.../PolyHaven_DarkWoodenPlanks/`
  - 셋 다 diffuse·normal(OpenGL)·roughness·AO 네 맵(1k JPG) 전부.
- `BuildEnvironmentPbrSample.cs`에 세 재질을 추가해(기존
  `BuildMetallicSmoothnessMap()` 그대로 재사용 — ④에서 이미 채널 팩킹을
  풀어 둔 덕에 새 재질도 별도 작업 없이 바로 적용됨) 총 다섯 개 URP Lit
  머티리얼을 만든다. 배치 모드로 컴파일 오류 0건·머티리얼 5개 생성
  확인, `ProjectSettings/`·`Packages/` 부작용 없음.
- **아직 후보일 뿐 — 어느 씬에도 안 물렸다**(위 ②와 같은 성격).

## ⑦ Mixamo 캐릭터 반입 + Humanoid 리깅 (2026-09-13, 이어서)

- **사용자가 mixamo.com에서 직접 받았다** — 몸(**Maria WProp J J Ong**,
  Format FBX for Unity)+애니메이션 8개(③ 레시피 그대로: idle·walk·run·
  attack·hit·dodge·death·interaction), 전부 `C:\Users\Windows\Downloads`에
  받아 뒀길래 `Assets/Art/CharactersRealistic/`(`.gitignore` 대상, 로컬
  전용)로 복사해 넣었다. 애니메이션 파일들은 예상보다 커서(각 15~16MB,
  몸과 비슷한 크기) "Without Skin"이 아니라 메시 포함으로 받힌 것으로
  보이지만 — 기능엔 문제없다(아래에서 Copy From Other Avatar로 몸의
  Avatar를 그대로 쓰게 만들어서 각 파일 자체의 메시는 안 쓴다), 로컬
  디스크 용량만 더 든다(총 ~140MB, 커밋 안 되니 저장소 크기엔 무관).
- **`SetupMixamoCharacterImport.cs`(신규, `Saga/Setup Mixamo Character
  Import` 메뉴)** — 몸 FBX는 `ModelImporterAnimationType.Human`+
  `CreateFromThisModel`로 Avatar를 새로 만들고, 애니메이션 8개는
  전부 `CopyFromOther`로 몸의 Avatar를 그대로 물려(리타게팅이 확실히
  같은 골격에 걸리게) 각 파일의 클립을 액션 이름(`idle`·`walk`·`run`·
  `attack`·`hit`·`dodge`·`death`·`interaction`)으로 바꾸고 loopTime을
  적절히 설정(idle/walk/run만 루프)한다.
- 배치 모드(`-executeMethod
  Saga.EditorTools.SetupMixamoCharacterImport.Setup`)로 실행 —
  **몸 Avatar가 `isValid`·`isHuman` 둘 다 통과**(Mixamo 표준 T-pose가
  Unity Humanoid 매핑에 별다른 수동 보정 없이 바로 들어맞았다는 뜻),
  8개 애니메이션 전부 클립 리네임+루프 설정 로그로 확인. 컴파일 오류
  0건, `ProjectSettings/`·`Packages/` 부작용 없음.
- **아직 안 한 것** — 실제 씬에 배치, Animator Controller로 클립 연결,
  ⑤의 헤어카드/SSS 셰이더를 Maria 머티리얼에 실제로 붙이기(Maria 기본
  머티리얼이 어떤 셰이더인지, 헤어 메시가 몸과 분리돼 있는지 등은 다음에
  확인). 이번엔 리깅까지만.

## ⑧ Animator Controller + 확인용 씬 배치 (2026-09-13, 이어서)

- **`BuildTestCharacterRealisticScene.cs`(신규, `Saga/Build Test
  Character Realistic Scene` 메뉴)** — 두 가지를 한 번에 한다:
  1. `Assets/Animators/Maria.controller`(신규 폴더, 커밋 대상 —
     Mixamo 원본 데이터를 담지 않고 클립 이름/전이 구조만 있는 순수
     제작물이라 `CharactersRealistic/`처럼 gitignore할 이유가 없다)에
     8개 클립을 전부 연결한 Animator Controller를 코드로 짓는다.
     파라미터는 `Speed`(float, Idle↔Walk↔Run 블렌드: >0.1 걷기,
     >0.6 뛰기)+`Attack`·`Hit`·`Dodge`·`Death`·`Interact`(전부
     Trigger, Any State에서 즉시 전이). 액션 클립은 재생이 끝나면
     Idle로 자동 복귀하되(exitTime 0.9), **Death만 복귀시키지 않는다**
     (죽었다가 자동으로 살아나면 부자연스럽다 — 실제 게임 사망 처리와
     같은 관례, 다시 보려면 Play 모드를 재시작).
  2. **`Assets/Scenes/TestCharacterRealistic.unity`(신규)** — 어느
     게임에도 속하지 않는 독립 리그 검증 씬(조명 하나+바닥 Plane+
     카메라, 66-2장 FF16 아트 패스는 일부러 안 걸었다 — 그건 각 게임
     씬의 몫이고 여긴 리그 확인만). Maria FBX를 `PrefabUtility.
     InstantiatePrefab`으로 배치하고 `Animator.runtimeAnimatorController`
     에 위 컨트롤러를 물렸다.
  - 배치 모드로 실행 — 컨트롤러의 8개 상태 전부 `m_Motion`이 non-null
    (클립이 실제로 물렸다는 뜻), 씬의 Animator가 정확한 컨트롤러 GUID를
    참조하는 것까지 직접 확인. 컴파일 오류 0건, `ProjectSettings/`·
    `Packages/` 부작용 없음.
  - **아직 사람이 GUI로 Play를 눌러 실제로 재생해 보진 않았다** — 다음
    세션 또는 사용자가 에디터로 열어 Speed 슬라이더·트리거 버튼을
    Animator 창에서 눌러 직접 확인할 차례.

## ⑨ 사용자 요청 "직접 확인해" — 실제 GUI Play로 확인 + 버그 발견·수정 (2026-09-13, 이어서)

- **`PlaytestCharacterRealisticGui.cs`(신규)** — 루트/이 폴더 CLAUDE.md의
  "개발 중엔 GUI 스크린샷 습관적으로 안 찍는다" 원칙의 예외(사용자가
  "직접 확인해"로 명시 요청). Unity를 실제 GUI로 띄워(배치 모드 아님)
  TestCharacterRealistic 씬을 열고 Play 진입 → idle 정착(1초) →
  `Speed=1`로 run 정착(1초) → `Attack` 트리거 → 세 시점 스크린샷
  (`ScreenCapture.CaptureScreenshot`) → 스스로 Play 종료+
  `EditorApplication.Exit(0)`로 Unity까지 완전히 닫는다(별도 taskkill
  불필요, 프로세스 종료까지 확인함).
- **1차 스크린샷에서 버그 발견 — 캐릭터·바닥이 전부 플랫한 시안색으로만
  나옴(음영·디테일 전혀 없음).** 원인을 `Assets/Scenes/
  TestCharacterRealistic.unity` YAML을 직접 열어 확인: `Ground` Plane이
  `GameObject.CreatePrimitive()`의 **기본 내장 머티리얼**(Standard
  셰이더, URP 비호환)을 그대로 쓰고 있었다 — ⑧에서 머티리얼을 따로
  안 만들어 준 게 원인. 새 빈 씬이라 Skybox/앰비언트도 기본값(정의되지
  않은 상태)이라 겹쳐서 이상하게 나온 것으로 보인다.
- **수정**: `BuildTestCharacterRealisticScene.cs`에 `CreateSimpleUrpLitMaterial()`
  헬퍼를 추가해 Ground에 명시적 회색 URP Lit 머티리얼을 물리고,
  `RenderSettings.skybox = null`+`ambientMode = Flat`+회색 앰비언트로
  스카이박스를 변수에서 뺐다(66-2장 FF16 무드는 각 게임 씬의 몫이라
  이 리그 검증 씬은 일부러 중립으로 둔다), 카메라도 `CameraClearFlags.
  SolidColor`로 배경을 명시. 재빌드 후 재확인 — **idle(제자리 파이팅
  자세)·run(달리기, 루트 모션으로 카메라에서 멀어짐)·attack(중간 스윙
  자세) 셋 다 정상적으로 렌더링됨을 스크린샷으로 직접 확인.**
- **부가 발견(오판, 아래 ⑩에서 정정) — 당시엔 "Maria FBX에 디퓨즈
  텍스처가 아예 없다"고 적었었다.** `MariaMat`의 `_BaseMap`이 null이고
  `AssetDatabase.LoadAllAssetsAtPath`로 찾은 `Texture2D` 서브에셋이
  0개인 것까지는 사실이었지만, "FBX 안에 텍스처 자체가 없다"는 결론은
  틀렸다 — 실제로는 Unity가 FBX에 임베드된 텍스처를 **자동으로
  추출해 주지 않을 뿐**이었다. 사람에게 mixamo.com 재확인을 요청했던
  것도 불필요한 요청이었다 — 자세한 경위는 ⑩ 참고.
- GUI 실행 후 `Unity.exe` 프로세스가 스스로 완전히 종료된 것도
  `tasklist`로 확인(별도 kill 불필요). `ProjectSettings/`·`Packages/`
  부작용 없음.

## ⑩ 텍스처 문제 정정 — FBX에 이미 임베드돼 있었다, `ExtractTextures()`만 필요했다 (2026-09-13, 이어서)

- **사용자가 "텍스처 있는 걸로 다시 받아둘게"라며 mixamo.com에서
  `character.fbx`를 새로 받았다.** 진단해 보니 이 파일도 몸은
  똑같은 Maria(`MariaMat`, 서브메시 `Maria_J_J_Ong`+`Maria_sword`
  동일)였고, `_BaseMap`도 여전히 null — **재다운로드로도 안 풀렸다.**
- **원인을 제대로 찾았다** — `character.fbx`를 바이너리로 직접 열어
  PNG 시그니처(`\x89PNG\r\n\x1a\n`)를 찾아보니 실제로 3개
  (`maria_diffuse.png`·`maria_normal.png`·`maria_specular.png`)가
  파일 안에 임베드돼 있었다. **Unity의 `ModelImporter`는 FBX에 임베드된
  텍스처를 기본적으로 자동 추출하지 않는다** — `ModelImporter.
  ExtractTextures(destDir)`를 명시적으로 호출해야 실제 텍스처 에셋이
  생기고 머티리얼이 그걸 가리키게 된다(에디터 GUI의 Materials 탭
  "Extract Textures..." 버튼과 같은 동작을 코드로 부른 것).
  `Assets/Art/CharactersRealistic/Textures/`에 세 PNG(2048×2048)가
  추출됐다.
- **바로 다음에 처음부터 받았던 `Maria WProp J J Ong.fbx`(리깅
  완료본)도 똑같이 확인해 보니 3개 PNG가 이미 임베드돼 있었다** —
  **애초에 재다운로드가 필요 없었다, 처음 받은 파일에 그냥
  `ExtractTextures()`만 돌렸으면 됐다.** 그래서 새로 받은
  `character.fbx`는 지우고, 이미 리깅·Animator Controller·씬 배치가
  다 끝나 있던 원본 `Maria WProp J J Ong.fbx`에 텍스처 추출을 적용해
  이어갔다(리깅 설정은 재추출 후에도 그대로 살아 있음을 확인 —
  텍스처 추출은 재임포트만 트리거할 뿐 `animationType`/`avatarSetup`
  같은 임포터 설정을 안 건드린다).
- **재확인 — 실제로 옷·갑옷·머리카락 색이 다 입혀진 상태로 idle·run·
  attack 전부 정상 렌더링됨을 스크린샷으로 확인.** 다만 **씬을 새로
  빌드하고 GUI Play에 들어간 첫 실행에서 한 번, 셰이더 변형이 아직
  컴파일 중이었는지 idle 스크린샷이 다시 플랫한 시안색으로 찍힌 적이
  있었다**(60프레임 대기로는 부족) — 대기를 120프레임으로 늘려 재현
  없이 안정적으로 텍스처가 입혀진 상태를 캡처하도록
  `PlaytestCharacterRealisticGui.cs`를 고쳤다.
- **정정 — 새 파일 반입은 이제 불필요하다.** 앞으로 Mixamo 캐릭터를
  더 받을 때는 처음부터 body FBX마다 `ExtractTextures()`를 한 번
  돌리는 걸 표준 절차에 넣는다(다음에 할 일 참고).

## ⑪ 피부/기타 서브메시 분리 + 값싼 스킨 근사 적용 (2026-09-13, 이어서)

- **⑩이 남긴 "머티리얼을 분리해야 함" 과제를 실제로 풀었다 — 단, 계획을
  중간에 바꿨다.** 처음 생각은 "⑤가 받아 둔 `FakeSSS.shadersubgraph`를
  Maria 피부에 직접 연결"이었는데, 확인해 보니 **Shader Graph는
  `AnimatorController`(⑧에서 코드로 지음)와 달리 코드로 노드를 조립할
  공식 API가 없다** — 손으로 GUI에서 노드를 드래그해 연결해야 하는
  일이라 사람 개입이 필요하고, 내부/비공개 API를 리플렉션으로 억지로
  건드리는 건 버전마다 깨지기 쉬운 위험한 지름길이라 안 갔다.
- **대신 이렇게 갔다** — `BuildMariaSkinSplit.cs`(신규)가 Maria 몸
  메시(단일 서브메시, 14566 삼각형)를 **삼각형별 UV 중심점을 디퓨즈
  텍스처에서 색 샘플링해 피부색 근사(HSV 채도·명도·색상 범위)로 분류**,
  피부 2642개·기타 11924개 삼각형으로 서브메시 둘을 가진 새 메시
  (`Maria_Split`)를 만든다. 피부 쪽엔 살짝 따뜻한 톤(`_BaseColor`를
  `(1, 0.93, 0.87)`로)+낮은 광택(`_Smoothness` 0.35)의 URP Lit
  머티리얼(`MariaSkin`)을 물리고, 나머지는 원본과 동일한 값의
  `MariaRest`를 쓴다 — **진짜 wrap-lighting SSS가 아니라 "밀랍 같은
  느낌을 줄이는" 값싼 근사**임을 분명히 해 둔다(45장 모바일 목표에도
  이쪽이 더 맞는다).
  - **Mixamo ToS 때문에 결과물 저장 위치를 신경 썼다** — 분리된 메시는
    Maria의 실제 지오메트리를 담으므로, 이미 gitignore 대상인
    `Assets/Art/CharactersRealistic/`(하위 `Generated/`)에만 저장한다.
    저장소 밖으로 절대 안 뺀다.
  - `BuildTestCharacterRealisticScene.cs`가 이 분리 메시/머티리얼이
    있으면 자동으로 물리도록(`ApplySkinSplit()`) 고쳤다 — 없으면 조용히
    원본 단일 머티리얼로 건너뛴다(에러 아님, 순서 의존성 안내만).
  - 배치 모드로 분리 실행(2642/11924 삼각형 분류 로그 확인)→씬 재빌드
    →GUI Play 스크린샷으로 **메시가 깨지지 않고(구멍·튐 없음) 그대로
    렌더링됨을 확인**. 씬의 PrefabInstance 오버라이드에 `m_Mesh`+
    `m_Materials.Array.data[0]`/`[1]`이 정확히 새 에셋을 가리키는 것도
    YAML로 직접 확인.
- **아직 안 한 것** — 헤어(이방성 하이라이트)는 이번에 손 안 댔다.
  머리카락 색(금발)과 갑옷 금장식 색이 색상 공간에서 너무 가까워
  (둘 다 노란/금색 계열) 지금 쓴 것과 같은 색 분류 방식으로는 오분류
  위험이 커서 뺐다 — 손으로 마스크를 그리거나(외부 DCC 툴 필요) 다른
  판별 기준이 있어야 안전하게 분리할 수 있다. 실제 wrap-lighting SSS
  포워드 패스(HairLitForwardPass.hlsl 같은 커스텀 셰이더 패스)를 손으로
  짜는 것도 다음 과제로 남긴다 — 규모가 있는 작업이라 이번엔 안 갔다.

## 다음에 할 일 (아직 착수 전)

- ~~Mixamo 캐릭터를 새로 받을 때마다 `ModelImporter.ExtractTextures()`를
  표준 절차에 포함시키기~~ — 이미 됐다. `MixamoRigUtil.RigCharacter()`
  (Maria·Abe 공용 리깅 함수) 안에 `bodyImporter.ExtractTextures(...)`가
  들어 있다(2026-09-14 확인, "이어해" 후속 세션에서 이 항목이 스테일임을
  발견) — 다음에 새 Mixamo 캐릭터를 추가해도 이 함수를 쓰기만 하면 자동.
- ⑤가 받아 둔 헤어카드(이방성)·진짜 SSS(`FakeSSS.shadersubgraph`)를
  실제로 쓰려면 **Shader Graph 노드 연결을 사람이 GUI로 해야 한다**
  (⑪에서 확인한 제약) — 다음 세션 또는 사용자가 직접 Unity 에디터를
  열어 진행할 몫으로 남긴다.
- ~~Kenney·VRoid 플레이스홀더를 다섯 환경 재질/⑤ 캐릭터 셰이더/⑦
  캐릭터로 실제 사실적 에셋으로 순차 교체~~ — 2026-09-14에 다섯 판
  전부(Environment/Building까지) 끝났다(자세한 내용은
  `docs/PROJECT_STATE.md` 해당 날짜 항목들, 요약은 세션 메모리 참고).
- ~~66-1장 PC/Mobile 두 프로파일이 실제 사실적 에셋으로도 성능·화질
  균형이 맞는지 확인~~ — 다시 보니 걱정했던 두 후보(SSS 스킨 셰이더·DoF)
  둘 다 애초에 아직 안 켜져 있어서 문제 자체가 없었다: DoF는
  `BuildFF16VolumeProfiles.cs`가 처음부터 "대화 연출 토글 시스템이
  없어 지금 넣으면 항상 흐려진다"는 이유로 안 넣었고, 진짜 SSS
  (`FakeSSS.shadersubgraph`)도 바로 위 항목처럼 아직 아무 머티리얼에도
  안 물려 있다 — 지금 실제로 도는 피부 표현은 `BuildMariaSkinSplit.cs`가
  쓴 "값싼 URP Lit 근사"뿐이라 PC/Mobile 어느 쪽에서도 추가 비용이 없다.
  **재확인이 필요해지는 시점은 Shader Graph 배선(사람 몫)이 실제로
  끝난 뒤** — 그때 이 항목을 다시 살릴 것.

---

# 67~69. 사운드 · Localization · 접근성

**`saga-godot/PLAN.md` 67~69장과 동일한 목표**: BGM/SFX/Attack/Hit/
Skill/UI/Environment 사운드 구조(Unity AudioSource + AudioMixer로
카테고리별 볼륨 분리). 텍스트는 코드에 안 박는다(Unity Localization
패키지 또는 간단 JSON 사전, 한국어/영어/일본어 확장 가능). UI 크기·
진동·효과음·BGM On/Off·그래픽 품질 설정 가능하게.

**진행 현황(2026-09-14)** — SFX 쪽은 다섯 판 전부 같은 방식(코드로
Master/SFX 볼륨만 곱하는 `XxxAudio.cs`, 진짜 AudioMixer 에셋은 사람이
에디터 GUI로 노드를 이어야 해서 배치 모드로는 못 만듦)으로 통일됐다 —
GO/FOREST/STORY/REALM/DUNGEON 순으로 붙였고, 자세한 내용은
`docs/PROJECT_STATE.md`·`docs/ASSET_GUIDE.md` 해당 날짜 항목. **BGM은
다섯 판 전부 미착수** — 무드가 있는 선곡이라 이 프로젝트를 다루는
세션은 오디오를 직접 들을 방법이 없어(재생 가능 여부만 로그로 확인
가능) 사람이 직접 들어 보고 골라야 하는 몫으로 남겼다(사용자가
2026-09-14에 명시적으로 보류를 택함 — 다음에 먼저 묻지 말고 그냥
시작하지 말 것). 접근성(UI 크기·진동·그래픽 품질)은 같은 날 다섯 판
전부에 설정 UI로 붙었다(커밋 8127684).

**Localization 진행 현황(2026-09-14)** — 인프라 + 첫 실제 콘텐츠(설정
패널 자신의 글자)까지 붙었다. `XxxLocalization.cs`(다섯 벌 복사, 다른
XxxAudio.cs·XxxSettingsState.cs와 같은 결)가 `Resources/Localization/
xxx_<lang>.json`(키·값 JSON, JsonUtility로 파싱)을 읽어 `T(key)`로
돌려준다 — 키가 없으면 키 자체를 돌려줘 번역 누락이 빈 화면 대신 바로
보이게 했다. 언어는 다른 접근성 항목과 같은 버튼 순환 방식(ko→en→ko),
설정 패널의 새 다섯째 줄("언어")로 고른다. **지금은 설정 패널 자신의
글자(제목·효과음·진동·UI 크기·그래픽 품질·언어·켜짐/꺼짐·기본/절약·
작게/보통/크게·닫는다)에 이어, 같은 날 2차로 **런타임에 매번 새로
짓는 UI의 버튼·패널 제목**(GO 전투 선택지/전투 버튼, FOREST
"밀어내기!", REALM 다섯 버튼+구석 셋+다섯 패널 제목)까지 이 표를
거친다** — 나머지(대사·퀘스트·HUD 상태줄·REALM 문답 등 데이터 콘텐츠,
그리고 DUNGEON/STORY의 **에디터 빌드 스크립트가 씬에 구워 넣는**
모바일 액션 버튼 — 이쪽은 런타임 리프레시 훅이 없어 어설프게 반만
localize하면 더 나쁘다)는 아직 하드코딩 그대로다. 다음에 범위를 넓힐
때 `XxxLocalization.T()`를 그대로 재사용하면 된다(단 DUNGEON/STORY
빌드-스크립트 버튼은 먼저 "언어 전환 시 다시 그리는 훅"부터 설계).
`settings.*`류 공유 키는 다섯 판이 전부 같은 키·값을 쓴다 — data.js
처럼 다섯 벌 함께 고치고 md5로 확인할 것(en 번역은 이 세션이 직접
옮긴 것이라 사람 검수를 안 거쳤다). 게임별 신규 키(command.*/
encounter.*/combat.*/panel.*/hud.*)는 다섯 벌 일치를 요구하지 않는다.
일본어(ja)는 아직 없다.

**3차(같은 날) — 상시 HUD 상태줄**(GO/DUNGEON/STORY/REALM의
PlayerHud/RealmHud/StoryHud)까지 `T()`/`string.Format` 템플릿으로
옮겼다. chrome(라벨)만 옮기는 경계를 지켰다 — 이때까지는 데이터
콘텐츠(무기/장수/도시 이름, 퀘스트 문장)는 한국어 그대로.

**4~6차(같은 날, 사용자가 더 진행을 요청해 경계를 넘음) — 데이터
콘텐츠 번역 착수.** `T(key, fallback)` 오버로드를 추가하고 REALM
도시/장수/명령/계략, GO/DUNGEON 장비 이름, GO 촌장/상인/나그네
전체 대사와 두 조우 사건(도적/흰 늑대)의 모든 토스트·승리 메시지,
DUNGEON 퀘스트 목표·완료 문구, STORY 척후병 대사+퀘스트 고유명까지
번역했다(커밋 d694ac6·a6fa972·1b5869f, 자세한 내용은
docs/PROJECT_STATE.md 해당 날짜 항목). **원칙 — 내부 식별자(다른
코드가 문자열 값 자체로 매칭하는 상수, 예: DUNGEON QuestState의
BossName)는 안 건드리고 표시 문자열만 옮긴다.** FOREST는 이 세션
전체에서 미착수, REALM 문답(36개)·REALM 서고/전투 결과 서술·GO
HiddenTreasure·DUNGEON 행상/구출 대사 등이 다음 후보로 남아있다
(docs/PROJECT_STATE.md "다음 세션 안내" 참고). en 번역은 전부 이
세션이 직접 옮긴 것이라 사람 검수 전이다.

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
