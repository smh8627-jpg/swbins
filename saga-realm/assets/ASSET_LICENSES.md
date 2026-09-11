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

## Quaternius — RPG Character Pack (2026-09-03, 사람 기본, `models/people/quaternius_rpg/`)

| | |
|---|---|
| **만든 이** | Quaternius (<https://quaternius.com/packs/rpgcharacters.html>) |
| **라이선스** | CC0 1.0 (재배포 자유, 표시 의무 없음) |
| **받은 곳** | `saga-dungeon/assets/models/people/quaternius_rpg/` 에서 그대로 복사(같은 CC0) |
| **파일** | `Warrior.glb`·`Ranger.glb`·`Rogue.glb`·`Cleric.glb`·`Wizard.glb`·`Monk.glb`(원래 배포된 .gltf 임베드 base64를 바이너리 .glb로 변환 — 파싱 속도·용량 개선, 2026-09-03) |

`js/asset3d.js` 의 `HERO_RECIPES`(공개 기본값)가 이 여섯 벌을 가리킨다. 파일
하나에 몸·텍스처·리깅·걷기·공격·사망 클립이 다 들어 있어 아래 조합형의 옷·머리·
UAL1 몸짓이 필요 없다. 아래 조합형은 `HERO_RECIPES_FALLBACK` 으로 남겨 뒀다
(되돌림 자리).

## Quaternius — 사람 창고 셋, 옛 조합형 (`models/people/regular/` · `models/anim/`)

2026-09-02, 도감 초상을 캔버스 도형 대신 **실제 3D 모델을 오프스크린으로 구운 그림**
으로 바꾸면서(`js/portrait3d.js` 신설) 처음 옮겼다. 이 판은 인물이 걸어 다니지
않아(턴제 지도) 여태 사람 창고가 없었는데, 초상을 구우려면 몸이 있어야 한다.
`saga-dungeon/assets/models/people/regular/`·`models/anim/UAL1_Standard.glb`
에서 그대로 옮겼다 — 몸(Universal Base Characters)·옷(Modular Character
Outfits - Fantasy)·몸짓(Universal Animation Library)이 뼈 이름·순서까지
같아 리타기팅이 필요 없다.

| 항목 | |
|---|---|
| **만든 이** | Quaternius (<https://quaternius.com>) |
| **라이선스** | **CC0 1.0 Universal** |
| **저작자 표시** | 필요 없다 |
| **재배포** | 허용된다 |
| **받은 곳** | `saga-dungeon/assets/models/people/regular/`·`models/anim/UAL1_Standard.glb` 에서 그대로 복사 |

넣은 파일 — 몸 둘(남·여)·옷 넷(평민·순찰대 각 남녀)·머리 여섯·텍스처
(BaseColor만), `models/anim/UAL1_Standard.glb`(몸짓 마흔한 벌). `HERO_RECIPES_FALLBACK`
이 여섯 조합 중 인물 id 해시로 하나를 고르고, `delam()`이 PBR을 벗겨 Lambert로
물들인다 — 표 기본에서는 빠졌다(되돌림 자리로만 남음).

## saga-dungeon — 무기·투구 (2026-09-05, `models/weapons/` · `models/gear/`)

장수 3D 초상(`js/portrait3d.js`)은 QRPG 맨몸(전사·궁수·도적·성직자·마법사·수도승
6종)뿐이었다 — 캔버스 초상(`js/sprite.js`의 `LOOK`·`ruleLook()`)은 장수마다
무기·투구를 갖춰 그리는데 3D 는 오히려 밋밋했다. **새로 받지 않고 사가블로가
이미 갖춘 CC0/CC-BY 무기·장구를 그대로 복사해 왔다** — 출처·라이선스는
`saga-dungeon/assets/ASSET_LICENSES.md`(무기·"몬스터 장구를 실사화" 절)가
원본이고, 여기는 파일만 옮겼다.

| 파일 | 라이선스 | saga-dungeon 원본 경로 |
|---|---|---|
| `models/weapons/sword.glb`·`spear.glb`·`axe.glb`·`bow.glb`·`club.glb`·`staff.glb`·`scroll.glb` | CC0 (Quaternius) | `assets/models/weapons/` |
| `models/weapons/brush.glb` | **CC-BY 3.0**(Poly by Google) | `assets/models/weapons/brush.glb` |
| `models/gear/helmet.glb`·`crown.glb` | CC0 (Quaternius) | `assets/models/gear/` |
| `models/gear/viking_helmet.glb`(`gapju` 대역) | **CC-BY 3.0**(Michael Fuchs) | `assets/models/gear/viking_helmet.glb` |

> **Paint Brush** — © Poly by Google, CC-BY 3.0. **Viking Helmet** — © Michael
> Fuchs, CC-BY 3.0. 둘 다 `poly.pizza`를 거쳐 saga-dungeon 이 먼저 받았고,
> 크기만 다시 맞추었다(형상은 그대로).

`js/asset3d.js`의 `attachAccessories()`가 `sprite.lookOf()`의 무기·투구 값을
그대로 읽어 붙인다 — halberd·guandao 는 spear, fan 은 brush, plume 투구는
helmet 을 대신 쓴다(사가블로 `dungeon3d.js`의 재사용 판단을 그대로 옮김).
scholar·gat·hairpin·monk·braid 투구는 대응 CC0가 없어 맨머리로 남는다 —
"안 맞아도 실제 모델이 도형(빈 자리)보다 낫다"는 사용자 지시에 따라, 무기
여덟 종은 걸고 나머지 다섯 투구 종만 열린 자리로 둔다.

**2026-09-10 재확인 — 여전히 대응 CC0 없음.** 이 판·`saga-dungeon`의
`assets/models/gear/`를 다시 뒤졌다(`helmet.glb`·`crown.glb`·
`viking_helmet.glb`·`armor_leather.glb`·`armor_metal.glb`·`cape.glb` 뿐).
다섯 다 형태가 뚜렷이 다른 머리쓰개(사방관·갓·비녀·승모·변발)라, 무기처럼
"칼이면 다 비슷한 창끝"으로 봐줄 여지가 없다 — 학자에게 바이킹 뿔투구를
씌우면 안 맞는 정도가 아니라 우스꽝스러워져, 여덟 무기 때와 달리 **맨머리
쪽이 여전히 낫다**고 판단해 그대로 둔다. 새 CC0를 인터넷에서 받는 것은
이번 작업 범위 밖이다.

## 동양풍 탑 — 채택 (2026-09-10)

위 "옮기지 않은 것" 문제(탑·사찰이 서양풍 판타지라 결이 안 맞는다)에 동양풍
CC0 후보를 구해 채택했다.

| 항목 | |
|---|---|
| **파일** | `models/buildings/asian/BellStructure.glb` |
| **만든 이** | Polygonal Mind ("lunar-year" 팩 — 설날/중국풍 정자) |
| **라이선스** | **CC0 1.0 Universal** — `github.com/ToxSam/cc0-models-Polygonal-Mind`(GLB 변환본, `License.md`) 확인. 원본은 `github.com/PolygonalMind/initiative-opensource-release` |
| **받은 경위** | GitHub 미러 두 곳(`open-source-3d-assets` JSON 색인 → `cc0-models-Polygonal-Mind` 실 GLB)을 이 세션이 직접 확인·다운로드. `raw.githubusercontent.com` 이라 이 저장소 네트워크 규칙 안에서 받을 수 있었다 |
| **저작자 표시** | 필요 없다(CC0) |
| **재배포** | 허용된다 |
| **용량** | 1.2MB — 지금 쓰는 Quaternius 탑(20~85KB)보다 15~60배 무겁다. 성 하나가 아니라 등급 하나(같은 GLB 를 공유)만 받으므로 총 다운로드량 자체는 크게 안 늘지만, 한 파일이 무겁다는 점은 남는다 |

**2026-09-10에 기본값으로 뒤집었다.** 예외적으로 허용된 헤드리스 스크린샷
한 번으로 1등급 성채(`city:t1`)에 실제로 세워 확인했다 — 붉은 기둥 두
개에 종을 거는 가로대가 얹힌 문(門)/종틀 형태로, 서양풍 Watchtower와
실루엣이 뚜렷이 다르게 선다. `js/asset3d.js`의 `core.tuned('asset3d.asianTower', 1)`
로 기본 켜짐, `_admin.html` 균형 손잡이 탭에서 0으로 내리면 서양풍으로
되돌아간다(코드를 걷어낼 필요가 없다).

**2·3등급 확장은 보류.** 같은 팩의 `Portal.glb`·`MainAltar.glb`를 2·3등급
후보로 점찍어 뒀었으나, 실제로 썸네일을 받아 확인해 보니 **탑이 아니었다**
— `Portal.glb`는 방 안에 놓는 3단 병풍(폴딩 스크린)+깔개, `MainAltar.glb`는
낮고 넓은 제단 상자다. 둘 다 실내 소품이라 성벽 위에 세울 탑으로는 안 맞아
채택하지 않았다. 2·3등급은 당분간 기존 서양풍 탑(`Tower.glb`/`PointyTower.glb`/
`LargeTower.glb`/`LargeSquareTowerBricks.glb`)을 그대로 쓴다 — 이 팩에서 더
받으려면 `Column.glb`·`BuildingBase.glb`·`RoomRoof.glb` 등 다른 조각을 조합해야
하는데, 이 저장소는 GLB를 조합 없이 한 파일 그대로 쓰는 방침이라 우선순위를
낮게 둔다.

## MPFB2 실사 몸 20종 — 초상 외형 다양화 (2026-09-10, `saga-go`에서 복사)

`js/asset3d.js`의 `HERO_RECIPES`(도감 초상용, `portrait3d.js`가 부른다)가
QRPG 6종뿐이던 것을 saga-go가 2026-09-05에 이미 뽑아 둔 MPFB2 실사 몸
20종(`assets/models/people/mpfb_real/{male,female,v3,v7~v23}.glb`, 각
3.5~4.3MB, 총 74MB)으로 더했다 — **라이선스는 CC0**(MPFB2 도구 자체는
GPLv3이지만 뽑아낸 모델은 `makehuman_system_assets_cc0.zip` 기반 CC0, 자세한
출처·재현 경위는 `saga-go/assets/ASSET_LICENSES.md`의 "MPFB2 +
makehuman_system_assets" 절 참고).

**이 판은 인물이 걷지 않는다** — `buildHero()`를 부르는 곳이 도감 초상 하나뿐이라
몸짓(mixer) 없이 정지 자세로만 서도 된다. 그래서 saga-go처럼 UAL1 몸짓을
뼈대 비례까지 맞춰 리타깃(`retargetInto()`)하지 않고, 각 MPFB 레시피의
`anim`을 **몸 파일 자신**(클립 0개)으로 줬다 — `buildHero()`의
`animC.clips.length` 검사가 그대로 걸러 mixer를 안 만들고 bind pose로
멈춘다. UAL1을 리타깃 없이 그대로 물렸다면 saga-go가 이미 겪은 뼈대 비례
뒤틀림 버그가 초상에 그대로 났을 것이다. 이 판에 걷는 3D 화면이 생기면
그때 `retargetInto` 계열 함수를 옮겨 와야 몸짓이 붙는다.

## Quaternius "Ultimate Monsters Bundle" 9종 — 균열 지역 수비 무장 (2026-09-10)

아홉째 확장(균열, 실제 지명이 아닌 첫 지역 — "너무 삼국지처럼 안 해도 돼,
현대 미래 과거 다 있어" 사용자 지시)의 수비 무장은 사람이 아니라 괴물이다.
`saga-dungeon/assets/models/monsters/quaternius/`가 이미 검증해 둔 CC0
자산을 그대로 복사해 왔다(같은 저장소 안이라 네트워크 재수신 없이 파일만
옮겼다) — 라이선스·출처는 saga-dungeon의
`assets/ASSET_LICENSES.md`("몬스터 — KayKit Skeletons + Quaternius
Ultimate Monsters Bundle" 절)과 완전히 같다.

| 파일 | 만든 이 | 받은 곳 | 라이선스 |
|---|---|---|---|
| `Alien_0bb74be9.glb` · `Alien_b048d82a.glb` · `Blue_Demon_6fbb8914.glb` ·
  `Demon_46b52ba4.glb` · `Goleling_Evolved_d6308fbf.glb` · `Yeti_40a831b3.glb` ·
  `Orc_Enemy_3076c5f7.glb` · `Ghost_Skull_0716bf8e.glb` · `Dragon_Evolved_90ed3740.glb` | Quaternius | `poly.pizza` 미러(saga-dungeon 경유) | **CC0**, 저작자 표시 불필요 |

원작 팩의 몬스터 이름(Alien·Demon 등)은 파일명(내부 식별자)에만 남아 있고
**화면에는 절대 안 뜬다** — 표시 이름(성혼·강마·종왕 등)은 이 판이 새로
지었다(`js/data-force.js` `FUTURE_OFFICERS`). `js/asset3d.js`의
`heroRecipe()`가 무장 데이터의 `monster` 필드(이 GLB들의 경로)를 곧장
몸+몸짓으로 쓴다 — 이미 각 파일에 idle·attack·death 등 클립이 다 박혀
있어(그 팩 자체가 그렇게 만들어졌다) 옷·머리 조합이 필요 없다. 아홉
파일 합쳐 약 1MB — 가볍다.

## Quaternius "Nature Enemies" 8종 + community Slime 1종 — 폐허 지역 수비 무장 (2026-09-11)

열째 확장(폐허, 균열 너머 — "다음 지역/콘텐츠 개발"로 사용자가 방향만
정하고 세부는 세션 재량에 맡긴 자리)의 수비 무장도 사람이 아니다 —
균열과는 다른 팩을 썼다. `saga-dungeon/assets/models/monsters/
quaternius2/`·`community/`가 이미 검증해 둔 CC0 자산을 그대로 복사해
왔다(같은 저장소 안이라 네트워크 재수신 없이 파일만 옮겼다) — 라이선스·
출처는 saga-dungeon의 `assets/ASSET_LICENSES.md`와 완전히 같다.

| 파일 | 만든 이 | 받은 곳 | 라이선스 |
|---|---|---|---|
| `quaternius2/Zombie.glb`·`Giant.glb`·`SkeletonSolo.glb`·`Spider.glb`·
  `Snake.glb`·`Rat.glb`·`FrogEnemy.glb`·`Wasp.glb` | Quaternius | `poly.pizza` 미러(saga-dungeon 경유) | **CC0**, 저작자 표시 불필요 |
| `community/SlimeEnemy.glb` | **Charlie** | `poly.pizza/m/6O6XUMssAW`(saga-dungeon 경유) | **CC-BY** — 저작자 표시 필요 |

> **Slime Enemy** — © **Charlie**, CC-BY(`poly.pizza/m/6O6XUMssAW`). 이
> 저장소에서 이 판이 CC-BY 를 쓰는 유일한 자리다(나머지 여덟은 전부 CC0).

원작 파일명(Zombie·Giant 등)은 여기서도 화면에 안 뜬다 — 표시 이름(부생·
거해·서군 등)은 이 판이 새로 지었다(`js/data-force.js` `RUIN_OFFICERS`).
`Wasp.glb`는 idle 클립이 없고 `Flying`뿐이라(균열 아홉 종엔 없던 경우)
`asset3d.js`의 `WORDS.idle`에 `flying`을 더해 매칭했다(saga-dungeon 쪽은
같은 이유로 `fly`를 넣었다 — 어느 쪽이든 `Wasp_Flying`과 매칭된다) —
안 그러면 벌이 가만히 bind pose로 굳어 있었을 것이다. 아홉 파일 합쳐
약 1.27MB.

## KayKit Character Pack: Skeletons 4종 — 묘역 지역 수비 무장 (2026-09-11)

열한째 확장(묘역, 균열·폐허에 이은 셋째 몬스터 팩)의 수비 무장은 되살아난
해골 병사다. `saga-dungeon/assets/models/monsters/kaykit_skeletons/`가
이미 검증해 둔 CC0 자산을 그대로 복사해 왔다(같은 저장소 안이라 네트워크
재수신 없이 파일만 옮겼다) — 라이선스·출처는 saga-dungeon의
`assets/ASSET_LICENSES.md`("몬스터 — KayKit Skeletons + Quaternius
Ultimate Monsters" 절)와 완전히 같다.

| 파일 | 만든 이 | 받은 곳 | 라이선스 |
|---|---|---|---|
| `kaykit_skeletons/Skeleton_Mage.glb`·`Skeleton_Minion.glb`·
  `Skeleton_Rogue.glb`·`Skeleton_Warrior.glb` | Kay Lousberg(KayKit) | `github.com/KayKit-Game-Assets`(saga-dungeon 경유) | **CC0**, 저작자 표시 불필요(권장) |

**이 팩만 9인이 4종을 나눠 쓴다** — 균열·폐허는 무장 한 명당 GLB 한 개씩
1:1이었는데, 이 팩은 한 벌이 2.5MB 안팎(몸마다 근접·원거리·2인용 무기
애니메이션이 90여 개씩 내장돼 있어서다)이라 9벌을 다 받으면 20MB를
넘는다. `asset3d.js`의 `acquire()` 캐시가 URL 기준이라 같은 GLB 를 쓰는
인물끼리는 실제로 한 번만 받고, tint(세력색)로만 서로 다르게 보인다 —
전투(`battle3d.js` `setupDuel()`)에서 같은 팩 인물끼리 마주 세우면 몸이
겹칠 수 있다는 뜻이다(예: 강해·고전이 둘 다 Warrior). 네 파일 합쳐
약 10.5MB — 균열·폐허(합쳐 약 2.3MB)보다 훨씬 무겁다.
