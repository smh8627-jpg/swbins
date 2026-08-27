# saga-forest 전면 리뉴얼 작업

대상 프로젝트:

https://smh8627-jpg.github.io/swbins/saga-forest/

현재 프로젝트를 완전히 새로 만드는 것이 아니라 **기존 saga-forest 코드를 최대한 재사용하면서 품질을 크게 끌어올리는 방향**으로 작업한다.

핵심 목표는 다음 5가지다.

1. 토큰 사용량 최소화
2. 기존 기능 최대한 보존
3. 실제 3D GLB/GLTF 에셋 기반 그래픽으로 전환
4. 숲/필드의 지형지물과 콘텐츠를 대폭 증가
5. 모바일 세로/가로 모드 모두 완벽하게 지원

---

# 0. 최우선 규칙 — 토큰 절약

이번 작업에서 가장 중요한 것은 **불필요한 코드 재작성과 파일 전체 재출력을 방지하는 것**이다.

Claude Code는 작업 전에 반드시 프로젝트 구조를 먼저 확인한다.

## 반드시 지킬 것

- 기존 코드를 무조건 처음부터 다시 작성하지 않는다.
- 기존 파일을 먼저 분석한다.
- 필요한 파일만 수정한다.
- 정상 작동하는 기능은 건드리지 않는다.
- 동일한 기능을 새 시스템으로 중복 구현하지 않는다.
- 기존 유틸리티/상태관리/렌더링 구조를 재사용한다.
- 거대한 단일 파일로 합치지 않는다.
- 이미 존재하는 함수는 가능하면 재사용한다.
- CSS도 전체 교체하지 말고 필요한 부분만 수정한다.
- 기존 UI 기능을 삭제하지 않는다.
- 기존 저장 데이터 구조를 깨뜨리지 않는다.
- 기존 게임 로직을 가능한 한 유지한다.

## Claude Code 작업 방식

각 단계마다:

1. 현재 구조 확인
2. 변경 대상 파일 결정
3. 최소 변경
4. 테스트
5. 다음 단계 진행

파일을 읽을 때도 전체 파일을 무조건 읽지 말고 필요한 부분을 우선 검색한다.

예:

- scene
- renderer
- player
- terrain
- camera
- controls
- asset
- mobile
- ui
- resize
- orientation

등의 키워드로 먼저 검색한다.

---

# 1. 현재 프로젝트 분석

먼저 saga-forest의 현재 코드를 분석한다.

다음 내용을 확인한다.

- package.json
- index.html
- src 구조
- Three.js 사용 여부
- React/Vue 사용 여부
- 현재 Scene 구조
- Camera 구조
- Renderer 구조
- Player 구조
- Map/Terrain 구조
- 현재 에셋 구조
- CSS 구조
- 모바일 입력 처리
- 저장 시스템
- 게임 루프
- 현재 사용 중인 라이브러리

분석 결과를 먼저 간단히 정리하고 바로 구현으로 들어간다.

불필요한 대규모 리팩터링은 하지 않는다.

---

# 2. 그래픽 방향 전환

현재 프로젝트의 가장 큰 문제는:

- 지형이 단순함
- 오브젝트가 부족함
- 화면이 비어 보임
- 게임 세계가 작아 보임
- 기본 Primitive 위주의 느낌
- 모바일 웹게임처럼 보임

이를 개선한다.

목표:

**"모바일에서 플레이하는 작은 3D 숲속 오픈월드 RPG"**

느낌으로 만든다.

참고 분위기:

- Animal Crossing
- Zelda 계열의 밝은 3D 필드
- 현대 모바일 3D RPG
- 캐주얼 오픈월드
- 판타지 숲
- 탐험형 RPG

단, 특정 게임의 그래픽을 그대로 복제하지 않는다.

---

# 3. 실제 3D 에셋 사용

가능하면 직접 만든 Box/Sphere/Cylinder 조합 대신 실제 3D 에셋을 사용한다.

기본 포맷:

- GLB
- GLTF

Three.js GLTFLoader를 이용한다.

가능하면:

- Draco 압축
- Meshopt
- KTX2/Basis texture

등 모바일 최적화 기술을 적용한다.

three.js의 GLTFLoader가 Draco, Meshopt, KTX2 등의 확장을 지원하므로 이를 활용한다.

---

# 4. 에셋 구조

다음과 같은 구조를 만든다.

public/
  assets/
    environment/
      trees/
      rocks/
      plants/
      flowers/
      mushrooms/
      logs/
      bushes/
      fences/
      bridges/
      buildings/

    characters/
      player/
      animals/
      monsters/
      npcs/

    props/
      signs/
      chests/
      lamps/
      benches/
      wells/
      carts/

    effects/
      particles/
      magic/
      weather/

    textures/

    audio/

에셋이 실제로 존재하지 않는 경우에는 빈 경로를 만들고 코드에서 관리할 수 있도록 AssetManager를 만든다.

---

# 5. AssetManager 구축

에셋을 매번 직접 로드하지 않는다.

중앙 AssetManager를 만든다.

예:

AssetManager

역할:

- GLB preload
- 캐시
- 중복 로딩 방지
- 로딩 상태
- 에러 처리
- clone
- dispose

동일한 나무 GLB 50개를 배치하더라도 파일을 50번 다운로드하지 않도록 한다.

---

# 6. 숲 지형 대폭 확장

현재보다 최소 4~8배 넓게 느껴지도록 필드를 확장한다.

단순히 Plane 크기만 키우지 않는다.

구역을 나눈다.

예:

FOREST
├─ 시작 캠프
├─ 초원
├─ 깊은 숲
├─ 작은 호수
├─ 강
├─ 폭포
├─ 버섯 숲
├─ 바위 지대
├─ 꽃밭
├─ 폐허
├─ 숨겨진 동굴
└─ 작은 마을

플레이어가 이동하면서 풍경이 달라져야 한다.

---

# 7. 지형 다양화

최소 다음 요소를 추가한다.

## 지형

- 평지
- 낮은 언덕
- 높은 언덕
- 경사
- 절벽
- 흙길
- 잔디
- 바위 지대
- 물
- 강
- 호수
- 작은 섬

가능하면 단순한 단색 Plane 하나로 전체 맵을 만들지 않는다.

---

# 8. 숲 오브젝트 대폭 증가

화면에 아무것도 없는 공간을 최소화한다.

다음 오브젝트를 랜덤/규칙적으로 배치한다.

## 나무

- 큰 나무
- 작은 나무
- 침엽수
- 고목
- 쓰러진 나무

## 식물

- 풀
- 꽃
- 덤불
- 버섯
- 작은 나뭇가지
- 이끼

## 자연물

- 돌
- 큰 바위
- 자갈
- 통나무
- 그루터기

## 장식

- 나무 표지판
- 랜턴
- 울타리
- 벤치
- 캠프파이어
- 나무다리
- 우물
- 카트
- 작은 천막

---

# 9. 랜덤 배치 시스템

오브젝트를 코드로 일일이 작성하지 않는다.

Procedural Decoration 시스템을 만든다.

예:

ForestDecorator

역할:

- seed 기반 랜덤
- biome별 오브젝트
- density
- 최소 거리
- 랜덤 rotation
- 랜덤 scale
- 충돌 제외
- 주요 장소 보호

예:

Forest biome

tree 120
bush 80
rock 50
flower 150
grass 300
mushroom 30
log 15

단, 모바일 성능을 고려하여 실제 렌더링 수는 자동 조절한다.

---

# 10. 중요한 장소는 랜덤 배치하지 않는다

다음은 고정 위치로 배치한다.

- 시작 위치
- NPC
- 마을
- 퀘스트 장소
- 보스 지역
- 던전 입구
- 호수
- 폭포
- 다리

나머지 자연물만 procedural 배치한다.

---

# 11. Biome 시스템

하나의 숲만 만들지 않는다.

최소 5개 이상의 분위기를 만든다.

## Green Forest

밝은 초록 숲

## Flower Meadow

꽃과 풀 중심

## Dark Forest

어두운 나무와 안개

## Mushroom Grove

거대한 버섯과 특수 식물

## Rocky Area

바위와 절벽 중심

각 biome마다:

- 색감
- fog
- tree 종류
- rock 종류
- vegetation
- ambient sound
- 몬스터
- 아이템

이 달라진다.

---

# 12. 물 표현

물은 단순한 파란 Plane처럼 보이지 않게 한다.

최소:

- 투명도
- 반사 느낌
- 잔잔한 wave animation
- shoreline
- 물결 파티클

을 적용한다.

폭포가 있다면:

- 물줄기
- 물보라
- 아래쪽 물결

을 추가한다.

---

# 13. 하늘 / 조명

기본적인 빈 배경을 제거한다.

구성:

- Sky
- Sun
- Ambient Light
- Directional Light
- Fog
- Shadow

가능하면 시간대 변화도 고려한다.

낮:

밝고 따뜻함

저녁:

주황빛

밤:

푸른빛

처음에는 실제 시간 시스템까지 만들 필요 없다.

간단한 day/night preset만 만든다.

---

# 14. 카메라

3D 모바일 RPG 느낌의 3인칭 카메라를 적용한다.

기본:

- 플레이어 뒤쪽
- 약간 높은 시점
- 부드러운 추적
- damping
- camera collision
- zoom

카메라가 플레이어에게 너무 붙지 않게 한다.

필드가 넓어 보이도록 시야각을 적절하게 설정한다.

---

# 15. 플레이어

플레이어를 단순한 Primitive 캐릭터처럼 보이지 않게 한다.

가능하면 실제 GLB 캐릭터를 사용한다.

필요 애니메이션:

- Idle
- Walk
- Run
- Attack
- Hit
- Dodge

GLB에 animation이 없으면 최소 Idle/Walk라도 구현한다.

AnimationMixer 기반으로 관리한다.

---

# 16. 동물 콘텐츠

saga-forest의 핵심 콘텐츠로 동물을 추가한다.

예:

- 사슴
- 토끼
- 여우
- 다람쥐
- 새
- 오리
- 늑대

모든 동물을 한꺼번에 활성화하지 않는다.

플레이어 주변 일정 거리에서만 활성화한다.

간단한 AI:

IDLE
↓
WANDER
↓
STOP
↓
EAT
↓
RUN_AWAY

정도로 구현한다.

---

# 17. NPC

숲 곳곳에 NPC를 배치한다.

예:

- 숲지기
- 낚시꾼
- 상인
- 탐험가
- 약초꾼

NPC는 단순 장식이 아니라:

- 대화
- 퀘스트
- 아이템
- 발견 정보

등의 역할을 가진다.

---

# 18. 탐험 콘텐츠

맵을 단순히 걷는 게임으로 만들지 않는다.

다음 콘텐츠를 추가한다.

## 보물상자

맵 곳곳에 숨겨진 보물상자.

## 채집

- 나무열매
- 버섯
- 꽃
- 약초
- 광물

## 상호작용

- 나무
- 바위
- 캠프파이어
- 표지판
- NPC
- 상자

플레이어가 가까이 가면:

"탐색"

버튼이 나타난다.

---

# 19. 미니 퀘스트

초기부터 복잡한 퀘스트 시스템을 만들 필요는 없다.

간단한 데이터 기반 구조로 만든다.

예:

quest:
  id
  title
  description
  type
  target
  count
  reward

예:

"꽃 5개를 찾아주세요."

"숲의 잃어버린 상자를 찾아주세요."

"토끼를 발견해주세요."

"숲 깊은 곳의 NPC를 찾아주세요."

---

# 20. 랜덤 이벤트

탐험 중 작은 이벤트가 발생하게 한다.

예:

- 희귀 동물 등장
- 보물 발견
- 몬스터 습격
- 유성
- 비
- 안개
- NPC 이벤트
- 희귀 꽃 등장

확률 기반으로 구현한다.

---

# 21. 날씨 시스템

최소:

- 맑음
- 흐림
- 비
- 안개

를 구현한다.

비:

- rain particle
- ambient sound
- lighting 변화

안개:

- fog density 증가

단, 모바일 성능을 우선한다.

---

# 22. 밤 시스템

밤이 되면:

- 조명 감소
- 하늘 변화
- 랜턴
- 반딧불이
- 야행성 동물

등이 등장하도록 한다.

반딧불이는 매우 많은 Mesh를 만들지 말고 particle 방식으로 구현한다.

---

# 23. 모바일 세로 모드

세로 화면에서도 정상 플레이되도록 한다.

portrait:

- 화면 중앙에 게임
- UI 최소화
- 조작 버튼 하단
- 체력/퀘스트 상단
- 상호작용 버튼 우측

절대로 화면이 잘리거나 HUD가 겹치면 안 된다.

---

# 24. 모바일 가로 모드

landscape:

- 더 넓은 시야
- 왼쪽 joystick
- 오른쪽 action buttons
- 상단 상태 UI
- 미니맵

가로 모드에서는 게임 세계를 최대한 넓게 보여준다.

---

# 25. Orientation 자동 대응

orientationchange / resize 이벤트를 처리한다.

화면 방향이 변경되면:

- renderer resize
- camera aspect
- camera projection
- UI layout
- joystick
- action buttons
- minimap
- safe area

를 모두 다시 계산한다.

---

# 26. iPhone Safe Area

iPhone의 노치/홈 인디케이터 영역을 고려한다.

CSS:

env(safe-area-inset-top)
env(safe-area-inset-bottom)
env(safe-area-inset-left)
env(safe-area-inset-right)

를 활용한다.

특히 세로 모드에서 하단 버튼이 홈 인디케이터와 겹치지 않도록 한다.

---

# 27. 터치 조작

모바일에서는 다음을 지원한다.

왼쪽:

Virtual Joystick

오른쪽:

Camera Touch

버튼:

- Attack
- Dash
- Interact
- Jump
- Map

가능하면 한 손/두 손 모두 자연스럽게 사용할 수 있도록 한다.

---

# 28. 카메라 터치 조작

오른쪽 영역을 드래그하면 카메라가 회전한다.

다음 기능:

- sensitivity
- damping
- vertical limit
- horizontal rotation

을 지원한다.

UI 버튼을 누를 때 카메라가 같이 회전하지 않도록 event propagation을 막는다.

---

# 29. 모바일 성능 최적화

가장 중요하다.

목표:

**iPhone Safari에서 안정적인 FPS 유지**

적용:

- devicePixelRatio 제한
- 모바일 해상도 scaling
- shadow map 낮춤
- 그림자 거리 제한
- fog 활용
- frustum culling
- LOD
- InstancedMesh
- object pooling
- asset caching
- particle pooling

모바일에서 불필요하게 4K 텍스처를 사용하지 않는다.

---

# 30. 거리 기반 오브젝트 활성화

플레이어와 먼 오브젝트는:

- 렌더링 빈도 감소
- 숨김
- 저해상도 LOD

등을 적용한다.

예:

0~30m
High

30~70m
Medium

70m+
Low/Hidden

정확한 수치는 기기 성능에 따라 조정한다.

---

# 31. 에셋 수보다 중요한 것

에셋을 무조건 많이 넣지 않는다.

다음 원칙을 적용한다.

"적은 수의 좋은 에셋을 반복 활용하되 배치와 스케일을 다양하게 한다."

예를 들어 나무 GLB 5개만 있어도:

- scale
- rotation
- 위치
- density
- biome

을 변경해서 자연스럽게 구성한다.

---

# 32. 에셋 라이선스

외부 에셋을 사용할 경우 반드시 라이선스를 확인한다.

상업적 사용 가능 여부를 확인하고,

가능하면:

- CC0
- Public Domain
- 명확한 상업 이용 허용 라이선스

에셋을 우선한다.

라이선스가 불명확한 에셋은 프로젝트에 넣지 않는다.

---

# 33. UI 리뉴얼

현재 UI가 투박하다면 전체 게임 UI도 같이 개선한다.

스타일:

- 반투명
- 둥근 모서리
- 작은 그림자
- 아이콘 중심
- 모바일 친화적

화면을 UI로 가득 채우지 않는다.

게임 화면이 가장 중요하다.

---

# 34. 미니맵

가로 모드에서 미니맵을 추가한다.

표시:

- 플레이어
- NPC
- 퀘스트
- 주요 장소

세로 모드에서는 작은 버튼으로 축소 가능하게 한다.

---

# 35. 상호작용 시스템

모든 오브젝트마다 별도 이벤트 코드를 만들지 않는다.

InteractionManager를 만든다.

예:

INTERACTABLE

- NPC
- Chest
- Tree
- Rock
- Flower
- Sign
- Campfire

플레이어와 일정 거리 이내에 들어오면 가장 가까운 대상만 표시한다.

---

# 36. 게임 루프 최적화

requestAnimationFrame 안에서 매 프레임 모든 오브젝트를 검사하지 않는다.

가능하면:

- spatial grid
- distance check interval
- active object list

등을 사용한다.

특히 동물 AI와 상호작용 탐색은 매 프레임 전체 오브젝트를 순회하지 않는다.

---

# 37. 로딩 화면

3D 에셋이 많아지므로 초기 로딩 화면을 만든다.

예:

SAGA FOREST

"숲을 준비하는 중..."

Loading 65%

진행률을 표시한다.

필수 에셋만 먼저 로딩한다.

나머지는 플레이 중 lazy loading한다.

---

# 38. 모바일 품질 프리셋

다음 3단계로 만든다.

LOW

- 그림자 OFF
- 낮은 DPR
- 적은 vegetation
- 낮은 particle

MEDIUM

- 제한적인 그림자
- 적절한 vegetation
- 기본 particle

HIGH

- 그림자
- 더 많은 vegetation
- 높은 DPR
- 효과 증가

기기 성능을 감지해서 기본값을 자동 설정한다.

---

# 39. 절대 하지 말 것

다음 행동은 금지한다.

- 프로젝트 전체 재작성
- 정상 기능 삭제
- 모든 파일을 새 구조로 이동
- 무거운 프레임워크 추가
- 불필요한 라이브러리 추가
- 거대한 3D 모델 하나로 전체 맵 구성
- 모바일 최적화 없는 고해상도 텍스처
- 모든 동물의 상시 AI 실행
- 모든 나무에 개별 복잡한 로직 부여
- 수백 개의 독립된 particle 생성
- 세로 모드만 지원
- 가로 모드만 지원

---

# 40. 구현 우선순위

반드시 아래 순서대로 작업한다.

PHASE 1

현재 코드 분석
↓
렌더링 구조 확인
↓
모바일 구조 확인
↓
AssetManager 기반 마련

PHASE 2

GLB/GLTF 로딩
↓
Player 3D
↓
Tree/Rock/Vegetation
↓
Terrain

PHASE 3

넓은 Forest Map
↓
Biome
↓
Lake
↓
River
↓
Waterfall
↓
Village
↓
Cave

PHASE 4

Animals
↓
NPC
↓
Interaction
↓
Gathering
↓
Treasure
↓
Quest

PHASE 5

Weather
↓
Day/Night
↓
Particles
↓
Ambient effects

PHASE 6

Portrait
↓
Landscape
↓
Safe Area
↓
Touch controls

PHASE 7

LOD
↓
Instancing
↓
Object Pool
↓
Asset Cache
↓
Mobile FPS optimization

PHASE 8

최종 QA

---

# 41. 최종 품질 기준

최종적으로 이 프로젝트를 열었을 때 다음 느낌이 나야 한다.

기존:

"3D 오브젝트 몇 개가 있는 웹페이지"

변경 후:

"작지만 실제로 탐험할 수 있는 3D 숲속 게임"

플레이어가 이동하면:

나무
→
풀
→
꽃
→
바위
→
동물
→
호수
→
다리
→
NPC
→
마을
→
동굴
→
보물

등이 자연스럽게 발견되어야 한다.

특히 **빈 공간을 줄이고 화면에 시각적 관심 지점을 계속 만들어야 한다.**

---

# Claude Code 최종 작업 원칙

작업 도중 기존 코드가 예상과 다르면 억지로 새 구조를 만들지 말고 현재 구조에 맞춰 최소 변경한다.

각 변경 후:

- npm build
- lint
- console error 확인
- 모바일 viewport 확인
- portrait 확인
- landscape 확인
- Safari 호환성 확인

을 수행한다.

그리고 성능 문제가 발생하면 그래픽을 무조건 낮추지 말고 먼저:

1. 중복 로딩 제거
2. 오브젝트 pooling
3. instancing
4. LOD
5. 거리 기반 활성화
6. DPR 조절
7. shadow 조절

순서로 최적화한다.

**최종 목표는 그래픽을 크게 향상시키면서도 모바일에서 부드럽게 돌아가는 것이다.**

그리고 작업 과정에서 토큰을 절약하기 위해 매 단계마다 전체 파일을 다시 출력하거나 전체 프로젝트를 다시 분석하지 않는다.

**현재 코드에서 필요한 부분만 읽고 수정한다.**