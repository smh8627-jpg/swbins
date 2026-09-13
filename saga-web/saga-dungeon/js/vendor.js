/**
 * 행상(行商)과 투전(投錢) — 원작의 상인과 도박
 * ===============================================================
 * 원작(디아블로2)에서 마을 상인이 하는 일은 셋이다.
 *   1) 물건을 판다        — 재고는 마을을 드나들 때마다 새로 온다
 *   2) 내 물건을 산다      — 판 것은 **되살 수 있다**(buy-back)
 *   3) 도박을 붙인다       — 무엇이 나올지 모르는 물건을 값만 보고 산다
 *
 * 셋 다 "금(金)을 쓸 데" 를 만드는 장치다. 이 판은 여태 금을 쌓기만 하고
 * 쓸 데가 없었다 — 던전에서 나오면 금이 늘고, 그걸로 할 일이 없었다.
 *
 * 원작에서 그대로 지킨 규칙 셋
 *   · **재고는 회차가 끝날 때마다 새로 온다.** 마음에 안 들면 한 판 더 돌고 온다
 *     (원작에서 마을을 나갔다 들어오는 그 동작이다). 새로 고치는 버튼은 없다
 *   · **판 물건은 그 값 그대로 되살 수 있다.** 실수로 판 것을 돌려받는 길이고,
 *     되사기 목록도 회차가 끝나면 함께 지워진다
 *   · **투전은 부위만 알려 준다.** 이름도 등급도 사고 나서야 나온다.
 *     값이 비싼 대신 좋은 등급이 훨씬 잘 나온다 — 원작 도박의 그 감각이다
 *
 * 이 판에서만 다른 것
 *   · 마을이 없으니 **본영(本營)** 에 온다
 *   · 재고 등급은 **명품(2)까지**로 막았다. 보물·전설은 던전과 투전에서만 나온다
 *     — 상인이 다 팔면 내려갈 이유가 옅어진다
 *
 * 값 매기기는 item.price() 하나만 쓴다(정본). 여기서 배수만 얹는다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  function it() { return global.DG.item; }

  /** 사는 값은 판 값의 세 배가 조금 넘는다 — 원작도 상인에게 사면 비싸다 */
  var BUY_MUL = 3.2;
  var STOCK_N = 6;                 // 재고 칸
  var GAMBLE_N = 5;                // 투전 칸
  var BACK_MAX = 8;                // 되사기 목록 상한
  var STOCK_TIER_MAX = 2;          // 재고 등급 상한 (명품)

  /**
   * 투전 등급 저울 — 상품·양품·명품·보물·전설.
   * 던전 드랍(weight 100/52/22/7/1.6)보다 위쪽이 훨씬 두껍다.
   * 그래서 값이 비싸도 걸어 볼 만하다. **탐색 보정(findPct)은 안 탄다** —
   * 도박은 운이지 장비발이 아니다.
   */
  var GAMBLE_W = [10, 44, 30, 13, 3];

  /* ── 세이브 칸 ────────────────────────────────────────────
   * 옛 세이브엔 이 칸이 없다. 읽는 쪽마다 확인하지 않도록 st() 가 채운다
   * (auto.js 가 같은 방식이다).
   */
  function st() {
    var s = core.save;
    if (!s.vendor) { s.vendor = {}; }
    var v = s.vendor;
    if (!v.stock) { v.stock = []; }
    if (!v.back) { v.back = []; }
    if (!v.gamble) { v.gamble = []; }
    if (!v.stamp) { v.stamp = 0; }
    return v;
  }

  /** 물건 수준 — 내려가 본 깊이를 따른다 (원작의 지역 레벨 자리다) */
  function ilvl() {
    var best = (core.save.dungeon && core.save.dungeon.best) || 1;
    return Math.max(1, best);
  }

  function buyPrice(g) { return Math.round(it().price(g) * BUY_MUL); }

  /** 투전 한 칸의 값 — 부위와 수준만 보고 매긴다 (무엇이 나올지는 아무도 모른다) */
  function gamblePrice(slot, lv) {
    var base = slot === 'charm' ? 120 : 150;
    return Math.round(base * (1 + lv * 0.55));
  }

  /* ── 재고 ─────────────────────────────────────────────── */

  function rollStock() {
    var v = st(), lv = ilvl(), i;
    /* 등급 저울은 도감(data-item)의 것을 그대로 쓰되 **상한까지만** 자른다.
       Math.min 으로 눌러 담으면 잘린 몫이 전부 명품에 얹혀 상인이 명품 가게가 된다. */
    var D = global.DG.itemData, w = [];
    for (i = 0; i <= STOCK_TIER_MAX; i++) { w.push(D.TIERS[i].weight); }
    v.stock = [];
    for (i = 0; i < STOCK_N; i++) {
      /* 상인이 파는 것은 **확인된 채**로 온다 — 원작도 그렇다 */
      v.stock.push(it().roll(lv, { tier: pickW(w), unid: false }));
    }
  }

  function rollGamble() {
    var v = st(), lv = ilvl(), i;
    var D = global.DG.itemData;
    v.gamble = [];
    for (i = 0; i < GAMBLE_N; i++) {
      var base = core.pick(D.BASES);
      v.gamble.push({ base: base.key, lv: lv, price: gamblePrice(base.slot, lv) });
    }
  }

  function pickW(w) {
    var total = 0, i;
    for (i = 0; i < w.length; i++) { total += w[i]; }
    var r = Math.random() * total;
    for (i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) { return i; } }
    return 0;
  }

  /**
   * 새 물건이 온다. 회차가 끝날 때마다 한 번 (원작의 "마을을 드나든다").
   * 되사기 목록도 같이 지워진다 — 원작도 마을을 나가면 사라진다.
   */
  function refresh() {
    var v = st();
    rollStock();
    rollGamble();
    v.back = [];
    v.stamp = Date.now();
    core.emit('changed');
  }

  /** 아직 한 번도 안 왔으면 그때 채운다 (첫 세이브·옛 세이브) */
  function ensure() {
    var v = st();
    if (!v.stock.length && !v.gamble.length) { refresh(); }
    return v;
  }

  /* ── 사고팔기 ─────────────────────────────────────────── */

  function stock() { return ensure().stock; }
  function backlog() { return ensure().back; }
  function gambleList() { return ensure().gamble; }

  /**
   * 재고에서 하나 산다.
   * @return {ok, reason} reason: 'gold' 돈이 모자람 · 'bag' 가방이 참 · 'gone' 없는 물건
   */
  function buy(uid) {
    var v = st(), i;
    for (i = 0; i < v.stock.length; i++) {
      if (v.stock[i].uid !== uid) { continue; }
      var g = v.stock[i];
      var cost = buyPrice(g);
      if (core.save.player.gold < cost) { return { ok: false, reason: 'gold' }; }
      /* 가방이 차 있으면 **사지 않는다.** item.add 는 넘치면 팔아 금으로 바꾸는데,
         산 물건이 곧바로 금으로 되돌아가면 산 사람 눈에는 돈만 사라진 꼴이다 */
      if (it().bag().length >= it().bagCap()) { return { ok: false, reason: 'bag' }; }
      core.save.player.gold -= cost;
      it().add(g);
      v.stock.splice(i, 1);
      if (global.DG.sfx) { global.DG.sfx.play('coin'); }
      core.log('🧺 ' + it().name(g) + ' 을(를) 샀다 · 금 -' + core.fmt(cost), 'info');
      core.emit('changed');
      return { ok: true, item: g, cost: cost };
    }
    return { ok: false, reason: 'gone' };
  }

  /**
   * 가방에서 하나 판다. **되사기 목록에 남는다** (원작의 buy-back).
   * 값은 item.sell() 이 정하는 그대로다 — 파는 값의 정본은 거기 하나다.
   */
  function sell(uid) {
    var g = it().find(uid);
    if (!g || g.lock) { return { ok: false, reason: g ? 'lock' : 'gone' }; }
    var got = it().sell(uid);
    if (!got) { return { ok: false, reason: 'lock' }; }
    var v = st();
    v.back.unshift({ item: g, price: got });
    while (v.back.length > BACK_MAX) { v.back.pop(); }
    if (global.DG.sfx) { global.DG.sfx.play('coin'); }
    core.emit('changed');
    return { ok: true, gold: got };
  }

  /** 되산다 — **판 값 그대로**. 원작도 되살 때 웃돈을 안 붙인다 */
  function buyBack(uid) {
    var v = st(), i;
    for (i = 0; i < v.back.length; i++) {
      if (v.back[i].item.uid !== uid) { continue; }
      var row = v.back[i];
      if (core.save.player.gold < row.price) { return { ok: false, reason: 'gold' }; }
      if (it().bag().length >= it().bagCap()) { return { ok: false, reason: 'bag' }; }
      core.save.player.gold -= row.price;
      it().add(row.item);
      v.back.splice(i, 1);
      core.emit('changed');
      return { ok: true, item: row.item };
    }
    return { ok: false, reason: 'gone' };
  }

  /* ── 단약(丹藥) ───────────────────────────────────────────
   * 원작의 상인은 **물약이 떨어지지 않는다.** 장비는 재고가 있고 팔리면 없어지지만,
   * 물약은 늘 있다 — 마을에 들르는 이유의 절반이 그것이다.
   * 그래서 재고 목록에 넣지 않고 그때그때 만들어 준다(회차 갱신도 안 탄다).
   * 파는 등급은 깊이를 탄다 — 얕은 곳에서 대(大)를 사서 내려가면 아래가 시시해진다.
   */

  function potionsForSale() {
    var P = global.DG.potion;
    if (!P) { return []; }
    var lv = ilvl();
    var cap = lv >= 14 ? 2 : (lv >= 6 ? 1 : 0);
    var out = [], i, g;
    for (i = 0; i < P.KINDS.length; i++) {
      for (g = 0; g <= cap; g++) {
        out.push({ kind: P.KINDS[i].key, g: g, price: P.price(g, lv) });
      }
    }
    return out;
  }

  /** 감정서 값 — 싸다. 이건 막는 관문이 아니라 **거쳐 가는 자리**여야 한다 */
  function scrollPrice() { return 30 + Math.round(ilvl() * 4); }

  function buyScroll(n) {
    n = n || 1;
    var cost = scrollPrice() * n;
    if (core.save.player.gold < cost) { return { ok: false, reason: 'gold' }; }
    core.save.player.gold -= cost;
    it().addScroll(n);
    core.emit('changed');
    return { ok: true, cost: cost, n: n };
  }

  /** 한 알 산다 — **벨트에 자리가 없으면 안 판다**(금만 사라지면 안 된다) */
  function buyPotion(kind, g) {
    var P = global.DG.potion;
    if (!P) { return { ok: false, reason: 'gone' }; }
    var lv = ilvl();
    var cost = P.price(g, lv);
    if (core.save.player.gold < cost) { return { ok: false, reason: 'gold' }; }
    var r = P.add(kind, g);
    if (!r.ok) { return { ok: false, reason: 'belt' }; }
    core.save.player.gold -= cost;
    core.emit('changed');
    return { ok: true, cost: cost, slot: r.slot };
  }

  /* ── 환원(還元) — 원작의 무예 되돌리기 ────────────────────
   * 원작에서도 스킬을 잘못 찍으면 되돌릴 길이 있고, 공짜가 아니다.
   * 값은 **찍은 점수만큼** 오른다 — 많이 찍었으면 많이 낸다.
   */
  function respecCost(heroId) {
    var SK = global.DG.skill;
    if (!SK) { return 0; }
    var spent = SK.pointsSpent(heroId);
    if (!spent) { return 0; }
    return Math.round(140 * spent * (1 + ilvl() * 0.04));
  }

  /* ── 투전(投錢) ───────────────────────────────────────── */

  /**
   * 한 칸에 돈을 건다. **무엇이 나올지는 사고 나서 안다.**
   * 산 칸은 그 자리에서 다시 굴린다 (원작의 도박 창이 그렇게 다시 찬다).
   */
  function gamble(idx) {
    var v = st();
    var row = v.gamble[idx];
    if (!row) { return { ok: false, reason: 'gone' }; }
    if (core.save.player.gold < row.price) { return { ok: false, reason: 'gold' }; }
    if (it().bag().length >= it().bagCap()) { return { ok: false, reason: 'bag' }; }

    core.save.player.gold -= row.price;
    var t = pickW(GAMBLE_W);
    /* 투전으로 산 것도 **확인된 채**다 — 원작의 도박이 그렇다.
       무엇이 나올지 모르는 것과 옵션을 모르는 것은 다른 이야기다 */
    var g = it().roll(row.lv, { base: row.base, tier: t, unid: false });
    it().add(g);

    /* 산 칸은 새 물건으로 갈린다 */
    var D = global.DG.itemData;
    var nb = core.pick(D.BASES);
    v.gamble[idx] = { base: nb.key, lv: ilvl(), price: gamblePrice(nb.slot, ilvl()) };

    var tier = it().tierOf(g);
    core.log('🎲 투전 · ' + tier.name + ' ' + it().name(g) +
             ' · 금 -' + core.fmt(row.price), t >= 3 ? 'good' : 'info');
    core.emit('changed');
    return { ok: true, item: g, tier: t, cost: row.price };
  }

  /* ── 배선 ─────────────────────────────────────────────── */

  var wired = false;
  function init() {
    st();
    /* 회차가 끝나면 새 물건이 온다 — 죽어서 끝났어도 마찬가지다
       (원작에서도 마을로 돌아오면 재고가 갈린다).
       **한 번만 건다** — 재시작(↺)으로 boot 이 다시 돌면 두 번 걸려
       회차마다 재고가 두 번 갈린다(무료 새로고침이 되어 버린다). */
    if (wired) { return; }
    wired = true;
    core.on('dungeon:end', function () { refresh(); });
  }

  global.DG = global.DG || {};
  global.DG.vendor = {
    init: init, st: st, refresh: refresh, ensure: ensure,
    stock: stock, backlog: backlog, gambleList: gambleList,
    buy: buy, sell: sell, buyBack: buyBack, gamble: gamble,
    potionsForSale: potionsForSale, buyPotion: buyPotion,
    scrollPrice: scrollPrice, buyScroll: buyScroll,
    respecCost: respecCost,
    buyPrice: buyPrice, gamblePrice: gamblePrice, ilvl: ilvl,
    GAMBLE_W: GAMBLE_W, STOCK_N: STOCK_N, GAMBLE_N: GAMBLE_N,
    BUY_MUL: BUY_MUL, STOCK_TIER_MAX: STOCK_TIER_MAX
  };
})(window);
