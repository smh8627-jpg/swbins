/**
 * 사명(使命) — 원작(포켓몬GO)의 필드 리서치
 * ---------------------------------------------------------------
 * 원작에서 리서치는 "오늘 무엇을 할지"를 정해 준다. 스탑에서 과제를 받고, 채우면
 * 보상과 **스탬프**를 받고, 스탬프 일곱이면 특별한 조우가 열린다.
 *
 *   포켓스탑에서 받는다 → 역참에서 받는다     스탬프 → 인장(印章)
 *   하루 한 개까지 찍힌다 → 그대로 하루 한 개
 *   일곱이면 돌파 조우  → 일곱이면 **명사(名士)가 찾아온다**(★5 가 지도에 선다)
 *
 * 진행은 각 모듈이 `quest.progress(종류, 수)` 한 줄로 알려 준다. 그래서 조우·역참·
 * 천거장·걷기의 규칙은 그대로 두고, 여기서는 세기만 한다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  /** 한 번에 들고 있을 수 있는 사명 */
  var MAX = 3;
  /** 인장이 이만큼 모이면 명사가 찾아온다 (원작의 일곱) */
  var STAMPS_FOR_BREAK = 7;

  /**
   * 사명 표.
   *   kind 진행을 세는 이름 — progress(kind) 가 이 값으로 들어온다
   *   n    기본 목표치 (레벨을 조금 탄다)
   */
  var KINDS = [
    { key: 'catch', kind: 'catch', name: '짐승을 포획한다', emoji: '🐾', n: 3,
      reward: { gold: 60, feed: 3, exp: 200 } },
    { key: 'recruit', kind: 'recruit', name: '인물을 등용한다', emoji: '🤝', n: 2,
      reward: { gold: 80, scroll: 2, exp: 260 } },
    { key: 'station', kind: 'station', name: '역참에 들른다', emoji: '🏮', n: 3,
      reward: { gold: 70, treat: 1, exp: 180 } },
    { key: 'walk', kind: 'walk', name: '길을 걷는다 (m)', emoji: '🚶', n: 1200,
      reward: { gold: 90, incense: 1, exp: 220 } },
    { key: 'letter', kind: 'letter', name: '천거장을 연다', emoji: '✉️', n: 1,
      reward: { gold: 120, prayer: 1, exp: 300 } },
    { key: 'fort', kind: 'fort', name: '성채를 점령한다', emoji: '🏯', n: 1,
      reward: { gold: 150, scroll: 2, exp: 340 } },
    { key: 'rare', kind: 'rare', name: '★3 이상을 만난다', emoji: '✨', n: 2,
      reward: { gold: 110, treat: 1, exp: 280 } },
    { key: 'rogue', kind: 'rogue', name: '점거된 역참을 되찾는다', emoji: '🏴', n: 1,
      reward: { gold: 130, feed: 3, exp: 320 } }
  ];

  function defOf(key) {
    for (var i = 0; i < KINDS.length; i++) { if (KINDS[i].key === key) { return KINDS[i]; } }
    return null;
  }

  function dayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  /** 세이브 칸이 없던 옛 세이브도 여기서 채운다 */
  function st() {
    var s = core.save;
    if (!s.quests) {
      s.quests = { list: [], stamps: 0, day: dayKey(), stampedToday: false, done: 0, breaks: 0 };
    }
    if (!Array.isArray(s.quests.list)) { s.quests.list = []; }
    if (typeof s.quests.stamps !== 'number') { s.quests.stamps = 0; }
    if (s.quests.day !== dayKey()) {           // 날이 바뀌면 오늘 인장을 다시 받을 수 있다
      s.quests.day = dayKey();
      s.quests.stampedToday = false;
    }
    return s.quests;
  }

  function list() {
    var q = st(), out = [];
    for (var i = 0; i < q.list.length; i++) {
      var it = q.list[i], d = defOf(it.key);
      if (!d) { continue; }
      out.push({
        i: i, key: it.key, def: d, need: it.need, got: it.got,
        pct: Math.min(100, Math.round(it.got / it.need * 100)),
        done: it.got >= it.need
      });
    }
    return out;
  }

  function full() { return st().list.length >= MAX; }

  /* ── 받기 ─────────────────────────────────────────────── */

  /**
   * 사명 하나를 받는다 (역참이 준다). 이미 들고 있는 것과는 겹치지 않게 고른다.
   * @returns {object|null} 받은 사명 정의
   */
  function take(key) {
    var q = st();
    if (q.list.length >= MAX) { return null; }
    var have = {};
    for (var i = 0; i < q.list.length; i++) { have[q.list[i].key] = true; }
    var pool = KINDS.filter(function (d) { return !have[d.key]; });
    if (key) { pool = pool.filter(function (d) { return d.key === key; }); }
    if (!pool.length) { return null; }
    var d = core.pick(pool);
    var lv = core.save.player.level;
    var need = d.kind === 'walk' ? d.n + Math.floor(lv / 4) * 200 : d.n + Math.floor(lv / 10);
    q.list.push({ key: d.key, need: need, got: 0, at: Date.now() });
    core.log('📋 사명 — ' + d.emoji + ' ' + d.name + ' (' + need + ')', 'info');
    core.emit('changed');
    return d;
  }

  /* ── 진행 ─────────────────────────────────────────────── */

  /**
   * 진행을 알린다. 각 모듈이 자기 일이 끝난 자리에서 한 줄 부른다.
   * @returns {Array} 이번에 채워진 사명들
   */
  function progress(kind, n) {
    var q = st(), filled = [];
    n = n || 1;
    for (var i = 0; i < q.list.length; i++) {
      var it = q.list[i], d = defOf(it.key);
      if (!d || d.kind !== kind) { continue; }
      if (it.got >= it.need) { continue; }
      it.got += n;
      if (it.got >= it.need) { filled.push(i); }
    }
    if (filled.length) { core.emit('changed'); }
    return filled;
  }

  /* ── 거두기 ───────────────────────────────────────────── */

  /**
   * 채운 사명을 거둔다.
   * 인장은 **하루 한 번만** 찍힌다(원작과 같다) — 나머지는 보상만 받는다.
   * @returns {object|null}
   */
  function claim(idx) {
    var q = st();
    var it = q.list[idx];
    if (!it) { return null; }
    var d = defOf(it.key);
    if (!d || it.got < it.need) { return null; }

    var B = global.DG.bag;
    var r = d.reward, got = { gold: 0, exp: 0, items: [] };
    core.save.player.gold += r.gold || 0;
    got.gold = r.gold || 0;
    got.exp = core.gainExp(r.exp || 0);
    ['scroll', 'feed', 'treat', 'incense', 'prayer'].forEach(function (k) {
      if (!r[k]) { return; }
      var n = B.add(k, r[k]);
      if (n) { got.items.push({ key: k, n: n, def: B.def(k) }); }
    });
    core.gainFeat(12, '사명');

    var stamped = false;
    if (!q.stampedToday) {
      q.stampedToday = true;
      q.stamps += 1;
      stamped = true;
    }
    q.done = (q.done || 0) + 1;
    q.list.splice(idx, 1);

    core.log('📋 사명 완수 — ' + d.emoji + ' ' + d.name +
      ' · 🪙 +' + got.gold + (stamped ? ' · 🔖 인장 +1 (' + q.stamps + '/' + STAMPS_FOR_BREAK + ')' : ''),
      'good');

    var broke = null;
    if (q.stamps >= STAMPS_FOR_BREAK) { broke = breakthrough(); }
    core.emit('changed');
    core.persist();
    return { def: d, got: got, stamped: stamped, stamps: q.stamps, breakthrough: broke };
  }

  /**
   * 인장 일곱 — 명사(名士)가 찾아온다.
   * 그냥 도감에 넣지 않고 **지도에 세운다** — 원작의 돌파 조우도 만나서 잡는 것이다.
   */
  function breakthrough() {
    var q = st();
    q.stamps -= STAMPS_FOR_BREAK;
    q.breaks = (q.breaks || 0) + 1;
    var spawn = global.DG.world.spawnSpecial ? global.DG.world.spawnSpecial() : null;
    core.log('🔖 인장 일곱 — ' + (spawn ? spawn.ref.name + ' 이(가) 가까이 왔다!' : '명사가 찾아왔다!'),
      'good');
    core.emit('toast', '🔖 인장 일곱 · ' + (spawn ? spawn.ref.name + ' 이(가) 나타났습니다' : '명사가 찾아왔습니다'));
    return { spawn: spawn, name: spawn ? spawn.ref.name : null };
  }

  global.DG = global.DG || {};
  global.DG.quest = {
    KINDS: KINDS, MAX: MAX, STAMPS_FOR_BREAK: STAMPS_FOR_BREAK,
    defOf: defOf, state: st, list: list, full: full,
    take: take, progress: progress, claim: claim, breakthrough: breakthrough
  };
})(window);
