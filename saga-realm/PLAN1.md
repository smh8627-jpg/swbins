# saga-realm → Godot 4.x 3D 전환 작업지시서

## 0. 최우선 원칙

이 프로젝트의 최우선 목표는 다음 순서로 한다.

1. **토큰 사용량 최소화**
2. 기존 게임의 핵심 재미와 데이터 구조 보존
3. Godot 4.x 기반으로 전환
4. 2D/웹 기반 구조를 Godot 3D 구조로 재설계
5. 모바일 세로/가로 화면 대응
6. 실제 3D 에셋을 사용하는 고품질 RPG 형태로 개선
7. 기존 기능을 무작정 삭제하지 말고 최대한 이식

---

# 1. 원본 프로젝트

원본:

https://smh8627-jpg.github.io/swbins/saga-realm/

이 프로젝트를 먼저 분석한다.

단, 분석 과정에서 모든 파일을 전부 읽지 않는다.

## 토큰 절약 규칙

반드시 다음 순서로 분석한다.

### STEP 1

프로젝트 루트의 파일 구조만 확인한다.

### STEP 2

다음 파일만 우선 분석한다.

- package.json
- index.html
- 핵심 게임 진입 파일
- player 관련 파일
- battle 관련 파일
- map 관련 파일
- character 관련 파일
- data 관련 파일
- save 관련 파일

### STEP 3

중복 파일, CSS, 장식용 파일, 생성 파일은 필요할 때만 읽는다.

### STEP 4

파일을 읽기 전에 반드시

> "이 파일이 실제 Godot 전환에 필요한가?"

를 판단한다.

불필요한 전체 파일 읽기를 금지한다.

---

# 2. 절대 금지

다음 작업을 바로 하지 않는다.

- 기존 프로젝트 전체를 한 번에 읽기
- 모든 JS 파일 전체 분석
- 모든 CSS 분석
- 기존 코드를 그대로 Godot GDScript로 기계적 변환
- 의미 없는 리팩터링
- 사용하지 않는 시스템 제작
- 대형 프레임워크 추가
- 필요 이상의 패키지 설치
- 같은 파일을 반복해서 읽기
- 이미 확인한 코드를 다시 출력하기
- 긴 설명을 반복하기

Claude Code는 필요한 파일만 읽고 수정한다.

---

# 3. 목표 엔진

## Godot 4.x

기본 구조:

```text
Godot
 ├── Main
 ├── World
 ├── Player
 ├── Camera
 ├── Enemy
 ├── NPC
 ├── Combat
 ├── UI
 ├── Data
 ├── Save
 └── Audio
```

기존 웹 게임 구조를 그대로 유지하지 말고 Godot 구조에 맞게 재설계한다.

---

# 4. 최종 게임 방향

saga-realm은 단순한 3D 데모가 아니다.

목표:

**모바일 3D 판타지 RPG**

느낌:

- 현대적인 모바일 RPG
- 넓은 필드
- 캐릭터 중심
- 탐험
- 전투
- 성장
- 장비
- 퀘스트
- NPC
- 지역별 콘텐츠
- 다양한 지형
- 몬스터
- 보스
- 보물
- 랜덤 이벤트

---

# 5. 3D 전환

기존 2D/웹 기반 표현을 단순히 3D 큐브로 바꾸지 않는다.

Godot의 실제 3D 씬을 사용한다.

기본:

```text
Node3D
 ├── WorldEnvironment
 ├── DirectionalLight3D
 ├── Camera3D
 ├── World
 │    ├── Terrain
 │    ├── Props
 │    ├── NPC
 │    ├── Enemies
 │    └── InteractiveObjects
 ├── Player
 └── UI
```

---

# 6. 3D 에셋

가능하면 실제 게임용 3D 에셋을 사용한다.

우선순위:

1. GLB
2. glTF
3. 필요시 FBX

Godot에서는 GLB/glTF 2.0을 우선 사용한다.

3D 모델은 다음을 준비한다.

### 캐릭터

- 플레이어
- 전사
- 궁수
- 마법사
- 몬스터
- 보스
- NPC

### 환경

- 나무
- 바위
- 풀
- 꽃
- 집
- 성
- 다리
- 상자
- 횃불
- 캠프
- 폐허
- 성벽
- 기둥
- 장식물

### 자연환경

- 숲
- 초원
- 강
- 호수
- 절벽
- 언덕
- 동굴
- 길
- 마을

에셋이 없으면 처음부터 대형 에셋 제작 시스템을 만들지 말고 임시 GLB/기본 메시로 프로토타입을 완성한다.

---

# 7. 월드 디자인

기존 맵이 작다면 크게 확장한다.

단순한 평면 맵 금지.

다음 요소를 섞는다.

```text
초원
 ↓
숲
 ↓
강
 ↓
마을
 ↓
폐허
 ↓
산악지역
 ↓
던전 입구
```

플레이어가 이동할 때 주변 환경이 계속 바뀌어야 한다.

---

# 8. 지형지물 밀도

기존 프로젝트의 가장 중요한 개선점 중 하나는

**"맵에 아무것도 없는 문제"**

해결이다.

평평한 지형을 최소화한다.

예:

```text
나무
바위
풀
꽃
상자
횃불
집
NPC
몬스터
표지판
다리
강
언덕
절벽
폐허
```

오브젝트를 무작위로 과도하게 배치하지 말고 자연스럽게 그룹화한다.

---

# 9. 플레이어

Player는 CharacterBody3D 기반으로 구성한다.

필수:

- 이동
- 달리기
- 방향 전환
- 점프
- 공격
- 피격
- 사망
- 애니메이션
- HP
- MP 또는 스킬 게이지
- 경험치
- 레벨

모바일에서는 가상 조이스틱을 사용한다.

---

# 10. 카메라

기본 카메라는 모바일 RPG 스타일의 3인칭 카메라.

특징:

- 플레이어 추적
- 부드러운 회전
- 줌
- 장애물 대응
- 전투 시 적절한 거리 유지
- 모바일 터치 회전 지원

카메라가 벽이나 지형을 뚫지 않도록 한다.

---

# 11. 전투

기존 saga-realm의 전투 시스템을 분석해서 핵심 규칙은 유지한다.

단, 표현은 3D로 재설계한다.

필수:

```text
Target
 ↓
Attack
 ↓
Damage
 ↓
Hit Effect
 ↓
HP 감소
 ↓
Death
 ↓
Reward
```

추가:

- 일반 공격
- 스킬
- 치명타
- 피격 효과
- 데미지 숫자
- 적 HP Bar
- 보스 HP Bar
- 공격 애니메이션
- 스킬 이펙트

---

# 12. 전투 재미

단순히 적에게 가까이 가서 숫자만 감소하는 구조를 피한다.

최소한 다음을 구현한다.

### 일반 공격

연속 공격

### 스킬

쿨타임 기반

### 회피

짧은 이동/회피 기능

### 적 공격

적마다 공격 패턴을 다르게 한다.

예:

```text
Goblin
근접 공격

Archer
원거리 공격

Mage
범위 공격

Wolf
돌진

Boss
광역 공격 + 연속 공격
```

---

# 13. 적 AI

복잡한 AI를 처음부터 만들지 않는다.

상태 머신 기반으로 시작한다.

```text
IDLE
 ↓
PATROL
 ↓
DETECT
 ↓
CHASE
 ↓
ATTACK
 ↓
HIT
 ↓
DEAD
```

필요할 때만 상태를 추가한다.

---

# 14. NPC

NPC를 단순 장식으로 만들지 않는다.

NPC 종류:

- 상인
- 퀘스트 NPC
- 마을 주민
- 대장장이
- 길 안내
- 스토리 NPC

NPC와 상호작용하면 UI가 열린다.

---

# 15. 퀘스트

기본 퀘스트 시스템:

```text
Quest
 ├── ID
 ├── Title
 ├── Description
 ├── Target
 ├── Count
 ├── Current
 ├── Reward
 └── Completed
```

예:

```text
고블린 5마리 처치
↓
경험치
↓
골드
↓
아이템
```

---

# 16. 성장

최소 RPG 성장 시스템:

```text
Level
EXP
HP
Attack
Defense
Gold
Equipment
Skill
```

장비:

- 무기
- 갑옷
- 장신구

---

# 17. 아이템

초기에는 과도하게 복잡하게 만들지 않는다.

```text
Item
 ├── id
 ├── name
 ├── type
 ├── icon
 ├── stat
 └── rarity
```

등급:

```text
Common
Rare
Epic
Legendary
```

---

# 18. 월드 이벤트

맵을 단순 이동 공간으로 만들지 않는다.

랜덤 이벤트를 추가할 수 있도록 구조를 만든다.

예:

- 몬스터 습격
- 보물 발견
- NPC 구조
- 희귀 몬스터
- 미니 보스
- 보물 상자
- 랜덤 퀘스트

처음부터 모든 이벤트를 구현하지 말고 확장 가능한 구조만 만든다.

---

# 19. 모바일 대응

필수.

세로:

```text
9:16
```

가로:

```text
16:9
```

둘 다 지원한다.

UI는 화면 비율에 따라 자동 배치한다.

모바일 조작:

```text
왼쪽
Virtual Joystick

오른쪽
Attack
Skill 1
Skill 2
Dodge
```

---

# 20. UI

기존 웹 UI를 그대로 복사하지 않는다.

Godot Control 기반으로 재설계한다.

HUD:

```text
┌─────────────────────────┐
│ HP       LV 1       Gold│
│ ████████                │
│                         │
│                         │
│          WORLD          │
│                         │
│                         │
│ Quest                   │
│                         │
│ ○  ○  ○       ATTACK   │
└─────────────────────────┘
```

모바일에서 버튼이 너무 작지 않도록 한다.

---

# 21. 그래픽 방향

목표:

**저품질 테스트 프로젝트 느낌 제거**

다음 사항을 적용한다.

- PBR Material
- 환경광
- Directional Light
- 그림자
- Sky
- Fog
- Bloom은 필요할 때만
- 파티클
- 공격 이펙트
- 피격 이펙트
- 환경 오브젝트
- 애니메이션

단, 그래픽 효과를 무조건 많이 넣지 않는다.

모바일 성능을 우선한다.

---

# 22. 성능 최적화

모바일을 기준으로 설계한다.

중요:

- LOD
- Occlusion Culling
- 객체 재사용
- 오브젝트 풀링
- 텍스처 최적화
- 그림자 최소화
- 파티클 제한
- 불필요한 Physics 제거
- 원거리 오브젝트 단순화

Godot의 3D import 기능에서 LOD, shadow mesh 등의 최적화 옵션을 활용한다.

---

# 23. 에셋 최적화

가능하면 GLB를 기본 포맷으로 한다.

고해상도 텍스처를 무조건 사용하지 않는다.

예:

```text
Character
512~1024

Environment
512~1024

UI
필요에 따라 512~1024
```

모바일에서 충분한 수준으로 조정한다.

---

# 24. 씬 분리

하나의 거대한 씬을 만들지 않는다.

예:

```text
Main.tscn

World.tscn

Player.tscn

Enemy.tscn

NPC.tscn

Village.tscn

Forest.tscn

BattleArena.tscn

UI.tscn
```

필요하면 월드를 스트리밍/분할한다.

---

# 25. 데이터 구조

게임 데이터를 코드에 하드코딩하지 않는다.

가능하면 Resource 또는 JSON 기반으로 분리한다.

예:

```text
data/
 ├── characters/
 ├── enemies/
 ├── items/
 ├── quests/
 └── skills/
```

---

# 26. 저장 시스템

최소 저장:

```text
Player Level
EXP
Gold
Inventory
Equipment
Quest Progress
World Progress
```

Godot의 user:// 경로 기반 저장을 사용한다.

---

# 27. 프로젝트 구조

최종적으로 다음과 비슷한 구조를 목표로 한다.

```text
saga-realm-godot/
│
├── project.godot
│
├── scenes/
│   ├── main/
│   ├── world/
│   ├── player/
│   ├── enemy/
│   ├── npc/
│   └── ui/
│
├── scripts/
│   ├── player/
│   ├── combat/
│   ├── enemy/
│   ├── world/
│   ├── quest/
│   ├── inventory/
│   └── save/
│
├── assets/
│   ├── characters/
│   ├── environments/
│   ├── monsters/
│   ├── items/
│   ├── textures/
│   └── audio/
│
└── data/
    ├── items/
    ├── enemies/
    ├── quests/
    └── skills/
```

---

# 28. 기존 코드 이식 원칙

기존 JavaScript 코드를 무조건 한 줄씩 GDScript로 변환하지 않는다.

대신:

```text
기존 코드
↓
기능 분석
↓
핵심 데이터/규칙 추출
↓
Godot 구조 설계
↓
GDScript 재구현
```

예:

```text
JS Player
↓
Player 기능 분석
↓
CharacterBody3D
↓
player.gd
```

---

# 29. 작업 단계

## PHASE 1

기존 프로젝트 분석

목표:

- 핵심 게임 시스템 파악
- 데이터 구조 파악
- 화면 구조 파악
- 필요한 기능 목록 작성

코드를 수정하지 않는다.

---

## PHASE 2

Godot 프로젝트 생성

생성:

```text
project.godot
Main.tscn
Main.gd
```

Godot 프로젝트가 정상 실행되는지 먼저 확인한다.

---

## PHASE 3

3D 기본 월드

구현:

- WorldEnvironment
- DirectionalLight3D
- Camera3D
- Terrain
- Player

목표:

**3D 월드에서 캐릭터가 움직이는 것**

여기까지 먼저 완성한다.

---

## PHASE 4

플레이어

구현:

- 이동
- 회전
- 카메라
- 애니메이션
- 모바일 조작

---

## PHASE 5

전투

구현:

- 적
- 타겟
- 공격
- 데미지
- HP
- 사망
- 보상

---

## PHASE 6

월드 콘텐츠

추가:

- NPC
- 상자
- 아이템
- 마을
- 숲
- 지형지물
- 퀘스트

---

## PHASE 7

성장 시스템

추가:

- EXP
- Level
- Equipment
- Inventory
- Skill

---

## PHASE 8

모바일 UI

세로/가로 지원.

---

## PHASE 9

그래픽 업그레이드

기본 시스템이 정상 작동한 후 진행한다.

- GLB 에셋
- 애니메이션
- 환경
- 이펙트
- 조명
- 그림자
- 파티클

---

## PHASE 10

최적화

마지막으로:

- FPS
- 메모리
- 드로우콜
- 텍스처
- LOD
- 오브젝트 수
- Physics

를 점검한다.

---

# 30. Claude Code 토큰 절약 규칙

이 프로젝트에서는 토큰 절약을 최우선으로 한다.

## 반드시 지킬 것

### 1.

파일 전체를 읽기 전에 검색한다.

### 2.

필요한 코드 범위만 읽는다.

### 3.

이미 확인한 파일은 다시 읽지 않는다.

### 4.

수정할 파일만 수정한다.

### 5.

큰 파일을 새로 생성할 때 불필요한 주석을 넣지 않는다.

### 6.

긴 설명을 출력하지 않는다.

### 7.

작업 완료 후 다음 형식으로 짧게 보고한다.

```text
완료:
- 수정 파일:
- 구현 내용:
- 테스트:
- 다음 작업:
```

### 8.

한 번에 모든 기능을 구현하지 않는다.

### 9.

각 PHASE가 실행 가능한 상태인지 확인한다.

### 10.

에러가 발생하면 전체 프로젝트를 다시 분석하지 않는다.

에러 파일 → 관련 함수 → 원인 → 최소 수정 순서로 해결한다.

---

# 31. Claude Code 작업 방식

각 단계마다 다음 순서를 사용한다.

```text
ANALYZE
↓
PLAN
↓
IMPLEMENT
↓
TEST
↓
FIX
```

단, ANALYZE 단계에서도 필요한 파일만 읽는다.

---

# 32. 가장 중요한 개발 원칙

처음부터 "완성형 MMORPG"를 만들려고 하지 않는다.

먼저 다음 MVP를 완성한다.

```text
3D 월드
+
플레이어
+
카메라
+
몬스터
+
전투
+
HP
+
보상
+
모바일 조작
```

이것이 정상 작동하면:

```text
NPC
+
퀘스트
+
마을
+
장비
+
인벤토리
+
성장
```

을 추가한다.

---

# 33. 품질 기준

다음 상태를 "완료"로 인정하지 않는다.

- 큐브 캐릭터
- 평평한 맵
- 빈 월드
- UI만 많은 게임
- 버튼만 있는 전투
- 움직이지 않는 NPC
- 단순 숫자 감소 전투
- 3D처럼 보이지만 실제로는 2D 스프라이트만 사용하는 구조

최종적으로 실제 3D RPG처럼 보여야 한다.

---

# 34. 최종 목표

최종 결과는 다음과 같은 구조를 목표로 한다.

```text
SAGA REALM

        3D WORLD
             │
     ┌───────┴───────┐
     │               │
   VILLAGE          FIELD
     │               │
   NPC             MONSTER
     │               │
   QUEST           COMBAT
     │               │
     └───────┬───────┘
             │
          REWARD
             │
       LEVEL / ITEM
             │
          GROWTH
```

---

# 35. 첫 번째 Claude Code 실행 지시

지금 당장 전체 개발을 시작하지 말고 다음만 수행한다.

1. 현재 saga-realm 프로젝트 구조 확인
2. 핵심 진입점 확인
3. Player 관련 코드 위치 확인
4. Combat 관련 코드 위치 확인
5. World/Map 관련 코드 위치 확인
6. Data 관련 코드 위치 확인
7. Save 관련 코드 위치 확인
8. 현재 기능을 Godot으로 옮길 때 필요한 기능 목록 작성
9. 기존 코드 수정은 하지 않는다.
10. 분석 결과를 20줄 이내로 요약한다.

그 다음 단계에서만 Godot 프로젝트를 생성한다.

**중요: 한 번에 전체 프로젝트를 변환하지 말 것.**

Godot 3D MVP부터 단계적으로 구축한다.