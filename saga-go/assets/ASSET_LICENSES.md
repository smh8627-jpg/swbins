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

셋 다 뼈대 애니메이션을 열두어 개씩 들고 있다(Idle · Walk · Gallop · Eating …).
`asset3d.js` 의 `mapClips` 가 이름을 씻어 자리에 맞춘다.

`models/buildings/` — 마을. `js/prop3d.js` 가 `InstancedMesh` 로 세운다

| 파일 | 쓰이는 곳 |
|---|---|
| `House_1·2·3·4.glb` · `Blacksmith.glb` | 민가 (`house`) |
| `Inn.glb` · `Tower.glb` · `PointyTower.glb` · `LargeTower.glb` · `Watchtower.glb` | 높은 집 (`tower`) |
| `Well.glb` · `MarketStand_1.glb` · `LargeSquareTowerBricks.glb` | 아직 안 걸었다 — 우물·역참·성채 자리를 볼 때 쓴다 |

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

**까치와 잉어는 아직 도형이다.** 이 묶음에 맞는 새·물고기가 없었고, 억지로 다른
짐승을 세우느니 여태 쓰던 도형이 낫다고 봤다.

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
