# saga-dungeon 3D 액션 RPG 대규모 리뉴얼

## 0. 최우선 원칙

현재 프로젝트를 버리고 새 게임을 처음부터 만들지 않는다.

반드시 현재 `saga-dungeon` 프로젝트의 구조와 기존 기능을 먼저 분석한 뒤,
재사용 가능한 코드/데이터/UI/게임 로직은 최대한 유지하면서 단계적으로 3D 액션 RPG로 전환한다.

목표:

- 2D 던전 게임 → 고품질 3D 액션 RPG
- Diablo 계열 핵앤슬래시 전투 감각
- 단순 던전 반복 → 넓은 랜덤 필드 탐험
- 빠른 전투
- 몬스터 대량 전투
- 다양한 스킬 빌드
- 랜덤 전리품
- 장비 파밍
- 엘리트/월드 이벤트
- 강력한 보스
- 반복 플레이 가치
- 모바일/PC 반응형
- WebGL 성능 최적화
- 현재 프로젝트에서 최대한 적은 코드 변경으로 구현
- 토큰 사용량 최소화

중요:

"기능을 많이 넣는 것"보다
"작은 코드로 확장 가능한 구조"를 우선한다.

---

# 1. 작업 시작 전 반드시 수행

코드를 바로 수정하지 말 것.

먼저 프로젝트를 분석한다.

확인 대상:

- package.json
- src/
- public/
- assets/
- 기존 JS/TS 파일
- 기존 CSS
- HTML
- 게임 루프
- 캐릭터
- 몬스터
- 전투
- 아이템
- 맵
- UI
- 저장 시스템
- 랜덤 생성 시스템

그리고 다음을 내부적으로 정리한다.

1. 현재 게임 구조
2. 현재 사용하는 렌더링 방식
3. 현재 게임 상태 관리 방식
4. 기존 재사용 가능한 코드
5. 제거해야 할 코드
6. 3D 전환에 필요한 최소 파일
7. 성능 병목 가능성이 있는 부분

분석 결과를 길게 출력하지 말고
핵심 문제와 작업 순서만 간단히 정리한다.

---

# 2. 최우선 목표

최종적으로 다음 느낌의 게임을 만든다.

## 게임 방향

Top-down / isometric 3D Action RPG

플레이어가 넓은 필드를 자유롭게 이동하면서:

- 몬스터 발견
- 즉시 전투
- 스킬 사용
- 몬스터 처치
- 골드 획득
- 장비 획득
- 장비 교체
- 스킬 강화
- 랜덤 이벤트 발견
- 엘리트 몬스터
- 보스
- 지역 이동

을 반복한다.

"방 하나 → 방 하나" 형태의 고정 던전보다

"넓은 필드에서 탐험하다가 전투가 발생하는 구조"

를 기본으로 한다.

---

# 3. 3D 렌더링

현재 프로젝트가 Canvas/DOM 중심이라면
기존 시스템을 최대한 유지하면서 Three.js 기반 3D 렌더링 계층을 추가한다.

가능하면:

Three.js
+ GLB/GLTF
+ Orbit/커스텀 카메라
+ InstancedMesh
+ Frustum Culling
+ LOD
+ Object Pool

구조를 사용한다.

3D 엔진을 전체 프로젝트에 강제로 결합하지 말고 다음처럼 분리한다.

```text
Game Logic
    ↓
World
    ↓
Entity
    ↓
3D Renderer
```

게임 로직과 렌더링을 분리한다.

---

# 4. 3D 월드

현재 좁은 던전 구조를 크게 확장한다.

최소 목표:

- 넓은 지형
- 숲
- 폐허
- 바위
- 절벽
- 길
- 강
- 작은 호수
- 동굴 입구
- 폐허 건물
- 제단
- 캠프
- 보물 장소
- 몬스터 지역
- 보스 지역

등을 배치한다.

단순 평면 하나가 아니라

높낮이가 있는 지형을 만든다.

예:

```text
       산
    ███████
      숲
   🌲 🌲 🌲
────────────
      길
────────────
     폐허
   ███  ███

        강
~~~~~~~~~~~~
```

---

# 5. 랜덤 필드 시스템

고정 맵 하나만 사용하지 않는다.

Seed 기반 랜덤 생성 시스템을 만든다.

예:

```js
generateWorld(seed)
```

같은 Seed라면 같은 맵이 생성되도록 한다.

랜덤 요소:

- 지형
- 몬스터 위치
- 보물
- 이벤트
- 엘리트
- NPC
- 제단
- 자원
- 보스 위치

단,

완전 랜덤이 아니라 플레이 가능한 결과만 생성한다.

---

# 6. 필드 크기

현재보다 최소 5~10배 넓은 느낌으로 만든다.

단순히 실제 geometry를 엄청 크게 만들지 않는다.

Chunk 시스템을 사용한다.

```text
World
 ├─ Chunk 0,0
 ├─ Chunk 0,1
 ├─ Chunk 1,0
 ├─ Chunk 1,1
 └─ ...
```

플레이어 주변 Chunk만 활성화한다.

멀리 있는 Chunk:

- 렌더링하지 않음
- 몬스터 AI 비활성화
- 애니메이션 비활성화

플레이어가 접근하면 활성화한다.

---

# 7. 플레이어

플레이어를 실제 3D 캐릭터로 만든다.

가능하면 GLB 모델을 사용할 수 있도록 구조를 만든다.

```text
Player
 ├─ Model
 ├─ Animation
 ├─ Stats
 ├─ Skills
 ├─ Equipment
 └─ Combat
```

최소 애니메이션:

- Idle
- Walk
- Run
- Attack
- Skill
- Hit
- Dodge
- Death

GLB가 없으면 임시 placeholder 3D 캐릭터를 사용한다.

중요:

GLB 모델 파일이 없다고 작업을 중단하지 않는다.

나중에 실제 GLB를 쉽게 교체할 수 있는 구조로 만든다.

---

# 8. 카메라

Diablo 스타일의 3D 카메라를 구현한다.

기본:

- 3/4 top-down
- 플레이어 추적
- 약간의 줌
- 부드러운 이동
- 화면 경계 제한

카메라가 플레이어를 정확히 따라가되
너무 흔들리지 않게 한다.

옵션:

- 줌 인
- 줌 아웃
- 카메라 회전은 기본적으로 제한

모바일에서는 조작하기 쉽게 한다.

---

# 9. 전투

가장 중요하다.

전투는 느린 RPG가 아니라

"빠르게 움직이고 빠르게 죽이는"

핵앤슬래시 느낌으로 만든다.

기본:

- 기본 공격
- 광역 공격
- 단일 공격
- 이동기
- 회피
- 스킬 쿨타임
- 자원 시스템
- 치명타
- 상태 이상
- 피격 효과

---

# 10. 스킬 시스템

하드코딩하지 않는다.

데이터 기반으로 만든다.

예:

```js
{
  id: "fire_wave",
  type: "aoe",
  damage: 120,
  radius: 4,
  cooldown: 5,
  resource: 20
}
```

스킬 추가가 코드 수정 없이 가능하도록 설계한다.

최소 스킬:

### Fire Slash

근접 부채꼴 공격

### Shadow Dash

짧은 순간이동 + 피해

### Meteor

범위 공격

### Whirlwind

주변 광역 공격

### Chain Lightning

적 사이를 튕기는 공격

### Blood Nova

플레이어 주변 광역 공격

---

# 11. 스킬 빌드

게임의 핵심 재미로 만든다.

같은 스킬도 옵션에 따라 완전히 다르게 작동하게 한다.

예:

Meteor

```text
기본
↓
화염 Meteor
↓
2개 낙하
↓
폭발 범위 증가
↓
운석 파편 생성
```

또는

Whirlwind

```text
기본
↓
이동속도 증가
↓
출혈
↓
회전 범위 증가
↓
추가 회오리
```

플레이어가 자신만의 빌드를 만들 수 있어야 한다.

---

# 12. 몬스터

몬스터 종류를 다양하게 만든다.

최소:

- 근접형
- 원거리형
- 돌진형
- 폭발형
- 소환형
- 방어형
- 비행형
- 대형 몬스터
- 엘리트
- 보스

몬스터마다 AI를 다르게 한다.

단순히 플레이어를 따라오는 AI만 만들지 않는다.

---

# 13. 몬스터 군집

핵앤슬래시답게 여러 마리가 동시에 등장한다.

예:

```text
        👹
   👹 👹 👹
 👹 👹 🧙 👹
   👹 👹 👹
```

하지만 몬스터 수가 증가해도 프레임이 급격히 떨어지지 않도록 한다.

반드시:

- Object Pool
- InstancedMesh
- AI Tick 분산
- 거리 기반 AI 업데이트
- Frustum Culling

을 고려한다.

---

# 14. 엘리트 몬스터

일반 몬스터와 다른 효과를 가진다.

예:

```text
화염
빙결
독
번개
흡혈
보호막
분신
광폭화
```

엘리트는 랜덤 Modifier를 가진다.

예:

```text
Elite
+ Fire
+ Fast
+ Explosive
```

즉,

매번 다른 몬스터를 상대하는 느낌을 준다.

---

# 15. 보스

보스는 단순히 HP가 높은 몬스터가 아니다.

패턴을 만든다.

예:

Phase 1

- 근접 공격

Phase 2

- 광역 공격

Phase 3

- 소환

Phase 4

- 광폭화

보스 HP:

```text
████████████████
```

패턴이 보이도록 Telegraph 효과를 넣는다.

공격 직전에 바닥에 위험 영역을 표시한다.

---

# 16. 랜덤 이벤트

필드에서 갑자기 이벤트가 발생하도록 한다.

예:

### 악마 침공

갑자기 몬스터 웨이브 발생.

### 저주받은 상자

상자를 열면 몬스터가 등장하지만
처치하면 보상이 증가.

### 방랑 상인

필드에서 랜덤 등장.

### 영혼 제단

제단을 활성화하면 강력한 몬스터 등장.

### 보물 고블린

플레이어가 발견하면 도망간다.

### 월드 이벤트

넓은 지역에 거대한 보스 출현.

---

# 17. 보물 고블린 시스템

매우 낮은 확률로 등장한다.

특징:

- 플레이어를 공격하지 않음
- 도망감
- 이동속도 빠름
- 일정 시간 후 사라짐
- 처치하면 많은 골드/장비 드랍

플레이어가 발견했을 때
즉시 쫓아가고 싶도록 만든다.

---

# 18. 전리품

게임의 핵심이다.

몬스터 처치 시 랜덤 Loot.

등급:

```text
Common
Magic
Rare
Epic
Legendary
Mythic
```

색상은 등급을 명확하게 구분한다.

하지만 UI는 과도하게 화려하게 만들지 않는다.

---

# 19. 전설 장비

전설 아이템은 단순 스탯 증가가 아니라
게임 플레이를 바꾸는 효과를 가진다.

예:

```text
Flame Crown

Meteor 사용 시
추가 운석 2개 생성
```

```text
Blood Axe

적 처치 시
다음 공격 피해 +20%
```

```text
Shadow Boots

Dodge 사용 후
3초 동안 이동속도 +40%
```

---

# 20. 장비 슬롯

최소:

```text
Weapon
Helmet
Armor
Gloves
Boots
Ring
Amulet
```

장비마다:

- 공격력
- 방어력
- 체력
- 치명타
- 이동속도
- 스킬 강화
- 원소 피해

등을 가진다.

---

# 21. 장비 비교

아이템 획득 시

현재 장비와 비교해서

```text
공격력 +12
체력 -5
치명타 +3%
```

처럼 보여준다.

---

# 22. 자동 Loot 시스템

많은 아이템을 줍는 게임은 피로해지기 쉽다.

따라서:

- 자동 골드 획득
- 가까운 아이템 자동 흡수 옵션
- Loot Filter
- 등급별 표시 옵션

을 준비한다.

특히 Loot Filter는 나중에 확장 가능하게 만든다.

---

# 23. 제작 시스템

필드에서 재료를 얻는다.

예:

```text
Iron
Crystal
Demon Core
Blood Fragment
Ancient Bone
```

이를 이용해서:

- 장비 강화
- 옵션 재설정
- 전설 제작
- 회복 아이템

등을 만들 수 있게 한다.

---

# 24. 강화 시스템

장비를 강화한다.

```text
+0
+1
+2
+3
...
+10
```

강화할수록 비용 증가.

단순 강화 외에도

```text
Reroll
Upgrade
Enchant
Extract
```

같은 시스템을 확장할 수 있도록 만든다.

---

# 25. 지역 시스템

맵을 여러 지역으로 나눈다.

예:

```text
Ash Forest
Dead Marsh
Ruined City
Blood Canyon
Frozen Valley
Demon Rift
```

지역마다:

- 몬스터
- 환경
- 음악
- 이벤트
- 보스
- 드랍 테이블

을 다르게 한다.

---

# 26. 환경 연출

3D 품질을 크게 향상시킨다.

추가:

- 안개
- 먼지
- 불
- 연기
- 비
- 눈
- 파티클
- 빛
- 그림자
- 환경 사운드

단,

WebGL 성능을 고려한다.

---

# 27. 시간 변화

가능하면 간단한 Day/Night 시스템을 만든다.

```text
Day
↓
Evening
↓
Night
```

시간에 따라:

- 조명
- 하늘
- 안개
- 몬스터
- 이벤트

가 일부 변경된다.

---

# 28. 필드 상호작용

플레이어가 단순히 걷기만 하지 않도록 한다.

상호작용:

- 상자
- 제단
- NPC
- 문
- 레버
- 광물
- 나무
- 포탈
- 오브젝트

---

# 29. 순간이동

필드가 넓어졌으므로

Waypoint 시스템을 추가한다.

발견한 Waypoint로 빠르게 이동한다.

---

# 30. 성장 시스템

플레이어:

```text
Level
XP
HP
Mana / Energy
Attack
Defense
Critical
Move Speed
```

레벨업 시:

- 스탯 증가
- 스킬 포인트
- 새로운 스킬
- 장비 사용 가능 레벨

등을 제공한다.

---

# 31. 패시브 시스템

스킬 외에 패시브도 만든다.

예:

```text
+10% Fire Damage
+5% Critical
+15% Movement Speed
+20% Health
```

---

# 32. 시즌 시스템

장기적으로 업데이트하기 쉽게 만든다.

시즌마다 새로운:

- 몬스터
- 이벤트
- 아이템
- 보스
- 보상
- 특별 Modifier

를 추가할 수 있게 데이터 구조를 설계한다.

예:

```js
seasonConfig = {
  id: "season_01",
  modifiers: [],
  events: [],
  rewards: []
}
```

---

# 33. 반복 플레이 구조

게임의 기본 Loop:

```text
탐험
 ↓
전투
 ↓
Loot
 ↓
장비 교체
 ↓
캐릭터 강화
 ↓
더 강한 지역
 ↓
엘리트
 ↓
보스
 ↓
더 좋은 Loot
 ↓
빌드 강화
 ↓
다시 탐험
```

이 구조가 자연스럽게 반복되도록 한다.

---

# 34. 엔드게임

최종적으로 다음을 추가할 수 있는 구조로 만든다.

### Rift

랜덤 지역 + 제한 시간

### Boss Hunt

특정 보스 집중 사냥

### Horde

몬스터 웨이브

### Elite Zone

강력한 엘리트 집중 지역

### World Event

필드 전체 이벤트

### Challenge

특수 조건으로 전투

---

# 35. 화면 UI

UI는 최신 액션 RPG 스타일로 만든다.

과도하게 화면을 가리지 않는다.

필수:

```text
       HP
       ↓
┌───────────────┐
│               │
│     GAME      │
│               │
└───────────────┘

HP        Skills
████      [1][2][3][4]
Mana      [Dodge]
```

PC:

- 마우스
- 키보드

모바일:

- 가상 조이스틱
- 스킬 버튼

둘 다 지원한다.

---

# 36. 모바일 UX

모바일에서 버튼이 작으면 안 된다.

최소:

- 이동 조이스틱
- 기본 공격
- 스킬 4개
- 회피
- 물약

을 엄지로 쉽게 누를 수 있게 한다.

---

# 37. 그래픽 방향

목표는

"현실적인 AAA 게임을 그대로 복제"

가 아니다.

WebGL에서 안정적으로 돌아가는

Stylized Dark Fantasy 3D

스타일을 목표로 한다.

특징:

- 어두운 판타지
- 강한 명암
- 선명한 실루엣
- 적당한 Bloom
- 고품질 파티클
- 화려한 스킬 효과
- 과도한 텍스처 사용 금지

---

# 38. 실제 GLB 지원

모델 로더를 별도 모듈로 만든다.

예:

```text
src/3d/
 ├─ renderer.js
 ├─ scene.js
 ├─ camera.js
 ├─ lighting.js
 ├─ model-loader.js
 ├─ animation.js
 ├─ particles.js
 └─ effects.js
```

GLB 모델은

```text
public/assets/models/
```

에서 로드할 수 있도록 한다.

모델이 없는 경우 placeholder를 사용한다.

---

# 39. 성능 최적화 — 매우 중요

토큰 절약만큼 실제 게임 성능도 중요하다.

반드시 고려:

- InstancedMesh
- Object Pool
- LOD
- Frustum Culling
- Texture Atlas
- Geometry 재사용
- Material 재사용
- GLB 공유
- 이벤트 기반 업데이트
- AI Tick 분산
- 거리 기반 업데이트
- 파티클 수 제한
- 불필요한 DOM 제거

특히 몬스터 100마리가 있다고 해서
100개의 무거운 렌더 객체를 각각 새로 생성하지 않는다.

가능하면

```js
reuse()
```

한다.

---

# 40. 토큰 절약 — Claude Code 최우선 규칙

이 프로젝트에서는 Claude Code 토큰 사용량을 최대한 줄인다.

## 절대 금지

전체 파일을 매번 다시 출력하지 않는다.

전체 프로젝트를 매번 다시 분석하지 않는다.

이미 확인한 파일을 반복해서 읽지 않는다.

불필요한 설명을 길게 작성하지 않는다.

같은 오류를 여러 번 분석하지 않는다.

---

## 작업 방식

### Step 1

프로젝트 구조 1회 분석.

### Step 2

핵심 파일만 확인.

### Step 3

작은 단위로 수정.

### Step 4

실행/빌드 확인.

### Step 5

오류가 있으면 해당 파일만 다시 확인.

### Step 6

정상 작동하면 다음 기능으로 이동.

---

## Claude Code 출력 규칙

각 작업 후 다음만 출력한다.

```text
DONE
- 변경 파일:
- 핵심 변경:
- 테스트:
- 다음 작업:
```

긴 설명 금지.

---

# 41. 코드 수정 규칙

기존 코드가 정상적으로 작동한다면
무조건 재작성하지 않는다.

먼저 재사용 가능성을 판단한다.

다음 우선순위:

```text
기존 코드 재사용
↓
작은 수정
↓
모듈 추가
↓
필요한 부분만 교체
↓
전체 교체는 최후의 수단
```

---

# 42. 파일 수정 전략

한 번에 모든 파일을 변경하지 않는다.

작업 단계를 다음처럼 나눈다.

```text
Phase 1
3D Renderer

Phase 2
3D World

Phase 3
Player

Phase 4
Combat

Phase 5
Monster

Phase 6
Loot

Phase 7
Events

Phase 8
Boss

Phase 9
UI

Phase 10
Optimization
```

각 Phase가 정상 작동한 후 다음 Phase로 넘어간다.

---

# 43. 기존 기능 보존

기존 saga-dungeon에서 이미 구현된 기능이 있다면
기능을 삭제하지 않는다.

특히:

- 저장
- 설정
- UI
- 캐릭터
- 아이템
- 전투
- 진행도

등을 먼저 파악한다.

기존 기능과 새 3D 기능이 충돌하면
기존 기능을 무조건 제거하지 말고 Adapter를 만든다.

---

# 44. 코드 품질

코드는 과도하게 복잡하게 만들지 않는다.

작은 프로젝트에서

```text
Factory
Manager
Service
Controller
Repository
Adapter
```

등을 무조건 수십 개 만들지 않는다.

실제 필요한 것만 만든다.

---

# 45. 데이터 중심 설계

몬스터:

```js
monsterData.js
```

아이템:

```js
itemData.js
```

스킬:

```js
skillData.js
```

지역:

```js
zoneData.js
```

이벤트:

```js
eventData.js
```

보스:

```js
bossData.js
```

처럼 확장 가능하게 한다.

---

# 46. 랜덤 시스템

모든 랜덤은 가능하면 Seed 기반으로 만든다.

예:

```js
Random(seed)
```

이를 통해

- 버그 재현
- 동일 맵 테스트
- 특정 이벤트 테스트

가 가능하도록 한다.

---

# 47. 저장 시스템

localStorage 또는 현재 프로젝트의 저장 방식을 유지한다.

저장:

```text
player
level
xp
stats
skills
equipment
inventory
worldSeed
unlockedAreas
waypoints
quests
settings
```

단,

렌더링 객체 자체를 저장하지 않는다.

---

# 48. 게임 시작 화면

현재 시작 화면을 확인하고
3D 게임에 맞게 개선한다.

예:

```text
SAGA DUNGEON

        START

      CHARACTER

        SETTINGS

```

배경에는 간단한 3D 장면을 보여준다.

---

# 49. 로딩

3D Asset이 많아질 것을 고려한다.

Loading UI:

```text
Loading World...

████████████░░░
```

필요한 Asset만 로드한다.

가능하면 Lazy Loading을 사용한다.

---

# 50. 사운드

현재 사운드 시스템이 있다면 유지한다.

추가 가능한 구조:

- 공격
- 피격
- 스킬
- 몬스터
- 보스
- Loot
- Legendary Drop
- 환경음
- UI

특히 Legendary 획득 시 강한 피드백을 준다.

---

# 51. 화면 효과

스킬 사용 시:

- Hit Flash
- Screen Shake
- Particles
- Trail
- Impact
- Damage Number

등을 사용한다.

하지만 Screen Shake는 과하지 않게 한다.

---

# 52. Damage Number

적에게 피해를 입히면 숫자를 표시한다.

예:

```text
120
CRIT!
450
```

다량의 숫자가 발생해도 DOM을 무한 생성하지 않는다.

Object Pool을 사용한다.

---

# 53. 전투 피드백

타격감이 중요하다.

공격:

```text
Attack
↓
Hit
↓
Flash
↓
Particle
↓
Sound
↓
Damage
```

순으로 즉각적인 피드백을 준다.

---

# 54. 난이도

초기에는 너무 어렵게 만들지 않는다.

난이도:

```text
Normal
Hard
Nightmare
Torment
```

형태로 확장 가능하게 한다.

---

# 55. 월드 보스

필드에 랜덤하게 등장할 수 있도록 한다.

월드 보스 출현:

```text
⚠ WORLD EVENT

A powerful demon has appeared!
```

플레이어가 해당 지역으로 이동해서 전투한다.

---

# 56. 퀘스트

최소:

- Kill Quest
- Explore Quest
- Boss Quest
- Collect Quest

정도로 시작한다.

퀘스트 데이터는 JSON/JS 데이터로 관리한다.

---

# 57. NPC

필수 NPC:

- 상인
- 대장장이
- 창고
- 퀘스트 NPC

처음부터 복잡한 대화 시스템을 만들지 않는다.

---

# 58. 인벤토리

Grid 기반.

```text
[ ][ ][ ][ ][ ]
[ ][ ][ ][ ][ ]
[ ][ ][ ][ ][ ]
```

아이템 클릭:

- 장착
- 판매
- 분해
- 버리기

---

# 59. 장비 자동 비교

새 장비 획득 시

현재 장비보다 좋은지 계산한다.

```js
getItemScore(item)
```

점수만 단순히 공격력 하나로 계산하지 말고
현재 빌드와 관련된 옵션을 고려할 수 있도록 확장 가능하게 한다.

---

# 60. 가장 중요한 게임 디자인

게임을

"3D로 보이게 만드는 프로젝트"

로 끝내지 않는다.

플레이어가

```text
한 번만 플레이
```

하고 끝나는 것이 아니라

```text
한 번 더
↓
조금 더 좋은 장비
↓
새로운 스킬 빌드
↓
더 강한 보스
↓
새로운 지역
```

을 반복하도록 만든다.

---

# 61. 개발 우선순위

반드시 다음 순서로 개발한다.

```text
1. 현재 코드 분석
2. Three.js 3D Renderer
3. 3D Camera
4. 3D World
5. Player
6. Movement
7. Monster
8. Combat
9. Skills
10. Loot
11. Inventory
12. Equipment
13. Random Events
14. Elite
15. Boss
16. World Event
17. Quest
18. NPC
19. Crafting
20. Progression
21. UI 개선
22. Mobile
23. Performance
24. Polish
```

---

# 62. 절대 하지 말 것

- 현재 프로젝트를 통째로 삭제
- 기존 기능을 확인하지 않고 재작성
- 모든 파일을 한 번에 변경
- 필요 없는 라이브러리 추가
- 무거운 3D 모델을 무분별하게 사용
- 몬스터마다 무거운 geometry 생성
- 매 프레임 DOM 조작
- 매 프레임 새로운 객체 생성
- 필요 없는 서버 구축
- 필요 없는 로그인 시스템
- 필요 없는 백엔드 구축
- 완성되지 않은 기능을 먼저 여러 개 생성

---

# 63. 현재 단계에서 가장 먼저 구현할 것

첫 작업에서는 아래까지만 구현한다.

```text
현재 게임 실행
↓
Three.js Renderer 추가
↓
3D Scene
↓
3D Ground
↓
Lighting
↓
3D Camera
↓
3D Player Placeholder
↓
Player 이동
↓
기존 게임과 충돌 여부 확인
```

여기까지 정상 작동하면 멈춘다.

다음 단계에서:

```text
Monster
↓
Combat
↓
Skill
```

을 추가한다.

---

# 64. 성공 기준

최종 결과는 다음과 같아야 한다.

### 그래픽

현재 2D 느낌이 거의 없어지고
3D 액션 RPG처럼 보여야 한다.

### 플레이

플레이어가 넓은 필드를 자유롭게 이동한다.

### 전투

몬스터 여러 마리를 빠르게 공격한다.

### 성장

Loot → Equipment → Skill → Build의 연결이 된다.

### 반복성

랜덤 이벤트와 랜덤 Loot 때문에
반복 플레이할 이유가 생긴다.

### 성능

모바일/저사양 환경에서도
가능한 안정적으로 동작한다.

---

# 65. Claude Code 작업 방식

이 프롬프트를 읽은 후 바로 전체 프로젝트를 갈아엎지 말 것.

먼저 현재 프로젝트를 분석한다.

그리고 다음 형식으로 짧게 보고한다.

```text
PROJECT ANALYSIS

Renderer:
Game Structure:
Main Entry:
Player:
Monster:
Combat:
UI:
Storage:
Reusable Code:
3D Migration Risk:

NEXT:
Phase 1 - 3D Renderer
```

그 다음 Phase 1만 구현한다.

각 단계마다 실행/빌드 테스트를 한다.

오류 발생 시 전체 프로젝트를 다시 읽지 말고
오류가 발생한 파일과 관련 모듈만 확인한다.

---

# 66. 최종 목표

`saga-dungeon`을 단순한 "디아블로 모방 게임"이 아니라

**SAGA DUNGEON — 3D DARK FANTASY ACTION RPG**

형태로 발전시킨다.

핵심 경험:

```text
EXPLORE
   ↓
FIGHT
   ↓
LOOT
   ↓
BUILD
   ↓
UPGRADE
   ↓
BOSS
   ↓
BETTER LOOT
   ↓
NEW BUILD
   ↓
NEW AREA
   ↓
REPEAT
```

디아블로의 핵앤슬래시 재미를 참고하되
원본의 캐릭터/세계관/아이템 이름/아트/맵을 그대로 복제하지 않는다.

독자적인 SAGA 세계관과 몬스터/아이템/스킬 디자인을 사용한다.

최우선 목표는:

**3D 품질 + 타격감 + 랜덤성 + 빌드 다양성 + 반복 플레이 + 성능 + 낮은 Claude Code 토큰 사용량**

이다.