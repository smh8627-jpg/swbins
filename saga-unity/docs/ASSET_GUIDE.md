# ASSET_GUIDE

PLAN.md 34장에서 만들기로 해 놓고 안 만들었던 문서 — 2026-09-12, 첫 GLB
에셋(캐릭터 4종) 교체를 하면서 같이 만들었다. saga-godot의 같은 이름
문서와 형식을 맞춘다 — **무엇을 왜 골랐는지**만 짧게 적는다.

## 출처 — Kenney.nl, CC0, saga-godot 트랙과 같은 파일 재사용

루트 CLAUDE.md "하지 말 것"의 "원작사의 실제 에셋 가져다 넣기" 금지는
포켓몬GO·디아블로 같은 원작 IP의 실제 리소스를 뜻한다. Kenney의
CC0(퍼블릭 도메인) 킷은 그 원작들과 무관한 제3자 소재라 해당하지
않는다(PLAN.md 8장·`saga-godot/docs/ASSET_GUIDE.md`와 같은 근거).

**두 트랙이 같은 파일을 그대로 재사용한다** — PLAN.md 0장 "기획만 같이
본다"는 코드 얘기고, CC0 소재는 라이선스가 같으니 새로 받을 이유가 없다
(PLAN.md 8장이 이미 그렇게 정해 둠). `saga-godot/assets/characters/*.glb`
4개(character-a~d) + `Textures/texture-{a,b,c,d}.png`를 그대로 복사해
`Assets/Art/Characters/`에 넣었다.

| 킷 | 받은 날(saga-godot 기준) | saga-unity 도입일 | 용도 |
|---|---|---|---|
| [Blocky Characters](https://kenney.nl/assets/blocky-characters) 2.0 | 2026-09-11 | 2026-09-12 | 플레이어·NPC·산적 |
| [Nature Kit](https://kenney.nl/assets/nature-kit) 2.1 | 2026-09-11 | 2026-09-12 | 나무·바위 |
| [Fantasy Town Kit](https://kenney.nl/assets/fantasy-town-kit) 2.0 | 2026-09-11 | 2026-09-12 | 마을집 벽/지붕·폐허 기둥·다리 |
| [Modular Cave Kit](https://kenney.nl/assets/modular-cave-kit) 1.0 | 2026-09-11 | 2026-09-12 | 굴 입구 |

라이선스: CC0 — 출처 표시 의무 없음.

## Unity에 GLB를 불러오려면 패키지가 하나 더 필요하다

PLAN.md 8장은 "FBX, GLB/GLTF (Unity 임포터가 직접 지원)"이라고 적어
뒀는데 이건 **틀린 전제였다** — Unity 6000.3.23f1 기본 설치엔 glTF
임포터가 없다(`Packages/manifest.json`에 아무 것도 없었음, `.glb` 파일을
Assets에 넣어도 그냥 무시된다). Unity 공식 패키지
`com.unity.cloud.gltfast`(6.9.0)를 `manifest.json`에 추가해 해결했다 —
URP를 기본으로 지원하고(머티리얼이 자동으로 `Universal Render
Pipeline/Lit`로 들어옴), Unity 공식 레지스트리에서 바로 받아진다(추가
scoped registry 불필요). 다음에 FBX가 아니라 GLB 에셋을 새로 받을 때
"임포터가 없어서 안 된다" 싶으면 이 패키지가 실제로 있는지부터 확인할 것
(saga-godot의 URP Sky/Fog 오판과 같은 종류의 실수 — PLAN.md 문서의 가정을
실제로 확인 없이 믿지 말 것).

## 실측값 (MeasureCharacterGlb.cs로 확인 후 삭제 — 일회성 도구)

`Renderer.bounds`를 인스턴스화해 직접 실측했다(추측 아님, saga-godot의
`get_aabb()` 실측과 같은 방법):

| 파일 | 실측 크기(m) | 피벗 |
|---|---|---|
| `character-{a,b,c,d}.glb` (넷 다 같은 골격) | 1.6 × 2.7 × 0.8 | 바닥(발밑, min.y=0) |

saga-godot의 실측(1.6×2.7×0.8)과 정확히 일치 — 같은 파일이니 당연하다.
**피벗이 바닥**이라 primitive capsule(중앙 피벗이라 `height*0.5`만큼
띄워야 했음)과 달리 위치 계산에 y 오프셋이 필요 없다.

## 스케일·배치 — `CharacterVisual.cs`(공용 로직)

기존 primitive capsule 시절 목표 높이(`CharacterController.height`=3.4,
Player·NPC·산적 전부 동일)에 맞춰 `targetHeight / NativeHeight`
(3.4/2.7 ≈ 1.259)로 균일 스케일한다. 색조는 URP Lit의 `_BaseColor`를
`MaterialPropertyBlock`으로 덮어써(공유 머티리얼 자체는 안 건드림) 같은
모델을 여러 배역에 색만 다르게 재사용한다 — 킷을 4종만 받아서 배역은
5개(플레이어·촌장·상인·나그네·산적)라 나그네는 상인과 같은 모델
(character-c)을 색조만 다르게 재사용한다.

| 배역 | 모델 | 색조 |
|---|---|---|
| 플레이어 | character-a | 없음(원본 텍스처 그대로) |
| 마을 촌장 | character-b | 파랑 계열 |
| 떠돌이 상인 | character-c | 갈색 계열 |
| 나그네 | character-c (상인과 모델 재사용) | 회색 계열 |
| 산적 | character-d | 어두운 빨강(전투 텔레그래프 때 주황으로 덮어씀) |

## GLB 에셋이 없을 때의 대비 — 폴백

다른 PC에 이 GLB 파일들이 아직 없는 상태로 `BuildTestVillageScene.Build()`
를 돌리면(예: 새 클론 직후, 또는 나중에 다른 배역용 GLB를 깜빡 안 받아온
경우) `CharacterVisual.SpawnFallbackCapsule()`이 예전 primitive capsule로
대신 채워 씬 빌드 자체는 안 깨지게 한다 — saga-godot의 "동굴 입구 GLB
못 받아 오면 이전 박스로 대체" 관례와 같다.

## 환경/건물 GLB (2026-09-12, 캐릭터 다음 조각)

`VegetationBuilder.cs`(나무·바위)·`LandmarksBuilder.cs`(굴 입구·마을집·
폐허·다리)에 Kenney Nature/Fantasy Town/Modular Cave Kit GLB를 넣었다.
saga-godot 실측표(위 표와 같은 파일)를 그대로 신뢰해 재실측 없이 스케일을
가져다 썼다(같은 TileSize=48 세계 축척이라 유효) — `MeasureCharacterGlb.cs`
로 한 번 더 재확인만 하고(값 100% 일치) 지웠다.

| 파일 | 실측 크기(m) | 스케일 | 쓰는 곳 |
|---|---|---|---|
| `vegetation/tree_oak.glb` | 0.64×1.23×0.74 | ×4.5×(개체별 0.7~1.3) | 숲 타일, 타일당 3그루 |
| `rocks/rock_largeA.glb` | 0.78×0.26×1.02 | ×2.6×(개체별 변주) | 산 타일 절반 |
| `rocks/rock_smallA.glb` | 0.36×0.19×0.36 | ×3.5×(개체별 변주) | 산 타일 나머지 절반 |
| `buildings/wall-block.glb` | 1×1×1 | 비균등=bodySize(10,4,10) 그대로 | 마을집 벽 |
| `buildings/roof-gable.glb` | 1.1×0.57×1.07 | 균일 ×10 | 마을집 지붕(콜라이더 없음) |
| `buildings/pillar-stone.glb` | 0.16×1.0×0.16 | 균일=목표 높이 | 폐허 기둥 3개 |
| `buildings/planks.glb` | 1×0.06×1 | 비균등(폭 6, 길이는 44개 등분) | 다리 덱 |
| `dungeon/gate-rock.glb` | 4.00×4.05×2.45 | 균일 ×1.48(목표 높이 6m) | 굴 입구 |
| `shrine/altar-stone.glb` | 1.04×0.49×0.65 | 균일 ×2.5(목표 높이 약 1.23m) | 산신당 제단(재설계, 아래 절 참고) |

**GLB엔 물리 콜라이더가 없다** — glTF 포맷 자체가 충돌체를 안 담는다.
굴 입구·마을집 벽·기둥류는 실측 로컬 AABB(위 표) 그대로
`BoxCollider`/`CapsuleCollider`를 코드로 직접 얹었다(캐릭터는 트리거
판정만 있어 콜라이더가 없어도 됐지만, 이 랜드마크들은 "지나갈 수 없는
장애물"이라 필요) — 지붕·다리 덱은 원래도 콜라이더가 없던 자리라 그대로
안 얹었다(지붕은 밟는 자리가 아니고, 다리는 TerrainBuilder가 'B' 타일에
이미 별도로 막아 뒀다, 두 곳이 각자 만들면 겹친다는 기존 원칙 그대로).

## 산신당 재설계 (2026-09-12, 환경/건물 GLB 다음 후속 조각)

**산신당('S' 타일, `LandmarksBuilder.BuildShrine()`)은 그때(위 절) "형태가
많이 달라 재설계 필요"로 미뤄 뒀다가 같은 날 처리했다.** 예전 구조(받침대
박스 5×0.6×5 + `pillar-stone.glb` 기둥 4개)를 통째로 걷어내고,
saga-godot `landmarks_builder.gd`의 `SHRINE_SIZE`(1.04×0.49×0.65)·
`SHRINE_SCALE`(2.5, 균일)을 그대로 옮겨 **`shrine/altar-stone.glb`
제단 하나**로 바꿨다 — saga-godot도 옛 사당을 이 파일 하나로만 짓는다
(같은 이유: 실제 돌 표면 굴곡이 있는 조각이라 gate-rock.glb처럼 균일
스케일만 쓴다). 최종 크기 약 2.6×1.23×1.63m, 바닥 중앙 피벗이라
`gate-rock.glb`·`altar-stone.glb`처럼 위치 계산에 y 오프셋이 필요 없다.
`shrine/altar-stone.glb` + `shrine/Textures/colormap.png`를
saga-godot에서 그대로 복사(다른 GLB들과 같은 재사용 원칙). GLB가 없을 때의
폴백도 예전 받침대+기둥 구조 대신 이 크기 그대로의 단일 박스로 바꿨다.
`MountainShrine.cs`(트리거·보상 로직)는 안 건드림 — 이건 순전히
`LandmarksBuilder.cs`의 시각 담당 쪽 변경이다.

## Props 도입 (2026-09-12, 산신당 재설계 다음 후속 조각)

PLAN.md 44~49장 우선순위(Player→주요 Enemy→Boss→Environment→Building→
Vegetation→**Props**→Animals→VFX)의 다음 칸. 새 킷을 찾지 않고 이미 쓰고
있는 `Fantasy Town Kit 2.0`(CC0, `LandmarksBuilder.cs`가 wall-block·
roof-gable 등에 쓰는 그 킷)에서 그때 안 받았던 파일 세 개만 추가로
받았다 — 이 킷 하나에 160개가 넘는 모듈이 들었는데 처음엔 건물에 필요한
4개만 골라 왔었다(zip을 `opengameart.org`의 미러 링크로 다시 받아
`Models/GLB format/` 안에서 골랐다 — Kenney 공식 페이지는 다운로드
버튼이 JS라 직접 URL을 못 뽑았다). 텍스처는 새로 안 받고 기존
`Assets/Art/Buildings/Textures/colormap.png`와 바이트가 100% 같은 걸
md5로 확인했다(같은 킷·같은 아틀라스라 당연) — 그래도 `Buildings/`와
분리해 관리하려고 `Assets/Art/Props/Textures/`에 한 벌 더 뒀다(PLAN.md
8장이 나열한 `Art/Props/` 카테고리를 그대로 따름, `Dungeon/`·`Shrine/`도
각자 텍스처를 따로 갖고 있는 것과 같은 결 — 바이트 중복보다 "무엇이
어떤 자산에 속하는지" 폴더로 바로 보이는 쪽을 택함).

| 파일 | 실측 크기(m) | 스케일 | 쓰는 곳 |
|---|---|---|---|
| `props/lantern.glb` | 0.216×1.556×0.224 | ×1(그대로) | 마을집 두 채 사이 가로등 2개 |
| `props/stall-red.glb` | 1×1.237×1 | 균일 ×2 | 떠돌이 상인 옆 시장 좌판 |
| `props/fence.glb` | 0.075×0.38×1(비중앙 피벗, x∈[0.425,0.5]) | 균일 ×2 | 논밭 소 옆 울타리 3칸 |
| `props/fence-gate.glb` | 0.519×0.55×1 | 균일 ×2 | 위 울타리 줄 가운데 문 1칸 |

**소품 셋을 기존 콘텐츠 옆에 붙였다** — 새 자리를 만들지 않고 이미 있는
곳을 꾸미는 것만으로 "허전함"을 줄인다는 PLAN.md 9~10장 원칙:
- 가로등 2개 — 마을집(격자 2,3·3,3) 사이 공터를 마주 보게.
- 시장 좌판 1개 — 떠돌이 상인(격자 4,3) 옆, 거래 자리처럼 보이게.
- 울타리 3칸+문 1칸 — 논밭 소(cow_1, 격자 3,9) 옆에 한 줄로. **실제로
  소를 가두지는 않는다** — `WanderingAnimal`의 24유닛 배회 반경을 다
  두르려면 수십 칸이 필요해 장식 목적과 안 맞다(PLAN.md 3장 "테스트 안
  된 추측성 변경" 회피) — "목장 한구석" 느낌만 준다. 콜라이더도 일부러
  안 둠(반 토막짜리 줄을 막아 버리면 오히려 걸린 것처럼 보인다).

`PropsBuilder.cs`(신규) — `LandmarksBuilder.cs`와 같은 결(자리마다 상수,
GLB 없으면 primitive로 대체, `childCount>0`이면 `Awake()`에서 다시 안
지음). `BuildTestVillageScene.cs`에 `BuildProps()` 훅 추가(Landmarks
다음, Animals 전).

## 동물 GLB — 2026-09-12 조사 결과 (아직 도입 안 함)

saga-godot도 "어울리는 동물 GLB가 없다"고 남겨 둔 항목이라 다시
찾아봤다. **결론: CC0 소스는 찾았지만 자동으로 받을 수 없어 사람의 확인이
필요하다.**

- **Kenney**엔 사슴·소·늑대를 갖춘 3D 킷이 없다 — "Animal Pack"·"Animal
  Pack Redux" 둘 다 **2D 스프라이트**였다(직접 opengameart.org 미러로
  확인).
- **Quaternius**(PLAN.md 8장이 이미 허용해 둔 소스)의 "Animated Animal
  Pack"(poly.pizza 번들 `Animated-Animal-Pack-ILAPXeUYiS`)이 정확히
  **Cow·Deer·Wolf**를 포함한다(+ Donkey·Alpaca·Bull·Fox·Shiba Inu·
  Stag·Husky·Horse 등 12종, 걷기·달리기 등 애니메이션 포함, CC0,
  glTF/FBX). **다만 poly.pizza는 개별 모델 다운로드에 계정/API 키가
  필요하고, quaternius.com 원본 페이지는 Discord `#pack-claim`·Patreon
  클레임 절차를 거치게 돼 있어 — 계정 생성·로그인은 대신 해 줄 수 없는
  영역이라 파일을 직접 못 받아 왔다.**
- 로그인 없이 바로 받아지는 대안(`quaternius.itch.io/lowpoly-animated-
  animals`, CC0, "Name your own price" 무료)도 있지만 Cow·Horse·Llama·
  Pig·Pug뿐이라 **사슴·늑대가 빠진다** — 지금 갖춘 세 종(사슴·소·늑대)을
  다 못 채운다.

**다음 세션이 이어갈 것**: 사용자가 직접 poly.pizza 계정을 만들거나
Quaternius Discord/Patreon 클레임으로 위 팩을 받아 스크래치패드나
저장소 어딘가에 놔두면, 그 다음부터는 지금까지와 같은 방식(실측→
`AnimalBuilder.cs`에 스케일·콜라이더 반영→md5 확인)으로 이어받을 수
있다. 그때까지는 사슴·소·흰 늑대 모두 primitive로 남는다.

## DUNGEON 환경/건물 GLB (2026-09-12, 여섯 번째 세션)

`VERTICAL_SLICE_DUNGEON.md` "환경/건물 GLB" 후보 — `saga-godot/assets/
dungeon/`에서 corridor.glb·gate.glb만 마저 복사해 `Assets/Art/Dungeon/`
(SagaGo가 이미 gate-rock.glb·colormap.png를 둔 그 폴더)에 넣었다.
같은 Modular Cave Kit(위 표), 새 다운로드 없음.

| 파일 | 실측 크기(m, saga-godot ASSET_GUIDE 기준) | 스케일(최초 도입 당시) | 쓰는 곳 |
|---|---|---|---|
| `dungeon/corridor.glb` | 4.0×4.05×4.0, 바닥 중앙 피벗 | X=DoorWidth/4.0=0.75, Y=WallHeight/4.05≈0.988, Z=1(그대로) | DUNGEON 복도 셋, 타일 2장(4.0×2=Length 8과 정확히 일치 — Z축 안 늘림) |
| `dungeon/gate.glb` | 4.4×4.4×1.4, 바닥 중앙 피벗 | X=문 폭(3)/4.4≈0.682, Y·Z=1 | DUNGEON 방 넷의 문 6곳(아치는 앞뒤 대칭이라 방향 안 따짐) |

**room-small.glb(방 셸, 12.0×4.4×12.0)는 이번엔 안 씀** — DUNGEON 방
치수(20×14×4)와 비율이 많이 달라(X 1.667배·Z 1.167배·Y 0.909배로 축마다
제각각) 비균등 스케일 시 벽 질감이 뚜렷하게 뒤틀릴 걸로 보인다.
`saga-godot/games/saga_dungeon/world/test_room.gd`는 이 문제를 **방
치수를 GLB 원본(12×12, 스케일 없음)에 맞추는 쪽으로 풀었다** — Unity
쪽도 같은 길을 가려면 이미 있는 방 넷의 모든 스폰 좌표(적·상자·행상·
소품 등)를 전부 다시 잡아야 하는 파급 큰 재설계라 다음 슬라이스로
미뤘다.

**GLB엔 콜라이더가 없다**(위 원칙과 같음, `saga-godot/games/saga_dungeon/
world/test_room.gd`도 같은 이유로 StaticBody3D를 따로 둔다) — 기존
primitive Floor/Wall을 그대로 두되 `corridorModel`이 채워져 있으면
`MeshRenderer.enabled = false`로 안 보이는 충돌체로만 남긴다. 문 아치
(`gate.glb`)는 실제로 지나다니는 자리라 애초에 콜라이더를 안 붙인다.
색은 `CharacterVisual.Tint()`(캐릭터 GLB 슬라이스가 만든 `_BaseColor`
MaterialPropertyBlock 유틸)를 그대로 재사용해 복도 타일을 폐허 톤으로
물들인다 — 새 유틸을 안 만들고 이미 있는 것을 다른 용도로 재사용.

## DUNGEON 방 셸 GLB (2026-09-12, 여덟 번째 세션 — 위 절 뒤이음)

**바로 위 절의 "이번엔 안 씀" 결정을 뒤집었다.** 비균등 스케일(축마다
다른 배율)이 문제였지, room-small.glb 자체를 못 쓸 이유는 없었다 —
**"방을 GLB 원본의 정사각(12×12) 비율에 맞추는 균일 스케일"**로 풀었다:
기존 폭(RoomWidth=20)을 그대로 지키려면 배율은 20/12=5/3, 정사각형이라
같은 배율을 깊이에도 적용하면 자동으로 20이 나온다(왜곡 없음) —
`DungeonRoomBuilder.RoomDepth`를 14→20으로 올린 이유. 방 넷의 기존
콘텐츠는 전부 X축 기준 좌표라 **하나도 안 옮겼다** — 깊이만 넉넉해져
오히려 여유가 늘었다. 복도 간 이동 거리(Room2/3/4 중심 z좌표)만 새
halfD(10)에 맞춰 다시 계산했다(`BuildTestDungeonScene.cs` 주석 참고).

| 파일 | 실측 크기(m) | 스케일(이 슬라이스로 바뀜) | 비고 |
|---|---|---|---|
| `dungeon/room-small.glb` | 12.0×4.4×12.0, 바닥 중앙 피벗 | 균일 5/3(=RoomWidth/12) | 방 넷의 바닥·벽 셸, 색은 바이옴 톤으로 틴트 |
| `dungeon/gate.glb` | 4.4×4.4×1.4 | 균일 5/3(문 폭도 4.4×5/3≈7.33로 넓어짐) | 예전엔 X만 좁히는 비균등이었는데 셸과 짝을 맞추며 균일로 개선됨 |
| `dungeon/corridor.glb` | 4.0×4.05×4.0 | **스케일 없음(1,1,1)** | `DoorWidth`를 3→4.0(corridor.glb 실측 폭)으로 올려 완전히 무왜곡이 됨 |

**문 폭(RoomDoorWidth≈7.33)이 복도 폭(4.0)보다 넓어 문턱에 살짝 좁아지는
단이 생긴다** — saga-godot도 `gate.glb`(4.4)·`corridor.glb`(4.0) 사이에
같은 종류 차이를 그대로 두고 문서화해 둔 것과 같은 트레이드오프, 이
프로젝트도 그대로 받아들인다.

**확인 안 된 가정 — room-small.glb의 실제 문 구멍 폭이 gate.glb(4.4)와
같다.** 메시를 직접 열어 본 게 아니라 saga-godot `test_room.gd`가
`GATE_HALF_WIDTH`(gate.glb 폭의 절반)로 방 벽 틈을 계산하는 코드 구조에서
역으로 추론한 값이다 — 사람이 실제로 걸어서 문 자리를 확인하기 전까진
셸의 시각적 문 구멍과 콜라이더 문 폭이 정확히 겹치는지 100% 확신 못 함
(아래 GUI 확인 목록 참고).

컴파일·씬 재빌드(`room childCount` 13→14, Room1에 셸(Shell) 하나 추가)·
PlaytestDungeonHeadless 전부 통과, 실제 화면 확인은 미정(실기 확인
방침에 따라 사람이 직접 할 몫).

## 이번에 발견해 같이 고친 것 — Awake() 중복 생성

`NpcBuilder.cs`·`BanditEncounter.cs`가 `Awake()`에서 조건 없이
`Build()`를 다시 불러서, 편집기 빌드 스크립트가 이미 저장해 둔 씬을 실제
Play(헤드리스든 사람이 직접 하든)로 열면 시각·UI가 두 벌씩 겹쳐 생기는
잠재 버그였다(`Gatherable.cs`·`HiddenTreasure.cs` 등은 이미 방어가
있었는데 이 둘만 빠져 있었음). 캐릭터 GLB로 바꾸며 두 파일을 어차피
손대는 김에 `transform.Find("Visual") != null`이면 다시 안 짓게 방어를
넣었다. 환경/건물 GLB 조각(`VegetationBuilder.cs`·`LandmarksBuilder.cs`)도
어차피 다시 쓰는 김에 `transform.childCount > 0`이면 건너뛰는 같은 방어를
추가해 뒀다. 나머지 `AnimalBuilder.cs`·`RareWolfEncounter.cs`·
`HiddenTreasure.cs`·`MountainShrine.cs`·`EastGroveRelic.cs`·
`LuckyCairn.cs` 여섯 곳은 **후속 세션(2026-09-12)이 정리했다** —
자세한 내용(그 중 `RareWolfEncounter`·`BanditEncounter`에서 찾은 더 깊은
NRE 버그 포함)은 `docs/PROJECT_STATE.md` 참고.

## 2026-09-13 — 아트 방향 전환, 이 문서의 Kenney 킷들은 순차 교체 대상

`saga-godot/docs/ASSET_GUIDE.md`와 같은 결정 — 원신(Genshin Impact) 같은
애니메이션 셀셰이딩 그래픽을 목표로, 위 Kenney CC0 킷들은 순차 교체
대상이 됐다. 세부 사항은 `PLAN.md` **66-2장** 참고(saga-godot 66-2장과
같은 결정, Unity 고유 차이만 이 프로젝트 66-2장에 따로 적음). 이 문서는
지우지 않는다 — 교체가 끝나기 전까지는 여전히 유효한 현재 상태 기록이다.

## 2026-09-13 — VRoid 샘플 아바타, Unity 임포트 검증

saga-godot이 VRoid Studio에서 내보낸 파이프라인 검증용 임시 자산(자세한
경위는 `saga-godot/docs/ASSET_GUIDE.md` 2026-09-13 항목 — 커스터마이징
없는 pixiv 기본 샘플 `AvatarSample_A`, 라이선스는 상업 이용·재배포·수정
전부 허용으로 바꿔 내보냄)을 이 프로젝트에도 그대로 미러링했다 —
`Assets/Art/CharactersVroid/AvatarSample_A.vrm`(원본, 참고용) +
`.glb`(같은 내용을 복사한 사본).

**gltFast로 바로 확인됨 — 별도 UniVRM 없이도 임포트된다.** `.vrm`
확장자는 Unity가 `DefaultImporter`(포맷을 모르는 파일용 기본 처리)로
받아 3D 모델로 인식하지 못했지만, `.glb` 사본은 기존 Kenney GLB들
(`character-a.glb`·`gate-rock.glb`)과 똑같이 `com.unity.cloud.gltfast`의
`ScriptedImporter`로 잡혀 정상 임포트됐다(배치 모드 로그 확인, 관련
오류·예외 없음). 66-2장에 "UniVRM 경유·gltFast 경유 두 경로 중 아직 안
정함"이라고 적어 뒀던 것 — **gltFast 경로로 정한다.** 이미 프로젝트에
들어 있는 패키지라 추가 설치가 필요 없고, 지금까지 GLB 자산 전부가 이
경로를 쓰고 있어 일관성도 있다. UniVRM은 VRM 고유 확장(스프링본·
휴머노이드 매핑 등)이 필요해지면 그때 다시 검토한다.

**주의 — 배치 모드 실행이 프로젝트 설정을 건드렸다.** 이 PC에 설치된
Unity 에디터(6000.3.24f1)가 프로젝트가 고정해 둔 버전(6000.3.23f1)보다
최신이라, 열자마자 `ProjectSettings/ProjectVersion.txt`를 새 버전으로
덮어썼고 `Packages/manifest.json`의 `com.unity.cloud.gltfast`도
6.9.0→6.14.1로 자동 갱신됐다(`packages-lock.json`도 같이). 이번 작업과
무관한 부작용이라 `git checkout`으로 전부 되돌렸다 — saga-godot
CLAUDE.md가 헤드리스 임포트 뒤 `project.godot`/`*.import`를 확인하라고
경고하는 것과 같은 종류의 함정이다. **다음에 이 PC에서 Unity 배치
모드를 돌릴 때도 실행 후 반드시 `git status`/`git diff`로 `ProjectSettings/`·
`Packages/`를 훑을 것.**

## 정정(2026-09-13, 같은 날 다시) — saga-unity는 원신이 아니라 사실적 방향

바로 위 두 항목("아트 방향 전환"·"VRoid 샘플 아바타")은 "saga-godot과
같은 결정(원신류 셀셰이딩)"을 전제로 적었는데, 사용자가 "saga-unity는
사실적인 걸로, 엔진마다 다른 점이 필요해"로 방향을 갈랐다. 자세한 내용은
`PLAN.md` 66-2장(다시 씀) 참고. **이 문서의 위 두 항목을 지우지 않는
이유** — VRoid 샘플이 gltFast로 임포트된다는 것·배치 모드가 프로젝트
설정을 건드릴 수 있다는 것은 그래픽 스타일과 무관한 엔진 사실이라
여전히 유효하다. 다만 "이 방향(원신)으로 에셋을 채워 간다"는 전제는
더 이상 맞지 않으니, 그 부분만 걸러서 읽을 것.
