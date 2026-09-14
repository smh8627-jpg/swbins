/**
 * 판마다 따로 있는 js/asset3d.js 의 `DEFAULTS` 표(펫/몬스터/환경 kind → GLB 경로)를
 * 다룬다. data.js 와 달리 다섯 판이 공유하지 않는다 — 판마다 내용이 완전히 다르고,
 * 값도 단순 문자열이 아니라 `PREFIX_VAR + '파일.glb'` 식 표현식·배열·다른 변수 참조가
 * 섞여 있다. 그래서 "단순(문자열 리터럴 / 접두상수+파일명)" 항목만 안전하게 골라
 * 편집 가능하다고 표시하고, 나머지(배열 후보군, HERO_RECIPES 같은 참조)는 원문
 * 그대로 읽기 전용으로 보여준다 — 자동으로 손대지 않는다.
 */
'use strict';

function skipComment(text, i) {
  if (text[i] === '/' && text[i + 1] === '/') {
    const nl = text.indexOf('\n', i);
    return nl === -1 ? text.length : nl + 1;
  }
  if (text[i] === '/' && text[i + 1] === '*') {
    const end = text.indexOf('*/', i + 2);
    return end === -1 ? text.length : end + 2;
  }
  return -1;
}

function skipString(text, i) {
  const c = text[i];
  if (c === "'" || c === '"' || c === '`') {
    let j = i + 1;
    while (j < text.length && text[j] !== c) { if (text[j] === '\\') j++; j++; }
    return j + 1;
  }
  return -1;
}

/** 파일 최상위의 `var NAME = '리터럴';` 선언을 전부 모은다(경로 접두 상수 후보). */
function collectStringVars(text) {
  const map = {};
  const re = /var\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*'([^']*)'\s*;/g;
  let m;
  while ((m = re.exec(text))) { map[m[1]] = m[2]; }
  return map;
}

/** `var DEFAULTS = { 'key': <표현식>, ... };` 를 훑어 항목별 원문 구간을 모은다. */
function parseDefaults(text) {
  const marker = 'var DEFAULTS = {';
  const declIdx = text.indexOf(marker);
  if (declIdx === -1) throw new Error('DEFAULTS not found');
  const openBrace = declIdx + marker.length - 1;
  let i = openBrace + 1;
  const entries = [];
  let objClose = -1;
  while (i < text.length) {
    const cm = skipComment(text, i);
    if (cm !== -1) { i = cm; continue; }
    const c = text[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === ',') { i++; continue; }
    if (c === '}') { objClose = i; break; }
    if (c !== "'" && c !== '"') throw new Error('expected quoted key at ' + i);
    const keyEnd = skipString(text, i);
    const key = text.slice(i + 1, keyEnd - 1);
    i = keyEnd;
    while (/\s/.test(text[i])) i++;
    if (text[i] !== ':') throw new Error('expected : at ' + i);
    i++;
    while (/\s/.test(text[i])) i++;
    const valueStart = i;
    let depth = 0;
    let vi = i;
    while (vi < text.length) {
      const cm2 = skipComment(text, vi);
      if (cm2 !== -1) { vi = cm2; continue; }
      const ss2 = skipString(text, vi);
      if (ss2 !== -1) { vi = ss2; continue; }
      const ch = text[vi];
      if (ch === '(' || ch === '[' || ch === '{') { depth++; vi++; continue; }
      if (ch === ')' || ch === ']') { depth--; vi++; continue; }
      if (ch === '}' && depth === 0) break;
      if (ch === ',' && depth === 0) break;
      vi++;
    }
    const valueEnd = vi;
    entries.push({ key, valueStart, valueEnd, raw: text.slice(valueStart, valueEnd).trim() });
    i = vi;
  }
  if (objClose === -1) throw new Error('unterminated DEFAULTS');
  return entries;
}

function classify(raw, prefixVars) {
  let m = raw.match(/^'([^']*)'$/);
  if (m) return { kind: 'literal', path: m[1] };
  m = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s*\+\s*'([^']*)'$/);
  if (m && Object.prototype.hasOwnProperty.call(prefixVars, m[1])) {
    return { kind: 'concat', varName: m[1], suffix: m[2], path: prefixVars[m[1]] + m[2] };
  }
  return { kind: 'complex' };
}

/** newPath 를 표현할 새 값 텍스트를 만든다 — 알고 있는 접두 상수 중 가장 긴 것과
 *  일치하면 `VAR + '나머지'` 로, 아니면 그냥 문자열 리터럴로. */
function serializeValue(newPath, prefixVars) {
  let best = null;
  Object.keys(prefixVars).forEach((name) => {
    const prefix = prefixVars[name];
    if (prefix && newPath.indexOf(prefix) === 0) {
      if (!best || prefix.length > prefixVars[best].length) best = name;
    }
  });
  if (best) return best + " + '" + newPath.slice(prefixVars[best].length) + "'";
  return "'" + newPath + "'";
}

module.exports = { collectStringVars, parseDefaults, classify, serializeValue };
