# saga-realm 3D 전환 및 현대화 개발 프롬프트

## 0. 최우선 원칙

현재 프로젝트를 처음부터 다시 만들지 않는다.

현재 `saga-realm`의 기존 HTML/CSS/JS 구조와 게임 데이터를 최대한 재사용한다.

목표는 다음과 같다.

> 기존 2D 삼국지 전략 게임 → 3D 오픈월드형 삼국지 전략 RPG

핵심 우선순위:

1. 기존 기능 보존
2. 3D 전환
3. 넓은 월드맵
4. 실제 3D 캐릭터/건물/환경
5. 전략 + 액션 전투 결합
6. 반복 플레이가 가능한 랜덤 이벤트
7. 모바일/PC 모두 대응
8. 성능 최적화
9. 토큰 사용 최소화
10. 기존 코드를 최대한 활용

---

# 1. 작업 시작 전 반드시 해야 할 것

먼저 프로젝트 전체를 분석한다.

다음 파일을 먼저 확인한다.

- index.html
- 주요 JS
- 주요 CSS
- 데이터 파일
- 게임 상태 관리 코드
- 이벤트 처리 코드
- localStorage 사용 코드
- 캐릭터/무장 데이터
- 성/진영/외교 데이터

분석 후 새 파일을 만들기 전에 다음을 판단한다.

### 반드시 재사용할 것

- 기존 게임 데이터
- 무장 데이터
- 성 데이터
- 진영 데이터
- 외교 시스템
- 기록 시스템
- 학당 시스템
- 저장/불러오기
- 기존 UI 로직
- 기존 게임 상태

### 새로 만들 것

- 3D 렌더링 레이어
- 3D 월드
- 3D 카메라
- 3D 캐릭터
- 3D 건물
- 3D 지형
- 3D 전투
- 월드 이벤트
- 새로운 HUD

기존 기능을 복제해서 두 개의 시스템을 만드는 방식은 금지한다.

---

# 2. 기술 방향

가능하면 현재 프로젝트의 구조를 유지한다.

3D 렌더링은 브라우저에서 동작하는 기술을 우선한다.

권장:

- Three.js
- GLTFLoader
- OrbitControls 또는 PointerLockControls
- GLB / GLTF
- WebGL

React/Vue 등으로 전체 프로젝트를 다시 작성하지 않는다.

현재 Vanilla JS 구조라면 그대로 유지한다.

---

# 3. 3D 게임 방향

게임의 전체 느낌은 다음 조합을 목표로 한다.

- 삼국지
- 오픈월드 전략
- 액션 RPG
- 영지 경영
- 실시간 부대 지휘
- 랜덤 이벤트
- 로그라이크형 사건
- 영웅 성장
- 외교
- 탐험

단순한 3D 도시 화면이 아니다.

플레이어가 직접 월드를 돌아다닐 수 있어야 한다.

---

# 4. 전체 월드맵

현재 좁은 화면 중심 구조를 크게 확장한다.

월드는 다음 구조를 사용한다.

```text
                 북부
                   │
        산맥 ───── 성 ───── 평야
          │        │          │
        요새      수도       촌락
          │        │          │
        숲 ───── 강 ───── 농경지
          │        │          │
        남부 ─── 항구 ───── 도시
```

월드는 단일 화면이 아니라 넓은 3D 공간으로 만든다.

구성:

- 성
- 촌락
- 요새
- 관문
- 산
- 강
- 호수
- 숲
- 농경지
- 도로
- 다리
- 폐허
- 시장
- 항구
- 사찰
- 군영
- 자원지

---

# 5. 월드 크기

초기에는 거대한 실제 오픈월드보다 다음 방식으로 구현한다.

```text
World
 ├─ Region
 │   ├─ Territory
 │   │   ├─ City
 │   │   ├─ Village
 │   │   ├─ Fortress
 │   │   └─ Resource
 │   └─ Events
```

필요할 때 주변 지역을 생성하는 방식으로 확장 가능하게 만든다.

초기 로딩 부담을 줄인다.

---

# 6. 3D 지형

단순 평면을 사용하지 않는다.

최소한 다음 높낮이를 구현한다.

- 평야
- 언덕
- 산
- 계곡
- 강 주변
- 절벽

지형에 따라 이동속도가 달라지게 한다.

예:

```text
평야 = 1.0
도로 = 1.2
숲 = 0.8
언덕 = 0.7
산 = 0.4
늪 = 0.5
```

---

# 7. 3D 카메라

기본 카메라는 3인칭.

플레이어 뒤에서 따라오는 방식.

```text
        Camera
           ↓
       [Player]
           ↓
        World
```

마우스/터치 드래그로 회전.

휠 또는 핀치 줌.

모바일에서는:

- 왼쪽 가상 조이스틱 = 이동
- 오른쪽 드래그 = 카메라
- 버튼 = 공격/스킬/상호작용

---

# 8. 플레이어

플레이어는 직접 월드를 돌아다닌다.

기존 플레이어 정보를 재사용한다.

최소 구현:

- 이동
- 달리기
- 점프
- 회피
- 일반공격
- 스킬
- 상호작용

---

# 9. 실제 GLB 모델 사용

가능하면 placeholder geometry보다 GLB 모델을 우선한다.

구조:

```text
/assets/
  /models/
    /characters/
    /buildings/
    /environment/
    /weapons/
```

예:

```text
character.glb
soldier.glb
horse.glb
castle.glb
village.glb
tree.glb
rock.glb
```

모델이 없을 경우에는 현재 개발 단계에서는 placeholder를 사용한다.

하지만 코드 구조는 나중에 GLB를 교체하기 쉽도록 만든다.

---

# 10. 무장 시스템

기존 무장 데이터를 그대로 활용한다.

각 무장에 다음 정보를 연결한다.

```text
무장
 ├─ 이름
 ├─ 세력
 ├─ 무력
 ├─ 지력
 ├─ 통솔
 ├─ 정치
 ├─ 매력
 ├─ 병종
 ├─ 스킬
 ├─ 특성
 └─ 관계
```

3D 캐릭터와 연결한다.

---

# 11. 무장 개성 강화

모든 무장이 단순한 숫자 차이가 되지 않게 한다.

예:

장비:

- 검
- 창
- 활
- 극
- 기마
- 책략

전투 스타일:

- 근접
- 원거리
- 기마
- 탱커
- 암살
- 지원
- 책략

---

# 12. 장수 관계 시스템

기존 관계 데이터를 발전시킨다.

관계:

- 우호
- 라이벌
- 의형제
- 부부
- 군신
- 원수
- 혈연

관계에 따라 전투에서 특별 효과를 발생시킨다.

예:

```text
유비 + 관우 + 장비
= 도원결의 진형

조조 + 하후돈
= 위나라 선봉

손권 + 주유
= 강동 수군
```

---

# 13. 진영 시스템

기존 진영 시스템을 유지한다.

추가:

- 국력
- 군사력
- 민심
- 경제력
- 외교력
- 영토
- 식량
- 금
- 철
- 목재

---

# 14. 성 시스템

현재 "성" 메뉴를 3D 영지 시스템으로 확장한다.

성에 들어가면 실제 3D 공간으로 이동한다.

예:

```text
성문
 ↓
시장
 ↓
병영
 ├─ 병사 모집
 └─ 훈련
 ↓
무기고
 ↓
궁전
 ├─ 내정
 ├─ 외교
 └─ 정책
```

---

# 15. 성 발전

성 레벨:

```text
Lv1 촌성
Lv2 소성
Lv3 중성
Lv4 대성
Lv5 수도
```

발전에 따라:

- 건물 증가
- NPC 증가
- 상점 증가
- 병사 증가
- 경제 증가
- 방어 증가

---

# 16. NPC 시스템

성 안에 NPC가 존재하게 한다.

예:

- 상인
- 병사
- 농민
- 대장장이
- 의원
- 책사
- 관리
- 주점 주인
- 떠돌이 무사

NPC와 대화할 수 있다.

---

# 17. 주점 시스템

삼국지 분위기를 강화하기 위한 핵심 콘텐츠.

주점에서:

- 무장 발견
- 정보 획득
- 소문
- 현상금
- 의뢰
- 술자리 이벤트
- 라이벌 등장

랜덤 이벤트를 발생시킨다.

---

# 18. 랜덤 사건 시스템

게임의 핵심 재미 중 하나로 만든다.

월드를 이동할 때 랜덤 사건 발생.

예:

```text
산적 습격
도적 발견
상인 호위
실종된 아이
전쟁 난민
배신자 발견
적군 정찰대
보급품 발견
고대 유물
명장 조우
의문의 책사
```

선택지를 제공한다.

예:

```text
[도적을 공격한다]
[돈을 준다]
[도망간다]
```

선택에 따라 결과가 달라진다.

---

# 19. 로그라이크 사건 시스템

2026년 트렌드를 반영하되 전체 게임을 로그라이크로 만들지 않는다.

특정 지역 탐험/전쟁에서만 적용한다.

한 번의 원정:

```text
출정
 ↓
랜덤 사건
 ↓
전투
 ↓
보상
 ↓
선택
 ↓
다음 지역
 ↓
보스
```

죽으면 원정 종료.

일부 영구 성장만 유지한다.

---

# 20. 실시간 전투

3D 전투는 액션 RPG 방식으로 만든다.

플레이어:

- 일반 공격
- 강공격
- 회피
- 스킬
- 필살기

적:

- 일반병
- 궁병
- 창병
- 기병
- 장수
- 보스

---

# 21. 병종 상성

삼국지 전략성을 유지한다.

기본:

```text
창병 > 기병
기병 > 궁병
궁병 > 창병
```

추가:

- 방패병
- 궁기병
- 중기병
- 노병

---

# 22. 부대 지휘

플레이어가 혼자 싸우는 게임이 되지 않게 한다.

전투 중 부대를 지휘한다.

명령:

```text
공격
방어
돌격
후퇴
집결
궁병 사격
기병 돌격
매복
```

---

# 23. 진형 시스템

다음 진형을 구현한다.

- 일자진
- 학익진
- 장사진
- 방진
- 원진
- 기습진

진형마다 효과를 다르게 한다.

---

# 24. 전투 환경

환경이 전투에 영향을 준다.

예:

비:

- 화공 약화
- 이동속도 감소

눈:

- 이동속도 감소

밤:

- 시야 감소
- 기습 강화

숲:

- 매복 강화

강:

- 기병 약화

---

# 25. 날씨

실시간 날씨 시스템을 구현한다.

- 맑음
- 흐림
- 비
- 폭우
- 안개
- 눈

단순 장식이 아니라 게임 플레이에 영향을 준다.

---

# 26. 시간 시스템

낮/밤을 구현한다.

```text
아침
낮
저녁
밤
```

밤에는:

- NPC 행동 변화
- 적 순찰 변화
- 암살 이벤트
- 야간 전투
- 도적 출현

---

# 27. 탐험 콘텐츠

월드에 숨겨진 콘텐츠를 배치한다.

예:

- 폐허
- 비밀 동굴
- 숨겨진 보물
- 고대 무기
- 희귀 장수
- 도적 소굴
- 비밀 군영
- 역사적 장소

---

# 28. 장비 시스템

무장에게 장비를 장착한다.

```text
무기
방어구
투구
말
장신구
병법서
```

등급:

```text
일반
고급
희귀
영웅
전설
```

단순 공격력 증가만 만들지 않는다.

세트 효과를 추가한다.

---

# 29. 병법서 시스템

새로운 핵심 소재.

병법서를 장착하면 플레이 스타일이 달라진다.

예:

```text
손자병법
= 공격/전략

오자병법
= 방어/통솔

육도
= 부대 지휘

삼략
= 책략
```

---

# 30. 책략 시스템

전투 중 책략을 사용할 수 있게 한다.

예:

- 화공
- 매복
- 허보
- 혼란
- 사기 저하
- 도발
- 회복
- 속도 증가

---

# 31. 외교 시스템 강화

현재 외교 기능을 유지하면서 다음을 추가한다.

- 동맹
- 휴전
- 통상
- 군사 협정
- 인질
- 혼인
- 협박
- 배신
- 선전포고

외교 관계가 실제 월드 상황에 영향을 주도록 한다.

---

# 32. 세력 AI

각 세력이 독립적으로 행동한다.

AI는:

- 전쟁
- 동맹
- 영토 확장
- 병력 모집
- 경제 발전
- 장수 등용
- 배신

등을 수행한다.

플레이어가 아무것도 하지 않아도 세계가 움직여야 한다.

---

# 33. 역사 이벤트

삼국지의 유명 사건을 게임 이벤트로 사용한다.

예:

- 황건적의 난
- 동탁 집권
- 낙양 혼란
- 반동탁 연합
- 관도 전투
- 적벽 전투

단, 이벤트를 무조건 고정시키지 않는다.

플레이어 행동에 따라 역사가 달라지게 한다.

---

# 34. 역사 분기

핵심 시스템.

예:

```text
역사:
조조 → 관도 승리

플레이어 개입:
조조 패배

결과:
북방 정세 변경
↓
새로운 세력 등장
↓
새로운 전쟁
```

즉,

> "삼국지를 플레이하는 것"이 아니라 "나만의 삼국지를 만드는 것"

을 목표로 한다.

---

# 35. 명성 시스템

플레이어에게 명성을 부여한다.

```text
의로운 장수
폭군
정복자
책사
상인
무법자
영웅
```

명성에 따라 NPC 반응이 달라진다.

---

# 36. 사기 시스템

군대의 사기를 구현한다.

사기 상승:

- 승리
- 좋은 보급
- 유명 장수
- 높은 민심

사기 하락:

- 패배
- 굶주림
- 장수 사망
- 포위

사기가 낮으면:

- 공격력 감소
- 도망
- 항복

---

# 37. 경제 시스템

도시마다 특성을 다르게 한다.

예:

```text
농업 도시
= 식량 생산 증가

상업 도시
= 금 생산 증가

철광 도시
= 철 생산 증가

항구
= 무역 증가

군사 도시
= 병력 생산 증가
```

---

# 38. 자원 시스템

최소:

- 금
- 식량
- 철
- 목재
- 군량
- 명성

으로 시작한다.

자원 종류를 과도하게 늘리지 않는다.

---

# 39. 모바일 UI

현재 메뉴를 모바일에서 사용할 수 있게 유지한다.

하단 HUD:

```text
[지도] [성] [무장] [군대] [외교] [메뉴]
```

전투 중:

```text
HP
SP
스킬1
스킬2
회피
공격
부대명령
```

---

# 40. 성능 최적화

절대 모든 3D 객체를 한 번에 고해상도로 렌더링하지 않는다.

필수:

- GLB 압축
- Draco
- LOD
- Frustum Culling
- Instancing
- Texture Atlas
- Object Pooling
- 필요 시 로딩
- 지역 단위 로딩

나무 1000개를 각각 독립 Mesh로 만드는 방식 금지.

---

# 41. 토큰 절약 — 매우 중요

Claude Code를 사용할 때 토큰을 최대한 아끼도록 작업한다.

## 절대 금지

매 작업마다 전체 프로젝트를 다시 읽지 않는다.

전체 파일을 통째로 출력하지 않는다.

이미 분석한 코드를 다시 설명하지 않는다.

불필요한 리팩터링을 하지 않는다.

기존 정상 기능을 재작성하지 않는다.

새 라이브러리를 무조건 추가하지 않는다.

---

## Claude Code 작업 방식

항상 다음 순서로 진행한다.

```text
1. 현재 상태 확인
2. 관련 파일만 읽기
3. 최소 변경
4. 실행/검증
5. 문제 발생 시 해당 부분만 수정
```

한 번에 전체 프로젝트를 수정하지 않는다.

---

## 작업 단위

각 단계가 끝날 때마다 다음 작업으로 넘어간다.

### Phase 1

3D 엔진 연결

### Phase 2

3D 카메라

### Phase 3

3D 플레이어

### Phase 4

3D 월드

### Phase 5

GLB 모델

### Phase 6

성/도시

### Phase 7

전투

### Phase 8

부대 지휘

### Phase 9

랜덤 이벤트

### Phase 10

외교/AI

### Phase 11

경제

### Phase 12

모바일 최적화

---

# 42. Claude Code 토큰 절약 지시문

모든 작업에서 다음 원칙을 지켜라.

```text
IMPORTANT TOKEN RULES:

- Do not dump entire files.
- Do not explain unchanged code.
- Read only files relevant to the current task.
- Reuse existing functions whenever possible.
- Modify the smallest possible section.
- Do not rewrite working systems.
- Do not introduce unnecessary dependencies.
- Do not perform broad refactoring.
- Do not generate duplicate systems.
- Before changing code, inspect the existing implementation.
- Prefer patching over rewriting.
- After modification, run only the relevant validation.
- If validation succeeds, stop.
- Do not continue with unrelated improvements.
```

---

# 43. 단계별 Claude Code 실행 방식

처음에는 다음 명령 하나만 수행한다.

```text
Analyze the current saga-realm project.

Do NOT modify code yet.

Identify:
1. entry point
2. main JS files
3. CSS
4. game state
5. existing data structures
6. existing UI
7. existing save/load
8. current game loop
9. current character system
10. current city/faction/diplomacy systems

Return only a concise architecture summary and a recommended minimal-change plan.

Do not rewrite any code.
Do not create files.
Do not install dependencies yet.
Optimize token usage.
```

그 결과를 확인한 후 다음 단계부터 실제 구현한다.

---

# 44. Phase 1 — Three.js

```text
Convert the current saga-realm rendering layer to support Three.js.

Do not rewrite the existing game logic.

Keep:
- game state
- data
- diplomacy
- faction
- character
- city
- save/load

Add only:
- Three.js scene
- camera
- renderer
- lighting
- basic ground

Use the smallest possible code change.

Do not create unnecessary abstractions.

Validate that the existing UI still works.
```

---

# 45. Phase 2 — 3D 플레이어

```text
Add a third-person controllable 3D player to saga-realm.

Reuse the existing player/game state.

Implement only:
- movement
- camera follow
- rotation
- sprint
- basic interaction

Use placeholder geometry if no GLB exists.

Do not modify unrelated systems.

Keep mobile compatibility in mind.
```

---

# 46. Phase 3 — GLB

```text
Add GLB/GLTF loading support.

Create a minimal reusable model loader.

Requirements:
- GLB
- loading state
- fallback placeholder
- model cache
- animation support if available

Do not rewrite the player system.

Do not add unnecessary libraries.

Keep the loader reusable for:
characters, buildings, NPCs and environment.
```

---

# 47. Phase 4 — 월드

```text
Expand saga-realm into a large 3D world.

Reuse existing city/faction data.

Create:
- terrain
- roads
- rivers
- forests
- mountains
- cities
- villages
- fortresses

Connect existing city data to 3D world locations.

Do not create duplicate city data.
```

---

# 48. Phase 5 — 성

```text
Convert the existing city system into explorable 3D settlements.

Clicking/entering a city should move the player into the 3D settlement.

Reuse existing city data and menus.

Add only the required 3D layer.

Existing management UI must remain available.
```

---

# 49. Phase 6 — 전투

```text
Add a lightweight real-time 3D combat system.

Reuse existing character stats.

Implement:
- basic attack
- enemy AI
- HP
- damage
- skill
- death
- loot

Start with one player + small enemy group.

Do not implement large-scale battles yet.
```

---

# 50. Phase 7 — 부대

```text
Extend the combat system with controllable troops.

Implement only:
- follow player
- attack target
- defend
- retreat
- formation

Reuse existing faction and character data.

Keep troop AI lightweight.
```

---

# 51. Phase 8 — 랜덤 이벤트

```text
Add a reusable random event system.

Events must be data-driven.

Example:

{
  id,
  title,
  description,
  choices,
  conditions,
  outcomes
}

Implement:
- exploration event
- NPC event
- ambush
- treasure
- recruit
- diplomacy event

Do not hard-code every event into the game loop.
```

---

# 52. Phase 9 — 동적 세계

```text
Make factions act independently.

Add lightweight AI for:
- war
- peace
- recruitment
- expansion
- economy

Do not build complex simulation.

Use simple periodic updates.

The world should visibly change even when the player does nothing.
```

---

# 53. Phase 10 — 현대적인 콘텐츠

추가 우선순위:

### 1. 탐험

월드에서 직접 이동.

### 2. 랜덤 사건

매번 다른 상황.

### 3. 무장 수집

하지만 무조건 가챠 구조로 만들지 않는다.

### 4. 장비

무기/방어구/말/병법서.

### 5. 진형

부대 구성의 전략성 강화.

### 6. 외교

동맹/배신/혼인/전쟁.

### 7. 역사 분기

플레이어 행동으로 역사가 변화.

### 8. 보스전

유명 장수와의 특수 전투.

---

# 54. 핵심 차별화

게임을 단순한 "삼국지 3D판"으로 만들지 않는다.

다음 구조를 목표로 한다.

```text
        거대한 3D 월드
               │
      ┌────────┼────────┐
      ↓        ↓        ↓
    탐험      내정      외교
      │        │        │
      ↓        ↓        ↓
   랜덤사건   도시성장   세력전쟁
      │        │        │
      └────────┼────────┘
               ↓
           실시간 전투
               ↓
           부대 지휘
               ↓
            보상
               ↓
           성장/역사 변화
```

---

# 55. 최종 게임 경험

플레이어가 다음 행동을 자연스럽게 반복하도록 만든다.

```text
월드 탐험
 ↓
성 발견
 ↓
NPC 대화
 ↓
무장 영입
 ↓
랜덤 사건
 ↓
적군 조우
 ↓
3D 전투
 ↓
보상
 ↓
성으로 복귀
 ↓
내정
 ↓
외교
 ↓
새로운 전쟁
 ↓
역사 변화
```

이 루프가 핵심이다.

---

# 56. 그래픽 방향

목표는 AAA 수준의 그래픽을 한 번에 만드는 것이 아니다.

현재 웹 게임에서도 안정적으로 돌아가는:

> Stylized realistic Chinese historical fantasy

방향을 사용한다.

즉,

- 현실적인 지형
- 아름다운 조명
- 선명한 캐릭터
- 과도하지 않은 폴리곤
- 영화 같은 카메라
- 동양풍 건축

을 목표로 한다.

---

# 57. 모바일 우선 최적화

모바일에서도 실행되어야 한다.

기본 목표:

- 30~60 FPS
- 낮은 메모리 사용량
- 초기 로딩 최소화
- 모델 지연 로딩
- 필요 지역만 로딩

PC에서는 그래픽 품질을 높인다.

모바일에서는 자동으로:

- 그림자 감소
- LOD 증가
- 파티클 감소
- NPC 수 감소
- 렌더 해상도 감소

하도록 한다.

---

# 58. 현재 코드 보존 규칙

다음 기능이 이미 정상 작동한다면 절대 재작성하지 않는다.

- 성
- 무장
- 진영
- 외교
- 학당
- 기록
- 저장
- 게임 데이터
- 기존 메뉴

새로운 3D 시스템은 기존 시스템 위에 추가한다.

---

# 59. 완료 기준

다음 상태가 되면 1차 3D 전환 완료로 판단한다.

```text
[ ] 기존 게임 실행
[ ] 3D 월드
[ ] 3인칭 플레이어
[ ] 카메라
[ ] 이동
[ ] GLB 로더
[ ] 성/도시 3D
[ ] 기존 무장 데이터 연결
[ ] 기본 전투
[ ] 기본 NPC
[ ] 랜덤 이벤트
[ ] 모바일 조작
[ ] 기존 UI 정상 작동
[ ] 저장/불러오기 정상
```

---

# 60. 가장 중요한 Claude Code 지시

DO NOT attempt to build the entire game in one operation.

Work incrementally.

For every task:

1. inspect only relevant files
2. reuse existing code
3. make the smallest change
4. validate
5. stop

Do not spend tokens explaining implementation unless necessary.

Do not output large files.

Do not rewrite unchanged code.

Do not add speculative features.

Only implement the requested phase.

The existing saga-realm project is the source of truth.

The goal is to evolve the existing game, not replace it.

# END