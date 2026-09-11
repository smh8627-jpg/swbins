# PROJECT_STATE

master.md 규칙(33장 토큰 절약 규칙 10)에 따라 여기에는 완료 단계 / 현재 작업 /
다음 작업 / 알려진 오류 / 테스트 상태만 짧게 적는다. 긴 설명은 남기지 않는다.

## 완료 단계

- Phase 1 — 01, 05, 06(폴더만), 07(폴더만), 08, 09, 10: 폴더 구조 생성, Git 확인,
  project.godot 작성
- Godot Engine 4.7.2 (표준판, non-Mono) winget 설치 완료.
  경로: `%LOCALAPPDATA%\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.2-stable_win64.exe`
  (winget이 PATH에 `godot`/`godot_console` alias를 등록했다고 보고했으나, 새 셸에서
  아직 미확인 — 안 되면 위 전체 경로로 직접 실행)
- Main.tscn 생성 (Node3D 루트 + Camera3D + DirectionalLight3D, 빈 스켈레톤 씬).
  `run/main_scene`에 연결. `--headless --import` 로 프로젝트 첫 스캔/임포트,
  `--headless --quit` 로 실행 — **exit code 0, 오류 없음.**

## 완료 단계 (추가)

- Phase 2 — Legacy 분석 완료. `docs/LEGACY_FEATURE_AUDIT.md` 작성 —
  5개 게임의 PLAN.md/PLAN1.md/PLAN2.md(15개, 21,665줄) + README 전체를 읽고
  KEEP/REWORK/MERGE/DROP 분류. **가장 큰 발견: master.md 5장의 게임 재정의가
  이 프로젝트의 핵심 정체성("역사 인물로 노는 웹 게임")을 빠뜨리고 제네릭
  판타지 몬스터 RPG로 잘못 재정의했었다** — 감사 문서에 바로잡아 기록함.
  또한 master.md 6장의 "SAGA Core 공통화"가 다섯 벌 복사 원칙(루트 CLAUDE.md)과
  충돌한다는 것도 확인.

## 현재 작업

- Phase 1 나머지: 02(이름 확정 — 지금은 "SAGA"), 03(모바일 해상도 실기 확인),
  04(Portrait/Landscape 실제 동작 확인 — 지금은 project.godot 설정만 돼 있고 실기 미확인)

- Phase 3 — Vertical Slice 설계 완료. `docs/VERTICAL_SLICE.md` 작성 — 첫
  슬라이스는 **사가고(GO)** 기준(master.md 39장 순서 + GO만 웹판 코드가 실제로
  도는 상태). "도적의 습격" 사건 하나로 좁힌 최소 루프: 걷기 → 주민 대화 →
  사건 조우 → 전투(duel.js 재구현) → 승리 → 등용(부대 합류) → 저장. 보스·퀘스트·
  던전·장비는 이번 슬라이스에서 의도적으로 제외(GO 정체성에 안 맞거나 다른
  게임 설계를 먼저 봐야 함).

- Phase 4(36~50단계) 첫 조각 — **TestVillage.tscn 완성.** VERTICAL_SLICE.md 27절의
  7×7 글자 지도(`games/saga_go/data/test_map.gd`)를 실제 씬으로 세웠다.
  - `games/saga_go/world/terrain_builder.gd` — 글자 지도를 읽어 지형종류별
    MultiMeshInstance3D 하나씩(11종)에 타일 색 평면을 채운다(칸마다 노드를
    만들지 않는다 — draw call 절감, master.md 35장)
  - `games/saga_go/world/landmarks_builder.gd` — 굴 입구·마을집 2채(본체+지붕)·
    폐허 기둥 3개·다리를 primitive(Box/Prism/Cylinder)로 세운다.
    **실제 GLB 에셋 아님 — master.md 8장의 "Primitive는 프로토타입에서만"**
    원칙대로, 나중에 GLB로 교체할 자리만 파 둔 것이다
  - `TestVillage.tscn` — WorldEnvironment(하늘·안개) · DirectionalLight3D(그림자) ·
    Terrain · Landmarks · 검토용 탑다운 Camera3D · PlayerSpawn(Marker3D, 마을
    중심) 조립. `project.godot`의 `run/main_scene`을 이걸로 바꿨다(Main.tscn은
    Phase 1의 빈 스켈레톤이었을 뿐 — 이제 진짜 지역이 메인이다)
  - 검증: `--headless --import` → `--headless --quit` 둘 다 **exit 0, 에러·경고
    없음**. Godot headless는 실제 렌더링을 안 하므로(null 렌더러) 화면 확인은
    아직 못 했다 — **다음 세션이 에디터로 직접 열어 시각 확인할 것**

- Phase 4(43·44·48·49) — **초목/바위 산포 + 높낮이 지형 + 강물 표면 완료.**
  - `terrain_builder.gd`에 지형종류별 `height` 추가 — 산 +2.5 · 강바닥 -1.0 ·
    나머지는 0~0.2 사이 미세 단차(사가의숲 웹판 "물은 12cm 낮춘다" 원칙과 같음).
    강(~)·다리(B) 타일 위에 반투명 수면(WaterSurface) 한 겹을 별도 MultiMesh로 얹음
  - `vegetation_builder.gd`(신규) — 숲(T) 타일마다 나무 3그루, 산(^) 타일마다
    바위 1개를 **좌표+salt 결정적 해시**로 산포(`Math.random` 안 씀 — "자리는
    시각의 순수 함수다" 원칙, SAGA-HANDOFF.md 전역 규칙과 동일). 나무는
    trunk+canopy 각각 MultiMesh 하나씩(수십 그루라도 draw call 2회)
  - `landmarks_builder.gd`를 새 높낮이에 맞게 수정 — 굴 입구·마을집·폐허는
    각 타일의 `height`를 더해 얹고, 다리 널판은 강바닥(-1.0)과 수면(-0.45)
    위로 확실히 띄움(`bed + 2.0`)
  - 검증: `--headless --import`/`--quit` 둘 다 exit 0, 에러·경고 없음

- Phase 5(51~60절) — **Player 완성.** `games/saga_go/player/`:
  - `Player.tscn` — CharacterBody3D(캡슐 collision+visual, 실제 GLB 전까지
    primitive) · CameraRig(SpringArm3D+Camera3D 3인칭)
  - `player.gd` — 이동(조이스틱 우선, 없으면 WASD/화살표 폴백) · 걷기/달리기
    속도 두 단(Shift) · 중력 · move_and_slide 충돌 · 이동 방향으로 몸통 회전
  - `camera_rig.gd` — 플레이어를 자동으로 따라간다(부모 자식 관계) ·
    드래그로 회전(10px 문턱으로 탭과 구분 — 웹판 사가고 README의 같은 조작
    감각을 그대로 가져옴) · 휠/핀치로 줌(4~16m) · 피치 15~70도 제한
  - `games/saga_go/ui/virtual_joystick.gd` + `MobileHUD.tscn` — 왼쪽 아래
    가상 조이스틱. 터치·마우스 둘 다 지원, "virtual_joystick" 그룹으로
    player.gd가 찾아 읽는다
  - `TestVillage.tscn`에 Player·MobileHUD 인스턴스 추가, 마을 중심(-48, 0.1,
    -24)에 스폰. **평평한 충돌 바닥(Ground/StaticBody3D)을 새로 추가** —
    지형 시각 높낮이(산 +2.5·강 -1.0)와 정확히 안 맞는 알려진 한계(아래 참고)
  - 검증 중 GDScript 엄격 타입 오류 하나 잡음 — `var x := clamp(...)`가
    Variant로 추론돼 "경고를 오류로 취급"에 걸렸다. `var x: float = clamp(...)`로
    명시해 고침
  - 검증: `--headless --quit` **세 번 다 exit 0, 에러·경고 없음**

## 완료 단계 (추가, 2026-09-04)

- **Phase 8(86·87단계) 최소 구현 — NPC + Dialogue.** VERTICAL_SLICE.md 26절
  범위 그대로(주민 1~2명, 대화만, 등용 대상 아님) 좁혀서 구현. 하루 일과·
  날씨·LOD(웹판 npc.js의 핵심 설계)는 이번 슬라이스 범위 밖이라 뺐다 —
  자리는 고정, 대사는 한 줄.
  - `games/saga_go/world/npc_builder.gd`(신규) — `TestVillage.tscn`의
    `Villagers` 노드에 붙는다. 마을집 사이 빈 들판 타일(격자 (1,3)·(4,3),
    "." plains)에 마을 촌장·떠돌이 상인 둘을 세운다. 이름·대사는 웹판
    `saga-go/js/npc.js`의 것을 그대로 가져왔다(LEGACY_FEATURE_AUDIT.md
    참고 — 새로 짓지 않는다)
  - 사람마다 캡슐(Player와 같은 프리미티브 규격) + `Area3D`(반지름 14m,
    웹판 `npc.talkRadius` 그대로) — 플레이어가 들어오면 한 마디를 보여주고
    45초(`npc.talkGapSec`)가 지나야 같은 사람이 다시 말한다
  - `Player.tscn` 루트에 `groups = ["player"]` 추가(이 판정의 대상 식별용)
  - `MobileHUD.tscn`에 `DialogueLabel`(그룹 `dialogue_label`) 추가 — 화면
    위쪽에 4초간 대사를 보여주고 사라진다
  - 등용 대상이 아니므로 조우/전투 판정에는 손대지 않았다(웹판 npc.js
    설계와 같은 경계)
  - 검증: `--headless --import`/`--quit` 세 번 다 exit 0, 에러·경고 없음.
    실제 화면(대사가 뜨는지, 위치가 자연스러운지)은 에디터로 확인 필요

## 완료 단계 (추가, 2026-09-04②)

- **Phase 6(61~71단계) — Combat.** VERTICAL_SLICE.md 29·34·35절의 "도적의
  습격" 단 하나의 사건 + 실시간 전투. **72~74(엘리트 몬스터·보스·보스
  패턴)는 계획대로 스킵** — 30절이 이번 슬라이스에서 보스를 만들지 않기로
  이미 결정해 둠.
  - `data/duel_rules.gd`(신규, `class_name DuelRules`) — 웹판
    `saga-go/js/duel.js`의 판정 층(create/step/act, 속공·필살·회피·강타
    예고 AI)을 상수 하나 안 바꾸고 그대로 옮겼다(34절 "새로 설계하지
    않는다"). 승패는 주사위가 아니라 **실제로 기세를 다 깎았는지**로
    갈린다(웹판이 교전 무대를 거칠 때와 같은 규칙)
  - `world/bandit_encounter.gd`(신규) — 판정 위에 얹는 화면 층. 폐허
    타일(격자 (5,3), 웹판 event.js의 `marks:['ruin']`과 같은 자리)에
    산적을 세운다. 20m 안에 들어가면 사건 선택지(맞선다/값을 치른다/
    달아난다, event.js `bandit_ambush` 그대로) → "맞선다"면 전투 UI
    (기세·사기·기(氣) 바 + 속공(J)/필살(K)/회피(L)/물러난다 버튼)를 띄운다.
    이기면 사라지고(이번 슬라이스에서 재등장 안 함), 지면/시간초과면
    8초 뒤 다시 도전 가능
  - `project.godot`에 입력 액션 `combat_quick`(J)·`combat_ult`(K)·
    `combat_dodge`(L) 추가 — WASD/Shift(이동·달리기)와 안 겹치는 자리로 골랐다
  - **임시로 남겨 둔 것(주석에 표시)**: 내 공격력/방어력은 Phase 7(Stats)이
    없어 상수(60/35)다. "값을 치른다"·"달아난다"는 골드·소지품 시스템이
    없어 대사만 보여준다. 이긴 뒤 "등용"(부대 합류)·부대 성장은 Phase 7
    RPG Systems 몫이라 아직 안 붙였다 — VERTICAL_SLICE.md 26·35절의 나머지
  - 검증: `--headless --import`/`--quit` 세 번 다 exit 0, 에러·경고 없음
    (씬의 `_ready()`가 실제로 돌아 UI 생성 코드까지 실행됨). 실제 화면
    (전투 감각·타격감, VERTICAL_SLICE.md 27~28절 "재미있는가")은 에디터로
    확인 필요 — 다음 세션/사용자가 열어 볼 것

## 실기 검증 완료 (2026-08-31)

사용자가 에디터로 직접 열어 확인 — 산·집·나무가 다 막히고, 다리는 건너진다.
**"응 잘되네."** 이어서 **"기둥도 지나감"** — 폐허 기둥(`RuinPillar_*`)도
그림뿐이라 충돌이 없었다. `_add_ruins()`에 `CylinderShape3D` 충돌을 붙였다
(반지름 1.1, 기둥 높이 그대로). **사용자가 에디터로 재확인 완료** — "응
확인 했어". 지형·건물·나무·기둥 전부 실기로 막히는 것까지 검증됐다.

이동감·카메라 조작감 자체(VERTICAL_SLICE.md 27~28절 "재미있는가")에 대한
평가는 아직 별도로 안 받았다 — 눈에 띄는 문제가 나오면 그때 다시 고친다.

## 알려진 한계 (2026-08-31 수정됨 — 아래 참고)

- ~~Ground 충돌체가 완전 평면~~ — **고쳤다.** 사용자가 에디터로 직접 열어
  보고 "물체가 떠있고 집은 벽이 아니고" 라고 지적한 것 둘 다 이게 원인이었다:
  - `terrain_builder.gd`에 `_build_collision()`을 추가해 평평한 박스 하나
    대신 **타일마다** 충돌체를 놓는다. 산·강(walkable=false)은 막힌 벽
    (높이 6, 지나갈 수 없다 — 강은 다리로만 건넌다), 다리는 널판 높이에서,
    나머지는 제 타일 높이에서 딛는다. 다리 높이는 `BRIDGE_CLEARANCE` 상수로
    `landmarks_builder.gd`와 값을 공유한다(두 파일이 각자 정하면 어긋난다)
  - `landmarks_builder.gd`에 `_solid()` 헬퍼를 추가해 마을집·굴 입구에
    실제 `StaticBody3D` 벽을 붙였다(전엔 그림만 있고 뚫고 지나갔다)
  - `TestVillage.tscn`의 옛 평평한 `Ground` 노드는 지웠다 — 이제 지형
    충돌은 전부 `terrain_builder.gd`가 만든다
  - **추가 지적 — "나무는 막히지는 않았어"**: `vegetation_builder.gd`의
    나무는 애초에 그림(MultiMesh)뿐이라 충돌이 없었다. 나무마다
    `StaticBody3D`+`CylinderShape3D`를 줄기 자리에만 붙였다(반지름은
    그림보다 살짝 얇게 0.45배 — 스치는 정도로는 안 걸리게). **잎(캐노피)은
    안 막는다** — 다 막으면 숲을 지나가기 너무 빡빡해진다
  - 검증: `--headless --import`/`--quit` 세 번 다 exit 0, 에러·경고 없음.
    **다시 에디터로 확인해줄 것** — 이번엔 산이 실제로 막히는지, 집·나무에
    부딪히는지, 다리를 건널 수 있는지

## 다음 작업

- **방침 확정(2026-08-31, 사용자 지시)**: "Godot도 하나만 먼저 완성하고
  다른 세션에서 이어 한다." 즉 saga-godot은 **5개 게임을 동시에 벌리지
  않는다** — GO의 Vertical Slice(VERTICAL_SLICE.md)를 끝까지 완성하는 게
  먼저다. DUNGEON/FOREST/STORY/REALM은 GO가 끝난 뒤에나 손댄다
  (master.md 39장 순서와도 맞음). 웹 다섯 판(saga-go 등)은 이 결정과
  무관하게 각자 PLAN.md로 별도 진행 — 정본 분리는 커밋 5936c83 참고
- **순서 재검토(2026-09-04)**: "다음은 Phase 6(Combat)"이 PLAN.md의 범용
  100단계 번호(master.md 원문, 몬스터형 RPG 템플릿)만 따른 것이었고,
  VERTICAL_SLICE.md 자신의 완료 조건(156~159줄 "걷는다 → 주민과 대화한다
  → 사건 조우 → 전투 …")과 순서가 어긋나 있었다 — 대화가 전투보다 먼저
  와야 하는데 거꾸로 잡혀 있었음. 아래로 정정, **1·2번은 위에서 완료**:
  1. ~~NPC 최소 구현 먼저~~ — 완료(위 "완료 단계 (추가, 2026-09-04)" 참고)
  2. ~~Phase 6(Combat) 61~71단계만~~ — 완료(위 "완료 단계 (추가,
     2026-09-04②)" 참고). 72~74(엘리트 몬스터·보스·보스 패턴)는 계획대로 스킵
  3. **다음: 완료 조건(VERTICAL_SLICE.md 하단 12단계 루프) 전체 검증** —
     실제 에디터로 "게임 실행 → 3D 마을 → 걷는다 → 주민과 대화한다 → 도적의
     습격 조우 → 맞선다 → 실시간 전투 → 도적을 이긴다" 까지 손으로 확인.
     남은 두 단계("부대 합류"·"저장/로드")는 아직 코드가 없다(Phase 7·9
     몫) — 12단계 전부를 지금 검증할 수는 없고, **여기까지 만든 부분이
     재미있는지**(VERTICAL_SLICE.md 27~28절)를 먼저 확인하는 게 목적
- **결정됨(2026-08-31)**: saga-godot은 인물 데이터를 공유한다(다섯 웹판은
  기존 다섯 벌 복사 구조 그대로 유지, 무관). `saga_core/data/characters/`에
  인물 70+REALM 무장 54를 id 불변으로 통합. LEGACY_FEATURE_AUDIT.md 6장 참고
- ~~Phase 4 나머지(41 GLB import 구조, 45·46 primitive→GLB 교체)는 실제
  3D 에셋을 고른 뒤로 미룸~~ — **완료. 아래 "완료 단계 (추가,
  2026-09-11②)" 참고.** 남은 조각(동굴 입구, NPC·산적 캐릭터, 마을집
  실제 모듈 타일링)은 `docs/ASSET_GUIDE.md` "이번에 안 바꾼 것" 절에
  정리해 둠 — 다음 GLB 손질 때 거기부터 보면 된다
- **렌더러 프로파일 전환(2026-09-11, 커밋 `97ab1fd`·`a628fce`) 헤드리스 검증
  완료** — PLAN.md 66-1장대로 `project.godot`의 `renderer/rendering_method`를
  `forward_plus`(기본) + `.mobile`/`.web` 태그 분기로 바꾼 것을, 이 세션이
  GitHub 릴리스에서 받은 Godot 4.7.2 콘솔 빌드(`saga-godot/CLAUDE.md`의
  2026-09-11 안내대로 winget PATH를 안 믿고 새로 받음)로 `--headless
  --editor --quit`(첫 임포트) → `--headless --quit-after 3 --verbose`
  두 단계 다 돌렸다. **exit 0, error/warn/missing/invalid/cannot 전부
  0건** — TestVillage.tscn의 Player·MobileHUD·npc_builder·bandit_encounter·
  vegetation_builder까지 스크립트·리소스 참조가 전부 정상 로드됨을 확인.
  단, 헤드리스는 더미 렌더러라 **Forward+가 실제로 화면에 무엇을 다르게
  그리는지는 여전히 미확인** — 그래픽 품질 자체는 에디터를 직접 열어야 한다
  (다음 "실기 확인 몰아서" 때 같이 볼 것).

## 완료 단계 (추가, 2026-09-11)

- **PLAN.md 66-1장(렌더러 프로파일) 나머지 구현 — Environment 리소스 분리 +
  AA/그림자 품질 feature tag + 렌더러 디버그 표시.**
  - `assets/environment/env_pc.tres`(신규) — `TestVillage.tscn`에 인라인으로
    박혀 있던 Sky/Environment sub_resource를 뽑아냈다. 기존 하늘·안개·톤매핑
    값은 그대로 두고 `ssr_enabled`·`ssao_enabled`·`ssil_enabled`·
    `sdfgi_enabled`·`volumetric_fog_enabled`를 켰다
  - `assets/environment/env_mobile.tres`(신규) — 하늘·안개·톤매핑·Glow는
    `env_pc.tres`와 **값을 동일하게**(66-1장 "게임의 색 톤은 같아야 한다")
    유지하고, 위 GI/반사 계열은 전부 뺐다(45장 위반 방지)
  - `games/saga_go/world/environment_profile.gd`(신규) — `WorldEnvironment`
    노드에 붙는 스크립트. `_ready()`에서 `OS.has_feature("mobile")`/
    `("web")`로 두 리소스 중 하나를 골라 assign. 씬 파일 안에는 분기를
    두지 않는다는 원칙대로 이 스크립트 하나가 유일한 분기점
  - `TestVillage.tscn` — 인라인 sub_resource 3개(SkyMat1·Sky1·Env1) 제거,
    `WorldEnvironment`가 `env_pc.tres`를 기본값(에디터 뷰포트용)으로 물고
    `environment_profile.gd`를 실행 시점 오버라이드로 붙임
  - `project.godot` — `[rendering]`에 `anti_aliasing/quality/msaa_3d`·
    `use_taa`·`lights_and_shadows/directional_shadow/size`·
    `soft_shadow_filter_quality`를 PC 기본값 + `.mobile` feature tag 오버라이드로
    추가(키 이름은 받아 둔 Godot 4.7.2 바이너리로 `ProjectSettings.has_setting`
    직접 호출해 실재 확인 후 반영 — 추측으로 안 넣음)
  - `games/saga_go/ui/renderer_debug_label.gd` + `MobileHUD.tscn`에
    `RendererDebugLabel` 노드(신규) — 46장 "현재 rendering_method 표시".
    `OS.is_debug_build()`가 거짓이면(릴리즈 빌드) 자동으로 숨는다
  - 검증: `--headless --editor --quit`(임포트) · `--headless --quit-after 5
    --verbose`(TestVillage.tscn 완주) 둘 다 exit 0, error/warning/missing
    로그 0건. verbose 로그로 `env_pc.tres`·`env_mobile.tres`·
    `environment_profile.gd`·`renderer_debug_label.gd` 전부 정상 로드 확인
  - 여전히 미검증: 실제 GUI에서 PC 프로파일이 SDFGI·SSR을 눈에 보이게
    그리는지, Mobile 프로파일 전환이 실기(Android/iOS 내보내기)에서 진짜
    `mobile` feature로 잡히는지 — 이건 에디터를 직접 띄우거나 실기 빌드가
    있어야 확인된다(66-1장 "실기 확인은 몰아서" 그대로 유지)

## 완료 단계 (추가, 2026-09-11②)

- **PLAN.md 41·43~46·51장 — primitive → 실제 GLB 에셋 첫 교체.** CC0
  Kenney 킷 세 개(Nature Kit·Fantasy Town Kit·Blocky Characters, 전부
  2026-09-11 다운로드)를 받아 나무·바위·마을집·폐허 기둥·다리·플레이어를
  전부 GLB로 바꿨다. 무엇을 어떤 스케일로 썼는지는 `docs/ASSET_GUIDE.md`
  (신규 — PLAN 34장에서 계획만 되고 안 만들어져 있던 문서)에 실측치와
  근거를 정리해 뒀다.
  - `games/saga_go/world/glb_utils.gd`(신규) — 뼈대 없는 단순 소품
    GLB(나무·바위·건물 조각)에서 `Mesh` 리소스만 뽑아내는 공용 헬퍼.
    `vegetation_builder.gd`·`landmarks_builder.gd`가 같이 쓴다 — 그래야
    기존처럼 MultiMesh 하나에 얹어서 draw call을 안 늘릴 수 있다
    (master.md 35장)
  - `vegetation_builder.gd` — 나무는 `tree_oak.glb`(몸통+수관이 이미 한
    Mesh 안에 표면 2장으로 합쳐져 있어 MultiMesh 하나로 충분), 바위는
    `rock_largeA`/`rock_smallA` 두 GLB를 타일마다 해시로 섞어 씀(능선이
    다 똑같아 보이지 않게)
  - `landmarks_builder.gd` — 마을집은 `wall-block.glb`(몸통, 비균등
    스케일)+`roof-gable.glb`(지붕), 폐허 기둥은 `pillar-stone.glb`,
    다리는 `planks.glb` 44장을 MultiMesh로 이어 붙임(하나를 44배 늘리는
    대신). 동굴 입구만 어울리는 조각이 없어 primitive로 남김
  - `Player.tscn`/`player.gd` — Visual을 캡슐에서 `character-a.glb`
    (CC0 Kenney Blocky Characters) 전체 씬 인스턴스로 교체. 안에 이미
    있는 `idle`/`walk`/`sprint` 애니메이션을 이동 상태에 맞춰 재생하도록
    `_play_anim()` 추가 — PLAN 52절("Idle/Walk/Run 구현")도 같이 해결됨
  - 검증: `--headless --editor --quit`(임포트) · `--headless
    --quit-after 5 --verbose`(TestVillage 완주) 둘 다 exit 0,
    error/warning/missing 로그 0건. verbose 로그로 GLB 8개 + PNG 텍스처
    2개 전부 정상 로드 확인
  - **GUI 실제 화면 확인(사용자 명시적 요청)** — windowed 빌드로 16초
    띄워 스크린샷. 캐릭터가 모자·얼굴·상의·하의 색이 다 구분되는 실제
    텍스처로 렌더링됨(핑크색 "텍스처 없음" 표시 없음 — `texture-a.png`
    경로 참조가 제대로 걸렸다는 뜻), 그림자 정상, 배경에 나무·지붕 형태
    확인됨. 씬이 여전히 안개로 뿌옇게 보이는 것과 나무 색이 예상보다
    옅은 청록 쪽으로 도는 것은 `env_pc.tres`의 안개·주변광 값이 primitive
    시절 기준으로 맞춰져 있어서로 보임 — 다음 손질 때 GLB 색에 맞춰
    다시 조정할 것(버그 아님, 튜닝 거리)
  - 남은 일은 `docs/ASSET_GUIDE.md` "이번에 안 바꾼 것" 절 그대로:
    동굴 입구, ~~NPC·산적 캐릭터 교체~~(바로 아래서 완료), 마을집 실제
    모듈 타일링

## 완료 단계 (추가, 2026-09-11③)

- **NPC(촌장·상인)·산적도 GLB로 교체.** 이미 받아 둔 Blocky Characters
  킷에서 글자만 더 골라 왔다(추가 다운로드 없음) — 마을 촌장=
  `character-b.glb`, 떠돌이 상인=`character-c.glb`, 산적=
  `character-d.glb`, 플레이어(`character-a.glb`)와는 다 다른 옷 색으로
  구별된다.
  - `npc_builder.gd` — `VILLAGERS`의 `color` 필드를 `glb` 경로로 바꾸고
    `_build_body()`에서 씬 인스턴스(못 받아 오면 예전 캡슐로 대체)를 반환
  - `bandit_encounter.gd` — 여기가 까다로웠다: 산적의 "강타 예고"
    텔레그래프(몸 전체를 잠깐 물들였다 되돌리는 연출, 34절 duel.js
    감각)가 캡슐 시절엔 `MeshInstance3D.material_override` 하나로
    끝났는데, GLB 캐릭터는 몸통·팔·다리·머리가 각각 다른
    MeshInstance3D라 그 방법이 그대로 안 통했다. `glb_utils.gd`에
    `find_all_mesh_instances()`를 추가해 전부 찾아 같이 바꾸는 식으로
    고쳤고, **평소엔 override를 안 걸어 원래 텍스처가 보이게** 하고
    텔레그래프 순간만 색을 입혔다가 되돌리도록 설계를 바꿨다(예전엔
    평소에도 `_base_color`로 덮어써서 텍스처가 있어도 안 보였을 것 —
    이번에 같이 바로잡음). 펀치 연출(`_pulse_visual`)의 "원래 크기"
    기준도 1.0 → GLB 스케일(1.25)로 맞춰 고침(안 고쳤으면 강타·필살 후
    캐릭터가 눈에 띄게 작아진 채로 남았을 것)
  - 검증: `--headless --editor --quit` 중 `f.is_null()` 오류가 한 번
    떴으나(새 텍스처 4장 동시 재임포트 경합으로 보임) 바로 재실행하니
    재현 안 됨 — `--headless --quit-after 5`를 연속 3번 돌려 **셋 다
    exit 0·오류 0건** 확인. GUI 스크린샷은 이번엔 카메라가 마을·폐허
    쪽을 비추지 않아 눈으로는 못 봤고, 헤드리스 로그로 네 캐릭터
    GLB·텍스처 전부 정상 로드된 것만 확인함
  - **육안 확인 완료(같은 날 뒤, 사용자 명시적 요청).** `TestVillage.tscn`의
    `ReviewCamera`를 임시로 각 인물 위치로 옮기고(`current=true`),
    `env_pc.tres`의 안개를 임시로 꺼서 촌장·상인·산적을 각각 클로즈업으로
    스크린샷 — **셋 다 서로 다른 옷 색으로 뚜렷이 구별됨**(촌장=붉은
    계열, 상인=민트+살구색, 산적=황토색), 산적 옆의 폐허 기둥
    (`pillar-stone.glb`)도 같이 확인됨. 확인 끝나고 `git checkout`으로
    두 씬 파일·환경 리소스를 원래 커밋 상태로 정확히 되돌림(diff 0,
    이 확인은 저장소에 흔적을 안 남긴다)
  - **삽질 기록 — `.tscn`의 `Transform3D`는 행 우선(row-major)이다.**
    카메라를 옮기려고 `Basis.looking_at()`으로 계산한 `basis.x/y/z`
    (열벡터)를 그대로 9칸에 늘어놓았더니 회전이 뒤집혀(하늘만 보임)
    한참 헤맸다. 올바른 표기는 `t.basis.x.x, t.basis.y.x, t.basis.z.x,
    t.basis.x.y, ...`처럼 **행 순서**로 뽑아야 한다 — 다음에 씬 파일에
    카메라·오브젝트 Transform3D를 손으로 써넣을 때 같은 함정을
    밟지 않도록 여기 적어 둔다

## 완료 단계 (추가, 2026-09-11④)

- **동굴 입구도 GLB로 교체.** 이전 항목에서 "다음 세션은 동굴 입구부터"로
  적어 둔 것을 같은 날 이어서 마쳤다. Nature Kit·Fantasy Town Kit엔
  어울리는 조각이 없어 CC0 Kenney **Modular Cave Kit**(신규 다운로드,
  `kenney.nl/assets/modular-cave-kit`)을 받아 `gate-rock.glb`(아치형
  바위 문, 바닥 피벗, 4.0×4.05×2.454)를 `assets/dungeon/`에 넣었다.
  - `landmarks_builder.gd::_add_cave()` — primitive 검은 박스를
    `GLBUtils.extract_mesh`로 뽑은 gate-rock 메시로 교체, 균일 스케일
    (6/4.05≈1.48, 원래 primitive 높이 6에 맞춤)만 적용했다. wall-block과
    달리 단순 색 아틀라스가 아니라 실제 바위 굴곡이 있는 조각이라
    **비균등 스케일은 일부러 안 씀**(ASSET_GUIDE.md에 근거 기록). 못
    받아 왔을 때는 bridge와 같은 fallback(예전 primitive 박스)으로
    대체하도록 짰다. 충돌은 기존과 동일하게 랜드마크 장애물(지나갈 수
    있는 통로 아님) — 이번 교체는 시각만 바꾸는 범위였다.
  - 검증: `--headless --editor --quit`(임포트) → `--headless
    --quit-after 5`를 연속 3번, **셋 다 exit 0·error/warn/missing 0건**.
    verbose 로그로 `assets/dungeon/gate-rock.glb`·`Textures/colormap.png`
    둘 다 정상 로드 확인. GUI 스크린샷 확인은 이번엔 안 함(사용자가
    명시적으로 요청하지 않음 — 66-1장 "실기 확인은 몰아서" 방침대로 쌓아
    둠).
  - 이 킷엔 room/corridor/ladder/stairs 조각도 있어(41개 중 4개만 씀)
    **동굴 내부(방·통로)를 실제로 만들 때 같은 킷에서 더 가져올 수
    있다** — 지금은 입구 랜드마크 하나만 교체하는 범위였고, 내부 던전은
    아직 계획도 없다.

## 완료 단계 (추가, 2026-09-11⑤)

- **마을집 실제 모듈 타일링.** 앞 항목에서 남겨 둔 "다음엔 마을집 모듈
  타일링"을 같은 날 이어서 마쳤다. `wall-block.glb`(1×1×1)를 비균등
  스케일로 늘려 쓰던 것을, `landmarks_builder.gd`에 새로 만든
  `_build_wall_perimeter()`로 실제 격자 조립으로 바꿨다 — 10×10 발자국
  둘레(안쪽은 빈 칸)에 4층을 쌓아 이어 붙인다(집 하나당 144개 인스턴스,
  MultiMesh 하나라 draw call은 그대로 1회). 충돌 박스·지붕 배치 기준인
  발자국 값(`WALL_FOOTPRINT`)은 예전 `body_size`와 같은 10×4×10을 그대로
  써서 게임플레이·기존 씬 배치는 안 바뀌었다. 근거는
  `docs/ASSET_GUIDE.md` "마을집 — 처음엔 비균등 스케일, 지금은 실제 모듈
  조립" 절 참고.
  - 검증: 새 에셋 추가가 없어 재임포트는 불필요, `--headless
    --quit-after 5`를 연속 3번 돌려 셋 다 exit 0·error/warn/missing
    0건. GUI로 실제로 격자가 벽처럼 보이는지는 아직 눈으로 확인 안 함
    (사용자 명시적 요청 없었음 — 아래 "다음에 이어질 것" 남은 실기
    확인 때 같이 볼 것).

## 완료 단계 (추가, 2026-09-11⑥)

- **"도적이 부대에 합류한다"·"부대 전투력이 올랐다는 걸 화면에서
  확인한다" 최소 구현.** VERTICAL_SLICE.md 12단계 완료 조건 중 남아
  있던 두 단계(PROJECT_STATE.md 2026-09-04② "다음: 완료 조건 전체 검증"
  항목에서 "아직 코드가 없다"고 적어 둔 부분). Phase 7(Stats/Item/
  Inventory/Equipment)을 통째로 만드는 대신, 이 loop 하나를 완성하는
  데 필요한 만큼만 새로 만들었다.
  - `games/saga_go/data/party_state.gd`(신규, `project.godot`
    `[autoload]`에 `PartyState`로 등록된 싱글턴) — 등용한 인원 id
    목록·공격력·방어력만 갖는다. `BASE_ATK`/`BASE_DEF`(60/35)는
    `bandit_encounter.gd`가 쓰던 예전 `PLACEHOLDER_ATK`/`PLACEHOLDER_DEF`
    와 같은 값이라, 아직 아무도 등용 안 했을 때 기존 전투 밸런스가
    그대로 유지된다. `recruit(id)`가 인원 수에 비례해 공격력/방어력을
    올리고 `power_changed` 신호를 쏜다.
  - `bandit_encounter.gd` — `_start_fight()`가 `PLACEHOLDER_ATK/DEF`
    대신 `PartyState.atk/def`를 쓰도록 바꿨고(그 두 상수는 제거),
    `_finish_fight()`의 승리 분기에서 `PartyState.recruit(RECRUIT_ID)`를
    부르고 토스트에 새 전투력을 같이 보여준다.
  - `games/saga_go/ui/party_label.gd`(신규) + `MobileHUD.tscn`의
    `PartyLabel` 노드(신규) — "부대 N명 · 전투력 X"를 상시 표시(도적
    처치 토스트처럼 몇 초 뒤 사라지는 게 아니라 계속 남아 있어야
    "올랐다는 걸 화면에서 확인한다"는 조건에 맞는다). `RendererDebugLabel`
    처럼 그룹 조회 대신 `PartyState` 싱글턴을 직접 구독한다.
  - 인물별 개성(saga_core 인물 데이터 연동, 2026-08-31 "결정됨" 항목)은
    이번 범위 밖 — 지금은 "합류했다는 사실"과 "수치가 오른다"만 채운다.
  - 검증: `--headless --editor --quit`(임포트, 새 스크립트·autoload
    등록 문법 오류 확인) → `--headless --quit-after 5`를 연속 3번,
    셋 다 exit 0·error/warn/missing 0건. GUI로 실제 전투를 이겨서
    라벨이 올라가는지는 아직 눈으로 확인 안 함(자동 전투 스크립트가
    없어 헤드리스로는 실제 승리를 못 재현 — 위 실기 확인 목록에 추가).

## 완료 단계 (추가, 2026-09-11⑦)

- **"저장한다 → 다시 켜서 이어진다" 최소 구현 — VERTICAL_SLICE.md 12단계
  완료 조건의 마지막 단계.** PLAN.md 28장은 레벨·장비·인벤토리·퀘스트·
  월드 상태까지 저장하라고 하지만, 이 슬라이스에 실제로 있는 상태는
  플레이어 위치와 부대(PartyState)뿐이다 — 없는 시스템을 저장하는 코드는
  만들지 않았다. 28장이 요구하는 "버전 필드"만 지켰다(`SAVE_VERSION`,
  값이 다르면 지금은 마이그레이션 없이 무시 — Data Versioning은 Phase 9
  97단계 몫, 아직 안 만듦).
  - `games/saga_go/data/save_state.gd`(신규, `SaveState`로 autoload
    등록) — `save()`는 플레이어 위치 + `PartyState.members`를
    `user://save.json` 하나에 JSON으로 쓴다("로컬 파일 하나", 26절과
    같은 말). `try_load()`는 있으면 읽어서 `PartyState.restore()`로
    부대를, `player.global_position`으로 위치를 되돌린다.
  - `party_state.gd`에 `restore(saved_members)` 추가 — `recruit()`처럼
    한 명씩 신호를 여러 번 쏘지 않고, 불러온 목록을 통째로 앉히고 수치만
    한 번에 다시 계산한다.
  - `games/saga_go/ui/save_button.gd`(신규) + `MobileHUD.tscn`의
    `SaveButton`(우하단, 조이스틱과 대칭 위치) — 누르면 `SaveState.save()`
    를 부르고 결과를 토스트로 보여준다.
  - `games/saga_go/world/test_village.gd`(신규, `TestVillage.tscn` 루트
    스크립트) — `_ready()`에서 `SaveState.try_load()`를 부른다. Godot는
    자식들의 `_ready()`가 부모보다 먼저 도니, 이 시점엔 Player 등 모든
    노드가 이미 트리에 있다.
  - **실제 파일 IO로 왕복 검증(헤드리스, 씬을 두 번 따로 실행).** 임시로
    `test_village.gd`에 디버그 프린트를 넣어 `SaveState.save()` →
    `SaveState.try_load()`를 한 프로세스 안에서, 그리고 저장 파일을
    지우지 않은 채 **완전히 새 프로세스로 다시 실행**해 두 번째 실행이
    첫 번째 실행이 남긴 파일을 정말로 읽어 오는지까지 확인했다(단순
    "에러 없음"이 아니라 값 자체 비교) — 두 번째 실행에서 부대 인원이
    1명(이전 실행이 저장한 값)에서 시작해 이번 실행의 등용으로 2명이 된
    것·`atk`가 공식대로 재계산된 것·`player_pos`가 그대로 복원된 것을
    확인. 검증 뒤 디버그 코드는 전부 되돌리고 `user://save.json`도
    지웠다(레포에는 안 들어감, `user://`는 로컬 OS 경로).

- **그 과정에서 실제 버그를 하나 찾아 고쳤다 — `.tscn`의 `groups = [...]`는
  잘못된 문법이었다.** `Player.tscn`의 `groups = ["player"]`,
  `MobileHUD.tscn`의 `groups = ["virtual_joystick"]`·
  `groups = ["dialogue_label"]` 전부 `[node ...]` 줄 **아래**에 별도
  속성처럼 적혀 있었는데, Godot가 실제로 그룹을 저장하는 문법은
  `[node name="X" type="Y" groups=["group"]]`처럼 **`[node ...]` 헤더
  줄 안의 속성**이다(직접 `Node.add_to_group(name, true)` 후
  `ResourceSaver.save()`로 저장해 실제 출력 문법을 확인 — 추측 아님).
  body 줄로 적힌 건 Godot가 조용히 무시해서 **세 그룹 다 지금까지 한
  번도 작동한 적이 없었다** — 즉 지금까지 "완료"로 적어 둔 모바일 가상
  조이스틱(Phase 5)과 NPC/산적 대화창 토스트(Phase 8, 2026-09-04 항목)
  둘 다 실제로는 화면에 아무것도 안 뜨고 있었을 가능성이 크다(조이스틱은
  입력이 안 잡혀도 키보드로 조용히 대체되고, 토스트는 그냥 안 보였을
  뿐이라 헤드리스 검증·이번 `--quit-after` 스모크 테스트로는 걸리지
  않았다). 이번에 `PartyState.members` 저장을 위해 새로 만든 `"player"`
  그룹이 항상 빈 배열로 잡히는 걸 보고서야 발견했다. 세 파일 모두
  올바른 헤더 속성 문법으로 고쳤고, 헤드리스로 그룹 크기를 직접
  프린트해 셋 다 1(멤버 있음)로 잡히는 것까지 확인했다. **실제 화면에서
  조이스틱 입력·NPC 대화 토스트가 지금 진짜로 뜨는지는 아직 GUI로 못
  봤다** — 아래 실기 확인 목록에 추가.

## 완료 단계 (추가, 2026-09-11⑧)

- **PLAN.md Phase 9(97단계) Data Versioning.** 사용자가 Phase 9 나머지
  (Data Versioning·Mobile Performance Pass·전체 플레이 테스트) 중 이걸
  먼저 골랐다 — 나머지 둘은 실기기가 있어야 의미가 있어 실기 확인 몰아서
  할 때와 겹친다.
  - `save_state.gd`에 `_migrate()`(버전이 낮으면 `_migrate_step()`을
    한 단계씩 적용해 최신 모양으로 만듦, 경로가 없거나 이 빌드보다
    나중 버전이면 null)·`_migrate_step(from_version, data)`(버전별
    분기는 `match`, 지금은 `SAVE_VERSION`이 1뿐이라 `_: return null`만
    있음) 추가. `try_load()`는 이제 버전이 안 맞으면 바로 포기하지 않고
    이 마이그레이션 체인을 먼저 거친다.
  - **처음 짠 설계(문서에는 안 남음)는 `const MIGRATIONS: Dictionary`에
    버전별 `Callable`을 등록하는 방식이었는데, 실제로 헤드리스에서
    테스트해 보니 GDScript가 "Assigned value for constant "MIGRATIONS"
    isn't a constant expression"로 컴파일을 거부했다** — 람다(Callable)는
    이 GDScript 버전에서 const 컬렉션 리터럴 안에 값으로 못 들어간다.
    `match from_version: ...`으로 바꿔 해결 — 스키마를 실제로 바꿀 때
    (`SAVE_VERSION`을 올릴 때) 여기 분기 하나를 추가하면 된다.
  - **검증 — 임시 디버그 코드로 두 경로를 다 실제로 태워 봤다(검증 뒤
    되돌림, 레포에는 안 들어감).** ①버전 0(구버전 흉내) 페이로드를
    `_migrate_step`에 등록된 게 없는 상태로 로드 → `try_load()`가
    `false`를 돌려주고 `PartyState`는 손 안 댐(안전하게 포기, 확인됨).
    ②`_migrate_step`에 `0: ...`(부대원 하나 추가하고 버전을 1로 올리는
    실제 변환)을 임시로 넣고 같은 버전-0 페이로드를 다시 로드 → 성공해서
    `members=["legacy_member", "migrated_in"]`·`atk` 공식대로 재계산까지
    확인. 두 테스트 다 끝난 뒤 `_migrate_step`은 원래의 빈 `match`로,
    `test_village.gd`도 원래 한 줄(`SaveState.try_load()`)로 되돌렸다.
  - **삽질 기록 — 이 세션 중간에 셸 작업 디렉터리가 `C:\swbins`(레포
    루트)로 조용히 되돌아간 적이 있었다.** 그 상태로 Godot를
    `--path .`로 돌렸더니 씬이 하나도 안 뜨고 에디터 초기화 로그만
    찍힌 채 조용히 끝나(오류 메시지 없음) 처음엔 코드가 깨진 줄 알고
    한참 헤맸다 — 실제로는 `pwd`로 확인해 보니 그냥 엉뚱한 폴더를
    프로젝트로 잡고 있었던 것. 다음에 비슷하게 "아무 로그도 없이 씬이
    안 도는" 증상을 보면 코드보다 **먼저 `pwd`부터 확인할 것**.
  - 헤드리스 3연속 `--quit-after 5` exit 0·오류 0건(디버그 코드 되돌린
    뒤 최종 상태로). GUI 확인은 안 함(실기 확인 몰아서 할 목록에
    새로 추가할 항목은 없음 — Data Versioning은 순수 로직이라 헤드리스
    검증으로 충분).

## 완료 단계 (추가, 2026-09-11⑨)

- **PLAN.md Phase 9(98단계) Mobile Performance Pass — 실기기 없이 되는
  코드 단위 부분.** 사용자가 실기 측정 몫(실기기 프로파일링·전체 플레이
  테스트)과 지금 당장 코드 리뷰로 되는 부분을 나눠, 코드 단위만 먼저
  진행.
  - **발견 — 3D에서 쓰는 텍스처 6장이 전부 Godot 기본값 그대로
    무압축(Lossless) + 밉맵 없음이었다.** `buildings/Textures/
    colormap.png`·`dungeon/Textures/colormap.png`·`characters/
    Textures/texture-{a,b,c,d}.png`. 원인은 Godot 에디터가 보통
    "이 텍스처는 3D에 쓰인다, VRAM 압축으로 바꿀까?" 하고 뜨는 자동
    감지 프롬프트가 사람이 인스펙터를 직접 열어야 뜨는 것이라, 이
    저장소의 모든 GLB 임포트가 헤드리스 CLI로만 진행돼 온 이 세션
    내내 한 번도 안 걸렸다는 것. 여섯 파일 다 `compress/mode=2`
    (VRAM Compressed)·`mipmaps/generate=true`로 바꿔 재임포트했다
    (`.import` 메타의 `vram_texture` 플래그가 `false`→`true`로
    바뀐 것까지 확인). 밉맵은 3D 월드에서 멀리 보이는 나무·건물·
    인물 텍스처의 앨리어싱(반짝임)·대역폭을 줄여준다 — 실기 없이도
    맞다고 확신할 수 있는 자리라 코드 단위로 처리.
  - `project.godot`에 `[importer_defaults]`로 텍스처 임포트 기본값
    자체를 바꿔 뒀다 — 앞으로 새 킷을 받을 때 같은 구멍이 다시 안
    생긴다(이전에도 groups=[...] 문법처럼 "여러 파일에 반복된 같은
    실수"를 근본 원인에서 막은 적이 있다, 2026-09-11⑦ 참고).
  - **더 살펴봤지만 문제 없다고 판단한 것들** — 나무·바위·마을집 벽·
    다리·짐승/펫 배치는 이미 전부 MultiMesh(draw call 최소화, 코드
    주석에 근거 있음), 개별 `MeshInstance3D`로 남은 자리(동굴 입구
    1개·지붕 2개·폐허 기둥 3개)는 개수가 한 자리라 MultiMesh로 바꿀
    이유가 없음. 렌더러 프로파일(그림자 크기·MSAA·SSAO/SSR/SDFGI
    끄기)은 66-1장에서 이미 PC/Mobile로 분리해 뒀음(env_pc.tres·
    env_mobile.tres). 오브젝트별 그림자 on/off처럼 **실측 없이 판단할
    근거가 없는 최적화는 이번에 손 안 댔다** — 실기 프로파일링 몫으로
    남겨 둔다(추측성 최적화를 코드에 넣지 않는다는 원칙).
  - 검증: `--headless --editor --quit`로 6장 재임포트 exit 0·오류
    0건, `--headless --quit-after 5` 연속 3번 exit 0·error/warn/
    missing 0건.

## PLAN.md 100단계 — Vertical Slice 승인 (2026-09-11⑩)

**사용자가 "다음 세션 시작 지점"에 남겨 둔 실기 확인 목록을 확인 완료 —
"확인했다 — 문제 없음, 재미도 있음".** PLAN.md 100단계("100단계에서
무조건 다음 콘텐츠로 넘어가지 않는다. 게임이 재미없다면 Phase를 되돌려
개선한다")의 게이트를 통과했다 — GO Vertical Slice는 **승인**됐고,
39장 순서(Core→Vertical Slice→GO→DUNGEON→...)대로 "GO 콘텐츠를 더
채우는 단계"로 넘어간다. 어디부터 이어갈지는 사용자에게 다시 물어
**"GO 사건 다양화"**를 골랐다(VERTICAL_SLICE.md §30·31이 미뤄 둔 것).

## 완료 단계 (추가, 2026-09-11⑩) — GO 사건 다양화 1호

- **VERTICAL_SLICE.md §30(도적 두목 같은 강화형 사건) + §31("마을의 부탁"
  새 사건 유형 + 퀘스트 로그 UI)을 함께 구현.** 웹판 event.js의
  `village_ask`(마을 촌장이 사명을 맡긴다) → 그 사명의 목표를 `bandit_ambush`의
  강화형("도적 두목")으로 잡아, 두 절이 자연스럽게 한 줄기 loop로
  이어지게 했다(사명 수락 → 도적 두목을 찾아 물리친다 → 사명 완료).
  - **`bandit_encounter.gd` 리팩터 — const 설정값을 `@export` var로.**
    `GRID`·`FOE_NAME`·`FOE_POWER`·`FOE_HP_MUL`·`BANDIT_SCALE`·`RECRUIT_ID`가
    전부 상수라 "도적의 습격" 사건 하나만 표현할 수 있었다. 같은 스크립트를
    인스턴스마다 다른 값으로 씬에 놓을 수 있게 바꿔(§30 "새로 설계하지
    않는다"), 새 필드 `event_title`·`event_quote`·`quest_id_to_complete`도
    추가했다(마지막 것은 비어 있지 않으면 승리 시 `QuestState.complete()`도
    같이 부른다).
  - `TestVillage.tscn`에 `BanditLeaderEncounter`(신규 노드, 같은
    `bandit_encounter.gd`) 추가 — 격자 (5,2)(기존 산적 자리 (5,3) 폐허
    바로 위, "산채가 폐허 근처에 있다"는 자연스러운 배치), 전투력은
    일반 산적(120×7배 체력)의 약 2배 이상(260×9배 체력), 시각적으로도
    1.4배 스케일로 더 크게. 승리 시 `village_ask` 사명을 완료한다.
  - **`games/saga_go/data/quest_state.gd`(신규, `QuestState`로 autoload
    등록)** — 웹판 `js/quest.js`는 진행형 사명을 여러 개 동시에 들지만,
    이 슬라이스는 "사명 하나를 맡고 무언가를 해내면 끝난다"는 loop 하나만
    있으면 돼서 **동시에 하나만** 든다(과설계 방지). `accept`·`decline`·
    `complete`·`has_been_offered`(같은 사명 재제안 방지)·`restore`(저장
    불러오기용).
  - **`games/saga_go/ui/quest_label.gd`(신규) + `MobileHUD.tscn`의
    `QuestLabel`** — `party_label.gd`와 같은 경계(잠깐 뜨는 토스트가 아니라
    상시 표시), "📋 사명: …" / "📋 사명 완료: …"를 `QuestState.quest_changed`
    신호로 갱신한다.
  - **`games/saga_go/ui/choice_prompt.gd`(신규)** — bandit_encounter.gd의
    사건 선택지 패널(맞선다/값을 치른다/달아난다)과 새 퀘스트 제안 패널
    (맡는다/사양한다)이 같은 모양이라 공용 헬퍼로 뽑았다(제목+버튼 목록
    → CanvasLayer). bandit_encounter.gd의 `_build_prompt_ui()`도 이걸
    쓰게 바꿈.
  - `npc_builder.gd` — 마을 촌장(`npc_elder`) 항목에 `quest_id`·
    `quest_name`·`quest_offer_title`·`quest_wait_line`·`quest_done_line`
    필드 추가. 처음 말 걸었을 때만 제안 패널이 뜨고(`QuestState.has_been_offered`
    로 판정), 그 뒤로는 진행/완료 상태에 맞는 한 줄로 갈아 낀다. 상인은
    손 안 댐(모든 NPC가 사명을 들 필요는 없다).
  - `save_state.gd` — `quest_active_id`·`quest_active_name`·`quest_done`·
    `quest_offered`를 저장/복원에 추가. 전부 없던 필드를 **추가**만 한
    것이라(기존 필드 모양은 안 바뀜, 없으면 빈 값으로 안전하게 채워짐)
    `SAVE_VERSION`을 올리는 마이그레이션은 필요 없었다.
  - **검증 — 이 세션이 도는 PC에 마침 이전 세션이 받아 둔 Godot 4.7.2
    콘솔 빌드가 `%TEMP%/godot_bin`에 남아 있어 그걸로 실행**(설치가
    아니라 압축 푼 실행 파일 하나라 그대로 실행 가능, `saga-godot/CLAUDE.md`
    참고 — 다음 세션·다른 PC엔 없을 수 있다는 점은 그대로 유효).
    `--headless --editor --quit`(임포트, exit 0) → `--headless
    --quit-after 5`를 연속 3번(exit 0·error/warn/missing/invalid/cannot
    0건). **임시 디버그 코드로 실제 값 왕복까지 확인(검증 뒤 되돌림,
    레포에 안 남음)**: ①`BanditLeaderEncounter`의 `@export` 값이 씬
    파일 그대로 인스턴스에 적용됨(grid=(5,2)·foe_name=도적 두목·
    foe_power=260·foe_hp_mul=9·bandit_scale=1.4 전부 확인) ②
    `QuestState.accept`→`complete`→`SaveState.save()` → **완전히 새
    프로세스로 재실행**해 `try_load()`가 offered/active_id/done을
    그대로 복원하는 것까지 확인(단순 "에러 없음"이 아니라 값 자체
    비교, `save_state.gd` 왕복 검증 때와 같은 방식). 확인 뒤
    `user://save.json` 삭제, 디버그 프린트도 원상복구(diff 0).
  - **아직 GUI로 눈으로 확인 안 함** — 도적 두목이 실제로 화면에서
    더 커 보이는지, 사명 제안 패널이 촌장에게 말 걸었을 때 자연스럽게
    뜨는지, QuestLabel이 PartyLabel과 안 겹치는지는 루트 CLAUDE.md
    "실기 확인은 몰아서" 방침대로 다음 실기 확인 때 같이 볼 것(아래
    "다음에 이어질 것" 목록에 추가).

## 완료 단계 (추가, 2026-09-11⑪) — GO 사건 다양화 2호

- **`games/saga_go/world/simple_event.gd`(신규) — 전투도 사명도 아닌
  "발견/돕기" 계열 사건.** 웹판 event.js의 `hurt_soldier`(부상당한 병사)를
  본떠, 선택지를 고르면 짧은 결과 문구만 보여주고 끝나는 **한 번뿐인**
  사건 형태를 추가했다. bandit_encounter.gd(전투, 진 뒤 재도전 가능)·
  npc_builder.gd의 퀘스트 제안(대화 트리거, 상태가 남는다)과는 다른 세
  번째 유형이라, 지금까지 만든 사건 3종(전투/퀘스트/일회성 발견)이
  §31 "사건 다양화"의 서로 다른 결을 각각 대표한다.
  - `@export`로 grid·제목/대사·선택지 2개(라벨+결과 문구)를 받는다 —
    bandit_encounter.gd와 같은 "재사용 가능한 데이터 구동 스크립트"
    설계. `choice_prompt.gd`를 그대로 씀(세 번째 사용처).
  - `TestVillage.tscn`에 `HurtSoldierEvent`(격자 (2,4), 남쪽 빈 들판 —
    도적 두목 (5,2)·마을 (2~3,3)과 겹치지 않게 분산)를 기본값 그대로 추가.
  - 시각은 캡슐(primitive)로 남겼다 — 받아 둔 GLB 4종(character-a~d)은
    이미 플레이어·촌장·상인·산적으로 자리가 정해져 있어 그대로 쓰면
    "부상병이 사실 상인이었나?" 하는 혼란이 생긴다. 어울리는 조각을
    새로 받기 전까진 동굴 입구처럼 primitive 자리로 남겨 둔다
    (ASSET_GUIDE.md에는 아직 안 적음 — GLB 교체가 아니라 처음부터
    primitive로 정한 자리라 "안 바꾼 것" 절 성격과 다름).
  - 검증: `--headless --editor --quit`(임포트) 및 `--headless
    --quit-after 5` 연속 3번 exit 0·error/warn/missing/invalid/cannot
    0건. **임시 디버그로 실제 트리거→패널 생성→선택→정리까지 확인**
    (`_on_body_entered()`를 직접 호출 → 자식 노드 수로 패널이 실제로
    생겼는지 확인 → `_resolve()` 호출 → 한 프레임 뒤 노드가 `queue_free`
    로 정말 사라졌는지까지, 단순 "에러 없음"이 아니라 상태 자체 확인).
    확인 뒤 디버그 코드 원상복구(diff 0).
  - 여전히 GUI 미확인 — 부상병이 자연스러운 자리에 있는지, 트리거
    반경(16m)이 적당한지는 다음 실기 확인 때 같이 볼 것(아래 목록에 추가).

## 완료 단계 (추가, 2026-09-11⑫) — GO 사건 다양화 3·4호

- **simple_event.gd가 이미 데이터 구동이라, 새 사건 두 개는 스크립트
  코드 없이 TestVillage.tscn에 노드만 추가해서 채웠다** — 웹판 event.js의
  `stone_text`(고대 비문, 격자 (1,2))·`rare_herb`(희귀 약초, 격자 (4,4))
  대사·선택지를 그대로 가져왔다(새로 짓지 않음). 둘 다 골드/경험치
  등 아직 없는 수치 대신 결과 문구만 보여준다 — hurt_soldier와 같은 경계.
  - 검증: `--headless --editor --quit`(임포트)·`--headless --quit-after 5`
    연속 3번 exit 0·오류 0건. 임시 디버그로 두 노드의 grid·선택지 문구가
    씬 값 그대로 적용된 것까지 확인 후 원상복구(diff 0).
  - 이제 마을 사방(북 (1,2)·남 (2,4)(4,4)·서 (5,2))에 사건이 흩어져
    걷다 보면 뭔가 마주치는 느낌이 늘었다 — 실기 확인 때 밀도가
    적당한지(너무 자주/드물게 마주치는지)도 같이 볼 것.

## 완료 단계 (추가, 2026-09-11⑬) — 부대 경험치/레벨 최소 구현

- **사건 보상에 딸린 exp(웹판 event.js 필드)가 지금까지 받아 줄 자리가
  없었다** — 고대 비문 35, 부상병 20, 도적 90 같은 값이 코드에 있어도
  아무 데도 안 쌓였다. Phase 7 전체(Stats/Item/Inventory/Equipment)를
  만드는 대신, §37 재미 평가 "레벨업이 의미가 있는가?"에 답할 만큼만
  `party_state.gd`에 최소 성장을 얹었다.
  - `party_state.gd` — `exp`·`level`(정수, `EXP_PER_LEVEL`=100마다 1)
    추가, `add_exp(amount)`가 쌓고 레벨을 다시 매겨 `ATK_PER_LEVEL`(4)·
    `DEF_PER_LEVEL`(2)만큼 공격력/방어력에 더한다. `restore()`에
    `saved_exp` 인자 추가(기본값 0.0이라 기존 호출부는 안 깨짐).
  - `party_label.gd` — "부대 N명 · 전투력 X" 뒤에 "· Lv.N" 붙임.
  - `bandit_encounter.gd` — `@export foe_exp_reward`(기본 40, 웹판
    bandit_ambush 승리 exp와 같음) 추가, 승리 시 `PartyState.add_exp()`
    호출. 도적 두목은 전투력 차이(약 2배)에 맞춰 `TestVillage.tscn`에서
    90으로 덮어씀(웹판에 보스 analog가 없어 비례로 새로 정한 값).
  - `simple_event.gd` — 선택지마다 `choice_*_exp` 추가(기본값은
    hurt_soldier 기준 20/0). **StoneTextEvent·RareHerbEvent에 명시적으로
    덮어써야 했다** — 안 덮어쓰면 스크립트 기본값(20/0)을 그대로 물려받아
    "고대 비문"이 20(웹판은 35)으로, "희귀 약초"가 0 아닌 20(웹판은 원래
    exp 보상이 없다)으로 잘못 적립될 뻔했다. StoneTextEvent는
    choice_a_exp=35·choice_b_exp=0, RareHerbEvent는 둘 다 0으로 명시.
  - `save_state.gd` — `party_exp` 필드 추가(§31 quest_* 필드와 같은
    경계 — 추가만 있고 없으면 0.0으로 안전하게 채워져 마이그레이션
    불필요).
  - 검증: `--headless --editor --quit`(임포트) 및 `--headless
    --quit-after 5` 연속 3번 exit 0·오류 0건. **임시 디버그로 실제
    수치 왕복까지 확인(검증 뒤 원상복구, diff 0)** — `add_exp(35)`→
    `add_exp(90)` 후 `exp=125→atk 64·def 37(레벨 1)`을 계산대로 확인,
    `SaveState.save()` → **완전히 새 프로세스로 재실행**해 두 번째
    실행이 `exp=125`부터 이어받아 `add_exp` 호출을 더 쌓는 것까지
    확인(단순 "에러 없음"이 아니라 값 자체 비교).
  - 여전히 GUI 미확인 — 레벨이 오를 때 PartyLabel의 "Lv.N"이 실제로
    갱신되는 게 눈에 띄는지, 사건마다 뜨는 "(경험 +N)" 토스트 문구가
    자연스러운지는 다음 실기 확인 때 같이 볼 것.

## 완료 단계 (추가, 2026-09-11⑭) — GO 사건 다양화 5호(길 위의 상인) + 토스트 공용화

- **`npc_builder.gd`의 떠돌이 상인에 웹판 `road_merchant` 이식.** 새
  노드·새 스크립트 없이, 이미 있는 상인 NPC에 `offer_*` 필드만 얹어
  "처음 말 걸었을 때 한 번" 제안이 뜨게 했다(사명(`quest_id`)과는 다른
  결 — 완료 조건이 없는 그냥 우연한 한 번짜리 제안이라 `QuestState`에
  안 올리고 이 스크립트 안의 `_offer_used` 로컬 딕셔너리로만 기억한다.
  **저장/로드로는 안 이어진다** — 재실행하면 다시 제안할 수 있는 알려진
  한계, 결과가 가벼워 반복돼도 loop이 안 깨지는 성격이라 지금은 이
  정도로 충분하다고 판단했다. 필요해지면 save_state.gd에 필드를 더
  추가하면 된다).
  - "짐을 덜어 준다"(웹판 fame:8 → 우리 쪽엔 fame이 없어 exp 8로 대체,
    주석에 근거 명시) / "지나간다"(보상 없음) 두 선택지.
  - **`games/saga_go/ui/toast.gd`(신규) — 3번째 중복이라 뽑았다.**
    `bandit_encounter.gd`·`simple_event.gd`·`npc_builder.gd`가 각자
    "dialogue_label 그룹 찾기 → text 얹기 → N초 뒤 숨기기"를 따로
    두고 있던 걸 `choice_prompt.gd`와 같은 이유로 공용 헬퍼 하나로
    합쳤다. 세 파일의 호출부는 그대로(`_toast()`/`_say()` 함수 이름도
    안 바꿈), 내부 구현만 위임하도록 바꿔서 다른 코드에 영향 없음.
  - 검증: `--headless --editor --quit`(임포트)·`--headless
    --quit-after 5` 연속 3번 exit 0·오류 0건. **임시 디버그로
    `_resolve_offer()`를 직접 호출해 exp 8이 실제로 `PartyState.exp`에
    더해지는지까지 확인**(단순 "에러 없음"이 아니라 값 비교), 확인 뒤
    원상복구(diff 0).
  - 여전히 GUI 미확인 — 상인에게 처음 말 걸었을 때 제안 패널이 뜨는지,
    두 번째부터는 평소 대사로 돌아가는지는 다음 실기 확인 때 같이 볼 것.

## 다음 세션 시작 지점 (사용자 지정, 2026-09-11)

**사용자가 "새로운 세션에서 이어 하자"로 saga-godot을 다음 세션의
작업 대상으로 명시적으로 지정했다.** 코드로 할 수 있는 건 VERTICAL_SLICE
12단계 완료 조건·Phase 9 Data Versioning·Mobile Performance Pass(코드
단위)까지 전부 이 세션에서 끝냈다 — **더 진행하려면 사용자의 실기
확인·재미 평가(37장) 결과가 먼저 필요하다.** 그러니 다음 세션은:

1. 먼저 사용자에게 **아래 "실기 확인" 목록을 이미 확인했는지** 물어본다.
2. 확인 결과가 있으면(버그 발견·재미 평가 등) 그에 맞춰 고치거나 다음
   콘텐츠 확장 여부를 결정한다(PLAN.md 100단계).
3. 아직 확인 전이면, **사용자 답 없이 앞서서 새 콘텐츠(Quest·World
   Event 등 VERTICAL_SLICE 범위 밖)를 만들지 않는다** — 루트 CLAUDE.md
   "실기 확인은 몰아서" 방침대로 재촉 없이 기다리는 게 맞다. 이 경우
   할 수 있는 일은 아래 실기 확인 목록이 빠짐없이 정확한지 다시 훑는
   정도.

## 다음에 이어질 것

**VERTICAL_SLICE.md 12단계 완료 조건 — 전부 코드로는 채워졌고, Phase 9
Data Versioning·Mobile Performance Pass(코드 단위)도 채웠다.** 남은 건
재미 평가(37장)와 아래 실기 확인, 그리고 Mobile Performance Pass의
실측 부분(실기기에서 실제 프레임률 등)·전체 플레이 테스트(둘 다 실기기가
있어야 의미가 있어 아래 목록과 겹친다).

**실기 확인은 몰아서 할 것(사용자 확정, 루트 CLAUDE.md 방침)** — 지금까지
쌓인 목록:
- 모바일 프로파일(GLB 자산들이 저사양 기기에서 어떻게 보이는지)
- 마을집 벽 격자 조립이 실제 화면에서 진짜 벽처럼 보이는지(안쪽이 비어
  있어도 밖에서 보면 꽉 찬 벽과 구별 안 될 거라 예상했지만 GUI로 아직
  확인 안 함)
- **폐허 기둥(`pillar-stone.glb`)도 실기기(휴대폰 등 실제 하드웨어)에서
  같이 볼 것(사용자 지정, 2026-09-11).** 2026-09-11③에서 데스크톱
  에디터 GUI 스크린샷으로 한 번 확인은 됐지만(산적 옆에서 같이 찍힘),
  그건 이 PC의 데스크톱 화면이지 실기기가 아니다 — 위 항목들과 같이
  몰아서 볼 때 포함한다.
- 도적을 실제로 이겨서 `PartyLabel`("부대 N명 · 전투력 X")이 화면에서
  진짜로 올라가는지(2026-09-11⑥, 헤드리스로는 전투 승리를 재현 못 해
  코드 리뷰로만 확인함).
- **`groups=[...]` 문법을 고친 뒤 가상 조이스틱 입력과 NPC/산적 대화
  토스트가 실제로 화면에 뜨는지(2026-09-11⑦)** — 지금까지 한 번도
  작동한 적이 없었을 수 있는 자리라 우선순위 높게 볼 것.
- `SaveButton`을 눌러 저장하고 게임을 다시 실행했을 때 GUI에서 정말
  이어지는지(파일 IO 자체는 헤드리스로 왕복 검증 완료, 화면으로 직접
  보는 것만 남음).
- 텍스처 6장을 VRAM Compressed로 바꾼 뒤(2026-09-11⑨) 실기기 화면에서
  색이 이상해지거나(압축 아티팩트) 밉맵 때문에 멀리서 흐릿해 보이는 등
  눈에 띄는 부작용이 없는지.
- **(2026-09-11⑩ 신규) 마을 촌장에게 말 걸었을 때 "마을의 부탁" 제안
  패널이 자연스럽게 뜨는지, 맡은 뒤 QuestLabel("📋 사명: …")이 PartyLabel과
  안 겹치는지.** 도적 두목(격자 (5,2))이 화면에서 일반 산적보다 실제로
  더 커 보이는지(1.4배 vs 1.25배)·더 세게 느껴지는지(체력 9배), 물리쳤을
  때 QuestLabel이 "📋 사명 완료: …"로 바뀌는지.
- **(2026-09-11⑪ 신규) 남쪽 들판(격자 (2,4))의 부상병 캡슐이 자연스러운
  자리에 있는지, 16m 트리거 반경이 너무 넓거나 좁지 않은지, 선택지를
  고르면 결과 문구가 뜨고 사건이 사라지는지.**
- **(2026-09-11⑫ 신규) 고대 비문(1,2)·희귀 약초(4,4)도 같은 방식으로
  잘 뜨는지, 사건 네 개(부상병·비문·약초·도적 두목)가 마을을 돌아다닐
  때 밀도가 적당한지(너무 자주/드물게 마주치는지).**
- **(2026-09-11⑬ 신규) 사건을 겪어 경험치가 쌓이고 레벨이 올랐을 때
  PartyLabel의 "Lv.N"이 화면에서 실제로 바뀌는지, "(경험 +N)" 토스트
  문구가 눈에 거슬리지 않는지.**
- **(2026-09-11⑭ 신규) 떠돌이 상인에게 처음 말 걸었을 때 "길 위의 상인"
  제안 패널이 뜨는지, 이후엔 평소 대사로 돌아가는지.**

## 알려진 오류

- 없음. Main.tscn 추가로 이전에 있던 "no main scene defined" 오류는 해소됐다.

## 테스트 상태

- `godot --headless --path saga-godot --import` → 프로젝트 첫 스캔/임포트 성공 (exit 0)
- `godot --headless --path saga-godot --quit` → Main.tscn 실행 성공 (exit 0, 오류 로그 없음)
- **2026-09-11**: Forward+ 렌더러 전환 이후 재검증 — 위 항목 참고, exit 0·오류 0건
- 실제 GUI 렌더링(그래픽 화면 확인)은 headless라 검증 안 됨 — 필요하면 에디터를 직접 띄워야 함
- **2026-09-11 — Forward+ 전환 후 재검증, 그리고 winget 경로 기록이 PC마다 다르다는 것 확인.**
  `project.godot`의 `renderer/rendering_method`를 `forward_plus`(+ `.mobile`/`.web`
  feature tag)로 바꾼 뒤, 이 세션이 도는 PC에는 위 "완료 단계"에 적힌 winget 설치
  경로가 **없었다**(다른 PC에서 남긴 기록으로 추정). Godot 4.7.2 stable(non-Mono)
  win64 콘솔 빌드를 GitHub 릴리스에서 스크래치패드로 새로 받아 확인 —
  `--headless --editor --quit`(임포트) · `--headless --quit-after 3 --verbose`
  (TestVillage.tscn 실행) 둘 다 exit 0, error/warning/missing 계열 로그 0건.
  Forward+ 설정 문자열 자체는 프로젝트를 안 깨뜨리는 것까지 확인됐다 — 단
  headless는 더미 렌더러라 **실제 화면에 Forward+가 뭘 그리는지는 여전히
  미검증**(GUI로 직접 열어야 함). 설치 절차는 `saga-godot/CLAUDE.md`에
  PC마다 다시 확인/재설치하는 방법으로 정리해 둠 — 다음 세션은 이 표의
  winget 경로를 그대로 믿지 말 것.
- **2026-09-11 — GUI 실제 화면 확인, 사용자 명시적 요청으로 1회.** windowed
  빌드로 `TestVillage.tscn`을 14초간 실제로 띄우고 스크린샷을 찍어 확인.
  - **"renderer: forward_plus" 디버그 라벨이 화면 우상단에 정확히 뜬다** —
    `environment_profile.gd`가 데스크톱 실행에서 `OS.has_feature("mobile")`을
    거짓으로 판단해 PC 프로파일(`env_pc.tres`)을 골랐다는 것까지 확인
  - DirectionalLight3D 그림자가 플레이어 캡슐 아래 실제로 드리워짐(그림자
    렌더링 정상 동작)
  - 크래시·오류 다이얼로그 없이 한 프레임 정상 렌더
  - 씬 전체가 밋밋하고 뿌옇게 보이는데 이건 버그가 아니다 — 지형·건물·나무가
    전부 아직 primitive(단색 도형)뿐이라 SDFGI/SSR이 켜져 있어도 반사할
    표면·복잡한 지오메트리가 없어 GI 효과가 육안으로 구별되지 않는 단계다.
    GLB 실에셋으로 교체된 뒤 다시 확인해야 진짜 판단 가능
  - **정정(2026-09-11, 같은 날 뒤에 확인) — 위 "격리된 파일시스템" 결론은
    틀렸다.** 그때는 Bash로 받은 exe가 PowerShell의 `Get-ChildItem`에 한
    번 안 잡혀서 "Bash와 PowerShell이 다른 파일시스템 뷰를 쓴다"고
    적었는데, 몇 턴 뒤 같은 경로를 다시 봤더니 Bash·PowerShell 양쪽에서
    exe·zip·스크린샷 PNG(PowerShell이 만든 것)까지 전부 정상으로 보였다.
    **일회성 현상이었고 원인은 끝내 특정 못 했다**(Windows Defender
    격리 로그도 없었다 — `Get-MpThreatDetection`·이벤트 로그 1116/1117
    둘 다 빈 결과). 실제 프로젝트 폴더(`C:\swbins`)는 이 세션 내내 두
    툴에서 한 번도 어긋난 적 없다 — git 작업·이번 GLB 에셋 파일 복사
    전부 Bash로 써도 PowerShell에서 바로 보였다. `saga-godot/CLAUDE.md`의
    관련 안내도 "확정된 격리" 대신 "가끔 exe가 안 보일 수 있으니 그때
    PowerShell로 다시 받으면 된다"는 정도로 낮춰 정정함
