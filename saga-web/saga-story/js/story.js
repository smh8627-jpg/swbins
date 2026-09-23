/**
 * 첫 발 장면 — 원 지시서 잔여 "스토리 연출"(2026-09-23)
 * ---------------------------------------------------------------
 * 사냥터(와 시작 마을)에 **처음** 들어설 때 한 번, 위아래 검은 띠 + 초상 + 감정 +
 * 대사 몇 줄을 띄운다. 대사는 `data-side.js` 의 `STORY`, 그리는 것은 `ui.js` 의
 * `renderStoryBox()`, 장면 동안 사냥이 멎는 것은 `game.js` 루프가 `isOpen()` 을 본다.
 * 여기는 **무엇을 언제 띄우고, 봤다고 적는 것**만 한다.
 *
 * 세이브: `core.save.side.story = { <사냥터 key>: 1 }` — 없으면 빈 것으로 본다(마이그레이션 불필요).
 * 안 띄우는 때: `DG_NO_STORY`(데모·진단), 자동 순행 중(다음에 손으로 들어올 때로 미룬다),
 *              `STORY` 에 없는 사냥터(마을 대부분·비경 임시 방).
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var cur = null;            // { key, title, lines, i } — 떠 있는 장면

  function SD() { return global.DG.sideData; }

  function seenMap() {
    var s = core.save.side;
    if (!s) { return {}; }
    if (!s.story || typeof s.story !== 'object') { s.story = {}; }
    return s.story;
  }

  function seen(key) { return !!seenMap()[key]; }

  function blocked() {
    if (global.DG_NO_STORY) { return true; }
    var A = global.DG.auto;
    return !!(A && A.active && A.active());
  }

  /** 이 사냥터에 들어서며 띄울 장면이 있으면 띄운다 — 띄웠으면 true */
  function maybeOpen(key) {
    var beat = SD().STORY && SD().STORY[key];
    if (!beat || cur || seen(key) || blocked()) { return false; }
    cur = { key: key, title: beat.title, lines: beat.lines, i: 0 };
    core.emit('story:change', cur);
    return true;
  }

  function close() {
    if (!cur) { return; }
    seenMap()[cur.key] = 1;
    cur = null;
    core.persist();
    core.emit('story:change', null);
  }

  /** 다음 줄 — 마지막 줄에서 부르면 닫는다 */
  function next() {
    if (!cur) { return; }
    if (cur.i < cur.lines.length - 1) { cur.i += 1; core.emit('story:change', cur); } else { close(); }
  }

  function onEnter(run) {
    if (run && run.stage && !run.stage.rift) { maybeOpen(run.stage.key); }
  }
  core.on('side:enter', onEnter);
  core.on('side:travel', onEnter);

  global.DG = global.DG || {};
  global.DG.story = {
    isOpen: function () { return !!cur; },
    current: function () { return cur; },
    maybeOpen: maybeOpen, next: next, skip: close, seen: seen,
    /** 어드민·진단용 — 본 기록을 지운다 */
    reset: function () { if (core.save.side) { core.save.side.story = {}; } cur = null; core.emit('story:change', null); }
  };
})(window);
