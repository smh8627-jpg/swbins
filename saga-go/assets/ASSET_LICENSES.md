# 에셋 출처와 라이선스 (saga-go)

새 `PLAN.md` **8절**이 시킨 대로, 이 폴더에 넣은 **바깥에서 가져온 에셋**의 출처와
라이선스를 여기 한곳에 적는다. **여기 없는 파일은 이 폴더에 두지 않는다.**

이 저장소는 공개다(<https://github.com/smh8627-jpg/swbins>). 그래서 재배포가
허용되지 않는 에셋은 애초에 받지 않는다.

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
| `Mesh_Crow.gltf` + `.bin` + `Tex_Crow.png` | **까치** (`magpie`) — **Quaternius 것이 아니다. 아래 따로 적었다** |

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
| `Well.glb` · `MarketStand_1.glb` | 아직 안 걸었다 — 우물·좌판 자리를 볼 때 쓴다 |

**`Inn.glb` 는 마을 목록에서 뺐다.** 그 여관이 이제 역참이다 — 마을에도 같은 여관이
서면, 들판에서 여관 모양을 보고 역참인 줄 알고 걸어갔다가 그냥 남의 집이 된다.

**역참에 우물·좌판을 섞지 않은 까닭.** `asset3d` 는 무엇이든 **키 1 로 눕히고**
(`normalize`) 세우는 쪽이 배율을 준다. 그런데 원본 키가 여관 3.49m · 우물 1.25m ·
좌판 1.05m 로 **셋에 하나까지 차이 난다** — 한 줄에 섞으면 우물이 여관만 해진다.
**키가 비슷한 것끼리만 한 줄에 묶는다.**

**받아 온 탑·여관에는 깃발이 없다.** 도형으로 세우던 역참에는 노란 깃발이,
성채에는 세력 빛깔 배너가 달려 있었고 **그것이 멀리서 알아보는 유일한 표식**이었다.
그대로 갈아 끼우면 성채가 어느 세력인지 화면에서 사라지므로, `asset3d.markOf` ·
`addMark` 가 깃발만 다시 얹는다(손잡이 `asset3d.mark` 를 0 으로 내리면 안 얹는다).

`models/people/` — 인물. `js/asset3d.js` 표의 `hero` 한 줄이 다 받는다

| 파일 | 쓰이는 곳 |
|---|---|
| `Knight.glb` | 인물 몸 한 벌 + **몸짓 원본**(열두 클립. 나머지 다섯 벌이 여기서 옮겨 입는다) |
| `King.glb` · `Casual.glb` · `Farmer.glb` · `Worker.glb` | 인물 몸 (`modular_men`) |
| `Lady.glb` | 인물 몸 (`modular_women` 의 `Medieval.glb`) |

여섯 벌을 **인물 id 해시로** 나눠 입고, 그 위에 `asset3d.tintOf` 가 세력 빛깔을 입힌다.
같은 사람은 늘 같은 몸 · 같은 빛깔이다.

`Knight` 를 뺀 다섯 벌은 **몸짓이 하나도 없다**(직접 열어 세었다 — 0개).
`three` 의 `SkeletonUtils.retargetClip` 으로 `Knight` 의 열두 클립을 옮겨 입힌다.
뼈 이름은 열여덟이 겹치는데 **쉬는 자세가 팔·다리에서 최대 180° 어긋나** 그냥 틀면
사지가 뒤틀린다 — 리타기팅이 월드 자세를 거쳐 풀어 주므로 맞는다.

**까치만 아직 도형이다.** 아래 '아직 안 가져온 것' 참고.

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
`Tex_Crow.png`)이다. `.gltf` 가 나머지 둘을 **이름으로** 부르므로 셋이 같은 폴더에
그대로 있어야 한다 — 하나만 빠져도 조용히 도형으로 돌아간다.

원본은 50 단위 키로 만들어져 있는데 `asset3d` 가 키 1 로 눕히므로,
까치 키(`animal.js` 의 `h: 0.42`)로 세우면 **42cm** 가 된다 — 실제 까치와 같다.

**날갯짓은 안 한다.** 이 모델에는 클립이 없다(정지 모델이다). 도형 까치는 코드가
날갯짓을 넣어 주었으니 **모양을 얻고 움직임을 내준 맞바꿈**이다.
되돌리려면 표에서 `pet:an_magpie` 줄을 지우면 도형으로 돌아간다.

---

## 아직 안 가져온 것 — 왜 안 가져왔나

- **Quaternius 의 공식 몸짓 묶음**(Universal Animation Library). CC0 미러가
  있는데(<https://github.com/J-Ponzo/gltf-universal-animation-library>)
  그 판은 **Godot 용 Rigify 뼈대**(`DEF-*`)라 이 모델들의 뼈 이름과
  **하나도 안 겹친다**(0/53. 직접 재 봤다). 그래서 안 받았다 —
  대신 `Knight.glb` 의 몸짓을 옮겨 입힌다
- **동양풍 건물.** 없다. 받을 수 있는 CC0 건물은 전부 유럽 중세다.
  **사용자가 그것을 알고 품질을 먼저 골랐다**(2026-08-28) — 그래서 얹었다.
  되돌리려면 손잡이 `prop3d.house` 를 0 으로 내리면 기와지붕 코드로 돌아간다

---

## 이 폴더에 절대 넣지 말 것

- **원작사(포켓몬GO · 디아블로 · 동물의숲 · 메이플스토리 · 삼국지)의 실제 에셋.**
  이 저장소는 문법만 따르고 그림은 스스로 구한다 — 루트 `CLAUDE.md` 참고
- 라이선스가 불분명한 것. "무료" 는 라이선스가 아니다
- 저작자 표시가 **필수**인 것(CC-BY 등)을 표시 없이
