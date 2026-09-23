/**
 * saga-web 맵 편집기 — 판 `js/land.js` 의 "글자 그림" 지도(map)·명소(places)를 칠하고 옮기는 로컬 전용 서버.
 * 게임 서버가 아니다. `run-map-editor.bat` 으로 켤 때만 뜬다(포트 8800).
 *
 * 검사는 **게임 코드 그대로** 한다: 고친 land.js 를 vm 에서 실행해 그 판의 `validate()`·`roadIslands()`·`tally()` 를
 * 부른다 — 규칙을 여기 따로 베끼지 않으니 게임 `_test.html` 땅 진단과 어긋나지 않는다.
 * 저장은 그 땅 객체의 `map: [...]`·`places: [...]` 구간만 바꿔 쓴다(주석·범례·다른 코드는 그대로).
 * 막는 것: 그새 파일이 바뀜(해시) · 파일 구문 오류 · validate() 오류 · 명소 이름 실명.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const realname = require('../content-editor/realname');
const swbump = require('../content-editor/swbump');

const ROOT = path.join(__dirname, '..', '..'); // saga-web/
const GAMES = ['saga-go', 'saga-dungeon', 'saga-forest', 'saga-story', 'saga-realm'];
const PORT = 8800;

const landPath = (g) => path.join(ROOT, g, 'js', 'land.js');
const md5 = (t) => crypto.createHash('md5').update(t, 'utf8').digest('hex');

/** land.js 를 실행해 DG.land 를 얻는다(DG.core.tuned 만 흉내 — 손잡이는 전부 켠 것으로) */
function evalLand(text) {
  const win = { DG: { core: { tuned: (k, d) => (d == null ? 1 : d) } } };
  win.window = win;
  vm.runInNewContext(text, win, { filename: 'land.js', timeout: 2000 });
  return win.DG.land;
}

/* ── 구간 찾기: 문자열·주석을 건너뛰며 괄호 짝을 센다 ───────────────── */
function skipStrOrComment(t, i) {
  const c = t[i];
  if (c === '/' && t[i + 1] === '/') { const n = t.indexOf('\n', i); return n < 0 ? t.length : n + 1; }
  if (c === '/' && t[i + 1] === '*') { const n = t.indexOf('*/', i + 2); return n < 0 ? t.length : n + 2; }
  if (c === "'" || c === '"' || c === '`') {
    let j = i + 1;
    while (j < t.length && t[j] !== c) { if (t[j] === '\\') j++; j++; }
    return j + 1;
  }
  return -1;
}
function matchClose(t, open) {
  const pair = { '[': ']', '{': '}' }[t[open]];
  let depth = 0;
  for (let i = open; i < t.length;) {
    const s = skipStrOrComment(t, i);
    if (s !== -1) { i = s; continue; }
    if (t[i] === t[open]) depth++;
    else if (t[i] === pair && --depth === 0) return i;
    i++;
  }
  return -1;
}
/** 땅 id 의 map/places 배열 구간 [open, close] — `id: '<id>'` 뒤 처음 나오는 `map: [` 와 `places: [` */
function regionSpans(text, id) {
  const idAt = text.search(new RegExp("\\bid:\\s*'" + id.replace(/[^\w-]/g, '') + "'"));
  if (idAt < 0) throw new Error('땅 id 를 못 찾음: ' + id);
  const span = (key) => {
    const m = new RegExp('\\b' + key + ':\\s*\\[').exec(text.slice(idAt));
    if (!m) throw new Error(key + ' 배열을 못 찾음');
    const open = idAt + m.index + m[0].length - 1;
    const close = matchClose(text, open);
    if (close < 0) throw new Error(key + ' 배열이 안 닫힘');
    return { open, close };
  };
  return { map: span('map'), places: span('places') };
}

const jsStr = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
function indentBefore(text, open) {
  const nl = text.indexOf('\n', open);
  const m = /^[ \t]*/.exec(text.slice(nl + 1));
  return m ? m[0] : '      ';
}
function serializeMap(rows, ind, eol, closeInd) {
  return '[' + eol + rows.map((r, i) => ind + jsStr(r) + (i < rows.length - 1 ? ',' : '')).join(eol) + eol + closeInd + ']';
}
function serializePlaces(places, ind, eol, closeInd) {
  const one = (p) => {
    const keys = ['id', 'name', 'tx', 'ty', 'hidden'].filter((k) => p[k] !== undefined)
      .concat(Object.keys(p).filter((k) => ['id', 'name', 'tx', 'ty', 'hidden'].indexOf(k) < 0));
    return '{ ' + keys.filter((k) => !(k === 'hidden' && !p[k])).map((k) => {
      const v = p[k];
      return k + ': ' + (typeof v === 'number' || typeof v === 'boolean' ? String(v) : jsStr(v));
    }).join(', ') + ' }';
  };
  return '[' + eol + places.map((p, i) => ind + one(p) + (i < places.length - 1 ? ',' : '')).join(eol) + eol + closeInd + ']';
}
function rebuild(text, id, map, places) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const sp = regionSpans(text, id);
  const closeInd = (s) => { const ls = text.lastIndexOf('\n', s.close); return /^[ \t]*/.exec(text.slice(ls + 1))[0]; };
  // 뒤쪽 구간부터 바꿔야 앞쪽 위치가 안 밀린다
  const parts = [['map', sp.map, serializeMap(map, indentBefore(text, sp.map.open), eol, closeInd(sp.map))],
    ['places', sp.places, serializePlaces(places, indentBefore(text, sp.places.open), eol, closeInd(sp.places))]]
    .sort((a, b) => b[1].open - a[1].open);
  let out = text;
  for (const [, s, rep] of parts) out = out.slice(0, s.open) + rep + out.slice(s.close + 1);
  return out;
}

function check(text, id) {
  const L = evalLand(text);
  L.use(id);
  const r = L.region();
  return { errors: L.validate(r), islands: L.roadIslands(r), tally: L.tally(r), info: L.info() };
}

function lands() {
  const out = [];
  for (const game of GAMES) {
    let text;
    try { text = fs.readFileSync(landPath(game), 'utf8'); } catch (e) { continue; }
    const L = evalLand(text);
    for (const [key, r] of Object.entries(L.LANDS)) {
      out.push({ game, key, id: r.id, name: r.name, ox: r.ox, oy: r.oy, map: r.map, legend: r.legend, places: r.places,
        hash: md5(text), report: check(text, r.id) });
    }
  }
  return out;
}

function validateBody(b) {
  if (GAMES.indexOf(b.game) < 0) return '모르는 판';
  if (!Array.isArray(b.map) || !b.map.length || !b.map.every((r) => typeof r === 'string')) return 'map 이 글자 줄 배열이 아니다';
  if (!Array.isArray(b.places) || !b.places.every((p) => p && typeof p.id === 'string' && Number.isInteger(p.tx) && Number.isInteger(p.ty))) return 'places 형식이 이상하다';
  return null;
}

function handleCheck(b) {
  const bad = validateBody(b); if (bad) return { error: bad };
  const next = rebuild(fs.readFileSync(landPath(b.game), 'utf8'), b.id, b.map, b.places);
  return check(next, b.id);
}

function handleSave(b) {
  const bad = validateBody(b); if (bad) return { error: bad };
  const cur = fs.readFileSync(landPath(b.game), 'utf8');
  if (md5(cur) !== b.hash) return { error: '그새 land.js 가 바뀌었다(다른 세션·편집기) — 새로고침 후 다시' };
  const next = rebuild(cur, b.id, b.map, b.places);
  try { new vm.Script(next, { filename: 'land.js' }); } catch (e) { return { error: '파일 구문 오류(저장 안 함): ' + e.message }; }
  const rep = check(next, b.id);
  if (rep.errors.length) return { error: '지도 오류(저장 안 함): ' + rep.errors.slice(0, 5).join(' · '), report: rep };
  const g = realname.guard('명소 이름', ...b.places.map((p) => p.name));
  if (g) return { error: g };
  fs.writeFileSync(landPath(b.game), next, 'utf8');
  return { ok: true, hash: md5(next), report: rep, sw: swbump.bump(path.join(ROOT, b.game), b.game) };
}

function readBody(req) {
  return new Promise((ok, no) => {
    let s = '';
    req.on('data', (d) => { s += d; if (s.length > 2e6) { no(new Error('too big')); req.destroy(); } });
    req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch (e) { no(e); } });
  });
}
function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

if (require.main === module) {
  http.createServer((req, res) => {
    const u = new URL(req.url, 'http://localhost');
    const fail = (e) => send(res, 500, { error: e.message });
    try {
      if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '/map.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(fs.readFileSync(path.join(__dirname, 'map.html')));
      }
      if (req.method === 'GET' && u.pathname === '/api/lands') return send(res, 200, { lands: lands() });
      if (req.method === 'POST' && u.pathname === '/api/check') return readBody(req).then((b) => send(res, 200, handleCheck(b))).catch(fail);
      if (req.method === 'POST' && u.pathname === '/api/save') return readBody(req).then((b) => send(res, 200, handleSave(b))).catch(fail);
      send(res, 404, { error: 'not found' });
    } catch (e) { fail(e); }
  }).listen(PORT, '127.0.0.1', () => {
    console.log('saga-web 맵 편집기: http://127.0.0.1:' + PORT + '/');
    console.log('판 js/land.js 를 직접 고칩니다. 게임 서버가 아닙니다. 끝나면 Ctrl+C.');
  });
}

module.exports = { evalLand, regionSpans, rebuild, check, lands, handleCheck, handleSave, ROOT, landPath };
