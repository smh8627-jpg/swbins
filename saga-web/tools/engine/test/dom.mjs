#!/usr/bin/env node
/**
 * 사가 엔진 화면 진단 — 편집기·실행기를 jsdom 에서 실제로 띄운다(WebGL 만 가짜). `RESULT n/n`
 *   JSDOM_DIR=<jsdom 이 설치된 폴더> node saga-web/tools/engine/test/dom.mjs
 * jsdom 은 저장소에 넣지 않는다 — 없으면 건너뛴다(SKIP). 서버는 임시 폴더로 띄우고 끝나면 지운다.
 * 보는 것: 스크립트 오류 0 · 편집기 열기·놓기(프리셋 전부)·설정 창·저장 · 실행기(틀 여섯)가 도는지·키 입력·HUD.
 * 그림(픽셀)은 못 본다 — 실제 모습은 사람이 브라우저에서 확인한다.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const require = createRequire(import.meta.url);
let JSDOM, VirtualConsole;
try {
  const dir = process.env.JSDOM_DIR;
  const mod = dir ? await import(pathToFileURL(path.join(dir, 'node_modules/jsdom/lib/api.js')).href) : await import('jsdom');
  JSDOM = mod.JSDOM || mod.default.JSDOM; VirtualConsole = mod.VirtualConsole || mod.default.VirtualConsole;
} catch (e) { console.log('SKIP jsdom 없음(JSDOM_DIR 로 가리킬 것)'); process.exit(0); }

let pass = 0, fail = 0;
const fails = [];
const ok = (name, cond, info) => { if (cond) { pass++; } else { fail++; fails.push(name + (info != null ? ' — ' + info : '')); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saga-engine-dom-'));
process.env.SAGA_ENGINE_PROJECTS = path.join(tmp, 'projects');
process.env.SAGA_ENGINE_DIST = path.join(tmp, 'dist');
const srv = require(path.join(ROOT, 'server.js'));
const server = http.createServer(srv.handle);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;

/* 가짜 WebGL 렌더러 — three 가 정해지는 순간 바꿔 끼운다 */
function prepare(win, errors) {
  let T;
  Object.defineProperty(win, 'THREE', {
    configurable: true,
    get() { return T; },
    set(v) {
      /* 번들 객체는 읽기 전용(getter)이라 그대로 못 고친다 — 원본을 프로토타입으로 둔 사본에 렌더러만 덮는다 */
      T = Object.create(v);
      const Fake = function (o) {
        this.domElement = (o && o.canvas) || win.document.createElement('canvas');
        this.shadowMap = {}; this.info = {};
      };
      Fake.prototype = { setPixelRatio() {}, setSize() {}, render() {}, dispose() {}, setClearColor() {}, getPixelRatio() { return 1; } };
      Object.defineProperty(T, 'WebGLRenderer', { value: Fake });
    }
  });
  win.fetch = (u, o) => fetch(new URL(u, win.location.href), o);
  win.HTMLCanvasElement.prototype.getContext = function () { return null; };
  win.HTMLCanvasElement.prototype.toDataURL = function () { return 'data:,'; };
  win.addEventListener('error', (e) => errors.push('onerror: ' + (e.error && e.error.stack || e.message)));
}
function vcon(errors) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { const m = String(e && (e.stack || e.message) || e); if (!/Could not load (img|link)|Not implemented: (window.scrollTo|HTMLCanvasElement)/.test(m)) { errors.push('jsdom: ' + m.split('\n').slice(0, 4).join(' / ')); } });
  vc.on('error', (e) => errors.push('console.error: ' + e));
  return vc;
}
async function open(url, errors) {
  const dom = await JSDOM.fromURL(url, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vcon(errors), beforeParse: (w) => prepare(w, errors) });
  return dom;
}
async function until(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (fn()) { return true; } } catch (e) { /* 아직 */ } await sleep(50); } return false; }
function key(win, code, down = true) { win.dispatchEvent(new win.KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code.replace(/^Key/, '').toLowerCase(), bubbles: true })); }

try {
  const tpls = await (await fetch(base + '/api/templates')).json();
  for (const t of tpls) { await fetch(base + '/api/new', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'd-' + t.name, title: t.title, template: t.name }) }); }

  /* ── 편집기 ─────────────────────────────────────────────────────── */
  {
    const errors = [];
    const dom = await open(base + '/?p=d-adventure', errors);
    const w = dom.window;
    const up = await until(() => w.SagaEditor && w.SagaEditor.project && w.document.querySelectorAll('#ents li').length > 5, 8000);
    ok('편집기: 프로젝트 열림', up, errors.join(' | '));
    const doc = w.document;
    ok('편집기: 개체 목록', doc.querySelectorAll('#ents li').length === w.SagaEditor.project.scenes[0].entities.length, doc.querySelectorAll('#ents li').length);
    ok('편집기: 프리셋 단추', doc.querySelectorAll('#presets button').length >= 35, doc.querySelectorAll('#presets button').length);
    await until(() => doc.querySelectorAll('#assets .asset').length > 50, 8000);
    ok('편집기: 에셋 서랍', doc.querySelectorAll('#assets .asset').length > 50, doc.querySelectorAll('#assets .asset').length);
    /* 장면 설정 창(아무것도 안 고름) */
    ok('편집기: 장면 속성', /하늘·빛·땅/.test(doc.querySelector('#insp').textContent) && /카메라/.test(doc.querySelector('#insp').textContent));
    /* 프리셋 전부 놓기 — 플레이어는 이미 있어 막힌다 */
    const before = w.SagaEditor.project.scenes[0].entities.length;
    doc.querySelectorAll('#presets button').forEach((b) => b.click());
    const after = w.SagaEditor.project.scenes[0].entities.length;
    ok('편집기: 프리셋 놓기', after - before >= 30, (after - before) + '개');
    ok('편집기: 오류 없음(놓기)', errors.length === 0, errors.slice(0, 3).join(' | '));
    /* 고른 개체의 속성 칸 — 이름 바꾸기·컴포넌트 붙이기 */
    const last = w.SagaEditor.project.scenes[0].entities[after - 1];
    w.SagaEditor.select(last.id);
    ok('편집기: 개체 속성', /모양/.test(doc.querySelector('#insp').textContent) && /몸\(충돌\)/.test(doc.querySelector('#insp').textContent));
    const nameIn = doc.querySelector('#insp .card .row input');
    nameIn.value = '새 이름'; nameIn.dispatchEvent(new w.Event('change'));
    ok('편집기: 이름 고치기', w.SagaEditor.project.scenes[0].entities.find((e) => e.id === last.id).name === '새 이름');
    const addSel = [...doc.querySelectorAll('#insp select')].find((s) => /컴포넌트 붙이기/.test(s.options[0] && s.options[0].textContent));
    addSel.value = 'foe'; addSel.dispatchEvent(new w.Event('change'));
    ok('편집기: 컴포넌트 붙이기', !!w.SagaEditor.project.scenes[0].entities.find((e) => e.id === last.id).comps.foe);
    /* 이벤트 추가 */
    const evN = () => (w.SagaEditor.project.scenes[0].entities.find((e) => e.id === last.id).events || []).length;
    const ev0 = evN();
    const evBtn = [...doc.querySelectorAll('#insp button')].find((b) => b.textContent === '＋ 이벤트');
    evBtn.click();
    ok('편집기: 이벤트 추가', evN() === ev0 + 1);
    /* 되돌리기 */
    doc.querySelector('#b-undo').click();
    ok('편집기: 되돌리기', evN() === ev0);
    /* 설정 창 열고 적용 */
    doc.querySelector('#b-settings').click();
    ok('편집기: 설정 창', !doc.querySelector('#modal').hidden && /전투 스타일/.test(doc.querySelector('#modal').textContent) && /시간·날씨·계절/.test(doc.querySelector('#modal').textContent), errors.slice(0, 2).join(' | '));
    const apply = [...doc.querySelectorAll('#modal button')].find((b) => b.textContent === '적용');
    apply.click();
    ok('편집기: 설정 적용', doc.querySelector('#modal').hidden);
    /* 검사·저장 */
    await sleep(300);
    const saved = await w.SagaEditor.save();
    ok('편집기: 저장', saved === true, doc.querySelector('#status').textContent);
    ok('편집기: 발견 밀도 줄', /발견 밀도/.test(doc.querySelector('#issues').textContent));
    /* 장면 바꾸기 */
    const ss = doc.querySelector('#scene-sel'); ss.value = 'cave'; ss.dispatchEvent(new w.Event('change'));
    ok('편집기: 장면 바꾸기', doc.querySelectorAll('#ents li').length >= 7);
    ok('편집기: 오류 없음(끝)', errors.length === 0, errors.slice(0, 3).join(' | '));
    w.close();
  }

  /* ── 실행기 — 틀 여섯 ──────────────────────────────────────────── */
  for (const t of tpls) {
    const errors = [];
    const dom = await open(base + '/runtime/play.html?p=d-' + t.name, errors);
    const w = dom.window, doc = w.document;
    const up = await until(() => doc.querySelector('#hud .vars') && doc.querySelector('#hud .cbl'), 8000);
    ok('실행기 ' + t.name + ': 떴다', up, errors.slice(0, 2).join(' | '));
    /* 키: 걷기·점프·공격·스킬·시점·도감·지도·사진 */
    const codes = ['KeyW', 'Space', 'KeyJ', 'KeyF', 'KeyE', 'KeyQ', 'KeyZ', 'KeyX', 'KeyV', 'KeyB', 'KeyX', 'KeyM', 'KeyX', 'KeyP', 'KeyP', 'ShiftLeft', 'Digit2', 'KeyH', 'Tab'];
    for (const c of codes) { key(w, c, true); await sleep(60); key(w, c, false); }
    await sleep(800);
    ok('실행기 ' + t.name + ': 오류 없음', errors.length === 0, errors.slice(0, 3).join(' | '));
    const hud = doc.querySelector('#hud').textContent;
    ok('실행기 ' + t.name + ': HUD', hud.length > 10);
    w.close();
  }

  /* ── 내보낸 판 — 박힌 프로젝트로 뜬다 ─────────────────────────────── */
  {
    const r = await (await fetch(base + '/api/export/d-platformer', { method: 'POST' })).json();
    ok('내보내기', !!r.ok, JSON.stringify(r));
    const errors = [];
    const html = fs.readFileSync(path.join(r.dir, 'index.html'), 'utf8');
    /* 내보낸 폴더를 파일처럼 — 같은 서버에 얹지 않고 jsdom 파일 주소로 연다 */
    const dom = new JSDOM(html, { url: pathToFileURL(path.join(r.dir, 'index.html')).href, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vcon(errors), beforeParse: (w) => prepare(w, errors) });
    const up = await until(() => dom.window.document.querySelector('#hud .vars'), 8000);
    ok('내보낸 판: 떴다', up, errors.slice(0, 2).join(' | '));
    await sleep(500);
    ok('내보낸 판: 오류 없음', errors.length === 0, errors.slice(0, 3).join(' | '));
    ok('내보낸 판: 제목', dom.window.document.title === '3D 점프 수집', dom.window.document.title);
    dom.window.close();
  }
} catch (e) {
  fail++; fails.push('예외: ' + (e.stack || e));
} finally {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
fails.forEach((f) => console.log('FAIL ' + f));
console.log('RESULT ' + pass + '/' + (pass + fail));
process.exit(fail ? 1 : 0);
