# 에셋 출처와 라이선스 (saga-go)

새 `PLAN.md` **8절**이 시킨 대로, 이 폴더에 넣은 **바깥에서 가져온 에셋**의 출처와
라이선스를 여기 한곳에 적는다. **여기 없는 파일은 이 폴더에 두지 않는다.**

이 저장소는 공개다(<https://github.com/smh8627-jpg/swbins>). 그래서 재배포가
허용되지 않는 에셋은 애초에 받지 않는다.

**폴리곤 수·텍스처 실측 크기·용량 같은 기술 값은 여기 안 적는다** — `SAGA WEB.md`
16절 형식 그대로 `ASSET_CATALOG.md`가 따로 갖고 있다. 여기는 출처·라이선스만.

---

## Quaternius — 저지대 다각형(low-poly) 묶음

| 항목 | |
|---|---|
| **만든 이** | Quaternius (<https://quaternius.com>) |
| **라이선스** | **CC0 1.0 Universal** (퍼블릭 도메인 헌정) |
| **저작자 표시** | 필요 없다. 그래도 적어 둔다 — 예의이고, 나중에 출처를 다시 찾을 때 필요하다 |
| **재배포** | 허용된다 (CC0 는 조건이 없다) |
| **받은 곳** | <https://github.com/trebeljahr/quaternius-showcase> `public/glb/` (GLB 미러) |

### 라이선스를 무엇으로 확인했나

Quaternius 원 사이트(`quaternius.com`)는 이 망에서 안 열린다. 그래서 **CC0 라고
못박아 둔 다른 미러**로 확인했다:

- <https://github.com/weftspun/quaternius-stage> — 저장소 라이선스가 **CC0-1.0**,
  README 첫 줄이 *"OpenUSD (.usda) copy of [Quaternius](https://quaternius.com)
  CC0 low-poly packs"*
- <https://github.com/Malcolmnixon/Quaternius-Modular-Scifi-Pack> 등 여러 이식본이
  모두 저장소 라이선스로 **CC0-1.0** 을 달고 있다

**받아 온 미러(`trebeljahr/quaternius-showcase`) 자신의 `LICENSE` 는 MIT 인데,
그것은 그 저장소의 데모 코드에 걸린 것이고 모델에 걸린 것이 아니다.** 모델의
라이선스는 위의 Quaternius 배포 조건(CC0)이다. 헷갈리기 쉬운 자리라 적어 둔다.

### 넣은 파일

`models/nature/` — 소품. `js/prop3d.js` 가 `InstancedMesh` 로 세운다

| 파일 | 쓰이는 곳 |
|---|---|
| `CommonTree_1·2·3.glb` | 나무 (봄·여름) |
| `CommonTree_Autumn_1·2.glb` | 나무 (가을) — `season.js` 가 철을 정한다 |
| `CommonTree_Snow_1·2.glb` | 나무 (겨울) |
| `PineTree_1·2.glb` | 침엽수 |
| `Rock_1·2·3.glb` | 바위 |
| `Grass_2.glb` · `Bush_1·2.glb` | 풀덤불 · 갈대 자리 |

`models/animals/` — 배우. `js/asset3d.js` 표에 적혀 있다

| 파일 | 쓰이는 곳 |
|---|---|
| `Deer.glb` | 사슴 (`animal.js` 의 `deer`) |
| `Wolf.glb` | 늑대 (`wolf`) |
| `Cow.glb` | 소 (`ox`) |
| `Koi.glb` | 잉어 (`carp`) — `cute_fish_pack` 에서. 헤엄·튀어오름 여섯 클립 |
| `Mesh_Crow.gltf` + `.bin` + `Tex_Crow.webp` | **까치** (`magpie`) — **Quaternius 것이 아니다. 아래 따로 적었다** |

셋 다 뼈대 애니메이션을 열두어 개씩 들고 있다(Idle · Walk · Gallop · Eating …).
`asset3d.js` 의 `mapClips` 가 이름을 씻어 자리에 맞춘다.

`models/buildings/` — 마을은 `js/prop3d.js` 가 `InstancedMesh` 로,
**역참·성채는 `js/asset3d.js` 가 배우로** 세운다. 같은 파일이 양쪽에 걸려 있다

| 파일 | 쓰이는 곳 |
|---|---|
| `House_1·2·3·4.glb` · `Blacksmith.glb` | 민가 (`prop3d` 의 `house`) |
| `Tower.glb` · `PointyTower.glb` · `LargeTower.glb` · `Watchtower.glb` · `LargeSquareTowerBricks.glb` | 마을의 높은 집 (`prop3d` 의 `tower`) |
| `Inn.glb` | **역참** (`asset3d` 의 `station`) |
| `Watchtower.glb` | **성채 1등급 · 보(堡)** (`asset3d` 의 `fort:t1`) |
| `Tower.glb` · `PointyTower.glb` | **성채 2등급 · 진(鎭)** (`fort:t2`) |
| `LargeTower.glb` · `LargeSquareTowerBricks.glb` | **성채 3등급 · 웅진(雄鎭)** (`fort:t3`) |
| `Well.glb` | **우물** (`prop3d` 의 `well`) — 마을 칸에 드물게(14%) 세운다 |
| `MarketStand_1.glb` | **장터 좌판** (`prop3d` 의 `market`) — 마을 칸에 드물게(10%) 세운다 |

**`Inn.glb` 는 마을 목록에서 뺐다.** 그 여관이 이제 역참이다 — 마을에도 같은 여관이
서면, 들판에서 여관 모양을 보고 역참인 줄 알고 걸어갔다가 그냥 남의 집이 된다.

**우물·장터를 `house` 표에 섞지 않은 까닭.** `prop3d` 는 무엇이든 **키 1 로 눕히고**
(`normalize`) 세우는 쪽이 배율을 준다. 그런데 원본 키가 여관 3.49m · 우물 1.25m ·
좌판 1.05m 로 **셋에 하나까지 차이 난다** — 한 줄에 섞으면 우물이 여관만 해진다.
**키가 비슷한 것끼리만 한 줄에 묶는다** — `well`·`market` 을 `house`·`tower` 와
나란한 제 이름으로 따로 두고, `p.h` 도 1.2~1.3m 로 작게 준다(2026-08-29).

**받아 온 탑·여관에는 깃발이 없다.** 도형으로 세우던 역참에는 노란 깃발이,
성채에는 세력 빛깔 배너가 달려 있었고 **그것이 멀리서 알아보는 유일한 표식**이었다.
그대로 갈아 끼우면 성채가 어느 세력인지 화면에서 사라지므로, `asset3d.markOf` ·
`addMark` 가 깃발만 다시 얹는다(손잡이 `asset3d.mark` 를 0 으로 내리면 안 얹는다).

`models/props/` — **손으로 그린 땅**(`land.js`)의 것들. `js/prop3d.js` 가 세운다.
여태 코드가 상자·원뿔을 쌓아 만들던 자리다(사용자 방침: "스크립트로 그리는 것은 다 에셋으로")

| 파일 | 쓰이는 곳 | 어느 묶음에서 |
|---|---|---|
| `Bridge.glb` | **다리** — 한 칸짜리라 일곱을 이어 강(48m)을 건넌다 | `modular_medieval_buildings_pack` |
| `Mine.glb` | **굴 입구** (광산 어귀) | `real_time_strategy_pack` |
| `Gazebo.glb` | **옛 사당** (정자) | `medieval_village_pack` |
| `Arch.glb` | **폐허** (무너진 아치) | `modular_dungeon_1` |
| `WoodenTorch.glb` | **등롱** — 불은 코드가 얹는다(밤에만 켜야 한다) | `survival_pack` |
| `Rice_4.glb` | **벼** — 논 위에 심는다. 논바닥·두렁은 코드가 깐다 | `crops_pack` |
| `Temple.glb` · `Wall.glb` | 아직 안 걸었다 — 사당·폐허의 다른 후보 | `real_time_strategy_pack` |

`models/nature/` 에 **산봉우리**도 더했다 — `Mountain_1.glb` · `Mountain_2.glb`
(`real_time_strategy_pack`). 여태 원뿔 하나였다.

**허수아비만 CC0 로 못 찾았다.** 미러 1545 개를 다 훑어도 없다 —
그 자리는 코드가 그대로 그린다(장대 + 가로대 + 삿갓).

`models/people/` — **옛 인물 표(Knight · King · Casual · Farmer · Worker · Lady,
`modular_men`/`modular_women` 팩)는 2026-08-29 에 통째로 걷어 냈다.** 걷는 동안
몸이 갈라지는 근본 원인(부위마다 뼈대가 따로였다)이 그 팩 자체의 설계였다 —
아래 새 팩으로 갈아 끼웠다.

---

## Quaternius — RPG Character Pack (2026-09-03, 사람 기본, `models/people/quaternius_rpg/`)

| | |
|---|---|
| **만든 이** | Quaternius (<https://quaternius.com/packs/rpgcharacters.html>) |
| **라이선스** | CC0 1.0 (재배포 자유, 표시 의무 없음) |
| **받은 곳** | 팩 페이지의 구글드라이브 링크(zip 직링크 없음, 사용자가 직접 받음) — 자세한
  사정은 `saga-forest/assets/ASSET_LICENSES.md` 와 [[saga-forest-hero-fallback-fix]] 참고,
  같은 여섯 파일을 그대로 복사해 왔다 |
| **파일** | `Warrior.glb`·`Ranger.glb`·`Rogue.glb`·`Cleric.glb`·`Wizard.glb`·`Monk.glb`(원래 배포된 .gltf 임베드 base64를 바이너리 .glb로 변환 — 파싱 속도·용량 개선, 2026-09-03) |

아래 조합형(몸+옷+머리)이 그림체가 밋밋하다는 지적에 사람 기본을 이걸로 바꿨다.
`js/asset3d.js` 의 `HERO_RECIPES`(공개 기본값, 인물 여섯 벌)가 이 파일들을 가리킨다.
파일 하나에 몸·텍스처·리깅에 더해 걷기·달리기·공격·피격·구르기·사망 클립까지
전부 들어 있어 옷·머리·UAL 몸짓이 필요 없다. 아래 조합형은 지우지 않고
`HERO_RECIPES_FALLBACK` 으로 남겨 뒀다(되돌림 자리, `register('hero', ...)` 로
되돌릴 수 있다).

---

## Quaternius — 사람 창고 셋, 옛 조합형 (`models/people/regular/` · `models/anim/`)

**2026-08-29, 몸이 갈라지던 문제를 근본에서 없애려고 갈아 끼웠다.** 옛 `modular_men`/
`modular_women` 팩은 부위(몸통·머리·다리)마다 뼈대가 **따로** 붙어 있어, 몸짓을
옮겨 입혀도 뼈대 하나만 움직이고 나머지는 제자리에 남아 걷는 동안 찢어졌다
(세 겹으로 고쳐 봤지만 실기기에서 끝내 못 잡았다 — `SAGA-HANDOFF.md` 참고).

새 셋은 **몸(Universal Base Characters) · 옷(Modular Character Outfits - Fantasy) ·
몸짓(Universal Animation Library)** 이 뼈 이름·순서(65개)까지 한 글자도 안 다르게
같은 뼈대로 나온다(직접 대조했다) — 옷·머리를 몸의 뼈대에 그대로 `bind()` 하면
되고, 리타기팅이 아예 필요 없다.

| 항목 | |
|---|---|
| **만든 이** | Quaternius (<https://quaternius.com>) |
| **라이선스** | **CC0 1.0 Universal** (퍼블릭 도메인 헌정) — 세 팩 다 `License.txt` 에 명시 |
| **저작자 표시** | 필요 없다. 그래도 적어 둔다 |
| **재배포** | 허용된다 |
| **받은 곳** | itch.io — `quaternius.itch.io/universal-base-characters` ·
  `quaternius.itch.io/universal-animation-library` ·
  `quaternius.itch.io/modular-character-outfits-fantasy` (셋 다 `[Standard]` 무료 등급.
  `quaternius.com` 이 이 망에서 직접 열려 itch.io 페이지까지 갔다 — 예전 세션이
  적어 둔 "GitHub 미러만 열린다" 는 이제 안 맞는다) |

### 넣은 파일 — **텍스처는 BaseColor 만** 골라 넣었다

이 판의 재질(`asset3d.delam`)은 GLB 를 받는 순간 PBR 을 벗겨 **빛깔(BaseColor)만
남기고 Lambert 로 갈아 끼운다** — Normal·Roughness·ORM 맵은 애초에 안 쓴다. 그래서
원본 zip 에서 그 셋을 빼고 받았다(`Peasant` 한 벌만 해도 Normal 14MB·ORM 9.9MB를
아꼈다) — `.gltf` 의 `materials[].normalTexture`·`.occlusionTexture`·
`.pbrMetallicRoughness.metallicRoughnessTexture` 를 지우고 그 이미지 파일은
아예 옮기지 않았다(GLTFLoader 는 참조가 없으면 그 이미지를 안 받는다).

`models/people/regular/` (한 폴더 — `.gltf` 는 같은 폴더의 파일을 이름으로 부르므로
흩어 두면 안 된다)

| 파일 | 쓰이는 곳 |
|---|---|
| `Superhero_Male_FullBody.gltf`·`.bin` | 남자 몸(얼굴·눈·눈썹 포함) — Universal Base Characters |
| `Superhero_Female_FullBody.gltf`·`.bin` | 여자 몸 |
| `Male_Peasant.gltf`·`.bin` · `Female_Peasant.gltf`·`.bin` | 평민 옷(팔·몸통·다리·발) — Modular Character Outfits - Fantasy |
| `Male_Ranger.gltf`·`.bin` · `Female_Ranger.gltf`·`.bin` | 순찰대 옷 |
| `Hair_Buzzed`·`Hair_Beard`·`Hair_Long`·`Hair_Buns`·`Hair_SimpleParted`·`Hair_BuzzedFemale` (각 `.gltf`+`.bin`) | 머리 — "Rigged to Head Bone" 판(머리뼈에 물려 애니메이션을 따라간다) |
| `T_Superhero_Male_Dark.webp`·`T_Superhero_Female_Dark_BaseColor.webp` | 몸 살빛 |
| `T_Peasant_BaseColor.webp`·`T_Ranger_BaseColor.webp` | 옷감 |
| `T_Regular_Male_Dark_BaseColor.webp`·`T_Regular_Female_Dark_BaseColor.webp` | 옷 밖으로 나온 손·팔 살빛(옷 쪽 재질이 이걸 쓴다 — 몸 쪽 살빛과 톤만 맞추면 되므로 옷이 몸을 그대로 덮는다) |
| `T_Hair_1_BaseColor.webp`·`T_Hair_2_BaseColor.webp` | 머리카락·눈썹(몸 파일의 눈썹도 이 둘을 같이 쓴다) |
| `T_Eye_Brown.png` | 눈동자(256² — 그대로 뒀다) |

**2026-09-04: 이 여덟 장을 WebP로 다운스케일했다.** `ASSET_CATALOG.md`를
쓰다가 실측해 보니 옷감 둘(`Peasant`·`Ranger`)이 **4096×4096 PNG**였다 —
`SAGA WEB.md` 19절이 못박은 "4K 텍스처 금지"에 정면으로 걸린다. 옷감은
2048로, 나머지(몸 살빛·손팔 살빛·머리)는 2048 원본을 1024로 낮추고
WebP(q82)로 다시 구웠다 — 8장 합계 **19.4MB → 0.38MB(98% 감소)**.
지금은 화면에 안 나오는 되돌림 전용 자리지만, 다음에 표 기본으로
되돌아갈 때 이미 규격 안이 되도록 미리 손봤다. `.gltf` 12개의
`images[].uri`·`mimeType`만 고쳤다(정점 데이터는 그대로).

`models/anim/UAL1_Standard.glb` — **몸짓 마흔한 벌**(idle·walk·jog·sprint·roll·
sword_attack·hit·death…). `_RM`(root motion 포함) 이 아니라 **기본판**을 받았다 —
루트 모션이 있으면 애니메이션 자체가 캐릭터를 밀어서 이 판이 좌표로 옮기는 것과
겹친다. 이미지가 없어(도형 확인용 메시 하나뿐) 그대로 통째로 받았다.

`js/asset3d.js` 의 `HERO_RECIPES_FALLBACK` 이 몸·옷·머리 조합 여섯 벌(남 셋·여 셋)을
인물 id 해시로 나눠 준다(지금은 표 기본이 아니다 — 위 RPG Character Pack 참고).
그 위에 `asset3d.tintOf` 가 세력 빛깔을 입힌다(QRPG 몸에도 같이 걸린다).

---

## Poly by Google — 까치(`Crow`)

| 항목 | |
|---|---|
| **만든 이** | **Poly by Google** |
| **라이선스** | **CC-BY 3.0** — `data.json` 에 `"license": "CREATIVE_COMMONS_BY"` 로 명시돼 있다 |
| **저작자 표시** | **필수다.** 아래 문구를 지운 채 재배포하면 라이선스 위반이다 |
| **받은 곳** | Google Poly 아카이브 <https://polygone.art> · `guid=1MIvWQ5Q3R9` |

> **Crow** — © **Poly by Google**, [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/).
> Google Poly 아카이브(<https://polygone.art>)의 `1MIvWQ5Q3R9` 에서 가져왔다.
> 크기·자리만 맞추었고 형상은 그대로다.

**이 저장소에서 CC-BY 는 이것 하나뿐이다.** 나머지는 전부 CC0(표시 불필요)라
규칙이 여기서만 다르다 — 지우거나 옮길 때 위 문구를 같이 옮길 것.

`.glb` 한 덩이가 아니라 **파일 셋**(`Mesh_Crow.gltf` + `Mesh_Crow.bin` +
`Tex_Crow.webp`)이다. `.gltf` 가 나머지 둘을 **이름으로** 부르므로 셋이 같은 폴더에
그대로 있어야 한다 — 하나만 빠져도 조용히 도형으로 돌아간다.

**2026-09-04: `Tex_Crow.png` → `Tex_Crow.webp`(무손실)로 바꿨다.** 32×32짜리라
용량은 그대로나(114B → 76B) `SAGA WEB.md` 5절 규칙에 맞췄다. `.gltf`의
`images[0].uri`·`mimeType`을 같이 고쳤다 — three.js `GLTFLoader`는 URI 확장자로
MIME을 다시 가늠하는 헬퍼(`.webp($|\?)` 정규식)를 이미 갖고 있어 별 위험이 없다.

원본은 50 단위 키로 만들어져 있는데 `asset3d` 가 키 1 로 눕히므로,
까치 키(`animal.js` 의 `h: 0.42`)로 세우면 **42cm** 가 된다 — 실제 까치와 같다.

**날갯짓은 안 한다.** 이 모델에는 클립이 없다(정지 모델이다). 도형 까치는 코드가
날갯짓을 넣어 주었으니 **모양을 얻고 움직임을 내준 맞바꿈**이다.
되돌리려면 표에서 `pet:an_magpie` 줄을 지우면 도형으로 돌아간다.

---

## Lucide — UI 아이콘 (`js/icon.js` 안에 적혀 있다)

| 항목 | |
|---|---|
| **만든 이** | Lucide Icons and Contributors (<https://lucide.dev>) |
| **라이선스** | **ISC** — 저작권 문구를 남기면 자유롭게 쓰고 고치고 재배포할 수 있다 |
| **받은 곳** | <https://github.com/lucide-icons/lucide> `icons/*.svg` |

> Lucide — © Lucide Icons and Contributors, [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE).

**파일로 두지 않고 `js/icon.js` 안에 적어 두었다.** 스무 개 남짓이라 3.6KB 뿐이고,
그림 하나에 요청 하나씩 붙으면 첫 화면이 그만큼 늦기 때문이다.

**왜 이모지를 바꿨나.** 이모지는 **폰트가 그리는 것**이라 기기마다 다르게 보인다 —
같은 화면이 아이폰·안드로이드·윈도우에서 셋으로 갈린다. 도구줄·독·지갑만 바꿨고,
손잡이 `icon.on` 을 0 으로 내리면 이모지가 그대로 남는다.

**인물·펫의 이모지는 안 바꿨다.** `data.js` 의 `emoji` 는 아이콘이 아니라
**그 인물의 상징**이다(관우의 칼, 장비의 술). 아이콘 세트에 대응하는 것이 없고,
바꾸면 도감이 밋밋해진다 — 그 자리는 초상(`portrait3d`)이 맡는다.

---

## ambientCG — 땅 소재 텍스처 (`assets/textures/land/`)

| 항목 | |
|---|---|
| **만든 이** | ambientCG (<https://ambientcg.com>) |
| **라이선스** | **CC0 1.0** — 저작자 표시 없이 자유롭게 쓰고 고치고 재배포할 수 있다 |
| **받은 곳** | <https://ambientcg.com>, 1K-JPG 묶음에서 `Color` 맵만 골랐다 |

| 파일 | 원본 자산 |
|---|---|
| `grass.webp` | Grass005 |
| `forest.webp` | Ground106 |
| `mount.webp` | Rocks011 |
| `road.webp` | Ground081 |
| `town.webp` | Ground103 |
| `farm.webp` | Ground109 |

`js/world3d.js` 의 `landTexture()` 가 `LAND_COLOR` 표로 색만 칠하던 자리를
이 텍스처로 갈아 끼웠다(2026-08-30). **`water` 는 안 받았다** — 실제 물결은
`water3d.js` 가 따로 그려서 이 칠은 거의 안 보인다. 이 판 재질(`delam`)과 같은
원칙으로 **Color(BaseColor) 한 장만** 받았다 — Normal·Roughness·AO·Displacement
는 원본 zip 에 있지만 옮기지 않았다.

**2026-09-04: 원본 1K-JPG(합계 8.45MB) → WebP(quality 82, 합계 1.35MB, 평균 84%
감소)로 재인코딩했다.** `SAGA WEB.md` 5절의 "텍스처는 WebP 우선" 규칙을 따른
것 — `landTexImg()`(`js/world3d.js`)는 `new Image()`로 그냥 디코드하므로 포맷
전환에 코드 변경이 필요 없었다. 원본 `.jpg`는 지웠다(Git 이력에는 남아 있다).

---

## EverFace — 초상 "진지한" 얼굴 (`assets/sprites2d/portrait/serious/`)

| 항목 | |
|---|---|
| **만든 이** | Efilheim |
| **라이선스** | **CC0** |
| **저작자 표시** | 필요 없다 |
| **재배포** | 허용된다 |
| **받은 곳** | <https://opengameart.org/content/everface> (`everface1.0.png`, 432×24, 24×24 초상 18장) |

`portrait3d.js` 가 인물 id 해시로 열여덟 장 중 하나를 고른다(`recipe().serious`).
아래 "귀여운" 조합형과 달리 **한 장을 그대로 쓴다** — 층층이 쌓지 않는다.
파일 이름은 `face_00.png` ~ `face_17.png`(시트를 24px 씩 그대로 자른 것).

## nonemo's Character Pack — 초상 "귀여운" 얼굴 (`assets/sprites2d/portrait/cute/`)

| 항목 | |
|---|---|
| **만든 이** | nonemo (<https://nonemo.itch.io>) |
| **라이선스** | **CC0** |
| **저작자 표시** | 필요 없다(있으면 반갑다고 적혀 있다) |
| **재배포** | 허용된다 |
| **받은 곳** | <https://nonemo.itch.io/character-creation-asset-pack> — itch.io 가 이 망에서
  막혀 있어 **사용자가 직접 받아 전달**했다 |

원본 팩은 머리·피부·표정·옷·바지까지 다 갖춘 훨씬 큰 팩이다. 초상은 가슴 위만
담으므로(도감 카드 규격) **옷·바지·안경·수염은 빼고** 다음만 옮겼다 —
수염을 얹어 보니 아기 얼굴에 털만 붙은 꼴이라 뺐다(2026-09-02):

| 폴더 | 옮긴 것 |
|---|---|
| `skin/tint_1·2·3/head.png` | 피부색 셋 |
| `hairs/front/{chupchik,curly,elegant}.{아홉 빛깔}.png` | 앞머리 세 모양 × 아홉 빛깔 |
| `hairs/back/{curly,long}.{아홉 빛깔}.png` | 뒷머리 두 모양 × 아홉 빛깔 |
| `faces/{smile,willing,cute,laughs,gloating}.png` | 표정 다섯 |

`portrait3d.js` 가 인물 id 해시로 이 넷(피부·뒷머리·표정·앞머리 순으로 겹친다)을
골라 합친다. 손잡이 `portrait3d.cute` 를 1 로 올려야 이 조합이 나온다(기본은
EverFace).

## OpenGameArt "RPG Sound Pack" — 효과음 (`assets/audio/sfx/`)

**2026-09-04, 오디오 시스템을 처음 들였다.** `SAGA WEB.md` 감사에서 드러난 격차 —
이 판은 소리가 하나도 없었다. artisticdude 가 만든 유명한 CC0 RPG 효과음 묶음(95개
.wav)에서 짧은 다섯 조각만 골라 mp3(모노 44.1kHz, 96kbps)로 옮겼다.

| 항목 | |
|---|---|
| **만든 이** | artisticdude |
| **라이선스** | **CC0** |
| **저작자 표시** | 필요 없다 |
| **재배포** | 허용된다 |
| **받은 곳** | <https://opengameart.org/content/rpg-sound-pack> — `rpg_sound_pack.zip` |

| 파일 | 원본 | 쓰이는 곳(`js/audio.js`) |
|---|---|---|
| `discover.mp3` | `inventory/bubble2.wav` | `codex` 이벤트 — 새 지역·사람·짐승·사건·역사를 처음 봤을 때 |
| `catch.mp3`(파일명 `encounter_win.mp3`) | `battle/magic1.wav` | `dex:new` — 등용·포획 성공 |
| `hit.mp3` | `battle/swing.wav` | `duel:fx` — 교전 중 타격 |
| `reward.mp3` | `inventory/coin.wav` | `feat` — 공적 획득 |
| `panel_open.mp3` | `world/door.wav` | `duel:open`·`station:request`·`encounter:request`·`fort:request` — 카드/무대가 열릴 때 |

**한 팩에서만 골랐다**(10절 "에셋 스타일 통일"). 원본 팩에는 이 다섯 말고도
UI 클릭음(`interface/interface1~6.wav`) · 갑옷·금속·병 소리(`inventory/`) ·
NPC·몬스터 울음(`NPC/`) 등이 더 있다 — 다음 단계(일반 버튼 탭, 사건 보상 세분화,
전투 시작 신호음 등)에서 더 고를 수 있다. **아직 안 걸었으면 여기 안 넣는다**는
이 문서 맨 위 규칙대로, 이번에 실제로 안 쓰는 조각(`interface2`·`interface4` 등으로
떠 봤던 UI 탭음)은 커밋하지 않았다.

`js/audio.js` 는 새 판정을 만들지 않았다 — 이미 도는 이벤트버스(`core.on`/`emit`)를
엿듣기만 한다. 손잡이 `audio.on`(0이면 무음) · `audio.vol`(0~1, 기본 0.6). 클립은
`preload="none"`으로 처음 낼 때만 받고(7절), 셋씩 풀로 돌려 써서 짧게 겹쳐도
안 끊긴다.

---

## Poly Haven — HDRI 환경광 (`assets/hdri/alps_field_1k.hdr`)

| 항목 | |
|---|---|
| **만든 이** | Poly Haven (<https://polyhaven.com>) |
| **라이선스** | **CC0 1.0 Universal** (퍼블릭 도메인 헌정) |
| **저작자 표시** | 필요 없다. 그래도 적어 둔다 |
| **재배포** | 허용된다 |
| **받은 곳** | `saga-forest/assets/hdri/alps_field_1k.hdr` 를 그대로 재사용(같은 CC0 파일, 다섯 판 공용 자산 — 원본은 <https://polyhaven.com/a/alps_field>, 1k `.hdr`) |

2026-09-04, 사용자가 "재질을 실사처럼" 요청해 `world3d.js` 에 IBL(환경광)을 얹었다.
**하늘 색은 안 바꾼다** — `scene.background` 는 그대로 `lightingAt()` 의 시각별
색에 맡기고, `scene.environment` 에만 물려 PBR 재질(GLB 인물·건물)의 반사·
거칠기만 사실적으로 만든다. 세기는 `hemi.intensity`(이미 낮·밤·날씨별로 맞춰
둔 곡선)에 비례해 `syncLight()` 가 매 프레임 같이 낮춘다/올린다 — 예전에 ACES
톤매핑을 걸었다가 밤 화면이 망가진 사고(`post3d.js` 머리말)를 되풀이하지
않으려는 안전장치다. 못 받아도 조용히 넘어가고 옛 조명만으로 돈다.
`RGBELoader.js`(`js/vendor/`)도 같은 이유로 `saga-forest/js/vendor/`에서
그대로 재사용했다 — three.js 코어 빌드엔 없는 애드온이라 두 판이 같은 파일을
쓴다(다섯 판 공용 벤더 파일이지 이 판만의 새 의존성이 아니다).

## Poly Haven — 나무·바위·수풀 사진측량 스캔 (`models/nature/realistic/`)

2026-09-04, 사용자가 "사가블로는 했는데"(사가블로가 같은 것을 먼저 넣었다)로
형평을 요청 — 사가의숲이 검증해 둔 것을 사가블로가 그대로 옮겼던 것과 같은
길로, 이 판에도 옮긴다. 사람 캐릭터 실사화는 다섯 판 어디서도 막힌 벽이었지만
(Mixamo 재배포 금지, 대안 CC0 팩은 애니메이션 0개 — 이 문서 위 절과
`HANDOFF.md` 참고) 자연물은 다르다.

| 항목 | |
|---|---|
| **만든 이** | Rob Tuytel·Rico Cilliers(`island_tree_02`) · Rico Cilliers(`shrub_04`) · Rob Tuytel·Rico Cilliers(`pine_sapling_small`) · Jenelle van Heerden(`rock_07`) · Dario Barresi·Rico Cilliers(`stone_01`) · Kless Gyzen(`rock_moss_set_01`) — 전부 Poly Haven (<https://polyhaven.com>) |
| **라이선스** | **CC0 1.0 Universal** — 재배포 자유, 표시 의무 없음 |
| **받은 곳** | `saga-forest/assets/models/nature/realistic/` 를 그대로 재사용(같은 CC0 파일, md5 동일 확인). 처리 과정(weld·simplify·resize·jpeg 압축)의 자세한 수치는 `saga-forest/assets/ASSET_LICENSES.md` 의 같은 절 참고 — 다섯 판 공용 소재라 그쪽에 한 번만 자세히 적어 뒀다 |

| 이 판 소품 이름 | 파일 |
|---|---|
| `tree`(봄·여름) | `IslandTree_02.glb` |
| `pine` | `PineSapling.glb` |
| `rock` | `Rock_07.glb` · `Stone_01.glb` · `MossRock_a·b·c.glb`(다섯 벌 섞어 쓴다) |
| `grass`(수풀만, 풀잎은 그대로) | `Shrub_04.glb` |

**가을·눈은 그대로 저다각형이다** — Poly Haven 전체를 뒤져도 가을 단풍·눈 덮인
나무 CC0 모델이 없다는 것은 사가의숲이 이미 확인한 자리라 다시 찾지 않는다.
사가의숲엔 있는 `log`(통나무)·`tree:dead`(고목)는 이 판의 소품 표(`prop3d.js`
`REG`)에 애초에 그 자리가 없어 옮기지 않았다 — 안 쓰는 파일을 공개 저장소에
얹을 까닭이 없다.

옛 Quaternius 저다각형 셋은 지우지 않았다 — `js/prop3d.js` 의
`TREE_STYLIZED`·`PINE_STYLIZED`·`ROCK_STYLIZED`·`BUSH_STYLIZED` 가 되돌림
자리로 들고 있다.

## 집·탑 — PolyScan · Poly Haven (`models/buildings/realistic/`)

2026-09-04, **사가블로가 같은 날 먼저 찾아 검증해 둔 것을 그대로 옮겼다**
(md5 동일 확인) — 아래 "안 가져온 것" 절의 옛 결론("동양풍만 없을 뿐 건물
자체는 CC0 로 있다")과 달리, 그때까지는 **집·탑도 사진측량/PBR 급 CC0 를
못 찾은 상태**였다. 사가블로가 rar 해제·OBJ 재질 분리·trimesh 로 새로
구해 냈다 — 자세한 변환 과정은 `saga-dungeon/assets/ASSET_LICENSES.md`
의 같은 절 참고(다섯 판 공용 소재라 그쪽에 한 번만 적혀 있다).

| 항목 | |
|---|---|
| **만든 이** | PolyScan(<https://polyscann.com>, 돌집·통나무집) · Rico Cilliers — Poly Haven(<https://polyhaven.com>, 탑) |
| **라이선스** | CC0 1.0 — 재배포·상업적 이용 자유, 표시 의무 없음 |
| **받은 곳** | `saga-dungeon/assets/models/buildings/realistic/` 를 그대로 재사용 |
| **파일** | `house_stone.glb`(285KB) · `house_wooden.glb`(246KB) · `tower_round.glb`(516KB, Poly Haven `modular_fort_01` 성채 모듈 키트에서 원형 탑 하나만 추림) |

| 이 판 소품 이름 | 파일 |
|---|---|
| `house`(마을 집) | `house_stone.glb` · `house_wooden.glb` |
| `tower`(들판의 홀로 선 탑) | `tower_round.glb` |

**`asset3d.js`의 역참(`station`)·성채(`fort:t1~t3`)는 손 안 댔다** — 그쪽은
등급마다 서로 다른 탑 모양이어야 하는데(자가진단이 그걸 본다) 실사 탑은
한 종류뿐이라 옮기면 세 등급이 다 같아진다. 옛 Kenney류 집 다섯·탑 다섯은
지우지 않았다 — `js/prop3d.js` 의 `HOUSE_STYLIZED`·`TOWER_STYLIZED` 가
되돌림 자리로 들고 있다.

## 아직 안 가져온 것 — 왜 안 가져왔나

- **허수아비.** Quaternius 미러 1545 개를 다 훑어도 없다. 그 자리는 코드가 그대로
  그린다(장대 + 가로대 + 삿갓)
- **인물 일흔의 초상 일러스트.** 애초에 존재하지 않는다 — 관우·이순신·세종의
  그림을 CC0 로 받아 올 곳이 없다. 그래서 **이미 가진 인물 GLB 를 오프스크린으로
  렌더해 초상을 굽는다**(`js/portrait3d.js`). 코드가 그린 그림이 아니라 에셋으로
  만든 그림이고, 덤으로 지도 위의 그 사람과 도감의 그 사람이 같아졌다
- **동양풍 건물.** 없다. 받을 수 있는 CC0 건물은 전부 유럽 중세다.
  **사용자가 그것을 알고 품질을 먼저 골랐다**(2026-08-28) — 그래서 얹었다.
  되돌리려면 손잡이 `prop3d.house` 를 0 으로 내리면 기와지붕 코드로 돌아간다

---

## 이 폴더에 절대 넣지 말 것

- **원작사(포켓몬GO · 디아블로 · 동물의숲 · 메이플스토리 · 삼국지)의 실제 에셋.**
  이 저장소는 문법만 따르고 그림은 스스로 구한다 — 루트 `CLAUDE.md` 참고
- 라이선스가 불분명한 것. "무료" 는 라이선스가 아니다
- 저작자 표시가 **필수**인 것(CC-BY 등)을 표시 없이
