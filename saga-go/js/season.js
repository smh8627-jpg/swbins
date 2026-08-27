/**
 * 계절 — 봄·여름·가을·겨울 (PLAN 37절)
 * ---------------------------------------------------------------
 * `PLAN.md` 37절은 계절을 적어 두고 **"단, MVP 이후 구현한다"** 로 스스로 미뤄
 * 두었다. PHASE 1~13 이 다 찼으니 이제 그 자리다.
 *
 * **계절도 시각의 순수 함수다** — 주민·짐승과 같은 뼈대다. 달(月)만 보면 되니
 * 더 단순하다. 언제 물어도 같은 답이라 진단이 값으로 붙든다.
 *
 *   봄 3~5월   여름 6~8월   가을 9~11월   겨울 12~2월
 *
 * 37절이 적어 둔 다섯 갈래를 그대로 맡는다.
 *
 *   식물     나무·들·논밭의 색 (`world3d` 가 물어본다)
 *   날씨     계절마다 잘 오는 것이 다르다 (`weather.js` 가 물어본다)
 *   NPC 의상 겨울에는 옷이 짙고 두껍다 (색을 민다)
 *   이벤트   약초는 봄·여름에 잦고, 겨울에는 드물다
 *   분위기   지면 물감을 계절로 조금 민다
 *
 * **날씨 하나만 판정에 닿는다.** 이 판의 천후는 무엇이 잘 나오는지를 정하기
 * 때문이다(`weather.js`). 그래서 그 갈래만 따로 끌 수 있게 두었다 —
 * `season.weather` 를 0 으로 두면 천후는 예전처럼 계절을 모른 채 돈다.
 * 손잡이 `season.on` 을 0 으로 두면 통째로 잠들고 여태 그림 그대로다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  /** 계절을 쓸까 — 0 이면 사철이 없던 예전으로 돌아간다 */
  function on() { return core.tuned('season.on', 1) ? true : false; }
  /** 계절이 천후를 기울일까 — **여기만 판정에 닿는다** */
  function weatherOn() { return on() && core.tuned('season.weather', 1) ? true : false; }
  /** 색을 얼마나 미나 (0 이면 색은 사철 같다) */
  function TINT() { return core.tuned('season.tint', 1); }

  /* ── 넷 ───────────────────────────────────────────────
   *   leaf   나뭇잎          field  논밭        grass  들
   *   warm   지면 물감을 미는 쪽 (곱한다)
   *   cloth  주민 옷 밝기 보정
   *   wx     천후 가중치 — 곱한다. 1 이면 그대로
   */
  var SEASONS = {
    spring: {
      key: 'spring', name: '봄', emoji: '🌸', months: [3, 4, 5],
      leaf: 0x4f8f42, field: '#86a85e', grass: '#93b56d',
      warm: 1.02, cloth: 1.04,
      wx: { clear: 1.2, cloud: 1, rain: 1.1, wind: 1.2, fog: 1.1, snow: 0.05 },
      note: '잎이 돋고 바람이 잦다'
    },
    summer: {
      key: 'summer', name: '여름', emoji: '🌿', months: [6, 7, 8],
      leaf: 0x2f6a30, field: '#4f8c46', grass: '#6ea45c',
      warm: 1.0, cloth: 1.08,
      wx: { clear: 1.1, cloud: 1.1, rain: 1.9, wind: 0.8, fog: 0.7, snow: 0 },
      note: '짙게 우거지고 비가 잦다'
    },
    autumn: {
      key: 'autumn', name: '가을', emoji: '🍂', months: [9, 10, 11],
      leaf: 0xa87a2e, field: '#b39a4e', grass: '#a8a45f',
      warm: 1.06, cloth: 1.0,
      wx: { clear: 1.3, cloud: 1, rain: 0.7, wind: 1.3, fog: 1.4, snow: 0.1 },
      note: '잎이 물들고 안개가 잦다'
    },
    winter: {
      key: 'winter', name: '겨울', emoji: '❄️', months: [12, 1, 2],
      leaf: 0x5f6a5c, field: '#9aa39b', grass: '#a9b0a8',
      warm: 0.96, cloth: 0.86,
      wx: { clear: 0.9, cloud: 1.2, rain: 0.2, wind: 1.1, fog: 0.9, snow: 2.6 },
      note: '잎이 지고 눈이 온다'
    }
  };

  var ORDER = ['spring', 'summer', 'autumn', 'winter'];

  /* 진단·데모가 계절을 붙들어 둘 때 — 게임에서는 늘 null 이다 */
  var forced = null;
  function force(key) { forced = SEASONS[key] ? key : null; return at(); }

  /** 그 시각의 계절 — 달만 본다. 순수 함수다 */
  function at(ms) {
    if (forced) { return SEASONS[forced]; }
    var m = new Date(ms === undefined ? Date.now() : ms).getMonth() + 1;
    for (var i = 0; i < ORDER.length; i++) {
      if (SEASONS[ORDER[i]].months.indexOf(m) >= 0) { return SEASONS[ORDER[i]]; }
    }
    return SEASONS.spring;
  }

  /** 지금 계절 — 꺼져 있으면 여름 값을 준다(사철 없던 예전 그림이 그것이다) */
  function now(ms) { return on() ? at(ms) : SEASONS.summer; }

  /* ── 물어보는 문들 ────────────────────────────────────
   * 저마다 **없어도 도는** 값을 낸다. 계절을 끄면 다들 예전 값을 받는다.
   */

  /** 나뭇잎 색 (0xRRGGBB) — `world3d` 가 나무를 세울 때 */
  function leaf(base) {
    if (!on()) { return base; }
    var s = now();
    return TINT() >= 1 ? s.leaf : mix(base, s.leaf, TINT());
  }

  /** 지면에 칠할 땅 색 — 논밭·들만 계절을 탄다(길·마을·산·강은 사철 같다) */
  function landColor(kind, base) {
    if (!on()) { return base; }
    var s = now();
    if (kind === 'farm') { return s.field; }
    if (kind === 'grass') { return s.grass; }
    if (kind === 'forest') { return hexStr(leaf(0x5c7f4e)); }
    return base;
  }

  /** 주민 옷 밝기 보정 — 겨울에는 짙고 두껍다 */
  function cloth(hex) {
    if (!on()) { return hex; }
    var k = now().cloth;
    var n = parseInt(String(hex).replace('#', ''), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function f(v) { return Math.max(0, Math.min(255, Math.round(v * k))); }
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }

  /** 천후 가중치 — `weather.js` 가 물어본다. **여기만 판정에 닿는다** */
  function weatherWeight(key, ms) {
    if (!weatherOn()) { return 1; }
    var w = at(ms).wx;
    return w[key] === undefined ? 1 : w[key];
  }

  /** 사건 가중치 보정 — 약초는 봄·여름에 잦고 겨울에는 드물다 */
  function eventWeight(id) {
    if (!on()) { return 1; }
    var k = now().key;
    if (id === 'rare_herb') {
      return k === 'spring' ? 1.8 : (k === 'summer' ? 1.4 : (k === 'winter' ? 0.25 : 1));
    }
    if (id === 'lost_child') { return k === 'winter' ? 1.4 : 1; }   // 겨울 산은 위험하다
    if (id === 'road_merchant') { return k === 'winter' ? 0.6 : 1; }
    return 1;
  }

  /* ── 잔심부름 ────────────────────────────────────────── */

  function mix(a, b, k) {
    k = k < 0 ? 0 : (k > 1 ? 1 : k);
    var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    var br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    return (Math.round(ar + (br - ar) * k) << 16) |
           (Math.round(ag + (bg - ag) * k) << 8) |
            Math.round(ab + (bb - ab) * k);
  }
  function hexStr(n) { return '#' + ((1 << 24) + n).toString(16).slice(1); }

  function stats(ms) {
    var s = now(ms);
    return { on: on(), weather: weatherOn(), key: s.key, name: s.name,
             emoji: s.emoji, note: s.note, forced: forced };
  }

  global.DG = global.DG || {};
  global.DG.season = {
    SEASONS: SEASONS, ORDER: ORDER,
    on: on, weatherOn: weatherOn,
    /* 값을 내는 함수 — 다 순수하다 */
    at: at, now: now, leaf: leaf, landColor: landColor, cloth: cloth,
    weatherWeight: weatherWeight, eventWeight: eventWeight,
    force: force, stats: stats
  };
})(window);
