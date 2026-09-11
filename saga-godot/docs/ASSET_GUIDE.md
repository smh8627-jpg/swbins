# ASSET_GUIDE

PLAN.md 34장에서 만들기로 해 놓고 안 만들었던 문서 — 2026-09-11, 첫 GLB
에셋 교체(41·43~46·51장)를 하면서 같이 만들었다. master.md 33장 "토큰
절약 규칙 10"대로 여기는 **무엇을 왜 골랐는지**만 짧게 적는다. 각 빌더
스크립트의 주석에 세부 스케일 계산이 이미 있으니 여기서 반복하지 않는다.

## 출처 — 전부 Kenney.nl, CC0

루트 CLAUDE.md "하지 말 것"의 "원작사의 실제 에셋 가져다 넣기" 금지는
포켓몬GO·디아블로 같은 **원작 IP의 실제 리소스**를 뜻한다. Kenney의
CC0(퍼블릭 도메인) 범용 로우폴리 킷은 그 원작들과 무관한 제3자 소재라
해당하지 않는다 — PLAN.md 8장이 애초에 saga-godot은 실제 GLB 에셋
기반이라고 정해 둔 것과도 맞는다.

| 킷 | 버전 | 받은 날 | 용도 |
|---|---|---|---|
| [Nature Kit](https://kenney.nl/assets/nature-kit) | 2.1 | 2026-09-11 | 나무·바위 |
| [Fantasy Town Kit](https://kenney.nl/assets/fantasy-town-kit) | 2.0 | 2026-09-11 | 마을집·폐허 기둥·다리 |
| [Blocky Characters](https://kenney.nl/assets/blocky-characters) | 2.0 | 2026-09-11 | 플레이어 |

라이선스: CC0 (Creative Commons Zero) — 출처 표시 의무 없음. 그래도
각 킷 폴더에 원본 `License.txt`를 그대로 두지 않고 이 문서에 요약해
둔다(라이선스 텍스트 자체는 재배포 안 해도 되는 게 CC0의 요점).

## 폴더 매핑 (master.md 8장 구조와 다른 점만)

master.md 8장은 `characters/enemies/bosses/animals/buildings/environment/
vegetation/rocks/props/weapons/armor/effects/UI/audio`를 권장 구조로 든다.
지금은 그중 실제로 채운 4개 + 기존 `environment/`(66-1장, .tres 전용)뿐이다:

```text
assets/
├── characters/   character-{a,b,c,d}.glb + Textures/texture-{a,b,c,d}.png
├── vegetation/   tree_oak.glb
├── rocks/        rock_largeA.glb · rock_smallA.glb
├── buildings/    wall-block.glb · roof-gable.glb · pillar-stone.glb ·
│                 planks.glb + Textures/colormap.png
└── environment/  env_pc.tres · env_mobile.tres (66-1장, GLB 아님)
```

텍스처가 있는 GLB는 `Textures/<파일>.png`를 **glb와 같은 폴더 밑에** 둬야
한다 — glTF가 `"uri":"Textures/xxx.png"`처럼 자기 위치 기준 상대경로로
참조하기 때문이다(킷 하나 안에서 여러 모델이 텍스처 하나를 공유하는 구조).

## 쓴 파일과 실측값

Godot 4.7.2 콘솔 빌드로 각 GLB를 실제로 인스턴스화해서 `VisualInstance3D.
get_aabb()`를 합쳐 실측했다(추측 아님) — 아래 스케일은 그 실측치를
기존 primitive 크기에 맞춰 역산한 것이다.

| 파일 | 실측 크기(m) | 피벗 | 쓰는 곳 |
|---|---|---|---|
| `vegetation/tree_oak.glb` | 0.64 × 1.23 × 0.74 | 중앙(대략) | 숲 타일, ×4.5 스케일 |
| `rocks/rock_largeA.glb` | 0.78 × 0.26 × 1.02 | 바닥 | 산 타일 절반, ×2.6 |
| `rocks/rock_smallA.glb` | 0.36 × 0.19 × 0.36 | 바닥 | 산 타일 나머지 절반, ×3.5 |
| `buildings/wall-block.glb` | 1 × 1 × 1 | 바닥 | 마을집 몸통, 비균등 ×(10,4,10) |
| `buildings/roof-gable.glb` | 1.1 × 0.57 × 1.07 | 바닥 | 마을집 지붕, ×10 |
| `buildings/pillar-stone.glb` | 0.16 × 1.0 × 0.16 | 바닥 | 폐허 기둥, 높이=스케일값 |
| `buildings/planks.glb` | 1 × 0.06 × 1 | 바닥 | 다리(44개 이어 붙임) |
| `characters/character-a.glb` | 1.6 × 2.7 × 0.8 | 바닥 | 플레이어, ×1.25 |
| `characters/character-b.glb` | (a와 같은 골격 — 실측 생략) | 바닥 | 마을 촌장, ×1.25 |
| `characters/character-c.glb` | (a와 같은 골격 — 실측 생략) | 바닥 | 떠돌이 상인, ×1.25 |
| `characters/character-d.glb` | (a와 같은 골격 — 실측 생략) | 바닥 | 산적, ×1.25 |

"피벗 바닥"은 원점(0,0,0)이 모델의 발밑이라는 뜻 — primitive였을 때는
대부분 중앙 피벗(BoxMesh/SphereMesh/CylinderMesh 기본값)이라 `height*0.5`
만큼 띄워야 했는데, 이 킷들은 그럴 필요가 없다. 빌더 스크립트를 볼 때
이 차이를 헷갈리지 말 것.

## 마을집이 primitive보다 늘어난 이유

`wall-block.glb`는 1×1×1 모듈 조각 하나다. 진짜 이 킷을 쓰는 법은 여러
장을 이어 붙여 벽을 쌓는 것이지만, 이번 교체는 "primitive 자리를 GLB로
바꾼다"는 41·45·46장 범위였지 벽 타일링 시스템을 새로 만드는 게 아니라서
**비균등 스케일(10,4,10)로 늘려 기존 박스 자리를 그대로 대체**했다.
색 아틀라스(`colormap.png`)가 단순 색면이라 늘려도 눈에 띄게 이상하진
않지만, 진짜 벽돌·판자 디테일이 있는 킷이었다면 이 방법은 안 통했을
것이다. **다음 손질 때 할 일**: 여러 `wall-block.glb`를 격자로 이어
붙이는 실제 모듈형 조립으로 바꾸기.

## 이번에 안 바꾼 것

- **동굴 입구**(`landmarks_builder.gd::_add_cave`) — Nature/Fantasy Town
  Kit에 어울리는 조각이 없어 그대로 primitive(검은 박스)다. 동굴/던전
  킷을 새로 받아야 한다.
- ~~NPC(촌장·상인)·산적~~ — **완료(2026-09-11②).** 마을 촌장=
  `character-b.glb`, 떠돌이 상인=`character-c.glb`, 산적=
  `character-d.glb`. 같은 킷이라 추가 다운로드 없이 미리 받아 둔
  `chars/Models/GLB format/`에서 바로 골랐다. 산적 쪽은 "강타 예고"
  텔레그래프(몸 전체를 잠깐 물들이는 연출)가 캡슐 시절 `material_override`
  하나로 되던 걸, GLB는 몸통·팔·다리·머리가 각각 다른 MeshInstance3D라
  `GLBUtils.find_all_mesh_instances()`로 전부 찾아 같이 바꾸게 고쳤다
  (`bandit_encounter.gd::_set_visual_color`/`_clear_visual_color`) —
  평소엔 override를 안 걸어 텍스처가 그대로 보이고, 텔레그래프 순간만
  색을 입혔다가 원래 텍스처로 되돌린다.
- **모바일 프로파일에서 이 에셋들이 실기(저사양 기기)에서 어떻게
  보이는지** — 66-1장 실기 확인 방침대로 몰아서 할 일.

## 새 GLB 하나를 더 추가할 때

**뼈대 없는 단순 소품**(나무·바위·건물 조각처럼 "루트 하나 + MeshInstance3D
하나"): `games/saga_go/world/glb_utils.gd`의 `GLBUtils.extract_mesh(path)`
로 `Mesh` 리소스만 뽑아 기존처럼 `MultiMesh`에 태운다. 칸마다 노드를
만들지 않는다는 master.md 35장 원칙을 지키는 유일한 이유가 이거다.

**뼈대 있는 캐릭터**(`assets/characters/*`처럼 AnimationPlayer가 딸린 것):
Mesh만 뽑지 않고 **씬 전체를 그대로 인스턴스**한다(`Player.tscn`의
`Visual` 노드 예시 참고) — 애니메이션이 여러 노드의 Transform을 함께
움직이는 구조라 Mesh 하나만 떼어내면 못 쓴다.

## 검증

`--headless --editor --quit`(임포트) → `--headless --quit-after 5
--verbose`(TestVillage 완주) 둘 다 exit 0, error/warning/missing 로그
0건. verbose 로그로 GLB 8개 + PNG 2개 전부 정상 로드 확인. 실제 GUI
스크린샷으로도 확인 — 캐릭터가 텍스처까지 정상 렌더링(핑크색 "텍스처
없음" 표시 없음), 그림자 정상, 배경에 나무·지붕 형태 확인됨. 자세한
경위는 `docs/PROJECT_STATE.md` 2026-09-11 항목 참고.

**NPC·산적 교체(같은 날 뒤 이어 진행) 검증**: character-b/c/d.glb +
texture-{b,c,d}.png 추가 후 헤드리스 임포트 중 `f.is_null()` 오류가 한
번 떴다 — 새 텍스처 4장이 한꺼번에 재임포트되며 생긴 일회성 경합으로
보이고(같은 조건으로 바로 재실행하니 재현 안 됨), 실제 씬 실행 로그
(`--quit-after 5`)에는 애초에 안 뜬 적 없다. `--headless --quit-after 5`를
연속 3번 돌려 **셋 다 exit 0·오류 0건** 확인(루트 CLAUDE.md "세 번 돌려
출력이 한 줄도 다르지 않은지" 습관대로). GUI 스크린샷에서는 카메라가
마침 마을 촌장·상인·산적이 있는 자리를 비추지 않아 이번엔 눈으로는
확인 못 했다 — 헤드리스 로그로 네 캐릭터 GLB·텍스처 전부 정상 로드된
것만 확인됐다.
