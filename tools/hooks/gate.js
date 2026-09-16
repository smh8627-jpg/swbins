#!/usr/bin/env node
// saga 프로젝트 훅 게이트 — .claude/settings.json 이 SessionStart·PreToolUse 에서 부른다.
// stdin 으로 훅 JSON 을 받고, 막아야 하면 exit 2(stderr 가 모델에게 전달된다).
//   SessionStart            세션 절차를 짧게 컨텍스트에 넣는다
//   PreToolUse Bash         `git commit` 이면 tools/precheck.sh 를 먼저 돌리고 실패 시 커밋을 막는다
//   PreToolUse Edit/Write   PLAN.md 에 날짜 세션 기록(`**2026-09-16 — …` 식 문단)을 넣으면 막는다
// 규칙의 근거는 SAGA-DESIGN.md §8-5·§9. 서버·브라우저는 절대 띄우지 않는다.
'use strict';
const fs = require('fs');
const { spawnSync } = require('child_process');

let raw = '';
try { raw = fs.readFileSync(0, 'utf8'); } catch (e) { /* stdin 없음 */ }
let ev = {};
try { ev = JSON.parse(raw || '{}'); } catch (e) { process.exit(0); }

const name = ev.hook_event_name || '';
const tool = ev.tool_name || '';
const inp = ev.tool_input || {};

function block(msg) { process.stderr.write(msg + '\n'); process.exit(2); }

if (name === 'SessionStart') {
  process.stdout.write([
    'saga 세션 절차(SAGA-DESIGN §9): ① 폴더 CLAUDE.md → PLAN.md 목차(grep "^## ") → 상태 파일(README 현재 절 / docs/PROJECT_STATE.md). 큰 문서는 절만 sed -n.',
    '② 구현은 PLAN §8 Phase 0(안정화)부터, §5 후보는 적힌 9필드(수치·세이브 스키마·진단 항목)대로. ③ 도감 data.js 는 다섯 벌 함께 + md5.',
    '④ 커밋 전 bash tools/precheck.sh (git commit 훅이 자동 실행·차단). ⑤ 세션 기록은 HANDOFF.md/HISTORY.md 에만 append, PLAN 은 결정이 바뀔 때만. 헤드리스 크롬·서버는 띄우지 않는다.'
  ].join('\n') + '\n');
  process.exit(0);
}

if (name === 'PreToolUse' && tool === 'Bash') {
  const cmd = String(inp.command || '');
  if (/\bgit\s+commit\b/.test(cmd) && !/precheck\.sh/.test(cmd)) {
    const r = spawnSync('bash', ['tools/precheck.sh'], { encoding: 'utf8' });
    if (r.error || r.status !== 0) {
      const lines = String(r.stdout || '').split('\n').filter(l => /FAIL|OVER|MISMATCH/.test(l));
      block('precheck 실패 — 커밋을 막았다. 고친 뒤 다시 커밋:\n' + lines.join('\n') + (r.stderr ? '\n' + r.stderr : '') + (r.error ? '\n' + r.error.message : ''));
    }
  }
  process.exit(0);
}

if (name === 'PreToolUse' && /^(Edit|Write|MultiEdit)$/.test(tool)) {
  const fp = String(inp.file_path || '');
  if (/PLAN\.md$/i.test(fp)) {
    let txt = '';
    if (typeof inp.new_string === 'string') txt = inp.new_string;
    else if (typeof inp.content === 'string') txt = inp.content;
    else if (Array.isArray(inp.edits)) txt = inp.edits.map(e => e && e.new_string || '').join('\n');
    const hit = txt.split(/\r?\n/).find(l => /^\s*>?\s*\*\*20\d\d-\d\d-\d\d/.test(l) || /^#{2,4} .*(세션|이어서|다음 세션).*20\d\d-\d\d-\d\d/.test(l));
    if (hit) block('PLAN.md 에는 날짜 세션 기록을 넣지 않는다(SAGA-DESIGN §9 — 설계 층). 이 내용은 그 판 HANDOFF.md / docs/HISTORY.md 에 append 하고, PLAN 에는 바뀐 결정만 남긴다:\n  ' + hit.slice(0, 100));
  }
  process.exit(0);
}

process.exit(0);
