// 좀비 청소기 설치 — PC마다 한 번: node tools/claude-home/install.js
// ① reap-orphans.ps1·reap-orphans.js·reap-launch.wsf 를 ~/.claude 로 복사(다시 돌리면 새 판으로 덮어씀)
// ② ~/.claude/settings.json 에 SessionStart·Stop 훅을 건다(이미 있으면 그대로, 멱등)
// 되돌리기: node tools/claude-home/install.js --uninstall (훅만 빼고 파일은 둔다)
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const home = path.join(os.homedir(), '.claude');
const settingsPath = path.join(home, 'settings.json');
const uninstall = process.argv.includes('--uninstall');
const MARK = 'reap-orphans.js';
const command = `node "${path.join(home, MARK).replace(/\\/g, '/')}"`;

if (process.platform !== 'win32') { console.log('Windows 전용 — 건너뜀'); process.exit(0); }
fs.mkdirSync(home, { recursive: true });

if (!uninstall) {
  for (const f of ['reap-orphans.ps1', 'reap-orphans.js', 'reap-launch.wsf']) {
    fs.copyFileSync(path.join(__dirname, f), path.join(home, f));
    console.log('복사', path.join(home, f));
  }
}

let raw = '{}';
if (fs.existsSync(settingsPath)) raw = fs.readFileSync(settingsPath, 'utf8').replace(/^﻿/, '');
const s = JSON.parse(raw || '{}');
s.hooks = s.hooks || {};

const ours = (e) => (e.hooks || []).some((h) => String(h.command || '').includes(MARK));
let changed = false;
for (const ev of ['SessionStart', 'Stop']) {
  const list = s.hooks[ev] || [];
  const kept = list.filter((e) => !ours(e));
  if (uninstall) {
    if (kept.length !== list.length) changed = true;
    if (kept.length) s.hooks[ev] = kept; else delete s.hooks[ev];
  } else if (kept.length === list.length) {
    list.push({ hooks: [{ type: 'command', command, timeout: 10 }] });
    s.hooks[ev] = list;
    changed = true;
  }
}
if (!Object.keys(s.hooks).length) delete s.hooks;

if (changed) {
  if (fs.existsSync(settingsPath)) fs.copyFileSync(settingsPath, settingsPath + '.bak-reap');
  fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2) + '\n');
  console.log(uninstall ? '훅 제거' : '훅 등록', settingsPath, '(이전 판: settings.json.bak-reap)');
} else {
  console.log(uninstall ? '걸린 훅 없음' : '훅 이미 등록됨', settingsPath);
}
