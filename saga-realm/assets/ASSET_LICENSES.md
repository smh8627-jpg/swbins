# 에셋 출처와 라이선스 (saga-realm)

이 저장소는 공개다(<https://github.com/smh8627-jpg/swbins>). 새로 넣은 **바깥에서
가져온 에셋**의 출처와 라이선스를 여기 한곳에 적는다. **여기 없는 파일은 이 폴더에
두지 않는다.**

`saga-go`·`saga-dungeon`·`saga-forest`가 이미 확인해 둔 것과 **같은 에셋을 그대로
옮겨 왔다**(PLAN 40절 부록 "다섯 판 공통 방침: 코드로 그리지 말고 에셋으로"). 라이선스를
어떻게 확인했는지(itch.io 미러 등 자세한 확인 경위)는 `../saga-go/assets/ASSET_LICENSES.md`
를 따른다 — 여기서는 **이 판에 실제로 옮긴 파일**만 추린다.

---

## Quaternius — 성채·탑 (`models/buildings/`)

`saga-go`의 `assets/models/buildings/`에서 그대로 옮겼다. `js/asset3d.js`가
성벽(`maxWall`) 값으로 세 등급 중 하나를 골라 세운다 — 등급이 높을수록 큰 탑.

| 항목 | |
|---|---|
| **만든 이** | Quaternius (<https://quaternius.com>) |
| **라이선스** | **CC0 1.0 Universal** |
| **저작자 표시** | 필요 없다. 그래도 적어 둔다 |
| **재배포** | 허용된다 |

| 파일 | 쓰이는 곳 |
|---|---|
| `Watchtower.glb` | 성채 1등급(`city:t1`) — 성벽이 낮은 작은 성 |
| `Tower.glb` · `PointyTower.glb` | 성채 2등급(`city:t2`) |
| `LargeTower.glb` · `LargeSquareTowerBricks.glb` | 성채 3등급(`city:t3`) — 업(鄴) 같은 대성 |

## Quaternius — 지형·자연물 (`models/nature/`)

`Mountain_1·2.glb`는 `saga-dungeon`에서, 나머지는 `saga-forest`에서 옮겼다.
국토 지도 3D(`js/realm3d.js`)가 성 둘레에 지형(land: mount)이면 산을, 그 밖엔
나무·바위를 몇 개씩 흩어 심는다(자리는 성 id 해시로 고정 — 매번 안 흔들린다).

| 파일 | 쓰이는 곳 |
|---|---|
| `Mountain_1.glb` · `Mountain_2.glb` | 산지(`land: 'mount'`) 성 둘레의 봉우리 |
| `CommonTree_1.glb` · `CommonTree_2.glb` · `PineTree_1.glb` | 성 둘레 나무 |
| `Rock_1.glb` · `Rock_2.glb` | 성 둘레 바위 |

## Quaternius — 잔장식 (`models/nature/`, `models/props/`, `models/buildings/`)

2026-09-01, PLAN 40절 PHASE 4(퀄리티 보강) — 폰 확인 후 "3D인데 퀄리티가 부족하다"는
피드백을 받고, `saga-go`·`saga-forest`가 이미 확인해 둔 같은 CC0 를 옮겼다. 새로
받은 파일은 하나도 없다.

| 파일 | 옮긴 곳 | 쓰이는 곳 |
|---|---|---|
| `Bush_1.glb` · `Bush_2.glb` | `saga-go/assets/models/nature/` | 성 둘레 작은 덤불(잔풀 레이어) |
| `Grass_2.glb` | `saga-go/assets/models/nature/` | 잔풀 레이어, 강가 갈대 |
| `Flowers.glb` | `saga-forest/assets/models/nature/` | 잔풀 레이어의 꽃 |
| `Wall.glb` | `saga-go/assets/models/props/` | 3등급 대성의 성벽 |
| `Temple.glb` | `saga-go/assets/models/props/` | 3등급 대성의 사찰풍 구조물 |
| `WoodenTorch.glb` | `saga-go/assets/models/props/` | 모든 성 성문 앞 횃불 두 개 |
| `MarketStand_1.glb` | `saga-go/assets/models/buildings/` | 3등급 대성의 시장 |
| `Well.glb` | `saga-go/assets/models/buildings/` | 모든 성의 우물 |
| `House_1~4.glb` | `saga-go/assets/models/buildings/` | 성 안 3D 도시 화면(`city3d.js`) — 인구만큼 세는 집 |
| `WoodLog.glb` | `saga-forest/assets/models/nature/` | 성 안 3D 도시 화면 — 군량만큼 쌓는 곳간 통나무 |

만든 이·라이선스는 위 성채·지형과 같다(Quaternius, CC0 1.0 Universal, 저작자 표시
불필요, 재배포 허용).

## 옮기지 않은 것 (앞으로)

동양풍 건축(성문·군영)에 맞는 CC0 에셋은 아직 못 구했다 — 탑·사찰은 서양풍 판타지라
이 판의 결(삼국지 동양 판타지)과는 다르다. **품질을 우선해 "결이 안 맞아도 둘 다
얹는다"**(PLAN 40절 부록)를 따라 우선 그대로 쓴다. 나중에 동양풍 CC0 성문·탑을
구하면 `js/asset3d.js`의 `DEFAULTS['city:t1'\|'t2'\|'t3']`만 바꾸면 된다 —
부르는 쪽(`realm3d.js`)은 안 건드린다.
