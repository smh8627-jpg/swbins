/**
 * 오늘의 일과(日課) — PLAN §5 ④ "일과판 + 마무리 카드"의 일과 절반
 * ---------------------------------------------------------------
 * 포켓몬GO 일일 리서치 · 원신 일일 위탁을 참고했다. 사명(quest.js)은 역참에서
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
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var PER_DAY = 3;
  var STAMPS_FOR_WEEK = 7;

  var POOL = [
    { key: 'walk', kind: 'walk', name: '길을 걷는다', emoji: '🚶', n: 800,
      reward: { gold: 30, exp: 60 } },
    { key: 'meet', kind: 'meet', name: '사람이나 짐승을 만난다', emoji: '🤝', n: 3,
      reward: { gold: 40, feed: 1, exp: 90 } },
    { key: 'station', kind: 'station', name: '역참에 들른다', emoji: '🏮', n: 2,
      reward: { gold: 30, exp: 70 } },
    { key: 'event', kind: 'event', name: '사건을 만난다', emoji: '📜', n: 2,
      reward: { gold: 35, scroll: 1, exp: 80 } },
    { key: 'fort', kind: 'fort', name: '성채를 토벌한다', emoji: '⚔️', n: 1,
      reward: { gold: 60, treat: 1, exp: 120 } },
    { key: 'buddy', kind: 'buddy', name: '반려와 함께 걷는다', emoji: '🐕', n: 500,
      reward: { gold: 30, exp: 70 } },
    /* PLAN §5 ⑤ 비석 순례(stela.js) — 격자가 어디서나 서므로 어디 사는 사람이든 채울 수 있다 */
    { key: 'stele', kind: 'stele', name: '비석을 찾는다', emoji: '🪦', n: 3,
      reward: { gold: 50, exp: 100 } },
    /* PLAN §5 ② 사당 시련이 서기 전엔 셀 길이 없다 */
    { key: 'shrine', kind: 'shrine', name: '사당에서 시련을 받는다', emoji: '⛩️', n: 1,
      reward: { gold: 50, incense: 1, exp: 100 }, disabled: true }
  ];

  /** 사명 쪽 kind 이름 → 일과 쪽 key. 표에 없으면 kind 그대로 key 로 본다 */
  var KIND_MAP = { catch: 'meet', recruit: 'meet' };

  function defOf(key) {
    for (var i = 0; i < POOL.length; i++) { if (POOL[i].key === key) { return POOL[i]; } }
    return null;
  }

  function dayKey() {
    var d = new Date();
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
   * 그날의 셋 — **날짜 문자열만으로 결정된다**(순수 함수). 같은 날 몇 번을 불러도
   * 같은 셋이 나오고, 날짜가 바뀌면(자정) 다른 셋이 나온다.
   */
  function pickToday(dayStr) {
    var pool = POOL.filter(function (d) { return !d.disabled; });
    var rnd = mulberry32(strHash('daily:' + dayStr));
    var idx = pool.map(function (_, i) { return i; });
    var out = [];
    while (out.length < Math.min(PER_DAY, idx.length)) {
      var j = Math.floor(rnd() * idx.length);
      out.push(pool[idx.splice(j, 1)[0]]);
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
          ' · 🪙 +' + got.gold + ' · 🎫 도장 ' + (s.stamps % STAMPS_FOR_WEEK || STAMPS_FOR_WEEK) +
          '/' + STAMPS_FOR_WEEK, 'good');
        if (s.stamps >= STAMPS_FOR_WEEK) { s.stamps -= STAMPS_FOR_WEEK; weekly(); }
        filled.push(i);
      }
    }
    if (filled.length) { core.emit('changed'); }
    return filled;
  }

  global.DG = global.DG || {};
  global.DG.daily = {
    POOL: POOL, PER_DAY: PER_DAY, STAMPS_FOR_WEEK: STAMPS_FOR_WEEK,
    defOf: defOf, dayKey: dayKey, pickToday: pickToday,
    state: st, list: list, firstUndone: firstUndone, progress: progress,
    sessionMeetCount: sessionMeetCount, resetSession: resetSession
  };
})(window);
