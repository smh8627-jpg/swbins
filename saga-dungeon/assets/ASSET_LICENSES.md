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

## Quaternius — 배우·자연물 (`models/animals/Wolf.glb`, `models/nature/`)

같은 만든 이·라이선스(CC0). `saga-go`의 `models/animals/Wolf.glb`(짐승 형
적 — 들개·코끼리병처럼 `kind:'beast'`인 적의 몸으로 쓴다)와
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

---

## 아직 안 옮긴 것

`saga-go`가 든 다른 에셋(건물·짐승 넷·기타 자연물)은 이 판에서 아직 안 쓴다 —
PLAN 4절의 우선순위(① 플레이어 캐릭터 ② 주요 적 ③ 보스 ④ 무기 ⑤ 나무 ⑥ 바위…)를
따라 사람·주요 적·나무·바위·폐허(기둥·벽)·절벽·제단까지 옮겼다. 남은 것(동굴
입구·천막·모닥불)은 더 필요해지면 `saga-go`에서 같은 식으로 옮기고 여기 표를
늘린다.
