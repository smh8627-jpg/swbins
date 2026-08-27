# SAGA-DUNGEON 대규모 3D 리뉴얼 작업 지시서

대상 프로젝트:

https://smh8627-jpg.github.io/swbins/saga-dungeon/

## 최우선 원칙

현재 프로젝트를 처음부터 새로 만들지 않는다.

기존 코드와 시스템을 최대한 분석하고 재사용하면서,
현재 `saga-dungeon`을 현대적인 **3D 모바일 액션 RPG**로 단계적으로 업그레이드한다.

목표는 단순한 3D 적용이 아니다.

현재 게임의 가장 큰 문제인:

- 그래픽 퀄리티 부족
- 지형지물 부족
- 맵이 비어 보임
- 전투 외 콘텐츠 부족
- 반복 플레이 재미 부족
- 모바일 UI 부족
- 세로/가로 화면 대응 부족
- 전체적인 게임 완성도 부족

을 동시에 해결한다.

---

# 1. 절대적인 토큰 절약 규칙

Claude Code 작업에서 가장 중요한 우선순위다.

## 반드시 지킬 것

1. 기존 파일을 먼저 분석한다.
2. 이미 존재하는 기능을 다시 만들지 않는다.
3. 기존 시스템을 삭제하고 처음부터 작성하지 않는다.
4. 필요한 파일만 수정한다.
5. 대규모 파일 전체 재작성 금지.
6. 작은 단위의 패치 방식으로 작업한다.
7. 같은 코드를 여러 파일에 복사하지 않는다.
8. 공통 기능은 기존 utility/module을 재사용한다.
9. 새로운 라이브러리는 반드시 필요한 경우에만 추가한다.
10. 이미 설치된 라이브러리가 있다면 그것을 우선 사용한다.
11. 기존 데이터 구조를 최대한 유지한다.
12. 기존 UI/게임 로직 중 정상 작동하는 부분은 건드리지 않는다.
13. 작업 전 전체 프로젝트를 무작정 읽지 않는다.
14. 먼저 파일 구조와 entry point를 확인한다.
15. 그 다음 실제 수정에 필요한 파일만 읽는다.
16. 각 단계마다 변경 파일을 최소화한다.
17. 동일한 파일을 여러 번 전체 출력하지 않는다.
18. 코드 설명보다 실제 수정 작업을 우선한다.
19. 긴 주석을 남발하지 않는다.
20. 사용하지 않는 코드와 asset을 추가하지 않는다.

## Claude Code 작업 방식

매 단계마다 다음 순서로 진행한다.

1. 현재 구조 확인
2. 관련 파일만 읽기
3. 기존 기능 재사용 여부 판단
4. 최소 수정
5. 실행/빌드 확인
6. 오류 수정
7. 다음 단계 진행

절대로 한 번에 전체 프로젝트를 갈아엎지 않는다.

---

# 2. 현재 프로젝트 분석

먼저 다음을 확인한다.

- package.json
- HTML entry
- JS entry
- CSS
- 게임 loop
- renderer
- scene
- player
- enemy
- combat
- UI
- inventory
- equipment
- skill/martial arts
- crafting
- merchant
- codex
- records
- save/load
- audio
- asset loading
- responsive logic

그리고 현재 게임이:

- Canvas 기반인지
- Three.js 기반인지
- 다른 3D/2D 엔진을 사용하는지

확인한다.

현재 구조를 파악한 후 기존 구조에 맞춰 구현한다.

---

# 3. 3D 리뉴얼 방향

목표:

## 현대적인 3D 액션 RPG

레퍼런스 방향:

- Diablo 스타일의 액션 RPG
- 모바일 액션 RPG
- 현대적인 3D dungeon crawler
- 오픈 필드 RPG의 환경 연출
- 고품질 fantasy RPG

단, 특정 게임의 캐릭터/맵/UI를 그대로 복제하지 않는다.

독자적인 SAGA 스타일로 만든다.

---

# 4. 실제 3D 에셋 사용

가장 중요한 변경 사항이다.

현재처럼 단순한 primitive geometry만으로 전체 게임을 표현하지 않는다.

가능한 경우 실제 3D 에셋을 사용한다.

권장 asset 형식:

- GLB
- GLTF
- compressed texture
- WebP
- KTX2 가능하면 사용

우선순위:

1. 플레이어 캐릭터
2. 주요 적
3. 보스
4. 무기
5. 나무
6. 바위
7. 풀
8. 건물
9. 폐허
10. 상자
11. 횃불
12. 제단
13. 포탈
14. 구조물
15. 환경 장식

---

# 5. Asset Loader 구축

3D asset을 각 시스템에서 개별적으로 로드하지 않는다.

공통 AssetManager를 만든다.

예:

AssetManager
- preload()
- loadGLB()
- get()
- has()
- dispose()
- clearUnused()

동일한 모델은 반드시 캐싱한다.

같은 나무 50개를 만들더라도 GLB를 50번 로드하지 않는다.

가능하면:

- InstancedMesh
- Object3D clone
- shared geometry
- shared material

을 사용한다.

---

# 6. 에셋 구조

가능하면 다음과 같은 구조로 정리한다.

```text
assets/
  characters/
  enemies/
  bosses/
  weapons/
  environment/
  props/
  effects/
  ui/
  audio/
```

현재 프로젝트에 이미 asset 폴더가 있다면 기존 구조를 우선한다.

---

# 7. 맵을 완전히 개선

현재 가장 큰 문제 중 하나는 맵이 너무 비어 있다는 것이다.

플레이어가 이동할 때마다 주변에 볼거리가 있어야 한다.

단순한 평면 바닥을 넓히는 것으로 해결하지 않는다.

## 환경 구성

맵에 다음을 배치한다.

### 자연물

- 나무
- 큰 나무
- 작은 나무
- 바위
- 이끼
- 풀
- 꽃
- 버섯
- 덤불
- 쓰러진 나무
- 나뭇가지
- 작은 연못
- 폭포
- 강

### 구조물

- 폐허
- 돌담
- 무너진 성벽
- 오래된 집
- 오두막
- 탑
- 사당
- 제단
- 동굴 입구
- 다리
- 감시탑
- 캠프
- 마차
- 상자
- 나무통

### 분위기 요소

- 횃불
- 불씨
- 연기
- 안개
- 먼지
- 반딧불
- 빛나는 식물
- 파티클
- 새
- 나비
- 작은 동물

---

# 8. 맵을 "빈 공간"이 아니라 "장소"로 만든다

맵을 단순히 크게 만들지 않는다.

플레이어가 이동하면서:

"여기는 숲"

"여기는 폐허"

"여기는 몬스터 캠프"

"여기는 오래된 사당"

"여기는 보스 지역"

처럼 공간의 성격을 느낄 수 있어야 한다.

---

# 9. 지역별 Biome

최소 5개의 환경 테마를 만든다.

### Forest

- 나무
- 풀
- 바위
- 작은 개울
- 야생동물
- 캠프

### Ruins

- 폐허
- 무너진 벽
- 석상
- 횃불
- 보물상자
- 언데드

### Swamp

- 늪
- 안개
- 썩은 나무
- 독성 지역
- 늪 몬스터

### Mountain

- 절벽
- 바위
- 좁은 길
- 폭포
- 동굴

### Ancient Shrine

- 제단
- 석상
- 신비한 문
- 룬
- 보스 입구

각 지역은 색감, 조명, 오브젝트, 적 종류가 달라야 한다.

---

# 10. 랜덤 필드 구조

게임을 단순한 던전 입구 → 방 → 보스 구조로만 만들지 않는다.

랜덤 필드 탐험을 핵심 재미로 만든다.

필드에는 랜덤 이벤트가 발생한다.

예:

- 몬스터 습격
- 보물상자
- NPC 조난
- 상인 등장
- 엘리트 몬스터
- 미니보스
- 숨겨진 동굴
- 제단
- 함정
- 퍼즐
- 수집품
- 희귀 자원
- 이벤트 캠프

---

# 11. POI 시스템

Point Of Interest 시스템을 만든다.

예:

```text
POI
 ├─ Treasure
 ├─ Camp
 ├─ Shrine
 ├─ Cave
 ├─ Merchant
 ├─ Elite
 ├─ MiniBoss
 ├─ Event
 ├─ Puzzle
 └─ Secret
```

맵을 이동할 때 POI가 자연스럽게 발견되도록 한다.

---

# 12. 탐험 콘텐츠 추가

전투만 반복되지 않도록 한다.

추가 콘텐츠:

- 숨겨진 보물
- 채집
- 희귀 광석
- 약초
- 낚시 가능한 지역
- 보물지도
- 숨겨진 동굴
- 비밀문
- 제단
- 퍼즐
- NPC 이벤트
- 랜덤 상인
- 희귀 몬스터
- 미니보스

---

# 13. 환경 상호작용

가능한 것부터 추가한다.

예:

- 상자 파괴
- 통 파괴
- 풀 흔들림
- 나뭇가지 흔들림
- 횃불 불꽃
- 물결
- 폭포
- 파괴 가능한 오브젝트
- 채집 오브젝트

---

# 14. 몬스터 다양화

적을 단순한 placeholder 형태로 만들지 않는다.

최소:

### 일반

- 늑대
- 고블린
- 도적
- 해골
- 슬라임
- 야수

### 엘리트

- Elite Wolf
- Elite Goblin
- Elite Knight
- Elite Undead

### 보스

- Forest Guardian
- Ruin Warlord
- Swamp Beast
- Ancient Guardian

각각 공격 패턴이 달라야 한다.

---

# 15. 전투 개선

전투는 3D 액션 RPG 느낌으로 만든다.

필수:

- 기본 공격
- 강공격
- 회피
- 스킬
- 적 경직
- 피격 효과
- 사망 연출
- 데미지 숫자
- 크리티컬
- 콤보
- 적 AI
- 어그로
- 추적
- 공격 범위
- 보스 패턴

---

# 16. 카메라

기본 카메라:

3/4 top-down 액션 RPG 카메라.

하지만 너무 위에서 내려다보지 않는다.

캐릭터와 환경이 잘 보이도록 한다.

카메라:

- smooth follow
- damping
- collision avoidance
- zoom
- 모바일 pinch zoom 가능하면 지원

---

# 17. 그래픽 품질 향상

단순히 폴리곤 숫자를 늘리지 않는다.

다음 요소를 적용한다.

- PBR material
- directional light
- ambient light
- shadow
- fog
- environment lighting
- tone mapping
- ambient occlusion 가능하면 적용
- bloom은 제한적으로 사용
- particle effects
- hit effects

목표는 모바일에서도 고급스럽게 보이는 것이다.

---

# 18. 모바일 성능 최우선

고품질 그래픽과 모바일 성능을 동시에 고려한다.

기본 원칙:

- draw call 최소화
- texture atlas
- instancing
- LOD
- frustum culling
- object pooling
- asset caching
- lazy loading
- distance based effects

멀리 있는 오브젝트는:

- LOD 낮추기
- 그림자 제거
- 업데이트 빈도 감소

를 적용한다.

---

# 19. 그래픽 품질 자동 조절

Graphics Quality 시스템을 추가한다.

```text
LOW
MEDIUM
HIGH
AUTO
```

AUTO에서는 기기 성능에 따라:

- shadow
- particles
- effects
- visible objects
- resolution scale

을 조절한다.

---

# 20. 모바일 UI 전면 개선

현재 UI를 단순히 데스크톱 UI를 축소해서 사용하지 않는다.

모바일 게임처럼 다시 배치한다.

## 세로 모드

상단:

- HP
- MP/Stamina
- 레벨
- 재화

중앙:

- 게임 화면

하단:

- 이동
- 공격
- 스킬
- 회피

---

# 21. 가로 모드

가로 화면에서는:

왼쪽:

- virtual joystick

오른쪽:

- attack
- dodge
- skill buttons

상단:

- HP
- MP
- quest
- minimap

을 배치한다.

---

# 22. 세로 / 가로 모두 지원

반드시 지원한다.

CSS:

```css
@media (orientation: portrait) {
  /* portrait layout */
}

@media (orientation: landscape) {
  /* landscape layout */
}
```

JavaScript에서는 현재 orientation을 감지해서 UI 레이아웃을 전환한다.

가능한 환경에서는 Screen Orientation API를 사용하되 특정 방향을 강제로 고정하지 않는다.

세로와 가로 모두 플레이 가능해야 한다.

브라우저가 orientation lock을 지원하지 않는 경우에도 게임은 정상적으로 작동해야 한다.

Screen Orientation API의 지원 여부가 브라우저마다 다르므로 fallback을 반드시 구현한다.

---

# 23. 모바일 Safe Area

iPhone notch / Dynamic Island / 홈 인디케이터를 고려한다.

CSS:

```css
env(safe-area-inset-top)
env(safe-area-inset-bottom)
env(safe-area-inset-left)
env(safe-area-inset-right)
```

게임 UI가 화면 밖으로 나가지 않도록 한다.

---

# 24. 터치 컨트롤

지원:

- joystick
- tap
- hold
- drag
- swipe
- pinch

중복 터치 방지.

버튼 터치 영역은 충분히 크게 한다.

---

# 25. 데스크톱도 유지

모바일만 지원하지 않는다.

Desktop:

- WASD
- mouse
- keyboard shortcuts

Mobile:

- touch controls

둘 다 지원한다.

---

# 26. HUD 개선

현재 게임에 있는 시스템을 유지하면서 HUD를 현대화한다.

HUD:

- HP
- MP
- stamina
- level
- XP
- gold
- quest
- minimap
- skill
- cooldown
- status effect

---

# 27. 미니맵

미니맵을 추가한다.

표시:

- 플레이어
- 적
- NPC
- POI
- 보물
- 보스
- 지역 경계

모바일에서는 크기를 자동 조정한다.

---

# 28. 월드맵

미니맵과 별도로 월드맵을 만든다.

지역:

```text
Forest
Ruins
Swamp
Mountain
Shrine
```

탐험한 지역을 저장한다.

---

# 29. 콘텐츠 루프

게임 플레이 흐름을 다음처럼 만든다.

```text
탐험
 ↓
몬스터 발견
 ↓
전투
 ↓
보상
 ↓
새로운 지역 발견
 ↓
POI 발견
 ↓
이벤트
 ↓
장비 획득
 ↓
강화
 ↓
엘리트/미니보스
 ↓
보스
 ↓
새로운 지역 해금
```

단순히 몬스터를 잡고 다음 화면으로 넘어가는 구조를 피한다.

---

# 30. 장비 시스템 강화

기존 장비 시스템이 있다면 유지하면서 확장한다.

장비:

- 무기
- 투구
- 갑옷
- 장갑
- 신발
- 반지
- 목걸이

등을 지원한다.

등급:

```text
Common
Uncommon
Rare
Epic
Legendary
Mythic
```

랜덤 옵션:

- 공격력
- 방어력
- 치명타
- 공격속도
- 이동속도
- HP
- 스킬 피해
- 원소 피해

---

# 31. 기존 "무예" 시스템 확장

현재 `무예` 시스템을 단순 메뉴가 아니라 실제 전투 스킬 시스템으로 연결한다.

예:

- 검술
- 창술
- 궁술
- 화염술
- 번개술
- 독술

각 스킬에:

- animation
- VFX
- damage
- cooldown
- hitbox

를 연결한다.

---

# 32. 세공 시스템

현재 세공 시스템을 유지하면서 실제 장비 성장에 연결한다.

예:

```text
장비
 ↓
재료
 ↓
세공
 ↓
랜덤 옵션
 ↓
강화
```

필드에서 재료를 획득할 수 있게 한다.

---

# 33. 행상 시스템

랜덤 상인을 추가한다.

필드에서 일정 확률로 등장.

판매:

- 장비
- 재료
- 포션
- 희귀 아이템
- 지도
- 특수 아이템

상인이 매번 다른 상품을 가지고 나오도록 한다.

---

# 34. 도감 시스템

도감을 콘텐츠 수집 시스템으로 발전시킨다.

수집:

- 몬스터
- 장비
- 지역
- 재료
- 보스
- NPC
- 발견 장소

도감 완성 보상도 추가한다.

---

# 35. 랜덤 이벤트

필드에서 확률적으로 이벤트 발생.

예:

```text
EVENT
 ├─ Monster Ambush
 ├─ Merchant
 ├─ Treasure
 ├─ NPC Rescue
 ├─ Elite Monster
 ├─ Shrine
 ├─ Mini Boss
 └─ Secret Area
```

---

# 36. 퀘스트 시스템

최소한 다음을 지원한다.

- 메인 퀘스트
- 지역 퀘스트
- 랜덤 퀘스트
- 이벤트 퀘스트

예:

"숲의 늑대 10마리 처치"

"폐허의 제단 발견"

"상인을 찾아라"

"숨겨진 동굴을 발견하라"

---

# 37. 사운드

환경별 사운드를 추가한다.

Forest:

- 새
- 바람
- 나뭇잎

Ruins:

- 바람
- 금속음
- 저주받은 ambience

Swamp:

- 물
- 벌레
- 낮은 ambience

Combat:

- hit
- critical
- skill
- enemy death

---

# 38. 시각 효과

전투에서 반드시 feedback이 느껴져야 한다.

추가:

- slash trail
- hit spark
- critical effect
- damage popup
- enemy flash
- camera shake
- ground effect
- skill particles

단, 모바일 성능을 고려하여 quality scaling을 적용한다.

---

# 39. 로딩 구조

초기 로딩에서 모든 asset을 한꺼번에 로드하지 않는다.

필수 asset만 preload.

나머지는:

```text
lazy load
```

한다.

지역에 들어가기 전에 필요한 asset을 미리 로드한다.

---

# 40. 저장 시스템

현재 저장 시스템이 있다면 유지한다.

추가 저장:

- 플레이어 위치
- 현재 지역
- 장비
- 인벤토리
- 퀘스트
- 도감
- 발견한 POI
- 해금 지역
- 그래픽 설정
- 조작 설정

---

# 41. 최종 UX 목표

게임을 실행했을 때 첫 인상이:

"간단한 웹게임"

이 아니라

"모바일 3D 액션 RPG"

처럼 느껴져야 한다.

특히 첫 화면부터:

- 고품질 3D 캐릭터
- 넓은 필드
- 나무
- 바위
- 폐허
- 몬스터
- 조명
- 그림자
- 안개
- 파티클
- UI

가 보여야 한다.

빈 공간을 최대한 줄인다.

---

# 42. 중요: 에셋 선택 원칙

인터넷에서 무작정 이미지를 가져오거나 저작권이 불명확한 에셋을 사용하지 않는다.

가능하면:

- CC0
- 상업적 사용 허용
- 명확한 라이선스
- 직접 제작 가능한 에셋

을 사용한다.

에셋을 추가할 때 라이선스를 확인하고 프로젝트 내에 출처 정보를 관리할 수 있도록 한다.

---

# 43. 현재 코드와 충돌하지 않는 리뉴얼

다음 기능은 가능한 한 기존 구현을 유지한다.

- 저장
- 플레이어 데이터
- 장비
- 무예
- 세공
- 행상
- 도감
- 기록
- 재화
- 경험치
- 레벨

새로운 3D layer를 기존 게임 로직 위에 얹는 방식으로 진행한다.

즉:

```text
Existing Game Logic
        ↓
   Game State
        ↓
   3D Presentation
        ↓
      Input
```

구조를 목표로 한다.

---

# 44. 절대 금지

다음 작업은 하지 않는다.

- 프로젝트 전체 삭제
- 기존 게임 로직 전부 재작성
- 필요 없는 framework 교체
- 필요 없는 package 추가
- 전체 파일 재생성
- 모든 UI를 한꺼번에 재작성
- asset을 수십 MB씩 무분별하게 추가
- 모바일에서 무거운 효과 남발
- 같은 asset 중복 로딩
- 의미 없는 애니메이션 추가
- placeholder만 늘려서 콘텐츠가 많아 보이게 만들기

---

# 45. 구현 우선순위

반드시 이 순서로 진행한다.

## Phase 1

현재 구조 분석

## Phase 2

3D renderer/scene 구조 정리

## Phase 3

AssetManager 구축

## Phase 4

실제 GLB/GLTF 캐릭터 적용

## Phase 5

환경 에셋 적용

## Phase 6

맵 확장

## Phase 7

POI 시스템

## Phase 8

전투 개선

## Phase 9

몬스터/보스 다양화

## Phase 10

탐험 콘텐츠

## Phase 11

모바일 UI

## Phase 12

세로/가로 대응

## Phase 13

성능 최적화

## Phase 14

저장/QA

## Phase 15

최종 polish

---

# 46. 각 Phase마다 반드시 검증

각 단계가 끝나면:

```text
Build
Run
Check console
Check mobile layout
Check desktop
```

한다.

에러가 있으면 다음 Phase로 넘어가지 않는다.

---

# 47. 모바일 최종 테스트

최소:

- iPhone Safari
- Android Chrome
- Desktop Chrome

에서 확인한다.

확인 항목:

- 세로
- 가로
- 화면 회전
- 터치
- UI 겹침
- safe area
- 성능
- 로딩
- asset 누락
- 저장
- 전투

---

# 48. 최종 성능 목표

가능한 범위에서 모바일 기준:

- 안정적인 FPS
- 과도한 draw call 방지
- 과도한 texture 메모리 방지
- 불필요한 update loop 제거
- object pooling
- asset caching
- LOD
- instancing

을 적용한다.

그래픽을 높이면서도 모바일에서 플레이 가능한 수준을 유지한다.

---

# 49. 작업 중 중요한 판단

현재 구조가 이미 특정 기능을 잘 구현하고 있다면 그것을 유지한다.

"더 좋은 구조"라는 이유만으로 전체 구조를 바꾸지 않는다.

항상:

```text
기존 기능 재사용
>
최소 수정
>
성능 개선
>
새 기능
```

순으로 판단한다.

---

# 50. 최종 결과 기준

최종적으로 다음 느낌을 목표로 한다.

### 기존

```text
웹게임
↓
단순한 맵
↓
단순한 그래픽
↓
전투 반복
```

### 리뉴얼

```text
3D 모바일 액션 RPG
        ↓
넓은 랜덤 필드
        ↓
다양한 지형/환경
        ↓
실제 3D 에셋
        ↓
탐험
        ↓
랜덤 이벤트
        ↓
몬스터/엘리트/보스
        ↓
장비 파밍
        ↓
무예/스킬
        ↓
세공
        ↓
도감
        ↓
퀘스트
        ↓
지역 해금
        ↓
반복 플레이
```

---

# Claude Code 실행 지침

지금 바로 코드를 수정하기 전에 먼저 프로젝트 구조를 분석한다.

전체 프로젝트를 한꺼번에 읽지 말고 entry point와 핵심 파일부터 찾는다.

그 다음 현재 기능 중 재사용 가능한 부분을 판단한다.

그리고 Phase 1부터 순서대로 진행한다.

각 Phase마다 실제 코드를 수정하고 검증한다.

**가장 중요한 것은 토큰 절약이다.**

불필요한 파일을 읽거나 전체 코드를 반복 출력하지 않는다.

작업 중 이미 확인한 파일은 다시 전체를 읽지 않는다.

변경이 필요한 부분만 읽고 수정한다.

작업 결과를 장황하게 설명하지 말고 실제 구현에 집중한다.

단, 중요한 구조 변경이나 에셋 추가가 필요한 경우에는 짧게 이유만 기록한다.

최종 목표는 기존 `saga-dungeon`의 게임 시스템을 버리는 것이 아니라,

**기존 시스템 + 실제 3D 에셋 + 넓은 필드 + 다양한 환경 + 랜덤 콘텐츠 + 모바일 세로/가로 지원 + 고품질 액션 전투**

를 결합하여 완전히 새로운 수준의 SAGA-DUNGEON으로 만드는 것이다.