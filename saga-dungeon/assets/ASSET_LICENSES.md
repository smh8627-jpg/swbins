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

---

## 아직 안 옮긴 것

`saga-go`가 든 다른 에셋(건물·짐승 넷·기타 자연물)은 이 판에서 아직 안 쓴다 —
PLAN 4절의 우선순위를 따라 나무·바위·폐허(기둥·벽)·절벽·제단·동굴 입구까지
다 옮겼고, 천막은 근사치로 대신했다. **모닥불만 여전히 도형이다**(위 참고).
