/**
 * 순무 장(場) — 원작의 카부(かぶ)
 * ---------------------------------------------------------------
 * 원작에서 유일하게 **값이 오르내리는** 축이다. 채집은 값이 정해져 있고 부탁은
 * 값을 치러 주지만, 순무만은 사 두고 기다렸다가 판다. 마을에 요일이 생기는 것도
 * 이것 하나 때문이다.
 *
 *   **산다**  **일요일 오전에만** 장이 선다. 그날 살 값은 90~110
 *   **판다**  월~토, 오전과 오후에 값이 다르다 (하루 두 번 바뀐다)
 *   **썩는다** 다음 일요일이 오면 썩는다. 개당 10 에나 팔린다
 *
 * 그 주의 시세는 **네 무늬 중 하나**를 탄다 — 그 주의 씨앗으로 정해진다.
 *   파동  0.8~1.4 사이를 오르내린다
 *   내림  월요일부터 계속 떨어진다
 *   급등  한중간에 한 번 크게 오른다
 *   폭등  후반에 서너 배까지 뛴다
 *
 * 세이브에는 **가진 것만** 남는다(수·산 값·산 주). 시세는 날짜에서 다시 뽑는다 —
 * 같은 주면 늘 같은 시세다. 저장해 두면 세이브를 고쳐 값을 바꿀 수 있게 된다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var BASE = 100;              // 시세의 기준
  var UNIT = 10;               // 열 개 묶음으로 산다 (원작도 그렇다)
  var MAX_BUY = core.tuned('turnip.maxBuy', 900);   // 한 주에 이만큼까지
  var ROT_PRICE = 10;          // 썩은 것

  var PATTERNS = ['파동', '내림', '급등', '폭등'];

  function V() { return global.DG.village; }

  /* ── 날짜 ─────────────────────────────────────────────────
   * 1970-01-01 이 목요일이므로 (날짜 + 4) % 7 이 요일이 된다 (0 = 일요일).
   */
  /** 오늘은 **세이브의 날짜 칸**을 본다 — 하루 몫·부탁과 같은 기준이어야 어긋나지 않는다 */
  function dayNow() { return V().state().day; }
  function dow(day) { return (((day === undefined ? dayNow() : day) + 4) % 7 + 7) % 7; }
  function week(day) { return Math.floor(((day === undefined ? dayNow() : day) + 4) / 7); }

  /**
   * 지금 장이 서 있나 — **일요일 오전만**.
   * 자가진단은 시각을 옮길 수 없으니 `_setOpen()` 으로 열고 닫는다
   * (같은 파일 안에서 부르는 자리라 밖에서 함수를 갈아 끼워도 안 먹는다 —
   *  `_spawnAt`·`_start` 와 같은 결의 진단용 구멍이다).
   */
  var openOverride = null;

  function marketOpen() {
    if (openOverride !== null) { return openOverride; }
    return dow() === 0 && new Date().getHours() < 12;
  }

  /** 오전인가 (시세는 하루 두 번 바뀐다) */
  function half() { return new Date().getHours() < 12 ? 0 : 1; }

  /* ── 값 ───────────────────────────────────────────────── */

  /** 그 주의 살 값 (일요일에 정해진다) */
  function buyPrice(w) {
    var k = w === undefined ? week() : w;
    return 90 + Math.floor(core.hash2(k * 31 + 5, k % 887 + 11) * 21);
  }

  /** 그 주의 시세 무늬 */
  function pattern(w) {
    var k = w === undefined ? week() : w;
    return Math.floor(core.hash2(k * 7 + 3, k % 613 + 29) * PATTERNS.length) % PATTERNS.length;
  }

  /**
   * 파는 값. 일요일에는 장이 서지 않으니 0 이다.
   * @param {number} w 주 · @param {number} d 요일(1~6) · @param {number} h 0 오전 · 1 오후
   */
  function sellPrice(w, d, h) {
    var k = w === undefined ? week() : w;
    var dd = d === undefined ? dow() : d;
    var hh = h === undefined ? half() : h;
    if (dd === 0) { return 0; }

    var i = (dd - 1) * 2 + hh;                  // 0 = 월요일 오전 … 11 = 토요일 오후
    var pat = pattern(k);
    var n = core.hash2(k * 101 + i * 13, k % 379 + i);
    var v;

    if (pat === 0) {                            // 파동
      v = 0.80 + n * 0.60;
    } else if (pat === 1) {                     // 내림
      v = 0.92 - i * 0.05 + n * 0.05;
    } else if (pat === 2) {                     // 급등
      var at2 = 4 + Math.floor(core.hash2(k, k * 3 + 1) * 4);
      v = i === at2 ? 1.5 + n * 0.7
        : i === at2 + 1 ? 1.3 + n * 0.5
        : 0.55 + n * 0.25;
    } else {                                    // 폭등
      var at3 = 6 + Math.floor(core.hash2(k * 5, k + 7) * 4);
      v = i === at3 ? 3.0 + n * 3.0
        : i === at3 - 1 ? 1.2 + n * 0.6
        : 0.45 + n * 0.25;
    }
    return Math.max(15, Math.round(BASE * v));
  }

  /* ── 가진 것 ──────────────────────────────────────────── */

  function have() {
    var s = V().state();
    return s.turnip && s.turnip.n > 0 ? s.turnip : null;
  }

  /** 산 주가 지났으면 썩었다 */
  function rotten() {
    var t = have();
    return !!(t && t.week !== week());
  }

  function nowPrice() {
    return rotten() ? ROT_PRICE : sellPrice();
  }

  /* ── 사고 팔기 ────────────────────────────────────────── */

  function buy(n) {
    var s = V().state();
    if (!marketOpen()) {
      return { kind: 'no', text: '순무 장은 **일요일 오전**에만 섭니다' };
    }
    n = Math.floor((n || UNIT) / UNIT) * UNIT;
    if (n <= 0) { return { kind: 'no', text: n + '개는 살 수 없습니다 (열 개 묶음)' }; }
    var t = have();
    if (t && t.week !== week()) {
      return { kind: 'no', text: '썩은 순무가 남아 있습니다 — 먼저 처분하세요' };
    }
    var already = t ? t.n : 0;
    if (already + n > MAX_BUY) {
      return { kind: 'no', text: '한 주에 ' + MAX_BUY + '개까지입니다 (지금 ' + already + ')' };
    }
    var p = buyPrice();
    var cost = p * n;
    if (core.save.player.gold < cost) {
      return { kind: 'no', text: '금이 모자랍니다 (🪙 ' + core.fmt(cost) + ')' };
    }
    core.save.player.gold -= cost;
    /* 값이 다르게 산 것은 **평균**으로 친다 — 묶음마다 따로 세면 세이브가 늘어난다 */
    var totalCost = (t ? t.buy * t.n : 0) + cost;
    var totalN = already + n;
    s.turnip = { n: totalN, buy: Math.round(totalCost / totalN), week: week() };
    core.log('🥬 순무 ' + n + '개를 샀다 (개당 🪙 ' + p + ' · 모두 ' + core.fmt(cost) + ')', 'info');
    core.emit('changed');
    core.persist();
    return { kind: 'buy', text: '🥬 순무 ' + n + '개 — 개당 🪙 ' + p };
  }

  /** 가진 것을 다 판다 */
  function sellAll() {
    var s = V().state(), t = have();
    if (!t) { return { kind: 'no', text: '가진 순무가 없습니다' }; }
    if (dow() === 0 && !rotten()) {
      return { kind: 'no', text: '일요일에는 전방이 순무를 받지 않습니다' };
    }
    var p = nowPrice();
    var gold = p * t.n;
    var profit = gold - t.buy * t.n;
    core.save.player.gold += gold;
    s.turnip = null;
    if (profit > 0) { core.gainFeat(4, '순무'); }
    core.log('🥬 순무 ' + t.n + '개를 팔았다 (개당 🪙 ' + p + ') — ' +
      (profit >= 0 ? '이문 🪙 +' : '밑진 것 🪙 ') + core.fmt(Math.abs(profit)),
      profit >= 0 ? 'good' : 'warn');
    core.emit('changed');
    core.persist();
    return { kind: 'sell', profit: profit,
             text: '🥬 개당 🪙 ' + p + ' — ' + (profit >= 0 ? '이문 +' : '밑짐 -') +
                   core.fmt(Math.abs(profit)) };
  }

  /** 이번 주 시세를 한 줄로 (지나간 칸만 보여 준다 — 앞일을 알면 놀이가 아니다) */
  function weekTable() {
    var w = week(), d = dow(), h = half();
    var days = ['월', '화', '수', '목', '금', '토'];
    var out = [], i;
    for (i = 0; i < 12; i++) {
      var dd = Math.floor(i / 2) + 1, hh = i % 2;
      var past = d !== 0 && (dd < d || (dd === d && hh <= h));
      out.push({
        label: days[dd - 1] + (hh ? ' 오후' : ' 오전'),
        price: past ? sellPrice(w, dd, hh) : null,
        now: dd === d && hh === h
      });
    }
    return out;
  }

  function status() {
    var t = have();
    return {
      open: marketOpen(), dow: dow(), week: week(),
      buyPrice: buyPrice(), price: dow() === 0 ? 0 : sellPrice(),
      have: t ? t.n : 0, bought: t ? t.buy : 0,
      rotten: rotten(), value: t ? nowPrice() * t.n : 0,
      cost: t ? t.buy * t.n : 0,
      table: weekTable(), UNIT: UNIT, MAX_BUY: MAX_BUY
    };
  }

  global.DG = global.DG || {};
  global.DG.turnip = {
    UNIT: UNIT, MAX_BUY: MAX_BUY, ROT_PRICE: ROT_PRICE, PATTERNS: PATTERNS,
    dow: dow, week: week, marketOpen: marketOpen, half: half,
    buyPrice: buyPrice, sellPrice: sellPrice, pattern: pattern,
    have: have, rotten: rotten, nowPrice: nowPrice,
    buy: buy, sellAll: sellAll, weekTable: weekTable, status: status,
    /** 자가진단용 — 장을 억지로 열고 닫는다. null 이면 날짜와 시각을 다시 본다 */
    _setOpen: function (v) { openOverride = v; }
  };
})(window);
