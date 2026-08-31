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
- 다음 세션이 이어갈 순서: **Phase 6(Combat)** — VERTICAL_SLICE.md 29·
  34·35절의 "도적의 습격" 사건 + duel.js 재구현(속공·필살·회피, 강타
  예고 AI). 그 다음이 완료 조건(VERTICAL_SLICE.md 하단 12단계 루프) 검증
- **결정됨(2026-08-31)**: saga-godot은 인물 데이터를 공유한다(다섯 웹판은
  기존 다섯 벌 복사 구조 그대로 유지, 무관). `saga_core/data/characters/`에
  인물 70+REALM 무장 54를 id 불변으로 통합. LEGACY_FEATURE_AUDIT.md 6장 참고
- Phase 4 나머지(41 GLB import 구조, 45·46 primitive→GLB 교체)는 실제
  3D 에셋을 고른 뒤로 미룸

## 알려진 오류

- 없음. Main.tscn 추가로 이전에 있던 "no main scene defined" 오류는 해소됐다.

## 테스트 상태

- `godot --headless --path saga-godot --import` → 프로젝트 첫 스캔/임포트 성공 (exit 0)
- `godot --headless --path saga-godot --quit` → Main.tscn 실행 성공 (exit 0, 오류 로그 없음)
- 실제 GUI 렌더링(그래픽 화면 확인)은 headless라 검증 안 됨 — 필요하면 에디터를 직접 띄워야 함
