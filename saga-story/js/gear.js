/**
 * 장비 — 줍고, 끼고, 주문서로 올리고, 상점에서 사고판다
 * ---------------------------------------------------------------
 * 이 파일은 **규칙만** 안다. 화면은 ui.js 가, 사냥터에서 떨구는 일은 side.js 가 한다.
 *
 * 세이브
 *   save.gear = {
 *     uid   : 다음에 줄 번호
 *     inv   : [ {uid, key, up, left, atk, def, hp} … ]   가방 (24칸)
 *     equip : { 부위: uid }                              낀 것
 *   }
 *   save.scrolls = { 주문서key: 개수 }
 *
 * 한 물건의 최종 값 = 데이터의 기본값 + 주문서로 붙은 값(atk/def/hp).
 * `up` 은 주문서를 **시도한** 횟수가 아니라 **붙은** 횟수다(원작 표기가 그렇다).
 * `left` 는 남은 업횟 — 실패해도 이것만 닳는다. 물건은 터지지 않는다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var GD = global.DG.gearData;

  var BAG = 24;                 // 가방 칸

  function st() {
    var s = core.save;
    if (!s.gear) { s.gear = { uid: 1, inv: [], equip: {} }; }
    if (!s.gear.inv) { s.gear.inv = []; }
    if (!s.gear.equip) { s.gear.equip = {}; }
    if (!s.gear.uid) { s.gear.uid = 1; }
    if (!s.scrolls) { s.scrolls = {}; }
    return s.gear;
  }

  /* ── 물건 ─────────────────────────────────────────────── */

  /** 데이터 한 줄로 실물 하나를 찍어 낸다 */
  function make(key) {
    var def = GD.find(key);
    if (!def) { return null; }
    var g = st();
    return { uid: g.uid++, key: key, up: 0, left: def.up, atk: 0, def: 0, hp: 0 };
  }

  function defOf(it) { return it ? GD.find(it.key) : null; }

  /** 기본값 + 붙은 값 */
  function statsOf(it) {
    var d = defOf(it);
    if (!d) { return { atk: 0, def: 0, hp: 0 }; }
    return { atk: d.atk + (it.atk || 0), def: d.def + (it.def || 0), hp: d.hp + (it.hp || 0) };
  }

  function nameOf(it) {
    var d = defOf(it);
    if (!d) { return '?'; }
    return d.name + (it.up ? ' (+' + it.up + ')' : '');
  }

  function byUid(uid) {
    var g = st();
    for (var i = 0; i < g.inv.length; i++) { if (g.inv[i].uid === uid) { return g.inv[i]; } }
    return null;
  }

  function inv() { return st().inv.slice(); }

  function bagLeft() { return BAG - st().inv.length; }

  /** 가방에 넣는다 — 자리가 없으면 거절한다(원작의 그 답답함이 규칙이다) */
  function put(it) {
    if (!it) { return false; }
    var g = st();
    if (g.inv.length >= BAG) {
      core.emit('toast', '🎒 가방이 가득 찼습니다');
      return false;
    }
    g.inv.push(it);
    core.emit('changed');
    return true;
  }

  function drop(uid) {
    var g = st(), i;
    for (i = 0; i < g.inv.length; i++) {
      if (g.inv[i].uid === uid) { g.inv.splice(i, 1); core.emit('changed'); return true; }
    }
    return false;
  }

  /* ── 끼기 ─────────────────────────────────────────────── */

  function equipped() {
    var g = st(), out = {}, k;
    for (k in g.equip) {
      if (Object.prototype.hasOwnProperty.call(g.equip, k)) {
        var it = byUid(g.equip[k]);
        if (it) { out[k] = it; }
      }
    }
    return out;
  }

  function isEquipped(uid) {
    var g = st(), k;
    for (k in g.equip) {
      if (Object.prototype.hasOwnProperty.call(g.equip, k) && g.equip[k] === uid) { return true; }
    }
    return false;
  }

  /** 낀다 — 요구 수준을 못 채우면 거절한다 */
  function equip(uid) {
    var it = byUid(uid), d = defOf(it);
    if (!d) { return false; }
    if (core.save.player.level < d.need) {
      core.emit('toast', '⚠️ Lv.' + d.need + ' 부터 낄 수 있습니다');
      return false;
    }
    st().equip[d.slot] = uid;
    core.emit('changed');
    core.persist();
    return true;
  }

  function unequip(slotKey) {
    var g = st();
    if (!g.equip[slotKey]) { return false; }
    delete g.equip[slotKey];
    core.emit('changed');
    core.persist();
    return true;
  }

  /**
   * 낀 것의 합 — side.power() 가 이걸 얹는다.
   * 요구 수준을 못 채우게 된 물건(승급 전 세이브 등)은 세지 않는다.
   */
  function bonus() {
    var e = equipped(), sum = { atk: 0, def: 0, hp: 0 }, k;
    for (k in e) {
      if (!Object.prototype.hasOwnProperty.call(e, k)) { continue; }
      var d = defOf(e[k]);
      if (!d || core.save.player.level < d.need) { continue; }
      var s = statsOf(e[k]);
      sum.atk += s.atk; sum.def += s.def; sum.hp += s.hp;
    }
    return sum;
  }

  /**
   * 방어 → 덜 맞는 비율. 방어가 아무리 높아도 **6할까지만** 막는다
   * (넘게 두면 후반에 아무것도 안 아파진다).
   */
  function cut(def) {
    if (!def || def <= 0) { return 0; }
    return Math.min(0.6, def / (def + 40));
  }

  /* ── 주문서 ───────────────────────────────────────────── */

  function scrollCount(key) { st(); return core.save.scrolls[key] || 0; }

  function addScroll(key, n) {
    st();
    core.save.scrolls[key] = (core.save.scrolls[key] || 0) + (n || 1);
    core.emit('changed');
    return core.save.scrolls[key];
  }

  /** 주문서를 물건에 쓴다 — 실패해도 물건은 남고 업횟만 닳는다 */
  function apply(uid, scrollKey) {
    var it = byUid(uid), d = defOf(it), sc = GD.scroll(scrollKey);
    if (!it || !d || !sc) { return { ok: false, why: '없는 물건입니다' }; }
    if (scrollCount(scrollKey) <= 0) { return { ok: false, why: '주문서가 없습니다' }; }
    var kind = d.slot === 'weapon' ? 'weapon' : 'armor';
    if (sc['for'] !== kind) {
      return { ok: false, why: sc['for'] === 'weapon' ? '무기에만 씁니다' : '방어구에만 씁니다' };
    }
    if (it.left <= 0) { return { ok: false, why: '더 올릴 수 없습니다 (업횟 0)' }; }

    core.save.scrolls[scrollKey] -= 1;
    it.left -= 1;
    var hit = Math.random() < sc.rate;
    if (hit) {
      it.up += 1;
      if (sc.atk) { it.atk = (it.atk || 0) + sc.atk; }
      if (sc.def) { it.def = (it.def || 0) + sc.def; }
      if (sc.hp) { it.hp = (it.hp || 0) + sc.hp; }
      core.log('📜 ' + sc.name + ' 이(가) ' + d.name + ' 에 붙었다 (+' + it.up + ')', 'good');
      core.emit('toast', '✨ 성공! ' + nameOf(it));
    } else {
      core.log('📜 ' + sc.name + ' 이(가) ' + d.name + ' 에서 흩어졌다 (업횟 ' + it.left + ')', 'bad');
      core.emit('toast', '💨 실패 — 업횟 ' + it.left + ' 남음');
    }
    core.emit('changed');
    core.persist();
    return { ok: true, hit: hit, left: it.left, up: it.up };
  }

  /* ── 상점 ─────────────────────────────────────────────── */

  var SELL_RATE = 0.3;          // 판 값은 산 값의 3할 (원작도 헐값이다)

  /** 지금 살 수 있는 것 — 레벨이 오르면 목록이 는다 */
  function shopList() {
    var lv = core.save.player.level;
    var gears = GD.GEAR.filter(function (g) { return g.need <= lv + 2; });
    return { gears: gears, scrolls: GD.SCROLLS.slice(), potion: { name: '탕약', price: 90 } };
  }

  function buyGear(key) {
    var d = GD.find(key);
    if (!d) { return false; }
    if (core.save.player.gold < d.price) { core.emit('toast', '🪙 금이 모자랍니다'); return false; }
    if (bagLeft() <= 0) { core.emit('toast', '🎒 가방이 가득 찼습니다'); return false; }
    core.save.player.gold -= d.price;
    put(make(key));
    core.log('🏪 ' + d.name + ' 을(를) 샀다 · 🪙 -' + core.fmt(d.price), 'info');
    core.persist();
    return true;
  }

  function buyScroll(key) {
    var sc = GD.scroll(key);
    if (!sc) { return false; }
    if (core.save.player.gold < sc.price) { core.emit('toast', '🪙 금이 모자랍니다'); return false; }
    core.save.player.gold -= sc.price;
    addScroll(key, 1);
    core.persist();
    return true;
  }

  function buyPotion(n) {
    n = n || 1;
    var price = shopList().potion.price * n;
    if (core.save.player.gold < price) { core.emit('toast', '🪙 금이 모자랍니다'); return false; }
    core.save.player.gold -= price;
    global.DG.side.state().potions += n;
    core.emit('changed');
    core.persist();
    return true;
  }

  /** 판다 — 끼고 있는 것은 못 판다 */
  function sell(uid) {
    var it = byUid(uid), d = defOf(it);
    if (!it || !d) { return false; }
    if (isEquipped(uid)) { core.emit('toast', '⚠️ 끼고 있는 것은 못 팝니다'); return false; }
    var got = Math.max(1, Math.round(d.price * SELL_RATE));
    core.save.player.gold += got;
    drop(uid);
    core.log('🏪 ' + nameOf(it) + ' 을(를) 팔았다 · 🪙 +' + core.fmt(got), 'info');
    core.persist();
    return got;
  }

  /* ── 사냥터에서 떨어지는 것 ───────────────────────────── */

  /**
   * 적 하나가 무엇을 떨굴지 — side.js 가 부른다.
   * 장비는 드물게(보스는 자주), 주문서는 그보다 조금 더 자주 나온다.
   */
  function rollDrop(lv, boss) {
    var r = Math.random();
    var gearRate = boss ? 0.9 : 0.035;
    var scrollRate = boss ? 0.7 : 0.05;
    if (r < gearRate) {
      var pool = GD.poolFor(lv);
      return { kind: 'gear', key: core.pick(pool).key };
    }
    if (r < gearRate + scrollRate) {
      /* 낮은 확률 주문서는 더 드물게 나온다 */
      var pool2 = GD.SCROLLS.filter(function (s) { return Math.random() < (s.rate < 0.5 ? 0.35 : 1); });
      var sc = core.pick(pool2.length ? pool2 : GD.SCROLLS);
      return { kind: 'scroll', key: sc.key };
    }
    return null;
  }

  global.DG = global.DG || {};
  global.DG.gear = {
    BAG: BAG, SELL_RATE: SELL_RATE,
    state: st, make: make, put: put, drop: drop, inv: inv, bagLeft: bagLeft,
    byUid: byUid, defOf: defOf, statsOf: statsOf, nameOf: nameOf,
    equip: equip, unequip: unequip, equipped: equipped, isEquipped: isEquipped,
    bonus: bonus, cut: cut,
    scrollCount: scrollCount, addScroll: addScroll, apply: apply,
    shopList: shopList, buyGear: buyGear, buyScroll: buyScroll, buyPotion: buyPotion, sell: sell,
    rollDrop: rollDrop
  };
})(window);
