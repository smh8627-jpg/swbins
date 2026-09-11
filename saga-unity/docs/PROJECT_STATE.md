# PROJECT_STATE

PLAN.md 규칙(33장 토큰 절약 규칙 10)에 따라 여기에는 완료 단계 / 현재 작업 /
다음 작업 / 알려진 오류 / 테스트 상태만 짧게 적는다. 긴 설명은 남기지 않는다.

## 완료 단계

- `PLAN.md`·`CLAUDE.md` 작성 완료 — `saga-godot/PLAN.md`를 기반으로
  Unity(C#, URP, ScriptableObject 등)에 맞게 다시 씀. 레거시 감사는
  새로 안 하고 `saga-godot/docs/LEGACY_FEATURE_AUDIT.md`를 참고하기로
  결정(PLAN.md 4장).
- **Phase 1(01~09단계) 완료.** Unity 6000.3.23f1 배치 모드
  (`-batchmode -nographics -createProject … -cloneFromTemplate
  com.unity.template.3d-cross-platform-17.0.14.tgz -quit`)로 프로젝트
  생성 — Unity Hub GUI를 안 쓰고 커맨드라인으로 만듦.
  - `productName` → "SAGA"(`ProjectSettings/ProjectSettings.asset`,
    saga-godot의 `config/name`과 통일)
  - 03·04(모바일 해상도·Portrait/Landscape)는 **템플릿 기본값이 이미
    충족** — `defaultScreenOrientation: 4`(AutoRotation) +
    `allowedAutorotateTo*` 넷 다 1. 따로 손 안 댐
  - `Assets/SagaCore/SagaCore.asmdef`·`Assets/Games/SagaGo/SagaGo.asmdef`
    생성(SagaGo → SagaCore 참조). `Assets/Data/`·`Assets/Art/`의 세부
    폴더는 아직 안 만듦 — 실제 데이터/에셋이 생길 때 그때 만든다(33장
    "사용하지 않는 구조 미리 만들지 않기")
  - `.gitignore` 작성(Library/Temp/Obj/Build/Logs/UserSettings/*.csproj/
    *.sln/*.slnx 등 — Unity 표준 목록)
  - **66-1장(렌더러 이중 프로파일) 사실상 이미 충족** — 템플릿이
    `PC_RPAsset`(ForwardPlus)·`Mobile_RPAsset`(Forward)과 그걸 연결한
    Quality 레벨(`PC`/`Mobile`, Mobile은 `excludedTargetPlatforms:
    [Standalone]`로 PC 빌드에서 자동 제외)을 이미 갖고 있었다 —
    직접 만들 필요 없이 확인만 하고 PLAN.md를 실제 값에 맞게 고침
  - 검증: `-batchmode -nographics -projectPath … -quit` 헤드리스 실행
    **exit 0**. 로그에 남은 경고는 "SagaCore.asmdef에 스크립트가
    아직 없다"(스크립트를 하나도 안 넣었으니 당연함)와 Unity Cloud
    라이선싱 access token 경고(로컬 에디터 동작과 무관, 무시) 둘뿐,
    실제 컴파일 오류 없음

## 현재 작업

- 없음 — Phase 1 끝, 다음 Phase 착수 전.

## 다음 작업

- Phase 2(11~13단계): `docs/VERTICAL_SLICE.md` 작성 — 범위는 PLAN.md
  3장에서 saga-godot과 같게(사가고 "도적의 습격") 잠정 확정해 뒀다.
  착수 전 사용자에게 이 범위가 맞는지 다시 확인할 것(다른 범위를 원할
  수 있다).
- 그 다음 Phase 3(21~35단계): 3D World Foundation — saga-godot의 7×7
  테스트 지도(`test_map.gd`)를 그대로 가져와 Unity 씬으로 세운다.
  **34단계 주의**: saga-godot이 2026-09-11에 "칸 경계가 바둑판처럼
  갈라져 보이는" 문제를 겪었다(정점 색 블렌딩으로 해결, `saga-godot/
  games/saga_go/world/terrain_builder.gd` 참고) — Unity에서 땅을
  타일마다 별도 메시로 채우면 같은 함정을 밟을 수 있다, 처음부터
  이어붙인 단일 메시나 Unity Terrain 텍스처 블렌딩을 검토할 것.

## 알려진 오류

- 없음.

## 테스트 상태

- `Unity.exe -batchmode -nographics -createProject … -cloneFromTemplate
  <3d-cross-platform 템플릿> -quit` → 프로젝트 생성 성공 (exit 0)
- `Unity.exe -batchmode -nographics -projectPath saga-unity -quit` →
  asmdef 포함 재임포트·컴파일 성공 (exit 0, 컴파일 오류 없음)
- 실제 GUI 에디터로 연 화면(씬 뷰, 아직 빈 프로젝트라 볼 것도 없음)은
  확인 안 함 — Phase 3에서 실제 지역이 생긴 뒤에나 의미가 있다
