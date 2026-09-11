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

## 설정 방식

`Assets/Settings/`에 URP Asset을 **두 벌** 만든다:

```text
Assets/Settings/
├── URP_PC.asset           (Renderer: Forward+, 고품질 오버라이드 전부 켬)
└── URP_Mobile.asset       (Renderer: Forward, 저사양 오버라이드)
```

Quality Settings(`Edit → Project Settings → Quality`)에 두 품질 레벨을
만들고 각각 다른 URP Asset을 연결한다. 빌드 타깃에 따라 자동으로 맞는
품질 레벨을 고르게 `QualitySettings.SetQualityLevel()`을 시작 스크립트에서
플랫폼 분기로 호출한다(`Application.isMobilePlatform` 체크).

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

# 67~69. 사운드 · Localization · 접근성

**`saga-godot/PLAN.md` 67~69장과 동일한 목표**: BGM/SFX/Attack/Hit/
Skill/UI/Environment 사운드 구조(Unity AudioSource + AudioMixer로
카테고리별 볼륨 분리). 텍스트는 코드에 안 박는다(Unity Localization
패키지 또는 간단 JSON 사전, 한국어/영어/일본어 확장 가능). UI 크기·
진동·효과음·BGM On/Off·그래픽 품질 설정 가능하게.

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
