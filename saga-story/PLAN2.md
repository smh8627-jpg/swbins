# saga-story Unity 6 전면 재구축 작업 지시서

## 0. 최우선 원칙

이 프로젝트는 기존 `saga-story` 웹 게임을 단순 포팅하거나 HTML/JS 코드를 Unity로 기계적으로 변환하는 작업이 아니다.

**기존 게임의 핵심 재미와 콘텐츠 의도를 분석한 뒤 Unity 6 기반의 새로운 게임으로 재구축한다.**

기존 게임:
https://smh8627-jpg.github.io/swbins/saga-story/

목표:

- Unity 6 기반
- 기존 saga-story의 핵심 게임 컨셉 유지
- 기존보다 훨씬 높은 그래픽 품질
- 3D 게임으로 전환
- 모바일 우선
- Android/iOS 대응
- 세로/가로 화면 모두 지원
- 횡스크롤 게임의 재미를 강화
- 탐험/전투/성장/수집 요소 확장
- 지형과 배경 오브젝트를 풍부하게 구성
- 실제 게임처럼 보이는 완성도 높은 월드 구성
- 향후 콘텐츠 추가가 쉬운 구조
- 성능 최적화
- **Claude Code 토큰 사용량 최소화**

---

# 1. Claude Code 토큰 절약 규칙 — 매우 중요

작업 전체에서 가장 중요한 개발 규칙이다.

## 절대 금지

- 프로젝트 전체 파일을 매번 읽지 않는다.
- 동일한 파일을 반복해서 읽지 않는다.
- 이미 확인한 코드를 다시 출력하지 않는다.
- 대규모 파일을 통째로 출력하지 않는다.
- 의미 없는 설명을 길게 작성하지 않는다.
- 기존 코드를 전부 삭제하고 처음부터 무작정 재작성하지 않는다.
- 작업과 관계없는 파일을 분석하지 않는다.
- 같은 오류를 여러 번 분석하지 않는다.
- 에셋을 무작정 대량 생성하지 않는다.

## 작업 방식

항상 다음 순서로 작업한다.

1. 현재 프로젝트 구조 확인
2. 필요한 파일만 탐색
3. 핵심 구조만 요약
4. 변경 대상 파일 선정
5. 최소한의 파일만 수정
6. 컴파일/실행 확인
7. 오류가 있을 경우 오류 관련 파일만 재확인
8. 다음 작업으로 이동

## 출력 규칙

Claude Code의 응답은 최대한 짧게 유지한다.

예:

```text
분석 완료
변경 파일: 3개
핵심 변경: Player / Camera / UI
다음 단계: 전투 시스템
```

불필요한 코드 전체 출력 금지.

---

# 2. 기존 프로젝트 분석

먼저 현재 saga-story를 분석한다.

확인할 것:

- 현재 게임 장르
- 게임 진행 방식
- 캐릭터 이동 방식
- 횡스크롤 구조
- 전투 방식
- 몬스터
- 맵
- 스테이지
- UI
- 성장 시스템
- 아이템
- 퀘스트
- 저장 방식
- 사운드
- 애니메이션
- 현재 사용 중인 그래픽
- 현재 부족한 부분

단, 분석 결과를 장황하게 출력하지 않는다.

다음 형식으로만 정리한다.

```text
[CURRENT]
Genre:
Core Loop:
Player:
Combat:
Map:
Progression:
UI:
Save:
Major Problems:
```

---

# 3. 기존 HTML/JS 코드를 Unity 코드로 1:1 변환하지 않는다

기존 JavaScript 구조를 그대로 C#으로 번역하지 않는다.

기존 시스템의 "기능"만 분석하고 Unity에 적합한 구조로 다시 설계한다.

예:

JavaScript Player
→ Unity PlayerController

JavaScript Monster
→ Unity EnemyController

JavaScript Stage
→ Unity StageManager

JavaScript UI
→ Unity Canvas + UI Controller

JavaScript GameManager
→ Unity GameManager

---

# 4. Unity 버전

가능하면 최신 안정 Unity 6 계열을 사용한다.

프로젝트는 모바일 3D 게임 기준으로 구성한다.

권장 구조:

```text
Assets/
 ├─ Art/
 │   ├─ Characters/
 │   ├─ Enemies/
 │   ├─ Environment/
 │   ├─ Props/
 │   ├─ VFX/
 │   └─ UI/
 │
 ├─ Audio/
 │
 ├─ Materials/
 │
 ├─ Prefabs/
 │   ├─ Characters/
 │   ├─ Enemies/
 │   ├─ Environment/
 │   └─ UI/
 │
 ├─ Scenes/
 │   ├─ Boot/
 │   ├─ MainMenu/
 │   ├─ World/
 │   └─ Battle/
 │
 ├─ Scripts/
 │   ├─ Core/
 │   ├─ Player/
 │   ├─ Enemy/
 │   ├─ Combat/
 │   ├─ World/
 │   ├─ Quest/
 │   ├─ Inventory/
 │   ├─ Save/
 │   ├─ UI/
 │   └─ Camera/
 │
 └─ Settings/
```

---

# 5. 게임 방향

기존 saga-story의 횡스크롤 느낌은 유지한다.

하지만 단순한 2D 횡스크롤 게임이 아니라:

**3D 횡스크롤 액션 RPG**

방향으로 재구축한다.

카메라는 기본적으로 플레이어를 따라가면서 횡방향 진행을 보여준다.

필요한 경우 카메라에 약간의 깊이감을 추가한다.

목표:

```text
2D 횡스크롤
↓
3D 캐릭터
↓
3D 배경
↓
3D 지형
↓
액션 전투
↓
탐험
↓
성장
```

---

# 6. 그래픽 방향

기존 그래픽의 단순함을 그대로 유지하지 않는다.

게임 화면에 다음 요소가 충분히 보여야 한다.

### 지형

- 언덕
- 절벽
- 나무
- 바위
- 풀
- 꽃
- 다리
- 계단
- 동굴
- 폐허
- 건물
- 표지판
- 횃불
- 상자
- 나무 울타리
- 장식물

### 배경

최소 3~4개의 깊이 레이어를 사용한다.

```text
Sky
↓
Far Background
↓
Mid Background
↓
Gameplay Terrain
↓
Foreground Props
```

이를 이용해서 횡스크롤 화면에서도 깊이감이 느껴지게 한다.

---

# 7. 3D 에셋 사용

직접 단순한 Cube/Sphere만 조합해서 게임을 만들지 않는다.

가능한 경우 적절한 3D 에셋을 사용하는 구조를 만든다.

필요 에셋:

- Player
- NPC
- Enemy
- Boss
- Tree
- Rock
- Grass
- Building
- Dungeon
- Weapon
- Armor
- Chest
- Props
- Environment

단, 에셋을 무작정 많이 넣지 않는다.

**재사용 가능한 Prefab 중심으로 구성한다.**

---

# 8. 모바일 최적화

모바일을 최우선 플랫폼으로 한다.

목표:

- 낮은 Draw Call
- 적절한 Polygon 수
- Texture 압축
- LOD
- Object Pooling
- Culling
- Particle 제한
- 불필요한 실시간 그림자 최소화
- GC Alloc 최소화
- Update 남용 금지

특히 적/이펙트가 많아질 경우 Object Pooling을 기본 사용한다.

---

# 9. 플레이어

플레이어는 단순 이동 캐릭터가 아니다.

최소한 다음 시스템을 고려한다.

```text
Move
Jump
Dash
Attack
Combo
Skill
Hit
Knockback
Death
Respawn
```

캐릭터 애니메이션 상태:

```text
Idle
Run
Jump
Fall
Attack
Skill
Hit
Death
```

---

# 10. 전투

기존보다 액션성이 강해야 한다.

기본 전투:

- 일반 공격
- 연속 공격
- 강공격
- 스킬
- 회피
- 적 피격
- 넉백
- 크리티컬
- 사망

전투가 단순히:

```text
접촉 → HP 감소
```

형태가 되지 않도록 한다.

플레이어가 직접 조작하고 공격 타이밍을 판단하는 구조로 만든다.

---

# 11. 적 디자인

적 종류를 충분히 확장할 수 있는 구조로 만든다.

예:

```text
Melee Enemy
Ranged Enemy
Flying Enemy
Fast Enemy
Tank Enemy
Caster Enemy
Elite Enemy
Mini Boss
Boss
```

각 적은 서로 다른 행동 패턴을 갖도록 한다.

---

# 12. 스테이지

단순히 길게 이어진 한 줄짜리 맵을 만들지 않는다.

각 스테이지에:

```text
Start
↓
Exploration
↓
Combat Area
↓
Reward
↓
Mini Event
↓
Elite Enemy
↓
Boss
↓
Reward
```

같은 흐름을 적용한다.

---

# 13. 탐험 요소

횡스크롤이지만 화면에 볼거리가 많아야 한다.

추가:

- 숨겨진 길
- 상자
- 보물
- NPC
- 이벤트
- 점프 구간
- 높은 지형
- 낮은 지형
- 비밀 지역
- 수집품
- 환경 이벤트

---

# 14. 월드 다양성

최소 다음과 같은 테마를 확장 가능하게 설계한다.

```text
Forest
Village
Mountain
Cave
Ruins
Castle
Swamp
Snow
Desert
Volcanic
```

각 지역은:

- 색감
- 조명
- 배경
- 몬스터
- 음악
- 지형
- 환경 오브젝트

가 서로 다르게 느껴져야 한다.

---

# 15. 성장 시스템

RPG 느낌을 강화한다.

기본:

```text
Level
EXP
HP
MP
Attack
Defense
Critical
Speed
```

추가:

- 장비
- 무기
- 방어구
- 액세서리
- 스킬
- 스킬 강화
- 아이템
- 골드

---

# 16. UI

모바일 기준으로 UI를 설계한다.

### 가로 모드

액션 게임 중심.

```text
HP / MP
Quest
Skill Buttons
Attack Button
Inventory
Mini Map
```

### 세로 모드

간단하고 직관적인 UI.

화면을 좁게 사용하되 게임 진행이 가능해야 한다.

모든 UI는 Safe Area를 고려한다.

---

# 17. 모바일 조작

터치 조작을 기본으로 한다.

가로:

```text
왼쪽 = Virtual Joystick
오른쪽 = Attack / Skill / Dash
```

세로:

```text
Joystick
Attack
Skill
Dash
```

PC 테스트를 위해 키보드 입력도 지원한다.

---

# 18. 세로/가로 자동 대응

게임 실행 시 화면 방향을 감지하고 UI를 자동 변경한다.

```text
Portrait
Landscape
```

두 모드에서 모두 게임 플레이가 가능해야 한다.

UI를 단순히 확대/축소하지 말고 레이아웃 자체를 변경한다.

---

# 19. 카메라

카메라는 횡스크롤 게임의 핵심이다.

기본:

- Player Follow
- Smooth Camera
- Camera Bounds
- Dead Zone
- Look Ahead
- Zoom

상황에 따라:

- 보스전 Zoom Out
- 이벤트 Camera
- 컷신 Camera
- 특별 연출 Camera

를 지원할 수 있도록 구조화한다.

---

# 20. 애니메이션

Animator Controller 기반으로 만든다.

가능하면 애니메이션 전환을 명확하게 관리한다.

Animator 상태:

```text
Idle
Run
Jump
Fall
Attack
Skill
Hit
Death
```

---

# 21. VFX

게임의 타격감을 강화한다.

최소:

- Hit Effect
- Critical Effect
- Skill Effect
- Dash Effect
- Enemy Death Effect
- Level Up Effect
- Boss Effect

단, 모바일 성능을 고려하여 Particle 수를 제한한다.

---

# 22. 사운드

최소:

- 공격음
- 피격음
- 스킬음
- 점프음
- 아이템 획득
- 레벨업
- UI Click
- 지역별 BGM
- Boss BGM

---

# 23. 저장 시스템

Unity PlayerPrefs에 모든 데이터를 저장하지 않는다.

확장 가능한 SaveData 구조를 만든다.

예:

```text
Player
Inventory
Equipment
Quest
Progress
Settings
```

JSON 또는 적절한 직렬화 구조를 사용한다.

---

# 24. 콘텐츠 확장 구조

가장 중요하다.

새로운 콘텐츠를 추가할 때 기존 코드를 대량 수정하지 않아도 되도록 한다.

예:

```text
EnemyData
ItemData
SkillData
StageData
QuestData
CharacterData
```

가능하면 ScriptableObject 기반 데이터 구조를 사용한다.

---

# 25. 하드코딩 최소화

다음 정보를 코드에 직접 하드코딩하지 않는다.

- 몬스터 HP
- 공격력
- 아이템 가격
- 경험치
- 스킬 데미지
- 스테이지 정보
- 드랍률

데이터 에셋에서 수정할 수 있도록 한다.

---

# 26. 씬 구조

씬을 지나치게 많이 만들지 않는다.

초기:

```text
Boot
MainMenu
World
```

정도로 시작한다.

스테이지는 가능한 경우 데이터 기반으로 관리한다.

---

# 27. 에셋 관리

에셋 중복을 최소화한다.

동일한 나무를 여러 개 복사하지 말고 Prefab을 재사용한다.

가능하면:

```text
Prefab
Material
Texture
Animation
```

을 공유한다.

---

# 28. 성능 목표

모바일에서 안정적으로 실행되는 것을 우선한다.

목표:

```text
Target FPS: 60
Fallback: 30
```

저사양 기기에서도 플레이 가능한 품질을 목표로 한다.

---

# 29. 개발 순서

한 번에 모든 기능을 만들지 않는다.

다음 순서로 개발한다.

## Phase 1

Unity 프로젝트 생성

- Unity 6
- Mobile 3D
- Input System
- 기본 설정
- Gitignore

## Phase 2

Core

- GameManager
- SceneManager
- SaveManager
- AudioManager

## Phase 3

Player

- 3D Character
- Movement
- Camera
- Animation

## Phase 4

Combat

- Attack
- Hit
- Damage
- Enemy
- Death

## Phase 5

World

- Terrain
- Stage
- Environment
- Props

## Phase 6

Progression

- EXP
- Level
- Item
- Equipment
- Skill

## Phase 7

Quest

- NPC
- Quest
- Reward

## Phase 8

Mobile

- Touch
- Joystick
- Mobile UI
- Portrait
- Landscape

## Phase 9

Optimization

- Pooling
- LOD
- Culling
- Texture
- DrawCall
- GC

## Phase 10

Polish

- VFX
- Lighting
- Sound
- Animation
- UI
- Camera
- Effects

---

# 30. 절대 하지 말아야 할 것

다음 행동은 금지한다.

```text
기존 프로젝트 전체 삭제
↓
빈 Unity 프로젝트
↓
Cube로 게임 제작
```

이런 식의 단순 프로토타입으로 끝내지 않는다.

또한:

- 플레이어만 3D
- 배경은 단순 Plane
- 적은 Capsule
- 나무는 Cube
- UI는 기본 Unity 버튼

수준의 결과물을 최종 결과로 인정하지 않는다.

---

# 31. 품질 기준

최종 결과는 "Unity로 옮겼다"가 아니라

**"모바일에서 실제로 출시 가능한 3D 횡스크롤 액션 RPG의 기반"**

수준을 목표로 한다.

특히 기존 게임보다 다음 항목이 명확하게 좋아져야 한다.

```text
그래픽       ↑↑↑
배경 다양성  ↑↑↑
지형         ↑↑↑
전투         ↑↑↑
애니메이션   ↑↑
타격감       ↑↑↑
콘텐츠       ↑↑↑
모바일 UX    ↑↑↑
성능         ↑↑
확장성       ↑↑↑
```

---

# 32. Claude Code 작업 방법

각 단계가 끝날 때마다 다음 형식으로만 보고한다.

```text
[PHASE X COMPLETE]

Changed:
- 파일명
- 파일명

Implemented:
- 핵심 기능 1
- 핵심 기능 2

Build:
PASS / FAIL

Next:
다음 작업
```

전체 코드를 출력하지 않는다.

---

# 33. 첫 작업

지금은 게임을 바로 대량 구현하지 않는다.

먼저 다음만 수행한다.

1. 기존 saga-story 분석
2. 기존 기능 목록 추출
3. 기존 문제점 파악
4. Unity 프로젝트 구조 설계
5. Unity 프로젝트 생성
6. 기본 패키지 설정
7. 폴더 구조 생성
8. 기본 Scene 생성
9. Gitignore 생성
10. 최소 Core 시스템 생성

그 다음 작업을 중단하고 결과를 보고한다.

---

# 34. 중요

현재 웹 게임을 그대로 복사해서 Unity로 만드는 것이 목적이 아니다.

**현재 게임을 레퍼런스로 삼아 더 높은 품질의 Unity 3D 게임으로 재설계한다.**

기존 게임의 핵심 재미는 유지하되 부족한 부분은 적극적으로 개선한다.

특히:

- 좁은 맵
- 부족한 지형
- 단순한 배경
- 부족한 콘텐츠
- 단조로운 전투
- 낮은 그래픽 품질
- 부족한 탐험 요소

를 개선한다.

---

# 35. 최종 방향

최종적으로 다음 구조를 목표로 한다.

```text
              SAGA STORY
                   │
          Unity 6 3D RPG
                   │
       ┌───────────┼───────────┐
       │           │           │
    Explore      Combat     Progression
       │           │           │
    World        Enemy       Level
    NPC          Boss        Item
    Event        Skill       Equipment
    Secret       VFX         Quest
       │           │           │
       └───────────┼───────────┘
                   │
             Mobile First
                   │
        ┌──────────┴──────────┐
        │                     │
     Portrait             Landscape
        │                     │
        └──────────┬──────────┘
                   │
             Android / iOS
```

**다시 강조한다.**

토큰 절약이 최우선이다.

필요한 파일만 읽고, 필요한 부분만 수정하고, 이미 확인한 내용은 반복 분석하지 않는다.

작업을 작은 Phase로 나누고 각 Phase가 정상적으로 동작하는지 확인한 후 다음 단계로 진행한다.

최종 목표는 단순한 코드 변환이 아니라 **기존 saga-story를 기반으로 한 고품질 Unity 6 모바일 3D 횡스크롤 액션 RPG 재구축**이다.