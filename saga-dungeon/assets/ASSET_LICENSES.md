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
| `models/buildings/Bell_Tower.glb` | **탑**(`belltower`) — SAGA WEB.md "E. 건물" 목록. 모루골에만 하나 세운다 |

**위성 마을 셋이 왜 서로 다른 건물을 받았나.** 처음엔(2026-09-04 앞선 커밋)
셋 다 집+우물뿐이라 "빈 방"은 면했어도 테마(나루터·산길·염전)가 안 살았다.
`medieval_village_pack`을 다시 훑어 보니 이미 여관·마방·방앗간이 있었다 —
갈대나루엔 나그네가 쉬는 여관, 자작재엔 산길 마방, 소금벌엔(염전 전용은
없어) 방앗간을 대신 앉혔다.

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

**아직 안 옮긴 것도 있다** — 이 팩에 있는 침대·병·초·계단·의자·열쇠·접시
따위는 이번에도 손 안 댔다. 방 하나에 다 몰아넣기보다 눈에 잘 띄는 것부터
순서대로 늘리는 중이다.

---

## 아직 안 옮긴 것

`saga-go`가 든 다른 에셋(탑·성벽 종류·기타 자연물)은 이 판에서 아직 안 쓴다 —
PLAN 4절의 우선순위를 따라 나무·바위·폐허(기둥·벽)·절벽·제단·동굴 입구·마을
건물까지 다 옮겼고, 천막은 근사치로 대신했다. **모닥불만 여전히 도형이다**
(위 참고).
