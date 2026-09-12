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

## 이번에 발견해 같이 고친 것 — Awake() 중복 생성

`NpcBuilder.cs`·`BanditEncounter.cs`가 `Awake()`에서 조건 없이
`Build()`를 다시 불러서, 편집기 빌드 스크립트가 이미 저장해 둔 씬을 실제
Play(헤드리스든 사람이 직접 하든)로 열면 시각·UI가 두 벌씩 겹쳐 생기는
잠재 버그였다(`Gatherable.cs`·`HiddenTreasure.cs` 등은 이미 방어가
있었는데 이 둘만 빠져 있었음). 캐릭터 GLB로 바꾸며 두 파일을 어차피
손대는 김에 `transform.Find("Visual") != null`이면 다시 안 짓게 방어를
넣었다. **`AnimalBuilder.cs`·`RareWolfEncounter.cs`·`HiddenTreasure.cs`·
`MountainShrine.cs`·`EastGroveRelic.cs`·`LuckyCairn.cs`도 같은 패턴(무조건
`Build()`)이라 이론상 같은 버그가 있을 수 있다** — 이번엔 GLB 교체
범위 밖이라 손 안 댔다, 다음에 손댈 때 같이 고칠 것(`docs/PROJECT_STATE.md`
"다음 작업"에도 적어 둠).
