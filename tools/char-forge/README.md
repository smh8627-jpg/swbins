# char-forge — 자체 인물 공방 (VRoid·Mixamo 대체)

> 상태: **설계만, 코드 없음**. 이 파일이 정본이다. 두 3D 트랙 PLAN(`saga-godot` 103-4 · `saga-unity` 103-3)과
> `SAGA-DESIGN.md` 는 여기를 가리키기만 한다. `tools/asset-forge` 처럼 **빌드 도구는 공유**(게임 코드 공유 금지와는 별개).

## 1. 왜

사용자(2026-09-24): "자동화가 문제가 많기도 하고 저작권 때문에 자체적으로 만들고 싶어" · "상용하게 되면 꼭 필요해".

사실관계(정직하게):

- **Mixamo** — 게임에 넣어 파는 건 약관상 허용된다. 하지만 ① 원본 재배포가 금지라 공개 저장소에 못 올린다
  (지금 `.gitignore` 로 로컬 전용이고, 다른 PC 는 다시 받아야 한다) ② Adobe 계정·로그인·웹 화면에 기대고 있어
  `tools/mixamo_automation` 이 사이트 개편마다 깨진다 ③ 약관·서비스가 바뀌면 우리가 막을 길이 없다.
- **VRoid Studio** — 결과물 권리는 만든 사람에게 있고 상업 사용도 된다. 하지만 ① Unity 로 만든 GUI 라
  접근성 트리·명령줄·API 가 없다(좌표 클릭만 되고, 조형은 사람 몫이다 — `saga-godot/docs/ASSET_GUIDE.md` 09-13)
  ② pixiv 약관상 "VRoid 모델을 자동 생성·변형해 내보내는 앱"은 별도 계약이 필요하다. 인물 105명을 코드로 뽑는 순간 이 선에 닿는다.
- 결론: 상용을 생각하면 **입력은 전부 CC0 이거나 우리가 코드로 만든 것**만 쓰고, 명령 한 번에 끝까지 도는 도구가 필요하다.

## 2. 원칙

1. **입력 = CC0 또는 자체 생성만.** 받은 팩마다 `sources.json` 에 이름·URL·라이선스·받은 날짜를 적는다. 라이선스를 확인 못 한 파일은 들이지 않는다.
2. **출력은 공개 저장소에 커밋할 수 있어야 한다.** 캐릭터 `.glb` 마다 `*.license.json`(쓴 입력 목록)을 옆에 둔다.
3. **창 없이 명령 한 번.** `blender -b --factory-startup -P tools/char-forge/build.py -- --recipe <인물.json> --style toon|pbr --out <경로>`. 사람 클릭 0회.
4. **같은 레시피는 늘 같은 결과.** 씨앗은 레시피 안의 인물 `id` 해시로 정한다(진단 씨앗 규칙과 같은 정신).
5. **이름 정책을 지킨다.** 레시피 파일 이름·키는 `id` 만 쓰고, 표시 이름은 게임 데이터가 갖는다.
6. **화질을 깎아서 맞추지 않는다**(메모리 `feedback_optimize_without_lowering_graphics`). 줄일 건 안 보이는 면·뼈·모프뿐이다.

## 3. 이 PC 에서 확인된 것 (2026-09-24)

- Blender **5.2.1 LTS** — `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`. `-b --factory-startup --python-expr` 가 창 없이 돈다. **Rigify 가 기본 탑재**되어 있다.
- MPFB(MakeHuman Blender 확장)는 **아직 설치 안 됨.** Blender 5.x 는 `blender -c extension ...` 로 명령줄 설치가 된다(0단계에서 확인).

## 4. 입력 후보 — 라이선스 확인분

| 입력 | 쓰임 | 라이선스(확인한 곳) |
|---|---|---|
| **MakeHuman / MPFB 기본 몸·모프·스킨** | 몸 비율(키·체격·나이·얼굴형)을 수치로 조절 | 기본 에셋 CC0, 내보낸 모델 CC0 — 닫힌 소스 상용 게임 OK. GPL 은 애드온 **코드**에만 걸린다(makehumancommunity.org FAQ "use in closed source"·"can I sell models"). **제3자 에셋은 따로 확인** |
| **Quaternius Universal Base Characters** | 이미 뼈가 심긴 기본 몸 6(보통·10대·영웅 비율 × 남녀) + 머리 모양 20 | CC0(quaternius.com). 무료판은 60~70%만 들어 있다 |
| **Quaternius Universal Animation Library 1·2** | 동작 120+·130+(걷기 여러 방향·전투·총·감정 표현). 위 몸과 같은 뼈 | CC0(quaternius.com, Godot Asset Store 에도 올라와 있다). 무료판은 일부만 들어 있다 |
| Blender Rigify | 괴물·비인간형 뼈 | Blender 안에 들어 있다. 만든 뼈에는 제약이 없다 |
| 자체 키프레임 | 원하는 동작이 팩에 없을 때 bpy 로 직접 짠다(등반·활공·방패 도발 등) | 우리 것 |

> 유료판(Pro·Source)도 CC0 이다. 무료판에 빠진 동작이 필요하면 사는 게 가장 싸다 — **결정은 사용자 몫**(§8).

## 5. 파이프라인 (한 명 = 레시피 하나 → `.glb` 한 벌)

| 단계 | 하는 일 | 방법 |
|---|---|---|
| A 몸 | 기본 몸을 불러 비율 모프를 섞는다 | MPFB 모프 **또는** Quaternius 몸 + 셰이프키. 툰은 머리 비율을 키우고 눈을 크게 한다 |
| B 뼈 | **표준 뼈 하나**(§6)에 묶는다 | 기본 몸의 가중치를 옮겨 오고(`DATA_TRANSFER`), 새 부품만 자동 가중치(`ARMATURE_AUTO`)를 쓴다 |
| C 머리카락 | 스타일 id → 메시 | 툰: 곡선 다발을 메시로 만든다(VRoid 식 덩어리 머리). PBR: 헤어카드 띠(unity ⑪ 에서 막혔던 "분리된 헤어 메시"를 이 단계가 만든다) |
| D 옷·장신구 | 부위 버텍스 그룹을 복제해 부풀린 껍데기 + kitbash 부품(갓·갑옷·기계 팔 — §13 세 시대를 섞는다) | `asset-forge/kitbash.py` 의 부품 규칙을 그대로 쓴다 |
| E 얼굴 | 툰: 눈·눈썹·입 **텍스처 데칼**을 코드로 그린다 + 눈 깜박임·아이우에오 셰이프키. PBR: MPFB 얼굴 모프 + CC0 스킨 | 대화 몸짓(saga-godot 106 ㉙)이 이 셰이프키를 쓴다 |
| F 재질 | 슬롯 이름을 표준으로 맞춘다(`skin`·`hair`·`cloth_a`·`cloth_b`·`metal`·`eye`) | Godot `cel_shader_apply.gd`·Unity `CharacterVisual` 이 이름으로 받는다. 색은 `asset-forge/palette.py` 로 팔레트에 맞춘다 |
| G 동작 | 표준 뼈 동작 묶음을 **따로** 한 파일로(`anim_lib_<트랙>.glb`) | 모든 인물이 뼈 하나를 같이 쓰니 재타겟은 한 번이다 |
| H 내보내기 | Godot: `.glb`. Unity: `.fbx`(Humanoid) 또는 glTFast `.glb` | 트랙마다 0단계에서 하나로 정한다 |

## 6. 표준 뼈

- **Quaternius Universal 뼈대를 기준으로 삼는다**(권장). 동작 팩이 이 뼈로 만들어져 있어 재타겟 손실이 없고,
  이름을 Godot `SkeletonProfileHumanoid` · Unity Humanoid 에 옮기는 대응표 **하나만** 두면 된다(`bonemap.json`).
- MPFB 몸을 쓸 때는 MPFB 의 "game engine" 뼈 → 이 표준 뼈로 가중치를 옮긴다.
- 지금 있는 `saga-godot/tools/mixamo_retarget.gd`(Mixamo → VRM `J_Bip_*`)는 "부모 체인 1:1 대조 + FK 발 높이 확인"
  **검증 방식**을 그대로 다시 쓴다. 대응표만 바뀐다.

## 7. 교체 순서

| 단계 | 할 일 | 끝났다는 기준 |
|---|---|---|
| 0 | 도구 뼈대: `build.py` · `bonemap.json` · `sources.json`. 무료판 팩 받기, MPFB 명령줄 설치 | 레시피 하나 → `.glb`. Godot 헤드리스 임포트 오류 0 · Unity 배치 임포트 오류 0 · 두 번 뽑아 파일 해시가 같다 |
| 1 | **동작 먼저 바꾼다**(가장 급하다 — 로컬 전용이라 다른 PC 가 막힌다). §9 대응표대로 UAL + 자체 키프레임 | Godot GO·FOREST 플레이어가 `idle/walk/sprint` 를 새 묶음으로 돈다. 발 높이 FK 오차 ≤ 1cm |
| 2 | saga-godot 몸: VRoid 셋(`AvatarSample_A`·`saga_forest_avatar_01`·`dungeon_hero_01`) → 툰 레시피 | `cel_toon` 으로 그렸을 때 외곽선·램프가 깨지지 않는다. 실기 확인은 모아서(사람 몫) |
| 3 | saga-unity 몸: Mixamo 인물·괴물(§9) → PBR 레시피. 괴물은 같은 몸에 비율 극단값 + kitbash(뿔·갑옷·버섯갓) | `CharactersRealistic/` 에 기대는 코드가 0 이 되고, 없는 PC 용 도형 대체도 필요 없어진다 |
| 4 | 인물 명단 → 레시피 대량 생성(도감 `id` 마다) | 인물마다 실루엣이 다르다(키·체격·머리·옷 네 축 중 둘 이상) |
| 5 | **상용 문턱**: `tools/asset-audit` 에 출처 검사를 추가한다. 빌드에 들어가는 파일 중 `*.license.json` 이 없거나 Mixamo·VRoid 출처가 있으면 🔴 | 두 트랙 모두 0건. 그다음 `mixamo_automation` 을 "옛 도구"로 표시한다(지우지는 않는다) |

## 8. 사람 몫 · 결정

- **팩 받기**: Quaternius 무료판은 itch.io 에서 받는데, 페이지가 JS 로 그리는 SPA 라 받기 버튼을 사람이 눌러야 할 수 있다
  (`ASSET_GUIDE.md` 09-13 에 같은 일이 있었다). 받으면 `Downloads` 에 두면 된다 — 세션이 먼저 거기부터 찾는다.
결정(2026-09-24 사용자):

- **D1 무료판만 쓴다.** 무료판에 빠진 동작은 자체 키프레임(§4 마지막 줄)으로 채운다.
- **D2 얼굴 = 툰 얼굴·실제 얼굴 둘 다.** 레시피에 `face: toon|real` 축을 둔다. 트랙마다 한 스타일 규칙(`SAGA-DESIGN.md` §6.0-1)은 그대로다 —
  saga-godot 는 `toon`, saga-unity 는 `real`. 한 화면에 두 얼굴을 섞지 않는다.
- **D3 Unity 는 FBX(Humanoid) 로 간다**(사용자가 "좋은 쪽으로" 맡김). 까닭: 지금 코드(`MixamoRigUtil`·`CharacterVisual`·Humanoid Avatar)가
  그대로 받아서 바꿀 코드가 가장 적다. Humanoid 리타겟은 Unity 에서 FBX 쪽이 가장 오래 검증됐다. Blender FBX 내보내기로 셰이프키·뼈를 둘 다 옮길 수 있다.
  glTFast 는 셰이프키·재질은 좋지만 Humanoid Avatar 를 따로 만들어 줘야 한다. Godot 은 `.glb` 그대로.

## 8-1. 그래픽 — 지금과 같나 (정직한 예상)

| 트랙 | 지금 | 공방 첫판 | 따라잡으려면 |
|---|---|---|---|
| godot 툰 | VRoid(삼각형 약 3만, 사람이 다듬은 머리·얼굴 그림) | 셰이더·빛·외곽선은 **같다**(`cel_toon` 그대로). 몸 비율도 비슷하게 된다. **머리카락·얼굴 그림은 첫판이 VRoid 보다 못하다** — VRoid 가 가장 잘하는 두 가지다 | 머리 다발 모양 수를 늘리고, 얼굴 데칼을 VRoid 급 선(눈 하이라이트·속눈썹 겹)으로 다듬는다 |
| unity 실사 | Mixamo 인물(오래된 게임 급 텍스처) | MPFB 사실 몸·CC0 스킨이라 **피부·몸은 같거나 낫다**(Maria 에 쓴 `FakeSSS` 를 그대로 붙인다). 헤어카드는 지금 없던 걸 새로 얻는다. **괴물(Warrok·Goblin 류)은 첫판이 못하다** — 조각한 모델을 비율 조정 + 부품으로 따라가기 어렵다 | 괴물은 Rigify 뼈 + 전용 조형(뿔·피부 결 노멀)을 따로 짠다 |

**교체 문턱(규칙)**: 새 모델은 **지금 것보다 못하지 않을 때만** 자리를 바꾼다. 같은 장면·같은 빛에서 둘을 나란히 두고, 그 판정은 실기 확인 때 사용자가 한다.
그때까지 지금 모델이 남는다. 그래서 화질이 떨어지는 구간은 생기지 않는다. 동작(§7 단계 1)은 모양이 아니라 움직임이라 이 문턱이 가볍다.

## 9. 지금 Mixamo·VRoid 가 쓰이는 자리 (2026-09-24 조사, 교체 대상)

| 트랙 | 자리 | 지금 | 대체 |
|---|---|---|---|
| godot | GO·FOREST 플레이어 몸 | VRoid `AvatarSample_A` · `saga_forest_avatar_01` | 툰 레시피 |
| godot | DUNGEON 영웅 | VRoid `dungeon_hero_01` | 툰 레시피 |
| godot | 동작 idle/walk/run/attack/hit/dodge/death/pickup | Mixamo(로컬 전용) → `mixamo_retarget.gd` | UAL 이동·전투 |
| unity | 주역·적 Maria·Abe·Brute | Mixamo 몸 + 클립 | PBR 레시피 + UAL |
| unity | 동행 무사(Paladin)·술사(Peasant Girl)·유격(Erika Archer)·마을 사람 | Mixamo | PBR 레시피 + 장비 소켓 |
| unity | 짐승·괴물(Goblin·Pumpkinhulk·Warrok·Parasite·Nightshade·Jolleen·Skeletonzombie) | Mixamo | 같은 몸의 비율 극단값 + kitbash, 떠 있는 것은 Rigify 뼈 |
| unity | 이동 기술(등반·활공·수영·물 위·점프)·방패 도발·시전 | Mixamo 클립 | UAL 에 있으면 그것, 없으면 자체 키프레임 |

클립 문구의 원래 목록은 `tools/mixamo_automation/README.md` 레시피 표에 있다. 교체가 끝난 줄은 이 표에서 **지운다**(상태 표).
