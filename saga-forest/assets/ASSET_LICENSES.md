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

---

## Poly Haven — HDRI 환경광 (`assets/hdri/alps_field_1k.hdr`)

| 항목 | |
|---|---|
| **만든 이** | Poly Haven (<https://polyhaven.com>) |
| **라이선스** | **CC0 1.0 Universal** (퍼블릭 도메인 헌정) |
| **저작자 표시** | 필요 없다. 그래도 적어 둔다 |
| **재배포** | 허용된다 |
| **받은 곳** | <https://polyhaven.com/a/alps_field> — 1k `.hdr` (api.polyhaven.com 으로 직접 받음) |

2026-09-02, 사용자가 "사실처럼 보이는" 을 요청해 `village-view3d.js` 의 3D 마을에
IBL(환경광)을 얹었다. **하늘 색은 안 바꾼다** — `scene.background` 는 그대로
바이옴별 단색(`syncFog`)에 맡기고, `scene.environment` 에만 물려 PBR 재질의
반사·거칠기만 사실적으로 만든다(자세한 사정은 `village-view3d.js` 의
`loadEnvironment()` 주석 참고). 못 받아도 조용히 넘어가고 옛 조명만으로 돈다.

파싱에 필요한 `RGBELoader` 는 번들(`js/vendor/three.iife.js`, 사가고·사가블로와
md5 까지 같은 그 파일)엔 없어서, three.js r169 예제 소스를 esbuild 로 따로
번들해 `js/vendor/RGBELoader.js` 로 얹었다(전역 `THREE.RGBELoader`) — three
본체 파일은 안 건드렸다.

---

## Quaternius — RPG Character Pack (2026-09-03, 공개 기본 사람)

| | |
|---|---|
| **만든 이** | Quaternius (<https://quaternius.com/packs/rpgcharacters.html>) |
| **라이선스** | CC0 1.0 (<https://creativecommons.org/publicdomain/zero/1.0/>) — 재배포 자유, 표시 의무 없음 |
| **받은 곳** | quaternius.com 팩 페이지의 구글드라이브 링크(zip 직링크 없음, 사용자가 직접 받음) |
| **파일** | `assets/models/people/quaternius_rpg/{Warrior,Ranger,Rogue,Cleric,Wizard,Monk}.glb(원래 배포된 .gltf 임베드 base64를 바이너리 .glb로 변환 — 파싱 속도·용량 개선, 2026-09-03)` |

Mixamo 실사(아래 절)가 재배포 금지라 공개 저장소에서 캐릭터가 통째로 안 보이던
문제(`.gitignore`된 파일이 없는 기기는 몸이 안 실림)를 고치려고 새로 들였다.
**이제 `js/asset3d.js` 의 `HERO_RECIPES`(공개 기본값)가 이 여섯 벌이다.** 파일
하나에 몸·텍스처·리깅에 더해 걷기·달리기·공격·피격·구르기·사망 등 클립 열세 개가
전부 들어 있어 saga-go 식 몸+옷+머리 조합이나 별도 UAL 몸짓이 필요 없다 —
`anim` 을 `body` 와 같은 파일로 주면 그 안의 클립을 그대로 쓴다(`buildHeroDefault()`
참고). 카툰풍 음영이 있는 스타일이라 기존 평범한 조합형(`HERO_RECIPES_FALLBACK`,
그대로 남아 있음)보다 그림체가 낫다.

---

## Mixamo (Adobe) — 실사풍 사람, 로컬 전용 보너스 (2026-09-02, 사용자가 직접 받음)

**⚠️ 이 절만 예외다 — 실제 파일은 이 저장소에 없다.** 2026-09-03부터 **공개
기본값이 아니다** — 위 Quaternius RPG Character Pack 이 기본이고, 이 실사
캐릭터는 로컬에 파일이 있고 `_admin.html` 등에서 `world3d.mixamoReal` 손잡이를
켰을 때만(기본 0) 우선 시도된다(`js/asset3d.js` 의 `HERO_RECIPES_MIXAMO`·
`wantsMixamoReal()`). Mixamo 약관은
"캐릭터·애니메이션 원본 파일을 독립 에셋으로 재배포"하는 것을 금지한다
(<https://community.adobe.com> 여러 글에서 일관되게 확인). 이 저장소는
공개(GitHub Pages 로 그대로 서빙됨)라, 위 "재배포가 허용되지 않는 에셋은
애초에 받지 않는다" 원칙에 따라 **변환한 glb 를 커밋하지 않는다** —
`saga-forest/.gitignore` 가 `assets/models/people/realistic/` 와
`assets/models/anim/mixamo_realistic.glb` 를 막고 있다.

사용자 기기 로컬엔 그대로 있어서 게임은 정상 동작한다. 다른 기기·세션에서
다시 만들려면:

1. <https://www.mixamo.com> (무료 Adobe 계정)에서 사실적인 캐릭터 하나를
   고른다(이번엔 **Maria**) → Download, Format **FBX Binary**, Pose T-pose로
   몸체 한 번
2. 같은 캐릭터로 아래 여덟 애니메이션을 각각 받는다(Format FBX Binary,
   가능하면 Skin: Without Skin — 훨씬 가볍다):
   `Action Idle To Fight Idle`(→idle) · `Walking`(→walk, In Place) ·
   `Running`(→run, In Place) · `Sword And Shield Slash`(→attack) ·
   `Hit Reaction`(→hit) · `Stand To Roll`(→dodge) · `Death`(→death) ·
   `Picking Up`(→interaction)
3. `npm install fbx2gltf @gltf-transform/core` (아무 스크래치 폴더에서)
4. 몸: `FBX2glTF --binary --pbr-metallic-roughness -i "Maria....fbx" -o body`,
   그다음 `gltf-transform resize body.glb body_r.glb --width 1024 --height 1024`,
   `gltf-transform jpeg body_r.glb maria_body.glb --quality 88 --formats png`
   (baseColorTexture·normalTexture 를 jpeg 로 눌러 10.6MB → 1.35MB)
5. 애니메이션 여덟 개는 각각 `FBX2glTF --binary --anim-framerate bake30`,
   그다음 이 폴더의 `tools/mixamo/slim_anim.js`(메시·스킨 떼고 이름 바꿈) →
   `tools/mixamo/merge_anims.js`(여덟 파일을 클립 여덟 개짜리 하나로) →
   `tools/mixamo/detrend_root.js`(구르기·죽음처럼 제자리가 아닌 클립의
   Hips 수평 이동을 되돌림) 순서로 돌린다
6. `maria_body.glb` → `assets/models/people/realistic/maria_body.glb`,
   합친 애니메이션 → `assets/models/anim/mixamo_realistic.glb`

`js/asset3d.js` 의 `HERO_RECIPES_MIXAMO`·`ANIM_SRC_REAL` 이 이 두 파일을 가리킨다
(`world3d.mixamoReal` 손잡이를 켰을 때만 쓰인다). 옛 Quaternius 조합형(몸+옷+머리
넷)은 `HERO_RECIPES_FALLBACK` 으로 여전히 살아 있다 — 위 RPG Character Pack마저
못 실릴 때 마지막으로 한 번 더 시도하는 안전망이다(그 쪽 파일들은
`models/people/regular/` 에 그대로 있고 CC0 라 재배포 문제는 없다).
