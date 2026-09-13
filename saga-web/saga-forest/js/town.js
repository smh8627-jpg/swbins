/**
 * 마을 — 이름 · 깃발 · 계절 행사
 * ---------------------------------------------------------------
 * 원작은 시작할 때 마을 이름을 묻고, 마을 기를 손수 그리게 하고, 철마다 하루짜리
 * 잔치를 연다. 마을이 "내 마을" 이 되는 것은 그 셋에서 온다.
 *
 *   **이름** 첫 실행 때 하나 뽑아 두고, 게시판(📋)에서 언제든 바꾼다
 *   **깃발** 바탕·무늬·무늬색 셋을 고른다. 깃대(🚩)에 걸리고 게시판에도 뜬다
 *            — 점을 찍는 도트 편집기는 이 판에 맞지 않는다. 고르는 것으로 충분하다
 *   **행사** 양력으로 고정한 여덟 날. 그날은 어떤 갈래가 비싸게 팔리고,
 *            밤하늘이나 나무가 달라진다
 *
 * 행사는 **날짜만 본다.** 세이브에 남길 것이 없다 — 그날이면 그날이다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  function V() { return global.DG.village; }
  function VD() { return global.DG.villageData; }

  /* ── 세이브 자리 ──────────────────────────────────────── */

  function st() {
    var s = V().state();
    if (!s.town) { s.town = { name: '', flag: null }; }
    if (!s.town.name) { s.town.name = pickName(); }
    if (!s.town.flag) {
      s.town.flag = { bg: 'white', fg: 'black', sym: 'circle' };
    }
    return s.town;
  }

  /** 마을 씨앗으로 이름을 뽑는다 — 같은 마을이면 늘 같은 이름이 나온다 */
  function pickName() {
    var names = VD().TOWN_NAMES;
    var seed = V().state().seed || 1;
    return names[Math.floor(core.hash2(seed % 977, seed % 613 + 7) * names.length) % names.length];
  }

  function name() { return st().name; }

  function setName(n) {
    n = String(n || '').trim().slice(0, 8);
    if (!n) { return { kind: 'no', text: '이름을 적어 주세요' }; }
    var old = st().name;
    st().name = n;
    core.log('🏳️ 마을 이름을 ' + old + ' 에서 ' + n + ' 으로 바꿨다', 'info');
    core.emit('changed');
    core.persist();
    return { kind: 'name', text: '🏳️ ' + n + ' — 마을 이름을 바꿨습니다' };
  }

  /* ── 깃발 ─────────────────────────────────────────────── */

  function flag() { return st().flag; }

  function flagBg() {
    var l = VD().FLAG_BGS.filter(function (x) { return x.key === flag().bg; });
    return l[0] || VD().FLAG_BGS[0];
  }
  function flagFg() {
    var l = VD().FLAG_FGS.filter(function (x) { return x.key === flag().fg; });
    return l[0] || VD().FLAG_FGS[0];
  }
  function flagSym() {
    var l = VD().FLAG_SYMS.filter(function (x) { return x.key === flag().sym; });
    return l[0] || VD().FLAG_SYMS[0];
  }

  /** @param {'bg'|'fg'|'sym'} part */
  function setFlag(part, key) {
    var f = flag();
    if (['bg', 'fg', 'sym'].indexOf(part) < 0) { return { kind: 'no', text: '없는 칸입니다' }; }
    var list = part === 'bg' ? VD().FLAG_BGS : part === 'fg' ? VD().FLAG_FGS : VD().FLAG_SYMS;
    if (list.filter(function (x) { return x.key === key; }).length === 0) {
      return { kind: 'no', text: '없는 것입니다' };
    }
    f[part] = key;
    core.emit('changed');
    core.persist();
    return { kind: 'flag', text: '🏳️ 깃발을 바꿨습니다' };
  }

  /* ── 행사 ─────────────────────────────────────────────── */

  function event() { return VD().eventOf(); }
  function next() { return VD().nextEventOf(); }

  /** 오늘의 하늘 — 행사와 같은 자리다. 날짜만 보고 세이브에 남기지 않는다 */
  function weather() { return VD().weather(); }
  function raining() { return weather().key === 'rain'; }

  /* ── 별똥별과 소원 ────────────────────────────────────────
   * 밤하늘에 이따금 별이 흐른다. 그때 **손에 닿는 것이 없는 채로** 손을 쓰면
   * 소원을 빈다. 다음 날 답례로 별조각이 온다 — 원작의 그 자리다.
   *
   * 흐르는 때와 자리는 **시각을 잘라 해시로** 정한다. 난수를 쓰지 않으니
   * 프레임 수와 무관하고(자가진단이 흔들리지 않는다) 세이브에 남길 것도 없다.
   */
  var STAR_SLOT = 38000;       // 이만큼마다 한 번 볼까 말까
  var STAR_AT = 4000;          // 그 안에서 흐르기 시작하는 때
  var STAR_MS = 2600;          // 흐르는 동안
  var WISH_MAX = core.tuned('star.wishMax', 3);   // 하룻밤에 이만큼까지

  function starSlot(now) { return Math.floor((now === undefined ? Date.now() : now) / STAR_SLOT); }

  /**
   * 지금 별이 흐르고 있나 — 밤이나 새벽, 그리고 **맑은 날에만**.
   * @returns {{slot, t, x, y}|null} t 는 0~1
   */
  var starOverride;            // 자가진단용 구멍 (같은 파일 안에서 부르는 자리라 밖에서 못 갈아 끼운다)

  function starNow(now) {
    if (starOverride !== undefined) { return starOverride; }
    var n = now === undefined ? Date.now() : now;
    var ph = VD().phaseOf(new Date().getHours()).key;
    if (ph !== 'night' && ph !== 'dawn') { return null; }
    if (weather().key !== 'clear') { return null; }
    var slot = starSlot(n);
    if (core.hash2(slot, slot % 883 + 3) > 0.5) { return null; }
    var off = n - slot * STAR_SLOT - STAR_AT;
    if (off < 0 || off > STAR_MS) { return null; }
    return { slot: slot, t: off / STAR_MS,
             x: 0.12 + core.hash2(slot * 7 + 1, 11) * 0.7,
             y: 0.05 + core.hash2(13, slot * 5 + 2) * 0.45 };
  }

  function wishState() {
    var s = V().state();
    if (!s.wish || s.wish.day !== s.day) { s.wish = { day: s.day, n: 0, last: -1 }; }
    return s.wish;
  }

  /** 소원을 빈다 */
  function wish() {
    var st2 = starNow();
    if (!st2) { return { kind: 'no', text: '지금은 흐르는 별이 없습니다' }; }
    var w = wishState();
    if (w.last === st2.slot) { return { kind: 'no', text: '그 별에는 이미 빌었습니다' }; }
    if (w.n >= WISH_MAX) {
      return { kind: 'no', text: '오늘 밤은 이미 ' + WISH_MAX + '번 빌었습니다' };
    }
    w.last = st2.slot;
    w.n += 1;
    core.gainFeat(2, '소원');
    core.log('🌠 흐르는 별에 소원을 빌었다 (' + w.n + '/' + WISH_MAX + ')', 'good');
    core.emit('changed');
    core.persist();
    return { kind: 'wish', text: '🌠 소원을 빌었다 — 답례는 내일 옵니다 (' +
             w.n + '/' + WISH_MAX + ')' };
  }

  function wishesOn(day) {
    var s = V().state();
    return (s.wish && s.wish.day === day) ? s.wish.n : 0;
  }

  /* ── 마을 평가 ────────────────────────────────────────────
   * 잡초를 뽑고 꽃을 심고 사고를 채운 만큼 오른다.
   * 평가가 높으면 **주민이 잘 떠나지 않는다**(mail.js 가 본다) — 그게 이 점수의 값이다.
   */
  function beauty() {
    var V2 = V(), raw = V2.raw();
    var flowers = 0, i;
    for (i = 0; i < raw.props.length; i++) {
      if (raw.props[i].kind === 'flower') { flowers++; }
    }
    var weeds = V2.weedCount();
    var planted = (V2.state().planted || []).length;
    var home = global.DG.home ? global.DG.home.score().total : 0;
    var museum = global.DG.museum ? global.DG.museum.count().done : 0;

    var score = 100 - weeds * 3 + Math.min(flowers, 30) + planted * 2 +
                Math.round(home / 4) + museum * 2;
    score = Math.max(0, score);

    var G = VD().BEAUTY_GRADES, g = G[0];
    for (i = 0; i < G.length; i++) { if (score >= G[i].at) { g = G[i]; } }
    return { score: score, grade: g.name, level: G.indexOf(g),
             weeds: weeds, flowers: flowers, planted: planted };
  }

  /** 오늘 이 갈래가 비싸게 팔리나 (없으면 1) */
  function priceMul(cat) {
    var e = event();
    if (!e || !e.up || e.up.cat !== cat) { return 1; }
    return e.up.mul;
  }

  function isNewYear() {
    var e = event();
    return !!(e && e.tag === 'newyear');
  }

  function status() {
    var e = event(), nx = next();
    return {
      name: name(), flag: flag(),
      bg: flagBg(), fg: flagFg(), sym: flagSym(),
      event: e, next: nx, weather: weather(),
      beauty: beauty(), star: starNow(), wish: wishState()
    };
  }

  global.DG = global.DG || {};
  global.DG.town = {
    state: st, name: name, setName: setName, pickName: pickName,
    flag: flag, setFlag: setFlag, flagBg: flagBg, flagFg: flagFg, flagSym: flagSym,
    event: event, next: next, priceMul: priceMul, isNewYear: isNewYear,
    weather: weather, raining: raining,
    starNow: starNow, wish: wish, wishesOn: wishesOn, beauty: beauty,
    /** 자가진단용 — 흐르는 별을 억지로 세운다. undefined 를 주면 다시 시각을 본다 */
    _setStar: function (v) { starOverride = v; },
    WISH_MAX: WISH_MAX, STAR_SLOT: STAR_SLOT, STAR_AT: STAR_AT, STAR_MS: STAR_MS,
    status: status
  };
})(window);
