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

  /* 조작 띠 여덟 칸(2026-08-26, 3차 전직과 함께 여섯에서 늘렸다).
     3차까지 열리면 한 갈래의 무예가 열둘이라 여섯 칸에는 새로 얻은 것이 못 든다.
     **4차(2026-09-10)를 더했지만 여덟은 그대로 둔다** — bar() 가 윗자리부터 채우므로
     4차 넷 + 3차 넷이 이미 여덟을 정확히 채운다(2·1차는 자동으로 내려간다). 더 늘리면
     조작 띠가 세로로 길어져 사냥 화면을 가린다(사가고 UI에 맞추며 잡아 둔 자리) */
  var BAR = 8;                  // 조작 띠에 놓이는 무예 칸

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
    if (j.tier >= 2) {
      /* 윗자리는 **아랫자리 무예를 어느 정도 익혀야** 오른다 (원작의 그 조건이다).
         자리가 높을수록 무거워진다 — 2차는 5, 3차는 8, 4차는 10(만렙 — 하나를 끝까지). */
      var need = j.tier >= 4 ? 10 : (j.tier >= 3 ? 8 : 5);
      var low = JD.SKILLS.filter(function (s) { return s.job === j.from; });
      var best = 0;
      for (var i = 0; i < low.length; i++) { best = Math.max(best, levelOf(low[i].key)); }
      if (best < need) { return '아랫자리 무예 하나를 ' + need + ' 이상 익혀야 합니다'; }
    }
    return null;
  }

  /** 전직 — 원작은 되돌릴 수 없지만, 이 판은 "퓨전"이 방향이라 규칙을 하나
   *  더 얹는다(2026-09-11, 사용자 요청 — 다섯 판 전체 퓨전 순서와는 별개로
   *  사가스토리만 먼저 넣는 예외). resetJob() 이 무명으로 돌아가고 무예
   *  점수를 전부 돌려준다 — 그 뒤에 join() 으로 처음부터 **다른 길**을
   *  고를 수 있다. 되돌린 대가(비용·쿨타임)는 없다 — 아직 무엇이 적당한지
   *  실기기로 확인하기 전이라 우선 자유롭게 열어 둔다. */
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

  /** 전직을 되돌린다 — 무명으로 돌아가고 찍은 무예 점수를 전부 되찾는다.
   *  이미 무명이면 되돌릴 게 없다. 부르는 쪽(ui.js)이 되돌릴지 먼저 되묻는다 */
  function resetJob() {
    st();
    if (core.save.job === 'none') { return false; }
    core.save.job = 'none';
    core.save.skills = {};
    sfx('jobup');
    core.log('🔄 전직을 되돌렸다 — 처음부터 다른 길을 고를 수 있다', 'info');
    core.emit('toast', '🔄 전직을 되돌렸습니다');
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
  /**
   * 조작 띠 — **윗자리 무예부터** 놓는다.
   * 3차까지 열리면 한 갈래의 무예가 열둘이라 여덟 칸에도 다 못 든다. 표 순서대로
   * 아래에서부터 채우면 **새로 얻은 무예가 영영 자리를 못 잡는다**(1차 넷이 앞을 다 먹는다).
   * 원작에서는 사람이 골라 놓지만 이 판은 자동으로 놓으므로, 윗자리를 먼저 놓는 것이 옳다.
   * 같은 자리 안에서는 표 순서 그대로다.
   */
  function bar() {
    var mine = JD.skillsOf(core.save.job).slice().sort(function (a, b) {
      return (JD.job(b.job).tier || 0) - (JD.job(a.job).tier || 0);
    });
    var out = [];
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
    canJoin: canJoin, join: join, resetJob: resetJob, canRaise: canRaise, raise: raise,
    bar: bar, mulOf: mulOf, grow: grow
  };
})(window);
