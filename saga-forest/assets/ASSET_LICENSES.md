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

### 아직 못 채운 자리 (PLAN 16절 동물 콘텐츠)

**토끼·다람쥐·오리·새**는 이 미러에 없다. `animals_pack` 에는 Alpaca·Bull·Cow·Deer·
Donkey·Fox·Horse·Husky·ShibaInu·Stag·Wolf 뿐이다. 다른 CC0 출처를 더 찾아야
한다 — 다음 세션 몫으로 남긴다(까치를 Poly by Google 에서 따로 구한 것처럼).
