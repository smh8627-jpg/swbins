# saga-unity

작업 전에 이 폴더의 **`PLAN.md`** 를 읽는다 — 5개 게임을 Unity 6 3D로 재구축하는
최종 작업지시서, 정본이다.

**이 폴더는 `saga-godot/`과 나란히 가는 두 번째 엔진 트랙이다** (2026-09-11
신설 — 사용자가 "유니티로 전환을 추가한다, 다른 곳은 Godot 작업 중이니"로
명시적으로 요청). `saga-godot/PLAN.md` 66-1장의 "Godot 유지, Unity·Unreal로
안 갈아탄다"는 결정을 뒤집는 게 아니다 — `saga-godot/`은 계속 그대로 간다.
이 폴더는 **병행 실험**이지 대체가 아니다. 자세한 관계는 이 폴더 `PLAN.md`
0장 참고.

`saga-go`·`saga-dungeon`·`saga-forest`·`saga-story`·`saga-realm`(기존
웹/JS 판)과 `saga-godot/`은 그대로 두고 건드리지 않는다 — 완전히 별개
프로젝트다.

현재 상태는 `docs/PROJECT_STATE.md`.
**사람이 직접 손으로 조작해 확인하는 법**(에디터 준비·씬별 실행·조작키
표·세이브 파일 위치)은 `docs/HOW_TO_PLAYTEST.md` — 사용자가 실기 테스트
방법을 물으면 이 파일을 가리키거나 최신 조작(새 키 배선 등)을 반영해
갱신한다(saga-godot의 같은 이름 문서와 짝, 서로 별개 프로젝트라 내용은
안 섞는다).

**레거시 기획 감사는 새로 하지 않는다** — `saga-godot/docs/
LEGACY_FEATURE_AUDIT.md`를 그대로 참고한다(PLAN.md 4장).

Unity는 이 PC에 **Unity 6000.3.23f1**(Unity Hub 경유)이 이미 설치돼 있다
(`C:\Program Files\Unity\Hub\Editor\6000.3.23f1`). 다른 PC에서 이 세션이
돌면 설치 여부가 다를 수 있다 — `saga-godot/CLAUDE.md`의 "PC마다 다르다"
원칙과 같다. 새 세션은 먼저 확인부터 한다:

```
find "/c/Program Files/Unity/Hub/Editor" -maxdepth 1 2>/dev/null
```

Unity 프로젝트(`Assets/`·`ProjectSettings/`·`Packages/`)는 Phase 1에서
아직 생성 전이다 — PLAN.md 35장 01~10단계 참고.

**`.gitignore` 필수**: Unity가 만드는 `Library/`·`Temp/`·`Obj/`·`Build/`·
`Logs/`·`UserSettings/`·`*.csproj`·`*.sln`은 절대 커밋하지 않는다(용량이
크고 로컬 캐시/재생성 가능한 것들이다). Unity 프로젝트를 처음 만들 때
바로 `.gitignore`부터 채운다(PLAN.md Phase 1, 08단계).

에디터를 실제로 띄워 화면을 확인하는 습관은 `saga-godot/CLAUDE.md`가
2026-09-09·2026-09-11에 정리해 둔 것과 같은 원칙을 따른다 — **개발
중에는 습관적으로 GUI를 띄워 스크린샷을 찍지 않는다.** 헤드리스 빌드/
배치 모드(`Unity.exe -batchmode -nographics -quit -projectPath <경로>
-logFile <경로>`)로 컴파일 오류·씬 로드만 확인하고, 실제 화면 확인은
기능을 다 완성한 뒤 사용자가 직접 하거나 명시적으로 요청할 때만 한다.
GUI 에디터를 띄웠다면 그 turn 안에서 반드시 `taskkill //F //IM
Unity.exe`로 정리한다(다른 세션의 Godot 프로세스까지 잡지 않도록 정확한
이름만).

**같은 저장소, 여러 세션 동시 작업** — 루트 `CLAUDE.md`의 git 규칙을
그대로 따른다: `git add` 해 두고 뜸 들이지 않는다, `git commit -F
<메시지파일> -- <손댄 경로>`로 곧바로. `saga-godot/`을 만지는 다른
세션과 파일이 겹칠 일은 구조상 없다(폴더가 다르다) — 겹칠 수 있는 건
루트 `SAGA-HANDOFF.md`·루트 `CLAUDE.md` 정도이니 그 둘을 고칠 때만
특히 조심한다.
