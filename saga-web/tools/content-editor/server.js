/**
 * saga-web 콘텐츠 에디터 — HEROES/PETS/BIOS(data.js)를 다섯 판에 동시에
 * 반영하는 로컬 전용 서버. 게임 서버가 아니다 — 켜 두어도 게임이 움직이지
 * 않고, `run-editor.bat` 으로 사용자가 직접 켤 때만 뜬다.
 *
 * 다섯 판의 data.js 는 HEROES/PETS/BIOS 구간이 전부 바이트 단위로 동일하다
 * (사가고만 그 뒤에 자기 전용 코드가 더 붙어 있을 뿐). 그래서 한 판(캐노니컬
 * = saga-go)에서 만든 "옛 엔트리 텍스트"를 다섯 판 파일에서 그대로
 * indexOf 로 찾아 정확히 한 번만 일치할 때만 교체한다 — 못 찾거나 두 번 이상
 * 걸리면 그 판은 실패로 보고하고 건드리지 않는다(이미 어긋나 있었다는 뜻).
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const fmt = require('./datajs-format');

const ROOT = path.join(__dirname, '..', '..'); // saga-web/
const GAMES = ['saga-go', 'saga-dungeon', 'saga-forest', 'saga-story', 'saga-realm'];
const CANONICAL = 'saga-go';
const PORT = 8799;

function dataJsPath(game) {
  return path.join(ROOT, game, 'js', 'data.js');
}

function readGame(game) {
  return fs.readFileSync(dataJsPath(game), 'utf8');
}

function md5(text) {
  return crypto.createHash('md5').update(text, 'utf8').digest('hex');
}

/** 파일 하나에서 HEROES/PETS/BIOS 세 구간을 파싱한다. */
function parseFile(text) {
  const heroes = fmt.parseArray(text, 'HEROES');
  const pets = fmt.parseArray(text, 'PETS');
  const bios = fmt.parseObjectOfStrings(text, 'BIOS');
  return { heroes, pets, bios };
}

/** 세 구간(HEROES 배열+PETS 배열+BIOS 객체) 텍스트만 뽑아 붙인 것의 md5 —
 *  판마다 달라도 되는 뒤쪽 코드(사가고 전용 genchar-jp/cn 등)는 영향 없다. */
function contentHash(text) {
  const p = parseFile(text);
  const region =
    text.slice(p.heroes.openBracket, p.heroes.arrayClose + 1) +
    text.slice(p.pets.openBracket, p.pets.arrayClose + 1) +
    text.slice(p.bios.openBrace, p.bios.objClose + 1);
  return md5(region);
}

function loadContent() {
  const text = readGame(CANONICAL);
  const p = parseFile(text);
  const heroes = p.heroes.entries.map((e) => {
    const obj = fmt.evalEntry(text.slice(e.start, e.end));
    obj._group = e.group;
    return obj;
  });
  const pets = p.pets.entries.map((e) => {
    const obj = fmt.evalEntry(text.slice(e.start, e.end));
    obj._group = e.group;
    return obj;
  });
  const bios = {};
  p.bios.entries.forEach((e) => {
    bios[e.key] = fmt.evalEntry('(' + text.slice(e.start, e.end).replace(/^[^:]+:/, '') + ')');
  });
  const eras = [];
  heroes.forEach((h) => { if (h.era && eras.indexOf(h.era) === -1) eras.push(h.era); });
  const petGroups = [];
  pets.forEach((pt) => { if (pt._group && petGroups.indexOf(pt._group) === -1) petGroups.push(pt._group); });
  return { heroes, pets, bios, eras, petGroups };
}

/** anchorOldText 뒤에 새 조각을 끼워 넣는다. anchor 뒤에 이미 쉼표가 있으면
 *  그 쉼표 뒤에(끝에 쉼표를 붙여) 끼우고, anchor 가 마지막 항목이라 쉼표가
 *  없으면 anchor 뒤에 쉼표를 새로 달고 그 뒤에 끼운다(끝 항목이 된다). */
function insertAfterAnchor(text, anchorOldText, serializedNewEntry) {
  const idx = text.indexOf(anchorOldText);
  if (idx === -1 || text.indexOf(anchorOldText, idx + 1) !== -1) return null;
  const afterAnchor = idx + anchorOldText.length;
  let k = afterAnchor;
  while (/\s/.test(text[k])) k++;
  if (text[k] === ',') {
    const insertAt = k + 1;
    const frag = '\n    ' + serializedNewEntry + ',';
    return text.slice(0, insertAt) + frag + text.slice(insertAt);
  }
  const frag = ',\n    ' + serializedNewEntry;
  return text.slice(0, afterAnchor) + frag + text.slice(afterAnchor);
}

function removeEntry(text, oldEntryText) {
  const idx = text.indexOf(oldEntryText);
  if (idx === -1 || text.indexOf(oldEntryText, idx + 1) !== -1) return null;
  const end = idx + oldEntryText.length;
  let j = end;
  while (/\s/.test(text[j])) j++;
  if (text[j] === ',') return text.slice(0, idx) + text.slice(j + 1);
  let k = idx - 1;
  while (/\s/.test(text[k])) k--;
  if (text[k] === ',') return text.slice(0, k) + text.slice(end);
  return text.slice(0, idx) + text.slice(end);
}

/** 다섯 판 전체에 oldText -> newText 치환을 적용한다. oldText 가 null 이면
 *  "새로 추가"(anchorText 뒤에 삽입), newText 가 null 이면 "삭제". */
function applyAcrossGames({ oldText, newText, anchorText }) {
  const results = {};
  GAMES.forEach((game) => {
    const p = dataJsPath(game);
    let text;
    try { text = fs.readFileSync(p, 'utf8'); } catch (err) {
      results[game] = { ok: false, reason: '파일 없음: ' + err.message };
      return;
    }
    let next;
    if (oldText == null) {
      next = insertAfterAnchor(text, anchorText, newText);
      if (next == null) { results[game] = { ok: false, reason: '기준 항목을 못 찾음(이미 어긋난 판)' }; return; }
    } else if (newText == null) {
      next = removeEntry(text, oldText);
      if (next == null) { results[game] = { ok: false, reason: '삭제 대상 항목을 못 찾음(이미 어긋난 판)' }; return; }
    } else {
      const idx = text.indexOf(oldText);
      if (idx === -1 || text.indexOf(oldText, idx + 1) !== -1) {
        results[game] = { ok: false, reason: '옛 항목을 정확히 한 번 못 찾음(이미 어긋난 판)' };
        return;
      }
      next = text.slice(0, idx) + newText + text.slice(idx + oldText.length);
    }
    fs.writeFileSync(p, next, 'utf8');
    results[game] = { ok: true };
  });
  return results;
}

function statusPayload() {
  const games = GAMES.map((game) => {
    try {
      const text = readGame(game);
      return { game, exists: true, md5: md5(text), contentHash: contentHash(text) };
    } catch (err) {
      return { game, exists: false, error: err.message };
    }
  });
  const hashes = games.filter((g) => g.exists).map((g) => g.contentHash);
  const synced = hashes.length > 0 && hashes.every((h) => h === hashes[0]);
  return { games, synced };
}

function findHeroAnchor(text, era) {
  const p = fmt.parseArray(text, 'HEROES');
  const matching = p.entries.filter((e) => {
    const o = fmt.evalEntry(text.slice(e.start, e.end));
    return o.era === era;
  });
  const anchorEntry = matching.length ? matching[matching.length - 1] : p.entries[p.entries.length - 1];
  return text.slice(anchorEntry.start, anchorEntry.end);
}

function findPetAnchor(text, group) {
  const p = fmt.parseArray(text, 'PETS');
  const matching = p.entries.filter((e) => e.group === group);
  const anchorEntry = matching.length ? matching[matching.length - 1] : p.entries[p.entries.length - 1];
  return text.slice(anchorEntry.start, anchorEntry.end);
}

function findBioAnchor(text) {
  const p = fmt.parseObjectOfStrings(text, 'BIOS');
  const last = p.entries[p.entries.length - 1];
  return text.slice(last.start, last.end);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (err) { reject(err); }
    });
    req.on('error', reject);
  });
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function handleHeroSave(body) {
  const fields = body.fields;
  const isNew = !!body.isNew;
  const canonicalText = readGame(CANONICAL);
  const p = fmt.parseArray(canonicalText, 'HEROES');
  const existing = p.entries.find((e) => fmt.evalEntry(canonicalText.slice(e.start, e.end)).id === fields.id);
  const newText = fmt.serializeHero(fields);
  if (isNew || !existing) {
    if (existing) return { error: 'id 중복: ' + fields.id };
    const anchorText = findHeroAnchor(canonicalText, fields.era);
    return { results: applyAcrossGames({ oldText: null, newText, anchorText }) };
  }
  const oldText = canonicalText.slice(existing.start, existing.end);
  return { results: applyAcrossGames({ oldText, newText }) };
}

function handlePetSave(body) {
  const fields = body.fields;
  const isNew = !!body.isNew;
  const canonicalText = readGame(CANONICAL);
  const p = fmt.parseArray(canonicalText, 'PETS');
  const existing = p.entries.find((e) => fmt.evalEntry(canonicalText.slice(e.start, e.end)).id === fields.id);
  const newText = fmt.serializePet(fields);
  if (isNew || !existing) {
    if (existing) return { error: 'id 중복: ' + fields.id };
    const anchorText = findPetAnchor(canonicalText, fields._group || null);
    return { results: applyAcrossGames({ oldText: null, newText, anchorText }) };
  }
  const oldText = canonicalText.slice(existing.start, existing.end);
  return { results: applyAcrossGames({ oldText, newText }) };
}

function handleBioSave(body) {
  const id = body.id;
  const text = body.text || '';
  const canonicalText = readGame(CANONICAL);
  const p = fmt.parseObjectOfStrings(canonicalText, 'BIOS');
  const existing = p.entries.find((e) => e.key === id);
  const newText = id + ': ' + fmt.jsStr(text);
  if (!existing) {
    const anchorText = findBioAnchor(canonicalText);
    return { results: applyAcrossGames({ oldText: null, newText, anchorText }) };
  }
  const oldText = canonicalText.slice(existing.start, existing.end);
  return { results: applyAcrossGames({ oldText, newText }) };
}

function handleDelete(kind, id) {
  const canonicalText = readGame(CANONICAL);
  if (kind === 'hero' || kind === 'pet') {
    const varName = kind === 'hero' ? 'HEROES' : 'PETS';
    const p = fmt.parseArray(canonicalText, varName);
    const existing = p.entries.find((e) => fmt.evalEntry(canonicalText.slice(e.start, e.end)).id === id);
    if (!existing) return { error: '항목을 못 찾음: ' + id };
    const oldText = canonicalText.slice(existing.start, existing.end);
    return { results: applyAcrossGames({ oldText, newText: null }) };
  }
  return { error: 'BIOS 는 삭제를 지원하지 않음(빈 문자열로 저장하세요)' };
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '/editor.html')) {
      const filePath = path.join(__dirname, 'editor.html');
      const body = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': MIME['.html'] });
      res.end(body);
      return;
    }
    if (req.method === 'GET' && u.pathname === '/api/content') {
      return sendJson(res, 200, loadContent());
    }
    if (req.method === 'GET' && u.pathname === '/api/status') {
      return sendJson(res, 200, statusPayload());
    }
    if (req.method === 'POST' && u.pathname === '/api/hero/save') {
      return readBody(req).then((body) => sendJson(res, 200, handleHeroSave(body)));
    }
    if (req.method === 'POST' && u.pathname === '/api/pet/save') {
      return readBody(req).then((body) => sendJson(res, 200, handlePetSave(body)));
    }
    if (req.method === 'POST' && u.pathname === '/api/bio/save') {
      return readBody(req).then((body) => sendJson(res, 200, handleBioSave(body)));
    }
    if (req.method === 'POST' && u.pathname === '/api/delete') {
      return readBody(req).then((body) => sendJson(res, 200, handleDelete(body.kind, body.id)));
    }
    sendJson(res, 404, { error: 'not found' });
  } catch (err) {
    sendJson(res, 500, { error: err.message, stack: err.stack });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('saga-web 콘텐츠 에디터: http://127.0.0.1:' + PORT + '/');
  console.log('다섯 판 data.js 를 직접 고칩니다. 게임 서버가 아닙니다. 끝나면 Ctrl+C.');
});
