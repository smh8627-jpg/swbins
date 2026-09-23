/**
 * 판 js 파일의 "구간"을 찾고 바꾸는 공용 도구 — 문자열·주석을 건너뛰며 괄호 짝을 센다.
 * 어댑터(adapters/*.js)는 이것으로 배열·객체·값 한 자리만 찾아 바꾸고 나머지 글자는 그대로 둔다.
 */
'use strict';

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

/** `var NAME = [` 배열 구간 { open, close } */
function varArraySpan(text, name) {
  const m = new RegExp('\\bvar\\s+' + name + '\\s*=\\s*\\[').exec(text);
  if (!m) throw new Error(name + ' 배열을 못 찾음');
  const open = m.index + m[0].length - 1;
  const close = matchClose(text, open);
  if (close < 0) throw new Error(name + ' 배열이 안 닫힘');
  return { open, close };
}

/** 배열 [open, close] 의 맨 윗단 원소([..] 또는 {..}) 구간들 — 주석·문자열은 건너뛴다 */
function topElements(text, open, close) {
  const out = [];
  for (let i = open + 1; i < close;) {
    const s = skipStrOrComment(text, i);
    if (s !== -1) { i = s; continue; }
    const c = text[i];
    if (c === '[' || c === '{') {
      const e = matchClose(text, i);
      if (e < 0 || e > close) throw new Error('원소가 안 닫힘');
      out.push({ start: i, end: e });
      i = e + 1; continue;
    }
    i++;
  }
  return out;
}

/**
 * 객체 {open, close} 맨 윗단의 `key:` 값 구간 { start, end(포함) } — 없으면 null.
 * 값은 숫자·문자열·true/false·배열·객체 가운데 하나.
 */
function keyValue(text, open, close, key) {
  let depth = 0;
  for (let i = open; i <= close;) {
    const s = skipStrOrComment(text, i);
    if (s !== -1) { i = s; continue; }
    const c = text[i];
    if (c === '{' || c === '[' || c === '(') { depth++; i++; continue; }
    if (c === '}' || c === ']' || c === ')') { depth--; i++; continue; }
    if (depth === 1 && text.startsWith(key, i) && !/[\w$]/.test(text[i - 1] || '')) {
      const m = /^\s*:\s*/.exec(text.slice(i + key.length, i + key.length + 20));
      if (m) {
        const start = i + key.length + m[0].length;
        const v = text[start];
        if (v === '[' || v === '{') return { start, end: matchClose(text, start) };
        if (v === "'" || v === '"') return { start, end: skipStrOrComment(text, start) - 1 };
        const n = /^[-\w.]+/.exec(text.slice(start));
        return n ? { start, end: start + n[0].length - 1 } : null;
      }
    }
    i++;
  }
  return null;
}

const jsStr = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const jsVal = (v) => (typeof v === 'string' ? jsStr(v) : String(v));
const eolOf = (text) => (text.includes('\r\n') ? '\r\n' : '\n');
/** pos 가 있는 줄의 들여쓰기 */
function lineIndent(text, pos) {
  const ls = text.lastIndexOf('\n', pos - 1);
  return /^[ \t]*/.exec(text.slice(ls + 1))[0];
}
/** pos 의 열 번호(줄 머리부터 글자 수) */
function columnOf(text, pos) { return pos - (text.lastIndexOf('\n', pos - 1) + 1); }

module.exports = { skipStrOrComment, matchClose, varArraySpan, topElements, keyValue, jsStr, jsVal, eolOf, lineIndent, columnOf };
