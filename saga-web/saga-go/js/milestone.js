/**
 * 주간 걷기 이정표 — 포켓몬GO 식 "이번 주 이만큼 걸었다" 보상 사다리 (축1 다음 후보)
 * ---------------------------------------------------------------
 * `game.js`의 걷기 보급(`tickSupply`)은 **지금 몇 걸음**만 본다(250m마다 조금씩).
 * `quest.js`의 "walk" 사명도 **하루 1200m** 한 번뿐이다. 이 파일은 그 위에
 * **이번 주 전체 누적 거리**를 보고 다섯 단 사다리를 한 번씩 크게 터뜨린다 —
 * 매주(월요일 0시) 다시 채워진다. `2026-09-06 HANDOFF`가 축1의 "다음 후보"로
 * 적어 둔 그 장치다.
 *
 * `ambient.js`·`event.js`와 같은 결로 짠다 — 값을 내는 함수(`weekKey`·`rungs`)는
 * **순수**하고, 세이브가 바뀌는 곳(`tick`)은 한 군데다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  function on() { return core.tuned('milestone.on', 1) ? true : false; }

  /** 사다리 — m 마다 보상. quest.js의 "walk"(1200m/일) 보다 훨씬 큰 단위다 */
  var RUNGS = [
    { m: 1000, reward: { gold: 50, exp: 80, feed: 3 } },
    { m: 3000, reward: { gold: 120, exp: 200, scroll: 2 } },
    { m: 7000, reward: { gold: 220, exp: 380, treat: 2 } },
    { m: 15000, reward: { gold: 380, exp: 620, incense: 2 } },
    { m: 30000, reward: { gold: 600, exp: 980, prayer: 2 } }
  ];

  /** 이번 주의 시작(월요일) 날짜 키 — **순수 함수**(Date를 넣으면 결정된다) */
  function weekKey(d) {
    d = d || new Date();
    var t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var dow = (t.getDay() + 6) % 7;         // 월=0 … 일=6
    t.setDate(t.getDate() - dow);
    return t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate();
  }

  /** 세이브 칸이 없던 옛 세이브도 여기서 채운다 */
  function st() {
    var s = core.save, wk = weekKey();
    if (!s.milestone) {
      s.milestone = { week: wk, mark: s.player.distance || 0, got: [] };
    }
    if (s.milestone.week !== wk) {           // 새 주가 밝았다 — 사다리를 다시 채운다
      s.milestone.week = wk;
      s.milestone.mark = s.player.distance;
      s.milestone.got = [];
    }
    if (!Array.isArray(s.milestone.got)) { s.milestone.got = []; }
    if (typeof s.milestone.mark !== 'number' || s.milestone.mark > s.player.distance) {
      s.milestone.mark = s.player.distance;   // 방어적 — distance 는 늘어나기만 한다
    }
    return s.milestone;
  }

  /** 이번 주 걸은 거리 */
  function weekWalked() {
    var m = st();
    return Math.max(0, core.save.player.distance - m.mark);
  }

  /** 화면이 보는 사다리 — 각 단의 달성 여부까지 얹어 순수하게 낸다 */
  function rungs() {
    var walked = weekWalked(), m = st();
    return RUNGS.map(function (r, i) {
      return {
        i: i, m: r.m, reward: r.reward,
        got: m.got.indexOf(i) >= 0,
        reach: walked >= r.m,
        pct: Math.min(100, Math.round(walked / r.m * 100))
      };
    });
  }

  function apply(reward) {
    var p = core.save.player, B = global.DG.bag, got = { gold: 0, exp: 0, items: [] };
    p.gold += reward.gold || 0;
    got.gold = reward.gold || 0;
    got.exp = core.gainExp(reward.exp || 0);
    ['scroll', 'feed', 'treat', 'incense', 'prayer'].forEach(function (k) {
      if (!reward[k]) { return; }
      var n = B.add(k, reward[k]);
      if (n) { got.items.push({ key: k, n: n, def: B.def(k) }); }
    });
    return got;
  }

  function tick() {
    if (!on() || global.DG_NO_DRAW) { return; }
    var m = st(), walked = weekWalked();
    for (var i = 0; i < RUNGS.length; i++) {
      if (walked < RUNGS[i].m || m.got.indexOf(i) >= 0) { continue; }
      m.got.push(i);
      var got = apply(RUNGS[i].reward);
      core.gainFeat(10, '이정표');
      var msg = '🚩 이번 주 ' + core.fmt(RUNGS[i].m) + 'm 이정표 — 🪙 +' + got.gold +
        (got.exp ? ' · 경험치 +' + got.exp : '') +
        got.items.map(function (it) { return ' · ' + it.def.emoji + ' +' + it.n; }).join('');
      core.log(msg, 'good');
      core.emit('toast', { msg: msg, type: 'find' });
      core.emit('changed');
    }
  }

  global.DG = global.DG || {};
  global.DG.milestone = {
    RUNGS: RUNGS,
    on: on, weekKey: weekKey, weekWalked: weekWalked, rungs: rungs,
    apply: apply, tick: tick
  };
})(window);
