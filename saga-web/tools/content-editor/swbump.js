/**
 * 판 `js/` 를 고치면 `sw.js` 의 VERSION 도 올려야 옛 캐시가 안 남는다(각 판 PLAN §7 함정, precheck 가 WARN).
 * 편집기가 js 를 쓸 때 그 판 VERSION 의 가운데 숫자를 하나 올린다 — 서버를 켜 둔 동안 판마다 한 번만.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const bumped = new Map(); // game → 새 VERSION

function bump(gameRoot, game) {
  if (bumped.has(game)) return { version: bumped.get(game), already: true };
  const p = path.join(gameRoot, 'sw.js');
  let text;
  try { text = fs.readFileSync(p, 'utf8'); } catch (e) { return { error: 'sw.js 없음' }; }
  const m = /var VERSION = '([a-z]+-v)(\d+)\.(\d+)\.(\d+)'/.exec(text);
  if (!m) return { error: 'VERSION 줄을 못 찾음' };
  const next = `${m[1]}${m[2]}.${Number(m[3]) + 1}.0`;
  fs.writeFileSync(p, text.replace(m[0], `var VERSION = '${next}'`), 'utf8');
  bumped.set(game, next);
  return { version: next };
}

module.exports = { bump };
