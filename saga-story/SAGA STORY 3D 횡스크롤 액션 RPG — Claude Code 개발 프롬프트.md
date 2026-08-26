# SAGA STORY 3D 횡스크롤 액션 RPG 개발 프롬프트

## 0. 최우선 목표

현재 프로젝트:

https://smh8627-jpg.github.io/swbins/saga-story/

를 기반으로 **3D 횡스크롤 액션 RPG**로 발전시킨다.

단순히 기존 2D 게임을 3D로 치환하지 않는다.

목표는:

> "MapleStory의 성장/사냥 재미 + Elsword/Dragon Saga의 액션성 + Ori 계열의 이동 재미 + 3D 월드의 공간감"

을 하나의 게임으로 만드는 것이다.

단, MapleStory의 캐릭터/맵/이미지/음악/코드 등을 그대로 복제하지 않는다.

고유 IP인 SAGA STORY 스타일로 구현한다.

---

# 1. 절대적인 개발 원칙

## 가장 중요: 토큰 절약

Claude Code의 토큰 사용량을 최소화한다.

### 반드시 지켜라

1. 작업 시작 전에 전체 프로젝트를 무조건 전부 읽지 않는다.
2. 필요한 파일만 검색한다.
3. 이미 정상적으로 작동하는 코드는 수정하지 않는다.
4. 기존 기능을 다시 작성하지 않는다.
5. 파일 전체를 통째로 출력하거나 설명하지 않는다.
6. 변경이 필요한 부분만 수정한다.
7. 동일한 내용을 반복해서 설명하지 않는다.
8. 작은 작업마다 전체 프로젝트 분석을 다시 하지 않는다.
9. `node_modules`, 빌드 결과물, 캐시 파일은 읽지 않는다.
10. Git history 전체를 읽지 않는다.
11. 이미지/에셋 파일 자체를 불필요하게 분석하지 않는다.
12. 이미 확인한 구조는 기억하고 다시 탐색하지 않는다.
13. 하나의 기능을 구현할 때 관련 없는 리팩터링을 하지 않는다.
14. 작업 완료 후 긴 설명을 하지 않는다.
15. 변경 파일과 핵심 변경 내용만 간단히 보고한다.

### 검색 원칙

먼저:

```text
파일 구조 확인
↓
핵심 엔트리 파일 확인
↓
기존 플레이어/맵/렌더링 코드 확인
↓
필요한 파일만 수정
```

절대로:

```text
전체 코드 분석
↓
전체 파일 읽기
↓
전체 구조 재설계
```

방식으로 작업하지 않는다.

---

# 2. 기존 프로젝트 보존

현재 `saga-story` 프로젝트를 먼저 분석한다.

가장 먼저 확인할 것:

- package.json
- index.html
- src/
- public/
- 기존 game/engine 관련 파일
- player 관련 파일
- map 관련 파일
- UI 관련 파일
- 기존 asset 구조

그러나 파일 전체를 무조건 읽지 말고 다음을 우선 검색한다.

```text
player
character
map
camera
scene
renderer
game
input
collision
enemy
combat
skill
quest
inventory
```

기존 시스템 중 재사용 가능한 것은 최대한 유지한다.

---

# 3. 목표 게임 구조

게임의 기본 형태:

```text
3D World
   +
Side Scrolling Camera
   +
Action RPG
   +
Platforming
   +
Character Growth
   +
Exploration
   +
Loot
```

플레이어는 기본적으로 화면 좌우 방향으로 이동한다.

하지만 완전한 2D가 아니다.

### 3D 공간

```text
X = 좌우 이동
Y = 점프 / 높이
Z = 제한적인 깊이
```

Z축은 자유 이동시키지 않는다.

대신:

- 배경 깊이
- 전경 오브젝트
- 몬스터 배치
- 점프 경로
- 플랫폼
- 숨겨진 공간

등에 사용한다.

---

# 4. 카메라

핵심은 3D 횡스크롤 카메라다.

카메라:

```text
Perspective Camera
```

또는 프로젝트 상황에 따라:

```text
Orthographic Camera
```

를 선택한다.

단순히 정면 고정 카메라를 사용하지 않는다.

카메라는 플레이어를 따라가면서:

- 약간의 줌
- 부드러운 추적
- 전투 시 미세한 카메라 이동
- 점프 시 시야 확장
- 보스전 카메라 연출

을 지원할 수 있도록 구조화한다.

---

# 5. 화면 구성

기본 화면:

```text
┌────────────────────────────────────┐
│ HP / MP / EXP             Quest    │
│                                    │
│              몬스터                │
│       ○        ○                  │
│                PLAYER              │
│───────platform─────────────────────│
│                                    │
│ Skill 1  Skill 2  Skill 3   Potion │
└────────────────────────────────────┘
```

PC 키보드 기준:

```text
A / D = 이동
Space = 점프
J = 기본 공격
K = 스킬
L = 강력 스킬
I = 인벤토리
ESC = 메뉴
```

기존 입력 시스템이 있다면 최대한 재사용한다.

---

# 6. 캐릭터

3D 캐릭터 구조를 만든다.

가능하면 GLB/GLTF를 기본 포맷으로 사용한다.

구조:

```text
Player
 ├─ Model
 ├─ Animator
 ├─ Collider
 ├─ Controller
 ├─ Combat
 ├─ Stats
 ├─ Equipment
 └─ Effects
```

필요 애니메이션:

```text
idle
run
jump
fall
land
attack
attack2
skill
hurt
death
```

초기에는 실제 모델이 없어도 된다.

**임시 저폴리/기본 모델로 시스템을 먼저 완성한다.**

모델 제작 때문에 게임 시스템 구현이 중단되지 않게 한다.

---

# 7. 가장 중요한 이동 시스템

단순 좌우 이동만 만들지 않는다.

다음 시스템을 지원할 수 있는 구조로 만든다.

### 기본

- 걷기
- 달리기
- 점프
- 이중 점프
- 낙하
- 착지

### 확장

- 벽 점프
- 대시
- 공중 대시
- 사다리
- 이동 발판
- 점프 발판
- 로프
- 짧은 활강
- 특정 오브젝트 탑승

모든 기능을 처음부터 구현할 필요는 없다.

**아키텍처만 확장 가능하도록 만들고 MVP에서는 핵심 이동부터 구현한다.**

---

# 8. 맵 설계

기존 맵이 좁다면 크게 확장한다.

맵 하나를 단순히 긴 직선으로 만들지 않는다.

예:

```text
START
  │
  ├──── Forest
  │       │
  │       ├── Hidden Area
  │       │
  │       └── Vertical Area
  │
  ├──── Village
  │
  └──── Ruins
          │
          └──── Boss Area
```

하나의 횡스크롤 맵에서도:

```text
메인 루트
   +
위쪽 루트
   +
아래쪽 루트
   +
숨겨진 루트
```

가 존재하게 한다.

---

# 9. 3D를 활용한 맵

2D 맵을 3D로 늘리기만 하지 않는다.

다음과 같은 깊이감을 사용한다.

### Background Layer

멀리 있는 산 / 나무 / 건물

### Midground

게임의 메인 전투 영역

### Foreground

카메라 앞쪽의 나뭇가지 / 풀 / 구조물

### Gameplay Depth

제한된 Z축을 이용한:

- 앞뒤 플랫폼
- 숨겨진 길
- 몬스터 위치 변화
- 점프 경로
- 장애물

등을 넣는다.

---

# 10. 맵 재미의 핵심

맵마다 최소 하나 이상의 특징을 만든다.

예:

```text
Forest
→ 나무 사이를 점프

Cave
→ 좁은 길 + 낙하

Ruins
→ 움직이는 발판

Village
→ NPC + 상점

Mountain
→ 수직 이동

Swamp
→ 느려지는 지형

Sky
→ 공중 플랫폼

Castle
→ 함정 + 엘리트 몬스터
```

맵을 단순한 사냥터로 만들지 않는다.

---

# 11. 전투 시스템

메이플식 단순 공격 반복에서 벗어난다.

기본:

```text
Attack
↓
Combo
↓
Skill
↓
Air Attack
↓
Finisher
```

예:

```text
J
→ 기본 공격

J J
→ 2연타

J J J
→ 3연타

J + Space
→ 공중 공격

K
→ 스킬

L
→ 강력 스킬
```

가능하면 공격마다:

- Hit Stop
- Knockback
- Damage Number
- Particle
- Screen Shake
- Sound

을 적용한다.

---

# 12. 콤보 시스템

액션의 재미를 높이는 핵심 기능이다.

예:

```text
Ground Attack
↓
Launch
↓
Jump
↓
Air Attack
↓
Skill
↓
Ground Slam
```

콤보 수를 표시한다.

```text
COMBO x12
```

높은 콤보를 유지하면:

- 추가 EXP
- 골드 보너스
- 드롭률 증가
- 스킬 게이지 증가

등의 보상을 고려한다.

---

# 13. 몬스터

몬스터는 단순히 플레이어에게 접근만 하지 않는다.

최소:

```text
Melee
Ranged
Flying
Tank
Fast
Elite
Boss
```

AI 구조:

```text
Idle
↓
Detect
↓
Chase
↓
Attack
↓
Recover
↓
Dead
```

각 몬스터가 다른 공격 패턴을 가지도록 설계한다.

---

# 14. 엘리트 몬스터

일반 몬스터와 다른 색/효과를 가진 강화 몬스터를 만든다.

예:

```text
Elite Goblin
Elite Wolf
Elite Mage
Elite Golem
```

특수 효과:

```text
Fire
Ice
Poison
Fast
Shield
Vampire
Explosive
```

---

# 15. 보스

보스는 HP만 높은 몬스터가 아니다.

최소 3단계 패턴:

```text
Phase 1
↓
Phase 2
↓
Phase 3
```

HP가 감소하면 공격 패턴이 변화한다.

예:

```text
Boss
├─ 일반 공격
├─ 광역 공격
├─ 돌진
├─ 소환
├─ 장판
└─ 필살기
```

---

# 16. RPG 성장

MapleStory의 재미를 참고한다.

하지만 구조는 단순화한다.

```text
Level
EXP
HP
MP
Attack
Defense
Critical
MoveSpeed
```

레벨업:

```text
EXP
↓
Level Up
↓
Stat 증가
↓
Skill Point
```

---

# 17. 장비

기본 장비:

```text
Weapon
Armor
Helmet
Accessory
```

희귀도:

```text
Common
Uncommon
Rare
Epic
Legendary
```

랜덤 옵션:

```text
+Attack
+Defense
+Critical
+HP
+Skill Damage
+Move Speed
```

초기 MVP에서는 장비 10~20개 정도만 구현한다.

데이터 기반 구조로 만들어 이후 쉽게 추가한다.

---

# 18. 루팅

몬스터 처치:

```text
Monster
↓
EXP
↓
Gold
↓
Chance Loot
```

드롭 아이템:

```text
Gold
Potion
Equipment
Material
Rare Item
```

바닥 아이템을 실제 3D 오브젝트로 표시할 수 있게 한다.

---

# 19. 탐험

전투 외에도 플레이 이유가 있어야 한다.

예:

```text
Hidden Chest
Hidden NPC
Secret Platform
Rare Monster
Treasure
Shortcut
Collectible
```

100% 맵을 탐험하면 보상이 있도록 한다.

---

# 20. 랜덤 이벤트

반복 사냥의 지루함을 줄이기 위해 간단한 랜덤 이벤트 시스템을 만든다.

예:

```text
Random Event
├─ Monster Rush
├─ Treasure
├─ Elite Spawn
├─ Meteor
├─ NPC Rescue
└─ Rare Monster
```

같은 맵을 다시 방문해도 약간 다른 상황이 발생하게 한다.

단, 초기에는 시스템만 확장 가능하게 만들고 실제 이벤트는 1~2개만 구현한다.

---

# 21. 맵의 재미 공식

각 맵은:

```text
전투
+
탐험
+
플랫폼
+
보상
+
비밀
```

중 최소 3개 이상을 제공한다.

---

# 22. UI

깔끔한 RPG UI를 만든다.

필수:

```text
HP
MP
EXP
Level
Gold
Quest
Skill
Inventory
```

전투 UI:

```text
Damage Number
Critical
Combo
EXP
Loot
```

---

# 23. 그래픽 방향

완전한 사실적인 3D가 아니다.

목표:

```text
Stylized 3D
+
Cute Fantasy
+
Anime
+
Colorful
+
Readable Combat
```

캐릭터는 SD 비율을 유지한다.

배경은 캐릭터보다 조금 더 디테일하게 만든다.

---

# 24. 조명

3D의 장점을 적극적으로 사용한다.

기본:

```text
Directional Light
Ambient Light
Shadow
Fog
```

맵별 조명:

```text
Forest → 밝고 따뜻함

Cave → 어둡고 푸른 느낌

Ruins → 오래된 느낌

Village → 따뜻한 조명

Boss → 강한 대비
```

단, WebGL 성능을 고려한다.

---

# 25. 성능

브라우저 게임이므로 성능을 매우 중요하게 생각한다.

반드시 고려:

```text
Object Pooling
Frustum Culling
LOD
Instancing
Texture Optimization
Lazy Loading
Asset Preloading
```

몬스터가 많아져도 성능이 급격히 떨어지지 않게 한다.

---

# 26. 적 숫자

화면에 몬스터를 무조건 많이 배치하지 않는다.

초기 목표:

```text
일반 몬스터 5~15
```

정도에서 시작한다.

전투가 재미있어지면 숫자를 늘린다.

---

# 27. 코드 구조

가능하면 다음과 같이 분리한다.

```text
src/
 ├─ core/
 │   ├─ Game.js
 │   ├─ SceneManager.js
 │   └─ AssetManager.js
 │
 ├─ player/
 │   ├─ Player.js
 │   ├─ PlayerController.js
 │   ├─ PlayerCombat.js
 │   └─ PlayerStats.js
 │
 ├─ enemy/
 │   ├─ Enemy.js
 │   ├─ EnemyAI.js
 │   └─ EnemySpawner.js
 │
 ├─ world/
 │   ├─ World.js
 │   ├─ Map.js
 │   └─ Camera.js
 │
 ├─ combat/
 │   ├─ DamageSystem.js
 │   ├─ ComboSystem.js
 │   └─ EffectSystem.js
 │
 ├─ items/
 │   ├─ Item.js
 │   ├─ Inventory.js
 │   └─ LootSystem.js
 │
 └─ ui/
     ├─ HUD.js
     ├─ SkillBar.js
     └─ InventoryUI.js
```

단,

**현재 프로젝트 구조가 이미 잘 만들어져 있다면 이 구조로 무조건 이동시키지 않는다.**

기존 구조를 우선 존중한다.

---

# 28. 데이터 기반 설계

몬스터와 아이템을 코드에 하드코딩하지 않는다.

예:

```js
{
  id: "forest_slime",
  hp: 100,
  attack: 15,
  defense: 5,
  exp: 20,
  dropTable: [...]
}
```

아이템:

```js
{
  id: "wood_sword",
  type: "weapon",
  rarity: "common",
  attack: 10
}
```

향후 JSON 데이터로 쉽게 확장할 수 있게 한다.

---

# 29. 개발 순서

한 번에 모든 기능을 구현하지 않는다.

## Phase 1

현재 프로젝트 분석

↓

3D 렌더링 기반

↓

3D Player

↓

횡스크롤 Camera

↓

좌우 이동

↓

점프

↓

충돌

---

## Phase 2

몬스터

↓

기본 공격

↓

피격

↓

HP

↓

사망

↓

EXP

---

## Phase 3

스킬

↓

콤보

↓

데미지 숫자

↓

히트 이펙트

↓

카메라 쉐이크

---

## Phase 4

맵 확장

↓

플랫폼

↓

다층 구조

↓

숨겨진 길

↓

맵 이동

---

## Phase 5

RPG

↓

Level

↓

Stats

↓

Equipment

↓

Inventory

↓

Loot

---

## Phase 6

콘텐츠

↓

NPC

↓

Quest

↓

Random Event

↓

Elite

↓

Boss

---

# 30. MVP 우선순위

처음부터 완성형 RPG를 만들지 않는다.

첫 번째 목표는 다음이다.

```text
3D 캐릭터
+
3D 횡스크롤 카메라
+
넓은 맵
+
점프
+
몬스터
+
기본 공격
+
피격
+
HP
+
EXP
+
레벨업
```

이것만 먼저 완성한다.

이 상태에서 실제 플레이가 재미있는지 확인한다.

---

# 31. 가장 중요한 재미 테스트

개발 중 다음 질문을 계속 확인한다.

```text
걷는 것이 재미있는가?

점프가 재미있는가?

몬스터를 때리는 것이 재미있는가?

콤보가 손에 붙는가?

맵을 탐험할 이유가 있는가?

아이템을 얻었을 때 기분이 좋은가?

레벨업이 기대되는가?

다음 지역으로 가고 싶은가?
```

기능 개수보다 **플레이 감각**을 우선한다.

---

# 32. 절대 하지 말 것

다음 행동은 금지한다.

```text
❌ 전체 프로젝트 재작성
❌ 기존 코드 전면 리팩터링
❌ 필요 없는 프레임워크 교체
❌ 기존 기능 삭제
❌ 모든 파일 TypeScript 전환
❌ 새로운 빌드 시스템 도입
❌ 대규모 폴더 이동
❌ 필요 없는 라이브러리 추가
❌ 에셋부터 대량 제작
❌ 모든 기능을 한 번에 구현
```

현재 프로젝트에서 최소 변경으로 목표를 달성한다.

---

# 33. Claude Code 작업 방식

각 작업마다 다음 순서로 실행한다.

```text
1. 필요한 파일 검색
2. 관련 코드 최소 범위 확인
3. 구현 계획 3~5줄
4. 코드 수정
5. lint/build/test
6. 실제 실행 가능 여부 확인
7. 변경사항 요약
```

분석 결과를 장황하게 출력하지 않는다.

---

# 34. 토큰 절약 규칙

Claude Code에게 특히 중요하다.

### 파일 읽기

필요한 부분만 읽는다.

예:

```text
player.js 전체 읽기
```

보다:

```text
Player class
constructor
movement
update
```

등 필요한 부분만 확인한다.

### 검색

한 번에 많은 검색을 하지 않는다.

먼저:

```text
Player
```

찾고 결과에 따라 다음 검색을 한다.

### 수정

가능하면 patch/edit 방식으로 수정한다.

전체 파일 재작성 금지.

### 설명

작업 후:

```text
변경:
- Camera 추가
- Player 3D 이동 추가
- 점프 충돌 추가

테스트:
- npm run build 통과
```

정도로 짧게 끝낸다.

---

# 35. 에셋 처리

실제 3D GLB 모델이 아직 없다면 임시 모델을 사용한다.

예:

```text
Capsule
Box
Low Poly Character
```

먼저 게임 시스템을 완성한다.

이후 GLB 교체만으로 실제 캐릭터가 들어가도록 한다.

에셋 경로를 코드에 하드코딩하지 말고 AssetManager를 사용한다.

---

# 36. 모바일 고려

향후 모바일에서도 실행할 수 있도록 설계한다.

모바일:

```text
Virtual Joystick
Attack Button
Jump Button
Skill Buttons
```

하지만 PC 기능을 먼저 완성한다.

---

# 37. 저장 시스템

향후:

```text
localStorage
```

기반 저장을 지원할 수 있게 구조를 만든다.

저장 대상:

```text
Level
EXP
Gold
Inventory
Equipment
Quest
Map Progress
```

초기 MVP에서는 저장 시스템을 마지막에 구현한다.

---

# 38. 최종 비전

최종적으로 다음과 같은 게임을 목표로 한다.

```text
SAGA STORY

        3D Fantasy World

 ┌─────────────────────────────┐
 │                             │
 │       Monster               │
 │          ↓                  │
 │      [PLAYER]               │
 │         ⚔                   │
 │──── platform ───────────────│
 │                             │
 └─────────────────────────────┘

MapleStory
   +
Elsword
   +
Dragon Saga
   +
Ori
   +
SAGA만의 세계관
```

핵심은 **"메이플스토리 3D 복제품"이 아니라 "메이플스토리에서 재미있었던 요소를 발전시킨 새로운 3D 횡스크롤 RPG"​**다.

---

# 39. 지금 당장 실행할 작업

먼저 아무것도 대규모로 수정하지 말고 현재 프로젝트를 조사한다.

### STEP 1

다음만 확인한다.

```text
package.json
index.html
src 핵심 구조
현재 게임 진입점
현재 Player 관련 코드
현재 Map 관련 코드
현재 Renderer/Scene 관련 코드
```

### STEP 2

현재 프로젝트가 어떤 렌더링 엔진을 사용하는지 확인한다.

예:

```text
Three.js
PixiJS
Phaser
Canvas
WebGL
기타
```

### STEP 3

이미 Three.js/WebGL 구조가 있다면 절대 교체하지 않는다.

기존 엔진 위에 3D 시스템을 추가한다.

### STEP 4

첫 번째 목표:

```text
3D Scene
+
3D Player
+
Side Camera
+
좌우 이동
+
점프
+
바닥 충돌
```

까지만 구현한다.

### STEP 5

브라우저에서 실제 플레이 테스트를 한다.

---

# 40. 완료 기준

첫 번째 MVP가 완료되면 브라우저에서:

```text
게임 실행
↓
3D 맵 표시
↓
플레이어 표시
↓
좌우 이동
↓
점프
↓
플랫폼 충돌
↓
카메라 추적
↓
몬스터 표시
↓
공격
↓
몬스터 피격
↓
EXP 획득
↓
레벨업
```

이 자연스럽게 이어져야 한다.

---

# 최종 지시

**지금은 모든 기능을 구현하지 마라.**

먼저 현재 `saga-story` 코드를 최소한으로 조사하고 기존 구조를 최대한 보존하면서 **3D 횡스크롤 MVP**부터 만든다.

그리고 매 단계마다:

```text
최소 수정
최소 파일 읽기
최소 토큰 사용
최대 재사용
```

원칙을 적용한다.

성능과 확장성을 확보하되 과도한 추상화는 하지 않는다.

**게임의 재미를 기능 수보다 우선한다.**