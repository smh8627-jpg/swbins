/**
 * 업적 — 한 번만 터지는 배지(PLAN 33절 "반복 플레이 요소").
 * ---------------------------------------------------------------
 * quest.js 의 반복 사명은 이벤트('side:kill' 등)를 하나씩 세지만, 업적은
 * 전부 **지금 값이 문턱을 넘었나**만 본다(kills 누적·레벨·금·장비 낀 수 등
 * 이미 세이브 어딘가에 있는 값이다) — 그래서 새 이벤트를 안 만들고, 곳곳에서
 * 이미 나는 'changed' 한 이벤트에 얹혀 훑기만 한다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var AD = global.DG.achieveData;

  function st() {
    var s = core.save;
    if (!s.achievements) { s.achievements = {}; }
    return s.achievements;
  }
  function done(key) { return !!st()[key]; }

  function sfx(key) {
    var S = global.DG.sfx;
    if (S) { S.play(key); }
  }

  /** 업적마다 다른 칸을 본다 — "보는 것"이라 quest.js 의 look() 과 같은 결 */
  function valueOf(key) {
    if (key === 'a_kill100' || key === 'a_kill500') {
      return (core.save.side && core.save.side.kills) || 0;
    }
    if (key === 'a_boss5') { return (core.save.side && core.save.side.bosses) || 0; }
    if (key === 'a_lv10' || key === 'a_lv30') { return core.save.player.level; }
    if (key === 'a_gold5000') { return core.save.player.gold; }
    if (key === 'a_gear7') {
      var G = global.DG.gear;
      if (!G) { return 0; }
      var e = G.equipped(), n = 0, k;
      for (k in e) { if (Object.prototype.hasOwnProperty.call(e, k)) { n++; } }
      return n;
    }
    if (key === 'a_dex20') {
      var dx = core.save.dex || { heroes: {}, pets: {} };
      return Object.keys(dx.heroes || {}).length + Object.keys(dx.pets || {}).length;
    }
    if (key === 'a_quest10') {
      var QD = global.DG.questData, qs = core.save.quests || {}, sum = 0, i;
      if (QD) {
        for (i = 0; i < QD.QUESTS.length; i++) { sum += (qs[QD.QUESTS[i].key] || {}).done || 0; }
      }
      return sum;
    }
    return 0;
  }

  function list() {
    var out = [], i;
    for (i = 0; i < AD.ACHIEVES.length; i++) {
      var d = AD.ACHIEVES[i];
      out.push({ ref: d, done: done(d.key), value: Math.min(d.need, valueOf(d.key)) });
    }
    return out;
  }

  /** 'changed' 가 날 때마다 훑어, 새로 문턱을 넘은 게 있으면 딱 한 번 터뜨린다.
   *  이미 달성한 건 valueOf() 를 다시 안 잰다(done() 이 먼저 걸러 준다) */
  function checkAll() {
    for (var i = 0; i < AD.ACHIEVES.length; i++) {
      var d = AD.ACHIEVES[i];
      if (done(d.key)) { continue; }
      if (valueOf(d.key) >= d.need) {
        st()[d.key] = { at: Date.now() };
        core.gainFeat(d.feat, '업적');
        sfx('questdone');
        core.log('🏅 업적 달성 — ' + d.name, 'good');
        core.emit('toast', '🏅 업적 · ' + d.name);
        core.persist();
      }
    }
  }

  var bound = false;
  function init() {
    if (bound) { return; }
    bound = true;
    core.on('changed', checkAll);
  }

  global.DG = global.DG || {};
  global.DG.achieve = {
    init: init, list: list, done: done,
    /** 진단 전용 — 이벤트 없이 곧바로 훑는다 */
    _check: checkAll
  };
})(window);
