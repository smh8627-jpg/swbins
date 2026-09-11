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

## 다음에 이어질 것

남은 조각은 `docs/ASSET_GUIDE.md` "이번에 안 바꾼 것" 절 참고 —
**마을집 실제 모듈 타일링**(`wall-block.glb` 여러 장을 격자로 이어
붙이는 것, 지금은 비균등 스케일로 하나를 늘려 대체 중, "마을집이
primitive보다 늘어난 이유" 절 참고)과 **모바일 프로파일 실기 확인**
(GLB 자산들이 저사양 기기에서 어떻게 보이는지)이 남아 있다.

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
