/**
 * 축제 하루 — 행사 8 을 놀이로 (PLAN §5.6)
 * ---------------------------------------------------------------
 * 행사날(`VD.eventOf()`)마다 그날의 놀이가 하나 있다. 전부 **이미 있는 손짓의 재조합**이고 새 입력이 없다.
 * 한 해에 한 번만 끝낼 수 있다(`s.fest[행사키] = { year, done, … }` — 진행 칸은 날이 바뀌면 지워진다).
 * 끝내면 🪙 + 공적 + **행사 가구 1**(옷장이 아니라 집 재고에 든다, 전방에서는 안 판다).
 *
 *   설날   세배 돌기    주민 3명에게 세배(village.talk 의 세배 갈래가 알려 준다)
 *   대보름 달집태우기   마을의 달집(모닥불)에 밤·잣 5알
 *   삼짇날 꽃놀이      안내판에서 시작 — 60초 안에 꽃 8송이(채집 이벤트를 듣는다)
 *   단오   창포못 낚시  오늘 물고기 5마리(기존 낚시 입질 창)
 *   칠석   별에 소원    별똥별에 소원(칠석 밤엔 별이 늘 흐른다) — 내일 채집이 후하다
 *   백중   등롱 밤 산책 저녁·밤에 마을의 등롱 셋을 밝힌다
 *   한가위 줄다리기    줄을 10초 안에 30번 당긴다
 *   동지   팥죽 나눔    솥에 밤·잣 3알로 팥죽을 쑤어 주민 3명에게 나눈다(하트 +2)
 *
 * 소품(안내판·달집·줄·솥·등롱)은 행사날에만 마을에 선다. 판정은 손을 쓴 순간과 tick(dt)(시간 재는 둘)뿐이라
 * 진단이 결정적으로 굴릴 수 있다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  function V() { return global.DG.village; }
  function VD() { return global.DG.villageData; }

  /* 마을 중심(W/2, H/2)에서의 타일 어긋남 — 길·집·전방과 안 겹치는 풀밭 */
  var SPOT = { board: [1, 3], fire: [-2, 4], rope: [5, 3], pot: [-5, 4], lantern: [[-8, -3], [7, -4], [8, 5]] };
  var PROP_OF = { bow: null, burn: 'festfire', flowers: null, fish: null, wish: null, lantern: 'festlantern', rope: 'festrope', porridge: 'festpot' };

  /* ── 오늘의 놀이 ──────────────────────────────────────── */

  function year() { return new Date().getFullYear(); }
  function today() {
    var e = VD().eventOf();
    return e && e.play ? { e: e, p: e.play } : null;
  }

  /** 그 행사의 오늘 기록 — make 가 없으면 세이브를 안 만든다. 날이 바뀌었으면 진행 칸만 비운다 */
  function rec(key, make) {
    var s = V().state(), r = s.fest && s.fest[key];
    if (!r) {
      if (!make) { return null; }
      if (!s.fest) { s.fest = {}; }
      r = s.fest[key] = { year: 0, done: false };
    }
    if (r.day !== s.day) { r.day = s.day; r.p = 0; r.t = 0; r.on = false; r.pot = 0; r.lit = {}; r.fed = {}; }
    return r;
  }
  function isDone(key) { var r = rec(key); return !!(r && r.done && r.year === year()); }

  function bowCount() {
    var s = V().state(), b = s.bow || {}, n = 0, k;
    for (k in b) { if (Object.prototype.hasOwnProperty.call(b, k) && b[k] === s.day) { n++; } }
    return n;
  }

  /** 오늘 놀이의 진행(목표판이 읽는다) — 끝냈으면 목표 수 */
  function counter() {
    var td = today();
    if (!td) { return 0; }
    if (isDone(td.e.key)) { return td.p.n; }
    if (td.p.kind === 'bow') { return Math.min(bowCount(), td.p.n); }
    var r = rec(td.e.key);
    return r ? Math.min(r.p || 0, td.p.n) : 0;
  }

  /** 놀이를 끝냈다 — 금·공적·행사 가구. 한 해에 한 번 */
  function complete(td) {
    var r = rec(td.e.key, true);
    if (r.done && r.year === year()) { return null; }
    r.done = true; r.year = year(); r.on = false; r.t = 0;
    var pl = td.p, fname = '';
    core.save.player.gold += pl.gold;
    core.gainFeat(8, '행사');
    core.gainExp(20);
    if (pl.furn && global.DG.home) {
      global.DG.home.stockAdd(pl.furn, 1);
      var f = VD().furn(pl.furn);
      fname = f ? f.name : '';
    }
    var text = '🎊 ' + td.e.name + ' — ' + pl.name + ' 완성! 🪙 ' + core.fmt(pl.gold) + (fname ? ' · 🪑 ' + fname : '');
    core.log(text, 'good');
    core.emit('toast', text);
    core.emit('village:fest', { key: td.e.key, kind: pl.kind });
    V().buildProps();            // 놀이 소품이 마을에서 걷힌다
    V().checkTasks();
    core.emit('changed');
    core.persist();
    return text;
  }

  /* ── 소품 ─────────────────────────────────────────────── */

  function center() { var v = V(); return { cx: Math.floor(v.W * 0.5), cy: Math.floor(v.H * 0.5) }; }
  function tilesNow() {
    var td = today();
    if (!td) { return []; }
    var c = center(), out = [], k = td.p.kind;
    function at(off, kind, id) { out.push({ tx: c.cx + off[0], ty: c.cy + off[1], kind: kind, id: id }); }
    at(SPOT.board, 'festboard', 'festboard');
    if (!isDone(td.e.key)) {
      if (PROP_OF[k] && k !== 'lantern') { at(SPOT[{ burn: 'fire', rope: 'rope', porridge: 'pot' }[k]], PROP_OF[k], PROP_OF[k]); }
      if (k === 'lantern') {
        var r = rec(td.e.key);
        SPOT.lantern.forEach(function (o, i) { if (!(r && r.lit && r.lit[i])) { at(o, 'festlantern', 'festlantern' + i); } });
      }
    }
    return out;
  }

  /** 행사날에만 마을에 서는 소품 — village.buildProps 가 얹는다 */
  function marks() {
    var T = V().TILE;
    return tilesNow().map(function (q) {
      return { id: q.id, kind: q.kind, x: q.tx * T + T * 0.5, y: q.ty * T + T * 0.5, fest: true };
    });
  }
  /** 마을 풀밭 사물(나무·바위·꽃)이 소품 자리에 겹쳐 서지 않게 비운다 */
  function blocked(tx, ty) {
    var l = tilesNow(), i;
    for (i = 0; i < l.length; i++) { if (l[i].tx === tx && l[i].ty === ty) { return true; } }
    return false;
  }

  /* ── 가방 ─────────────────────────────────────────────── */

  /** 그 갈래(nut 등) 하나를 n 개 꺼낸다 — 모자라면 아무것도 안 건드리고 false */
  function takeCat(cat, n) {
    var v = V();
    if (v.bagCatCount(cat) < n) { return false; }
    var bag = v.state().bag, left = n;
    (VD().ITEMS[cat] || []).forEach(function (it) {
      while (left > 0 && (bag[it.key] || 0) > 0) { bag[it.key] -= 1; left--; }
    });
    return left === 0;
  }

  /* ── 손을 쓴다 ────────────────────────────────────────── */

  function status(td, r) {
    return td.p.name + ' (' + Math.min(td.p.kind === 'bow' ? bowCount() : (r && r.p) || 0, td.p.n) + '/' + td.p.n + ')';
  }

  function interact(prop) {
    var td = today();
    if (!td) { return { kind: 'empty', text: '축제는 이미 끝났습니다' }; }
    var key = td.e.key, k = td.p.kind, r = rec(key, true);
    if (prop.kind === 'festboard') {
      if (isDone(key)) { return { kind: 'talk', name: '안내판', text: '🎊 ' + td.e.name + ' — 오늘의 놀이를 마쳤습니다. 내년에 또 만나요' }; }
      if (k === 'flowers') {
        if (r.on && r.t > 0) { return { kind: 'talk', name: '안내판', text: '🌸 진행 중 — 꽃 ' + r.p + '/' + td.p.n + ' · 남은 ' + Math.ceil(r.t) + '초' }; }
        r.on = true; r.t = td.p.sec; r.p = 0;
        core.persist();
        return { kind: 'talk', name: '안내판', text: '🌸 시작! ' + td.p.sec + '초 안에 꽃 ' + td.p.n + '송이를 꺾으세요' };
      }
      return { kind: 'talk', name: '안내판', text: '🎊 ' + td.e.name + ' — ' + td.p.how + ' · ' + status(td, r) };
    }
    if (isDone(key)) { return { kind: 'empty', text: '오늘의 놀이는 이미 마쳤습니다' }; }
    if (prop.kind === 'festfire' && k === 'burn') {
      if (!takeCat('nut', 1)) { return { kind: 'no', text: '🔥 달집에 태울 밤·잣이 없습니다' }; }
      r.p += 1; core.emit('village:fest', { key: key, kind: k, step: r.p });
      if (r.p >= td.p.n) { return { kind: 'gold', text: complete(td) }; }
      core.persist();
      return { kind: 'gold', text: '🔥 부럼을 태웠다 (' + r.p + '/' + td.p.n + ')' };
    }
    if (prop.kind === 'festrope' && k === 'rope') {
      if (!(r.t > 0)) { r.t = td.p.sec; r.p = 0; }
      r.p += 1;
      if (r.p >= td.p.n) { return { kind: 'gold', text: complete(td) }; }
      return { kind: 'empty', text: '🪢 영차! ' + r.p + '/' + td.p.n + ' (남은 ' + Math.ceil(r.t) + '초)' };
    }
    if (prop.kind === 'festpot' && k === 'porridge') {
      if (r.pot > 0) { return { kind: 'talk', name: '솥', text: '🍲 팥죽이 ' + r.pot + '그릇 남았다 — 주민에게 말을 걸어 나눠 주자 (' + r.p + '/' + td.p.n + ')' }; }
      if (r.p >= td.p.n) { return { kind: 'talk', name: '솥', text: '🍲 다 나눴다' }; }
      if (!takeCat('nut', td.p.cost)) { return { kind: 'no', text: '🍲 팥죽을 쑤려면 밤·잣 ' + td.p.cost + '알이 필요합니다' }; }
      r.pot = td.p.n - r.p;
      core.persist();
      return { kind: 'gold', text: '🍲 팥죽을 쑤었다 — ' + r.pot + '그릇, 주민에게 나눠 주자' };
    }
    if (prop.kind === 'festlantern' && k === 'lantern') {
      var ph = V().status().phase.key;
      if (ph !== 'even' && ph !== 'night') { return { kind: 'no', text: '🏮 등롱은 해가 지면 밝힙니다' }; }
      var idx = parseInt(String(prop.id).replace('festlantern', ''), 10);
      if (r.lit[idx]) { return { kind: 'empty', text: '🏮 이미 밝혔습니다' }; }
      r.lit[idx] = 1; r.p += 1;
      if (r.p >= td.p.n) { return { kind: 'gold', text: complete(td) }; }
      V().buildProps();
      core.persist();
      return { kind: 'gold', text: '🏮 등롱을 밝혔다 (' + r.p + '/' + td.p.n + ')' };
    }
    return null;
  }

  /* ── 다른 손짓이 알려 주는 것 ────────────────────────── */

  /** 설날 — village.talk 이 세배를 받았다 */
  function onBow() {
    var td = today();
    if (td && td.p.kind === 'bow' && !isDone(td.e.key) && bowCount() >= td.p.n) { return complete(td); }
    return null;
  }

  /** 동지 — 팥죽이 남아 있으면 말 건 주민에게 한 그릇(하트 +2). 아니면 null(평소 대화) */
  function share(res) {
    var td = today();
    if (!td || td.p.kind !== 'porridge' || isDone(td.e.key)) { return null; }
    var r = rec(td.e.key);
    if (!r || !(r.pot > 0) || r.fed[res.id]) { return null; }
    r.fed[res.id] = 1; r.pot -= 1; r.p += 1;
    V().bumpHeart(res.id, 2);
    core.log('🍲 ' + res.ref.name + ' 에게 팥죽을 나눴다', 'good');
    var text = '🍲 팥죽 한 그릇 나눴다 (' + r.p + '/' + td.p.n + ')';
    if (r.p >= td.p.n) { text = complete(td) || text; }
    core.persist();
    return { kind: 'talk', name: res.ref.name, text: text };
  }

  /** 칠석에 소원을 빌면 다음 날 채집이 후하다 — village.interact 의 채집 수에 반영된다 */
  function gatherBoost() {
    var s = V().state(), r = s.fest && s.fest.chilseok;
    return !!(r && r.boost === s.day);
  }

  core.on('village:gather', function (e) {
    var td = today();
    if (!td || td.p.kind !== 'flowers' || !e || !e.item || e.item.cat !== 'flower') { return; }
    var r = rec(td.e.key);
    if (!r || !r.on || !(r.t > 0) || isDone(td.e.key)) { return; }
    r.p += e.n || 1;
    if (r.p >= td.p.n) { complete(td); } else { core.persist(); }
  });
  core.on('village:fish', function (e) {
    var td = today();
    if (!td || td.p.kind !== 'fish' || !e || e.state !== 'catch' || isDone(td.e.key)) { return; }
    var r = rec(td.e.key, true);
    r.p += 1;
    if (r.p >= td.p.n) { complete(td); } else { core.persist(); }
  });
  core.on('village:wish', function () {
    var td = today();
    if (!td || td.p.kind !== 'wish' || isDone(td.e.key)) { return; }
    var r = rec(td.e.key, true), s = V().state();
    r.p = 1; r.boost = s.day + 1;
    complete(td);
    core.log('🌠 내일은 채집이 후하다', 'good');
  });

  /** 매 프레임(village.update, 집 밖) — 시간 재는 둘(꽃놀이·줄다리기) */
  function tick(dt) {
    var td = today();
    if (!td || (td.p.kind !== 'flowers' && td.p.kind !== 'rope')) { return; }
    var r = rec(td.e.key);
    if (!r || !(r.t > 0) || isDone(td.e.key)) { return; }
    r.t -= dt;
    if (r.t <= 0) {
      r.t = 0; r.on = false;
      var had = r.p; r.p = 0;
      if (had > 0 || td.p.kind === 'flowers') {
        core.emit('toast', '⏱️ ' + td.p.name + ' — 시간이 다 됐다. 다시 해 보자');
      }
    }
  }

  global.DG = global.DG || {};
  global.DG.festival = {
    SPOT: SPOT, today: today, isDone: isDone, counter: counter, rec: rec, bowCount: bowCount,
    marks: marks, blocked: blocked, gatherBoost: gatherBoost,
    /* 세이브가 바뀌는 곳은 여기 */
    interact: interact, onBow: onBow, share: share, tick: tick, complete: complete
  };
})(window);
