/**
 * 직업 — 전직하고, 무예 점수를 붓는다
 * ---------------------------------------------------------------
 * 규칙만 안다. 무예가 실제로 무엇을 하는지는 side.js 가, 화면은 ui.js 가 맡는다.
 *
 * 세이브
 *   save.job    = 'none' | 'warrior' | …          지금 직업
 *   save.skills = { 무예key: 레벨 }               찍은 것
 *
 * **무예 점수(SP)는 담지 않는다.** 총점 (레벨-1)×3 에서 찍은 레벨의 합을 뺀 것이
 * 남은 점수다 — 파생값이라 옛 세이브에도 그냥 맞고, 레벨이 오르면 저절로 는다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var JD = global.DG.jobData;

  var BAR = 6;                  // 조작 띠에 놓이는 무예 칸

  function st() {
    var s = core.save;
    if (!s.job) { s.job = 'none'; }
    if (!s.skills) { s.skills = {}; }
    return s;
  }

  function cur() { st(); return JD.job(core.save.job); }

  function levelOf(key) {
    st();
    var sk = JD.skill(key);
    if (sk && sk.max === 0) { return 1; }      // 무명의 넷은 늘 1레벨로 친다
    return core.save.skills[key] || 0;
  }

  function spTotal() { return Math.max(0, (core.save.player.level - 1) * JD.SP_PER_LEVEL); }

  function spSpent() {
    st();
    var sum = 0, k;
    for (k in core.save.skills) {
      if (Object.prototype.hasOwnProperty.call(core.save.skills, k)) {
        sum += core.save.skills[k] || 0;
      }
    }
    return sum;
  }

  function spLeft() { return Math.max(0, spTotal() - spSpent()); }

  /* ── 전직 ─────────────────────────────────────────────── */

  function canJoin(key) {
    var j = JD.job(key);
    if (!j || j.from !== core.save.job) { return '지금 자리에서 갈 수 없는 길입니다'; }
    if (core.save.player.level < j.need) { return 'Lv.' + j.need + ' 부터입니다'; }
    if (j.tier === 2) {
      /* 윗자리는 **아랫자리 무예를 어느 정도 익혀야** 오른다 (원작의 그 조건이다) */
      var low = JD.SKILLS.filter(function (s) { return s.job === j.from; });
      var best = 0;
      for (var i = 0; i < low.length; i++) { best = Math.max(best, levelOf(low[i].key)); }
      if (best < 5) { return '아랫자리 무예 하나를 5 이상 익혀야 합니다'; }
    }
    return null;
  }

  /** 전직 — 되돌릴 수 없다 (원작도 그렇다) */
  /** 소리 한 번 — sfx.js 가 없어도 규칙은 그대로 돈다(진단·데모가 그렇다) */
  function sfx(key) {
    var S = global.DG.sfx;
    if (S) { S.play(key); }
  }

  function join(key) {
    var why = canJoin(key);
    if (why) { core.emit('toast', '⚠️ ' + why); return false; }
    var j = JD.job(key);
    st();
    core.save.job = key;
    sfx('jobup');
    core.log('🎓 ' + j.name + ' 이(가) 되었다 — ' + j.desc, 'good');
    core.emit('toast', j.emoji + ' ' + j.name);
    core.emit('changed');
    core.persist();
    return true;
  }

  /* ── 무예 점수 ────────────────────────────────────────── */

  function canRaise(key) {
    var sk = JD.skill(key);
    if (!sk) { return '없는 무예입니다'; }
    if (sk.max === 0) { return '더 올릴 수 없습니다'; }
    var mine = JD.skillsOf(core.save.job);
    if (mine.indexOf(sk) < 0) { return '이 직업의 무예가 아닙니다'; }
    if (levelOf(key) >= sk.max) { return '이미 다 익혔습니다'; }
    if (spLeft() <= 0) { return '무예 점수가 없습니다'; }
    if (sk.need && levelOf(sk.need.key) < sk.need.lv) {
      return JD.skill(sk.need.key).name + ' ' + sk.need.lv + ' 이 먼저입니다';
    }
    return null;
  }

  function raise(key) {
    var why = canRaise(key);
    if (why) { core.emit('toast', '⚠️ ' + why); return false; }
    st();
    core.save.skills[key] = (core.save.skills[key] || 0) + 1;
    sfx('skillup');
    core.emit('changed');
    core.persist();
    return true;
  }

  /* ── 조작 띠에 놓이는 것 ──────────────────────────────── */

  /**
   * 지금 쓸 수 있는 무예 — **찍은 것만** 놓인다(무명의 넷은 늘 놓인다).
   * 순서는 데이터 순서 그대로다. 칸은 여섯.
   */
  function bar() {
    var mine = JD.skillsOf(core.save.job), out = [];
    for (var i = 0; i < mine.length && out.length < BAR; i++) {
      var sk = mine[i];
      if (sk.max === 0) {
        /* 전직했으면 무명의 넷은 물려받지 않는다 — 자리를 제 무예에 내준다 */
        if (core.save.job !== 'none') { continue; }
        out.push(sk);
      } else if (levelOf(sk.key) > 0) {
        out.push(sk);
      }
    }
    return out;
  }

  /** 그 무예의 지금 힘 (레벨이 실린 배율) */
  function mulOf(sk) {
    if (!sk || !sk.mul) { return 0; }
    var lv = levelOf(sk.key);
    return sk.mul[0] + sk.mul[1] * Math.max(0, lv - 1);
  }

  /** 직업이 몸에 보태는 것 — side.power() 가 얹는다 */
  function grow() {
    var j = cur(), out = { hp: 0, atk: 0, mp: 0 };
    while (j) {
      if (j.grow) {
        out.hp += j.grow.hp || 0;
        out.atk += j.grow.atk || 0;
        out.mp += j.grow.mp || 0;
      }
      j = j.from ? JD.job(j.from) : null;
    }
    return out;
  }

  global.DG = global.DG || {};
  global.DG.job = {
    BAR: BAR,
    state: st, cur: cur, levelOf: levelOf,
    spTotal: spTotal, spSpent: spSpent, spLeft: spLeft,
    canJoin: canJoin, join: join, canRaise: canRaise, raise: raise,
    bar: bar, mulOf: mulOf, grow: grow
  };
})(window);
