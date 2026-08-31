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

## 알려진 한계 (추가)

- Ground 충돌체가 완전 평면이다 — 산(+2.5)·강(-1.0) 같은 시각적 높낮이와
  안 맞는다. 지금 걸을 수 있는 영역(마을·길·들, 높이 0~0.2)엔 문제가 안 되지만,
  산기슭까지 걸어가면 시각과 충돌이 어긋나 보일 것이다. 다음에 지형별
  충돌 셰이프로 교체할 것(터레인 전체를 HeightMapShape3D로 가는 게 정공법)

## 다음 작업

- **결정됨(2026-08-31)**: saga-godot은 인물 데이터를 공유한다(다섯 웹판은
  기존 다섯 벌 복사 구조 그대로 유지, 무관). `saga_core/data/characters/`에
  인물 70+REALM 무장 54를 id 불변으로 통합. LEGACY_FEATURE_AUDIT.md 6장 참고
- **실기 확인 필요**(다음 세션 에디터로 직접) — headless는 null 렌더러라
  이동감·카메라 회전/줌·조이스틱 조작감을 눈으로/손으로 아직 못 봤다.
  VERTICAL_SLICE.md 27~28절이 요구하는 "이동감 자체가 재미있는가"는
  실기 없이는 판단 불가
- Phase 4 나머지(41 GLB import 구조, 45·46 primitive→GLB 교체)는 실제
  3D 에셋을 고른 뒤로 미룸
- Phase 6 — Combat: VERTICAL_SLICE.md 29·34·35절의 "도적의 습격" 사건 +
  duel.js 재구현(속공·필살·회피, 강타 예고 AI)

## 알려진 오류

- 없음. Main.tscn 추가로 이전에 있던 "no main scene defined" 오류는 해소됐다.

## 테스트 상태

- `godot --headless --path saga-godot --import` → 프로젝트 첫 스캔/임포트 성공 (exit 0)
- `godot --headless --path saga-godot --quit` → Main.tscn 실행 성공 (exit 0, 오류 로그 없음)
- 실제 GUI 렌더링(그래픽 화면 확인)은 headless라 검증 안 됨 — 필요하면 에디터를 직접 띄워야 함
