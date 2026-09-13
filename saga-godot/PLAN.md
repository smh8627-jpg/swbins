# SAGA 프로젝트 — Godot 4.x 3D 신규 구축 최종 작업지시서
## Legacy 1~80 통합판 / Vertical Slice 우선 / Mobile 3D RPG

---

# 0. 프로젝트 최종 목표

기존의

- saga-go
- saga-dungeon
- saga-forest
- saga-story
- saga-realm

5개 게임을 기존 웹/JavaScript 구조에서 억지로 Godot으로 포팅하지 않는다.

**Godot 4.x 기반의 완전히 새로운 네이티브 3D 게임 프로젝트로 재구축한다.**

기존 프로젝트와 기존 1~80번 작업지시서는 폐기하는 것이 아니라,

> 기존 구현을 그대로 유지하는 것이 아니라  
> 기존 기획/콘텐츠/게임성 중 가치 있는 부분만 추출하여  
> 신규 Godot 구조에 재설계하여 통합한다.

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

- 기존 JS 코드를 Godot GDScript로 기계적으로 변환
- 기존 HTML/CSS/JS 구조를 Godot에 억지로 재현
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

---

# 3. 개발 핵심 원칙

## 3.1 Vertical Slice First

처음부터 완성 게임을 만들지 않는다.

먼저 다음이 모두 들어간 **작은 플레이 가능한 Vertical Slice**를 완성한다.

플레이어

→ 월드 이동

→ 탐험

→ NPC

→ 퀘스트

→ 몬스터

→ 실시간 전투

→ 스킬

→ 보상

→ 장비

→ 성장

→ 다음 지역 이동

→ 저장/로드

까지 하나의 재미있는 게임 루프를 완성한다.

Vertical Slice가 재미있지 않으면 콘텐츠를 늘리지 않는다.

---

# 4. 기존 1~80번 자료 통합 규칙

기존 1~80번 작업지시서가 저장되어 있다면 먼저 분석한다.

단, 그대로 실행하지 않는다.

기존 내용을 다음 4가지로 분류한다.

### KEEP

현재도 가치가 높으며 신규 구조에 그대로 반영할 기능

### REWORK

아이디어는 좋지만 Godot 4.x 구조에 맞게 다시 설계해야 하는 기능

### MERGE

서로 중복되는 기능을 하나의 공통 시스템으로 통합할 기능

### DROP

낡았거나 재미가 없거나 유지비용이 높은 기능

기존 1~80의 기능을 삭제할 때는 무조건 삭제하지 말고,

**왜 유지/변경/통합/삭제하는지 짧게 기록한다.**

이 분석 결과를:

`docs/LEGACY_FEATURE_AUDIT.md`

에 작성한다.

---

# 5. 5개 게임의 역할 재정의

5개 게임은 서로 완전히 다른 엔진/시스템으로 만들지 않는다.

공통 SAGA Core 위에 각 게임의 콘텐츠를 얹는다.

---

## SAGA GO

핵심:

- 탐험
- 이동
- 지역 발견
- 수집
- 몬스터
- 이벤트
- 지도 기반 콘텐츠
- 성장

게임 감각:

**"계속 돌아다니고 발견하고 싶다."**

---

# SAGA DUNGEON

핵심:

- 던전 탐험
- 실시간 전투
- 몬스터
- 엘리트
- 보스
- 장비
- 스킬
- 랜덤 이벤트
- 보상

게임 감각:

**"한 판 더 돌고 더 좋은 장비를 얻고 싶다."**

---

# SAGA FOREST

핵심:

- 넓은 자연환경
- 동물
- 채집
- 탐험
- 생활 콘텐츠
- NPC
- 마을
- 자연 이벤트
- 숨겨진 장소

게임 감각:

**"그냥 돌아다녀도 재미있다."**

---

# SAGA STORY

핵심:

- 스토리
- NPC
- 대화
- 퀘스트
- 선택
- 지역 사건
- 캐릭터 관계
- 메인/서브 스토리

게임 감각:

**"다음 이야기가 궁금하다."**

---

# SAGA REALM

핵심:

- 넓은 세계
- 지역
- 세력
- 도시
- 영지
- 전쟁/분쟁
- 영웅
- 성장
- 전략적 콘텐츠

게임 감각:

**"내가 이 세계를 성장시키고 있다는 느낌."**

---

# 6. 공통 SAGA Core Architecture

5개 프로젝트가 공유할 수 있도록 다음 시스템을 공통화한다.

```text
SAGA Core
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
├── Mobile Input
├── UI
├── Localization
├── Data
└── Performance
```

게임별 콘텐츠만 별도 모듈로 만든다.

---

# 7. 데이터 기반 설계

게임 데이터를 코드에 하드코딩하지 않는다.

가능하면:

- Resource
- JSON
- CSV
- Godot Resource
- Scriptable-style Data Resource

등을 활용한다.

예:

```text
data/
├── characters/
├── enemies/
├── bosses/
├── items/
├── equipment/
├── skills/
├── quests/
├── dialogue/
├── maps/
├── events/
└── balance/
```

예:

```text
EnemyData
- id
- name
- level
- hp
- attack
- defense
- move_speed
- attack_range
- skills
- drop_table
- ai_type
```

콘텐츠 추가를 위해 핵심 코드를 수정하지 않아도 되도록 한다.

---

# 8. 실제 3D 에셋 구조

최종 게임은 실제 3D 에셋 기반으로 구성한다.

지원:

- GLB
- GLTF
- PNG
- JPG
- WebP
- Texture
- Animation
- Material

권장 구조:

```text
assets/
├── characters/
├── enemies/
├── bosses/
├── animals/
├── buildings/
├── environment/
├── vegetation/
├── rocks/
├── props/
├── weapons/
├── armor/
├── effects/
├── UI/
└── audio/
```

Placeholder는 개발 초기 테스트용으로만 사용한다.

최종 게임의 주요 화면에는 실제 에셋을 사용한다.

---

# 9. 월드 품질 목표

기존처럼 빈 공간이 많은 월드를 만들지 않는다.

각 지역에는 최소한 다음 계층이 존재하도록 설계한다.

```text
Terrain
├── Main Landmark
├── Secondary Landmark
├── Buildings
├── Vegetation
├── Rocks
├── Props
├── NPC
├── Animals
├── Enemies
├── Hidden Area
├── Resource Area
├── Event Area
└── Dungeon/POI
```

플레이어가 이동할 때:

**"여기는 아무것도 없다."**

라는 느낌이 최대한 발생하지 않도록 한다.

---

# 10. 월드 디자인 원칙

맵 크기만 크게 만들지 않는다.

큰 월드는 다음을 포함해야 한다.

- 시야에 보이는 랜드마크
- 목적지
- 길
- 갈림길
- 숨겨진 공간
- 높은 지역
- 낮은 지역
- 물
- 숲
- 절벽
- 동굴
- 건물
- NPC
- 몬스터
- 채집
- 이벤트
- 던전

즉,

**크기보다 밀도와 발견의 재미를 우선한다.**

---

# 11. 전투 설계

전투는 단순히:

```text
공격 버튼
→ 데미지
→ 적 사망
```

으로 만들지 않는다.

기본 구조:

```text
Move
↓
Target
↓
Attack
↓
Skill
↓
Dodge / Defense
↓
Enemy Reaction
↓
Reward
```

전투에는 최소한:

- 기본 공격
- 강공격 또는 콤보
- 스킬
- 회피
- 피격 반응
- 쿨다운
- 자원
- 적 AI
- 거리
- 공격 범위
- 보스 패턴

을 고려한다.

---

# 12. 전투 재미의 핵심

전투는 숫자만 증가시키지 않는다.

적마다 차이를 만든다.

예:

```text
근접형
원거리형
돌진형
방어형
마법형
소환형
광역형
암살형
엘리트
보스
```

플레이어가:

**"이 적은 이렇게 상대해야 한다."**

라고 생각하게 만들어야 한다.

---

# 13. 보스 디자인

보스는 HP만 높은 몬스터로 만들지 않는다.

보스는:

- 단계 변화
- 공격 패턴
- 광역 공격
- 약점
- 회피 요구
- 소환
- 환경 활용
- 페이즈 변화
- 보상

을 갖도록 설계한다.

---

# 14. 성장 시스템

플레이어 성장:

```text
Level
↓
Stats
↓
Equipment
↓
Skill
↓
Build
```

단순 레벨업 외에:

- 장비
- 스킬
- 특성
- 옵션
- 빌드
- 세트 효과

등으로 성장 방향을 선택할 수 있도록 확장 가능하게 만든다.

---

# 15. 장비 시스템

기본:

- 무기
- 방어구
- 장신구

확장:

- 등급
- 레벨
- 옵션
- 강화
- 세트
- 특수 효과

단, 처음부터 전부 구현하지 않는다.

Vertical Slice에서는:

**무기 + 장비 + 기본 옵션**

까지만 구현한다.

---

# 16. 퀘스트 시스템

퀘스트 유형:

- 이동
- 대화
- 수집
- 사냥
- 탐험
- 던전
- 보스
- NPC 이벤트

데이터 기반으로 설계한다.

예:

```text
Quest
├── ID
├── Type
├── Conditions
├── Objectives
├── Rewards
├── Dialogue
└── NextQuest
```

---

# 17. 반복 플레이 루프

게임의 핵심 루프:

```text
탐험
↓
발견
↓
전투
↓
보상
↓
성장
↓
새로운 지역/콘텐츠
↓
더 강한 적
↓
더 좋은 보상
↓
다시 탐험
```

여기에:

```text
퀘스트
이벤트
수집
던전
보스
NPC
스토리
```

를 연결한다.

---

# 18. "계속 플레이할 이유" 설계

단순히 콘텐츠 양을 늘리지 않는다.

플레이어가 다음 중 하나를 항상 느끼게 한다.

- 다음 지역이 궁금하다.
- 다음 장비를 얻고 싶다.
- 레벨을 올리고 싶다.
- 새로운 스킬을 얻고 싶다.
- 보스를 잡고 싶다.
- 숨겨진 장소를 찾고 싶다.
- NPC 이야기를 보고 싶다.
- 새로운 동물을 발견하고 싶다.
- 새로운 던전에 가고 싶다.

---

# 19. 모바일 UX

세로/가로 모두 지원한다.

### Portrait

- 한 손 플레이
- 핵심 UI 집중
- 간단한 전투

### Landscape

- 넓은 시야
- 액션 전투
- 스킬 UI
- 월드 탐험

화면 방향이 변경되어도 게임 상태가 유지되어야 한다.

---

# 20. 모바일 조작

기본:

```text
Virtual Joystick
+
Attack
+
Skill Buttons
+
Dodge
+
Interact
```

상황에 따라 UI를 자동 변경한다.

예:

탐험:

```text
Joystick
Interact
Map
Menu
```

전투:

```text
Joystick
Attack
Skill
Dodge
Target
```

---

# 21. 카메라

3D 모바일 게임에 적합한 카메라를 구현한다.

필수:

- 줌
- 회전
- 거리 제한
- 지형 충돌
- 캐릭터 추적
- 전투 시 시야 보정
- 건물/오브젝트 가림 처리

---

# 22. 그래픽 품질

목표는 단순한 3D가 아니다.

**아트 스타일은 66-2장 결정에 따라 원신(Genshin Impact)류 카툰/셀셰이딩이다
— 사실적(포토리얼) PBR 재질이 목표가 아니다.** 아래 항목은 그 방향
안에서 고려한다(예: Lighting·Shadow는 밴드형 셀 음영, Material은 카툰
셰이더 위에서의 PBR 파라미터 사용).

- PBR Material(카툰 셰이더의 입력값으로— 66-2장)
- Lighting
- Shadow
- Ambient Lighting
- Fog
- Sky
- Environment
- Particle
- VFX
- Animation
- Post Processing

단, 모바일 성능을 우선하여 효과를 선택적으로 적용한다.

---

# 23. 애니메이션

캐릭터:

- Idle
- Walk
- Run
- Attack
- Hit
- Death
- Dodge
- Skill

몬스터도 최소한의 상태별 애니메이션을 갖는다.

AnimationTree/State Machine 구조를 고려한다.

---

# 24. NPC

NPC는 단순 장식물이 아니다.

NPC에:

- 이름
- 위치
- 대화
- 퀘스트
- 상점
- 이벤트
- 관계

를 연결할 수 있도록 한다.

---

# 25. 동물 시스템

FOREST를 중심으로 공통 시스템화한다.

동물:

- Idle
- Wander
- Flee
- Group
- Interaction

을 지원할 수 있도록 만든다.

동물은 월드에 생명감을 제공해야 한다.

---

# 26. 이벤트 시스템

월드 이벤트:

- 몬스터 출현
- 보물 발견
- NPC 이벤트
- 희귀 몬스터
- 지역 이벤트
- 시간 이벤트
- 랜덤 이벤트

등을 데이터 기반으로 확장한다.

---

# 27. 던전 시스템

던전은 별도의 공통 시스템으로 만든다.

```text
Dungeon
├── Entrance
├── Rooms
├── Enemies
├── Elite
├── Event
├── Treasure
├── Boss
└── Reward
```

초기에는 수동 제작된 던전부터 시작한다.

향후 랜덤 생성 구조로 확장할 수 있게 설계한다.

---

# 28. 세이브 시스템

저장:

- 플레이어 위치
- 레벨
- 경험치
- 장비
- 인벤토리
- 퀘스트
- 이벤트 상태
- 월드 상태

버전 필드를 포함한다.

향후 데이터 구조 변경에 대비하여 Save Version을 둔다.

---

# 29. 성능 최적화

모바일을 처음부터 고려한다.

필수 검토:

- LOD
- Occlusion Culling
- Visibility
- Object Pool
- Texture 최적화
- Mesh 최적화
- Draw Call 감소
- Batch
- Shadow 최적화
- Particle 제한
- AI 업데이트 주기
- 물리 처리 최적화

---

# 30. AI 최적화

모든 NPC/몬스터가 매 프레임 AI를 실행하지 않는다.

예:

```text
Near Player
→ High Frequency

Medium Distance
→ Reduced Frequency

Far Distance
→ Low Frequency / Sleep
```

월드 규모가 커져도 모바일에서 유지되도록 한다.

---

# 31. 공통 모듈 구조

권장 구조:

```text
saga_core/
├── combat/
├── character/
├── player/
├── enemy/
├── quest/
├── dialogue/
├── inventory/
├── equipment/
├── item/
├── skill/
├── save/
├── world/
├── event/
├── ui/
├── mobile/
├── data/
└── utilities/
```

게임별:

```text
games/
├── saga_go/
├── saga_dungeon/
├── saga_forest/
├── saga_story/
└── saga_realm/
```

공통 코드와 게임별 콘텐츠를 분리한다.

---

# 32. 개발 방식

Claude Code는 한 번에 대량 구현하지 않는다.

각 단계마다:

```text
1. 현재 상태 확인
2. 필요한 파일만 읽기
3. 최소 변경
4. 구현
5. 실행/검증
6. 오류 수정
7. 결과 기록
```

을 수행한다.

---

# 33. Claude Code 토큰 절약 규칙

매우 중요.

### 규칙 1

프로젝트 전체 파일을 매번 읽지 않는다.

### 규칙 2

변경 대상 파일만 읽는다.

### 규칙 3

이미 완료된 시스템을 다시 분석하지 않는다.

### 규칙 4

작업 전:

```text
현재 상태
변경 파일
목표
검증 방법
```

만 먼저 확인한다.

### 규칙 5

큰 파일을 불필요하게 전체 출력하지 않는다.

### 규칙 6

동일한 코드를 복사하지 않는다.

### 규칙 7

공통 시스템을 재사용한다.

### 규칙 8

한 단계가 끝나면 다음 단계로 넘어가기 전에 검증한다.

### 규칙 9

기존 구현을 무조건 재작성하지 않는다.

### 규칙 10

작업 로그를 남겨 다음 실행에서 불필요한 재분석을 방지한다.

---

# 34. Claude Code 작업 상태 파일

다음 파일을 만든다.

```text
docs/
├── PROJECT_STATE.md
├── ARCHITECTURE.md
├── LEGACY_FEATURE_AUDIT.md
├── VERTICAL_SLICE.md
├── PERFORMANCE.md
├── ASSET_GUIDE.md
└── CHANGELOG.md
```

`PROJECT_STATE.md`에는 현재:

- 완료 단계
- 현재 작업
- 다음 작업
- 알려진 오류
- 테스트 상태

만 간단히 기록한다.

---

# 35. 1~100 최종 작업 단계

## Phase 1 — 프로젝트 기반

### 01
Godot 4.x 프로젝트 생성.

### 02
프로젝트 이름 및 기본 설정.

### 03
모바일 해상도/화면 설정.

### 04
Portrait/Landscape 지원 구조.

### 05
기본 폴더 구조 생성.

### 06
SAGA Core 구조 생성.

### 07
게임별 모듈 구조 생성.

### 08
Git/버전 관리 구조 확인.

### 09
PROJECT_STATE.md 작성.

### 10
ARCHITECTURE.md 작성.

---

# Phase 2 — Legacy 분석

### 11
기존 saga-go 분석.

### 12
기존 saga-dungeon 분석.

### 13
기존 saga-forest 분석.

### 14
기존 saga-story 분석.

### 15
기존 saga-realm 분석.

### 16
기존 1~80 작업지시서 확보/분석.

### 17
중복 기능 분류.

### 18
유지 기능 분류.

### 19
재설계 기능 분류.

### 20
삭제 기능 분류.

### 21
LEGACY_FEATURE_AUDIT.md 작성.

### 22
5개 게임의 공통 기능 추출.

### 23
게임별 고유 기능 추출.

### 24
신규 Architecture에 통합.

### 25
Legacy 분석 완료 검증.

---

# Phase 3 — Vertical Slice 설계

### 26
Vertical Slice 범위 확정.

### 27
첫 번째 테스트 지역 설계.

### 28
플레이어 목표 정의.

### 29
첫 번째 적 설계.

### 30
첫 번째 보스 설계.

### 31
첫 번째 퀘스트 설계.

### 32
첫 번째 던전 설계.

### 33
첫 번째 장비 설계.

### 34
첫 번째 스킬 설계.

### 35
첫 번째 보상 루프 설계.

---

# Phase 4 — 3D World Foundation

### 36
3D World 기본 Scene 생성.

### 37
Terrain 구현.

### 38
Lighting 구현.

### 39
Sky/Environment 구현.

### 40
Fog/Atmosphere 구현.

### 41
실제 GLB/GLTF 에셋 import 구조.

### 42
Material 구조.

### 43
Vegetation 배치.

### 44
Rock/Prop 배치.

### 45
Building 배치.

### 46
Landmark 배치.

### 47
Path/Road 구성.

### 48
Water 구성.

### 49
높낮이가 있는 지형 구성.

### 50
첫 번째 플레이 가능 지역 완성.

---

# Phase 5 — Player

### 51
Player 3D 모델 연결.

### 52
Idle/Walk/Run 구현.

### 53
3D 이동 구현.

### 54
중력/충돌 구현.

### 55
Camera Follow 구현.

### 56
Camera Rotation 구현.

### 57
Camera Zoom 구현.

### 58
모바일 Virtual Joystick 구현.

### 59
Portrait UI 구현.

### 60
Landscape UI 구현.

---

# Phase 6 — Combat

### 61
Combat Core 구현.

### 62
Basic Attack 구현.

### 63
Target 시스템.

### 64
Damage 시스템.

### 65
HP/Death 시스템.

### 66
Hit Reaction.

### 67
Enemy AI.

### 68
Enemy Attack.

### 69
Skill 시스템.

### 70
Cooldown/Resource 시스템.

### 71
Dodge 시스템.

### 72
첫 번째 엘리트 몬스터.

### 73
첫 번째 보스.

### 74
보스 패턴.

### 75
전투 재미 검증.

---

# Phase 7 — RPG Systems

### 76
Stats 시스템.

### 77
EXP 시스템.

### 78
Level Up.

### 79
Item 시스템.

### 80
Inventory.

### 81
Equipment.

### 82
Equipment Stats.

### 83
Reward 시스템.

### 84
Loot Table.

### 85
Skill Upgrade 기반.

---

# Phase 8 — World Gameplay

### 86
NPC 시스템.

### 87
Dialogue 시스템.

### 88
Quest 시스템.

### 89
Quest Objective.

### 90
Quest Reward.

### 91
World Event.

### 92
Resource/Collect 시스템.

### 93
Animal 시스템.

### 94
Hidden Area.

### 95
Dungeon Entrance.

---

# Phase 9 — Persistence / Quality

### 96
Save/Load.

### 97
Data Versioning.

### 98
Mobile Performance Pass.

### 99
Vertical Slice 전체 플레이 테스트.

### 100
최종 재미/품질 평가 후 다음 콘텐츠 확장 여부 결정.

---

# 36. Vertical Slice 완료 조건

100단계까지 무조건 기능을 추가하는 것이 목표가 아니다.

다음 조건을 만족하면 Vertical Slice 성공으로 판단한다.

플레이어가 게임을 실행한다.

↓

3D 월드에 들어간다.

↓

직접 이동한다.

↓

주변을 탐험한다.

↓

NPC를 발견한다.

↓

퀘스트를 받는다.

↓

몬스터를 만난다.

↓

실시간 전투를 한다.

↓

스킬을 사용한다.

↓

적을 처치한다.

↓

아이템을 획득한다.

↓

장비한다.

↓

성장한다.

↓

새로운 지역/던전에 들어간다.

↓

엘리트/보스와 싸운다.

↓

보상을 얻는다.

↓

저장한다.

↓

다시 플레이한다.

이 과정이 **재미있어야 한다.**

---

# 37. Vertical Slice 재미 평가

다음 질문에 YES가 되어야 한다.

### 탐험

- 이동하는 것 자체가 재미있는가?
- 주변에 볼거리가 있는가?
- 다음 장소가 궁금한가?

### 전투

- 공격이 손맛이 있는가?
- 적마다 대응 방법이 다른가?
- 스킬 사용이 재미있는가?
- 보스가 기억에 남는가?

### 성장

- 레벨업이 의미가 있는가?
- 장비 획득이 즐거운가?
- 캐릭터가 강해지는 느낌이 있는가?

### 월드

- 빈 공간이 지나치게 많지 않은가?
- 랜드마크가 있는가?
- NPC/동물/몬스터가 살아 움직이는가?

### 모바일

- 한 손으로 조작 가능한가?
- 버튼이 너무 작지 않은가?
- 화면이 복잡하지 않은가?
- 세로/가로 모두 자연스러운가?

### 반복 플레이

- "한 번 더 해볼까?"라는 느낌이 드는가?

---

# 38. Vertical Slice 실패 시 처리

재미가 부족하면 콘텐츠를 추가하지 않는다.

먼저 다음을 수정한다.

1. 이동감
2. 카메라
3. 전투 타격감
4. 적 AI
5. 스킬
6. 보상
7. 탐험 밀도
8. UI
9. 진행 속도

재미가 확인된 후 콘텐츠를 확장한다.

---

# 39. 이후 5개 게임 확장 전략

Vertical Slice의 공통 Core가 안정화되면 다음 순서로 확장한다.

```text
SAGA Core
      ↓
Vertical Slice
      ↓
SAGA GO
      ↓
SAGA DUNGEON
      ↓
SAGA FOREST
      ↓
SAGA STORY
      ↓
SAGA REALM
```

단, 공통 시스템을 먼저 완성하고 게임별 콘텐츠를 확장한다.

---

# 40. 게임별 차별화

공통 시스템을 공유하되 게임의 느낌은 확실히 다르게 만든다.

```text
GO
= 탐험

DUNGEON
= 전투/파밍

FOREST
= 자연/생활/탐험

STORY
= 스토리/NPC/사건

REALM
= 세계/세력/성장
```

각 게임이 단순히 맵과 몬스터만 다른 동일 게임이 되지 않도록 한다.

---

# 41. 최종 품질 목표

목표는:

**"기존 웹게임을 Godot으로 옮긴 게임"**

이 아니다.

목표:

**"기존 SAGA의 아이디어를 기반으로 새롭게 만든 모바일 3D RPG"**

이다.

그래픽:

기존 JS/Web 기반 그래픽보다 확실히 높은 품질.

월드:

작은 테스트맵 수준에서 끝내지 않고 확장 가능한 구조.

전투:

숫자만 교환하는 전투가 아니라 액션과 전략을 느낄 수 있도록 한다.

탐험:

이동 자체가 콘텐츠가 되도록 한다.

성장:

레벨만 올리는 것이 아니라 장비/스킬/빌드가 연결되도록 한다.

---

# 42. Claude Code 실행 방식

각 단계 실행 시 반드시 다음 순서로 진행한다.

```text
[STEP START]

1. PROJECT_STATE 확인
2. 현재 프로젝트 구조 확인
3. 해당 단계에 필요한 파일만 확인
4. 기존 구현과 충돌 여부 확인
5. 최소 변경으로 구현
6. Godot 실행/검증
7. 오류 수정
8. 완료 여부 확인
9. PROJECT_STATE 업데이트

[STEP END]
```

완료되지 않은 상태에서 다음 단계로 넘어가지 않는다.

---

# 43. 토큰 절약을 위한 추가 규칙

Claude Code는 다음을 반드시 지킨다.

```text
DO NOT:
- 프로젝트 전체 cat
- 전체 파일 반복 출력
- 동일 파일 반복 분석
- 이미 완료된 기능 재설명
- 필요 없는 리팩토링
- 관련 없는 파일 수정
- 한 단계에서 여러 Phase 동시 구현

DO:
- 필요한 파일만 읽기
- 필요한 코드만 수정
- 변경 범위 최소화
- 테스트 후 다음 단계 진행
- 상태 문서 활용
- 공통 시스템 재사용
```

---

# 44. 에셋 사용 원칙

에셋은 무작정 많이 넣지 않는다.

우선순위:

1. Player
2. 주요 Enemy
3. Boss
4. Environment
5. Building
6. Vegetation
7. Props
8. Animals
9. VFX

초기에는 핵심 에셋만 사용하고 이후 확장한다.

---

# 45. 모바일 성능 목표

최종적으로 모바일 환경에서 안정적으로 동작할 수 있도록 한다.

특히:

- 지나치게 많은 NPC 생성 금지
- 지나치게 많은 그림자 금지
- 과도한 Particle 금지
- 과도한 투명 재질 금지
- 고해상도 텍스처 남용 금지
- 모든 AI를 매 프레임 처리하지 않음
- 필요하지 않은 오브젝트는 비활성화

---

# 46. 디버그 시스템

개발 중 다음 정보를 확인할 수 있도록 한다.

```text
FPS
Draw Calls
Visible Objects
Enemy Count
NPC Count
Memory
Player Position
Current Quest
Player Level
Current Zone
```

릴리즈 빌드에서는 제거하거나 숨길 수 있도록 한다.

---

# 47. 오류 처리

각 단계 완료 후 최소:

- Godot 프로젝트 실행
- Scene 로드
- 주요 기능 실행
- Console 오류 확인

을 수행한다.

치명적인 오류가 있으면 다음 단계로 넘어가지 않는다.

---

# 48. 코드 품질

코드는:

- 명확한 이름
- 작은 책임
- 재사용 가능
- 데이터 기반
- 의존성 최소화

를 원칙으로 한다.

거대한 Manager 하나에 모든 기능을 넣지 않는다.

---

# 49. 시스템 의존성

권장 방향:

```text
Data
 ↓
System
 ↓
Component
 ↓
Scene
 ↓
UI
```

게임별 코드가 Core 내부를 직접 난립하게 참조하지 않도록 한다.

---

# 50. 최종적으로 만들어야 하는 것

최종 SAGA 구조:

```text
SAGA
│
├── SAGA CORE
│
├── GO
│
├── DUNGEON
│
├── FOREST
│
├── STORY
│
└── REALM
```

Core는 공유.

콘텐츠는 분리.

---

# 51. 확장 계획

Vertical Slice 이후:

### GO

월드 확장

→ 탐험

→ 지역

→ 이벤트

→ 수집

→ 희귀 몬스터

### DUNGEON

던전 증가

→ 엘리트

→ 보스

→ 장비

→ 빌드

### FOREST

생태계

→ 동물

→ 채집

→ 마을

→ 생활

### STORY

스토리 챕터

→ NPC

→ 선택

→ 사건

→ 관계

### REALM

지역

→ 세력

→ 도시

→ 영지

→ 대규모 콘텐츠

---

# 52. 절대로 잊지 말아야 할 것

게임의 재미가 기능 수보다 중요하다.

예:

기능 100개 + 재미없음

보다

기능 10개 + 계속 플레이하고 싶음

이 훨씬 중요하다.

---

# 53. 첫 번째 목표

첫 번째 목표는 완성 게임이 아니다.

다음 하나를 완성한다.

> **"작지만 실제로 재미있는 3D SAGA 게임 플레이 루프"**

---

# 54. 첫 실행 시 Claude Code가 해야 할 일

새 프로젝트에서 바로 코딩하지 않는다.

먼저:

1. 기존 5개 게임의 관련 파일/문서 확인
2. 기존 1~80 작업지시서 확인
3. 좋은 기능 추출
4. 중복 제거
5. 낡은 기능 제거
6. 신규 Architecture 설계
7. Vertical Slice 범위 결정
8. 개발 순서 확인
9. 그 후 Phase 1부터 실행

---

# 55. 첫 번째 실행 명령

Claude Code는 첫 실행에서 전체 게임을 만들지 않는다.

다음만 수행한다.

```text
LEGACY AUDIT
+
ARCHITECTURE
+
VERTICAL SLICE PLAN
+
PROJECT FOUNDATION
```

그 후 사용자 확인 없이 가능한 범위 내에서 검증 가능한 최소 구현부터 진행한다.

---

# 56. 최종 개발 철학

이 프로젝트는

**"기존 게임을 변환하는 프로젝트"**

가 아니라

**"기존 SAGA의 좋은 아이디어를 이용해 새로운 게임을 만드는 프로젝트"**

다.

따라서 기존 코드보다:

- 재미
- 구조
- 그래픽
- 탐험
- 전투
- 성장
- 모바일 UX

를 우선한다.

---

# 57. 완료 기준

각 단계는 반드시 다음 중 하나로 기록한다.

```text
DONE
BLOCKED
NEEDS_REWORK
```

완료되지 않은 작업을 DONE으로 표시하지 않는다.

---

# 58. 최종 판단 기준

어떤 기능을 추가할 때 다음 질문을 한다.

```text
이 기능이 재미를 증가시키는가?
이 기능이 탐험을 증가시키는가?
이 기능이 전투를 증가시키는가?
이 기능이 성장의 의미를 증가시키는가?
이 기능이 월드를 더 살아있게 만드는가?
이 기능이 반복 플레이를 증가시키는가?
```

모두 NO라면 우선순위를 낮춘다.

---

# 59. 기능 추가 원칙

"있으면 좋을 것 같은 기능"보다

"플레이어가 실제로 사용하는 기능"

을 우선한다.

---

# 60. 콘텐츠 밀도

월드 크기보다:

```text
Landmark Density
NPC Density
Enemy Density
Event Density
Resource Density
Discovery Density
```

를 관리한다.

---

# 61. 플레이어 경험

첫 5분:

- 이동
- 탐험
- 전투

첫 15분:

- 퀘스트
- 장비
- 성장

첫 30분:

- 새로운 지역
- 엘리트
- 던전

첫 60분:

- 보스
- 빌드
- 새로운 목표

를 경험할 수 있도록 설계한다.

---

# 62. 게임 템포

초반부터 너무 많은 시스템을 보여주지 않는다.

순서:

```text
Move
↓
Explore
↓
Fight
↓
Reward
↓
Grow
↓
Discover
↓
Challenge
```

---

# 63. UI 원칙

UI는 화면을 가리지 않는다.

특히 모바일에서:

- 큰 버튼
- 명확한 아이콘
- 최소 텍스트
- 중요 정보 우선
- 전투 중 불필요한 UI 숨김

을 적용한다.

---

# 64. 로딩

월드 규모가 커질 것을 고려하여:

- Scene 분리
- Streaming 고려
- 필요 에셋만 로드
- 사용하지 않는 리소스 해제

가 가능한 구조로 설계한다.

---

# 65. 월드 확장

처음에는 작은 지역 하나만 만든다.

그 지역의 품질이 충분히 높아진 후:

```text
Region 1
→ Region 2
→ Region 3
→ Dungeon
→ Town
→ Forest
→ Mountain
→ Special Area
```

순으로 확장한다.

---

# 66. 그래픽 확장

초기:

- Player
- Enemy
- Environment

이후:

- NPC
- Animals
- Buildings
- Props
- VFX
- Boss

순으로 확장한다.

---

# 66-1. 렌더러 프로파일 — Forward+ / Mobile 이중 구성

## 결정 (2026-09-11)

**Godot을 유지한다. Unity·Unreal로 갈아타지 않는다.**

> **추가 기록 (2026-09-11, 같은 날 더 이어서)** — 이 결정은 여전히 유효하다.
> 다만 사용자가 이후 "유니티로 전환을 추가한다, 다른 곳(다른 세션)은 Godot
> 작업 중이니"로 요청해, **`saga-unity/`라는 별개 폴더에 Unity 6 병행
> 트랙을 새로 열었다**(그 폴더의 `PLAN.md` 0장 참고). 이건 이 결정을
> 뒤집는 게 아니다 — "Godot을 버리고 Unity로 간다"가 아니라 "Godot은
> 그대로 두고 Unity도 별도로 해본다"는 병행 실험이다. 이 트랙(`saga-godot/`)
> 작업은 계속 그대로 진행한다. `saga-unity/`를 이 폴더에 섞어 넣지 않는다
> (완전히 다른 프로젝트, 코드 공유 없음).

"언리얼 수준의 3D"라는 요구를 검토한 결론:

- 화면 품질 차이의 대부분은 엔진이 아니라 **에셋 품질**(모델·텍스처·애니메이션·라이팅 셋업)에서 난다.
  이 부분은 어느 엔진으로 가도 똑같이 만들어야 한다.
- 엔진이 실제로 차이를 내는 것은 Nanite·Lumen·Megascans 같은 **PC 전용 포토리얼 파이프라인**이다.
  이 프로젝트는 모바일을 목표로 하므로(45장) 그쪽으로 가도 그 기능을 꺼야 한다.
- 따라서 엔진 교체는 비용만 크고 이득이 없다. 대신 **PC에서는 Forward+ 렌더러를 켜서**
  Godot이 낼 수 있는 상한까지 올린다.

품질 목표는 **스타일라이즈드 고품질**이다. 포토리얼 야외 대규모 씬은 목표로
잡지 않는다. **"스타일라이즈드"의 구체적인 방향은 66-2장 참고** — 원신
(Genshin Impact)류 카툰/셀셰이딩이다. 이 절(66-1)은 렌더러 파이프라인
(Forward+/Mobile, SDFGI·SSR 같은 이펙트 on/off)만 다루고, 66-2는 그
위에서 실제로 어떻게 그려 보이는지(셰이딩 방식·아웃라인·색감)를 다룬다
— 서로 다른 층이라 둘 다 필요하다.

## 두 프로파일

| 프로파일 | 대상 | rendering_method | 켜는 것 |
|---|---|---|---|
| **PC** | Windows / macOS / Linux 빌드, 에디터 | `forward_plus` | SDFGI(또는 VoxelGI), SSR, SSAO, SSIL, Volumetric Fog, Glow, TAA/FSR2, 고품질 그림자 |
| **Mobile** | Android / iOS 빌드 | `mobile` | Glow, MSAA 2x, 저해상도 그림자, 나머지 전부 꺼짐 |

Web 내보내기는 `gl_compatibility`만 지원하므로 Web은 Mobile 프로파일에 준한다.

## project.godot 설정 방식

기본값을 Forward+로 두고, 플랫폼 feature tag로 덮어쓴다.

```text
[rendering]

renderer/rendering_method="forward_plus"
renderer/rendering_method.mobile="mobile"
renderer/rendering_method.web="gl_compatibility"
```

- 렌더러 선택은 **이 세 줄로만** 한다. 씬 파일 안에서 렌더러를 분기하지 않는다.
- 현재 `project.godot`은 `renderer/rendering_method="mobile"` 단일 구성이다.
  전환은 **Vertical Slice(81~100장) 이후**, 실기 확인 때 몰아서 한다. 지금은 바꾸지 않는다.

## Environment 분리

프로파일 차이는 **project.godot + WorldEnvironment 리소스 두 개**에만 존재한다.

```text
assets/environment/
├── env_pc.tres        # SDFGI · SSR · SSAO · SSIL · Volumetric Fog · Glow
└── env_mobile.tres    # Glow · Tonemap · 색보정만
```

- 시작 시 `OS.has_feature("mobile")` 또는 `OS.has_feature("web")`로 하나를 골라 WorldEnvironment에 붙인다.
- 톤매핑(ACES 또는 Filmic)·노출·색보정 값은 **두 리소스에서 같게** 유지한다. 프로파일이 달라도
  게임의 색 톤은 같아야 한다.
- 메시·머티리얼·텍스처·애니메이션은 **한 벌**이다. 프로파일별로 에셋을 따로 두지 않는다.
  LOD·텍스처 해상도 차이는 Godot import 설정과 `rendering/textures` 프로젝트 설정으로만 조절한다.

## 하지 말 것

- 프로파일을 셋 이상으로 늘리기
- Mobile 프로파일에서 SDFGI·SSR·SSIL·Volumetric Fog를 켜 보는 것 (45장 위반)
- "언리얼만큼"을 이유로 엔진 교체를 다시 제안하기 — 위 결정으로 종결
- Nanite·Lumen에 대응하는 기능이 없다는 이유로 Forward+ 채택을 미루기 —
  이 프로젝트의 품질은 에셋과 라이팅 셋업에서 나온다(8장·44장)

## 검증

- 46장 디버그 화면에 **현재 rendering_method**를 표시한다.
- PC 프로파일 FPS·Draw Call은 에디터에서, Mobile 프로파일은 71장 테스트 기기에서 확인한다.
- 실기 확인은 매 단계마다 하지 않고 **마지막에 몰아서** 한다.

---

# 66-2. 아트 디렉션 — 카툰/셀셰이딩(원신류) 렌더링

> **병합 메모(2026-09-13)** — 이 장은 같은 날 서로 다른 두 세션이 독립적으로
> 채운 것을 합친 것이다. 한쪽(saga-unity 세션에서 사용자가 환기)은 "무엇을
> 그릴 것인가"(셰이딩 스펙: 밴드 셀·아웃라인 범위·painterly 환경·물·그림자)를
> 먼저 문서화했고, 다른 한쪽(이 세션, "VRoid부터 시작해" 지시)은 "어디서
> 에셋을 구할 것인가"(VRoid Studio·Quaternius/KayKit·라이선스)와 **실제
> 실행 결과**(VRoid Studio 설치·샘플 내보내기·Godot/Unity 임포트 검증까지
> 끝남)를 채웠다. 서로 겹치지 않고 보완돼 아래처럼 한 장으로 합쳤다 — 내용
> 손실 없음, 두 세션 결과 다 반영.

## 결정 (2026-09-13, 뒤늦게 문서화)

**목표 그래픽은 원신(Genshin Impact)류 카툰/셀셰이딩이다.** 이 방향은
전에 구두로 정해졌던 것인데 이 문서엔 66-1장의 "스타일라이즈드 고품질,
포토리얼 아님"이라는 모호한 표현으로만 남아 있었다 — 실제로 무엇을
뜻하는지가 코드로 옮길 만큼 구체적이지 않았다. 이 장이 그 구멍을 메운다.
**지금(2026-09-13)까지 셀셰이딩·아웃라인 셰이더는 코드에 하나도 없다**
(`saga_core/shaders/`엔 구면 세계용 `curved_textured`·`curved_vertex_color`
둘뿐, 전부 표준 PBR/버텍스컬러 라이팅) — 이 장은 **방향 결정**이고,
실제 셰이더 작성·전체 머티리얼 교체는 별도 작업 단계로 이후에 한다
(지금 이 세션에서 코드를 바로 다 바꾸지 않는다 — 32장 "한 번에 한 걸음"
원칙, 아래 "적용 순서" 참고).

## 무엇을 뜻하는가 (구체적 스펙)

- **캐릭터/몬스터/NPC**: 표준 PBR Lit이 아니라 **밴드형(quantized) 셀
  셰이딩** — diffuse를 2~3단 계단으로 끊어 칠한다(원신처럼 부드러운
  그라디언트가 아니라 뚜렷한 명암 경계). Rim light(가장자리 발광) 추가.
- **아웃라인**: 캐릭터·몬스터·주요 NPC·주요 오브젝트에 검은/짙은 윤곽선
  (inverted-hull 또는 노멀 기반 프레넬 방식 중 Godot 4.x·모바일 성능에
  맞는 쪽을 구현 단계에서 고른다). **모든 오브젝트에 걸지 않는다** —
  풀·자갈·배경 소품처럼 수가 많은 것까지 아웃라인을 걸면 모바일에서
  드로우콜/버텍스 비용이 커진다(45장 위반). 아웃라인은 "시선이 가는 것"
  (플레이어·적·NPC·중요 채집물)으로 한정한다.
- **환경(지형/식생/건물)**: 캐릭터만큼 뚜렷한 밴드 셰이딩은 아니어도
  **채도 높고 painterly한 톤**(원신 필드 느낌) — 사실적 거칠기/금속성
  PBR 재질(녹슨 철, 젖은 돌 같은 사실적 서브서피스)은 목표가 아니다.
  하늘/구름도 사실적 대기산란보다 **손그림에 가까운 그라디언트+구름
  텍스처**를 우선한다.
- **물**: 완전한 SSR 반사보다 **단순화된 색+하이라이트+가장자리 거품**
  스타일(원신 물 표현과 같은 결) — PC 프로파일(66-1)이라도 물만은
  포토리얼 반사를 목표로 깊이 파지 않는다.
- **그림자**: 66-1의 SDFGI/고품질 그림자는 그대로 켜되(입체감 자체는
  필요), 캐릭터 셀 셰이딩과 **부드러운 사실적 그림자가 충돌해 보이지
  않는지**는 실기 확인 때 같이 본다(원신도 그림자 자체는 부드럽게 깔고
  캐릭터 셰이딩만 밴드로 끊는 방식이라 이 조합 자체는 이미 검증된 패턴).

## 66-1과의 관계

66-1(렌더러 프로파일)은 **파이프라인**(Forward+/Mobile, 어떤 이펙트를
켜고 끄는지) 층이고, 이 장(66-2)은 그 위에서 **셰이딩 방식**(카툰이냐
포토리얼이냐) 층이다. 서로 독립적 — PC/Mobile 두 프로파일 다 카툰
셰이딩을 쓴다(카툰 셰이딩 자체가 이미 저비용이라 모바일에 오히려 유리).

## 왜 지금까지 에셋을 그대로 못 쓰는가

- Kenney `Blocky Characters` 류는 이름 그대로 각진 블록 형태고, 텍스처도
  단순 색 아틀라스(`colormap.png`)라 위 셀셰이딩 셰이더를 입혀도
  애니메이션풍 얼굴·비율(둥근 눈, 부드러운 옷 실루엣)이 나오지 않는다.
- 원신풍 그래픽은 **모델 자체**(애니메이션 비율 조형)와 **셰이더**(램프
  기반 명암 2~3단 + 외곽선) 둘이 같이 있어야 나온다 — 셰이더만 바꿔서는
  안 된다. 지금까지 쓰던 **Kenney CC0 로우폴리 킷(`docs/ASSET_GUIDE.md`)
  은 이 방향과 맞지 않아 순차 교체 대상**이다.

## 새 에셋 소스

- **캐릭터** — [VRoid Studio](https://vroid.com/en/studio)(pixiv, 무료).
  애니메이션풍 3D 아바타를 에디터로 직접 만들어 VRM(glTF 2.0 기반)으로
  내보낸다. 상업적 사용(게임 포함) 허용 — 단 "VRoid 모델을 자동
  생성·변형해 내보내는 앱"을 만드는 것 자체는 별도 라이선스가 필요하다는
  제약이 있는데, 우리는 그런 앱이 아니라 완성된 캐릭터를 에디터로 직접
  만들어 쓰는 것뿐이라 해당 없음. VRM은 GLB/GLTF 계열이라 8장 지원
  포맷과 그대로 맞는다.
- **환경/소품** — Kenney 대신 **Quaternius**(CC0, `Ghibli Game Kit`·
  `Stylized Nature MegaKit` 계열)나 **KayKit**(CC0, itch.io) 쪽이 더
  둥글고 부드러운 형태라 셀셰이딩과 잘 맞는다. 실제로 받을 때 이 두
  소스부터 확인한다 — 목적은 "Kenney 전면 폐기"가 아니라 "형태가
  셀셰이딩에 맞는지"다. 형태가 맞으면 계속 쓸 수 있다.
- **절대 쓰지 않는 것** — 원신(미호요)의 실제 게임 리소스·데이터마이닝된
  에셋이나 셰이더 코드를 그대로 가져오는 것. 루트 CLAUDE.md의 "원작사의
  실제 에셋 가져다 넣기 금지" 원칙이 원신에도 그대로 적용된다 — **오마주
  (스타일 참고)는 되지만 복제는 안 된다.** 셰이더는 아래처럼 오픈소스
  교육용 구현체를 참고해 직접 짠다.

## 셰이더 — 엔진마다 직접 구현

- **Godot 4**: 커스텀 셀셰이딩 프래그먼트 셰이더(램프 기반 명암 2~3단,
  위 "무엇을 뜻하는가" 스펙대로) + 외곽선(inverted-hull 또는 노멀 기반
  프레넬 방식 — 노멀 방향으로 살짝 부풀린 메시의 backface만 검게 렌더,
  Godot 4.x·모바일 성능에 맞는 쪽을 구현 단계에서 고른다). 참고 구현:
  godotshaders.com "Complete Cel Shader for Godot 4", Binbun "Godot
  Ultimate Toon Shader".
- Unity 트랙(`saga-unity`)과 **셰이더 코드를 공유하지 않는다** — 엔진마다
  셰이더 언어·파이프라인이 달라 saga-unity PLAN.md 66-2장에 별도로
  구현한다(루트 CLAUDE.md: 두 트랙은 코드 공유 없음, 기획만 같이 봄).

## 적용 순서 (지금 당장 할 일이 아니다 — 다음에 이어갈 세션이 볼 것)

1. 캐릭터 하나(Player, 아래 "진행" 절의 VRoid 임시 자산으로 시험 가능)에
   카툰 셰이더 시험 적용 → GUI로 실제로 원신 느낌이 나는지 확인(코드만으로
   판단 못 한다, 루트 CLAUDE.md 실기 확인 방침대로 이 결정 자체가 시각
   판단이라 예외적으로 초기에 한 번 봐야 한다) → 톤 확정.
2. 확정되면 Enemy/NPC/Boss까지 같은 셰이더 확장, 44장 우선순위(Player →
   주요 Enemy → Boss → Environment → Building → …)를 그대로 따른다.
3. 아웃라인은 성능 영향이 커서 마지막에 별도로 검토(모바일 실기기
   프레임 확인 필수, 71장 테스트 기기).
4. 환경(지형/식생/건물) 머티리얼 톤 보정은 8장·66장 "그래픽 확장" 순서를
   그대로 따라 뒤로 미룬다.

## 마이그레이션 — 기존 통합 Kenney 에셋을 어떻게 할까

`docs/ASSET_GUIDE.md`에 기록된 Kenney 통합(캐릭터 4종·마을집 모듈·던전
방/복도/문·논밭·사당)은 검증까지 끝난 실제 동작 코드다. 위 "적용 순서"와
같은 순서로, 옮기기 전 기존 Kenney 자산을 지우지 않는다 — 교체가
실패하면 되돌릴 수 있어야 한다.

## 하지 말 것

- 캐릭터를 사실적 PBR(금속성·거칠기 사실적 값)로 만들었다가 "나중에
  카툰으로 바꾸자"고 미루기 — 셰이딩 방식은 머티리얼 워크플로 자체가
  달라 나중에 통째로 다시 만드는 비용이 크다. 처음부터 카툰으로 간다.
- 모든 오브젝트에 아웃라인을 걸어 보고 나서 성능을 걱정하기 — 처음부터
  "시선이 가는 것만" 범위를 정해 시작한다.
- 이 결정을 이유로 66-1(렌더러 프로파일)이나 45장(모바일 성능 목표)을
  다시 논의하기 — 그래픽 방향은 확정, 파이프라인 결정과 독립이다.
- Kenney 자산을 한 번에 전부 지우고 시작하기(마이그레이션 중 게임이
  통째로 깨진다)
- 원신 데이터마이닝 리소스·셰이더를 그대로 가져다 쓰기(저작권 문제)
- Godot·Unity 트랙끼리 셰이더 코드를 공유하려 시도하기

## saga-unity와의 관계

**더 이상 같은 방향이 아니다(2026-09-13, 같은 날 두 번 바뀜).** 처음
이 장을 쓸 때는 "saga-unity는 별개 반영 안 됨, 범위 밖"이었고, 그 뒤
같은 날 잠깐 "saga-unity도 같은 원신풍 셀셰이딩"으로 맞췄다가(VRoid
샘플 미러링·gltFast 임포트 검증까지 함께 함) — **사용자가 다시 "saga-
unity는 원신 스타일이 아니라 사실적인 걸로, 엔진마다 다른 점이 필요해"
로 지시해 최종적으로 갈라섰다.** 지금은 `saga-godot`(이 장, 카툰/
셀셰이딩)과 `saga-unity`(그쪽 PLAN.md 66-2장, 사실적 PBR)가 **서로
다른 그래픽 목표**를 갖는다 — 더 이상 개념까지 공유하지 않는다. 다만
VRoid 샘플 gltFast 임포트가 됐다는 기술 검증 자체는 saga-unity 쪽에
그대로 남아 있다(그래픽 스타일과 무관한 엔진 사실). 자세한 내용은
saga-unity `docs/ASSET_GUIDE.md`·`docs/PROJECT_STATE.md`의 "정정" 항목
참고 — 여기서 반복하지 않는다(4장 원칙).

## 진행 (2026-09-13)

**1번 항목 완료 — VRoid Studio 설치·샘플 아바타 내보내기·Godot 임포트
검증까지 끝났다.** 세부 경위는 `docs/ASSET_GUIDE.md`·`docs/
PROJECT_STATE.md` 참고. 요약:

- VRoid Studio(공식 배포 `https://download.vroid.com/dist/.../VRoidStudio-
  v2.14.0-win.exe`, Inno Setup 설치, `/VERYSILENT`로 조용히 설치 가능
  확인)를 설치했다.
- **정정 — "GUI 작업이라 자동화 불가"는 절반만 맞았다.** 실제 캐릭터
  조형(슬라이더로 얼굴·헤어·옷 고르기)은 여전히 사람 몫이지만, "기본
  샘플 모델 열기 → VRM 내보내기(라이선스 옵션 포함) → 파일 저장"까지는
  PowerShell(`SetCursorPos`+`mouse_event` P/Invoke로 좌표 클릭, 스크린샷
  으로 각 단계 확인)로 실제로 자동화됐다. 다음에 같은 작업이 필요하면
  이 방법을 재사용할 수 있다 — 단, Unity 기반 앱이라 버튼에 접근성
  트리(UI Automation)가 안 잡혀 **좌표 클릭 + 스크린샷 확인** 방식만
  된다(네이티브 컨트롤이 아님).
- 내보내기 시 라이선스를 기본값(제작자 한정·개인 비영리·재배포 금지)에서
  **모든 유저·개인 및 법인 상업 이용 허용·재배포 허용·수정 허용**으로
  바꿔 저장했다 — 게임에 실제로 넣어 배포할 가능성을 열어 둔 것. VRoid
  Studio 자체의 이용약관도 동의 완료(상업적 게임 사용 허용, 별도 확인은
  `docs/ASSET_GUIDE.md` 참고).
- 결과물(`AvatarSample_A.vrm`, pixiv 제공 샘플 여성 아바타, 폴리곤
  29542·재질 16·본 91)을 `assets/characters_vroid/`에 두고, Godot이
  `.vrm` 확장자를 인식하지 않아(glTF 임포터가 확장자로만 판별) **같은
  내용을 `.glb`로 복사**해 헤드리스 임포트(`--headless --editor --quit`)
  검증 — **오류·경고 0건, 씬으로 정상 변환됨**. 파이프라인의 "모델
  가져오기" 단계는 이걸로 뚫렸다.
- 이 파일은 **최종 캐릭터가 아니라 파이프라인 검증용 임시 자산**이다
  (사용자가 직접 사람 조형 대신 기본 프리셋 그대로 내보내는 쪽을 선택,
  AskUserQuestion으로 확인받음). 실제 플레이어·NPC 외형은 나중에 따로
  디자인해서 교체한다.

## 셀셰이더 프로토타입 1호 (2026-09-13, 이어서 완료)

**"적용 순서" 3번(셀셰이더 프로토타입 작성)을 먼저 끝냈다** — 순서상
1번(사람이 VRoid로 실제 외형 조형)보다 자동화 가능한 항목을 먼저 처리.

- `saga_core/shaders/cel_toon.gdshader` 신규 — 텍스처 있는 캐릭터 메시용
  스팟 셰이더. `light()` 커스텀 함수로 NdotL을 `band_count`(기본 3단)
  계단으로 끊고(`band_softness`로 경계 부드럽기 조절), rim light
  (`rim_color`/`rim_power`/`rim_strength`)를 더한다. 아웃라인은 없다 —
  "적용 순서" 3번(성능 검토 후 별도)이 아직 안 왔다. godotshaders.com류
  공개 예제 방식을 참고해 직접 짰다(원신 실제 코드 아님, 루트 CLAUDE.md
  원작 에셋 금지 원칙).
- `saga_core/shaders/cel_shader_prototype/`(신규) — `AvatarSample_A.glb`를
  인스턴싱해 모든 `MeshInstance3D`의 서피스마다 원래 텍스처/틴트를 읽어
  `cel_toon.gdshader` 기반 `ShaderMaterial`로 서피스별 override하는
  프로토타입 씬+스크립트(`cel_shader_prototype.gd`). 46장 디버그 표시는
  66-1장(`renderer_debug_label.gd`)과 같은 패턴으로 `HUD/StatusLabel`에
  "cel shader: on (N surfaces)" 텍스트를 띄운다. **게임 씬이 아니다** —
  톤 확정 전 시험용, `run/main_scene`은 그대로 `TestVillage.tscn`.
- 검증: 헤드리스 임포트(`--headless --editor --path . --quit`) 오류·경고
  0건. 이 씬만 지정해 헤드리스로 실행
  (`--headless --path . res://saga_core/shaders/cel_shader_prototype/
  CelShaderPrototype.tscn --quit-after 5 --verbose`) — 셰이더 컴파일
  오류·스크립트 오류 0건, 텍스처·모델 로드까지 로그로 확인. **실제
  카툰 톤이 원신처럼 보이는지는 아직 사람이 안 봤다** — 이 결정은
  시각 판단이라 GUI로 직접 확인해야 확정된다(66-2장 "적용 순서" 1번,
  saga-godot CLAUDE.md의 "실제 화면 확인" 절차 — Godot 에디터로
  `CelShaderPrototype.tscn`을 열거나 실행해서 볼 것). `git status`로
  `project.godot`·`*.import` 의도치 않은 변경 없는지 확인, 무관한
  `.import` 줄바꿈 잡음만 있어 되돌렸다.

## 다음에 할 일 (아직 착수 전)

- **사람이 직접 `CelShaderPrototype.tscn`을 열어 카툰 톤을 눈으로 확인**
  (band_count·rim 값 튜닝은 실기 확인 후 결정) — 자동화 불가 영역
- 실제 캐릭터 외형(플레이어·촌장·상인·산적 등) 디자인 — 사람이 VRoid
  Studio를 직접 열어 슬라이더로 조형해야 하는 부분(자동화 불가 영역)
- Quaternius/KayKit에서 마을 건물·자연물 후보 다운로드해 형태 비교
- 톤이 확정되면 `cel_toon.gdshader`를 44장 우선순위대로 실제
  Player/Enemy/NPC/Boss 씬에 반영, 아웃라인은 그 다음 별도 단계
- `assets/characters_vroid/AvatarSample_A.vrm` 원본은 참고용으로 남기고,
  실제 씬에서 쓰는 쪽은 `.glb` 사본 — Godot 프로젝트 규칙상 `.vrm`은
  임포트 대상이 아니므로 이후 새 VRM을 추가할 때마다 `.glb`로도 복사해야
  한다는 점을 기억할 것

## 검증

- 이 장 자체(스펙·에셋 소스·라이선스 결정)는 문서 결정이라 헤드리스로
  검증할 게 없다(project.godot·씬·스크립트 변경 없음) — 단, "진행" 절의
  실제 VRoid 임포트는 헤드리스로 검증했다(위 기록).
- 실제 셰이더를 적용하는 다음 단계부터 46장 디버그 화면에 "카툰 셰이더
  적용 여부"를 표시하고, 위 "적용 순서" 1번에서 사람이 직접 화면을
  봐야 한다(이 결정만은 예외적으로 코드 완성 전에 한 번 실기 확인).

---

# 67. 사운드

초기부터 구조만 만들어 둔다.

지원:

- BGM
- SFX
- Attack
- Hit
- Skill
- UI
- Environment

콘텐츠가 늘어도 교체하기 쉽게 만든다.

---

# 68. Localization

텍스트를 코드에 직접 박지 않는다.

향후:

- 한국어
- 영어
- 일본어

등으로 확장 가능한 구조를 사용한다.

---

# 69. 접근성

가능하면:

- UI 크기
- 진동 On/Off
- 효과음 On/Off
- BGM On/Off
- 그래픽 품질

을 설정 가능하게 한다.

---

# 70. 품질 검증

각 Phase마다:

```text
Functional Test
Visual Test
Mobile Test
Performance Test
```

를 실시한다.

---

# 71. 테스트 기기

최소:

- 저사양 모바일
- 중급 모바일
- 고성능 모바일

을 고려한다.

---

# 72. 최적화 시점

최적화를 마지막에 한 번만 하지 않는다.

Vertical Slice부터 지속적으로 측정한다.

---

# 73. 메모리 관리

특히 모바일에서:

- Texture
- Mesh
- Animation
- Audio
- Particle

사용량을 관리한다.

---

# 74. 씬 관리

하나의 거대한 Scene에 모든 것을 넣지 않는다.

예:

```text
World
├── Terrain
├── Environment
├── NPC
├── Animals
├── Enemies
├── Events
└── POI
```

필요에 따라 분리한다.

---

# 75. Prefab 개념

Godot Scene을 재사용 가능한 단위로 만든다.

예:

```text
EnemyBase.tscn
NPCBase.tscn
Tree.tscn
Rock.tscn
Building.tscn
Chest.tscn
Portal.tscn
```

---

# 76. 재사용성

새 몬스터를 추가할 때:

기존 Combat/AI 시스템을 복사하지 않는다.

Data만 추가하여 새로운 몬스터를 만들 수 있는 방향을 우선한다.

---

# 77. 밸런스

수치는 코드에 흩어지지 않는다.

가능한 한:

```text
data/balance/
```

에서 관리한다.

---

# 78. 개발 로그

중요 변경 사항은:

```text
CHANGELOG.md
```

에 짧게 기록한다.

긴 설명을 남겨 Claude Code가 다음 실행마다 불필요하게 읽지 않도록 한다.

---

# 79. 작업 단위

하나의 Step은 가능하면:

**하나의 명확한 결과물**

을 갖는다.

예:

```text
STEP 61
Combat Core 생성
→ CombatManager
→ Damage 처리
→ 테스트
→ DONE
```

---

# 80. 실패 방지

어떤 단계가 실패하면:

```text
중단
→ 원인 파악
→ 최소 수정
→ 재검증
→ 완료
```

한다.

실패한 상태에서 기능을 계속 쌓지 않는다.

---

# 81~90. Vertical Slice 확장 검증

### 81
플레이어 이동 감각 검증.

### 82
카메라 감각 검증.

### 83
월드 시각적 품질 검증.

### 84
전투 타격감 검증.

### 85
적 AI 재미 검증.

### 86
스킬 재미 검증.

### 87
보상 재미 검증.

### 88
성장 체감 검증.

### 89
탐험 동기 검증.

### 90
30분 플레이 테스트.

---

# 91~100. 최종 Vertical Slice Gate

### 91
모바일 Portrait 테스트.

### 92
모바일 Landscape 테스트.

### 93
저사양 성능 테스트.

### 94
메모리 테스트.

### 95
세이브/로드 테스트.

### 96
버그 수정.

### 97
불필요한 기능 제거.

### 98
그래픽 품질 최종 개선.

### 99
게임 루프 최종 검증.

### 100
**Vertical Slice 승인/재설계 결정.**

100단계에서 무조건 다음 콘텐츠로 넘어가지 않는다.

게임이 재미없다면 Phase를 되돌려 개선한다.

---

# FINAL RULE

Claude Code는 이 문서를 한 번에 1~100까지 실행하지 않는다.

반드시:

```text
현재 Step 확인
↓
해당 Step만 실행
↓
검증
↓
상태 기록
↓
다음 Step
```

방식으로 진행한다.

특히 최초에는:

```text
Legacy Audit
→ Architecture
→ Vertical Slice
→ Project Foundation
```

까지만 집중한다.

**완성 게임을 한 번에 만들지 않는다.**

먼저:

> "작지만 그래픽이 좋고, 이동이 좋고, 전투가 재미있고, 탐험하고 싶고, 보상을 얻고 다시 플레이하고 싶은 3D 모바일 게임"

을 만든다.

그 이후에 SAGA GO / DUNGEON / FOREST / STORY / REALM을 확장한다.

**기존 1~80번의 장점은 버리지 않되, 구조적 중복과 낡은 구현 방식은 과감하게 제거하고 신규 Godot 4.x 구조에 맞게 재해석한다.**