/**
 * 연단(鍊丹) — 원작의 호라드릭 큐브
 * ===============================================================
 * 원작(디아블로2)의 큐브가 하는 일은 한 문장이다:
 * **여러 개를 넣으면 더 나은 하나가 나온다.**
 * 그래서 쓰다 남은 하급품이 버릴 것이 아니라 **모을 것**이 된다.
 * 이 판은 여태 낮은 등급의 보석·부문·장비가 그냥 짐이었다.
 *
 * 옮겨 온 조합 넷 (원작에서 실제로 쓰는 것들만)
 *   보석 셋 → 한 등급 위    3 chipped → 1 flawed. 큐브의 첫 번째 쓸모다
 *   부문 셋 → 다음 글자     3 같은 룬 → 다음 룬. 상위 부문으로 가는 유일한 길
 *   장비 셋 → 한 등급 위    같은 부위·같은 등급 셋을 태워 한 칸 올린다
 *   접사 다시 굴리기        완(完) 보석 둘로 옵션만 다시 뽑는다 (원작의 rare reroll)
 *
 * 지킨 선 넷
 *   · **세공 구멍은 안 만든다.** 원작에서 소켓은 물건이 나올 때 정해진다
 *     (item.js rollSockets 의 주석과 같은 규칙이다). 연단으로 뚫을 수 있게 하면
 *     "구멍 뚫린 물건을 찾는" 재미가 통째로 사라진다
 *   · **박은 것은 여전히 못 뺀다.** 등급 올리기는 재료를 태우므로 박힌 것도 같이
 *     사라지고, 접사 다시 굴리기는 **구멍과 박힌 것을 그대로 둔다**
 *     (부문어가 이루어진 물건의 옵션만 갈아 끼우는 길이다)
 *   · **잠근 물건(🔒)은 재료로 안 쓴다.** 실수로 태우는 사고를 막는 유일한 장치다
 *   · 재료를 세는 것도 넣고 빼는 것도 **item.js 한 곳**을 통한다.
 *     여기서 세이브를 직접 만지면 두 곳이 서로 다른 규칙을 갖게 된다
 *
 * 조합을 늘릴 때는 RECIPES 에 한 줄만 넣는다. 화면(ui.js)은 이 표를 읽기만 한다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;

  function it() { return global.DG.item; }
  function GD() { return global.DG.gemData; }

  /** 접사 다시 굴리기 값 — 완(完) 보석 두 알 */
  var REROLL_GEM_G = 4;
  var REROLL_GEM_N = 2;

  /* ── 조합 넷 ──────────────────────────────────────────── */

  /**
   * key    화면·진단이 부르는 이름
   * name   보이는 이름
   * need   무엇이 몇 개 드는지 (사람이 읽는 한 줄)
   * find   지금 만들 수 있는 것들을 찾아 준다 → [{id, label, ...}]
   * make   그중 하나를 실제로 만든다 → {ok, reason, out}
   */
  var RECIPES = [
    {
      key: 'gem',
      name: '보석 셋을 한 알로',
      emoji: '💎',
      need: '같은 보석 · 같은 등급 3개',
      desc: '조(粗) 셋이 양(良) 하나가 된다. 완(完)까지 올라간다.',
      find: findGem, make: makeGem
    },
    {
      key: 'rune',
      name: '부문 셋을 한 글자로',
      emoji: '📜',
      need: '같은 부문 3개',
      desc: '天 셋이 地 하나가 된다 — 깊이 안 내려가고 상위 부문에 닿는 길이다.',
      find: findRune, make: makeRune
    },
    {
      key: 'gear',
      name: '장비 셋을 한 점으로',
      emoji: '⚒️',
      need: '같은 부위 · 같은 등급 3점 (잠근 것 제외)',
      desc: '한 등급 위의 물건이 나온다. 박힌 것은 함께 사라진다.',
      find: findGear, make: makeGear
    },
    {
      key: 'reroll',
      name: '접사를 다시 굴린다',
      emoji: '🔥',
      need: '보물·전설 장비 1점 + 완(完) 보석 2알',
      desc: '이름과 등급은 그대로, 옵션만 다시 뽑는다. 구멍과 박힌 것은 그대로 둔다.',
      find: findReroll, make: makeReroll
    }
  ];

  function recipeByKey(k) {
    for (var i = 0; i < RECIPES.length; i++) { if (RECIPES[i].key === k) { return RECIPES[i]; } }
    return null;
  }

  /* ── 보석 셋 → 한 등급 위 ─────────────────────────────── */

  function findGem() {
    var out = [], list = it().matList(), i;
    for (i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.kind !== 'gem' || m.n < 3) { continue; }
      if (m.g >= GD().GRADES.length - 1) { continue; }      // 완(完)이 끝이다
      var up = GD().grade(m.g + 1);
      out.push({
        id: 'gem:' + m.key + ':' + m.g,
        label: m.grade.name + ' ' + m.def.name + ' ×3',
        into: up.name + ' ' + m.def.name + ' ×1',
        color: up.color, have: m.n
      });
    }
    return out;
  }

  function makeGem(id) {
    var p = id.split(':');
    var key = p[1], g = parseInt(p[2], 10);
    if (it().matCount('gem', key, g) < 3) { return { ok: false, reason: 'mat' }; }
    if (g >= GD().GRADES.length - 1) { return { ok: false, reason: 'top' }; }
    it().addMat('gem', key, g, -3);
    it().addMat('gem', key, g + 1, 1);
    var def = GD().gemByKey(key), up = GD().grade(g + 1);
    core.log('⚗️ 연단 · ' + up.name + ' ' + def.name + ' 이 나왔다', 'good');
    core.emit('changed');
    return { ok: true, out: { kind: 'gem', key: key, g: g + 1 } };
  }

  /* ── 부문 셋 → 다음 글자 ──────────────────────────────── */

  /** RUNES 는 tier 순으로 늘어서 있다 — "다음 글자" 는 그 다음 칸이다 */
  function nextRune(key) {
    var R = GD().RUNES, i;
    for (i = 0; i < R.length; i++) {
      if (R[i].key === key) { return i + 1 < R.length ? R[i + 1] : null; }
    }
    return null;
  }

  function findRune() {
    var out = [], list = it().matList(), i;
    for (i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.kind !== 'rune' || m.n < 3) { continue; }
      var nx = nextRune(m.key);
      if (!nx) { continue; }                                 // 마지막 글자(王)가 끝이다
      out.push({
        id: 'rune:' + m.key,
        label: m.def.glyph + '(' + m.def.name + ') ×3',
        into: nx.glyph + '(' + nx.name + ') ×1',
        color: '#c7a76c', have: m.n
      });
    }
    return out;
  }

  function makeRune(id) {
    var key = id.split(':')[1];
    if (it().matCount('rune', key, 0) < 3) { return { ok: false, reason: 'mat' }; }
    var nx = nextRune(key);
    if (!nx) { return { ok: false, reason: 'top' }; }
    it().addMat('rune', key, 0, -3);
    it().addMat('rune', nx.key, 0, 1);
    core.log('⚗️ 연단 · 부문 ' + nx.glyph + '(' + nx.name + ') 이 나왔다', 'good');
    core.emit('changed');
    return { ok: true, out: { kind: 'rune', key: nx.key } };
  }

  /* ── 장비 셋 → 한 등급 위 ─────────────────────────────── */

  /** 잠그지 않고 **가방에 있는** 것만 재료가 된다 (입고 있는 것은 안 센다) */
  function spare() {
    var b = it().bag(), out = [], i;
    for (i = 0; i < b.length; i++) { if (!b[i].lock) { out.push(b[i]); } }
    return out;
  }

  function findGear() {
    var D = global.DG.itemData;
    var by = {}, list = spare(), i;
    for (i = 0; i < list.length; i++) {
      var g = list[i], b = it().baseOf(g);
      if (!b || g.tier >= D.TIERS.length - 1) { continue; }   // 전설이 끝이다
      var k = b.slot + ':' + g.tier;
      (by[k] = by[k] || []).push(g);
    }
    var out = [], k2;
    for (k2 in by) {
      if (!Object.prototype.hasOwnProperty.call(by, k2) || by[k2].length < 3) { continue; }
      var parts = k2.split(':'), t = parseInt(parts[1], 10);
      var up = D.tier(t + 1);
      out.push({
        id: 'gear:' + k2,
        label: D.tier(t).name + ' ' + D.slotKor(parts[0]) + ' ×3',
        into: up.name + ' ' + D.slotKor(parts[0]) + ' ×1',
        color: up.color, have: by[k2].length
      });
    }
    return out;
  }

  function makeGear(id) {
    var D = global.DG.itemData;
    var p = id.split(':'), slot = p[1], t = parseInt(p[2], 10);
    var list = spare(), pick = [], i;
    for (i = 0; i < list.length && pick.length < 3; i++) {
      var b = it().baseOf(list[i]);
      if (b && b.slot === slot && list[i].tier === t) { pick.push(list[i]); }
    }
    if (pick.length < 3) { return { ok: false, reason: 'mat' }; }
    if (t >= D.TIERS.length - 1) { return { ok: false, reason: 'top' }; }

    /* 나오는 물건의 수준은 **태운 것 중 가장 높은 것**을 따른다 —
       낮은 것에 맞추면 깊이 내려가서 주운 값이 사라진다 */
    var lv = 1;
    for (i = 0; i < 3; i++) { lv = Math.max(lv, pick[i].ilvl || 1); }
    for (i = 0; i < 3; i++) { it().take(pick[i].uid); }

    /* 연단이 낸 물건도 **미확인**이다 — 원작의 큐브 결과와 같다 */
    var out = it().roll(lv, { slot: slot, tier: t + 1 });
    var r = it().add(out);
    core.log('⚗️ 연단 · ' + D.tier(t + 1).name + ' ' + it().name(out) + ' 이 나왔다', 'good');
    core.emit('changed');
    return { ok: true, out: out, kept: r.kept };
  }

  /* ── 접사 다시 굴리기 ─────────────────────────────────── */

  function rerollGems() {
    var n = 0, list = it().matList(), i;
    for (i = 0; i < list.length; i++) {
      if (list[i].kind === 'gem' && list[i].g === REROLL_GEM_G) { n += list[i].n; }
    }
    return n;
  }

  function findReroll() {
    if (rerollGems() < REROLL_GEM_N) { return []; }
    var out = [], list = spare(), i;
    for (i = 0; i < list.length; i++) {
      var g = list[i];
      if (g.tier < 3) { continue; }                           // 보물·전설만
      var t = it().tierOf(g);
      out.push({
        id: 'reroll:' + g.uid,
        label: it().name(g),
        into: '옵션만 다시',
        color: t.color, have: 1
      });
    }
    return out;
  }

  function makeReroll(id) {
    var uid = id.split(':')[1];
    var g = it().find(uid);
    if (!g || g.lock || g.tier < 3) { return { ok: false, reason: 'mat' }; }
    if (rerollGems() < REROLL_GEM_N) { return { ok: false, reason: 'gem' }; }

    /* 완(完) 보석 둘을 아무거나 거둔다 (종류는 안 가린다) */
    var need = REROLL_GEM_N, list = it().matList(), i;
    for (i = 0; i < list.length && need > 0; i++) {
      var m = list[i];
      if (m.kind !== 'gem' || m.g !== REROLL_GEM_G) { continue; }
      var take = Math.min(need, m.n);
      it().addMat('gem', m.key, m.g, -take);
      need -= take;
    }

    /* 같은 밑감·같은 등급·같은 수준으로 한 번 더 굴려 **접사만** 옮겨 붙인다.
       구멍과 박힌 것(sock)은 손대지 않는다 — 박은 것은 못 뺀다는 규칙 그대로다.
       aiName 은 지운다: 사관이 감정해 준 이름은 그때의 옵션을 두고 붙인 것이다. */
    var fresh = it().roll(g.ilvl || 1, { base: g.base, tier: g.tier, sock: 0 });
    g.aff = fresh.aff;
    g.main = fresh.main;
    if (g.aiName) { delete g.aiName; }
    /* 다시 굴린 물건은 **다시 미확인**이다 — 원작에서도 큐브로 리롤한 희귀는
       미확인으로 나온다. 열어 보는 그 순간이 이 조합의 전부다 */
    g.unid = true;

    core.log('⚗️ 연단 · ' + it().name(g) + ' 의 옵션을 다시 뽑았다', 'good');
    core.emit('changed');
    return { ok: true, out: g };
  }

  /* ── 화면이 쓰는 것 ───────────────────────────────────── */

  /** 지금 만들 수 있는 것 전부 — [{recipe, rows[]}] */
  function all() {
    var out = [], i;
    for (i = 0; i < RECIPES.length; i++) {
      out.push({ recipe: RECIPES[i], rows: RECIPES[i].find() });
    }
    return out;
  }

  /** id 는 'gem:jade:0' 처럼 **앞머리가 조합 이름**이다 */
  function make(id) {
    var r = recipeByKey(String(id).split(':')[0]);
    if (!r) { return { ok: false, reason: 'gone' }; }
    var made = r.make(id);
    if (made.ok && global.DG.sfx) { global.DG.sfx.play('forge'); }
    return made;
  }

  global.DG = global.DG || {};
  global.DG.forge = {
    RECIPES: RECIPES, recipeByKey: recipeByKey,
    all: all, make: make, nextRune: nextRune,
    rerollGems: rerollGems, REROLL_GEM_G: REROLL_GEM_G, REROLL_GEM_N: REROLL_GEM_N
  };
})(window);
