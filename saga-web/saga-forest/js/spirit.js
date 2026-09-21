/**
 * 숲의 정령 60 — 숲 고리에 숨은 작은 수수께끼 (PLAN §5.5 ②)
 * ---------------------------------------------------------------
 * 마을 밖 숲 고리에 정령의 터 60곳이 늘 같은 자리에 있다(세이브 시드 해시 — 같은 마을은 같은
 * 모습, 세이브에는 "푼 것"만 남는다). 터마다 수수께끼가 하나씩 걸려 있고, 풀면 정령이 나타나
 * **정령 씨앗 1**을 남긴다. 씨앗이 6·12·20·30·45·60 개에 이르면 편의 보상이 온다(단계 표 `TIERS`).
 *
 * 수수께끼 다섯 — **전부 이미 있는 손짓의 재조합**이다(새 상호작용 틀을 안 만든다, PLAN §2-5):
 *   ore     돌무리    터에서 손을 쓰면 광석 하나를 올려 둘레를 완성한다(가방에서 1 소모)
 *   flowers 꽃 원     터 둘레 3.5칸 안에 꽃 5송이를 심어 원을 만든 뒤 터에서 손을 쓴다(초록 숲 터만)
 *   wish    별 자리   별똥별이 흐르는 밤에 터에서 손을 쓰면 소원이 곧 응답이다
 *   bug     반딧불    터 둘레 3.5칸 안에서 곤충을 하나 잡는다(잠자리채)
 *   sneak   숨죽임    터 둘레 3.5칸 안에서 🐾 살금살금 걸음으로 8초 가만히 선다
 * PLAN 원안의 "낚시터 반짝"·"나무 흔들기 3연속" 은 이 판의 숲 고리에 낚시터·흔들 나무가 없어
 * (고리 사물은 전부 `deco:true`) **숨죽임·반딧불로 바꿨다** — 결정은 HANDOFF 에 적었다.
 *
 * 터 자리는 `village.ringSpotOk()`(마을 안·캠프·동굴·폐허·우주기지·물·다리 제외) 위에서 해시로
 * 뽑고 터끼리 6칸 이상 띄운다. 터 둘레 2칸은 숲 고리 사물이 서지 않는다(`blocked()`).
 * 바이옴별 12 는 씨앗에 따라 바이옴이 없을 수 있어 **총 60 을 고리 전체에 흩뿌리고** 도감에서
 * 바이옴별로 묶어 보인다.
 *
 * 세이브 `s.spirits = { found:{터번호:날짜}, seeds, claimed:[단계…] }` — 없으면 초기값(읽기는
 * 세이브를 안 만든다). 세이브를 못 읽어도 터는 늘 같은 자리다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  function V() { return global.DG.village; }
  function VD() { return global.DG.villageData; }

  var COUNT = 60;
  var GAP = 6;                 // 터끼리 최소 간격(타일)
  var CLEAR = 2;               // 터 둘레에 숲 고리 사물이 안 서는 반경(타일)
  var NEAR_T = 3.5;            // "터 둘레" 로 치는 반경(타일)
  var SNEAK_SEC = 8;           // 숨죽임 수수께끼 — 가만히 서 있는 초
  var FLOWERS_N = 5;
  var PUZZLES = ['ore', 'flowers', 'wish', 'bug', 'sneak'];
  var ORES = ['iron', 'copper', 'silver'];

  /** 씨앗 보상 단계 — at 는 늘어나는 순서(단조 증가, 진단이 본다) */
  var TIERS = [
    { at: 6,  gold: 400,  feat: 20 },
    { at: 12, gold: 800,  feat: 40 },
    { at: 20, gold: 1500, feat: 60 },
    { at: 30, dust: 1,    feat: 100 },
    { at: 45, gold: 3000, feat: 150 },
    { at: 60, dust: 3,    feat: 300 }
  ];

  var HINT = {
    ore:     '🪨 돌무리에 빈자리가 있다 — 철석·구리·은괴 중 하나를 올려 보자',
    flowers: '🌸 이 둘레에 꽃 다섯 송이를 심어 원을 만들어 보자',
    wish:    '🌠 별이 흐르는 밤에 이 자리에서 소원을 빌어 보자',
    bug:     '🦋 이 둘레에서 곤충을 하나 잡아 보자(잠자리채)',
    sneak:   '🐾 살금살금 걸음으로 이 둘레에 가만히 서 보자'
  };
  var BIOME_NAME = { green: '초록 숲', meadow: '꽃밭', dark: '어둑 숲', mushroom: '버섯 숲', rocky: '바위 숲' };

  /* ── 자리 ─────────────────────────────────────────────── */

  var cache = null;            // { seed, m, list, block }

  function far(list, tx, ty) {
    for (var i = 0; i < list.length; i++) {
      if (Math.max(Math.abs(list[i].tx - tx), Math.abs(list[i].ty - ty)) < GAP) { return false; }
    }
    return true;
  }

  function build() {
    var v = V(), s = v.state(), m = v.forestMargin(), W = v.W, H = v.H;
    if (cache && cache.seed === s.seed && cache.m === m) { return cache; }
    var list = [], tries = 0, lo = -m + 3, spanX = W + 2 * m - 6, spanY = H + 2 * m - 6;
    while (list.length < COUNT && tries < 40000) {
      tries++;
      var tx = lo + Math.floor(core.hash2(tries * 71 + s.seed % 977, s.seed % 431 + 13) * spanX);
      var ty = lo + Math.floor(core.hash2(s.seed % 883 + 29, tries * 53 + 17) * spanY);
      if (!v.ringSpotOk(tx, ty) || !far(list, tx, ty)) { continue; }
      list.push({ i: list.length, tx: tx, ty: ty, biome: v.biomeAt(tx, ty) });
    }
    var block = {}, k, dx, dy;
    for (k = 0; k < list.length; k++) {
      var sp = list[k];
      var pool = PUZZLES.filter(function (p) { return p !== 'flowers' || sp.biome === 'green'; });
      sp.puzzle = pool[Math.floor(core.hash2(k * 97 + s.seed % 701, 5) * pool.length) % pool.length];
      for (dy = -CLEAR; dy <= CLEAR; dy++) {
        for (dx = -CLEAR; dx <= CLEAR; dx++) { block[(sp.tx + dx) + ',' + (sp.ty + dy)] = 1; }
      }
    }
    cache = { seed: s.seed, m: m, list: list, block: block };
    return cache;
  }

  function spots() { return build().list; }

  /** 숲 고리 사물이 서면 안 되는 칸 — 터 둘레 CLEAR 칸 */
  function blocked(tx, ty) { return !!build().block[tx + ',' + ty]; }

  function byIndex(i) { return spots()[i] || null; }

  /* ── 세이브 ───────────────────────────────────────────── */

  function rec() { return V().state().spirits || null; }
  function recMake() {
    var s = V().state();
    if (!s.spirits) { s.spirits = { found: {}, seeds: 0, claimed: [] }; }
    return s.spirits;
  }
  function isFound(i) { var r = rec(); return !!(r && r.found[i]); }
  function seeds() { var r = rec(); return r ? r.seeds : 0; }

  /* ── 화면이 읽는 것 ───────────────────────────────────── */

  /** 숲 고리 사물 목록에 얹는 터 표지 — 푼 터는 손이 안 닿는(deco) 자국으로 남는다 */
  function marks() {
    var T = V().TILE, list = spots(), out = [], i;
    for (i = 0; i < list.length; i++) {
      var done = isFound(list[i].i);
      out.push({ id: 'sp' + list[i].i, kind: done ? 'spiritdone' : 'spiritmark',
                 x: list[i].tx * T + T * 0.5, y: list[i].ty * T + T * 0.5, deco: done, spirit: list[i].i });
    }
    return out;
  }

  /** 도감용 요약 — 총수·씨앗·다음 단계·바이옴별 */
  function summary() {
    var list = spots(), by = {}, i, found = 0;
    for (i = 0; i < list.length; i++) {
      var b = by[list[i].biome] || (by[list[i].biome] = { name: BIOME_NAME[list[i].biome] || list[i].biome, found: 0, total: 0 });
      b.total++;
      if (isFound(list[i].i)) { b.found++; found++; }
    }
    var sd = seeds(), next = null;
    for (i = 0; i < TIERS.length; i++) { if (TIERS[i].at > sd) { next = TIERS[i]; break; } }
    return { found: found, total: list.length, seeds: sd, next: next, byBiome: by };
  }

  /* ── 푼다 ─────────────────────────────────────────────── */

  function tierText(t) {
    var p = [];
    if (t.gold) { p.push('🪙 ' + core.fmt(t.gold)); }
    if (t.dust) { p.push('✨ 별조각 ' + t.dust); }
    if (t.feat) { p.push('공적 +' + t.feat); }
    return p.join(' · ');
  }

  /** 정령을 만났다 — 씨앗 +1 과 단계 보상. 터 하나에 한 번만 */
  function solve(sp, how) {
    var r = recMake();
    if (r.found[sp.i]) { return null; }
    r.found[sp.i] = V().state().day;
    r.seeds += 1;
    var text = '✨ 정령이 나타나 씨앗을 하나 남기고 사라졌다 (' + r.seeds + '/' + COUNT + ')';
    core.gainFeat(5, '정령');
    core.log('✨ ' + (BIOME_NAME[sp.biome] || '') + '의 정령을 만났다' + (how ? ' — ' + how : '') +
      ' · 씨앗 ' + r.seeds + '/' + COUNT, 'good');
    var i;
    for (i = 0; i < TIERS.length; i++) {
      var t = TIERS[i];
      if (r.seeds < t.at || r.claimed.indexOf(t.at) >= 0) { continue; }
      r.claimed.push(t.at);
      if (t.gold) { core.save.player.gold += t.gold; }
      if (t.dust) { V().bagAdd(VD().item('stardust'), t.dust); }
      if (t.feat) { core.gainFeat(t.feat, '정령'); }
      core.log('🌱 씨앗 ' + t.at + '개 — ' + tierText(t), 'good');
      text += ' · 🌱 씨앗 ' + t.at + '개 보상 ' + tierText(t);
    }
    core.emit('village:spirit', { idx: sp.i, seeds: r.seeds, biome: sp.biome });
    V().buildProps();            // 터 표지가 자국으로 바뀐다
    V().syncPlanted();
    core.emit('changed');
    core.persist();
    return { kind: 'spirit', text: text };
  }

  /* ── 수수께끼 ─────────────────────────────────────────── */

  function playerXY() { var p = V().raw().player; return p; }

  function nearSpot(sp, tiles) {
    var T = V().TILE, p = playerXY();
    return Math.hypot(sp.tx * T + T * 0.5 - p.x, sp.ty * T + T * 0.5 - p.y) <= (tiles || NEAR_T) * T;
  }

  function flowersNear(sp) {
    var T = V().TILE, pl = V().state().planted || [], n = 0, i;
    for (i = 0; i < pl.length; i++) {
      if (pl[i].kind !== 'flower') { continue; }
      if (Math.hypot(sp.tx * T + T * 0.5 - pl[i].x, sp.ty * T + T * 0.5 - pl[i].y) <= NEAR_T * T) { n++; }
    }
    return n;
  }

  /** 터에서 손을 쓴다 — 수수께끼 갈래마다 하는 일이 다르다 */
  function interact(prop) {
    var sp = byIndex(prop && prop.spirit);
    if (!sp) { return null; }
    if (isFound(sp.i)) { return { kind: 'empty', text: '🍃 정령이 다녀간 자리입니다' }; }
    var v = V(), i, n;
    if (sp.puzzle === 'ore') {
      for (i = 0; i < ORES.length; i++) {
        if (v.bagCount(ORES[i]) > 0) {
          v.state().bag[ORES[i]] -= 1;
          return solve(sp, VD().item(ORES[i]).name + ' 을(를) 올려 돌무리를 완성했다');
        }
      }
      return { kind: 'no', text: HINT.ore };
    }
    if (sp.puzzle === 'flowers') {
      n = flowersNear(sp);
      if (n >= FLOWERS_N) { return solve(sp, '꽃 원을 이뤘다'); }
      return { kind: 'no', text: HINT.flowers + ' (' + n + '/' + FLOWERS_N + ')' };
    }
    if (sp.puzzle === 'wish') {
      var T = global.DG.town;
      if (!T || !T.starNow()) { return { kind: 'no', text: HINT.wish }; }
      var res = T.wish();
      if (res && res.kind === 'wish') { return solve(sp, '별에 소원을 빌었다') || res; }
      return res;
    }
    return { kind: 'no', text: HINT[sp.puzzle] };
  }

  /* 곤충을 잡았다 — 터 둘레의 반딧불 수수께끼 하나를 푼다(bug.js 는 이 파일을 모른다) */
  core.on('village:bug', function (e) {
    if (!e || e.state !== 'catch') { return; }
    var list = spots(), i;
    for (i = 0; i < list.length; i++) {
      if (list[i].puzzle !== 'bug' || isFound(list[i].i) || !nearSpot(list[i])) { continue; }
      var r = solve(list[i], '곤충을 잡았다');
      if (r) { core.emit('toast', r.text); }
      return;
    }
  });

  /* 숨죽임 — 살금살금 걸음으로 터 둘레에 가만히 SNEAK_SEC 초. 저장하지 않는다(자리를 뜨면 처음부터) */
  var sneakT = 0, sneakOn = -1, lastX = 0, lastY = 0, acc = 0;
  /** 매 프레임(village.update) — 여러 터를 한꺼번에 안 보고 0.25초마다 한 번만 훑는다 */
  function tick(dt) {
    acc += dt;
    if (acc < 0.25) { return; }
    var step = acc; acc = 0;
    var v = V(), p = v.raw().player, moved = Math.hypot(p.x - lastX, p.y - lastY) > 0.6;
    lastX = p.x; lastY = p.y;
    if (!v.sneaking() || moved) { sneakT = 0; sneakOn = -1; return; }
    var list = spots(), i;
    for (i = 0; i < list.length; i++) {
      if (list[i].puzzle !== 'sneak' || isFound(list[i].i) || !nearSpot(list[i])) { continue; }
      if (sneakOn !== list[i].i) { sneakOn = list[i].i; sneakT = 0; }
      sneakT += step;
      if (sneakT >= SNEAK_SEC) {
        var r = solve(list[i], '숨죽여 기다렸다');
        sneakT = 0; sneakOn = -1;
        if (r) { core.emit('toast', r.text); }
      }
      return;
    }
    sneakT = 0; sneakOn = -1;
  }

  global.DG = global.DG || {};
  global.DG.spirit = {
    COUNT: COUNT, GAP: GAP, CLEAR: CLEAR, NEAR_T: NEAR_T, SNEAK_SEC: SNEAK_SEC, FLOWERS_N: FLOWERS_N,
    PUZZLES: PUZZLES, TIERS: TIERS, HINT: HINT, BIOME_NAME: BIOME_NAME,
    spots: spots, blocked: blocked, marks: marks, summary: summary, isFound: isFound, seeds: seeds,
    /* 세이브가 바뀌는 곳은 여기 셋 */
    interact: interact, solve: solve, tick: tick,
    _resetForTest: function () { cache = null; sneakT = 0; sneakOn = -1; acc = 0; }
  };
})(window);
