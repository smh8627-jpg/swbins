# saga-go 3D 고퀄리티 리뉴얼 + 현대적 게임 시스템 개발 프롬프트

## 0. 프로젝트

대상 프로젝트:

https://smh8627-jpg.github.io/swbins/saga-go/

프로젝트명: saga-go

현재 콘셉트:
- 사가고 — 걷고 만난다
- 삼국지/역사 기반 탐험 게임
- 현재 2.5D 중심
- 지도 / 사명 / 행낭 / 천거 / 도감 / 사관 / 기록 등의 UI와 시스템 존재

목표:

**현재 saga-go의 코드를 최대한 보존하면서 고품질 3D 역사 RPG/탐험 게임으로 발전시킨다.**

단순히 화면을 3D처럼 보이게 만드는 것이 목표가 아니다.

최종적으로:

> "삼국지 세계를 직접 걸어 다니면서 인물, 도시, 사건, 전투, 보물, 유적을 발견하는 현대적인 3D 역사 어드벤처 RPG"

를 목표로 한다.

---

# 1. 최우선 원칙 — 토큰 절약

Claude Code가 가장 중요하게 지켜야 할 규칙이다.

## 절대 금지

- 전체 프로젝트를 무조건 재작성하지 않는다.
- 기존 파일을 무작정 삭제하지 않는다.
- 기존 시스템을 처음부터 다시 만들지 않는다.
- 이미 구현된 기능을 다시 구현하지 않는다.
- 의미 없는 리팩터링을 하지 않는다.
- CSS 전체를 갈아엎지 않는다.
- package.json을 이유 없이 변경하지 않는다.
- 새로운 라이브러리를 무조건 추가하지 않는다.
- 동일 기능을 여러 파일에 중복 구현하지 않는다.
- 설명을 길게 출력하지 않는다.
- 작업 전에 모든 파일을 Claude에게 출력하지 않는다.

## 반드시

1. 현재 프로젝트 구조를 먼저 조사한다.
2. 핵심 파일만 확인한다.
3. 기존 코드 구조를 최대한 유지한다.
4. 필요한 파일만 수정한다.
5. 기존 기능이 정상적으로 유지되는지 확인한다.
6. 변경량을 최소화한다.
7. 동일한 유틸리티는 재사용한다.
8. 새 시스템은 기존 시스템과 연결한다.

---

# 2. Claude Code 작업 방식

작업은 다음 순서로 진행한다.

## STEP 1 — 프로젝트 조사

먼저 다음만 확인한다.

- package.json
- index.html
- src/
- js/
- css/
- assets/
- 현재 2D/2.5D 렌더링 코드
- 지도 관련 코드
- 캐릭터 관련 코드
- UI 상태 관리 코드

파일 전체를 한꺼번에 출력하지 않는다.

먼저 파일 목록과 각 파일의 역할만 간단히 파악한다.

---

# 3. 현재 기능 보존

현재 존재하는 기능을 우선 유지한다.

예:

- 지도
- 2.5D
- 4등
- 사명
- 행낭
- 천거
- 도감
- 사관
- 기록
- 서당
- 캐릭터
- 플레이어 상태
- 저장 데이터
- 기존 UI

3D 전환 때문에 기존 기능을 제거하지 않는다.

---

# 4. 3D 엔진 전략

현재 프로젝트가 Three.js 계열이면 기존 Three.js를 우선 사용한다.

새로운 엔진으로 전체 프로젝트를 옮기지 않는다.

가능하다면:

- Three.js
- GLTFLoader
- DRACOLoader
- KTX2Loader
- Meshopt
- InstancedMesh

를 활용한다.

GLB/glTF를 기본 3D 모델 포맷으로 사용한다.

Three.js GLTFLoader는 glTF 2.0과 Draco/Meshopt/KTX2 등의 최적화 확장을 지원하므로 이를 적극 활용한다.

---

# 5. WebGPU 전략

가능하면 최신 Three.js 환경에서 WebGPU를 우선 고려한다.

구조:

WebGPU
 ↓
WebGL fallback
 ↓
기존 2D fallback

단,

현재 프로젝트가 WebGPU를 안정적으로 지원하지 않는다면 무리하게 전체 렌더러를 변경하지 않는다.

최우선은:

**게임이 안정적으로 실행되는 것**

이다.

모바일 Safari/iPhone에서도 깨지지 않아야 한다.

---

# 6. 3D 비주얼 목표

단순한 저폴리 3D가 아니다.

목표 스타일:

## "Stylized Cinematic Historical Fantasy"

특징:

- 고품질 stylized 3D
- 동양풍 고대 중국/삼국 시대 분위기
- PBR 재질
- 자연스러운 광원
- 부드러운 그림자
- 안개
- 환경광
- 시간대 변화
- 바람 효과
- 물 효과
- 불/연기
- 나뭇잎 흔들림
- 작은 환경 디테일

단, 실제 역사적 인물/지역을 그대로 복제하는 것이 아니라 게임용으로 재해석한다.

---

# 7. 카메라

기존 2.5D 느낌을 완전히 버리지 않는다.

기본:

3인칭 쿼터뷰

카메라:

- 플레이어 추적
- 마우스/터치 회전
- 줌
- 부드러운 카메라 이동
- 장애물 자동 회피
- 전투 시 카메라 거리 조절

추가:

### 사진 모드

플레이어가 원하는 각도로 카메라를 움직일 수 있도록 한다.

---

# 8. 플레이어

플레이어를 실제 GLB 캐릭터로 변경한다.

필수 애니메이션:

- idle
- walk
- run
- sprint
- attack
- hit
- dodge
- death
- interaction

AnimationMixer를 사용한다.

애니메이션 이름이 다르면 자동으로 매핑하는 시스템을 만든다.

---

# 9. 캐릭터 시스템

캐릭터마다 다음 데이터를 가진다.

```js
{
  id,
  name,
  faction,
  level,
  rarity,
  stats,
  skills,
  weapon,
  personality,
  location,
  relationship,
  questHooks
}
```

처음부터 수백 명의 실제 캐릭터 데이터를 만들지 않는다.

우선 대표 캐릭터 5~10명으로 시스템을 완성한다.

이후 데이터만 추가할 수 있는 구조로 만든다.

---

# 10. 새로운 핵심 소재

기존 삼국지 게임처럼 단순히:

전투 → 장수 수집 → 성 점령

만 반복하지 않는다.

saga-go의 차별점:

# "걷다가 사건을 만난다"

를 핵심 시스템으로 만든다.

---

# 11. 동적 사건 시스템

맵을 돌아다니면 랜덤 이벤트가 발생한다.

예:

- 길에서 상인을 만남
- 도적에게 습격당함
- 부상당한 병사를 발견
- 떠돌이 장수를 발견
- 마을에서 도움 요청
- 수상한 여행자
- 사라진 아이
- 폐허 발견
- 고대 유적 발견
- 보물 지도 발견
- 야생동물 조우
- 밤에 귀신 이야기 이벤트
- 비밀 통로 발견
- 전쟁 소식을 듣게 됨
- 적군 정찰병 발견
- 산적 두목 발견
- 희귀 약초 발견
- 낚시터 발견
- 숨겨진 동굴 발견

이벤트는 확률 기반으로 한다.

---

# 12. 발견 시스템

맵 곳곳에:

- ? 장소
- 숨겨진 장소
- 보물
- 유적
- NPC
- 희귀 아이템
- 비밀 통로
- 고대 비문
- 역사 기록

등을 배치한다.

플레이어가 직접 발견해야 한다.

---

# 13. "삼국지 도감" 확장

현재 도감을 적극 활용한다.

도감:

### 인물
장수 / 군주 / 책사 / 상인 / 민간인

### 지역
도시 / 마을 / 산 / 강 / 성 / 유적

### 사건
전투 / 사건 / 전설 / 소문

### 아이템
무기 / 방어구 / 보물 / 서적

### 생물
말 / 호랑이 / 늑대 / 사슴 / 새 / 기타

### 역사
발견한 기록을 저장

도감 완성률을 표시한다.

---

# 14. 살아있는 세계

맵이 단순 배경이 되지 않게 한다.

NPC가:

- 걷는다
- 대화한다
- 장사를 한다
- 이동한다
- 일을 한다
- 밤에 집으로 돌아간다
- 비가 오면 이동한다
- 전투가 발생하면 도망간다

등의 행동을 한다.

단,

모든 NPC에 고비용 AI를 적용하지 않는다.

거리 기반 LOD AI를 사용한다.

---

# 15. NPC LOD

플레이어와 거리:

0~20m:
고품질 AI

20~50m:
단순 AI

50m 이상:
저비용 업데이트

100m 이상:
시뮬레이션 중지

필요하면 화면에 다시 들어왔을 때 상태를 복원한다.

---

# 16. 대규모 NPC 최적화

동일한 NPC/환경 오브젝트는 InstancedMesh를 적극 활용한다.

대상:

- 나무
- 돌
- 풀
- 꽃
- 횃불
- 건물 장식
- 반복되는 NPC 모델

draw call을 줄인다.

Three.js InstancedMesh는 동일 geometry/material의 여러 객체를 효율적으로 렌더링하기 위한 기능이므로 환경 오브젝트에 적극 사용한다.

---

# 17. 맵 확장

현재 맵이 좁다면 단순히 맵 하나를 거대하게 만들지 않는다.

월드 타일 구조를 만든다.

예:

```text
World
 ├─ Wei
 ├─ Shu
 ├─ Wu
 ├─ Neutral
 └─ Wilderness
```

각 지역을 tile/chunk로 나눈다.

예:

```text
chunk_00_00
chunk_00_01
chunk_00_02
...
```

플레이어 주변 chunk만 활성화한다.

---

# 18. 스트리밍

플레이어 주변:

1 ring:
고품질

2 ring:
저품질

3 ring:
비활성

구조:

```text
ACTIVE
 ↓
LOW
 ↓
UNLOAD
```

맵 전체를 한 번에 메모리에 올리지 않는다.

---

# 19. 자연환경

맵에 다음 요소를 추가한다.

### 숲

- 나무
- 풀
- 꽃
- 버섯
- 바위
- 낙엽
- 동물

### 강

- 물
- 물결
- 다리
- 배
- 낚시
- 물고기

### 산

- 절벽
- 동굴
- 폭포
- 사찰
- 유적

### 평야

- 논
- 농부
- 말
- 마을
- 길

### 도시

- 성벽
- 시장
- 무기상
- 여관
- 병영
- 관청

---

# 20. 시간 시스템

Day/Night Cycle 추가.

예:

```text
05:00 Dawn
07:00 Morning
12:00 Noon
18:00 Sunset
21:00 Night
02:00 Deep Night
```

시간에 따라:

- 조명
- 하늘
- NPC 행동
- 몬스터
- 이벤트
- 상점
- 퀘스트

가 달라진다.

---

# 21. 날씨 시스템

랜덤 날씨:

- 맑음
- 흐림
- 비
- 폭우
- 안개
- 눈

날씨가 단순한 장식이 아니게 한다.

예:

비:

- 강물 수위 변화
- NPC 행동 변화
- 시야 감소
- 특정 이벤트 발생

안개:

- 희귀 장소 등장 확률 증가

밤:

- 특정 NPC 등장

---

# 22. 전투 시스템

전투는 기존 시스템이 있다면 최대한 재사용한다.

새로운 3D 전투:

- 기본 공격
- 강공격
- 스킬
- 회피
- 방어
- 타겟팅
- 락온
- 콤보
- 상태이상
- 파티원 지원

단,

처음부터 복잡한 액션 RPG를 만들지 않는다.

MVP:

```text
Move
Attack
Skill
Dodge
Enemy AI
Damage
Death
Reward
```

먼저 이것만 완성한다.

---

# 23. 전투 중 카메라

전투 시작:

카메라가 약간 줌인

적 발견:

타겟 강조

공격:

카메라 약간 흔들림

강한 스킬:

짧은 hit-stop

최종 공격:

간단한 연출

과도한 이펙트는 피한다.

---

# 24. 스킬 연출

화려하지만 모바일에서도 돌아가야 한다.

예:

- 검기
- 불꽃
- 번개
- 바람
- 화살
- 기공
- 범위 공격

Particle Pool을 사용한다.

매번 particle을 새로 생성하지 않는다.

---

# 25. UI 리뉴얼

현재 UI를 유지하면서 현대적인 게임 UI로 개선한다.

스타일:

- 반투명 패널
- glass effect
- subtle shadow
- gold accent
- dark blue/black background
- 역사 RPG 느낌

모바일:

- 큰 터치 영역
- 하단 HUD
- 원형 조작 버튼
- 스킬 버튼
- 미니맵

PC:

- 키보드
- 마우스
- 단축키

둘 다 지원한다.

---

# 26. 모바일 우선

iPhone Safari에서 반드시 정상 작동해야 한다.

지원:

- 터치 이동
- 드래그 카메라
- pinch zoom
- 탭
- 길게 누르기
- 모바일 HUD

화면 방향도 고려한다.

---

# 27. 모바일 그래픽 품질 자동 조절

기기 성능을 자동 감지한다.

### HIGH

- 그림자
- 후처리
- 높은 draw distance
- 고품질 텍스처

### MEDIUM

- 그림자 낮춤
- 효과 일부 제거

### LOW

- 그림자 제거
- particle 감소
- draw distance 감소
- NPC 수 감소

FPS가 떨어지면 자동으로 품질을 낮춘다.

---

# 28. 성능 목표

Desktop:

60 FPS 목표

Mobile:

30~60 FPS 목표

우선순위:

1. 안정성
2. FPS
3. 로딩
4. 그래픽 품질

---

# 29. 3D Asset 최적화

GLB 기준:

- Draco
- Meshopt
- KTX2/Basis
- WebP/AVIF
- texture atlas
- LOD

활용.

큰 텍스처를 무조건 사용하지 않는다.

모바일에서는 texture resolution을 자동 조절한다.

---

# 30. Asset Loading

필요한 모델만 lazy load한다.

예:

```text
Boot
 ↓
Player
 ↓
Nearby World
 ↓
NPC
 ↓
Events
 ↓
Far Assets
```

처음부터 모든 GLB를 로드하지 않는다.

---

# 31. Loading Manager

3D 로딩 상태를 표시한다.

예:

```text
사가고
세상을 불러오는 중...

████████░░ 82%

장안의 시장을 준비하고 있습니다.
```

---

# 32. 캐시

가능하면:

Cache API
IndexedDB

를 활용하여 재방문 시 로딩을 줄인다.

단, 기존 프로젝트에 이미 캐시 구조가 있다면 그것을 우선 사용한다.

---

# 33. 새로운 재미 요소

## ① 소문 시스템

NPC에게서 소문을 듣는다.

예:

"서쪽 산에서 이상한 빛이 보였다고 합니다."

지도에 정확한 위치가 표시되지 않는다.

플레이어가 직접 찾아간다.

---

# 34. ② 관계 시스템

NPC와 관계를 쌓는다.

```text
낯선 사람
 ↓
아는 사람
 ↓
친구
 ↓
동료
 ↓
신뢰
```

관계에 따라:

- 퀘스트
- 아이템
- 정보
- 동료 영입

이 달라진다.

---

# 35. ③ 선택형 사건

예:

도적에게 공격받는 상인을 발견.

선택:

A. 구한다
B. 지나간다
C. 도적을 추적한다

결과가 달라진다.

---

# 36. ④ 역사 기록 시스템

플레이어가 발견한 사건을 "사관"에 기록한다.

예:

```text
[발견]

관도 인근에서 병사들의 흔적을 발견했다.

새로운 기록:
관도 전투의 흔적
```

현재 "사관 / 기록" 시스템과 연결한다.

---

# 37. ⑤ 계절 시스템

가능하면 추가:

봄
여름
가을
겨울

계절에 따라:

- 식물
- 날씨
- NPC 의상
- 이벤트
- 지역 분위기

변경.

단, MVP 이후 구현한다.

---

# 38. ⑥ 숨겨진 보물

보물은 단순 랜덤 아이템이 아니다.

단서:

NPC 이야기
↓
낡은 문서
↓
지도
↓
지역 탐색
↓
숨겨진 장소
↓
보물

이런 탐험 루프를 만든다.

---

# 39. ⑦ 동물 생태계

동물을 단순 NPC처럼 세우지 않는다.

예:

사슴:

풀을 먹음
→ 플레이어 접근
→ 도망

늑대:

무리 이동
→ 플레이어 감지
→ 추적

새:

나무
→ 날아감

동물은 플레이어가 발견하는 재미를 제공한다.

---

# 40. 게임 핵심 루프

최종 게임 루프:

```text
탐험
 ↓
발견
 ↓
소문
 ↓
사건
 ↓
선택
 ↓
전투/대화
 ↓
보상
 ↓
도감/기록
 ↓
새로운 지역
 ↓
다시 탐험
```

"전투만 반복하는 삼국지 게임"이 되지 않도록 한다.

---

# 41. 그래픽 연출

다음 요소를 추가한다.

- Ambient lighting
- Fog
- Soft shadows
- Sky
- Sun light
- Moon light
- Bloom은 필요할 때만
- Depth of field는 사진 모드 중심
- Water shader
- Wind shader
- Grass movement
- Particle
- Fire
- Smoke
- Dust

단, 모바일에서는 자동으로 축소한다.

---

# 42. 최종 UI 메뉴

현재 메뉴를 유지하면서 다음처럼 발전시킨다.

```text
🗺️ 세계지도
⚔️ 전투
📋 사명
🎒 행낭
👥 천거
📖 도감
🔮 사관
📜 기록
🧭 발견
🤝 관계
```

---

# 43. 미니맵

현재 지도 시스템과 연결한다.

표시:

- 플레이어
- NPC
- 퀘스트
- 발견 지역
- 마을
- 도시
- 위험지역

단,

모든 것을 미리 표시하지 않는다.

탐험으로 밝혀지는 구조를 사용한다.

---

# 44. 세이브

기존 저장 시스템을 유지한다.

추가 데이터:

```js
player
world
discoveries
quests
relationships
codex
inventory
settings
```

기존 save format을 깨지 않는다.

버전 필드를 추가할 수 있다.

```js
saveVersion: 2
```

---

# 45. 데이터 중심 구조

캐릭터/아이템/퀘스트/이벤트는 코드에 하드코딩하지 않는다.

가능하면:

```text
data/
 ├─ characters.json
 ├─ items.json
 ├─ quests.json
 ├─ events.json
 ├─ locations.json
 └─ creatures.json
```

형태로 분리한다.

단, 현재 프로젝트에 이미 적합한 데이터 구조가 있다면 기존 구조를 유지한다.

---

# 46. 테스트용 콘텐츠

처음부터 전체 삼국을 만들지 않는다.

MVP 테스트 지역 하나만 만든다.

## 테스트 지역

"하북의 작은 마을"

구성:

- 작은 마을
- 숲
- 강
- 다리
- 산
- 동굴
- 폐허
- 농지
- 길
- NPC 10명
- 동물 5종
- 적 3종
- 이벤트 10개
- 숨겨진 장소 3개

이 지역이 완성된 후 확장한다.

---

# 47. 대표 캐릭터

MVP에서는 가상의 캐릭터를 우선 사용해도 된다.

예:

- 떠돌이 무사
- 마을 촌장
- 상인
- 노인
- 젊은 병사
- 책사
- 도적 두목
- 약초꾼
- 대장장이
- 수수께끼의 여행자

이후 실제 역사 인물 데이터로 확장할 수 있는 구조로 만든다.

---

# 48. AI 생성 Asset 고려

AI로 만든 GLB를 추가하기 쉽도록 asset registry를 만든다.

예:

```js
const assets = {
  player: '/assets/models/player.glb',
  merchant: '/assets/models/merchant.glb',
  tree: '/assets/models/tree.glb',
  house: '/assets/models/house.glb'
};
```

나중에 GLB 교체만으로 품질을 높일 수 있어야 한다.

---

# 49. fallback

GLB가 없으면 게임이 깨지지 않아야 한다.

fallback:

```text
GLB
 ↓ 실패
low-poly placeholder
 ↓ 실패
simple primitive
```

예:

캐릭터 → capsule

나무 → cylinder + sphere

집 → box

---

# 50. 기존 2.5D 모드 유지

중요.

기존 2.5D를 삭제하지 않는다.

메뉴:

```text
2.5D
3D
```

3D가 실패하거나 성능이 낮으면 2.5D로 돌아갈 수 있어야 한다.

---

# 51. 개발 단계

## PHASE 1

현재 구조 분석

↓

## PHASE 2

3D renderer 기반 구축

↓

## PHASE 3

플레이어 GLB

↓

## PHASE 4

3D 카메라

↓

## PHASE 5

3D 테스트 맵

↓

## PHASE 6

NPC

↓

## PHASE 7

동물

↓

## PHASE 8

동적 이벤트

↓

## PHASE 9

전투

↓

## PHASE 10

시간/날씨

↓

## PHASE 11

발견/도감/기록

↓

## PHASE 12

최적화

↓

## PHASE 13

모바일 최적화

---

# 52. Claude Code 작업 규칙

한 번에 모든 기능을 완성하려 하지 않는다.

각 단계가 끝날 때:

1. 빌드
2. 실행
3. 콘솔 오류 확인
4. 기존 기능 확인
5. 수정
6. 다음 단계

순서로 진행한다.

---

# 53. 코드 작성 규칙

기존 코드 스타일을 따른다.

함수 하나를 만들기 전에 기존에 같은 기능이 있는지 검색한다.

중복 유틸리티 생성 금지.

예:

이미:

```js
loadAsset()
```

가 있다면

```js
loadGLB()
```

를 별도로 만들기 전에 기존 함수를 확장할 수 있는지 검토한다.

---

# 54. 성능 체크

개발 중 다음을 확인한다.

- FPS
- draw calls
- triangles
- texture memory
- JS heap
- loaded assets
- active NPC
- active particles

가능하면 개발 모드에서 간단한 디버그 HUD를 제공한다.

```text
FPS 58
DRAW 92
TRI 180K
NPC 12
MEM 210MB
```

---

# 55. 에러 처리

다음 오류가 있어도 게임 전체가 죽지 않도록 한다.

- GLB 로딩 실패
- 텍스처 로딩 실패
- NPC 데이터 오류
- 이벤트 데이터 오류
- 저장 데이터 오류

console.error만 남기고 해당 객체는 fallback 처리한다.

---

# 56. 빌드/배포

현재 GitHub Pages 배포 구조를 유지한다.

중요:

절대 GitHub Pages 경로를 깨뜨리지 않는다.

현재:

```text
/swbins/saga-go/
```

경로를 유지한다.

asset URL도 상대경로 또는 base URL을 안전하게 처리한다.

---

# 57. 완료 기준

최소한 다음이 실제로 동작해야 한다.

### 3D

- [ ] 3D 맵
- [ ] 플레이어 이동
- [ ] 카메라
- [ ] GLB 캐릭터
- [ ] 애니메이션
- [ ] NPC
- [ ] 동물
- [ ] 자연환경
- [ ] 조명
- [ ] 그림자
- [ ] 안개

### 게임

- [ ] 탐험
- [ ] 발견
- [ ] NPC 대화
- [ ] 이벤트
- [ ] 퀘스트
- [ ] 전투
- [ ] 아이템
- [ ] 도감
- [ ] 기록
- [ ] 저장

### 현대적 요소

- [ ] Day/Night
- [ ] Weather
- [ ] Dynamic Event
- [ ] Relationship
- [ ] Rumor
- [ ] Hidden Location
- [ ] Treasure
- [ ] Photo Mode

### 성능

- [ ] Lazy Loading
- [ ] LOD
- [ ] Instancing
- [ ] Asset compression
- [ ] Mobile quality scaling
- [ ] 2.5D fallback

---

# 58. 매우 중요한 개발 우선순위

기능을 많이 추가하는 것보다 다음 순서를 반드시 우선한다.

```text
현재 기능 보존
↓
3D 기반 안정화
↓
플레이어 이동
↓
카메라
↓
고품질 환경
↓
NPC
↓
탐험
↓
동적 사건
↓
전투
↓
콘텐츠 확장
↓
최적화
```

---

# 59. Claude Code 응답 절약

작업 중 사용자에게 장문의 설명을 출력하지 않는다.

각 단계 완료 후 다음 형식으로만 보고한다.

```text
[완료]
- 수정 파일: N개
- 추가 파일: N개
- 주요 변경: ...
- 테스트: PASS/FAIL
- 다음 단계: ...
```

코드 전체를 응답으로 출력하지 않는다.

변경된 파일만 요약한다.

---

# 60. 중요 — 기존 프로젝트 우선

새로운 구조가 더 좋아 보여도 현재 구조를 무조건 버리지 않는다.

반드시:

```text
현재 코드
+
필요한 최소 변경
=
3D saga-go
```

방식으로 개발한다.

---

# 61. 첫 작업

지금 즉시 전체 개발을 시작하지 말고 먼저:

1. 현재 프로젝트 구조 조사
2. 렌더링 방식 확인
3. package.json 확인
4. 현재 지도 구현 확인
5. 플레이어 구현 확인
6. UI 구현 확인
7. 3D 전환에 필요한 핵심 파일 5~10개 선정

까지만 한다.

그 다음 최소 변경 방식으로 PHASE 1부터 시작한다.

---

# 62. 절대 원칙

이 프로젝트의 최종 방향은:

> "삼국지를 소재로 한 웹 게임"

이 아니라

> **"플레이어가 직접 고대 중국 세계를 걸으며 사람과 사건을 발견하는 살아있는 3D 역사 세계"**

이다.

전투는 게임의 일부일 뿐이다.

탐험,
발견,
소문,
관계,
선택,
기록,
성장

이 핵심이다.

그리고 모든 구현은:

**고품질 + 모바일 최적화 + 빠른 로딩 + 적은 토큰 + 기존 코드 재사용**

을 동시에 만족해야 한다.

---
---

# 부록 A — 그래픽 대규모 업그레이드 (2026-08-27 추가)

> 사용자가 둘째 지시문을 넣었다(원본 파일 이름 `saga-go 3D graphics up.md`).
> 이 저장소는 폴더마다 **`PLAN.md` 한 벌**을 정본으로 두므로(커밋 `083354f`)
> 여기 부록으로 옮겨 담았다. 아래 41절은 **원문 그대로**다.
>
> ## 어디까지 왔나 (부록 기준)
>
> | 절 | 무엇 | 상태 |
> |---|---|---|
> | 3~11 · 14~15 · 19~21 · 25~33 · 38 | 3D 카메라·절차적 캐릭터·지형·자연물·조명·그림자·이펙트·LOD·인스턴싱·등급 | **본편 PHASE 1~13 에서 이미 다 했다** |
> | 17.1 Tone Mapping | 밝기 곡선 | **했다** — `js/post3d.js` (`NeutralToneMapping`) |
> | 17.2 · 18 Bloom | 강한 빛만 번진다 | **했다** — `js/post3d.js` (mip 내림-올림) |
> | 17.3 Vignette | 네 귀를 눌러 시선을 모은다 | **이미 있었다** — `css/style.css` 의 `#vignette` |
> | 17.4 Color Grading | 채도·색온도·검은 자리 | **했다** — `js/post3d.js` |
> | 17.5 Anti Aliasing | 계단 없애기 | **지켰다** — 렌더 타깃 `samples` 4/2/0 |
> | 29 품질 프리셋 resolution scale | 렌더 배율 1 / 0.85 | **했다** — `post3d` 의 `scale` |
> | 16 · 17.6 SSAO | 맞닿은 자리의 그늘 | **안 했다** — 씬을 한 번 더 그려야 한다. 따로 뗀 다음 단계 |
> | 17.7 Depth of Field | 초점 흐림 | **안 넣는다** — 이 판의 카메라는 멀리서 내려다보므로 초점 밖이 없다. 17절의 "게임 화면이 선명해야 한다" 와 부딪힌다 |
> | 12 물 | 물결·Fresnel·반사 | **안 했다** — 수면은 있으나 단색 평면(`world3d.js` 의 `pmat(...,'water')`) |
> | 13 하늘 | 그라데이션 돔·해·구름 | **안 했다** — 지금은 시각·천후로 색만 바뀌는 단색 배경(`scene.background`) |
> | 24 미니맵 | 3D 화면 안의 작은 지도 | **안 했다** — 2D 모드가 그 자리를 겸하고 있다 |
> | 22~23 UI | 유리판·버튼 상태 | **이미 있었다** — `css/style.css` 의 `.glass` 와 버튼 상태들 |
>
> 남은 것은 **물 · 하늘 · 미니맵 · SSAO** 넷이다.

## saga-go 그래픽 대규모 업그레이드 작업

대상 프로젝트:

https://smh8627-jpg.github.io/swbins/saga-go/

### 0. 최우선 원칙

현재 `saga-go` 프로젝트를 기반으로 그래픽 품질을 대폭 향상한다.

### 절대 조건

- 기존 게임 기능을 함부로 삭제하지 않는다.
- 기존 게임 로직을 최대한 유지한다.
- 기존 UI/게임플레이를 깨뜨리지 않는다.
- 기존 저장 데이터 구조를 가능하면 유지한다.
- 기존 프로젝트를 처음부터 다시 만드는 방식으로 접근하지 않는다.
- 반드시 현재 코드 구조를 먼저 분석한다.
- 작업 전에 실제 파일 구조와 렌더링 구조를 확인한다.
- 변경은 작은 단위로 진행한다.
- 각 단계마다 기존 기능이 정상 작동하는지 확인한다.

### 가장 중요한 제한

**외부 3D 에셋을 사용하지 않는다.**

금지:

- GLB
- GLTF
- FBX
- OBJ
- 외부 3D 모델
- 외부 캐릭터 모델
- 외부 텍스처에 의존하는 방식
- Blender 작업물을 새로 요구하는 방식

대신 모든 3D 비주얼은 코드로 생성한다.

사용 가능:

- Three.js Geometry
- BoxGeometry
- SphereGeometry
- CylinderGeometry
- ConeGeometry
- CapsuleGeometry
- PlaneGeometry
- ShapeGeometry
- ExtrudeGeometry
- InstancedMesh
- Line/LineSegments
- CanvasTexture
- SVG 기반 텍스처
- ShaderMaterial
- MeshStandardMaterial
- MeshPhysicalMaterial
- procedural texture
- 파티클
- 셰이더
- 조명
- 그림자
- 안개
- 후처리

---

## 1. 먼저 현재 프로젝트 분석

작업을 시작하기 전에 다음을 수행한다.

1. 전체 파일 구조 확인
2. HTML 구조 확인
3. JavaScript 모듈 확인
4. Three.js 사용 여부 확인
5. renderer 생성 위치 확인
6. scene 생성 위치 확인
7. camera 확인
8. animation loop 확인
9. 캐릭터 생성 코드 확인
10. 맵 생성 코드 확인
11. UI 코드 확인
12. 전투/이동 로직 확인
13. 저장 시스템 확인
14. 모바일 대응 확인

분석 결과를 간단히 내부적으로 정리한 후 구현한다.

**불필요하게 사용자에게 긴 분석 보고서를 출력하지 않는다.**

---

## 2. 목표

현재의 단순한 그래픽을 다음 수준으로 변경한다.

목표 스타일:

### "모바일 3D 판타지 어드벤처 + 동양 판타지 + 현대적인 캐주얼 RPG"

참고 방향:

- 현대 모바일 RPG
- Zelda 계열의 탐험감
- Genshin Impact의 공간감
- Diablo의 분위기 연출
- 캐주얼 모바일 RPG의 명확한 가독성

단,

**특정 게임의 그래픽이나 캐릭터를 복제하지 않는다.**

---

## 3. 2.5D에서 진짜 3D 공간감으로 확장

현재 `2.5D` 버튼이 존재한다.

이 기능을 제거하지 않는다.

대신:

### 2.5D 모드

- 현재 게임의 익숙한 시점 유지
- 약간의 카메라 회전
- 깊이감 강화
- 캐릭터와 지형의 높낮이 표현
- 그림자 적용

### 3D 모드

새로운 카메라 모드를 추가한다.

카메라:

- PerspectiveCamera
- 45~60도 정도의 전략 RPG 시점
- 부드러운 카메라 follow
- 마우스/터치 드래그 회전
- 줌
- 모바일에서는 제한된 회전
- 카메라 clipping 최적화

카메라 이동은 즉시 이동하지 말고 lerp/damping을 적용한다.

---

## 4. 코드로 만드는 3D 캐릭터

외부 모델을 사용하지 않고 캐릭터를 생성한다.

예:

머리:
SphereGeometry

몸:
CapsuleGeometry 또는 CylinderGeometry

팔:
CylinderGeometry

다리:
CylinderGeometry

무기:
BoxGeometry / CylinderGeometry / ConeGeometry

망토:
ShapeGeometry 또는 PlaneGeometry

장식:
SphereGeometry / TorusGeometry

캐릭터를 하나의 Group으로 묶는다.

예상 구조:

Character
├── body
├── head
├── hair
├── eyes
├── arms
├── legs
├── weapon
├── cape
└── shadow

---

## 5. 캐릭터 품질 향상

단순 도형처럼 보이지 않도록 한다.

다음 요소를 적용한다.

- bevel 느낌의 형태
- smooth shading
- 적절한 roughness
- metallic 값을 부분적으로 사용
- skin material
- cloth material
- metal material
- emissive material

얼굴에는 최소한:

- 눈
- 눈썹
- 머리카락
- 얼굴 방향

을 표현한다.

단순한 구 하나가 떠 있는 형태가 되지 않도록 한다.

---

## 6. 캐릭터 애니메이션

외부 animation 파일을 사용하지 않는다.

코드 기반 animation을 만든다.

### Idle

- 몸 미세한 상하 움직임
- 호흡
- 머리 미세 움직임

### Walk

- 양팔 swing
- 다리 교차 움직임
- 몸 bounce

### Run

- 팔 swing 증가
- 다리 swing 증가
- 몸 전진 기울기

### Attack

- 무기 뒤로 당김
- 몸 회전
- 빠른 전진
- 타격 순간 정지
- recoil

### Hit

- 몸 흔들림
- 뒤로 밀림

### Death

- 몸 회전
- 천천히 쓰러짐
- fade

---

## 7. 절차적 3D 맵 생성

외부 맵 에셋을 사용하지 않는다.

코드로 맵을 생성한다.

기본 구성:

- Terrain
- Grass
- Dirt
- Stone
- Water
- Mountain
- Tree
- Bush
- Rock
- Flower
- House
- Shrine
- Bridge
- Road

---

## 8. 지형

단순 Plane 하나만 사용하지 않는다.

Grid 기반 procedural terrain을 만든다.

높이값을 noise 또는 sin/cos 기반으로 생성한다.

예:

height = noise(x,z)

또는 여러 octave를 조합한다.

높이 차이가 자연스럽게 보이도록 한다.

구역:

- 평지
- 언덕
- 계곡
- 작은 산
- 강
- 호수

---

## 9. 자연환경

### 나무

코드로 생성:

Trunk:
CylinderGeometry

Leaves:
여러 SphereGeometry 또는 ConeGeometry

나무마다:

- 높이 랜덤
- 잎 크기 랜덤
- 가지 방향 랜덤
- 색상 약간 랜덤

InstancedMesh를 사용해서 대량 배치한다.

---

## 10. 바위

여러 개의 geometry를 합성해서 만든다.

각 바위:

- 크기 랜덤
- 회전 랜덤
- 색상 랜덤
- roughness 랜덤

---

## 11. 풀

많은 풀을 개별 Mesh로 만들지 않는다.

InstancedMesh를 사용한다.

거리별로 density를 줄인다.

카메라에서 멀어질수록:

- 풀 개수 감소
- 그림자 감소
- 디테일 감소

---

## 12. 물

Water를 코드로 만든다.

PlaneGeometry + ShaderMaterial 사용.

효과:

- 물결
- 반사 느낌
- 투명도
- Fresnel
- 작은 파동

과도한 GPU 사용은 피한다.

---

## 13. 하늘

단순 단색 배경을 제거한다.

절차적으로:

- Sky gradient
- Sun
- Clouds
- Fog

를 구현한다.

시간대 시스템을 추가할 수 있도록 구조를 만든다.

### Day

밝은 하늘

### Sunset

주황색 광원

### Night

어두운 하늘 + 달빛

---

## 14. 조명 시스템

그래픽 품질 향상에서 가장 중요한 부분 중 하나다.

다음 조명을 조합한다.

Ambient/환경광

DirectionalLight

PointLight

HemisphereLight가 필요하면 사용한다.

DirectionalLight는 태양광처럼 사용한다.

캐릭터 아래에는 soft shadow를 표현한다.

---

## 15. 그림자

가능하면 shadow map을 사용한다.

단 모바일 성능을 고려한다.

기본:

shadowMap.enabled = true

shadow map 해상도는 기기 성능에 따라 조절한다.

고성능:

2048

일반:

1024

저사양:

512

---

## 16. AO 느낌 구현

외부 에셋 없이 코드로 AO 느낌을 강화한다.

가능하면 SSAO 계열 후처리를 사용한다.

단,

모바일 저사양에서는 자동 비활성화한다.

---

## 17. 후처리

그래픽 품질을 크게 올리기 위해 후처리를 추가한다.

우선순위:

1. Tone Mapping
2. Bloom
3. Vignette
4. Color Grading
5. Anti Aliasing
6. SSAO
7. Depth of Field

모든 효과를 동시에 강하게 적용하지 않는다.

게임 화면이 선명해야 한다.

---

## 18. Bloom

강한 빛에만 Bloom이 발생하도록 한다.

적용 대상:

- 스킬
- 마법
- 보물
- 신성한 오브젝트
- 포털
- 특수 이펙트

일반 캐릭터와 맵에는 과도한 bloom을 적용하지 않는다.

---

## 19. 스킬 이펙트

게임의 그래픽 체감 품질을 크게 높이는 핵심이다.

외부 에셋 없이 코드로 생성한다.

### 검 공격

- slash arc
- trail
- particles
- impact ring

### 불

- sphere
- additive material
- particle
- noise

### 번개

LineSegments를 사용해서 번개 형태 생성

### 얼음

Cone/Sphere 조합 + emissive

### 회복

Particle + ring + glow

---

## 20. 전투 이펙트

타격 순간 다음 효과를 넣는다.

- impact flash
- particle burst
- shockwave
- camera shake
- hit stop
- floating damage number

단,

과도한 화면 흔들림은 금지한다.

---

## 21. 파티클 시스템

간단한 custom particle system을 만든다.

Particle:

- position
- velocity
- life
- size
- opacity
- color

ParticlePool을 사용한다.

매번 new/delete하지 않는다.

Object Pool을 사용한다.

---

## 22. UI 그래픽 개선

현재 UI 구조를 유지하되 스타일을 현대적으로 변경한다.

목표:

- 반투명 glass panel
- subtle blur 느낌
- 둥근 모서리
- gold accent
- dark fantasy panel
- 명확한 typography
- 아이콘 중심 UI

현재:

사명
행낭
천거
도감
사관
기록

메뉴는 유지한다.

---

## 23. 버튼

버튼에:

- hover
- pressed
- selected
- disabled

상태를 만든다.

모바일 터치에서도 피드백이 느껴지도록 한다.

---

## 24. 미니맵

현재 맵 시스템과 연동 가능한 구조로 만든다.

미니맵:

- 플레이어
- NPC
- 적
- 퀘스트
- 주요 장소

를 표시한다.

---

## 25. 원근감

맵이 평면처럼 보이지 않게 한다.

다음 요소를 사용한다.

- Fog
- Perspective Camera
- Shadow
- Height variation
- Lighting
- Atmospheric particles

---

## 26. 거리별 LOD

성능 때문에 모든 오브젝트를 동일하게 렌더링하지 않는다.

### 가까움

고품질

### 중간

중간 품질

### 멂

단순 geometry

### 매우 멂

삭제/비활성화

---

## 27. Instancing

나무, 풀, 바위, 꽃 등 반복되는 오브젝트는 반드시 InstancedMesh를 우선 검토한다.

목표:

수백~수천개의 자연물도 가능한 한 적은 draw call로 렌더링한다.

---

## 28. 모바일 최적화

이 프로젝트는 모바일 브라우저에서도 실행된다.

따라서 데스크톱 성능만 보고 개발하지 않는다.

기기 성능을 측정해서:

HIGH

MEDIUM

LOW

세 단계로 자동 설정한다.

---

## 29. 그래픽 품질 프리셋

Settings에 다음을 만든다.

### HIGH

- shadows ON
- bloom ON
- SSAO ON
- particles HIGH
- grass HIGH
- resolution scale 1.0

### MEDIUM

- shadows ON
- bloom ON
- SSAO OFF
- particles MEDIUM
- grass MEDIUM
- resolution scale 0.85

### LOW

- shadows OFF
- bloom OFF
- SSAO OFF
- particles LOW
- grass LOW
- resolution scale 0.7

---

## 30. 성능 자동 조절

FPS를 측정한다.

60 FPS 이상:
품질 유지

45~60:
현재 유지

30~45:
일부 효과 감소

30 이하:
자동 LOW 설정

사용자가 수동으로 품질을 고정할 수도 있어야 한다.

---

## 31. 렌더링 최적화

절대 다음과 같은 코드를 대량으로 만들지 않는다.

```js
new Mesh(...)
```

매 프레임

또는

```js
new Geometry(...)
```

매 프레임

또는

```js
new Material(...)
```

매 프레임

금지.

Geometry와 Material은 최대한 공유한다.

Particle도 Pool을 사용한다.

---

## 32. Garbage Collection 최소화

게임 loop에서:

- 배열 생성 최소화
- 객체 생성 최소화
- Vector3 재사용
- Quaternion 재사용
- Color 재사용

한다.

---

## 33. 렌더 루프

animate/render loop를 점검한다.

불필요한 계산을 매 프레임 하지 않는다.

예:

맵 장식 배치

AI 탐색

LOD 계산

퀘스트 계산

등은 적절한 interval 또는 이벤트 기반으로 변경한다.

---

## 34. 카메라 연출

탐험 시:

부드러운 follow

전투 시:

약간 확대

보스 등장:

cinematic zoom

강력한 스킬:

짧은 camera shake

보스 사망:

짧은 slow motion 느낌

단 모바일에서 멀미를 유발할 정도로 과도한 움직임은 금지한다.

---

## 35. 환경 애니메이션

맵이 정적인 느낌이 들지 않도록 한다.

코드로:

- 나무 흔들림
- 풀 흔들림
- 물 움직임
- 먼지
- 작은 반딧불
- 새/나비 같은 간단한 파티클

을 추가한다.

외부 모델을 사용하지 않는다.

---

## 36. 분위기 연출

게임 시작 시:

짧은 카메라 이동

맵 진입:

fade

퀘스트 지역:

빛나는 marker

보물:

emissive + particle

희귀 장소:

fog + particles + light

등을 사용한다.

---

## 37. 색감

기본 팔레트는:

- 자연색
- 짙은 녹색
- 청록
- 따뜻한 금색
- 어두운 남색

을 중심으로 한다.

하지만 전체 화면이 너무 어둡거나 채도가 과도하게 높아지지 않게 한다.

---

## 38. 현재 게임성 유지

다음 요소가 있다면 절대 삭제하지 않는다.

- 이동
- 퀘스트
- NPC
- 전투
- 인벤토리
- 도감
- 기록
- 사관
- 천거
- 저장
- 모바일 UI

그래픽 업그레이드 때문에 게임 기능이 사라지면 실패다.

---

## 39. 토큰 절약 최우선

Claude Code 작업 중 토큰을 최대한 절약한다.

### 금지

전체 파일을 매번 출력하지 않는다.

전체 프로젝트를 반복해서 분석하지 않는다.

이미 분석한 파일을 다시 읽지 않는다.

불필요한 설명을 길게 출력하지 않는다.

### 작업 방식

1. 구조 분석
2. 필요한 파일만 읽기
3. 작은 수정
4. 테스트
5. 다음 수정

으로 진행한다.

가능하면 `grep`, `rg`, 파일 검색 등으로 필요한 부분만 확인한다.

---

## 40. 단계별 구현

한 번에 모든 것을 구현하지 않는다.

### Phase 1

렌더러/카메라/조명 개선

↓

### Phase 2

절차적 3D 캐릭터

↓

### Phase 3

지형

↓

### Phase 4

나무/풀/바위/환경

↓

### Phase 5

그림자

↓

### Phase 6

파티클

↓

### Phase 7

스킬 이펙트

↓

### Phase 8

후처리

↓

### Phase 9

카메라 연출

↓

### Phase 10

모바일 최적화

---

## 41. 완료 조건

최종적으로 현재 `saga-go`가 다음처럼 보여야 한다.

기존:

단순한 웹 게임 그래픽

↓

목표:

**모바일 3D RPG처럼 보이는 화면**

특히 첫 화면에서 다음이 느껴져야 한다.

- 입체적인 지형
- 자연스러운 그림자
- 3D 캐릭터
- 살아 움직이는 환경
- 스킬 이펙트
- 빛과 안개
- 깊이감
- 현대적인 UI
- 부드러운 카메라

단, 이 모든 것을 **외부 3D 에셋 없이 코드로 구현**한다.

---

## Claude Code 실행 규칙

작업 시작 전에 반드시 현재 프로젝트를 분석한다.

그리고 바로 전체 코드를 갈아엎지 않는다.

각 Phase별로 구현한다.

각 단계 완료 후:

- 기존 기능 확인
- console error 확인
- rendering error 확인
- mobile layout 확인
- FPS 확인

후 다음 단계로 넘어간다.

**가장 중요한 것은 "예쁜 화면"과 "기존 게임 기능 유지"를 동시에 달성하는 것이다.**

추가로 필요하지 않은 dependency를 설치하지 않는다.

기존 Three.js가 있다면 최대한 기존 버전을 활용한다.

단, 현재 Three.js 버전이 너무 오래되어 필요한 그래픽 기능을 제대로 사용할 수 없다면 현재 구조를 분석한 후 최소한의 버전 업데이트를 검토한다.

Three.js의 최신 후처리 구조에서는 RenderPipeline/WebGPU 계열도 사용할 수 있지만, 이 프로젝트는 모바일 브라우저 호환성이 중요하므로 **WebGL 기반 fallback을 반드시 유지한다.** Three.js 공식 문서에서도 WebGL 후처리와 WebGPU 후처리를 별도로 제공하고 있으므로 현재 프로젝트 상황에 맞춰 선택한다.

최종적으로 기존 기능을 깨뜨리지 않고 그래픽 품질을 단계적으로 크게 향상시킨다.
