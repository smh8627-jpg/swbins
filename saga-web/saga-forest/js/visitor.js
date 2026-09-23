/**
 * 떠돌이 방문객 — 날마다 다른 손님 (PLAN §5.9, 2026-09-24 사용자 선택)
 * ---------------------------------------------------------------
 * 원작(동물의숲)의 여욱·부엉·마스코트 손님 자리다. 매일 날짜 해시로 한 명이 마을 광장에
 * 들른다. 퓨전 방향(과거·현대·미래·괴물 허용)대로 사람만 오지 않는다.
 *
 *   🦊 여우 화상 호연    오늘만 귀한 가구 하나를 1.5배 값에 판다(한 번 더 말 걸면 산다)
 *   🧭 난파 선원 풍랑    나침반 조각 다섯이 **바깥 숲**에 흩어졌다 → 다 찾아 주면 선장의 궤짝
 *   👻 도깨비불 반디     제 몸 조각 다섯이 바깥 숲에 흩어졌다 → 다 모아 주면 도깨비 등롱
 *   🎣 낚시 명인 청파    물고기 셋을 보여 주면(가방에서 가져간다) 명인의 어탁
 *   🦋 곤충 박사 나비    곤충 셋을 보여 주면 나비 표본 액자
 *   🤖 시간 여행자 K-7   광석 둘과 화석 하나로 "미래 부품"을 만든다 → 시간의 탁상시계
 *
 * "맵이 큰 것에 비해 NPC 가 없다"(사용자) — 선원·도깨비불 날엔 바깥 고리 다섯 자리에 일이 생긴다.
 * 한 사람과의 일은 하루 한 번(그날이 지나면 새 손님). 보상 가구는 전방에서 안 판다(`fest:'visit'`).
 *
 * 숲 NPC 일곱(`village.js` `npcs`)과 **따로 둔다** — 그 일곱은 자리·수·애니메 아바타가 못박혀 있다.
 * 화면은 `village.raw().visitors` 를 NPC 와 같은 길로 그린다(`n.def` 가 있으면 그것을 쓴다).
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  function V() { return global.DG.village; }
  function VD() { return global.DG.villageData; }

  var VISITORS = [
    { key: 'fox', name: '여우 화상 호연', emoji: '🦊', type: 'shop',
      line: '눈이 밝은 손님만 알아보는 물건이 있지요 — 오늘 하루뿐이랍니다' },
    { key: 'sailor', name: '난파 선원 풍랑', emoji: '🧭', type: 'collect', piece: 'visitcompass', n: 5,
      line: '배가 뒤집혀 나침반이 산산이… 숲 어디에 조각이 떨어졌을 텐데', gold: 800, furn: 'visit_sailor' },
    { key: 'wisp', name: '도깨비불 반디', emoji: '👻', type: 'collect', piece: 'visitwisp', n: 5,
      line: '히잉… 놀라서 몸이 다섯 조각으로 흩어졌어. 숲에서 좀 찾아 줘', gold: 1000, furn: 'visit_wisp' },
    { key: 'angler', name: '낚시 명인 청파', emoji: '🎣', type: 'bring', cat: 'fish', n: 3,
      line: '이 마을 물고기 구경 좀 하세나 — 셋만 보여 주게', gold: 700, furn: 'visit_angler' },
    { key: 'bugdoc', name: '곤충 박사 나비', emoji: '🦋', type: 'bring', cat: 'bug', n: 3,
      line: '표본이 모자라요! 곤충 세 마리만 나눠 주실래요?', gold: 700, furn: 'visit_bug' },
    { key: 'traveler', name: '시간 여행자 K-7', emoji: '🤖', type: 'bring', cat: 'ore', n: 2, cat2: 'fossil', n2: 1,
      line: '삐빗. 2387년에서 왔습니다. 광석 둘과 화석 하나가 있으면 귀환 부품을 만들 수 있습니다', gold: 900, furn: 'visit_future' }
  ];
  var BY = {};
  VISITORS.forEach(function (v) { BY[v.key] = v; });
  var FOX_MUL = 1.5;
  var SPOT = [-3, -3];              // 마을 가운데에서 이만큼 어긋난 풀밭(축제 소품 자리와 안 겹친다)
  var DIRS = ['동', '남동', '남', '남서', '서', '북서', '북', '북동'];

  /** 오늘의 손님 — 날짜 해시(같은 날이면 늘 같다) */
  function whoOn(day) { return VISITORS[Math.floor(core.hash2(day * 13 + 7, 911) * 2 * VISITORS.length) % VISITORS.length]; }
  function today() { var s = V().state(); return whoOn(s.day); }

  /** 오늘 기록 — 날이 바뀌면 새로. 손을 쓸 때(talk·pick)만 세이브에 만든다 */
  function rec() {
    var s = V().state();
    if (!s.visit || s.visit.day !== s.day) { s.visit = { day: s.day, got: {}, done: false, offered: false }; }
    return s.visit;
  }
  /** 읽기 전용 — 소품 세우기·화면·상태는 세이브를 안 건드린다("살피기 세이브 불변") */
  function peek() {
    var s = V().state();
    return s.visit && s.visit.day === s.day ? s.visit : { day: s.day, got: {}, done: false, offered: false };
  }

  function centerTile() { var v = V(); return { tx: Math.floor(v.W / 2), ty: Math.floor(v.H / 2) }; }

  /** 손님이 서는 자리 */
  function spot() {
    var v = V(), c = centerTile(), T = v.TILE;
    var x = (c.tx + SPOT[0]) * T + T * 0.5, y = (c.ty + SPOT[1]) * T + T * 0.5;
    return { x: x, y: y };
  }

  /** 오늘 손님 한 명(화면·focus 가 읽는다). 일을 다 끝냈어도 그날은 광장에 머문다 */
  function list() {
    if (!V() || !V().state) { return []; }
    var d = today(), p = spot();
    return [{ id: 'visit_' + d.key, kind: 'visit_' + d.key, visitor: d.key, x: p.x, y: p.y, facing: 1,
      def: { name: d.name, emoji: d.emoji, line: d.line } }];
  }

  /** 바깥 숲 조각 자리 — 그날·세이브 해시, 서로 12타일 넘게 떨어진다 */
  var pieceCache = null;
  function pieces() {
    var v = V(), s = v.state(), d = today();
    if (d.type !== 'collect') { return []; }
    var key = s.day + '|' + (s.seed || 0) + '|' + v.forestMargin();
    if (pieceCache && pieceCache.key === key) { return pieceCache.list; }
    var m = v.forestMargin(), W = v.W, H = v.H, out = [], tries = 0;
    while (out.length < d.n && tries < 4000) {
      tries++;
      var tx = Math.floor(-m + 2 + core.hash2(s.day * 31 + tries * 7, tries * 13 + 3) * 2 * (W + 2 * m - 4));
      var ty = Math.floor(-m + 2 + core.hash2(s.day * 17 + tries * 5 + 1, tries * 29 + 11) * 2 * (H + 2 * m - 4));
      if (!v.ringSpotOk(tx, ty)) { continue; }
      /* 정령의 터·발견 격자 자리와 겹치지 않게(그 둘레는 비워 두는 약속이 있다) */
      var SPI = global.DG.spirit, GRD = global.DG.grid;
      if (SPI && SPI.blocked && SPI.blocked(tx, ty)) { continue; }
      if (GRD && GRD.blocked && GRD.blocked(tx, ty)) { continue; }
      if (SPI && SPI.spots && SPI.spots().some(function (q) { return Math.max(Math.abs(q.tx - tx), Math.abs(q.ty - ty)) <= (SPI.CLEAR || 2) + 1; })) { continue; }
      var far = out.every(function (p) { return Math.hypot(p.tx - tx, p.ty - ty) > 12; });
      if (!far) { continue; }
      out.push({ i: out.length, tx: tx, ty: ty });
    }
    pieceCache = { key: key, list: out };
    return out;
  }

  /** 소품으로 세울 조각 — 이미 주운 것은 뺀다 */
  function marks() {
    var d = today(), T = V().TILE, r = peek();
    if (d.type !== 'collect' || r.done) { return []; }
    return pieces().filter(function (p) { return !r.got[p.i]; }).map(function (p) {
      return { id: 'vp' + p.i, kind: d.piece, x: p.tx * T + T * 0.5, y: p.ty * T + T * 0.5, visit: p.i };
    });
  }

  function dirOf(tx, ty) {
    var c = centerTile(), a = Math.atan2(ty - c.ty, tx - c.tx);
    return DIRS[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
  }

  /** 조각을 줍는다 */
  function pick(prop) {
    var d = today(), r = rec();
    if (d.type !== 'collect' || r.done || r.got[prop.visit]) { return null; }
    r.got[prop.visit] = true;
    var n = Object.keys(r.got).length;
    V().buildProps();
    core.persist();
    return { kind: 'gather', text: (d.key === 'wisp' ? '👻 도깨비불 조각' : '🧭 나침반 조각') + ' (' + n + '/' + d.n + ') — ' +
      (n >= d.n ? '다 모았다! 광장의 ' + d.name + '에게 가져가자' : '아직 ' + (d.n - n) + '개 남았다') };
  }

  /* ── 가방 ── */
  function takeCat(cat, n) {
    var v = V();
    if (v.bagCatCount(cat) < n) { return false; }
    var bag = v.state().bag, left = n;
    (VD().ITEMS[cat] || []).forEach(function (it) {
      while (left > 0 && (bag[it.key] || 0) > 0) { bag[it.key] -= 1; left--; }
    });
    return left === 0;
  }

  function reward(d) {
    var H = global.DG.home;
    core.save.player.gold += d.gold;
    if (H && d.furn) { H.stockAdd(d.furn, 1); }
    core.gainFeat(1, '방문객');
    core.gainExp(15);
    var f = VD().FURNITURE.filter(function (x) { return x.key === d.furn; })[0];
    core.log(d.emoji + ' ' + d.name + '의 부탁을 들어줬다 — 🪙 ' + core.fmt(d.gold) + (f ? ' · ' + f.name : ''), 'good');
    core.emit('village:visit', { key: d.key });
    core.emit('changed');
    core.persist();
    return f;
  }

  /** 여우 화상의 오늘 물건 — 전방 물건 중 비싼 쪽에서 날짜 해시로 */
  function foxItem(day) {
    var all = VD().FURNITURE.filter(function (f) { return !f.fest && f.price >= 1400; });
    return all[Math.floor(core.hash2(day * 7 + 3, 577) * 2 * all.length) % all.length];
  }

  /** 말을 건다 — village.interact() 가 방문객이면 여기로 보낸다 */
  function talk(npc) {
    var d = BY[npc.visitor] || today(), r = rec(), f;
    if (r.done) { return { kind: 'talk', name: d.name, text: d.emoji + ' 오늘 고마웠소 — 또 들르리다' }; }
    if (d.type === 'shop') {
      var it = foxItem(V().state().day), price = Math.round(it.price * FOX_MUL);
      if (!r.offered) {
        r.offered = true;
        return { kind: 'talk', name: d.name, text: '오늘의 물건은 「' + it.name + '」 — 🪙 ' + core.fmt(price) + '. 마음에 들면 한 번 더 말을 거시오' };
      }
      if (core.save.player.gold < price) { return { kind: 'talk', name: d.name, text: '🪙 ' + core.fmt(price) + ' 이 있어야 하오 — 오늘 해 지기 전에 다시 오시오' }; }
      core.save.player.gold -= price;
      global.DG.home.stockAdd(it.key, 1);
      r.done = true;
      core.log('🦊 ' + d.name + '에게서 「' + it.name + '」을 샀다 — 🪙 ' + core.fmt(price), 'good');
      core.emit('changed'); core.persist();
      return { kind: 'quest', name: d.name, text: '「' + it.name + '」 — 좋은 눈이시오. 집 창고에 넣어 두었소' };
    }
    if (d.type === 'collect') {
      var n = Object.keys(r.got).length;
      if (n < d.n) {
        var left = pieces().filter(function (p) { return !r.got[p.i]; }).map(function (p) { return dirOf(p.tx, p.ty); });
        return { kind: 'quest', name: d.name, text: d.line + ' (' + n + '/' + d.n + ') — 마을 ' + left.join('·') + '쪽 숲 어딘가' };
      }
      r.done = true; f = reward(d);
      return { kind: 'quest', name: d.name, text: '다 찾아 줬구려! 🪙 ' + core.fmt(d.gold) + (f ? ' · 「' + f.name + '」' : '') };
    }
    /* bring — 가방에서 가져간다 */
    var have = V().bagCatCount(d.cat), have2 = d.cat2 ? V().bagCatCount(d.cat2) : 0;
    if (have < d.n || (d.cat2 && have2 < d.n2)) {
      return { kind: 'quest', name: d.name, text: d.line + ' (' + Math.min(have, d.n) + '/' + d.n +
        (d.cat2 ? ' · ' + Math.min(have2, d.n2) + '/' + d.n2 : '') + ')' };
    }
    takeCat(d.cat, d.n);
    if (d.cat2) { takeCat(d.cat2, d.n2); }
    r.done = true; f = reward(d);
    return { kind: 'quest', name: d.name, text: '고맙소! 🪙 ' + core.fmt(d.gold) + (f ? ' · 「' + f.name + '」' : '') };
  }

  /** 이 칸에 오늘 조각이 있나(둘레 한 칸 포함) — 숲 고리 사물이 그 위에 안 서게 */
  function blocked(tx, ty) {
    var d = today();
    if (d.type !== 'collect') { return false; }
    return pieces().some(function (p) { return Math.abs(p.tx - tx) <= 1 && Math.abs(p.ty - ty) <= 1; });
  }

  function status() {
    var d = today(), r = peek();
    return { key: d.key, name: d.name, emoji: d.emoji, type: d.type, done: r.done, got: Object.keys(r.got).length, n: d.n || 0 };
  }

  global.DG = global.DG || {};
  global.DG.visitor = {
    VISITORS: VISITORS, byKey: function (k) { return BY[k] || null; }, FOX_MUL: FOX_MUL,
    whoOn: whoOn, today: today, list: list, spot: spot, pieces: pieces, marks: marks, foxItem: foxItem, blocked: blocked,
    /* 세이브가 바뀌는 곳 */
    pick: pick, talk: talk, rec: rec, status: status,
    _reset: function () { pieceCache = null; }
  };
})(window);
