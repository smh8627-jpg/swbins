/**
 * 오류 수집 — SAGA-DESIGN §8-2 "사용자 제보가 스택으로 온다"
 * ---------------------------------------------------------------
 * 폰에서 증상만 오면 원인을 못 좁힌다. `window.onerror`·`unhandledrejection`
 * 을 여기서 잡아 localStorage 에 링버퍼(50건)로 쌓아 두면, `_admin.html`
 * "오류" 탭에서 스택으로 볼 수 있다(사가고에서 먼저 잡은 방식, 다섯 판 공통).
 *
 * **아주 먼저 실린다** — `index.html` 맨 첫 스크립트라 다른 모든 파일이
 * 던지는 오류도(파싱 오류만 빼고) 잡는다. `DG.core` 도 아직 없을 수 있어
 * 손잡이(`errlog.on`)는 있으면 보고 없으면 켠 것으로 친다.
 *
 *   record(entry)   한 줄 넣는다(자동으로 t 를 붙인다)
 *   list()          지금 쌓인 것(오래된 것부터)
 *   clear()         비운다
 *   push(arr, e)    **순수 함수** — 50건 넘으면 오래된 것부터 미는 셈만 한다
 */
(function (global) {
  'use strict';

  var MAX = 50;
  function storageKey() { return 'yeoksa-village/errlog'; }

  function ON() {
    var core = global.DG && global.DG.core;
    return core && core.tuned ? (core.tuned('errlog.on', 1) ? true : false) : true;
  }

  function load() {
    try {
      var raw = global.localStorage ? global.localStorage.getItem(storageKey()) : null;
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function persist(arr) {
    try { if (global.localStorage) { global.localStorage.setItem(storageKey(), JSON.stringify(arr)); } }
    catch (e) { /* 저장소 꽉 참 등 — 조용히 넘어간다, 오류 수집이 또 오류를 내면 안 된다 */ }
  }

  /** 링버퍼 셈 — 순수 함수, 자가진단이 세 번 넣어 3/50/51건을 값으로 본다 */
  function push(arr, entry) {
    var out = (arr || []).concat([entry]);
    if (out.length > MAX) { out = out.slice(out.length - MAX); }
    return out;
  }

  function record(entry) {
    entry = entry || {};
    if (!entry.t) { entry.t = Date.now(); }
    var arr = push(load(), entry);
    persist(arr);
    return arr;
  }

  function list() { return load(); }
  function clear() { persist([]); return []; }

  function fromErrorEvent(ev) {
    return {
      kind: 'error',
      msg: (ev && ev.message) || String(ev),
      src: (ev && ev.filename) || '',
      line: (ev && ev.lineno) || 0,
      col: (ev && ev.colno) || 0,
      stack: (ev && ev.error && ev.error.stack) || ''
    };
  }
  function fromRejectionEvent(ev) {
    var r = ev && ev.reason;
    return {
      kind: 'rejection',
      msg: (r && (r.message || String(r))) || 'unhandled rejection',
      stack: (r && r.stack) || ''
    };
  }

  var installed = false;
  function install() {
    if (installed || !global.addEventListener) { return; }
    installed = true;
    global.addEventListener('error', function (ev) {
      if (ON()) { record(fromErrorEvent(ev)); }
    });
    global.addEventListener('unhandledrejection', function (ev) {
      if (ON()) { record(fromRejectionEvent(ev)); }
    });
  }

  global.DG = global.DG || {};
  global.DG.errlog = {
    MAX: MAX, ON: ON,
    record: record, list: list, clear: clear, push: push,
    fromErrorEvent: fromErrorEvent, fromRejectionEvent: fromRejectionEvent,
    install: install
  };
  install();
})(window);
