# char-forge — 자체 인물 공방 (VRoid·Mixamo 대체)

> 상태: **saga-godot 몸 = VRoid 직접 디자인으로 확정(D4, 2026-09-25)**. 공방 툰 몸(`_cmp_*`)은 얼굴이 원신풍 애니가 아니라 쓰지 않는다. 이 도구는 VRoid 주역에 CC0 동작·얼굴 굽기·게임 배선을 맡는다(§10 `vroid_intake.sh`). saga-unity(사실풍)는 단계 3(MakeHuman 사실 몸, `build_real.py`) — 첫 비교 몸 `_cmp_real_hero_f_01` 과 비교 장면 빌더까지 됐고 사람 판정을 기다린다(2026-09-25).
> `SAGA-DESIGN.md` 는 여기를 가리키기만 한다. `tools/asset-forge` 처럼 **빌드 도구는 공유**(게임 코드 공유 금지와는 별개).

## 1. 왜

사용자(2026-09-24): "자동화가 문제가 많기도 하고 저작권 때문에 자체적으로 만들고 싶어" · "상용하게 되면 꼭 필요해".

사실관계(정직하게):

- **Mixamo** — 게임에 넣어 파는 건 약관상 허용된다. 하지만 ① 원본 재배포가 금지라 공개 저장소에 못 올린다
  (지금 `.gitignore` 로 로컬 전용이고, 다른 PC 는 다시 받아야 한다) ② Adobe 계정·로그인·웹 화면에 기대고 있어
  `tools/mixamo_automation` 이 사이트 개편마다 깨진다 ③ 약관·서비스가 바뀌면 우리가 막을 길이 없다.
- **VRoid Studio** — 결과물 권리는 만든 사람에게 있고 **개인·법인 상업 사용이 된다**(Unity 등 앱에 넣어 파는 것도 명시 허용).
  금지는 "VRoid 결과물로 메시 변형·메시/텍스처 조합 기능이 있는 **앱을 만드는 것**"(사용자에게 꾸미기 도구를 배포하는 경우)이다.
  완성한 몸을 게임에 넣고, 엔진에서 색만 바꾸고, 동작을 입히는 건 여기 안 걸린다(2026-09-25 다시 확인 — 이전 판의 "105명을 코드로 뽑으면 닿는다"는 지나쳤다).
  한계는 GUI 전용이라 **조형은 사람 몫**이라는 것뿐이다(`saga-godot/docs/ASSET_GUIDE.md` 09-13).
- 결론: 상용을 생각하면 **입력은 전부 CC0 이거나 우리가 코드로 만든 것**만 쓰고, 명령 한 번에 끝까지 도는 도구가 필요하다.

## 2. 원칙

1. **입력 = CC0 또는 자체 생성만.** 받은 팩마다 `sources.json` 에 이름·URL·라이선스·받은 날짜를 적는다. 라이선스를 확인 못 한 파일은 들이지 않는다.
2. **출력은 공개 저장소에 커밋할 수 있어야 한다.** 캐릭터 `.glb` 마다 `*.license.json`(쓴 입력 목록)을 옆에 둔다.
3. **창 없이 명령 한 번.** `blender -b --factory-startup -P tools/char-forge/build.py -- --recipe <인물.json> --style toon|pbr --out <경로>`. 사람 클릭 0회.
4. **같은 레시피는 늘 같은 결과.** 씨앗은 레시피 안의 인물 `id` 해시로 정한다(진단 씨앗 규칙과 같은 정신).
5. **이름 정책을 지킨다.** 레시피 파일 이름·키는 `id` 만 쓰고, 표시 이름은 게임 데이터가 갖는다.
6. **화질을 깎아서 맞추지 않는다**(메모리 `feedback_optimize_without_lowering_graphics`). 줄일 건 안 보이는 면·뼈·모프뿐이다.

## 3. 쓰는 법

```bash
B="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"      # Blender 5.2.1 LTS, Rigify 기본 탑재
py tools/char-forge/fetch_sources.py                                 # 입력 팩 받기(sha256·CC0 확인, 사람 클릭 없음)
"$B" -b --factory-startup -P tools/char-forge/build.py -- \
    --recipe tools/char-forge/recipes/<id>.json --out tools/char-forge/_out/<id>.glb [--fbx tools/char-forge/_out/<id>.fbx] [--check]
"$B" -b --factory-startup -P tools/char-forge/verify.py -- --glb tools/char-forge/_out/<id>.glb   # .fbx 도 받는다
```

| 파일 | 하는 일 |
|---|---|
| `sources.json` | 입력 장부(팩·URL·라이선스·sha256). 여기 없는 파일은 안 쓴다 |
| `fetch_sources.py` | `_src/`(gitignore)에 받고 푼다. itch.io 무료 팩은 csrf → download_url → 파일 id(**key 없이** — 붙이면 "invalid key")로 받는다 |
| `bonemap.json` | 표준 뼈 53개 → Godot `SkeletonProfileHumanoid`·Unity `HumanBodyBones` 이름 |
| `build.py` | 레시피 → 몸·머리·눈썹·비율(머리 크기·키)·재질 이름(`skin`·`hair`·`eye`)·동작 굽기 → `.glb`(+`.fbx`) + `*.license.json` |
| `verify.py` | 내보낸 **파일을 다시 열어** 원본 동작과 맞댄다: 팔다리 방향 ≤ 5° · 땅 닿음 ≤ 1cm · 걷기 손목이 움직이나 |
| `recipes/` | 인물 레시피. `_test_*` 는 시험용, `_cmp_*` 는 단계 2 비교용(게임 인물 아님). 옷: `outfit`·`outfit_color`·`outfit_drop`(예: `Head_Hood`) |
| `bake_for_rig.py` | 이미 있는 몸(VRoid 등)의 뼈대에 동작만 굽는다 → 뼈대+동작 `.glb`. `--map vroid --clips 게임이름=UAL이름,…` |
| `rigmaps.py` | 표준 뼈 목록·기준 자식 표(뼈 방향)·뼈 이름 표(`identity`·`vroid`·`mpfb`) |
| `build_real.py` | **단계 3 사실 몸** — 레시피 → MPFB 몸(모프 `macro`)·`game_engine` 뼈·피부·눈·눈썹·속눈썹·이·머리·옷(MakeHuman system assets) → 모프 굳히기·옷 아래 살·도우미 지우기 → 재질 칸 이름 → UAL 동작 → `.fbx`(Unity Humanoid)+`.glb`. `BLENDER_USER_RESOURCES=tools/char-forge/_blender` 필요 |

동작 굽기 요점(`build.py` `retarget`): 몸 팩과 동작 팩의 쉼 자세가 목 14°·발 9° 쯤 달라, 곡선을 그대로 베끼면 자세가 기운다(측정: 칼 휘두르기 15.6°).
그래서 ① 뼈마다 쉼 방향을 원본 쪽으로 맞추는 최소 회전을 먼저 곱하고 ② 골반 이동은 **다리 길이 비**로 늘리고
③ 원본 발이 땅(±1cm)에 있으면 낮은 발이 땅에 닿게 골반 아래를 올리고 내린다(1~3cm 사이는 서서히 풀어 이륙·착지에서 튀지 않게).
MPFB(MakeHuman 확장)는 `fetch_sources.py` 가 `_blender/`(gitignore)에 설치하고 system assets 를 그 사용자 데이터에 푼다 — 사용자 Blender 설정과 따로다. 사실 몸 빌드:

```bash
export BLENDER_USER_RESOURCES="$PWD/tools/char-forge/_blender"
"$B" -b --factory-startup -P tools/char-forge/build_real.py -- --recipe tools/char-forge/recipes/_cmp_real_hero_f_01.json \
    --out tools/char-forge/_out/_cmp_real_hero_f_01.glb --fbx tools/char-forge/_out/_cmp_real_hero_f_01.fbx --check
"$B" -b --factory-startup -P tools/char-forge/verify.py -- --glb tools/char-forge/_out/_cmp_real_hero_f_01.fbx --map mpfb --clips idle=Sword_Idle,…
```

사실 몸 요점: 뼈를 부위보다 먼저 단다(붙이는 순간 가중치를 옮긴다 — MPFB `characterbuilder` 와 같은 순서). 재질은 `GAMEENGINE`(바탕색·노멀 그림을 원리 BSDF 에 바로 — FBX 로 그대로 간다). `bake_modifiers_remove_helpers(bake_masks=True)` 로 옷 아래 가려진 살을 실제로 지운다(운동복이면 허리 아래 몸이 빠진다). 세분화는 안 건다(폰 예산). 레시피 `macro` = MakeHuman 0~1 값(gender 0 여 · 1 남, race asian·caucasian·african).

옷 입히기 요점(`build.py` `dress`·`tuck_under_cloth`): 옷 팩은 Regular 비율이라 **옷 뼈대를 인물 뼈대로** 삼고, 몸 팩(Superhero)에서 머리·목·윗가슴(`HEAD_GROUPS`)만 떼어 Head 뼈 자리로 옮긴다. 머리·목만 남기면 트인 옷깃으로 잘린 자리가 30~40% 드러났다. 비어져 나온 살은 옷 면 6mm 아래로 눌러 넣고, 완전히 덮인 가슴 살은 지운다(목은 남긴다 — 벌어진 옷깃 속이 구멍으로 보이지 않게). 빌드가 `seam.covered`(잘린 가장자리에서 바깥으로 쏜 광선이 옷에 막히는 비율, UV 이음매 짝은 뺌)를 찍는다. `face: toon` 이면 노멀·거칠기 텍스처를 뗀다(saga-godot cel_toon 은 바탕색만 읽는다 — 39.5MB → 6~10MB). 텍스처는 2048² 까지.

## 4. 입력 후보 — 라이선스 확인분

| 입력 | 쓰임 | 라이선스(확인한 곳) |
|---|---|---|
| **MakeHuman / MPFB 기본 몸·모프·스킨** | 몸 비율(키·체격·나이·얼굴형)을 수치로 조절 | 기본 에셋 CC0, 내보낸 모델 CC0 — 닫힌 소스 상용 게임 OK. GPL 은 애드온 **코드**에만 걸린다(makehumancommunity.org FAQ "use in closed source"·"can I sell models"). **제3자 에셋은 따로 확인** |
| **Quaternius Universal Base Characters** | 이미 뼈가 심긴 기본 몸 6(보통·10대·영웅 비율 × 남녀) + 머리 모양 20 | CC0(quaternius.com). 무료판은 60~70%만 들어 있다 |
| **Quaternius Universal Animation Library 1·2** | 동작 120+·130+(걷기 여러 방향·전투·총·감정 표현). 위 몸과 같은 뼈 | CC0(quaternius.com, Godot Asset Store 에도 올라와 있다). 무료판은 일부만 들어 있다 |
| **Quaternius Modular Character Outfits - Fantasy** | 옷(무료판 넷: 여자·남자 × 순찰자·농부, 색 두 벌씩). 위 몸·동작과 같은 뼈 | CC0(quaternius.com·itch). 옷은 **Regular 비율**로 재단돼 있고 "머리만 쓰라"(팩 Readme) |
| Blender Rigify | 괴물·비인간형 뼈 | Blender 안에 들어 있다. 만든 뼈에는 제약이 없다 |
| 자체 키프레임 | 원하는 동작이 팩에 없을 때 bpy 로 직접 짠다(등반·활공·방패 도발 등) | 우리 것 |

> **무료판에 실제로 든 것(2026-09-24 풀어 봄)**: 몸 = Superhero 남·여 둘(피부 밝음·어두움 두 장), 머리 6(`Hair_Long`·`Buns`·`SimpleParted`·`Buzzed`·`BuzzedFemale`·`Beard`)·눈썹 2.
> 동작 45: 서기·걷기·조깅·질주·웅크려 걷기·뛰기(시작·공중·착지)·구르기·헤엄(앞·제자리)·칼(대기·베기)·주먹·권총·주문(시작·유지·쏘기·끝)·맞기(가슴·머리)·쓰러짐·줍기·앉기·말하기·춤·밀기·운전·고치기.
> 없는 것(자체 키프레임 몫): 벽 오르기·활공·방패 막기·도발·활 쏘기. Regular·Teen 몸은 무료판에 없다 → 비율은 셰이프·뼈 길이로 만든다.

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

- **Quaternius Universal 뼈대의 UE 마네킹 이름 판**(`root·pelvis·spine_01~03·neck_01·Head·clavicle_l…`, 65개 중 끝 뼈를 뺀 53개)으로 정했다.
  몸 팩(glTF)과 동작 팩 **Unreal 판 FBX** 가 같은 이름이다. 동작 팩의 Godot·Unity 판은 Rigify `DEF-*` 이름이라 쓰지 않는다.
  Godot `SkeletonProfileHumanoid` · Unity Humanoid 이름 대응표는 `bonemap.json` **하나만** 둔다(Unity 는 이 이름을 스스로 52개 잡았다).
- MPFB 몸을 쓸 때는 MPFB 의 "game engine" 뼈 → 이 표준 뼈로 가중치를 옮긴다.
- 지금 있는 `saga-godot/tools/mixamo_retarget.gd`(Mixamo → VRM `J_Bip_*`)는 "부모 체인 1:1 대조 + FK 발 높이 확인"
  **검증 방식**을 그대로 다시 쓴다. 대응표만 바뀐다.

## 7. 교체 순서

| 단계 | 할 일 | 끝났다는 기준 |
|---|---|---|
| 0 ✅ | 도구 뼈대: `build.py` · `verify.py` · `bonemap.json` · `sources.json` · `fetch_sources.py`, 무료판 팩 받기 | **통과(2026-09-24)** `_test_toon_01`: 뼈 65·삼각형 17,966·동작 44·빌드 41초. verify(파일 기준) glb 팔다리 0.0°·땅 0cm, fbx 0.7°·2.7mm. `.glb` 는 두 번 뽑아 sha256 이 같다. `.fbx` 는 Blender FBX 익스포터가 메모리 주소 순서로 돌아 바이트가 매번 달라 내용 검증(verify)으로 갈음한다. Godot 4.7 빈 프로젝트 임포트 오류·경고 0(`_Loop` 는 Godot 가 떼고 반복으로 표시 → `Idle`·`Walk`). Unity 6000.3 빈 프로젝트 FBX Humanoid 아바타 valid·human, 클립 44, 스킨 메시 4 |
| 1 ✅ | **동작 먼저 바꾼다**(로컬 전용이라 다른 PC 가 막혔다) | **통과(2026-09-24, saga-godot)** `bake_for_rig.py` → VRoid 셋 `J_Bip_*` 52뼈 × 여덟 동작, verify 0.0°·0cm(뒤돌아 있는 saga_forest_avatar_01 은 원본을 180° 돌려 굽는다) → `saga-godot/tools/ual_lib_build.gd` → `anim_cc0/*_lib.res`(커밋, 자체 확인 ≤ 0.10°) → `probe_anim_cc0.gd` 3/3 · godot_regress 통과. saga-unity 동작은 몸과 함께 단계 3 에서(Mixamo 인물마다 몸·동작이 한 벌) |
| 2 ⏳ | saga-godot 몸: VRoid 셋(`AvatarSample_A`·`saga_forest_avatar_01`·`dungeon_hero_01`) → 툰 레시피 | **판정 대기(2026-09-25)** `_cmp_go_01`(순찰자 여)·`_cmp_forest_01`(농부 여)·`_cmp_dungeon_01`(순찰자 남) → `saga-godot/assets/characters_cf/`. verify 0.0°·0cm, 목 가림 0.957·1.0·0.988, 6~10MB. 비교 장면 `tools/compare/CharCompare.tscn`(같은 해·env_pc·cel_toon·키 1.70m). 기준 = 사람이 "못하지 않다"고 한 짝만 게임에 넣는다(§8-1) |
| 3 ⏳ | saga-unity 몸: Mixamo 인물·괴물(§9) → PBR 레시피. **첫 짝 판정 대기(2026-09-25)**: `_cmp_real_hero_f_01`(주역 여 — 동양 0.8·운동복·말총머리) → `saga-unity/Assets/Art/CharactersForge/`. 13초 빌드·뼈 53·삼각형 4만·텍스처 ≤2048, verify fbx 0.7°·2.6mm · glb 0.0°·0mm, 두 번 빌드 glb 같은 바이트. 빈 Unity 6000.3 프로젝트: Humanoid 아바타 valid(뼈 52 자동), 클립 8 전부 Humanoid, 정점당 뼈 ≤4. 비교 장면 빌더 `Saga/Char Forge/Build Compare Real Scene`(지금 Maria | 공방, 같은 빛·키 1.70m·동작 저절로) — 빈 URP 프로젝트에서 통과, saga-unity 에서는 아직 안 돌림(다른 세션이 쓰는 중이었다). 공방 피부는 URP Lit(Maria 의 FakeSSS 는 아직 안 붙임). 괴물은 같은 몸에 비율 극단값 + kitbash(뿔·갑옷·버섯갓) | `CharactersRealistic/` 에 기대는 코드가 0 이 되고, 없는 PC 용 도형 대체도 필요 없어진다 |
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

- **D4 saga-godot 몸 = VRoid 직접 디자인(2026-09-25 사용자)**. 공방 툰 몸 셋을 비교해 보니 "얼굴이 원신 같은 애니 캐릭터가 아니다" · "구시대 서양인 캐릭터" —
  무료 CC0 팩 얼굴의 한계라 옷·머리를 바꿔도 안 된다. 선택지(외주·구매·AI 3D·코드 애니 얼굴) 중 VRoid 직접 디자인을 골랐다.
  AI 3D 는 애니 얼굴이 아직 뭉개지고, Hunyuan3D 라이선스는 **한국이 적용 지역에서 빠져 있어** 못 쓴다.
  `_cmp_*` 몸·`CharCompare.tscn` 은 남겨 둔다(새 VRoid 주역을 지금 몸과 나란히 볼 때 다시 쓴다).

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
| unity | 주역·적 Maria·Abe·Brute | Mixamo 몸 + 클립 | PBR 레시피 + UAL |
| unity | 동행 무사(Paladin)·술사(Peasant Girl)·유격(Erika Archer)·마을 사람 | Mixamo | PBR 레시피 + 장비 소켓 |
| unity | 짐승·괴물(Goblin·Pumpkinhulk·Warrok·Parasite·Nightshade·Jolleen·Skeletonzombie) | Mixamo | 같은 몸의 비율 극단값 + kitbash, 떠 있는 것은 Rigify 뼈 |
| unity | 이동 기술(등반·활공·수영·물 위·점프)·방패 도발·시전 | Mixamo 클립 | UAL 에 있으면 그것, 없으면 자체 키프레임 |

클립 문구의 원래 목록은 `tools/mixamo_automation/README.md` 레시피 표에 있다. 교체가 끝난 줄은 이 표에서 **지운다**(상태 표).

## 10. VRoid 주역 들이기 (사람 몫 → 도구 몫)

**사람 몫 — VRoid Studio 에서**
1. 새 모델을 만들어 얼굴·머리·옷을 디자인한다. **원신 등 실제 게임 캐릭터를 베끼지 않는다**(화풍은 따라가도 되지만 특정 캐릭터 디자인은 저작권 대상). 이름 정책대로 실존·원작 인물을 본뜨지 않는다.
2. 부품은 **VRoid 기본 제공 것**만. BOOTH 등에서 받은 텍스처·의상은 판매자 약관이 따로 있어 쓰기 전에 알려 준다.
3. 내보내기 → VRM(0.0·1.0 둘 다 된다). 라이선스 칸: 아바타 사용 = **모든 사람** · 상업 이용 = **개인·법인 허가** · 재배포 = **허가** · 개변 = **허가**
   (공개 저장소에 올리고 게임에 넣어 팔 수 있게 — 지금 VRoid 셋과 같은 설정).
4. 파일 이름을 id 로(영문 소문자·숫자·_, 예 `hero_go_02.vrm`) 저장해 **다운로드 폴더**에 두고, "어느 자리(GO 플레이어·FOREST·DUNGEON·STORY·NPC 등)에 쓸지"만 알려 준다.

**도구 몫 — 명령 한 번**

```bash
bash tools/char-forge/vroid_intake.sh ~/Downloads/hero_go_02.vrm hero_go_02
```

사본(.vrm+.glb) → 얼굴 데칼 굽기 → CC0 동작 여덟 굽기·파일 검증 → Godot 동작 묶음(`anim_cc0/<id>_lib.res`) → 셀 셰이더 얼굴 표 등록 → 실제 몸 점검(`probe_anim_cc0.gd`).
VRM 메타의 라이선스 칸을 찍어 준다 — 상업·재배포가 허가가 아니면 들이지 않는다. 게임 씬에 물리는 건 자리가 정해진 뒤 따로 한다.
