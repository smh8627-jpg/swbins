/**
 * JS 값 글자(객체·배열·문자열·숫자) 파서 + **자리 그대로 고치기** — 대사·퀘스트 편집기(story.js)의 바탕.
 *
 * 판 js 의 `var NAME = [ … ]`·`var NAME = { … }` 를 읽어 **값마다 글자 자리(s·e)** 를 기억한 나무로 만든다.
 * 고칠 때는 바뀐 값의 자리만 새 글자로 바꾼다 — 주석·줄 맞춤·다른 값은 한 글자도 안 움직인다.
 * 모양이 바뀐 곳(키가 늘거나 준 객체, 길이가 바뀐 배열)만 그 그릇을 새로 쓴다(그 안의 주석은 사라진다 — 편집기가 알린다).
 * 맨 윗단 배열·객체는 항목(키·id) 단위로 더하고 빼고 끼우고 옮겨서 다른 항목·항목 사이 주석은 그대로 둔다.
 *
 * 값으로 못 읽는 것(함수·다른 변수·식)은 `raw` 로 남긴다 — 그 안의 `text:`·`label:` 같은 **문자열만** 고칠 수 있다
 * (코드 속 대사). raw 자체는 못 고친다.
 *
 * 나무 → 편집기 값(toValue): raw 는 { $raw: 원문, $texts: [{ key, v }] }.
 */
'use strict';

const { skipStrOrComment, matchClose } = require('../map-editor/lib/jsspan');

const TEXT_KEYS = ['text', 'label', 'quote', 'desc', 'name', 'line', 'title', 'say', 'msg', 'q', 'why', 'hint'];

function isWs(c) { return c === ' ' || c === '\t' || c === '\n' || c === '\r'; }
function skipWs(t, i) {
  for (;;) {
    while (i < t.length && isWs(t[i])) i++;
    if (t[i] === '/' && (t[i + 1] === '/' || t[i + 1] === '*')) { i = skipStrOrComment(t, i); continue; }
    return i;
  }
}

/** 따옴표 문자열 [s, e) 의 값 — JSON 이 못 읽는 홑따옴표·\' 도 받는다 */
function strValue(t, s, e) {
  const q = t[s], body = t.slice(s + 1, e - 1);
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c !== '\\') { out += c; continue; }
    const n = body[++i];
    if (n === 'n') out += '\n'; else if (n === 't') out += '\t'; else if (n === 'r') out += '\r';
    else if (n === 'u') { out += String.fromCharCode(parseInt(body.substr(i + 1, 4), 16)); i += 4; }
    else if (n === 'x') { out += String.fromCharCode(parseInt(body.substr(i + 1, 2), 16)); i += 2; }
    else if (n === '\r' && body[i + 1] === '\n') { i++; }            // 줄 잇기
    else if (n === '\n') { /* 줄 잇기 */ }
    else out += n;
  }
  if (q === '`' && /\$\{/.test(body)) return null;                 // 끼워 넣기가 있는 템플릿은 값이 아니다
  return out;
}

/** 값 하나가 끝나는 자리(맨 윗단 , } ] 앞)까지 — raw 를 잡을 때 */
function rawEnd(t, i) {
  let depth = 0;
  while (i < t.length) {
    const s = skipStrOrComment(t, i);
    if (s !== -1) { i = s; continue; }
    const c = t[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') { if (depth === 0) break; depth--; }
    else if (c === ',' && depth === 0) break;
    i++;
  }
  // 뒤 공백·주석은 raw 에 넣지 않는다
  let e = i;
  while (e > 0 && isWs(t[e - 1])) e--;
  return e;
}

/** raw 안의 `key: '…'` 문자열들(코드 속 대사) */
function rawTexts(t, s, e) {
  const out = [];
  for (let i = s; i < e;) {
    const c = t[i];
    if (c === '/' && (t[i + 1] === '/' || t[i + 1] === '*')) { i = skipStrOrComment(t, i); continue; }
    if (c === "'" || c === '"' || c === '`') {
      const j = skipStrOrComment(t, i);
      const before = /([A-Za-z_$][\w$]*)\s*:\s*$/.exec(t.slice(Math.max(s, i - 40), i));
      const v = strValue(t, i, j);
      if (before && TEXT_KEYS.indexOf(before[1]) >= 0 && v !== null) out.push({ key: before[1], s: i, e: j, v });
      i = j; continue;
    }
    i++;
  }
  return out;
}

/** t[i] 에서 값 하나를 읽는다 → { node, end } */
function parseValue(t, i) {
  i = skipWs(t, i);
  const c = t[i];
  if (c === '{') return parseObj(t, i);
  if (c === '[') return parseArr(t, i);
  if (c === "'" || c === '"' || c === '`') {
    const e = skipStrOrComment(t, i);
    const v = strValue(t, i, e);
    const after = skipWs(t, e);
    if (v !== null && (t[after] === ',' || t[after] === '}' || t[after] === ']')) return { node: { t: 'str', s: i, e, v, q: c }, end: e };
  }
  const num = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(t.slice(i, i + 40));
  if (num) {
    const e = i + num[0].length, after = skipWs(t, e);
    if (t[after] === ',' || t[after] === '}' || t[after] === ']') return { node: { t: 'num', s: i, e, v: Number(num[0]) }, end: e };
  }
  const lit = /^(true|false|null)\b/.exec(t.slice(i, i + 6));
  if (lit) {
    const e = i + lit[0].length, after = skipWs(t, e);
    if (t[after] === ',' || t[after] === '}' || t[after] === ']') return { node: { t: 'lit', s: i, e, v: lit[1] === 'true' ? true : lit[1] === 'false' ? false : null }, end: e };
  }
  const e = rawEnd(t, i);
  return { node: { t: 'raw', s: i, e, src: t.slice(i, e), texts: rawTexts(t, i, e) }, end: e };
}
function parseObj(t, s) {
  const close = matchClose(t, s);
  if (close < 0) throw new Error('객체가 안 닫힘 @' + s);
  const props = [];
  let i = s + 1;
  for (;;) {
    i = skipWs(t, i);
    if (i >= close) break;
    let key, ks = i, ke;
    const c = t[i];
    if (c === "'" || c === '"') { ke = skipStrOrComment(t, i); key = strValue(t, i, ke); }
    else { const m = /^[A-Za-z_$][\w$]*|^\d+/.exec(t.slice(i, i + 80)); if (!m) throw new Error('키를 못 읽음 @' + i); key = m[0]; ke = i + m[0].length; }
    i = skipWs(t, ke);
    if (t[i] !== ':') throw new Error('키 뒤에 : 가 없다(' + key + ') @' + i);
    const r = parseValue(t, i + 1);
    props.push({ k: key, ks, ke, v: r.node });
    i = skipWs(t, r.end);
    if (t[i] === ',') i++;
  }
  return { node: { t: 'obj', s, e: close + 1, props }, end: close + 1 };
}
function parseArr(t, s) {
  const close = matchClose(t, s);
  if (close < 0) throw new Error('배열이 안 닫힘 @' + s);
  const items = [];
  let i = s + 1;
  for (;;) {
    i = skipWs(t, i);
    if (i >= close) break;
    const r = parseValue(t, i);
    items.push(r.node);
    i = skipWs(t, r.end);
    if (t[i] === ',') i++;
  }
  return { node: { t: 'arr', s, e: close + 1, items }, end: close + 1 };
}

/** `var NAME = [`·`{` 의 나무 — 없으면 null */
function parseVar(text, name) {
  const m = new RegExp('\\bvar\\s+' + name + '\\s*=\\s*([\\[{])').exec(text);
  if (!m) return null;
  return parseValue(text, m.index + m[0].length - 1).node;
}

function toValue(n) {
  if (n.t === 'obj') { const o = {}; for (const p of n.props) o[p.k] = toValue(p.v); return o; }
  if (n.t === 'arr') return n.items.map(toValue);
  if (n.t === 'raw') return { $raw: n.src, $texts: n.texts.map((x) => ({ key: x.key, v: x.v })) };
  return n.v;
}
const isRawVal = (v) => v && typeof v === 'object' && !Array.isArray(v) && typeof v.$raw === 'string';

/* ── 새 글자 쓰기 ─────────────────────────────────────── */
function jsStr(s, q) {
  q = q === '"' ? '"' : "'";
  return q + String(s).replace(/\\/g, '\\\\').replace(q === "'" ? /'/g : /"/g, '\\' + q).replace(/\n/g, '\\n').replace(/\r/g, '\\r') + q;
}
const keyStr = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : jsStr(k));
function hasComment(t, s, e) {
  for (let i = s; i < e;) {
    const c = t[i];
    if (c === '/' && (t[i + 1] === '/' || t[i + 1] === '*')) return true;
    if (c === "'" || c === '"' || c === '`') { i = skipStrOrComment(t, i); continue; }
    i++;
  }
  return false;
}
/**
 * 값 → 글자. ind 는 그 값이 놓인 줄의 들여쓰기, eol 은 파일 줄바꿈.
 * 짧으면 한 줄, 길면 한 칸에 한 값. multi 가 true 면 배열을 한 줄에 하나로(원래 그랬던 배열).
 */
function ser(v, ind, eol, multi) {
  if (v === null || typeof v === 'boolean' || typeof v === 'number') return String(v);
  if (typeof v === 'string') return jsStr(v);
  if (isRawVal(v)) {
    /* 코드는 그대로 두되 그 안의 대사($texts)가 바뀌었으면 그 문자열만 바꿔 쓴다 */
    const src = v.$raw, at = rawTexts(src, 0, src.length), nt = v.$texts || [];
    let out = src;
    for (let i = at.length - 1; i >= 0; i--) {
      if (nt[i] && typeof nt[i].v === 'string' && nt[i].v !== at[i].v) out = out.slice(0, at[i].s) + jsStr(nt[i].v, src[at[i].s] === '"' ? '"' : "'") + out.slice(at[i].e);
    }
    return out;
  }
  const inner = ind + '  ';
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    const one = '[' + v.map((x) => ser(x, inner, eol)).join(', ') + ']';
    if (!multi && one.length + ind.length <= 110 && !/\n/.test(one)) return one;
    return '[' + eol + v.map((x) => inner + ser(x, inner, eol)).join(',' + eol) + eol + ind + ']';
  }
  const keys = Object.keys(v);
  if (!keys.length) return '{}';
  const one = '{ ' + keys.map((k) => keyStr(k) + ': ' + ser(v[k], inner, eol)).join(', ') + ' }';
  if (one.length + ind.length <= 110 && !/\n/.test(one)) return one;
  return '{' + eol + keys.map((k) => inner + keyStr(k) + ': ' + ser(v[k], inner, eol)).join(',' + eol) + eol + ind + '}';
}
function lineIndent(t, pos) {
  const ls = t.lastIndexOf('\n', pos - 1);
  return /^[ \t]*/.exec(t.slice(ls + 1))[0];
}
const eolOf = (t) => (t.includes('\r\n') ? '\r\n' : '\n');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * 고칠 자리 목록 — old 나무를 new 값으로 만들 [{ s, e, text, lost? }].
 * lost: 그릇을 통째로 새로 써서 안의 주석이 사라지는 자리(편집기에 알린다).
 */
function diff(t, n, v, out, opts) {
  const eol = eolOf(t);
  if (n.t === 'raw') {
    /* 식 자리(y: WALL - 4 같은) — opts.rawToValue 면 글자·숫자 값으로 바꿔 쓸 수 있다(맵 편집기 마을). 코드(함수)를 딴 코드로는 늘 못 바꾼다 */
    if (opts && opts.rawToValue && v !== undefined && (v === null || typeof v !== 'object')) {
      out.push({ s: n.s, e: n.e, text: typeof v === 'string' ? jsStr(v) : String(v) });
      return;
    }
    if (!isRawVal(v) || v.$raw !== n.src) throw new Error('코드(raw) 자리는 못 고친다');
    const nt = v.$texts || [];
    if (nt.length !== n.texts.length) throw new Error('코드 속 대사 수가 다르다');
    n.texts.forEach((x, i) => {
      const nv = nt[i].v;
      if (typeof nv !== 'string') throw new Error('코드 속 대사는 글자여야 한다');
      if (nv !== x.v) out.push({ s: x.s, e: x.e, text: jsStr(nv, t[x.s] === '"' ? '"' : "'") });
    });
    return;
  }
  if (n.t === 'str' || n.t === 'num' || n.t === 'lit') {
    if (same(toValue(n), v)) return;
    const text = typeof v === 'string' ? jsStr(v, n.t === 'str' && n.q === '"' ? '"' : "'") : ser(v, lineIndent(t, n.s), eol);
    out.push({ s: n.s, e: n.e, text });
    return;
  }
  const whole = () => {
    const multi = n.t === 'arr' && /\n/.test(t.slice(n.s, n.e));
    out.push({ s: n.s, e: n.e, text: ser(v, lineIndent(t, n.s), eol, multi), lost: hasComment(t, n.s, n.e) });
  };
  if (n.t === 'obj') {
    if (!v || typeof v !== 'object' || Array.isArray(v) || isRawVal(v)) { whole(); return; }
    const ok = Object.keys(v), nk = n.props.map((p) => p.k);
    if (ok.length !== nk.length || !nk.every((k, i) => ok[i] === k)) {
      /* 키가 뒤에 더해지기만 했으면 닫는 괄호 앞에 붙인다 — 그릇을 통째로 안 쓴다 */
      if (ok.length > nk.length && nk.every((k, i) => ok[i] === k)) {
        n.props.forEach((p) => diff(t, p.v, v[p.k], out, opts));
        const add = ok.slice(nk.length);
        const body = t.slice(n.s, n.e), multi = /\n/.test(body);
        const last = n.props.length ? n.props[n.props.length - 1].v.e : n.s + 1;
        if (multi && n.props.length) {
          const ind = lineIndent(t, n.props[n.props.length - 1].ks);
          out.push({ s: last, e: last, text: add.map((k) => ',' + eol + ind + keyStr(k) + ': ' + ser(v[k], ind, eol)).join('') });
        } else {
          out.push({ s: last, e: last, text: (n.props.length ? ', ' : ' ') + add.map((k) => keyStr(k) + ': ' + ser(v[k], lineIndent(t, n.s) + '  ', eol)).join(', ') + (n.props.length ? '' : ' ') });
        }
        return;
      }
      whole(); return;
    }
    n.props.forEach((p) => diff(t, p.v, v[p.k], out, opts));
    return;
  }
  if (n.t === 'arr') {
    if (!Array.isArray(v)) { whole(); return; }
    if (v.length === n.items.length) { n.items.forEach((it, i) => diff(t, it, v[i], out, opts)); return; }
    /* 뒤에 더해지기만 했으면 마지막 값 뒤에 붙인다 */
    if (v.length > n.items.length && n.items.length) {
      n.items.forEach((it, i) => diff(t, it, v[i], out, opts));
      const lastN = n.items[n.items.length - 1], add = v.slice(n.items.length);
      const multi = /\n/.test(t.slice(n.s, n.e));
      const ind = lineIndent(t, lastN.s);
      out.push({ s: lastN.e, e: lastN.e, text: add.map((x) => (multi ? ',' + eol + ind : ', ') + ser(x, ind, eol)).join('') });
      return;
    }
    whole();
  }
}

/**
 * 맨 윗단 그릇(var 의 값) 고치기 — 항목을 id(배열) · 키(객체)로 맞춰 더하고 빼고 고치고, **끼우고 옮긴다**.
 * idKey 가 없는 배열은 origin(새 자리마다 옛 자리 번호, 새 항목은 -1 — 편집기가 들고 다닌다)으로 맞추고,
 * origin 이 없으면 차례대로 짐작한다.
 *
 * 옮기기는 "자리(slot)" 로 한다: 남은 옛 항목들의 글자 자리는 그대로 두고, 그 자리에 들어갈 항목 글자만 바꿔 넣는다.
 * 그래서 항목 **사이** 주석(갈래 머리말 등)은 자리에 남고, 항목 **안** 주석은 항목을 따라간다.
 * 새 항목은 새 차례에서 바로 앞에 오는 남은 항목 뒤에(없으면 맨 앞 남은 항목 앞에) 끼운다.
 * opts.rawToValue — 식 자리를 글자·숫자 값으로 바꿔 쓰는 것을 허락한다(기본은 막는다 — 대사 편집기의 코드 속 대사 보호).
 * @returns { text, edits, lost, moved } — lost: 주석이 사라진 항목 이름들, moved: 옮겨 쓴 자리 수
 */
function patchTop(t, n, v, idKey, origin, opts) {
  const edits = [], eol = eolOf(t);
  const isObj = n.t === 'obj';
  const olds = isObj ? n.props.map((p) => ({ s: p.ks, e: p.v.e, node: p.v, label: p.k }))
    : n.items.map((it, i) => ({ s: it.s, e: it.e, node: it, label: '#' + i }));
  const nk = isObj ? Object.keys(v) : null;
  const N = isObj ? nk.length : v.length;
  const newVal = (j) => (isObj ? v[nk[j]] : v[j]);
  const ind = itemIndent(t, n);
  const newText = (j) => (isObj ? keyStr(nk[j]) + ': ' + ser(v[nk[j]], ind, eol) : ser(v[j], ind, eol));

  /* 짝짓기 — pairOf[옛 자리] = 새 자리(-1 = 지워짐) */
  const pairOf = new Array(olds.length).fill(-1), used = new Array(N).fill(false);
  const oldVals = isObj ? null : n.items.map(toValue);
  const hasId = (x) => idKey && x && typeof x === 'object' && !Array.isArray(x) && x[idKey] !== undefined;
  const okOrigin = !isObj && Array.isArray(origin) && origin.length === N &&
    origin.every((o, j) => Number.isInteger(o) && o >= -1 && o < olds.length && (o < 0 || origin.indexOf(o) === j));
  if (isObj) {
    olds.forEach((o, i) => { const j = nk.indexOf(o.label); if (j >= 0) { pairOf[i] = j; used[j] = true; } });
  } else if (idKey && oldVals.every(hasId) && v.every(hasId)) {
    oldVals.forEach((x, i) => {
      olds[i].label = String(x[idKey]);
      const j = v.findIndex((y) => y[idKey] === x[idKey]);
      if (j >= 0) { pairOf[i] = j; used[j] = true; }
    });
  } else if (okOrigin) {
    origin.forEach((o, j) => { if (o >= 0) { pairOf[o] = j; used[j] = true; } });
  } else {
    /* 차례대로 맞추되, 지워진 항목은 건너뛴다(다음 옛 항목이 지금 새 항목과 같으면 이번 것은 지워진 것) */
    /* 코드(raw)를 품은 항목은 그 코드 글자가 곧 신원이다 — 코드는 못 고치니 코드가 다르면 다른 항목이다 */
    const rawSig = (x) => { const a = []; JSON.stringify(x, (k, y) => { if (isRawVal(y)) { a.push(y.$raw); } return y; }); return a.length ? a.join('\u0000') : null; };
    const sim = (a, b) => same(a, b) || (rawSig(a) !== null && rawSig(a) === rawSig(b));
    let j = 0;
    for (let i = 0; i < oldVals.length; i++) {
      if (j >= v.length) break;
      if (!sim(oldVals[i], v[j]) && i + 1 < oldVals.length && sim(oldVals[i + 1], v[j])) continue;
      if (rawSig(oldVals[i]) !== null && rawSig(oldVals[i]) !== rawSig(v[j])) continue;
      pairOf[i] = j; used[j] = true; j++;
    }
  }

  const slots = olds.map((_, i) => i).filter((i) => pairOf[i] >= 0);         // 남는 옛 자리(옛 차례)
  if (!slots.length) {
    /* 남는 게 없다 — 옛 항목 전부를 새 항목들로 바꾼다 */
    const add = [];
    for (let j = 0; j < N; j++) add.push(newText(j));
    if (!olds.length) { if (add.length) edits.push(appendSpan(t, n, add)); return apply(t, edits); }
    const multi = /\n/.test(t.slice(n.s, n.e));
    edits.push({ s: olds[0].s, e: olds[olds.length - 1].e, text: add.join(multi ? ',' + eol + ind : ', '), label: 'replace', lost: hasComment(t, olds[0].s, olds[olds.length - 1].e) });
    return apply(t, edits);
  }

  /* 지우기 — 마지막 남는 항목 뒤의 것들은 한 번에(그 뒤 쉼표·주석째) */
  const lastKept = slots[slots.length - 1];
  olds.forEach((o, i) => { if (pairOf[i] < 0 && i < lastKept) edits.push(removeSpan(t, n, i, o.s, o.e)); });
  if (lastKept < olds.length - 1) edits.push({ s: olds[lastKept].e, e: olds[olds.length - 1].e, text: '', label: 'remove' });

  /* 자리 채우기 — k 번째 자리엔 새 차례로 k 번째인 남는 항목 */
  const want = slots.map((i) => pairOf[i]).sort((a, b) => a - b);
  const oldOfNew = {};
  slots.forEach((i) => { oldOfNew[pairOf[i]] = i; });
  let moved = 0;
  slots.forEach((slot, k) => {
    const j = want[k], src = oldOfNew[j], o = olds[src];
    const a = [];
    diff(t, o.node, newVal(j), a, opts);
    if (src === slot) { a.forEach((x) => { x.label = o.label; edits.push(x); }); return; }
    moved++;
    edits.push({ s: olds[slot].s, e: olds[slot].e, text: applyWithin(t, o.s, o.e, a), label: o.label, lost: a.some((x) => x.lost) });
  });

  /* 끼우기 — 새 차례에서 바로 앞 남는 항목이 놓인 자리 뒤에 */
  const multi = /\n/.test(t.slice(n.s, n.e)), sep = multi ? ',' + eol + ind : ', ';
  const slotOfNew = {};
  want.forEach((j, k) => { slotOfNew[j] = slots[k]; });
  const after = {}, before = [];
  let prev = -1;
  for (let j = 0; j < N; j++) {
    if (used[j]) { prev = j; continue; }
    if (prev < 0) before.push(newText(j));
    else (after[slotOfNew[prev]] = after[slotOfNew[prev]] || []).push(newText(j));
  }
  if (before.length) edits.push({ s: olds[slots[0]].s, e: olds[slots[0]].s, text: before.map((x) => x + sep).join(''), label: 'add' });
  Object.keys(after).forEach((i) => { const e = olds[i].e; edits.push({ s: e, e, text: after[i].map((x) => sep + x).join(''), label: 'add' }); });
  const r = apply(t, edits);
  r.moved = moved;
  return r;
}
/** [s, e) 글자에 그 안의 고칠 자리들을 먹인 결과 */
function applyWithin(t, s, e, a) {
  let out = t.slice(s, e);
  a.slice().sort((x, y) => y.s - x.s).forEach((x) => { out = out.slice(0, x.s - s) + x.text + out.slice(x.e - s); });
  return out;
}
function itemIndent(t, n) {
  const first = n.t === 'obj' ? (n.props[0] && n.props[0].ks) : (n.items[0] && n.items[0].s);
  return first !== undefined ? lineIndent(t, first) : lineIndent(t, n.s) + '  ';
}
/** i 번째 항목 [s, e) 를 뺀다 — 뒤 쉼표까지(마지막이면 앞 쉼표를) */
function removeSpan(t, n, i, s, e) {
  const list = n.t === 'obj' ? n.props.map((p) => [p.ks, p.v.e]) : n.items.map((it) => [it.s, it.e]);
  if (i < list.length - 1) {
    /* 제 줄에 혼자 선 항목이면 그 줄(들)만 지운다 — 다음 항목 앞 주석은 남는다 */
    let k = skipWsOnly(t, e);
    if (t[k] === ',') k++;
    const nextS = list[i + 1][0], nl = t.indexOf('\n', k);
    const lineStart = t.lastIndexOf('\n', s - 1) + 1;
    if (/^[ \t]*$/.test(t.slice(lineStart, s)) && nl >= 0 && nl < nextS && /^[ \t\r]*$/.test(t.slice(k, nl))) {
      return { s: lineStart, e: nl + 1, text: '', label: 'remove' };
    }
    return { s, e: Math.min(skipWsOnly(t, k), nextS), text: '', label: 'remove' };
  }
  if (i > 0) {
    const prevE = list[i - 1][1];
    return { s: prevE, e, text: '', label: 'remove' };
  }
  return { s, e, text: '', label: 'remove' };
}
function skipWsOnly(t, i) { while (i < t.length && isWs(t[i])) i++; return i; }
function appendSpan(t, n, texts) {
  const eol = eolOf(t);
  const list = n.t === 'obj' ? n.props.map((p) => p.v.e) : n.items.map((it) => it.e);
  const multi = /\n/.test(t.slice(n.s, n.e));
  if (!list.length) {
    const ind = lineIndent(t, n.s);
    return { s: n.s + 1, e: n.e - 1, text: multi || texts.length > 1 ? eol + texts.map((x) => ind + '  ' + x).join(',' + eol) + eol + ind : texts.join(', '), label: 'add' };
  }
  const ind = itemIndent(t, n);
  const last = list[list.length - 1];
  return { s: last, e: last, text: texts.map((x) => (multi ? ',' + eol + ind : ', ') + x).join(''), label: 'add' };
}
function apply(t, edits) {
  const sorted = edits.slice().sort((a, b) => b.s - a.s || b.e - a.e);
  for (let i = 1; i < sorted.length; i++) if (sorted[i].e > sorted[i - 1].s) throw new Error('고칠 자리가 겹친다');
  let out = t;
  for (const x of sorted) out = out.slice(0, x.s) + x.text + out.slice(x.e);
  return { text: out, edits: edits.length, lost: edits.filter((x) => x.lost).map((x) => x.label || '?') };
}

module.exports = { parseValue, parseVar, toValue, diff, patchTop, ser, jsStr, isRawVal, same, TEXT_KEYS };
