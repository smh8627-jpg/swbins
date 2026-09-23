#!/usr/bin/env node
// js 구문 검사를 node 한 번으로 — precheck.sh 가 부른다.
// 파일마다 `node --check` 를 새로 띄우면 윈도우에서 파일당 ~0.9초라 웹 다섯 판(≈350개)에 5분이 걸렸다.
// 여기서는 vm.Script 로 한꺼번에 파싱하고, 걸린 파일만 `node --check` 로 다시 돌려 판정을 그것에 맡긴다
// (ESM·셔뱅 등 vm.Script 와 --check 가 달리 보는 경우에도 결과는 예전 precheck 와 같다).
// 사용: node tools/hooks/syntax-check.js <폴더>...   (vendor/ 는 뺀다)  실패 시 종료 코드 1
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

function walk(dir, out) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'vendor' && e.name !== 'node_modules') walk(p, out); }
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const files = process.argv.slice(2).flatMap((d) => walk(d, []));
let fail = 0;
for (const f of files) {
  let src = fs.readFileSync(f, 'utf8');
  if (src.startsWith('#!')) src = '//' + src.slice(2);
  try {
    new vm.Script(src, { filename: f });
  } catch (e) {
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    if (r.status !== 0) {
      fail = 1;
      console.log('FAIL ' + f.replace(/\\/g, '/'));
      console.log((r.stderr || '').split('\n').slice(0, 3).join('\n'));
    }
  }
}
console.log(`js ${files.length}개 구문 확인` + (fail ? ' — 실패 있음' : ''));
process.exit(fail);
