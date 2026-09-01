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

## Quaternius — 사람 창고 셋 (`models/people/regular/` · `models/anim/`)

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
그대로 복사했다.

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
| `models/buildings/MarketStand_1.glb` | **천막**(`tent`) — **완전한 대역은 아니다**, 아래 참고 |

**천막은 딱 맞는 CC0 텐트를 못 찾았다.** 기둥+지붕 얼개가 비슷한 장터
좌판(MarketStand)을 대신 세운다 — `js/asset3d.js` 의 `DEFAULTS.tent` 한 줄만
바꾸면 나중에 진짜 텐트로 교체할 수 있다.

**모닥불(`fire`)은 에셋으로 못 옮겼다.** `saga-go` 창고에도 캠프파이어에
맞는 CC0 모델이 없다 — 억지로 안 어울리는 것을 끼우느니 도형(잿더미+빛나는
불씨) 그대로 두었다. 맞는 것을 구하면 여기 표에 줄을 늘린다.

## Quaternius — 마을(모루골) 건물 (`models/buildings/`)

같은 만든 이·라이선스(CC0). 마을을 3D로 세우며(`town.js`의 `DECOR`) 추가로
옮긴 것 — `saga-go`의 `models/buildings/`에서 그대로 복사했다.

| 파일 | 이 판에서 쓰는 곳 |
|---|---|
| `models/buildings/House_1·2·3·4.glb` | **집**(`house`) — 넷을 자리 씨앗으로 섞어 세운다 |
| `models/buildings/Well.glb` | **우물**(`well`) — 마을 한복판 |
| `models/buildings/Blacksmith.glb` | **대장간**(`blacksmith`) — 야장(冶匠) NPC 뒤에 |

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
