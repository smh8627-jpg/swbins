# saga-dungeon Unity 6 전면 리빌드 작업 지시서

## 0. 최우선 원칙

이 프로젝트는 기존 `saga-dungeon` 웹 게임을 참고하여 **Unity 6 기반 3D 액션 RPG로 전면 재구축**한다.

기존 HTML/JavaScript 구현을 Unity 코드로 단순 변환하지 않는다.

기존 게임의 핵심 재미와 컨셉은 참고하되,

- 게임 구조
- 렌더링
- 캐릭터
- 전투
- 맵
- UI
- 카메라
- 입력
- 데이터 관리
- 저장
- 최적화

를 Unity 방식으로 새롭게 설계한다.

---

# 1. 가장 중요한 목표

다음 우선순위로 개발한다.

1. 플레이 가능한 게임
2. 3D 그래픽 품질
3. 액션 RPG 전투 재미
4. 다양한 필드와 지형
5. 몬스터/엘리트/보스
6. 장비와 성장
7. 모바일 조작
8. 세로/가로 화면 대응
9. 성능 최적화
10. 확장 가능한 코드 구조

절대로 처음부터 모든 기능을 한꺼번에 구현하지 않는다.

**작동하는 핵심 게임 루프를 먼저 완성한 후 확장한다.**

---

# 2. TOKEN 절약 규칙 — 매우 중요

Claude Code의 토큰 사용량을 최소화한다.

## 절대 금지

- 프로젝트 전체 파일을 무조건 읽지 않는다.
- 관련 없는 파일을 열지 않는다.
- 동일한 파일을 반복해서 읽지 않는다.
- 이미 확인한 코드를 다시 출력하지 않는다.
- 긴 코드를 설명하지 않는다.
- 작업 완료 후 전체 파일 내용을 출력하지 않는다.
- 같은 문제를 여러 방식으로 반복 분석하지 않는다.
- 불필요한 라이브러리를 추가하지 않는다.
- 불필요한 패키지를 설치하지 않는다.

## 작업 전 반드시 수행

먼저 프로젝트 구조를 확인한다.

그 다음 현재 작업과 직접 관련된 파일만 읽는다.

예:

```text
Assets/Scripts/Combat/
Assets/Scripts/Player/
Assets/Scripts/Enemy/
```

전투 작업이면 전투 관련 파일만 조사한다.

## 수정 원칙

가능하면 최소 파일 수정으로 해결한다.

파일을 수정하기 전에:

1. 해당 파일 존재 여부 확인
2. 관련 코드 위치 확인
3. 필요한 부분만 수정
4. 컴파일 오류 확인
5. 필요한 경우에만 추가 파일 수정

## 출력 제한

작업 결과는 다음 형식으로 짧게 보고한다.

```text
완료
- 변경 파일:
- 핵심 변경:
- 테스트:
- 남은 문제:
```

전체 코드 출력 금지.

---

# 3. 기존 게임 조사

먼저 다음 URL을 참고하여 기존 게임의 구조와 게임플레이를 파악한다.

https://smh8627-jpg.github.io/swbins/saga-dungeon/

확인할 내용:

- 현재 게임 진행 방식
- 플레이어 구조
- 전투 방식
- 몬스터
- 맵
- UI
- 성장 시스템
- 스킬
- 장비
- 보상
- 게임 루프
- 현재 부족한 부분

단, 기존 웹 구현의 코드를 Unity로 그대로 옮기지 않는다.

기존 게임은 **기획 참고자료**로 사용한다.

---

# 4. Unity 버전

Unity 6 계열을 사용한다.

가능하면 최신 안정적인 Unity 6 LTS 환경을 기준으로 작성한다.

주요 기술:

- Unity 6
- C#
- Universal Render Pipeline(URP)
- Input System
- Cinemachine
- TextMeshPro
- ScriptableObject
- Addressables는 필요할 때만 사용

불필요한 패키지는 설치하지 않는다.

---

# 5. 게임 장르

## 핵심 장르

3D 액션 RPG / 핵앤슬래시

게임 감각은 다음 계열을 참고한다.

- Diablo
- Path of Exile
- Torchlight
- Lost Ark
- 모바일 핵앤슬래시 RPG

단순 모방이 아니라 **모바일에서 짧게 플레이해도 재미있는 액션 RPG**를 목표로 한다.

---

# 6. 기존 게임의 가장 큰 문제 개선

현재 게임에서 가장 먼저 개선해야 하는 부분은 다음이다.

## 그래픽

기존의 단순한 도형/저품질 그래픽을 제거한다.

가능하면 실제 3D 에셋을 사용한다.

필요한 에셋:

- 플레이어
- 무기
- 몬스터
- 보스
- 나무
- 바위
- 풀
- 건물
- 폐허
- 상자
- 제단
- 포탈
- 이펙트
- 환경 오브젝트

단순 Cube/Sphere를 최종 그래픽으로 사용하지 않는다.

프로토타입 단계에서는 Primitive 사용 가능하지만 최종 단계에서는 교체한다.

---

# 7. 필드 디자인

기존의 단순한 작은 전투 공간을 제거한다.

플레이어가 이동하면서 탐험할 수 있는 넓은 3D 필드를 만든다.

필드 구성 예:

- 숲
- 폐허
- 초원
- 동굴
- 협곡
- 마을
- 늪
- 고대 신전
- 화산 지역

한 필드 안에도 다양한 지형을 배치한다.

예:

```text
숲
 ├─ 평지
 ├─ 바위 지대
 ├─ 강
 ├─ 작은 폭포
 ├─ 폐허
 ├─ 동굴 입구
 ├─ 몬스터 지역
 ├─ 보물 지역
 └─ 보스 지역
```

단순히 평평한 Plane 하나를 크게 만드는 방식은 사용하지 않는다.

---

# 8. 랜덤 필드 시스템

게임의 핵심 특징으로 **랜덤 필드**를 구축한다.

매번 동일한 맵이 아니라 일정한 규칙에 따라 필드가 달라진다.

예:

```text
Biome
↓
Terrain
↓
Environment
↓
Enemy Spawn
↓
Elite Spawn
↓
Event
↓
Treasure
↓
Boss
```

랜덤 생성 요소:

- 몬스터 위치
- 몬스터 종류
- 엘리트
- 보물상자
- 이벤트
- 자원
- NPC
- 포탈
- 랜덤 지형 오브젝트

단, 완전 무작위로 만들어 플레이가 불가능해지는 구조는 금지한다.

**고정된 레벨 디자인 + 랜덤 요소를 조합한다.**

---

# 9. 플레이어

플레이어는 3D 캐릭터 기반으로 구현한다.

필수 기능:

- 이동
- 달리기
- 기본 공격
- 회피
- 스킬
- 피격
- 사망
- 부활
- 타겟팅
- 자동 공격 옵션
- 애니메이션

플레이어 상태:

```text
HP
MP 또는 Energy
Attack
Defense
Critical
MoveSpeed
AttackSpeed
Level
EXP
Gold
```

---

# 10. 전투 시스템

전투가 게임의 가장 중요한 시스템이다.

기본 구조:

```text
탐험
↓
몬스터 발견
↓
전투
↓
처치
↓
EXP / Gold / Item
↓
더 강한 적
↓
Elite
↓
Boss
```

전투는 단순히 적에게 가까이 가면 숫자만 감소하는 방식으로 만들지 않는다.

다음 요소를 추가한다.

- 공격 범위
- 공격 방향
- 스킬 범위
- 회피
- 이동
- 적의 공격 모션
- 적의 공격 예고
- 경직
- 넉백
- 치명타
- 상태 이상

---

# 11. 몬스터 시스템

몬스터는 최소 다음 구조를 지원한다.

```text
Normal
Elite
Mini Boss
Boss
```

몬스터마다:

- HP
- Attack
- Defense
- MoveSpeed
- AttackRange
- DetectionRange
- AttackPattern
- Skill
- DropTable

을 가진다.

ScriptableObject 기반 데이터 구조를 사용한다.

---

# 12. 보스

보스는 단순히 HP가 높은 몬스터가 아니다.

최소 2~3개의 공격 패턴을 가진다.

예:

```text
Phase 1
근접 공격
원거리 공격

Phase 2
광역 공격
소환

Phase 3
강화 상태
특수 패턴
```

보스전에서는 바닥 공격 범위 표시 등으로 모바일에서도 패턴을 쉽게 이해할 수 있도록 한다.

---

# 13. 장비 시스템

핵심 장비:

- 무기
- 투구
- 갑옷
- 장갑
- 신발
- 장신구

등을 고려한다.

등급:

```text
Common
Uncommon
Rare
Epic
Legendary
```

장비는 ScriptableObject 기반으로 관리한다.

랜덤 옵션도 지원할 수 있도록 설계한다.

예:

```text
Attack +15
Critical +3%
HP +100
Skill Damage +5%
```

---

# 14. 스킬 시스템

스킬은 하드코딩하지 않는다.

ScriptableObject 기반으로 만든다.

예:

```text
BasicAttack
Dash
Whirlwind
FireBall
Meteor
ShockWave
Summon
```

향후 스킬 추가가 쉬워야 한다.

새 스킬 하나를 추가할 때 기존 전투 코드를 수정할 필요가 최소화되어야 한다.

---

# 15. 카메라

3D 액션 RPG 카메라를 사용한다.

기본:

- 3/4 Top-down
- 플레이어 추적
- 부드러운 이동
- 전투 시 자연스러운 카메라
- 줌
- 모바일 터치 대응

카메라는 Cinemachine 기반으로 구현한다.

---

# 16. 모바일 조작

모바일을 최우선 플랫폼으로 고려한다.

지원:

- 가상 조이스틱
- 이동 조이스틱
- 공격 버튼
- 스킬 버튼
- 회피 버튼
- 자동전투 버튼
- 타겟 버튼
- 상호작용 버튼

화면을 가리지 않도록 UI를 설계한다.

---

# 17. 세로 / 가로 모드

반드시 둘 다 지원한다.

Portrait:

```text
세로
```

Landscape:

```text
가로
```

화면 방향이 변경되어도:

- 플레이어
- 카메라
- 조작
- UI
- 스킬 버튼
- 체력바
- 미니맵

이 깨지지 않아야 한다.

UI는 고정 좌표가 아니라 Canvas Anchor 기반으로 설계한다.

---

# 18. UI

현대적인 모바일 RPG 스타일로 제작한다.

필수 UI:

- HP
- MP/Energy
- EXP
- 레벨
- 골드
- 스킬 버튼
- 미니맵
- 퀘스트
- 인벤토리
- 장비
- 캐릭터 정보
- 설정
- 보상
- 사망 화면

단순한 기본 Unity 버튼 느낌을 피한다.

---

# 19. 미니맵

필드 탐험에 미니맵을 추가한다.

표시:

- 플레이어
- 몬스터
- 엘리트
- 보스
- NPC
- 이벤트
- 포탈

---

# 20. 환경 연출

맵이 비어 보이지 않도록 한다.

환경 오브젝트를 적극적으로 배치한다.

예:

- 나무
- 풀
- 꽃
- 바위
- 통나무
- 버섯
- 횃불
- 폐허
- 건물
- 상자
- 기둥
- 제단
- 다리
- 폭포
- 물
- 안개
- 파티클

하지만 무작정 많이 배치하지 않는다.

성능을 고려하여:

- GPU Instancing
- LOD
- Occlusion
- Object Pooling
- 적절한 Draw Call 관리

를 사용한다.

---

# 21. 그래픽 방향

목표:

**모바일에서도 고품질로 보이는 Stylized 3D RPG**

지나치게 현실적인 그래픽보다 모바일에서 선명하고 아름답게 보이는 스타일을 우선한다.

필수:

- 좋은 Lighting
- Ambient Light
- Shadow
- VFX
- Particle
- Post Processing
- Environment
- Animation

단순한 Unity 기본 머티리얼 느낌을 최대한 제거한다.

---

# 22. 에셋 전략

Claude Code가 임의로 존재하지 않는 에셋 URL을 만들어내지 않는다.

실제 에셋이 필요한 경우:

1. 무료 에셋 우선
2. 라이선스 확인
3. 프로젝트에 직접 추가
4. 에셋 경로 기록

에셋이 아직 없으면 Placeholder를 사용하되,

```text
PLACEHOLDER
```

라고 명확하게 표시한다.

---

# 23. 데이터 구조

가능한 데이터는 ScriptableObject로 분리한다.

예:

```text
PlayerData
EnemyData
BossData
SkillData
ItemData
EquipmentData
DropTable
MapData
QuestData
```

게임 로직과 데이터를 분리한다.

---

# 24. 코드 구조

예시:

```text
Assets/
 ├─ Scripts/
 │   ├─ Core/
 │   ├─ Player/
 │   ├─ Combat/
 │   ├─ Enemy/
 │   ├─ Boss/
 │   ├─ Skills/
 │   ├─ Items/
 │   ├─ Equipment/
 │   ├─ World/
 │   ├─ UI/
 │   ├─ Camera/
 │   ├─ Input/
 │   ├─ Save/
 │   └─ Optimization/
 │
 ├─ Art/
 ├─ Audio/
 ├─ Prefabs/
 ├─ Scenes/
 ├─ ScriptableObjects/
 └─ Resources/
```

실제 구조는 프로젝트 상태를 확인한 후 가장 적절하게 조정한다.

---

# 25. 성능

모바일 성능을 매우 중요하게 생각한다.

목표:

```text
Low-end mobile
30 FPS 이상

Mid/High-end mobile
60 FPS 목표
```

특히 다음을 관리한다.

- GC Allocation
- Instantiate/Destroy
- Particle
- Animator
- Draw Call
- Texture
- Mesh
- Shadow
- Lighting
- Physics
- AI

몬스터는 Object Pooling을 사용한다.

---

# 26. 저장 시스템

최소:

- 플레이어 레벨
- EXP
- Gold
- Inventory
- Equipment
- Settings
- Progress

저장을 지원한다.

초기에는 로컬 저장으로 구현한다.

온라인 서버는 나중에 확장할 수 있도록 데이터 구조를 분리한다.

---

# 27. 개발 단계

절대로 처음부터 모든 기능을 구현하지 않는다.

## Phase 1 — Prototype

먼저 다음만 만든다.

```text
3D 필드
+
플레이어
+
카메라
+
이동
+
몬스터
+
기본 공격
+
HP
+
사망
+
EXP
```

여기까지 실제 플레이 가능해야 한다.

---

## Phase 2 — Combat

추가:

```text
스킬
회피
엘리트
보스
데미지
피격
VFX
```

---

## Phase 3 — RPG

추가:

```text
레벨
장비
인벤토리
골드
드랍
스탯
```

---

## Phase 4 — World

추가:

```text
넓은 필드
다양한 지형
랜덤 이벤트
NPC
보물
포탈
미니맵
```

---

## Phase 5 — Mobile

추가:

```text
Touch
Joystick
Skill UI
Portrait
Landscape
Responsive UI
```

---

## Phase 6 — Polish

마지막으로:

```text
Lighting
VFX
Animation
Sound
Environment
Optimization
Loading
Save
```

을 개선한다.

---

# 28. 테스트 원칙

각 Phase가 끝날 때 반드시 Unity Console을 확인한다.

다음 오류가 없어야 한다.

```text
Compile Error
Missing Reference
NullReferenceException
Missing Script
Broken Prefab
```

수정 후 다시 확인한다.

---

# 29. 절대 하지 말아야 할 것

- 모든 기능을 한 번에 구현
- 임시 코드 남발
- 하나의 거대한 GameManager 작성
- 모든 데이터를 하드코딩
- 씬에 모든 로직 작성
- Update에 무거운 로직을 무조건 넣기
- Instantiate/Destroy 반복
- 모바일 성능 무시
- 존재하지 않는 에셋 사용
- 존재하지 않는 API 사용
- 컴파일 오류를 무시하고 다음 단계 진행
- 테스트하지 않고 다음 기능 추가

---

# 30. 최종 목표

최종적으로 다음과 같은 게임을 목표로 한다.

```text
3D Action RPG
        ↓
넓은 랜덤 필드
        ↓
탐험
        ↓
몬스터 전투
        ↓
Elite
        ↓
랜덤 이벤트
        ↓
장비 획득
        ↓
성장
        ↓
Boss
        ↓
새로운 지역
```

기존 saga-dungeon보다 훨씬 높은 시각적 품질과 플레이 재미를 목표로 한다.

---

# 31. Claude Code 첫 작업

지금 즉시 모든 기능을 만들지 않는다.

먼저 다음만 수행한다.

### STEP 1

현재 작업 디렉터리를 확인한다.

### STEP 2

Unity 프로젝트가 존재하는지 확인한다.

### STEP 3

Unity 버전을 확인한다.

### STEP 4

현재 프로젝트 구조를 분석한다.

### STEP 5

기존 saga-dungeon의 게임플레이 요소를 정리한다.

### STEP 6

Unity 프로젝트 구조를 설계한다.

### STEP 7

필요한 패키지만 선정한다.

### STEP 8

Phase 1 개발 계획을 만든다.

### STEP 9

사용자에게 긴 설명을 하지 말고 계획을 짧게 보고한다.

그 후 Phase 1부터 구현한다.

---

# 32. 매우 중요한 개발 규칙

**한 번의 작업으로 너무 많은 파일을 만들지 않는다.**

각 기능을 작은 단위로 구현한다.

예:

```text
작업 1
Player Movement

↓ 테스트

작업 2
Camera

↓ 테스트

작업 3
Enemy

↓ 테스트

작업 4
Combat

↓ 테스트
```

이 방식으로 진행한다.

---

# 33. 코드 품질

코드는 다음 원칙을 따른다.

- SOLID
- 단일 책임
- 낮은 결합도
- 명확한 네이밍
- 컴포넌트 기반 설계
- 데이터/로직 분리
- 이벤트 기반 구조
- 확장 가능한 인터페이스

단, **과도한 추상화는 금지한다.**

간단한 기능을 위해 복잡한 디자인 패턴을 만들지 않는다.

---

# 34. 중요한 판단 기준

기능을 추가할 때 항상 다음 질문을 한다.

```text
이 기능이 실제 게임 재미를 증가시키는가?
모바일에서 플레이하기 편한가?
성능에 문제가 없는가?
향후 확장 가능한가?
토큰을 불필요하게 소비하는 작업인가?
```

하나라도 불필요하면 구현을 단순화한다.

---

# 35. 작업 시작 명령

먼저 코드를 작성하지 말고 현재 프로젝트를 분석한다.

다음 순서로 진행한다.

```text
1. 프로젝트 구조 확인
2. Unity 버전 확인
3. 기존 코드 확인
4. 기존 게임 구조 확인
5. 필요한 패키지 확인
6. Phase 1 설계
7. 구현
8. 컴파일
9. 테스트
10. 결과 보고
```

**전체 프로젝트를 읽지 말고 필요한 파일만 읽어라.**

**토큰 절약을 항상 최우선으로 고려하라.**

**작동하지 않는 기능을 남겨두고 다음 단계로 넘어가지 마라.**