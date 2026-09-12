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

**주의 — `--headless --editor --quit`(임포트)는 `project.godot`·`*.import`를
조용히 고쳐 쓸 수 있다(2026-09-12 발견).** 에디터를 한 번이라도 열면
엔진 기본값과 같다고 판단한 명시적 설정(예: 이미 기본값인
`renderer/rendering_method="forward_plus"`, `directional_shadow/size=4096`)을
"불필요한 중복"으로 보고 저장할 때 지워 버린다 — 66-1장이 공들여 넣어 둔
렌더러 프로파일 줄이 실제로 이렇게 사라진 적이 있다(반영한 적 없는 diff로
발견, `git checkout`으로 되돌림). **헤드리스 검증을 돌린 뒤에는 커밋 전에
반드시 `git status`/`git diff -- project.godot '*.import'`로 의도하지 않은
변경이 없는지 훑는다** — 있으면 이번 작업과 무관한 에디터 부작용이니
`git checkout`으로 되돌리고, 실제로 고치려던 파일만 add한다.

**주의 — 이걸로 확인되는 것과 안 되는 것.** `--headless`는 디스플레이 서버 없이
더미 렌더러로 돈다. 즉 project.godot 파싱·씬/스크립트 참조가 안 깨졌는지는
확인되지만, Forward+ 같은 렌더러 설정이 **실제 화면에 무엇을 그리는지는 확인
안 된다.** 시각 확인(이동감·타격감·그래픽)은 여전히 GUI로 에디터를 직접 열어야
하고, 루트 CLAUDE.md의 실기 확인 방침대로 **몰아서** 한다 — 텍스트 고칠 때마다
GUI를 띄우지 않는다.

에디터 창을 띄웠다면 그 turn 안에서 `taskkill //F //IM Godot_v*.exe`로 반드시
정리한다(다른 세션의 프로세스까지 잡지 않도록 `//IM godot.exe`처럼 뭉뚱그리지
말고 정확한 실행 파일명을 쓴다).

## 실제 화면(GUI) 확인이 필요할 때 — 가끔 exe가 PowerShell 쪽에 안 잡힐 수 있다

**2026-09-11 발견, 같은 날 정정됨.** 한 번은 Bash 툴(`curl`+`unzip`)로 받은
실행 파일이 Bash 안에서는 `ls`로 잘 보이고 헤드리스 실행도 되는데
PowerShell의 `Get-ChildItem`에는 안 잡히는 일이 있었다. 처음엔 "Bash 툴이
파일시스템을 격리된 뷰로 쓴다"고 단정해 적었는데, **몇 턴 뒤 같은 경로를
다시 보니 Bash·PowerShell 양쪽에서 다 정상으로 보였다** — 확정된 격리가
아니라 원인 불명의 일회성 현상이었다(Windows Defender 격리 로그도 없었다).
`docs/PROJECT_STATE.md` 2026-09-11 항목에 정정 기록 있음. 프로젝트 폴더
`C:\swbins` 자체는 이 세션 내내 두 툴에서 한 번도 어긋난 적 없다 — git
작업이든 에셋 파일 복사든 안전하다. **실무적으로는**: PowerShell에서
찾는 실행 파일이 방금 Bash로 받은 것인데 안 보이면, 격리를 의심하기 전에
먼저 아래처럼 PowerShell로 그 자리에서 다시 받아 보는 쪽이 빠르다.

**그래서 실제 창을 띄워 스크린샷으로 눈으로 확인하려면 다운로드·압축 풀기부터
PowerShell로 다시 해야 한다:**

```powershell
$zip = "$env:TEMP\godot_editor\Godot.zip"   # 이미 있으면 재사용, 없으면 Invoke-WebRequest로 받기
Expand-Archive -Path $zip -DestinationPath "$env:TEMP\godot_editor" -Force
```

그 뒤 windowed 빌드(`_console` 아닌 쪽)를 헤드리스 없이 실행하고, 몇 초 기다렸다가
`System.Drawing`으로 화면을 캡처해 PNG로 저장한 뒤 Read 툴로 본다:

```powershell
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$proc = Start-Process -FilePath "$env:TEMP\godot_editor\Godot_v<TAG>-stable_win64.exe" `
  -ArgumentList @("--path", "C:\swbins\saga-godot") -PassThru
Start-Sleep -Seconds 14
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bmp.Save("$env:TEMP\godot_editor\screenshot.png", [System.Drawing.Imaging.ImageFormat]::Png)
Stop-Process -Id $proc.Id -Force   # PID로 정확히 지정 — 이름으로 뭉뚱그리지 않는다
```

이 방식은 실제로 사용자 화면을 잠깐 띄우는 것이다(가짜 렌더러가 아니라
진짜 GPU 렌더링). **매번 습관적으로 쓰지 않는다** — 루트 CLAUDE.md의
"2026-09-09 정정"(헤드리스/CDP 크롬을 개발 중 습관적으로 켜지 말 것)과
같은 이유다. 사용자가 시각 확인을 명시적으로 요청했을 때만 쓰고, 확인이
끝나면 `Stop-Process`로 바로 정리한다(위 스크립트처럼 PID 기준으로).
