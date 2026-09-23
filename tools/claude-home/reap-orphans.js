// Claude Code 훅 시동기 — reap-orphans.ps1 을 창 없이 뒤에서 띄우고 바로 끝난다.
// SessionStart 는 매번, Stop(턴 끝)은 10분에 한 번까지. 턴은 기다리지 않는다.
// install.js 가 ~/.claude 로 복사하고 settings.json 에 훅을 건다.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

setTimeout(() => process.exit(0), 3000).unref();

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
  try {
    spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-WindowStyle', 'Hidden', '-File', path.join(__dirname, 'reap-orphans.ps1')],
      { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  } catch (e) {}
  process.exit(0);
}
