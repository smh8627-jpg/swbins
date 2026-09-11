# saga-godot

작업 전에 이 폴더의 **`PLAN.md`** 를 읽는다 — 5개 게임을 Godot 4.x 3D로 재구축하는 최종 작업지시서, 정본이다.

이 폴더가 그 재구축 대상이다. `saga-go`·`saga-dungeon`·`saga-forest`·`saga-story`·`saga-realm`
(기존 웹/JS 판)은 그대로 두고 건드리지 않는다 — 여기는 완전히 새 프로젝트다.

현재 상태는 `docs/PROJECT_STATE.md`, 구조는 `docs/ARCHITECTURE.md`.

**Godot 에디터 설치 여부는 PC마다 다르다** — 이 저장소는 여러 PC에서 돈다(루트
CLAUDE.md 참고). `docs/PROJECT_STATE.md`에 "winget 설치 완료"라고 적혀 있어도
그건 그 기록을 남긴 PC 얘기고, 지금 이 세션이 도는 PC에는 없을 수 있다.
새 세션은 먼저 확인부터 한다:

```
which godot godot4 2>&1
# 또는 winget 설치 경로를 직접 찾아본다:
find "$LOCALAPPDATA/Microsoft/WinGet/Packages" -iname "*godot*.exe" 2>/dev/null
```

**없으면 매번 새로 받는다 — winget 결과에 기대지 않는다.** winget install이
"됐다"고 보고해도 PATH alias가 실제로 잡히는지는 별개고(과거 세션에서 미확인
상태로 남았었다), 그 설치가 다음 세션·다른 PC까지 이어진다는 보장도 없다.
아래는 2026-09-11에 실제로 성공한 방법이다 — GitHub 릴리스에서 표준판
(non-Mono, 이 프로젝트는 C# 안 씀) 64비트 콘솔 빌드를 받아 스크래치패드에
풀기만 하면 된다(설치 불필요, 관리자 권한 불필요):

```bash
# 버전은 project.godot의 config/features 태그("4.7")와 맞춘다.
# 최신 4.7.x stable 태그명은 https://github.com/godotengine/godot/releases 에서 확인
curl -sSL -o Godot.zip \
  "https://github.com/godotengine/godot/releases/download/<TAG>-stable/Godot_v<TAG>-stable_win64.exe.zip"
unzip -o -q Godot.zip
# 압축 풀면 두 exe가 나온다 — 헤드리스 검증에는 _console 쪽을 쓴다(stdout이 이 셸에 그대로 잡힘)
```

받은 실행 파일은 **저장소에 커밋하지 않는다**(바이너리, `.gitignore` 대상 아니어도
add하지 말 것). 검증이 끝나면 그 파일이 남아 있어도 무해하지만, 다음 세션이
같은 경로를 또 확인 없이 믿지 않도록 이 안내를 남겨 둔다.

`project.godot`·씬 파일은 텍스트로만 고친 뒤에는, 위 방법으로 받은 에디터로
**헤드리스 로드까지** 검증하기 전까지 설정값을 확정으로 보지 않는다:

```bash
GODOT=<받은 폴더>/Godot_v<TAG>-stable_win64_console.exe
"$GODOT" --headless --editor --path <프로젝트 경로> --quit   # 최초 1회: 임포트, 문법 오류 확인
"$GODOT" --headless --path <프로젝트 경로> --quit-after 3 --verbose \
  > log.txt 2>&1; grep -iE "error|warn|missing|invalid|cannot" log.txt
```

**주의 — 이걸로 확인되는 것과 안 되는 것.** `--headless`는 디스플레이 서버 없이
더미 렌더러로 돈다. 즉 project.godot 파싱·씬/스크립트 참조가 안 깨졌는지는
확인되지만, Forward+ 같은 렌더러 설정이 **실제 화면에 무엇을 그리는지는 확인
안 된다.** 시각 확인(이동감·타격감·그래픽)은 여전히 GUI로 에디터를 직접 열어야
하고, 루트 CLAUDE.md의 실기 확인 방침대로 **몰아서** 한다 — 텍스트 고칠 때마다
GUI를 띄우지 않는다.

에디터 창을 띄웠다면 그 turn 안에서 `taskkill //F //IM Godot_v*.exe`로 반드시
정리한다(다른 세션의 프로세스까지 잡지 않도록 `//IM godot.exe`처럼 뭉뚱그리지
말고 정확한 실행 파일명을 쓴다).
