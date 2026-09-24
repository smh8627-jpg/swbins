// Claude Code 훅 시동기 — reap-orphans.ps1 을 창 없이 뒤에서 띄우고 바로 끝난다.
// SessionStart 는 매번, Stop(턴 끝)은 10분에 한 번까지. 청소는 기다리지 않고 띄우기만(보통 1~2초).
// install.js 가 ~/.claude 로 복사하고 settings.json 에 훅을 건다.
//
// detached spawn 으로 띄우면 안 된다: Claude Code 는 훅이 끝날 때 그 밑 프로세스를 통째로 거둬서
// powershell 이 첫 줄도 못 돌고 죽는다(2026-09-24 확인 — 그래서 로그가 한 번도 안 생겼다).
// WMI Win32_Process.Create 로 만들면 WmiPrvSE 밑에서 태어나 훅과 함께 죽지 않는다.
// 부르는 쪽은 cscript(reap-launch.wsf) — powershell 은 뜨는 데만 수 초라 없을 때만 쓴다.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

setTimeout(() => process.exit(0), 9000).unref();

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', go);
process.stdin.on('error', go);

let done = false;
function go() {
  if (done) return; done = true;
  if (process.platform !== 'win32') process.exit(0);
  let ev = {};
  try { ev = JSON.parse(raw || '{}'); } catch (e) {}
  const stamp = path.join(__dirname, 'reap-orphans.stamp');
  if (ev.hook_event_name !== 'SessionStart') {
    try {
      if (Date.now() - fs.statSync(stamp).mtimeMs < 10 * 60 * 1000) process.exit(0);
    } catch (e) {}
  }
  try { fs.writeFileSync(stamp, String(Date.now())); } catch (e) {}
  const ps1 = path.join(__dirname, 'reap-orphans.ps1');
  const inner = `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "${ps1}"`;
  const opts = { stdio: 'ignore', windowsHide: true };
  let r = { status: -1 };
  try {
    r = spawnSync('cscript.exe', ['//nologo', '//B', path.join(__dirname, 'reap-launch.wsf'), ps1],
      Object.assign({ timeout: 6000 }, opts));
  } catch (e) {}
  if (r.status !== 0 && !(r.error && r.error.code === 'ETIMEDOUT')) {
    const script = `$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = '${inner.replace(/'/g, "''")}' }; exit [int]$r.ReturnValue`;
    try {
      spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand',
        Buffer.from(script, 'utf16le').toString('base64')], Object.assign({ timeout: 2500 }, opts));
    } catch (e) {}
  }
  process.exit(0);
}
