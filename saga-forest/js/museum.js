/**
 * 사고(史庫) — 원작의 박물관
 * ---------------------------------------------------------------
 * 실록을 보관하던 그 이름을 빌렸다. 하는 일은 원작의 박물관과 같다.
 *
 * **도감과 사고는 다른 것이다.**
 *   도감(`village.caught`)  한 번이라도 손에 넣은 것 — 팔아도 지워지지 않는다
 *   사고(`village.donated`) **들여 놓은 것** — 가방에서 한 점이 실제로 빠져나간다
 *
 * 원작이 그 둘을 갈라 둔 까닭이 있다. 잡는 것과 남기는 것은 다른 결심이다.
 * 값나가는 것을 팔지 않고 들여 놓는 데에 값이 있어야 한다 — 그래서 기증은
 * 금이 아니라 **명성**을 준다.
 *
 * 기증은 **사고 앞에서만** 받는다. 어디서나 되면 건물이 마을에 있을 까닭이 없다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  function V() { return global.DG.village; }
  function VD() { return global.DG.villageData; }

  function st() { return V().state(); }

  /** 사고에 이미 들인 것인가 */
  function donated(key) { return !!st().donated[key]; }

  /** 사고 곁에 서 있나 — 기증은 여기서만 받는다 */
  function near() {
    var raw = V().raw(), p = raw.player;
    if (V().indoors()) { return false; }
    for (var i = 0; i < raw.props.length; i++) {
      if (raw.props[i].kind !== 'museum') { continue; }
      return Math.hypot(raw.props[i].x - p.x, raw.props[i].y - p.y) < V().REACH * 1.8;
    }
    return false;
  }

  function canDonate(key) {
    var it = VD().item(key);
    if (!it) { return { ok: false, why: '없는 물건입니다' }; }
    if (donated(key)) { return { ok: false, why: '이미 사고에 있습니다' }; }
    if (V().bagCount(key) < 1) { return { ok: false, why: '가방에 없습니다' }; }
    if (!near()) { return { ok: false, why: '사고(🏛️) 앞으로 가야 받습니다' }; }
    return { ok: true };
  }

  function donate(key) {
    var chk = canDonate(key);
    if (!chk.ok) { return { kind: 'no', text: chk.why }; }
    var s = st(), it = VD().item(key);
    var before = count().done;

    s.bag[key] -= 1;
    s.donated[key] = true;
    var fame = 20 + Math.floor(it.price / 10);
    core.save.player.fame += fame;
    core.gainFeat(3, '기증');
    core.gainExp(12);
    core.log('🏛️ ' + it.emoji + ' ' + it.name + ' 을(를) 사고에 들였다 — 🎖️ +' + fame, 'good');
    core.emit('changed');
    core.persist();

    var after = count().done;
    return { kind: 'donate', text: '🏛️ ' + it.name + ' 을(를) 들였다 — 🎖️ +' + fame,
             grew: grade(after).name !== grade(before).name };
  }

  /** 갈래별 현황 */
  function byCat() {
    var out = [], cats = VD().MUSEUM_CATS, i, j;
    for (i = 0; i < cats.length; i++) {
      var all = VD().ITEMS[cats[i].key] || [];
      var done = 0;
      for (j = 0; j < all.length; j++) { if (donated(all[j].key)) { done++; } }
      out.push({ cat: cats[i], all: all, done: done, total: all.length });
    }
    return out;
  }

  function count() {
    var list = byCat(), done = 0, total = 0;
    for (var i = 0; i < list.length; i++) { done += list[i].done; total += list[i].total; }
    return { done: done, total: total };
  }

  function grade(n) {
    var G = VD().MUSEUM_GRADES, g = G[0];
    if (n === undefined) { n = count().done; }
    for (var i = 0; i < G.length; i++) { if (n >= G[i].at) { g = G[i]; } }
    return g;
  }

  /** 지금 가방에 있는 것 중 아직 사고에 없는 것 */
  function offerable() {
    var list = V().bagList(), out = [];
    for (var i = 0; i < list.length; i++) {
      var it = list[i].item;
      if (VD().MUSEUM_CATS.filter(function (c) { return c.key === it.cat; }).length === 0) { continue; }
      if (donated(it.key)) { continue; }
      out.push(list[i]);
    }
    return out;
  }

  function status() {
    var c = count();
    return { done: c.done, total: c.total, grade: grade(c.done).name,
             near: near(), cats: byCat(), offer: offerable() };
  }

  global.DG = global.DG || {};
  global.DG.museum = {
    donated: donated, near: near, canDonate: canDonate, donate: donate,
    byCat: byCat, count: count, grade: grade, offerable: offerable, status: status
  };
})(window);
