/**
 * 판별 데이터 표 — 각 판 `js/data-*.js`(퀘스트·아이템·도시·적 …)의 `var NAME = [ {…}, … ]` 배열을
 * 항목 하나 단위로 읽고 고친다. data.js 와 달리 다섯 벌이 아니라 **그 판 한 벌**만 쓴다.
 *
 * 안전장치(파일을 망가뜨리지 않는 순서):
 *  1) 저장 요청의 oldText 가 지금 파일의 그 구간과 글자 그대로 같아야 한다(그새 누가 고쳤으면 거절)
 *  2) 새 항목이 `( … )` 식으로 파싱돼야 한다(실행은 안 한다 — 다른 상수를 참조해도 된다)
 *  3) 바꾼 파일 전체가 vm.Script 로 파싱돼야 한다
 *  4) 실명 가드(역사 퀴즈 파일은 예외)
 * 통과하면 그 바이트 구간만 바꿔 쓴다 — 주석·서식·다른 배열은 안 건드린다.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const fmt = require('./datajs-format');
const realname = require('./realname');

function jsDir(root, game) { return path.join(root, game, 'js'); }

function tableFiles(root, game) {
  try {
    return fs.readdirSync(jsDir(root, game)).filter((f) => /^data-[\w-]+\.js$/.test(f)).sort();
  } catch (e) { return []; }
}

function arraysIn(text) {
  const names = [];
  const re = /\bvar ([A-Z][A-Z0-9_]*) = \[/g;
  let m;
  while ((m = re.exec(text))) names.push(m[1]);
  return names;
}

/** 항목 한 줄 요약 — id·name·title 같은 흔한 키를 글자 그대로 뽑는다(실행 없이) */
function summarize(src) {
  const pick = (k) => { const m = new RegExp('\\b' + k + "\\s*:\\s*(['\"`])((?:\\\\.|(?!\\1).)*)\\1").exec(src); return m ? m[2] : null; };
  const id = pick('id') || pick('key');
  const label = pick('name') || pick('title') || pick('label') || pick('text');
  return { id, label };
}

function list(root, games) {
  const out = [];
  for (const game of games) {
    for (const file of tableFiles(root, game)) {
      const text = fs.readFileSync(path.join(jsDir(root, game), file), 'utf8');
      for (const name of arraysIn(text)) {
        try {
          const p = fmt.parseArray(text, name);
          if (p.entries.length) out.push({ game, file, name, count: p.entries.length });
        } catch (e) { /* 객체 배열이 아니면 건너뛴다 */ }
      }
    }
  }
  return out;
}

function read(root, games, game, file, name) {
  if (games.indexOf(game) === -1 || !/^data-[\w-]+\.js$/.test(file)) return { error: '모르는 판·파일' };
  const text = fs.readFileSync(path.join(jsDir(root, game), file), 'utf8');
  const p = fmt.parseArray(text, name);
  return {
    game, file, name,
    exempt: realname.isExempt(game + '/js/' + file),
    entries: p.entries.map((e, i) => {
      const src = text.slice(e.start, e.end);
      return { index: i, group: e.group, text: src, ...summarize(src) };
    }),
  };
}

function save(root, games, body, bumpSw) {
  const { game, file, name, index, oldText, newText } = body;
  if (games.indexOf(game) === -1 || !/^data-[\w-]+\.js$/.test(file)) return { error: '모르는 판·파일' };
  const fp = path.join(jsDir(root, game), file);
  const text = fs.readFileSync(fp, 'utf8');
  const p = fmt.parseArray(text, name);
  const e = p.entries[index];
  if (!e) return { error: '항목 번호가 없다 — 새로고침' };
  const cur = text.slice(e.start, e.end);
  if (cur !== oldText) return { error: '그새 파일이 바뀌었다(다른 세션·편집기) — 새로고침 후 다시' };
  const src = String(newText || '').trim();
  if (!src.startsWith('{') || !src.endsWith('}')) return { error: '항목은 { 로 시작해 } 로 끝나야 한다' };
  try { new vm.Script('(' + src + ')'); } catch (err) { return { error: '항목 구문 오류: ' + err.message }; }
  const next = text.slice(0, e.start) + src + text.slice(e.end);
  try { new vm.Script(next, { filename: file }); } catch (err) { return { error: '파일 구문 오류(저장 안 함): ' + err.message }; }
  if (!realname.isExempt(game + '/js/' + file)) {
    const g = realname.guard(`${game}/${file} ${name}[${index}]`, src);
    if (g) return { error: g };
  }
  fs.writeFileSync(fp, next, 'utf8');
  return { ok: true, sw: bumpSw(game) };
}

module.exports = { list, read, save };
