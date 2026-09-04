# 에셋 출처와 라이선스 (saga-dungeon)

이 저장소는 공개다(<https://github.com/smh8627-jpg/swbins>). 새로 넣은 **바깥에서
가져온 에셋**의 출처와 라이선스를 여기 한곳에 적는다. **여기 없는 파일은 이 폴더에
두지 않는다.**

`saga-go`가 이미 확인해 둔 것과 **같은 에셋을 그대로 옮겨 왔다**(PLAN 4·5·6절
"실제 3D 에셋 사용" — "다섯 판 공통 방침: 코드로 그리지 말고 에셋으로"). 자세한
확인 경위(라이선스를 어떻게 확인했는지, itch.io 미러 등)는
`../saga-go/assets/ASSET_LICENSES.md` 를 따른다 — 여기서는 **이 판에 실제로 옮긴
파일**만 추린다.

---

## Poly Haven — 바닥·벽 돌 텍스처 (2026-09-04, `textures/dungeon/`)

| | |
|---|---|
| **만든 이** | Poly Haven (<https://polyhaven.com>) — `monastery_stone_floor`·`stone_tiles_02`·`mixed_rock_tiles`(바닥) · `castle_wall_slates`·`stone_wall_04`·`medieval_blocks_05`(벽) |
| **라이선스** | CC0 1.0 — 재배포 자유, 표시 의무 없음 |
| **받은 곳** | `api.polyhaven.com/files/<slug>`로 1k jpg 원본을 받아(md5를 API 응답과 대조해 확인) 768px로 줄이고 WebP(품질 85)로 재인코딩 |
| **파일** | `textures/dungeon/floor_stone.webp`(92KB)·`floor_stone_2.webp`(114KB, `stone_tiles_02`)·`floor_stone_3.webp`(95KB, `mixed_rock_tiles`) — 방 바닥. `wall_stone.webp`(174KB)·`wall_stone_2.webp`(152KB, `stone_wall_04`)·`wall_stone_3.webp`(150KB, `medieval_blocks_05`) — 방 경계 벽 넷 |

사용자가 "바닥·벽 텍스처부터 받아와서 적용해 달라"고 요청 — 다섯 판 어디에도
재사용할 만한 돌바닥/돌벽 텍스처가 없어서(사가고 텍스처는 야외 지형용,
사가의숲·사가스토리의 `tile_stone.png`는 16×16 픽셀아트) 새로 받았다.
`js/dungeon3d.js`의 `texMat()`이 `THREE.RepeatWrapping`으로 타일링한다 —
diffuse 한 장만 쓰고(노멀·러프니스 맵 없음), 재질은 여전히
`MeshLambertMaterial`이라 다른 소품과 재질 종류가 갈리지 않는다. 색은
층 테마(`stone`)가 텍스처 위에 그대로 곱해져 "층마다 다른 색"이 산다.

**2026-09-04(이어서)** — 처음엔 바닥·벽 각 한 장뿐이라 사용자가 "단조로운
텍스처"라고 짚었다. 나무·바위처럼 방 씨앗(`field3d.seedOf`)으로 셋 중
하나씩 고르게 늘렸다(`pickTex()`) — 판정 없는 순수 장식 선택이라
`buildClutter`와 같은 요령을 그대로 빌렸다.

## Quaternius — RPG Character Pack (2026-09-03, 사람 기본, `models/people/quaternius_rpg/`)

| | |
|---|---|
| **만든 이** | Quaternius (<https://quaternius.com/packs/rpgcharacters.html>) |
| **라이선스** | CC0 1.0 (재배포 자유, 표시 의무 없음) |
| **받은 곳** | `saga-forest/assets/models/people/quaternius_rpg/` 에서 그대로 복사(같은 CC0) |
| **파일** | `Warrior.glb`·`Ranger.glb`·`Rogue.glb`·`Cleric.glb`·`Wizard.glb`·`Monk.glb`(원래 배포된 .gltf 임베드 base64를 바이너리 .glb로 변환 — 파싱 속도·용량 개선, 2026-09-03) |

`js/asset3d.js` 의 `HERO_RECIPES`(공개 기본값)가 이 여섯 벌을 가리킨다. 파일
하나에 몸·텍스처·리깅·걷기·공격·사망 클립이 다 들어 있어 아래 조합형의 옷·머리·
UAL1 몸짓이 필요 없다. 아래 조합형은 `HERO_RECIPES_FALLBACK` 으로 남겨 뒀다
(되돌림 자리).

## Quaternius — 사람 창고 셋, 옛 조합형 (`models/people/regular/` · `models/anim/`)

`saga-go`가 2026-08-29에 몸이 갈라지는 문제를 근본에서 없애려고 갈아 낀 그 셋이다
— 몸(Universal Base Characters) · 옷(Modular Character Outfits - Fantasy) ·
몸짓(Universal Animation Library)이 뼈 이름·순서(65개)까지 완전히 같아서
리타기팅 없이 그대로 물릴 수 있다.

| 항목 | |
|---|---|
| **만든 이** | Quaternius (<https://quaternius.com>) |
| **라이선스** | **CC0 1.0 Universal** — 세 팩 다 `License.txt`에 명시 |
| **저작자 표시** | 필요 없다 |
| **재배포** | 허용된다 |
| **받은 곳** | `saga-go/assets/models/people/regular/` · `models/anim/UAL1_Standard.glb`
  에서 그대로 복사(원출처는 itch.io `quaternius.itch.io/*` `[Standard]` 무료 등급) |

넣은 파일 — `models/people/regular/` 한 폴더(`.gltf`는 같은 폴더의 파일을 이름으로
부르므로 흩어 두면 안 된다): 몸 둘(남·여) · 옷 넷(평민·순찰대 각 남녀) · 머리
여섯 · 텍스처(BaseColor만, Normal·Roughness·ORM은 뺐다 — `js/asset3d.js`의
`delam()`이 PBR을 벗기고 Lambert로 갈아 끼운다). `models/anim/UAL1_Standard.glb`는
몸짓 마흔한 벌(기본판, 루트 모션 없음).

## Quaternius — 배우·자연물 (`models/animals/`, `models/nature/`)

같은 만든 이·라이선스(CC0). `saga-go`의 `models/animals/Wolf.glb`(짐승 형
적 중 몸집 작은 쪽 — 들개)와 `Cow.glb`(몸집 큰 쪽 — 남만 코끼리병. 딱 맞는
코끼리는 CC0 로 못 찾아 큰 네발짐승으로 대신한다, 몬스터 다양화)와
`models/nature/CommonTree_1·2·3.glb`·`Rock_1·2·3.glb`(들판 소품 — 나무·바위)를
그대로 복사했다. 2026-09-04, **늪(swamp) Biome**을 새로 얹으며
`models/nature/CommonTree_Dead_1.glb`(고목 — `saga-forest`에서 옮김)도
같은 자리에 더했다. 같은 날 `Rock_Moss_1.glb`(이끼 낀 돌, `saga-forest`·
`saga-story`에서 옮김)도 `rock` 표에 넷째 변형으로 넣었다(PLAN 7절 "이끼").

## Quaternius — 폐허·절벽·제단 소품 (`models/props/`, `models/nature/Mountain_*.glb`)

같은 만든 이·라이선스(CC0). 들판의 나머지 소품(기둥·무너진 벽·절벽·제단)도
`saga-go`가 이미 받아 둔 것을 그대로 옮겼다 — 딱 맞는 낱개 "부러진 돌기둥"
에셋은 없어서, `saga-go`가 `ASSET_LICENSES.md`에 스스로 적어 둔 "사당·폐허의
다른 후보"를 그대로 따랐다.

| 파일 | 이 판에서 쓰는 곳 |
|---|---|
| `models/props/Arch.glb` | **기둥**(`pillar`) — 무너진 아치로 대신한다 |
| `models/props/Wall.glb` | **무너진 벽**(`wall`) |
| `models/props/Temple.glb` | **제단**(`altar`) — `saga-go`가 "사당" 후보로 적어 둔 그것 |
| `models/nature/Mountain_1·2.glb` | **절벽**(`cliff`) |
| `models/props/Mine.glb` | **동굴 입구**(`cavemouth`) — `saga-go`가 "광산 어귀"로 적어 둔 그것 |
| `models/buildings/MarketStand_1.glb` | **행상 좌판**(`stall`) |

## Quaternius — 잡초·모닥불·진짜 텐트 (2026-09-04, `saga-forest`에서 옮김)

같은 만든 이·라이선스(CC0). SAGA WEB.md 지시("풀·꽃·덤불·버섯·통나무" 등
자연물 밀도)를 따라 이 판에 감사(audit)를 돌려 보니 **다른 네 판은 다 갖고
있는데 이 판에만 하나도 없던 자리**였다 — 이미 `saga-forest`가 CC0 라이선스를
확인해 받아 둔 것을 그대로 옮겨 왔다(원 출처는 위 두 절과 같은 GLB 미러:
`nature_pack`·`crops_pack`·`medieval_village_pack`·`survival_pack`).

| 파일 | 이 판에서 쓰는 곳 |
|---|---|
| `models/nature/Grass_2.glb` · `Grass_Short.glb` | **풀**(`grass`) — 들판 잡초 층(`field3d.js` `clutterAt()`) |
| `models/nature/Flowers.glb` | **꽃**(`flower`) |
| `models/nature/Bush_1·2.glb` | **덤불**(`bush`) — 숲 성격에서만 |
| `models/props/Mushroom_1·2.glb` | **버섯**(`mushroom`) — 숲 성격에서만 |
| `models/nature/WoodLog.glb` | **통나무**(`log`) — 숲 성격에서만 |
| `models/props/Tent.glb` | **야영 천막**(`tent`, `survival_pack`) — 들판 캠프(camp)에서 세운다. 예전엔 장터 좌판을 대역으로 썼는데(아래 옛 기록), 그 좌판은 `stall` 키로 옮겨 행상 POI 전용이 됐다 |
| `models/props/Bonfire_Lit.glb` | **모닥불**(`campfire`, `medieval_village_pack`) — 들판 캠프의 불씨. 예전엔 "CC0로 못 찾았다"고 적어 뒀던 자리인데, `saga-forest`가 이미 찾아 둔 것을 몰랐을 뿐이었다 |

옛 기록(참고용, 지금은 위로 대체됨): 천막은 한동안 장터 좌판(MarketStand)을
대역으로 썼고, 모닥불은 도형(잿더미+빛나는 불씨) 그대로였다. 둘 다 GLB 를
못 받으면 여전히 그 도형으로 조용히 돌아간다(fallback).

## Poly Haven — 나무·바위·수풀·통나무 사진측량 스캔 (2026-09-04, `saga-forest`에서 옮김, `models/nature/realistic/`)

| | |
|---|---|
| **만든 이** | Rob Tuytel·Rico Cilliers(`island_tree_02`) · James Ray Cock·Dario Barresi·Rico Cilliers(`dead_quiver_trunk`) · Jenelle van Heerden(`rock_07`) · Dario Barresi·Rico Cilliers(`stone_01`) · Kless Gyzen(`rock_moss_set_01`) · Rico Cilliers(`shrub_04`) · Rob Tuytel(`dead_tree_trunk`) · Jenelle van Heerden·Rico Cilliers(`dead_tree_trunk_02`) — 전부 Poly Haven (<https://polyhaven.com>) |
| **라이선스** | CC0 1.0 — 재배포 자유, 표시 의무 없음 |
| **받은 곳** | `saga-forest`가 2026-09-03에 이미 받아 심플리파이·리사이즈·jpeg 압축까지 끝내 둔 파일을 그대로 복사(md5 동일로 확인). 변환 경위(정점 수·감량률 등 실측)는 `../saga-forest/assets/ASSET_LICENSES.md`의 같은 제목 절 참고 |

사용자가 "사가고처럼 실사화" 요청 → 조사해 보니 **사람은 막다른 길**이었다
(Mixamo 재배포 금지, 대안 CC0 팩은 애니메이션 0개 — `saga-go/HANDOFF.md`
2026-09-04 절 참고). 대신 사가의숲이 이미 검증한 자연물 실사화만 옮겼다.

| 파일 | 이 판에서 쓰는 곳 |
|---|---|
| `models/nature/realistic/IslandTree_02.glb` | **나무**(`tree`) |
| `models/nature/realistic/TreeDead.glb` | **고목**(`tree_dead`) — 늪(swamp) Biome 에도 쓰인다 |
| `models/nature/realistic/Rock_07.glb`·`Stone_01.glb`·`MossRock_a·b·c.glb` | **바위**(`rock`, 다섯 다 한 표) |
| `models/nature/realistic/Shrub_04.glb` | **덤불**(`bush`) |
| `models/nature/realistic/Log_a.glb`·`Log_b.glb` | **통나무**(`log`) |

옛 저다각형 Quaternius 셋(`CommonTree_*`·`Rock_*`·`Bush_*`·`WoodLog.glb`)은
지우지 않았다 — `js/asset3d.js`의 `NATURE_STYLIZED`가 되돌림 자리다.

## Quaternius — 마을(모루골) 건물 (`models/buildings/`)

같은 만든 이·라이선스(CC0). 마을을 3D로 세우며(`town.js`의 `DECOR`) 추가로
옮긴 것 — `saga-go`의 `models/buildings/`에서 그대로 복사했다.

| 파일 | 이 판에서 쓰는 곳 |
|---|---|
| `models/buildings/House_1·2·3·4.glb` | **집**(`house`) — 넷을 자리 씨앗으로 섞어 세운다 |
| `models/buildings/Well.glb` | **우물**(`well`) — 마을 한복판 |
| `models/buildings/Blacksmith.glb` | **대장간**(`blacksmith`) — 야장(冶匠) NPC 뒤에 |
| `models/buildings/Inn.glb` | **여관**(`inn`) — 갈대나루(나루터). `saga-go`가 이미 받아 둔 것을 옮겼다 |
| `models/buildings/Stable.glb` | **마방**(`stable`) — 자작재(산길). 2026-09-04, 같은 `medieval_village_pack`에서 새로 받았다 |
| `models/buildings/Mill.glb` | **방앗간**(`mill`) — 소금벌(염전). 2026-09-04, 같은 팩. 염전 전용 CC0 에셋은 못 찾아 대신한다 |
| ~~`models/buildings/Bell_Tower.glb`~~ | **탑**(`belltower`) — 2026-09-04(이어서) `models/buildings/realistic/tower_round.glb`로 교체됨. 아래 새 절 참고. 옛 파일은 지우지 않았다(되돌림 자리) |

**위성 마을 셋이 왜 서로 다른 건물을 받았나.** 처음엔(2026-09-04 앞선 커밋)
셋 다 집+우물뿐이라 "빈 방"은 면했어도 테마(나루터·산길·염전)가 안 살았다.
`medieval_village_pack`을 다시 훑어 보니 이미 여관·마방·방앗간이 있었다 —
갈대나루엔 나그네가 쉬는 여관, 자작재엔 산길 마방, 소금벌엔(염전 전용은
없어) 방앗간을 대신 앉혔다.

## Poly Haven — 탑 (`modular_fort_01`에서 조각 하나만 추림, 2026-09-04, `models/buildings/realistic/`)

| | |
|---|---|
| **만든 이** | Rico Cilliers — Poly Haven (<https://polyhaven.com>) |
| **라이선스** | CC0 1.0 — 재배포 자유, 표시 의무 없음 |
| **받은 곳** | `api.polyhaven.com` 의 `modular_fort_01`(성채 모듈 키트, 8K, 28,218 폴리곤, 22개 조각) 중 원형 탑 노드(`tower_round`) 하나만 추림 |
| **파일** | `models/buildings/realistic/tower_round.glb`(516KB) |

**다른 건물(집·우물·대장간·여관·마방·방앗간)은 못 찾았다.** Poly Haven
모델 카탈로그(521개) 전수 확인 — `buildings`·`structures` 카테고리엔
현대 공장 파사드·롤러셔터 문·펜스 같은 도시 산업물뿐, 완결된 시골
건물이 없다(성문·철문 조각 정도). OpenGameArt CC0 집 모델도 몇 찾았지만
전부 손으로 그린 텍스처라 지금 실사화한 자연물·바닥·벽 옆에서 여전히
안 어울린다 — 껍데기만 CC0인 저다각형이지 사진측량이 아니다. **탑만은
됐다** — `modular_fort_01`이 성곽 모듈(벽·탑·성문 22조각)이라 그중
`tower_round`(원형 성탑) 하나가 "모루골 표지 건물" 자리에 그대로 맞았다.

**이 판엔 Blender·gltf-transform이 없어 처음으로 직접 변환했다**(다른
실사화는 전부 `saga-forest`가 이미 만들어 둔 파일을 복사만 했다). 순서:

1. `api.polyhaven.com/files/modular_fort_01`로 2k glTF(별도 `.bin`+텍스처
   9장 — wall·trim·plaster 재질별 diffuse·법선·거칠기)를 확인
2. **diffuse 세 장만** 받았다(법선·거칠기는 이 판 재질(`MeshLambertMaterial`)에
   안 쓰인다 — `delam`과 같은 이유, 위 `SAGA-HANDOFF.md` 2026-08-29절 참고).
   md5를 API 응답과 대조해 확인
3. `.gltf`의 각 재질에서 `normalTexture`·`metallicRoughnessTexture`를
   지웠다(Python으로 JSON 직접 편집) — 없는 텍스처를 참조하면 로더가
   깨진다. diffuse만 남은 자리엔 없는 법선·거칠기 파일 자리에 4×4 자리표
   이미지를 채워 넣어(어차피 참조 안 됨) 로더가 파일을 못 찾는 일이 없게 함
4. diffuse 세 장을 768px로 줄이고 jpeg 품질 85로 재압축
5. `trimesh`(Python, `pip install trimesh`)로 `.gltf`를 읽어 `tower_round`
   노드 둘(재질 두 개짜리라 지오메트리가 둘로 갈린다)만 새 Scene으로
   추려 단일 `.glb`로 구웠다 — 나머지 21개 조각(벽·성문 등)은 버렸다
6. 헤드리스 스크린샷(SwiftShader)으로 단독 렌더 확인 → 실제 마을 장면에
   놓고 확인 → 헤드리스 진단 241/241(3회 동일) 회귀 없음

성곽 모듈의 나머지 조각(벽·성문 등)도 CC0로 남아 있다 — 마을 담장·성문
꾸미기 등으로 나중에 더 쓸 수 있다(다음에 필요하면 이어서 추릴 것).

### 남은 건물 여섯(집·우물·대장간·여관·마방·방앗간) 재탐색 — 2026-09-04(이어서), 결론: 여전히 없음

탑에 이어 나머지 여섯도 실사화하려고 **위 셋(Poly Haven 카탈로그·OpenGameArt·
Sketchfab) 말고 다른 출처**를 새로 훑었다. 코드는 한 줄도 안 건드렸다 —
바꿔 끼울 게 없었기 때문이다.

- **Poly Haven — 카탈로그 훑기 대신 검색 API로 재검증.** `api.polyhaven.com/assets?t=models`
  전량(모델 하나하나의 이름·카테고리·태그)을 `well`·`blacksmith`·`smith`·
  `windmill`·`mill`·`inn`·`tavern`·`barn`·`stable`·`cottage`·`farmhouse`·
  `hut`·`village`·`house`·`cabin`·`shed` 로 훑어도 **0건**(`the_shed`라는
  이름의 소품 컬렉션이 하나 걸렸지만 공구 상자류였지 건물이 아니었다).
  앞선 "카탈로그 521개 훑음"이 카테고리 브라우징이었다면 이번엔 전수
  키워드 검색이라 훑는 방법이 달랐는데도 결론은 같았다 — **Poly Haven엔
  이 여섯이 원천적으로 없다.**
- **ambientCG — 이번에 처음 확인.** 텍스처·HDRI 위주 사이트인 줄 알았는데
  "3D Models" 카테고리가 있어 API(`api/v2/full_json`, `type=3DModel`)로
  같은 키워드 조합을 검색 — **0건**. 전체 3D 모델 수 자체가 적고
  (음식·소품류가 대부분) 건물이 아예 없다.
  ambientCG의 텍스처(바닥·벽)는 이미 다른 절에서 쓰고 있으니 헷갈리지 말 것.
- **itch.io — CC0 태그로 찾은 건 다 이미 걸러진 패턴 그대로였다.**
  `KayKit - Medieval Hexagon Pack`(마방·풍차·대장간·여관 다 있다!)과
  `Quaternius Medieval Village MegaKit` 둘 다 CC0에 건물 종류도 맞지만,
  **둘 다 저다각형 스타일(그라디언트 아틀라스 텍스처, 사진측량 아님)** —
  지금 실사화한 나무·바위·바닥·벽·탑 옆에서 다시 안 어울리는 그 문제로
  돌아간다(자연물 스타일 문제와 완전히 같은 이유). `saga-dungeon`이 지금
  집·우물·대장간에 쓰고 있는 `medieval_village_pack`도 사실 이 계열이다.
- **PolyScan(`polyscann.com`) — 이번에 처음 찾은 새 출처, CC0지만 로그인
  장벽에 막혔다.** "8K PBR 텍스처·CC0·로그인 불필요"를 내세우는 사이트라
  기대했지만, 실제 3D 모델 32개 전체가 **"Early Access" 상태로 Patreon
  로그인 뒤에 있다**(집 셋 — `medieval-stone-house`·`medieval-wooden-house`·
  `medieval-stone-and-wood-cottage` — 을 찾았지만 셋 다 이 상태다. 대장간은
  건물이 아니라 모루 소품(`medieval-blacksmith-anvil`) 하나뿐이고 우물·
  마방·방앗간·여관은 카탈로그에 아예 없다). 페이지에 "0일 뒤 공개"라는
  카운트다운이 있었지만 실제 다운로드 버튼은 여전히 Patreon 로그인을
  요구했다(정적 HTML에 직접 다운로드 링크도 없음 — JS+인증으로만 열린다).
  Sketchfab을 보류시킨 것과 같은 원칙("로그인 없이 받는다")으로 지금은
  보류. **나중에 이 사이트의 Early Access 딱지가 실제로 풀리면 다시 볼
  가치가 있다** — 집·오두막 셋은 스타일만 맞으면 후보가 된다.
- **BlendSwap — 새로 걸린 두 가지 장벽으로 기각.** 검색하면 대장간·건물
  모델이 여럿 나오지만(`Medieval House 005/007 - Blacksmith` 등),
  ① **다운로드에 로그인이 필요하다**(계정 없이 정적 페이지만 열면 로그인
  버튼만 보인다), ② 더 근본적으로 **이 자리(saga-dungeon 작업 환경)엔
  Blender가 설치돼 있지 않다** — 탑을 옮길 때 처음 겪은 "Blender 없음"
  제약이 여기서 결정타가 됐다. BlendSwap 모델은 대개 `.blend` 안에
  프로시저럴(노드 기반) 재질이라 **구운 텍스처 파일이 따로 없고**, glTF로
  내보내려면 Blender로 한 번 구워야 한다 — Python `trimesh`만으로는
  프로시저럴 셰이더를 읽을 수 없다. Blender가 없는 한 이 출처는 원천 봉쇄다.

**결론 — 이번 세션도 여섯 다 못 찾았다, 억지로 안 바꿨다.** `house`·`well`·
`blacksmith`·`inn`·`stable`·`mill` 여섯은 여전히 `medieval_village_pack`
(저다각형)을 그대로 쓴다 — 부록 "코드로 그리지 말고 에셋으로"의 원칙대로
"안 되면 안 된다"고 적어 둔다. `js/asset3d.js`의 `DEFAULTS`·`js/dungeon3d.js`의
렌더 분기는 손 안 댔다(둘 다 이미 `BLD_REAL` 자리로 갈아 끼울 준비가 돼
있으니, 다음에 후보가 생기면 탑과 같은 방식으로 한 줄만 바꾸면 된다).

## PolyScan — 집 둘 (2026-09-04, 바로 이어서 — 위 "로그인 장벽" 판단을 뒤집음)

위 절에서 "PolyScan 32개 모델 전부 Patreon Early Access 로그인 뒤"라고
적은 것은 **틀렸다.** 사용자가 "로그인해서 받아봐"라고 지시해 다시
확인해 보니, 자산 상세 페이지의 정적 마크업(WebFetch가 처음 읽은 것)엔
"Early Access" 문구가 남아 있었지만 **실제 다운로드 버튼은 로그인 없이
바로 뜬다** — 헤드리스로 실제 페이지를 렌더링(SwiftShader)해 스크린샷을
찍어 보니 잠금 표시가 없었고, DOM에서 뽑은 CDN 링크(`cdn.polyscann.com`)를
직접 `curl`로 쳐 보니 인증 없이 **200 OK**로 그대로 받아졌다. 페이지 텍스트만
보고 판단한 앞 절의 결론이 실제 동작과 달랐던 사례 — 다음에 비슷한 "로그인
필요" 표시를 만나면 텍스트만 믿지 말고 실제 다운로드 링크를 직접 쳐서
확인할 것.

| | |
|---|---|
| **만든 이** | PolyScan (<https://polyscann.com>) |
| **라이선스** | CC0 1.0 — 사이트가 "재배포·상업적 이용 모두 자유, 표시 의무 없음"으로 명시 |
| **받은 곳** | `https://polyscann.com/asset/medieval-stone-house-5d87ba` · `https://polyscann.com/asset/medieval-wooden-house-9b1b7b` — 로그인·가입 없이 CDN에서 직접 다운로드(`cdn.polyscann.com/PBR+TEXTURE/…`) |
| **파일** | `models/buildings/realistic/house_stone.glb`(285KB) · `house_wooden.glb`(246KB) |
| **원본 형식** | OBJ+MTL+FBX, 4K PBR 텍스처(Albedo/AO/Normal/Roughness/Metallic) 3벌(House·Bucket·Carriage), `.rar`로 묶여 있다(이 작업 환경엔 rar 해제 도구가 전혀 없어 `winget install 7zip.7zip`로 새로 설치해 풀었다) |

**골라낸 것 vs 버린 것.** 원본은 집+양동이+수레가 한 장면에 같이 들어
있다(PolyScan 갤러리 사진에 다 나온다). OBJ를 재질별로 갈라(`House`·
`Wood`·`Bucket`/`Carriage`) **건물 몸체(House)와 지붕·트림(Wood) 둘만**
추리고 양동이·수레는 버렸다 — 탑과 같은 이유로 이 판의 렌더 함수는
건물 하나만 기대한다.

**변환 순서** (탑과 같은 `trimesh` 파이프라인, 이번엔 원본이 이미
glTF/gLB가 아니라 OBJ라 한 단계가 더 늘었다):

1. `.rar` 다운로드 후 7-Zip으로 해제
2. `trimesh.load(..., split_object=True, group_material=True)`로 OBJ를
   재질별로 분리 — **wooden_cabin 쪽은 처음에 재질 이름이 다 뒤섞여
   나왔다**(`material_0`만 잡혔다): obj 안의 `mtllib` 줄이 `House M_F.mtl`을
   가리키는데 실제로 든 파일 이름은 `MEDIEVAL BUILDING.mtl`이라 참조가
   깨져 있었다 — mtl 파일을 참조된 이름으로 복사해 두니 정상적으로
   `House`/`Wood`/`Bucket`/`Carriage` 넷으로 갈렸다. **OBJ를 재질별로 가를
   때 그룹 이름이 이상하게 나오면 먼저 mtllib 참조가 실제 파일명과
   맞는지부터 볼 것**(트림메시가 조용히 fallback해서 겉으로는 에러가
   안 난다)
3. `House_BaseColor.jpg`(집 몸체) · `Wood_BaseColor.jpg`(지붕·트림) diffuse만
   받아 4096→768px로 줄이고 jpeg 품질 85로 재압축(법선·거칠기·금속성 맵은
   `MeshLambertMaterial`엔 안 쓰인다 — 탑과 같은 이유)
4. `House`·`Wood` 지오메트리 둘만 새 Scene에 넣어 단일 `.glb`로 구웠다
5. 격리 렌더(`_inspect_house.html`, 커밋에는 안 들어간다)로 단독 스크린샷
   확인 — 방향(Y-up)·텍스처가 다 정상. **실제 마을 장면(`_demo.html#camp`)
   스크린샷은 이번엔 포기했다** — 옛 stylized 집으로 되돌려도 똑같이
   렌더러가 죽는(`Abnormal renderer termination`, GPU 프로세스
   `exit_code=-1073741819`) **이 환경 고유의 기존 불안정성**(36개 GLB를
   SwiftShader로 한 장면에 올릴 때 생김, 이 세션의 변경과 무관함을 베이스라인
   비교로 확인)이라, 단독 렌더 확인 + 헤드리스 진단(`_test.html` 241/241
   3회 동일, `_admin.html?selftest` ADMIN 12/12)으로 대신했다

**여전히 못 찾은 것** — 우물·대장간·여관·마방·방앗간. PolyScan 카탈로그
32개 중 건물은 이 집 둘뿐이고(대장간은 건물이 아니라 모루 소품 하나),
나머지 넷은 이 사이트에도 아예 없다. 위 "재탐색" 절의 이 부분 결론은
그대로 유효하다.

**실기기 확인 전** — 단독 렌더로만 확인했다. 다음 세션은 마을 화면에서
집 둘이 실제로 걸리는지(자리 씨앗으로 넷 중 둘만 남았으니 등장 빈도가
반으로 줄었다) 실기기로 봐 줄 것.

## KayKit — Dungeon Remastered 소품 (`models/dungeon/`)

**2026-09-01, 방 안 소품 실험적으로 갈아 낌.** 여태 상자를 쌓아 흉내 내던
상자·횃불·기둥·감옥 창살을 실제 던전 소품 팩으로 바꿨다. Quaternius 와는
다른 작가·다른 라이선스 확인 경로다.

| 항목 | |
|---|---|
| **만든 이** | Kay Lousberg (<https://www.kaylousberg.com>) |
| **라이선스** | **CC0 1.0 Universal** — 저장소 `LICENSE.txt` 에 명시 |
| **저작자 표시** | 필요 없다. 그래도 적어 둔다(예의) |
| **재배포** | 허용된다 |
| **받은 곳** | <https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0>
  (Kay Lousberg 본인 GitHub 조직 — itch.io `kaylousberg.itch.io/kaykit-dungeon-remastered`
  페이지가 이 저장소를 그대로 가리킨다) `addons/kaykit_dungeon_remastered/Assets/gltf/` |

`models/dungeon/LICENSE.txt` 에 원문을 그대로 받아 옮겨 뒀다.

### 넣은 파일 — `js/asset3d.js` 의 `dg:` 로 묶은 표에 적혀 있다

| 파일 | 쓰이는 곳 |
|---|---|
| `chest.glb` | **상자**(`dg:chest`, POI: 상자) |
| `torch_mounted.gltf.glb` | **횃불**(`dg:torch`, 방 장식 `decor` 의 `torch`) |
| `pillar.gltf.glb` | **방 안 기둥**(`dg:pillar`, 방 장식 `decor` 의 `pillar`) —
  들판(field)의 `pillar`(Arch.glb, 폐허 조각)와는 **다른 자리**다. 헷갈리지 말 것 |
| `barrier_column.gltf.glb` | **갇힌 우리 창살**(`dg:cage`, POI: 이벤트방 captive) — 넷을 귀퉁이에 둘러 세운다 |
| `barrel_large.gltf.glb` | **술통**(`dg:barrel`, 방 구석 잡동사니) |
| `box_small.gltf.glb` | **상자**(`dg:crate`, 방 구석 잡동사니) — `dg:chest`(POI 보물상자)와는 다른 자리 |
| `crates_stacked.gltf.glb` | **상자 더미**(`dg:crates`, 방 구석 잡동사니) |
| `banner_thin_red.gltf.glb` | **보스방 현수막**(`dg:banner`) — 뒷벽에 둘 건다 |
| `table_long.gltf.glb` | **행상 곁상**(`dg:table`) — 좌판(MarketStand) 옆에 곁들인다 |
| `chair.gltf.glb` | **의자**(`dg:chair`, 방 구석 잡동사니) — 2026-09-04, SAGA WEB.md 소품 감사로 추가 |
| `sword_shield.gltf.glb` | **무기·방패**(`dg:shield`, 방 구석 잡동사니) — 2026-09-04, 같은 감사로 추가 |
| `floor_tile_big_spikes.glb` | **함정**(`dg:spikes`, 방 구석 잡동사니) — PLAN §G "던전" 목록. **판정(피해)은 없다** — 방에 위험한 인상만 주는 순수 장식이다. 실제 피해를 주는 함정 기믹은 밸런스 문제라 사람이 볼 자리로 남겨 뒀다 |
| `bed_decorated.gltf.glb` | **침대**(`dg:bed`, 방 구석 잡동사니) — 2026-09-05, 아래 "침대·책상" 절 참고 |
| `table_small.gltf.glb` | **책상**(`dg:desk`, 방 구석 잡동사니) — `table_long`(행상 곁상, `dg:table`)과는 다른 자리. 2026-09-05 |

**2026-09-01 이어서** — 방 구석 잡동사니(술통·상자·상자 더미)를
`buildClutter()`(`dungeon3d.js`)가 방마다 귀퉁이 넷 중 씨앗으로 고른
둘(다섯 중 셋은 비워 둔다)에 세운다. `field3d.seedOf(floor, roomIdx, 'clutter')`
를 그대로 빌려 써서 같은 방은 늘 같은 자리에 같은 것이 선다. 판정과 무관한
순수 장식이라 **fallback 도형이 없다** — GLB 를 못 받으면 그 귀퉁이는 그냥
빈다(다른 `dg:` 항목과 다른 점).

**2026-09-01 문(`dg:door`)도 걸었다.** 다시 보니 방향 값이 **없는 게
아니라 애초에 필요 없었다** — 2D(`dungeon-view.js`의 `ROOM_W - 10`)·
미니맵(`minimap.js`)이 이미 문을 **늘 동쪽(오른쪽) 벽 하나에만** 그린다
(`dungeon.js`의 `makeDoors`가 y만 정하고 x를 안 정하는 것도 그래서다).
그래서 회전은 문마다 다른 값이 아니라 `dungeon3d.js`에 박아 둔 고정값
(`rotation.y = Math.PI/2`)이다 — 새 판정 값을 보태지 않았다(`dungeon.js`는
한 줄도 안 건드렸다). 별도 검사용 페이지(`_inspect_door.html`, 커밋에는
안 들어간다)로 문 GLB만 떼어 놓고 회전값별 실루엣을 대조해 방향을 확인했다
— 벽이 뻗는 방향(Z축)과 문의 긴 축이 맞아떨어지는 값이 이것이었다.
잠금·해금은 모델을 안 바꾸고 색(tint)만 바꾼다 — 2D가 오래 쓰던 신호
(잠기면 어둡게, 풀리면 금빛 + 작은 발광 표식)를 그대로 지킨다.

**아직 안 옮긴 것도 있다** — 이 팩에 있는 침대·열쇠·접시 따위는 이번에도
손 안 댔다(초·병은 아래 새 절에서 받았다). 방 하나에 다 몰아넣기보다
눈에 잘 띄는 것부터 순서대로 늘리는 중이다.

### 계단 (2026-09-04, `stairs_wide.gltf.glb`)

SAGA WEB.md "G. 던전" 목록의 "계단". `dungeon.js`의 `makeDoors()`가 층의
마지막 방에 내는 문은 `kind: 'stair'`(다음 층으로 내려가는 자리, 2D는
이미 🪜 아이콘으로 표시한다)인데, 3D는 여태 다른 문(전투·보물·우물·사당)과
**완전히 같은 아치**(`dg:door`)로만 그려 이 신호가 3D에는 없었다. 같은
KayKit 팩(이미 CC0 확인됨)에서 `stairs_wide.gltf.glb`를 받아 이 문 하나만
갈아 끼웠다(`dungeon3d.js`의 문 렌더 루프에 `dr.kind === 'stair'` 분기 하나).

- 다른 문과 같은 자리(동쪽 벽, `rotation.y = Math.PI/2`)·같은 잠금 색
  신호(`doorTint` — 잠기면 어둡게, 풀리면 금빛)를 그대로 물려받는다.
  **판정(`dungeon.js`)은 한 줄도 안 건드렸다** — 이미 있던 door 렌더 순수
  장식 갈래에 새 kind 분기 하나를 더한 것뿐이다.
- 격리 렌더(`_inspect_stairs_tmp.html`, 커밋 안 함)로 회전 네 가지를 나란히
  세워 확인 — 정면(steps가 카메라를 향함)이 제일 읽기 쉽지만, 문과 같은
  회전(옆면 쐐기 실루엣)도 계단으로 알아볼 만해 **문과 같은 회전값을
  그대로 썼다**(회전마다 다른 값을 주면 "문 회전은 고정값" 이라는 기존
  원칙이 깨진다). GLB를 못 받으면 다른 문과 같은 아치 도형(fallback)으로
  조용히 돌아간다.
- 자가진단·`_admin.html?selftest`로 회귀 확인, `sw.js` VERSION을 올렸다
  (자세한 수치는 `README.md` 참고).
- **실기기 확인 완료** — 사용자가 1층 마지막 방까지 들어가 직접 확인,
  "잘보여". 확인 중 별도로 "다 네모(GLB 폴백)로 보인다"·"던전이 검은
  화면"이라는 제보가 있었지만, 여러 단계로 좁혀 보니 **이 계단 기능과도,
  이 판 코드와도 무관했다** — 회사 정책이 적용된 그 크롬 프로필(회사
  즐겨찾기가 있는 프로필)의 일반 창에서만 나던 문제였고, 같은 프로필의
  시크릿 창·다른 브라우저(엣지)에서는 처음부터 멀쩡했다. 서비스 워커
  재설정(`_swreset.html`)·3D 손잡이 초기화·확장 프로그램 전부 끄기까지
  다 해보고도 정상 모드만 안 됐던 것이 결정적 단서였다 — 캐시·세이브·
  코드 어느 것도 원인이 아니라는 뜻이다. **다음에 비슷한 "실기기에서만
  안 보인다"는 제보를 받으면, 코드를 의심하기 전에 먼저 시크릿 창이나
  다른 브라우저로 한 번 대조해 볼 것** — 이번처럼 브라우저 프로필
  자체(회사 보안 정책·강제 확장 등)의 문제일 수 있다.

### 초·병 (2026-09-04, 계단 바로 다음)

SAGA WEB.md "F. 소품" 목록의 "초"·"병". 계단과 같은 KayKit 팩에서
`candle_lit.gltf.glb`(불 켠 초)·`bottle_A_green.gltf.glb`(코르크 마개
녹색 병)를 받아 `buildClutter()`의 방 구석 잡동사니 표(`CLUTTER_KIND`)에
더했다 — 술통·상자·의자·방패·함정과 같은 자리(여덟 중 하나, 넷 귀퉁이
중 다섯에 하나꼴로 비운다)에 섞여 든다.

- **같은 팩의 열쇠(`key.gltf.glb`)·접시 더미(`plate_stack.gltf.glb`)는
  이번에도 건너뛰었다** — 치수를 실측해 보니 세로(Y)가 가로(X)보다
  훨씬 짧다(키: x=0.896·y=0.403, 눕혀진 모양). 이 판의 `normalize()`는
  **세로 기준으로 키를 맞추는** 관례라(문·기둥·횃불 등 "서 있는" 소품에
  맞춘 것) 세로가 짧은 걸 그대로 넣으면 배율이 커져 가로가 의도보다
  두 배 넘게 부푼다 — 억지로 넣기보다 부록 "안 되면 안 된다고 보고한다"
  원칙대로 건너뛰었다. 초·병은 반대로 세로가 확실히 가장 긴 치수라
  (초: y=1.051 vs x/z=0.33, 병: y=0.886 vs x/z=0.37) 이 관례에 잘 맞았다.
- 격리 렌더(`_inspect_clutter_tmp.html`, 커밋 안 함)로 둘 다 정상 로딩·
  제 모양(불 켠 초·코르크 병)으로 확인했다.
- 자가진단·`_admin.html?selftest`로 회귀 확인, `sw.js` VERSION을 올렸다.

---

## 도감(펫) 초상 실사화 — 동물 14종 (2026-09-04, `models/animals/`)

`portrait3d.js`는 인물(부대원) 도감 카드는 이미 실제 3D 모델로 굽고 있었는데,
**펫(짐승)은 처음부터 빠져 있었다**(`kind !== 'hero'`면 곧바로 되돌아가게
짜여 있었다). 사용자가 "도감 일러스트 실사화 확인해줘"로 감사를 시작 —
펫 41종을 나눠 보니 신수(神獸) 11종(삼족오·해태·청룡·백호…)과 포켓몬
오마주 16종(번개볼·불꼬리…)은 창작물이라 CC0 모델이 있을 리 없어 손 안
대고, **실제 동물 14종만** 채웠다(사용자가 이 범위로 골랐다).

### 새로 받은 것 — Poly Pizza (poly.pizza)

이 판 첫 세션들이 "GitHub만 열린다"고 적어 둔 망 제약은 **이제 유효하지
않다** — `quaternius.com`·`poly.pizza`·`api.polyhaven.com`·`opengameart.org`
모두 직접 열린다(2026-09-04 확인). Poly Pizza는 Poly by Google(구글이
접었던 Poly 아카이브)과 Quaternius 등 여러 창작자의 CC0/CC-BY 모델을
`https://static.poly.pizza/<uuid>.glb`로 로그인 없이 바로 받을 수 있는
곳이라 이번에 처음 썼다.

| 파일 | 원본 | 만든 이 | 라이선스 |
|---|---|---|---|
| `ShibaInu.glb` | poly.pizza `/m/y4wdQpg767` | Quaternius | **CC0** |
| `Husky.glb` | poly.pizza `/m/wcWiuEqwzq` | Quaternius | **CC0** |
| `Cat.glb` | poly.pizza `/m/2f54vbV0In` | Quaternius | **CC0** |
| `Tiger.glb` | poly.pizza `/m/5A3w06FXUup` | **Poly by Google** | **CC-BY 3.0** |
| `Bear.glb`("Black bear") | poly.pizza `/m/56ym_pyVnel` | **Poly by Google** | **CC-BY 3.0** |
| `Panda.glb` | poly.pizza `/m/2T6A0o4Kq2h` | **Poly by Google** | **CC-BY 3.0** |
| `Monkey.glb` | poly.pizza `/m/0yRz2AkLuuo` | **Poly by Google** | **CC-BY 3.0** |
| `Boar.glb` | poly.pizza `/m/57fSWum6F1P` | **Poly by Google** | **CC-BY 3.0** |
| `Owl.glb` | poly.pizza `/m/eoAo21aoZHJ` | **Poly by Google** | **CC-BY 3.0** |
| `Crane.glb`("Sandhill crane") | poly.pizza `/m/dazPSSmELaQ` | **Poly by Google** | **CC-BY 3.0** |

> **Tiger · Black bear · Panda · Monkey · Boar · Owl · Sandhill crane** —
> © **Poly by Google**, [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/).
> `poly.pizza`를 거쳐 받았다. 크기·자리만 맞추었고 형상은 그대로다.

**저작자 표시가 필요한 CC-BY 일곱 개다 — `saga-go`의 까치(Crow)와 같은
자리(위 "이 저장소에서 CC-BY는 이것 하나뿐이다" 문구는 이제 이 판에서는
유효하지 않다, 일곱이 더 늘었다). 지우거나 옮길 때 위 문구를 같이 옮길 것.**

**용량 손질** — `poly.pizza`에서 받은 그대로 두면 `Monkey.glb`가 5.6MB
(2048×2048 PNG 텍스처 하나가 대부분)였다. `trimesh`(Python)로 각 재질의
`baseColorTexture`를 512px 넘는 변은 줄이고 재압축해 다시 구웠다 —
Monkey 5.6MB→382KB, Owl 2.7MB→399KB, Crane 1.07MB→239KB, Bear 720KB→160KB.
지오메트리는 손 안 댔다(치수·형상 그대로).

### 이미 있던 것 — 다른 판에서 그대로 옮김

| 파일 | 원본 자리 | 만든 이 | 라이선스 |
|---|---|---|---|
| `Deer.glb` | `saga-go/assets/models/animals/Deer.glb` | Quaternius | CC0 |
| `Koi.glb` | `saga-go/assets/models/animals/Koi.glb` | `cute_fish_pack`(saga-go가 이미 씀) | saga-go 문서에 별도 라이선스 절이 없다 — 재확인이 필요하면 `saga-go/HANDOFF.md` 참고. 이미 공개 저장소에 떠 있는 파일을 그대로 옮긴 것이다 |
| `Mesh_Crow.gltf`+`.bin`, `Tex_Crow.webp` | `saga-go/assets/models/animals/` | **Poly by Google** | **CC-BY 3.0** — `saga-go/assets/ASSET_LICENSES.md` "Poly by Google — 까치" 절의 그 문구를 그대로 적용한다 |
| `Frog.glb` | GitHub `trebeljahr/quaternius-showcase` `public/glb/easy_enemies_pack/Frog.glb`(이 판의 Wolf·Cow·Deer와 같은 미러) | Quaternius | CC0 |

### 펫 → 모델 대응표 (`js/asset3d.js`의 `pet:*`, `js/portrait3d.js`의 `PET_ASSET`)

| 펫 id | 이름 | 모델 |
|---|---|---|
| `pt_jindo` | 진돗개 | ShibaInu |
| `pt_sapsal` | 삽살개 | Husky(북슬북슬한 털이 가장 가까웠다) |
| `pt_tiger` | 백두산호랑이 | Tiger |
| `pt_bear` | 반달가슴곰 | Bear |
| `pt_magpie` | 까치 | Mesh_Crow(까마귀 — 딱 맞는 까치 CC0가 없어 같은 까마귀과로 대신한다, `saga-go`가 이미 같은 선택을 했다) |
| `pt_crane` | 학 | Crane |
| `pt_toad` | 두꺼비 | Frog |
| `pt_carp` | 잉어 | Koi |
| `pt_panda` | 판다 | Panda |
| `pt_monkey` | 원숭이 | Monkey |
| `pt_deer` | 사슴 | Deer |
| `pt_boar` | 멧돼지 | Boar |
| `pt_owl` | 올빼미 | Owl |
| `pt_cat` | 고양이 | Cat |

### 진짜 버그 하나 잡음 — 초상 카메라가 모델 몸통 한복판에 있었다

펫을 얹으려고 `portrait3d.js`의 `camPlan()`(초상 카메라 자리를 정하는
순수 함수)을 보니 주석이 "키 1로 눕힌 모델 기준"이라 적혀 있었는데,
실제로 `bake()`를 부르는 `pump()`는 인물이든 펫이든 **항상 `mul=42`**로
모델을 세운다 — 키가 1이 아니라 42다. 격리 렌더로 직접 확인해 보니
모델 바운딩박스가 `y: 0~42`인데 카메라는 `z=3.7`에 서 있었다 — **카메라가
동물 몸통 한복판(또는 사람 다리 사이)에 파묻힌 채 텅 빈 배경만 찍고
있었다.** 인물 초상도 같은 함수를 쓰므로 이 버그를 처음부터 물려받고
있었다(이번에 펫을 얹으며 픽셀 단위로 직접 확인해 보기 전까지 아무도
몰랐던 자리로 보인다).

**고침**(`js/portrait3d.js`) — `camPlan()`의 `span`·`look`에 `UNIT`(=42,
`pump()`가 주는 그 값과 같다) 상수를 곱해 실제 키 기준으로 맞췄다. 카메라
원거리 클리핑(`far`)도 예전 값(40)이 새 카메라 거리(최대 약 160)보다
작아 물체가 아예 안 잘려 나가던 것을 400으로 올렸다. 격리 렌더로 고치기
전(빈 배경만)·고친 뒤(고양이·호랑이 등 또렷하게 보임)를 직접 대조해
확인했다 — `_inspect_petportrait_tmp.html`·`_inspect_heroportrait_tmp.html`
(둘 다 커밋 안 함).

**펫은 카메라 결도 다르게 얹었다** — 사람은 두 발로 서 있어 "가슴 위"
구도가 맞지만, 짐승은 네 발이라 몸통이 키의 1.5~2배까지 옆으로 길다
(`normalize()`가 키 기준으로만 배율을 매기기 때문). 몸 전체가 잘리지
않도록 펫일 때만 더 물러나고(`span` 키움) 낮은 곳을 보고(`look` 낮춤)
옆모습에 가깝게(`yaw` 키움) 잡는다.

**격리 렌더로 14종 다 확인** — 진돗개·삽살개·까치·두꺼비·판다·사슴·
멧돼지·고양이·호랑이·잉어는 또렷하게 보였다(순서대로, 한 번에 하나씩
구운 것과 여럿을 한꺼번에 부른 것 둘 다 시도). 곰·원숭이·올빼미·학은
**여럿을 한꺼번에 굽게 하면** 이 환경(헤드리스 SwiftShader)이 느려
`portrait3d.js`의 재시도 상한(24회×220ms≈5.3초, 실패를 한 번만 적어 두고
다시 안 시도하는 안전장치, 2026-09-02에 이미 있던 규칙)에 걸려 조용히
포기했지만, **하나씩 격리해 굽게 하면 넷 다 정상적으로 보였다** — 진짜
결함이 아니라 이 헤드리스 환경이 여러 WebGL 컨텍스트를 동시에 못
버티는 익히 알려진 사정이다(실제 사용자 브라우저는 도감을 스크롤하며
하나씩 굽게 되어 있어 이 경합이 거의 안 생긴다).

자가진단 **241/241** 3회 동일, 회귀 없음(펫 초상은 `_test.html`이 값으로
보지 않는 순수 화면 층이라 카운트 자체는 안 바뀐다). `sw.js` VERSION을
올렸다(수치는 `README.md` 참고).

---

## 침대·책상 (2026-09-05, 펫 초상 다음) — "침대는 안 맞는다"던 판단이 틀렸다

`js/asset3d.js`에 `dg:candle`·`dg:bottle`을 넣을 때(위 "초·병" 절) 옆에
적어 둔 주석이 "침대·접시·열쇠는 세로가 주된 치수가 아니라 이 파이프라인과
안 맞는다"였다. 이번에 SAGA WEB.md "F. 소품" 감사를 이어 하려고 실제로
GLB 치수를 재 보니 **키(key, 세로 0.40 : 가로 0.90 = 44%)·접시(plate, 세로
0.13 : 가로 0.97 = 13%)는 정말 거의 눕다시피 납작해 안 맞았지만, 침대는
전혀 다른 비율**(`bed_decorated`: 세로 1.70 : 가로 3.06 = 56%, 이미 이
목록에 쓰고 있는 `dg:chest`의 50%와 같은 급)이었다. 확인 없이 "침대도
비슷하겠지"로 셋을 한 묶음에 넣었던 게 오판 — PolyScan을 "로그인 필요"로
잘못 판단했던 것과 같은 종류의 실수다(텍스트·짐작만 보고 실측을 안 함).

- **쟀다** — GLB의 glTF JSON 청크(`accessors[].min/max`)를 파이썬으로 직접
  읽어 세 파일(`key`·`plate`·`bed_decorated`)의 바운딩박스를 재 대조했다.
  `trimesh`를 새로 설치할 필요 없이 파일 안에 이미 있는 값을 그대로
  읽은 것 — glTF 내보내기는 POSITION accessor에 min/max를 반드시 적는다.
- **`bed_decorated.gltf.glb`**(KayKit Dungeon Remastered, 이미 CC0 확인된
  같은 팩) — 맨 프레임(`bed_frame`)보다 이불·베개가 덮인 완성형을 골랐다.
  한눈에 "침대"로 읽히는 쪽이 맨 나무 뼈대보다 낫다(부록 "코드로 그리지
  말고 에셋으로"의 취지 — 알아볼 수 있어야 장식의 의미가 있다).
- **`table_small.gltf.glb`**(같은 팩) — SAGA WEB.md 같은 목록의 "책상".
  이미 `dg:table`(`table_long`, 행상 곁상 전용)이 있어 겹치지 않게 정사각
  발판(세로:가로:깊이 = 1:1:1)의 작은 것으로 갈랐다 — 이 비율이
  `normalize()`(세로 기준 배율)와 가장 잘 맞는 모양이기도 하다.
- 방 구석 잡동사니 표(`CLUTTER_KIND`, `dungeon3d.js`)에 `dg:bed`(mul 34,
  의자와 같은 급)·`dg:desk`(mul 26, 상자류와 같은 급)로 더했다 — 새 자리를
  만들지 않고 이미 있던 표에 둘만 늘렸다. **판정은 한 줄도 안 건드렸다.**
- 격리 렌더(`_inspect_bed_desk_tmp.html`, 커밋 안 함)로 나란히 세워
  스크린샷 확인 — 침대는 이불·베개가 또렷하고 책상은 두 다리가 대칭으로
  잡혔다. 자가진단 **241/241** 3회 동일(방 구석 장식은 순수 화면 층이라
  카운트는 안 바뀐다), `_admin.html?selftest` **ADMIN 12/12**. `sw.js`
  VERSION → `dungeon-v0.39.1`.
- **다음에 "세로가 짧아 안 맞는다"는 예전 메모를 다시 마주치면, 그
  메모가 실제로 잰 값이었는지부터 의심할 것** — 이번처럼 비슷해 보이는
  것 셋을 한 번에 건너뛰며 하나만 실측하고 나머지는 짐작으로 묶었을
  수 있다.

## 대장간 — 집 계열 세 번째로 (2026-09-05, 침대·책상 다음)

**사용자 지시** — "다른 건물로 변경해도 되니 있는걸로 위주로 해줘." 위
"남은 건물 여섯 재탐색" 절이 적어 둔 뒤로 PolyScan 카탈로그가 늘었는지,
`sitemap.xml`(전체 자산 URL 목록, 로그인 없이 그대로 열린다)을 다시
훑어 보니 그때 없던 항목 몇이 새로 걸려 있었다.

- **새로 걸린 것 확인** — `abandoned-brick-house`·`abandoned-two-story-
  brick-house`·`distressed-concrete-building`·`two-story-urban-brick-house`
  넷은 제목만 보면 건물이지만 실제 미리보기가 "Abandoned Industrial"·
  "Graffiti Tagged Urban Building"(현대 도시 폐건물, 콘크리트·낙서) —
  이 판의 중세 판타지 결과 아예 안 맞아 버렸다(저다각형이라 버렸던 것과
  같은 종류의 결 불일치, 이유만 다르다).
- **`medieval-stone-and-wood-cottage`(Rustic Stone and Wood Cabin)** —
  이건 다르다. 이미 쓰고 있는 `house_stone`·`house_wooden`과 **같은
  집 계열의 세 번째 모델**(돌벽+나무 지붕널, PBR, 로그인 없이 CDN
  직접 다운로드 확인)인데, 지난 재탐색 때는 "Early Access 로그인 필요"로
  오판했던 셋 중 하나였다가(위 "재탐색" 절 참고, 그 판단 자체는 뒤에
  "PolyScan 집 둘" 절에서 이미 뒤집혔다) 실제 변환까지는 이번에 처음 했다.
- **대장간 자리에 앉혔다.** PolyScan에 '대장간 건물'은 여전히 없다(모루
  소품 하나뿐) — 그래서 모양이 안 맞더라도 화기에 강한 석조 건물을
  대장간으로 쓰기로 했다(사용자 지시 그대로). `js/asset3d.js`의
  `'blacksmith'` 키를 `BLD`(medieval_village_pack 저다각형)에서
  `BLD_REAL + 'house_cottage.glb'`로 바꿨다 — `dungeon3d.js`·`town.js`는
  안 건드렸다(이 자리를 부르는 쪽은 이미 문자열 하나만 보므로).

| | |
|---|---|
| **만든 이** | PolyScan (<https://polyscann.com>) |
| **라이선스** | CC0 1.0 |
| **받은 곳** | `https://polyscann.com/asset/medieval-stone-and-wood-cottage-93ddf5` → `cdn.polyscann.com/…/Rustic_Stone_and_Wood_Cabin_3D_Model_01_4k.rar`(로그인 없이 직접 다운로드) |
| **파일** | `models/buildings/realistic/house_cottage.glb`(265KB) |

**변환 — 집 둘과 같은 파이프라인, 이번엔 한 단계 짧았다.** OBJ가
`House`·`Wood` 재질 둘로 이미 깔끔히 나뉘어 있었고(`mtllib` 참조도 실제
파일명과 맞아 있어 지난번 겪은 참조 깨짐이 없었다), 수레·양동이 같은
덤 오브젝트도 없어 **거를 것 자체가 없었다**. `trimesh.load(...,
split_object=True, group_material=True)`로 둘을 갈라 diffuse만
(`House_BaseColor`·`Wood_BaseColor`, 4096→768px jpeg85) 새 PBRMaterial에
얹고 단일 glb로 구웠다. 합친 바운딩박스 세로:가로 = 51~64%(축마다
다름) — 방 소품 정규화가 요구하는 범위(50% 안팎)에 잘 맞는다.

격리 렌더(`_inspect_cottage_tmp.html`, 커밋 안 함)로 단독 확인 — 돌벽·
나무 지붕이 정상 방향(Y-up)으로 텍스처까지 그대로 보였다. 자가진단
**241/241** 3회 동일, `_admin.html?selftest` **ADMIN 12/12**. `sw.js`
VERSION → `dungeon-v0.39.2`.

**남은 것** — 우물·여관·마방·방앗간 넷은 여전히 PolyScan에 그 종류
자체가 없다(집 계열만 있다). **실기기 확인 전** — 다음 세션·실기기에서
모루골 마을의 대장간이 실제로 이 돌집으로 걸리는지 볼 것(마을 화면은
GLB가 많아 이 작업 환경의 헤드리스 SwiftShader로는 안정적으로 못
찍는다 — 위 "PolyScan 집 둘" 절의 같은 한계, 그래서 이번에도 단독
렌더로 대신했다).

## 우물·여관·마방·방앗간 — KayKit 다른 팩에서 (2026-09-05, 대장간 다음)

**사용자 지시가 두 번 더 풀렸다.** 먼저 "다른 건물로 변경해도 되니 있는
걸로 위주로 해줘"(위 대장간 절), 그다음 "꼭 디아블로인 건 아니야 시대가
퓨전이야 여러 가지를 합쳐도 상관없어 완전 모방은 아니야" · "현대적이거나
미래적이거나 고전적이거나 아무거나 상관없어 무조건 맞추지는 마". 즉
**이 판의 실사·저다각형 스타일 통일도, 시대 통일도 더 이상 필수 조건이
아니다.** 이 조건으로 위 "재탐색" 절에서 "CC0에 종류도 맞지만 스타일이
안 맞아 버렸다"고 접어 뒀던 후보가 다시 열렸다.

- **KayKit — Medieval Hexagon Pack.** itch.io 페이지(`kaylousberg.itch.io/
  kaykit-medieval-hexagon`, "Name your own price")는 다운로드가 로그인
  뒤에 있다(`download_url` 엔드포인트가 미인증 요청을 `itch.io/g//`로
  돌려보낸다 — Sketchfab과 같은 부류의 진짜 장벽, PolyScan의 "가짜
  Early Access"와는 다르다). 그런데 **KayKit 던전 소품을 받아 온 바로 그
  경로**(Kay Lousberg 본인이 itch.io 각 팩을 자기 GitHub 조직에 그대로
  미러해 둔다)에 이 팩도 있었다 — `github.com/KayKit-Game-Assets/
  KayKit-Medieval-Hexagon-Pack-1.0`, `api.github.com`으로 조직의 저장소
  열 개를 검색해 이름으로 찾았다(`api.github.com/search/repositories?
  q=org:KayKit-Game-Assets`).
- **라이선스** — CC0 1.0 Universal(저장소 `LICENSE.txt`, itch.io 페이지의
  "Asset license" 항목과 동일).
- **받은 파일** — `addons/kaykit_medieval_hexagon_pack/Assets/gltf/
  buildings/blue/` 안의 `building_well_blue`·`building_tavern_blue`·
  `building_windmill_blue`·`building_barracks_blue`(각 `.gltf`+`.bin`,
  팩 전체가 공유하는 아틀라스 텍스처 `hexagons_medieval.png` 15KB 하나만
  같이 받으면 된다). 진영별 폴더가 blue·red·green·yellow·neutral 다섯인데
  이 판엔 진영 구분이 없어 **blue 하나만** 골랐다.
- **변환이 필요 없었다** — PolyScan 사진측량과 달리 이 팩은 원본 자체가
  이미 `.gltf`+`.bin`+작은 아틀라스로 가벼워, 재질 분리나 텍스처 리사이즈
  단계 없이 `trimesh.load(...).export(...)`로 단일 `.glb`만 다시 구웠다
  (`models/buildings/hexagon/well.glb`·`tavern.glb`·`windmill.glb`·
  `barracks.glb`, 각 60~270KB).
- **역할 배정 — 모양은 안 맞춰도 된다는 지시를 그대로 따랐다.**
  - `well` → `well.glb` — 이건 실제로 우물 모양이다(지붕 덮인 돌우물,
    두레박까지).
  - `inn`(여관) → `tavern.glb` — 이 팩에서 'tavern'은 큰 맥주통이 간판을
    겸하는 모양이다. 정통 여관 도상은 아니지만 이 팩 자체의 표현이고,
    사용자 지시로 정확도를 안 따진다.
  - `mill`(방앗간) → `windmill.glb` — 날개 달린 실제 풍차라 오히려 가장
    잘 맞아떨어졌다.
  - `stable`(마방) → `barracks.glb` — 이 팩엔 '마방'이라는 이름의 건물이
    아예 없다. 성벽 딸린 작은 요새 건물(병영)을 대역으로 앉혔다 —
    사용자 지시("아무거나 상관없어")를 가장 많이 쓴 자리다.
- `js/asset3d.js`에 `BLD_HEX = 'assets/models/buildings/hexagon/'`을
  새로 두고 `well`·`inn`·`stable`·`mill` 네 키를 여기로 옮겼다.
  `dungeon3d.js`·`town.js`는 안 건드렸다(문자열 하나만 보는 자리라서).
- 격리 렌더(`_inspect_hexbuild_tmp.html`, 커밋 안 함)로 넷을 한 화면에
  세워 확인 — 텍스처·형태 다 정상, 검정·깨짐 없음. 자가진단 **241/241**
  3회 동일, `_admin.html?selftest` **ADMIN 12/12**. `sw.js` VERSION →
  `dungeon-v0.39.3`.

**이걸로 SAGA WEB.md "E. 건물" 여섯(집·우물·대장간·여관·마방·방앗간)이
전부 실사 또는 CC0 완성 에셋으로 찼다** — 정확한 모양 일치가 아니라
"코드로 그리지 말고 에셋으로"라는 부록의 원칙만 지킨 결과다. 모양이
안 맞는 자리(대장간·여관·마방)는 위에 그 이유를 남겨 뒀으니, 나중에
진짜 맞는 모양을 찾으면 `asset3d.js`의 그 한 줄만 바꾸면 된다.

## 물(못) — 진짜 텍스처는 없었다, 완성 에셋 + 뒤집힌 면 버그 하나 (2026-09-05)

**사용자 요청 "물 텍스처 실사화"로 시작 — 결론은 "텍스처는 없다"였다.**
Poly Haven·ambientCG 전체 텍스처 카탈로그를 `water`·`pond`·`lake`·`river`
등으로 훑었지만 **타일링되는 물 표면 텍스처가 원천적으로 없다**(물은
사진 텍스처로 잘 안 만드는 소재 — Poly Haven은 아예 없고, ambientCG의
`Ice00x`는 얼어붙은 호수라 못과 안 맞아 걸렀다). KayKit Medieval Hexagon
Pack에 `hex_water` 타일이 있어 받아 봤지만 **단색 팔레트 하나일 뿐**이라
지금 있는 반투명 파란 상자와 실질적으로 다르지 않았다(코드 추가할 값이
없어 안 썼다).

- **poly.pizza에서 완성 diorama를 찾았다.** 'Pond'(Poly by Google,
  CC-BY 3.0 — Tiger·Bear 등에서 이미 쓰는 그 출처)는 바위 고리·연잎·
  기하학적 물결 데칼·물빛까지 다 갖춘 통짜 모델이다. `models/nature/pond.glb`
  로 그대로 옮겼다(재질이 이미 하나뿐이라 재질 분리·텍스처 리사이즈가
  필요 없었다 — 원본 diffuse가 이미 512px).
- **진짜 버그 하나 잡음 — 물 표면이 안 보였다.** `AS3.build('pond', ...)`로
  불러 봤더니 바위·연잎은 다 보이는데 **물 자체가 완전히 안 보였다**
  (배경이 그대로 비쳤다). 검은 재질도 아니고 완전히 투명한 것도 아닌
  "아예 없는 것처럼" 보이는 게 이상해 와이어프레임을 씌워 확인 —
  **지오메트리는 분명히 있었다.** `alphaMode: OPAQUE`,
  `baseColorFactor: [1,1,1,1]`이라 투명도 문제도 아니었다. 남은 설명은
  하나 — **물 사각형 하나만 면이 거꾸로 감겨(winding) 있어 단면 컬링
  (backface culling)에 걸린 것**. `material.side = THREE.DoubleSide`로
  강제하니 바로 보였다.
- **`delam()`(asset3d.js)에 이 처리를 항목으로 넣었다** — `side: m.side`
  (기존 재질의 값, 대개 기본 FrontSide)를 **항상 `THREE.DoubleSide`**로
  바꿨다. 이 판이 받는 CC0/CC-BY 에셋은 출처가 제각각이라 이런 뒤집힌
  면이 또 나올 수 있고, DoubleSide는 맞게 감긴 면에는 아무 영향이
  없다 — 못 하나만의 땜질이 아니라 **`delam()`을 거치는 모든 GLB에
  적용되는 방어적 기본값**으로 넣었다(그리기 비용 증가는 미미하다).
- **`js/dungeon3d.js`의 `pond` 가지를 고쳤다.** `normalize()`는 세로(Y)
  기준으로만 배율을 잡는데 이 에셋은 가로로 넓은 지형물이라, 원본의
  가로:세로 비(약 2.35:1)를 거꾸로 풀어 원하는 가로 폭에서 필요한
  세로 배율(`mul`)을 역산했다(`pondW * 0.4247`). 못 받으면 옛 반투명
  상자로 그대로 되돌아간다(fallback 그대로 유지). `js/asset3d.js`에
  `'pond': NATURE + 'pond.glb'`로 등록.
- 격리 렌더(`_inspect_pond3_tmp.html`, 커밋 안 함)로 상자(`dg:chest`)
  옆에 세워 크기를 눈으로 비교 확인. 자가진단 **241/241** 3회 동일
  (물은 순수 장식이라 진단이 값으로 안 본다), `_admin.html?selftest`
  **ADMIN 12/12**(delam() 변경이 다른 자산도 다 지나가므로 전체 재확인
  차원). `sw.js` VERSION → `dungeon-v0.39.4`.
- **늪(swamp) biome도 같이 좋아진다** — `field3d.js`가 늪의 웅덩이를
  물 쪽 'pond'를 그대로 재사용하므로 이 절 하나로 둘 다 해결된다.

| | |
|---|---|
| **만든 이** | Poly by Google |
| **라이선스** | **CC-BY 3.0** — 저작자 표시 필요 |
| **받은 곳** | `poly.pizza/m/5rf3YuZfJAW`(검색 `poly.pizza/search/pond`) → `static.poly.pizza/7a5a8cfd-9c13-4754-b944-24a8b1ea6fa6.glb` |
| **파일** | `models/nature/pond.glb`(366KB) |

> **Pond** — © **Poly by Google**, [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/).
> `poly.pizza`를 거쳐 받았다. 크기만 맞추었고 형상은 그대로다.

## 표지판(들판의 'post') — 이제 CC0로 찼다 (2026-09-05)

**여러 세션이 "이 팩·다른 네 판 어디에도 CC0로 맞는 게 없다"고 적어 두고
도형(장대+판)으로 남겨 뒀던 자리.** SAGA WEB.md 11절 "표지판"의 마지막
남은 장식 항목이었다.

- poly.pizza에서 `signpost`로 검색해 **Kenney의 'Signpost'**(CC0, Kenney
  에셋은 항상 CC0 — poly.pizza 페이지에도 "Public Domain (CC0)"로 표시)를
  찾았다 — pond와 같은 경로(`static.poly.pizza` 직접 다운로드, 로그인 불필요).
- 원본 비율이 세로(0.46) 대 가로(0.21)로 이미 세로가 최대 치수라, pond처럼
  가로세로를 뒤집어 풀 필요 없이 다른 대다수 소품과 같은 방식으로
  `normalize()`에 그대로 맡겼다(`mul = p.h * 1.15`, `js/dungeon3d.js`
  `post` 가지).
- 재질 하나(`wood`)뿐이라 `delam()`이 그대로 벗겨 쓴다. 못 받으면 옛
  도형(기둥+판)으로 그대로 돌아간다(fallback 유지). `js/asset3d.js`에
  `'post': PROPS + 'signpost.glb'`로 등록.
- 자가진단 **241/241**(표지판은 순수 장식이라 진단이 값으로 안 본다) —
  변경 없음 확인. `sw.js` VERSION → `dungeon-v0.39.5`.

| | |
|---|---|
| **만든 이** | Kenney |
| **라이선스** | **CC0** (Public Domain) |
| **받은 곳** | `poly.pizza/m/3U2lj1gpeH`(검색 `poly.pizza/search/signpost`) → `static.poly.pizza/e9da3a7a-a1c1-4f58-84f5-67e4277a0d01.glb` |
| **파일** | `models/props/signpost.glb`(6.4KB) |

> **Signpost** — © **Kenney**, CC0 (Public Domain). 저작자 표시 불필요.
> `poly.pizza`를 거쳐 받았다. 크기만 맞추었고 형상은 그대로다.

## 아직 안 옮긴 것

`saga-go`가 든 다른 에셋(탑·성벽 종류·기타 자연물)은 이 판에서 아직 안 쓴다 —
PLAN 4절의 우선순위를 따라 나무·바위·폐허(기둥·벽)·절벽·제단·동굴 입구·마을
건물까지 다 옮겼다. 천막·모닥불도 위 "잡초·모닥불·진짜 텐트" 절에서
실제 GLB(Tent·Bonfire_Lit)로 갈아 끼웠다 — 이 줄이 한동안 그 사실이 반영되기
전 상태로 남아 있었다(2026-09-05 바로잡음). SAGA WEB.md F 소품은 침대·책상까지
채워 다 찼고, E 건물도 대장간·우물·여관·마방·방앗간까지 다 채워(위 두 절
참고, 모양 일치보다 "코드로 그리지 말고 에셋으로"를 우선한 결과) A~G 전
카테고리가 실사 또는 CC0 완성 에셋으로 찼다. 남는 것은 saga-go의 탑·성벽
종류처럼 이 판이 아직 안 쓰기로 한 것뿐이다.
