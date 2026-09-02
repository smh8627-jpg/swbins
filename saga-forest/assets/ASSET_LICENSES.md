# 에셋 출처와 라이선스 (saga-forest)

`PLAN.md` 32절이 시킨 대로, 이 폴더에 넣은 **바깥에서 가져온 에셋**의 출처와
라이선스를 여기 한곳에 적는다. **여기 없는 파일은 이 폴더에 두지 않는다.**

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
| **받은 곳** | <https://github.com/trebeljahr/quaternius-showcase> `public/glb/` (GLB 미러) —
  라이선스 확인 근거는 `../../saga-go/assets/ASSET_LICENSES.md` 에 이미 적어 두었다
  (원 사이트가 이 망에서 안 열려 다른 CC0 이식본 여럿으로 교차 확인했다) |

### 넣은 파일 — 새로 받은 것 (`nature_pack` · PLAN 8절 숲 오브젝트)

`models/nature/` — 랜덤 배치될 소품. 아직 세우는 렌더러는 없다(PHASE 3 몫) — 지금은
`asset3d.js` 표에서 골라지는 자리만 있다.

| 파일 | 쓰이는 곳 |
|---|---|
| `CommonTree_1·2·3.glb` | 큰 나무 (봄·여름) |
| `CommonTree_Autumn_1·2.glb` | 큰 나무 (가을) |
| `CommonTree_Snow_1·2.glb` | 큰 나무 (겨울) |
| `CommonTree_Dead_1.glb` | 고목 |
| `PineTree_1·2.glb` | 침엽수 |
| `BirchTree_1·2.glb` | 작은 나무 |
| `Bush_1·2.glb` · `BushBerries_1.glb` | 덤불 |
| `Rock_1·2·3.glb` | 돌·바위 |
| `Rock_Moss_1.glb` | 이끼 낀 돌 |
| `Grass_2.glb` · `Grass_Short.glb` | 풀 |
| `Flowers.glb` | 꽃 |
| `Plant_1·2.glb` | 작은 풀숲 |
| `TreeStump.glb` · `TreeStump_Moss.glb` | 그루터기 |
| `WoodLog.glb` · `WoodLog_Moss.glb` | 통나무 · 쓰러진 나무 |

`models/props/` — 새로 받은 것

| 파일 | 어느 팩 | 쓰이는 곳 |
|---|---|---|
| `Mushroom_1·2.glb` | `crops_pack` | 버섯 |
| `Bench_1.glb` | `medieval_village_pack` | 벤치 |
| `Fence.glb` | `medieval_village_pack` | 울타리 |
| `Cart.glb` | `medieval_village_pack` | 카트 |
| `Bonfire_Lit.glb` | `medieval_village_pack` | 캠프파이어 |
| `Tent.glb` | `survival_pack` | 작은 천막 |

`models/animals/` — 새로 받은 것

| 파일 | 어느 팩 | 쓰이는 곳 |
|---|---|---|
| `Fox.glb` | `animals_pack` | 여우 |

### 넣은 파일 — saga-go 에서 그대로 옮긴 것 (**md5 동일**, 새로 받지 않았다)

이미 사가고에서 CC0 로 확인된 파일을 그대로 복사했다 — 세 벌째(사가블로) 복사와
같은 요령이다. 자세한 출처·이식 경위는 `../../saga-go/assets/ASSET_LICENSES.md` 참고.

| 파일 | 원본 위치 |
|---|---|
| `models/animals/Deer.glb` | `saga-go/assets/models/animals/Deer.glb` |
| `models/animals/Wolf.glb` | `saga-go/assets/models/animals/Wolf.glb` |
| `models/nature/Mountain_1·2.glb` | `saga-go/assets/models/nature/` |
| `models/props/WoodenTorch.glb` | `saga-go/assets/models/props/WoodenTorch.glb` (랜턴 대타) |
| `models/props/Well.glb` | `saga-go/assets/models/buildings/Well.glb` |
| `models/props/Bridge.glb` | `saga-go/assets/models/props/Bridge.glb` (나무다리) |
| `models/props/Gazebo.glb` | `saga-go/assets/models/props/Gazebo.glb` |
| `models/people/regular/*` (몸 둘·옷 넷·머리 여섯, gltf+bin+png) | `saga-go/assets/models/people/regular/` — Player 3D(PHASE 4) 에 쓸 인물 뼈대. 조합 규칙도 그대로: `saga-go/js/asset3d.js` 의 `HERO_RECIPES` 주석 참고 |
| `models/anim/UAL1_Standard.glb` (Quaternius Universal Animation Library, 몸짓 마흔한 벌) | `saga-go/assets/models/anim/UAL1_Standard.glb` — 위 인물 뼈대와 이름까지 같은 뼈라 옮겨 입히기 없이 그대로 물린다 |

---

## Kenney — Roguelike/RPG Pack (`assets/sprites2d/`)

| 항목 | |
|---|---|
| **만든 이** | Kenney (<https://kenney.nl>) |
| **라이선스** | **CC0 1.0 Universal** (퍼블릭 도메인 헌정) |
| **저작자 표시** | 필요 없다. 그래도 적어 둔다 |
| **재배포** | 허용된다 |
| **받은 곳** | <https://opengameart.org/content/roguelikerpg-pack-1700-tiles> (Kenney 본인 업로드,
  `Roguelike pack.zip` 안 `Spritesheet/roguelikeSheet_transparent.png`) |

2D 마을 화면(`village-view.js`)의 **나무**(`drawTree`, PLAN "코드로 그리지 말고
에셋으로" 방침)가 여태 겹친 원으로 수관을 그리던 것을 이 시트에서 오려 낸
그림으로 바꿨다(2026-09-02). 시트에서 16x15px 셋을 그대로 잘라 파일로 저장했다 —
계절마다 다른 그림, 흔들림은 회전으로, 벚꽃·눈·열매 배지는 여전히 코드가 얹는다
(상태 표시라서 그림이 아니라 코드 몫으로 남긴다).

| 파일 | 원본 시트 좌표(px) | 쓰이는 곳 |
|---|---|---|
| `tree_spring.png` | (221,154)-(236,168) 초록 둥근 나무 | 봄·여름 |
| `tree_autumn.png` | (238,154)-(253,168) 주황 둥근 나무 | 가을 |
| `tree_winter.png` | (255,154)-(270,168) 청록 둥근 나무 | 겨울(눈 배지는 코드가 그 위에 얹는다) |
| `pine_green.png` | (272,154)-(286,168) 초록 침엽수 | 봄·여름·가을 소나무(`drawPine`) — 줄기는 여전히 코드가 긋는다 |
| `pine_winter.png` | (306,154)-(320,168) 청록 침엽수 | 겨울 소나무 — 눈덩이 배지는 코드가 얹는다 |

### 아직 못 채운 자리 (PLAN 16절 동물 콘텐츠)

**토끼·다람쥐·오리·새**는 이 미러에 없다. `animals_pack` 에는 Alpaca·Bull·Cow·Deer·
Donkey·Fox·Horse·Husky·ShibaInu·Stag·Wolf 뿐이다. 다른 CC0 출처를 더 찾아야
한다 — 다음 세션 몫으로 남긴다(까치를 Poly by Google 에서 따로 구한 것처럼).
