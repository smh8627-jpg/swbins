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
| [Blocky Characters](https://kenney.nl/assets/blocky-characters) | 2.0 | 2026-09-11 | 플레이어·NPC·산적 |
| [Modular Cave Kit](https://kenney.nl/assets/modular-cave-kit) | 1.0 | 2026-09-11 | 동굴 입구 |
| [Nature Kit](https://kenney.nl/assets/nature-kit) (재다운로드, 밀 이랑만 추가) | - | 2026-09-12 | 논밭 작물 |
| [Graveyard Kit](https://kenney.nl/assets/graveyard-kit) | 5.0 | 2026-09-12 | 옛 사당 제단 |

라이선스: CC0 (Creative Commons Zero) — 출처 표시 의무 없음. 그래도
각 킷 폴더에 원본 `License.txt`를 그대로 두지 않고 이 문서에 요약해
둔다(라이선스 텍스트 자체는 재배포 안 해도 되는 게 CC0의 요점).

**Graveyard Kit에서 딱 하나만 골라 쓴 이유** — 이름은 "묘지"지만 킷 안의
`altar-stone.glb`(석재 제단)는 십자가·해골 같은 서구 묘지 도상이 전혀
없는 밋밋한 돌 제단이라, GO의 "옛 사당"(한국 전통 사당 오마주) 자리에
그대로 써도 이질감이 없다. 무덤·관·좀비 같은 킷의 나머지 조각은 이번에
전혀 안 받았다(altar-stone.glb + 그 텍스처 한 장만 추출).

## 폴더 매핑 (master.md 8장 구조와 다른 점만)

master.md 8장은 `characters/enemies/bosses/animals/buildings/environment/
vegetation/rocks/props/weapons/armor/effects/UI/audio`를 권장 구조로 든다.
지금은 그중 실제로 채운 4개 + 기존 `environment/`(66-1장, .tres 전용)뿐이다:

```text
assets/
├── characters/   character-{a,b,c,d}.glb + Textures/texture-{a,b,c,d}.png
├── vegetation/   tree_oak.glb · crops_wheatStageB.glb
├── rocks/        rock_largeA.glb · rock_smallA.glb
├── buildings/    wall-block.glb · roof-gable.glb · pillar-stone.glb ·
│                 planks.glb + Textures/colormap.png
├── dungeon/      gate-rock.glb + Textures/colormap.png (동굴 입구)
├── shrine/       altar-stone.glb + Textures/colormap.png (옛 사당)
└── environment/  env_pc.tres · env_mobile.tres (66-1장, GLB 아님)
```

텍스처가 있는 GLB는 `Textures/<파일>.png`를 **glb와 같은 폴더 밑에** 둬야
한다 — glTF가 `"uri":"Textures/xxx.png"`처럼 자기 위치 기준 상대경로로
참조하기 때문이다(킷 하나 안에서 여러 모델이 텍스처 하나를 공유하는 구조).

## 텍스처 임포트 설정 (2026-09-11⑨, Mobile Performance Pass)

새 텍스처를 헤드리스로 처음 받으면 Godot 기본값 그대로 **무압축
(Lossless) + 밉맵 없음**으로 들어온다 — 에디터에서 "이 텍스처는 3D에
쓰인다, VRAM 압축으로 바꿀까?" 프롬프트가 뜨는 자동 감지가 헤드리스
CLI로는 한 번도 안 걸렸기 때문이다(사람이 인스펙터를 직접 열어야 뜨는
프롬프트). 실제로 `colormap.png`(buildings·dungeon 공용) ·
`texture-{a,b,c,d}.png`(characters) 여섯 장 전부 이 상태였던 걸 확인하고
`compress/mode=2`(VRAM Compressed) + `mipmaps/generate=true`로
바꿨다 — 3D 월드에서 멀리 보이는 나무·건물·인물 텍스처에 밉맵이 없으면
GPU 대역폭도 더 먹고 앨리어싱(반짝임)도 더 심해진다.

앞으로 새 킷을 받을 때 같은 구멍이 안 생기도록 `project.godot`에
`[importer_defaults]`로 텍스처 임포트 기본값 자체를 바꿔 뒀다 — 이제
새로 받는 텍스처는 처음부터 VRAM Compressed + 밉맵으로 들어온다.

## 쓴 파일과 실측값

Godot 4.7.2 콘솔 빌드로 각 GLB를 실제로 인스턴스화해서 `VisualInstance3D.
get_aabb()`를 합쳐 실측했다(추측 아님) — 아래 스케일은 그 실측치를
기존 primitive 크기에 맞춰 역산한 것이다.

| 파일 | 실측 크기(m) | 피벗 | 쓰는 곳 |
|---|---|---|---|
| `vegetation/tree_oak.glb` | 0.64 × 1.23 × 0.74 | 중앙(대략) | 숲 타일, ×4.5 스케일 |
| `rocks/rock_largeA.glb` | 0.78 × 0.26 × 1.02 | 바닥 | 산 타일 절반, ×2.6 |
| `rocks/rock_smallA.glb` | 0.36 × 0.19 × 0.36 | 바닥 | 산 타일 나머지 절반, ×3.5 |
| `buildings/wall-block.glb` | 1 × 1 × 1 | 바닥 | 마을집 벽, 10×10 발자국 둘레에 4층 격자 조립(스케일 없음) |
| `buildings/roof-gable.glb` | 1.1 × 0.57 × 1.07 | 바닥 | 마을집 지붕, ×10 |
| `buildings/pillar-stone.glb` | 0.16 × 1.0 × 0.16 | 바닥 | 폐허 기둥, 높이=스케일값 |
| `buildings/planks.glb` | 1 × 0.06 × 1 | 바닥 | 다리(44개 이어 붙임) |
| `characters/character-a.glb` | 1.6 × 2.7 × 0.8 | 바닥 | 플레이어, ×1.25 |
| `characters/character-b.glb` | (a와 같은 골격 — 실측 생략) | 바닥 | 마을 촌장, ×1.25 |
| `characters/character-c.glb` | (a와 같은 골격 — 실측 생략) | 바닥 | 떠돌이 상인, ×1.25 |
| `characters/character-d.glb` | (a와 같은 골격 — 실측 생략) | 바닥 | 산적, ×1.25 |
| `dungeon/gate-rock.glb` | 4.0 × 4.05 × 2.454 | 바닥 | 동굴 입구, 균일 ×(6/4.05≈1.48) |
| `vegetation/crops_wheatStageB.glb` | 0.54 × 0.53 × 0.45 | 바닥 중앙 | 논밭 타일, ×2.5(개체별 0.8~1.2 추가 배율) |
| `shrine/altar-stone.glb` | 1.04 × 0.49 × 0.65 | 바닥 중앙 | 옛 사당, 균일 ×2.5 |

"피벗 바닥"은 원점(0,0,0)이 모델의 발밑이라는 뜻 — primitive였을 때는
대부분 중앙 피벗(BoxMesh/SphereMesh/CylinderMesh 기본값)이라 `height*0.5`
만큼 띄워야 했는데, 이 킷들은 그럴 필요가 없다. 빌더 스크립트를 볼 때
이 차이를 헷갈리지 말 것.

## 마을집 — 처음엔 비균등 스케일, 지금은 실제 모듈 조립

`wall-block.glb`는 1×1×1 모듈 조각 하나다. 처음 GLB 교체(41·45·46장)
때는 "primitive 자리를 GLB로 바꾼다"는 범위였지 벽 타일링 시스템을
새로 만드는 게 아니라서 **비균등 스케일(10,4,10)로 늘려 기존 박스 자리를
그대로 대체**했었다 — 색 아틀라스(`colormap.png`)가 단순 색면이라 늘려도
눈에 띄게 이상하진 않았지만, 진짜 벽돌·판자 디테일이 있는 킷이었다면 이
방법은 안 통했을 것이다.

**완료(2026-09-11⑤).** 그 뒤 이어서 `landmarks_builder.gd::
_build_wall_perimeter()`로 실제 모듈형 조립으로 바꿨다 — `wall-block.glb`
를 늘리지 않고(스케일 1) 10×10 발자국(1m 칸) **둘레**에만 4층을 쌓아
이어 붙인다(안쪽 칸은 비움 — 어차피 못 들어가는 장식용 외형이라 밖에서
보면 꽉 찬 벽과 구별 안 되고, 400칸을 다 채우는 것보다 훨씬 가볍다).
집 하나당 36칸×4층=144개 인스턴스지만 MultiMesh 하나라 draw call은
집마다 여전히 1회(다리 planks.glb와 같은 방식). 충돌·지붕 배치는 기존과
동일한 발자국(`WALL_FOOTPRINT`, 예전 `body_size`와 같은 값)을 그대로
써서 바뀌지 않았다.

## 이번에 안 바꾼 것

- **사슴·까치(2026-09-12③, `animal_builder.gd`)** — 웹판 동물 생태 첫
  이식인데 어울리는 동물 GLB가 없어(동물 킷을 새로 안 받음) 박스 두
  개(몸통+머리)·박스 하나로 각각 대체했다. 다음에 CC0 동물 킷(예:
  Kenney Animal Pack이 있는지 확인)을 받으면 `_build_deer_body()`/
  `_build_magpie_body()`만 바꾸면 된다 — 위치·행동(배회·도주·앉았다
  날아오르기) 로직은 시각과 분리돼 있어 안 건드려도 된다.
- ~~동굴 입구~~ — **완료(2026-09-11④).** Nature/Fantasy Town Kit엔
  어울리는 조각이 없어 CC0 Kenney Modular Cave Kit(신규 다운로드)의
  `gate-rock.glb`(아치형 바위 문, 바닥 피벗)를 받아 `assets/dungeon/`에
  넣고 균일 스케일(≈1.48)로 교체했다. wall-block처럼 단순 색 아틀라스가
  아니라 실제 바위 굴곡이 있는 조각이라 **비균등 스케일은 안 썼다**(위
  실측표 참고). 못 받아 왔을 때는 bridge와 같은 방식으로 예전 primitive
  박스로 대체(fallback). 동굴 입구는 여전히 지나갈 수 있는 통로가 아니라
  랜드마크 장애물(충돌 박스 그대로) — 실제 동굴 내부(방·복도)는 이 킷에
  있는 room/corridor 조각들로 나중에 할 일(Phase 3 이후, 아직 계획 없음).
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

**마을집 모듈 조립(2026-09-11⑤) 검증**: 새 GLB·텍스처 추가 없이 스크립트
로직만 바꾼 것이라 재임포트는 안 필요했고, `--headless --quit-after 5`를
연속 3번 돌려 **셋 다 exit 0·error/warn/missing 로그 0건** 확인. 집
하나당 인스턴스 144개(36칸×4층)로 계산이 맞는지는 코드 리뷰로 확인,
MultiMesh 인스턴스 수·충돌 박스 크기가 예전(`body_size` 10×4×10)과
그대로인지도 같이 확인. GUI 스크린샷 확인은 안 함(사용자 명시적 요청
없었음 — 실기기 확인은 몰아서 할 일에 쌓아 둠, 벽이 진짜 격자로 이어
붙어 보이는지는 다음에 몰아서 확인할 것).

**동굴 입구 교체(2026-09-11④) 검증**: `--headless --editor --quit`(임포트,
gate-rock.glb + colormap.png 재임포트 로그 확인) → `--headless
--quit-after 5`를 연속 3번 돌려 **셋 다 exit 0·error/warn/missing 로그
0건**(루트 CLAUDE.md "세 번 돌려 출력이 한 줄도 다르지 않은지" 습관대로).
`--verbose` 로그로 `res://assets/dungeon/gate-rock.glb`·
`res://assets/dungeon/Textures/colormap.png` 둘 다 정상 로드 확인. GUI
스크린샷 확인은 이번엔 안 함(사용자 명시적 요청 없었음 — 실기기 확인은
몰아서 할 일에 쌓아 둠).

**논밭·옛 사당 GLB 교체(2026-09-12) 검증**: `--headless --editor --quit`
(임포트, crops_wheatStageB.glb·altar-stone.glb·colormap.png 재임포트 로그
확인) → `--headless --quit-after 5`를 연속 3번, **셋 다 exit 0·
error/warn/missing/invalid/cannot 0건**. `--script`로 직접 인스턴스화해
두 GLB의 실측 AABB를 구했다(추측 아님, 위 실측표 값의 출처). 씬을 정식
경로(`--quit-after`, autoload 정상 초기화)로 돌렸을 때 `ShrineAltar`의
`global_position`이 `world_pos(2,1)` 계산값과 정확히 일치하는 것과
`Crops` MultiMesh의 인스턴스 수가 12(농지 2칸×6)인 것을 확인했다. **발견
— MultiMesh 인스턴스별 transform은 헤드리스 null 렌더러에서 `get_instance_
transform()`으로 읽으면 항상 identity로 나온다**(최소 재현: 빈 프로젝트
스크립트로 set/get 왕복만 해도 재현됨) — 렌더링 서버 쪽 버퍼가 헤드리스
더미 드라이버에서 안 채워지는 것으로 보이는 엔진 한계이지, 이번에 추가한
코드의 버그가 아니다(기존 나무/바위/다리/벽 MultiMesh도 같은 패턴이라
똑같이 이 한계에 걸릴 것). 그래서 이번엔 transform 자체가 아니라 위치
계산값(`pos0`)과 인스턴스 개수로 정확성을 확인했다 — 다음에 MultiMesh
배치를 다시 검증할 일이 있으면 `get_instance_transform()` 값을 믿지 말
것. GUI 실기 확인은 안 함(아래 다음 세션 목록에 추가).

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
