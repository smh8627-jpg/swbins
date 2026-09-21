/**
 * 발견 밀도 격자 — 숲 고리 20타일 칸마다 "종류가 다른 일" 하나 (PLAN §5.5 ①)
 * ---------------------------------------------------------------
 * 숲 고리를 20×20 타일 칸으로 나눠, 이미 붙박이 사건(굴·폐허·우주기지·캠프·호수·폭포)이 있는 칸을 뺀
 * 나머지 칸마다 만남 하나를 해시로 심는다. 정령의 터(spirit.js)는 60곳이라 거의 모든 칸에 하나쯤
 * 있으므로 "사건 0 인 칸" 셈에서는 정령을 세지 않는다 — 그러면 아무것도 안 심겨 종류가 안 는다.
 *
 * 다섯 갈래(여섯째가 정령이다):
 *   chest   숲 보물상자   손을 쓰면 🪙. 절반은 하루 한 번 다시 차고, 절반은 한 번뿐이다(멀수록 큼)
 *   bottle  쪽지 병      한 번뿐. 짧은 글과 함께 가장 가까운 정령의 터가 어느 쪽인지 낙서로 적혀 있다
 *   node    빛나는 채집터  하루 한 번 다시 찬다. 바이옴별 드문 물건 하나
 *   herd    짐승 무리    그 바이옴 짐승 셋이 모여 있다(자리만 정한다 — 거동은 animal.js)
 *   camp    나그네 야영   🪙 을 내면 가장 가까운 안 만난 정령의 터 쪽을 알려 주고 미니맵에 원을 그려 준다
 *
 * 자리는 세이브 시드 해시라 같은 마을은 늘 같은 모습이고, 세이브에는 "연 것"(s.grid.opened)과 힌트만 남는다.
 * 야영(camp)은 숲 고리에 하나는 반드시 서게 한다(힌트를 살 곳이 없으면 안 되므로).
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  function V() { return global.DG.village; }
  function VD() { return global.DG.villageData; }

  var CELL = 20;                    // 격자 한 칸(타일)
  var TRIES = 60;                   // 칸 안에서 자리를 찾는 횟수
  var CLEAR = 1;                    // 만남 둘레에 숲 고리 사물이 안 서는 반경(타일)
  var HINT_R = 6;                   // 힌트 원 반경(타일)
  var HINT_JITTER = 4;              // 원 중심이 진짜 터에서 어긋나는 최대치(타일) — 원 안 어딘가에 있다
  var HINT_PRICE = core.tuned('grid.hintPrice', 250);
  var KINDS = ['chest', 'bottle', 'node', 'herd', 'camp'];
  var LORE = [
    '"이 숲엔 밤마다 작은 불빛이 앉았다 간다. 무서워 말고 따라가 보게."',
    '"바위 곁에 손을 대 보면 돌이 먼저 인사를 하더군."',
    '"꽃을 심으면 누가 다녀간 흔적이 남는다 — 정령이라 부르더라."',
    '"길을 잃었을 땐 가만히 서 있게. 숲이 먼저 길을 열어 준다네."',
    '"어둑 숲 나무들은 비가 오면 서로 이야기를 나눈다."',
    '"한 바퀴 돌고 나니 어디가 처음인지 모르겠더라."'
  ];
  var DIRS = ['동', '남동', '남', '남서', '서', '북서', '북', '북동'];   // y 가 아래로 자라므로 각도 0 = 동, +90° = 남
  var NODE_ITEMS = {
    green: ['orchid', 'silver'], meadow: ['orchid', 'sulwha'], dark: ['silver', 'copper'],
    mushroom: ['reishi', 'ginseng'], rocky: ['silver', 'copper']
  };

  /* ── 자리 ─────────────────────────────────────────────── */

  var cache = null;                 // { seed, m, list, block, byKey }

  function siteCells() {
    var v = V(), out = {}, lc = v.lakeCenter();
    var pts = [v.caveSpot(), v.ruinSpot(), v.spaceBaseSpot(), v.hamletSpot(), v.hamlet2Spot(), v.waterfallSpot(), lc];
    pts.forEach(function (p) {
      if (p) { out[Math.floor(p.tx / CELL) + ',' + Math.floor(p.ty / CELL)] = 1; }
    });
    return out;
  }

  function build() {
    var v = V(), s = v.state(), m = v.forestMargin(), W = v.W, H = v.H, SPI = global.DG.spirit;
    if (cache && cache.seed === s.seed && cache.m === m) { return cache; }
    var sites = siteCells(), list = [], k;
    var cxMin = Math.floor(-m / CELL), cxMax = Math.floor((W + m - 1) / CELL);
    var cyMin = Math.floor(-m / CELL), cyMax = Math.floor((H + m - 1) / CELL);
    var lo = -m + 3, hiX = W + m - 4, hiY = H + m - 4;
    var totalW = 0, cx, cy, t, scanned = 0;
    for (k = 0; k < KINDS.length; k++) { totalW += VD().ENCOUNTER_KINDS[KINDS[k]].w; }
    for (cy = cyMin; cy <= cyMax; cy++) {
      for (cx = cxMin; cx <= cxMax; cx++) {
        if (sites[cx + ',' + cy]) { continue; }
        var x0 = Math.max(cx * CELL, lo), x1 = Math.min(cx * CELL + CELL - 1, hiX);
        var y0 = Math.max(cy * CELL, lo), y1 = Math.min(cy * CELL + CELL - 1, hiY);
        if (x1 < x0 || y1 < y0) { continue; }
        scanned++;
        var r = core.hash2(cx * 47 + 5 + s.seed % 401, cy * 71 + 19) * totalW, kind = KINDS[0];
        for (k = 0; k < KINDS.length; k++) {
          r -= VD().ENCOUNTER_KINDS[KINDS[k]].w;
          if (r < 0) { kind = KINDS[k]; break; }
        }
        var spot = null;
        for (t = 0; t < TRIES && !spot; t++) {
          var tx = x0 + Math.floor(core.hash2(cx * 131 + t * 37 + s.seed % 577, cy * 89 + 11) * (x1 - x0 + 1));
          var ty = y0 + Math.floor(core.hash2(cx * 61 + 7, cy * 149 + t * 43 + s.seed % 463) * (y1 - y0 + 1));
          if (!v.ringSpotOk(tx, ty) || (SPI && SPI.blocked(tx, ty))) { continue; }
          /* 짐승 무리는 셋이 둘레에 흩어지므로 한 바이옴 칸 안(±2)에 있어야 "제 바이옴에만 선다" */
          if (kind === 'herd' && (v.biomeAt(tx - 2, ty - 2) !== v.biomeAt(tx + 2, ty + 2) ||
              v.biomeAt(tx - 2, ty + 2) !== v.biomeAt(tx + 2, ty - 2) || v.biomeAt(tx - 2, ty - 2) !== v.biomeAt(tx, ty))) { continue; }
          spot = { tx: tx, ty: ty };
        }
        if (!spot) { continue; }
        list.push({ key: cx + '_' + cy, cx: cx, cy: cy, tx: spot.tx, ty: spot.ty, kind: kind,
                    biome: v.biomeAt(spot.tx, spot.ty) });
      }
    }
    /* 야영이 하나도 안 뽑혔으면 마을에서 가장 가까운 칸을 야영으로 바꾼다 */
    if (list.length && !list.some(function (c) { return c.kind === 'camp'; })) {
      var best = null, bd = 1e9, mx = W / 2, my = H / 2;
      list.forEach(function (c) {
        var d = Math.hypot(c.tx - mx, c.ty - my);
        if (d < bd) { bd = d; best = c; }
      });
      best.kind = 'camp';
    }
    var block = {}, byKey = {}, dx, dy;
    list.forEach(function (c) {
      byKey[c.key] = c;
      c.dist = Math.max(0, Math.max(-c.tx, c.tx - (W - 1), -c.ty, c.ty - (H - 1)));   // 마을 밖 체비쇼프 거리
      c.daily = core.hash2(c.cx * 233 + 3, c.cy * 199 + s.seed % 311) < 0.5;
      c.reward = Math.round((120 + 9 * c.dist) * (c.daily ? 0.6 : 1));
      for (dy = -CLEAR; dy <= CLEAR; dy++) {
        for (dx = -CLEAR; dx <= CLEAR; dx++) { block[(c.tx + dx) + ',' + (c.ty + dy)] = 1; }
      }
    });
    cache = { seed: s.seed, m: m, list: list, block: block, byKey: byKey, scanned: scanned };
    return cache;
  }

  function cells() { return build().list; }
  /** 훑은 칸 수(붙박이 사건 칸·범위 밖 뺀 것) — 진단이 "빈 칸 ≤10%" 를 잰다 */
  function scanned() { return build().scanned; }
  /** 숲 고리 사물이 서면 안 되는 칸 — 만남 둘레 CLEAR 칸 */
  function blocked(tx, ty) { return !!build().block[tx + ',' + ty]; }
  /** 짐승 무리 — buildAnimals() 가 이 자리마다 짐승 셋을 세운다 */
  function herds() { return cells().filter(function (c) { return c.kind === 'herd'; }); }

  /* ── 세이브 ───────────────────────────────────────────── */

  function rec() { return V().state().grid || null; }
  function recMake() {
    var s = V().state();
    if (!s.grid) { s.grid = { opened: {}, hint: null }; }
    return s.grid;
  }
  /** 지금 손이 닿는가 — 한 번뿐인 것은 연 적이 없어야, 하루 한 번인 것은 오늘 안 열었어야 한다 */
  function avail(c) {
    if (c.kind === 'camp') { return true; }
    var r = rec(), d = r && r.opened[c.key];
    if (!d) { return true; }
    return (c.kind === 'node' || (c.kind === 'chest' && c.daily)) ? d !== V().state().day : false;
  }
  function openedCount() { var r = rec(); return r ? Object.keys(r.opened).length : 0; }

  /* ── 화면이 읽는 것 ───────────────────────────────────── */

  /** 숲 고리 사물 목록에 얹는 만남 표지 — 짐승 무리는 표지가 없다(짐승이 표지다) */
  function marks() {
    var T = V().TILE, out = [];
    cells().forEach(function (c) {
      if (c.kind === 'herd' || !avail(c)) { return; }
      var x = c.tx * T + T * 0.5, y = c.ty * T + T * 0.5;
      out.push({ id: 'gd' + c.key, kind: 'grid' + c.kind, x: x, y: y, grid: c.key });
      if (c.kind === 'camp') { out.push({ id: 'gdf' + c.key, kind: 'gridfire', x: x + T * 0.9, y: y + T * 0.2, deco: true }); }
    });
    return out;
  }

  /* ── 힌트 ─────────────────────────────────────────────── */

  /** (tx,ty) 에서 가장 가까운 안 만난 정령의 터 — 없으면 null */
  function nearestSpirit(tx, ty) {
    var SPI = global.DG.spirit, best = null, bd = 1e9;
    if (!SPI) { return null; }
    SPI.spots().forEach(function (sp) {
      if (SPI.isFound(sp.i)) { return; }
      var d = Math.hypot(sp.tx - tx, sp.ty - ty);
      if (d < bd) { bd = d; best = sp; }
    });
    return best ? { spot: best, dist: bd } : null;
  }
  function dirText(fx, fy, sp) {
    var a = Math.atan2(sp.ty - fy, sp.tx - fx);
    return DIRS[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
  }
  function distText(d) { return Math.max(5, Math.round(d / 5) * 5); }

  /** 사 둔 힌트 — 아직 못 만난 정령이면 { i, x, y, r } (픽셀), 아니면 null. 중심은 진짜 터에서 조금 어긋난다 */
  function hint() {
    var r = rec(), SPI = global.DG.spirit;
    if (!r || !r.hint || !SPI || SPI.isFound(r.hint.i)) { return null; }
    var sp = SPI.spots()[r.hint.i], T = V().TILE;
    if (!sp) { return null; }
    var jx = (core.hash2(sp.i * 19 + 3, 41) - 0.5) * 2 * HINT_JITTER, jy = (core.hash2(sp.i * 23 + 5, 43) - 0.5) * 2 * HINT_JITTER;
    return { i: sp.i, x: (sp.tx + 0.5 + jx) * T, y: (sp.ty + 0.5 + jy) * T, r: HINT_R * T, jitter: HINT_JITTER };
  }

  /* ── 손을 쓴다 ────────────────────────────────────────── */

  function finish(c, text, gained) {
    var r = recMake();
    r.opened[c.key] = V().state().day;
    core.emit('village:grid', { kind: c.kind, key: c.key, gold: gained || 0 });
    V().buildProps();
    core.emit('changed');
    core.persist();
    return text;
  }

  function openChest(c) {
    core.save.player.gold += c.reward;
    core.gainFeat(2, '상자');
    core.gainExp(8);
    core.log('🧰 숲 보물상자를 열었다 — 🪙 ' + core.fmt(c.reward) + (c.daily ? ' (내일 다시 찬다)' : ''), 'good');
    return { kind: 'treasure', text: '🧰 🪙 ' + core.fmt(c.reward) + (c.daily ? ' — 내일 다시 찬다' : '') };
  }

  function readBottle(c) {
    var gift = 40 + c.dist, near = nearestSpirit(c.tx, c.ty);
    var lore = LORE[Math.floor(core.hash2(c.cx * 17 + 9, c.cy * 13 + 4) * LORE.length) % LORE.length];
    var text = '🍾 쪽지 병 — ' + lore + ' 🪙 ' + core.fmt(gift);
    if (near) { text += ' · 뒷면 낙서: ' + dirText(c.tx, c.ty, near.spot) + '쪽 ' + distText(near.dist) + '칸쯤에 ✨'; }
    core.save.player.gold += gift;
    core.gainFeat(2, '쪽지');
    core.log(text, 'good');
    return { kind: 'note', text: text };
  }

  function digNode(c) {
    var s = V().state(), pool = NODE_ITEMS[c.biome] || NODE_ITEMS.green;
    var key = pool[Math.floor(core.hash2(c.cx * 29 + s.day, c.cy * 31 + 7) * pool.length) % pool.length];
    var it = VD().item(key);
    if (!it) { return { kind: 'empty', text: '💎 아무것도 없었다' }; }
    V().bagAdd(it, 1);
    core.gainFeat(2, '채집');
    core.gainExp(8);
    core.log('💎 빛나는 채집터에서 ' + it.emoji + ' ' + it.name + ' 을(를) 얻었다 (내일 다시 찬다)', 'good');
    return { kind: 'gather', text: it.emoji + ' ' + it.name + ' ×1 💎', item: it, streak: 0, bonus: false };
  }

  function talkCamp(c) {
    var v = V(), SPI = global.DG.spirit, r = recMake();
    var pl = v.raw().player, T = v.TILE, ptx = pl.x / T, pty = pl.y / T;
    var cur = hint();
    if (cur) {
      var sp0 = SPI.spots()[cur.i];
      return { kind: 'talk', name: '나그네', text: '🎒 아까 일러 준 그대로일세 — ' + dirText(ptx, pty, sp0) + '쪽 ' +
        distText(Math.hypot(sp0.tx - ptx, sp0.ty - pty)) + '칸쯤, 미니맵 금빛 원 안이야' };
    }
    var near = nearestSpirit(ptx, pty);
    if (!near) { return { kind: 'talk', name: '나그네', text: '🎒 이 숲의 정령은 자네가 다 만났더군. 더 알려 줄 게 없네' }; }
    if (core.save.player.gold < HINT_PRICE) {
      return { kind: 'no', name: '나그네', text: '🎒 정령의 터 쪽을 알려 주지 — 🪙 ' + core.fmt(HINT_PRICE) + ' 만 내게' };
    }
    core.save.player.gold -= HINT_PRICE;
    r.hint = { i: near.spot.i };
    var text = '🎒 ' + dirText(ptx, pty, near.spot) + '쪽 ' + distText(near.dist) + '칸쯤에 정령의 터가 있다네 — 미니맵에 금빛 원으로 그려 두었네 (🪙 ' +
      core.fmt(HINT_PRICE) + ')';
    core.log(text, 'good');
    core.emit('village:grid', { kind: 'hint', key: c.key, spirit: near.spot.i });
    core.emit('changed');
    core.persist();
    return { kind: 'talk', name: '나그네', text: text };
  }

  function interact(prop) {
    var c = build().byKey[prop && prop.grid];
    if (!c) { return null; }
    if (c.kind === 'camp') { return talkCamp(c); }
    if (!avail(c)) { return { kind: 'empty', text: '이미 다녀간 자리입니다' }; }
    var res, gained = 0;
    if (c.kind === 'chest') { res = openChest(c); gained = c.reward; }
    else if (c.kind === 'bottle') { res = readBottle(c); gained = 40 + c.dist; }
    else if (c.kind === 'node') { res = digNode(c); }
    else { return null; }
    finish(c, res.text, gained);
    return res;
  }

  /** 도감용 요약 — 칸 수·갈래별 수·연 수 */
  function summary() {
    var by = {}, list = cells();
    KINDS.forEach(function (k) { by[k] = 0; });
    list.forEach(function (c) { by[c.kind]++; });
    return { cells: list.length, byKind: by, opened: openedCount(), hint: hint() };
  }

  global.DG = global.DG || {};
  global.DG.grid = {
    CELL: CELL, CLEAR: CLEAR, HINT_R: HINT_R, HINT_JITTER: HINT_JITTER, HINT_PRICE: HINT_PRICE, KINDS: KINDS,
    cells: cells, scanned: scanned, blocked: blocked, herds: herds, marks: marks, avail: avail, hint: hint, summary: summary,
    /* 세이브가 바뀌는 곳은 여기 하나(camp 힌트 구매도 이 안) */
    interact: interact,
    _resetForTest: function () { cache = null; }
  };
})(window);
