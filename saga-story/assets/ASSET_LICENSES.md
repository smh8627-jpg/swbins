# 에셋 출처와 라이선스 (saga-story)

`PLAN.md` 부록("코드로 그리지 말고 에셋으로")이 시킨 대로, 이 폴더에 넣은
**바깥에서 가져온 에셋**의 출처와 라이선스를 여기 한곳에 적는다.
**여기 없는 파일은 이 폴더에 두지 않는다.**

이 저장소는 공개다(<https://github.com/smh8627-jpg/swbins>). 그래서 재배포가
허용되지 않는 에셋은 애초에 받지 않는다.

---

## Quaternius — 저지대 다각형(low-poly) 묶음

| 항목 | |
|---|---|
| **만든 이** | Quaternius (<https://quaternius.com>) |
| **라이선스** | **CC0 1.0 Universal** (퍼블릭 도메인 헌정) |
| **저작자 표시** | 필요 없다. 그래도 적어 둔다 |
| **재배포** | 허용된다 (CC0 는 조건이 없다) |
| **받은 곳** | `saga-forest/assets/models/nature/` 에 이미 받아 둔 것을 그대로 복사했다
  (같은 CC0 라이선스이므로 재배포에 문제 없다 — 근거는 그쪽
  `ASSET_LICENSES.md` 와 `saga-go` 쪽 원본 확인 기록) |

### 넣은 파일 — PLAN 36절 Phase 2 (지형지물)

`models/nature/` — 사냥터 배경(`side-view3d.js`)의 나무·바위·먼 산이 이 GLB 로 선다.
그 전까지는 도형(원뿔·구)이었다.

| 파일 | 쓰이는 곳 |
|---|---|
| `CommonTree_1·2·3.glb` | 오림 숲(forest) 사냥터 — 가까운 나무 |
| `PineTree_1·2.glb` | 오림 숲(forest) 사냥터 — 먼 나무 |
| `Rock_1·2·3.glb` | 한중 굴혈(cave) 사냥터 — 바닥·천장 바위(종유석 자리) |
| `Mountain_1·2.glb` | 허창 들판(field)·호로곡(fire) 사냥터 — 먼 언덕 |

**아직 안 채운 것** — 불타는 골짜기(fire)의 불길·불티는 그대로 절차적 이펙트다
(모델이 아니라 색·투명도로 흔들리는 연출이라 애초에 "지형지물"이 아니다).

### 넣은 파일 — PLAN 36절 Phase 2 (사람·짐승)

`models/people/regular/` — 주인공·사람 형 적이 이 GLB 로 선다(몸+옷+머리를 한
뼈대에 묶는 조합형, `js/asset3d.js` 의 `HERO_RECIPES`). saga-forest·saga-dungeon
이 이미 쓰는 그 창고에서 **실제로 쓰는 조합 넉 줄(남/여 × 평민/사냥꾼)이 필요로
하는 파일만** 추려 복사했다(전체 people/regular 폴더의 27MB가 아니라 필요한
낱장만) — 몸(Superhero_Male/Female_FullBody) · 옷(Male/Female_Peasant,
Male/Female_Ranger) · 머리(Hair_Buzzed·Long·Buns·SimpleParted)와 그 텍스처.
`models/anim/UAL1_Standard.glb` — 몸짓(걷기·맞음·가만있기) 클립, 넷이 전부 같은
뼈대라 옮겨 입히기 없이 그대로 물린다. `models/animals/` — 짐승 형 적(들개·
코끼리병)의 대역으로 saga-dungeon 의 Wolf.glb·Cow.glb 를 그대로 복사했다
(코끼리는 CC0 로 못 찾아 몸집 큰 소로 대신한다).

**무게 참고** — 사람 쪽(gltf+bin+텍스처+UAL1 애니메이션)만 약 34MB다. 사냥터에
처음 들어설 때 한 번 받고 캐시되며, saga-forest·saga-dungeon 이 이미 같은 무게를
지고 있다(이 판만의 새 결정이 아니다). GLB 를 못 받으면(느린 회선·file:// 단독판)
조용히 도형 캡슐로 남는다 — 판정은 안 바뀐다.

사람(주인공·적)의 피격 번쩍임은 GLB 로 갈리면 도형 시절의 색-보간 대신
**emissive(자체발광) 물들임**으로 바꿨다 — 옷 텍스처의 원래 색을 곱셈으로
지우지 않기 위해서다(`js/asset3d.js` 의 `ownAllMat`/`applyTint`, saga-dungeon과
같은 요령).
