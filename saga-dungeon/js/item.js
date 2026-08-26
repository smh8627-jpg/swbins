/**
 * 장비 — 생성(랜덤 롤) · 가방 · 장착 · 능력치 합산 · 자동 정리
 * ---------------------------------------------------------------
 * 아이템은 [기본 종류] + [등급] + [접사] 로 조립된다(data-item.js).
 * 같은 '환도' 라도 옵션이 달라서, 주우면 비교하고 갈아입는 재미가 생긴다.
 *
 * 능력치에 끼어드는 순서는 hero.js 와 한 몸이다. 이 순서를 바꾸지 않는다:
 *
 *   기본치 × 성장배율 × (1 + 장비 pct) + 펫 + 장비 flat
 *
 * 장비의 '전역 접사'(전리품·금·경험치 …)는 부대에 장착된 것만 모아
 * core.effect() 에 합산된다 — 가방에 넣어 두면 아무 효과가 없다.
 */
(function (global) {
  'use strict';

  var core = global.DG.core;
  var D = global.DG.itemData;

  var BAG_BASE = 60;              // 기본 가방 칸

  function gear() {
    var s = core.save;
    if (!s.gear) { s.gear = { seq: 1, bag: [], equip: {} }; }
    if (!s.gear.bag) { s.gear.bag = []; }
    if (!s.gear.equip) { s.gear.equip = {}; }
    if (!s.gear.seq) { s.gear.seq = 1; }
    /* 세공 재료 — 보석과 부문은 장비 칸을 먹지 않고 따로 센다.
       { gem: { '<보석키>:<등급>': 수 }, rune: { '<부문키>': 수 } }
       **주옥만 셈이 다르다** — 접사가 굴러 나와 하나하나가 딴 물건이라
       개수로 못 세고 **낱개로** 들고 있는다: jewel: [{id, aff:[{k,v}]}] */
    if (!s.gear.mats) { s.gear.mats = { gem: {}, rune: {}, jewel: [] }; }
    if (!s.gear.mats.gem) { s.gear.mats.gem = {}; }
    if (!s.gear.mats.rune) { s.gear.mats.rune = {}; }
    if (!s.gear.mats.jewel) { s.gear.mats.jewel = []; }
    return s.gear;
  }

  function bagCap() {
    return BAG_BASE + core.effect('bagSlots');
  }

  /* ── 생성 ─────────────────────────────────────────────── */

  /** 등급 뽑기 — findPct 가 높으면 좋은 등급이 잘 나온다 */
  function rollTier(bias) {
    var find = 1 + (core.effect('findPct') + (bias || 0)) / 100;
    var total = 0, i, w = [];
    for (i = 0; i < D.TIERS.length; i++) {
      // 상품(0등급)은 가중치가 그대로, 위로 갈수록 탐색 보정을 받는다
      var mul = i === 0 ? 1 : Math.pow(find, i);
      w[i] = D.TIERS[i].weight * mul;
      total += w[i];
    }
    var r = Math.random() * total;
    for (i = 0; i < w.length; i++) {
      r -= w[i];
      if (r <= 0) { return i; }
    }
    return 0;
  }

  function SD() { return global.DG.setData; }

  /**
   * 이 물건이 어느 한 벌의 조각인가.
   * 원작의 세트는 **밑감이 정해져 있다** — 아무 칼이나 세트가 되지 않는다.
   */
  function rollSet(base, tier, opts) {
    if (opts && opts.set !== undefined) { return opts.set || null; }
    var S = SD();
    if (!S || tier !== S.SET_TIER) { return null; }
    var set = S.setOfBase(base.key);
    if (!set) { return null; }
    return Math.random() < S.SET_CHANCE ? set.key : null;
  }

  function UD() { return global.DG.uniqueData; }

  /**
   * 이 물건이 어느 고유인가. 원작의 유니크는 **정해진 물건**이라 밑감이 정해져 있다.
   * 고유가 되면 접사는 굴리지 않는다 — 표에 적힌 것이 그대로 붙는다(lines·statBonus 참조).
   */
  function rollUnique(base, tier, opts) {
    if (opts && opts.uniq !== undefined) { return opts.uniq || null; }
    var U = UD();
    if (!U) { return null; }
    var D2 = global.DG.itemData;
    if (tier !== D2.TIERS.length - 1) { return null; }     // 전설(4)에서만
    var u = U.uniqueOfBase(base.key);
    if (!u) { return null; }
    return Math.random() < U.UNIQUE_CHANCE ? u.key : null;
  }

  function uniqOf(it) {
    var U = UD();
    return (it && it.uniq && U) ? U.uniqueByKey(it.uniq) : null;
  }

  /** 고유가 주는 것 — 접사 대신 이 목록이 붙는다 */
  function uniqEffects(it) {
    var u = uniqOf(it);
    return u ? UD().effectsAt(u, it.ilvl || UD().BASE_ILVL) : [];
  }

  function setOf(it) {
    var S = SD();
    return (it && it.set && S) ? S.setByKey(it.set) : null;
  }

  function pickBase(slot) {
    var pool = [], i;
    for (i = 0; i < D.BASES.length; i++) {
      if (!slot || D.BASES[i].slot === slot) { pool.push(D.BASES[i]); }
    }
    return core.pick(pool);
  }

  /**
   * 아이템 하나를 만든다.
   * @param ilvl  아이템 수준 (관문·던전 층수를 그대로 넣으면 된다)
   * @param opts  {slot, tier, bias}
   */
  function roll(ilvl, opts) {
    opts = opts || {};
    ilvl = Math.max(1, Math.round(ilvl || 1));
    var base = opts.base ? D.baseByKey(opts.base) : pickBase(opts.slot);
    var t = opts.tier === undefined ? rollTier(opts.bias) : core.clamp(opts.tier, 0, 4);
    var tier = D.tier(t);

    var aff = [], used = {}, guard = 0;
    while (aff.length < tier.affix && guard < 40) {
      guard++;
      var a = core.pick(D.AFFIXES);
      if (used[a.key]) { continue; }
      used[a.key] = true;
      var span = a.hi - a.lo;
      var grow = a.kind === 'flat' ? (1 + ilvl * 0.055) : (1 + ilvl * 0.022);
      var v = (a.lo + Math.random() * span) * tier.mul * grow;
      aff.push({ k: a.key, v: Math.max(1, Math.round(v)) });
    }

    return {
      uid: 'g' + (gear().seq++),
      base: base.key,
      tier: t,
      ilvl: ilvl,
      main: Math.max(1, Math.round(base.base * tier.mul * (1 + ilvl * 0.085))),
      aff: aff,
      sock: rollSockets(base.slot, t, opts),
      /* 투장(套裝) 조각 — 보물 등급에서, 그 밑감이 한 벌에 속할 때만.
         opts.set 로 진단·데모가 직접 지정할 수 있다(false 면 평범한 물건) */
      set: rollSet(base, t, opts),
      /* 고유(固有) — **전설 등급에서만**. 원작의 유니크 자리다 */
      uniq: rollUnique(base, t, opts),
      /* 미확인(未確認) — 원작에서 마법 이상 등급은 **감정하기 전엔 옵션을 모른다**.
         상품(0)은 접사가 없으니 늘 확인된 채로 나온다(원작의 흰 물건과 같다).
         행상이 파는 것과 투전으로 산 것은 확인된 채다 — opts.unid 로 끈다. */
      unid: opts.unid === false ? false : t >= 1
    };
  }

  /* ── 감정(鑑定) ────────────────────────────────────────────
   * 원작에서 줍는 맛의 절반은 **"?" 를 여는 것**이다. 바닥에 노란 이름이 떴을 때,
   * 그게 쓸 물건인지 팔 물건인지는 감정서를 태워 봐야 안다.
   *
   * 원작에서 그대로 지킨 것 셋
   *   · **미확인은 장착할 수 없다.** 그래서 감정서가 늘 아쉽다
   *   · **상품(흰 물건)은 감정이 필요 없다** — 접사가 없다
   *   · **행상·투전에서 산 것은 확인된 채로 온다** (원작도 그렇다)
   * 감정서는 행상이 싸게 판다 — 금을 쓸 데를 하나 더 만드는 자리다.
   */

  function scrolls() {
    var s = core.save;
    if (!s.items) { s.items = {}; }
    if (typeof s.items.ident !== 'number') { s.items.ident = 0; }
    return s.items.ident;
  }

  function addScroll(n) {
    scrolls();
    core.save.items.ident = Math.max(0, core.save.items.ident + (n === undefined ? 1 : n));
    return core.save.items.ident;
  }

  function isUnid(it) { return !!(it && it.unid); }

  /** 가방에 있는 미확인 물건 */
  function unidList() {
    return bag().filter(isUnid);
  }

  /**
   * 한 점 감정한다 — 감정서 한 장을 태운다.
   * @return {ok, reason} reason: 'gone' 없는 물건 · 'done' 이미 확인됨 · 'scroll' 감정서 없음
   */
  function identify(uid) {
    var it = find(uid);
    if (!it) { return { ok: false, reason: 'gone' }; }
    if (!it.unid) { return { ok: false, reason: 'done' }; }
    if (scrolls() < 1) { return { ok: false, reason: 'scroll' }; }
    addScroll(-1);
    delete it.unid;
    var t = tierOf(it);
    core.log('🔎 감정 · ' + t.name + ' ' + name(it), it.tier >= 3 ? 'good' : 'info');
    core.emit('changed');
    return { ok: true, item: it };
  }

  /** 가진 감정서가 닿는 데까지 — **좋은 등급부터** 연다 */
  function identifyAll() {
    var list = unidList().sort(function (a, b) { return b.tier - a.tier; });
    var done = 0, i;
    for (i = 0; i < list.length && scrolls() > 0; i++) {
      if (identify(list[i].uid).ok) { done++; }
    }
    return { done: done, left: unidList().length };
  }

  /* ── 세공 구멍 ─────────────────────────────────────────────
   * 디아블로에서 소켓은 **아이템이 나올 때 정해진다**. 뒤에 늘릴 수 없다.
   * 무기 3 · 갑주 3 · 부적 2 까지. 좋은 등급일수록 뚫려 나오기 쉽다.
   */

  var SOCK_MAX = { weapon: 3, armor: 3, charm: 2 };

  function rollSockets(slot, tier, opts) {
    if (opts && opts.sock !== undefined) {
      var n0 = core.clamp(opts.sock, 0, SOCK_MAX[slot] || 2);
      return new Array(n0).fill(null);
    }
    var max = SOCK_MAX[slot] || 2;
    var chance = 0.28 + tier * 0.08;                 // 상품 28% → 전설 60%
    if (Math.random() > chance) { return []; }
    var n = 1;
    while (n < max && Math.random() < 0.42) { n++; }
    return new Array(n).fill(null);
  }

  /** 이 장비의 구멍 (옛 세이브에는 칸이 없다) */
  function socketsOf(it) {
    if (!it.sock) { it.sock = []; }
    return it.sock;
  }

  function emptySockets(it) {
    var s = socketsOf(it), n = 0;
    for (var i = 0; i < s.length; i++) { if (!s[i]) { n++; } }
    return n;
  }

  /* ── 세공(細工) ────────────────────────────────────────────
   * 원작(디아블로)의 규칙 둘을 그대로 지킨다:
   *   1) **한 번 박은 것은 빼지 못한다** — 어디에 박을지가 선택이 된다
   *   2) 부문(룬)은 **순서까지 맞아야** 부문어가 된다 (data-gem.js wordOf)
   */

  function GD() { return global.DG.gemData; }

  function matKeyOf(kind, key, g) {
    return kind === 'gem' ? (key + ':' + (g || 0)) : key;
  }

  /** 재료를 넣고 뺀다. n 이 음수면 거둬 간다(연단) — **0 밑으로는 안 내려간다** */
  function addMat(kind, key, g, n) {
    var m = gear().mats[kind === 'gem' ? 'gem' : 'rune'];
    var k = matKeyOf(kind, key, g);
    m[k] = Math.max(0, (m[k] || 0) + (n === undefined ? 1 : n));
    if (!m[k]) { delete m[k]; return 0; }
    return m[k];
  }

  function matCount(kind, key, g) {
    if (kind === 'jewel') { return jewelById(key) ? 1 : 0; }
    var m = gear().mats[kind === 'gem' ? 'gem' : 'rune'];
    return m[matKeyOf(kind, key, g)] || 0;
  }

  /* ── 주옥(珠玉) ────────────────────────────────────────────
   * 보석·부문은 **개수**지만 주옥은 **낱개**다 — 접사가 굴러 나오므로
   * 같은 주옥이 둘 없다. 그래서 여기만 배열이고, id 로 가리킨다.
   * 요대(potion.js)와 같은 규칙을 쓴다: **차면 바닥에 남는다.**
   * 재료가 무한히 쌓여 세이브가 부푸는 것을 막는 유일한 장치다.
   */

  function jewels() { return gear().mats.jewel; }

  function jewelCap() {
    var GDx = GD();
    return (GDx && GDx.JEWEL_MAX) || 40;
  }

  function jewelById(id) {
    var list = jewels();
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i]; } }
    return null;
  }

  /**
   * 주옥을 주머니에 넣는다.
   * @param j data-gem.js rollJewel() 이 준 것 (id 는 여기서 붙인다)
   * @returns {{ok:boolean, reason?:string, jewel?:object}} 'full' 이면 바닥에 남는다
   */
  function addJewel(j) {
    if (!j || !j.aff) { return { ok: false, reason: 'bad' }; }
    if (jewels().length >= jewelCap()) { return { ok: false, reason: 'full' }; }
    var made = { id: 'j' + (gear().seq++), aff: j.aff };
    jewels().push(made);
    return { ok: true, jewel: made };
  }

  /** 주머니에서 뺀다 (박거나 버릴 때) */
  function removeJewel(id) {
    var list = jewels();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { return list.splice(i, 1)[0]; }
    }
    return null;
  }

  /** 가진 재료 목록 (화면용) */
  function matList() {
    var g = gear().mats, out = [], k, parts, def;
    for (k in g.gem) {
      if (!Object.prototype.hasOwnProperty.call(g.gem, k) || !g.gem[k]) { continue; }
      parts = k.split(':');
      def = GD().gemByKey(parts[0]);
      if (!def) { continue; }
      out.push({ kind: 'gem', key: parts[0], g: parseInt(parts[1], 10),
                 def: def, grade: GD().grade(parseInt(parts[1], 10)), n: g.gem[k] });
    }
    for (k in g.rune) {
      if (!Object.prototype.hasOwnProperty.call(g.rune, k) || !g.rune[k]) { continue; }
      def = GD().runeByKey(k);
      if (!def) { continue; }
      out.push({ kind: 'rune', key: k, def: def, n: g.rune[k] });
    }
    out.sort(function (a, b) {
      if (a.kind !== b.kind) { return a.kind === 'rune' ? -1 : 1; }
      return (b.g || 0) - (a.g || 0);
    });
    /* 주옥은 낱개라 개수로 못 묶는다 — 뒤에 따로 붙인다.
       key 자리에 **id** 가 온다(세공 화면과 socket() 이 그걸로 가리킨다) */
    var jl = jewels();
    for (var ji = 0; ji < jl.length; ji++) {
      out.push({ kind: 'jewel', key: jl[ji].id, g: 0, def: null,
                 jewel: jl[ji], n: 1 });
    }
    return out;
  }

  /**
   * 박는다. 빈 구멍 중 **가장 앞자리**에 들어간다(부문어는 순서를 보므로).
   * @returns {{ok:boolean, reason?:string, word?:object}}
   */
  function socket(uid, kind, key, g) {
    var it = find(uid);
    if (!it) { return { ok: false, reason: 'noitem' }; }
    var sock = socketsOf(it);
    var idx = sock.indexOf(null);
    if (idx < 0) { return { ok: false, reason: 'nosocket' }; }
    if (matCount(kind, key, g) < 1) { return { ok: false, reason: 'nomat' }; }

    var label;
    if (kind === 'jewel') {
      /* 주옥은 낱개라 주머니에서 **그 물건 자체**를 빼서 구멍에 옮긴다 */
      var jw = removeJewel(key);
      sock[idx] = { t: 'jewel', j: { id: jw.id, aff: jw.aff } };
      label = GD().jewelName(jw);
    } else {
      var m = gear().mats[kind === 'gem' ? 'gem' : 'rune'];
      var mk = matKeyOf(kind, key, g);
      m[mk] -= 1;
      if (!m[mk]) { delete m[mk]; }
      sock[idx] = kind === 'gem' ? { t: 'gem', key: key, g: g || 0 } : { t: 'rune', key: key };
      label = kind === 'gem'
        ? (GD().grade(g).name + ' ' + GD().gemByKey(key).name)
        : (GD().runeByKey(key).glyph + '(' + GD().runeByKey(key).name + ')');
    }
    var word = wordOf(it);
    if (global.DG.sfx) { global.DG.sfx.play(word ? 'word' : 'socket'); }
    core.log('🔨 ' + name(it) + ' 에 ' + label + ' 을(를) 박았다' +
      (word ? ' — 부문어 《' + word.name + '》 이 이루어졌다!' : ''), word ? 'good' : 'info');
    if (word) { core.emit('toast', '《' + word.name + '》 — ' + word.desc); }
    core.emit('changed');
    core.persist();
    return { ok: true, word: word, at: idx };
  }

  /** 이 장비에 이루어진 부문어 (없으면 null) */
  function wordOf(it) {
    var b = baseOf(it);
    if (!b) { return null; }
    return GD().wordOf(socketsOf(it), b.slot);
  }

  /**
   * 박힌 것이 내는 효과 목록.
   * 부문어가 이루어졌으면 **글자 하나하나 대신 부문어의 효과**만 낸다(원작과 같다).
   */
  function socketEffects(it) {
    var b = baseOf(it);
    if (!b) { return []; }
    var word = wordOf(it);
    if (word) { return word.eff.slice(); }
    var sock = socketsOf(it), out = [];
    for (var i = 0; i < sock.length; i++) {
      var s0 = sock[i];
      if (!s0) { continue; }
      if (s0.t === 'jewel') {
        /* 주옥은 **부위를 안 가린다** — 어디에 박아도 같은 것을 준다(원작의 주얼) */
        out = out.concat(GD().jewelEff(s0.j));
      } else if (s0.t === 'gem') {
        var gd = GD().gemByKey(s0.key);
        if (!gd || !gd[b.slot]) { continue; }
        var e = gd[b.slot], mul = GD().grade(s0.g).mul;
        out.push({ kind: e.kind, stat: e.stat, eff: e.eff, el: e.el,
                   v: Math.max(1, Math.round(e.v * mul)) });
      } else {
        var rd = GD().runeByKey(s0.key);
        if (rd) { out.push(rd.eff); }
      }
    }
    return out;
  }

  /* ── 표기 ─────────────────────────────────────────────── */

  function baseOf(it) { return D.baseByKey(it.base); }
  function tierOf(it) { return D.tier(it.tier); }

  /**
   * '용맹한 환도 · 약탈' 처럼 접사를 이름에 녹인다.
   * 사관에게 감정을 받은 물건은 **그 이름을 쓴다** (ai.js appraise).
   */
  function name(it) {
    /* 미확인이면 **밑감 이름만** 보인다 — 접사가 이름에 녹아 있으므로
       그대로 부르면 옵션이 이름으로 새어 나간다 */
    if (it.unid) {
      var bu = baseOf(it);
      return bu ? bu.name : '?';
    }
    if (it.aiName) { return it.aiName; }
    /* 고유는 **제 이름으로 불린다** — 원작의 유니크가 그렇다 */
    var uq = uniqOf(it);
    if (uq) { return uq.name; }
    /* 투장 조각은 **한 벌 이름으로 불린다** — 원작의 세트 아이템처럼 */
    var st0 = setOf(it);
    if (st0) {
      var bs = baseOf(it);
      return '〈' + st0.name + '〉 ' + (bs ? bs.name : '');
    }
    /* 부문어가 이루어졌으면 그 이름으로 불린다 (원작 룬워드와 같다) */
    var w = wordOf(it);
    var b0 = baseOf(it);
    if (w && b0) { return '《' + w.name + '》 ' + b0.name; }
    var b = baseOf(it);
    if (!b) { return '?'; }
    var pre = '', post = '', i;
    for (i = 0; i < it.aff.length; i++) {
      var a = D.affixByKey(it.aff[i].k);
      if (!a) { continue; }
      if (a.pre && !pre) { pre = a.pre + ' '; }
      else if (a.post && !post) { post = ' · ' + a.post; }
    }
    return pre + b.name + post;
  }

  /** 옵션 한 줄씩 (화면용) */
  function lines(it) {
    if (it.unid) { return ['미확인 — 감정해야 옵션이 보입니다']; }
    var b = baseOf(it), out = [], i;
    /* 고유는 접사가 없고 **표에 적힌 것**이 붙는다 */
    var uqe = uniqEffects(it);
    if (uqe.length) {
      if (b) { out.push(statKor(b.main) + ' +' + it.main); }
      for (i = 0; i < uqe.length; i++) { out.push(effLine(uqe[i])); }
      out = out.concat(socketLines(it));
      return out;
    }
    if (b) { out.push(statKor(b.main) + ' +' + it.main); }
    for (i = 0; i < it.aff.length; i++) {
      var a = D.affixByKey(it.aff[i].k);
      if (!a) { continue; }
      if (a.kind === 'flat') { out.push(a.label + ' +' + it.aff[i].v); }
      else if (a.kind === 'pct') { out.push(a.label + ' +' + it.aff[i].v + '%'); }
      else { out.push(a.label + ' +' + it.aff[i].v + '%'); }
    }
    /* 박힌 것 */
    out = out.concat(socketLines(it));
    return out;
  }

  /** 효과 하나를 사람 말로 (고유·보석·투장이 같은 모양을 쓴다) */
  function effLine(e, mark) {
    var m = mark || '';
    if (e.kind === 'flat') {
      return m + (e.stat === 'all' ? '능력치' : statKor(e.stat)) + ' +' + e.v;
    }
    if (e.kind === 'pct') {
      return m + (e.stat === 'all' ? '능력치' : statKor(e.stat)) + ' +' + e.v + '%';
    }
    if (e.kind === 'eldmg') {
      return m + global.DG.elemData.elemName(e.el) + ' 피해 +' + e.v;
    }
    if (e.kind === 'elres') {
      return m + global.DG.elemData.elemName(e.el) + ' 저항 +' + e.v + '%';
    }
    return m + effKor(e.eff) + ' +' + e.v + '%';
  }

  function socketLines(it) {
    var eff = socketEffects(it), out = [], i;
    for (i = 0; i < eff.length; i++) { out.push(effLine(eff[i], '🔨 ')); }
    return out;
  }

  /** 전역 효과 키를 우리말로 — 접사 표(data-item.js)의 label 을 그대로 쓴다 */
  function effKor(key) {
    for (var i = 0; i < D.AFFIXES.length; i++) {
      if (D.AFFIXES[i].eff === key) { return D.AFFIXES[i].label; }
    }
    return key;
  }

  function statKor(s) {
    return ({ might: '무력', wisdom: '지력', command: '통솔' })[s] || s;
  }

  /** 대략적인 값어치 — 자동 정리와 추천 표시에 쓴다 */
  function power(it) {
    var b = baseOf(it), p = 0, i;
    if (b) { p += it.main * (b.main === 'might' ? 0.7 : (b.main === 'command' ? 0.6 : 0.5)); }
    /* 고유는 접사가 없으므로 표에 적힌 것으로 값을 매긴다 */
    var uqp = uniqEffects(it);
    for (i = 0; i < uqp.length; i++) {
      var ue2 = uqp[i];
      if (ue2.kind === 'flat') { p += ue2.stat === 'all' ? ue2.v * 1.8 : ue2.v * 0.62; }
      else if (ue2.kind === 'pct') { p += ue2.stat === 'all' ? ue2.v * 3.4 : ue2.v * 1.3; }
      else { p += ue2.v * 1.5; }
    }
    for (i = 0; i < it.aff.length; i++) {
      var a = D.affixByKey(it.aff[i].k);
      if (!a) { continue; }
      var v = it.aff[i].v;
      if (a.kind === 'flat') { p += a.stat === 'all' ? v * 1.8 : v * 0.62; }
      else if (a.kind === 'pct') { p += a.stat === 'all' ? v * 3.4 : v * 1.3; }
      else { p += v * 1.5; }
    }
    return Math.round(p);
  }

  function price(it) {
    return Math.round(18 * Math.pow(it.tier + 1, 1.7) * (1 + it.ilvl * 0.12));
  }

  /* ── 요구 수준(要求) — 원작의 Required Level ────────────────
   * 원작에서 좋은 물건은 **아직 못 입는다.** 주워 놓고 레벨이 오르기를 기다리는
   * 그 시간이 물건에 무게를 준다. 이 판은 여태 줍자마자 다 입었다.
   *
   * 수준(ilvl)과 등급으로 정한다 — 표를 새로 만들지 않는다.
   * 부적은 요구가 낮다(원작의 장신구도 그렇다).
   */
  function reqLevel(it) {
    var b = baseOf(it);
    if (!b) { return 1; }
    var slotMul = b.slot === 'charm' ? 0.55 : 1;
    var n = Math.round(((it.ilvl || 1) * 0.62 + it.tier * 3) * slotMul);
    return Math.max(1, n);
  }

  /** 이 인물이 입을 수 있나 */
  function meetsReq(heroId, it) {
    var info = global.DG.hero.info(heroId);
    return ((info && info.lv) || 1) >= reqLevel(it);
  }

  /* ── 원소(元素) — 원작의 피해 속성 ──────────────────────────
   * 보석을 어디에 박느냐가 곧 결이다 (data-gem.js):
   *   무기 → 그 원소의 **피해** · 갑주 → 그 원소의 **저항** · 부적 → 능력치.
   * 여기서는 **걷어 오기만** 한다 — 실제로 때리고 맞는 계산은 dungeon.js 다.
   *
   * 값은 늘 **선두(부대의 첫 인물)** 기준이다. 던전에서 몸으로 뛰는 것이 선두이고,
   * 원작의 인물 하나에 해당하는 자리다.
   */

  /** 무기에 박힌 원소 피해 { fire: n, … } */
  function elemDamage(heroId) {
    var out = {}, eq = gear().equip[heroId], s, i;
    if (!eq) { return out; }
    for (s in eq) {
      if (!Object.prototype.hasOwnProperty.call(eq, s) || !eq[s]) { continue; }
      if (isBroken(eq[s])) { continue; }
      var se = socketEffects(eq[s]).concat(uniqEffects(eq[s]));
      for (i = 0; i < se.length; i++) {
        if (se[i].kind !== 'eldmg') { continue; }
        out[se[i].el] = (out[se[i].el] || 0) + se[i].v;
      }
    }
    return out;
  }

  /** 갑주에 박힌 원소 저항 { fire: n, … } — 백분율이다 */
  function elemResist(heroId) {
    var out = {}, eq = gear().equip[heroId], s, i;
    if (!eq) { return out; }
    for (s in eq) {
      if (!Object.prototype.hasOwnProperty.call(eq, s) || !eq[s]) { continue; }
      if (isBroken(eq[s])) { continue; }
      var se = socketEffects(eq[s]).concat(uniqEffects(eq[s]));
      for (i = 0; i < se.length; i++) {
        if (se[i].kind !== 'elres') { continue; }
        out[se[i].el] = (out[se[i].el] || 0) + se[i].v;
      }
    }
    return out;
  }

  /* ── 내구(耐久)와 수리(修理) ───────────────────────────────
   * 원작에서 장비는 쓰면 닳고, 다 닳으면 **부서져 아무 값도 안 낸다**.
   * 사라지지는 않는다 — 상인에게 가서 금을 내면 도로 쓴다.
   * 그 한 바퀴가 "마을에 들를 이유" 를 만든다.
   *
   * 이 판에서 정한 것
   *   · **층을 내려갈 때마다 1** 닳는다. 한 대 맞을 때마다 닳게 하면 판정 층
   *     한복판을 건드려야 한다 — 층을 내려가는 자리(descend) 하나면 족하다
   *   · **부적은 안 닳는다.** 원작에서도 반지·목걸이·부적에는 내구가 없다
   *   · 부서져도 **없어지지 않는다.** 값도 그대로다(팔 수 있다) —
   *     다만 능력치를 안 준다. `power()` 는 그 물건의 값어치이지 지금 내는
   *     값이 아니므로 손대지 않는다. 실제로 안 붙는 자리는 statBonus·partyEffect 다
   *   · **자동은 부서진 것을 팔지 않는다** — 수리하면 되는 물건이다
   */

  /** 부위마다 다르다. 부적은 0 — 안 닳는다 */
  function durMaxOf(it) {
    var b = baseOf(it);
    if (!b || b.slot === 'charm') { return 0; }
    return 24 + it.tier * 10;                 // 상품 24 … 전설 64
  }

  /** 옛 세이브엔 칸이 없다 — 가득 찬 것으로 본다 */
  function durOf(it) {
    var max = durMaxOf(it);
    if (!max) { return 0; }
    if (typeof it.dur !== 'number') { it.dur = max; }
    return core.clamp(it.dur, 0, max);
  }

  function isBroken(it) {
    var max = durMaxOf(it);
    return !!max && durOf(it) <= 0;
  }

  /** 동행이 **입고 있는 것만** 닳는다 (가방에 든 것은 안 쓴 물건이다) */
  function wearAll(n) {
    n = n || 1;
    var p = core.save.party, broke = [], i, s;
    for (i = 0; i < p.length; i++) {
      var eq = gear().equip[p[i]];
      if (!eq) { continue; }
      for (s in eq) {
        if (!Object.prototype.hasOwnProperty.call(eq, s) || !eq[s]) { continue; }
        var it = eq[s], max = durMaxOf(it);
        if (!max) { continue; }
        var was = durOf(it);
        it.dur = core.clamp(was - n, 0, max);
        if (was > 0 && it.dur <= 0) { broke.push({ hero: p[i], item: it }); }
      }
    }
    for (i = 0; i < broke.length; i++) {
      core.log('🔧 ' + name(broke[i].item) + ' 이(가) 부서졌다 — 수리하기 전엔 값을 못 낸다', 'bad');
    }
    if (broke.length) { core.emit('changed'); }
    return broke.length;
  }

  /** 수리 값 — 닳은 만큼만 낸다 */
  function repairCost(it) {
    var max = durMaxOf(it);
    if (!max) { return 0; }
    var lost = max - durOf(it);
    if (lost <= 0) { return 0; }
    return Math.max(1, Math.round(price(it) * 0.4 * (lost / max)));
  }

  /** 입고 있든 가방에 있든 한 점 고친다 */
  function repair(uid) {
    var it = findAnywhere(uid);
    if (!it) { return { ok: false, reason: 'gone' }; }
    var cost = repairCost(it);
    if (!cost) { return { ok: false, reason: 'full' }; }
    if (core.save.player.gold < cost) { return { ok: false, reason: 'gold' }; }
    core.save.player.gold -= cost;
    it.dur = durMaxOf(it);
    core.emit('changed');
    return { ok: true, cost: cost };
  }

  /** 닳은 것 전부 — **입고 있는 것만** 센다(원작의 "모두 수리" 도 착용분이다) */
  function repairList() {
    var p = core.save.party, out = [], i, s;
    for (i = 0; i < p.length; i++) {
      var eq = gear().equip[p[i]];
      if (!eq) { continue; }
      for (s in eq) {
        if (!Object.prototype.hasOwnProperty.call(eq, s) || !eq[s]) { continue; }
        if (repairCost(eq[s]) > 0) { out.push({ hero: p[i], item: eq[s] }); }
      }
    }
    return out;
  }

  function repairAllCost() {
    var l = repairList(), n = 0, i;
    for (i = 0; i < l.length; i++) { n += repairCost(l[i].item); }
    return n;
  }

  function repairAll() {
    var cost = repairAllCost();
    if (!cost) { return { ok: false, reason: 'full' }; }
    if (core.save.player.gold < cost) { return { ok: false, reason: 'gold' }; }
    var l = repairList(), i;
    core.save.player.gold -= cost;
    for (i = 0; i < l.length; i++) { l[i].item.dur = durMaxOf(l[i].item); }
    core.log('🔧 장비 ' + l.length + '점 수리 · 금 -' + core.fmt(cost), 'info');
    core.emit('changed');
    return { ok: true, cost: cost, n: l.length };
  }

  /* ── 가방 · 창고 ───────────────────────────────────────── */

  function bag() { return gear().bag; }

  /* ── 창고(倉庫) — 원작의 stash ────────────────────────────
   * 원작의 창고가 하는 일은 "쌓아 둘 자리" 하나가 아니다.
   * **던전에 들고 가지 않는 자리**이고, 그래서 마을에서만 열린다.
   *
   * 이 판의 가방은 예순 칸이라 자리가 모자라서 만드는 게 아니다.
   * 뜻은 하나다 — **자동이 손대지 않는 자리**.
   *   · 자동 정리(autoClean)가 팔지 않는다
   *   · 자동 장착(autoEquip)이 고르지 않는다
   *   · 연단(forge)이 재료로 태우지 않는다
   *   · 되는 데까지 감정(identifyAll)이 건드리지 않는다
   * 그래서 "이건 남겨 둘 것" 을 잠금(🔒) 대신 **자리로** 나눌 수 있다.
   * 위 넷은 전부 bag() 만 훑으므로, 창고에 넣는 것만으로 저절로 지켜진다.
   *
   * 원작 그대로 **던전 안에서는 못 연다**.
   */

  var STASH_CAP = 60;

  function stash() {
    var g = gear();
    if (!g.stash) { g.stash = []; }
    return g.stash;
  }

  function stashCap() { return STASH_CAP; }

  /** 던전 안에서는 창고를 못 연다 (원작과 같다) */
  function stashOpen() {
    var D = global.DG.dungeon;
    return !(D && D.active());
  }

  /** 가방 → 창고 */
  function toStash(uid) {
    if (!stashOpen()) { return { ok: false, reason: 'dungeon' }; }
    if (stash().length >= STASH_CAP) { return { ok: false, reason: 'full' }; }
    var b = bag(), i;
    for (i = 0; i < b.length; i++) {
      if (b[i].uid !== uid) { continue; }
      stash().push(b.splice(i, 1)[0]);
      core.emit('changed');
      return { ok: true };
    }
    return { ok: false, reason: 'gone' };
  }

  /** 창고 → 가방 */
  function fromStash(uid) {
    if (!stashOpen()) { return { ok: false, reason: 'dungeon' }; }
    if (bag().length >= bagCap()) { return { ok: false, reason: 'full' }; }
    var s = stash(), i;
    for (i = 0; i < s.length; i++) {
      if (s[i].uid !== uid) { continue; }
      bag().push(s.splice(i, 1)[0]);
      core.emit('changed');
      return { ok: true };
    }
    return { ok: false, reason: 'gone' };
  }

  /** 창고에 있는 것도 찾을 수 있어야 한다 (상세·세공이 uid 로 물어본다) */
  function findAnywhere(uid) {
    var it = find(uid);
    if (it) { return it; }
    var s = stash(), i;
    for (i = 0; i < s.length; i++) { if (s[i].uid === uid) { return s[i]; } }
    return null;
  }

  function find(uid) {
    var b = bag(), i;
    for (i = 0; i < b.length; i++) { if (b[i].uid === uid) { return b[i]; } }
    var eq = gear().equip, h;
    for (h in eq) {
      if (!Object.prototype.hasOwnProperty.call(eq, h)) { continue; }
      for (var s in eq[h]) {
        if (Object.prototype.hasOwnProperty.call(eq[h], s) && eq[h][s] && eq[h][s].uid === uid) {
          return eq[h][s];
        }
      }
    }
    return null;
  }

  /**
   * 가방에 넣는다. 꽉 찼으면 즉시 팔아 금으로 바꾼다(주운 게 사라지진 않게).
   * @returns {{it, kept:boolean, gold:number}}
   */
  function add(it) {
    if (bag().length >= bagCap()) {
      var g = price(it);
      core.save.player.gold += g;
      return { it: it, kept: false, gold: g };
    }
    bag().push(it);
    return { it: it, kept: true, gold: 0 };
  }

  /** 전투·던전에서 물건이 떨어졌을 때 — 등급이 높으면 알린다 */
  function drop(ilvl, opts) {
    var it = roll(ilvl, opts);
    var r = add(it);
    var t = tierOf(it);
    if (it.tier >= 2) {
      core.log('🎁 ' + t.name + ' ' + name(it) + ' 획득' + (r.kept ? '' : ' (가방이 꽉 차 매각)'), 'good');
      core.emit('toast', '🎁 ' + t.name + ' · ' + name(it));
    }
    core.emit('gear:drop', r);
    return r;
  }

  /**
   * 가방에서 하나 **없앤다** (금은 안 준다).
   * 연단(forge.js)이 재료로 태울 때 쓴다 — sell 을 쓰면 태운 값이 금으로 돌아와
   * "셋을 태워 하나를 얻는다" 가 아니라 "셋을 팔고 하나를 산다" 가 된다.
   * 잠근 것(🔒)은 안 없앤다.
   */
  function take(uid) {
    var b = bag(), i;
    for (i = 0; i < b.length; i++) {
      if (b[i].uid !== uid) { continue; }
      if (b[i].lock) { return null; }
      return b.splice(i, 1)[0];
    }
    return null;
  }

  function sell(uid) {
    var b = bag(), i;
    for (i = 0; i < b.length; i++) {
      if (b[i].uid !== uid) { continue; }
      if (b[i].lock) { return 0; }
      var g = price(b[i]);
      core.save.player.gold += g;
      b.splice(i, 1);
      return g;
    }
    return 0;
  }

  function toggleLock(uid) {
    var it = find(uid);
    if (it) { it.lock = !it.lock; }
    return it ? !!it.lock : false;
  }

  /* ── 장착 ─────────────────────────────────────────────── */

  function equipped(heroId) {
    var eq = gear().equip;
    if (!eq[heroId]) { eq[heroId] = {}; }
    return eq[heroId];
  }

  function equip(heroId, uid) {
    var b = bag(), i, it = null;
    for (i = 0; i < b.length; i++) { if (b[i].uid === uid) { it = b[i]; break; } }
    if (!it) { return false; }
    if (it.unid) { return false; }          // 미확인은 못 입는다 (원작과 같다)
    if (!meetsReq(heroId, it)) { return false; }   // 아직 못 입는다 (요구 수준)
    if (!core.save.dex.heroes[heroId]) { return false; }
    var base = baseOf(it);
    if (!base) { return false; }
    var slot = base.slot;
    var cur = equipped(heroId)[slot];
    b.splice(i, 1);                        // 가방에서 빼고
    if (cur) { b.push(cur); }              // 입고 있던 건 가방으로
    equipped(heroId)[slot] = it;
    core.emit('changed');
    return true;
  }

  function unequip(heroId, slot) {
    var eq = equipped(heroId);
    if (!eq[slot]) { return false; }
    if (bag().length >= bagCap()) { return false; }   // 가방이 꽉 차면 벗지 않는다
    bag().push(eq[slot]);
    delete eq[slot];
    core.emit('changed');
    return true;
  }

  /* ── 능력치 합산 ──────────────────────────────────────── */

  /**
   * 한 인물의 장비 보정.
   * @returns {{flat:{might,wisdom,command}, pct:{might,wisdom,command}}}
   */
  /* ── 투장(套裝) ────────────────────────────────────────────
   * **같은 인물이** 걸친 조각만 센다. 동행 다섯에 흩어 놓고 채워지면
   * 그건 세트가 아니라 창고 정리다. 부서진 것은 값을 하나도 안 내므로 안 센다.
   */

  /** { setKey: 걸친 수 } */
  function setCounts(heroId) {
    var eq = gear().equip[heroId], out = {}, s;
    if (!eq) { return out; }
    for (s in eq) {
      if (!Object.prototype.hasOwnProperty.call(eq, s) || !eq[s]) { continue; }
      if (isBroken(eq[s])) { continue; }
      if (!eq[s].set) { continue; }
      out[eq[s].set] = (out[eq[s].set] || 0) + 1;
    }
    return out;
  }

  /** 지금 붙는 투장 효과 전부 (socketEffects 와 같은 모양) */
  function setEffects(heroId) {
    var S = SD();
    if (!S) { return []; }
    var cnt = setCounts(heroId), out = [], k;
    for (k in cnt) {
      if (!Object.prototype.hasOwnProperty.call(cnt, k)) { continue; }
      out = out.concat(S.bonusFor(S.setByKey(k), cnt[k]));
    }
    return out;
  }

  function statBonus(heroId) {
    var out = { flat: { might: 0, wisdom: 0, command: 0 }, pct: { might: 0, wisdom: 0, command: 0 } };
    var eq = gear().equip[heroId];
    if (!eq) { return out; }
    var s, i;

    /* 투장 — 걸친 수만큼 (socketEffects 와 같은 모양이라 같은 식으로 더한다) */
    var sf = setEffects(heroId);
    for (i = 0; i < sf.length; i++) {
      var sef = sf[i];
      if (sef.kind === 'flat') {
        if (sef.stat === 'all') {
          out.flat.might += sef.v; out.flat.wisdom += sef.v; out.flat.command += sef.v;
        } else { out.flat[sef.stat] += sef.v; }
      } else if (sef.kind === 'pct') {
        if (sef.stat === 'all') {
          out.pct.might += sef.v; out.pct.wisdom += sef.v; out.pct.command += sef.v;
        } else { out.pct[sef.stat] += sef.v; }
      }
    }
    for (s in eq) {
      if (!Object.prototype.hasOwnProperty.call(eq, s) || !eq[s]) { continue; }
      var it = eq[s], b = baseOf(it);
      if (isBroken(it)) { continue; }        // 부서진 것은 아무 값도 안 낸다
      if (b) { out.flat[b.main] += it.main; }
      /* 고유가 주는 것 (접사 자리를 대신한다) */
      var uqs = uniqEffects(it);
      for (i = 0; i < uqs.length; i++) {
        var ue = uqs[i];
        if (ue.kind === 'flat') {
          if (ue.stat === 'all') {
            out.flat.might += ue.v; out.flat.wisdom += ue.v; out.flat.command += ue.v;
          } else { out.flat[ue.stat] += ue.v; }
        } else if (ue.kind === 'pct') {
          if (ue.stat === 'all') {
            out.pct.might += ue.v; out.pct.wisdom += ue.v; out.pct.command += ue.v;
          } else { out.pct[ue.stat] += ue.v; }
        }
      }
      /* 박힌 것(보석·부문·부문어) */
      var se = socketEffects(it);
      for (i = 0; i < se.length; i++) {
        var e0 = se[i];
        if (e0.kind === 'flat') {
          if (e0.stat === 'all') {
            out.flat.might += e0.v; out.flat.wisdom += e0.v; out.flat.command += e0.v;
          } else { out.flat[e0.stat] += e0.v; }
        } else if (e0.kind === 'pct') {
          if (e0.stat === 'all') {
            out.pct.might += e0.v; out.pct.wisdom += e0.v; out.pct.command += e0.v;
          } else { out.pct[e0.stat] += e0.v; }
        }
      }
      for (i = 0; i < it.aff.length; i++) {
        var a = D.affixByKey(it.aff[i].k);
        if (!a) { continue; }
        var v = it.aff[i].v;
        if (a.kind === 'flat') {
          if (a.stat === 'all') { out.flat.might += v; out.flat.wisdom += v; out.flat.command += v; }
          else { out.flat[a.stat] += v; }
        } else if (a.kind === 'pct') {
          if (a.stat === 'all') { out.pct.might += v; out.pct.wisdom += v; out.pct.command += v; }
          else { out.pct[a.stat] += v; }
        }
      }
    }
    return out;
  }

  /** 부대가 장착한 장비의 전역 접사 합 — core.effect() 가 더한다 */
  function partyEffect() {
    var out = {}, p = core.save.party, i, s, j;
    for (i = 0; i < p.length; i++) {
      var eq = gear().equip[p[i]];
      if (!eq) { continue; }
      /* 투장의 전역 효과 (전리품·금·경험치 같은 것) */
      var sfx = setEffects(p[i]);
      for (j = 0; j < sfx.length; j++) {
        if (sfx[j].kind !== 'world') { continue; }
        out[sfx[j].eff] = (out[sfx[j].eff] || 0) + sfx[j].v;
      }
      for (s in eq) {
        if (!Object.prototype.hasOwnProperty.call(eq, s) || !eq[s]) { continue; }
        if (isBroken(eq[s])) { continue; }   // 부서진 것은 전역 효과도 안 낸다
        var uqw = uniqEffects(eq[s]);
        for (j = 0; j < uqw.length; j++) {
          if (uqw[j].kind !== 'world') { continue; }
          out[uqw[j].eff] = (out[uqw[j].eff] || 0) + uqw[j].v;
        }
        for (j = 0; j < eq[s].aff.length; j++) {
          var a = D.affixByKey(eq[s].aff[j].k);
          if (!a || a.kind !== 'world') { continue; }
          out[a.eff] = (out[a.eff] || 0) + eq[s].aff[j].v;
        }
        var we = socketEffects(eq[s]);
        for (j = 0; j < we.length; j++) {
          if (we[j].kind !== 'world') { continue; }
          out[we[j].eff] = (out[we[j].eff] || 0) + we[j].v;
        }
      }
    }
    return out;
  }

  /* ── 비교 · 자동 정리 ─────────────────────────────────── */

  /** 이 아이템이 heroId 에게 지금 것보다 얼마나 나은가 (음수면 손해) */
  function gainFor(heroId, it) {
    /* 미확인은 **얼마나 나은지 잴 수 없다.** 여기서 0 을 돌려주지 않으면
       autoEquip 이 미확인을 고르고, equip 이 거절하고, 다시 고르고를 되풀이한다
       (실제로 그렇게 헛돌았다). 값을 매기는 자리를 한 곳으로 모은다. */
    if (it && it.unid) { return 0; }
    if (it && isBroken(it)) { return 0; }      // 부서진 것으로 갈아입힐 이유는 없다
    if (it && !meetsReq(heroId, it)) { return 0; }   // 아직 못 입는 물건
    var base = baseOf(it);
    if (!base) { return -1; }
    var cur = equipped(heroId)[base.slot];
    return power(it) - (cur ? power(cur) : 0);
  }

  /** 동행 중 이 물건이 가장 쓸모 있는 사람 (태수는 경영을 빼면서 함께 없어졌다) */
  /** 미확인은 값어치를 매길 수 없다 — 옵션을 모르는 채로 갈아입힐 수는 없다 */
  function bestOwner(it) {
    if (it && it.unid) { return null; }        // 옵션을 모르는 채로 갈아입힐 수는 없다
    var ids = core.save.party.slice(), best = null, bestG = 0, i;
    for (i = 0; i < ids.length; i++) {
      var gain = gainFor(ids[i], it);
      if (gain > bestG) { bestG = gain; best = ids[i]; }
    }
    return best ? { id: best, gain: bestG } : null;
  }

  /**
   * 자동 정리 — 아무에게도 보탬이 안 되는 물건을 팔아 금으로 바꾼다.
   * 잠금(lock)한 것과 등급 전설은 건드리지 않는다.
   */
  function autoClean() {
    var b = bag(), sold = 0, gold = 0, i;
    for (i = b.length - 1; i >= 0; i--) {
      var it = b[i];
      /* **미확인은 절대 팔지 않는다.** bestOwner 가 null 을 주므로 그냥 두면
         감정도 안 해 본 보물·전설이 통째로 팔려 나간다 */
      /* 부서진 것도 안 판다 — 금 내고 고치면 되는 물건이다 */
      /* 아직 못 입는 물건도 안 판다 — 곧 입을 수 있게 된다 */
      if (it.lock || it.unid || isBroken(it) || it.tier >= 4) { continue; }
      if (core.save.party.some(function (hid) { return !meetsReq(hid, it); })) { continue; }
      if (bestOwner(it)) { continue; }
      gold += price(it);
      core.save.player.gold += price(it);
      b.splice(i, 1);
      sold++;
    }
    if (sold) { core.log('🧹 장비 자동 정리 · ' + sold + '점 매각 (금 +' + core.fmt(gold) + ')', 'info'); }
    return { sold: sold, gold: gold };
  }

  /** 부대 전원에게 가방에서 가장 좋은 것을 입힌다 (자동 장착) */
  function autoEquip() {
    var changed = 0, p = core.save.party, i, guard = 0;
    for (i = 0; i < p.length; i++) {
      var again = true;
      while (again && guard < 60) {
        guard++;
        again = false;
        var b = bag(), bestUid = null, bestGain = 0, j;
        for (j = 0; j < b.length; j++) {
          var gn = gainFor(p[i], b[j]);
          if (gn > bestGain) { bestGain = gn; bestUid = b[j].uid; }
        }
        if (bestUid) { equip(p[i], bestUid); changed++; again = true; }
      }
    }
    return changed;
  }

  global.DG = global.DG || {};
  global.DG.item = {
    BAG_BASE: BAG_BASE, bagCap: bagCap,
    roll: roll, drop: drop, add: add, sell: sell, toggleLock: toggleLock,
    bag: bag, find: find, take: take, name: name, lines: lines, power: power, price: price,
    /* 창고 */
    /* 내구·수리 */
    /* 요구 수준 · 원소 */
    reqLevel: reqLevel, meetsReq: meetsReq,
    elemDamage: elemDamage, elemResist: elemResist,
    durOf: durOf, durMaxOf: durMaxOf, isBroken: isBroken, wearAll: wearAll,
    repairCost: repairCost, repair: repair,
    repairList: repairList, repairAllCost: repairAllCost, repairAll: repairAll,
    stash: stash, stashCap: stashCap, stashOpen: stashOpen,
    toStash: toStash, fromStash: fromStash, findAnywhere: findAnywhere,
    baseOf: baseOf, tierOf: tierOf, statKor: statKor,
    /* 투장 · 고유 */
    setOf: setOf, setCounts: setCounts, setEffects: setEffects,
    uniqOf: uniqOf, uniqEffects: uniqEffects, effLine: effLine,
    /* 감정 */
    scrolls: scrolls, addScroll: addScroll, isUnid: isUnid, unidList: unidList,
    identify: identify, identifyAll: identifyAll,
    equipped: equipped, equip: equip, unequip: unequip,
    statBonus: statBonus, partyEffect: partyEffect,
    gainFor: gainFor, bestOwner: bestOwner, autoClean: autoClean, autoEquip: autoEquip,
    /* 세공 */
    SOCK_MAX: SOCK_MAX,
    socketsOf: socketsOf, emptySockets: emptySockets, socket: socket,
    wordOf: wordOf, socketEffects: socketEffects,
    addMat: addMat, matCount: matCount, matList: matList, effKor: effKor,
    /* 주옥 */
    jewels: jewels, jewelCap: jewelCap, jewelById: jewelById,
    addJewel: addJewel, removeJewel: removeJewel
  };
})(window);
