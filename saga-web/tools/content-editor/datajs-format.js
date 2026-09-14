/**
 * data.js 의 HEROES/PETS/BIOS 를 코드 파싱 없이(정규식/괄호 스캔만으로) 안전하게
 * 읽고 쓰기 위한 유틸. 엔트리 하나의 바이트 구간만 정확히 찾아내 그 구간만
 * 교체한다 — 나머지 주석·서식·다른 판 전용 코드는 절대 건드리지 않는다.
 */
'use strict';

function skipStringOrComment(text, i) {
  const c = text[i];
  if (c === '/' && text[i + 1] === '/') {
    const nl = text.indexOf('\n', i);
    return nl === -1 ? text.length : nl + 1;
  }
  if (c === '/' && text[i + 1] === '*') {
    const end = text.indexOf('*/', i + 2);
    return end === -1 ? text.length : end + 2;
  }
  if (c === "'" || c === '"' || c === '`') {
    let j = i + 1;
    while (j < text.length && text[j] !== c) {
      if (text[j] === '\\') j++;
      j++;
    }
    return j + 1;
  }
  return -1;
}

/** `var NAME = [ {...}, {...} ];` 형태의 최상위 배열을 스캔한다.
 *  entries[] 의 각 항목은 { start, end, group } — group 은 바로 앞의
 *  `// ── 라벨 ──` 식 구분 주석(있으면). */
function parseArray(text, varName) {
  const marker = 'var ' + varName + ' = [';
  const declIdx = text.indexOf(marker);
  if (declIdx === -1) throw new Error('not found: ' + varName);
  const openBracket = declIdx + marker.length - 1;
  let i = openBracket + 1;
  let depth = 0;
  let curStart = -1;
  const entries = [];
  let pendingGroup = null;
  let arrayClose = -1;
  while (i < text.length) {
    const skip = skipStringOrComment(text, i);
    if (skip !== -1) {
      if (depth === 0 && text[i] === '/') {
        const raw = text.slice(i, skip).trim();
        const m = raw.match(/^\/\/\s*──+\s*([^─]+?)\s*──+/);
        if (m && m[1]) pendingGroup = m[1].split(/[(,]/)[0].trim();
      }
      i = skip;
      continue;
    }
    const c = text[i];
    if (c === '{') {
      if (depth === 0) curStart = i;
      depth++;
      i++;
      continue;
    }
    if (c === '}') {
      depth--;
      i++;
      if (depth === 0) entries.push({ start: curStart, end: i, group: pendingGroup });
      continue;
    }
    if (c === ']' && depth === 0) { arrayClose = i; break; }
    i++;
  }
  if (arrayClose === -1) throw new Error('unterminated array: ' + varName);
  return { openBracket, arrayClose, entries };
}

/** `var BIOS = { id: 'text', ... };` 형태의 문자열 맵을 스캔한다. */
function parseObjectOfStrings(text, varName) {
  const marker = 'var ' + varName + ' = {';
  const declIdx = text.indexOf(marker);
  if (declIdx === -1) throw new Error('not found: ' + varName);
  const openBrace = declIdx + marker.length - 1;
  let i = openBrace + 1;
  const entries = [];
  let objClose = -1;
  while (i < text.length) {
    const skip = skipStringOrComment(text, i);
    if (skip !== -1) { i = skip; continue; }
    const c = text[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === ',') { i++; continue; }
    if (c === '}') { objClose = i; break; }
    const idMatch = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(text.slice(i));
    if (!idMatch) throw new Error('unexpected char at ' + i);
    const entryStart = i;
    const key = idMatch[0];
    i += key.length;
    while (/\s/.test(text[i])) i++;
    if (text[i] !== ':') throw new Error('expected : at ' + i);
    i++;
    while (/\s/.test(text[i])) i++;
    const quote = text[i];
    if (quote !== "'" && quote !== '"' && quote !== '`') throw new Error('expected string at ' + i);
    let j = i + 1;
    while (j < text.length && text[j] !== quote) { if (text[j] === '\\') j++; j++; }
    const valueEnd = j + 1;
    entries.push({ key, start: entryStart, end: valueEnd });
    i = valueEnd;
  }
  if (objClose === -1) throw new Error('unterminated object: ' + varName);
  return { openBrace, objClose, entries };
}

function evalEntry(src) {
  // eslint-disable-next-line no-new-func
  return new Function('return (' + src + ')')();
}

function jsStr(s) {
  return "'" + String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

function serializeHero(h) {
  const stats = h.stats || {};
  return '{ id: ' + jsStr(h.id) + ', name: ' + jsStr(h.name) + ', era: ' + jsStr(h.era) +
    ', faction: ' + jsStr(h.faction) + ', rarity: ' + Number(h.rarity) +
    ', trait: ' + jsStr(h.trait) + ', stats: { might: ' + Number(stats.might) +
    ', wisdom: ' + Number(stats.wisdom) + ', command: ' + Number(stats.command) +
    ' }, hanja: ' + jsStr(h.hanja) + ', emoji: ' + jsStr(h.emoji) + ', quote: ' + jsStr(h.quote) + ' }';
}

function serializePet(p) {
  const bonus = p.bonus || {};
  return '{ id: ' + jsStr(p.id) + ', name: ' + jsStr(p.name) + ', kind: ' + jsStr(p.kind) +
    ', rarity: ' + Number(p.rarity) + ', emoji: ' + jsStr(p.emoji) +
    ', catchBase: ' + Number(p.catchBase) + ', bonus: { stat: ' + jsStr(bonus.stat) +
    ', value: ' + Number(bonus.value) + ' }, desc: ' + jsStr(p.desc) + ' }';
}

module.exports = {
  parseArray,
  parseObjectOfStrings,
  evalEntry,
  jsStr,
  serializeHero,
  serializePet,
};
