/**
 * 비석(碑石) 순례 — 실제 위치 수집 (PLAN §5 ⑤)
 * ---------------------------------------------------------------
 * 실제 위경도를 200m 격자로 나누고, 칸마다 해시 12% 로 비석 하나가 선다(결정론 —
 * 어느 기기·어느 날이나 같은 자리). 15m 안에 들어서면 **저절로 발견**된다(누를 것이 없다).
 * 사건 빈도를 올리지 않고도 "걷는 이유"를 채우는, 판정에 한 줄도 안 닿는 수집이다 —
 * 발견 보상은 丹 3·공적 5 뿐이다.
 *
 * 권역(한 9·일 9·중 9 = 27 대표점 — 가장 가까운 대표점이 그 비석의 권역)마다 비석
 * **열 개를 모으면 그 권역의 인물이 초대장**(천거장 `letter.js` 의 `st:<권역>` 등급 — 행낭에
 * 넣고 걸으면 봉이 떨어진다, genchar ★4)으로 온다. 행낭이 가득이면 받을 몫이 남고 다음에
 * 다시 시도한다.
 *
 * **숨은 자리**(48절 "가 보기 전까지 안 뜬다"): 미니맵엔 발견한 것만, 오버월드엔 발견한 것 +
 * 봉수대에 불을 올린 권역 반경의 **미발견 비석이 흐릿하게**(`beacon.revealedNear` 가 이어 붙임).
 * 세이브 `save.stelae{격자키:at}`(상한 2000) · `save.stelaeInv{권역:받은 초대장 수}`.
 *
 * 위경도로만 자리를 갖고 그때그때 `world.worldToLatLng()` 로 비교한다 — 원점(origin)이
 * GPS 첫 수신 때 바뀌므로 월드 좌표로 굳히지 않는다(beacon.js 와 같은 요령).
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  var GRID_M = 200;
  var HIT_RADIUS = 15;            // m — 이 안이면 발견
  var REGION_GOAL = 10;           // 권역 비석 열 = 초대장 하나
  var CAP = 2000;                 // 세이브 상한
  var REWARD = { dan: 3, feat: 5 };
  var M_LAT = 111320;
  var TICK_SEC = 0.8;             // 발견 검사 간격(걸음이 느려 충분하다)
  var RETRY_SEC = 12;             // 행낭이 차서 못 받은 초대장 재시도

  function chance() { return core.tuned('stela.chance', 0.12); }

  /* world.js·beacon.js 와 같은 요령 — core.hash2 는 0~0.5 만 돌려준다 */
  function h01(a, b) { return Math.min(0.999999, core.hash2(a, b) * 2); }

  function allRegions() {
    var RK = global.DG.regionKr, RJ = global.DG.regionJp, RC = global.DG.regionCn;
    return (RK ? RK.REGIONS : []).concat(RJ ? RJ.REGIONS : []).concat(RC ? RC.REGIONS : []);
  }

  /** 가장 가까운 대표점 = 이 자리의 권역(world.js `genRegionAt` 과 같은 방식) */
  function regionOfLatLng(lat, lng) {
    var all = allRegions(), cosLat = Math.cos(lat * Math.PI / 180), best = null, bestD = Infinity;
    for (var i = 0; i < all.length; i++) {
      var dLat = lat - all[i].center.lat, dLng = (lng - all[i].center.lng) * cosLat;
      var d = dLat * dLat + dLng * dLng;
      if (d < bestD) { bestD = d; best = all[i]; }
    }
    return best;
  }

  function regionByCode(code) {
    var all = allRegions();
    for (var i = 0; i < all.length; i++) { if (all[i].code === code) { return all[i]; } }
    return null;
  }

  /* ── 격자 ─────────────────────────────────────────────── */

  var D_LAT = GRID_M / M_LAT;
  function rowOf(lat) { return Math.floor(lat / D_LAT); }
  /** 위도 행마다 경도 폭이 다르다(위도가 높을수록 좁다) — 행 중앙 위도로 200m 를 맞춘다 */
  function colStep(row) {
    return GRID_M / (M_LAT * Math.cos((row + 0.5) * D_LAT * Math.PI / 180));
  }

  /** 칸 안의 자리(칸 가장자리 10% 는 피한다) — 비석이 있든 없든 계산은 같다 */
  function posOf(row, col) {
    var jy = h01(row * 7 + 3, col * 11 + 4), jx = h01(row * 19 + 1, col * 23 + 9);
    return { lat: (row + 0.1 + 0.8 * jy) * D_LAT, lng: (col + 0.1 + 0.8 * jx) * colStep(row) };
  }

  /** 이 칸에 비석이 서는가 — 서면 {key,row,col,lat,lng}, 아니면 null */
  function cell(row, col) {
    if (h01(row * 13 + 5, col * 17 + 7) >= chance()) { return null; }
    var p = posOf(row, col);
    return { key: row + ':' + col, row: row, col: col, lat: p.lat, lng: p.lng };
  }

  function parseKey(key) {
    var i = String(key).indexOf(':');
    return { row: parseInt(key.slice(0, i), 10), col: parseInt(key.slice(i + 1), 10) };
  }

  /** (lat,lng) 에서 radius m 안의 비석들 — 가까운 순, 각 {stela, dist} */
  function within(lat, lng, radius) {
    var mPerLng = M_LAT * Math.cos(lat * Math.PI / 180), out = [];
    var r0 = rowOf(lat - radius / M_LAT), r1 = rowOf(lat + radius / M_LAT);
    for (var r = r0; r <= r1; r++) {
      var step = colStep(r);
      var c0 = Math.floor((lng - radius / mPerLng) / step), c1 = Math.floor((lng + radius / mPerLng) / step);
      for (var c = c0; c <= c1; c++) {
        var s = cell(r, c);
        if (!s) { continue; }
        var d = Math.hypot((s.lat - lat) * M_LAT, (s.lng - lng) * mPerLng);
        if (d <= radius) { out.push({ stela: s, dist: d }); }
      }
    }
    out.sort(function (a, b) { return a.dist - b.dist; });
    return out;
  }

  /* ── 세이브 ───────────────────────────────────────────── */

  function peek() { return core.save.stelae || {}; }
  function book() {
    if (!core.save.stelae) { core.save.stelae = {}; }
    return core.save.stelae;
  }
  function found(key) { return !!peek()[key]; }
  function count() { return Object.keys(peek()).length; }

  var regionCache = {};
  function regionOfKey(key) {
    if (regionCache[key]) { return regionCache[key]; }
    var k = parseKey(key), p = posOf(k.row, k.col);
    var r = regionOfLatLng(p.lat, p.lng);
    if (r) { regionCache[key] = r.code; }
    return r ? r.code : null;
  }

  /** 권역별 발견 수 {코드: n} */
  function regionCounts() {
    var out = {}, ks = Object.keys(peek());
    for (var i = 0; i < ks.length; i++) {
      var code = regionOfKey(ks[i]);
      if (code) { out[code] = (out[code] || 0) + 1; }
    }
    return out;
  }
  function regionCount(code) { return regionCounts()[code] || 0; }

  function given() { return core.save.stelaeInv || {}; }

  /** 아직 못 받은 초대장 수 {코드: n} — 열 개마다 하나에서 이미 받은 수를 뺀 것 */
  function owed() {
    var cs = regionCounts(), g = given(), out = {};
    Object.keys(cs).forEach(function (code) {
      var n = Math.floor(cs[code] / REGION_GOAL) - (g[code] || 0);
      if (n > 0) { out[code] = n; }
    });
    return out;
  }

  /** 받을 몫이 있으면 천거장 가방으로 넣는다(가방이 차면 남긴다). 받은 수를 낸다 */
  function grantInvites() {
    var L = global.DG.letter, od = owed(), n = 0;
    if (!L) { return 0; }
    Object.keys(od).forEach(function (code) {
      for (var i = 0; i < od[code]; i++) {
        var g = L.give('st:' + code);
        if (!g) { return; }                                  // 가방이 찼다 — 다음에
        if (!core.save.stelaeInv) { core.save.stelaeInv = {}; }
        core.save.stelaeInv[code] = (core.save.stelaeInv[code] || 0) + 1;
        n++;
        core.log('📜 ' + g.name + ' 을 받았다 — 행낭에 넣고 걸으면 봉이 떨어진다', 'good');
        core.emit('toast', '📜 ' + g.name);
      }
    });
    if (n) { core.emit('changed'); core.persist(); }
    return n;
  }

  /** 발견 — 한 번만. 상한(2000)을 넘으면 기록하지 않는다 */
  function discover(s) {
    var bk = peek();
    if (!s || bk[s.key]) { return { ok: false, reason: 'already' }; }
    if (count() >= CAP) { return { ok: false, reason: 'cap' }; }
    book()[s.key] = Date.now();
    var region = regionOfLatLng(s.lat, s.lng);
    var GR = global.DG.growth;
    if (GR) { GR.addDust(REWARD.dan); }
    core.gainFeat(REWARD.feat, '비석');
    var n = region ? regionCount(region.code) : 0;
    var X = global.DG.codex;
    if (region && X && X.discover) { X.discover('stele', region.code, { name: region.name + ' 비문' }); }
    core.log('🪦 비석을 찾았다 — ' + (region ? region.name : '어딘가') + ' ' + (n % REGION_GOAL || REGION_GOAL) +
      '/' + REGION_GOAL + ' · 丹 +' + REWARD.dan + ' · 공적 +' + REWARD.feat, 'good');
    core.emit('toast', '🪦 비석 발견' + (region ? ' — ' + region.name + ' ' + n : ''));
    if (global.DG.daily) { global.DG.daily.progress('stele'); }
    grantInvites();
    core.emit('stela:found', { key: s.key, region: region ? region.code : null, n: n });
    core.emit('changed');
    core.persist();
    return { ok: true, region: region, n: n, reward: REWARD };
  }

  /* ── 지금 위치 ────────────────────────────────────────── */

  function here() {
    var W = global.DG.world, pos = core.save.player.pos;
    return W && W.worldToLatLng ? W.worldToLatLng(pos.x, pos.y) : null;
  }

  var acc = 0, retry = 0;
  /** 매 프레임(game.js loop) — 15m 안의 안 찾은 비석을 발견한다 */
  function tick(dt) {
    acc += dt; retry += dt;
    if (retry >= RETRY_SEC) { retry = 0; if (Object.keys(owed()).length) { grantInvites(); } }
    if (acc < TICK_SEC) { return 0; }
    acc = 0;
    var ll = here();
    if (!ll) { return 0; }
    var near = within(ll.lat, ll.lng, HIT_RADIUS), n = 0;
    for (var i = 0; i < near.length; i++) {
      if (!found(near[i].stela.key) && discover(near[i].stela).ok) { n++; }
    }
    return n;
  }

  /* ── 지도에 뜨는 것(48절: 발견한 것만 / 봉수대 반경의 미발견은 흐릿하게) ─── */

  function worldOf(s) {
    var W = global.DG.world;
    return W ? W.latLngToWorld(s.lat, s.lng) : { x: 0, y: 0 };
  }

  /** 미니맵 — 발견한 비석만, 가까운 것(radius m) */
  function foundNear(radius) {
    var ll = here(), out = [];
    if (!ll) { return out; }
    var near = within(ll.lat, ll.lng, radius);
    for (var i = 0; i < near.length; i++) {
      if (!found(near[i].stela.key)) { continue; }
      var w = worldOf(near[i].stela);
      out.push({ x: w.x, y: w.y, key: near[i].stela.key });
    }
    return out;
  }

  /** 봉수대(월드 좌표 c)의 밝힌 반경 — 발견한 것은 'stele', 미발견은 'stele-faint'(흐릿) */
  function revealedWithin(c, radius) {
    var W = global.DG.world;
    if (!W || !W.worldToLatLng) { return []; }
    var ll = W.worldToLatLng(c.x, c.y), out = [];
    var near = within(ll.lat, ll.lng, radius);
    for (var i = 0; i < near.length; i++) {
      var s = near[i].stela, w = worldOf(s);
      out.push({ type: found(s.key) ? 'stele' : 'stele-faint', x: w.x, y: w.y, name: '비석', key: s.key });
    }
    return out;
  }

  /** 발견한 모든 비석의 위경도 — 오버월드가 한 번에 그린다 */
  function foundAll() {
    var ks = Object.keys(peek()), out = [];
    for (var i = 0; i < ks.length; i++) {
      var k = parseKey(ks[i]), p = posOf(k.row, k.col);
      out.push({ lat: p.lat, lng: p.lng, key: ks[i] });
    }
    return out;
  }

  /** 도감 '비문' 갈래 — 권역 27 줄, 힌트는 n/10 (분모는 늘 27 권역) */
  function regionList() {
    var cs = regionCounts();
    return allRegions().map(function (r) {
      return { id: r.code, name: r.name + ' 비문', hint: (cs[r.code] || 0) + '/' + REGION_GOAL };
    });
  }

  global.DG = global.DG || {};
  global.DG.stela = {
    GRID_M: GRID_M, HIT_RADIUS: HIT_RADIUS, REGION_GOAL: REGION_GOAL, CAP: CAP, REWARD: REWARD,
    /* 값을 내는 함수 — 순수하다. 세이브를 읽기만 한다 */
    chance: chance, cell: cell, posOf: posOf, within: within, regionOfLatLng: regionOfLatLng,
    regionByCode: regionByCode, found: found, count: count, regionCounts: regionCounts,
    regionCount: regionCount, owed: owed, foundNear: foundNear, revealedWithin: revealedWithin,
    foundAll: foundAll, regionList: regionList, here: here,
    /* 세이브가 바뀌는 곳은 여기 셋 */
    discover: discover, grantInvites: grantInvites, tick: tick,
    _resetForTest: function () { regionCache = {}; acc = 0; retry = 0; }
  };
})(window);
