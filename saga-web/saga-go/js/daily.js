/**
 * 오늘의 일과(日課) — PLAN §5 ④ "일과판 + 마무리 카드"의 일과 절반
 * ---------------------------------------------------------------
 * 원작 일일 리서치 · 오픈월드 RPG 일일 위탁을 참고했다. 사명(quest.js)은 역참에서
 * "받는" 것이고, 일과는 **매일 자동으로 셋이 뽑혀 화면에 늘 있다** — 표준 A(목표판)
 * ·H(돌아올 이유)를 채운다.
 *
 * **새 call site 를 안 늘린다.** 걷기·조우·역참·토벌은 이미 `quest.progress(kind, n)`
 * 을 부르고 있으므로(game.js·encounter.js·station.js·fort.js), quest.js 가 그 호출을
 * 받을 때 **한 자리에서만** 이 모듈로도 넘겨준다(§10-Q3 "나란히 둔다" 결정 —
 * `quest.js`의 `progress()` 참고, "이중 계수 방지"는 그 전달이 한 곳뿐이라는 뜻이다).
 * 사건(event)·반려(buddy) 는 quest 표에 없던 kind 라 각 파일에 한 줄만 보탰다.
 *
 * 비석(⑤)은 stela.js 로 섰다. 사당(②)은 27 대표점 근처에만 있어 못 채우는 사람이 생기니 `disabled` 로 꺼 둔다.
 * 그 후보가 서면 이 줄만 지우면 곧바로 오늘의 일과 후보로 들어온다.
 *
 * PLAN §5 ⑲-8 일일 의뢰(saga-godot 106 ⑲, Q10 권장안) — 새 판 없이 이 판을 넓혔다.
 * 하루 넷 = 갈래 넷(걸음·만남·싸움·살림)에서 하나씩, 날 갈림은 새벽 4시. 싸움·살림의
 * 새 후보(들판 적·원소 반응·채집·요리)는 field-combat.js·cooking.js 가 한 줄씩 부른다.
 * 넷을 다 하면 역참에 들를 때 마무리 보상(인연 매듭 포함) — 한 날 한 번(`save.daily.bonus`).
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var STAMPS_FOR_WEEK = 7;
  var DAY_START_H = 4;                    // ⑲-8 날 갈림 새벽 4시(오픈월드 RPG·Godot 의뢰와 같다)

  /* ⑲-8 갈래 넷 — 하루에 갈래마다 하나씩 뽑아 종류가 겹치지 않게 한다 */
  var GROUPS = ['step', 'meet', 'fight', 'life'];
  var PER_DAY = GROUPS.length;

  var POOL = [
    { key: 'walk', kind: 'walk', group: 'step', name: '길을 걷는다', emoji: '🚶', n: 800,
      reward: { gold: 30, exp: 60 } },
    { key: 'meet', kind: 'meet', group: 'meet', name: '사람이나 짐승을 만난다', emoji: '🤝', n: 3,
      reward: { gold: 40, feed: 1, exp: 90 } },
    { key: 'station', kind: 'station', group: 'meet', name: '역참에 들른다', emoji: '🏮', n: 2,
      reward: { gold: 30, exp: 70 } },
    { key: 'event', kind: 'event', group: 'meet', name: '사건을 만난다', emoji: '📜', n: 2,
      reward: { gold: 35, scroll: 1, exp: 80 } },
    { key: 'fort', kind: 'fort', group: 'fight', name: '성채를 토벌한다', emoji: '⚔️', n: 1,
      reward: { gold: 60, treat: 1, exp: 120 } },
    { key: 'buddy', kind: 'buddy', group: 'step', name: '반려와 함께 걷는다', emoji: '🐕', n: 500,
      reward: { gold: 30, exp: 70 } },
    /* PLAN §5 ⑤ 비석 순례(stela.js) — 격자가 어디서나 서므로 어디 사는 사람이든 채울 수 있다 */
    { key: 'stele', kind: 'stele', group: 'step', name: '비석을 찾는다', emoji: '🪦', n: 3,
      reward: { gold: 50, exp: 100 } },
    /* ⑲-8 들판 싸움·원소 반응(field-combat.js)·채집·요리(cooking.js) */
    { key: 'hunt', kind: 'hunt', group: 'fight', name: '들판의 적을 쓰러뜨린다', emoji: '🗡️', n: 8,
      reward: { gold: 50, exp: 100, ore: 1 } },
    { key: 'react', kind: 'react', group: 'fight', name: '원소 반응을 일으킨다', emoji: '🌀', n: 6,
      reward: { gold: 45, exp: 90, note: 1 } },
    { key: 'gather', kind: 'gather', group: 'life', name: '채집물을 줍는다', emoji: '🍄', n: 5,
      reward: { gold: 35, exp: 70 } },
    { key: 'cook', kind: 'cook', group: 'life', name: '요리를 한다', emoji: '🍲', n: 2,
      reward: { gold: 40, exp: 80 } },
    /* PLAN §5 ② 사당은 27 대표점 근처에만 있다 */
    { key: 'shrine', kind: 'shrine', group: 'fight', name: '사당에서 시련을 받는다', emoji: '⛩️', n: 1,
      reward: { gold: 50, incense: 1, exp: 100 }, disabled: true },
    /* ⑲-8 보물 상자는 한 번 열면 다시 안 서서 못 채우는 날이 생긴다 */
    { key: 'chest', kind: 'chest', group: 'life', name: '보물 상자를 연다', emoji: '🎁', n: 1,
      reward: { gold: 40, exp: 80 }, disabled: true }
  ];

  /** ⑲-8 넷을 다 한 날 역참에서 한 번 — 인연 매듭은 Q10 */
  var BONUS_REWARD = { gold: 150, party: 120, ore: 2, knot: 1 };

  /** 사명 쪽 kind 이름 → 일과 쪽 key. 표에 없으면 kind 그대로 key 로 본다 */
  var KIND_MAP = { catch: 'meet', recruit: 'meet' };

  function defOf(key) {
    for (var i = 0; i < POOL.length; i++) { if (POOL[i].key === key) { return POOL[i]; } }
    return null;
  }

  /** 새벽 4시 전은 전날로 친다(⑲-8). `at`(ms)을 주면 그 시각으로 — **순수 함수** */
  function dayKey(at) {
    var d = new Date((at == null ? Date.now() : at) - DAY_START_H * 3600000);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  /** djb2 류 — 문자열을 32비트 정수로. **순수 함수** */
  function strHash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) { h = ((h * 33) ^ s.charCodeAt(i)) | 0; }
    return h >>> 0;
  }

  /** mulberry32 — 나머지 판들의 진단 씨앗과 같은 식(SAGA-HANDOFF). **순수 함수** */
  function mulberry32(seed) {
    var t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) | 0;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * 그날의 넷 — **날짜 문자열만으로 결정된다**(순수 함수). 같은 날 몇 번을 불러도
   * 같은 넷이 나오고, 날짜가 바뀌면(새벽 4시) 다른 넷이 나온다. 갈래마다 하나씩(⑲-8).
   */
  function pickToday(dayStr) {
    var rnd = mulberry32(strHash('daily:' + dayStr));
    var out = [];
    for (var g = 0; g < GROUPS.length; g++) {
      var pool = POOL.filter(function (d) { return !d.disabled && d.group === GROUPS[g]; });
      if (pool.length) { out.push(pool[Math.floor(rnd() * pool.length)]); }
    }
    return out;
  }

  /** 세이브 칸이 없던 옛 세이브도 여기서 채운다. 날이 바뀌면 셋을 다시 뽑는다 */
  function st() {
    var s = core.save;
    if (!s.daily || typeof s.daily !== 'object') {
      s.daily = { date: dayKey(), tasks: [], stamps: 0 };
    }
    if (s.daily.date !== dayKey()) {
      s.daily.date = dayKey();
      s.daily.tasks = [];
      s.daily.shrine = 0;                 // 사당 시련(shrine.js)은 하루 셋 — 날이 바뀌면 다시
      s.daily.bonus = 0;                  // ⑲-8 마무리 보상도
    }
    if (typeof s.daily.stamps !== 'number') { s.daily.stamps = 0; }
    if (!Array.isArray(s.daily.tasks) || !s.daily.tasks.length) {
      s.daily.tasks = pickToday(s.daily.date).map(function (d) {
        return { key: d.key, got: 0, need: d.n, done: false };
      });
    }
    return s.daily;
  }

  function list() {
    var s = st(), out = [];
    for (var i = 0; i < s.tasks.length; i++) {
      var t = s.tasks[i], d = defOf(t.key);
      if (!d) { continue; }
      out.push({
        i: i, key: t.key, def: d, got: t.got, need: t.need,
        pct: Math.min(100, Math.round(t.got / t.need * 100)),
        done: !!t.done
      });
    }
    return out;
  }

  /** 화면(목표판 "이번 세션" 줄)이 보는 첫 미완료 일과, 다 됐으면 null */
  function firstUndone() {
    var l = list();
    for (var i = 0; i < l.length; i++) { if (!l[i].done) { return l[i]; } }
    return null;
  }

  /* 이번 나들이(세션) 동안 만난 수 — **세이브에 안 남는다**, 마무리 카드 전용.
     탭을 새로고침하거나 세이브를 다시 열면 0 부터다(session.js 가 없는 이 판에서
     game.js 의 세션 스냅샷과 짝이다) */
  var sessionMeet = 0;
  function sessionMeetCount() { return sessionMeet; }
  function resetSession() { sessionMeet = 0; }

  function apply(reward) {
    var p = core.save.player, B = global.DG.bag, got = { gold: 0, exp: 0, items: [], mats: '' };
    p.gold += reward.gold || 0;
    got.gold = reward.gold || 0;
    got.exp = core.gainExp(reward.exp || 0);
    ['scroll', 'feed', 'treat', 'incense', 'prayer'].forEach(function (k) {
      if (!reward[k]) { return; }
      var n = B.add(k, reward[k]);
      if (n) { got.items.push({ key: k, n: n, def: B.def(k) }); }
    });
    /* ⑲-8 부대 경험·강화석(weapon.js)·무예 쪽지·인연 매듭(talent.js) */
    var H = global.DG.hero, WP = global.DG.weapon, TL = global.DG.talent, mats = [];
    if (reward.party && H && H.awardParty) { H.awardParty(reward.party); mats.push('부대 경험 ' + reward.party); }
    if (reward.ore && WP && WP.addOre) { WP.addOre(reward.ore); mats.push('🪨 강화석 +' + reward.ore); }
    if (TL && TL.addMats) {
      var tm = TL.addMats({ note: reward.note || 0, knot: reward.knot || 0 });
      if (tm) { mats.push(tm); }
    }
    got.mats = mats.join(' · ');
    return got;
  }

  function doneCount() {
    var s = st(), n = 0;
    for (var i = 0; i < s.tasks.length; i++) { if (s.tasks[i].done) { n++; } }
    return n;
  }
  function allDone() { var s = st(); return s.tasks.length > 0 && doneCount() === s.tasks.length; }
  /** 'wait'(넷이 안 끝남) · 'ready'(역참에 들르면 받음) · 'paid'(받음) */
  function bonusState() { return st().bonus ? 'paid' : (allDone() ? 'ready' : 'wait'); }

  /** ⑲-8 마무리 보상 — 넷을 다 한 날, 역참에서 한 번. 받았으면 got, 아니면 null */
  function claimBonus() {
    if (bonusState() !== 'ready') { return null; }
    st().bonus = 1;
    var got = apply(BONUS_REWARD);
    var msg = '📋 오늘 일과 ' + st().tasks.length + '/' + st().tasks.length + ' 마무리 — 🪙 +' + got.gold +
      (got.mats ? ' · ' + got.mats : '');
    core.log(msg, 'good');
    core.emit('toast', { msg: msg, type: 'find' });
    core.emit('changed');
    return got;
  }

  /** 주간 보상 — 도장 7 마다 한 번(밀스톤의 주간 사다리와는 별개 축) */
  var WEEK_REWARD = { gold: 260, exp: 420, scroll: 2, treat: 1 };
  function weekly() {
    var got = apply(WEEK_REWARD);
    core.gainFeat(14, '일과');
    var msg = '🎫 일과 도장 ' + STAMPS_FOR_WEEK + ' — 🪙 +' + got.gold +
      ' · 경험치 +' + got.exp +
      got.items.map(function (it) { return ' · ' + it.def.emoji + ' +' + it.n; }).join('');
    core.log(msg, 'good');
    core.emit('toast', { msg: msg, type: 'find' });
    return got;
  }

  /**
   * 사명 쪽에서 넘어오는 진행 신호 — `quest.js`의 `progress()`가 **한 곳에서만** 부른다.
   * @returns {Array} 이번에 채워진 일과 인덱스
   */
  function progress(kind, n) {
    n = n || 1;
    var mapped = KIND_MAP[kind] || kind;
    if (mapped === 'meet') { sessionMeet += n; }
    var s = st(), filled = [];
    for (var i = 0; i < s.tasks.length; i++) {
      var t = s.tasks[i];
      if (t.done || t.key !== mapped) { continue; }
      t.got = Math.min(t.need, t.got + n);
      if (t.got >= t.need) {
        t.done = true;
        var d = defOf(t.key);
        var got = apply(d.reward);
        s.stamps += 1;
        core.log('✅ 일과 완료 — ' + d.emoji + ' ' + d.name +
          ' · 🪙 +' + got.gold + (got.mats ? ' · ' + got.mats : '') +
          ' · 🎫 도장 ' + (s.stamps % STAMPS_FOR_WEEK || STAMPS_FOR_WEEK) +
          '/' + STAMPS_FOR_WEEK, 'good');
        if (s.stamps >= STAMPS_FOR_WEEK) { s.stamps -= STAMPS_FOR_WEEK; weekly(); }
        filled.push(i);
      }
    }
    if (filled.length) { core.emit('changed'); }
    if (mapped === 'station') { claimBonus(); }          // ⑲-8 역참 = Godot 의 의뢰 게시판
    return filled;
  }

  global.DG = global.DG || {};
  global.DG.daily = {
    POOL: POOL, PER_DAY: PER_DAY, STAMPS_FOR_WEEK: STAMPS_FOR_WEEK,
    GROUPS: GROUPS, DAY_START_H: DAY_START_H, BONUS_REWARD: BONUS_REWARD,
    defOf: defOf, dayKey: dayKey, pickToday: pickToday,
    state: st, list: list, firstUndone: firstUndone, progress: progress,
    doneCount: doneCount, allDone: allDone, bonusState: bonusState, claimBonus: claimBonus,
    sessionMeetCount: sessionMeetCount, resetSession: resetSession
  };
})(window);
