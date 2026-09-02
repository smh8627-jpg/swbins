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

**바닥 타일**(`village-view.js` 의 `drawGround`, 2026-09-02) — 여태 타일마다 단색
사각형(`fillStyle`)만 채우던 것을 이 그림으로 바꿨다. **밑에는 여전히 원래 색
채우기가 먼저 깔린다**(`TILES[].color`, 철·체크무늬 색 구분이 그대로 산다) —
그 위에 타일 그림을 `globalCompositeOperation='overlay'`·투명도 0.6 으로 얹어
질감만 더한다. 색이 먼저 깔리므로 그림이 아직 안 실린 첫 프레임에도 빈 칸이
안 생긴다. 구면 투영이라 타일이 평행사변형에 가깝게 휘는데, 캔버스 2D 는
사각형(quad) 텍스처를 못 그리므로 세 꼭짓점(좌상·우상·좌하)만 맞춘 아핀
변환으로 그린다(넷째 꼭짓점은 근사 — 타일이 작아 안 띈다). 숲 고리의 네 변종
(`grass_meadow`·`grass_dark`·`grass_mush`·`grass_rocky`)은 따로 그림을 안
구하고 같은 `tile_grass.png` 위에 각자 색을 얹어 쓴다.

| 파일 | 원본 시트 좌표(px) | 쓰이는 곳 |
|---|---|---|
| `tile_grass.png` | (85,0)-(101,16) 풀 | `grass` 및 숲 고리 네 변종(물들여 쓴다) |
| `tile_dirt.png` | (102,0)-(118,16) 흙 | `path`(흙길) |
| `tile_sand.png` | (136,0)-(152,16) 모래 | `sand` |
| `tile_water.png` | (187,136)-(203,152) 물 | `water` |
| `tile_stone.png` | (102,34)-(118,50) 돌바닥 | `stone`(돌길) |
| `tile_floor.png` | (136,34)-(152,50) 나무 바닥 | `floor`(마루) |

**3D 마을 화면**(`village-view3d.js` 의 `initTerrain`, 2026-09-02)의 땅 타일도
**같은 파일**을 그대로 쓴다 — 색 한 장(`MeshLambertMaterial({color})`)이던
것에 `map` 으로 얹었다("3D 타일이 디테일하지 않다", 사용자). `NearestFilter`
로 도트그림이 흐려지지 않게 했다. 숲 고리 네 변종은 2D 와 같이 잔디 그림을
재질 색으로 물들여 쓴다. `floor`(방 안 마루)는 3D 마을 바닥에 안 나와 빠졌다.

---

## Kenney — Roguelike Characters Pack (`assets/sprites2d/human_*.png`)

| 항목 | |
|---|---|
| **만든 이** | Kenney (<https://kenney.nl>) |
| **라이선스** | **CC0 1.0 Universal** (퍼블릭 도메인 헌정) |
| **저작자 표시** | 필요 없다. 그래도 적어 둔다 |
| **재배포** | 허용된다 |
| **받은 곳** | <https://kenney.nl/assets/roguelike-characters> — `kenney_roguelike-characters.zip` 안
  `Spritesheet/roguelikeChar_transparent.png` |

2D 마을 화면의 **사람**(`sprite.js` 의 `bake()`, `kind==='human'`)이 여태 원·선으로
절차적으로 그리던 것을 이 시트에서 오려 낸 정지 초상 그림으로 바꿨다(2026-09-02,
"전체 변경" 사용자 승인). **트레이드오프를 그대로 적는다** — 이 그림은 인물마다
다른 색(피부·옷·머리)·등신 4단계·그림 양식 3가지·다리 걷기 애니메이션을 못 낸다
(고정 그림 한 장이라). 인물 id 를 해시해 열넷 중 하나를 **늘 같은 얼굴로** 고른다.
좌우 뒤집기(`stamp()` 의 `ctx.scale(-1,1)`)와 걸음 통통거림(bounce)은 그림과
무관하게 그대로 산다. 도감·상세 카드의 인물 초상은 이 그림이 아니라 이미
3D(`portrait3d.js`)로 가 있어 영향이 없다 — **지도 위에서 걸어 다니는 모습만**
바꿨다.

시트에서 사람 여덟 줄 × 두 칸(첫 넉 줄의 오우거·오크 몬스터 줄은 건너뛴다,
이 판의 사람이 아니다)을 16x16px 그대로 잘라 저장했다.

| 파일 | 원본 시트 좌표(px) |
|---|---|
| `human_01.png`·`human_02.png` | (0,85)-(16,101) · (17,85)-(33,101) — 금발 전사 · 백발 마법사 |
| `human_03.png`·`human_04.png` | (0,102)-(16,118) · (17,102)-(33,118) — 맨몸 전사 · 청록 갑주 |
| `human_05.png`·`human_06.png` | (0,119)-(16,135) · (17,119)-(33,135) — 갈색옷 궁수 둘 |
| `human_07.png`·`human_08.png` | (0,136)-(16,152) · (17,136)-(33,152) — 검은 두건 · 보라 바지 |
| `human_09.png`·`human_10.png` | (0,153)-(16,169) · (17,153)-(33,169) — 흰수염 로브 · 회색조끼 |
| `human_11.png`·`human_12.png` | (0,170)-(16,186) · (17,170)-(33,186) — 청록 두건 궁수 · 주황 셔츠 |
| `human_13.png`·`human_14.png` | (0,187)-(16,203) · (17,187)-(33,203) — 청록 방패 기사 · 흰 로브 |

### 아직 못 채운 자리 (PLAN 16절 동물 콘텐츠)

**토끼·다람쥐·오리·새**는 이 미러에 없다. `animals_pack` 에는 Alpaca·Bull·Cow·Deer·
Donkey·Fox·Horse·Husky·ShibaInu·Stag·Wolf 뿐이다. 다른 CC0 출처를 더 찾아야
한다 — 다음 세션 몫으로 남긴다(까치를 Poly by Google 에서 따로 구한 것처럼).
