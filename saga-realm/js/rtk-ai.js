/**
 * 삼국지 — 다른 세력의 한 달
 * ---------------------------------------------------------------
 * 사람이 "다음 달" 을 누르면 나머지 열두 세력이 여기서 제 명령을 쓴다.
 *
 * **규칙을 새로 만들지 않는다.** 이 파일은 사람이 누를 수 있는 것만 부른다 —
 * `rtk.order` · `rtk.setGov` · `war.march` · `diplo.envoy` · `diplo.plot`.
 * AI 전용 지름길을 하나 만들면 그 순간 판정이 두 벌이 되어 균형을 못 본다.
 *
 * 성향(creed)은 data-force.js 가 정한다.
 *   aggressive  이길 만하면 친다 (조조 · 손책 · 여포 · 원술 · 공손찬)
 *   balanced    살림을 먼저 채우고 틈이 나면 친다
 *   turtle      웬만하면 지킨다 (유표 · 유장 · 장로 · 공융)
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var CD = global.DG.cityData;
  var FD = global.DG.forceData;

  /**
   * 칠지 말지는 **war.forecast()** 가 정한다 — 진짜 전투식을 사본에 그대로 굴린다.
   * 성향이 정하는 것은 딱 하나, **얼마나 잃어도 받아들이는가**(lossCap)뿐이다.
   *
   * 어림식(병력 배수 문턱)으로 재던 때는 성벽 초깃값만 보고 판단해
   * 120개월에 다섯 번밖에 안 싸웠다. 판정을 두 벌 두지 않는다.
   */
  var CREED = {
    aggressive: { lossCap: 0.70, keepGold: 400,  plotRate: 0.25, envoyRate: 0.10 },
    balanced:   { lossCap: 0.50, keepGold: 900,  plotRate: 0.18, envoyRate: 0.20 },
    turtle:     { lossCap: 0.30, keepGold: 1500, plotRate: 0.10, envoyRate: 0.30 }
  };

  function creedOf(forceId) {
    var f = FD.force(forceId);
    return CREED[(f && f.creed) || 'balanced'] || CREED.balanced;
  }

  /* ── 이 성에 지금 가장 아쉬운 것 ────────────────────────── */

  /**
   * 명령 하나를 고른다.
   * 순서가 곧 우선순위다 — 위에 있는 조건이 먼저 걸린다.
   * (치안을 맨 앞에 둔 것은, 치안이 무너지면 나머지 살림이 통째로 새기 때문이다)
   */
  function pickOrder(cityId, forceId) {
    var R = global.DG.rtk;
    var c = R.city(cityId);
    var d = CD.find(cityId);
    var f = R.force(forceId);
    var keep = creedOf(forceId).keepGold;

    if (c.sec < 45) { return 'sec'; }
    /* 수확이 두 번 남았는데 군량이 한 달치도 없으면 논밭부터 */
    if (c.food < R.eatOf(cityId) * 3 && c.agri < R.capOf(cityId, 'agri')) { return 'agri'; }
    if (f.gold < keep && c.comm < R.capOf(cityId, 'comm')) { return 'comm'; }
    if (c.wall < c.maxWall * 0.7) { return 'wall'; }
    if (c.troops < c.pop * 0.035 && f.gold > keep) { return 'draft'; }
    if (c.train < 70) { return 'train'; }
    if (c.agri < R.capOf(cityId, 'agri') * 0.7) { return 'agri'; }
    if (c.comm < R.capOf(cityId, 'comm') * 0.7) { return 'comm'; }
    if (c.tech < 400) { return 'tech'; }
    if (c.sec < 85) { return 'sec'; }
    return 'agri';
  }

  /** 그 명령에 가장 맞는 사람을 고른다 — 자질이 맞아야 성과가 난다 */
  function bestFor(list, orderKey) {
    var R = global.DG.rtk, off = global.DG.off;
    var o = R.orderByKey(orderKey);
    if (!o || !list.length) { return null; }
    var best = null, bv = -1;
    for (var i = 0; i < list.length; i++) {
      var v = off.stats(list[i].id)[o.stat] || 0;
      if (v > bv) { bv = v; best = list[i]; }
    }
    return best;
  }

  /* ── 한 세력의 한 달 ──────────────────────────────────── */

  function runForce(forceId) {
    var R = global.DG.rtk;
    var off = global.DG.off;
    var cities = R.citiesOf(forceId);
    if (!cities.length) { return null; }
    var cr = creedOf(forceId);
    var acted = { orders: 0, march: null, plot: null, envoy: null };
    var i;

    /* 1) 태수가 비었으면 앉힌다 */
    for (i = 0; i < cities.length; i++) {
      var c = R.city(cities[i]);
      if (c.gov && off.rec(c.gov).city === cities[i] && off.rec(c.gov).force === forceId) { continue; }
      var here = off.atCity(cities[i], forceId);
      R.setGov(cities[i], here.length ? here[0].id : null);
    }

    /* 2) 싸울 만한가 — 살림보다 먼저 본다(장수를 명령에 다 써 버리면 못 친다) */
    acted.march = tryWar(forceId, cr);

    /* 3) 계략 · 외교 — 각각 한 달에 한 번까지 */
    if (Math.random() < cr.plotRate) { acted.plot = tryPlot(forceId); }
    if (Math.random() < cr.envoyRate) { acted.envoy = tryEnvoy(forceId); }

    /* 4) 남은 장수는 내정 */
    for (i = 0; i < cities.length; i++) {
      var ready = R.readyAt(cities[i]);
      for (var g = 0; g < ready.length; g++) {
        var key = pickOrder(cities[i], forceId);
        var who = bestFor(R.readyAt(cities[i]), key);
        if (!who) { break; }
        var res = R.order(cities[i], who.id, key);
        if (!res.ok) { break; }              // 금이 떨어졌다 — 이 세력은 여기까지
        acted.orders++;
      }
    }
    return acted;
  }

  /** 그 성과 맞닿은 적 가운데 가장 센 수비 */
  function threatAt(forceId, cityId) {
    var R = global.DG.rtk;
    var adj = CD.find(cityId).adj, worst = 0, i;
    for (i = 0; i < adj.length; i++) {
      var c = R.city(adj[i]);
      if (c && c.force && c.force !== forceId && c.troops > worst) { worst = c.troops; }
    }
    return worst;
  }

  /**
   * 이 성이 이웃 싸움에 내줄 수 있는 병력.
   *
   * 절반까지 — **다만 제 성이 비면 못 준다.** 이 단서가 없으면 AI 가 뒷마당을
   * 텅 비운 채 전군을 몰아쳐 첫해에 판이 쓸려 나간다(가만히 둔 유비가 한 달,
   * 조조가 넉 달 만에 멸망했다). 실제로 그렇게 두고 열세 세력을 재 봤다.
   */
  function spareOf(forceId, cityId) {
    var R = global.DG.rtk;
    var c = R.city(cityId);
    if (!c || c.force !== forceId) { return 0; }
    var keep = Math.round(threatAt(forceId, cityId) * 0.6);
    return Math.max(0, Math.min(Math.floor(c.troops * 0.5), c.troops - keep));
  }

  /** 이웃한 우리 성에서 끌어올 수 있는 병력 */
  function gatherable(forceId, cityId) {
    var adj = CD.find(cityId).adj, sum = 0, i;
    for (i = 0; i < adj.length; i++) { sum += spareOf(forceId, adj[i]); }
    return sum;
  }

  /** 실제로 끌어온다 — 사람이 쓰는 war.transfer 를 그대로 쓴다 */
  function gather(forceId, cityId) {
    var R = global.DG.rtk;
    var adj = CD.find(cityId).adj, moved = 0, i;
    for (i = 0; i < adj.length; i++) {
      var t = spareOf(forceId, adj[i]);
      if (t < 200) { continue; }
      var f = Math.floor(R.city(adj[i]).food * 0.3);
      if (global.DG.war.transfer(adj[i], cityId, t, f).ok) { moved += t; }
    }
    return moved;
  }

  /**
   * 이길 만한 이웃 성이 있으면 친다.
   * **한 성의 병력만으로는 성벽을 못 넘는다** — 이웃한 우리 성에서 먼저 끌어모은다.
   * 이 단계를 빼면 어느 세력도 영영 출진하지 못한다.
   */
  function tryWar(forceId, cr) {
    var R = global.DG.rtk;
    var off = global.DG.off;
    var war = global.DG.war;
    var cities = R.citiesOf(forceId);
    var best = null, i, j;

    for (i = 0; i < cities.length; i++) {
      var from = R.city(cities[i]);
      var ready = R.readyAt(cities[i]);
      if (!ready.length) { continue; }
      var lead = off.sortByPower(ready).slice(0, 3).map(function (h) { return h.id; });
      var send = Math.floor((from.troops + gatherable(forceId, cities[i])) * 0.85);
      if (send < 800) { continue; }

      var adj = CD.find(cities[i]).adj;
      for (j = 0; j < adj.length; j++) {
        var to = R.city(adj[j]);
        if (!to || !to.force || to.force === forceId) { continue; }
        if (global.DG.diplo.blocked(forceId, to.force)) { continue; }
        var f = war.forecast(cities[i], adj[j], lead, send);
        if (!f) { continue; }
        if (f.lossA > send * cr.lossCap) { continue; }   // 이겨도 너무 비싸면 참는다
        /* 이 달에 못 떨어뜨려도 **성벽을 크게 깎으면** 친다.
           한 달 안에 끝날 싸움만 고르게 두면 공성이라는 것이 판에서 사라진다 */
        var grind = !f.won && f.wallTo < to.wall * 0.4 && f.lossA < send * cr.lossCap * 0.7;
        if (!f.won && !grind) { continue; }
        var gain = (f.won ? 1 : 0.35) - f.lossA / Math.max(1, send);
        if (!best || gain > best.gain) {
          best = { from: cities[i], to: adj[j], gain: gain, lead: lead, send: send };
        }
      }
    }
    if (!best) { return null; }

    gather(forceId, best.from);
    /* 끌어모은 뒤의 실제 병력으로 다시 센다 — 예상보다 적게 모였을 수 있다.
       **다른 적을 앞에 둔 성은 다 비우지 않는다** — 나가서 이기고 뒤를 뺏기면 헛일이다 */
    var staging = R.city(best.from);
    var keepHome = Math.round(threatAt(forceId, best.from) * 0.5);
    var real = Math.min(Math.floor(staging.troops * 0.85),
                        Math.max(0, staging.troops - keepHome));
    if (real < 800) { return null; }
    var chk = war.canMarch(best.from, best.to, real);
    if (!chk.ok) { return null; }
    for (var k = 0; k < best.lead.length; k++) { off.rec(best.lead[k]).done = true; }
    var rep = war.march(best.from, best.to, best.lead, real);
    return rep && rep.ok ? { from: best.from, to: best.to, won: rep.won, send: real } : null;
  }

  function tryPlot(forceId) {
    var R = global.DG.rtk;
    var off = global.DG.off;
    var D = global.DG.diplo;
    var f = R.force(forceId);
    var cities = R.citiesOf(forceId), i, j;
    /* 지력이 가장 높은, 아직 안 쓴 사람이 건다 */
    var who = null, wv = -1;
    for (i = 0; i < cities.length; i++) {
      var ready = R.readyAt(cities[i]);
      for (j = 0; j < ready.length; j++) {
        var w = off.stats(ready[j].id).wisdom;
        if (w > wv) { wv = w; who = ready[j]; }
      }
    }
    if (!who || wv < 70) { return null; }

    /* 맞닿은 적 성 하나 */
    var targets = [];
    for (i = 0; i < cities.length; i++) {
      var adj = CD.find(cities[i]).adj;
      for (j = 0; j < adj.length; j++) {
        var c = R.city(adj[j]);
        if (c && c.force && c.force !== forceId && !D.blocked(forceId, c.force)) { targets.push(adj[j]); }
      }
    }
    if (!targets.length) { return null; }
    var target = targets[Math.floor(Math.random() * targets.length)];
    var kinds = ['discord', 'rumor', 'fire'];
    var kind = kinds[Math.floor(Math.random() * kinds.length)];
    if (f.gold < D.plotByKey(kind).gold * 2) { return null; }
    var res = D.plot(kind, who.id, target, null);
    return res.ok ? { kind: kind, city: target, done: res.done } : null;
  }

  function tryEnvoy(forceId) {
    var R = global.DG.rtk;
    var off = global.DG.off;
    var D = global.DG.diplo;
    var f = R.force(forceId);
    var nb = D.neighbours(forceId).filter(function (x) { return !D.blocked(forceId, x); });
    if (!nb.length) { return null; }
    /* 나보다 센 이웃에게 화친을 청한다 — 약한 쪽이 시간을 사는 것이 외교다 */
    var mine = R.summary(forceId).cities;
    nb.sort(function (a, b) { return R.summary(b).cities - R.summary(a).cities; });
    var to = nb[0];
    if (R.summary(to).cities <= mine) { return null; }
    if (f.gold < 400) { return null; }

    var who = null, wv = -1, cities = R.citiesOf(forceId), i, j;
    for (i = 0; i < cities.length; i++) {
      var ready = R.readyAt(cities[i]);
      for (j = 0; j < ready.length; j++) {
        var w = off.stats(ready[j].id).wisdom;
        if (w > wv) { wv = w; who = ready[j]; }
      }
    }
    if (!who) { return null; }
    var res = D.envoy('truce', to, who.id, 150);
    return res.ok ? { to: to, done: res.done } : null;
  }

  /** 사람 것을 뺀 모든 세력이 한 달을 산다 */
  function runAll() {
    var R = global.DG.rtk;
    var ids = R.liveForces(), out = [], i;
    for (i = 0; i < ids.length; i++) {
      if (ids[i] === R.me()) { continue; }
      if (R.state().result) { break; }
      out.push({ force: ids[i], did: runForce(ids[i]) });
    }
    return out;
  }

  global.DG = global.DG || {};
  global.DG.rtkAI = {
    CREED: CREED, creedOf: creedOf,
    pickOrder: pickOrder, bestFor: bestFor,
    runForce: runForce, threatAt: threatAt, spareOf: spareOf,
    gatherable: gatherable, gather: gather, tryWar: tryWar, tryPlot: tryPlot, tryEnvoy: tryEnvoy,
    runAll: runAll
  };
})(window);
